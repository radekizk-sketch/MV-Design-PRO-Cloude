"""
Tests for diagnostics.engine module.

Validates the DiagnosticEngine: report generation, severity sorting,
overall status determination, and analysis matrix computation.
"""

from __future__ import annotations

import pytest

from network_model.core.graph import NetworkGraph
from network_model.core.node import Node, NodeType
from network_model.core.branch import LineBranch, BranchType

from diagnostics.engine import DiagnosticEngine
from diagnostics.models import (
    DiagnosticReport,
    DiagnosticSeverity,
    DiagnosticStatus,
    AnalysisAvailability,
    AnalysisType,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_slack_node(node_id: str = "bus_slack") -> Node:
    return Node(
        id=node_id,
        name="GPZ",
        node_type=NodeType.SLACK,
        voltage_level=110.0,
        voltage_magnitude=1.0,
        voltage_angle=0.0,
    )


def _make_pq_node(node_id: str = "bus_pq", voltage_kv: float = 110.0) -> Node:
    return Node(
        id=node_id,
        name="Load",
        node_type=NodeType.PQ,
        voltage_level=voltage_kv,
        active_power=5.0,
        reactive_power=2.0,
    )


def _make_line(
    branch_id: str,
    from_id: str,
    to_id: str,
    r: float = 0.161,
    x: float = 0.190,
    type_ref: str | None = "cable_YAKXS_120",
) -> LineBranch:
    return LineBranch(
        id=branch_id,
        name=f"Line {branch_id}",
        branch_type=BranchType.LINE,
        from_node_id=from_id,
        to_node_id=to_id,
        r_ohm_per_km=r,
        x_ohm_per_km=x,
        b_us_per_km=3.306,
        length_km=5.0,
        rated_current_a=400.0,
        type_ref=type_ref,
    )


def _build_valid_graph() -> NetworkGraph:
    """Build a minimal valid graph (SLACK + PQ + line with impedance)."""
    graph = NetworkGraph()
    slack = _make_slack_node()
    pq = _make_pq_node()
    graph.add_node(slack)
    graph.add_node(pq)
    line = _make_line("line_1", slack.id, pq.id)
    graph.add_branch(line)
    return graph


def _build_graph_no_slack() -> NetworkGraph:
    """Build a graph without SLACK node (blocker E-D01)."""
    graph = NetworkGraph()
    pq1 = _make_pq_node("bus_pq_1")
    pq2 = _make_pq_node("bus_pq_2")
    graph.add_node(pq1)
    graph.add_node(pq2)
    line = _make_line("line_1", pq1.id, pq2.id)
    graph.add_branch(line)
    return graph


# ---------------------------------------------------------------------------
# DiagnosticEngine.run()
# ---------------------------------------------------------------------------


class TestDiagnosticEngineRun:
    def test_returns_diagnostic_report(self):
        engine = DiagnosticEngine()
        graph = _build_valid_graph()
        report = engine.run(graph)
        assert isinstance(report, DiagnosticReport)

    def test_valid_graph_status_ok_or_warn(self):
        """A valid graph should produce OK or WARN status (no blockers)."""
        engine = DiagnosticEngine()
        graph = _build_valid_graph()
        report = engine.run(graph)
        assert report.status in (DiagnosticStatus.OK, DiagnosticStatus.WARN)
        assert len(report.blockers) == 0

    def test_no_slack_produces_fail_status(self):
        engine = DiagnosticEngine()
        graph = _build_graph_no_slack()
        report = engine.run(graph)
        assert report.status == DiagnosticStatus.FAIL
        assert len(report.blockers) >= 1
        blocker_codes = [b.code for b in report.blockers]
        assert "E-D01" in blocker_codes


# ---------------------------------------------------------------------------
# Issue sorting
# ---------------------------------------------------------------------------


class TestIssueSorting:
    def test_issues_sorted_by_severity_then_code(self):
        """Issues must be sorted: BLOCKER first, then WARN, then INFO."""
        engine = DiagnosticEngine()
        graph = _build_graph_no_slack()
        report = engine.run(graph)

        severity_order = {
            DiagnosticSeverity.BLOCKER: 0,
            DiagnosticSeverity.WARN: 1,
            DiagnosticSeverity.INFO: 2,
        }
        # Check ordering
        for i in range(len(report.issues) - 1):
            current = report.issues[i]
            next_issue = report.issues[i + 1]
            current_rank = (severity_order[current.severity], current.code)
            next_rank = (severity_order[next_issue.severity], next_issue.code)
            assert current_rank <= next_rank, (
                f"Issues not sorted: {current.code} ({current.severity}) "
                f"should be before {next_issue.code} ({next_issue.severity})"
            )


# ---------------------------------------------------------------------------
# Analysis matrix
# ---------------------------------------------------------------------------


class TestAnalysisMatrix:
    def test_analysis_matrix_computed_for_valid_graph(self):
        engine = DiagnosticEngine()
        graph = _build_valid_graph()
        report = engine.run(graph)
        assert len(report.analysis_matrix.entries) > 0

    def test_analysis_matrix_has_all_types(self):
        engine = DiagnosticEngine()
        graph = _build_valid_graph()
        report = engine.run(graph)
        matrix_types = {e.analysis_type for e in report.analysis_matrix.entries}
        assert AnalysisType.SC_3F in matrix_types
        assert AnalysisType.SC_1F in matrix_types
        assert AnalysisType.LF in matrix_types
        assert AnalysisType.PROTECTION in matrix_types

    def test_no_slack_blocks_all_analyses(self):
        engine = DiagnosticEngine()
        graph = _build_graph_no_slack()
        report = engine.run(graph)
        for entry in report.analysis_matrix.entries:
            assert entry.availability == AnalysisAvailability.BLOCKED

    def test_valid_graph_has_available_analyses(self):
        engine = DiagnosticEngine()
        graph = _build_valid_graph()
        report = engine.run(graph)
        available_types = [
            e.analysis_type
            for e in report.analysis_matrix.entries
            if e.availability == AnalysisAvailability.AVAILABLE
        ]
        assert len(available_types) > 0

    def test_i_d01_present_when_no_blockers(self):
        """I-D01 info issue should be present when there are no blockers."""
        engine = DiagnosticEngine()
        graph = _build_valid_graph()
        report = engine.run(graph)
        if len(report.blockers) == 0:
            info_codes = [i.code for i in report.infos]
            assert "I-D01" in info_codes


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------


class TestDeterminism:
    def test_same_graph_produces_same_report(self):
        """Running engine on the same graph twice produces identical results."""
        engine = DiagnosticEngine()
        graph = _build_valid_graph()
        report1 = engine.run(graph)
        report2 = engine.run(graph)
        assert report1.status == report2.status
        assert len(report1.issues) == len(report2.issues)
        for i1, i2 in zip(report1.issues, report2.issues):
            assert i1.code == i2.code
            assert i1.severity == i2.severity
