"""Tests for ENM API read/validate/run/domain-ops endpoints."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.enm import router as enm_router
from enm.canonical_analysis import reset_canonical_runs
from enm.models import EnergyNetworkModel
from enm.store import reset_enm_store, set_enm


def _seed_enm(case_id: str, payload: dict) -> None:
    set_enm(case_id, EnergyNetworkModel.model_validate(payload))


@pytest.fixture(autouse=True)
def reset_state():
    reset_canonical_runs()
    reset_enm_store()
    yield
    reset_canonical_runs()
    reset_enm_store()


@pytest.fixture
def client():
    """Lightweight app with only ENM router."""
    test_app = FastAPI()
    test_app.include_router(enm_router)
    return TestClient(test_app)


def _valid_enm_payload(name: str) -> dict:
    return {
        "header": {
            "name": name,
            "enm_version": "1.0",
            "defaults": {"frequency_hz": 50, "unit_system": "SI"},
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "revision": 1,
            "hash_sha256": "",
        },
        "buses": [
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "ref_id": "b1",
                "name": "B1",
                "tags": [],
                "meta": {},
                "voltage_kv": 15,
                "phase_system": "3ph",
            }
        ],
        "branches": [],
        "transformers": [],
        "sources": [
            {
                "id": "00000000-0000-0000-0000-000000000002",
                "ref_id": "s1",
                "name": "S1",
                "tags": [],
                "meta": {},
                "bus_ref": "b1",
                "model": "short_circuit_power",
                "sk3_mva": 220,
                "rx_ratio": 0.1,
            }
        ],
        "loads": [],
        "generators": [],
        "substations": [],
        "bays": [],
        "junctions": [],
        "corridors": [],
        "measurements": [],
        "protection_assignments": [],
        "branch_points": [],
    }


class TestENMRead:
    def test_get_default_enm(self, client):
        response = client.get("/api/cases/test-case-1/enm")
        assert response.status_code == 200
        data = response.json()
        assert "header" in data
        assert data["header"]["enm_version"] == "1.0"
        assert data["buses"] == []

    def test_get_returns_seeded_enm(self, client):
        _seed_enm("test-case-2", _valid_enm_payload("Updated"))
        response = client.get("/api/cases/test-case-2/enm")
        assert response.status_code == 200
        assert response.json()["header"]["name"] == "Updated"


class TestENMValidate:
    def test_empty_enm_fails_validation(self, client):
        client.get("/api/cases/test-case-5/enm")
        response = client.get("/api/cases/test-case-5/enm/validate")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "FAIL"
        codes = [issue["code"] for issue in data["issues"]]
        assert "E001" in codes
        assert "E002" in codes

    def test_valid_enm_passes(self, client):
        _seed_enm("test-case-6", _valid_enm_payload("Test"))
        response = client.get("/api/cases/test-case-6/enm/validate")
        data = response.json()
        assert data["status"] in ("OK", "WARN")
        assert data["analysis_available"]["short_circuit_3f"] is True


class TestRunDispatch:
    def test_run_fails_on_empty_enm(self, client):
        client.get("/api/cases/test-case-7/enm")
        response = client.post("/api/cases/test-case-7/runs/short-circuit")
        assert response.status_code == 422

    def test_run_succeeds_on_valid_enm(self, client):
        _seed_enm("test-case-8", _valid_enm_payload("SC Test"))
        response = client.post("/api/cases/test-case-8/runs/short-circuit")
        assert response.status_code == 200
        data = response.json()
        assert data["analysis_type"] == "short_circuit_3f"
        assert len(data["results"]) >= 1
        assert data["results"][0]["ikss_a"] > 0


class TestDomainOpsCatalogPolicy:
    def test_domain_ops_rejects_missing_catalog_binding_and_keeps_snapshot(self, client):
        case_id = "test-case-domain-ops-1"

        add_source = client.post(
            f"/api/cases/{case_id}/enm/domain-ops",
            json={
                "operation": {
                    "name": "add_grid_source_sn",
                    "payload": {"voltage_kv": 15.0, "sk3_mva": 250.0},
                },
            },
        )
        assert add_source.status_code == 200

        before = client.get(f"/api/cases/{case_id}/enm").json()
        before_hash = before["header"]["hash_sha256"]

        malformed = client.post(
            f"/api/cases/{case_id}/enm/domain-ops",
            json={
                "snapshot_base_hash": before_hash,
                "operation": {
                    "name": "continue_trunk_segment_sn",
                    "payload": {
                        "from_terminal": {"type": "source"},
                        "segment": {"rodzaj": "KABEL", "dlugosc_m": 200.0},
                    },
                },
            },
        )
        assert malformed.status_code == 422
        body = malformed.json()
        assert body["detail"]["code"] == "catalog.ref_required"

        after = client.get(f"/api/cases/{case_id}/enm").json()
        assert after["header"]["hash_sha256"] == before_hash
        assert after["branches"] == before["branches"]

    def test_domain_ops_rejects_malformed_catalog_binding_and_keeps_snapshot(self, client):
        case_id = "test-case-domain-ops-2"

        add_source = client.post(
            f"/api/cases/{case_id}/enm/domain-ops",
            json={
                "operation": {
                    "name": "add_grid_source_sn",
                    "payload": {"voltage_kv": 15.0, "sk3_mva": 250.0},
                },
            },
        )
        assert add_source.status_code == 200

        before = client.get(f"/api/cases/{case_id}/enm").json()
        before_hash = before["header"]["hash_sha256"]

        malformed = client.post(
            f"/api/cases/{case_id}/enm/domain-ops",
            json={
                "snapshot_base_hash": before_hash,
                "operation": {
                    "name": "continue_trunk_segment_sn",
                    "payload": {
                        "from_terminal": {"type": "source"},
                        "segment": {
                            "rodzaj": "KABEL",
                            "dlugosc_m": 200.0,
                            "catalog_binding": {"namespace": "KABEL_SN"},
                        },
                    },
                },
            },
        )
        assert malformed.status_code == 422
        body = malformed.json()
        assert body["detail"]["code"] == "catalog.ref_required"

        after = client.get(f"/api/cases/{case_id}/enm").json()
        assert after["header"]["hash_sha256"] == before_hash
        assert after["branches"] == before["branches"]
