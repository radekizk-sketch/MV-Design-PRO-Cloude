from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ConnectionStudyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: UUID
    base_snapshot_id: str = Field(..., min_length=1)
    spec_payload: dict[str, Any]

    @field_validator("base_snapshot_id")
    @classmethod
    def base_snapshot_id_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("base_snapshot_id must not be empty")
        return value

    @field_validator("spec_payload")
    @classmethod
    def spec_payload_requires_pcc(cls, value: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(value, dict):
            raise ValueError("spec_payload must be an object")
        if "pcc" in value:
            normalized = dict(value)
            normalized.pop("PCC", None)
            return normalized
        if "PCC" in value:
            normalized = dict(value)
            normalized["pcc"] = normalized.pop("PCC")
            return normalized
        raise ValueError("Missing PCC – punkt wspólnego przyłączenia in spec_payload")


class ConnectionStudyResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: UUID
    base_snapshot_id: str
    design_spec_id: UUID
    design_proposal_id: UUID
    design_evidence_id: UUID
    report_json: dict[str, Any]
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def created_at_is_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
