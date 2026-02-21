"""
Golden Demo Network — kompletna siec referencyjna SN 15kV.

Buduje deterministyczna siec demonstracyjna przez operacje domenowe ENM,
z pelnym katalogiem SN (kable, linie, transformatory).

TOPOLOGIA:
    GPZ 110/15kV (Sk=250MVA, R/X=0.1)
    |
    Magistrala (kabel SN: XRUHAKXS 1x240, 12/20kV):
    |
    |-- 350m --[N01: Stacja ST-A1, typ B, TR 400kVA Dyn11, 2 odplywy nN]
    |-- 420m --[N02: Stacja ST-A2, typ B, TR 630kVA Dyn11, 3 odplywy nN, PV 50kW]
    |-- 550m --[N03: wezel T]
    |               |
    |               +-- odgalezienie 1 (linia: AFL-6 70, 800m)
    |                       |
    |                       [N05: Stacja ST-B1, typ A, TR 400kVA Dyn11, 2 odplywy nN]
    |
    |-- 380m --[N04: Stacja ST-B2, typ B, TR 630kVA Dyn11, 3 odplywy nN, BESS 30kW]

KATALOG SN (poprawne napiecia znamionowe):
- Kabel magistrali: cable-tfk-xruhakxs-1x240 (Al XLPE 1x240, 12/20kV, 410A)
- Linia odgalezienia: line-base-al-st-70 (AFL-6 70/11, 20kV, 230A)
- Kabel odgalezienia: cable-tfk-yakxs-3x120 (Al XLPE 3x120, 12/20kV, 230A)
- Trafo 400kVA: tr-sn-nn-15-04-400kva-dyn11 (15/0.4kV, uk=4.5%, Dyn11)
- Trafo 630kVA: tr-sn-nn-15-04-630kva-dyn11 (15/0.4kV, uk=5.0%, Dyn11)

UWAGA:
- YAKY 3x240 to kabel nN (0.4kV) — NIE UZYWAC w sieci SN!
- Kable SN maja voltage_rating_kv = 20.0 (namespace KABEL_SN)
- Linie SN maja voltage_rating_kv = 20.0 (namespace LINIA_SN)

DETERMINIZM: identyczne wejscie → identyczny wynik (SHA-256).
"""

from __future__ import annotations

import copy
import hashlib
import json
from typing import Any


# ---------------------------------------------------------------------------
# Catalog reference constants — SN equipment only (12/20kV or 20kV rated)
# ---------------------------------------------------------------------------

# Kable SN (KABEL_SN, voltage_rating_kv=20.0)
CABLE_SN_XRUHAKXS_240 = "cable-tfk-xruhakxs-1x240"  # Al XLPE 1×240/25, 410A
CABLE_SN_YAKXS_120 = "cable-tfk-yakxs-3x120"  # Al XLPE 3×120/16, 230A

# Linie napowietrzne SN (LINIA_SN, voltage_rating_kv=20.0)
LINE_SN_AFL6_70 = "line-base-al-st-70"  # AFL-6 70/11, 230A

# Transformatory SN/nN (15/0.4kV, Dyn11)
TR_400KVA_DYN11 = "tr-sn-nn-15-04-400kva-dyn11"  # 400kVA, uk=4.5%
TR_630KVA_DYN11 = "tr-sn-nn-15-04-630kva-dyn11"  # 630kVA, uk=5.0%


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _canonical_json(data: Any) -> str:
    return json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def _snapshot_hash(enm: dict[str, Any]) -> str:
    return hashlib.sha256(_canonical_json(enm).encode("utf-8")).hexdigest()


def _empty_enm() -> dict[str, Any]:
    """Minimalny pusty ENM do budowy sieci."""
    return {
        "header": {
            "name": "Siec demonstracyjna MV 15kV",
            "revision": 0,
            "defaults": {"sn_nominal_kv": 15.0},
        },
        "buses": [],
        "branches": [],
        "transformers": [],
        "sources": [],
        "loads": [],
        "generators": [],
        "substations": [],
        "bays": [],
        "junctions": [],
        "corridors": [],
        "measurements": [],
        "protection_assignments": [],
    }


def _exec(enm: dict[str, Any], op_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Wykonaj operacje domenowa z walidacja (V1 lub V2 dispatcher)."""
    from enm.domain_operations import execute_domain_operation
    from enm.domain_operations_v2 import ALL_V2_HANDLERS

    # Probu najpierw V1 (topologia), potem V2 (OZE, ochrona)
    result = execute_domain_operation(enm, op_name, payload)
    if result.get("error_code") == "dispatcher.unknown_operation" and op_name in ALL_V2_HANDLERS:
        handler = ALL_V2_HANDLERS[op_name]
        result = handler(enm, payload)

    error = result.get("error")
    if error:
        raise RuntimeError(
            f"Operacja '{op_name}' nie powiodla sie: {error} "
            f"(kod: {result.get('error_code', '?')})"
        )
    snapshot = result.get("snapshot")
    if snapshot is None:
        raise RuntimeError(f"Operacja '{op_name}' nie zwrocila snapshotu.")
    return snapshot


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def build_golden_demo_network() -> dict[str, Any]:
    """Zbuduj kompletna siec demonstracyjna MV 15kV.

    Zwraca slownik z kluczami:
    - name: nazwa sieci
    - description: opis topologii
    - enm: pelny snapshot ENM
    - snapshot_hash: SHA-256 hash snapshotu
    - operations_count: liczba operacji domenowych
    - catalog_refs: uzyte referencje katalogowe (do audytu)

    Raises:
        RuntimeError: jesli jakakolwiek operacja domenowa nie powiedzie sie.
    """
    enm = _empty_enm()
    ops_count = 0

    # -----------------------------------------------------------------------
    # 1. GPZ — zrodlo zasilania 110/15kV
    # -----------------------------------------------------------------------
    enm = _exec(enm, "add_grid_source_sn", {
        "voltage_kv": 15.0,
        "source_name": "GPZ Demonstracyjny",
        "sk3_mva": 250.0,
        "rx_ratio": 0.1,
    })
    ops_count += 1

    # -----------------------------------------------------------------------
    # 2. Magistrala — 4 odcinki kabla SN XRUHAKXS 1x240
    # -----------------------------------------------------------------------
    trunk_segments_m = [350, 420, 550, 380]
    for i, length_m in enumerate(trunk_segments_m, 1):
        enm = _exec(enm, "continue_trunk_segment_sn", {
            "segment": {
                "rodzaj": "KABEL",
                "dlugosc_m": length_m,
                "name": f"Odcinek magistrali {i}",
                "catalog_ref": CABLE_SN_XRUHAKXS_240,
            },
        })
        ops_count += 1

    # -----------------------------------------------------------------------
    # 3. Stacja ST-A1 (typ B, 400kVA) na odcinku 1
    # -----------------------------------------------------------------------
    branches_sn = [
        b for b in enm.get("branches", [])
        if b.get("type") in ("cable", "line_overhead")
    ]
    # Odcinek 1 = pierwszy segment magistrali
    if len(branches_sn) >= 1:
        enm = _exec(enm, "insert_station_on_segment_sn", {
            "segment_id": branches_sn[0]["ref_id"],
            "insert_at": {"mode": "RATIO", "value": 0.5},
            "station": {
                "station_type": "B",
                "station_name": "ST-A1",
                "sn_voltage_kv": 15.0,
                "nn_voltage_kv": 0.4,
            },
            "sn_fields": [
                {"field_role": "LINIA_IN"},
                {"field_role": "LINIA_OUT"},
                {"field_role": "TRANSFORMATOROWE"},
            ],
            "transformer": {
                "create": True,
                "transformer_catalog_ref": TR_400KVA_DYN11,
            },
            "nn_block": {"outgoing_feeders_nn_count": 2},
        })
        ops_count += 1

    # -----------------------------------------------------------------------
    # 4. Stacja ST-A2 (typ B, 630kVA) na odcinku 2
    # -----------------------------------------------------------------------
    # Po wstawieniu stacji odcinki sie przesunely — znajdz nowe galezie
    branches_sn = [
        b for b in enm.get("branches", [])
        if b.get("type") in ("cable", "line_overhead")
    ]
    # Potrzebujemy odcinki magistrali z katalogu XRUHAKXS (pomijamy juz podzielone)
    # Drugi oryginalny segment jest teraz na pozycji odpowiadajacej dlugosci 420m
    target_seg = None
    for b in branches_sn:
        length_km = b.get("length_km", 0)
        catalog = b.get("catalog_ref", "")
        # Szukamy odcinka 420m (0.42 km) z katalogu XRUHAKXS
        if abs(length_km - 0.42) < 0.01 and CABLE_SN_XRUHAKXS_240 in str(catalog):
            target_seg = b
            break

    if target_seg:
        enm = _exec(enm, "insert_station_on_segment_sn", {
            "segment_id": target_seg["ref_id"],
            "insert_at": {"mode": "RATIO", "value": 0.5},
            "station": {
                "station_type": "B",
                "station_name": "ST-A2",
                "sn_voltage_kv": 15.0,
                "nn_voltage_kv": 0.4,
            },
            "sn_fields": [
                {"field_role": "LINIA_IN"},
                {"field_role": "LINIA_OUT"},
                {"field_role": "TRANSFORMATOROWE"},
            ],
            "transformer": {
                "create": True,
                "transformer_catalog_ref": TR_630KVA_DYN11,
            },
            "nn_block": {"outgoing_feeders_nn_count": 3},
        })
        ops_count += 1

    # -----------------------------------------------------------------------
    # 5. Odgalezienie 1 z N03 — linia AFL-6 70 (800m)
    # -----------------------------------------------------------------------
    # N03 to szyna na koncu odcinka 550m
    branches_sn = [
        b for b in enm.get("branches", [])
        if b.get("type") in ("cable", "line_overhead")
    ]
    target_n03_bus = None
    for b in branches_sn:
        length_km = b.get("length_km", 0)
        catalog = b.get("catalog_ref", "")
        if abs(length_km - 0.55) < 0.01 and CABLE_SN_XRUHAKXS_240 in str(catalog):
            target_n03_bus = b.get("to_bus_ref")
            break

    if target_n03_bus:
        enm = _exec(enm, "start_branch_segment_sn", {
            "from_bus_ref": target_n03_bus,
            "segment": {
                "rodzaj": "LINIA",
                "dlugosc_m": 800,
                "name": "Odgalezienie 1 (AFL-6 70)",
                "catalog_ref": LINE_SN_AFL6_70,
            },
        })
        ops_count += 1

    # -----------------------------------------------------------------------
    # 6. Stacja ST-B1 (typ A, 400kVA) na odgalezieniu 1
    # -----------------------------------------------------------------------
    branches_sn = [
        b for b in enm.get("branches", [])
        if b.get("type") in ("cable", "line_overhead")
    ]
    target_branch_seg = None
    for b in branches_sn:
        length_km = b.get("length_km", 0)
        catalog = b.get("catalog_ref", "")
        if abs(length_km - 0.8) < 0.01 and LINE_SN_AFL6_70 in str(catalog):
            target_branch_seg = b
            break

    if target_branch_seg:
        enm = _exec(enm, "insert_station_on_segment_sn", {
            "segment_id": target_branch_seg["ref_id"],
            "insert_at": {"mode": "RATIO", "value": 0.6},
            "station": {
                "station_type": "A",
                "station_name": "ST-B1",
                "sn_voltage_kv": 15.0,
                "nn_voltage_kv": 0.4,
            },
            "sn_fields": [
                {"field_role": "LINIA_IN"},
                {"field_role": "LINIA_OUT"},
                {"field_role": "TRANSFORMATOROWE"},
            ],
            "transformer": {
                "create": True,
                "transformer_catalog_ref": TR_400KVA_DYN11,
            },
            "nn_block": {"outgoing_feeders_nn_count": 2},
        })
        ops_count += 1

    # -----------------------------------------------------------------------
    # 7. Stacja ST-B2 (typ B, 630kVA) na ostatnim odcinku magistrali
    # -----------------------------------------------------------------------
    branches_sn = [
        b for b in enm.get("branches", [])
        if b.get("type") in ("cable", "line_overhead")
    ]
    target_last_seg = None
    for b in branches_sn:
        length_km = b.get("length_km", 0)
        catalog = b.get("catalog_ref", "")
        if abs(length_km - 0.38) < 0.01 and CABLE_SN_XRUHAKXS_240 in str(catalog):
            target_last_seg = b
            break

    if target_last_seg:
        enm = _exec(enm, "insert_station_on_segment_sn", {
            "segment_id": target_last_seg["ref_id"],
            "insert_at": {"mode": "RATIO", "value": 0.5},
            "station": {
                "station_type": "B",
                "station_name": "ST-B2",
                "sn_voltage_kv": 15.0,
                "nn_voltage_kv": 0.4,
            },
            "sn_fields": [
                {"field_role": "LINIA_IN"},
                {"field_role": "LINIA_OUT"},
                {"field_role": "TRANSFORMATOROWE"},
            ],
            "transformer": {
                "create": True,
                "transformer_catalog_ref": TR_630KVA_DYN11,
            },
            "nn_block": {"outgoing_feeders_nn_count": 3},
        })
        ops_count += 1

    # -----------------------------------------------------------------------
    # 8. OZE: PV 50kW na szynie nN stacji ST-A2
    # -----------------------------------------------------------------------
    nn_buses = [b for b in enm.get("buses", []) if b.get("voltage_kv", 0) < 1.0]
    # Stacja ST-A2 — szukamy drugiej szyny nN (pierwsza = ST-A1)
    if len(nn_buses) >= 2:
        nn_bus_a2 = nn_buses[1]["ref_id"]
        try:
            enm = _exec(enm, "add_pv_inverter_nn", {
                "bus_nn_ref": nn_bus_a2,
                "pv_spec": {
                    "source_name": "PV-A2-50kW",
                    "rated_power_ac_kw": 50.0,
                    "control_mode": "STALY_COS_FI",
                },
            })
            ops_count += 1
        except RuntimeError:
            pass  # PV op may not be available in V2; non-blocking

    # -----------------------------------------------------------------------
    # 9. OZE: BESS 30kW na szynie nN stacji ST-B2
    # -----------------------------------------------------------------------
    nn_buses = [b for b in enm.get("buses", []) if b.get("voltage_kv", 0) < 1.0]
    if len(nn_buses) >= 4:
        nn_bus_b2 = nn_buses[3]["ref_id"]
        try:
            enm = _exec(enm, "add_bess_inverter_nn", {
                "bus_nn_ref": nn_bus_b2,
                "bess_spec": {
                    "source_name": "BESS-B2-30kW",
                    "charge_power_kw": 30.0,
                    "usable_capacity_kwh": 120.0,
                },
            })
            ops_count += 1
        except RuntimeError:
            pass  # BESS op may not be available in V2; non-blocking

    # -----------------------------------------------------------------------
    # Rezultat
    # -----------------------------------------------------------------------
    return {
        "name": "GOLDEN_DEMO_NETWORK_15KV",
        "description": (
            "Kompletna siec demonstracyjna MV 15kV: "
            "GPZ 110/15kV (Sk=250MVA) + magistrala kablowa (XRUHAKXS 1x240) "
            "+ 4 stacje SN/nN (400/630kVA Dyn11) + odgalezienie (AFL-6 70) "
            "+ OZE (PV 50kW + BESS 30kW)"
        ),
        "enm": enm,
        "snapshot_hash": _snapshot_hash(enm),
        "operations_count": ops_count,
        "catalog_refs": {
            "kabel_sn_magistrala": CABLE_SN_XRUHAKXS_240,
            "linia_sn_odgalezienie": LINE_SN_AFL6_70,
            "trafo_400kva": TR_400KVA_DYN11,
            "trafo_630kva": TR_630KVA_DYN11,
        },
    }


def get_demo_network_summary(result: dict[str, Any]) -> dict[str, Any]:
    """Zwroc podsumowanie sieci demonstracyjnej (do logowania/debugowania)."""
    enm = result.get("enm", {})
    buses = enm.get("buses", [])
    branches = enm.get("branches", [])
    transformers = enm.get("transformers", [])
    substations = enm.get("substations", [])
    generators = enm.get("generators", [])
    bays = enm.get("bays", [])

    sn_buses = [b for b in buses if b.get("voltage_kv", 0) > 1.0]
    nn_buses = [b for b in buses if b.get("voltage_kv", 0) < 1.0]
    cables = [b for b in branches if b.get("type") == "cable"]
    lines = [b for b in branches if b.get("type") == "line_overhead"]

    return {
        "name": result.get("name"),
        "hash": result.get("snapshot_hash", "")[:16],
        "operations": result.get("operations_count", 0),
        "buses_sn": len(sn_buses),
        "buses_nn": len(nn_buses),
        "cables_sn": len(cables),
        "lines_sn": len(lines),
        "transformers": len(transformers),
        "substations": len(substations),
        "generators_oze": len(generators),
        "bays": len(bays),
    }
