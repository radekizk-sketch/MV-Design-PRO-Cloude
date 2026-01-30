"""Type Catalog API endpoints (P8.2 + P13b)

Provides REST API for Type Library operations:
- Fetch catalog types (line, cable, transformer, switch equipment)
- Assign type_ref to elements (branches, transformers, switches)
- Clear type_ref from elements
- Export/Import type library with governance (P13b)

All assign/clear endpoints return 204 No Content.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from api.dependencies import get_uow_factory
from application.catalog_governance import CatalogGovernanceService
from application.network_wizard import NetworkWizardService
from application.network_wizard.service import NotFound
from network_model.catalog.governance import ImportMode

router = APIRouter(prefix="/catalog", tags=["Type Catalog"])


def _build_service(uow_factory: Any) -> NetworkWizardService:
    return NetworkWizardService(uow_factory)


def _build_governance_service(uow_factory: Any) -> CatalogGovernanceService:
    return CatalogGovernanceService(uow_factory)


class AssignTypePayload(BaseModel):
    """Payload for assigning type_ref to element"""

    type_id: str  # UUID as string


class ImportTypeLibraryPayload(BaseModel):
    """Payload for importing type library"""

    manifest: dict[str, Any]
    line_types: list[dict[str, Any]]
    cable_types: list[dict[str, Any]]
    transformer_types: list[dict[str, Any]]
    switch_types: list[dict[str, Any]]


class ImportProtectionLibraryPayload(BaseModel):
    """Payload for importing protection library (P14b)"""

    manifest: dict[str, Any]
    device_types: list[dict[str, Any]]
    curves: list[dict[str, Any]]
    templates: list[dict[str, Any]]


# ============================================================================
# Type Library Governance (P13b)
# ============================================================================


@router.get("/export")
def export_type_library(
    library_name_pl: str = "Biblioteka typów",
    vendor: str = "MV-DESIGN-PRO",
    series: str = "Standard",
    revision: str = "1.0",
    description_pl: str = "",
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """
    Export type library with deterministic fingerprint (P13b).

    Returns canonical JSON export with manifest and all types.
    Deterministic ordering ensures identical fingerprint for same content.

    Query Parameters:
        library_name_pl: Polish name of the library
        vendor: Vendor/manufacturer name
        series: Product series/line
        revision: Revision string
        description_pl: Optional Polish description
    """
    service = _build_governance_service(uow_factory)
    return service.export_type_library(
        library_name_pl=library_name_pl,
        vendor=vendor,
        series=series,
        revision=revision,
        description_pl=description_pl,
    )


@router.post("/import")
def import_type_library(
    payload: ImportTypeLibraryPayload,
    mode: str = "merge",
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """
    Import type library with conflict detection (P13b).

    Modes:
    - merge (default): Add new types, skip existing (no overwrites)
    - replace: Replace entire library (blocked if types are in use)

    Conflict rules:
    - Existing type_id with different parameters → 409 Conflict
    - REPLACE mode with types in use → 409 Conflict

    Returns ImportReport with added/skipped/conflicts lists.
    """
    # Validate mode
    try:
        import_mode = ImportMode(mode.lower())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mode: {mode}. Must be 'merge' or 'replace'.",
        ) from exc

    service = _build_governance_service(uow_factory)

    try:
        report = service.import_type_library(
            data=payload.model_dump(),
            mode=import_mode,
        )
        return report
    except ValueError as exc:
        # Conflicts detected
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


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


@router.get("/protection/device-types")
def list_protection_device_types(
    uow_factory=Depends(get_uow_factory),
) -> list[dict[str, Any]]:
    """List all protection device types from catalog (P14a - READ-ONLY)"""
    service = _build_service(uow_factory)
    return service.list_protection_device_types()


@router.get("/protection/curves")
def list_protection_curves(
    uow_factory=Depends(get_uow_factory),
) -> list[dict[str, Any]]:
    """List all protection curves from catalog (P14a - READ-ONLY)"""
    service = _build_service(uow_factory)
    return service.list_protection_curves()


@router.get("/protection/templates")
def list_protection_setting_templates(
    uow_factory=Depends(get_uow_factory),
) -> list[dict[str, Any]]:
    """List all protection setting templates from catalog (P14a - READ-ONLY)"""
    service = _build_service(uow_factory)
    return service.list_protection_setting_templates()


@router.get("/protection/device-types/{device_type_id}")
def get_protection_device_type(
    device_type_id: str,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """Get single protection device type by ID (P14a - READ-ONLY)"""
    service = _build_service(uow_factory)
    result = service.get_protection_device_type(device_type_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Protection device type not found: {device_type_id}",
        )
    return result


@router.get("/protection/curves/{curve_id}")
def get_protection_curve(
    curve_id: str,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """Get single protection curve by ID (P14a - READ-ONLY)"""
    service = _build_service(uow_factory)
    result = service.get_protection_curve(curve_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Protection curve not found: {curve_id}",
        )
    return result


@router.get("/protection/templates/{template_id}")
def get_protection_setting_template(
    template_id: str,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """Get single protection setting template by ID (P14a - READ-ONLY)"""
    service = _build_service(uow_factory)
    result = service.get_protection_setting_template(template_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Protection setting template not found: {template_id}",
        )
    return result


# ============================================================================
# Protection Library Governance (P14b)
# ============================================================================


@router.get("/protection/export")
def export_protection_library(
    library_name_pl: str = "Biblioteka zabezpieczeń",
    vendor: str = "MV-DESIGN-PRO",
    series: str = "Standard",
    revision: str = "1.0",
    description_pl: str = "",
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """
    Export protection library with deterministic fingerprint (P14b).

    Returns canonical JSON export with manifest and all protection types.
    Deterministic ordering ensures identical fingerprint for same content.

    Query Parameters:
        library_name_pl: Polish name of the library
        vendor: Vendor/manufacturer name
        series: Product series/line
        revision: Revision string
        description_pl: Optional Polish description
    """
    service = _build_governance_service(uow_factory)
    return service.export_protection_library(
        library_name_pl=library_name_pl,
        vendor=vendor,
        series=series,
        revision=revision,
        description_pl=description_pl,
    )


@router.post("/protection/import")
def import_protection_library(
    payload: ImportProtectionLibraryPayload,
    mode: str = "merge",
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """
    Import protection library with conflict detection and reference validation (P14b).

    Modes:
    - merge (default): Add new types, check immutability (no overwrites)
    - replace: Replace entire library (safe for P14b as no bindings yet)

    Conflict rules:
    - Existing type_id with different parameters → 409 Conflict
    - Template references non-existent device_type/curve → 422 Validation Error

    Returns ProtectionImportReport with added/skipped/conflicts/blocked lists.
    """
    # Validate mode
    try:
        import_mode = ImportMode(mode.lower())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mode: {mode}. Must be 'merge' or 'replace'.",
        ) from exc

    service = _build_governance_service(uow_factory)

    try:
        report = service.import_protection_library(
            data=payload.model_dump(),
            mode=import_mode,
        )
        return report
    except ValueError as exc:
        # Conflicts or validation errors detected
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


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
