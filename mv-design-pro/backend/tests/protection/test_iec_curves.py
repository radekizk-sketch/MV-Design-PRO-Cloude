"""
Tests for protection.curves.iec_curves module.

Validates IEC 60255-151 curve types, standard parameters, tripping time
calculations, and curve point generation.
"""

from __future__ import annotations

import math

import pytest

from protection.curves.iec_curves import (
    IECCurveType,
    IECCurveParams,
    IECTrippingResult,
    calculate_iec_tripping_time,
    generate_iec_curve_points,
)


# ---------------------------------------------------------------------------
# IECCurveType enum
# ---------------------------------------------------------------------------


class TestIECCurveType:
    def test_has_si(self):
        assert IECCurveType.STANDARD_INVERSE.value == "SI"

    def test_has_vi(self):
        assert IECCurveType.VERY_INVERSE.value == "VI"

    def test_has_ei(self):
        assert IECCurveType.EXTREMELY_INVERSE.value == "EI"

    def test_has_lti(self):
        assert IECCurveType.LONG_TIME_INVERSE.value == "LTI"

    def test_has_dt(self):
        assert IECCurveType.DEFINITE_TIME.value == "DT"

    def test_all_expected_values(self):
        expected = {"SI", "VI", "EI", "LTI", "DT"}
        actual = {ct.value for ct in IECCurveType}
        assert actual == expected


# ---------------------------------------------------------------------------
# IECCurveParams
# ---------------------------------------------------------------------------


class TestIECCurveParams:
    def test_get_standard_params_si(self):
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        assert params.curve_type == IECCurveType.STANDARD_INVERSE
        assert params.a == 0.14
        assert params.b == 0.02
        assert params.c == 0.0

    def test_get_standard_params_vi(self):
        params = IECCurveParams.get_standard_params(IECCurveType.VERY_INVERSE)
        assert params.a == 13.5
        assert params.b == 1.0

    def test_get_standard_params_ei(self):
        params = IECCurveParams.get_standard_params(IECCurveType.EXTREMELY_INVERSE)
        assert params.a == 80.0
        assert params.b == 2.0

    def test_get_standard_params_lti(self):
        params = IECCurveParams.get_standard_params(IECCurveType.LONG_TIME_INVERSE)
        assert params.a == 120.0
        assert params.b == 1.0

    def test_get_standard_params_dt(self):
        params = IECCurveParams.get_standard_params(IECCurveType.DEFINITE_TIME)
        assert params.a == 0.0
        assert params.b == 0.0
        assert params.c == 0.0

    def test_is_frozen(self):
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        with pytest.raises(AttributeError):
            params.a = 999.0  # type: ignore[misc]

    def test_to_dict(self):
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        d = params.to_dict()
        assert d["curve_type"] == "SI"
        assert d["a"] == 0.14
        assert d["b"] == 0.02
        assert d["c"] == 0.0
        assert d["standard"] == "IEC 60255-151:2009"


# ---------------------------------------------------------------------------
# calculate_iec_tripping_time
# ---------------------------------------------------------------------------


class TestCalculateIECTrippingTime:
    def test_si_curve_known_values(self):
        """Verify SI curve tripping time for known input.

        For SI curve: t = TMS * (0.14 / (M^0.02 - 1))
        M = 5.0 (fault = 500A, pickup = 100A), TMS = 1.0
        M^0.02 = 5.0^0.02 = 1.03274...
        denominator = 0.03274...
        t = 1.0 * (0.14 / 0.03274...) = 4.276...s
        """
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        result = calculate_iec_tripping_time(
            fault_current_a=500.0,
            pickup_current_a=100.0,
            curve_params=params,
            time_multiplier=1.0,
        )
        assert result.will_trip is True
        assert result.current_multiple == pytest.approx(5.0)
        # Expected: t = 0.14 / (5^0.02 - 1)
        expected_m_b = math.pow(5.0, 0.02)
        expected_denom = expected_m_b - 1.0
        expected_time = 0.14 / expected_denom
        assert result.tripping_time_s == pytest.approx(expected_time, rel=1e-4)

    def test_will_trip_false_when_m_less_than_1(self):
        """When fault current < pickup current, relay should not trip."""
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        result = calculate_iec_tripping_time(
            fault_current_a=50.0,
            pickup_current_a=100.0,
            curve_params=params,
        )
        assert result.will_trip is False
        assert result.tripping_time_s == float("inf")
        assert result.current_multiple == pytest.approx(0.5)

    def test_will_trip_false_when_m_equals_1(self):
        """When fault current == pickup current, relay should not trip (M not > 1)."""
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        result = calculate_iec_tripping_time(
            fault_current_a=100.0,
            pickup_current_a=100.0,
            curve_params=params,
        )
        assert result.will_trip is False

    def test_dt_curve_returns_definite_time(self):
        params = IECCurveParams.get_standard_params(IECCurveType.DEFINITE_TIME)
        result = calculate_iec_tripping_time(
            fault_current_a=500.0,
            pickup_current_a=100.0,
            curve_params=params,
            definite_time_s=0.5,
        )
        assert result.will_trip is True
        assert result.tripping_time_s == 0.5

    def test_dt_curve_default_time(self):
        params = IECCurveParams.get_standard_params(IECCurveType.DEFINITE_TIME)
        result = calculate_iec_tripping_time(
            fault_current_a=500.0,
            pickup_current_a=100.0,
            curve_params=params,
        )
        assert result.will_trip is True
        assert result.tripping_time_s == 0.1  # default definite time

    def test_raises_for_zero_pickup_current(self):
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        with pytest.raises(ValueError, match="Pickup current must be positive"):
            calculate_iec_tripping_time(
                fault_current_a=500.0,
                pickup_current_a=0.0,
                curve_params=params,
            )

    def test_raises_for_negative_pickup_current(self):
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        with pytest.raises(ValueError, match="Pickup current must be positive"):
            calculate_iec_tripping_time(
                fault_current_a=500.0,
                pickup_current_a=-10.0,
                curve_params=params,
            )

    def test_tms_scaling(self):
        """Doubling TMS should approximately double the tripping time."""
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        result_tms1 = calculate_iec_tripping_time(
            fault_current_a=500.0,
            pickup_current_a=100.0,
            curve_params=params,
            time_multiplier=1.0,
        )
        result_tms2 = calculate_iec_tripping_time(
            fault_current_a=500.0,
            pickup_current_a=100.0,
            curve_params=params,
            time_multiplier=2.0,
        )
        assert result_tms2.tripping_time_s == pytest.approx(
            result_tms1.tripping_time_s * 2.0, rel=1e-4
        )

    def test_white_box_intermediate_values(self):
        """Verify that intermediate calculation values are exposed."""
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        result = calculate_iec_tripping_time(
            fault_current_a=500.0,
            pickup_current_a=100.0,
            curve_params=params,
        )
        assert result.m_power_b > 0
        assert result.denominator > 0
        assert result.numerator == 0.14
        assert result.base_time_s > 0

    def test_result_to_dict(self):
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        result = calculate_iec_tripping_time(
            fault_current_a=500.0,
            pickup_current_a=100.0,
            curve_params=params,
        )
        d = result.to_dict()
        assert "tripping_time_s" in d
        assert "will_trip" in d
        assert "intermediate" in d
        assert d["formula"] == "t = TMS * (A / (M^B - 1)) + C"


# ---------------------------------------------------------------------------
# generate_iec_curve_points
# ---------------------------------------------------------------------------


class TestGenerateIECCurvePoints:
    def test_returns_correct_number_of_points(self):
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        points = generate_iec_curve_points(
            curve_params=params,
            pickup_current_a=100.0,
            num_points=50,
        )
        assert len(points) == 50

    def test_default_100_points(self):
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        points = generate_iec_curve_points(
            curve_params=params,
            pickup_current_a=100.0,
        )
        assert len(points) == 100

    def test_points_have_required_keys(self):
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        points = generate_iec_curve_points(
            curve_params=params,
            pickup_current_a=100.0,
            num_points=5,
        )
        for pt in points:
            assert "current_a" in pt
            assert "current_multiple" in pt
            assert "time_s" in pt

    def test_points_are_monotonic_in_current(self):
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        points = generate_iec_curve_points(
            curve_params=params,
            pickup_current_a=100.0,
            num_points=20,
        )
        currents = [p["current_a"] for p in points]
        assert currents == sorted(currents)

    def test_higher_current_gives_lower_trip_time(self):
        """For inverse-time curves, higher M means shorter trip time."""
        params = IECCurveParams.get_standard_params(IECCurveType.STANDARD_INVERSE)
        points = generate_iec_curve_points(
            curve_params=params,
            pickup_current_a=100.0,
            num_points=10,
        )
        times = [p["time_s"] for p in points]
        # Trip times should generally decrease with increasing current
        assert times[0] > times[-1]

    def test_dt_curve_constant_time(self):
        params = IECCurveParams.get_standard_params(IECCurveType.DEFINITE_TIME)
        points = generate_iec_curve_points(
            curve_params=params,
            pickup_current_a=100.0,
            definite_time_s=0.5,
            num_points=10,
        )
        for pt in points:
            assert pt["time_s"] == pytest.approx(0.5)
