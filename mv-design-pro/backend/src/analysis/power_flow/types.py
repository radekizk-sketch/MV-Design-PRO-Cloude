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
class PVSpec:
    node_id: str
    p_mw: float
    u_pu: float
    q_min_mvar: float
    q_max_mvar: float


@dataclass
class ShuntSpec:
    node_id: str
    g_pu: float = 0.0
    b_pu: float = 0.0


@dataclass
class TransformerTapSpec:
    branch_id: str
    tap_ratio: float = 1.0


@dataclass
class BusVoltageLimitSpec:
    node_id: str
    u_min_pu: float
    u_max_pu: float


@dataclass
class BranchLimitSpec:
    branch_id: str
    s_max_mva: float | None = None
    i_max_ka: float | None = None


@dataclass
class PowerFlowInput:
    graph: Any
    base_mva: float
    slack: SlackSpec
    pq: list[PQSpec]
    pv: list[PVSpec] = field(default_factory=list)
    shunts: list[ShuntSpec] = field(default_factory=list)
    taps: list[TransformerTapSpec] = field(default_factory=list)
    bus_limits: list[BusVoltageLimitSpec] = field(default_factory=list)
    branch_limits: list[BranchLimitSpec] = field(default_factory=list)
    options: PowerFlowOptions = field(default_factory=PowerFlowOptions)

    def typed_graph(self) -> "NetworkGraph":
        return self.graph

    def to_dict(self) -> dict:
        pq_payload = [
            {"node_id": spec.node_id, "p_mw": spec.p_mw, "q_mvar": spec.q_mvar}
            for spec in self.pq
        ]
        pv_payload = [
            {
                "node_id": spec.node_id,
                "p_mw": spec.p_mw,
                "u_pu": spec.u_pu,
                "q_min_mvar": spec.q_min_mvar,
                "q_max_mvar": spec.q_max_mvar,
            }
            for spec in self.pv
        ]
        shunts_payload = [
            {"node_id": spec.node_id, "b_pu": spec.b_pu} for spec in self.shunts
        ]
        taps_payload = [
            {"branch_id": spec.branch_id, "tap_ratio": spec.tap_ratio} for spec in self.taps
        ]
        bus_limits_payload = [
            {
                "node_id": spec.node_id,
                "u_min_pu": spec.u_min_pu,
                "u_max_pu": spec.u_max_pu,
            }
            for spec in self.bus_limits
        ]
        branch_limits_payload = [
            {
                "branch_id": spec.branch_id,
                "s_max_mva": spec.s_max_mva,
                "i_max_ka": spec.i_max_ka,
            }
            for spec in self.branch_limits
        ]
        pq_payload.sort(key=lambda item: item["node_id"])
        pv_payload.sort(key=lambda item: item["node_id"])
        shunts_payload.sort(key=lambda item: item["node_id"])
        taps_payload.sort(key=lambda item: item["branch_id"])
        bus_limits_payload.sort(key=lambda item: item["node_id"])
        branch_limits_payload.sort(key=lambda item: item["branch_id"])

        return {
            "base_mva": self.base_mva,
            "slack": {
                "node_id": self.slack.node_id,
                "u_pu": self.slack.u_pu,
                "angle_rad": self.slack.angle_rad,
            },
            "pq": pq_payload,
            "pv": pv_payload,
            "shunts": shunts_payload,
            "taps": taps_payload,
            "bus_limits": bus_limits_payload,
            "branch_limits": branch_limits_payload,
            "options": self.options.__dict__,
        }
