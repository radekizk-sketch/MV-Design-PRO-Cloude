"""Constraint rules for Designer actions."""

from __future__ import annotations

from dataclasses import dataclass

from application.designer.actions import ActionType
from application.designer.context import ProjectContext
from application.designer.messages import BlockedCode, BlockedReason, blocked_reason


@dataclass(frozen=True)
class Allowed:
    """Marker for allowed action."""


@dataclass(frozen=True)
class Blocked:
    reason: BlockedReason


Decision = Allowed | Blocked


def can_run(action_type: ActionType, project_context: ProjectContext) -> Decision:
    state = project_context.state

    if action_type in {ActionType.SHORT_CIRCUIT, ActionType.POWER_FLOW}:
        if state.is_complete("network_complete"):
            return Allowed()
        return Blocked(reason=blocked_reason(BlockedCode.NETWORK_INCOMPLETE))

    if action_type == ActionType.ANALYSIS:
        if state.has_solver_results():
            return Allowed()
        return Blocked(reason=blocked_reason(BlockedCode.NO_SOLVER_RESULTS))

    return Blocked(reason=blocked_reason(BlockedCode.UNSUPPORTED_ACTION))
