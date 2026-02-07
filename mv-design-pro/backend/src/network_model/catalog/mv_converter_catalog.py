"""
Katalog zrodel OZE i magazynow energii SN — dane znamionowe i inwerterowe.

ZRODLA DANYCH:
- Farmy PV: typowe instalacje 0.5-5 MW podlaczane do SN
- Farmy wiatrowe: turbiny 2-4 MW z inwerterami
- BESS: magazyny energii 0.5-5 MW / 1-10 MWh

KONWENCJE:
- un_kv [kV] — napiecie znamionowe stronypodlaczenia do SN
- sn_mva [MVA] — moc pozorna znamionowa inwertera
- pmax_mw [MW] — maksymalna moc czynna
- e_kwh [kWh] — pojemnosc energetyczna (tylko BESS)
- cosphi — zakres regulacji wspolczynnika mocy
"""

from typing import Any


# =============================================================================
# FARMY FOTOWOLTAICZNE (PV)
# =============================================================================

CONVERTER_PV: list[dict[str, Any]] = [
    {
        "id": "conv-pv-0.5mw-15kv",
        "name": "Farma PV 0.5 MW / 15 kV",
        "params": {
            "kind": "PV",
            "un_kv": 15.0,
            "sn_mva": 0.55,
            "pmax_mw": 0.5,
            "qmin_mvar": -0.18,
            "qmax_mvar": 0.18,
            "cosphi_min": 0.9,
            "cosphi_max": 1.0,
            "manufacturer": None,
            "model": "Typowa farma PV 0.5 MW",
        },
    },
    {
        "id": "conv-pv-1mw-15kv",
        "name": "Farma PV 1 MW / 15 kV",
        "params": {
            "kind": "PV",
            "un_kv": 15.0,
            "sn_mva": 1.1,
            "pmax_mw": 1.0,
            "qmin_mvar": -0.36,
            "qmax_mvar": 0.36,
            "cosphi_min": 0.9,
            "cosphi_max": 1.0,
            "manufacturer": None,
            "model": "Typowa farma PV 1 MW",
        },
    },
    {
        "id": "conv-pv-2mw-15kv",
        "name": "Farma PV 2 MW / 15 kV",
        "params": {
            "kind": "PV",
            "un_kv": 15.0,
            "sn_mva": 2.2,
            "pmax_mw": 2.0,
            "qmin_mvar": -0.73,
            "qmax_mvar": 0.73,
            "cosphi_min": 0.9,
            "cosphi_max": 1.0,
            "manufacturer": None,
            "model": "Typowa farma PV 2 MW",
        },
    },
    {
        "id": "conv-pv-5mw-15kv",
        "name": "Farma PV 5 MW / 15 kV",
        "params": {
            "kind": "PV",
            "un_kv": 15.0,
            "sn_mva": 5.5,
            "pmax_mw": 5.0,
            "qmin_mvar": -1.82,
            "qmax_mvar": 1.82,
            "cosphi_min": 0.9,
            "cosphi_max": 1.0,
            "manufacturer": None,
            "model": "Typowa farma PV 5 MW",
        },
    },
]


# =============================================================================
# FARMY WIATROWE (WIND)
# =============================================================================

CONVERTER_WIND: list[dict[str, Any]] = [
    {
        "id": "conv-wind-2mw-15kv",
        "name": "Turbina wiatrowa 2 MW / 15 kV",
        "params": {
            "kind": "WIND",
            "un_kv": 15.0,
            "sn_mva": 2.2,
            "pmax_mw": 2.0,
            "qmin_mvar": -0.73,
            "qmax_mvar": 0.73,
            "cosphi_min": 0.9,
            "cosphi_max": 1.0,
            "manufacturer": "Vestas",
            "model": "V90-2.0",
        },
    },
    {
        "id": "conv-wind-3mw-15kv",
        "name": "Turbina wiatrowa 3 MW / 15 kV",
        "params": {
            "kind": "WIND",
            "un_kv": 15.0,
            "sn_mva": 3.3,
            "pmax_mw": 3.0,
            "qmin_mvar": -1.09,
            "qmax_mvar": 1.09,
            "cosphi_min": 0.9,
            "cosphi_max": 1.0,
            "manufacturer": "Vestas",
            "model": "V112-3.0",
        },
    },
    {
        "id": "conv-wind-4mw-20kv",
        "name": "Turbina wiatrowa 4 MW / 20 kV",
        "params": {
            "kind": "WIND",
            "un_kv": 20.0,
            "sn_mva": 4.4,
            "pmax_mw": 4.0,
            "qmin_mvar": -1.45,
            "qmax_mvar": 1.45,
            "cosphi_min": 0.9,
            "cosphi_max": 1.0,
            "manufacturer": "Siemens Gamesa",
            "model": "SG 4.5-145",
        },
    },
]


# =============================================================================
# MAGAZYNY ENERGII (BESS)
# =============================================================================

CONVERTER_BESS: list[dict[str, Any]] = [
    {
        "id": "conv-bess-0.5mw-1mwh-15kv",
        "name": "BESS 0.5 MW / 1 MWh / 15 kV",
        "params": {
            "kind": "BESS",
            "un_kv": 15.0,
            "sn_mva": 0.55,
            "pmax_mw": 0.5,
            "qmin_mvar": -0.18,
            "qmax_mvar": 0.18,
            "cosphi_min": 0.9,
            "cosphi_max": 1.0,
            "e_kwh": 1000.0,
            "manufacturer": None,
            "model": "Typowy BESS 0.5 MW / 1 MWh",
        },
    },
    {
        "id": "conv-bess-1mw-2mwh-15kv",
        "name": "BESS 1 MW / 2 MWh / 15 kV",
        "params": {
            "kind": "BESS",
            "un_kv": 15.0,
            "sn_mva": 1.1,
            "pmax_mw": 1.0,
            "qmin_mvar": -0.36,
            "qmax_mvar": 0.36,
            "cosphi_min": 0.9,
            "cosphi_max": 1.0,
            "e_kwh": 2000.0,
            "manufacturer": None,
            "model": "Typowy BESS 1 MW / 2 MWh",
        },
    },
    {
        "id": "conv-bess-2mw-4mwh-15kv",
        "name": "BESS 2 MW / 4 MWh / 15 kV",
        "params": {
            "kind": "BESS",
            "un_kv": 15.0,
            "sn_mva": 2.2,
            "pmax_mw": 2.0,
            "qmin_mvar": -0.73,
            "qmax_mvar": 0.73,
            "cosphi_min": 0.9,
            "cosphi_max": 1.0,
            "e_kwh": 4000.0,
            "manufacturer": None,
            "model": "Typowy BESS 2 MW / 4 MWh",
        },
    },
    {
        "id": "conv-bess-5mw-10mwh-15kv",
        "name": "BESS 5 MW / 10 MWh / 15 kV",
        "params": {
            "kind": "BESS",
            "un_kv": 15.0,
            "sn_mva": 5.5,
            "pmax_mw": 5.0,
            "qmin_mvar": -1.82,
            "qmax_mvar": 1.82,
            "cosphi_min": 0.9,
            "cosphi_max": 1.0,
            "e_kwh": 10000.0,
            "manufacturer": None,
            "model": "Typowy BESS 5 MW / 10 MWh",
        },
    },
]


# =============================================================================
# FUNKCJE DOSTEPU
# =============================================================================


def get_all_converter_types() -> list[dict[str, Any]]:
    """Zwraca wszystkie typy zrodel konwerterowych i magazynow energii."""
    return CONVERTER_PV + CONVERTER_WIND + CONVERTER_BESS


def get_pv_types() -> list[dict[str, Any]]:
    """Zwraca typy farm PV."""
    return CONVERTER_PV


def get_wind_types() -> list[dict[str, Any]]:
    """Zwraca typy turbin wiatrowych."""
    return CONVERTER_WIND


def get_bess_types() -> list[dict[str, Any]]:
    """Zwraca typy magazynow energii."""
    return CONVERTER_BESS


def get_converter_catalog_statistics() -> dict[str, Any]:
    """Zwraca statystyki katalogu zrodel konwerterowych."""
    all_types = get_all_converter_types()
    kinds = sorted({t["params"]["kind"] for t in all_types})

    return {
        "liczba_konwerterow_ogolem": len(all_types),
        "liczba_pv": len(CONVERTER_PV),
        "liczba_wiatr": len(CONVERTER_WIND),
        "liczba_bess": len(CONVERTER_BESS),
        "rodzaje": kinds,
    }
