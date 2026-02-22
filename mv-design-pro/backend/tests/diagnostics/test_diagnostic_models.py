"""
Tests for diagnostics.models module.

Validates diagnostic data models: severity enum, frozen issues,
report serialization, and analysis matrix lookups.
"""

from __future__ import annotations

import pytest

from diagnostics.models import (
    DiagnosticSeverity,
    DiagnosticStatus,
    DiagnosticIssue,
    DiagnosticReport,
    AnalysisType,
    AnalysisAvailability,
    AnalysisMatrixEntry,
    AnalysisMatrix,
)


# ---------------------------------------------------------------------------
# DiagnosticSeverity enum
# ---------------------------------------------------------------------------


class TestDiagnosticSeverity:
    def test_has_blocker(self):
        assert DiagnosticSeverity.BLOCKER.value == "BLOCKER"

    def test_has_warn(self):
        assert DiagnosticSeverity.WARN.value == "WARN"

    def test_has_info(self):
        assert DiagnosticSeverity.INFO.value == "INFO"

    def test_all_expected_values(self):
        expected = {"BLOCKER", "WARN", "INFO"}
        actual = {s.value for s in DiagnosticSeverity}
        assert actual == expected


# ---------------------------------------------------------------------------
# DiagnosticIssue (frozen)
# ---------------------------------------------------------------------------


class TestDiagnosticIssue:
    def test_create_issue(self):
        issue = DiagnosticIssue(
            code="E-D01",
            severity=DiagnosticSeverity.BLOCKER,
            message_pl="Brak zrodla zasilania",
            affected_refs=("bus_1", "bus_2"),
            hints=("Dodaj szyne SLACK",),
        )
        assert issue.code == "E-D01"
        assert issue.severity == DiagnosticSeverity.BLOCKER
        assert issue.message_pl == "Brak zrodla zasilania"
        assert issue.affected_refs == ("bus_1", "bus_2")
        assert issue.hints == ("Dodaj szyne SLACK",)

    def test_is_frozen(self):
        issue = DiagnosticIssue(
            code="E-D01",
            severity=DiagnosticSeverity.BLOCKER,
            message_pl="Test",
        )
        with pytest.raises(AttributeError):
            issue.code = "changed"  # type: ignore[misc]

    def test_default_empty_tuples(self):
        issue = DiagnosticIssue(
            code="I-D01",
            severity=DiagnosticSeverity.INFO,
            message_pl="Info message",
        )
        assert issue.affected_refs == ()
        assert issue.hints == ()

    def test_to_dict(self):
        issue = DiagnosticIssue(
            code="W-D02",
            severity=DiagnosticSeverity.WARN,
            message_pl="Parametry graniczne",
            affected_refs=("line_1",),
            hints=("Sprawdz poprawnosc",),
        )
        d = issue.to_dict()
        assert d["code"] == "W-D02"
        assert d["severity"] == "WARN"
        assert d["message_pl"] == "Parametry graniczne"
        assert d["affected_refs"] == ["line_1"]
        assert d["hints"] == ["Sprawdz poprawnosc"]


# ---------------------------------------------------------------------------
# DiagnosticReport
# ---------------------------------------------------------------------------


class TestDiagnosticReport:
    def test_to_dict_produces_valid_dict(self):
        blocker = DiagnosticIssue(
            code="E-D01",
            severity=DiagnosticSeverity.BLOCKER,
            message_pl="Brak zrodla",
        )
        warning = DiagnosticIssue(
            code="W-D01",
            severity=DiagnosticSeverity.WARN,
            message_pl="Brak Z0",
        )
        info = DiagnosticIssue(
            code="I-D01",
            severity=DiagnosticSeverity.INFO,
            message_pl="Analizy dostepne",
        )
        report = DiagnosticReport(
            status=DiagnosticStatus.FAIL,
            issues=(blocker, warning, info),
        )
        d = report.to_dict()
        assert isinstance(d, dict)
        assert d["status"] == "FAIL"
        assert isinstance(d["issues"], list)
        assert len(d["issues"]) == 3
        assert d["blocker_count"] == 1
        assert d["warning_count"] == 1
        assert d["info_count"] == 1

    def test_blockers_property(self):
        blocker = DiagnosticIssue(
            code="E-D01",
            severity=DiagnosticSeverity.BLOCKER,
            message_pl="Test blocker",
        )
        info = DiagnosticIssue(
            code="I-D01",
            severity=DiagnosticSeverity.INFO,
            message_pl="Test info",
        )
        report = DiagnosticReport(
            status=DiagnosticStatus.FAIL,
            issues=(blocker, info),
        )
        assert len(report.blockers) == 1
        assert report.blockers[0].code == "E-D01"
        assert len(report.infos) == 1
        assert len(report.warnings) == 0

    def test_report_ok_status(self):
        report = DiagnosticReport(status=DiagnosticStatus.OK)
        d = report.to_dict()
        assert d["status"] == "OK"
        assert d["blocker_count"] == 0

    def test_report_is_frozen(self):
        report = DiagnosticReport(status=DiagnosticStatus.OK)
        with pytest.raises(AttributeError):
            report.status = DiagnosticStatus.FAIL  # type: ignore[misc]


# ---------------------------------------------------------------------------
# AnalysisMatrix
# ---------------------------------------------------------------------------


class TestAnalysisMatrix:
    def test_get_returns_correct_entry(self):
        entry_sc3f = AnalysisMatrixEntry(
            analysis_type=AnalysisType.SC_3F,
            availability=AnalysisAvailability.AVAILABLE,
        )
        entry_lf = AnalysisMatrixEntry(
            analysis_type=AnalysisType.LF,
            availability=AnalysisAvailability.BLOCKED,
            reason_pl="Brak zrodla",
            blocking_codes=("E-D01",),
        )
        matrix = AnalysisMatrix(entries=(entry_sc3f, entry_lf))

        result = matrix.get(AnalysisType.SC_3F)
        assert result is not None
        assert result.availability == AnalysisAvailability.AVAILABLE

        result_lf = matrix.get(AnalysisType.LF)
        assert result_lf is not None
        assert result_lf.availability == AnalysisAvailability.BLOCKED
        assert result_lf.reason_pl == "Brak zrodla"

    def test_get_returns_none_for_missing(self):
        matrix = AnalysisMatrix()
        result = matrix.get(AnalysisType.PROTECTION)
        assert result is None

    def test_to_dict(self):
        entry = AnalysisMatrixEntry(
            analysis_type=AnalysisType.SC_3F,
            availability=AnalysisAvailability.AVAILABLE,
        )
        matrix = AnalysisMatrix(entries=(entry,))
        d = matrix.to_dict()
        assert "entries" in d
        assert len(d["entries"]) == 1
        assert d["entries"][0]["analysis_type"] == "SC_3F"
        assert d["entries"][0]["availability"] == "AVAILABLE"

    def test_matrix_entry_is_frozen(self):
        entry = AnalysisMatrixEntry(
            analysis_type=AnalysisType.SC_3F,
            availability=AnalysisAvailability.AVAILABLE,
        )
        with pytest.raises(AttributeError):
            entry.availability = AnalysisAvailability.BLOCKED  # type: ignore[misc]
