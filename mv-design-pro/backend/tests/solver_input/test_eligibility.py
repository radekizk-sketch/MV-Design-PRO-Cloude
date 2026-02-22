"""
Tests for solver_input.eligibility module.

Validates eligibility gating: SLACK node detection, blocker generation,
and the multi-analysis eligibility map builder.
"""

from __future__ import annotations

import pytest

from network_model.core.graph import NetworkGraph
from network_model.core.node import Node, NodeType
from network_model.core.branch import LineBranch, BranchType

from solver_input.contracts import SolverAnalysisType
from solver_input.eligibility import check_eligibility, build_eligibility_map


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


def _build_valid_graph() -> NetworkGraph:
    """Build a minimal valid graph with a SLACK node, PQ node, and a line."""
    graph = NetworkGraph()
    slack = _make_slack_node()
    pq = _make_pq_node()
    graph.add_node(slack)
    graph.add_node(pq)
    line = _make_line("line_1", slack.id, pq.id)
    graph.add_branch(line)
    return graph


def _build_graph_no_slack() -> NetworkGraph:
    """Build a graph with only PQ nodes (no SLACK)."""
    graph = NetworkGraph()
    pq1 = _make_pq_node("bus_pq_1")
    pq2 = _make_pq_node("bus_pq_2")
    graph.add_node(pq1)
    graph.add_node(pq2)
    line = _make_line("line_1", pq1.id, pq2.id)
    graph.add_branch(line)
    return graph


# ---------------------------------------------------------------------------
# check_eligibility
# ---------------------------------------------------------------------------


class TestCheckEligibility:
    def test_eligible_for_valid_graph_with_slack(self):
        graph = _build_valid_graph()
        result = check_eligibility(graph, None, SolverAnalysisType.SHORT_CIRCUIT_3F)
        assert result.eligible is True
        assert len(result.blockers) == 0

    def test_eligible_for_load_flow(self):
        graph = _build_valid_graph()
        result = check_eligibility(graph, None, SolverAnalysisType.LOAD_FLOW)
        assert result.eligible is True
        assert len(result.blockers) == 0

    def test_returns_blockers_when_no_slack(self):
        graph = _build_graph_no_slack()
        result = check_eligibility(graph, None, SolverAnalysisType.SHORT_CIRCUIT_3F)
        assert result.eligible is False
        assert len(result.blockers) >= 1
        blocker_codes = [b.code for b in result.blockers]
        assert "E-D01" in blocker_codes

    def test_protection_always_blocked_stub(self):
        """Protection analysis is always ineligible (stub in current version)."""
        graph = _build_valid_graph()
        result = check_eligibility(graph, None, SolverAnalysisType.PROTECTION)
        assert result.eligible is False
        blocker_codes = [b.code for b in result.blockers]
        assert "SI-100" in blocker_codes

    def test_zero_impedance_line_produces_blocker(self):
        graph = NetworkGraph()
        slack = _make_slack_node()
        pq = _make_pq_node()
        graph.add_node(slack)
        graph.add_node(pq)
        # Line with zero impedance
        line = _make_line("line_zero", slack.id, pq.id, r=0.0, x=0.0)
        graph.add_branch(line)

        result = check_eligibility(graph, None, SolverAnalysisType.SHORT_CIRCUIT_3F)
        assert result.eligible is False
        blocker_codes = [b.code for b in result.blockers]
        assert "SI-001" in blocker_codes

    def test_blockers_sorted_deterministically(self):
        """Issues must be sorted by (code, element_ref, message)."""
        graph = _build_graph_no_slack()
        result = check_eligibility(graph, None, SolverAnalysisType.SHORT_CIRCUIT_3F)
        if len(result.blockers) > 1:
            codes = [b.code for b in result.blockers]
            assert codes == sorted(codes)


# ---------------------------------------------------------------------------
# build_eligibility_map
# ---------------------------------------------------------------------------


class TestBuildEligibilityMap:
    def test_returns_map_for_all_analysis_types(self):
        graph = _build_valid_graph()
        emap = build_eligibility_map(graph, None)
        analysis_types_in_map = {e.analysis_type for e in emap.entries}
        expected_types = set(SolverAnalysisType)
        assert analysis_types_in_map == expected_types

    def test_valid_graph_eligible_for_non_protection(self):
        graph = _build_valid_graph()
        emap = build_eligibility_map(graph, None)
        for entry in emap.entries:
            if entry.analysis_type == SolverAnalysisType.PROTECTION:
                assert entry.eligible is False  # stub
            else:
                assert entry.eligible is True

    def test_no_slack_blocks_all(self):
        graph = _build_graph_no_slack()
        emap = build_eligibility_map(graph, None)
        for entry in emap.entries:
            assert entry.eligible is False

    def test_entries_sorted_by_analysis_type_value(self):
        graph = _build_valid_graph()
        emap = build_eligibility_map(graph, None)
        values = [e.analysis_type.value for e in emap.entries]
        assert values == sorted(values)
