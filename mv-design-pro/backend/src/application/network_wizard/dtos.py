from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from domain.validation import ValidationReport


@dataclass(frozen=True)
class NodePayload:
    name: str
    node_type: str
    base_kv: float
    attrs: dict[str, Any] = field(default_factory=dict)
    id: UUID | None = None


@dataclass(frozen=True)
class BranchPayload:
    name: str
    branch_type: str
    from_node_id: UUID
    to_node_id: UUID
    in_service: bool = True
    params: dict[str, Any] = field(default_factory=dict)
    id: UUID | None = None


@dataclass(frozen=True)
class LoadPayload:
    name: str
    node_id: UUID
    payload: dict[str, Any]
    in_service: bool = True
    id: UUID | None = None


@dataclass(frozen=True)
class CasePayload:
    name: str
    payload: dict[str, Any]


@dataclass(frozen=True)
class SourcePayload:
    name: str
    node_id: UUID
    source_type: str
    payload: dict[str, Any] = field(default_factory=dict)
    in_service: bool = True
    id: UUID | None = None


@dataclass(frozen=True)
class GroundingPayload:
    grounding_type: str
    params: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class LimitsPayload:
    voltage_limits: dict[str, Any] = field(default_factory=dict)
    thermal_limits: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class TypePayload:
    name: str
    params: dict[str, Any]
    id: UUID | None = None


@dataclass(frozen=True)
class SwitchingStatePayload:
    element_id: UUID
    element_type: str
    in_service: bool


@dataclass(frozen=True)
class FaultSpecPayload:
    fault_type: str
    node_id: UUID | None = None
    branch_id: UUID | None = None
    position_percent: float | None = None
    cmax: float | None = None
    cmin: float | None = None


@dataclass(frozen=True)
class ImportReport:
    created: dict[str, int] = field(default_factory=dict)
    updated: dict[str, int] = field(default_factory=dict)
    skipped: dict[str, int] = field(default_factory=dict)
    errors: tuple[str, ...] = ()
    validation: ValidationReport | None = None


@dataclass(frozen=True)
class ShortCircuitInput:
    graph: Any
    base_mva: float
    pcc_node_id: str
    sources: list[dict[str, Any]]
    loads: list[dict[str, Any]]
    grounding: dict[str, Any]
    limits: dict[str, Any]
    fault_spec: dict[str, Any]
    options: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        sources = sorted(
            [dict(item) for item in self.sources], key=lambda item: str(item.get("id"))
        )
        loads = sorted(
            [dict(item) for item in self.loads], key=lambda item: str(item.get("id"))
        )
        fault_spec = dict(self.fault_spec or {})
        return {
            "base_mva": self.base_mva,
            "pcc_node_id": self.pcc_node_id,
            "sources": sources,
            "loads": loads,
            "grounding": dict(self.grounding or {}),
            "limits": dict(self.limits or {}),
            "fault_spec": fault_spec,
            "options": dict(self.options or {}),
        }
