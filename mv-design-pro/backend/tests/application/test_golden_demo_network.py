"""Testy golden demo network — deterministyczna siec referencyjna SN 15kV.

Weryfikuje:
- Poprawnosc budowy sieci przez operacje domenowe
- Poprawnosc typow napieciowych (SN vs nN)
- Determinizm (ten sam wynik przy kazdym uruchomieniu)
- Kompletnosc topologii (szyny, odcinki, stacje, transformatory)
"""

from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path

import pytest

# Direct module import — omija __init__.py z ciezkimi zaleznosciami (reportlab, etc.)
_MOD_PATH = Path(__file__).resolve().parents[2] / "src" / "application" / "reference_patterns"


def _load_golden_module():
    """Zaladuj modul golden_demo_network bezposrednio (bez __init__.py package)."""
    spec = importlib.util.spec_from_file_location(
        "golden_demo_network",
        str(_MOD_PATH / "golden_demo_network.py"),
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _build():
    """Helper — zbuduj siec demo."""
    mod = _load_golden_module()
    return mod.build_golden_demo_network()


def _get_constants():
    """Helper — pobierz stale katalogowe."""
    mod = _load_golden_module()
    return {
        "CABLE_SN_XRUHAKXS_240": mod.CABLE_SN_XRUHAKXS_240,
        "CABLE_SN_YAKXS_120": mod.CABLE_SN_YAKXS_120,
        "LINE_SN_AFL6_70": mod.LINE_SN_AFL6_70,
        "TR_400KVA_DYN11": mod.TR_400KVA_DYN11,
        "TR_630KVA_DYN11": mod.TR_630KVA_DYN11,
    }


class TestGoldenDemoBuild:
    """Testy budowy sieci demonstracyjnej."""

    def test_builds_without_errors(self):
        """Siec demonstracyjna buduje sie bez bledow."""
        result = _build()
        assert result["name"] == "GOLDEN_DEMO_NETWORK_15KV"
        assert result["enm"] is not None
        assert result["snapshot_hash"]
        assert result["operations_count"] >= 6

    def test_has_correct_topology(self):
        """Topologia sieci zawiera wymagane elementy."""
        result = _build()
        enm = result["enm"]

        buses = enm.get("buses", [])
        branches = enm.get("branches", [])
        transformers = enm.get("transformers", [])
        substations = enm.get("substations", [])

        assert len(buses) >= 5, f"Za malo szyn: {len(buses)}"
        cables = [b for b in branches if b.get("type") == "cable"]
        assert len(cables) >= 1, "Brak kabli SN"
        assert len(transformers) >= 1, "Brak transformatorow SN/nN"
        assert len(substations) >= 2, f"Za malo stacji: {len(substations)}"


class TestVoltageCorrectness:
    """Testy poprawnosci napieciowej — nie wolno mieszac SN i nN."""

    def test_sn_buses_have_mv_voltage(self):
        """Szyny SN maja napiecie >= 6kV."""
        result = _build()
        sn_buses = [
            b for b in result["enm"].get("buses", [])
            if b.get("voltage_kv", 0) > 1.0
        ]
        for bus in sn_buses:
            assert bus["voltage_kv"] >= 6.0, (
                f"Szyna SN {bus.get('ref_id')} ma zbyt niskie napiecie: "
                f"{bus['voltage_kv']} kV"
            )

    def test_nn_buses_have_lv_voltage(self):
        """Szyny nN maja napiecie 0.4kV."""
        result = _build()
        nn_buses = [
            b for b in result["enm"].get("buses", [])
            if b.get("voltage_kv", 0) < 1.0
        ]
        for bus in nn_buses:
            assert abs(bus["voltage_kv"] - 0.4) < 0.01, (
                f"Szyna nN {bus.get('ref_id')} ma nieprawidlowe napiecie: "
                f"{bus['voltage_kv']} kV"
            )

    def test_no_lv_cables_in_sn_network(self):
        """Brak kabli nN (np. YAKY) w sieci SN."""
        result = _build()
        branches = result["enm"].get("branches", [])
        for b in branches:
            cat = b.get("catalog_ref") or ""
            name = b.get("name") or ""
            combined = f"{cat} {name}".lower()
            # YAKY bez 'x' (YAKXS) to kabel nN
            if "yaky" in combined and "yakxs" not in combined:
                pytest.fail(
                    f"Odcinek {b.get('ref_id')} uzywa kabla nN: {cat}"
                )

    def test_catalog_refs_are_sn_rated(self):
        """Referencje katalogowe wskazuja na typy SN (nie nN)."""
        consts = _get_constants()
        assert consts["CABLE_SN_XRUHAKXS_240"].startswith("cable-")
        assert consts["CABLE_SN_YAKXS_120"].startswith("cable-")
        assert consts["LINE_SN_AFL6_70"].startswith("line-")
        assert "15-04" in consts["TR_400KVA_DYN11"]
        assert "15-04" in consts["TR_630KVA_DYN11"]


class TestTransformers:
    """Testy transformatorow SN/nN."""

    def test_transformers_connect_sn_to_nn(self):
        """Transformatory laczą szyny SN z szynami nN."""
        result = _build()
        enm = result["enm"]
        transformers = enm.get("transformers", [])
        buses_by_ref = {b["ref_id"]: b for b in enm.get("buses", [])}

        for tr in transformers:
            hv_ref = tr.get("hv_bus_ref")
            lv_ref = tr.get("lv_bus_ref")

            if hv_ref and hv_ref in buses_by_ref:
                hv_bus = buses_by_ref[hv_ref]
                assert hv_bus["voltage_kv"] > 1.0, (
                    f"Trafo {tr.get('ref_id')}: strona HV na szynie nN "
                    f"({hv_bus['voltage_kv']}kV)"
                )

            if lv_ref and lv_ref in buses_by_ref:
                lv_bus = buses_by_ref[lv_ref]
                assert lv_bus["voltage_kv"] < 1.0, (
                    f"Trafo {tr.get('ref_id')}: strona LV na szynie SN "
                    f"({lv_bus['voltage_kv']}kV)"
                )


class TestDeterminism:
    """Testy determinizmu — identyczny wynik przy kazdym uruchomieniu."""

    def test_hash_stable(self):
        """Dwa kolejne wywolania daja identyczny hash."""
        result1 = _build()
        result2 = _build()
        assert result1["snapshot_hash"] == result2["snapshot_hash"]
        assert result1["operations_count"] == result2["operations_count"]


class TestSummary:
    """Testy podsumowania sieci."""

    def test_summary_correctness(self):
        """Podsumowanie sieci zawiera poprawne dane."""
        mod = _load_golden_module()
        result = mod.build_golden_demo_network()
        summary = mod.get_demo_network_summary(result)

        assert summary["name"] == "GOLDEN_DEMO_NETWORK_15KV"
        assert summary["buses_sn"] >= 2
        assert summary["buses_nn"] >= 1
        assert summary["transformers"] >= 1
        assert summary["substations"] >= 2


class TestNoCodenames:
    """Testy braku kodow projektowych."""

    def test_no_forbidden_codenames(self):
        """Siec nie zawiera kodow projektowych (P7, P11, P14, etc.)."""
        result = _build()
        enm_json = json.dumps(result["enm"], ensure_ascii=False)
        for code in ["P7", "P11", "P14", "P17", "P20", "P24"]:
            assert code not in enm_json, (
                f"Znaleziono zakazany kod projektu: {code}"
            )
