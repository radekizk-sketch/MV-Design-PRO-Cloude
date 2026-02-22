"""
Tests for diagnostics.preflight module.

Validates pre-flight report generation: readiness status, blocker/warning
counts, and integration with DiagnosticEngine.
"""

from __future__ import annotations

import pytest

from network_model.core.graph import NetworkGraph
from network_model.core.node import Node, NodeType
from network_model.core.branch import LineBranch, BranchType

from diagnostics.preflight import (
    run_preflight,
    build_preflight_from_diagnostic_report,
    PreflightReport,
    PreflightCheckEntry,
)
from diagnostics.engine import DiagnosticEngine
from diagnostics.models import DiagnosticStatus


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
) -> LineBranch:
    return LineBranch(
        id=branch_id,
        name=f"Line {branch_id}",
        branch_type=BranchType.LINE,
        from_node_id=from_id,
        to_node_id=to_id,
        r_ohm_per_km=0.161,
        x_ohm_per_km=0.190,
        b_us_per_km=3.306,
        length_km=5.0,
        rated_current_a=400.0,
        type_ref="cable_YAKXS_120",
    )


def _build_valid_graph() -> NetworkGraph:
    graph = NetworkGraph()
    slack = _make_slack_node()
    pq = _make_pq_node()
    graph.add_node(slack)
    graph.add_node(pq)
    line = _make_line("line_1", slack.id, pq.id)
    graph.add_branch(line)
    return graph


def _build_graph_no_slack() -> NetworkGraph:
    graph = NetworkGraph()
    pq1 = _make_pq_node("bus_pq_1")
    pq2 = _make_pq_node("bus_pq_2")
    graph.add_node(pq1)
    graph.add_node(pq2)
    line = _make_line("line_1", pq1.id, pq2.id)
    graph.add_branch(line)
    return graph


# ---------------------------------------------------------------------------
# run_preflight
# ---------------------------------------------------------------------------


class TestRunPreflight:
    def test_returns_preflight_report(self):
        graph = _build_valid_graph()
        report = run_preflight(graph)
        assert isinstance(report, PreflightReport)

    def test_ready_true_when_no_blockers(self):
        graph = _build_valid_graph()
        report = run_preflight(graph)
        assert report.ready is True
        assert report.blocker_count == 0

    def test_ready_false_when_blockers_exist(self):
        graph = _build_graph_no_slack()
        report = run_preflight(graph)
        assert report.ready is False
        assert report.blocker_count >= 1
        assert report.overall_status == "FAIL"

    def test_checks_list_populated(self):
        graph = _build_valid_graph()
        report = run_preflight(graph)
        assert len(report.checks) > 0
        for check in report.checks:
            assert isinstance(check, PreflightCheckEntry)
            assert check.analysis_type != ""
            assert check.analysis_label_pl != ""
            assert check.status in ("AVAILABLE", "BLOCKED")

    def test_checks_contain_all_analysis_types(self):
        graph = _build_valid_graph()
        report = run_preflight(graph)
        check_types = {c.analysis_type for c in report.checks}
        assert "SC_3F" in check_types
        assert "SC_1F" in check_types
        assert "LF" in check_types
        assert "PROTECTION" in check_types


# ---------------------------------------------------------------------------
# build_preflight_from_diagnostic_report
# ---------------------------------------------------------------------------


class TestBuildPreflightFromDiagnosticReport:
    def test_valid_graph_report(self):
        engine = DiagnosticEngine()
        graph = _build_valid_graph()
        diag_report = engine.run(graph)
        preflight = build_preflight_from_diagnostic_report(diag_report)
        assert isinstance(preflight, PreflightReport)
        assert preflight.ready is True

    def test_blocked_graph_report(self):
        engine = DiagnosticEngine()
        graph = _build_graph_no_slack()
        diag_report = engine.run(graph)
        preflight = build_preflight_from_diagnostic_report(diag_report)
        assert preflight.ready is False
        assert preflight.overall_status == "FAIL"
        assert preflight.blocker_count >= 1


# ---------------------------------------------------------------------------
# PreflightReport.to_dict()
# ---------------------------------------------------------------------------


class TestPreflightReportToDict:
    def test_to_dict_structure(self):
        graph = _build_valid_graph()
        report = run_preflight(graph)
        d = report.to_dict()
        assert isinstance(d, dict)
        assert "ready" in d
        assert "overall_status" in d
        assert "checks" in d
        assert "blocker_count" in d
        assert "warning_count" in d
        assert isinstance(d["checks"], list)

    def test_to_dict_check_entries(self):
        graph = _build_valid_graph()
        report = run_preflight(graph)
        d = report.to_dict()
        for check in d["checks"]:
            assert "analysis_type" in check
            assert "analysis_label_pl" in check
            assert "status" in check

    def test_report_is_frozen(self):
        graph = _build_valid_graph()
        report = run_preflight(graph)
        with pytest.raises(AttributeError):
            report.ready = False  # type: ignore[misc]
