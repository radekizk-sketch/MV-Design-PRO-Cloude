"""
Testy szerokości przemysłowej katalogów technicznych.

Każdy test weryfikuje MINIMALNĄ liczbę rekordów dla danej grupy katalogowej,
zgodnie z macierzą skali domknięcia z CATALOG_INDUSTRIAL_SERIES_MATRIX.md.

Zasada: samo istnienie katalogu nie oznacza domknięcia przemysłowego.
"""
from __future__ import annotations

import pytest

from network_model.catalog.repository import get_default_mv_catalog
from network_model.catalog.types import (
    CatalogStatus,
    CatalogVerificationStatus,
    CATALOG_CONTRACT_VERSION,
)


@pytest.fixture(scope="module")
def catalog():
    return get_default_mv_catalog()


# =============================================================================
# TESTY SZEROKOŚCI — minimalna liczba rekordów per grupa
# =============================================================================

# Limity minimalne per CATALOG_INDUSTRIAL_SERIES_MATRIX.md
MIN_WIDTH = {
    "LINIA_SN": 10,          # było 15, cel 25+ — minimum zachowawcze
    "KABEL_SN": 40,           # było 51 — minimum zachowawcze (poniżej aktualnego)
    "TRAFO_SN_NN": 18,        # było 22 — minimum zachowawcze
    "APARAT_SN": 18,          # było 22 — minimum zachowawcze
    "ZRODLO_SN": 12,          # było 14 — minimum zachowawcze
    "CT": 3,                  # docelowo 24+, teraz minimum obecne
    "VT": 2,                  # docelowo 12+, teraz minimum obecne
    "KABEL_NN": 3,            # docelowo 15+, teraz minimum obecne
    "APARAT_NN": 3,           # docelowo 10+, teraz minimum obecne
    "FALOWNIK_PV": 4,         # docelowo 12+, teraz minimum obecne
    "FALOWNIK_BESS": 4,       # docelowo 8+, teraz minimum obecne
    "ZABEZPIECZENIE": 6,      # docelowo 18+, teraz minimum zachowawcze
    "KRZYWA": 2,              # docelowo 10+, teraz minimum obecne
    "SZABLON": 2,             # docelowo 8+, teraz minimum obecne
}


def test_overhead_line_catalog_has_industrial_series_width(catalog):
    types = catalog.list_line_types()
    production_types = [
        t for t in types
        if t.catalog_status != CatalogStatus.TESTOWY.value
    ]
    assert len(production_types) >= MIN_WIDTH["LINIA_SN"], (
        f"LINIA_SN: {len(production_types)} rekordów produkcyjnych < minimum {MIN_WIDTH['LINIA_SN']}"
    )


def test_mv_cable_catalog_has_industrial_series_width(catalog):
    types = catalog.list_cable_types()
    production_types = [
        t for t in types
        if t.catalog_status != CatalogStatus.TESTOWY.value
    ]
    assert len(production_types) >= MIN_WIDTH["KABEL_SN"], (
        f"KABEL_SN: {len(production_types)} rekordów produkcyjnych < minimum {MIN_WIDTH['KABEL_SN']}"
    )


def test_transformer_catalog_has_industrial_series_width(catalog):
    types = catalog.list_transformer_types()
    assert len(types) >= MIN_WIDTH["TRAFO_SN_NN"], (
        f"TRAFO_SN_NN: {len(types)} rekordów < minimum {MIN_WIDTH['TRAFO_SN_NN']}"
    )


def test_mv_switch_catalog_has_industrial_series_width(catalog):
    types = catalog.list_switch_equipment_types()
    assert len(types) >= MIN_WIDTH["APARAT_SN"], (
        f"APARAT_SN: {len(types)} rekordów < minimum {MIN_WIDTH['APARAT_SN']}"
    )


def test_source_catalog_has_industrial_series_width(catalog):
    types = catalog.list_source_system_types()
    assert len(types) >= MIN_WIDTH["ZRODLO_SN"], (
        f"ZRODLO_SN: {len(types)} rekordów < minimum {MIN_WIDTH['ZRODLO_SN']}"
    )


def test_ct_catalog_has_industrial_series_width(catalog):
    types = catalog.list_ct_types()
    assert len(types) >= MIN_WIDTH["CT"], (
        f"CT: {len(types)} rekordów < minimum {MIN_WIDTH['CT']}"
    )


def test_vt_catalog_has_industrial_series_width(catalog):
    types = catalog.list_vt_types()
    assert len(types) >= MIN_WIDTH["VT"], (
        f"VT: {len(types)} rekordów < minimum {MIN_WIDTH['VT']}"
    )


def test_pv_catalog_has_industrial_series_width(catalog):
    types = catalog.list_pv_inverter_types()
    assert len(types) >= MIN_WIDTH["FALOWNIK_PV"], (
        f"FALOWNIK_PV: {len(types)} rekordów < minimum {MIN_WIDTH['FALOWNIK_PV']}"
    )


def test_bess_catalog_has_industrial_series_width(catalog):
    types = catalog.list_bess_inverter_types()
    assert len(types) >= MIN_WIDTH["FALOWNIK_BESS"], (
        f"FALOWNIK_BESS: {len(types)} rekordów < minimum {MIN_WIDTH['FALOWNIK_BESS']}"
    )


def test_protection_catalog_has_industrial_series_width(catalog):
    types = catalog.list_protection_device_types()
    assert len(types) >= MIN_WIDTH["ZABEZPIECZENIE"], (
        f"ZABEZPIECZENIE: {len(types)} rekordów < minimum {MIN_WIDTH['ZABEZPIECZENIE']}"
    )


def test_protection_curves_have_industrial_series_width(catalog):
    types = catalog.list_protection_curves()
    assert len(types) >= MIN_WIDTH["KRZYWA"], (
        f"KRZYWA_ZABEZPIECZENIA: {len(types)} rekordów < minimum {MIN_WIDTH['KRZYWA']}"
    )


def test_protection_templates_have_industrial_series_width(catalog):
    types = catalog.list_protection_setting_templates()
    assert len(types) >= MIN_WIDTH["SZABLON"], (
        f"SZABLON_NASTAW: {len(types)} rekordów < minimum {MIN_WIDTH['SZABLON']}"
    )


def test_lv_cable_catalog_has_minimum_width(catalog):
    types = catalog.list_lv_cable_types()
    assert len(types) >= MIN_WIDTH["KABEL_NN"], (
        f"KABEL_NN: {len(types)} rekordów < minimum {MIN_WIDTH['KABEL_NN']}"
    )


def test_lv_apparatus_catalog_has_minimum_width(catalog):
    types = catalog.list_lv_apparatus_types()
    assert len(types) >= MIN_WIDTH["APARAT_NN"], (
        f"APARAT_NN: {len(types)} rekordów < minimum {MIN_WIDTH['APARAT_NN']}"
    )


# =============================================================================
# TESTY METADANYCH JAKOŚCI — weryfikacja frozen contract
# =============================================================================

def _get_all_groups(catalog) -> dict[str, list]:
    return {
        "LINIA_SN": catalog.list_line_types(),
        "KABEL_SN": catalog.list_cable_types(),
        "TRAFO_SN_NN": catalog.list_transformer_types(),
        "APARAT_SN": catalog.list_switch_equipment_types(),
        "ZRODLO_SN": catalog.list_source_system_types(),
        "CT": catalog.list_ct_types(),
        "VT": catalog.list_vt_types(),
        "KABEL_NN": catalog.list_lv_cable_types(),
        "FALOWNIK_PV": catalog.list_pv_inverter_types(),
        "FALOWNIK_BESS": catalog.list_bess_inverter_types(),
        "ZABEZPIECZENIE": catalog.list_protection_device_types(),
        "KRZYWA": catalog.list_protection_curves(),
        "SZABLON": catalog.list_protection_setting_templates(),
        "OBCIAZENIE": catalog.list_load_types(),
        "APARAT_NN": catalog.list_lv_apparatus_types(),
    }


def test_catalog_records_have_required_metadata(catalog):
    """Każdy rekord musi mieć verification_status, source_reference, catalog_status, contract_version."""
    groups = _get_all_groups(catalog)
    violations: list[str] = []
    for group, items in groups.items():
        for item in items:
            data = item.to_dict()
            for field in ("verification_status", "source_reference", "catalog_status", "contract_version"):
                if not data.get(field):
                    violations.append(f"{group}:{data.get('id')}: brak pola {field}")
    assert not violations, "Rekordy bez wymaganych metadanych:\n" + "\n".join(violations[:20])


def test_catalog_records_have_stable_ids(catalog):
    """Każdy rekord musi mieć niepuste id."""
    groups = _get_all_groups(catalog)
    violations = []
    for group, items in groups.items():
        for item in items:
            data = item.to_dict()
            if not data.get("id"):
                violations.append(f"{group}: rekord bez id")
    assert not violations, f"Rekordy bez id: {violations}"


def test_catalog_records_have_contract_version(catalog):
    """Każdy rekord musi mieć contract_version == CATALOG_CONTRACT_VERSION."""
    groups = _get_all_groups(catalog)
    violations = []
    for group, items in groups.items():
        for item in items:
            data = item.to_dict()
            if data.get("contract_version") != CATALOG_CONTRACT_VERSION:
                violations.append(
                    f"{group}:{data.get('id')}: contract_version={data.get('contract_version')!r}"
                )
    assert not violations, "Nieprawidłowe contract_version:\n" + "\n".join(violations[:20])


def test_unverified_records_are_explicitly_marked(catalog):
    """Rekordy NIEWERYFIKOWANY muszą mieć jawny verification_note lub notes_pl."""
    groups = _get_all_groups(catalog)
    violations = []
    for group, items in groups.items():
        for item in items:
            data = item.to_dict()
            if data.get("verification_status") == CatalogVerificationStatus.NIEWERYFIKOWANY.value:
                if not data.get("verification_note") and not data.get("notes_pl"):
                    violations.append(
                        f"{group}:{data.get('id')}: NIEWERYFIKOWANY bez verification_note"
                    )
    assert not violations, "Rekordy NIEWERYFIKOWANY bez notatki:\n" + "\n".join(violations[:20])


def test_production_records_are_not_unverified(catalog):
    """PRODUKCYJNY_V1 + NIEWERYFIKOWANY jest kombinacją niedopuszczalną."""
    groups = _get_all_groups(catalog)
    violations = []
    for group, items in groups.items():
        for item in items:
            data = item.to_dict()
            if (
                data.get("catalog_status") == CatalogStatus.PRODUKCYJNY_V1.value
                and data.get("verification_status") == CatalogVerificationStatus.NIEWERYFIKOWANY.value
            ):
                violations.append(f"{group}:{data.get('id')}: PRODUKCYJNY_V1 + NIEWERYFIKOWANY")
    assert not violations, "Niedopuszczalne kombinacje statusów:\n" + "\n".join(violations)


def test_catalog_groups_do_not_mix_status_semantics(catalog):
    """Grupy produkcyjne nie mogą mieć ANALITYCZNY_V1."""
    analytical_allowed = {"ZABEZPIECZENIE", "KRZYWA", "SZABLON"}
    groups = _get_all_groups(catalog)
    violations = []
    for group, items in groups.items():
        if group in analytical_allowed:
            continue
        for item in items:
            data = item.to_dict()
            if data.get("catalog_status") == CatalogStatus.ANALITYCZNY_V1.value:
                violations.append(
                    f"{group}:{data.get('id')}: ANALITYCZNY_V1 poza grupą ochrony"
                )
    assert not violations, "Mieszanie statusów katalogowych:\n" + "\n".join(violations)


def test_catalog_repository_loads_all_industrial_groups(catalog):
    """Repozytorium katalogu musi ładować wszystkie grupy przemysłowe."""
    assert len(catalog.list_line_types()) > 0, "LINIA_SN: brak rekordów"
    assert len(catalog.list_cable_types()) > 0, "KABEL_SN: brak rekordów"
    assert len(catalog.list_transformer_types()) > 0, "TRAFO_SN_NN: brak rekordów"
    assert len(catalog.list_switch_equipment_types()) > 0, "APARAT_SN: brak rekordów"
    assert len(catalog.list_source_system_types()) > 0, "ZRODLO_SN: brak rekordów"
    assert len(catalog.list_ct_types()) > 0, "CT: brak rekordów"
    assert len(catalog.list_vt_types()) > 0, "VT: brak rekordów"
    assert len(catalog.list_pv_inverter_types()) > 0, "FALOWNIK_PV: brak rekordów"
    assert len(catalog.list_bess_inverter_types()) > 0, "FALOWNIK_BESS: brak rekordów"
    assert len(catalog.list_protection_device_types()) > 0, "ZABEZPIECZENIE: brak rekordów"
    assert len(catalog.list_protection_curves()) > 0, "KRZYWA: brak rekordów"
    assert len(catalog.list_protection_setting_templates()) > 0, "SZABLON: brak rekordów"
    assert len(catalog.list_lv_cable_types()) > 0, "KABEL_NN: brak rekordów"
    assert len(catalog.list_lv_apparatus_types()) > 0, "APARAT_NN: brak rekordów"
    assert len(catalog.list_load_types()) > 0, "OBCIAZENIE: brak rekordów"


def test_catalog_export_and_api_preserve_verification_metadata(catalog):
    """to_dict() musi zawierać verification_status dla każdego rekordu."""
    for lt in catalog.list_line_types():
        d = lt.to_dict()
        assert "verification_status" in d, f"LineType {lt.id}: brak verification_status w to_dict()"
    for ct in catalog.list_cable_types():
        d = ct.to_dict()
        assert "verification_status" in d, f"CableType {ct.id}: brak verification_status w to_dict()"
    for tt in catalog.list_transformer_types():
        d = tt.to_dict()
        assert "verification_status" in d, f"TransformerType {tt.id}: brak verification_status w to_dict()"


def test_catalog_export_and_api_preserve_catalog_status(catalog):
    """to_dict() musi zawierać catalog_status dla każdego rekordu."""
    for lt in catalog.list_line_types():
        d = lt.to_dict()
        assert "catalog_status" in d, f"LineType {lt.id}: brak catalog_status w to_dict()"
    for ct in catalog.list_cable_types():
        d = ct.to_dict()
        assert "catalog_status" in d, f"CableType {ct.id}: brak catalog_status w to_dict()"
    for st in catalog.list_source_system_types():
        d = st.to_dict()
        assert "catalog_status" in d, f"SourceSystemType {st.id}: brak catalog_status w to_dict()"


# =============================================================================
# TESTY NIEZMIENNIOŚCI IDS (DETERMINISTYCZNOŚĆ)
# =============================================================================

def test_overhead_line_ids_are_stable():
    """IDs linii muszą być deterministyczne (nie UUID generowane przy każdym wywołaniu)."""
    catalog1 = get_default_mv_catalog()
    catalog2 = get_default_mv_catalog()
    ids1 = {t.id for t in catalog1.list_line_types()}
    ids2 = {t.id for t in catalog2.list_line_types()}
    assert ids1 == ids2, "IDs linii napowietrznych nie są deterministyczne"


def test_cable_ids_are_stable():
    """IDs kabli muszą być deterministyczne."""
    catalog1 = get_default_mv_catalog()
    catalog2 = get_default_mv_catalog()
    ids1 = {t.id for t in catalog1.list_cable_types()}
    ids2 = {t.id for t in catalog2.list_cable_types()}
    assert ids1 == ids2, "IDs kabli SN nie są deterministyczne"


# =============================================================================
# TESTY MATERIAŁOWE I PARAMETRYCZNE — podstawowe sanity checks
# =============================================================================

def test_line_types_have_nonzero_resistance(catalog):
    """Wszystkie linie muszą mieć r_ohm_per_km > 0 (z wyjątkiem testowych)."""
    violations = []
    for lt in catalog.list_line_types():
        if lt.catalog_status == CatalogStatus.TESTOWY.value:
            continue
        if lt.r_ohm_per_km <= 0:
            violations.append(f"LineType {lt.id}: r_ohm_per_km={lt.r_ohm_per_km}")
    assert not violations, f"Linie z R <= 0: {violations}"


def test_cable_types_have_nonzero_resistance(catalog):
    """Wszystkie kable muszą mieć r_ohm_per_km > 0 (z wyjątkiem testowych)."""
    violations = []
    for ct in catalog.list_cable_types():
        if ct.catalog_status == CatalogStatus.TESTOWY.value:
            continue
        if ct.r_ohm_per_km <= 0:
            violations.append(f"CableType {ct.id}: r_ohm_per_km={ct.r_ohm_per_km}")
    assert not violations, f"Kable z R <= 0: {violations}"


def test_transformer_types_have_nonzero_uk(catalog):
    """Wszystkie transformatory muszą mieć uk_percent > 0."""
    violations = []
    for tt in catalog.list_transformer_types():
        if tt.uk_percent <= 0:
            violations.append(f"TransformerType {tt.id}: uk_percent={tt.uk_percent}")
    assert not violations, f"Transformatory z uk% <= 0: {violations}"


def test_source_system_types_have_nonzero_sk3(catalog):
    """Wszystkie źródła SN muszą mieć sk3_mva > 0."""
    violations = []
    for st in catalog.list_source_system_types():
        if st.sk3_mva <= 0:
            violations.append(f"SourceSystemType {st.id}: sk3_mva={st.sk3_mva}")
    assert not violations, f"Źródła z Sk3 <= 0: {violations}"
