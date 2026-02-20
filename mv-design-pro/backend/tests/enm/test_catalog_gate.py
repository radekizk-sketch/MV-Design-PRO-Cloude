"""
Testy bramki katalogowej — weryfikacja wymuszania catalog_ref/catalog_binding.

Faza 5: Testy potwierdzajace ze warstwa ENM odrzuca operacje tworzace
segmenty i transformatory bez katalogu.

Testy deterministyczne: kazdy test jest izolowany i powtarzalny.
"""
from __future__ import annotations

import pytest

from enm.models import EnergyNetworkModel, ENMHeader, ENMDefaults
from enm.domain_operations import execute_domain_operation


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _empty_enm() -> dict:
    """Pusty ENM z jawnymi ustawieniami projektu."""
    enm = EnergyNetworkModel(
        header=ENMHeader(name="test_catalog_gate", defaults=ENMDefaults(sn_nominal_kv=15.0)),
    )
    return enm.model_dump(mode="json")


def _add_gpz(enm_dict: dict) -> dict:
    """Dodaj GPZ i zwroc snapshot."""
    result = execute_domain_operation(
        enm_dict=enm_dict,
        op_name="add_grid_source_sn",
        payload={"voltage_kv": 15.0, "sk3_mva": 250.0},
    )
    assert result.get("snapshot") is not None
    return result["snapshot"]


def _add_segment_with_catalog(enm_dict: dict) -> dict:
    """Dodaj segment magistrali Z katalogiem i zwroc snapshot."""
    result = execute_domain_operation(
        enm_dict=enm_dict,
        op_name="continue_trunk_segment_sn",
        payload={
            "segment": {
                "rodzaj": "KABEL",
                "dlugosc_m": 500,
                "catalog_ref": "YAKXS_3x120",
            },
        },
    )
    assert result.get("snapshot") is not None, f"Error: {result.get('error')}"
    return result["snapshot"]


def _get_first_cable_ref(snapshot: dict) -> str:
    """Znajdz pierwszy odcinek kablowy."""
    for branch in snapshot.get("branches", []):
        if branch.get("type") in ("cable", "line_overhead"):
            return branch["ref_id"]
    raise ValueError("Brak segmentu kablowego")


def _get_sn_bus_ref(snapshot: dict) -> str:
    """Znajdz szyne SN (nie GPZ)."""
    for bus in snapshot.get("buses", []):
        if "gpz" not in bus.get("ref_id", "").lower():
            return bus["ref_id"]
    # fallback: ostatnia szyna
    return snapshot["buses"][-1]["ref_id"]


# ===========================================================================
# TEST 1: continue_trunk_segment_sn bez katalogu → odrzucenie
# ===========================================================================


class TestCatalogGateContinueTrunk:
    def test_reject_trunk_without_catalog(self):
        """continue_trunk_segment_sn BEZ catalog_ref → error catalog.ref_required."""
        enm = _empty_enm()
        snapshot = _add_gpz(enm)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="continue_trunk_segment_sn",
            payload={
                "segment": {
                    "rodzaj": "KABEL",
                    "dlugosc_m": 500,
                    # BRAK catalog_ref i catalog_binding
                },
            },
        )
        assert result.get("error") is not None
        assert result["error_code"] == "catalog.ref_required"

    def test_accept_trunk_with_catalog_ref(self):
        """continue_trunk_segment_sn Z catalog_ref → sukces."""
        enm = _empty_enm()
        snapshot = _add_gpz(enm)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="continue_trunk_segment_sn",
            payload={
                "segment": {
                    "rodzaj": "KABEL",
                    "dlugosc_m": 500,
                    "catalog_ref": "YAKXS_3x120",
                },
            },
        )
        assert result.get("snapshot") is not None, f"Error: {result.get('error')}"
        assert result.get("error") is None or result.get("error") == ""

    def test_accept_trunk_with_catalog_binding(self):
        """continue_trunk_segment_sn Z catalog_binding → sukces."""
        enm = _empty_enm()
        snapshot = _add_gpz(enm)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="continue_trunk_segment_sn",
            payload={
                "segment": {
                    "rodzaj": "KABEL",
                    "dlugosc_m": 500,
                    "catalog_binding": {
                        "namespace": "KABEL_SN",
                        "item_id": "YAKXS_3x120",
                        "version": "2024.1",
                    },
                },
            },
        )
        assert result.get("snapshot") is not None, f"Error: {result.get('error')}"
        assert result.get("error") is None or result.get("error") == ""


# ===========================================================================
# TEST 2: start_branch_segment_sn bez katalogu → odrzucenie
# ===========================================================================


class TestCatalogGateStartBranch:
    def test_reject_branch_without_catalog(self):
        """start_branch_segment_sn BEZ catalog_ref → error catalog.ref_required."""
        enm = _empty_enm()
        snapshot = _add_gpz(enm)
        snapshot = _add_segment_with_catalog(snapshot)

        bus_ref = _get_sn_bus_ref(snapshot)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="start_branch_segment_sn",
            payload={
                "from_bus_ref": bus_ref,
                "segment": {
                    "rodzaj": "KABEL",
                    "dlugosc_m": 200,
                    # BRAK catalog_ref i catalog_binding
                },
            },
        )
        assert result.get("error") is not None
        assert result["error_code"] == "catalog.ref_required"

    def test_accept_branch_with_catalog_ref(self):
        """start_branch_segment_sn Z catalog_ref → sukces."""
        enm = _empty_enm()
        snapshot = _add_gpz(enm)
        snapshot = _add_segment_with_catalog(snapshot)

        bus_ref = _get_sn_bus_ref(snapshot)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="start_branch_segment_sn",
            payload={
                "from_bus_ref": bus_ref,
                "segment": {
                    "rodzaj": "KABEL",
                    "dlugosc_m": 200,
                    "catalog_ref": "YAKXS_3x120",
                },
            },
        )
        assert result.get("snapshot") is not None, f"Error: {result.get('error')}"


# ===========================================================================
# TEST 3: insert_station_on_segment_sn bez katalogu → odrzucenie
# ===========================================================================


class TestCatalogGateInsertStation:
    def test_reject_station_without_transformer_catalog(self):
        """insert_station_on_segment_sn BEZ transformer catalog → error catalog.ref_required."""
        enm = _empty_enm()
        snapshot = _add_gpz(enm)
        snapshot = _add_segment_with_catalog(snapshot)

        seg_ref = _get_first_cable_ref(snapshot)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="insert_station_on_segment_sn",
            payload={
                "segment_ref": seg_ref,
                "station_type": "A",
                "insert_at": {"value": 0.5},
                "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                "sn_fields": ["IN", "OUT"],
                "transformer": {
                    "create": True,
                    # BRAK transformer_catalog_ref i catalog_binding
                },
            },
        )
        assert result.get("error") is not None
        assert result["error_code"] == "catalog.ref_required"

    def test_accept_station_with_transformer_catalog(self):
        """insert_station_on_segment_sn Z transformer_catalog_ref → sukces."""
        enm = _empty_enm()
        snapshot = _add_gpz(enm)
        snapshot = _add_segment_with_catalog(snapshot)

        seg_ref = _get_first_cable_ref(snapshot)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="insert_station_on_segment_sn",
            payload={
                "segment_ref": seg_ref,
                "station_type": "A",
                "insert_at": {"value": 0.5},
                "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                "sn_fields": ["IN", "OUT"],
                "transformer": {
                    "create": True,
                    "transformer_catalog_ref": "ONAN_630",
                },
            },
        )
        assert result.get("snapshot") is not None, f"Error: {result.get('error')}"
        # Sprawdz ze stacja zostala utworzona
        assert len(result.get("changes", {}).get("created_element_ids", [])) > 0

    def test_station_without_create_transformer_passes(self):
        """insert_station BEZ create=True (no transformer) → nie wymaga katalogu TR."""
        enm = _empty_enm()
        snapshot = _add_gpz(enm)
        snapshot = _add_segment_with_catalog(snapshot)

        seg_ref = _get_first_cable_ref(snapshot)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="insert_station_on_segment_sn",
            payload={
                "segment_ref": seg_ref,
                "station_type": "A",
                "insert_at": {"value": 0.5},
                "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                "sn_fields": ["IN", "OUT"],
                "transformer": {"create": False},
            },
        )
        # Powinno przejsc mimo braku katalogu transformatora (bo create=False)
        assert result.get("snapshot") is not None, f"Error: {result.get('error')}"


# ===========================================================================
# TEST 4: add_transformer_sn_nn bez katalogu → odrzucenie
# ===========================================================================


class TestCatalogGateAddTransformer:
    def test_reject_transformer_without_catalog(self):
        """add_transformer_sn_nn BEZ catalog → error catalog.ref_required."""
        enm = _empty_enm()
        snapshot = _add_gpz(enm)
        snapshot = _add_segment_with_catalog(snapshot)

        # Potrzebujemy dwoch szyn (SN i nN) do transformatora
        buses = snapshot.get("buses", [])
        if len(buses) < 2:
            pytest.skip("Za mało szyn do testu transformatora")

        hv_ref = buses[0]["ref_id"]
        lv_ref = buses[-1]["ref_id"]

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="add_transformer_sn_nn",
            payload={
                "hv_bus_ref": hv_ref,
                "lv_bus_ref": lv_ref,
                # BRAK transformer_catalog_ref i catalog_binding
            },
        )
        assert result.get("error") is not None
        assert result["error_code"] == "catalog.ref_required"


# ===========================================================================
# TEST 5: connect_secondary_ring_sn bez katalogu → odrzucenie
# ===========================================================================


class TestCatalogGateConnectRing:
    def test_reject_ring_without_catalog(self):
        """connect_secondary_ring_sn BEZ catalog → error catalog.ref_required."""
        enm = _empty_enm()
        snapshot = _add_gpz(enm)
        snapshot = _add_segment_with_catalog(snapshot)
        snapshot = _add_segment_with_catalog(snapshot)

        # Potrzebujemy dwoch koncowych szyn
        buses = snapshot.get("buses", [])
        if len(buses) < 3:
            pytest.skip("Za mało szyn do testu ring")

        from_ref = buses[1]["ref_id"]
        to_ref = buses[-1]["ref_id"]

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="connect_secondary_ring_sn",
            payload={
                "from_bus_ref": from_ref,
                "to_bus_ref": to_ref,
                "segment": {
                    "rodzaj": "KABEL",
                    "dlugosc_m": 100,
                    # BRAK catalog_ref
                },
            },
        )
        assert result.get("error") is not None
        assert result["error_code"] == "catalog.ref_required"


# ===========================================================================
# TEST 6: Determinizm — ta sama operacja z katalogiem → ten sam hash
# ===========================================================================


class TestCatalogGateDeterminism:
    def test_trunk_with_catalog_deterministic(self):
        """Dwa wywolania continue_trunk_segment_sn z tym samym katalogiem → identyczny snapshot."""
        enm = _empty_enm()
        snapshot = _add_gpz(enm)

        payload = {
            "segment": {
                "rodzaj": "KABEL",
                "dlugosc_m": 500,
                "catalog_ref": "YAKXS_3x120",
            },
        }

        r1 = execute_domain_operation(enm_dict=snapshot, op_name="continue_trunk_segment_sn", payload=payload)
        r2 = execute_domain_operation(enm_dict=snapshot, op_name="continue_trunk_segment_sn", payload=payload)

        assert r1.get("snapshot") is not None
        assert r2.get("snapshot") is not None

        # Deterministyczny: identyczny wynik
        assert r1.get("layout_hash") == r2.get("layout_hash"), (
            "Determinism violation: different layout_hash for same input"
        )


# ===========================================================================
# TEST 7: Blad w formacie PL i kod bledu stabilny
# ===========================================================================


class TestCatalogGateErrorFormat:
    def test_error_has_polish_message(self):
        """Blad bramki katalogowej ma komunikat po polsku."""
        enm = _empty_enm()
        snapshot = _add_gpz(enm)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="continue_trunk_segment_sn",
            payload={
                "segment": {
                    "rodzaj": "KABEL",
                    "dlugosc_m": 500,
                    # BRAK catalog
                },
            },
        )
        assert result.get("error") is not None
        # Sprawdz ze komunikat jest po polsku (zawiera polskie znaki)
        error_msg = result.get("error", "")
        assert any(c in error_msg for c in "ąćęłńóśźżĄĆĘŁŃÓŚŹŻ"), (
            f"Error message should be in Polish: {error_msg}"
        )

    def test_error_code_is_stable(self):
        """Kod bledu 'catalog.ref_required' jest stabilny (nie zmienia sie)."""
        enm = _empty_enm()
        snapshot = _add_gpz(enm)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="continue_trunk_segment_sn",
            payload={
                "segment": {
                    "rodzaj": "KABEL",
                    "dlugosc_m": 500,
                },
            },
        )
        assert result["error_code"] == "catalog.ref_required"
