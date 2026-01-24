"""Project context for Designer actions."""

from __future__ import annotations

from dataclasses import dataclass, field

from application.designer.actions import ActionType


@dataclass(frozen=True)
class ProjectContext:
    network_complete: bool
    available_solver_results: set[ActionType] = field(default_factory=set)
    metadata: dict[str, str] = field(default_factory=dict)
