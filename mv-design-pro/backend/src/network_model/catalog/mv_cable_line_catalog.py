"""
Katalog kabli SN i linii napowietrznych — dane elektryczne i cieplne.

ŹRÓDŁA DANYCH:
- Parametry elektryczne: katalogi producentów (NKT, Tele-Fonika), norma IEC 60287
- Parametry cieplne (jth): IEC 60949, PN-EN 60865-1

KONWENCJE:
- R20 [Ω/km] — rezystancja przy 20°C
- X [Ω/km] — reaktancja przy 50 Hz
- C [nF/km] — pojemność międzyfazowa
- jth [A/mm²] — gęstość prądu zwarciowego dla 1s
- Ith [A] — prąd zwarciowy dla 1s (= jth × przekrój)

MATERIAŁY:
- CU — miedź
- AL — aluminium
- AL_ST — aluminium-stal (ACSR/AFL)

IZOLACJE:
- XLPE — polietylen usieciowany (θmax = 90°C, θkz = 250°C)
- EPR — kauczuk etylenowo-propylenowy (θmax = 90°C, θkz = 250°C)
"""

from typing import Any

# =============================================================================
# STAŁE MATERIAŁOWE — gęstość prądu zwarciowego jth dla 1s [A/mm²]
# =============================================================================

JTH_CU_XLPE = 143.0  # Miedź + XLPE (θb=90°C → θk=250°C)
JTH_AL_XLPE = 94.0   # Aluminium + XLPE (θb=90°C → θk=250°C)
JTH_CU_EPR = 143.0   # Miedź + EPR (θb=90°C → θk=250°C)
JTH_AL_EPR = 94.0    # Aluminium + EPR (θb=90°C → θk=250°C)
JTH_AL_OHL = 94.0    # Aluminium linie napowietrzne (AAC)
JTH_AL_ST_OHL = 88.0 # Aluminium-stal linie napowietrzne (ACSR/AFL)


# =============================================================================
# TYPY BAZOWE — KABLE XLPE MIEDZIOWE 1-ŻYŁOWE
# =============================================================================

CABLE_XLPE_CU_1C_BASE: list[dict[str, Any]] = [
    {
        "id": "cable-base-xlpe-cu-1c-70",
        "name": "Kabel XLPE Cu 1×70 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "XLPE",
            "cross_section_mm2": 70,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.268,
            "x_ohm_per_km": 0.123,
            "c_nf_per_km": 220,
            "rated_current_a": 245,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-cu-1c-120",
        "name": "Kabel XLPE Cu 1×120 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "XLPE",
            "cross_section_mm2": 120,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.153,
            "x_ohm_per_km": 0.112,
            "c_nf_per_km": 264,
            "rated_current_a": 340,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-cu-1c-150",
        "name": "Kabel XLPE Cu 1×150 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "XLPE",
            "cross_section_mm2": 150,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.124,
            "x_ohm_per_km": 0.108,
            "c_nf_per_km": 285,
            "rated_current_a": 395,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-cu-1c-185",
        "name": "Kabel XLPE Cu 1×185 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "XLPE",
            "cross_section_mm2": 185,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.099,
            "x_ohm_per_km": 0.104,
            "c_nf_per_km": 305,
            "rated_current_a": 450,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-cu-1c-240",
        "name": "Kabel XLPE Cu 1×240 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "XLPE",
            "cross_section_mm2": 240,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.0754,
            "x_ohm_per_km": 0.099,
            "c_nf_per_km": 340,
            "rated_current_a": 530,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-cu-1c-300",
        "name": "Kabel XLPE Cu 1×300 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "XLPE",
            "cross_section_mm2": 300,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.0601,
            "x_ohm_per_km": 0.095,
            "c_nf_per_km": 375,
            "rated_current_a": 615,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-cu-1c-400",
        "name": "Kabel XLPE Cu 1×400 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "XLPE",
            "cross_section_mm2": 400,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.0470,
            "x_ohm_per_km": 0.091,
            "c_nf_per_km": 420,
            "rated_current_a": 720,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_XLPE,
            "standard": "IEC 60502-2",
        },
    },
]

# =============================================================================
# TYPY BAZOWE — KABLE XLPE ALUMINIOWE 1-ŻYŁOWE
# =============================================================================

CABLE_XLPE_AL_1C_BASE: list[dict[str, Any]] = [
    {
        "id": "cable-base-xlpe-al-1c-70",
        "name": "Kabel XLPE Al 1×70 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 70,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.443,
            "x_ohm_per_km": 0.123,
            "c_nf_per_km": 220,
            "rated_current_a": 190,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-al-1c-120",
        "name": "Kabel XLPE Al 1×120 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 120,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.253,
            "x_ohm_per_km": 0.112,
            "c_nf_per_km": 264,
            "rated_current_a": 265,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-al-1c-150",
        "name": "Kabel XLPE Al 1×150 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 150,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.206,
            "x_ohm_per_km": 0.108,
            "c_nf_per_km": 285,
            "rated_current_a": 305,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-al-1c-185",
        "name": "Kabel XLPE Al 1×185 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 185,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.164,
            "x_ohm_per_km": 0.104,
            "c_nf_per_km": 305,
            "rated_current_a": 350,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-al-1c-240",
        "name": "Kabel XLPE Al 1×240 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 240,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.125,
            "x_ohm_per_km": 0.099,
            "c_nf_per_km": 340,
            "rated_current_a": 410,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-al-1c-300",
        "name": "Kabel XLPE Al 1×300 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 300,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.100,
            "x_ohm_per_km": 0.095,
            "c_nf_per_km": 375,
            "rated_current_a": 475,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-al-1c-400",
        "name": "Kabel XLPE Al 1×400 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 400,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.0778,
            "x_ohm_per_km": 0.091,
            "c_nf_per_km": 420,
            "rated_current_a": 555,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
]

# =============================================================================
# TYPY BAZOWE — KABLE XLPE 3-ŻYŁOWE (Cu i Al)
# =============================================================================

CABLE_XLPE_CU_3C_BASE: list[dict[str, Any]] = [
    {
        "id": "cable-base-xlpe-cu-3c-70",
        "name": "Kabel XLPE Cu 3×70 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "XLPE",
            "cross_section_mm2": 70,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.268,
            "x_ohm_per_km": 0.110,
            "c_nf_per_km": 320,
            "rated_current_a": 215,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-cu-3c-120",
        "name": "Kabel XLPE Cu 3×120 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "XLPE",
            "cross_section_mm2": 120,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.153,
            "x_ohm_per_km": 0.100,
            "c_nf_per_km": 390,
            "rated_current_a": 295,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-cu-3c-150",
        "name": "Kabel XLPE Cu 3×150 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "XLPE",
            "cross_section_mm2": 150,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.124,
            "x_ohm_per_km": 0.095,
            "c_nf_per_km": 420,
            "rated_current_a": 340,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-cu-3c-185",
        "name": "Kabel XLPE Cu 3×185 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "XLPE",
            "cross_section_mm2": 185,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.099,
            "x_ohm_per_km": 0.091,
            "c_nf_per_km": 450,
            "rated_current_a": 390,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-cu-3c-240",
        "name": "Kabel XLPE Cu 3×240 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "XLPE",
            "cross_section_mm2": 240,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.0754,
            "x_ohm_per_km": 0.086,
            "c_nf_per_km": 500,
            "rated_current_a": 455,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-cu-3c-300",
        "name": "Kabel XLPE Cu 3×300 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "XLPE",
            "cross_section_mm2": 300,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.0601,
            "x_ohm_per_km": 0.082,
            "c_nf_per_km": 550,
            "rated_current_a": 520,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_XLPE,
            "standard": "IEC 60502-2",
        },
    },
]

CABLE_XLPE_AL_3C_BASE: list[dict[str, Any]] = [
    {
        "id": "cable-base-xlpe-al-3c-70",
        "name": "Kabel XLPE Al 3×70 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 70,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.443,
            "x_ohm_per_km": 0.110,
            "c_nf_per_km": 320,
            "rated_current_a": 165,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-al-3c-120",
        "name": "Kabel XLPE Al 3×120 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 120,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.253,
            "x_ohm_per_km": 0.100,
            "c_nf_per_km": 390,
            "rated_current_a": 230,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-al-3c-150",
        "name": "Kabel XLPE Al 3×150 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 150,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.206,
            "x_ohm_per_km": 0.095,
            "c_nf_per_km": 420,
            "rated_current_a": 265,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-al-3c-185",
        "name": "Kabel XLPE Al 3×185 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 185,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.164,
            "x_ohm_per_km": 0.091,
            "c_nf_per_km": 450,
            "rated_current_a": 305,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-al-3c-240",
        "name": "Kabel XLPE Al 3×240 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 240,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.125,
            "x_ohm_per_km": 0.086,
            "c_nf_per_km": 500,
            "rated_current_a": 355,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-xlpe-al-3c-300",
        "name": "Kabel XLPE Al 3×300 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 300,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.100,
            "x_ohm_per_km": 0.082,
            "c_nf_per_km": 550,
            "rated_current_a": 405,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
]

# =============================================================================
# TYPY BAZOWE — KABLE EPR (Cu i Al, 1-żyłowe i 3-żyłowe)
# =============================================================================

CABLE_EPR_CU_1C_BASE: list[dict[str, Any]] = [
    {
        "id": "cable-base-epr-cu-1c-70",
        "name": "Kabel EPR Cu 1×70 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "EPR",
            "cross_section_mm2": 70,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.268,
            "x_ohm_per_km": 0.130,
            "c_nf_per_km": 200,
            "rated_current_a": 240,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-cu-1c-120",
        "name": "Kabel EPR Cu 1×120 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "EPR",
            "cross_section_mm2": 120,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.153,
            "x_ohm_per_km": 0.118,
            "c_nf_per_km": 240,
            "rated_current_a": 330,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-cu-1c-150",
        "name": "Kabel EPR Cu 1×150 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "EPR",
            "cross_section_mm2": 150,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.124,
            "x_ohm_per_km": 0.113,
            "c_nf_per_km": 260,
            "rated_current_a": 385,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-cu-1c-185",
        "name": "Kabel EPR Cu 1×185 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "EPR",
            "cross_section_mm2": 185,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.099,
            "x_ohm_per_km": 0.109,
            "c_nf_per_km": 280,
            "rated_current_a": 440,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-cu-1c-240",
        "name": "Kabel EPR Cu 1×240 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "EPR",
            "cross_section_mm2": 240,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.0754,
            "x_ohm_per_km": 0.104,
            "c_nf_per_km": 310,
            "rated_current_a": 515,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_EPR,
            "standard": "IEC 60502-2",
        },
    },
]

CABLE_EPR_AL_1C_BASE: list[dict[str, Any]] = [
    {
        "id": "cable-base-epr-al-1c-70",
        "name": "Kabel EPR Al 1×70 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "EPR",
            "cross_section_mm2": 70,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.443,
            "x_ohm_per_km": 0.130,
            "c_nf_per_km": 200,
            "rated_current_a": 185,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-al-1c-120",
        "name": "Kabel EPR Al 1×120 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "EPR",
            "cross_section_mm2": 120,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.253,
            "x_ohm_per_km": 0.118,
            "c_nf_per_km": 240,
            "rated_current_a": 255,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-al-1c-150",
        "name": "Kabel EPR Al 1×150 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "EPR",
            "cross_section_mm2": 150,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.206,
            "x_ohm_per_km": 0.113,
            "c_nf_per_km": 260,
            "rated_current_a": 295,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-al-1c-185",
        "name": "Kabel EPR Al 1×185 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "EPR",
            "cross_section_mm2": 185,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.164,
            "x_ohm_per_km": 0.109,
            "c_nf_per_km": 280,
            "rated_current_a": 340,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-al-1c-240",
        "name": "Kabel EPR Al 1×240 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "EPR",
            "cross_section_mm2": 240,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.125,
            "x_ohm_per_km": 0.104,
            "c_nf_per_km": 310,
            "rated_current_a": 400,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_EPR,
            "standard": "IEC 60502-2",
        },
    },
]

CABLE_EPR_CU_3C_BASE: list[dict[str, Any]] = [
    {
        "id": "cable-base-epr-cu-3c-70",
        "name": "Kabel EPR Cu 3×70 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "EPR",
            "cross_section_mm2": 70,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.268,
            "x_ohm_per_km": 0.115,
            "c_nf_per_km": 290,
            "rated_current_a": 210,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-cu-3c-120",
        "name": "Kabel EPR Cu 3×120 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "EPR",
            "cross_section_mm2": 120,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.153,
            "x_ohm_per_km": 0.105,
            "c_nf_per_km": 355,
            "rated_current_a": 290,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-cu-3c-150",
        "name": "Kabel EPR Cu 3×150 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "EPR",
            "cross_section_mm2": 150,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.124,
            "x_ohm_per_km": 0.100,
            "c_nf_per_km": 385,
            "rated_current_a": 330,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-cu-3c-185",
        "name": "Kabel EPR Cu 3×185 mm²",
        "params": {
            "conductor_material": "CU",
            "insulation_type": "EPR",
            "cross_section_mm2": 185,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.099,
            "x_ohm_per_km": 0.096,
            "c_nf_per_km": 415,
            "rated_current_a": 380,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_CU_EPR,
            "standard": "IEC 60502-2",
        },
    },
]

CABLE_EPR_AL_3C_BASE: list[dict[str, Any]] = [
    {
        "id": "cable-base-epr-al-3c-70",
        "name": "Kabel EPR Al 3×70 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "EPR",
            "cross_section_mm2": 70,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.443,
            "x_ohm_per_km": 0.115,
            "c_nf_per_km": 290,
            "rated_current_a": 160,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-al-3c-120",
        "name": "Kabel EPR Al 3×120 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "EPR",
            "cross_section_mm2": 120,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.253,
            "x_ohm_per_km": 0.105,
            "c_nf_per_km": 355,
            "rated_current_a": 225,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-al-3c-150",
        "name": "Kabel EPR Al 3×150 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "EPR",
            "cross_section_mm2": 150,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.206,
            "x_ohm_per_km": 0.100,
            "c_nf_per_km": 385,
            "rated_current_a": 260,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_EPR,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-base-epr-al-3c-185",
        "name": "Kabel EPR Al 3×185 mm²",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "EPR",
            "cross_section_mm2": 185,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.164,
            "x_ohm_per_km": 0.096,
            "c_nf_per_km": 415,
            "rated_current_a": 295,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_EPR,
            "standard": "IEC 60502-2",
        },
    },
]

# =============================================================================
# TYPY BAZOWE — LINIE NAPOWIETRZNE AL (AAC)
# =============================================================================

LINE_AL_BASE: list[dict[str, Any]] = [
    {
        "id": "line-base-al-25",
        "name": "Linia Al 25 mm²",
        "params": {
            "conductor_material": "AL",
            "cross_section_mm2": 25,
            "r_ohm_per_km": 1.150,
            "x_ohm_per_km": 0.390,
            "b_us_per_km": 2.65,
            "rated_current_a": 110,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_OHL,
            "standard": "PN-EN 50182",
        },
    },
    {
        "id": "line-base-al-35",
        "name": "Linia Al 35 mm²",
        "params": {
            "conductor_material": "AL",
            "cross_section_mm2": 35,
            "r_ohm_per_km": 0.822,
            "x_ohm_per_km": 0.377,
            "b_us_per_km": 2.75,
            "rated_current_a": 140,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_OHL,
            "standard": "PN-EN 50182",
        },
    },
    {
        "id": "line-base-al-50",
        "name": "Linia Al 50 mm²",
        "params": {
            "conductor_material": "AL",
            "cross_section_mm2": 50,
            "r_ohm_per_km": 0.576,
            "x_ohm_per_km": 0.365,
            "b_us_per_km": 2.85,
            "rated_current_a": 175,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_OHL,
            "standard": "PN-EN 50182",
        },
    },
    {
        "id": "line-base-al-70",
        "name": "Linia Al 70 mm²",
        "params": {
            "conductor_material": "AL",
            "cross_section_mm2": 70,
            "r_ohm_per_km": 0.411,
            "x_ohm_per_km": 0.353,
            "b_us_per_km": 2.95,
            "rated_current_a": 220,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_OHL,
            "standard": "PN-EN 50182",
        },
    },
    {
        "id": "line-base-al-95",
        "name": "Linia Al 95 mm²",
        "params": {
            "conductor_material": "AL",
            "cross_section_mm2": 95,
            "r_ohm_per_km": 0.303,
            "x_ohm_per_km": 0.342,
            "b_us_per_km": 3.05,
            "rated_current_a": 270,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_OHL,
            "standard": "PN-EN 50182",
        },
    },
    {
        "id": "line-base-al-120",
        "name": "Linia Al 120 mm²",
        "params": {
            "conductor_material": "AL",
            "cross_section_mm2": 120,
            "r_ohm_per_km": 0.240,
            "x_ohm_per_km": 0.333,
            "b_us_per_km": 3.15,
            "rated_current_a": 315,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_OHL,
            "standard": "PN-EN 50182",
        },
    },
    {
        "id": "line-base-al-150",
        "name": "Linia Al 150 mm²",
        "params": {
            "conductor_material": "AL",
            "cross_section_mm2": 150,
            "r_ohm_per_km": 0.192,
            "x_ohm_per_km": 0.325,
            "b_us_per_km": 3.25,
            "rated_current_a": 365,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_OHL,
            "standard": "PN-EN 50182",
        },
    },
]

# =============================================================================
# TYPY BAZOWE — LINIE NAPOWIETRZNE AL/ST (ACSR/AFL)
# =============================================================================

LINE_AL_ST_BASE: list[dict[str, Any]] = [
    {
        "id": "line-base-al-st-25",
        "name": "Linia AFL 6 25/4,2 mm²",
        "params": {
            "conductor_material": "AL_ST",
            "cross_section_mm2": 25,
            "r_ohm_per_km": 1.146,
            "x_ohm_per_km": 0.395,
            "b_us_per_km": 2.60,
            "rated_current_a": 115,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_ST_OHL,
            "standard": "PN-EN 50182",
        },
    },
    {
        "id": "line-base-al-st-35",
        "name": "Linia AFL 6 35/6,0 mm²",
        "params": {
            "conductor_material": "AL_ST",
            "cross_section_mm2": 35,
            "r_ohm_per_km": 0.814,
            "x_ohm_per_km": 0.380,
            "b_us_per_km": 2.70,
            "rated_current_a": 145,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_ST_OHL,
            "standard": "PN-EN 50182",
        },
    },
    {
        "id": "line-base-al-st-50",
        "name": "Linia AFL 6 50/8,0 mm²",
        "params": {
            "conductor_material": "AL_ST",
            "cross_section_mm2": 50,
            "r_ohm_per_km": 0.572,
            "x_ohm_per_km": 0.368,
            "b_us_per_km": 2.80,
            "rated_current_a": 185,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_ST_OHL,
            "standard": "PN-EN 50182",
        },
    },
    {
        "id": "line-base-al-st-70",
        "name": "Linia AFL 6 70/11,0 mm²",
        "params": {
            "conductor_material": "AL_ST",
            "cross_section_mm2": 70,
            "r_ohm_per_km": 0.408,
            "x_ohm_per_km": 0.355,
            "b_us_per_km": 2.90,
            "rated_current_a": 230,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_ST_OHL,
            "standard": "PN-EN 50182",
        },
    },
    {
        "id": "line-base-al-st-95",
        "name": "Linia AFL 6 95/16,0 mm²",
        "params": {
            "conductor_material": "AL_ST",
            "cross_section_mm2": 95,
            "r_ohm_per_km": 0.299,
            "x_ohm_per_km": 0.344,
            "b_us_per_km": 3.00,
            "rated_current_a": 280,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_ST_OHL,
            "standard": "PN-EN 50182",
        },
    },
    {
        "id": "line-base-al-st-120",
        "name": "Linia AFL 6 120/20,0 mm²",
        "params": {
            "conductor_material": "AL_ST",
            "cross_section_mm2": 120,
            "r_ohm_per_km": 0.236,
            "x_ohm_per_km": 0.335,
            "b_us_per_km": 3.10,
            "rated_current_a": 330,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_ST_OHL,
            "standard": "PN-EN 50182",
        },
    },
    {
        "id": "line-base-al-st-150",
        "name": "Linia AFL 8 150/25,0 mm²",
        "params": {
            "conductor_material": "AL_ST",
            "cross_section_mm2": 150,
            "r_ohm_per_km": 0.189,
            "x_ohm_per_km": 0.327,
            "b_us_per_km": 3.20,
            "rated_current_a": 380,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            "jth_1s_a_per_mm2": JTH_AL_ST_OHL,
            "standard": "PN-EN 50182",
        },
    },
]

# =============================================================================
# TYPY PRODUCENTÓW — NKT
# =============================================================================

CABLE_NKT_TYPES: list[dict[str, Any]] = [
    {
        "id": "cable-nkt-n2xs2y-1x150",
        "name": "NKT N2XS2Y 1×150/25 mm² 12/20 kV",
        "params": {
            "manufacturer": "NKT",
            "trade_name": "N2XS2Y 1x150/25",
            "base_type_id": "cable-base-xlpe-al-1c-150",
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 150,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.206,
            "x_ohm_per_km": 0.107,
            "c_nf_per_km": 290,
            "rated_current_a": 310,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-nkt-n2xs2y-1x240",
        "name": "NKT N2XS2Y 1×240/25 mm² 12/20 kV",
        "params": {
            "manufacturer": "NKT",
            "trade_name": "N2XS2Y 1x240/25",
            "base_type_id": "cable-base-xlpe-al-1c-240",
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 240,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.125,
            "x_ohm_per_km": 0.098,
            "c_nf_per_km": 345,
            "rated_current_a": 420,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-nkt-na2xs2y-3x150",
        "name": "NKT NA2XS2Y 3×150/25 mm² 12/20 kV",
        "params": {
            "manufacturer": "NKT",
            "trade_name": "NA2XS2Y 3x150/25",
            "base_type_id": "cable-base-xlpe-al-3c-150",
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 150,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.206,
            "x_ohm_per_km": 0.094,
            "c_nf_per_km": 425,
            "rated_current_a": 270,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
]

# =============================================================================
# TYPY PRODUCENTÓW — TELE-FONIKA KABLE
# =============================================================================

CABLE_TELEFONIKA_TYPES: list[dict[str, Any]] = [
    {
        "id": "cable-tfk-xruhakxs-1x150",
        "name": "TFK XRUHAKXS 1×150/25 mm² 12/20 kV",
        "params": {
            "manufacturer": "Tele-Fonika Kable",
            "trade_name": "XRUHAKXS 1x150/25",
            "base_type_id": "cable-base-xlpe-al-1c-150",
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 150,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.206,
            "x_ohm_per_km": 0.108,
            "c_nf_per_km": 285,
            "rated_current_a": 305,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-tfk-xruhakxs-1x240",
        "name": "TFK XRUHAKXS 1×240/25 mm² 12/20 kV",
        "params": {
            "manufacturer": "Tele-Fonika Kable",
            "trade_name": "XRUHAKXS 1x240/25",
            "base_type_id": "cable-base-xlpe-al-1c-240",
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 240,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.125,
            "x_ohm_per_km": 0.099,
            "c_nf_per_km": 340,
            "rated_current_a": 410,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
    {
        "id": "cable-tfk-yakxs-3x120",
        "name": "TFK YAKXS 3×120/16 mm² 12/20 kV",
        "params": {
            "manufacturer": "Tele-Fonika Kable",
            "trade_name": "YAKXS 3x120/16",
            "base_type_id": "cable-base-xlpe-al-3c-120",
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 120,
            "number_of_cores": 3,
            "r_ohm_per_km": 0.253,
            "x_ohm_per_km": 0.100,
            "c_nf_per_km": 390,
            "rated_current_a": 230,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            "jth_1s_a_per_mm2": JTH_AL_XLPE,
            "standard": "IEC 60502-2",
        },
    },
]

# =============================================================================
# TYP NIEKOMPLETNY — do testów (brak danych cieplnych)
# =============================================================================

CABLE_INCOMPLETE_TYPES: list[dict[str, Any]] = [
    {
        "id": "cable-incomplete-test",
        "name": "Kabel testowy (niekompletne dane cieplne)",
        "params": {
            "conductor_material": "AL",
            "insulation_type": "XLPE",
            "cross_section_mm2": 120,
            "number_of_cores": 1,
            "r_ohm_per_km": 0.253,
            "x_ohm_per_km": 0.112,
            "c_nf_per_km": 264,
            "rated_current_a": 265,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 90,
            # BRAK: ith_1s_a i jth_1s_a_per_mm2 — niekompletne dane cieplne
            "standard": "TEST",
        },
    },
]

LINE_INCOMPLETE_TYPES: list[dict[str, Any]] = [
    {
        "id": "line-incomplete-test",
        "name": "Linia testowa (niekompletne dane cieplne)",
        "params": {
            "conductor_material": "AL",
            "cross_section_mm2": 70,
            "r_ohm_per_km": 0.411,
            "x_ohm_per_km": 0.353,
            "b_us_per_km": 2.95,
            "rated_current_a": 220,
            "voltage_rating_kv": 20.0,
            "max_temperature_c": 70,
            # BRAK: ith_1s_a i jth_1s_a_per_mm2 — niekompletne dane cieplne
            "standard": "TEST",
        },
    },
]

# =============================================================================
# AGREGACJA — wszystkie typy kabli
# =============================================================================


def get_all_cable_types() -> list[dict[str, Any]]:
    """
    Zwraca wszystkie typy kabli SN w deterministycznej kolejności.

    Kolejność: bazowe XLPE Cu 1C, bazowe XLPE Al 1C, bazowe XLPE Cu 3C,
    bazowe XLPE Al 3C, bazowe EPR Cu 1C, bazowe EPR Al 1C,
    bazowe EPR Cu 3C, bazowe EPR Al 3C, producenci, niekompletne.
    """
    return (
        CABLE_XLPE_CU_1C_BASE
        + CABLE_XLPE_AL_1C_BASE
        + CABLE_XLPE_CU_3C_BASE
        + CABLE_XLPE_AL_3C_BASE
        + CABLE_EPR_CU_1C_BASE
        + CABLE_EPR_AL_1C_BASE
        + CABLE_EPR_CU_3C_BASE
        + CABLE_EPR_AL_3C_BASE
        + CABLE_NKT_TYPES
        + CABLE_TELEFONIKA_TYPES
        + CABLE_INCOMPLETE_TYPES
    )


def get_all_line_types() -> list[dict[str, Any]]:
    """
    Zwraca wszystkie typy linii napowietrznych SN w deterministycznej kolejności.

    Kolejność: bazowe Al, bazowe Al/St, niekompletne.
    """
    return LINE_AL_BASE + LINE_AL_ST_BASE + LINE_INCOMPLETE_TYPES


def get_base_cable_type_ids() -> list[str]:
    """Zwraca ID wszystkich bazowych typów kabli."""
    base_lists = [
        CABLE_XLPE_CU_1C_BASE,
        CABLE_XLPE_AL_1C_BASE,
        CABLE_XLPE_CU_3C_BASE,
        CABLE_XLPE_AL_3C_BASE,
        CABLE_EPR_CU_1C_BASE,
        CABLE_EPR_AL_1C_BASE,
        CABLE_EPR_CU_3C_BASE,
        CABLE_EPR_AL_3C_BASE,
    ]
    return [t["id"] for lst in base_lists for t in lst]


def get_base_line_type_ids() -> list[str]:
    """Zwraca ID wszystkich bazowych typów linii."""
    return [t["id"] for t in LINE_AL_BASE + LINE_AL_ST_BASE]


def get_manufacturer_cable_type_ids() -> list[str]:
    """Zwraca ID wszystkich typów kabli producentów."""
    return [t["id"] for t in CABLE_NKT_TYPES + CABLE_TELEFONIKA_TYPES]


# =============================================================================
# STATYSTYKI KATALOGU
# =============================================================================


def get_catalog_statistics() -> dict[str, Any]:
    """Zwraca statystyki katalogu kabli i linii SN."""
    all_cables = get_all_cable_types()
    all_lines = get_all_line_types()

    base_cable_ids = set(get_base_cable_type_ids())
    manufacturer_cable_ids = set(get_manufacturer_cable_type_ids())
    incomplete_cable_ids = {t["id"] for t in CABLE_INCOMPLETE_TYPES}
    incomplete_line_ids = {t["id"] for t in LINE_INCOMPLETE_TYPES}

    return {
        "liczba_kabli_ogolem": len(all_cables),
        "liczba_kabli_bazowych": len(base_cable_ids),
        "liczba_kabli_producentow": len(manufacturer_cable_ids),
        "liczba_kabli_niekompletnych": len(incomplete_cable_ids),
        "liczba_linii_ogolem": len(all_lines),
        "liczba_linii_bazowych": len(get_base_line_type_ids()),
        "liczba_linii_niekompletnych": len(incomplete_line_ids),
        "producenci_kabli": ["NKT", "Tele-Fonika Kable"],
        "materialy_przewodu": ["CU", "AL", "AL_ST"],
        "izolacje_kabli": ["XLPE", "EPR"],
        "przekroje_kabli_mm2": [70, 120, 150, 185, 240, 300, 400],
        "przekroje_linii_mm2": [25, 35, 50, 70, 95, 120, 150],
    }
