"""
Moduł rdzeniowy modelu sieci.

Zawiera podstawowe klasy reprezentujące elementy sieci elektroenergetycznej:
węzły (Bus), gałęzie, transformatory oraz graf sieci.

PowerFactory Alignment:
- Bus (Node) = węzeł elektryczny (pojedynczy potencjał)
- Branch = gałąź fizyczna z impedancją
- Switch = aparatura łączeniowa (bez impedancji, tylko OPEN/CLOSE)
- NetworkGraph = topologia sieci
"""

from .bus import Bus
from .node import Node, NodeType
from .branch import BranchType, Branch, LineBranch, TransformerBranch
from .switch import Switch, SwitchType, SwitchState
from .station import Station, StationType
from .graph import NetworkGraph
from .inverter import InverterSource
from .generator import GeneratorType, GeneratorSN, GeneratorNN, ControlMode
from .snapshot import NetworkSnapshot, SnapshotMeta, create_network_snapshot
from .canonical_hash import (
    canonical_json,
    canonical_json_from_dict,
    snapshot_hash,
    verify_hash,
)
from .action_apply import apply_action_to_snapshot
from .action_envelope import (
    ActionEnvelope,
    ActionId,
    ActionIssue,
    ActionResult,
    BatchActionResult,
    ParentSnapshotId,
    EntityId,
    validate_action_envelope,
)
from .ybus import AdmittanceMatrixBuilder

__all__ = [
    # PowerFactory-aligned names
    "Bus",  # Alias for Node
    "Node",
    "NodeType",
    # Branches
    "BranchType",
    "Branch",
    "LineBranch",
    "TransformerBranch",
    # Switching apparatus (no impedance)
    "Switch",
    "SwitchType",
    "SwitchState",
    # Stations (logical containers - no physics)
    "Station",
    "StationType",
    # Network topology
    "NetworkGraph",
    # Sources
    "InverterSource",
    # OZE Generators
    "GeneratorType",
    "GeneratorSN",
    "GeneratorNN",
    "ControlMode",
    # Snapshots (immutable state)
    "NetworkSnapshot",
    "SnapshotMeta",
    "create_network_snapshot",
    # Action handling
    "ActionEnvelope",
    "ActionId",
    "ActionIssue",
    "ActionResult",
    "BatchActionResult",
    "ParentSnapshotId",
    "EntityId",
    "validate_action_envelope",
    "apply_action_to_snapshot",
    # Canonical hashing
    "canonical_json",
    "canonical_json_from_dict",
    "snapshot_hash",
    "verify_hash",
    # Admittance matrix
    "AdmittanceMatrixBuilder",
]
