"""Readiness Gate tests — RUN #3E §3 + RUN #3I §I4.

Tests that readiness gates block operations when BLOCKERs exist.
BINDING: any failure blocks merge.
"""

import pytest

from domain.readiness import (
    ReadinessAreaV1,
    ReadinessGateError,
    ReadinessIssueV1,
    ReadinessPriority,
    build_readiness_profile,
    overrides_issues_from_validation,
    require_export_ready,
    require_load_flow_ready,
    require_overrides_valid,
    require_short_circuit_ready,
    require_sld_ready,
)


def _make_issue(
    code: str,
    area: ReadinessAreaV1,
    priority: ReadinessPriority = ReadinessPriority.BLOCKER,
) -> ReadinessIssueV1:
    return ReadinessIssueV1(
        code=code,
        area=area,
        priority=priority,
        message_pl=f"Test issue: {code}",
        element_id="elem_001",
    )


class TestSldReadinessGate:
    """SLD gate blocks when TOPOLOGY/STATIONS/GENERATORS have BLOCKERs."""

    def test_sld_ready_passes(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[],
        )
        require_sld_ready(profile)  # Should not raise

    def test_sld_blocked_by_topology(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[_make_issue("topo.missing", ReadinessAreaV1.TOPOLOGY)],
        )
        with pytest.raises(ReadinessGateError) as exc_info:
            require_sld_ready(profile)
        assert exc_info.value.gate == "sld_ready"
        assert len(exc_info.value.blockers) == 1

    def test_sld_blocked_by_generators(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[_make_issue("gen.variant_missing", ReadinessAreaV1.GENERATORS)],
        )
        with pytest.raises(ReadinessGateError):
            require_sld_ready(profile)

    def test_sld_not_blocked_by_catalogs(self) -> None:
        """Catalog issues don't block SLD rendering."""
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[_make_issue("cat.missing", ReadinessAreaV1.CATALOGS)],
        )
        # SLD should still be ready — catalogs don't block SLD
        assert profile.sld_ready is True
        require_sld_ready(profile)  # Should not raise

    def test_sld_warning_does_not_block(self) -> None:
        """WARNING issues don't block SLD."""
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[
                _make_issue(
                    "topo.warn",
                    ReadinessAreaV1.TOPOLOGY,
                    ReadinessPriority.WARNING,
                ),
            ],
        )
        require_sld_ready(profile)  # Should not raise


class TestShortCircuitReadinessGate:
    """Short circuit gate blocks when TOPOLOGY/SOURCES/CATALOGS have BLOCKERs."""

    def test_sc_ready_passes(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[],
        )
        require_short_circuit_ready(profile)

    def test_sc_blocked_by_sources(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[_make_issue("src.missing", ReadinessAreaV1.SOURCES)],
        )
        with pytest.raises(ReadinessGateError) as exc_info:
            require_short_circuit_ready(profile)
        assert exc_info.value.gate == "short_circuit_ready"

    def test_sc_blocked_by_catalogs(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[_make_issue("cat.missing", ReadinessAreaV1.CATALOGS)],
        )
        with pytest.raises(ReadinessGateError):
            require_short_circuit_ready(profile)


class TestLoadFlowReadinessGate:
    """Load flow gate blocks when TOPOLOGY/SOURCES/CATALOGS have BLOCKERs."""

    def test_lf_ready_passes(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[],
        )
        require_load_flow_ready(profile)

    def test_lf_blocked_by_topology(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[_make_issue("topo.missing", ReadinessAreaV1.TOPOLOGY)],
        )
        with pytest.raises(ReadinessGateError):
            require_load_flow_ready(profile)


class TestExportReadinessGate:
    """Export gate blocks when ANY BLOCKERs exist."""

    def test_export_ready_passes(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[],
        )
        require_export_ready(profile)

    def test_export_blocked_by_any_blocker(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[_make_issue("protection.missing", ReadinessAreaV1.PROTECTION)],
        )
        with pytest.raises(ReadinessGateError) as exc_info:
            require_export_ready(profile)
        assert exc_info.value.gate == "export_ready"

    def test_export_warnings_do_not_block(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[
                _make_issue("warn.1", ReadinessAreaV1.ANALYSIS, ReadinessPriority.WARNING),
                _make_issue("info.1", ReadinessAreaV1.ANALYSIS, ReadinessPriority.INFO),
            ],
        )
        require_export_ready(profile)  # Should not raise

    def test_export_multiple_blockers(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[
                _make_issue("topo.1", ReadinessAreaV1.TOPOLOGY),
                _make_issue("cat.1", ReadinessAreaV1.CATALOGS),
                _make_issue("gen.1", ReadinessAreaV1.GENERATORS),
            ],
        )
        with pytest.raises(ReadinessGateError) as exc_info:
            require_export_ready(profile)
        assert len(exc_info.value.blockers) == 3


class TestReadinessGateErrorMessage:
    """ReadinessGateError contains useful diagnostic info."""

    def test_error_message_contains_gate_name(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[_make_issue("test.code", ReadinessAreaV1.TOPOLOGY)],
        )
        with pytest.raises(ReadinessGateError) as exc_info:
            require_sld_ready(profile)
        assert "sld_ready" in str(exc_info.value)
        assert "test.code" in str(exc_info.value)


# =============================================================================
# RUN #3I §I4: Overrides validation gate
# =============================================================================


class TestOverridesValidGate:
    """require_overrides_valid blocks when geometry.override_* BLOCKERs exist."""

    def test_passes_when_no_override_issues(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[],
        )
        require_overrides_valid(profile)  # should not raise

    def test_passes_with_non_override_blockers(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[_make_issue("topology.missing_bus", ReadinessAreaV1.TOPOLOGY)],
        )
        require_overrides_valid(profile)  # should not raise

    def test_blocks_on_override_invalid_element(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[
                _make_issue(
                    "geometry.override_invalid_element",
                    ReadinessAreaV1.STATIONS,
                ),
            ],
        )
        with pytest.raises(ReadinessGateError) as exc_info:
            require_overrides_valid(profile)
        assert exc_info.value.gate == "overrides_valid"
        assert len(exc_info.value.blockers) == 1

    def test_blocks_on_override_causes_collision(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[
                _make_issue(
                    "geometry.override_causes_collision",
                    ReadinessAreaV1.STATIONS,
                ),
            ],
        )
        with pytest.raises(ReadinessGateError):
            require_overrides_valid(profile)

    def test_ignores_override_warnings(self) -> None:
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=[
                _make_issue(
                    "geometry.override_invalid_element",
                    ReadinessAreaV1.STATIONS,
                    ReadinessPriority.WARNING,
                ),
            ],
        )
        require_overrides_valid(profile)  # should not raise


class TestOverridesIssuesToReadiness:
    """overrides_issues_from_validation converts errors to ReadinessIssueV1."""

    def test_converts_single_error(self) -> None:
        errors = [
            {
                "element_id": "node-1",
                "code": "geometry.override_invalid_element",
                "message": "Element nie istnieje",
            }
        ]
        issues = overrides_issues_from_validation(errors)
        assert len(issues) == 1
        assert issues[0].code == "geometry.override_invalid_element"
        assert issues[0].area == ReadinessAreaV1.STATIONS
        assert issues[0].priority == ReadinessPriority.BLOCKER
        assert issues[0].element_id == "node-1"
        assert issues[0].element_type == "override"

    def test_converts_multiple_errors(self) -> None:
        errors = [
            {"element_id": "n1", "code": "geometry.override_invalid_element", "message": "m1"},
            {"element_id": "n2", "code": "geometry.override_causes_collision", "message": "m2"},
        ]
        issues = overrides_issues_from_validation(errors)
        assert len(issues) == 2

    def test_empty_list(self) -> None:
        issues = overrides_issues_from_validation([])
        assert issues == []

    def test_integration_with_readiness_profile(self) -> None:
        """Override issues integrate into readiness profile and block gate."""
        errors = [
            {"element_id": "n1", "code": "geometry.override_invalid_element", "message": "m1"},
        ]
        override_issues = overrides_issues_from_validation(errors)
        profile = build_readiness_profile(
            snapshot_id="s1",
            snapshot_fingerprint="fp1",
            issues=override_issues,
        )
        with pytest.raises(ReadinessGateError) as exc_info:
            require_overrides_valid(profile)
        assert exc_info.value.gate == "overrides_valid"
