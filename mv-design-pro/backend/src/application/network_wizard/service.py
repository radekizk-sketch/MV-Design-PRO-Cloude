from __future__ import annotations

import json
from dataclasses import replace
from datetime import datetime, timezone
from typing import Any, Callable
from uuid import UUID, uuid4, uuid5

from analysis.power_flow.types import (
    PowerFlowInput,
    PowerFlowOptions,
    PQSpec,
    PVSpec,
    SlackSpec,
)
from domain.models import (
    OperatingCase,
    Project,
    StudyCase,
    new_operating_case,
    new_project,
    new_study_case,
)
from domain.validation import ValidationIssue, ValidationReport
from infrastructure.persistence.unit_of_work import UnitOfWork
from network_model.core import Branch, NetworkGraph, Node

from .dtos import (
    BranchPayload,
    FaultSpecPayload,
    GroundingPayload,
    ImportReport,
    LimitsPayload,
    LoadPayload,
    NodePayload,
    ShortCircuitInput,
    SourcePayload,
    SwitchingStatePayload,
    TypePayload,
)
from .errors import Conflict, NotFound, ValidationFailed
from .exporters.json_exporter import export_network_payload
from .importers.csv_importer import parse_branches_csv, parse_nodes_csv
from .importers.json_importer import parse_network_payload


class NetworkWizardService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def create_project(self, name: str, description: str | None = None) -> Project:
        project = new_project(name=name, description=description)
        with self._uow_factory() as uow:
            uow.projects.add(project, commit=False)
        return project

    def get_project(self, project_id: UUID) -> Project:
        with self._uow_factory() as uow:
            project = uow.projects.get(project_id)
        if project is None:
            raise NotFound(f"Project {project_id} not found")
        return project

    def list_projects(self) -> list[Project]:
        with self._uow_factory() as uow:
            return uow.projects.list_all()

    def update_project(self, project_id: UUID, patch: dict) -> Project:
        with self._uow_factory() as uow:
            project = uow.projects.get(project_id)
            if project is None:
                raise NotFound(f"Project {project_id} not found")
            updated = Project(
                id=project.id,
                name=patch.get("name", project.name),
                description=patch.get("description", project.description),
                schema_version=patch.get("schema_version", project.schema_version),
                created_at=project.created_at,
                updated_at=datetime.now(timezone.utc),
            )
            uow.projects.update(updated, commit=False)
        return updated

    def delete_project(self, project_id: UUID) -> None:
        with self._uow_factory() as uow:
            project = uow.projects.get(project_id)
            if project is None:
                raise NotFound(f"Project {project_id} not found")
            if uow.network.list_nodes(project_id) or uow.network.list_branches(project_id):
                raise Conflict("Cannot delete project with network elements")
            if uow.cases.list_operating_cases(project_id) or uow.cases.list_study_cases(
                project_id
            ):
                raise Conflict("Cannot delete project with cases")
            uow.projects.delete(project_id, commit=False)

    def add_node(self, project_id: UUID, payload: NodePayload) -> dict:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            node_id = payload.id or uuid4()
            node = {
                "id": node_id,
                "name": payload.name,
                "node_type": payload.node_type,
                "base_kv": payload.base_kv,
                "attrs": payload.attrs,
            }
            uow.network.add_node(project_id, node, commit=False)
        return node

    def update_node(self, project_id: UUID, node_id: UUID, patch: dict) -> dict:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            existing = uow.network.get_node(node_id)
            if existing is None or existing["project_id"] != project_id:
                raise NotFound(f"Node {node_id} not found")
            updated = uow.network.update_node(node_id, patch, commit=False)
        if updated is None:
            raise NotFound(f"Node {node_id} not found")
        return updated

    def remove_node(self, project_id: UUID, node_id: UUID) -> None:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            branches = uow.network.list_branches(project_id)
            if any(
                branch["from_node_id"] == node_id or branch["to_node_id"] == node_id
                for branch in branches
            ):
                raise Conflict("Cannot delete node with connected branches")
            uow.network.delete_node(node_id, commit=False)

    def add_branch(self, project_id: UUID, payload: BranchPayload) -> dict:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            branch_id = payload.id or uuid4()
            branch = {
                "id": branch_id,
                "name": payload.name,
                "branch_type": payload.branch_type,
                "from_node_id": payload.from_node_id,
                "to_node_id": payload.to_node_id,
                "in_service": payload.in_service,
                "params": payload.params,
            }
            uow.network.add_branch(project_id, branch, commit=False)
        return branch

    def update_branch(self, project_id: UUID, branch_id: UUID, patch: dict) -> dict:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            existing = uow.network.get_branch(branch_id)
            if existing is None or existing["project_id"] != project_id:
                raise NotFound(f"Branch {branch_id} not found")
            updated = uow.network.update_branch(branch_id, patch, commit=False)
        if updated is None:
            raise NotFound(f"Branch {branch_id} not found")
        return updated

    def remove_branch(self, project_id: UUID, branch_id: UUID) -> None:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            uow.network.delete_branch(branch_id, commit=False)

    def set_in_service(self, project_id: UUID, element_id: UUID, in_service: bool) -> None:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            branch = uow.network.get_branch(element_id)
            if branch is not None:
                if branch["project_id"] != project_id:
                    raise NotFound(f"Branch {element_id} not found")
                uow.network.update_branch(
                    element_id, {"in_service": in_service}, commit=False
                )
                return
            node = uow.network.get_node(element_id)
            if node is None or node["project_id"] != project_id:
                raise NotFound(f"Element {element_id} not found")
            attrs = dict(node.get("attrs") or {})
            attrs["in_service"] = in_service
            uow.network.update_node(element_id, {"attrs": attrs}, commit=False)

    def set_pcc(self, project_id: UUID, node_id: UUID) -> None:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            node = uow.network.get_node(node_id)
            if node is None or node["project_id"] != project_id:
                raise NotFound(f"Node {node_id} not found")
            uow.wizard.set_pcc(project_id, node_id, commit=False)

    def get_pcc(self, project_id: UUID) -> UUID | None:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            return uow.wizard.get_settings(project_id)["pcc_node_id"]

    def set_sources(self, project_id: UUID, sources: list[SourcePayload]) -> None:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            uow.wizard.delete_sources_by_project(project_id, commit=False)
            for source in sources:
                payload = self._source_payload_to_record(project_id, source)
                uow.wizard.upsert_source(project_id, payload, commit=False)

    def get_sources(self, project_id: UUID) -> list[SourcePayload]:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            sources = uow.wizard.list_sources(project_id)
        return [self._source_payload_from_record(item) for item in sources]

    def add_load(self, project_id: UUID, payload: LoadPayload) -> dict:
        load_id = payload.id or uuid4()
        record = {
            "id": load_id,
            "node_id": payload.node_id,
            "payload": payload.payload,
            "in_service": payload.in_service,
        }
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            self._ensure_node(uow, project_id, payload.node_id)
            uow.wizard.upsert_load(project_id, record, commit=False)
        return record

    def update_load(self, project_id: UUID, load_id: UUID, patch: dict) -> dict:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            loads = uow.wizard.list_loads(project_id)
            existing = next((item for item in loads if item["id"] == load_id), None)
            if existing is None:
                raise NotFound(f"Load {load_id} not found")
            node_id = patch.get("node_id", existing["node_id"])
            self._ensure_node(uow, project_id, node_id)
            record = {
                "id": load_id,
                "node_id": node_id,
                "payload": patch.get("payload", existing["payload"]),
                "in_service": patch.get("in_service", existing["in_service"]),
            }
            uow.wizard.upsert_load(project_id, record, commit=False)
        return record

    def remove_load(self, project_id: UUID, load_id: UUID) -> None:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            uow.wizard.delete_load(load_id, commit=False)

    def list_loads(self, project_id: UUID) -> list[LoadPayload]:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            loads = uow.wizard.list_loads(project_id)
        return [self._load_payload_from_record(item) for item in loads]

    def add_source(self, project_id: UUID, payload: SourcePayload) -> dict:
        record = self._source_payload_to_record(project_id, payload)
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            self._ensure_node(uow, project_id, payload.node_id)
            uow.wizard.upsert_source(project_id, record, commit=False)
        return record

    def update_source(self, project_id: UUID, source_id: UUID, patch: dict) -> dict:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            sources = uow.wizard.list_sources(project_id)
            existing = next((item for item in sources if item["id"] == source_id), None)
            if existing is None:
                raise NotFound(f"Source {source_id} not found")
            node_id = patch.get("node_id", existing["node_id"])
            self._ensure_node(uow, project_id, node_id)
            record = {
                "id": source_id,
                "node_id": node_id,
                "source_type": patch.get("source_type", existing["source_type"]),
                "payload": patch.get("payload", existing["payload"]),
                "in_service": patch.get("in_service", existing["in_service"]),
            }
            uow.wizard.upsert_source(project_id, record, commit=False)
        return record

    def remove_source(self, project_id: UUID, source_id: UUID) -> None:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            uow.wizard.delete_source(source_id, commit=False)

    def set_grounding(self, project_id: UUID, payload: GroundingPayload) -> None:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            grounding = {"grounding_type": payload.grounding_type, "params": payload.params}
            uow.wizard.set_grounding(project_id, grounding, commit=False)

    def get_grounding(self, project_id: UUID) -> GroundingPayload:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            settings = uow.wizard.get_settings(project_id)
        grounding = settings.get("grounding") or {}
        return GroundingPayload(
            grounding_type=grounding.get("grounding_type", "UNDEFINED"),
            params=grounding.get("params", {}),
        )

    def set_limits(self, project_id: UUID, payload: LimitsPayload) -> None:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            limits = {
                "voltage_limits": payload.voltage_limits,
                "thermal_limits": payload.thermal_limits,
            }
            uow.wizard.set_limits(project_id, limits, commit=False)

    def get_limits(self, project_id: UUID) -> LimitsPayload:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            settings = uow.wizard.get_settings(project_id)
        limits = settings.get("limits") or {}
        return LimitsPayload(
            voltage_limits=limits.get("voltage_limits", {}),
            thermal_limits=limits.get("thermal_limits", {}),
        )

    def create_line_type(self, payload: TypePayload) -> dict:
        type_id = payload.id or uuid4()
        record = {"id": type_id, "name": payload.name, "params": payload.params}
        with self._uow_factory() as uow:
            uow.wizard.upsert_line_type(record, commit=False)
        return record

    def create_cable_type(self, payload: TypePayload) -> dict:
        type_id = payload.id or uuid4()
        record = {"id": type_id, "name": payload.name, "params": payload.params}
        with self._uow_factory() as uow:
            uow.wizard.upsert_cable_type(record, commit=False)
        return record

    def create_transformer_type(self, payload: TypePayload) -> dict:
        type_id = payload.id or uuid4()
        record = {"id": type_id, "name": payload.name, "params": payload.params}
        with self._uow_factory() as uow:
            uow.wizard.upsert_transformer_type(record, commit=False)
        return record

    def list_line_types(self) -> list[dict]:
        with self._uow_factory() as uow:
            return uow.wizard.list_line_types()

    def list_cable_types(self) -> list[dict]:
        with self._uow_factory() as uow:
            return uow.wizard.list_cable_types()

    def list_transformer_types(self) -> list[dict]:
        with self._uow_factory() as uow:
            return uow.wizard.list_transformer_types()

    def set_case_switching(
        self,
        case_id: UUID,
        element_id: UUID,
        in_service: bool,
        element_type: str = "branch",
    ) -> None:
        with self._uow_factory() as uow:
            case = uow.cases.get_operating_case(case_id)
            if case is None:
                raise NotFound(f"OperatingCase {case_id} not found")
            uow.wizard.set_switching_state(
                case_id, element_id, element_type, in_service, commit=False
            )

    def get_effective_in_service(
        self, project_id: UUID, case_id: UUID, element_id: UUID
    ) -> bool:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            case = uow.cases.get_operating_case(case_id)
            if case is None or case.project_id != project_id:
                raise NotFound(f"OperatingCase {case_id} not found")
            states = uow.wizard.list_switching_states(case_id)
            state = next((item for item in states if item["element_id"] == element_id), None)
            if state is not None:
                return bool(state["in_service"])
            branch = uow.network.get_branch(element_id)
            if branch is not None:
                return bool(branch.get("in_service", True))
            node = uow.network.get_node(element_id)
            if node is None:
                raise NotFound(f"Element {element_id} not found")
            attrs = node.get("attrs") or {}
            return bool(attrs.get("in_service", True))

    def create_operating_case(self, project_id: UUID, name: str, payload: dict) -> OperatingCase:
        case = new_operating_case(project_id, name, payload)
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            uow.cases.add_operating_case(case, commit=False)
        return case

    def update_operating_case(self, project_id: UUID, case_id: UUID, patch: dict) -> OperatingCase:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            existing = uow.cases.get_operating_case(case_id)
            if existing is None or existing.project_id != project_id:
                raise NotFound(f"OperatingCase {case_id} not found")
            updated = OperatingCase(
                id=existing.id,
                project_id=existing.project_id,
                name=patch.get("name", existing.name),
                case_payload=patch.get("case_payload", existing.case_payload),
                created_at=existing.created_at,
                updated_at=datetime.now(timezone.utc),
            )
            uow.cases.update_operating_case(updated, commit=False)
        return updated

    def list_operating_cases(self, project_id: UUID) -> list[OperatingCase]:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            return uow.cases.list_operating_cases(project_id)

    def clone_operating_case(
        self, project_id: UUID, case_id: UUID, new_name: str
    ) -> OperatingCase:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            existing = uow.cases.get_operating_case(case_id)
            if existing is None or existing.project_id != project_id:
                raise NotFound(f"OperatingCase {case_id} not found")
            clone = new_operating_case(project_id, new_name, existing.case_payload)
            uow.cases.add_operating_case(clone, commit=False)
        return clone

    def create_study_case(self, project_id: UUID, name: str, payload: dict) -> StudyCase:
        case = new_study_case(project_id, name, payload)
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            uow.cases.add_study_case(case, commit=False)
        return case

    def list_study_cases(self, project_id: UUID) -> list[StudyCase]:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            return uow.cases.list_study_cases(project_id)

    def validate_network(self, project_id: UUID, case_id: UUID | None = None) -> ValidationReport:
        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            nodes = uow.network.list_nodes(project_id)
            branches = uow.network.list_branches(project_id)
            settings = uow.wizard.get_settings(project_id)
            pcc_node_id = settings.get("pcc_node_id")
            grounding = settings.get("grounding") or {}
            limits = settings.get("limits") or {}
            sources = uow.wizard.list_sources(project_id)
            loads = uow.wizard.list_loads(project_id)
            line_types = {item["id"]: item for item in uow.wizard.list_line_types()}
            cable_types = {item["id"]: item for item in uow.wizard.list_cable_types()}
            transformer_types = {
                item["id"]: item for item in uow.wizard.list_transformer_types()
            }
            if case_id is not None:
                case = uow.cases.get_operating_case(case_id)
                if case is None or case.project_id != project_id:
                    raise NotFound(f"OperatingCase {case_id} not found")

        report = ValidationReport()
        node_ids = {node["id"] for node in nodes}

        if not nodes:
            report = report.with_error(
                ValidationIssue(code="network.empty", message="Network has no nodes")
            )

        if pcc_node_id is None:
            report = report.with_error(
                ValidationIssue(
                    code="pcc.missing",
                    message="PCC – punkt wspólnego przyłączenia must be defined",
                )
            )
        elif pcc_node_id not in node_ids:
            report = report.with_error(
                ValidationIssue(
                    code="pcc.invalid",
                    message="PCC – punkt wspólnego przyłączenia points to missing node",
                    element_id=str(pcc_node_id),
                )
            )

        for node in nodes:
            report = self._validate_node(node, report)

        for branch in branches:
            report = self._validate_branch(
                branch, node_ids, report, line_types, cable_types, transformer_types, nodes
            )

        slack_nodes = [node for node in nodes if self._normalize_node_type(node["node_type"]) == "SLACK"]
        if not slack_nodes:
            report = report.with_error(
                ValidationIssue(code="pf.slack_missing", message="No SLACK node defined")
            )

        if not sources:
            report = report.with_error(
                ValidationIssue(
                    code="sources.missing",
                    message="At least one source must be configured",
                )
            )
        else:
            pcc_has_source = False
            for source in sources:
                node_id = source.get("node_id")
                node_uuid: UUID | None = None
                if not node_id:
                    report = report.with_error(
                        ValidationIssue(
                            code="sources.node_missing",
                            message="Source references missing node",
                            element_id=str(node_id),
                        )
                    )
                else:
                    try:
                        node_uuid = UUID(str(node_id))
                    except ValueError:
                        report = report.with_error(
                            ValidationIssue(
                                code="sources.node_invalid",
                                message="Source node_id is not a valid UUID",
                                element_id=str(node_id),
                            )
                        )
                    else:
                        if node_uuid not in node_ids:
                            report = report.with_error(
                                ValidationIssue(
                                    code="sources.node_missing",
                                    message="Source references missing node",
                                    element_id=str(node_id),
                                )
                            )
                if pcc_node_id is not None and node_uuid == pcc_node_id:
                    pcc_has_source = True
                if not source.get("source_type"):
                    report = report.with_error(
                        ValidationIssue(
                            code="sources.type_missing",
                            message="Source type is required",
                            element_id=str(source.get("id")),
                        )
                    )
            if pcc_node_id is not None and not pcc_has_source:
                report = report.with_error(
                    ValidationIssue(
                        code="sources.pcc_missing",
                        message="PCC – punkt wspólnego przyłączenia has no source",
                    )
                )

        for load in loads:
            load_node_id = load.get("node_id")
            if load_node_id not in node_ids:
                report = report.with_error(
                    ValidationIssue(
                        code="loads.node_missing",
                        message="Load references missing node",
                        element_id=str(load.get("id")),
                    )
                )
            payload = load.get("payload", {})
            if payload.get("p_mw") is None or payload.get("q_mvar") is None:
                report = report.with_warning(
                    ValidationIssue(
                        code="loads.incomplete",
                        message="Load should include p_mw and q_mvar",
                        element_id=str(load.get("id")),
                    )
                )

        if not grounding:
            report = report.with_warning(
                ValidationIssue(
                    code="grounding.missing",
                    message="Grounding configuration is missing",
                )
            )

        if not limits:
            report = report.with_warning(
                ValidationIssue(
                    code="limits.missing",
                    message="Operational limits are missing",
                )
            )

        return report

    def build_network_graph(self, project_id: UUID, case_id: UUID | None = None) -> NetworkGraph:
        report = self.validate_network(project_id, case_id)
        if not report.is_valid:
            raise ValidationFailed(report)

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

    def build_power_flow_input(
        self, project_id: UUID, case_id: UUID, options: dict | None = None
    ) -> PowerFlowInput:
        graph = self.build_network_graph(project_id, case_id)
        with self._uow_factory() as uow:
            case = uow.cases.get_operating_case(case_id)
            if case is None or case.project_id != project_id:
                raise NotFound(f"OperatingCase {case_id} not found")
            settings = uow.wizard.get_settings(project_id)
            loads = uow.wizard.list_loads(project_id)
            sources = uow.wizard.list_sources(project_id)

        case_payload = case.case_payload
        base_mva = float(case_payload.get("base_mva", 100.0))

        slack_node_id = settings.get("pcc_node_id") or self._select_slack_node_id(project_id)
        slack_data = self._lookup_node_attrs(project_id, slack_node_id)
        slack_spec = SlackSpec(
            node_id=str(slack_node_id),
            u_pu=slack_data.get("voltage_magnitude", 1.0) or 1.0,
            angle_rad=slack_data.get("voltage_angle", 0.0) or 0.0,
        )

        pq_specs: list[PQSpec] = []
        for load in loads:
            if not load.get("in_service", True):
                continue
            payload = load.get("payload", {})
            pq_specs.append(
                PQSpec(
                    node_id=str(load["node_id"]),
                    p_mw=float(payload.get("p_mw", 0.0)),
                    q_mvar=float(payload.get("q_mvar", 0.0)),
                )
            )

        pv_specs: list[PVSpec] = []
        for source in sources:
            if not source.get("in_service", True):
                continue
            payload = source.get("payload", {})
            if source.get("source_type") == "GRID":
                continue
            pv_specs.append(
                PVSpec(
                    node_id=str(source["node_id"]),
                    p_mw=float(payload.get("p_mw", 0.0)),
                    u_pu=float(payload.get("u_pu", 1.0)),
                    q_min_mvar=float(payload.get("q_min_mvar", -1e6)),
                    q_max_mvar=float(payload.get("q_max_mvar", 1e6)),
                )
            )

        options_data = options or {}
        return PowerFlowInput(
            graph=graph,
            base_mva=base_mva,
            slack=slack_spec,
            pq=pq_specs,
            pv=pv_specs,
            options=PowerFlowOptions(**options_data),
        )

    def build_short_circuit_input(
        self,
        project_id: UUID,
        case_id: UUID,
        fault_spec: dict,
        options: dict | None = None,
    ) -> ShortCircuitInput:
        graph = self.build_network_graph(project_id, case_id)
        with self._uow_factory() as uow:
            case = uow.cases.get_operating_case(case_id)
            if case is None or case.project_id != project_id:
                raise NotFound(f"OperatingCase {case_id} not found")
            settings = uow.wizard.get_settings(project_id)
            pcc_node_id = settings.get("pcc_node_id")
            grounding = settings.get("grounding") or {}
            limits = settings.get("limits") or {}
            sources = uow.wizard.list_sources(project_id)
            loads = uow.wizard.list_loads(project_id)

        if pcc_node_id is None:
            report = ValidationReport().with_error(
                ValidationIssue(
                    code="pcc.missing",
                    message="PCC – punkt wspólnego przyłączenia must be defined",
                )
            )
            raise ValidationFailed(report)

        fault_node_id = fault_spec.get("node_id")
        fault_branch_id = fault_spec.get("branch_id")
        if fault_node_id is None and fault_branch_id is None:
            report = ValidationReport().with_error(
                ValidationIssue(
                    code="fault.missing_location",
                    message="FaultSpec requires node_id or branch_id",
                )
            )
            raise ValidationFailed(report)

        with self._uow_factory() as uow:
            if fault_node_id is not None:
                node = uow.network.get_node(UUID(str(fault_node_id)))
                if node is None or node["project_id"] != project_id:
                    raise NotFound("Fault node not found")
            if fault_branch_id is not None:
                branch = uow.network.get_branch(UUID(str(fault_branch_id)))
                if branch is None or branch["project_id"] != project_id:
                    raise NotFound("Fault branch not found")

        base_mva = float(case.case_payload.get("base_mva", 100.0))
        return ShortCircuitInput(
            graph=graph,
            base_mva=base_mva,
            pcc_node_id=str(pcc_node_id),
            sources=self._normalize_source_dicts(sources),
            loads=self._normalize_load_dicts(loads),
            grounding=grounding,
            limits=limits,
            fault_spec=fault_spec,
            options=options or {},
        )

    def export_network(self, project_id: UUID) -> dict:
        with self._uow_factory() as uow:
            project = uow.projects.get(project_id)
            if project is None:
                raise NotFound(f"Project {project_id} not found")
            nodes = uow.network.list_nodes(project_id)
            branches = uow.network.list_branches(project_id)
            operating_cases = uow.cases.list_operating_cases(project_id)
            study_cases = uow.cases.list_study_cases(project_id)
            settings = uow.wizard.get_settings(project_id)
            pcc_node_id = settings.get("pcc_node_id")
            sources = uow.wizard.list_sources(project_id)
            loads = uow.wizard.list_loads(project_id)
            line_types = uow.wizard.list_line_types()
            cable_types = uow.wizard.list_cable_types()
            transformer_types = uow.wizard.list_transformer_types()
            switching_states = []
            for case in operating_cases:
                switching_states.extend(uow.wizard.list_switching_states(case.id))

        nodes_payload = [self._serialize_node(node) for node in nodes]
        branches_payload = [self._serialize_branch(branch) for branch in branches]
        operating_payload = [self._serialize_case(case) for case in operating_cases]
        study_payload = [self._serialize_study(case) for case in study_cases]

        nodes_payload.sort(key=lambda item: item["id"])
        branches_payload.sort(key=lambda item: item["id"])
        operating_payload.sort(key=lambda item: item["id"])
        study_payload.sort(key=lambda item: item["id"])
        sources_payload = sorted(self._normalize_source_dicts(sources), key=lambda item: item["id"])
        loads_payload = sorted(self._normalize_load_dicts(loads), key=lambda item: item["id"])
        line_types.sort(key=lambda item: str(item["id"]))
        cable_types.sort(key=lambda item: str(item["id"]))
        transformer_types.sort(key=lambda item: str(item["id"]))
        switching_states.sort(key=lambda item: (str(item["case_id"]), str(item["element_id"])))

        return export_network_payload(
            project={
                "id": str(project.id),
                "name": project.name,
                "description": project.description,
            },
            nodes=nodes_payload,
            branches=branches_payload,
            operating_cases=operating_payload,
            study_cases=study_payload,
            pcc_node_id=str(pcc_node_id) if pcc_node_id else None,
            sources=sources_payload,
            loads=loads_payload,
            grounding=settings.get("grounding") or {},
            limits=settings.get("limits") or {},
            line_types=line_types,
            cable_types=cable_types,
            transformer_types=transformer_types,
            switching_states=switching_states,
            schema_version=project.schema_version,
        )

    def import_network(
        self, project_id: UUID, payload: dict, mode: str = "merge"
    ) -> ImportReport:
        if mode not in {"merge", "replace"}:
            raise Conflict(f"Unsupported import mode: {mode}")

        parsed = parse_network_payload(payload)
        errors: list[str] = []
        created: dict[str, int] = {}
        updated: dict[str, int] = {}
        skipped: dict[str, int] = {}

        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            if mode == "replace":
                uow.network.replace_branches(project_id, [], commit=False)
                uow.network.replace_nodes(project_id, [], commit=False)
                uow.cases.delete_operating_cases_by_project(project_id, commit=False)
                uow.cases.delete_study_cases_by_project(project_id, commit=False)
                uow.wizard.delete_sources_by_project(project_id, commit=False)
                uow.wizard.delete_loads_by_project(project_id, commit=False)
                uow.wizard.delete_switching_states_by_project(project_id, commit=False)
                uow.wizard.set_pcc(project_id, None, commit=False)
                uow.wizard.set_grounding(project_id, {}, commit=False)
                uow.wizard.set_limits(project_id, {}, commit=False)
            existing_source_ids = {item["id"] for item in uow.wizard.list_sources(project_id)}
            existing_load_ids = {item["id"] for item in uow.wizard.list_loads(project_id)}
            existing_line_type_ids = {item["id"] for item in uow.wizard.list_line_types()}
            existing_cable_type_ids = {item["id"] for item in uow.wizard.list_cable_types()}
            existing_transformer_type_ids = {
                item["id"] for item in uow.wizard.list_transformer_types()
            }
            for node_data in parsed["nodes"]:
                try:
                    result = self._upsert_node(uow, project_id, node_data)
                except ValueError as exc:
                    errors.append(str(exc))
                    skipped["nodes"] = skipped.get("nodes", 0) + 1
                else:
                    created, updated = self._bump_counts(result, created, updated, "nodes")

            for branch_data in parsed["branches"]:
                try:
                    result = self._upsert_branch(uow, project_id, branch_data)
                except ValueError as exc:
                    errors.append(str(exc))
                    skipped["branches"] = skipped.get("branches", 0) + 1
                else:
                    created, updated = self._bump_counts(result, created, updated, "branches")

            for case_data in parsed["operating_cases"]:
                try:
                    result = self._upsert_operating_case(uow, project_id, case_data)
                except ValueError as exc:
                    errors.append(str(exc))
                    skipped["operating_cases"] = skipped.get("operating_cases", 0) + 1
                else:
                    created, updated = self._bump_counts(result, created, updated, "operating_cases")

            for case_data in parsed["study_cases"]:
                try:
                    result = self._upsert_study_case(uow, project_id, case_data)
                except ValueError as exc:
                    errors.append(str(exc))
                    skipped["study_cases"] = skipped.get("study_cases", 0) + 1
                else:
                    created, updated = self._bump_counts(result, created, updated, "study_cases")

            pcc_node_id = parsed.get("pcc_node_id")
            if pcc_node_id:
                try:
                    uow.wizard.set_pcc(project_id, UUID(str(pcc_node_id)), commit=False)
                except ValueError as exc:
                    errors.append(str(exc))

            for source in parsed.get("sources", []):
                try:
                    payload = self._source_payload_from_dict(source)
                    record = self._source_payload_to_record(project_id, payload)
                    uow.wizard.upsert_source(project_id, record, commit=False)
                    result = "updated" if record["id"] in existing_source_ids else "created"
                    created, updated = self._bump_counts(result, created, updated, "sources")
                except ValueError as exc:
                    errors.append(str(exc))

            for load in parsed.get("loads", []):
                try:
                    record = self._load_record_from_dict(project_id, load)
                    uow.wizard.upsert_load(project_id, record, commit=False)
                    result = "updated" if record["id"] in existing_load_ids else "created"
                    created, updated = self._bump_counts(result, created, updated, "loads")
                except ValueError as exc:
                    errors.append(str(exc))

            grounding = parsed.get("grounding", {})
            if grounding:
                uow.wizard.set_grounding(project_id, grounding, commit=False)

            limits = parsed.get("limits", {})
            if limits:
                uow.wizard.set_limits(project_id, limits, commit=False)

            for item in parsed.get("line_types", []):
                try:
                    record = self._type_record_from_dict(item)
                    uow.wizard.upsert_line_type(record, commit=False)
                    result = "updated" if record["id"] in existing_line_type_ids else "created"
                    created, updated = self._bump_counts(result, created, updated, "line_types")
                except ValueError as exc:
                    errors.append(str(exc))

            for item in parsed.get("cable_types", []):
                try:
                    record = self._type_record_from_dict(item)
                    uow.wizard.upsert_cable_type(record, commit=False)
                    result = "updated" if record["id"] in existing_cable_type_ids else "created"
                    created, updated = self._bump_counts(result, created, updated, "cable_types")
                except ValueError as exc:
                    errors.append(str(exc))

            for item in parsed.get("transformer_types", []):
                try:
                    record = self._type_record_from_dict(item)
                    uow.wizard.upsert_transformer_type(record, commit=False)
                    result = (
                        "updated"
                        if record["id"] in existing_transformer_type_ids
                        else "created"
                    )
                    created, updated = self._bump_counts(
                        result, created, updated, "transformer_types"
                    )
                except ValueError as exc:
                    errors.append(str(exc))

            for state in parsed.get("switching_states", []):
                try:
                    case_id = UUID(str(state.get("case_id")))
                    element_id = UUID(str(state.get("element_id")))
                    element_type = str(state.get("element_type"))
                    in_service = bool(state.get("in_service", True))
                    uow.wizard.set_switching_state(
                        case_id, element_id, element_type, in_service, commit=False
                    )
                    created, updated = self._bump_counts(
                        "created", created, updated, "switching_states"
                    )
                except ValueError as exc:
                    errors.append(str(exc))

        validation = self.validate_network(project_id)
        return ImportReport(
            created=created,
            updated=updated,
            skipped=skipped,
            errors=tuple(errors),
            validation=validation,
        )

    def import_nodes_branches_from_csv(
        self,
        project_id: UUID,
        nodes_csv: str,
        branches_csv: str,
        mode: str = "merge",
    ) -> ImportReport:
        if mode not in {"merge", "replace"}:
            raise Conflict(f"Unsupported import mode: {mode}")

        errors: list[str] = []
        created: dict[str, int] = {}
        updated: dict[str, int] = {}
        skipped: dict[str, int] = {}

        nodes_payload = parse_nodes_csv(nodes_csv)
        branches_payload = parse_branches_csv(branches_csv)

        with self._uow_factory() as uow:
            self._ensure_project(uow, project_id)
            if mode == "replace":
                uow.network.replace_branches(project_id, [], commit=False)
                uow.network.replace_nodes(project_id, [], commit=False)
            for node_data in nodes_payload:
                try:
                    result = self._upsert_node(uow, project_id, node_data)
                except ValueError as exc:
                    errors.append(str(exc))
                    skipped["nodes"] = skipped.get("nodes", 0) + 1
                else:
                    created, updated = self._bump_counts(result, created, updated, "nodes")

            for branch_data in branches_payload:
                try:
                    result = self._upsert_branch(uow, project_id, branch_data)
                except ValueError as exc:
                    errors.append(str(exc))
                    skipped["branches"] = skipped.get("branches", 0) + 1
                else:
                    created, updated = self._bump_counts(result, created, updated, "branches")

        validation = self.validate_network(project_id)
        return ImportReport(
            created=created,
            updated=updated,
            skipped=skipped,
            errors=tuple(errors),
            validation=validation,
        )

    def _ensure_project(self, uow: UnitOfWork, project_id: UUID) -> None:
        if uow.projects.get(project_id) is None:
            raise NotFound(f"Project {project_id} not found")

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

    def _node_attrs_from_node(self, node: dict) -> dict[str, Any]:
        attrs = dict(node.get("attrs") or {})
        mapped = {
            "voltage_magnitude": attrs.get("voltage_magnitude_pu") or attrs.get("voltage_magnitude"),
            "voltage_angle": attrs.get("voltage_angle_rad") or attrs.get("voltage_angle"),
            "active_power": attrs.get("active_power_mw") or attrs.get("active_power"),
            "reactive_power": attrs.get("reactive_power_mvar") or attrs.get("reactive_power"),
            "q_min_mvar": attrs.get("q_min_mvar"),
            "q_max_mvar": attrs.get("q_max_mvar"),
        }
        return {key: value for key, value in mapped.items() if value is not None}

    def _validate_node(self, node: dict, report: ValidationReport) -> ValidationReport:
        node_id = str(node["id"])
        if node["base_kv"] <= 0:
            report = report.with_error(
                ValidationIssue(
                    code="node.base_kv",
                    message="Node base_kv must be positive",
                    element_id=node_id,
                    field="base_kv",
                )
            )
        node_type_raw = node["node_type"]
        node_type = self._normalize_node_type(node_type_raw)
        if node_type is None:
            report = report.with_error(
                ValidationIssue(
                    code="node.type",
                    message="Node type must be SLACK, PQ, PV, or station node type",
                    element_id=node_id,
                    field="node_type",
                )
            )
            return report
        if node_type_raw.upper() not in {"SLACK", "PQ", "PV"}:
            return report
        attrs = self._node_attrs_from_node(node)
        if node_type == "SLACK":
            if attrs.get("voltage_magnitude") is None:
                report = report.with_error(
                    ValidationIssue(
                        code="node.slack.magnitude",
                        message="SLACK node requires voltage_magnitude_pu",
                        element_id=node_id,
                    )
                )
            if attrs.get("voltage_angle") is None:
                report = report.with_error(
                    ValidationIssue(
                        code="node.slack.angle",
                        message="SLACK node requires voltage_angle_rad",
                        element_id=node_id,
                    )
                )
        if node_type == "PQ":
            if attrs.get("active_power") is None:
                report = report.with_error(
                    ValidationIssue(
                        code="node.pq.active_power",
                        message="PQ node requires active_power_mw",
                        element_id=node_id,
                    )
                )
            if attrs.get("reactive_power") is None:
                report = report.with_error(
                    ValidationIssue(
                        code="node.pq.reactive_power",
                        message="PQ node requires reactive_power_mvar",
                        element_id=node_id,
                    )
                )
        if node_type == "PV":
            if attrs.get("active_power") is None:
                report = report.with_error(
                    ValidationIssue(
                        code="node.pv.active_power",
                        message="PV node requires active_power_mw",
                        element_id=node_id,
                    )
                )
            if attrs.get("voltage_magnitude") is None:
                report = report.with_error(
                    ValidationIssue(
                        code="node.pv.voltage",
                        message="PV node requires voltage_magnitude_pu",
                        element_id=node_id,
                    )
                )
        if attrs.get("voltage_magnitude") is not None and attrs["voltage_magnitude"] <= 0:
            report = report.with_error(
                ValidationIssue(
                    code="node.voltage_magnitude",
                    message="Node voltage magnitude must be positive",
                    element_id=node_id,
                )
            )
        return report

    def _validate_branch(
        self,
        branch: dict,
        node_ids: set[UUID],
        report: ValidationReport,
        line_types: dict,
        cable_types: dict,
        transformer_types: dict,
        nodes: list[dict],
    ) -> ValidationReport:
        branch_id = str(branch["id"])
        if branch["from_node_id"] not in node_ids:
            report = report.with_error(
                ValidationIssue(
                    code="branch.from_missing",
                    message="Branch from_node_id does not exist",
                    element_id=branch_id,
                    field="from_node_id",
                )
            )
        if branch["to_node_id"] not in node_ids:
            report = report.with_error(
                ValidationIssue(
                    code="branch.to_missing",
                    message="Branch to_node_id does not exist",
                    element_id=branch_id,
                    field="to_node_id",
                )
            )
        if branch["from_node_id"] == branch["to_node_id"]:
            report = report.with_error(
                ValidationIssue(
                    code="branch.self_loop",
                    message="Branch cannot connect a node to itself",
                    element_id=branch_id,
                )
            )
        branch_type = branch["branch_type"].upper()
        params = branch.get("params") or {}
        if branch_type in {"LINE", "CABLE"}:
            type_id = params.get("type_id")
            if type_id:
                type_library = line_types if branch_type == "LINE" else cable_types
                try:
                    type_uuid = UUID(str(type_id))
                except ValueError:
                    report = report.with_error(
                        ValidationIssue(
                            code="branch.type_invalid",
                            message="Branch type_id is not a valid UUID",
                            element_id=branch_id,
                            field="type_id",
                        )
                    )
                else:
                    if type_uuid not in type_library:
                        report = report.with_error(
                            ValidationIssue(
                                code="branch.type_missing",
                                message="Branch type_id not found in type library",
                                element_id=branch_id,
                                field="type_id",
                            )
                        )
            else:
                report = self._validate_branch_params(
                    report,
                    branch_id,
                    params,
                    required=["r_ohm_per_km", "x_ohm_per_km", "length_km"],
                )
            report = self._validate_line_voltage_levels(branch, nodes, report, branch_id)
        elif branch_type == "TRANSFORMER":
            type_id = params.get("type_id")
            if type_id:
                try:
                    type_uuid = UUID(str(type_id))
                except ValueError:
                    report = report.with_error(
                        ValidationIssue(
                            code="branch.type_invalid",
                            message="Transformer type_id is not a valid UUID",
                            element_id=branch_id,
                            field="type_id",
                        )
                    )
                else:
                    if type_uuid not in transformer_types:
                        report = report.with_error(
                            ValidationIssue(
                                code="branch.type_missing",
                                message="Transformer type_id not found in type library",
                                element_id=branch_id,
                                field="type_id",
                            )
                        )
            else:
                report = self._validate_branch_params(
                    report,
                    branch_id,
                    params,
                    required=[
                        "sn_mva",
                        "vk_percent",
                        "vkr_percent",
                        "voltage_hv_kv",
                        "voltage_lv_kv",
                    ],
                )
                hv = params.get("voltage_hv_kv")
                lv = params.get("voltage_lv_kv")
                if hv is not None and lv is not None and hv == lv:
                    report = report.with_error(
                        ValidationIssue(
                            code="branch.transformer_kv",
                            message="Transformer HV/LV voltages must differ",
                            element_id=branch_id,
                        )
                    )
        elif branch_type in {"BREAKER", "DISCONNECTOR", "COUPLER"}:
            pass
        else:
            report = report.with_error(
                ValidationIssue(
                    code="branch.type",
                    message="Branch type must be LINE, CABLE, TRANSFORMER, or SWITCHGEAR",
                    element_id=branch_id,
                )
            )
        return report

    def _validate_branch_params(
        self, report: ValidationReport, branch_id: str, params: dict, required: list[str]
    ) -> ValidationReport:
        for field in required:
            value = params.get(field)
            if value is None:
                report = report.with_error(
                    ValidationIssue(
                        code="branch.param_missing",
                        message=f"Branch param '{field}' is required",
                        element_id=branch_id,
                        field=field,
                    )
                )
            elif isinstance(value, (int, float)) and value <= 0:
                report = report.with_error(
                    ValidationIssue(
                        code="branch.param_positive",
                        message=f"Branch param '{field}' must be positive",
                        element_id=branch_id,
                        field=field,
                    )
                )
        return report

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

    def _serialize_node(self, node: dict) -> dict[str, Any]:
        return {
            "id": str(node["id"]),
            "name": node["name"],
            "node_type": node["node_type"],
            "base_kv": node["base_kv"],
            "attrs": node.get("attrs") or {},
        }

    def _serialize_branch(self, branch: dict) -> dict[str, Any]:
        return {
            "id": str(branch["id"]),
            "name": branch["name"],
            "branch_type": branch["branch_type"],
            "from_node_id": str(branch["from_node_id"]),
            "to_node_id": str(branch["to_node_id"]),
            "in_service": branch.get("in_service", True),
            "params": branch.get("params") or {},
        }

    def _serialize_case(self, case: OperatingCase) -> dict[str, Any]:
        return {
            "id": str(case.id),
            "name": case.name,
            "payload": case.case_payload,
        }

    def _serialize_study(self, case: StudyCase) -> dict[str, Any]:
        return {
            "id": str(case.id),
            "name": case.name,
            "payload": case.study_payload,
        }

    def _canonicalize(self, value: Any) -> Any:
        if isinstance(value, dict):
            return {key: self._canonicalize(value[key]) for key in sorted(value)}
        if isinstance(value, list):
            return [self._canonicalize(item) for item in value]
        return value

    def _deterministic_uuid(self, namespace: UUID, payload: dict) -> UUID:
        payload_str = json.dumps(self._canonicalize(payload), sort_keys=True, separators=(",", ":"))
        return uuid5(namespace, payload_str)

    def _upsert_node(self, uow: UnitOfWork, project_id: UUID, node_data: dict) -> str:
        if not node_data.get("name"):
            raise ValueError("Node name is required")
        node_id = node_data.get("id")
        if node_id:
            node_id = UUID(str(node_id))
        else:
            node_id = self._deterministic_uuid(project_id, node_data)
        existing = uow.network.get_node(node_id)
        payload = {
            "id": node_id,
            "name": node_data.get("name", ""),
            "node_type": node_data.get("node_type", ""),
            "base_kv": float(node_data.get("base_kv", 0.0)),
            "attrs": node_data.get("attrs") or {},
        }
        if existing is None:
            uow.network.add_node(project_id, payload, commit=False)
            return "created"
        if existing["project_id"] != project_id:
            raise ValueError("Node ID belongs to a different project")
        uow.network.update_node(node_id, payload, commit=False)
        return "updated"

    def _upsert_branch(self, uow: UnitOfWork, project_id: UUID, branch_data: dict) -> str:
        if not branch_data.get("name"):
            raise ValueError("Branch name is required")
        if not branch_data.get("from_node_id") or not branch_data.get("to_node_id"):
            raise ValueError("Branch from_node_id and to_node_id are required")
        branch_id = branch_data.get("id")
        if branch_id:
            branch_id = UUID(str(branch_id))
        else:
            branch_id = self._deterministic_uuid(project_id, branch_data)
        existing = uow.network.get_branch(branch_id)
        payload = {
            "id": branch_id,
            "name": branch_data.get("name", ""),
            "branch_type": branch_data.get("branch_type", ""),
            "from_node_id": UUID(str(branch_data.get("from_node_id"))),
            "to_node_id": UUID(str(branch_data.get("to_node_id"))),
            "in_service": branch_data.get("in_service", True),
            "params": branch_data.get("params") or {},
        }
        if existing is None:
            uow.network.add_branch(project_id, payload, commit=False)
            return "created"
        if existing["project_id"] != project_id:
            raise ValueError("Branch ID belongs to a different project")
        uow.network.update_branch(branch_id, payload, commit=False)
        return "updated"

    def _upsert_operating_case(self, uow: UnitOfWork, project_id: UUID, case_data: dict) -> str:
        name = case_data.get("name")
        if not name:
            raise ValueError("Operating case name is required")
        case_id = case_data.get("id")
        payload = case_data.get("payload") or case_data.get("case_payload") or {}
        if case_id:
            case_id = UUID(str(case_id))
        else:
            case_id = self._deterministic_uuid(project_id, {"name": name, "payload": payload})
        existing = uow.cases.get_operating_case(case_id)
        if existing is None:
            case = OperatingCase(
                id=case_id,
                project_id=project_id,
                name=name,
                case_payload=payload,
            )
            uow.cases.add_operating_case(case, commit=False)
            return "created"
        if existing.project_id != project_id:
            raise ValueError("Operating case ID belongs to a different project")
        updated = replace(
            existing,
            name=name,
            case_payload=payload,
            updated_at=datetime.now(timezone.utc),
        )
        uow.cases.update_operating_case(updated, commit=False)
        return "updated"

    def _upsert_study_case(self, uow: UnitOfWork, project_id: UUID, case_data: dict) -> str:
        name = case_data.get("name")
        if not name:
            raise ValueError("Study case name is required")
        case_id = case_data.get("id")
        payload = case_data.get("payload") or case_data.get("study_payload") or {}
        if case_id:
            case_id = UUID(str(case_id))
        else:
            case_id = self._deterministic_uuid(project_id, {"name": name, "payload": payload})
        existing = uow.cases.get_study_case(case_id)
        if existing is None:
            case = StudyCase(
                id=case_id,
                project_id=project_id,
                name=name,
                study_payload=payload,
            )
            uow.cases.add_study_case(case, commit=False)
            return "created"
        if existing.project_id != project_id:
            raise ValueError("Study case ID belongs to a different project")
        updated = replace(
            existing,
            name=name,
            study_payload=payload,
            updated_at=datetime.now(timezone.utc),
        )
        uow.cases.update_study_case(updated, commit=False)
        return "updated"

    def _bump_counts(
        self,
        result: str,
        created: dict[str, int],
        updated: dict[str, int],
        label: str,
    ) -> tuple[dict[str, int], dict[str, int]]:
        if result == "created":
            created[label] = created.get(label, 0) + 1
        else:
            updated[label] = updated.get(label, 0) + 1
        return created, updated

    def _source_payload_to_record(self, project_id: UUID, source: SourcePayload) -> dict:
        payload = dict(source.payload)
        payload.setdefault("name", source.name)
        source_payload = {
            "name": source.name,
            "node_id": str(source.node_id),
            "source_type": source.source_type,
            "payload": payload,
            "in_service": source.in_service,
        }
        source_id = source.id or self._deterministic_uuid(project_id, source_payload)
        return {
            "id": source_id,
            "node_id": source.node_id,
            "source_type": source.source_type,
            "payload": payload,
            "in_service": source.in_service,
        }

    def _normalize_source_dicts(self, sources: list[dict]) -> list[dict[str, Any]]:
        normalized = []
        for source in sources:
            normalized.append(
                {
                    "id": str(source.get("id")),
                    "project_id": str(source.get("project_id")),
                    "node_id": str(source.get("node_id")),
                    "name": (source.get("payload") or {}).get("name"),
                    "source_type": source.get("source_type"),
                    "payload": source.get("payload") or {},
                    "in_service": bool(source.get("in_service", True)),
                }
            )
        return normalized

    def _source_payload_from_dict(self, source: dict) -> SourcePayload:
        payload = source.get("payload") or {}
        name = source.get("name") or payload.get("name", "")
        return SourcePayload(
            id=UUID(str(source["id"])) if source.get("id") else None,
            node_id=UUID(str(source["node_id"])),
            source_type=source.get("source_type", ""),
            name=name,
            payload=payload,
            in_service=bool(source.get("in_service", True)),
        )

    def _source_payload_from_record(self, source: dict) -> SourcePayload:
        return SourcePayload(
            id=UUID(str(source["id"])) if source.get("id") else None,
            name=source.get("payload", {}).get("name", source.get("payload", {}).get("label", "")),
            node_id=UUID(str(source["node_id"])),
            source_type=source.get("source_type", ""),
            payload=source.get("payload") or {},
            in_service=bool(source.get("in_service", True)),
        )

    def _normalize_load_dicts(self, loads: list[dict]) -> list[dict[str, Any]]:
        normalized = []
        for load in loads:
            normalized.append(
                {
                    "id": str(load.get("id")),
                    "project_id": str(load.get("project_id")),
                    "node_id": str(load.get("node_id")),
                    "name": (load.get("payload") or {}).get("name"),
                    "payload": load.get("payload") or {},
                    "in_service": bool(load.get("in_service", True)),
                }
            )
        return normalized

    def _load_payload_from_record(self, load: dict) -> LoadPayload:
        return LoadPayload(
            id=UUID(str(load["id"])) if load.get("id") else None,
            name=load.get("payload", {}).get("name", ""),
            node_id=UUID(str(load["node_id"])),
            payload=load.get("payload") or {},
            in_service=bool(load.get("in_service", True)),
        )

    def _load_record_from_dict(self, project_id: UUID, load: dict) -> dict:
        load_id = load.get("id")
        if load_id:
            load_id = UUID(str(load_id))
        else:
            load_id = self._deterministic_uuid(project_id, load)
        return {
            "id": load_id,
            "node_id": UUID(str(load.get("node_id"))),
            "payload": load.get("payload") or {},
            "in_service": bool(load.get("in_service", True)),
        }

    def _type_record_from_dict(self, item: dict) -> dict:
        type_id = item.get("id")
        if type_id:
            type_id = UUID(str(type_id))
        else:
            type_id = self._deterministic_uuid(UUID(int=0), item)
        return {"id": type_id, "name": item.get("name", ""), "params": item.get("params") or {}}

    def _validate_line_voltage_levels(
        self, branch: dict, nodes: list[dict], report: ValidationReport, branch_id: str
    ) -> ValidationReport:
        node_map = {node["id"]: node for node in nodes}
        from_node = node_map.get(branch["from_node_id"])
        to_node = node_map.get(branch["to_node_id"])
        if from_node and to_node:
            if abs(from_node["base_kv"] - to_node["base_kv"]) > 1e-3:
                report = report.with_warning(
                    ValidationIssue(
                        code="branch.voltage_mismatch",
                        message="Line/cable connects nodes with different base_kv",
                        element_id=branch_id,
                    )
                )
        return report

    def _ensure_node(self, uow: UnitOfWork, project_id: UUID, node_id: UUID) -> None:
        node = uow.network.get_node(node_id)
        if node is None or node["project_id"] != project_id:
            raise NotFound(f"Node {node_id} not found")

    def _select_slack_node_id(self, project_id: UUID) -> UUID:
        with self._uow_factory() as uow:
            nodes = uow.network.list_nodes(project_id)
        slack_nodes = [
            node for node in nodes if self._normalize_node_type(node["node_type"]) == "SLACK"
        ]
        if not slack_nodes:
            raise NotFound("No SLACK node found")
        slack_nodes.sort(key=lambda node: str(node["id"]))
        return slack_nodes[0]["id"]

    def _lookup_node_attrs(self, project_id: UUID, node_id: UUID) -> dict[str, Any]:
        with self._uow_factory() as uow:
            node = uow.network.get_node(node_id)
        if node is None or node["project_id"] != project_id:
            raise NotFound(f"Node {node_id} not found")
        return self._node_attrs_from_node(node)

    def _iter_nodes_by_type(self, project_id: UUID) -> dict[UUID, dict]:
        with self._uow_factory() as uow:
            nodes = uow.network.list_nodes(project_id)
        return {node["id"]: node for node in nodes}
