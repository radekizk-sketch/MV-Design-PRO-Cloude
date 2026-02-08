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


def test_analysis_runs_read_unsupported_type(api_client):
    client, _case_id = api_client

    response = client.get("/analysis-runs/unknown/123")

    assert response.status_code == 404
    assert response.json()["detail"] == "Unsupported analysis_type"


def test_analysis_runs_read_empty_run_id_returns_422(api_client):
    client, _case_id = api_client

    response = client.get("/analysis-runs/design_synth.connection_study/%20")

    assert response.status_code == 422
    assert response.json()["detail"] == "run_id must be non-empty"


def test_analysis_runs_read_design_synth_envelope(api_client):
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
        f"/analysis-runs/design_synth.connection_study/{run_id}"
    )

    assert response.status_code == 200
    body = response.json()
    assert body["analysis_type"] == "design_synth.connection_study"
    assert body["schema_version"] == "v0"
    assert body["run_id"] == run_id
    assert body["fingerprint"]

    artifacts = body["artifacts"]
    artifact_types = {artifact["type"] for artifact in artifacts}
    assert artifact_types == {"design_spec", "design_proposal", "design_evidence"}
    artifact_ids = {artifact["type"]: artifact["id"] for artifact in artifacts}
    assert artifact_ids["design_spec"] == created["design_spec_id"]
    assert artifact_ids["design_proposal"] == created["design_proposal_id"]
    assert artifact_ids["design_evidence"] == created["design_evidence_id"]

    inputs = body["inputs"]
    assert inputs["base_snapshot_id"] == "snap-1"
    assert inputs["spec_ref"]["id"] == created["design_spec_id"]


def test_analysis_runs_read_short_circuit_returns_404(api_client):
    client, _case_id = api_client

    response = client.get("/analysis-runs/short_circuit.iec60909/sc-1")

    assert response.status_code == 404
    assert response.json()["detail"] == "Run not found"
