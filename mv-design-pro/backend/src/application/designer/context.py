"""Project context for Designer actions."""

from __future__ import annotations

from dataclasses import dataclass, field

from application.designer.state import ProjectState


@dataclass(frozen=True)
class ProjectContext:
    state: ProjectState
    metadata: dict[str, str] = field(default_factory=dict)
