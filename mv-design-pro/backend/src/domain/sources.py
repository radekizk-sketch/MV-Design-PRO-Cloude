from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass(frozen=True)
class Source:
    id: UUID
    project_id: UUID
    node_id: UUID
    name: str
    source_type: str
    attrs: dict = field(default_factory=dict)
    in_service: bool = True
