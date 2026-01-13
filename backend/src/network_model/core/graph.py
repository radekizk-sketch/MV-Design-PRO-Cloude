"""
Network graph module for power network topology modeling.

Contains the NetworkGraph class that maintains network topology in two views:
1. _graph_all: nx.Graph with all branches (physical topology)
2. _graph_in_service: nx.Graph with only in-service branches (operational topology)

Both graphs always contain all nodes as vertices, even if isolated.
Topological analyses (connectivity, islands, connected nodes) work for both views.

Key features:
- Parallel branches are NOT allowed (raises ValueError)
- Graph is undirected (using nx.Graph)
- CRUD operations for nodes and branches with validation
- Automatic enforcement of connectivity constraints (optional)
"""

import networkx as nx
from typing import Dict, List, Optional, Set, Tuple

from .node import Node, NodeType
from .branch import Branch


class NetworkGraph:
    """
    Network topology graph maintaining two views: all branches and in-service only.

    The graph maintains nodes and branches with validation, supporting topological
    queries on both the complete physical topology and the operational topology
    (in-service branches only).

    Attributes:
        nodes: Dictionary mapping node IDs to Node objects.
        branches: Dictionary mapping branch IDs to Branch objects.
        _graph_all: NetworkX Graph with all branches (physical topology).
        _graph_in_service: NetworkX Graph with in-service branches only (operational).

    Note:
        Both graphs (_graph_all and _graph_in_service) always contain ALL nodes
        as vertices, even isolated ones. This ensures correct connectivity
        analysis (isolated nodes make the graph disconnected).
    """

    def __init__(self) -> None:
        """Initialize an empty network graph."""
        self.nodes: Dict[str, Node] = {}
        self.branches: Dict[str, Branch] = {}
        self._graph_all: nx.Graph = nx.Graph()
        self._graph_in_service: nx.Graph = nx.Graph()

    # =========================================================================
    # Properties
    # =========================================================================

    @property
    def node_count(self) -> int:
        """Return the number of nodes in the network."""
        return len(self.nodes)

    @property
    def branch_count(self) -> int:
        """Return the total number of branches (all, regardless of in_service)."""
        return len(self.branches)

    @property
    def in_service_branch_count(self) -> int:
        """Return the number of in-service branches."""
        return sum(1 for b in self.branches.values() if b.in_service)

    # =========================================================================
    # Node CRUD Operations
    # =========================================================================

    def add_node(self, node: Node) -> None:
        """
        Add a node to the network.

        Args:
            node: Node to add.

        Raises:
            ValueError: If node ID already exists, node validation fails,
                        or a SLACK node already exists when adding another SLACK.
        """
        # Check uniqueness
        if node.id in self.nodes:
            raise ValueError(f"Node with id '{node.id}' already exists")

        # Check node validation
        if not node.validate():
            raise ValueError(
                f"Node '{node.id}' failed validation. "
                f"Ensure all required fields are set correctly for node type {node.node_type}."
            )

        # Check SLACK uniqueness
        if node.node_type == NodeType.SLACK and self.has_slack_node():
            raise ValueError(
                f"Cannot add SLACK node '{node.id}': "
                f"a SLACK node already exists in the network"
            )

        # Add to nodes dict
        self.nodes[node.id] = node

        # Add to both graphs as a vertex
        self._graph_all.add_node(node.id)
        self._graph_in_service.add_node(node.id)

    def remove_node(self, node_id: str) -> None:
        """
        Remove a node and all its incident branches from the network.

        Args:
            node_id: ID of the node to remove.

        Raises:
            KeyError: If node does not exist.
        """
        if node_id not in self.nodes:
            raise KeyError(f"Node '{node_id}' does not exist")

        # Find and remove all incident branches (deterministically sorted)
        incident_branch_ids = sorted([
            branch_id
            for branch_id, branch in self.branches.items()
            if branch.from_node_id == node_id or branch.to_node_id == node_id
        ])

        for branch_id in incident_branch_ids:
            del self.branches[branch_id]

        # Remove node from nodes dict
        del self.nodes[node_id]

        # Rebuild graphs
        self.rebuild_graphs()

    def get_node(self, node_id: str) -> Node:
        """
        Get a node by its ID.

        Args:
            node_id: ID of the node to retrieve.

        Returns:
            The Node object.

        Raises:
            KeyError: If node does not exist.
        """
        if node_id not in self.nodes:
            raise KeyError(f"Node '{node_id}' does not exist")
        return self.nodes[node_id]

    # =========================================================================
    # Branch CRUD Operations
    # =========================================================================

    def add_branch(self, branch: Branch, enforce_connected: bool = True) -> None:
        """
        Add a branch to the network.

        Args:
            branch: Branch to add.
            enforce_connected: If True, verifies that the in-service graph
                               remains connected after adding the branch.
                               If connectivity is violated, performs rollback
                               and raises ValueError.

        Raises:
            ValueError: If branch ID already exists, branch validation fails,
                        referenced nodes don't exist, parallel branch exists,
                        or connectivity constraint is violated (when enforced).
        """
        # Check uniqueness
        if branch.id in self.branches:
            raise ValueError(f"Branch with id '{branch.id}' already exists")

        # Check branch validation
        if not branch.validate():
            raise ValueError(
                f"Branch '{branch.id}' failed validation. "
                f"Ensure all required fields are set correctly."
            )

        # Check that both nodes exist
        if branch.from_node_id not in self.nodes:
            raise ValueError(
                f"Branch '{branch.id}' references non-existent from_node_id '{branch.from_node_id}'"
            )
        if branch.to_node_id not in self.nodes:
            raise ValueError(
                f"Branch '{branch.id}' references non-existent to_node_id '{branch.to_node_id}'"
            )

        # Check for parallel branches (undirected)
        if self._graph_all.has_edge(branch.from_node_id, branch.to_node_id):
            raise ValueError(
                f"Cannot add branch '{branch.id}': parallel branch already exists "
                f"between nodes '{branch.from_node_id}' and '{branch.to_node_id}'"
            )

        # Add branch to dict
        self.branches[branch.id] = branch

        # Add edge to _graph_all
        self._graph_all.add_edge(
            branch.from_node_id,
            branch.to_node_id,
            branch_id=branch.id
        )

        # Add edge to _graph_in_service if in_service
        if branch.in_service:
            self._graph_in_service.add_edge(
                branch.from_node_id,
                branch.to_node_id,
                branch_id=branch.id
            )

        # Enforce connectivity if requested
        if enforce_connected:
            if not self._check_in_service_connected():
                # Rollback: remove from graphs and dict
                self._graph_all.remove_edge(branch.from_node_id, branch.to_node_id)
                if branch.in_service:
                    self._graph_in_service.remove_edge(
                        branch.from_node_id, branch.to_node_id
                    )
                del self.branches[branch.id]
                raise ValueError(
                    f"Adding branch '{branch.id}' would make the in-service graph "
                    f"disconnected. Operation rolled back."
                )

    def _check_in_service_connected(self) -> bool:
        """
        Check if the in-service graph is connected.

        Returns:
            True if connected (or trivially connected for 0-1 nodes), False otherwise.
        """
        if self.node_count <= 1:
            return True
        return nx.is_connected(self._graph_in_service)

    def remove_branch(self, branch_id: str) -> None:
        """
        Remove a branch from the network.

        Does not enforce connectivity after removal.

        Args:
            branch_id: ID of the branch to remove.

        Raises:
            KeyError: If branch does not exist.
        """
        if branch_id not in self.branches:
            raise KeyError(f"Branch '{branch_id}' does not exist")

        branch = self.branches[branch_id]

        # Remove from branches dict
        del self.branches[branch_id]

        # Remove edge from _graph_all by finding it via branch_id attribute
        # We need to find the edge and remove it
        edge_to_remove = None
        for u, v, data in self._graph_all.edges(data=True):
            if data.get("branch_id") == branch_id:
                edge_to_remove = (u, v)
                break

        if edge_to_remove:
            self._graph_all.remove_edge(*edge_to_remove)

        # Remove from _graph_in_service if present
        edge_to_remove = None
        for u, v, data in self._graph_in_service.edges(data=True):
            if data.get("branch_id") == branch_id:
                edge_to_remove = (u, v)
                break

        if edge_to_remove:
            self._graph_in_service.remove_edge(*edge_to_remove)

    def get_branch(self, branch_id: str) -> Branch:
        """
        Get a branch by its ID.

        Args:
            branch_id: ID of the branch to retrieve.

        Returns:
            The Branch object.

        Raises:
            KeyError: If branch does not exist.
        """
        if branch_id not in self.branches:
            raise KeyError(f"Branch '{branch_id}' does not exist")
        return self.branches[branch_id]

    # =========================================================================
    # Graph Rebuild
    # =========================================================================

    def rebuild_graphs(self) -> None:
        """
        Rebuild both internal graphs from nodes and branches dictionaries.

        This clears and rebuilds _graph_all and _graph_in_service:
        - All nodes are added as vertices to both graphs
        - All branches are added as edges to _graph_all
        - Only in-service branches are added to _graph_in_service
        - Each edge has a 'branch_id' attribute
        """
        # Clear graphs
        self._graph_all.clear()
        self._graph_in_service.clear()

        # Add all nodes to both graphs
        for node_id in self.nodes:
            self._graph_all.add_node(node_id)
            self._graph_in_service.add_node(node_id)

        # Add edges
        for branch in self.branches.values():
            # Add to _graph_all
            self._graph_all.add_edge(
                branch.from_node_id,
                branch.to_node_id,
                branch_id=branch.id
            )

            # Add to _graph_in_service only if in_service
            if branch.in_service:
                self._graph_in_service.add_edge(
                    branch.from_node_id,
                    branch.to_node_id,
                    branch_id=branch.id
                )

    # =========================================================================
    # SLACK Node Operations
    # =========================================================================

    def has_slack_node(self) -> bool:
        """
        Check if the network has at least one SLACK node.

        Returns:
            True if at least one SLACK node exists, False otherwise.
        """
        return any(node.node_type == NodeType.SLACK for node in self.nodes.values())

    def get_slack_node(self) -> Node:
        """
        Get the unique SLACK node in the network.

        Returns:
            The SLACK node.

        Raises:
            ValueError: If there is not exactly one SLACK node.
        """
        slack_nodes = [
            node for node in self.nodes.values()
            if node.node_type == NodeType.SLACK
        ]

        if len(slack_nodes) == 0:
            raise ValueError("No SLACK node exists in the network")
        if len(slack_nodes) > 1:
            raise ValueError(
                f"Multiple SLACK nodes found: {[n.id for n in slack_nodes]}. "
                f"Expected exactly one."
            )

        return slack_nodes[0]

    # =========================================================================
    # Topological Analysis
    # =========================================================================

    def get_connected_nodes(
        self, node_id: str, in_service_only: bool = True
    ) -> List[Node]:
        """
        Get all nodes in the same connected component as the given node.

        Args:
            node_id: ID of the node to query.
            in_service_only: If True, uses operational topology (_graph_in_service).
                             If False, uses physical topology (_graph_all).

        Returns:
            List of Node objects in the same connected component (including the
            queried node). If the node is isolated, returns a list containing
            only that node.

        Raises:
            KeyError: If node does not exist.
        """
        if node_id not in self.nodes:
            raise KeyError(f"Node '{node_id}' does not exist")

        graph = self._graph_in_service if in_service_only else self._graph_all

        # Get connected component containing the node
        component_node_ids = nx.node_connected_component(graph, node_id)

        return [self.nodes[nid] for nid in component_node_ids]

    def is_connected(self, in_service_only: bool = True) -> bool:
        """
        Check if the network graph is connected.

        Args:
            in_service_only: If True, checks operational topology (_graph_in_service).
                             If False, checks physical topology (_graph_all).

        Returns:
            True if the graph is connected, False otherwise.
            Returns True for empty or single-node networks.

        Note:
            Since both graphs contain ALL nodes (including isolated ones),
            a graph with isolated nodes will return False.
        """
        if self.node_count == 0:
            return True
        if self.node_count == 1:
            return True

        graph = self._graph_in_service if in_service_only else self._graph_all
        return nx.is_connected(graph)

    def find_islands(self, in_service_only: bool = True) -> List[List[str]]:
        """
        Find all connected components (islands) in the network.

        Args:
            in_service_only: If True, uses operational topology (_graph_in_service).
                             If False, uses physical topology (_graph_all).

        Returns:
            List of islands, where each island is a sorted list of node IDs.
            Islands are sorted by (length, first_node_id) for deterministic output.
        """
        graph = self._graph_in_service if in_service_only else self._graph_all

        # Get connected components
        components = list(nx.connected_components(graph))

        # Convert to sorted lists
        islands = [sorted(list(component)) for component in components]

        # Sort islands by (length, first_id) for deterministic output
        islands.sort(key=lambda island: (len(island), island[0] if island else ""))

        return islands
