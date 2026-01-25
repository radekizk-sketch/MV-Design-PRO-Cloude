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
from .graph import NetworkGraph
from .inverter import InverterSource
from .snapshot import NetworkSnapshot, SnapshotMeta, create_network_snapshot
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
    # Network topology
    "NetworkGraph",
    # Sources
    "InverterSource",
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
    # Admittance matrix
    "AdmittanceMatrixBuilder",
]
