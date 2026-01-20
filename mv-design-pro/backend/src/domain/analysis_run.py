from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID


@dataclass(frozen=True)
class AnalysisRun:
    id: UUID
    project_id: UUID
    case_id: UUID | None
    analysis_type: str
    status: str
    input_snapshot_json: dict
    input_hash: str
    result_summary_json: dict | None = None
    error_message: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    finished_at: datetime | None = None

    @property
    def is_valid(self) -> bool:
        return self.status in {"VALIDATED", "FINISHED"}
