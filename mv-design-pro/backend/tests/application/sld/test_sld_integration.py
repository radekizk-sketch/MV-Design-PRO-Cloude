from __future__ import annotations

import json
import sys
from pathlib import Path
from uuid import UUID

# Add backend/src to path for imports
backend_src = Path(__file__).parents[3] / "src"
sys.path.insert(0, str(backend_src))

from application.network_wizard import NetworkWizardService
from application.network_wizard.dtos import BranchPayload, NodePayload
from application.sld.overlay import ResultSldOverlayBuilder
from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.unit_of_work import build_uow_factory


def _build_service() -> tuple[NetworkWizardService, callable]:
    engine = create_engine_from_url("sqlite+pysqlite:///:memory:")
    init_db(engine)
    session_factory = create_session_factory(engine)
    uow_factory = build_uow_factory(session_factory)
    return NetworkWizardService(uow_factory), uow_factory


def _create_minimal_network(
    service: NetworkWizardService, project_id: UUID
) -> tuple[dict, dict, dict]:
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
            attrs={"active_power_mw": 2.0, "reactive_power_mvar": 1.0},
        ),
    )
    branch = service.add_branch(
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
    return slack_node, pq_node, branch


def test_sld_layout_determinism_and_binding() -> None:
    service, _ = _build_service()
    project = service.create_project("SLD")
    slack_node, pq_node, branch = _create_minimal_network(service, project.id)

    created = service.create_sld(project.id, "Main", mode="auto")
    exported_first = service.export_sld_json(project.id, UUID(created["diagram"]["id"]))
    exported_second = service.export_sld_json(project.id, UUID(created["diagram"]["id"]))

    assert json.dumps(exported_first, sort_keys=True) == json.dumps(
        exported_second, sort_keys=True
    )

    node_ids = {str(slack_node["id"]), str(pq_node["id"])}
    branch_ids = {str(branch["id"])}
    exported_nodes = {node["network_node_id"] for node in exported_first["nodes"]}
    exported_branches = {branch_item["network_branch_id"] for branch_item in exported_first["branches"]}
    assert node_ids == exported_nodes
    assert branch_ids == exported_branches


def test_sld_dirty_flag_on_network_change() -> None:
    service, _ = _build_service()
    project = service.create_project("SLD Dirty")
    slack_node, pq_node, branch = _create_minimal_network(service, project.id)
    created = service.create_sld(project.id, "Main", mode="auto")

    service.add_branch(
        project.id,
        BranchPayload(
            name="Line-2",
            branch_type="LINE",
            from_node_id=slack_node["id"],
            to_node_id=pq_node["id"],
            params={"r_ohm_per_km": 0.1, "x_ohm_per_km": 0.2, "length_km": 2.0},
        ),
    )

    exported = service.export_sld_json(project.id, UUID(created["diagram"]["id"]))
    assert exported["diagram"]["layout_meta"].get("dirty") is True


def test_sld_dirty_flag_on_import() -> None:
    service, _ = _build_service()
    project = service.create_project("SLD Import")
    _create_minimal_network(service, project.id)
    created = service.create_sld(project.id, "Main", mode="auto")

    payload = service.export_network(project.id)
    service.import_network(project.id, payload, mode="merge")

    exported = service.export_sld_json(project.id, UUID(created["diagram"]["id"]))
    assert exported["diagram"]["layout_meta"].get("dirty") is True


def test_sc_overlay_builder() -> None:
    service, uow_factory = _build_service()
    project = service.create_project("SLD Overlay")
    slack_node, _, branch = _create_minimal_network(service, project.id)
    created = service.create_sld(project.id, "Main", mode="auto")
    diagram_id = UUID(created["diagram"]["id"])

    with uow_factory() as uow:
        diagram = uow.sld.get_diagram(diagram_id)
        node_symbols = uow.sld.list_node_symbols(diagram_id)
        branch_symbols = uow.sld.list_branch_symbols(diagram_id)

    result_dict = {
        "fault_node_id": str(slack_node["id"]),
        "ikss_a": 1200.0,
        "ip_a": 1800.0,
        "ith_a": 900.0,
        "sk_mva": 45.0,
        "branch_contributions": [
            {
                "branch_id": str(branch["id"]),
                "i_contrib_a": 200.0,
                "direction": "from_to",
            }
        ],
    }

    builder = ResultSldOverlayBuilder()
    overlay = builder.build(
        diagram=diagram,
        node_symbols=node_symbols,
        branch_symbols=branch_symbols,
        result_dict=result_dict,
        analysis_type="SC",
    )

    assert overlay["node_overlays"][str(slack_node["id"])]["values"]["ikss_a"] == 1200.0
    assert overlay["branch_overlays"][str(branch["id"])]["values"]["i_contrib_a"] == 200.0
