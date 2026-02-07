"""
Katalog aparatury laczeniowej SN — dane znamionowe i laczeniowe.

ZRODLA DANYCH:
- Wylaczniki: katalogi ABB, Siemens, Eaton
- Rozlaczniki: katalogi ABB, Schneider Electric
- Odlaczniki: katalogi typowe
- Reklozery: katalogi ABB, Schneider NOJA

KONWENCJE:
- un_kv [kV] — znamionowe napiecie pracy
- in_a [A] — prad znamionowy ciaglej pracy
- ik_ka [kA] — znamionowy prad zwarciowy laczeniowy (wylaczniki)
- icw_ka [kA] — prad wytrzymywany krotkotrwale 1s (rozlaczniki, odlaczniki)
- medium — srodek gaszacy (SF6, VACUUM, AIR)

TYPY APARATURY:
- CIRCUIT_BREAKER — wylacznik (zwarcia i obciazeniowy)
- DISCONNECTOR — odlacznik (bez obciazenia)
- LOAD_SWITCH — rozlacznik (obciazeniowy, bez zwarciowy)
- FUSE — bezpiecznik topikowy
- RECLOSER — reklozer (automatyczne ponowne zalaczenie)
- EARTH_SWITCH — uziemnik
"""

from typing import Any


# =============================================================================
# WYLACZNIKI SN (CIRCUIT_BREAKER) — prozniowe i SF6
# =============================================================================

SWITCH_CIRCUIT_BREAKERS: list[dict[str, Any]] = [
    {
        "id": "sw-cb-abb-vd4-12kv-630a",
        "name": "ABB VD4 12 kV 630 A",
        "params": {
            "equipment_kind": "CIRCUIT_BREAKER",
            "manufacturer": "ABB",
            "un_kv": 12.0,
            "in_a": 630.0,
            "ik_ka": 20.0,
            "icw_ka": 20.0,
            "medium": "VACUUM",
        },
    },
    {
        "id": "sw-cb-abb-vd4-12kv-1250a",
        "name": "ABB VD4 12 kV 1250 A",
        "params": {
            "equipment_kind": "CIRCUIT_BREAKER",
            "manufacturer": "ABB",
            "un_kv": 12.0,
            "in_a": 1250.0,
            "ik_ka": 25.0,
            "icw_ka": 25.0,
            "medium": "VACUUM",
        },
    },
    {
        "id": "sw-cb-abb-vd4-17kv-630a",
        "name": "ABB VD4 17.5 kV 630 A",
        "params": {
            "equipment_kind": "CIRCUIT_BREAKER",
            "manufacturer": "ABB",
            "un_kv": 17.5,
            "in_a": 630.0,
            "ik_ka": 20.0,
            "icw_ka": 20.0,
            "medium": "VACUUM",
        },
    },
    {
        "id": "sw-cb-abb-vd4-17kv-1250a",
        "name": "ABB VD4 17.5 kV 1250 A",
        "params": {
            "equipment_kind": "CIRCUIT_BREAKER",
            "manufacturer": "ABB",
            "un_kv": 17.5,
            "in_a": 1250.0,
            "ik_ka": 25.0,
            "icw_ka": 25.0,
            "medium": "VACUUM",
        },
    },
    {
        "id": "sw-cb-siemens-3ah5-12kv-630a",
        "name": "Siemens 3AH5 12 kV 630 A",
        "params": {
            "equipment_kind": "CIRCUIT_BREAKER",
            "manufacturer": "Siemens",
            "un_kv": 12.0,
            "in_a": 630.0,
            "ik_ka": 25.0,
            "icw_ka": 25.0,
            "medium": "VACUUM",
        },
    },
    {
        "id": "sw-cb-siemens-3ah5-17kv-1250a",
        "name": "Siemens 3AH5 17.5 kV 1250 A",
        "params": {
            "equipment_kind": "CIRCUIT_BREAKER",
            "manufacturer": "Siemens",
            "un_kv": 17.5,
            "in_a": 1250.0,
            "ik_ka": 25.0,
            "icw_ka": 25.0,
            "medium": "VACUUM",
        },
    },
    {
        "id": "sw-cb-eaton-w-vaci-12kv-630a",
        "name": "Eaton W-VACi 12 kV 630 A",
        "params": {
            "equipment_kind": "CIRCUIT_BREAKER",
            "manufacturer": "Eaton",
            "un_kv": 12.0,
            "in_a": 630.0,
            "ik_ka": 20.0,
            "icw_ka": 20.0,
            "medium": "VACUUM",
        },
    },
]


# =============================================================================
# ROZLACZNIKI SN (LOAD_SWITCH)
# =============================================================================

SWITCH_LOAD_SWITCHES: list[dict[str, Any]] = [
    {
        "id": "sw-ls-abb-naa-12kv-400a",
        "name": "ABB NAL 12 kV 400 A",
        "params": {
            "equipment_kind": "LOAD_SWITCH",
            "manufacturer": "ABB",
            "un_kv": 12.0,
            "in_a": 400.0,
            "ik_ka": 0.0,
            "icw_ka": 16.0,
            "medium": "SF6",
        },
    },
    {
        "id": "sw-ls-abb-naa-12kv-630a",
        "name": "ABB NAL 12 kV 630 A",
        "params": {
            "equipment_kind": "LOAD_SWITCH",
            "manufacturer": "ABB",
            "un_kv": 12.0,
            "in_a": 630.0,
            "ik_ka": 0.0,
            "icw_ka": 20.0,
            "medium": "SF6",
        },
    },
    {
        "id": "sw-ls-schneider-rm6-12kv-630a",
        "name": "Schneider RM6 12 kV 630 A",
        "params": {
            "equipment_kind": "LOAD_SWITCH",
            "manufacturer": "Schneider Electric",
            "un_kv": 12.0,
            "in_a": 630.0,
            "ik_ka": 0.0,
            "icw_ka": 20.0,
            "medium": "SF6",
        },
    },
    {
        "id": "sw-ls-schneider-rm6-17kv-400a",
        "name": "Schneider RM6 17.5 kV 400 A",
        "params": {
            "equipment_kind": "LOAD_SWITCH",
            "manufacturer": "Schneider Electric",
            "un_kv": 17.5,
            "in_a": 400.0,
            "ik_ka": 0.0,
            "icw_ka": 16.0,
            "medium": "SF6",
        },
    },
]


# =============================================================================
# ODLACZNIKI SN (DISCONNECTOR)
# =============================================================================

SWITCH_DISCONNECTORS: list[dict[str, Any]] = [
    {
        "id": "sw-ds-abb-ojs-12kv-630a",
        "name": "ABB OJS 12 kV 630 A",
        "params": {
            "equipment_kind": "DISCONNECTOR",
            "manufacturer": "ABB",
            "un_kv": 12.0,
            "in_a": 630.0,
            "ik_ka": 0.0,
            "icw_ka": 20.0,
            "medium": "AIR",
        },
    },
    {
        "id": "sw-ds-abb-ojs-17kv-630a",
        "name": "ABB OJS 17.5 kV 630 A",
        "params": {
            "equipment_kind": "DISCONNECTOR",
            "manufacturer": "ABB",
            "un_kv": 17.5,
            "in_a": 630.0,
            "ik_ka": 0.0,
            "icw_ka": 20.0,
            "medium": "AIR",
        },
    },
    {
        "id": "sw-ds-generic-slupowy-17kv-400a",
        "name": "Odlacznik slupowy 17.5 kV 400 A",
        "params": {
            "equipment_kind": "DISCONNECTOR",
            "manufacturer": None,
            "un_kv": 17.5,
            "in_a": 400.0,
            "ik_ka": 0.0,
            "icw_ka": 12.5,
            "medium": "AIR",
        },
    },
]


# =============================================================================
# REKLOZERY SN (RECLOSER)
# =============================================================================

SWITCH_RECLOSERS: list[dict[str, Any]] = [
    {
        "id": "sw-rec-abb-rec615-17kv-630a",
        "name": "ABB REC615 17.5 kV 630 A",
        "params": {
            "equipment_kind": "RECLOSER",
            "manufacturer": "ABB",
            "un_kv": 17.5,
            "in_a": 630.0,
            "ik_ka": 12.5,
            "icw_ka": 12.5,
            "medium": "VACUUM",
        },
    },
    {
        "id": "sw-rec-noja-osp-15kv-630a",
        "name": "NOJA Power OSP 15 kV 630 A",
        "params": {
            "equipment_kind": "RECLOSER",
            "manufacturer": "NOJA Power",
            "un_kv": 15.0,
            "in_a": 630.0,
            "ik_ka": 12.5,
            "icw_ka": 12.5,
            "medium": "VACUUM",
        },
    },
    {
        "id": "sw-rec-schneider-u20-17kv-400a",
        "name": "Schneider ADVC U20 17.5 kV 400 A",
        "params": {
            "equipment_kind": "RECLOSER",
            "manufacturer": "Schneider Electric",
            "un_kv": 17.5,
            "in_a": 400.0,
            "ik_ka": 8.0,
            "icw_ka": 8.0,
            "medium": "VACUUM",
        },
    },
]


# =============================================================================
# BEZPIECZNIKI SN (FUSE)
# =============================================================================

SWITCH_FUSES: list[dict[str, Any]] = [
    {
        "id": "sw-fuse-eti-vv-12kv-63a",
        "name": "ETI VV 12 kV 63 A",
        "params": {
            "equipment_kind": "FUSE",
            "manufacturer": "ETI",
            "un_kv": 12.0,
            "in_a": 63.0,
            "ik_ka": 31.5,
            "icw_ka": 0.0,
            "medium": None,
        },
    },
    {
        "id": "sw-fuse-eti-vv-12kv-100a",
        "name": "ETI VV 12 kV 100 A",
        "params": {
            "equipment_kind": "FUSE",
            "manufacturer": "ETI",
            "un_kv": 12.0,
            "in_a": 100.0,
            "ik_ka": 31.5,
            "icw_ka": 0.0,
            "medium": None,
        },
    },
    {
        "id": "sw-fuse-eti-vv-17kv-63a",
        "name": "ETI VV 17.5 kV 63 A",
        "params": {
            "equipment_kind": "FUSE",
            "manufacturer": "ETI",
            "un_kv": 17.5,
            "in_a": 63.0,
            "ik_ka": 31.5,
            "icw_ka": 0.0,
            "medium": None,
        },
    },
]


# =============================================================================
# UZIEMNIKI SN (EARTH_SWITCH)
# =============================================================================

SWITCH_EARTH_SWITCHES: list[dict[str, Any]] = [
    {
        "id": "sw-es-generic-12kv",
        "name": "Uziemnik 12 kV",
        "params": {
            "equipment_kind": "EARTH_SWITCH",
            "manufacturer": None,
            "un_kv": 12.0,
            "in_a": 0.0,
            "ik_ka": 0.0,
            "icw_ka": 20.0,
            "medium": None,
        },
    },
    {
        "id": "sw-es-generic-17kv",
        "name": "Uziemnik 17.5 kV",
        "params": {
            "equipment_kind": "EARTH_SWITCH",
            "manufacturer": None,
            "un_kv": 17.5,
            "in_a": 0.0,
            "ik_ka": 0.0,
            "icw_ka": 20.0,
            "medium": None,
        },
    },
]


# =============================================================================
# FUNKCJE DOSTEPU
# =============================================================================


def get_all_switch_equipment_types() -> list[dict[str, Any]]:
    """Zwraca wszystkie typy aparatury laczeniowej w katalogu."""
    return (
        SWITCH_CIRCUIT_BREAKERS
        + SWITCH_LOAD_SWITCHES
        + SWITCH_DISCONNECTORS
        + SWITCH_RECLOSERS
        + SWITCH_FUSES
        + SWITCH_EARTH_SWITCHES
    )


def get_circuit_breakers() -> list[dict[str, Any]]:
    """Zwraca wylaczniki."""
    return SWITCH_CIRCUIT_BREAKERS


def get_reclosers() -> list[dict[str, Any]]:
    """Zwraca reklozery."""
    return SWITCH_RECLOSERS


def get_switch_catalog_statistics() -> dict[str, Any]:
    """Zwraca statystyki katalogu aparatury laczeniowej."""
    all_types = get_all_switch_equipment_types()
    kinds = sorted({t["params"]["equipment_kind"] for t in all_types})
    manufacturers = sorted(
        {t["params"]["manufacturer"] for t in all_types if t["params"].get("manufacturer")}
    )

    return {
        "liczba_aparatury_ogolem": len(all_types),
        "liczba_wylacznikow": len(SWITCH_CIRCUIT_BREAKERS),
        "liczba_rozlacznikow": len(SWITCH_LOAD_SWITCHES),
        "liczba_odlacznikow": len(SWITCH_DISCONNECTORS),
        "liczba_reklozerow": len(SWITCH_RECLOSERS),
        "liczba_bezpiecznikow": len(SWITCH_FUSES),
        "liczba_uziemnikow": len(SWITCH_EARTH_SWITCHES),
        "rodzaje": kinds,
        "producenci": manufacturers,
    }
