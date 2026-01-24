"""Designer errors."""

from __future__ import annotations

from dataclasses import dataclass

from application.designer.actions import ActionType


class DesignerError(RuntimeError):
    """Base error for Designer actions."""


@dataclass(frozen=True)
class BlockedActionError(DesignerError):
    action_type: ActionType
    reason: str

    def __str__(self) -> str:
        return f"Action '{self.action_type.value}' is blocked: {self.reason}"


class NotImplementedActionError(DesignerError):
    def __init__(self, action_type: ActionType, message: str) -> None:
        super().__init__(message)
        self.action_type = action_type
