from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import UUID


@dataclass(frozen=True)
class SldNodeSymbolDTO:
    id: UUID
    node_id: UUID
    x: float
    y: float
    label: str | None = None
    is_pcc: bool = False
    overlay: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "node_id": str(self.node_id),
            "x": self.x,
            "y": self.y,
            "label": self.label,
            "is_pcc": self.is_pcc,
            "overlay": self.overlay,
        }


@dataclass(frozen=True)
class SldBranchSymbolDTO:
    id: UUID
    branch_id: UUID
    from_node_id: UUID
    to_node_id: UUID
    points: tuple[tuple[float, float], ...] = ()
    overlay: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "branch_id": str(self.branch_id),
            "from_node_id": str(self.from_node_id),
            "to_node_id": str(self.to_node_id),
            "points": [{"x": x, "y": y} for x, y in self.points],
            "overlay": self.overlay,
        }


@dataclass(frozen=True)
class SldAnnotationDTO:
    id: UUID
    text: str
    x: float
    y: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "text": self.text,
            "x": self.x,
            "y": self.y,
        }


@dataclass(frozen=True)
class SldDiagramDTO:
    id: UUID
    name: str
    pcc_node_id: UUID | None
    nodes: tuple[SldNodeSymbolDTO, ...] = ()
    branches: tuple[SldBranchSymbolDTO, ...] = ()
    annotations: tuple[SldAnnotationDTO, ...] = ()
    dirty_flag: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "name": self.name,
            "pcc_node_id": str(self.pcc_node_id) if self.pcc_node_id else None,
            "nodes": [node.to_dict() for node in self.nodes],
            "branches": [branch.to_dict() for branch in self.branches],
            "annotations": [annotation.to_dict() for annotation in self.annotations],
            "dirty_flag": self.dirty_flag,
        }
