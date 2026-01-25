from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


def _format_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.isoformat()
    return value.isoformat()


@dataclass(frozen=True)
class AnalysisRunSummaryDTO:
    id: UUID
    deterministic_id: str
    analysis_type: str
    status: str
    result_status: str
    created_at: datetime
    finished_at: datetime | None
    input_hash: str
    summary_json: dict[str, Any]
    trace_summary: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "deterministic_id": self.deterministic_id,
            "analysis_type": self.analysis_type,
            "status": self.status,
            "result_status": self.result_status,
            "created_at": _format_datetime(self.created_at),
            "finished_at": _format_datetime(self.finished_at),
            "input_hash": self.input_hash,
            "summary_json": self.summary_json,
            "trace_summary": self.trace_summary,
        }


@dataclass(frozen=True)
class AnalysisRunDetailDTO:
    id: UUID
    deterministic_id: str
    analysis_type: str
    status: str
    result_status: str
    created_at: datetime
    finished_at: datetime | None
    input_hash: str
    summary_json: dict[str, Any]
    trace_summary: dict[str, Any] | None
    input_metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "deterministic_id": self.deterministic_id,
            "analysis_type": self.analysis_type,
            "status": self.status,
            "result_status": self.result_status,
            "created_at": _format_datetime(self.created_at),
            "finished_at": _format_datetime(self.finished_at),
            "input_hash": self.input_hash,
            "summary_json": self.summary_json,
            "trace_summary": self.trace_summary,
            "input_metadata": self.input_metadata,
        }


@dataclass(frozen=True)
class ResultItemDTO:
    id: UUID
    result_type: str
    created_at: datetime
    payload_summary: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "result_type": self.result_type,
            "payload_summary": self.payload_summary,
            "reference": {
                "id": str(self.id),
                "created_at": _format_datetime(self.created_at),
            },
        }


@dataclass(frozen=True)
class ResultListDTO:
    results: tuple[ResultItemDTO, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {"results": [item.to_dict() for item in self.results]}


@dataclass(frozen=True)
class OverlayDTO:
    node_overlays: list[dict[str, Any]] = field(default_factory=list)
    branch_overlays: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {"node_overlays": self.node_overlays, "branch_overlays": self.branch_overlays}


@dataclass(frozen=True)
class TraceDTO:
    trace: dict[str, Any] | list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        return {"trace": self.trace}


@dataclass(frozen=True)
class TraceSummaryDTO:
    count: int
    first_step: str | None
    last_step: str | None
    phases: list[str] = field(default_factory=list)
    duration_ms: float | None = None
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "count": self.count,
            "first_step": self.first_step,
            "last_step": self.last_step,
            "phases": self.phases,
            "duration_ms": self.duration_ms,
            "warnings": self.warnings,
        }
