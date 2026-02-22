"""
Tests for diagnostics.rules module.

Validates individual diagnostic rules using minimal mock graph objects.
"""

from __future__ import annotations

import pytest

from network_model.core.graph import NetworkGraph
from network_model.core.node import Node, NodeType
from network_model.core.branch import LineBranch, BranchType

from diagnostics.models import DiagnosticSeverity
from diagnostics.rules import (
    rule_e_d01_no_source,
    rule_e_d03_disconnected_islands,
    rule_e_d05_line_no_impedance,
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


def _make_pq_node(node_id: str = "bus_pq") -> Node:
    return Node(
        id=node_id,
        name="Load",
        node_type=NodeType.PQ,
        voltage_level=15.0,
        active_power=5.0,
        reactive_power=2.0,
    )


def _make_line(
    branch_id: str,
    from_id: str,
    to_id: str,
    r: float = 0.161,
    x: float = 0.190,
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
    )


# ---------------------------------------------------------------------------
# E-D01: No source
# ---------------------------------------------------------------------------


class TestRuleED01NoSource:
    def test_fires_when_no_sources(self):
        graph = NetworkGraph()
        pq = _make_pq_node("bus_1")
        graph.add_node(pq)
        issues = rule_e_d01_no_source(graph)
        assert len(issues) == 1
        assert issues[0].code == "E-D01"
        assert issues[0].severity == DiagnosticSeverity.BLOCKER

    def test_does_not_fire_when_slack_present(self):
        graph = NetworkGraph()
        slack = _make_slack_node()
        graph.add_node(slack)
        issues = rule_e_d01_no_source(graph)
        assert len(issues) == 0

    def test_fires_for_empty_graph(self):
        graph = NetworkGraph()
        issues = rule_e_d01_no_source(graph)
        assert len(issues) == 1
        assert issues[0].code == "E-D01"

    def test_issue_has_polish_message(self):
        graph = NetworkGraph()
        pq = _make_pq_node("bus_1")
        graph.add_node(pq)
        issues = rule_e_d01_no_source(graph)
        assert len(issues[0].message_pl) > 0

    def test_issue_has_hints(self):
        graph = NetworkGraph()
        pq = _make_pq_node("bus_1")
        graph.add_node(pq)
        issues = rule_e_d01_no_source(graph)
        assert len(issues[0].hints) > 0


# ---------------------------------------------------------------------------
# E-D03: Disconnected islands
# ---------------------------------------------------------------------------


class TestRuleED03DisconnectedIslands:
    def test_fires_when_network_is_disconnected(self):
        graph = NetworkGraph()
        # Create two disconnected components
        slack = _make_slack_node("bus_slack")
        pq1 = _make_pq_node("bus_pq_1")
        pq2 = _make_pq_node("bus_pq_2")
        pq3 = _make_pq_node("bus_pq_3")

        graph.add_node(slack)
        graph.add_node(pq1)
        graph.add_node(pq2)
        graph.add_node(pq3)

        # Connect only slack to pq1 — pq2 and pq3 are isolated
        line = _make_line("line_1", slack.id, pq1.id)
        graph.add_branch(line)
        line2 = _make_line("line_2", pq2.id, pq3.id)
        graph.add_branch(line2)

        issues = rule_e_d03_disconnected_islands(graph)
        assert len(issues) == 1
        assert issues[0].code == "E-D03"
        assert issues[0].severity == DiagnosticSeverity.BLOCKER

    def test_does_not_fire_when_connected(self):
        graph = NetworkGraph()
        slack = _make_slack_node()
        pq = _make_pq_node()
        graph.add_node(slack)
        graph.add_node(pq)
        line = _make_line("line_1", slack.id, pq.id)
        graph.add_branch(line)

        issues = rule_e_d03_disconnected_islands(graph)
        assert len(issues) == 0

    def test_does_not_fire_for_empty_graph(self):
        graph = NetworkGraph()
        issues = rule_e_d03_disconnected_islands(graph)
        assert len(issues) == 0

    def test_island_issue_includes_affected_refs(self):
        graph = NetworkGraph()
        slack = _make_slack_node("bus_slack")
        pq1 = _make_pq_node("bus_pq_1")
        pq2 = _make_pq_node("bus_pq_2")

        graph.add_node(slack)
        graph.add_node(pq1)
        graph.add_node(pq2)

        # Only connect slack to pq1; pq2 is isolated
        line = _make_line("line_1", slack.id, pq1.id)
        graph.add_branch(line)

        issues = rule_e_d03_disconnected_islands(graph)
        assert len(issues) == 1
        assert len(issues[0].affected_refs) > 0


# ---------------------------------------------------------------------------
# E-D05: Line no impedance
# ---------------------------------------------------------------------------


class TestRuleED05LineNoImpedance:
    def test_fires_when_line_has_zero_impedance(self):
        graph = NetworkGraph()
        slack = _make_slack_node()
        pq = _make_pq_node()
        graph.add_node(slack)
        graph.add_node(pq)

        line = _make_line("line_zero", slack.id, pq.id, r=0.0, x=0.0)
        graph.add_branch(line)

        issues = rule_e_d05_line_no_impedance(graph)
        assert len(issues) == 1
        assert issues[0].code == "E-D05"
        assert issues[0].severity == DiagnosticSeverity.BLOCKER
        assert "line_zero" in issues[0].affected_refs

    def test_does_not_fire_when_impedance_present(self):
        graph = NetworkGraph()
        slack = _make_slack_node()
        pq = _make_pq_node()
        graph.add_node(slack)
        graph.add_node(pq)

        line = _make_line("line_1", slack.id, pq.id, r=0.161, x=0.190)
        graph.add_branch(line)

        issues = rule_e_d05_line_no_impedance(graph)
        assert len(issues) == 0

    def test_does_not_fire_when_type_ref_present(self):
        graph = NetworkGraph()
        slack = _make_slack_node()
        pq = _make_pq_node()
        graph.add_node(slack)
        graph.add_node(pq)

        line = LineBranch(
            id="line_typed",
            name="Line typed",
            branch_type=BranchType.LINE,
            from_node_id=slack.id,
            to_node_id=pq.id,
            r_ohm_per_km=0.0,
            x_ohm_per_km=0.0,
            length_km=5.0,
            type_ref="cable_YAKXS_120",
        )
        graph.add_branch(line)

        issues = rule_e_d05_line_no_impedance(graph)
        assert len(issues) == 0

    def test_does_not_fire_for_empty_graph(self):
        graph = NetworkGraph()
        issues = rule_e_d05_line_no_impedance(graph)
        assert len(issues) == 0

    def test_multiple_zero_impedance_lines(self):
        graph = NetworkGraph()
        slack = _make_slack_node("bus_s")
        pq1 = _make_pq_node("bus_1")
        pq2 = _make_pq_node("bus_2")
        graph.add_node(slack)
        graph.add_node(pq1)
        graph.add_node(pq2)

        line1 = _make_line("line_1", slack.id, pq1.id, r=0.0, x=0.0)
        line2 = _make_line("line_2", pq1.id, pq2.id, r=0.0, x=0.0)
        graph.add_branch(line1)
        graph.add_branch(line2)

        issues = rule_e_d05_line_no_impedance(graph)
        assert len(issues) == 2
        issue_refs = [i.affected_refs[0] for i in issues]
        assert "line_1" in issue_refs
        assert "line_2" in issue_refs
