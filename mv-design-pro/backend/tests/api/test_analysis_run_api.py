from __future__ import annotations

from datetime import datetime, timedelta, timezone
from importlib.util import find_spec
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from api.main import app
from domain.analysis_run import AnalysisRun
from domain.models import OperatingCase, Project
from infrastructure.persistence.db import (
    create_engine_from_url,
    create_session_factory,
    init_db,
)
from infrastructure.persistence.repositories import (
    AnalysisRunRepository,
    CaseRepository,
    ProjectRepository,
    ResultRepository,
    SldRepository,
)
from infrastructure.persistence.unit_of_work import build_uow_factory

_DOCX_AVAILABLE = find_spec("docx") is not None
_PDF_AVAILABLE = find_spec("reportlab") is not None


@pytest.fixture()
def api_client(tmp_path):
    db_path = tmp_path / "analysis_run_api.db"
    engine = create_engine_from_url(f"sqlite+pysqlite:///{db_path}")
    init_db(engine)
    session_factory = create_session_factory(engine)
    app.state.uow_factory = build_uow_factory(session_factory)

    session = session_factory()
    project_id = uuid4()
    project = Project(id=project_id, name="Project")
    ProjectRepository(session).add(project)

    operating_case_id = uuid4()
    case = OperatingCase(
        id=operating_case_id,
        project_id=project_id,
        name="Base",
        case_payload={"base_mva": 100.0},
    )
    CaseRepository(session).add_operating_case(case)

    node_id = uuid4()
    now = datetime.now(timezone.utc)
    run_sc = AnalysisRun(
        id=uuid4(),
        project_id=project_id,
        operating_case_id=operating_case_id,
        analysis_type="SC",
        status="FINISHED",
        created_at=now,
        finished_at=now + timedelta(seconds=5),
        input_snapshot={"fault_spec": {"node_id": str(node_id)}},
        input_hash="hash-sc",
        result_summary={
            "status": "FINISHED",
            "fault_node_id": str(node_id),
            "short_circuit_type": "3ph",
        },
        white_box_trace=[
            {"key": "step_b", "title": "Step B", "notes": "warn"},
            {"key": "step_a", "title": "Step A", "notes": None},
        ],
    )
    run_pf = AnalysisRun(
        id=uuid4(),
        project_id=project_id,
        operating_case_id=operating_case_id,
        analysis_type="PF",
        status="FINISHED",
        created_at=now - timedelta(hours=1),
        finished_at=now - timedelta(minutes=30),
        input_snapshot={"slack": {"node_id": str(node_id)}},
        input_hash="hash-pf",
        result_summary={"status": "FINISHED", "converged": True},
        trace_json={"nr_iterations": [{"iteration": 1}]},
    )
    run_repo = AnalysisRunRepository(session)
    run_repo.create(run_sc)
    run_repo.create(run_pf)

    ResultRepository(session).add_result(
        run_id=run_sc.id,
        project_id=project_id,
        result_type="short_circuit",
        payload={
            "fault_node_id": str(node_id),
            "ikss_a": 12.5,
            "ib_a": 3.2,
        },
    )

    sld_payload = {
        "nodes": [{"node_id": str(node_id), "x": 0.0, "y": 0.0}],
        "branches": [],
        "annotations": [],
    }
    diagram_id = SldRepository(session).save(
        project_id=project_id, name="Main", payload=sld_payload
    )
    session.close()

    client = TestClient(app)
    return client, {
        "project_id": project_id,
        "run_sc_id": run_sc.id,
        "run_pf_id": run_pf.id,
        "diagram_id": diagram_id,
        "node_id": node_id,
    }


def test_api_list_runs_includes_trace_summary(api_client):
    client, data = api_client
    response = client.get(f"/projects/{data['project_id']}/analysis-runs")
    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 2
    assert payload["items"][0]["id"] == str(data["run_sc_id"])
    assert payload["items"][0]["trace_summary"]["count"] == 2


def test_api_get_run_detail_includes_summary(api_client):
    client, data = api_client
    response = client.get(f"/analysis-runs/{data['run_sc_id']}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["summary_json"]["fault_node_id"] == str(data["node_id"])
    assert "input_metadata" in payload


def test_api_get_results_returns_saved_results(api_client):
    client, data = api_client
    response = client.get(f"/analysis-runs/{data['run_sc_id']}/results")
    assert response.status_code == 200
    payload = response.json()
    assert payload["results"][0]["result_type"] == "short_circuit"
    assert payload["results"][0]["payload_summary"]["fault_node_id"] == str(data["node_id"])


def test_api_get_overlay_returns_overlay_payload(api_client):
    client, data = api_client
    response = client.get(
        f"/analysis-runs/{data['run_sc_id']}/overlay",
        params={"diagram_id": str(data["diagram_id"])},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["node_overlays"][0]["node_id"] == str(data["node_id"])
    assert payload["node_overlays"][0]["ik_a"] == 12.5


def test_api_get_trace_returns_white_box_trace_for_sc(api_client):
    client, data = api_client
    response = client.get(f"/analysis-runs/{data['run_sc_id']}/trace")
    assert response.status_code == 200
    payload = response.json()
    assert payload["trace"][0]["key"] == "step_b"


def test_api_get_trace_summary_deterministic(api_client):
    client, data = api_client
    response_first = client.get(f"/analysis-runs/{data['run_sc_id']}/trace/summary")
    response_second = client.get(f"/analysis-runs/{data['run_sc_id']}/trace/summary")
    assert response_first.status_code == 200
    assert response_first.json() == response_second.json()
    assert response_first.json()["phases"] == ["step_a", "step_b"]


@pytest.mark.skipif(not _DOCX_AVAILABLE, reason="python-docx is not installed")
def test_export_docx_returns_file(api_client):
    client, data = api_client
    response = client.get(
        f"/projects/{data['project_id']}/analysis-runs/{data['run_sc_id']}/export/docx"
    )
    assert response.status_code == 200
    assert (
        response.headers["content-type"]
        == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    assert response.content


@pytest.mark.skipif(not _PDF_AVAILABLE, reason="reportlab is not installed")
def test_export_pdf_returns_file(api_client):
    client, data = api_client
    response = client.get(
        f"/projects/{data['project_id']}/analysis-runs/{data['run_sc_id']}/export/pdf"
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content
