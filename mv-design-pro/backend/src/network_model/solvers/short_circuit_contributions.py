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
    """

    source_id: str
    source_name: str
    source_type: SourceType
    node_id: str | None
    i_contrib_a: float
    share: float


@dataclass(frozen=True)
class ShortCircuitBranchContribution:
    """
    Wkład źródła do prądu w gałęzi (RMS, moduł).
    """

    source_id: str
    branch_id: str
    from_node_id: str
    to_node_id: str
    i_contrib_a: float
    direction: str
