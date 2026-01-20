from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from domain.sld import SldAnnotation, SldBranchSymbol, SldDiagram, SldNodeSymbol


def _serialize_datetime(value: datetime) -> str:
    return value.isoformat()


@dataclass(frozen=True)
class SldDiagramDTO:
    diagram: SldDiagram
    node_symbols: list[SldNodeSymbol]
    branch_symbols: list[SldBranchSymbol]
    annotations: list[SldAnnotation] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "diagram": {
                "id": str(self.diagram.id),
                "project_id": str(self.diagram.project_id),
                "name": self.diagram.name,
                "version": self.diagram.version,
                "layout_meta": self.diagram.layout_meta,
                "created_at": _serialize_datetime(self.diagram.created_at),
                "updated_at": _serialize_datetime(self.diagram.updated_at),
            },
            "nodes": [
                {
                    "id": str(symbol.id),
                    "diagram_id": str(symbol.diagram_id),
                    "network_node_id": str(symbol.network_node_id),
                    "symbol_type": symbol.symbol_type,
                    "x": symbol.x,
                    "y": symbol.y,
                    "rotation": symbol.rotation,
                    "style": symbol.style,
                }
                for symbol in self.node_symbols
            ],
            "branches": [
                {
                    "id": str(symbol.id),
                    "diagram_id": str(symbol.diagram_id),
                    "network_branch_id": str(symbol.network_branch_id),
                    "from_symbol_id": str(symbol.from_symbol_id),
                    "to_symbol_id": str(symbol.to_symbol_id),
                    "routing": symbol.routing,
                    "style": symbol.style,
                }
                for symbol in self.branch_symbols
            ],
            "annotations": [
                {
                    "id": str(annotation.id),
                    "diagram_id": str(annotation.diagram_id),
                    "text": annotation.text,
                    "x": annotation.x,
                    "y": annotation.y,
                    "style": annotation.style,
                }
                for annotation in self.annotations
            ],
        }


@dataclass(frozen=True)
class SldOverlayDTO:
    diagram_id: str
    analysis_type: str
    node_overlays: dict[str, Any]
    branch_overlays: dict[str, Any]
    run_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = {
            "diagram_id": self.diagram_id,
            "analysis_type": self.analysis_type,
            "node_overlays": self.node_overlays,
            "branch_overlays": self.branch_overlays,
        }
        if self.run_id:
            payload["run_id"] = self.run_id
        return payload
