"""
SLD Geometry Overrides API — RUN #3H §3.

REST API endpoints for project-mode geometry overrides.
Overrides are stored per study case, separate from the layout engine.

Endpoints:
- GET  /api/study-cases/{id}/sld-overrides        — pobierz aktualne
- PUT  /api/study-cases/{id}/sld-overrides        — zapisz deterministycznie
- POST /api/study-cases/{id}/sld-overrides/validate — walidacja bez zapisu
- POST /api/study-cases/{id}/sld-overrides/reset   — reset do pustych
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from api.dependencies import get_uow_factory
from domain.geometry_overrides import (
    OVERRIDES_VERSION,
    GeometryOverrideItemV1,
    OverrideOperationV1,
    OverrideScopeV1,
    ProjectGeometryOverridesV1,
    canonicalize_overrides,
    compute_overrides_hash,
    validate_overrides,
)

router = APIRouter(
    prefix="/api/study-cases",
    tags=["sld-overrides"],
)


# =============================================================================
# Request/Response Models
# =============================================================================


class OverrideItemRequest(BaseModel):
    """Single geometry override item."""

    element_id: str = Field(..., description="ID elementu")
    scope: str = Field(..., description="Zakres: NODE|BLOCK|FIELD|LABEL|EDGE_CHANNEL")
    operation: str = Field(
        ..., description="Operacja: MOVE_DELTA|REORDER_FIELD|MOVE_LABEL"
    )
    payload: dict[str, Any] = Field(..., description="Dane operacji")


class PutOverridesRequest(BaseModel):
    """Request to save geometry overrides."""

    snapshot_hash: str = Field(..., description="Hash snapshotu ENM")
    items: list[OverrideItemRequest] = Field(
        default_factory=list, description="Lista nadpisan"
    )


class ValidateOverridesRequest(BaseModel):
    """Request to validate overrides without saving."""

    snapshot_hash: str = Field(..., description="Hash snapshotu ENM")
    items: list[OverrideItemRequest] = Field(
        default_factory=list, description="Lista nadpisan"
    )
    known_node_ids: list[str] = Field(
        default_factory=list, description="Znane ID wezlow"
    )
    known_block_ids: list[str] = Field(
        default_factory=list, description="Znane ID blokow"
    )


class OverrideItemResponse(BaseModel):
    """Single geometry override item in response."""

    element_id: str
    scope: str
    operation: str
    payload: dict[str, Any]


class OverridesResponse(BaseModel):
    """Geometry overrides response."""

    overrides_version: str
    study_case_id: str
    snapshot_hash: str
    items: list[OverrideItemResponse]
    overrides_hash: str


class ValidationErrorResponse(BaseModel):
    """Single validation error."""

    element_id: str
    code: str
    message: str


class ValidateResponse(BaseModel):
    """Validation response."""

    valid: bool
    errors: list[ValidationErrorResponse]
    overrides_hash: str


# =============================================================================
# Persistent storage (file-backed + in-memory cache) — RUN #3I §I2
# =============================================================================

import json as _json
import os as _os
from pathlib import Path as _Path

# Storage dir: configurable via env, defaults to in-memory only.
# Set SLD_OVERRIDES_DIR to enable file persistence.
_STORAGE_DIR: _Path | None = (
    _Path(_os.environ["SLD_OVERRIDES_DIR"])
    if "SLD_OVERRIDES_DIR" in _os.environ
    else None
)

_overrides_store: dict[str, ProjectGeometryOverridesV1] = {}


def _storage_path(case_id: str) -> _Path | None:
    """Get file path for persistent storage (None if no dir configured)."""
    if _STORAGE_DIR is None:
        return None
    _STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    # Sanitize case_id for filename (replace non-alphanumeric with _)
    safe_id = "".join(c if c.isalnum() or c in "-_" else "_" for c in case_id)
    return _STORAGE_DIR / f"overrides_{safe_id}.json"


def _get_overrides(case_id: str) -> ProjectGeometryOverridesV1:
    """Get overrides for a case (from cache, file, or empty)."""
    if case_id in _overrides_store:
        return _overrides_store[case_id]

    # Try loading from file
    path = _storage_path(case_id)
    if path is not None and path.exists():
        try:
            data = _json.loads(path.read_text(encoding="utf-8"))
            overrides = ProjectGeometryOverridesV1.from_dict(data)
            _overrides_store[case_id] = overrides
            return overrides
        except Exception:
            pass  # Fall through to empty

    return ProjectGeometryOverridesV1(study_case_id=case_id)


def _save_overrides(
    case_id: str, overrides: ProjectGeometryOverridesV1
) -> None:
    """Save overrides for a case (cache + file if configured)."""
    _overrides_store[case_id] = overrides

    # Persist to file if configured
    path = _storage_path(case_id)
    if path is not None:
        path.write_text(
            _json.dumps(overrides.to_dict(), sort_keys=True, indent=2),
            encoding="utf-8",
        )


def clear_overrides_cache() -> None:
    """Clear in-memory cache (for testing). Does NOT delete files."""
    _overrides_store.clear()


def _parse_items(
    items: list[OverrideItemRequest], case_id: str, snapshot_hash: str
) -> ProjectGeometryOverridesV1:
    """Parse request items into domain model."""
    parsed = []
    for item in items:
        try:
            scope = OverrideScopeV1(item.scope)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Nieprawidlowy scope: {item.scope}",
            )
        try:
            operation = OverrideOperationV1(item.operation)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Nieprawidlowa operacja: {item.operation}",
            )
        parsed.append(
            GeometryOverrideItemV1(
                element_id=item.element_id,
                scope=scope,
                operation=operation,
                payload=item.payload,
            )
        )

    return ProjectGeometryOverridesV1(
        overrides_version=OVERRIDES_VERSION,
        study_case_id=case_id,
        snapshot_hash=snapshot_hash,
        items=tuple(parsed),
    )


def _to_response(
    overrides: ProjectGeometryOverridesV1, overrides_hash: str
) -> OverridesResponse:
    """Convert domain model to response."""
    return OverridesResponse(
        overrides_version=overrides.overrides_version,
        study_case_id=overrides.study_case_id,
        snapshot_hash=overrides.snapshot_hash,
        items=[
            OverrideItemResponse(
                element_id=item.element_id,
                scope=item.scope.value,
                operation=item.operation.value,
                payload=item.payload,
            )
            for item in overrides.items
        ],
        overrides_hash=overrides_hash,
    )


# =============================================================================
# Endpoints
# =============================================================================


@router.get("/{case_id}/sld-overrides", response_model=OverridesResponse)
async def get_sld_overrides(case_id: str) -> OverridesResponse:
    """Pobierz aktualne nadpisania geometrii SLD dla przypadku."""
    overrides = _get_overrides(case_id)
    canonical = canonicalize_overrides(overrides)
    h = compute_overrides_hash(canonical)
    return _to_response(canonical, h)


@router.put("/{case_id}/sld-overrides", response_model=OverridesResponse)
async def put_sld_overrides(
    case_id: str,
    body: PutOverridesRequest,
) -> OverridesResponse:
    """Zapisz nadpisania geometrii SLD (deterministycznie)."""
    overrides = _parse_items(body.items, case_id, body.snapshot_hash)
    canonical = canonicalize_overrides(overrides)
    _save_overrides(case_id, canonical)
    h = compute_overrides_hash(canonical)
    return _to_response(canonical, h)


@router.post(
    "/{case_id}/sld-overrides/validate",
    response_model=ValidateResponse,
)
async def validate_sld_overrides(
    case_id: str,
    body: ValidateOverridesRequest,
) -> ValidateResponse:
    """Walidacja nadpisan bez zapisu."""
    overrides = _parse_items(body.items, case_id, body.snapshot_hash)
    canonical = canonicalize_overrides(overrides)
    h = compute_overrides_hash(canonical)

    result = validate_overrides(
        canonical,
        frozenset(body.known_node_ids),
        frozenset(body.known_block_ids),
    )

    return ValidateResponse(
        valid=result.valid,
        errors=[
            ValidationErrorResponse(
                element_id=e.element_id,
                code=e.code,
                message=e.message,
            )
            for e in result.errors
        ],
        overrides_hash=h,
    )


@router.post("/{case_id}/sld-overrides/reset", response_model=OverridesResponse)
async def reset_sld_overrides(case_id: str) -> OverridesResponse:
    """Reset nadpisan do pustych."""
    empty = ProjectGeometryOverridesV1(study_case_id=case_id)
    _save_overrides(case_id, empty)
    h = compute_overrides_hash(empty)
    return _to_response(empty, h)
