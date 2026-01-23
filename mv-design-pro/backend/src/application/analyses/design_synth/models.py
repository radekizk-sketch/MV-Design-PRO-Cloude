from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class DesignSpec:
    id: UUID
    case_id: UUID
    base_snapshot_id: str
    spec_json: dict
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class DesignProposal:
    id: UUID
    case_id: UUID
    input_snapshot_id: str
    proposal_json: dict
    status: str
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class DesignEvidence:
    id: UUID
    case_id: UUID
    snapshot_id: str
    evidence_json: dict
    created_at: datetime
