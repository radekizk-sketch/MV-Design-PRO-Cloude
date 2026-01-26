from __future__ import annotations

import sys
from pathlib import Path
from uuid import UUID, uuid4

import pytest

backend_src = Path(__file__).parents[3] / "src"
sys.path.insert(0, str(backend_src))

from application.network_wizard import NetworkWizardService
from application.network_wizard.dtos import BranchPayload, NodePayload, SourcePayload
from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.unit_of_work import build_uow_factory


def _build_service() -> NetworkWizardService:
    engine = create_engine_from_url("sqlite+pysqlite:///:memory:")
    init_db(engine)
    session_factory = create_session_factory(engine)
    return NetworkWizardService(build_uow_factory(session_factory))


def _build_inverter_network(
    service: NetworkWizardService, project_id: UUID
) -> tuple[dict, dict]:
    slack = service.add_node(
        project_id,
        NodePayload(
            name="Slack",
            node_type="SLACK",
            base_kv=15.0,
            attrs={"voltage_magnitude_pu": 1.0, "voltage_angle_rad": 0.0},
        ),
    )
    inverter_node = service.add_node(
        project_id,
        NodePayload(
            name="INV",
            node_type="PQ",
            base_kv=15.0,
            attrs={},
        ),
    )
    service.add_branch(
        project_id,
        BranchPayload(
            name="Line-1",
            branch_type="LINE",
            from_node_id=slack["id"],
            to_node_id=inverter_node["id"],
            params={"r_ohm_per_km": 0.1, "x_ohm_per_km": 0.2, "length_km": 1.0},
        ),
    )
    service.set_pcc(project_id, slack["id"])
    return slack, inverter_node


def test_inverter_setpoints_stored_on_case_only() -> None:
    service = _build_service()
    project = service.create_project("InvCase")
    _, inverter_node = _build_inverter_network(service, project.id)
    source = service.add_source(
        project.id,
        SourcePayload(
            name="INV-1",
            node_id=inverter_node["id"],
            source_type="INVERTER",
            payload={"name": "INV-1"},
            type_ref=uuid4(),
        ),
    )
    case = service.create_operating_case(project.id, "Case", {"base_mva": 100.0})

    updated_case = service.set_inverter_setpoints(
        case.id, source["id"], p_mw=2.0, q_mvar=0.5
    )

    assert updated_case.case_payload["inverter_setpoints"][str(source["id"])]["p_mw"] == 2.0
    sources = service.get_sources(project.id)
    assert "p_mw" not in sources[0].payload
    assert "q_mvar" not in sources[0].payload


def test_inverter_setpoints_validation() -> None:
    service = _build_service()
    project = service.create_project("InvValidation")
    _, inverter_node = _build_inverter_network(service, project.id)
    source = service.add_source(
        project.id,
        SourcePayload(
            name="INV-1",
            node_id=inverter_node["id"],
            source_type="INVERTER",
            payload={"name": "INV-1"},
            type_ref=uuid4(),
        ),
    )
    case = service.create_operating_case(project.id, "Case", {"base_mva": 100.0})

    with pytest.raises(ValueError):
        service.set_inverter_setpoints(case.id, source["id"], p_mw=1.0)

    with pytest.raises(ValueError):
        service.set_inverter_setpoints(
            case.id, source["id"], p_mw=1.0, q_mvar=0.2, cosphi=0.95
        )


def test_power_flow_input_uses_case_setpoints_for_inverters() -> None:
    service = _build_service()
    project = service.create_project("InvPF")
    _, inverter_node = _build_inverter_network(service, project.id)
    source = service.add_source(
        project.id,
        SourcePayload(
            name="INV-1",
            node_id=inverter_node["id"],
            source_type="INVERTER",
            payload={"name": "INV-1", "p_mw": 99.0, "q_mvar": 99.0},
            type_ref=uuid4(),
        ),
    )
    case = service.create_operating_case(project.id, "Case", {"base_mva": 100.0})
    service.set_inverter_setpoints(case.id, source["id"], p_mw=1.5, q_mvar=0.4)

    pf_input = service.build_power_flow_input(project.id, case.id)

    assert pf_input.pv == []
    assert [(spec.p_mw, spec.q_mvar) for spec in pf_input.pq] == [(1.5, 0.4)]
