"""
Tests for protection.curves.curve_calculator module.

Validates the unified curve calculator: point generation, trip time
calculation, coordination analysis, and grading margin logic.
"""

from __future__ import annotations

import pytest

from protection.curves.curve_calculator import (
    CurveStandard,
    CoordinationStatus,
    CurvePoint,
    CurveDefinition,
    CoordinationResult,
    calculate_curve_points,
    calculate_trip_time,
    calculate_grading_margin,
    check_coordination,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_iec_si_curve(
    curve_id: str,
    pickup_a: float,
    tms: float = 1.0,
) -> CurveDefinition:
    return CurveDefinition(
        id=curve_id,
        name_pl=f"Zabezpieczenie {curve_id}",
        standard=CurveStandard.IEC,
        curve_type="SI",
        pickup_current_a=pickup_a,
        time_multiplier=tms,
    )


def _make_ieee_mi_curve(
    curve_id: str,
    pickup_a: float,
    td: float = 1.0,
) -> CurveDefinition:
    return CurveDefinition(
        id=curve_id,
        name_pl=f"Zabezpieczenie {curve_id}",
        standard=CurveStandard.IEEE,
        curve_type="MI",
        pickup_current_a=pickup_a,
        time_multiplier=td,
    )


# ---------------------------------------------------------------------------
# calculate_curve_points
# ---------------------------------------------------------------------------


class TestCalculateCurvePoints:
    def test_returns_list_of_curve_point(self):
        curve = _make_iec_si_curve("relay_1", 100.0)
        points = calculate_curve_points(curve, num_points=10)
        assert isinstance(points, list)
        assert len(points) == 10
        for pt in points:
            assert isinstance(pt, CurvePoint)
            assert pt.current_a > 0
            assert pt.current_multiple > 0
            assert pt.time_s > 0

    def test_iec_curve_points(self):
        curve = _make_iec_si_curve("relay_1", 100.0)
        points = calculate_curve_points(curve, num_points=5)
        assert len(points) == 5
        # Current should increase across points
        currents = [p.current_a for p in points]
        assert currents == sorted(currents)

    def test_ieee_curve_points(self):
        curve = _make_ieee_mi_curve("relay_2", 100.0)
        points = calculate_curve_points(curve, num_points=5)
        assert len(points) == 5

    def test_curve_point_to_dict(self):
        pt = CurvePoint(current_a=200.0, current_multiple=2.0, time_s=1.5)
        d = pt.to_dict()
        assert d == {"current_a": 200.0, "current_multiple": 2.0, "time_s": 1.5}


# ---------------------------------------------------------------------------
# calculate_trip_time
# ---------------------------------------------------------------------------


class TestCalculateTripTime:
    def test_returns_float(self):
        curve = _make_iec_si_curve("relay_1", 100.0)
        trip_time = calculate_trip_time(curve, fault_current_a=500.0)
        assert isinstance(trip_time, float)
        assert trip_time > 0
        assert trip_time < float("inf")

    def test_no_trip_below_pickup(self):
        curve = _make_iec_si_curve("relay_1", 100.0)
        trip_time = calculate_trip_time(curve, fault_current_a=50.0)
        assert trip_time == float("inf")

    def test_ieee_trip_time(self):
        curve = _make_ieee_mi_curve("relay_2", 100.0)
        trip_time = calculate_trip_time(curve, fault_current_a=500.0)
        assert isinstance(trip_time, float)
        assert trip_time > 0

    def test_higher_current_shorter_time(self):
        curve = _make_iec_si_curve("relay_1", 100.0)
        t_low = calculate_trip_time(curve, fault_current_a=200.0)
        t_high = calculate_trip_time(curve, fault_current_a=1000.0)
        assert t_high < t_low


# ---------------------------------------------------------------------------
# check_coordination
# ---------------------------------------------------------------------------


class TestCheckCoordination:
    def test_returns_coordination_result(self):
        upstream = _make_iec_si_curve("upstream", 100.0, tms=0.5)
        downstream = _make_iec_si_curve("downstream", 100.0, tms=0.1)
        result = check_coordination(upstream, downstream)
        assert isinstance(result, CoordinationResult)
        assert result.upstream_curve_id == "upstream"
        assert result.downstream_curve_id == "downstream"

    def test_coordinated_when_margin_sufficient(self):
        """Upstream has higher TMS (slower), downstream has lower TMS (faster)."""
        upstream = _make_iec_si_curve("upstream", 100.0, tms=1.0)
        downstream = _make_iec_si_curve("downstream", 100.0, tms=0.1)
        result = check_coordination(
            upstream, downstream, analysis_current_a=1000.0
        )
        assert result.status == CoordinationStatus.COORDINATED
        assert result.margin_s > 0

    def test_not_coordinated_when_upstream_trips_before_downstream(self):
        """Upstream trips faster than downstream: NOT coordinated."""
        upstream = _make_iec_si_curve("upstream", 100.0, tms=0.1)
        downstream = _make_iec_si_curve("downstream", 100.0, tms=1.0)
        result = check_coordination(
            upstream, downstream, analysis_current_a=1000.0
        )
        assert result.status == CoordinationStatus.NOT_COORDINATED
        assert result.margin_s < 0

    def test_coordination_result_to_dict(self):
        upstream = _make_iec_si_curve("upstream", 100.0, tms=1.0)
        downstream = _make_iec_si_curve("downstream", 100.0, tms=0.1)
        result = check_coordination(upstream, downstream, analysis_current_a=1000.0)
        d = result.to_dict()
        assert "status" in d
        assert "status_pl" in d
        assert "margin_s" in d
        assert "analysis" in d
        assert "recommendation_pl" in d
        assert "min_required_margin_s" in d

    def test_default_analysis_current(self):
        """When no analysis_current_a is given, uses 10x max pickup."""
        upstream = _make_iec_si_curve("upstream", 200.0, tms=1.0)
        downstream = _make_iec_si_curve("downstream", 100.0, tms=0.1)
        result = check_coordination(upstream, downstream)
        assert result.analysis_current_a == pytest.approx(2000.0)

    def test_custom_grading_margin(self):
        upstream = _make_iec_si_curve("upstream", 100.0, tms=1.0)
        downstream = _make_iec_si_curve("downstream", 100.0, tms=0.1)
        result = check_coordination(
            upstream, downstream,
            analysis_current_a=1000.0,
            min_margin_s=0.5,
        )
        assert result.min_required_margin_s == 0.5


# ---------------------------------------------------------------------------
# calculate_grading_margin
# ---------------------------------------------------------------------------


class TestCalculateGradingMargin:
    def test_default_values(self):
        margin = calculate_grading_margin()
        # Default: 0.05 + 0.05 + 0.1 = 0.2
        assert margin == pytest.approx(0.2)

    def test_custom_values(self):
        margin = calculate_grading_margin(
            breaker_time_s=0.08,
            relay_overtravel_s=0.0,
            safety_factor_s=0.15,
        )
        assert margin == pytest.approx(0.23)


# ---------------------------------------------------------------------------
# CoordinationStatus enum
# ---------------------------------------------------------------------------


class TestCoordinationStatus:
    def test_has_coordinated(self):
        assert CoordinationStatus.COORDINATED.value == "COORDINATED"

    def test_has_margin_low(self):
        assert CoordinationStatus.MARGIN_LOW.value == "MARGIN_LOW"

    def test_has_not_coordinated(self):
        assert CoordinationStatus.NOT_COORDINATED.value == "NOT_COORDINATED"

    def test_has_unknown(self):
        assert CoordinationStatus.UNKNOWN.value == "UNKNOWN"
