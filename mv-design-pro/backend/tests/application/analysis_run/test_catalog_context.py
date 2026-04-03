from application.analysis_run.catalog_context import build_catalog_context


def test_build_catalog_context_preserves_materialization_and_override_provenance() -> None:
    context = build_catalog_context(
        {
            "branches": [
                {
                    "ref_id": "line-001",
                    "catalog_ref": "cable-120",
                    "catalog_namespace": "KABEL_SN",
                    "meta": {"catalog_item_version": "2026.04"},
                    "materialized_params": {"r_ohm_per_km": 0.12},
                    "parameter_source": "OVERRIDE",
                    "source_mode": "KATALOG",
                    "overrides": [
                        {
                            "key": "length_km",
                            "value": 1.25,
                            "reason": "pomiar powykonawczy",
                        }
                    ],
                }
            ],
            "sources": [
                {
                    "ref_id": "src-001",
                    "catalog_ref": "src-gpz-15kv-250mva-rx010",
                    "catalog_namespace": "ZRODLO_SN",
                    "materialized_params": {"sk3_mva": 250.0, "rx_ratio": 0.1},
                    "parameter_source": "CATALOG",
                }
            ],
        }
    )

    assert context == [
        {
            "element_id": "line-001",
            "element_type": "ODCINEK_SN",
            "name": None,
            "catalog_binding": {
                "catalog_namespace": "KABEL_SN",
                "catalog_item_id": "cable-120",
                "catalog_item_version": "2026.04",
            },
            "source_catalog": {
                "catalog_namespace": "KABEL_SN",
                "catalog_item_id": "cable-120",
                "catalog_item_version": "2026.04",
            },
            "source_catalog_label": "KABEL_SN:cable-120@2026.04",
            "materialized_params": {"r_ohm_per_km": 0.12},
            "parameter_origin": "OVERRIDE",
            "parameter_source": "OVERRIDE",
            "source_mode": "KATALOG",
            "manual_overrides": [
                {
                    "key": "length_km",
                    "value": 1.25,
                    "reason": "pomiar powykonawczy",
                }
            ],
            "manual_override_count": 1,
            "has_manual_overrides": True,
            "overrides": [
                {
                    "key": "length_km",
                    "value": 1.25,
                    "reason": "pomiar powykonawczy",
                }
            ],
        },
        {
            "element_id": "src-001",
            "element_type": "ZRODLO_SN",
            "name": None,
            "catalog_binding": {
                "catalog_namespace": "ZRODLO_SN",
                "catalog_item_id": "src-gpz-15kv-250mva-rx010",
                "catalog_item_version": None,
            },
            "source_catalog": {
                "catalog_namespace": "ZRODLO_SN",
                "catalog_item_id": "src-gpz-15kv-250mva-rx010",
                "catalog_item_version": None,
            },
            "source_catalog_label": "ZRODLO_SN:src-gpz-15kv-250mva-rx010",
            "materialized_params": {"sk3_mva": 250.0, "rx_ratio": 0.1},
            "parameter_origin": "CATALOG",
            "parameter_source": "CATALOG",
            "manual_override_count": 0,
            "has_manual_overrides": False,
        },
    ]
