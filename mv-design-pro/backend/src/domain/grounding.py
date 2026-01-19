from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Grounding:
    grounding_type: str
    params: dict = field(default_factory=dict)
