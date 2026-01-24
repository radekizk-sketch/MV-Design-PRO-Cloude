"""Designer errors."""

from __future__ import annotations

from dataclasses import dataclass

from application.designer.actions import ActionType
from application.designer.messages import BlockedReason


class DesignerError(RuntimeError):
    """Base error for Designer actions."""


@dataclass(frozen=True)
class BlockedActionError(DesignerError):
    action_type: ActionType
    reason: BlockedReason

    def __str__(self) -> str:
        return (
            f"Action '{self.action_type.value}' is blocked "
            f"[{self.reason.code.value}]: {self.reason.description}"
        )


class NotImplementedActionError(DesignerError):
    def __init__(self, action_type: ActionType, message: str) -> None:
        super().__init__(message)
        self.action_type = action_type
