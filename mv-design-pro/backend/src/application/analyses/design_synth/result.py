from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from application.analyses.design_synth.canonical import canonicalize_json


def _format_datetime(value: datetime) -> str:
    if value.tzinfo is None:
        return value.isoformat()
    return value.isoformat()


@dataclass(frozen=True)
class DesignSynthRunResult:
    case_id: UUID
    base_snapshot_id: str
    design_spec_id: UUID
    design_proposal_id: UUID
    design_evidence_id: UUID
    report_json: dict
    created_at: datetime

    def to_dict(self) -> dict[str, Any]:
        payload = {
            "case_id": str(self.case_id),
            "base_snapshot_id": self.base_snapshot_id,
            "design_spec_id": str(self.design_spec_id),
            "design_proposal_id": str(self.design_proposal_id),
            "design_evidence_id": str(self.design_evidence_id),
            "report_json": self.report_json,
            "created_at": _format_datetime(self.created_at),
        }
        return canonicalize_json(payload)
