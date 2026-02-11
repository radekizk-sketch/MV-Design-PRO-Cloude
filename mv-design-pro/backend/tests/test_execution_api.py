"""
Tests for PR-14: Execution Runs API endpoints.

Tests:
- POST /api/study-cases/{case_id}/runs
- GET /api/study-cases/{case_id}/runs
- POST /api/runs/{run_id}/execute
- GET /api/runs/{run_id}
- GET /api/runs/{run_id}/results
"""

from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.execution_runs import get_engine
from domain.execution import (
    ExecutionAnalysisType,
    RunStatus,
    ElementResult,
)
from domain.study_case import new_study_case, StudyCaseConfig


@pytest.fixture
def client():
    """Create a fresh TestClient with clean engine state."""
    return TestClient(app)


@pytest.fixture
def engine():
    """Get and reset the execution engine."""
    eng = get_engine()
    # Clear state for test isolation
    eng._runs.clear()
    eng._result_sets.clear()
    eng._study_cases.clear()
    eng._case_runs.clear()
    return eng


@pytest.fixture
def registered_case(engine):
    """Register a study case in the engine and return it."""
    case = new_study_case(
        project_id=uuid4(),
        name="Test Case API",
        config=StudyCaseConfig(),
    )
    engine.register_study_case(case)
    return case


class TestCreateRunEndpoint:
    """Test POST /api/study-cases/{case_id}/runs."""

    def test_create_run_success(self, client, registered_case):
        response = client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={
                "analysis_type": "SC_3F",
                "solver_input": {"buses": [], "branches": []},
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["study_case_id"] == str(registered_case.id)
        assert data["analysis_type"] == "SC_3F"
        assert data["status"] == "PENDING"
        assert len(data["solver_input_hash"]) == 64

    def test_create_run_invalid_analysis_type(self, client, registered_case):
        response = client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={
                "analysis_type": "INVALID_TYPE",
                "solver_input": {},
            },
        )
        assert response.status_code == 400
        assert "Nieprawidłowy typ analizy" in response.json()["detail"]

    def test_create_run_case_not_found(self, client, engine):
        fake_id = str(uuid4())
        response = client.post(
            f"/api/execution/study-cases/{fake_id}/runs",
            json={
                "analysis_type": "SC_3F",
                "solver_input": {},
            },
        )
        assert response.status_code == 404

    def test_create_run_blocked_by_readiness(self, client, registered_case):
        response = client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={
                "analysis_type": "SC_3F",
                "solver_input": {},
                "readiness": {
                    "ready": False,
                    "issues": [
                        {"severity": "BLOCKER", "message_pl": "Brak zasilania"},
                    ],
                },
            },
        )
        assert response.status_code == 409
        assert "Brak zasilania" in response.json()["detail"]

    def test_create_run_blocked_by_eligibility(self, client, registered_case):
        response = client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={
                "analysis_type": "SC_3F",
                "solver_input": {},
                "eligibility": {
                    "eligible": False,
                    "blockers": [
                        {"message": "No SLACK node"},
                    ],
                },
            },
        )
        assert response.status_code == 409

    def test_create_run_load_flow(self, client, registered_case):
        response = client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={
                "analysis_type": "LOAD_FLOW",
                "solver_input": {"base_mva": 100},
            },
        )
        assert response.status_code == 201
        assert response.json()["analysis_type"] == "LOAD_FLOW"

    def test_create_run_invalid_uuid(self, client, engine):
        response = client.post(
            "/api/execution/study-cases/not-a-uuid/runs",
            json={
                "analysis_type": "SC_3F",
                "solver_input": {},
            },
        )
        assert response.status_code == 400


class TestListRunsEndpoint:
    """Test GET /api/study-cases/{case_id}/runs."""

    def test_list_runs_empty(self, client, registered_case):
        response = client.get(
            f"/api/execution/study-cases/{registered_case.id}/runs"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["runs"] == []
        assert data["count"] == 0

    def test_list_runs_with_data(self, client, registered_case):
        # Create two runs
        client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={"analysis_type": "SC_3F", "solver_input": {"v": 1}},
        )
        client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={"analysis_type": "LOAD_FLOW", "solver_input": {"v": 2}},
        )

        response = client.get(
            f"/api/execution/study-cases/{registered_case.id}/runs"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 2
        assert len(data["runs"]) == 2


class TestExecuteRunEndpoint:
    """Test POST /api/runs/{run_id}/execute."""

    def test_execute_run_success(self, client, registered_case):
        # Create a run
        create_resp = client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={"analysis_type": "SC_3F", "solver_input": {}},
        )
        run_id = create_resp.json()["id"]

        # Execute it
        response = client.post(f"/api/execution/runs/{run_id}/execute")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "RUNNING"

    def test_execute_run_not_found(self, client, engine):
        response = client.post(f"/api/execution/runs/{uuid4()}/execute")
        assert response.status_code == 404


class TestGetRunEndpoint:
    """Test GET /api/runs/{run_id}."""

    def test_get_run_success(self, client, registered_case):
        create_resp = client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={"analysis_type": "SC_3F", "solver_input": {}},
        )
        run_id = create_resp.json()["id"]

        response = client.get(f"/api/execution/runs/{run_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == run_id
        assert data["analysis_type"] == "SC_3F"

    def test_get_run_not_found(self, client, engine):
        response = client.get(f"/api/execution/runs/{uuid4()}")
        assert response.status_code == 404


class TestGetRunResultsEndpoint:
    """Test GET /api/runs/{run_id}/results."""

    def test_get_results_run_not_done(self, client, registered_case):
        """Results unavailable for PENDING run."""
        create_resp = client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={"analysis_type": "SC_3F", "solver_input": {}},
        )
        run_id = create_resp.json()["id"]

        response = client.get(f"/api/execution/runs/{run_id}/results")
        assert response.status_code == 409
        assert "PENDING" in response.json()["detail"]

    def test_get_results_run_not_found(self, client, engine):
        response = client.get(f"/api/runs/{uuid4()}/results")
        assert response.status_code == 404

    def test_get_results_success(self, client, registered_case, engine):
        """Results available after run completes."""
        # Create and start run
        create_resp = client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={"analysis_type": "SC_3F", "solver_input": {}},
        )
        run_id = create_resp.json()["id"]

        from uuid import UUID

        # Complete run via engine (simulating solver execution)
        engine.start_run(UUID(run_id))
        engine.complete_run(
            UUID(run_id),
            validation_snapshot={"is_valid": True},
            readiness_snapshot={"ready": True},
            element_results=[
                ElementResult("bus-1", "Bus", {"ikss_ka": 12.5}),
            ],
            global_results={"total": 12.5},
        )

        response = client.get(f"/api/execution/runs/{run_id}/results")
        assert response.status_code == 200
        data = response.json()
        assert data["run_id"] == run_id
        assert data["analysis_type"] == "SC_3F"
        assert len(data["element_results"]) == 1
        assert data["element_results"][0]["element_ref"] == "bus-1"
        assert data["deterministic_signature"] != ""


class TestDeterministicHashApi:
    """Test that the API produces deterministic hashes."""

    def test_same_input_same_hash(self, client, registered_case):
        """Two identical solver inputs produce the same hash via API."""
        solver_input = {"buses": [{"ref_id": "b1"}], "branches": []}

        resp1 = client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={"analysis_type": "SC_3F", "solver_input": solver_input},
        )
        resp2 = client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={"analysis_type": "SC_3F", "solver_input": solver_input},
        )

        assert resp1.json()["solver_input_hash"] == resp2.json()["solver_input_hash"]

    def test_different_input_different_hash(self, client, registered_case):
        """Different solver inputs produce different hashes via API."""
        resp1 = client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={
                "analysis_type": "SC_3F",
                "solver_input": {"c_factor": 1.10},
            },
        )
        resp2 = client.post(
            f"/api/execution/study-cases/{registered_case.id}/runs",
            json={
                "analysis_type": "SC_3F",
                "solver_input": {"c_factor": 1.05},
            },
        )

        assert resp1.json()["solver_input_hash"] != resp2.json()["solver_input_hash"]
