from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID, uuid4


@dataclass(frozen=True)
class SldNodeSymbol:
    id: UUID
    node_id: UUID
    x: float
    y: float
    label: str | None = None

    def to_payload(self) -> dict:
        return {
            "id": str(self.id),
            "node_id": str(self.node_id),
            "x": self.x,
            "y": self.y,
            "label": self.label,
        }


@dataclass(frozen=True)
class SldBranchSymbol:
    id: UUID
    branch_id: UUID
    from_node_id: UUID
    to_node_id: UUID
    points: tuple[tuple[float, float], ...] = field(default_factory=tuple)

    def to_payload(self) -> dict:
        return {
            "id": str(self.id),
            "branch_id": str(self.branch_id),
            "from_node_id": str(self.from_node_id),
            "to_node_id": str(self.to_node_id),
            "points": [{"x": x, "y": y} for x, y in self.points],
        }


@dataclass(frozen=True)
class SldAnnotation:
    id: UUID
    text: str
    x: float
    y: float

    def to_payload(self) -> dict:
        return {
            "id": str(self.id),
            "text": self.text,
            "x": self.x,
            "y": self.y,
        }


@dataclass(frozen=True)
class SldDiagram:
    id: UUID
    project_id: UUID
    name: str
    nodes: tuple[SldNodeSymbol, ...] = field(default_factory=tuple)
    branches: tuple[SldBranchSymbol, ...] = field(default_factory=tuple)
    annotations: tuple[SldAnnotation, ...] = field(default_factory=tuple)
    dirty_flag: bool = False

    def to_payload(self) -> dict:
        return {
            "version": 1,
            "name": self.name,
            "nodes": [node.to_payload() for node in self.nodes],
            "branches": [branch.to_payload() for branch in self.branches],
            "annotations": [annotation.to_payload() for annotation in self.annotations],
            "dirty_flag": self.dirty_flag,
        }


def new_sld_diagram(project_id: UUID, name: str) -> SldDiagram:
    return SldDiagram(id=uuid4(), project_id=project_id, name=name)
