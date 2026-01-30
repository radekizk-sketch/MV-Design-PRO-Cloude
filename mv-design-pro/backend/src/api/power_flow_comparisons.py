"""
Power Flow Comparison API — P20c (A/B)

REST API endpoints for comparing two power flow analysis runs.
100% read-only — no physics calculations, no state mutations.

Endpoints:
- POST /power-flow-comparisons — Create/execute comparison
- GET /power-flow-comparisons/{id} — Get comparison metadata
- GET /power-flow-comparisons/{id}/results — Get comparison results
- GET /power-flow-comparisons/{id}/trace — Get comparison trace

CANONICAL ALIGNMENT:
- P20c: Power Flow A/B Comparison
- Read-only comparison endpoint
- Deterministic response
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from api.dependencies import get_uow_factory
from application.power_flow_comparison import PowerFlowComparisonService
from domain.power_flow_comparison import (
    PowerFlowComparisonError,
    PowerFlowComparisonNotFoundError,
    PowerFlowProjectMismatchError,
    PowerFlowResultNotFoundError,
    PowerFlowRunNotFinishedError,
    PowerFlowRunNotFoundError,
)


router = APIRouter(prefix="/power-flow-comparisons", tags=["power-flow-comparison"])


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================


class CreatePowerFlowComparisonRequest(BaseModel):
    """Request to create a power flow comparison."""
    power_flow_run_id_a: str = Field(
        ...,
        description="UUID pierwszego PowerFlowRun (baseline)",
    )
    power_flow_run_id_b: str = Field(
        ...,
        description="UUID drugiego PowerFlowRun (porownanie)",
    )


class BusDiffRowResponse(BaseModel):
    """Single bus diff row."""
    bus_id: str
    v_pu_a: float
    v_pu_b: float
    angle_deg_a: float
    angle_deg_b: float
    p_injected_mw_a: float
    p_injected_mw_b: float
    q_injected_mvar_a: float
    q_injected_mvar_b: float
    delta_v_pu: float
    delta_angle_deg: float
    delta_p_mw: float
    delta_q_mvar: float


class BranchDiffRowResponse(BaseModel):
    """Single branch diff row."""
    branch_id: str
    p_from_mw_a: float
    p_from_mw_b: float
    q_from_mvar_a: float
    q_from_mvar_b: float
    p_to_mw_a: float
    p_to_mw_b: float
    q_to_mvar_a: float
    q_to_mvar_b: float
    losses_p_mw_a: float
    losses_p_mw_b: float
    losses_q_mvar_a: float
    losses_q_mvar_b: float
    delta_p_from_mw: float
    delta_q_from_mvar: float
    delta_p_to_mw: float
    delta_q_to_mvar: float
    delta_losses_p_mw: float
    delta_losses_q_mvar: float


class RankingIssueResponse(BaseModel):
    """Single ranking issue."""
    issue_code: str
    severity: int
    element_ref: str
    description_pl: str
    evidence_ref: int


class ComparisonSummaryResponse(BaseModel):
    """Comparison summary statistics."""
    total_buses: int
    total_branches: int
    converged_a: bool
    converged_b: bool
    total_losses_p_mw_a: float
    total_losses_p_mw_b: float
    delta_total_losses_p_mw: float
    max_delta_v_pu: float
    max_delta_angle_deg: float
    total_issues: int
    critical_issues: int
    major_issues: int
    moderate_issues: int
    minor_issues: int


class PowerFlowComparisonResultResponse(BaseModel):
    """Full comparison result response."""
    comparison_id: str
    run_a_id: str
    run_b_id: str
    project_id: str
    bus_diffs: list[BusDiffRowResponse]
    branch_diffs: list[BranchDiffRowResponse]
    ranking: list[RankingIssueResponse]
    summary: ComparisonSummaryResponse
    input_hash: str
    created_at: str


class TraceStepResponse(BaseModel):
    """Single trace step."""
    step: str
    description_pl: str
    inputs: dict[str, Any]
    outputs: dict[str, Any]


class PowerFlowComparisonTraceResponse(BaseModel):
    """Full comparison trace response."""
    comparison_id: str
    run_a_id: str
    run_b_id: str
    snapshot_id_a: str | None
    snapshot_id_b: str | None
    input_hash_a: str
    input_hash_b: str
    solver_version: str
    ranking_thresholds: dict[str, float]
    steps: list[TraceStepResponse]
    created_at: str


class PowerFlowComparisonMetadataResponse(BaseModel):
    """Comparison metadata (without full results)."""
    comparison_id: str
    run_a_id: str
    run_b_id: str
    project_id: str
    summary: ComparisonSummaryResponse
    input_hash: str
    created_at: str


# =============================================================================
# SERVICE FACTORY
# =============================================================================


def _build_service(uow_factory: Any) -> PowerFlowComparisonService:
    return PowerFlowComparisonService(uow_factory)


# =============================================================================
# ENDPOINTS
# =============================================================================


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=PowerFlowComparisonResultResponse,
    summary="Utworz porownanie dwoch analiz rozplywu mocy",
    description="""
P20c: Porownuje dwa PowerFlowRun i generuje deterministyczny ranking problemow.

**Walidacje:**
- Oba runy musza istniec
- Oba runy musza miec status FINISHED
- Oba runy musza nalezec do tego samego projektu

**Zwraca:**
- PowerFlowComparisonResult z:
  - bus_diffs: porownanie per szyna (posortowane po bus_id)
  - branch_diffs: porownanie per galaz (posortowane po branch_id)
  - ranking: lista problemow posortowana wg severity (5->1)
  - summary: statystyki porownania

**Cache:**
- Ta sama para (A, B) -> ten sam comparison_id
- A->B != B->A (kierunkowe)
""",
)
def create_power_flow_comparison(
    request: CreatePowerFlowComparisonRequest,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """
    Create a power flow comparison between two runs.

    P20c: Main comparison endpoint.

    INVARIANTS:
    - Read-only: Zero physics calculations, zero state mutations
    - Same Project: Both runs must belong to the same project
    - Finished Only: Both runs must be FINISHED
    - Deterministic: Same inputs produce identical comparison output
    """
    service = _build_service(uow_factory)

    try:
        result = service.compare(
            run_a_id=request.power_flow_run_id_a,
            run_b_id=request.power_flow_run_id_b,
        )
        return result.to_dict()

    except PowerFlowRunNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Power flow run nie znaleziony: {e.run_id}",
        ) from e
    except PowerFlowRunNotFinishedError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Power flow run nie zakonczony (status: {e.status}): {e.run_id}",
        ) from e
    except PowerFlowProjectMismatchError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Runs naleza do roznych projektow: {e.run_a_project} vs {e.run_b_project}",
        ) from e
    except PowerFlowResultNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wyniki power flow nie znalezione dla run: {e.run_id}",
        ) from e
    except PowerFlowComparisonError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.get(
    "/{comparison_id}",
    response_model=PowerFlowComparisonMetadataResponse,
    summary="Pobierz metadane porownania",
)
def get_power_flow_comparison(
    comparison_id: str,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """
    Get power flow comparison metadata.

    Returns comparison ID, run IDs, summary statistics, and timestamps.
    Does not include full bus_diffs/branch_diffs/ranking (use /results endpoint for that).
    """
    service = _build_service(uow_factory)

    try:
        result = service.get_comparison(comparison_id)
        return {
            "comparison_id": result.comparison_id,
            "run_a_id": result.run_a_id,
            "run_b_id": result.run_b_id,
            "project_id": result.project_id,
            "summary": result.summary.to_dict(),
            "input_hash": result.input_hash,
            "created_at": result.created_at.isoformat(),
        }

    except PowerFlowComparisonNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Power flow comparison nie znalezione: {e.comparison_id}",
        ) from e


@router.get(
    "/{comparison_id}/results",
    response_model=PowerFlowComparisonResultResponse,
    summary="Pobierz pelne wyniki porownania",
)
def get_power_flow_comparison_results(
    comparison_id: str,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """
    Get full power flow comparison results.

    Returns all bus_diffs, branch_diffs, ranking issues, and summary.
    """
    service = _build_service(uow_factory)

    try:
        result = service.get_comparison(comparison_id)
        return result.to_dict()

    except PowerFlowComparisonNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Power flow comparison nie znalezione: {e.comparison_id}",
        ) from e


@router.get(
    "/{comparison_id}/trace",
    response_model=PowerFlowComparisonTraceResponse,
    summary="Pobierz slad porownania (audyt)",
)
def get_power_flow_comparison_trace(
    comparison_id: str,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """
    Get power flow comparison trace for audit.

    Returns all comparison steps with inputs/outputs for reproducibility.
    Includes explicit ranking thresholds used.
    """
    service = _build_service(uow_factory)

    try:
        trace = service.get_comparison_trace(comparison_id)
        return trace.to_dict()

    except PowerFlowComparisonNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Power flow comparison nie znalezione: {e.comparison_id}",
        ) from e
