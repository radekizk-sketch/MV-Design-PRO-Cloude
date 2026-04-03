from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    db_path = tmp_path / "catalog-api.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+pysqlite:///{db_path}")

    from api.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.mark.parametrize(
    ("endpoint", "expected_id"),
    [
        ("/api/catalog/lv-cable-types", "kab_nn_4x120_al"),
        ("/api/catalog/load-types", "load_mieszk_15kw"),
        ("/api/catalog/lv-apparatus-types", "cb_nn_1000a"),
        ("/api/catalog/ct-types", "ct_400_5_5p20"),
        ("/api/catalog/vt-types", "vt_15kv_100v"),
        ("/api/catalog/protection/device-types", "ACME_REX500_v1"),
        ("/api/catalog/protection/curves", "curve_iec_normal_inverse"),
        ("/api/catalog/protection/templates", "template_rex500_oc"),
    ],
)
def test_catalog_api_exposes_extended_namespaces(
    client: TestClient,
    endpoint: str,
    expected_id: str,
) -> None:
    response = client.get(endpoint)

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert payload
    assert any(item["id"] == expected_id for item in payload)


def test_protection_catalog_api_exposes_unverified_flag_for_analytical_devices(
    client: TestClient,
) -> None:
    response = client.get("/api/catalog/protection/device-types/EM_ETANGO_400_V0")

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "EM_ETANGO_400_V0"
    assert payload["params"]["vendor"] == "ELEKTROMETAL"
    assert payload["params"]["series"] == "e2TANGO"
    assert payload["params"]["unverified"] is True
    assert payload["params"]["unverified_ranges"] is True
    assert payload["params"]["source_catalog"].endswith("devices_v0.json")
    assert payload["params"]["verification_status"] == "NIEWERYFIKOWANY"
    assert payload["params"]["catalog_status"] == "ANALITYCZNY_V1"
    assert payload["params"]["contract_version"] == "2.0"
    assert payload["params"]["source_reference"]


def test_catalog_api_exposes_quality_metadata_for_default_namespace(
    client: TestClient,
) -> None:
    response = client.get("/api/catalog/line-types")

    assert response.status_code == 200
    payload = response.json()
    assert payload
    first = payload[0]
    assert first["verification_status"] in {
        "ZWERYFIKOWANY",
        "NIEWERYFIKOWANY",
        "CZESCIOWO_ZWERYFIKOWANY",
        "REFERENCYJNY",
    }
    assert first["catalog_status"] in {
        "PRODUKCYJNY_V1",
        "REFERENCYJNY_V1",
        "ANALITYCZNY_V1",
        "TESTOWY",
    }
    assert first["contract_version"] == "2.0"
    assert first["source_reference"]
