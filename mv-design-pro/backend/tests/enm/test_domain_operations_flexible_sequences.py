from __future__ import annotations

from enm.domain_operations import execute_domain_operation
from enm.models import ENMDefaults, ENMHeader, EnergyNetworkModel

CABLE_ID = "cable-tfk-yakxs-3x120"
TRAFO_ID = "tr-sn-nn-15-04-630kva-dyn11"


def _empty_enm() -> dict:
    enm = EnergyNetworkModel(
        header=ENMHeader(name="flex-sequences", defaults=ENMDefaults(sn_nominal_kv=15.0)),
    )
    return enm.model_dump(mode="json")


def _apply(snapshot: dict, op_name: str, payload: dict) -> dict:
    result = execute_domain_operation(snapshot, op_name, payload)
    assert result.get("error") is None, f"{op_name} failed: {result.get('error')}"
    return result["snapshot"]


def _build_source_plus_segments(segment_lengths_m: list[int]) -> dict:
    snapshot = _empty_enm()
    snapshot = _apply(snapshot, "add_grid_source_sn", {"voltage_kv": 15.0, "sk3_mva": 250.0})
    for idx, length in enumerate(segment_lengths_m):
        snapshot = _apply(snapshot, "continue_trunk_segment_sn", {
            "segment": {
                "rodzaj": "KABEL",
                "dlugosc_m": length,
                "name": f"Odcinek {idx + 1}",
                "catalog_ref": CABLE_ID,
            },
        })
    return snapshot


def _last_trunk_segment(snapshot: dict) -> str:
    corridors = snapshot.get("corridors", [])
    assert corridors, "Brak korytarza trunk"
    ordered = corridors[0].get("ordered_segment_refs", [])
    assert ordered, "Brak segmentów trunk"
    return ordered[-1]


def test_sequence_continue_continue_insert_station_then_branch():
    snapshot = _build_source_plus_segments([220, 240])
    target_segment = _last_trunk_segment(snapshot)

    snapshot = _apply(snapshot, "insert_station_on_segment_sn", {
        "segment_ref": target_segment,
        "station_type": "B",
        "insert_at": {"ratio": 0.5},
        "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
        "transformer": {"create": True, "transformer_catalog_ref": TRAFO_ID},
    })

    station_bus_ref = next(
        bus["ref_id"] for bus in snapshot.get("buses", [])
        if "sn_bus" in bus.get("ref_id", "")
    )

    snapshot = _apply(snapshot, "start_branch_segment_sn", {
        "from_bus_ref": station_bus_ref,
        "segment": {
            "rodzaj": "KABEL",
            "dlugosc_m": 150,
            "catalog_ref": CABLE_ID,
        },
    })

    assert len(snapshot.get("branches", [])) >= 3


def test_sequence_edit_delete_continue_trunk():
    snapshot = _build_source_plus_segments([200, 210])
    trunk_segment_ref = _last_trunk_segment(snapshot)

    snapshot = _apply(snapshot, "update_element_parameters", {
        "element_ref": trunk_segment_ref,
        "parameters": {
            "length_km": 0.333,
            "status": "closed",
        },
    })

    snapshot = _apply(snapshot, "delete_element", {
        "element_ref": trunk_segment_ref,
    })

    snapshot = _apply(snapshot, "continue_trunk_segment_sn", {
        "segment": {
            "rodzaj": "KABEL",
            "dlugosc_m": 190,
            "catalog_ref": CABLE_ID,
        },
    })

    assert len(snapshot.get("branches", [])) >= 2
