from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_uow_factory
from application.analysis_run.read_model import canonicalize_json
from application.sld_projection import SldProjectionService

router = APIRouter()


def _build_service(uow_factory: Any) -> SldProjectionService:
    return SldProjectionService(uow_factory)


@router.get("/cases/{case_id}/sld")
def get_case_sld(
    case_id: str,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    try:
        parsed_case_id = UUID(case_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="case_id must be a valid UUID",
        ) from exc
    service = _build_service(uow_factory)
    try:
        diagram = service.get_sld_for_case(parsed_case_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return canonicalize_json(diagram.to_dict())
