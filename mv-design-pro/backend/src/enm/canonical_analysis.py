from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import json
import math
from typing import Any
from uuid import UUID, uuid4

from enm.hash import compute_enm_hash
from enm.mapping import map_enm_to_network_graph
from enm.models import EnergyNetworkModel
from enm.store import get_enm
from enm.validator import ENMValidator
from network_model.core.branch import LineBranch, TransformerBranch
from network_model.core.node import NodeType
from network_model.solvers.power_flow_newton import PowerFlowNewtonSolver
from network_model.solvers.power_flow_result import build_power_flow_result_v1
from network_model.solvers.power_flow_types import PQSpec, PowerFlowInput, PowerFlowOptions, SlackSpec
from network_model.solvers.short_circuit_iec60909 import ShortCircuitIEC60909Solver


def _canonicalize(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _canonicalize(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        return [_canonicalize(item) for item in value]
    return value


def _compute_input_hash(*, case_id: str, analysis_type: str, enm_hash: str, options: dict[str, Any]) -> str:
    payload = {
        "analysis_type": analysis_type,
        "case_id": case_id,
        "enm_hash": enm_hash,
        "options": _canonicalize(options),
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@dataclass
class CanonicalRun:
    id: UUID
    case_id: str
    project_id: str | None
    analysis_type: str
    status: str
    created_at: datetime
    snapshot_hash: str
    input_hash: str
    snapshot: dict[str, Any]
    validation: dict[str, Any]
    readiness: dict[str, Any]
    options: dict[str, Any] = field(default_factory=dict)
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error_message: str | None = None
    result_status: str = "VALID"
    raw_result: dict[str, Any] | None = None
    white_box_trace: list[dict[str, Any]] = field(default_factory=list)
    power_flow_trace: dict[str, Any] | None = None

    @property
    def solver_kind(self) -> str:
        if self.analysis_type == "PF":
            return "PF"
        return "short_circuit_sn"

    def to_execution_dict(self) -> dict[str, Any]:
        analysis_type = "LOAD_FLOW" if self.analysis_type == "PF" else "SC_3F"
        status = {
            "CREATED": "PENDING",
            "RUNNING": "RUNNING",
            "FINISHED": "DONE",
            "FAILED": "FAILED",
        }[self.status]
        return {
            "id": str(self.id),
            "study_case_id": self.case_id,
            "analysis_type": analysis_type,
            "solver_input_hash": self.input_hash,
            "status": status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "error_message": self.error_message,
        }


_runs: dict[UUID, CanonicalRun] = {}
_case_runs: dict[str, list[UUID]] = {}


def reset_canonical_runs() -> None:
    _runs.clear()
    _case_runs.clear()


def has_run(run_id: UUID) -> bool:
    return run_id in _runs


def get_run(run_id: UUID) -> CanonicalRun | None:
    return _runs.get(run_id)


def list_runs_for_case(case_id: str) -> list[CanonicalRun]:
    run_ids = _case_runs.get(case_id, [])
    runs = [_runs[run_id] for run_id in run_ids if run_id in _runs]
    return sorted(runs, key=lambda run: run.created_at, reverse=True)


def list_runs_for_project(project_id: str, *, analysis_type: str | None = None) -> list[CanonicalRun]:
    runs = [
        run
        for run in _runs.values()
        if run.project_id == project_id and (analysis_type is None or run.analysis_type == analysis_type)
    ]
    return sorted(runs, key=lambda run: run.created_at, reverse=True)


def create_run(
    *,
    case_id: str,
    analysis_type: str,
    project_id: str | None = None,
    options: dict[str, Any] | None = None,
) -> CanonicalRun:
    enm = get_enm(case_id)
    validator = ENMValidator()
    validation = validator.validate(enm)
    readiness = validator.readiness(validation)

    if validation.status == "FAIL":
        messages = [issue.message_pl for issue in validation.issues if issue.severity == "BLOCKER"]
        raise ValueError("; ".join(messages) or "Model sieci nie przeszedl walidacji")

    availability = validation.analysis_available
    if analysis_type == "PF" and not availability.load_flow:
        raise ValueError("Analiza rozpływu mocy nie jest dostepna dla biezacego snapshotu ENM")
    if analysis_type == "short_circuit_sn" and not availability.short_circuit_3f:
        raise ValueError("Analiza zwarciowa nie jest dostepna dla biezacego snapshotu ENM")

    snapshot = enm.model_dump(mode="json")
    enm_hash = compute_enm_hash(enm)
    normalized_options = dict(options or {})
    run = CanonicalRun(
        id=uuid4(),
        case_id=case_id,
        project_id=project_id,
        analysis_type=analysis_type,
        status="CREATED",
        created_at=datetime.now(timezone.utc),
        snapshot_hash=enm_hash,
        input_hash=_compute_input_hash(
            case_id=case_id,
            analysis_type=analysis_type,
            enm_hash=enm_hash,
            options=normalized_options,
        ),
        snapshot=snapshot,
        validation=validation.model_dump(mode="json"),
        readiness=readiness.model_dump(mode="json"),
        options=normalized_options,
    )
    _runs[run.id] = run
    _case_runs.setdefault(case_id, []).append(run.id)
    return run


def execute_run(run_id: UUID) -> CanonicalRun:
    run = _runs.get(run_id)
    if run is None:
        raise ValueError(f"Run {run_id} not found")
    if run.status in {"FINISHED", "FAILED"}:
        return run

    run.status = "RUNNING"
    run.started_at = datetime.now(timezone.utc)

    try:
        if run.analysis_type == "PF":
            _execute_power_flow(run)
        elif run.analysis_type == "short_circuit_sn":
            _execute_short_circuit(run)
        else:
            raise ValueError(f"Unsupported analysis type: {run.analysis_type}")
        run.status = "FINISHED"
        run.finished_at = datetime.now(timezone.utc)
        return run
    except Exception as exc:
        run.status = "FAILED"
        run.error_message = str(exc)
        run.finished_at = datetime.now(timezone.utc)
        return run


def run_short_circuit_now(*, case_id: str, project_id: str | None = None, options: dict[str, Any] | None = None) -> CanonicalRun:
    run = create_run(
        case_id=case_id,
        analysis_type="short_circuit_sn",
        project_id=project_id,
        options=options,
    )
    return execute_run(run.id)


def run_power_flow_now(*, case_id: str, project_id: str | None = None, options: dict[str, Any] | None = None) -> CanonicalRun:
    run = create_run(
        case_id=case_id,
        analysis_type="PF",
        project_id=project_id,
        options=options,
    )
    return execute_run(run.id)


def _load_graph(run: CanonicalRun):
    enm = EnergyNetworkModel.model_validate(run.snapshot)
    return map_enm_to_network_graph(enm)


def _execute_short_circuit(run: CanonicalRun) -> None:
    graph = _load_graph(run)
    c_factor = float(run.options.get("c_factor", 1.10))
    tk_s = float(run.options.get("thermal_time_seconds", 1.0))
    rows: list[dict[str, Any]] = []
    trace_steps: list[dict[str, Any]] = []

    for node_id in sorted(graph.nodes.keys()):
        result = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
            graph=graph,
            fault_node_id=node_id,
            c_factor=c_factor,
            tk_s=tk_s,
        )
        payload = result.to_dict()
        rows.append(payload)
        for step_index, step in enumerate(payload.get("white_box_trace", []), start=1):
            trace_steps.append(
                {
                    **step,
                    "step": len(trace_steps) + 1,
                    "target_id": node_id,
                    "title": step.get("title") or f"Zwarcie 3F: {node_id} / krok {step_index}",
                }
            )

    if not rows:
        raise ValueError("Nie udalo sie obliczyc wynikow zwarciowych dla zadnego wezla")

    run.raw_result = {
        "analysis_type": "short_circuit_3f",
        "case_id": run.case_id,
        "enm_hash": run.snapshot_hash,
        "results": rows,
    }
    run.white_box_trace = trace_steps
    run.power_flow_trace = None


def _execute_power_flow(run: CanonicalRun) -> None:
    graph = _load_graph(run)

    slack_nodes = sorted(
        node_id
        for node_id, node in graph.nodes.items()
        if node.node_type == NodeType.SLACK
    )
    if not slack_nodes:
        raise ValueError("Brak wezla bilansujacego SLACK w kanonicznym snapshotcie ENM")
    slack_node_id = slack_nodes[0]

    pq_specs = [
        PQSpec(
            node_id=node_id,
            p_mw=float(node.active_power or 0.0),
            q_mvar=float(node.reactive_power or 0.0),
        )
        for node_id, node in sorted(graph.nodes.items())
        if node.node_type == NodeType.PQ and node_id != slack_node_id
    ]

    options = PowerFlowOptions(
        tolerance=float(run.options.get("tolerance", 1e-8)),
        max_iter=int(run.options.get("max_iterations", run.options.get("max_iter", 30))),
        trace_level=str(run.options.get("trace_level", "full")),
    )
    base_mva = float(run.options.get("base_mva", 100.0))
    pf_input = PowerFlowInput(
        graph=graph,
        base_mva=base_mva,
        slack=SlackSpec(node_id=slack_node_id, u_pu=1.0, angle_rad=0.0),
        pq=pq_specs,
        options=options,
    )
    solution = PowerFlowNewtonSolver().solve(pf_input)

    node_p_injected_pu = {node.node_id: 0.0 for node in pf_input.pq}
    node_q_injected_pu = {node.node_id: 0.0 for node in pf_input.pq}
    for pq in pf_input.pq:
        node_p_injected_pu[pq.node_id] = pq.p_mw / base_mva
        node_q_injected_pu[pq.node_id] = pq.q_mvar / base_mva
    node_p_injected_pu[pf_input.slack.node_id] = float(solution.slack_power.real)
    node_q_injected_pu[pf_input.slack.node_id] = float(solution.slack_power.imag)

    result_v1 = build_power_flow_result_v1(
        converged=solution.converged,
        iterations_count=solution.iterations,
        tolerance_used=options.tolerance,
        base_mva=base_mva,
        slack_bus_id=pf_input.slack.node_id,
        node_u_mag=solution.node_u_mag,
        node_angle=solution.node_angle,
        node_p_injected_pu=node_p_injected_pu,
        node_q_injected_pu=node_q_injected_pu,
        branch_s_from_mva=solution.branch_s_from_mva,
        branch_s_to_mva=solution.branch_s_to_mva,
        losses_total=solution.losses_total,
        slack_power_pu=solution.slack_power,
    )

    run.raw_result = {
        "result_v1": result_v1.to_dict(),
        "node_voltage_kv": solution.node_voltage_kv,
        "branch_current_ka": solution.branch_current_ka,
        "graph": {
            "nodes": {
                node_id: {
                    "name": node.name,
                    "voltage_level": node.voltage_level,
                    "node_type": node.node_type.value,
                }
                for node_id, node in sorted(graph.nodes.items())
            },
            "branches": {
                branch_id: {
                    "name": branch.name,
                    "from_node_id": branch.from_node_id,
                    "to_node_id": branch.to_node_id,
                    "rated_current_a": getattr(branch, "rated_current_a", None),
                }
                for branch_id, branch in sorted(graph.branches.items())
            },
        },
    }
    run.white_box_trace = _build_power_flow_trace_steps(solution)
    run.power_flow_trace = {
        "solver_version": "1.0.0",
        "input_hash": run.input_hash,
        "snapshot_id": run.snapshot_hash,
        "case_id": run.case_id,
        "run_id": str(run.id),
        "init_state": solution.init_state or {},
        "init_method": "flat_start",
        "tolerance": options.tolerance,
        "max_iterations": options.max_iter,
        "base_mva": base_mva,
        "slack_bus_id": slack_node_id,
        "pq_bus_ids": [spec.node_id for spec in pf_input.pq],
        "pv_bus_ids": [],
        "ybus_trace": solution.ybus_trace,
        "iterations": [
            {
                "k": int(step.get("iter", index + 1)),
                "norm_mismatch": float(step.get("mismatch_norm", step.get("max_mismatch_pu", 0.0))),
                "max_mismatch_pu": float(step.get("max_mismatch_pu", 0.0)),
                "cause_if_failed": step.get("cause_if_failed_optional"),
            }
            for index, step in enumerate(solution.nr_trace)
        ],
        "converged": solution.converged,
        "final_iterations_count": solution.iterations,
    }


def _build_power_flow_trace_steps(solution) -> list[dict[str, Any]]:
    steps: list[dict[str, Any]] = []
    if solution.init_state:
        steps.append(
            {
                "step": 1,
                "title": "Stan poczatkowy",
                "phase": "init",
                "result": solution.init_state,
            }
        )
    for index, iteration in enumerate(solution.nr_trace, start=len(steps) + 1):
        steps.append(
            {
                "step": index,
                "title": f"Iteracja Newtona-Raphsona {iteration.get('iter', index)}",
                "phase": "newton_raphson",
                "inputs": {
                    "max_mismatch_pu": {
                        "value": float(iteration.get("max_mismatch_pu", 0.0)),
                        "unit": "pu",
                    },
                },
                "result": {
                    "norm_mismatch": {
                        "value": float(iteration.get("mismatch_norm", iteration.get("max_mismatch_pu", 0.0))),
                        "unit": "pu",
                    },
                },
                "notes": iteration.get("cause_if_failed_optional"),
            }
        )
    steps.append(
        {
            "step": len(steps) + 1,
            "title": "Wynik koncowy",
            "phase": "final",
            "result": {
                "converged": {"value": solution.converged},
                "iterations": {"value": solution.iterations},
                "max_mismatch_pu": {"value": float(solution.max_mismatch), "unit": "pu"},
            },
        }
    )
    return steps


def build_results_index(run: CanonicalRun) -> dict[str, Any]:
    raw_result = run.raw_result or {}
    tables: list[dict[str, Any]] = []
    if run.analysis_type == "PF":
        result_v1 = raw_result.get("result_v1", {})
        tables.extend(
            [
                {
                    "table_id": "buses",
                    "label_pl": "Szyny",
                    "row_count": len(result_v1.get("bus_results", [])),
                    "columns": [
                        {"key": "name", "label_pl": "Nazwa"},
                        {"key": "bus_id", "label_pl": "ID wezla"},
                        {"key": "un_kv", "label_pl": "Un", "unit": "kV"},
                        {"key": "u_kv", "label_pl": "U", "unit": "kV"},
                        {"key": "u_pu", "label_pl": "U", "unit": "pu"},
                        {"key": "angle_deg", "label_pl": "Kat", "unit": "deg"},
                    ],
                },
                {
                    "table_id": "branches",
                    "label_pl": "Galezie",
                    "row_count": len(result_v1.get("branch_results", [])),
                    "columns": [
                        {"key": "name", "label_pl": "Nazwa"},
                        {"key": "from_bus", "label_pl": "Od"},
                        {"key": "to_bus", "label_pl": "Do"},
                        {"key": "i_a", "label_pl": "I", "unit": "A"},
                        {"key": "p_mw", "label_pl": "P", "unit": "MW"},
                        {"key": "q_mvar", "label_pl": "Q", "unit": "MVAr"},
                        {"key": "s_mva", "label_pl": "S", "unit": "MVA"},
                        {"key": "loading_pct", "label_pl": "Obciazenie", "unit": "%"},
                    ],
                },
            ]
        )
    if run.analysis_type == "short_circuit_sn":
        tables.append(
            {
                "table_id": "short_circuit",
                "label_pl": "Zwarcia",
                "row_count": len(raw_result.get("results", [])),
                "columns": [
                    {"key": "target_id", "label_pl": "Cel"},
                    {"key": "ikss_ka", "label_pl": "Ik''", "unit": "kA"},
                    {"key": "ip_ka", "label_pl": "ip", "unit": "kA"},
                    {"key": "ith_ka", "label_pl": "Ith", "unit": "kA"},
                    {"key": "sk_mva", "label_pl": "Sk''", "unit": "MVA"},
                ],
            }
        )
    tables.append(
        {
            "table_id": "trace",
            "label_pl": "Slad obliczen",
            "row_count": len(run.white_box_trace),
            "columns": [{"key": "title", "label_pl": "Opis"}],
        }
    )
    return {
        "run_header": {
            "run_id": str(run.id),
            "project_id": run.project_id or run.case_id,
            "case_id": run.case_id,
            "snapshot_id": run.snapshot_hash,
            "created_at": run.created_at.isoformat(),
            "status": run.status,
            "result_state": run.result_status,
            "solver_kind": run.solver_kind,
            "input_hash": run.input_hash,
        },
        "tables": tables,
    }


def build_bus_results(run: CanonicalRun) -> dict[str, Any]:
    if run.analysis_type != "PF":
        return {"run_id": str(run.id), "rows": []}
    raw_result = run.raw_result or {}
    result_v1 = raw_result.get("result_v1", {})
    graph_nodes = (raw_result.get("graph") or {}).get("nodes", {})
    node_voltage_kv = raw_result.get("node_voltage_kv", {})
    rows = []
    for item in result_v1.get("bus_results", []):
        bus_id = item["bus_id"]
        node = graph_nodes.get(bus_id, {})
        flags: list[str] = []
        if node.get("node_type") == "SLACK":
            flags.append("SLACK")
        rows.append(
            {
                "bus_id": bus_id,
                "name": node.get("name", bus_id),
                "un_kv": node.get("voltage_level"),
                "u_kv": node_voltage_kv.get(bus_id),
                "u_pu": item.get("v_pu"),
                "angle_deg": item.get("angle_deg"),
                "flags": flags,
            }
        )
    rows.sort(key=lambda row: (row["name"], row["bus_id"]))
    return {"run_id": str(run.id), "rows": rows}


def build_branch_results(run: CanonicalRun) -> dict[str, Any]:
    if run.analysis_type != "PF":
        return {"run_id": str(run.id), "rows": []}
    raw_result = run.raw_result or {}
    result_v1 = raw_result.get("result_v1", {})
    graph_branches = (raw_result.get("graph") or {}).get("branches", {})
    branch_current_ka = raw_result.get("branch_current_ka", {})
    rows = []
    for item in result_v1.get("branch_results", []):
        branch_id = item["branch_id"]
        branch = graph_branches.get(branch_id, {})
        i_ka = branch_current_ka.get(branch_id)
        i_a = i_ka * 1000.0 if i_ka is not None else None
        s_mva = math.sqrt(item.get("p_from_mw", 0.0) ** 2 + item.get("q_from_mvar", 0.0) ** 2)
        rated_current_a = branch.get("rated_current_a")
        loading_pct = (i_a / rated_current_a * 100.0) if i_a is not None and rated_current_a else None
        flags: list[str] = []
        if loading_pct is not None and loading_pct > 100.0:
            flags.append("OVERLOADED")
        rows.append(
            {
                "branch_id": branch_id,
                "name": branch.get("name", branch_id),
                "from_bus": branch.get("from_node_id", ""),
                "to_bus": branch.get("to_node_id", ""),
                "i_a": i_a,
                "s_mva": s_mva,
                "p_mw": item.get("p_from_mw"),
                "q_mvar": item.get("q_from_mvar"),
                "loading_pct": loading_pct,
                "flags": flags,
            }
        )
    rows.sort(key=lambda row: (row["name"], row["branch_id"]))
    return {"run_id": str(run.id), "rows": rows}


def build_short_circuit_results(run: CanonicalRun) -> dict[str, Any]:
    if run.analysis_type != "short_circuit_sn":
        return {"run_id": str(run.id), "rows": []}
    rows = []
    for item in (run.raw_result or {}).get("results", []):
        rows.append(
            {
                "target_id": item.get("fault_node_id"),
                "target_name": item.get("fault_node_id"),
                "ikss_ka": _amps_to_ka(item.get("ikss_a")),
                "ip_ka": _amps_to_ka(item.get("ip_a")),
                "ith_ka": _amps_to_ka(item.get("ith_a")),
                "sk_mva": item.get("sk_mva"),
                "fault_type": item.get("short_circuit_type"),
                "flags": [],
            }
        )
    rows.sort(key=lambda row: row["target_id"] or "")
    return {"run_id": str(run.id), "rows": rows}


def _amps_to_ka(value: Any) -> float | None:
    if value is None:
        return None
    return float(value) / 1000.0


def build_extended_trace(run: CanonicalRun) -> dict[str, Any]:
    return {
        "run_id": str(run.id),
        "snapshot_id": run.snapshot_hash,
        "input_hash": run.input_hash,
        "white_box_trace": list(run.white_box_trace),
    }


def build_execution_result_set(run: CanonicalRun) -> dict[str, Any]:
    if run.status != "FINISHED":
        raise ValueError("Wyniki sa dostepne tylko dla zakonczonego przebiegu")
    element_results: list[dict[str, Any]] = []
    global_results: dict[str, Any] = {}
    if run.analysis_type == "short_circuit_sn":
        for item in (run.raw_result or {}).get("results", []):
            element_results.append(
                {
                    "element_ref": item.get("fault_node_id"),
                    "element_type": "Bus",
                    "values": {
                        "ikss_a": item.get("ikss_a"),
                        "ip_a": item.get("ip_a"),
                        "ith_a": item.get("ith_a"),
                        "sk_mva": item.get("sk_mva"),
                    },
                }
            )
        global_results = {
            "count": len(element_results),
            "analysis_type": "short_circuit_3f",
        }
    elif run.analysis_type == "PF":
        result_v1 = ((run.raw_result or {}).get("result_v1") or {})
        for row in result_v1.get("bus_results", []):
            element_results.append(
                {
                    "element_ref": row.get("bus_id"),
                    "element_type": "Bus",
                    "values": row,
                }
            )
        global_results = result_v1.get("summary", {})

    signature_payload = json.dumps(
        _canonicalize(
            {
                "run_id": str(run.id),
                "analysis_type": run.analysis_type,
                "validation": run.validation,
                "readiness": run.readiness,
                "element_results": element_results,
                "global_results": global_results,
            }
        ),
        sort_keys=True,
        separators=(",", ":"),
    )
    deterministic_signature = hashlib.sha256(signature_payload.encode("utf-8")).hexdigest()

    analysis_type = "LOAD_FLOW" if run.analysis_type == "PF" else "SC_3F"
    return {
        "run_id": str(run.id),
        "analysis_type": analysis_type,
        "validation_snapshot": run.validation,
        "readiness_snapshot": run.readiness,
        "element_results": element_results,
        "global_results": global_results,
        "deterministic_signature": deterministic_signature,
    }
