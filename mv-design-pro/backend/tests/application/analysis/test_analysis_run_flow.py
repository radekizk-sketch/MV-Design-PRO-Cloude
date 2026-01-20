from __future__ import annotations

import sys
from pathlib import Path
from uuid import UUID

# Add backend/src to path for imports
backend_src = Path(__file__).parents[3] / "src"
sys.path.insert(0, str(backend_src))

from application.network_wizard import NetworkWizardService
from application.network_wizard.dtos import BranchPayload, LoadPayload, NodePayload, SourcePayload
from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.unit_of_work import build_uow_factory


def _build_service() -> NetworkWizardService:
    engine = create_engine_from_url("sqlite+pysqlite:///:memory:")
    init_db(engine)
    session_factory = create_session_factory(engine)
    return NetworkWizardService(build_uow_factory(session_factory))


def _create_network(service: NetworkWizardService, project_id: UUID) -> dict:
    slack_node = service.add_node(
        project_id,
        NodePayload(
            name="Slack",
            node_type="SLACK",
            base_kv=15.0,
            attrs={"voltage_magnitude_pu": 1.0, "voltage_angle_rad": 0.0},
        ),
    )
    pq_node = service.add_node(
        project_id,
        NodePayload(
            name="Load",
            node_type="PQ",
            base_kv=15.0,
            attrs={"active_power_mw": 1.0, "reactive_power_mvar": 0.5},
        ),
    )
    service.add_branch(
        project_id,
        BranchPayload(
            name="Line-1",
            branch_type="LINE",
            from_node_id=slack_node["id"],
            to_node_id=pq_node["id"],
            params={"r_ohm_per_km": 0.1, "x_ohm_per_km": 0.2, "length_km": 1.0},
        ),
    )
    service.set_pcc(project_id, slack_node["id"])
    service.add_source(
        project_id,
        SourcePayload(
            name="Utility",
            node_id=slack_node["id"],
            source_type="GRID",
            payload={"name": "Utility", "grid_supply": True, "u_pu": 1.0},
        ),
    )
    service.add_load(
        project_id,
        LoadPayload(
            name="Load",
            node_id=pq_node["id"],
            payload={"name": "Load", "p_mw": 1.0, "q_mvar": 0.5},
        ),
    )
    return {"slack_node": slack_node, "pq_node": pq_node}


def test_power_flow_run_happy_path_with_overlay() -> None:
    service = _build_service()
    project = service.create_project("PF Run")
    nodes = _create_network(service, project.id)
    case = service.create_operating_case(project.id, "Normal", {"base_mva": 100.0})
    diagram = service.create_sld(project.id, "Main", mode="auto")
    diagram_id = UUID(diagram["diagram"]["id"])

    run = service.create_power_flow_run(project.id, case.id)
    executed = service.execute_analysis_run(run.id)

    assert executed.status == "FINISHED"
    assert executed.result_summary_json is not None

    overlay = service.get_sld_overlay_for_run(project.id, diagram_id, executed.id)
    assert overlay["analysis_type"] == "PF"
    assert str(nodes["slack_node"]["id"]) in overlay["node_overlays"]


def test_short_circuit_run_happy_path_with_overlay() -> None:
    service = _build_service()
    project = service.create_project("SC Run")
    nodes = _create_network(service, project.id)
    case = service.create_operating_case(project.id, "Normal", {"base_mva": 100.0})
    diagram = service.create_sld(project.id, "Main", mode="auto")
    diagram_id = UUID(diagram["diagram"]["id"])

    fault_spec = {"fault_type": "3F", "node_id": str(nodes["slack_node"]["id"])}
    run = service.create_short_circuit_run(project.id, case.id, fault_spec)
    executed = service.execute_analysis_run(run.id)

    assert executed.status == "FINISHED"
    overlay = service.get_sld_overlay_for_run(project.id, diagram_id, executed.id)
    assert (
        overlay["node_overlays"][str(nodes["slack_node"]["id"])]["values"]["ikss_a"] > 0
    )


def test_analysis_run_failure_without_pcc() -> None:
    service = _build_service()
    project = service.create_project("SC Fail")
    node = service.add_node(
        project.id,
        NodePayload(
            name="Slack",
            node_type="SLACK",
            base_kv=15.0,
            attrs={"voltage_magnitude_pu": 1.0, "voltage_angle_rad": 0.0},
        ),
    )
    case = service.create_operating_case(project.id, "Normal", {"base_mva": 100.0})
    fault_spec = {"fault_type": "3F", "node_id": str(node["id"])}
    run = service.create_short_circuit_run(project.id, case.id, fault_spec)

    assert run.status == "FAILED"
    assert run.error_message is not None
