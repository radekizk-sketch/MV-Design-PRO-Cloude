from __future__ import annotations


def get_all_lv_cable_types() -> list[dict]:
    """
    Katalog kabli niskiego napięcia (nN) 0.6/1 kV.

    Rodziny:
    - YAKY (Al, 4-żyłowy, PVC, 0.6/1 kV): przekroje 16-240 mm²
    - YKY (Cu, 4/5-żyłowy, PVC, 0.6/1 kV): przekroje 35-120 mm²
    - YKXS (Cu, 4-żyłowy, XLPE, 0.6/1 kV): przekroje 35-70 mm²

    Źródło: Tele-Fonika Kable / NKT / norma IEC 60502-1 / dane referencyjne.
    """
    return [
        # -----------------------------------------------------------------------
        # YAKY — aluminium, 4-żyłowy, izolacja PVC, 0.6/1 kV
        # -----------------------------------------------------------------------
        {
            "id": "kab_nn_yaky_4x16_al",
            "name": "YAKY 4x16 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 1.910,
                "x_ohm_per_km": 0.077,
                "i_max_a": 85.0,
                "conductor_material": "AL",
                "insulation_type": "PVC",
                "cross_section_mm2": 16.0,
                "number_of_cores": 4,
                "manufacturer": "Tele-Fonika Kable",
                "source_reference": "Tele-Fonika Kable / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_yaky_4x25_al",
            "name": "YAKY 4x25 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 1.200,
                "x_ohm_per_km": 0.075,
                "i_max_a": 110.0,
                "conductor_material": "AL",
                "insulation_type": "PVC",
                "cross_section_mm2": 25.0,
                "number_of_cores": 4,
                "manufacturer": "Tele-Fonika Kable",
                "source_reference": "Tele-Fonika Kable / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_yaky_4x35_al",
            "name": "YAKY 4x35 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.868,
                "x_ohm_per_km": 0.073,
                "i_max_a": 135.0,
                "conductor_material": "AL",
                "insulation_type": "PVC",
                "cross_section_mm2": 35.0,
                "number_of_cores": 4,
                "manufacturer": "Tele-Fonika Kable",
                "source_reference": "Tele-Fonika Kable / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_yaky_4x50_al",
            "name": "YAKY 4x50 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.641,
                "x_ohm_per_km": 0.072,
                "i_max_a": 160.0,
                "conductor_material": "AL",
                "insulation_type": "PVC",
                "cross_section_mm2": 50.0,
                "number_of_cores": 4,
                "manufacturer": "Tele-Fonika Kable",
                "source_reference": "Tele-Fonika Kable / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_4x70_al",
            "name": "YAKY 4x70 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.443,
                "x_ohm_per_km": 0.072,
                "i_max_a": 180.0,
                "conductor_material": "AL",
                "insulation_type": "PVC",
                "cross_section_mm2": 70.0,
                "number_of_cores": 4,
                "manufacturer": "Tele-Fonika",
                "source_reference": "Tele-Fonika Kable / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_yaky_4x95_al",
            "name": "YAKY 4x95 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.320,
                "x_ohm_per_km": 0.070,
                "i_max_a": 215.0,
                "conductor_material": "AL",
                "insulation_type": "PVC",
                "cross_section_mm2": 95.0,
                "number_of_cores": 4,
                "manufacturer": "Tele-Fonika Kable",
                "source_reference": "Tele-Fonika Kable / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_4x120_al",
            "name": "YAKY 4x120 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.253,
                "x_ohm_per_km": 0.069,
                "i_max_a": 240.0,
                "conductor_material": "AL",
                "insulation_type": "PVC",
                "cross_section_mm2": 120.0,
                "number_of_cores": 4,
                "manufacturer": "Tele-Fonika",
                "source_reference": "Tele-Fonika Kable / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_yaky_4x150_al",
            "name": "YAKY 4x150 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.206,
                "x_ohm_per_km": 0.068,
                "i_max_a": 275.0,
                "conductor_material": "AL",
                "insulation_type": "PVC",
                "cross_section_mm2": 150.0,
                "number_of_cores": 4,
                "manufacturer": "Tele-Fonika Kable",
                "source_reference": "Tele-Fonika Kable / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_yaky_4x185_al",
            "name": "YAKY 4x185 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.164,
                "x_ohm_per_km": 0.067,
                "i_max_a": 315.0,
                "conductor_material": "AL",
                "insulation_type": "PVC",
                "cross_section_mm2": 185.0,
                "number_of_cores": 4,
                "manufacturer": "Tele-Fonika Kable",
                "source_reference": "Tele-Fonika Kable / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_yaky_4x240_al",
            "name": "YAKY 4x240 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.125,
                "x_ohm_per_km": 0.066,
                "i_max_a": 360.0,
                "conductor_material": "AL",
                "insulation_type": "PVC",
                "cross_section_mm2": 240.0,
                "number_of_cores": 4,
                "manufacturer": "Tele-Fonika Kable",
                "source_reference": "Tele-Fonika Kable / IEC 60502-1 / dane referencyjne",
            },
        },
        # -----------------------------------------------------------------------
        # YKY — miedź, 4/5-żyłowy, izolacja PVC, 0.6/1 kV
        # -----------------------------------------------------------------------
        {
            "id": "kab_nn_5x35_cu",
            "name": "YKY 5x35 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.524,
                "x_ohm_per_km": 0.082,
                "i_max_a": 125.0,
                "conductor_material": "CU",
                "insulation_type": "PVC",
                "cross_section_mm2": 35.0,
                "number_of_cores": 5,
                "manufacturer": "NKT",
                "source_reference": "NKT Cables / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_yky_4x50_cu",
            "name": "YKY 4x50 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.387,
                "x_ohm_per_km": 0.079,
                "i_max_a": 160.0,
                "conductor_material": "CU",
                "insulation_type": "PVC",
                "cross_section_mm2": 50.0,
                "number_of_cores": 4,
                "manufacturer": "NKT",
                "source_reference": "NKT Cables / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_yky_4x70_cu",
            "name": "YKY 4x70 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.268,
                "x_ohm_per_km": 0.076,
                "i_max_a": 200.0,
                "conductor_material": "CU",
                "insulation_type": "PVC",
                "cross_section_mm2": 70.0,
                "number_of_cores": 4,
                "manufacturer": "NKT",
                "source_reference": "NKT Cables / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_yky_4x95_cu",
            "name": "YKY 4x95 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.193,
                "x_ohm_per_km": 0.074,
                "i_max_a": 240.0,
                "conductor_material": "CU",
                "insulation_type": "PVC",
                "cross_section_mm2": 95.0,
                "number_of_cores": 4,
                "manufacturer": "NKT",
                "source_reference": "NKT Cables / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_yky_4x120_cu",
            "name": "YKY 4x120 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.153,
                "x_ohm_per_km": 0.073,
                "i_max_a": 275.0,
                "conductor_material": "CU",
                "insulation_type": "PVC",
                "cross_section_mm2": 120.0,
                "number_of_cores": 4,
                "manufacturer": "NKT",
                "source_reference": "NKT Cables / IEC 60502-1 / dane referencyjne",
            },
        },
        # -----------------------------------------------------------------------
        # YKXS — miedź, 4-żyłowy, izolacja XLPE, 0.6/1 kV (lepsza obciążalność)
        # -----------------------------------------------------------------------
        {
            "id": "kab_nn_ykxs_4x35_cu",
            "name": "YKXS 4x35 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.524,
                "x_ohm_per_km": 0.078,
                "i_max_a": 145.0,
                "conductor_material": "CU",
                "insulation_type": "XLPE",
                "cross_section_mm2": 35.0,
                "number_of_cores": 4,
                "manufacturer": "Tele-Fonika Kable",
                "source_reference": "Tele-Fonika Kable / IEC 60502-1 / dane referencyjne",
            },
        },
        {
            "id": "kab_nn_ykxs_4x70_cu",
            "name": "YKXS 4x70 mm²",
            "params": {
                "u_n_kv": 0.4,
                "r_ohm_per_km": 0.268,
                "x_ohm_per_km": 0.072,
                "i_max_a": 225.0,
                "conductor_material": "CU",
                "insulation_type": "XLPE",
                "cross_section_mm2": 70.0,
                "number_of_cores": 4,
                "manufacturer": "Tele-Fonika Kable",
                "source_reference": "Tele-Fonika Kable / IEC 60502-1 / dane referencyjne",
            },
        },
    ]


def get_all_load_types() -> list[dict]:
    return [
        {
            "id": "load_mieszk_15kw",
            "name": "Obciazenie mieszkaniowe 15 kW",
            "params": {
                "model": "PQ",
                "p_kw": 15.0,
                "cos_phi": 0.95,
                "cos_phi_mode": "IND",
                "manufacturer": "Profil standardowy",
            },
        },
        {
            "id": "load_uslugi_30kw",
            "name": "Obciazenie uslugowe 30 kW",
            "params": {
                "model": "PQ",
                "p_kw": 30.0,
                "cos_phi": 0.92,
                "cos_phi_mode": "IND",
                "manufacturer": "Profil standardowy",
            },
        },
        {
            "id": "load_przem_75kw",
            "name": "Obciazenie przemyslowe 75 kW",
            "params": {
                "model": "PQ",
                "p_kw": 75.0,
                "q_kvar": 28.0,
                "cos_phi": 0.94,
                "cos_phi_mode": "IND",
                "manufacturer": "Profil standardowy",
            },
        },
    ]


def get_all_lv_apparatus_types() -> list[dict]:
    return [
        {
            "id": "cb_nn_1000a",
            "name": "Wylacznik glowny nN 1000 A",
            "params": {
                "device_kind": "WYLACZNIK_GLOWNY",
                "u_n_kv": 0.4,
                "i_n_a": 1000.0,
                "breaking_capacity_ka": 50.0,
                "manufacturer": "ABB",
            },
        },
        {
            "id": "cb_nn_250a",
            "name": "Wylacznik odplywowy nN 250 A",
            "params": {
                "device_kind": "WYLACZNIK_ODPLYWOWY",
                "u_n_kv": 0.4,
                "i_n_a": 250.0,
                "breaking_capacity_ka": 25.0,
                "manufacturer": "ABB",
            },
        },
        {
            "id": "rb_nn_160a",
            "name": "Rozlacznik bezpiecznikowy nN 160 A",
            "params": {
                "device_kind": "ROZLACZNIK_BEZPIECZNIKOWY",
                "u_n_kv": 0.4,
                "i_n_a": 160.0,
                "breaking_capacity_ka": 16.0,
                "manufacturer": "Jean Muller",
            },
        },
    ]


def get_all_ct_types() -> list[dict]:
    return [
        {
            "id": "ct_400_5_5p20",
            "name": "CT 400/5 A kl. 5P20",
            "params": {
                "ratio_primary_a": 400.0,
                "ratio_secondary_a": 5.0,
                "accuracy_class": "5P20",
                "burden_va": 15.0,
                "manufacturer": "ABB",
            },
        },
        {
            "id": "ct_200_5_5p20",
            "name": "CT 200/5 A kl. 5P20",
            "params": {
                "ratio_primary_a": 200.0,
                "ratio_secondary_a": 5.0,
                "accuracy_class": "5P20",
                "burden_va": 10.0,
                "manufacturer": "ABB",
            },
        },
        {
            "id": "ct_100_5_0_5",
            "name": "CT 100/5 A kl. 0.5",
            "params": {
                "ratio_primary_a": 100.0,
                "ratio_secondary_a": 5.0,
                "accuracy_class": "0.5",
                "burden_va": 10.0,
                "manufacturer": "Arteche",
            },
        },
    ]


def get_all_vt_types() -> list[dict]:
    return [
        {
            "id": "vt_15kv_100v",
            "name": "VT 15 kV / 100 V kl. 0.5",
            "params": {
                "ratio_primary_v": 15000.0,
                "ratio_secondary_v": 100.0,
                "accuracy_class": "0.5",
                "manufacturer": "ABB",
            },
        },
        {
            "id": "vt_20kv_100v",
            "name": "VT 20 kV / 100 V kl. 0.5",
            "params": {
                "ratio_primary_v": 20000.0,
                "ratio_secondary_v": 100.0,
                "accuracy_class": "0.5",
                "manufacturer": "ABB",
            },
        },
    ]


def get_all_protection_device_types() -> list[dict]:
    return [
        {
            "id": "ACME_REX500_v1",
            "name_pl": "Przekaznik ABB REX-500",
            "params": {
                "vendor": "ABB",
                "series": "REX",
                "revision": "v1",
                "notes_pl": "Rekord zgodny z katalogiem analitycznym ochrony.",
            },
        },
        {
            "id": "ACME_REX200_v1",
            "name_pl": "Przekaznik ABB REX-200",
            "params": {
                "vendor": "ABB",
                "series": "REX",
                "revision": "v1",
                "notes_pl": "Rekord zgodny z katalogiem analitycznym ochrony.",
            },
        },
        {
            "id": "EM_ETANGO_400_V0",
            "name_pl": "Przekaznik Elektrometal e2TANGO-400",
            "params": {
                "vendor": "ELEKTROMETAL",
                "series": "e2TANGO",
                "revision": "v0",
                "rated_current_a": 400.0,
                "notes_pl": "Rekord analityczny - dane wymagaja weryfikacji produkcyjnej.",
            },
        },
        {
            "id": "EM_ETANGO_600_V0",
            "name_pl": "Przekaznik Elektrometal e2TANGO-600",
            "params": {
                "vendor": "ELEKTROMETAL",
                "series": "e2TANGO",
                "revision": "v0",
                "rated_current_a": 600.0,
                "notes_pl": "Rekord analityczny - dane wymagaja weryfikacji produkcyjnej.",
            },
        },
        {
            "id": "EM_ETANGO_800_V0",
            "name_pl": "Przekaznik Elektrometal e2TANGO-800",
            "params": {
                "vendor": "ELEKTROMETAL",
                "series": "e2TANGO",
                "revision": "v0",
                "rated_current_a": 800.0,
                "notes_pl": "Rekord analityczny - dane wymagaja weryfikacji produkcyjnej.",
            },
        },
        {
            "id": "EM_ETANGO_1000_V0",
            "name_pl": "Przekaznik Elektrometal e2TANGO-1000",
            "params": {
                "vendor": "ELEKTROMETAL",
                "series": "e2TANGO",
                "revision": "v0",
                "rated_current_a": 1000.0,
                "notes_pl": "Rekord analityczny - dane wymagaja weryfikacji produkcyjnej.",
            },
        },
        {
            "id": "EM_ETANGO_1250_V0",
            "name_pl": "Przekaznik Elektrometal e2TANGO-1250",
            "params": {
                "vendor": "ELEKTROMETAL",
                "series": "e2TANGO",
                "revision": "v0",
                "rated_current_a": 1250.0,
                "notes_pl": "Rekord analityczny - dane wymagaja weryfikacji produkcyjnej.",
            },
        },
        {
            "id": "EM_ETANGO_1600_V0",
            "name_pl": "Przekaznik Elektrometal e2TANGO-1600",
            "params": {
                "vendor": "ELEKTROMETAL",
                "series": "e2TANGO",
                "revision": "v0",
                "rated_current_a": 1600.0,
                "notes_pl": "Rekord analityczny - dane wymagaja weryfikacji produkcyjnej.",
            },
        },
        {
            "id": "EM_ETANGO_2000_V0",
            "name_pl": "Przekaznik Elektrometal e2TANGO-2000",
            "params": {
                "vendor": "ELEKTROMETAL",
                "series": "e2TANGO",
                "revision": "v0",
                "rated_current_a": 2000.0,
                "notes_pl": "Rekord analityczny - dane wymagaja weryfikacji produkcyjnej.",
            },
        },
    ]


def get_all_protection_curves() -> list[dict]:
    return [
        {
            "id": "curve_iec_normal_inverse",
            "name_pl": "IEC normalna inwersyjna",
            "params": {
                "standard": "IEC",
                "curve_kind": "inverse",
                "parameters": {"A": 0.14, "B": 0.02},
            },
        },
        {
            "id": "curve_iec_very_inverse",
            "name_pl": "IEC bardzo inwersyjna",
            "params": {
                "standard": "IEC",
                "curve_kind": "very_inverse",
                "parameters": {"A": 13.5, "B": 1.0},
            },
        },
    ]


def get_all_protection_setting_templates() -> list[dict]:
    return [
        {
            "id": "template_rex500_oc",
            "name_pl": "Szablon ABB REX-500 - nadpradowy",
            "params": {
                "device_type_ref": "ACME_REX500_v1",
                "curve_ref": "curve_iec_normal_inverse",
                "setting_fields": [
                    {"name": "I>", "unit": "A", "min": 0.1, "max": 10.0},
                    {"name": "t>", "unit": "s", "min": 0.0, "max": 5.0},
                ],
            },
        },
        {
            "id": "template_etango_400_ef",
            "name_pl": "Szablon e2TANGO-400 - ziemnozwarciowy",
            "params": {
                "device_type_ref": "EM_ETANGO_400_V0",
                "curve_ref": "curve_iec_very_inverse",
                "setting_fields": [
                    {"name": "I0>", "unit": "A", "min": 0.1, "max": 10.0},
                    {"name": "t0>", "unit": "s", "min": 0.0, "max": 5.0},
                ],
            },
        },
    ]
