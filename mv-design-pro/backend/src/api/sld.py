"""
P11a — SLD (Single Line Diagram) API Endpoints

CANONICAL ALIGNMENT:
- SYSTEM_SPEC.md: SLD is visualization layer, not model
- sld_rules.md: Results as overlay only, never written to model
- powerfactory_ui_parity.md: Result overlay in RESULT_VIEW mode

RULES (BINDING):
- SLD overlay is READ-ONLY
- Overlay provides mapping of results to SLD symbols
- Zero mutations to NetworkModel or SLD diagram
- Deterministic sorting of overlay data
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.dependencies import get_uow_factory
from application.analysis_run import ResultsInspectorService, canonicalize_json


router = APIRouter()


def _build_inspector_service(uow_factory: Any) -> ResultsInspectorService:
    return ResultsInspectorService(uow_factory)


@router.get("/projects/{project_id}/sld/{diagram_id}/overlay")
def get_sld_result_overlay(
    project_id: UUID,
    diagram_id: UUID,
    run_id: UUID = Query(..., description="Analysis run ID for result overlay"),
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """
    P11a: Get SLD result overlay for a diagram.

    Maps analysis results to SLD symbols for visualization.
    This is READ-ONLY - does not mutate model or diagram.

    Args:
        project_id: Project UUID
        diagram_id: SLD diagram UUID
        run_id: Analysis run UUID to get results from

    Returns:
        SldResultOverlayDTO with node and branch overlays.

    Overlay contains:
    - nodes: Voltage data (U_pu, U_kV) + SC data (Ikss, Sk) mapped to node symbols
    - branches: Power flow data (P, Q, I, loading%) mapped to branch symbols
    - result_status: FRESH/OUTDATED/NONE to indicate result validity
    """
    service = _build_inspector_service(uow_factory)
    try:
        dto = service.get_sld_result_overlay(project_id, diagram_id, run_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    return canonicalize_json(dto.to_dict())
