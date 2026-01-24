"""
Boundary Identification module.

PowerFactory Alignment:
- PCC (Point of Common Coupling) is INTERPRETATION, not physics
- PCC is identified using heuristics, not model structure
- This is an ANALYSIS, not a SOLVER

PCC Definition:
- "PCC – punkt wspólnego przyłączenia" (Polish: Point of Common Coupling)
- The point where the customer's installation connects to the grid
- Usually the bus connected to the external grid source

This module provides heuristic identification of boundaries.
These boundaries are NOT stored in NetworkModel.
"""

from dataclasses import dataclass
from typing import List, Optional, Set
from uuid import UUID


@dataclass
class BoundaryResult:
    """
    Result of boundary identification.

    Attributes:
        pcc_bus_id: Identified PCC bus (if any).
        external_grid_buses: Buses connected to external grid sources.
        boundary_buses: All identified boundary buses.
        confidence: Confidence level of identification (0.0-1.0).
        notes: Human-readable notes about identification.
    """
    pcc_bus_id: Optional[str] = None
    external_grid_buses: tuple = ()
    boundary_buses: tuple = ()
    confidence: float = 0.0
    notes: str = ""

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "pcc_bus_id": self.pcc_bus_id,
            "external_grid_buses": list(self.external_grid_buses),
            "boundary_buses": list(self.boundary_buses),
            "confidence": self.confidence,
            "notes": self.notes,
        }


class BoundaryIdentifier:
    """
    Identifies network boundaries (PCC, etc.) using heuristics.

    PowerFactory Alignment:
    - This is INTERPRETATION, not physics
    - Uses heuristics to identify boundaries
    - Does NOT modify NetworkModel
    - Results are for analysis/reporting only

    Heuristic rules for PCC:
    1. Bus connected to EXTERNAL_GRID source
    2. SLACK node (if no explicit source)
    3. Bus with highest voltage level (fallback)
    """

    def identify_pcc(self, network_graph) -> BoundaryResult:
        """
        Identify the Point of Common Coupling (PCC).

        The PCC is typically the bus where:
        - External grid source is connected
        - Or the SLACK node for power flow
        - Or the highest voltage bus (fallback)

        Args:
            network_graph: NetworkGraph instance.

        Returns:
            BoundaryResult with identified PCC.
        """
        external_grid_buses = []
        slack_buses = []

        # Strategy 1: Find buses with external grid sources
        if hasattr(network_graph, 'inverter_sources'):
            for source in network_graph.inverter_sources.values():
                source_type = getattr(source, 'source_type', None)
                if source_type and str(source_type).upper() == 'EXTERNAL_GRID':
                    external_grid_buses.append(source.node_id)

        # Strategy 2: Find SLACK nodes
        from network_model.core.node import NodeType
        for node_id, node in network_graph.nodes.items():
            if node.node_type == NodeType.SLACK:
                slack_buses.append(node_id)

        # Determine PCC
        pcc_bus_id = None
        confidence = 0.0
        notes = ""

        if external_grid_buses:
            pcc_bus_id = external_grid_buses[0]
            confidence = 0.95
            notes = "PCC identified as bus connected to external grid source"
        elif slack_buses:
            pcc_bus_id = slack_buses[0]
            confidence = 0.8
            notes = "PCC identified as SLACK node (no explicit external grid)"
        else:
            # Fallback: highest voltage bus
            max_voltage = 0.0
            for node_id, node in network_graph.nodes.items():
                if node.voltage_level > max_voltage:
                    max_voltage = node.voltage_level
                    pcc_bus_id = node_id
            if pcc_bus_id:
                confidence = 0.5
                notes = "PCC identified as highest voltage bus (fallback heuristic)"
            else:
                notes = "No PCC could be identified"

        return BoundaryResult(
            pcc_bus_id=pcc_bus_id,
            external_grid_buses=tuple(external_grid_buses),
            boundary_buses=tuple(external_grid_buses or slack_buses or ([pcc_bus_id] if pcc_bus_id else [])),
            confidence=confidence,
            notes=notes,
        )

    def identify_supply_boundaries(self, network_graph) -> List[str]:
        """
        Identify all supply boundary points.

        Supply boundaries are buses where power enters the network.
        This includes:
        - External grid connections
        - Generator connections
        - SLACK nodes

        Args:
            network_graph: NetworkGraph instance.

        Returns:
            List of bus IDs that are supply boundaries.
        """
        boundaries = set()

        # Add buses with inverter sources
        if hasattr(network_graph, 'inverter_sources'):
            for source in network_graph.inverter_sources.values():
                boundaries.add(source.node_id)

        # Add SLACK nodes
        from network_model.core.node import NodeType
        for node_id, node in network_graph.nodes.items():
            if node.node_type == NodeType.SLACK:
                boundaries.add(node_id)

        return sorted(list(boundaries))

    def identify_load_boundaries(self, network_graph) -> List[str]:
        """
        Identify all load boundary points.

        Load boundaries are buses where power exits the network.
        This includes:
        - PQ nodes with loads
        - Consumer connection points

        Args:
            network_graph: NetworkGraph instance.

        Returns:
            List of bus IDs that are load boundaries.
        """
        boundaries = set()

        from network_model.core.node import NodeType
        for node_id, node in network_graph.nodes.items():
            if node.node_type == NodeType.PQ:
                # Check if node has non-zero load
                if node.active_power and node.active_power != 0:
                    boundaries.add(node_id)

        return sorted(list(boundaries))


def identify_pcc(network_graph) -> Optional[str]:
    """
    Convenience function to identify PCC.

    Args:
        network_graph: NetworkGraph instance.

    Returns:
        PCC bus ID or None.
    """
    identifier = BoundaryIdentifier()
    result = identifier.identify_pcc(network_graph)
    return result.pcc_bus_id
