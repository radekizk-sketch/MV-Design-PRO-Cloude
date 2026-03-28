from __future__ import annotations

import copy

import pytest

from enm.domain_operations import execute_domain_operation
from enm.models import ENMDefaults, ENMHeader, EnergyNetworkModel


def _base_enm() -> dict:
    enm = EnergyNetworkModel(
        header=ENMHeader(name="nn-source-catalog", defaults=ENMDefaults(sn_nominal_kv=15.0)),
    ).model_dump(mode="json")
    enm["buses"] = [
        {
            "ref_id": "bus/nn/1",
            "name": "Szyna nN",
            "voltage_kv": 0.4,
            "tags": [],
            "meta": {},
        }
    ]
    enm["substations"] = [
        {
            "ref_id": "sub/1",
            "name": "Stacja SN/nN 1",
            "bus_refs": ["bus/nn/1"],
            "transformer_refs": ["tr/1"],
            "tags": [],
            "meta": {},
        }
    ]
    return enm


def _pv_payload(pv_spec: dict) -> dict:
    return {
        "bus_nn_ref": "bus/nn/1",
        "station_ref": "sub/1",
        "pv_spec": {
            "rated_power_ac_kw": 50.0,
            "max_power_kw": 55.0,
            "control_mode": "STALY_COS_PHI",
            **pv_spec,
        },
    }


def _bess_payload(bess_spec: dict) -> dict:
    return {
        "bus_nn_ref": "bus/nn/1",
        "station_ref": "sub/1",
        "bess_spec": {
            "usable_capacity_kwh": 100.0,
            "charge_power_kw": 40.0,
            "discharge_power_kw": 40.0,
            "operation_mode": "DWUKIERUNKOWY",
            **bess_spec,
        },
    }


@pytest.mark.parametrize(
    ("op_name", "payload"),
    [
        ("add_pv_inverter_nn", _pv_payload({"catalog_item_id": ""})),
        ("add_bess_inverter_nn", _bess_payload({"inverter_catalog_id": ""})),
    ],
)
def test_missing_or_empty_catalog_identifier_fails(op_name: str, payload: dict) -> None:
    result = execute_domain_operation(_base_enm(), op_name, payload)

    assert result.get("snapshot") is None
    assert result.get("error_code") == "catalog.ref_required"


@pytest.mark.parametrize(
    ("op_name", "payload"),
    [
        (
            "add_pv_inverter_nn",
            _pv_payload(
                {
                    "catalog_binding": {"item_id": ""},
                    "materialized_params": {
                        "rated_power_ac_kw": 50.0,
                        "max_power_kw": 55.0,
                        "control_mode": "STALY_COS_PHI",
                    },
                }
            ),
        ),
        (
            "add_bess_inverter_nn",
            _bess_payload(
                {
                    "catalog_binding": "invalid",
                    "materialized_params": {
                        "usable_capacity_kwh": 100.0,
                        "charge_power_kw": 40.0,
                        "discharge_power_kw": 40.0,
                        "operation_mode": "DWUKIERUNKOWY",
                    },
                }
            ),
        ),
    ],
)
def test_malformed_binding_fails(op_name: str, payload: dict) -> None:
    result = execute_domain_operation(_base_enm(), op_name, payload)

    assert result.get("snapshot") is None
    assert result.get("error_code") == "catalog.binding_invalid"


@pytest.mark.parametrize(
    ("op_name", "payload"),
    [
        (
            "add_pv_inverter_nn",
            _pv_payload(
                {
                    "catalog_item_id": "PV-CAT-001",
                    "materialized_params": {"rated_power_ac_kw": 50.0, "max_power_kw": 55.0},
                }
            ),
        ),
        (
            "add_bess_inverter_nn",
            _bess_payload(
                {
                    "inverter_catalog_id": "BESS-CAT-001",
                    "materialized_params": {
                        "usable_capacity_kwh": 100.0,
                        "charge_power_kw": 40.0,
                    },
                }
            ),
        ),
    ],
)
def test_failed_materialization_leaves_snapshot_unchanged(op_name: str, payload: dict) -> None:
    enm_before = _base_enm()
    baseline = copy.deepcopy(enm_before)

    result = execute_domain_operation(enm_before, op_name, payload)

    assert result.get("snapshot") is None
    assert result.get("error_code") == "catalog.materialization_incomplete"
    assert enm_before == baseline


@pytest.mark.parametrize(
    ("op_name", "payload", "expected_namespace", "catalog_key"),
    [
        (
            "add_pv_inverter_nn",
            _pv_payload(
                {
                    "catalog_item_id": "PV-CAT-001",
                    "materialized_params": {
                        "rated_power_ac_kw": 50.0,
                        "max_power_kw": 55.0,
                        "control_mode": "STALY_COS_PHI",
                    },
                }
            ),
            "ZRODLO_NN_PV",
            "PV-CAT-001",
        ),
        (
            "add_bess_inverter_nn",
            _bess_payload(
                {
                    "inverter_catalog_id": "BESS-CAT-001",
                    "materialized_params": {
                        "usable_capacity_kwh": 100.0,
                        "charge_power_kw": 40.0,
                        "discharge_power_kw": 40.0,
                        "operation_mode": "DWUKIERUNKOWY",
                    },
                }
            ),
            "ZRODLO_NN_BESS",
            "BESS-CAT-001",
        ),
    ],
)
def test_successful_create_includes_provenance_fields(
    op_name: str, payload: dict, expected_namespace: str, catalog_key: str
) -> None:
    result = execute_domain_operation(_base_enm(), op_name, payload)

    assert not result.get("error")
    snapshot = result.get("snapshot")
    assert snapshot is not None

    created_ids = result["changes"]["created_element_ids"]
    assert len(created_ids) == 1
    created_ref = created_ids[0]
    created = next(g for g in snapshot.get("generators", []) if g.get("ref_id") == created_ref)

    assert created.get("catalog_ref") == catalog_key
    assert created.get("catalog_namespace") == expected_namespace
    assert created.get("source_mode") == "KATALOG"
    assert isinstance(created.get("materialized_params"), dict)
