"""Constraint rules for Designer actions."""

from __future__ import annotations

from dataclasses import dataclass

from application.designer.actions import ActionType
from application.designer.context import ProjectContext


@dataclass(frozen=True)
class Allowed:
    """Marker for allowed action."""


@dataclass(frozen=True)
class Blocked:
    reason: str


Decision = Allowed | Blocked


def can_run(action_type: ActionType, project_context: ProjectContext) -> Decision:
    if action_type in {ActionType.SHORT_CIRCUIT, ActionType.POWER_FLOW}:
        if project_context.network_complete:
            return Allowed()
        return Blocked(reason="Network data is incomplete; action requires a complete network.")

    if action_type == ActionType.ANALYSIS:
        if _has_solver_results(project_context):
            return Allowed()
        return Blocked(
            reason="No solver results available; analysis requires short-circuit or power-flow results."
        )

    return Blocked(reason="Unknown action type.")


def _has_solver_results(project_context: ProjectContext) -> bool:
    return bool(
        project_context.available_solver_results
        & {ActionType.SHORT_CIRCUIT, ActionType.POWER_FLOW}
    )
