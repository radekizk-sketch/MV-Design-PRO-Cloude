from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass(frozen=True)
class SubstationMetadata:
    id: UUID
    name: str
    attrs: dict = field(default_factory=dict)
