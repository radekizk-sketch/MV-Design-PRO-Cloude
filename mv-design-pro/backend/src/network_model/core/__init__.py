"""
Moduł rdzeniowy modelu sieci.

Zawiera podstawowe klasy reprezentujące elementy sieci elektroenergetycznej:
węzły, gałęzie, transformatory (jako typ gałęzi) oraz graf sieci.
"""

from .node import Node, NodeType
from .branch import BranchType, Branch, LineBranch, TransformerBranch
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
    "Node",
    "NodeType",
    "BranchType",
    "Branch",
    "LineBranch",
    "TransformerBranch",
    "NetworkGraph",
    "InverterSource",
    "NetworkSnapshot",
    "SnapshotMeta",
    "create_network_snapshot",
    "ActionEnvelope",
    "ActionId",
    "ActionIssue",
    "ActionResult",
    "BatchActionResult",
    "ParentSnapshotId",
    "EntityId",
    "validate_action_envelope",
    "apply_action_to_snapshot",
    "AdmittanceMatrixBuilder",
]
