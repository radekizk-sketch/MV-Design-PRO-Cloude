from __future__ import annotations

import sys
from pathlib import Path
from uuid import UUID

# Add backend/src to path for imports
backend_src = Path(__file__).parents[3] / "src"
sys.path.insert(0, str(backend_src))

from application.network_wizard import NetworkWizardService
from application.network_wizard.dtos import (
    BranchPayload,
    LoadPayload,
    NodePayload,
    SourcePayload,
)
from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.unit_of_work import build_uow_factory


def _build_service() -> NetworkWizardService:
    engine = create_engine_from_url("sqlite+pysqlite:///:memory:")
    init_db(engine)
    session_factory = create_session_factory(engine)
    return NetworkWizardService(build_uow_factory(session_factory))


def _create_basic_network(service: NetworkWizardService, project_id: UUID) -> tuple[dict, dict]:
    slack_node = service.add_node(
        project_id,
        NodePayload(
            name="PCC",
            node_type="SLACK",
            base_kv=15.0,
            attrs={
                "voltage_magnitude_pu": 1.0,
                "voltage_angle_rad": 0.0,
            },
        ),
    )
    pq_node = service.add_node(
        project_id,
        NodePayload(
            name="Load",
            node_type="PQ",
            base_kv=15.0,
            attrs={
                "active_power_mw": 5.0,
                "reactive_power_mvar": 2.0,
            },
        ),
    )
    service.add_branch(
        project_id,
        BranchPayload(
            name="Line-1",
            branch_type="LINE",
            from_node_id=slack_node["id"],
            to_node_id=pq_node["id"],
            params={
                "r_ohm_per_km": 0.1,
                "x_ohm_per_km": 0.2,
                "length_km": 1.0,
            },
        ),
    )
    return slack_node, pq_node


def _add_grid_and_load(
    service: NetworkWizardService, project_id: UUID, node_id: UUID
) -> None:
    service.add_source(
        project_id,
        SourcePayload(
            name="GRID",
            node_id=node_id,
            source_type="GRID",
            payload={"name": "GRID", "grid_supply": True, "u_pu": 1.0},
        ),
    )
    service.add_load(
        project_id,
        LoadPayload(
            name="Load",
            node_id=node_id,
            payload={"name": "Load", "p_mw": 1.0, "q_mvar": 0.5},
        ),
    )


def test_power_flow_analysis_run_happy_path() -> None:
    service = _build_service()
    project = service.create_project("PF Run")
    slack_node, _ = _create_basic_network(service, project.id)
    service.set_pcc(project.id, slack_node["id"])
    _add_grid_and_load(service, project.id, slack_node["id"])
    case = service.create_operating_case(project.id, "Normal", {"base_mva": 100.0})

    run_first = service.create_power_flow_run(project.id, case.id)
    run_second = service.create_power_flow_run(project.id, case.id)

    assert run_first.input_hash == run_second.input_hash

    executed = service.execute_analysis_run(run_first.id)
    assert executed.status == "FINISHED"
    assert executed.result_summary_json
    assert executed.result_summary_json.get("node_summary")


def test_short_circuit_analysis_run_happy_path_with_overlay() -> None:
    service = _build_service()
    project = service.create_project("SC Run")
    slack_node, _ = _create_basic_network(service, project.id)
    service.set_pcc(project.id, slack_node["id"])
    _add_grid_and_load(service, project.id, slack_node["id"])
    case = service.create_operating_case(project.id, "Normal", {"base_mva": 100.0})
    diagram_id = service.create_sld(project.id, "Default")

    run = service.create_short_circuit_run(
        project.id,
        case.id,
        fault_spec={"fault_type": "3F", "node_id": str(slack_node["id"])},
    )
    executed = service.execute_analysis_run(run.id)

    assert executed.status == "FINISHED"
    summary = executed.result_summary_json or {}
    assert str(slack_node["id"]) in summary.get("node_summary", {})

    overlay = service.get_sld_overlay_for_run(project.id, diagram_id, run.id)
    assert overlay.get("diagram_id") == str(diagram_id)
    assert "node_overlays" in overlay


def test_analysis_run_failure_without_source() -> None:
    service = _build_service()
    project = service.create_project("PF Failure")
    slack_node, _ = _create_basic_network(service, project.id)
    service.set_pcc(project.id, slack_node["id"])
    case = service.create_operating_case(project.id, "Normal", {"base_mva": 100.0})

    run = service.create_power_flow_run(project.id, case.id)
    executed = service.execute_analysis_run(run.id)

    assert executed.status == "FAILED"
    assert executed.error_message
