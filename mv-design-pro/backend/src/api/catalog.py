"""Type Catalog API endpoints (P8.2 HOTFIX)

Provides REST API for Type Library operations:
- Fetch catalog types (line, cable, transformer, switch equipment)
- Assign type_ref to elements (branches, transformers, switches)
- Clear type_ref from elements

All endpoints return 204 No Content for assign/clear operations.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from api.dependencies import get_uow_factory
from application.network_wizard import NetworkWizardService
from application.network_wizard.service import NotFound

router = APIRouter(prefix="/catalog", tags=["Type Catalog"])


def _build_service(uow_factory: Any) -> NetworkWizardService:
    return NetworkWizardService(uow_factory)


class AssignTypePayload(BaseModel):
    """Payload for assigning type_ref to element"""

    type_id: str  # UUID as string


# ============================================================================
# Fetch catalog types (GET endpoints)
# ============================================================================


@router.get("/line-types")
def list_line_types(
    uow_factory=Depends(get_uow_factory),
) -> list[dict[str, Any]]:
    """List all line types from catalog"""
    service = _build_service(uow_factory)
    return service.list_line_types()


@router.get("/cable-types")
def list_cable_types(
    uow_factory=Depends(get_uow_factory),
) -> list[dict[str, Any]]:
    """List all cable types from catalog"""
    service = _build_service(uow_factory)
    return service.list_cable_types()


@router.get("/transformer-types")
def list_transformer_types(
    uow_factory=Depends(get_uow_factory),
) -> list[dict[str, Any]]:
    """List all transformer types from catalog"""
    service = _build_service(uow_factory)
    return service.list_transformer_types()


@router.get("/switch-equipment-types")
def list_switch_equipment_types(
    uow_factory=Depends(get_uow_factory),
) -> list[dict[str, Any]]:
    """List all switch equipment types from catalog"""
    service = _build_service(uow_factory)
    return service.list_switch_equipment_types()


# ============================================================================
# Assign type_ref (POST endpoints)
# ============================================================================


@router.post("/projects/{project_id}/branches/{branch_id}/type-ref", status_code=204)
def assign_type_to_branch(
    project_id: str,
    branch_id: str,
    payload: AssignTypePayload,
    uow_factory=Depends(get_uow_factory),
) -> Response:
    """Assign type_ref to branch (LineBranch)"""
    try:
        pid = UUID(project_id)
        bid = UUID(branch_id)
        tid = UUID(payload.type_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format",
        ) from exc

    service = _build_service(uow_factory)
    try:
        service.assign_type_ref_to_branch(pid, bid, tid)
    except NotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return Response(status_code=204)


@router.post(
    "/projects/{project_id}/transformers/{transformer_id}/type-ref", status_code=204
)
def assign_type_to_transformer(
    project_id: str,
    transformer_id: str,
    payload: AssignTypePayload,
    uow_factory=Depends(get_uow_factory),
) -> Response:
    """Assign type_ref to transformer (TransformerBranch)"""
    try:
        pid = UUID(project_id)
        tid = UUID(transformer_id)
        type_id = UUID(payload.type_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format",
        ) from exc

    service = _build_service(uow_factory)
    try:
        service.assign_type_ref_to_transformer(pid, tid, type_id)
    except NotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return Response(status_code=204)


@router.post("/projects/{project_id}/switches/{switch_id}/equipment-type", status_code=204)
def assign_equipment_type_to_switch(
    project_id: str,
    switch_id: str,
    payload: AssignTypePayload,
    uow_factory=Depends(get_uow_factory),
) -> Response:
    """Assign equipment_type to switch"""
    try:
        pid = UUID(project_id)
        sid = UUID(switch_id)
        tid = UUID(payload.type_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format",
        ) from exc

    service = _build_service(uow_factory)
    try:
        service.assign_equipment_type_to_switch(pid, sid, tid)
    except NotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return Response(status_code=204)


# ============================================================================
# Clear type_ref (DELETE endpoints)
# ============================================================================


@router.delete("/projects/{project_id}/branches/{branch_id}/type-ref", status_code=204)
def clear_type_from_branch(
    project_id: str,
    branch_id: str,
    uow_factory=Depends(get_uow_factory),
) -> Response:
    """Clear type_ref from branch (set to null)"""
    try:
        pid = UUID(project_id)
        bid = UUID(branch_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format",
        ) from exc

    service = _build_service(uow_factory)
    try:
        service.clear_type_ref_from_branch(pid, bid)
    except NotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return Response(status_code=204)


@router.delete(
    "/projects/{project_id}/transformers/{transformer_id}/type-ref", status_code=204
)
def clear_type_from_transformer(
    project_id: str,
    transformer_id: str,
    uow_factory=Depends(get_uow_factory),
) -> Response:
    """Clear type_ref from transformer (set to null)"""
    try:
        pid = UUID(project_id)
        tid = UUID(transformer_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format",
        ) from exc

    service = _build_service(uow_factory)
    try:
        service.clear_type_ref_from_transformer(pid, tid)
    except NotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return Response(status_code=204)


@router.delete("/projects/{project_id}/switches/{switch_id}/equipment-type", status_code=204)
def clear_equipment_type_from_switch(
    project_id: str,
    switch_id: str,
    uow_factory=Depends(get_uow_factory),
) -> Response:
    """Clear equipment_type from switch"""
    try:
        pid = UUID(project_id)
        sid = UUID(switch_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format",
        ) from exc

    service = _build_service(uow_factory)
    try:
        service.clear_equipment_type_from_switch(pid, sid)
    except NotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return Response(status_code=204)
