"""
Tests for protection.curves.ieee_curves module.

Validates IEEE C37.112 curve types, tripping time calculations,
and differences from IEC formula.
"""

from __future__ import annotations

import math

import pytest

from protection.curves.ieee_curves import (
    IEEECurveType,
    IEEECurveParams,
    IEEETrippingResult,
    calculate_ieee_tripping_time,
    generate_ieee_curve_points,
)
from protection.curves.iec_curves import (
    IECCurveType,
    IECCurveParams,
    calculate_iec_tripping_time,
)


# ---------------------------------------------------------------------------
# IEEECurveType enum
# ---------------------------------------------------------------------------


class TestIEEECurveType:
    def test_has_mi(self):
        assert IEEECurveType.MODERATELY_INVERSE.value == "MI"

    def test_has_vi(self):
        assert IEEECurveType.VERY_INVERSE.value == "VI"

    def test_has_ei(self):
        assert IEEECurveType.EXTREMELY_INVERSE.value == "EI"

    def test_has_sti(self):
        assert IEEECurveType.SHORT_TIME_INVERSE.value == "STI"

    def test_has_dt(self):
        assert IEEECurveType.DEFINITE_TIME.value == "DT"

    def test_all_expected_values(self):
        expected = {"MI", "VI", "EI", "STI", "DT"}
        actual = {ct.value for ct in IEEECurveType}
        assert actual == expected


# ---------------------------------------------------------------------------
# IEEECurveParams
# ---------------------------------------------------------------------------


class TestIEEECurveParams:
    def test_get_standard_params_mi(self):
        params = IEEECurveParams.get_standard_params(IEEECurveType.MODERATELY_INVERSE)
        assert params.curve_type == IEEECurveType.MODERATELY_INVERSE
        assert params.a == 0.0515
        assert params.b == 0.114
        assert params.p == 0.02

    def test_get_standard_params_vi(self):
        params = IEEECurveParams.get_standard_params(IEEECurveType.VERY_INVERSE)
        assert params.a == 19.61
        assert params.b == 0.491
        assert params.p == 2.0

    def test_get_standard_params_ei(self):
        params = IEEECurveParams.get_standard_params(IEEECurveType.EXTREMELY_INVERSE)
        assert params.a == 28.2
        assert params.b == 0.1217
        assert params.p == 2.0

    def test_is_frozen(self):
        params = IEEECurveParams.get_standard_params(IEEECurveType.MODERATELY_INVERSE)
        with pytest.raises(AttributeError):
            params.a = 999.0  # type: ignore[misc]


# ---------------------------------------------------------------------------
# calculate_ieee_tripping_time
# ---------------------------------------------------------------------------


class TestCalculateIEEETrippingTime:
    def test_mi_curve_known_values(self):
        """Verify MI curve tripping time for known input.

        For MI curve: t = TD * (A / (M^p - 1) + B)
        A=0.0515, B=0.114, p=0.02, TD=1.0
        M=5.0 => M^0.02 = 5.0^0.02 = 1.03274...
        denom = 0.03274...
        fraction = 0.0515 / 0.03274... = 1.573...
        base = 1.573... + 0.114 = 1.687...
        t = 1.0 * 1.687... = 1.687...
        """
        params = IEEECurveParams.get_standard_params(IEEECurveType.MODERATELY_INVERSE)
        result = calculate_ieee_tripping_time(
            fault_current_a=500.0,
            pickup_current_a=100.0,
            curve_params=params,
            time_dial=1.0,
        )
        assert result.will_trip is True
        assert result.current_multiple == pytest.approx(5.0)

        expected_m_p = math.pow(5.0, 0.02)
        expected_denom = expected_m_p - 1.0
        expected_fraction = 0.0515 / expected_denom
        expected_base = expected_fraction + 0.114
        expected_time = 1.0 * expected_base
        assert result.tripping_time_s == pytest.approx(expected_time, rel=1e-4)

    def test_will_trip_false_when_m_less_than_1(self):
        params = IEEECurveParams.get_standard_params(IEEECurveType.MODERATELY_INVERSE)
        result = calculate_ieee_tripping_time(
            fault_current_a=50.0,
            pickup_current_a=100.0,
            curve_params=params,
        )
        assert result.will_trip is False
        assert result.tripping_time_s == float("inf")

    def test_dt_curve_returns_definite_time(self):
        params = IEEECurveParams.get_standard_params(IEEECurveType.DEFINITE_TIME)
        result = calculate_ieee_tripping_time(
            fault_current_a=500.0,
            pickup_current_a=100.0,
            curve_params=params,
            definite_time_s=0.3,
        )
        assert result.will_trip is True
        assert result.tripping_time_s == 0.3

    def test_raises_for_zero_pickup(self):
        params = IEEECurveParams.get_standard_params(IEEECurveType.MODERATELY_INVERSE)
        with pytest.raises(ValueError, match="Pickup current must be positive"):
            calculate_ieee_tripping_time(
                fault_current_a=500.0,
                pickup_current_a=0.0,
                curve_params=params,
            )

    def test_white_box_intermediates(self):
        params = IEEECurveParams.get_standard_params(IEEECurveType.MODERATELY_INVERSE)
        result = calculate_ieee_tripping_time(
            fault_current_a=500.0,
            pickup_current_a=100.0,
            curve_params=params,
        )
        assert result.m_power_p > 0
        assert result.denominator > 0
        assert result.fraction > 0
        assert result.base_time_s > 0

    def test_result_to_dict(self):
        params = IEEECurveParams.get_standard_params(IEEECurveType.MODERATELY_INVERSE)
        result = calculate_ieee_tripping_time(
            fault_current_a=500.0,
            pickup_current_a=100.0,
            curve_params=params,
        )
        d = result.to_dict()
        assert d["formula"] == "t = TD * (A / (M^p - 1) + B)"
        assert "intermediate" in d
        assert "M_power_p" in d["intermediate"]


# ---------------------------------------------------------------------------
# IEEE vs IEC difference
# ---------------------------------------------------------------------------


class TestIEEEvsIECDifference:
    def test_ieee_different_from_iec_for_same_inputs(self):
        """IEEE MI and IEC SI produce different tripping times for same M and TMS/TD."""
        iec_params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        ieee_params = IEEECurveParams.get_standard_params(IEEECurveType.MODERATELY_INVERSE)

        iec_result = calculate_iec_tripping_time(
            fault_current_a=500.0,
            pickup_current_a=100.0,
            curve_params=iec_params,
            time_multiplier=1.0,
        )
        ieee_result = calculate_ieee_tripping_time(
            fault_current_a=500.0,
            pickup_current_a=100.0,
            curve_params=ieee_params,
            time_dial=1.0,
        )
        assert iec_result.tripping_time_s != pytest.approx(
            ieee_result.tripping_time_s, abs=0.01
        )


# ---------------------------------------------------------------------------
# generate_ieee_curve_points
# ---------------------------------------------------------------------------


class TestGenerateIEEECurvePoints:
    def test_returns_correct_number_of_points(self):
        params = IEEECurveParams.get_standard_params(IEEECurveType.MODERATELY_INVERSE)
        points = generate_ieee_curve_points(
            curve_params=params,
            pickup_current_a=100.0,
            num_points=30,
        )
        assert len(points) == 30

    def test_points_have_required_keys(self):
        params = IEEECurveParams.get_standard_params(IEEECurveType.MODERATELY_INVERSE)
        points = generate_ieee_curve_points(
            curve_params=params,
            pickup_current_a=100.0,
            num_points=5,
        )
        for pt in points:
            assert "current_a" in pt
            assert "current_multiple" in pt
            assert "time_s" in pt
