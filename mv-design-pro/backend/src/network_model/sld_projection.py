"""Deterministic SLD projection from NetworkSnapshot."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Sequence

from network_model.core.branch import BranchType
from network_model.core.snapshot import NetworkSnapshot


@dataclass(frozen=True)
class SldDiagram:
    diagram_id: str
    snapshot_id: str
    elements: tuple["SldElement", ...] = field(default_factory=tuple)

    def to_dict(self) -> dict:
        return {
            "diagram_id": self.diagram_id,
            "snapshot_id": self.snapshot_id,
            "elements": [element.to_dict() for element in self.elements],
        }


@dataclass(frozen=True)
class SldBusElement:
    node_id: str
    element_type: str = field(init=False, default="bus")

    @property
    def identity(self) -> str:
        return self.node_id

    def to_dict(self) -> dict:
        return {"element_type": self.element_type, "node_id": self.node_id}


@dataclass(frozen=True)
class SldBranchElement:
    branch_id: str
    from_node_id: str
    to_node_id: str
    branch_kind: str
    element_type: str = field(init=False, default="branch")

    @property
    def identity(self) -> str:
        return self.branch_id

    def to_dict(self) -> dict:
        return {
            "element_type": self.element_type,
            "branch_id": self.branch_id,
            "from_node_id": self.from_node_id,
            "to_node_id": self.to_node_id,
            "branch_kind": self.branch_kind,
        }


@dataclass(frozen=True)
class SldTransformerElement:
    branch_id: str
    transformer_id: str
    terminals: tuple[str, str]
    element_type: str = field(init=False, default="transformer")

    @property
    def identity(self) -> str:
        return self.transformer_id

    def to_dict(self) -> dict:
        return {
            "element_type": self.element_type,
            "branch_id": self.branch_id,
            "transformer_id": self.transformer_id,
            "terminals": list(self.terminals),
        }


@dataclass(frozen=True)
class SldSourceElement:
    source_id: str
    node_id: str
    element_type: str = field(init=False, default="source")

    @property
    def identity(self) -> str:
        return self.source_id

    def to_dict(self) -> dict:
        return {
            "element_type": self.element_type,
            "source_id": self.source_id,
            "node_id": self.node_id,
        }


@dataclass(frozen=True)
class SldLoadElement:
    load_id: str
    node_id: str
    element_type: str = field(init=False, default="load")

    @property
    def identity(self) -> str:
        return self.load_id

    def to_dict(self) -> dict:
        return {
            "element_type": self.element_type,
            "load_id": self.load_id,
            "node_id": self.node_id,
        }


@dataclass(frozen=True)
class SldPccMarkerElement:
    node_id: str
    element_type: str = field(init=False, default="pcc_marker")

    @property
    def identity(self) -> str:
        return self.node_id

    def to_dict(self) -> dict:
        return {"element_type": self.element_type, "node_id": self.node_id}


SldElement = (
    SldBusElement
    | SldBranchElement
    | SldTransformerElement
    | SldSourceElement
    | SldLoadElement
    | SldPccMarkerElement
)


def project_snapshot_to_sld(snapshot: NetworkSnapshot) -> SldDiagram:
    elements: list[SldElement] = []
    graph = snapshot.graph

    for node in graph.nodes.values():
        elements.append(SldBusElement(node_id=node.id))

    for branch in graph.branches.values():
        if not getattr(branch, "in_service", True):
            continue
        if branch.branch_type == BranchType.TRANSFORMER:
            elements.append(
                SldTransformerElement(
                    branch_id=branch.id,
                    transformer_id=branch.id,
                    terminals=(branch.from_node_id, branch.to_node_id),
                )
            )
        else:
            elements.append(
                SldBranchElement(
                    branch_id=branch.id,
                    from_node_id=branch.from_node_id,
                    to_node_id=branch.to_node_id,
                    branch_kind=branch.branch_type.value,
                )
            )

    for source in graph.inverter_sources.values():
        if not getattr(source, "in_service", True):
            continue
        elements.append(SldSourceElement(source_id=source.id, node_id=source.node_id))

    if graph.pcc_node_id and graph.pcc_node_id in graph.nodes:
        elements.append(SldPccMarkerElement(node_id=graph.pcc_node_id))

    ordered = tuple(sorted(elements, key=_element_sort_key))
    snapshot_id = snapshot.meta.snapshot_id
    return SldDiagram(diagram_id=snapshot_id, snapshot_id=snapshot_id, elements=ordered)


def _element_sort_key(element: SldElement) -> tuple[str, str]:
    return (element.element_type, element.identity)


def sort_elements(elements: Iterable[SldElement]) -> Sequence[SldElement]:
    return tuple(sorted(elements, key=_element_sort_key))
