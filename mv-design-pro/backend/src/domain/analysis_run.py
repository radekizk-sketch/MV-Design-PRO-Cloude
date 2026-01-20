from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class AnalysisRun:
    id: UUID
    project_id: UUID
    case_id: UUID | None
    analysis_type: str
    status: str
    input_snapshot_json: dict
    result_summary_json: dict | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
