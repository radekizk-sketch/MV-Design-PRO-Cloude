"""Tests for ENMValidator — blockers E001-E008, warnings W001-W004, Polish messages."""

import pytest

from enm.models import (
    Bus,
    Cable,
    EnergyNetworkModel,
    ENMHeader,
    Load,
    OverheadLine,
    Source,
    Transformer,
)
from enm.validator import ENMValidator


def _enm(**kwargs) -> EnergyNetworkModel:
    return EnergyNetworkModel(header=ENMHeader(name="Test"), **kwargs)


def _minimal_enm() -> EnergyNetworkModel:
    """Minimal valid ENM: 1 bus + 1 source with Sk."""
    return _enm(
        buses=[Bus(ref_id="bus_1", name="Szyna", voltage_kv=15)],
        sources=[Source(ref_id="src_1", name="Grid", bus_ref="bus_1", model="short_circuit_power", sk3_mva=220)],
    )


class TestBlockers:
    def test_e001_no_sources(self):
        result = ENMValidator().validate(_enm(
            buses=[Bus(ref_id="b1", name="B1", voltage_kv=15)],
        ))
        assert result.status == "FAIL"
        codes = [i.code for i in result.issues]
        assert "E001" in codes

    def test_e002_no_buses(self):
        result = ENMValidator().validate(_enm())
        assert result.status == "FAIL"
        codes = [i.code for i in result.issues]
        assert "E002" in codes

    def test_e004_zero_voltage(self):
        result = ENMValidator().validate(_enm(
            buses=[Bus(ref_id="b1", name="B1", voltage_kv=0)],
            sources=[Source(ref_id="s1", name="S1", bus_ref="b1", model="short_circuit_power", sk3_mva=100)],
        ))
        assert result.status == "FAIL"
        codes = [i.code for i in result.issues]
        assert "E004" in codes

    def test_e005_zero_impedance_line(self):
        result = ENMValidator().validate(_enm(
            buses=[
                Bus(ref_id="b1", name="B1", voltage_kv=15),
                Bus(ref_id="b2", name="B2", voltage_kv=15),
            ],
            sources=[Source(ref_id="s1", name="S1", bus_ref="b1", model="short_circuit_power", sk3_mva=100)],
            branches=[
                OverheadLine(ref_id="ln_1", name="L1", from_bus_ref="b1", to_bus_ref="b2",
                             length_km=5, r_ohm_per_km=0, x_ohm_per_km=0),
            ],
        ))
        assert result.status == "FAIL"
        codes = [i.code for i in result.issues]
        assert "E005" in codes

    def test_e006_trafo_no_uk(self):
        result = ENMValidator().validate(_enm(
            buses=[
                Bus(ref_id="b1", name="B1", voltage_kv=110),
                Bus(ref_id="b2", name="B2", voltage_kv=15),
            ],
            sources=[Source(ref_id="s1", name="S1", bus_ref="b1", model="short_circuit_power", sk3_mva=1000)],
            transformers=[
                Transformer(ref_id="t1", name="T1", hv_bus_ref="b1", lv_bus_ref="b2",
                            sn_mva=25, uhv_kv=110, ulv_kv=15, uk_percent=0, pk_kw=120),
            ],
        ))
        assert result.status == "FAIL"
        codes = [i.code for i in result.issues]
        assert "E006" in codes

    def test_e007_trafo_same_bus(self):
        result = ENMValidator().validate(_enm(
            buses=[Bus(ref_id="b1", name="B1", voltage_kv=15)],
            sources=[Source(ref_id="s1", name="S1", bus_ref="b1", model="short_circuit_power", sk3_mva=200)],
            transformers=[
                Transformer(ref_id="t1", name="T1", hv_bus_ref="b1", lv_bus_ref="b1",
                            sn_mva=25, uhv_kv=110, ulv_kv=15, uk_percent=12, pk_kw=120),
            ],
        ))
        assert result.status == "FAIL"
        codes = [i.code for i in result.issues]
        assert "E007" in codes

    def test_e008_source_no_params(self):
        result = ENMValidator().validate(_enm(
            buses=[Bus(ref_id="b1", name="B1", voltage_kv=15)],
            sources=[Source(ref_id="s1", name="S1", bus_ref="b1", model="short_circuit_power")],
        ))
        assert result.status == "FAIL"
        codes = [i.code for i in result.issues]
        assert "E008" in codes


class TestWarnings:
    def test_w001_line_no_z0(self):
        result = ENMValidator().validate(_enm(
            buses=[
                Bus(ref_id="b1", name="B1", voltage_kv=15),
                Bus(ref_id="b2", name="B2", voltage_kv=15),
            ],
            sources=[Source(ref_id="s1", name="S1", bus_ref="b1", model="short_circuit_power", sk3_mva=220)],
            branches=[
                OverheadLine(ref_id="ln_1", name="L1", from_bus_ref="b1", to_bus_ref="b2",
                             length_km=5, r_ohm_per_km=0.4, x_ohm_per_km=0.3),
            ],
        ))
        codes = [i.code for i in result.issues]
        assert "W001" in codes

    def test_w002_source_no_z0(self):
        result = ENMValidator().validate(_minimal_enm())
        codes = [i.code for i in result.issues]
        assert "W002" in codes

    def test_w003_no_loads(self):
        result = ENMValidator().validate(_minimal_enm())
        codes = [i.code for i in result.issues]
        assert "W003" in codes


class TestOKStatus:
    def test_minimal_enm_not_fail(self):
        result = ENMValidator().validate(_minimal_enm())
        # Minimal has warnings but should not FAIL
        assert result.status in ("OK", "WARN")
        assert result.analysis_available.short_circuit_3f is True

    def test_messages_in_polish(self):
        result = ENMValidator().validate(_enm())
        for issue in result.issues:
            assert issue.message_pl, f"Issue {issue.code} has empty message_pl"


class TestAnalysisAvailability:
    def test_fail_blocks_all(self):
        result = ENMValidator().validate(_enm())
        assert result.analysis_available.short_circuit_3f is False
        assert result.analysis_available.short_circuit_1f is False
        assert result.analysis_available.load_flow is False

    def test_sc1f_unavailable_without_z0(self):
        result = ENMValidator().validate(_minimal_enm())
        assert result.analysis_available.short_circuit_3f is True
        assert result.analysis_available.short_circuit_1f is False

    def test_loadflow_unavailable_without_loads(self):
        result = ENMValidator().validate(_minimal_enm())
        assert result.analysis_available.load_flow is False
