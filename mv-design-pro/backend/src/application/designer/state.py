"""Project state model for Designer actions."""

from __future__ import annotations

from dataclasses import dataclass, field

from application.designer.actions import ActionType


@dataclass(frozen=True)
class ProjectState:
    """State markers used by Designer constraints.

    This state is purely declarative and must not contain physical data.
    """

    available_results: set[ActionType] = field(default_factory=set)
    last_run_timestamps: dict[ActionType, str] = field(default_factory=dict)
    completeness_flags: dict[str, bool] = field(default_factory=dict)

    def is_complete(self, flag: str) -> bool:
        return self.completeness_flags.get(flag, False)

    def has_solver_results(self) -> bool:
        return bool(self.available_results & {ActionType.SHORT_CIRCUIT, ActionType.POWER_FLOW})
