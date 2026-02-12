"""
Test Fault Scenario Run Integration — PR-24

Integration tests for scenario -> run creation flow.
Golden fixture with SC_3F/SC_1F/SC_2F scenarios.
"""

import pytest
from uuid import uuid4

from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

CASE_ID = str(uuid4())
BASE_URL = "/api/execution"


@pytest.fixture(autouse=True)
def _reset_services():
    """Reset services between tests."""
    from api.fault_scenarios import get_fault_scenario_service
    from api.execution_runs import get_engine

    service = get_fault_scenario_service()
    service._scenarios.clear()
    service._case_scenarios.clear()
    service._scenario_runs.clear()

    engine = get_engine()
    engine._runs.clear()
    engine._result_sets.clear()
    engine._study_cases.clear()
    engine._case_runs.clear()
    yield


def _create_scenario(
    name: str = "Zwarcie testowe",
    fault_type: str = "SC_3F",
    element_ref: str = "bus-1",
) -> dict:
    resp = client.post(
        f"{BASE_URL}/study-cases/{CASE_ID}/fault-scenarios",
        json={
            "name": name,
            "fault_type": fault_type,
            "location": {
                "element_ref": element_ref,
                "location_type": "BUS",
                "position": None,
            },
        },
    )
    assert resp.status_code == 201
    return resp.json()


class TestCreateRunFromScenario:
    def test_create_run_from_scenario(self):
        """Create a run from a SC_3F scenario — should succeed."""
        scenario = _create_scenario(name="Run test 3F", fault_type="SC_3F")
        sid = scenario["scenario_id"]

        resp = client.post(
            f"{BASE_URL}/fault-scenarios/{sid}/runs",
            json={},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "PENDING"
        assert data["scenario_id"] == sid
        assert data["analysis_type"] == "SC_3F"

    def test_create_run_sc2f_blocked(self):
        """SC_2F without Z2 should be blocked by eligibility."""
        scenario = _create_scenario(name="Run test 2F", fault_type="SC_2F")
        sid = scenario["scenario_id"]

        resp = client.post(
            f"{BASE_URL}/fault-scenarios/{sid}/runs",
            json={},
        )
        assert resp.status_code == 409
        assert "zablokowana" in resp.json()["detail"].lower()

    def test_create_run_not_found(self):
        """Run creation for unknown scenario should fail."""
        fake_id = str(uuid4())
        resp = client.post(
            f"{BASE_URL}/fault-scenarios/{fake_id}/runs",
            json={},
        )
        assert resp.status_code == 404


class TestGoldenFixture:
    """Golden fixture: minimal network with SC_3F, SC_1F, SC_2F scenarios."""

    def test_golden_sc3f_eligible(self):
        scenario = _create_scenario(name="Golden 3F", fault_type="SC_3F", element_ref="bus-main")
        sid = scenario["scenario_id"]
        elig = client.get(f"{BASE_URL}/fault-scenarios/{sid}/eligibility").json()
        assert elig["status"] == "ELIGIBLE"

    def test_golden_sc2f_ineligible(self):
        scenario = _create_scenario(name="Golden 2F", fault_type="SC_2F", element_ref="bus-main")
        sid = scenario["scenario_id"]
        elig = client.get(f"{BASE_URL}/fault-scenarios/{sid}/eligibility").json()
        assert elig["status"] == "INELIGIBLE"
        assert any("Z2" in b["message_pl"] for b in elig["blockers"])

    def test_golden_sc3f_run_creates(self):
        scenario = _create_scenario(name="Golden run 3F", fault_type="SC_3F", element_ref="bus-main")
        sid = scenario["scenario_id"]
        resp = client.post(f"{BASE_URL}/fault-scenarios/{sid}/runs", json={})
        assert resp.status_code == 201
        assert resp.json()["analysis_type"] == "SC_3F"

    def test_golden_overlay_determinism(self):
        """Same scenario produces identical SLD overlay payload."""
        scenario = _create_scenario(name="Overlay det", fault_type="SC_3F", element_ref="bus-1")
        sid = scenario["scenario_id"]
        ov1 = client.get(f"{BASE_URL}/fault-scenarios/{sid}/sld-overlay").json()
        ov2 = client.get(f"{BASE_URL}/fault-scenarios/{sid}/sld-overlay").json()
        assert ov1 == ov2

    def test_golden_hash_determinism(self):
        """Two scenarios with same content have same content_hash."""
        s1 = _create_scenario(name="Hash A", fault_type="SC_3F", element_ref="bus-1")
        s2 = _create_scenario(name="Hash A", fault_type="SC_3F", element_ref="bus-1")
        # They can't be created due to duplicate check, so test via domain
        from domain.fault_scenario import (
            FaultLocation, FaultType, compute_scenario_content_hash, new_fault_scenario
        )
        from uuid import uuid4
        cid = uuid4()
        a = new_fault_scenario(
            study_case_id=cid, name="Det", fault_type=FaultType.SC_3F,
            location=FaultLocation(element_ref="bus-x", location_type="BUS"),
        )
        b = new_fault_scenario(
            study_case_id=cid, name="Det", fault_type=FaultType.SC_3F,
            location=FaultLocation(element_ref="bus-x", location_type="BUS"),
        )
        assert compute_scenario_content_hash(a) == compute_scenario_content_hash(b)
