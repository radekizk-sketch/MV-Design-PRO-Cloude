from __future__ import annotations

from uuid import uuid4

import pytest

from domain.models import OperatingCase, Project
from domain.project_design_mode import ProjectDesignMode
from infrastructure.persistence.repositories.case_repository import CaseRepository
from infrastructure.persistence.repositories.project_repository import ProjectRepository


@pytest.fixture()
def api_client(app_client, db_session_factory):
    session = db_session_factory()
    project_id = uuid4()
    project = Project(id=project_id, name="Project")
    ProjectRepository(session).add(project)

    case_id = uuid4()
    case = OperatingCase(
        id=case_id,
        project_id=project_id,
        name="Base",
        case_payload={"base_mva": 100.0, "active_snapshot_id": "snap-1"},
        project_design_mode=ProjectDesignMode.SN_NETWORK,
    )
    CaseRepository(session).add_operating_case(case)
    session.close()

    return app_client, case_id


def test_connection_study_happy_path(api_client):
    client, case_id = api_client
    payload = {
        "case_id": str(case_id),
        "base_snapshot_id": "snap-1",
        "spec_payload": {
            "pcc": {
                "id": "PCC-1",
                "voltage_kv": 15.0,
                "grid_supply": True,
            }
        },
    }

    response = client.post("/analyses/design-synth/connection-study", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["design_spec_id"]
    assert body["design_proposal_id"]
    assert body["design_evidence_id"]
    assert body["report_json"]
    report_json = body["report_json"]
    assert "PCC – punkt wspólnego przyłączenia" in report_json
    assert report_json["PCC – punkt wspólnego przyłączenia"]["id"] == "PCC-1"


def test_connection_study_missing_pcc_returns_422(api_client):
    client, case_id = api_client
    payload = {
        "case_id": str(case_id),
        "base_snapshot_id": "snap-1",
        "spec_payload": {"constraints": {"max_voltage": 1.05}},
    }

    response = client.post("/analyses/design-synth/connection-study", json=payload)

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert any(
        "PCC – punkt wspólnego przyłączenia" in error["msg"] for error in detail
    )
