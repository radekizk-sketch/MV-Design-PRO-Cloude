"""Tests for ENM API endpoints — GET/PUT, revision, hash, validate, run dispatch."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.enm import router as enm_router


@pytest.fixture
def client():
    """Lightweight app with only ENM router (no DB dependency)."""
    test_app = FastAPI()
    test_app.include_router(enm_router)
    return TestClient(test_app)


class TestENMGetPut:
    def test_get_default_enm(self, client):
        resp = client.get("/api/cases/test-case-1/enm")
        assert resp.status_code == 200
        data = resp.json()
        assert "header" in data
        assert data["header"]["enm_version"] == "1.0"
        assert data["buses"] == []

    def test_put_enm_increments_revision(self, client):
        resp1 = client.get("/api/cases/test-case-2/enm")
        rev1 = resp1.json()["header"]["revision"]

        enm = resp1.json()
        enm["header"]["name"] = "Updated"
        resp2 = client.put("/api/cases/test-case-2/enm", json=enm)
        assert resp2.status_code == 200
        rev2 = resp2.json()["header"]["revision"]
        assert rev2 > rev1

    def test_put_noop_on_same_hash(self, client):
        resp1 = client.get("/api/cases/test-case-3/enm")
        enm = resp1.json()
        rev1 = enm["header"]["revision"]

        resp2 = client.put("/api/cases/test-case-3/enm", json=enm)
        rev2 = resp2.json()["header"]["revision"]
        assert rev2 == rev1

    def test_put_recomputes_hash(self, client):
        resp1 = client.get("/api/cases/test-case-4/enm")
        hash1 = resp1.json()["header"]["hash_sha256"]

        enm = resp1.json()
        enm["header"]["name"] = "Changed"
        resp2 = client.put("/api/cases/test-case-4/enm", json=enm)
        hash2 = resp2.json()["header"]["hash_sha256"]
        assert hash2 != hash1


class TestENMValidate:
    def test_empty_enm_fails_validation(self, client):
        client.get("/api/cases/test-case-5/enm")
        resp = client.get("/api/cases/test-case-5/enm/validate")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "FAIL"
        codes = [i["code"] for i in data["issues"]]
        assert "E001" in codes
        assert "E002" in codes

    def test_valid_enm_passes(self, client):
        enm = {
            "header": {"name": "Test", "enm_version": "1.0", "defaults": {"frequency_hz": 50, "unit_system": "SI"},
                       "created_at": "2024-01-01T00:00:00Z", "updated_at": "2024-01-01T00:00:00Z",
                       "revision": 1, "hash_sha256": ""},
            "buses": [{"id": "00000000-0000-0000-0000-000000000001", "ref_id": "b1", "name": "B1",
                       "tags": [], "meta": {}, "voltage_kv": 15, "phase_system": "3ph"}],
            "branches": [],
            "transformers": [],
            "sources": [{"id": "00000000-0000-0000-0000-000000000002", "ref_id": "s1", "name": "S1",
                         "tags": [], "meta": {}, "bus_ref": "b1", "model": "short_circuit_power",
                         "sk3_mva": 220, "rx_ratio": 0.1}],
            "loads": [],
            "generators": [],
        }
        client.put("/api/cases/test-case-6/enm", json=enm)
        resp = client.get("/api/cases/test-case-6/enm/validate")
        data = resp.json()
        assert data["status"] in ("OK", "WARN")
        assert data["analysis_available"]["short_circuit_3f"] is True


class TestRunDispatch:
    def test_run_fails_on_empty_enm(self, client):
        client.get("/api/cases/test-case-7/enm")
        resp = client.post("/api/cases/test-case-7/runs/short-circuit")
        assert resp.status_code == 422

    def test_run_succeeds_on_valid_enm(self, client):
        enm = {
            "header": {"name": "SC Test", "enm_version": "1.0",
                       "defaults": {"frequency_hz": 50, "unit_system": "SI"},
                       "created_at": "2024-01-01T00:00:00Z", "updated_at": "2024-01-01T00:00:00Z",
                       "revision": 1, "hash_sha256": ""},
            "buses": [
                {"id": "00000000-0000-0000-0000-000000000001", "ref_id": "bus_sn", "name": "Szyna SN",
                 "tags": [], "meta": {}, "voltage_kv": 15, "phase_system": "3ph"},
            ],
            "branches": [],
            "transformers": [],
            "sources": [
                {"id": "00000000-0000-0000-0000-000000000002", "ref_id": "src_grid", "name": "Grid",
                 "tags": [], "meta": {}, "bus_ref": "bus_sn", "model": "short_circuit_power",
                 "sk3_mva": 220, "rx_ratio": 0.1},
            ],
            "loads": [],
            "generators": [],
        }
        client.put("/api/cases/test-case-8/enm", json=enm)
        resp = client.post("/api/cases/test-case-8/runs/short-circuit")
        assert resp.status_code == 200
        data = resp.json()
        assert data["analysis_type"] == "short_circuit_3f"
        assert len(data["results"]) >= 1
        assert data["results"][0]["ikss_a"] > 0
