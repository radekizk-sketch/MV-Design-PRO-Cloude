"""
Unit tests for the NetworkGraph module.

Tests cover:
- T1: add_node uniqueness and validation
- T2: SLACK node uniqueness (exactly one)
- T3: add_branch node existence and parallel branch prevention
- T4: enforce_connected rollback behavior
- T5: Topology views (all vs in_service)
- T6: get_connected_nodes behavior
- T7: remove_branch and remove_node operations
- T8: Edge attribute branch_id verification
"""

import sys
from pathlib import Path

import pytest

# Add backend/src to path for imports
backend_src = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(backend_src))

from network_model.core.node import Node, NodeType
from network_model.core.branch import Branch, BranchType, LineBranch
from network_model.core.graph import NetworkGraph


# =============================================================================
# Helper functions for creating test objects
# =============================================================================

def create_pq_node(
    node_id: str,
    name: str = "PQ Node",
    active_power: float = 10.0,
    reactive_power: float = 5.0,
    voltage_level: float = 20.0,
) -> Node:
    """Create a valid PQ node for testing."""
    return Node(
        id=node_id,
        name=name,
        node_type=NodeType.PQ,
        voltage_level=voltage_level,
        active_power=active_power,
        reactive_power=reactive_power,
    )


def create_pv_node(
    node_id: str,
    name: str = "PV Node",
    active_power: float = 50.0,
    voltage_magnitude: float = 1.0,
    voltage_level: float = 20.0,
) -> Node:
    """Create a valid PV node for testing."""
    return Node(
        id=node_id,
        name=name,
        node_type=NodeType.PV,
        voltage_level=voltage_level,
        active_power=active_power,
        voltage_magnitude=voltage_magnitude,
    )


def create_slack_node(
    node_id: str,
    name: str = "SLACK Node",
    voltage_magnitude: float = 1.0,
    voltage_angle: float = 0.0,
    voltage_level: float = 110.0,
) -> Node:
    """Create a valid SLACK node for testing."""
    return Node(
        id=node_id,
        name=name,
        node_type=NodeType.SLACK,
        voltage_level=voltage_level,
        voltage_magnitude=voltage_magnitude,
        voltage_angle=voltage_angle,
    )


def create_line_branch(
    branch_id: str,
    from_node_id: str,
    to_node_id: str,
    in_service: bool = True,
    name: str = "Line Branch",
) -> LineBranch:
    """Create a valid LineBranch for testing."""
    return LineBranch(
        id=branch_id,
        name=name,
        branch_type=BranchType.LINE,
        from_node_id=from_node_id,
        to_node_id=to_node_id,
        in_service=in_service,
        r_ohm_per_km=0.2,
        x_ohm_per_km=0.4,
        b_us_per_km=5.0,
        length_km=10.0,
        rated_current_a=200.0,
    )


# =============================================================================
# T1: add_node - uniqueness and validation
# =============================================================================

class TestAddNodeUniquenessAndValidation:
    """T1: add_node - uniqueness and validation tests."""

    def test_add_valid_pq_node(self):
        """Adding a valid PQ node should succeed and increment node_count."""
        graph = NetworkGraph()
        node = create_pq_node("A")

        graph.add_node(node)

        assert graph.node_count == 1
        assert graph.get_node("A") is node

    def test_add_duplicate_node_id_raises_value_error(self):
        """Adding a node with duplicate ID should raise ValueError."""
        graph = NetworkGraph()
        node1 = create_pq_node("A")
        node2 = create_pq_node("A", name="Different name")  # Same ID

        graph.add_node(node1)

        with pytest.raises(ValueError, match="already exists"):
            graph.add_node(node2)

    def test_add_invalid_pq_node_raises_value_error(self):
        """
        Adding a PQ node that fails validation should raise ValueError.

        Note: Node.__post_init__ validates required fields, so creating an
        invalid PQ node (missing active_power/reactive_power) raises ValueError
        during construction.
        """
        graph = NetworkGraph()

        # Attempting to create a PQ node without required fields raises ValueError
        with pytest.raises(ValueError, match="requires active_power"):
            Node(
                id="invalid",
                name="Invalid PQ",
                node_type=NodeType.PQ,
                voltage_level=20.0,
                # Missing active_power and reactive_power
            )

    def test_add_node_with_empty_id_raises_value_error(self):
        """Adding a node with empty ID should raise ValueError due to validation failure."""
        graph = NetworkGraph()

        # Create a node that will fail validate() due to empty id
        # We need to bypass __post_init__ validation, so we use object.__setattr__
        # Actually, we can create a node with empty id - it will just fail validation
        # But __post_init__ doesn't check for empty id

        # Let's create a PQ node with empty id and proper required fields
        node = Node(
            id="",  # Empty ID should fail validate()
            name="Test",
            node_type=NodeType.PQ,
            voltage_level=20.0,
            active_power=10.0,
            reactive_power=5.0,
        )

        with pytest.raises(ValueError, match="failed validation"):
            graph.add_node(node)


# =============================================================================
# T2: SLACK - exactly one
# =============================================================================

class TestSlackNodeUniqueness:
    """T2: SLACK node uniqueness tests."""

    def test_add_slack_node_sets_has_slack_true(self):
        """Adding a valid SLACK node should set has_slack_node() to True."""
        graph = NetworkGraph()
        slack = create_slack_node("SLACK1")

        graph.add_node(slack)

        assert graph.has_slack_node() is True

    def test_add_second_slack_raises_value_error(self):
        """Adding a second SLACK node should raise ValueError."""
        graph = NetworkGraph()
        slack1 = create_slack_node("SLACK1")
        slack2 = create_slack_node("SLACK2")

        graph.add_node(slack1)

        with pytest.raises(ValueError, match="SLACK node already exists"):
            graph.add_node(slack2)

    def test_get_slack_node_returns_the_slack(self):
        """get_slack_node() should return the SLACK node."""
        graph = NetworkGraph()
        slack = create_slack_node("SLACK1")
        pq = create_pq_node("PQ1")

        graph.add_node(slack)
        graph.add_node(pq)

        result = graph.get_slack_node()
        assert result is slack

    def test_get_slack_node_raises_when_no_slack(self):
        """get_slack_node() should raise ValueError when no SLACK exists."""
        graph = NetworkGraph()
        pq = create_pq_node("PQ1")

        graph.add_node(pq)

        with pytest.raises(ValueError, match="No SLACK node exists"):
            graph.get_slack_node()


# =============================================================================
# T3: add_branch - nodes must exist + parallel branch prevention
# =============================================================================

class TestAddBranchValidation:
    """T3: add_branch - node existence and parallel branch prevention."""

    def test_add_branch_between_existing_nodes(self):
        """Adding a branch between existing nodes should succeed."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        branch = create_line_branch("AB", "A", "B")

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_branch(branch, enforce_connected=False)

        assert graph.branch_count == 1
        assert graph.get_branch("AB") is branch

    def test_add_branch_with_nonexistent_from_node_raises(self):
        """Adding a branch with non-existent from_node_id should raise ValueError."""
        graph = NetworkGraph()
        node_b = create_pq_node("B")
        branch = create_line_branch("AB", "A", "B")

        graph.add_node(node_b)  # Only add B

        with pytest.raises(ValueError, match="non-existent from_node_id 'A'"):
            graph.add_branch(branch, enforce_connected=False)

    def test_add_branch_with_nonexistent_to_node_raises(self):
        """Adding a branch with non-existent to_node_id should raise ValueError."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        branch = create_line_branch("AB", "A", "B")

        graph.add_node(node_a)  # Only add A

        with pytest.raises(ValueError, match="non-existent to_node_id 'B'"):
            graph.add_branch(branch, enforce_connected=False)

    def test_add_parallel_branch_raises_value_error(self):
        """Adding a parallel branch between the same nodes should raise ValueError."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        branch1 = create_line_branch("AB1", "A", "B")
        branch2 = create_line_branch("AB2", "A", "B")  # Same nodes, different ID

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_branch(branch1, enforce_connected=False)

        with pytest.raises(ValueError, match="parallel branch already exists"):
            graph.add_branch(branch2, enforce_connected=False)

    def test_add_parallel_branch_reverse_direction_raises(self):
        """Adding a parallel branch in reverse direction should also raise ValueError."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        branch1 = create_line_branch("AB1", "A", "B")
        branch2 = create_line_branch("BA1", "B", "A")  # Reverse direction

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_branch(branch1, enforce_connected=False)

        with pytest.raises(ValueError, match="parallel branch already exists"):
            graph.add_branch(branch2, enforce_connected=False)


# =============================================================================
# T4: enforce_connected rollback
# =============================================================================

class TestEnforceConnectedRollback:
    """T4: enforce_connected rollback behavior tests."""

    def test_add_in_service_branch_maintains_connectivity(self):
        """Adding in_service branch that maintains connectivity should succeed."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        branch = create_line_branch("AB", "A", "B", in_service=True)

        graph.add_node(node_a)
        graph.add_node(node_b)
        # With 2 nodes and 1 connecting branch, graph is connected
        graph.add_branch(branch, enforce_connected=True)

        assert graph.branch_count == 1
        assert graph.is_connected(in_service_only=True)

    def test_add_out_of_service_branch_breaks_connectivity_with_enforce(self):
        """
        Adding out-of-service branch when enforce_connected=True should rollback
        if it leaves isolated nodes.

        Scenario:
        1. Build a disconnected graph with enforce_connected=False:
           - Nodes A, B, C with branch A-B (in_service=True)
           - C is isolated in _graph_in_service
        2. Try to add branch B-C (in_service=False) with enforce_connected=True
           - This doesn't help connectivity (out of service)
           - Graph remains disconnected -> rollback
        """
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        node_c = create_pq_node("C")
        branch_ab = create_line_branch("AB", "A", "B", in_service=True)
        branch_bc = create_line_branch("BC", "B", "C", in_service=False)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_node(node_c)
        # Use enforce_connected=False to set up disconnected graph
        graph.add_branch(branch_ab, enforce_connected=False)

        # Verify initial state: graph is disconnected (C isolated)
        assert graph.is_connected(in_service_only=True) is False

        # branch_bc is out of service, so C remains isolated in _graph_in_service
        # enforce_connected=True should cause rollback
        initial_branch_count = graph.branch_count

        with pytest.raises(ValueError, match="disconnected"):
            graph.add_branch(branch_bc, enforce_connected=True)

        # Verify rollback
        assert graph.branch_count == initial_branch_count
        assert "BC" not in graph.branches
        # Also verify _graph_all doesn't have the edge after rollback
        assert not graph._graph_all.has_edge("B", "C")

    def test_add_out_of_service_branch_allowed_without_enforce(self):
        """Adding out-of-service branch with enforce_connected=False should succeed."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        node_c = create_pq_node("C")
        branch_ab = create_line_branch("AB", "A", "B", in_service=True)
        branch_bc = create_line_branch("BC", "B", "C", in_service=False)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_node(node_c)
        graph.add_branch(branch_ab, enforce_connected=False)
        graph.add_branch(branch_bc, enforce_connected=False)

        assert graph.branch_count == 2
        assert "BC" in graph.branches


# =============================================================================
# T5: Topology views - all vs in_service
# =============================================================================

class TestTopologyViews:
    """T5: Topology views (all vs in_service) tests."""

    def test_is_connected_all_vs_in_service(self):
        """
        Test is_connected for both views with mixed in_service branches.
        """
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        node_c = create_pq_node("C")
        branch_ab = create_line_branch("AB", "A", "B", in_service=True)
        branch_bc = create_line_branch("BC", "B", "C", in_service=False)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_node(node_c)
        graph.add_branch(branch_ab, enforce_connected=False)
        graph.add_branch(branch_bc, enforce_connected=False)

        # _graph_all has edges: A-B, B-C (forming A-B-C chain) => connected
        assert graph.is_connected(in_service_only=False) is True

        # _graph_in_service has only edge: A-B, C is isolated => disconnected
        assert graph.is_connected(in_service_only=True) is False

    def test_find_islands_in_service_only(self):
        """
        find_islands(in_service_only=True) should return 2 components
        when one branch is out of service.
        """
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        node_c = create_pq_node("C")
        branch_ab = create_line_branch("AB", "A", "B", in_service=True)
        branch_bc = create_line_branch("BC", "B", "C", in_service=False)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_node(node_c)
        graph.add_branch(branch_ab, enforce_connected=False)
        graph.add_branch(branch_bc, enforce_connected=False)

        islands = graph.find_islands(in_service_only=True)

        # Expect 2 islands: [C] (singleton) and [A, B]
        # Sorted by (len, first_id): [C] comes before [A, B]
        assert len(islands) == 2
        assert islands[0] == ["C"]
        assert islands[1] == ["A", "B"]

    def test_find_islands_all_branches(self):
        """
        find_islands(in_service_only=False) should return 1 component
        when all physical branches connect the network.
        """
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        node_c = create_pq_node("C")
        branch_ab = create_line_branch("AB", "A", "B", in_service=True)
        branch_bc = create_line_branch("BC", "B", "C", in_service=False)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_node(node_c)
        graph.add_branch(branch_ab, enforce_connected=False)
        graph.add_branch(branch_bc, enforce_connected=False)

        islands = graph.find_islands(in_service_only=False)

        # Expect 1 island: [A, B, C]
        assert len(islands) == 1
        assert islands[0] == ["A", "B", "C"]


# =============================================================================
# T6: get_connected_nodes
# =============================================================================

class TestGetConnectedNodes:
    """T6: get_connected_nodes behavior tests."""

    def test_get_connected_nodes_in_service_returns_component(self):
        """get_connected_nodes with in_service_only=True returns correct component."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        node_c = create_pq_node("C")
        branch_ab = create_line_branch("AB", "A", "B", in_service=True)
        branch_bc = create_line_branch("BC", "B", "C", in_service=False)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_node(node_c)
        graph.add_branch(branch_ab, enforce_connected=False)
        graph.add_branch(branch_bc, enforce_connected=False)

        # Node A is connected to B in in-service graph
        connected = graph.get_connected_nodes("A", in_service_only=True)
        connected_ids = sorted([n.id for n in connected])

        assert connected_ids == ["A", "B"]

    def test_get_connected_nodes_isolated_returns_self(self):
        """get_connected_nodes for isolated node returns only that node."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        node_c = create_pq_node("C")
        branch_ab = create_line_branch("AB", "A", "B", in_service=True)
        branch_bc = create_line_branch("BC", "B", "C", in_service=False)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_node(node_c)
        graph.add_branch(branch_ab, enforce_connected=False)
        graph.add_branch(branch_bc, enforce_connected=False)

        # Node C is isolated in in-service graph
        connected = graph.get_connected_nodes("C", in_service_only=True)

        assert len(connected) == 1
        assert connected[0].id == "C"

    def test_get_connected_nodes_all_branches_returns_full_component(self):
        """get_connected_nodes with in_service_only=False returns all connected nodes."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        node_c = create_pq_node("C")
        branch_ab = create_line_branch("AB", "A", "B", in_service=True)
        branch_bc = create_line_branch("BC", "B", "C", in_service=False)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_node(node_c)
        graph.add_branch(branch_ab, enforce_connected=False)
        graph.add_branch(branch_bc, enforce_connected=False)

        # In full topology, all nodes are connected
        connected = graph.get_connected_nodes("A", in_service_only=False)
        connected_ids = sorted([n.id for n in connected])

        assert connected_ids == ["A", "B", "C"]

    def test_get_connected_nodes_nonexistent_raises_key_error(self):
        """get_connected_nodes for non-existent node raises KeyError."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")

        graph.add_node(node_a)

        with pytest.raises(KeyError, match="does not exist"):
            graph.get_connected_nodes("NONEXISTENT")


# =============================================================================
# T7: remove_branch and remove_node
# =============================================================================

class TestRemoveOperations:
    """T7: remove_branch and remove_node tests."""

    def test_remove_branch_creates_islands(self):
        """Removing a branch can create islands in the in-service graph."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        node_c = create_pq_node("C")
        branch_ab = create_line_branch("AB", "A", "B", in_service=True)
        branch_bc = create_line_branch("BC", "B", "C", in_service=True)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_node(node_c)
        graph.add_branch(branch_ab, enforce_connected=False)
        graph.add_branch(branch_bc, enforce_connected=False)

        # Initially connected
        assert graph.is_connected(in_service_only=True) is True

        # Remove BC
        graph.remove_branch("BC")

        # Now C is isolated
        assert graph.branch_count == 1
        islands = graph.find_islands(in_service_only=True)
        assert len(islands) == 2
        assert ["C"] in islands
        assert ["A", "B"] in islands

    def test_remove_node_removes_incident_branches(self):
        """Removing a node also removes all incident branches."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        node_c = create_pq_node("C")
        branch_ab = create_line_branch("AB", "A", "B", in_service=True)
        branch_bc = create_line_branch("BC", "B", "C", in_service=True)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_node(node_c)
        graph.add_branch(branch_ab, enforce_connected=False)
        graph.add_branch(branch_bc, enforce_connected=False)

        # Remove node B (connected to both branches)
        graph.remove_node("B")

        # Node B and both branches should be gone
        assert graph.node_count == 2
        assert "A" in graph.nodes
        assert "C" in graph.nodes
        assert "B" not in graph.nodes
        assert graph.branch_count == 0

        # A and C are now isolated islands
        islands = graph.find_islands(in_service_only=True)
        assert len(islands) == 2
        assert ["A"] in islands
        assert ["C"] in islands

    def test_remove_branch_nonexistent_raises_key_error(self):
        """Removing a non-existent branch raises KeyError."""
        graph = NetworkGraph()

        with pytest.raises(KeyError, match="does not exist"):
            graph.remove_branch("NONEXISTENT")

    def test_remove_node_nonexistent_raises_key_error(self):
        """Removing a non-existent node raises KeyError."""
        graph = NetworkGraph()

        with pytest.raises(KeyError, match="does not exist"):
            graph.remove_node("NONEXISTENT")


# =============================================================================
# T8: Edge attribute branch_id
# =============================================================================

class TestEdgeAttributeBranchId:
    """T8: Edge attribute branch_id verification tests."""

    def test_edge_has_branch_id_attribute_in_graph_all(self):
        """Branch edge in _graph_all should have branch_id attribute."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        branch = create_line_branch("AB", "A", "B", in_service=True)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_branch(branch, enforce_connected=False)

        # Check _graph_all edge has branch_id
        edge_data = graph._graph_all.get_edge_data("A", "B")
        assert edge_data is not None
        assert edge_data.get("branch_id") == "AB"

    def test_edge_has_branch_id_attribute_in_graph_in_service(self):
        """In-service branch edge should have branch_id in _graph_in_service."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        branch = create_line_branch("AB", "A", "B", in_service=True)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_branch(branch, enforce_connected=False)

        # Check _graph_in_service edge has branch_id
        edge_data = graph._graph_in_service.get_edge_data("A", "B")
        assert edge_data is not None
        assert edge_data.get("branch_id") == "AB"

    def test_out_of_service_branch_not_in_graph_in_service(self):
        """Out-of-service branch should NOT appear in _graph_in_service."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        branch = create_line_branch("AB", "A", "B", in_service=False)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_branch(branch, enforce_connected=False)

        # Edge should exist in _graph_all
        assert graph._graph_all.has_edge("A", "B")
        edge_data = graph._graph_all.get_edge_data("A", "B")
        assert edge_data.get("branch_id") == "AB"

        # Edge should NOT exist in _graph_in_service
        assert not graph._graph_in_service.has_edge("A", "B")


# =============================================================================
# Additional edge case tests
# =============================================================================

class TestEdgeCases:
    """Additional edge case tests for comprehensive coverage."""

    def test_empty_graph_is_connected(self):
        """Empty graph should be considered connected."""
        graph = NetworkGraph()
        assert graph.is_connected(in_service_only=True) is True
        assert graph.is_connected(in_service_only=False) is True

    def test_single_node_graph_is_connected(self):
        """Single-node graph should be considered connected."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        graph.add_node(node_a)

        assert graph.is_connected(in_service_only=True) is True
        assert graph.is_connected(in_service_only=False) is True

    def test_find_islands_empty_graph(self):
        """find_islands on empty graph should return empty list."""
        graph = NetworkGraph()
        islands = graph.find_islands()
        assert islands == []

    def test_find_islands_single_isolated_node(self):
        """find_islands with single node should return one island."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        graph.add_node(node_a)

        islands = graph.find_islands()
        assert len(islands) == 1
        assert islands[0] == ["A"]

    def test_rebuild_graphs_restores_state(self):
        """rebuild_graphs should correctly restore graph state."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        node_c = create_pq_node("C")
        branch_ab = create_line_branch("AB", "A", "B", in_service=True)
        branch_bc = create_line_branch("BC", "B", "C", in_service=False)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_node(node_c)
        graph.add_branch(branch_ab, enforce_connected=False)
        graph.add_branch(branch_bc, enforce_connected=False)

        # Manually corrupt the graphs
        graph._graph_all.clear()
        graph._graph_in_service.clear()

        # Rebuild should restore
        graph.rebuild_graphs()

        # Verify state
        assert graph._graph_all.number_of_nodes() == 3
        assert graph._graph_all.number_of_edges() == 2
        assert graph._graph_in_service.number_of_nodes() == 3
        assert graph._graph_in_service.number_of_edges() == 1

    def test_properties_count_correctly(self):
        """node_count, branch_count, and in_service_branch_count should be accurate."""
        graph = NetworkGraph()
        node_a = create_pq_node("A")
        node_b = create_pq_node("B")
        node_c = create_pq_node("C")
        branch_ab = create_line_branch("AB", "A", "B", in_service=True)
        branch_bc = create_line_branch("BC", "B", "C", in_service=False)

        graph.add_node(node_a)
        graph.add_node(node_b)
        graph.add_node(node_c)
        graph.add_branch(branch_ab, enforce_connected=False)
        graph.add_branch(branch_bc, enforce_connected=False)

        assert graph.node_count == 3
        assert graph.branch_count == 2
        assert graph.in_service_branch_count == 1

    def test_get_node_nonexistent_raises_key_error(self):
        """get_node for non-existent node raises KeyError."""
        graph = NetworkGraph()

        with pytest.raises(KeyError, match="does not exist"):
            graph.get_node("NONEXISTENT")

    def test_get_branch_nonexistent_raises_key_error(self):
        """get_branch for non-existent branch raises KeyError."""
        graph = NetworkGraph()

        with pytest.raises(KeyError, match="does not exist"):
            graph.get_branch("NONEXISTENT")
