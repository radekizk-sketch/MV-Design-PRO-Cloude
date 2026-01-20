from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class SldDiagram:
    id: UUID
    project_id: UUID
    name: str
    version: str
    layout_meta: dict
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class SldNodeSymbol:
    id: UUID
    diagram_id: UUID
    network_node_id: UUID
    symbol_type: str
    x: float
    y: float
    rotation: float
    style: dict = field(default_factory=dict)


@dataclass(frozen=True)
class SldBranchSymbol:
    id: UUID
    diagram_id: UUID
    network_branch_id: UUID
    from_symbol_id: UUID
    to_symbol_id: UUID
    routing: list[dict]
    style: dict = field(default_factory=dict)


@dataclass(frozen=True)
class SldAnnotation:
    id: UUID
    diagram_id: UUID
    text: str
    x: float
    y: float
    style: dict = field(default_factory=dict)
