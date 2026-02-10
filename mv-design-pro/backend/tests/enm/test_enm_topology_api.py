"""Testy API topologicznych endpointów ENM — topology, readiness."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.enm import router as enm_router


@pytest.fixture
def client():
    """Lekka aplikacja z routerem ENM (bez bazy danych)."""
    test_app = FastAPI()
    test_app.include_router(enm_router)
    return TestClient(test_app)


def _valid_enm_with_topology():
    """ENM z pełną topologią: stacje, pola, węzły T, magistrale."""
    return {
        "header": {
            "name": "Topology Test", "enm_version": "1.0",
            "defaults": {"frequency_hz": 50, "unit_system": "SI"},
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "revision": 1, "hash_sha256": "",
        },
        "buses": [
            {"ref_id": "bus_sn_a", "name": "Szyna SN A", "tags": [], "meta": {},
             "voltage_kv": 15, "phase_system": "3ph"},
            {"ref_id": "bus_sn_b", "name": "Szyna SN B", "tags": [], "meta": {},
             "voltage_kv": 15, "phase_system": "3ph"},
            {"ref_id": "bus_nn_1", "name": "Szyna nn 1", "tags": [], "meta": {},
             "voltage_kv": 0.4, "phase_system": "3ph"},
        ],
        "sources": [
            {"ref_id": "src_1", "name": "Grid", "tags": [], "meta": {},
             "bus_ref": "bus_sn_a", "model": "short_circuit_power", "sk3_mva": 220},
        ],
        "branches": [
            {"ref_id": "line_1", "name": "Linia L1", "tags": [], "meta": {},
             "type": "line_overhead", "from_bus_ref": "bus_sn_a", "to_bus_ref": "bus_sn_b",
             "status": "closed", "length_km": 10, "r_ohm_per_km": 0.443, "x_ohm_per_km": 0.34,
             "catalog_ref": "CAT-CAB-001"},
        ],
        "transformers": [
            {"ref_id": "trafo_1", "name": "T1", "tags": [], "meta": {},
             "hv_bus_ref": "bus_sn_b", "lv_bus_ref": "bus_nn_1",
             "sn_mva": 0.63, "uhv_kv": 15, "ulv_kv": 0.4, "uk_percent": 4.5, "pk_kw": 6.5,
             "catalog_ref": "CAT-TR-001"},
        ],
        "loads": [
            {"ref_id": "load_1", "name": "Odbiór 1", "tags": [], "meta": {},
             "bus_ref": "bus_nn_1", "p_mw": 0.2, "q_mvar": 0.1, "model": "pq"},
        ],
        "generators": [],
        "substations": [
            {"ref_id": "sub_gpz", "name": "GPZ", "tags": [], "meta": {},
             "station_type": "gpz", "bus_refs": ["bus_sn_a"]},
            {"ref_id": "sub_1", "name": "Stacja 1", "tags": [], "meta": {},
             "station_type": "mv_lv", "bus_refs": ["bus_sn_b", "bus_nn_1"],
             "transformer_refs": ["trafo_1"]},
        ],
        "bays": [
            {"ref_id": "bay_in_1", "name": "Pole IN", "tags": [], "meta": {},
             "bay_role": "IN", "substation_ref": "sub_1", "bus_ref": "bus_sn_b"},
            {"ref_id": "bay_tr_1", "name": "Pole TR", "tags": [], "meta": {},
             "bay_role": "TR", "substation_ref": "sub_1", "bus_ref": "bus_sn_b"},
        ],
        "junctions": [
            {"ref_id": "junc_1", "name": "T-node 1", "tags": [], "meta": {},
             "connected_branch_refs": ["line_1", "line_1", "line_1"],
             "junction_type": "T_node"},
        ],
        "corridors": [
            {"ref_id": "corr_a", "name": "Magistrala A", "tags": [], "meta": {},
             "corridor_type": "radial", "ordered_segment_refs": ["line_1"]},
        ],
    }


class TestTopologyEndpoint:
    def test_get_topology_empty(self, client):
        resp = client.get("/api/cases/topo-test-1/enm/topology")
        assert resp.status_code == 200
        data = resp.json()
        assert data["substations"] == []
        assert data["bays"] == []
        assert data["junctions"] == []
        assert data["corridors"] == []

    def test_get_topology_with_data(self, client):
        enm = _valid_enm_with_topology()
        client.put("/api/cases/topo-test-2/enm", json=enm)

        resp = client.get("/api/cases/topo-test-2/enm/topology")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["substations"]) == 2
        assert len(data["bays"]) == 2
        assert len(data["junctions"]) == 1
        assert len(data["corridors"]) == 1
        assert data["bus_count"] == 3
        assert data["branch_count"] == 1
        assert data["transformer_count"] == 1


class TestReadinessEndpoint:
    def test_readiness_empty_enm(self, client):
        resp = client.get("/api/cases/ready-test-1/enm/readiness")
        assert resp.status_code == 200
        data = resp.json()
        assert data["validation"]["status"] == "FAIL"
        assert data["readiness"]["ready"] is False
        assert any(i["severity"] == "BLOCKER" for i in data["readiness"]["blockers"])
        assert data["analysis_readiness"]["short_circuit_3f"] is False
        assert data["topology_completeness"]["has_substations"] is False

    def test_readiness_with_topology(self, client):
        enm = _valid_enm_with_topology()
        client.put("/api/cases/ready-test-2/enm", json=enm)

        resp = client.get("/api/cases/ready-test-2/enm/readiness")
        assert resp.status_code == 200
        data = resp.json()
        assert data["validation"]["status"] == "WARN"
        assert data["readiness"]["ready"] is True
        assert data["readiness"]["blockers"] == []
        assert data["analysis_readiness"]["short_circuit_3f"] is True
        assert data["analysis_readiness"]["load_flow"] is True
        assert data["topology_completeness"]["has_substations"] is True
        assert data["topology_completeness"]["has_bays"] is True
        assert data["topology_completeness"]["has_junctions"] is True
        assert data["topology_completeness"]["has_corridors"] is True
        assert data["element_counts"]["substations"] == 2
        assert data["element_counts"]["bays"] == 2
        assert data["element_counts"]["buses"] == 3


    def test_readiness_false_blocker_e009(self, client):
        enm = _valid_enm_with_topology()
        enm["branches"][0]["catalog_ref"] = None
        client.put("/api/cases/ready-test-3/enm", json=enm)

        resp = client.get("/api/cases/ready-test-3/enm/readiness")
        assert resp.status_code == 200
        data = resp.json()
        assert data["validation"]["status"] == "FAIL"
        assert data["readiness"]["ready"] is False
        assert any(i["code"] == "E009" for i in data["readiness"]["blockers"])


class TestENMPutWithExtensions:
    def test_put_enm_with_substations_and_bays(self, client):
        enm = _valid_enm_with_topology()
        resp = client.put("/api/cases/put-ext-1/enm", json=enm)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["substations"]) == 2
        assert len(data["bays"]) == 2
        assert len(data["junctions"]) == 1
        assert len(data["corridors"]) == 1

    def test_roundtrip_put_get_with_extensions(self, client):
        enm = _valid_enm_with_topology()
        client.put("/api/cases/put-ext-2/enm", json=enm)

        resp = client.get("/api/cases/put-ext-2/enm")
        assert resp.status_code == 200
        data = resp.json()
        assert data["substations"][0]["ref_id"] == "sub_gpz"
        assert data["bays"][0]["ref_id"] == "bay_in_1"
        assert data["junctions"][0]["junction_type"] == "T_node"
        assert data["corridors"][0]["corridor_type"] == "radial"
