"""Execution engine for Designer actions."""

from __future__ import annotations

from dataclasses import dataclass

from application.designer.actions import Action, ActionType, default_actions
from application.designer.constraints import Allowed, Blocked, can_run
from application.designer.context import ProjectContext
from application.designer.errors import BlockedActionError, NotImplementedActionError


@dataclass(frozen=True)
class ActionRunResult:
    action_type: ActionType
    status: str
    message: str


def list_actions(project_context: ProjectContext) -> list[Action]:
    _ = project_context
    return default_actions()


def can_run_action(action: Action, project_context: ProjectContext) -> Allowed | Blocked:
    return can_run(action.action_type, project_context)


def run(action: Action, project_context: ProjectContext) -> ActionRunResult:
    decision = can_run_action(action, project_context)
    if isinstance(decision, Blocked):
        raise BlockedActionError(action_type=action.action_type, reason=decision.reason)

    if action.action_type == ActionType.ANALYSIS:
        raise NotImplementedActionError(
            action_type=action.action_type,
            message="Run Analysis is not implemented yet.",
        )

    return ActionRunResult(
        action_type=action.action_type,
        status="REQUESTED",
        message="Action accepted; execution is delegated to the solver layer.",
    )
