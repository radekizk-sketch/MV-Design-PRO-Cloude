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


def test_analysis_runs_index_list_and_get(api_client):
    client, case_id = api_client
    payload = {
        "case_id": str(case_id),
        "base_snapshot_id": "snap-1",
        "spec_payload": {
            "connection_node": {
                "id": "BoundaryNode-1",
                "voltage_kv": 15.0,
                "grid_supply": True,
            }
        },
    }

    create_response = client.post("/analyses/design-synth/connection-study", json=payload)

    assert create_response.status_code == 200
    created = create_response.json()
    run_id = created["design_evidence_id"]

    response = client.get(
        "/analysis-runs",
        params={"analysis_type": "design_synth.connection_study"},
    )

    assert response.status_code == 200
    payload = response.json()
    matching = [item for item in payload["items"] if item["run_id"] == run_id]
    assert matching
    entry = matching[0]
    assert entry["analysis_type"] == "design_synth.connection_study"
    assert entry["primary_artifact_type"] == "design_evidence"
    assert entry["primary_artifact_id"] == run_id

    response = client.get(f"/analysis-runs/{run_id}")

    assert response.status_code == 200
    envelope = response.json()
    assert envelope["analysis_type"] == "design_synth.connection_study"
    assert envelope["run_id"] == run_id


def test_analysis_runs_index_get_missing_returns_404(api_client):
    client, _case_id = api_client

    response = client.get(f"/analysis-runs/{uuid4()}")

    assert response.status_code == 404
