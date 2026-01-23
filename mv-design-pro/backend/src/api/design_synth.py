from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_uow_factory
from api.schemas.design_synth import (
    ConnectionStudyRequest,
    ConnectionStudyResponse,
)
from application.analyses.design_synth.pipeline import run_connection_study

router = APIRouter(prefix="/analyses/design-synth", tags=["design-synth"])


@router.post("/connection-study", response_model=ConnectionStudyResponse)
def create_connection_study(
    payload: ConnectionStudyRequest,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    try:
        result = run_connection_study(
            payload.case_id,
            payload.base_snapshot_id,
            payload.spec_payload,
            uow_factory=uow_factory,
        )
    except (ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    return result.to_dict()
