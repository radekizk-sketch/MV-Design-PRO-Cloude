from __future__ import annotations

import hashlib
import json
import math
from datetime import datetime, timezone
from typing import Any, Callable
from uuid import UUID

from analysis.power_flow import PowerFlowSolver
from analysis.power_flow._internal import build_slack_island, validate_input
from analysis.power_flow.types import PowerFlowInput, PowerFlowOptions, PQSpec, PVSpec, SlackSpec
from application.sld.overlay import ResultSldOverlayBuilder
from domain.analysis_run import AnalysisRun, new_analysis_run
from domain.project_design_mode import ProjectDesignMode
from domain.validation import ValidationIssue, ValidationReport
from infrastructure.persistence.unit_of_work import UnitOfWork
from network_model.core import Branch, InverterSource, NetworkGraph, Node
from network_model.solvers import ShortCircuitIEC60909Solver, ShortCircuitType


DETERMINISTIC_LIST_KEYS = {"nodes", "branches", "sources", "loads"}


def canonicalize(value: Any, *, current_key: str | None = None) -> Any:
    if isinstance(value, dict):
        return {
            key: canonicalize(value[key], current_key=key)
            for key in sorted(value.keys())
        }
    if isinstance(value, list):
        items = [canonicalize(item, current_key=current_key) for item in value]
        if current_key in DETERMINISTIC_LIST_KEYS:
            return sorted(items, key=_stable_list_key)
        return items
    return value


def compute_input_hash(snapshot: dict) -> str:
    canonical = canonicalize(snapshot)
    payload = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _stable_list_key(item: Any) -> str:
    if isinstance(item, dict):
        for key in ("id", "node_id", "branch_id"):
            if key in item and item[key] is not None:
                return str(item[key])
    return str(item)


class AnalysisRunService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory
        self._overlay_builder = ResultSldOverlayBuilder()

    def create_power_flow_run(
        self,
        project_id: UUID,
        operating_case_id: UUID,
        options: dict | None = None,
    ) -> AnalysisRun:
        snapshot = self._build_power_flow_snapshot(project_id, operating_case_id, options)
        input_hash = compute_input_hash(snapshot)
        with self._uow_factory() as uow:
            existing = uow.analysis_runs.get_by_deterministic_key(
                project_id, operating_case_id, "PF", input_hash
            )
            if existing:
                return existing
            run = new_analysis_run(
                project_id=project_id,
                operating_case_id=operating_case_id,
                analysis_type="PF",
                input_snapshot=snapshot,
                input_hash=input_hash,
            )
            uow.analysis_runs.create(run)
        return run

    def create_short_circuit_run(
        self,
        project_id: UUID,
        operating_case_id: UUID,
        fault_spec: dict,
        options: dict | None = None,
    ) -> AnalysisRun:
        snapshot = self._build_short_circuit_snapshot(
            project_id, operating_case_id, fault_spec, options
        )
        input_hash = compute_input_hash(snapshot)
        with self._uow_factory() as uow:
            existing = uow.analysis_runs.get_by_deterministic_key(
                project_id, operating_case_id, "short_circuit_sn", input_hash
            )
            if existing:
                return existing
            run = new_analysis_run(
                project_id=project_id,
                operating_case_id=operating_case_id,
                analysis_type="short_circuit_sn",
                input_snapshot=snapshot,
                input_hash=input_hash,
            )
            uow.analysis_runs.create(run)
        return run

    def create_fault_loop_run(
        self,
        project_id: UUID,
        operating_case_id: UUID,
        options: dict | None = None,
    ) -> AnalysisRun:
        snapshot = self._build_fault_loop_snapshot(project_id, operating_case_id, options)
        input_hash = compute_input_hash(snapshot)
        with self._uow_factory() as uow:
            existing = uow.analysis_runs.get_by_deterministic_key(
                project_id, operating_case_id, "fault_loop_nn", input_hash
            )
            if existing:
                return existing
            run = new_analysis_run(
                project_id=project_id,
                operating_case_id=operating_case_id,
                analysis_type="fault_loop_nn",
                input_snapshot=snapshot,
                input_hash=input_hash,
            )
            uow.analysis_runs.create(run)
        return run

    def execute_run(self, run_id: UUID) -> AnalysisRun:
        with self._uow_factory() as uow:
            run = uow.analysis_runs.get(run_id)
            if run is None:
                raise ValueError(f"AnalysisRun {run_id} not found")
            if run.status in {"FINISHED", "FAILED", "RUNNING"}:
                return run

            design_mode_report = self._validate_project_design_mode(uow, run)
            if not design_mode_report.is_valid:
                return self._fail_run(uow, run, design_mode_report)

            run = uow.analysis_runs.update_status(run_id, "VALIDATED")
            if run.analysis_type == "PF":
                return self._execute_power_flow(uow, run)
            if run.analysis_type == "short_circuit_sn":
                return self._execute_short_circuit_sn(uow, run)
            if run.analysis_type == "fault_loop_nn":
                return self._execute_fault_loop_nn(uow, run)
            raise ValueError(f"Unsupported analysis_type: {run.analysis_type}")

    def get_run(self, run_id: UUID) -> AnalysisRun:
        with self._uow_factory() as uow:
            run = uow.analysis_runs.get(run_id)
        if run is None:
            raise ValueError(f"AnalysisRun {run_id} not found")
        return run

    def list_runs(
        self, project_id: UUID, filters: dict[str, Any] | None = None
    ) -> list[AnalysisRun]:
        with self._uow_factory() as uow:
            return uow.analysis_runs.list_by_project(project_id, filters)

    def get_results(self, run_id: UUID) -> list[dict]:
        with self._uow_factory() as uow:
            return uow.results.list_results(run_id)

    def get_sld_overlay_for_run(
        self, project_id: UUID, diagram_id: UUID, run_id: UUID
    ) -> dict[str, list[dict[str, Any]]]:
        with self._uow_factory() as uow:
            diagram = uow.sld.get(diagram_id)
            if diagram is None or diagram["project_id"] != project_id:
                raise ValueError("SLD diagram not found")
            results = uow.results.list_results(run_id)
        result_payload = None
        for result in results:
            if result.get("result_type") == "short_circuit_sn":
                result_payload = result.get("payload")
                break
        return self._overlay_builder.build_short_circuit_overlay(
            diagram.get("payload"), result_payload
        )

    def _execute_power_flow(self, uow: UnitOfWork, run: AnalysisRun) -> AnalysisRun:
        pf_input = self._build_power_flow_input(run)
        report = self._validate_power_flow_input(pf_input)
        if not report.is_valid:
            return self._fail_run(uow, run, report)

        started_at = datetime.now(timezone.utc)
        run = uow.analysis_runs.update_status(run.id, "RUNNING", started_at=started_at)
        try:
            result = PowerFlowSolver().solve(pf_input)
        except Exception as exc:
            return self._fail_run(uow, run, str(exc))

        payload = result.to_dict()
        uow.results.add_result(
            run_id=run.id,
            project_id=run.project_id,
            result_type="power_flow",
            payload=payload,
        )
        summary = {
            "status": "FINISHED",
            "converged": payload.get("converged"),
            "iterations": payload.get("iterations"),
            "node_u_pu": payload.get("node_u_mag_pu", {}),
        }
        trace_json = payload.get("white_box_trace")
        finished_at = datetime.now(timezone.utc)
        return uow.analysis_runs.update_status(
            run.id,
            "FINISHED",
            finished_at=finished_at,
            result_summary=summary,
            trace_json=trace_json,
        )

    def _execute_short_circuit_sn(self, uow: UnitOfWork, run: AnalysisRun) -> AnalysisRun:
        sc_input = self._build_short_circuit_input(run)
        report = self._validate_short_circuit_input(sc_input)
        if not report.is_valid:
            return self._fail_run(uow, run, report)

        started_at = datetime.now(timezone.utc)
        run = uow.analysis_runs.update_status(run.id, "RUNNING", started_at=started_at)
        try:
            result = self._solve_short_circuit(sc_input)
        except Exception as exc:
            return self._fail_run(uow, run, str(exc))

        payload = result.to_dict()
        uow.results.add_result(
            run_id=run.id,
            project_id=run.project_id,
            result_type="short_circuit_sn",
            payload=payload,
        )
        summary = {
            "status": "FINISHED",
            "fault_node_id": payload.get("fault_node_id"),
            "short_circuit_type": payload.get("short_circuit_type"),
            "ikss_a": payload.get("ikss_a"),
            "pcc_node_id": sc_input["pcc_node_id"],
        }
        white_box_trace = payload.get("white_box_trace")
        finished_at = datetime.now(timezone.utc)
        return uow.analysis_runs.update_status(
            run.id,
            "FINISHED",
            finished_at=finished_at,
            result_summary=summary,
            white_box_trace=white_box_trace,
        )

    def _execute_fault_loop_nn(self, uow: UnitOfWork, run: AnalysisRun) -> AnalysisRun:
        snapshot = run.input_snapshot
        report = self._validate_fault_loop_input(snapshot)
        if not report.is_valid:
            return self._fail_run(uow, run, report)
        report = report.with_error(
            ValidationIssue(
                code="nn.solver.unavailable",
                message="Fault-loop nn solver is not implemented in this milestone",
            )
        )
        return self._fail_run(uow, run, report)

    def _fail_run(
        self, uow: UnitOfWork, run: AnalysisRun, message: str | ValidationReport
    ) -> AnalysisRun:
        if isinstance(message, ValidationReport):
            error_message = json.dumps(message.to_dict(), sort_keys=True)
        else:
            error_message = str(message)
        finished_at = datetime.now(timezone.utc)
        return uow.analysis_runs.update_status(
            run.id,
            "FAILED",
            finished_at=finished_at,
            error_message=error_message,
            result_summary={"status": "FAILED"},
        )

    def _build_power_flow_snapshot(
        self,
        project_id: UUID,
        operating_case_id: UUID,
        options: dict | None = None,
    ) -> dict[str, Any]:
        with self._uow_factory() as uow:
            case = uow.cases.get_operating_case(operating_case_id)
            if case is None or case.project_id != project_id:
                raise ValueError(f"OperatingCase {operating_case_id} not found")
            settings = uow.wizard.get_settings(project_id)
            loads = uow.wizard.list_loads(project_id)
            sources = uow.wizard.list_sources(project_id)
            nodes = uow.network.list_nodes(project_id)

        base_mva = float(case.case_payload.get("base_mva", 100.0))
        snapshot_id = self._get_snapshot_id(case)
        slack_node_id = settings.get("pcc_node_id") or self._select_slack_node_id(nodes)
        slack_attrs = self._lookup_node_attrs(nodes, slack_node_id) if slack_node_id else {}
        slack_spec = {
            "node_id": str(slack_node_id) if slack_node_id else None,
            "u_pu": float(slack_attrs.get("voltage_magnitude", 1.0) or 1.0),
            "angle_rad": float(slack_attrs.get("voltage_angle", 0.0) or 0.0),
        }

        pq_specs = [
            {
                "node_id": str(load["node_id"]),
                "p_mw": float((load.get("payload") or {}).get("p_mw", 0.0)),
                "q_mvar": float((load.get("payload") or {}).get("q_mvar", 0.0)),
            }
            for load in loads
            if load.get("in_service", True)
        ]
        pq_specs.sort(key=lambda spec: spec["node_id"])

        pv_specs = []
        for source in sources:
            if not source.get("in_service", True):
                continue
            if source.get("source_type") == "GRID":
                continue
            payload = source.get("payload") or {}
            pv_specs.append(
                {
                    "node_id": str(source["node_id"]),
                    "p_mw": float(payload.get("p_mw", 0.0)),
                    "u_pu": float(payload.get("u_pu", 1.0)),
                    "q_min_mvar": float(payload.get("q_min_mvar", -1e6)),
                    "q_max_mvar": float(payload.get("q_max_mvar", 1e6)),
                }
            )
        pv_specs.sort(key=lambda spec: spec["node_id"])

        return {
            "snapshot_id": snapshot_id,
            "base_mva": base_mva,
            "slack": slack_spec,
            "pq": pq_specs,
            "pv": pv_specs,
            "options": options or {},
        }

    def _build_short_circuit_snapshot(
        self,
        project_id: UUID,
        operating_case_id: UUID,
        fault_spec: dict,
        options: dict | None = None,
    ) -> dict[str, Any]:
        with self._uow_factory() as uow:
            case = uow.cases.get_operating_case(operating_case_id)
            if case is None or case.project_id != project_id:
                raise ValueError(f"OperatingCase {operating_case_id} not found")
            settings = uow.wizard.get_settings(project_id)
            sources = uow.wizard.list_sources(project_id)
            loads = uow.wizard.list_loads(project_id)

        base_mva = float(case.case_payload.get("base_mva", 100.0))
        snapshot_id = self._get_snapshot_id(case)
        return {
            "snapshot_id": snapshot_id,
            "base_mva": base_mva,
            "pcc_node_id": str(settings.get("pcc_node_id"))
            if settings.get("pcc_node_id")
            else None,
            "fault_spec": {
                "fault_type": fault_spec.get("fault_type"),
                "node_id": str(fault_spec.get("node_id"))
                if fault_spec.get("node_id") is not None
                else None,
                "branch_id": str(fault_spec.get("branch_id"))
                if fault_spec.get("branch_id") is not None
                else None,
                "position_percent": fault_spec.get("position_percent"),
                "c_factor": fault_spec.get("c_factor"),
                "tk_s": fault_spec.get("tk_s"),
                "tb_s": fault_spec.get("tb_s"),
            },
            "grounding": settings.get("grounding") or {},
            "limits": settings.get("limits") or {},
            "sources": self._normalize_sources(sources),
            "loads": self._normalize_loads(loads),
            "options": options or {},
        }

    def _build_fault_loop_snapshot(
        self,
        project_id: UUID,
        operating_case_id: UUID,
        options: dict | None = None,
    ) -> dict[str, Any]:
        with self._uow_factory() as uow:
            case = uow.cases.get_operating_case(operating_case_id)
            if case is None or case.project_id != project_id:
                raise ValueError(f"OperatingCase {operating_case_id} not found")
        snapshot_id = self._get_snapshot_id(case)
        return {
            "snapshot_id": snapshot_id,
            "nn_inputs": case.case_payload.get("nn_inputs", {}),
            "options": options or {},
        }

    def _build_power_flow_input(self, run: AnalysisRun) -> PowerFlowInput:
        snapshot = run.input_snapshot
        graph = self._build_network_graph(run.project_id, run.operating_case_id)
        slack_data = snapshot.get("slack") or {}
        slack_spec = SlackSpec(
            node_id=str(slack_data.get("node_id") or ""),
            u_pu=float(slack_data.get("u_pu", 1.0)),
            angle_rad=float(slack_data.get("angle_rad", 0.0)),
        )
        pq_specs = [
            PQSpec(
                node_id=str(item.get("node_id")),
                p_mw=float(item.get("p_mw", 0.0)),
                q_mvar=float(item.get("q_mvar", 0.0)),
            )
            for item in snapshot.get("pq", [])
        ]
        pv_specs = [
            PVSpec(
                node_id=str(item.get("node_id")),
                p_mw=float(item.get("p_mw", 0.0)),
                u_pu=float(item.get("u_pu", 1.0)),
                q_min_mvar=float(item.get("q_min_mvar", -1e6)),
                q_max_mvar=float(item.get("q_max_mvar", 1e6)),
            )
            for item in snapshot.get("pv", [])
        ]
        options = PowerFlowOptions(**(snapshot.get("options") or {}))
        return PowerFlowInput(
            graph=graph,
            base_mva=float(snapshot.get("base_mva", 100.0)),
            slack=slack_spec,
            pq=pq_specs,
            pv=pv_specs,
            options=options,
        )

    def _build_short_circuit_input(self, run: AnalysisRun) -> dict[str, Any]:
        snapshot = run.input_snapshot
        graph = self._build_network_graph(run.project_id, run.operating_case_id)
        for source in snapshot.get("sources", []):
            if source.get("source_type") == "GRID":
                continue
            if not source.get("in_service", True):
                continue
            payload = source.get("payload") or {}
            inverter = InverterSource(
                id=str(source.get("id")),
                name=payload.get("name", source.get("name", "")),
                node_id=str(source.get("node_id")),
                in_rated_a=float(payload.get("in_rated_a", 0.0)),
                k_sc=float(payload.get("k_sc", 1.1)),
                contributes_negative_sequence=bool(
                    payload.get("contributes_negative_sequence", False)
                ),
                contributes_zero_sequence=bool(
                    payload.get("contributes_zero_sequence", False)
                ),
                in_service=bool(source.get("in_service", True)),
            )
            if inverter.node_id in graph.nodes:
                graph.add_inverter_source(inverter)
        return {
            "graph": graph,
            "base_mva": float(snapshot.get("base_mva", 100.0)),
            "pcc_node_id": snapshot.get("pcc_node_id"),
            "sources": snapshot.get("sources", []),
            "loads": snapshot.get("loads", []),
            "grounding": snapshot.get("grounding", {}),
            "limits": snapshot.get("limits", {}),
            "fault_spec": snapshot.get("fault_spec", {}),
            "options": snapshot.get("options", {}),
        }

    def _validate_power_flow_input(self, pf_input: PowerFlowInput) -> ValidationReport:
        report = ValidationReport()
        warnings, errors = validate_input(pf_input)
        for message in errors:
            report = report.with_error(ValidationIssue(code="pf.input", message=message))

        if not pf_input.slack.node_id:
            report = report.with_error(
                ValidationIssue(code="pf.slack.missing", message="Slack node is required")
            )
            return report

        graph = pf_input.typed_graph()
        _, not_solved = build_slack_island(graph, pf_input.slack.node_id)
        if not_solved:
            report = report.with_error(
                ValidationIssue(
                    code="pf.slack.island",
                    message="Slack node missing for at least one island",
                )
            )
        if any(not math.isfinite(value) for value in self._iter_pf_numbers(pf_input)):
            report = report.with_error(
                ValidationIssue(code="pf.nan", message="Power flow input has NaN/Inf")
            )
        return report

    def _validate_short_circuit_input(self, sc_input: dict[str, Any]) -> ValidationReport:
        report = ValidationReport()
        pcc_node_id = sc_input.get("pcc_node_id")
        if not pcc_node_id:
            report = report.with_error(
                ValidationIssue(
                    code="pcc.missing",
                    message="PCC – punkt wspólnego przyłączenia must be defined",
                )
            )
        fault_spec = sc_input.get("fault_spec") or {}
        if not fault_spec.get("node_id") and not fault_spec.get("branch_id"):
            report = report.with_error(
                ValidationIssue(
                    code="fault.missing_location",
                    message="FaultSpec requires node_id or branch_id",
                )
            )

        sources = sc_input.get("sources") or []
        in_service_sources = [src for src in sources if src.get("in_service", True)]
        if not in_service_sources:
            report = report.with_error(
                ValidationIssue(
                    code="source.missing",
                    message="Short-circuit requires at least one source (minimum GRID)",
                )
            )
        if not any(src.get("source_type") == "GRID" for src in in_service_sources):
            report = report.with_error(
                ValidationIssue(
                    code="source.grid_missing",
                    message="Short-circuit requires at least one GRID source",
                )
            )
        grid_supply_sources = [
            src
            for src in in_service_sources
            if src.get("source_type") == "GRID"
            and (src.get("payload") or {}).get("grid_supply") is True
        ]
        if not grid_supply_sources:
            report = report.with_error(
                ValidationIssue(
                    code="source.grid_supply_missing",
                    message="Short-circuit requires GRID source with grid_supply flag",
                )
            )
        if pcc_node_id:
            pcc_sources = [
                src
                for src in grid_supply_sources
                if str(src.get("node_id")) == str(pcc_node_id)
            ]
            if not pcc_sources:
                report = report.with_error(
                    ValidationIssue(
                        code="source.pcc_missing",
                        message="PCC must have GRID supply source",
                    )
                )

        graph = sc_input.get("graph")
        if graph is not None:
            fault_node_id = fault_spec.get("node_id")
            fault_branch_id = fault_spec.get("branch_id")
            if fault_node_id and str(fault_node_id) not in graph.nodes:
                report = report.with_error(
                    ValidationIssue(
                        code="fault.node_missing",
                        message="Fault node not found in network",
                    )
                )
            if fault_branch_id and str(fault_branch_id) not in graph.branches:
                report = report.with_error(
                    ValidationIssue(
                        code="fault.branch_missing",
                        message="Fault branch not found in network",
                    )
                )
        return report

    def _validate_fault_loop_input(self, snapshot: dict[str, Any]) -> ValidationReport:
        report = ValidationReport()
        nn_inputs = snapshot.get("nn_inputs") or {}
        if not nn_inputs:
            return report.with_error(
                ValidationIssue(
                    code="nn.input.missing",
                    message="NN fault-loop requires nn_inputs to be provided",
                )
            )
        if not nn_inputs.get("network_type"):
            report = report.with_error(
                ValidationIssue(
                    code="nn.input.network_type_missing",
                    message="NN fault-loop requires network_type",
                )
            )
        if not nn_inputs.get("targets"):
            report = report.with_error(
                ValidationIssue(
                    code="nn.input.targets_missing",
                    message="NN fault-loop requires targets list",
                )
            )
        return report

    def _validate_project_design_mode(
        self, uow: UnitOfWork, run: AnalysisRun
    ) -> ValidationReport:
        if run.analysis_type not in {"short_circuit_sn", "fault_loop_nn"}:
            return ValidationReport()
        case = uow.cases.get_operating_case(run.operating_case_id)
        if case is None:
            return ValidationReport().with_error(
                ValidationIssue(
                    code="project_design_mode.case_missing",
                    message="OperatingCase not found for ProjectDesignMode gate",
                )
            )
        mode = case.project_design_mode
        if mode is None:
            return ValidationReport().with_error(
                ValidationIssue(
                    code="project_design_mode.missing",
                    message="ProjectDesignMode is required to execute this analysis",
                )
            )
        if run.analysis_type == "short_circuit_sn" and mode != ProjectDesignMode.SN_NETWORK:
            return ValidationReport().with_error(
                ValidationIssue(
                    code="project_design_mode.forbidden",
                    message="short_circuit_sn is only allowed for SN_NETWORK",
                )
            )
        if run.analysis_type == "fault_loop_nn" and mode != ProjectDesignMode.NN_NETWORK:
            return ValidationReport().with_error(
                ValidationIssue(
                    code="project_design_mode.forbidden",
                    message="fault_loop_nn is only allowed for NN_NETWORK",
                )
            )
        return ValidationReport()

    def _get_snapshot_id(self, case: Any) -> str:
        snapshot_id = (case.case_payload or {}).get("active_snapshot_id")
        if not snapshot_id:
            raise ValueError(f"OperatingCase {case.id} has no active_snapshot_id")
        return str(snapshot_id)

    def _solve_short_circuit(self, sc_input: dict[str, Any]):
        graph = sc_input["graph"]
        fault_spec = sc_input.get("fault_spec") or {}
        fault_type = self._map_fault_type(fault_spec.get("fault_type"))
        fault_node_id = self._resolve_fault_node_id(graph, fault_spec)
        include_branch = bool((sc_input.get("options") or {}).get("include_branch"))
        if fault_type == ShortCircuitType.THREE_PHASE:
            c_factor = float(fault_spec.get("c_factor", 1.0))
            tk_s = float(fault_spec.get("tk_s", 1.0))
            tb_s = float(fault_spec.get("tb_s", 0.1))
            return ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
                graph=graph,
                fault_node_id=fault_node_id,
                c_factor=c_factor,
                tk_s=tk_s,
                tb_s=tb_s,
                include_branch_contributions=include_branch,
            )
        if fault_type == ShortCircuitType.SINGLE_PHASE_GROUND:
            c_factor = float(fault_spec.get("c_factor", 1.0))
            tk_s = float(fault_spec.get("tk_s", 1.0))
            tb_s = float(fault_spec.get("tb_s", 0.1))
            return ShortCircuitIEC60909Solver.compute_1ph_short_circuit(
                graph=graph,
                fault_node_id=fault_node_id,
                c_factor=c_factor,
                tk_s=tk_s,
                tb_s=tb_s,
                include_branch_contributions=include_branch,
            )
        if fault_type == ShortCircuitType.TWO_PHASE:
            c_factor = float(fault_spec.get("c_factor", 1.0))
            tk_s = float(fault_spec.get("tk_s", 1.0))
            tb_s = float(fault_spec.get("tb_s", 0.1))
            return ShortCircuitIEC60909Solver.compute_2ph_short_circuit(
                graph=graph,
                fault_node_id=fault_node_id,
                c_factor=c_factor,
                tk_s=tk_s,
                tb_s=tb_s,
                include_branch_contributions=include_branch,
            )
        if fault_type == ShortCircuitType.TWO_PHASE_GROUND:
            c_factor = float(fault_spec.get("c_factor", 1.0))
            tk_s = float(fault_spec.get("tk_s", 1.0))
            tb_s = float(fault_spec.get("tb_s", 0.1))
            return ShortCircuitIEC60909Solver.compute_2ph_ground_short_circuit(
                graph=graph,
                fault_node_id=fault_node_id,
                c_factor=c_factor,
                tk_s=tk_s,
                tb_s=tb_s,
                include_branch_contributions=include_branch,
            )
        raise ValueError(f"Unsupported fault type: {fault_spec.get('fault_type')}")

    def _map_fault_type(self, fault_type: str | None) -> ShortCircuitType:
        if fault_type is None:
            return ShortCircuitType.THREE_PHASE
        mapping = {
            "3F": ShortCircuitType.THREE_PHASE,
            "1F": ShortCircuitType.SINGLE_PHASE_GROUND,
            "2F": ShortCircuitType.TWO_PHASE,
            "2F+G": ShortCircuitType.TWO_PHASE_GROUND,
        }
        if fault_type in mapping:
            return mapping[fault_type]
        raise ValueError(f"Unsupported fault_type: {fault_type}")

    def _resolve_fault_node_id(self, graph, fault_spec: dict) -> str:
        fault_node_id = fault_spec.get("node_id")
        if fault_node_id:
            return str(fault_node_id)
        branch_id = fault_spec.get("branch_id")
        if not branch_id:
            raise ValueError("FaultSpec requires node_id or branch_id")
        branch = graph.branches.get(str(branch_id))
        if branch is None:
            raise ValueError("Fault branch not found in graph")
        position = fault_spec.get("position_percent")
        if position is None:
            return str(branch.from_node_id)
        try:
            position_value = float(position)
        except (TypeError, ValueError) as exc:
            raise ValueError("Fault position must be numeric") from exc
        return (
            str(branch.from_node_id)
            if position_value <= 50.0
            else str(branch.to_node_id)
        )

    def _select_slack_node_id(self, nodes: list[dict]) -> UUID | None:
        slack_nodes = [
            node
            for node in nodes
            if self._normalize_node_type(node["node_type"]) == "SLACK"
        ]
        if not slack_nodes:
            return None
        slack_nodes.sort(key=lambda node: str(node["id"]))
        return slack_nodes[0]["id"]

    def _normalize_node_type(self, node_type: str) -> str | None:
        node_type_upper = node_type.upper()
        if node_type_upper in {"SLACK", "PQ", "PV"}:
            return node_type_upper
        if node_type_upper in {
            "MV_BUS_SECTION",
            "LV_BUS_SECTION",
            "BAY_NODE",
            "JUNCTION",
            "PCC_NODE",
        }:
            return "PQ"
        return None

    def _lookup_node_attrs(
        self, nodes: list[dict], node_id: UUID | None
    ) -> dict[str, Any]:
        if node_id is None:
            return {}
        for node in nodes:
            if node["id"] == node_id:
                return self._node_attrs_from_node(node)
        return {}

    def _node_attrs_from_node(self, node: dict) -> dict[str, Any]:
        attrs = dict(node.get("attrs") or {})
        mapped: dict[str, Any] = {}
        voltage_magnitude = attrs.get("voltage_magnitude_pu")
        if voltage_magnitude is None:
            voltage_magnitude = attrs.get("voltage_magnitude")
        if voltage_magnitude is not None:
            mapped["voltage_magnitude"] = voltage_magnitude

        voltage_angle = attrs.get("voltage_angle_rad")
        if voltage_angle is None:
            voltage_angle = attrs.get("voltage_angle")
        if voltage_angle is not None:
            mapped["voltage_angle"] = voltage_angle

        active_power = attrs.get("active_power_mw")
        if active_power is None:
            active_power = attrs.get("active_power")
        if active_power is not None:
            mapped["active_power"] = active_power

        reactive_power = attrs.get("reactive_power_mvar")
        if reactive_power is None:
            reactive_power = attrs.get("reactive_power")
        if reactive_power is not None:
            mapped["reactive_power"] = reactive_power

        q_min_mvar = attrs.get("q_min_mvar")
        if q_min_mvar is not None:
            mapped["q_min_mvar"] = q_min_mvar

        q_max_mvar = attrs.get("q_max_mvar")
        if q_max_mvar is not None:
            mapped["q_max_mvar"] = q_max_mvar

        return mapped

    def _build_network_graph(
        self, project_id: UUID, case_id: UUID | None
    ) -> NetworkGraph:
        with self._uow_factory() as uow:
            nodes = uow.network.list_nodes(project_id)
            branches = uow.network.list_branches(project_id)
            switching_states = {}
            if case_id is not None:
                switching_states = {
                    state["element_id"]: state
                    for state in uow.wizard.list_switching_states(case_id)
                }

        graph = NetworkGraph()
        for node in nodes:
            node_data = self._node_to_graph_payload(node)
            graph.add_node(Node.from_dict(node_data))
        for branch in branches:
            branch_data = self._branch_to_graph_payload(branch)
            branch_state = switching_states.get(branch["id"])
            if branch_state is not None:
                branch_data["in_service"] = branch_state["in_service"]
            graph.add_branch(Branch.from_dict(branch_data))
        return graph

    def _node_to_graph_payload(self, node: dict) -> dict[str, Any]:
        attrs = self._node_attrs_from_node(node)
        return {
            "id": str(node["id"]),
            "name": node["name"],
            "node_type": self._normalize_node_type(node["node_type"]) or "PQ",
            "voltage_level": node["base_kv"],
            "voltage_magnitude": attrs.get("voltage_magnitude"),
            "voltage_angle": attrs.get("voltage_angle"),
            "active_power": attrs.get("active_power"),
            "reactive_power": attrs.get("reactive_power"),
        }

    def _branch_to_graph_payload(self, branch: dict) -> dict[str, Any]:
        params = branch.get("params") or {}
        payload = {
            "id": str(branch["id"]),
            "name": branch["name"],
            "branch_type": branch["branch_type"].upper(),
            "from_node_id": str(branch["from_node_id"]),
            "to_node_id": str(branch["to_node_id"]),
            "in_service": branch.get("in_service", True),
        }
        payload.update(params)
        return payload

    def _normalize_sources(self, sources: list[dict]) -> list[dict[str, Any]]:
        normalized = [
            {
                "id": str(source.get("id")),
                "project_id": str(source.get("project_id")),
                "node_id": str(source.get("node_id")),
                "name": (source.get("payload") or {}).get("name"),
                "source_type": source.get("source_type"),
                "payload": source.get("payload") or {},
                "in_service": bool(source.get("in_service", True)),
            }
            for source in sources
        ]
        normalized.sort(key=lambda item: item["id"])
        return normalized

    def _normalize_loads(self, loads: list[dict]) -> list[dict[str, Any]]:
        normalized = [
            {
                "id": str(load.get("id")),
                "project_id": str(load.get("project_id")),
                "node_id": str(load.get("node_id")),
                "name": (load.get("payload") or {}).get("name"),
                "payload": load.get("payload") or {},
                "in_service": bool(load.get("in_service", True)),
            }
            for load in loads
        ]
        normalized.sort(key=lambda item: item["id"])
        return normalized

    def _iter_pf_numbers(self, pf_input: PowerFlowInput) -> list[float]:
        numbers = [pf_input.base_mva, pf_input.slack.u_pu, pf_input.slack.angle_rad]
        for spec in pf_input.pq:
            numbers.extend([spec.p_mw, spec.q_mvar])
        for spec in pf_input.pv:
            numbers.extend([spec.p_mw, spec.u_pu, spec.q_min_mvar, spec.q_max_mvar])
        return numbers
