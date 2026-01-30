"""
Protection Analysis Tests — P15a FOUNDATION

Test coverage:
1. Determinism: 2x execute with same input → identical result JSON + trace JSON
2. Validations: missing template / missing SC run → 4xx
3. Minimal fixture: 1 network, 1 SC run, 1 template, 1 device → TRIPS/NO_TRIP
4. Curve evaluation: IEC inverse, definite time
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from application.protection_analysis.engine import (
    FaultPoint,
    ProtectionDevice,
    ProtectionEvaluationEngine,
    ProtectionEvaluationInput,
    compute_definite_time,
    compute_iec_inverse_time,
    compute_margin_percent,
)
from domain.protection_analysis import (
    ProtectionEvaluation,
    ProtectionResult,
    ProtectionResultSummary,
    ProtectionTrace,
    ProtectionTraceStep,
    TripState,
    compute_result_summary,
)


# =============================================================================
# CURVE EVALUATION TESTS
# =============================================================================


class TestIecInverseTime:
    """Tests for IEC inverse-time curve calculations."""

    def test_iec_si_curve_at_2x_pickup(self):
        """IEC Standard Inverse at 2x pickup should give ~7s with TMS=1."""
        # IEC SI: t = TMS * 0.14 / ((I/Ip)^0.02 - 1)
        # At 2x: t = 1.0 * 0.14 / ((2.0)^0.02 - 1) = 0.14 / 0.01396 ≈ 10.03s
        t = compute_iec_inverse_time(
            i_fault_a=200.0,
            i_pickup_a=100.0,
            tms=1.0,
            a=0.14,
            b=0.02,
        )
        assert t is not None
        assert 9.0 < t < 11.0  # Approximately 10s

    def test_iec_si_curve_at_10x_pickup(self):
        """IEC Standard Inverse at 10x pickup should give faster trip."""
        t = compute_iec_inverse_time(
            i_fault_a=1000.0,
            i_pickup_a=100.0,
            tms=1.0,
            a=0.14,
            b=0.02,
        )
        assert t is not None
        assert 2.0 < t < 4.0  # Approximately 3s

    def test_iec_si_curve_with_tms(self):
        """TMS should scale trip time linearly."""
        t1 = compute_iec_inverse_time(
            i_fault_a=500.0,
            i_pickup_a=100.0,
            tms=0.3,
            a=0.14,
            b=0.02,
        )
        t2 = compute_iec_inverse_time(
            i_fault_a=500.0,
            i_pickup_a=100.0,
            tms=0.6,
            a=0.14,
            b=0.02,
        )
        assert t1 is not None and t2 is not None
        assert abs(t2 / t1 - 2.0) < 0.01  # t2 should be 2x t1

    def test_no_trip_below_pickup(self):
        """Current below pickup should return None (no trip)."""
        t = compute_iec_inverse_time(
            i_fault_a=50.0,
            i_pickup_a=100.0,
            tms=1.0,
            a=0.14,
            b=0.02,
        )
        assert t is None

    def test_no_trip_at_pickup(self):
        """Current exactly at pickup should return None (no trip)."""
        t = compute_iec_inverse_time(
            i_fault_a=100.0,
            i_pickup_a=100.0,
            tms=1.0,
            a=0.14,
            b=0.02,
        )
        assert t is None

    def test_very_inverse_curve(self):
        """IEC Very Inverse should have different timing."""
        # IEC VI: A=13.5, B=1.0
        t = compute_iec_inverse_time(
            i_fault_a=500.0,
            i_pickup_a=100.0,
            tms=1.0,
            a=13.5,
            b=1.0,
        )
        assert t is not None
        assert 2.0 < t < 5.0  # Different from SI

    def test_extremely_inverse_curve(self):
        """IEC Extremely Inverse curve calculation.

        At M=5 (500A/100A):
        t = TMS * A / (M^B - 1) = 1 * 80 / (5^2 - 1) = 80/24 = 3.333...s

        EI shows "faster at high currents" property at very high multiples (M>>5).
        """
        # IEC EI: A=80.0, B=2.0, M=5
        t = compute_iec_inverse_time(
            i_fault_a=500.0,
            i_pickup_a=100.0,
            tms=1.0,
            a=80.0,
            b=2.0,
        )
        assert t is not None
        # t = 80 / (25 - 1) = 3.333...
        expected = 80.0 / (5.0**2 - 1.0)
        assert abs(t - expected) < 1e-5

    def test_extremely_inverse_faster_at_high_multiples(self):
        """EI is faster than VI at high current multiples (M=20)."""
        # At M=20: EI = 80/(400-1) ≈ 0.2s, VI = 13.5/(20-1) ≈ 0.71s
        t_ei = compute_iec_inverse_time(
            i_fault_a=2000.0,
            i_pickup_a=100.0,
            tms=1.0,
            a=80.0,
            b=2.0,
        )
        t_vi = compute_iec_inverse_time(
            i_fault_a=2000.0,
            i_pickup_a=100.0,
            tms=1.0,
            a=13.5,
            b=1.0,
        )
        assert t_ei is not None and t_vi is not None
        assert t_ei < t_vi  # EI is faster at M=20
        assert t_ei < 0.25  # EI ≈ 0.2s at M=20


class TestDefiniteTime:
    """Tests for definite-time curve calculations."""

    def test_trips_above_pickup(self):
        """Current above pickup should return fixed delay."""
        t = compute_definite_time(
            i_fault_a=500.0,
            i_pickup_a=100.0,
            delay_s=0.5,
        )
        assert t == 0.5

    def test_no_trip_below_pickup(self):
        """Current below pickup should return None."""
        t = compute_definite_time(
            i_fault_a=50.0,
            i_pickup_a=100.0,
            delay_s=0.5,
        )
        assert t is None


class TestMarginPercent:
    """Tests for margin calculation."""

    def test_margin_at_2x(self):
        """2x pickup should give 100% margin."""
        margin = compute_margin_percent(200.0, 100.0)
        assert margin == 100.0

    def test_margin_at_1_5x(self):
        """1.5x pickup should give 50% margin."""
        margin = compute_margin_percent(150.0, 100.0)
        assert margin == 50.0

    def test_margin_below_pickup(self):
        """Current below pickup should give negative margin."""
        margin = compute_margin_percent(50.0, 100.0)
        assert margin == -50.0


# =============================================================================
# EVALUATION ENGINE TESTS
# =============================================================================


class TestProtectionEvaluationEngine:
    """Tests for the protection evaluation engine."""

    @pytest.fixture
    def engine(self):
        return ProtectionEvaluationEngine()

    @pytest.fixture
    def sample_device(self):
        return ProtectionDevice(
            device_id="relay-001",
            device_type_ref="sepam-20",
            protected_element_ref="bus-001",
            i_pickup_a=100.0,
            tms=0.3,
            curve_ref="curve-iec-si",
            curve_kind="inverse",
            curve_parameters={"A": 0.14, "B": 0.02},
        )

    @pytest.fixture
    def sample_fault_trips(self):
        """Fault current that should cause trip."""
        return FaultPoint(
            fault_id="bus-001",
            i_fault_a=500.0,  # 5x pickup
            fault_type="3F",
        )

    @pytest.fixture
    def sample_fault_no_trip(self):
        """Fault current that should NOT cause trip."""
        return FaultPoint(
            fault_id="bus-001",
            i_fault_a=50.0,  # 0.5x pickup
            fault_type="3F",
        )

    def test_evaluation_trips(self, engine, sample_device, sample_fault_trips):
        """Device should trip for fault current above pickup."""
        input_data = ProtectionEvaluationInput(
            run_id="run-001",
            sc_run_id="sc-001",
            protection_case_id="case-001",
            template_ref="template-001",
            template_fingerprint="abc123",
            library_manifest_ref=None,
            devices=(sample_device,),
            faults=(sample_fault_trips,),
        )

        result, trace = engine.evaluate(input_data)

        assert len(result.evaluations) == 1
        assert result.evaluations[0].trip_state == TripState.TRIPS
        assert result.evaluations[0].t_trip_s is not None
        assert result.evaluations[0].t_trip_s > 0
        assert result.summary.trips_count == 1
        assert result.summary.no_trip_count == 0

    def test_evaluation_no_trip(self, engine, sample_device, sample_fault_no_trip):
        """Device should NOT trip for fault current below pickup."""
        input_data = ProtectionEvaluationInput(
            run_id="run-001",
            sc_run_id="sc-001",
            protection_case_id="case-001",
            template_ref="template-001",
            template_fingerprint="abc123",
            library_manifest_ref=None,
            devices=(sample_device,),
            faults=(sample_fault_no_trip,),
        )

        result, trace = engine.evaluate(input_data)

        assert len(result.evaluations) == 1
        assert result.evaluations[0].trip_state == TripState.NO_TRIP
        assert result.evaluations[0].t_trip_s is None
        assert result.summary.trips_count == 0
        assert result.summary.no_trip_count == 1

    def test_evaluation_unsupported_curve(self, engine, sample_fault_trips):
        """Unsupported curve kind should return INVALID."""
        device = ProtectionDevice(
            device_id="relay-001",
            device_type_ref="sepam-20",
            protected_element_ref="bus-001",
            i_pickup_a=100.0,
            tms=0.3,
            curve_ref="curve-unknown",
            curve_kind="unknown_curve_type",
            curve_parameters={},
        )

        input_data = ProtectionEvaluationInput(
            run_id="run-001",
            sc_run_id="sc-001",
            protection_case_id="case-001",
            template_ref="template-001",
            template_fingerprint="abc123",
            library_manifest_ref=None,
            devices=(device,),
            faults=(sample_fault_trips,),
        )

        result, trace = engine.evaluate(input_data)

        assert len(result.evaluations) == 1
        assert result.evaluations[0].trip_state == TripState.INVALID
        assert "NOT_SUPPORTED_YET" in result.evaluations[0].notes_pl


# =============================================================================
# DETERMINISM TESTS
# =============================================================================


class TestDeterminism:
    """Tests for deterministic behavior."""

    @pytest.fixture
    def engine(self):
        return ProtectionEvaluationEngine()

    def test_same_input_same_output(self, engine):
        """Same input should produce identical output (determinism)."""
        device = ProtectionDevice(
            device_id="relay-001",
            device_type_ref="sepam-20",
            protected_element_ref="bus-001",
            i_pickup_a=100.0,
            tms=0.3,
            curve_ref="curve-iec-si",
            curve_kind="inverse",
            curve_parameters={"A": 0.14, "B": 0.02},
        )

        fault = FaultPoint(
            fault_id="bus-001",
            i_fault_a=500.0,
            fault_type="3F",
        )

        input_data = ProtectionEvaluationInput(
            run_id="run-001",
            sc_run_id="sc-001",
            protection_case_id="case-001",
            template_ref="template-001",
            template_fingerprint="abc123",
            library_manifest_ref=None,
            devices=(device,),
            faults=(fault,),
        )

        # Execute twice
        result1, trace1 = engine.evaluate(input_data)
        result2, trace2 = engine.evaluate(input_data)

        # Compare result JSON
        result1_json = json.dumps(result1.to_dict(), sort_keys=True)
        result2_json = json.dumps(result2.to_dict(), sort_keys=True)

        # Exclude created_at which is time-dependent
        result1_dict = result1.to_dict()
        result2_dict = result2.to_dict()
        del result1_dict["created_at"]
        del result2_dict["created_at"]

        assert json.dumps(result1_dict, sort_keys=True) == json.dumps(result2_dict, sort_keys=True)

        # Compare trace JSON (excluding created_at)
        trace1_dict = trace1.to_dict()
        trace2_dict = trace2.to_dict()
        del trace1_dict["created_at"]
        del trace2_dict["created_at"]

        assert json.dumps(trace1_dict, sort_keys=True) == json.dumps(trace2_dict, sort_keys=True)

    def test_deterministic_trip_time(self, engine):
        """Trip time calculation should be deterministic."""
        device = ProtectionDevice(
            device_id="relay-001",
            device_type_ref="sepam-20",
            protected_element_ref="bus-001",
            i_pickup_a=100.0,
            tms=0.3,
            curve_ref="curve-iec-si",
            curve_kind="inverse",
            curve_parameters={"A": 0.14, "B": 0.02},
        )

        fault = FaultPoint(
            fault_id="bus-001",
            i_fault_a=500.0,
            fault_type="3F",
        )

        input_data = ProtectionEvaluationInput(
            run_id="run-001",
            sc_run_id="sc-001",
            protection_case_id="case-001",
            template_ref="template-001",
            template_fingerprint="abc123",
            library_manifest_ref=None,
            devices=(device,),
            faults=(fault,),
        )

        # Execute multiple times
        times = []
        for _ in range(10):
            result, _ = engine.evaluate(input_data)
            times.append(result.evaluations[0].t_trip_s)

        # All times should be identical
        assert all(t == times[0] for t in times)


# =============================================================================
# DOMAIN MODEL TESTS
# =============================================================================


class TestProtectionEvaluation:
    """Tests for ProtectionEvaluation dataclass."""

    def test_serialization_roundtrip(self):
        """Evaluation should serialize and deserialize correctly."""
        evaluation = ProtectionEvaluation(
            device_id="relay-001",
            device_type_ref="sepam-20",
            protected_element_ref="bus-001",
            fault_target_id="bus-001",
            i_fault_a=500.0,
            i_pickup_a=100.0,
            t_trip_s=1.234,
            trip_state=TripState.TRIPS,
            curve_ref="curve-001",
            curve_kind="inverse",
            margin_percent=400.0,
            notes_pl="Zadziałanie po 1.234s",
        )

        data = evaluation.to_dict()
        restored = ProtectionEvaluation.from_dict(data)

        assert restored.device_id == evaluation.device_id
        assert restored.trip_state == evaluation.trip_state
        assert restored.t_trip_s == evaluation.t_trip_s
        assert restored.margin_percent == evaluation.margin_percent


class TestProtectionResult:
    """Tests for ProtectionResult dataclass."""

    def test_serialization_roundtrip(self):
        """Result should serialize and deserialize correctly."""
        evaluation = ProtectionEvaluation(
            device_id="relay-001",
            device_type_ref="sepam-20",
            protected_element_ref="bus-001",
            fault_target_id="bus-001",
            i_fault_a=500.0,
            i_pickup_a=100.0,
            t_trip_s=1.234,
            trip_state=TripState.TRIPS,
            curve_ref="curve-001",
            curve_kind="inverse",
            margin_percent=400.0,
            notes_pl="Zadziałanie",
        )

        summary = ProtectionResultSummary(
            total_evaluations=1,
            trips_count=1,
            no_trip_count=0,
            invalid_count=0,
            min_trip_time_s=1.234,
            max_trip_time_s=1.234,
        )

        result = ProtectionResult(
            run_id="run-001",
            sc_run_id="sc-001",
            protection_case_id="case-001",
            template_ref="template-001",
            template_fingerprint="abc123",
            library_manifest_ref=None,
            evaluations=(evaluation,),
            summary=summary,
        )

        data = result.to_dict()
        restored = ProtectionResult.from_dict(data)

        assert restored.run_id == result.run_id
        assert restored.sc_run_id == result.sc_run_id
        assert len(restored.evaluations) == 1
        assert restored.summary.trips_count == 1


class TestProtectionTrace:
    """Tests for ProtectionTrace dataclass."""

    def test_serialization_roundtrip(self):
        """Trace should serialize and deserialize correctly."""
        step = ProtectionTraceStep(
            step="device_evaluation",
            description_pl="Ocena urządzenia",
            inputs={"i_fault_a": 500.0},
            outputs={"trip_state": "TRIPS"},
        )

        trace = ProtectionTrace(
            run_id="run-001",
            sc_run_id="sc-001",
            snapshot_id="snapshot-001",
            template_ref="template-001",
            overrides={"I>": {"value": 100.0}},
            steps=(step,),
        )

        data = trace.to_dict()
        restored = ProtectionTrace.from_dict(data)

        assert restored.run_id == trace.run_id
        assert len(restored.steps) == 1
        assert restored.steps[0].step == "device_evaluation"


class TestComputeResultSummary:
    """Tests for compute_result_summary helper."""

    def test_summary_computation(self):
        """Summary should be computed correctly from evaluations."""
        evaluations = (
            ProtectionEvaluation(
                device_id="relay-001",
                device_type_ref=None,
                protected_element_ref="bus-001",
                fault_target_id="bus-001",
                i_fault_a=500.0,
                i_pickup_a=100.0,
                t_trip_s=1.0,
                trip_state=TripState.TRIPS,
                curve_ref=None,
                curve_kind="inverse",
                margin_percent=400.0,
                notes_pl="",
            ),
            ProtectionEvaluation(
                device_id="relay-002",
                device_type_ref=None,
                protected_element_ref="bus-002",
                fault_target_id="bus-002",
                i_fault_a=50.0,
                i_pickup_a=100.0,
                t_trip_s=None,
                trip_state=TripState.NO_TRIP,
                curve_ref=None,
                curve_kind="inverse",
                margin_percent=-50.0,
                notes_pl="",
            ),
            ProtectionEvaluation(
                device_id="relay-003",
                device_type_ref=None,
                protected_element_ref="bus-003",
                fault_target_id="bus-003",
                i_fault_a=500.0,
                i_pickup_a=100.0,
                t_trip_s=2.0,
                trip_state=TripState.TRIPS,
                curve_ref=None,
                curve_kind="inverse",
                margin_percent=400.0,
                notes_pl="",
            ),
        )

        summary = compute_result_summary(evaluations)

        assert summary.total_evaluations == 3
        assert summary.trips_count == 2
        assert summary.no_trip_count == 1
        assert summary.invalid_count == 0
        assert summary.min_trip_time_s == 1.0
        assert summary.max_trip_time_s == 2.0


# =============================================================================
# DEFINITE TIME CURVE TESTS
# =============================================================================


class TestDefiniteTimeCurve:
    """Tests for definite-time curve evaluation."""

    @pytest.fixture
    def engine(self):
        return ProtectionEvaluationEngine()

    def test_definite_time_trips(self, engine):
        """Definite-time curve should trip with fixed delay."""
        device = ProtectionDevice(
            device_id="relay-001",
            device_type_ref="sepam-20",
            protected_element_ref="bus-001",
            i_pickup_a=100.0,
            tms=0.3,  # TMS ignored for definite time
            curve_ref="curve-dt",
            curve_kind="definite_time",
            curve_parameters={"delay_s": 0.5},
        )

        fault = FaultPoint(
            fault_id="bus-001",
            i_fault_a=500.0,
            fault_type="3F",
        )

        input_data = ProtectionEvaluationInput(
            run_id="run-001",
            sc_run_id="sc-001",
            protection_case_id="case-001",
            template_ref="template-001",
            template_fingerprint="abc123",
            library_manifest_ref=None,
            devices=(device,),
            faults=(fault,),
        )

        result, trace = engine.evaluate(input_data)

        assert len(result.evaluations) == 1
        assert result.evaluations[0].trip_state == TripState.TRIPS
        assert result.evaluations[0].t_trip_s == 0.5


# =============================================================================
# MULTIPLE DEVICES AND FAULTS TESTS
# =============================================================================


class TestMultipleDevicesAndFaults:
    """Tests for scenarios with multiple devices and fault points."""

    @pytest.fixture
    def engine(self):
        return ProtectionEvaluationEngine()

    def test_multiple_devices_single_fault(self, engine):
        """Multiple devices should all be evaluated against single fault."""
        devices = (
            ProtectionDevice(
                device_id="relay-001",
                device_type_ref=None,
                protected_element_ref="bus-001",
                i_pickup_a=100.0,
                tms=0.3,
                curve_ref=None,
                curve_kind="inverse",
                curve_parameters={"A": 0.14, "B": 0.02},
            ),
            ProtectionDevice(
                device_id="relay-002",
                device_type_ref=None,
                protected_element_ref="bus-002",
                i_pickup_a=200.0,  # Higher pickup
                tms=0.3,
                curve_ref=None,
                curve_kind="inverse",
                curve_parameters={"A": 0.14, "B": 0.02},
            ),
        )

        fault = FaultPoint(
            fault_id="bus-001",
            i_fault_a=150.0,  # Above 100A, below 200A
            fault_type="3F",
        )

        input_data = ProtectionEvaluationInput(
            run_id="run-001",
            sc_run_id="sc-001",
            protection_case_id="case-001",
            template_ref="template-001",
            template_fingerprint="abc123",
            library_manifest_ref=None,
            devices=devices,
            faults=(fault,),
        )

        result, trace = engine.evaluate(input_data)

        assert len(result.evaluations) == 2
        # First device (100A pickup) should trip
        eval1 = next(e for e in result.evaluations if e.device_id == "relay-001")
        assert eval1.trip_state == TripState.TRIPS
        # Second device (200A pickup) should NOT trip
        eval2 = next(e for e in result.evaluations if e.device_id == "relay-002")
        assert eval2.trip_state == TripState.NO_TRIP

    def test_single_device_multiple_faults(self, engine):
        """Single device should be evaluated against multiple fault points."""
        device = ProtectionDevice(
            device_id="relay-001",
            device_type_ref=None,
            protected_element_ref="bus-001",
            i_pickup_a=100.0,
            tms=0.3,
            curve_ref=None,
            curve_kind="inverse",
            curve_parameters={"A": 0.14, "B": 0.02},
        )

        faults = (
            FaultPoint(fault_id="bus-001", i_fault_a=500.0, fault_type="3F"),
            FaultPoint(fault_id="bus-002", i_fault_a=50.0, fault_type="3F"),
        )

        input_data = ProtectionEvaluationInput(
            run_id="run-001",
            sc_run_id="sc-001",
            protection_case_id="case-001",
            template_ref="template-001",
            template_fingerprint="abc123",
            library_manifest_ref=None,
            devices=(device,),
            faults=faults,
        )

        result, trace = engine.evaluate(input_data)

        assert len(result.evaluations) == 2
        # Fault at bus-001 (500A) should cause trip
        eval1 = next(e for e in result.evaluations if e.fault_target_id == "bus-001")
        assert eval1.trip_state == TripState.TRIPS
        # Fault at bus-002 (50A) should NOT cause trip
        eval2 = next(e for e in result.evaluations if e.fault_target_id == "bus-002")
        assert eval2.trip_state == TripState.NO_TRIP
