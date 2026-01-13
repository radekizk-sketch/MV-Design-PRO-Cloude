"""
Node module for power network modeling.

Contains classes for modeling network nodes (buses) with different types:
- SLACK: Reference bus with fixed voltage magnitude and angle
- PQ: Load bus with specified active and reactive power
- PV: Generator bus with specified active power and voltage magnitude

Units:
- Voltage magnitude: p.u. (per-unit) or kV
- Voltage angle: degrees
- Active power: MW
- Reactive power: Mvar
- Voltage level: kV
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Optional


class NodeType(Enum):
    """Enumeration of node types in the network model."""

    SLACK = "SLACK"
    PQ = "PQ"
    PV = "PV"


@dataclass
class Node:
    """
    Network node (bus) representation.

    Attributes:
        id: Unique identifier for the node.
        name: Name/description of the node.
        node_type: Type of the node (SLACK, PQ, PV).
        voltage_level: Nominal voltage level [kV].
        voltage_magnitude: Voltage magnitude [p.u.] (required for SLACK, PV).
        voltage_angle: Voltage angle [degrees] (required for SLACK).
        active_power: Active power [MW] (required for PQ, PV).
        reactive_power: Reactive power [Mvar] (required for PQ).
        in_service: Whether the node is in service (default True).
    """

    id: str
    name: str
    node_type: NodeType
    voltage_level: float = 20.0
    voltage_magnitude: Optional[float] = None
    voltage_angle: Optional[float] = None
    active_power: Optional[float] = None
    reactive_power: Optional[float] = None
    in_service: bool = True

    def __post_init__(self) -> None:
        """
        Validate node parameters after initialization.

        Raises:
            ValueError: If required parameters for the node type are missing.
        """
        if self.node_type == NodeType.SLACK:
            if self.voltage_magnitude is None:
                raise ValueError(
                    f"SLACK node '{self.id}' requires voltage_magnitude"
                )
            if self.voltage_angle is None:
                raise ValueError(
                    f"SLACK node '{self.id}' requires voltage_angle"
                )
        elif self.node_type == NodeType.PQ:
            if self.active_power is None:
                raise ValueError(
                    f"PQ node '{self.id}' requires active_power"
                )
            if self.reactive_power is None:
                raise ValueError(
                    f"PQ node '{self.id}' requires reactive_power"
                )
        elif self.node_type == NodeType.PV:
            if self.active_power is None:
                raise ValueError(
                    f"PV node '{self.id}' requires active_power"
                )
            if self.voltage_magnitude is None:
                raise ValueError(
                    f"PV node '{self.id}' requires voltage_magnitude"
                )

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Node":
        """
        Create a Node instance from a dictionary.

        Args:
            data: Dictionary containing node data.

        Returns:
            Node instance.

        Raises:
            ValueError: If node_type is missing or invalid.
        """
        raw_type = data.get("node_type")

        if raw_type is None:
            raise ValueError("Missing 'node_type' in data")

        # Handle both string and NodeType enum inputs
        if isinstance(raw_type, NodeType):
            node_type = raw_type
        elif isinstance(raw_type, str):
            try:
                node_type = NodeType(raw_type)
            except ValueError:
                valid_types = [nt.value for nt in NodeType]
                raise ValueError(
                    f"Unknown node_type: '{raw_type}'. "
                    f"Valid types are: {valid_types}"
                )
        else:
            raise ValueError(
                f"node_type must be a string or NodeType enum, "
                f"got {type(raw_type).__name__}"
            )

        return cls(
            id=str(data.get("id", "")),
            name=str(data.get("name", "")),
            node_type=node_type,
            voltage_level=float(data.get("voltage_level", 20.0)),
            voltage_magnitude=data.get("voltage_magnitude"),
            voltage_angle=data.get("voltage_angle"),
            active_power=data.get("active_power"),
            reactive_power=data.get("reactive_power"),
            in_service=bool(data.get("in_service", True)),
        )

    def validate(self) -> bool:
        """
        Validate the node data.

        Checks:
        - node_type is a NodeType enum instance
        - id, name are non-empty strings
        - voltage_level > 0
        - Required parameters for node type are present and valid

        Returns:
            True if valid, False otherwise.
        """
        # Check that node_type is a proper NodeType enum instance
        if not isinstance(self.node_type, NodeType):
            return False

        # Validate required string fields are non-empty
        if not self.id or not isinstance(self.id, str):
            return False
        if not self.name or not isinstance(self.name, str):
            return False

        # Validate voltage level
        if self.voltage_level is None or self.voltage_level <= 0:
            return False

        # Validate type-specific requirements
        if self.node_type == NodeType.SLACK:
            if self.voltage_magnitude is None or self.voltage_angle is None:
                return False
            if self.voltage_magnitude <= 0:
                return False
        elif self.node_type == NodeType.PQ:
            if self.active_power is None or self.reactive_power is None:
                return False
        elif self.node_type == NodeType.PV:
            if self.active_power is None or self.voltage_magnitude is None:
                return False
            if self.voltage_magnitude <= 0:
                return False

        return True

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the node to a dictionary representation.

        Returns:
            Dictionary representation of the node.
        """
        result = {
            "id": self.id,
            "name": self.name,
            "node_type": self.node_type.value,
            "voltage_level": self.voltage_level,
            "in_service": self.in_service,
        }

        if self.voltage_magnitude is not None:
            result["voltage_magnitude"] = self.voltage_magnitude
        if self.voltage_angle is not None:
            result["voltage_angle"] = self.voltage_angle
        if self.active_power is not None:
            result["active_power"] = self.active_power
        if self.reactive_power is not None:
            result["reactive_power"] = self.reactive_power

        return result
