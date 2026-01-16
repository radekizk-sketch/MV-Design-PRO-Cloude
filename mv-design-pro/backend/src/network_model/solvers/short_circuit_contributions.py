"""
Definicje udziałów zwarciowych (contributions) dla IEC 60909.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class SourceType(Enum):
    GRID = "GRID"
    INVERTER = "INVERTER"


@dataclass(frozen=True)
class ShortCircuitSourceContribution:
    """
    Wkład źródła do prądu w punkcie zwarcia (RMS).

    Attributes:
        source_id: str - identyfikator źródła
        source_name: str - nazwa źródła
        source_type: SourceType - typ źródła (GRID/INVERTER)
        node_id: str | None - identyfikator węzła źródła
        i_contrib_a: float - wkład prądowy [A]
        share: float - udział względny (0.0–1.0)
    """

    source_id: str
    source_name: str
    source_type: SourceType
    node_id: str | None
    i_contrib_a: float
    share: float

    def to_dict(self) -> dict:
        """Zwraca wkład jako dict z czystymi typami JSON."""
        return {
            "source_id": self.source_id,
            "source_name": self.source_name,
            "source_type": self.source_type.value,
            "node_id": self.node_id,
            "i_contrib_a": float(self.i_contrib_a),
            "share": float(self.share),
        }


@dataclass(frozen=True)
class ShortCircuitBranchContribution:
    """
    Wkład źródła do prądu w gałęzi (RMS, moduł).

    Attributes:
        source_id: str - identyfikator źródła
        branch_id: str - identyfikator gałęzi
        from_node_id: str - węzeł początkowy gałęzi
        to_node_id: str - węzeł końcowy gałęzi
        i_contrib_a: float - prąd w gałęzi [A]
        direction: str - kierunek przepływu ("from_to" lub "to_from")
    """

    source_id: str
    branch_id: str
    from_node_id: str
    to_node_id: str
    i_contrib_a: float
    direction: str

    def to_dict(self) -> dict:
        """Zwraca wkład jako dict z czystymi typami JSON."""
        return {
            "source_id": self.source_id,
            "branch_id": self.branch_id,
            "from_node_id": self.from_node_id,
            "to_node_id": self.to_node_id,
            "i_contrib_a": float(self.i_contrib_a),
            "direction": self.direction,
        }
