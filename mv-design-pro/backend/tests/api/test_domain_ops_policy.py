from api.domain_ops_policy import (
    extract_catalog_binding,
    validate_and_materialize_catalog_binding,
)


def test_extract_catalog_binding_prefers_nested_transformer_contract_over_root_binding():
    binding = extract_catalog_binding(
        "insert_station_on_segment_sn",
        {
            "catalog_binding": {
                "catalog_namespace": "KABEL_SN",
                "catalog_item_id": "cable-tfk-yakxs-3x120",
                "catalog_item_version": "2024.1",
                "materialize": True,
                "snapshot_mapping_version": "1.0",
            },
            "transformer": {
                "transformer_catalog_ref": "tr-sn-nn-15-04-630kva-dyn11",
            },
        },
    )

    assert binding is not None
    assert binding["catalog_namespace"] == "TRAFO_SN_NN"
    assert binding["catalog_item_id"] == "tr-sn-nn-15-04-630kva-dyn11"


def test_extract_catalog_binding_supports_nested_pv_spec_catalog_item_id():
    binding = extract_catalog_binding(
        "add_pv_inverter_nn",
        {
            "pv_spec": {
                "catalog_item_id": "conv-pv-1mw-15kv",
            }
        },
    )

    assert binding is not None
    assert binding["catalog_namespace"] == "ZRODLO_NN_PV"
    assert binding["catalog_item_id"] == "conv-pv-1mw-15kv"


def test_extract_catalog_binding_supports_nested_bess_spec_inverter_catalog_id():
    binding = extract_catalog_binding(
        "add_bess_inverter_nn",
        {
            "bess_spec": {
                "inverter_catalog_id": "conv-bess-1mw-2mwh-15kv",
            }
        },
    )

    assert binding is not None
    assert binding["catalog_namespace"] == "ZRODLO_NN_BESS"
    assert binding["catalog_item_id"] == "conv-bess-1mw-2mwh-15kv"


def test_validate_and_materialize_catalog_binding_accepts_segment_catalog_ref_without_explicit_binding():
    error, solver_fields = validate_and_materialize_catalog_binding(
        "continue_trunk_segment_sn",
        {
            "segment": {
                "rodzaj": "KABEL",
                "dlugosc_m": 200.0,
                "catalog_ref": "cable-tfk-yakxs-3x120",
            }
        },
    )

    assert error is None
    assert solver_fields["r_ohm_per_km"] is not None
    assert solver_fields["rated_current_a"] is not None


def test_validate_and_materialize_catalog_binding_accepts_transformer_catalog_ref_without_explicit_binding():
    error, solver_fields = validate_and_materialize_catalog_binding(
        "add_transformer_sn_nn",
        {
            "transformer_catalog_ref": "tr-sn-nn-15-04-630kva-dyn11",
        },
    )

    assert error is None
    assert solver_fields["rated_power_mva"] is not None
    assert solver_fields["uk_percent"] is not None
