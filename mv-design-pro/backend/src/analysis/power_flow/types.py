from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from network_model.core.graph import NetworkGraph


@dataclass
class PowerFlowOptions:
    tolerance: float = 1e-8
    max_iter: int = 30
    damping: float = 1.0
    flat_start: bool = True
    validate: bool = True


@dataclass
class SlackSpec:
    node_id: str
    u_pu: float = 1.0
    angle_rad: float = 0.0


@dataclass
class PQSpec:
    node_id: str
    p_mw: float
    q_mvar: float


@dataclass
class PowerFlowInput:
    graph: Any
    base_mva: float
    slack: SlackSpec
    pq: list[PQSpec]
    options: PowerFlowOptions = field(default_factory=PowerFlowOptions)

    def typed_graph(self) -> "NetworkGraph":
        return self.graph
