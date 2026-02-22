"""
Tests for solver_input.contracts module.

Validates the canonical solver-input contract schemas: enums, payloads,
eligibility, provenance, and the versioned envelope.
"""

from __future__ import annotations

import pytest

from solver_input.contracts import (
    SOLVER_INPUT_CONTRACT_VERSION,
    SolverAnalysisType,
    SolverInputIssue,
    SolverInputIssueSeverity,
    EligibilityResult,
    BusPayload,
    BranchPayload,
    TransformerPayload,
    SolverInputEnvelope,
    ProvenanceEntrySchema,
    ProvenanceSummarySchema,
    AnalysisEligibilityEntry,
    EligibilityMap,
)


# ---------------------------------------------------------------------------
# Contract version
# ---------------------------------------------------------------------------


class TestContractVersion:
    def test_contract_version_is_1_0(self):
        assert SOLVER_INPUT_CONTRACT_VERSION == "1.0"


# ---------------------------------------------------------------------------
# SolverAnalysisType enum
# ---------------------------------------------------------------------------


class TestSolverAnalysisType:
    def test_has_short_circuit_3f(self):
        assert SolverAnalysisType.SHORT_CIRCUIT_3F.value == "short_circuit_3f"

    def test_has_short_circuit_1f(self):
        assert SolverAnalysisType.SHORT_CIRCUIT_1F.value == "short_circuit_1f"

    def test_has_load_flow(self):
        assert SolverAnalysisType.LOAD_FLOW.value == "load_flow"

    def test_has_protection(self):
        assert SolverAnalysisType.PROTECTION.value == "protection"

    def test_all_expected_values(self):
        expected = {"short_circuit_3f", "short_circuit_1f", "load_flow", "protection"}
        actual = {t.value for t in SolverAnalysisType}
        assert actual == expected


# ---------------------------------------------------------------------------
# SolverInputIssue
# ---------------------------------------------------------------------------


class TestSolverInputIssue:
    def test_create_with_all_fields(self):
        issue = SolverInputIssue(
            code="E-D01",
            severity=SolverInputIssueSeverity.BLOCKER,
            message="No SLACK node in network",
            element_ref="bus_1",
            field_path="buses[ref_id=bus_1].node_type",
        )
        assert issue.code == "E-D01"
        assert issue.severity == SolverInputIssueSeverity.BLOCKER
        assert issue.message == "No SLACK node in network"
        assert issue.element_ref == "bus_1"
        assert issue.field_path == "buses[ref_id=bus_1].node_type"

    def test_create_with_required_fields_only(self):
        issue = SolverInputIssue(
            code="SI-001",
            severity=SolverInputIssueSeverity.WARNING,
            message="Branch without catalog_ref",
        )
        assert issue.code == "SI-001"
        assert issue.element_ref is None
        assert issue.field_path is None

    def test_is_frozen(self):
        issue = SolverInputIssue(
            code="E-D01",
            severity=SolverInputIssueSeverity.BLOCKER,
            message="Test",
        )
        with pytest.raises(Exception):
            issue.code = "changed"  # type: ignore[misc]


# ---------------------------------------------------------------------------
# EligibilityResult
# ---------------------------------------------------------------------------


class TestEligibilityResult:
    def test_eligible_true_with_empty_blockers(self):
        result = EligibilityResult(eligible=True)
        assert result.eligible is True
        assert result.blockers == []
        assert result.warnings == []
        assert result.infos == []

    def test_eligible_false_with_blockers(self):
        blocker = SolverInputIssue(
            code="E-D01",
            severity=SolverInputIssueSeverity.BLOCKER,
            message="No SLACK node",
        )
        result = EligibilityResult(eligible=False, blockers=[blocker])
        assert result.eligible is False
        assert len(result.blockers) == 1
        assert result.blockers[0].code == "E-D01"

    def test_is_frozen(self):
        result = EligibilityResult(eligible=True)
        with pytest.raises(Exception):
            result.eligible = False  # type: ignore[misc]


# ---------------------------------------------------------------------------
# Payload schemas
# ---------------------------------------------------------------------------


class TestBusPayload:
    def test_create_bus_payload(self):
        bus = BusPayload(
            ref_id="bus_1",
            name="GPZ Centrum",
            node_type="SLACK",
            voltage_level_kv=110.0,
            voltage_magnitude_pu=1.0,
            voltage_angle_rad=0.0,
        )
        assert bus.ref_id == "bus_1"
        assert bus.name == "GPZ Centrum"
        assert bus.node_type == "SLACK"
        assert bus.voltage_level_kv == 110.0
        assert bus.voltage_magnitude_pu == 1.0
        assert bus.voltage_angle_rad == 0.0

    def test_optional_fields_default_none(self):
        bus = BusPayload(
            ref_id="bus_2",
            name="Load Bus",
            node_type="PQ",
            voltage_level_kv=15.0,
        )
        assert bus.voltage_magnitude_pu is None
        assert bus.voltage_angle_rad is None
        assert bus.active_power_mw is None
        assert bus.reactive_power_mvar is None


class TestBranchPayload:
    def test_create_branch_payload(self):
        branch = BranchPayload(
            ref_id="line_1",
            name="Linia 1",
            branch_type="LINE",
            from_bus_ref="bus_1",
            to_bus_ref="bus_2",
            r_ohm_per_km=0.161,
            x_ohm_per_km=0.190,
            b_us_per_km=3.306,
            length_km=5.0,
            rated_current_a=400.0,
        )
        assert branch.ref_id == "line_1"
        assert branch.branch_type == "LINE"
        assert branch.in_service is True
        assert branch.catalog_ref is None

    def test_is_frozen(self):
        branch = BranchPayload(
            ref_id="line_1",
            name="L1",
            branch_type="LINE",
            from_bus_ref="b1",
            to_bus_ref="b2",
            r_ohm_per_km=0.1,
            x_ohm_per_km=0.1,
            b_us_per_km=0.0,
            length_km=1.0,
            rated_current_a=100.0,
        )
        with pytest.raises(Exception):
            branch.ref_id = "changed"  # type: ignore[misc]


class TestTransformerPayload:
    def test_create_transformer_payload(self):
        trafo = TransformerPayload(
            ref_id="trafo_1",
            name="Transformator T1",
            from_bus_ref="bus_hv",
            to_bus_ref="bus_lv",
            rated_power_mva=25.0,
            voltage_hv_kv=110.0,
            voltage_lv_kv=15.0,
            uk_percent=10.0,
            pk_kw=120.0,
            i0_percent=0.3,
            p0_kw=25.0,
            vector_group="Dyn11",
            tap_position=0,
            tap_step_percent=2.5,
        )
        assert trafo.ref_id == "trafo_1"
        assert trafo.rated_power_mva == 25.0
        assert trafo.voltage_hv_kv == 110.0
        assert trafo.voltage_lv_kv == 15.0
        assert trafo.uk_percent == 10.0
        assert trafo.vector_group == "Dyn11"
        assert trafo.in_service is True
        assert trafo.catalog_ref is None


# ---------------------------------------------------------------------------
# SolverInputEnvelope
# ---------------------------------------------------------------------------


class TestSolverInputEnvelope:
    def test_create_valid_envelope(self):
        eligibility = EligibilityResult(eligible=True)
        envelope = SolverInputEnvelope(
            case_id="case-001",
            enm_revision="rev-abc",
            analysis_type=SolverAnalysisType.SHORT_CIRCUIT_3F,
            eligibility=eligibility,
        )
        assert envelope.solver_input_version == "1.0"
        assert envelope.case_id == "case-001"
        assert envelope.enm_revision == "rev-abc"
        assert envelope.analysis_type == SolverAnalysisType.SHORT_CIRCUIT_3F
        assert envelope.eligibility.eligible is True
        assert envelope.payload == {}
        assert envelope.trace == []

    def test_envelope_with_provenance_summary(self):
        eligibility = EligibilityResult(eligible=True)
        summary = ProvenanceSummarySchema(
            catalog_refs_used=["cable_YAKXS_120"],
            overrides_used_count=1,
            overrides_used_refs=["line_1"],
            derived_fields_count=2,
        )
        envelope = SolverInputEnvelope(
            case_id="case-002",
            enm_revision="rev-def",
            analysis_type=SolverAnalysisType.LOAD_FLOW,
            eligibility=eligibility,
            provenance_summary=summary,
        )
        assert envelope.provenance_summary.catalog_refs_used == ["cable_YAKXS_120"]
        assert envelope.provenance_summary.overrides_used_count == 1

    def test_envelope_is_frozen(self):
        eligibility = EligibilityResult(eligible=True)
        envelope = SolverInputEnvelope(
            case_id="case-001",
            enm_revision="rev-abc",
            analysis_type=SolverAnalysisType.SHORT_CIRCUIT_3F,
            eligibility=eligibility,
        )
        with pytest.raises(Exception):
            envelope.case_id = "changed"  # type: ignore[misc]


# ---------------------------------------------------------------------------
# EligibilityMap
# ---------------------------------------------------------------------------


class TestEligibilityMap:
    def test_create_eligibility_map(self):
        entry = AnalysisEligibilityEntry(
            analysis_type=SolverAnalysisType.LOAD_FLOW,
            eligible=True,
        )
        emap = EligibilityMap(entries=[entry])
        assert len(emap.entries) == 1
        assert emap.entries[0].analysis_type == SolverAnalysisType.LOAD_FLOW
        assert emap.entries[0].eligible is True

    def test_empty_eligibility_map(self):
        emap = EligibilityMap()
        assert emap.entries == []
