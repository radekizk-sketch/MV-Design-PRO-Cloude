from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID, uuid4


AnalysisType = Literal["PF", "SC"]
AnalysisRunStatus = Literal["CREATED", "VALIDATED", "RUNNING", "FINISHED", "FAILED"]


@dataclass(frozen=True)
class AnalysisRun:
    id: UUID
    project_id: UUID
    operating_case_id: UUID
    analysis_type: AnalysisType
    status: AnalysisRunStatus
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: datetime | None = None
    finished_at: datetime | None = None
    input_snapshot: dict = field(default_factory=dict)
    input_hash: str = ""
    result_summary: dict = field(default_factory=dict)
    trace_json: dict | list | None = None
    white_box_trace: list[dict] | None = None
    error_message: str | None = None


def new_analysis_run(
    *,
    project_id: UUID,
    operating_case_id: UUID,
    analysis_type: AnalysisType,
    input_snapshot: dict,
    input_hash: str,
) -> AnalysisRun:
    return AnalysisRun(
        id=uuid4(),
        project_id=project_id,
        operating_case_id=operating_case_id,
        analysis_type=analysis_type,
        status="CREATED",
        input_snapshot=input_snapshot,
        input_hash=input_hash,
    )
