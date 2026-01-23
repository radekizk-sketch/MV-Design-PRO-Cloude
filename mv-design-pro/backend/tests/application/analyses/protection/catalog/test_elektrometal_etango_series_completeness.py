from __future__ import annotations

from application.analyses.protection.catalog.catalog_store import list_devices


EXPECTED_RATED = [400, 600, 800, 1000, 1250, 1600, 2000]


def test_elektrometal_etango_series_is_complete_and_deterministic() -> None:
    devices = list_devices(vendor="ELEKTROMETAL")
    device_ids = [device.device_id for device in devices]
    models = [device.model for device in devices]
    rated_values = [device.meta.get("rated") for device in devices]

    expected_models = [f"e2TANGO-{rated}" for rated in EXPECTED_RATED]
    expected_device_ids = [f"EM_ETANGO_{rated}_V0" for rated in EXPECTED_RATED]

    assert device_ids == sorted(device_ids)
    assert models == expected_models
    assert rated_values == EXPECTED_RATED
    assert device_ids == expected_device_ids
    assert {"e2TANGO-400", "e2TANGO-600", "e2TANGO-800", "e2TANGO-1000"} <= set(
        models
    )

    for device in devices:
        assert device.meta.get("series") == "e2TANGO"
        assert device.meta.get("source_ref")
        assert device.meta.get("unverified") is True
        assert device.meta.get("unverified_ranges") is True
