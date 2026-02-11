"""
Execution Runs API — PR-14: StudyCase → Run → ResultSet

REST API endpoints for the canonical execution layer.

Endpoints:
    POST   /api/execution/study-cases/{case_id}/runs — Create a new run
    GET    /api/execution/study-cases/{case_id}/runs — List runs for a case
    POST   /api/execution/runs/{run_id}/execute      — Execute a pending run
    GET    /api/execution/runs/{run_id}              — Get run details
    GET    /api/execution/runs/{run_id}/results      — Get result set

Prefixed with /api/execution/ to avoid conflicts with existing case_runs routes.
All responses use Polish error messages for UI consistency.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from application.execution_engine import (
    ExecutionEngineService,
    RunNotFoundError,
    RunNotReadyError,
    RunBlockedError,
    ResultSetNotFoundError,
)
from application.execution_engine.errors import StudyCaseNotFoundError
from domain.execution import ExecutionAnalysisType, RunStatus

router = APIRouter(tags=["execution-runs"])

# Singleton service (in-memory for PR-14)
_engine = ExecutionEngineService()


def get_engine() -> ExecutionEngineService:
    """Get the execution engine singleton."""
    return _engine


# =============================================================================
# Request/Response Models
# =============================================================================


class CreateRunRequest(BaseModel):
    """Request to create a new execution run."""

    analysis_type: str = Field(
        ...,
        description="Typ analizy: SC_3F, SC_1F, LOAD_FLOW",
    )
    solver_input: dict[str, Any] = Field(
        default_factory=dict,
        description="Wejście solvera (zamrożone podczas tworzenia)",
    )
    readiness: dict[str, Any] | None = Field(
        None,
        description="Wynik sprawdzenia gotowości (opcjonalny)",
    )
    eligibility: dict[str, Any] | None = Field(
        None,
        description="Wynik sprawdzenia uprawnień (opcjonalny)",
    )


class RunResponse(BaseModel):
    """Run response model."""

    id: str
    study_case_id: str
    analysis_type: str
    solver_input_hash: str
    status: str
    started_at: str | None = None
    finished_at: str | None = None
    error_message: str | None = None


class RunListResponse(BaseModel):
    """List of runs response."""

    runs: list[RunResponse]
    count: int


class ElementResultResponse(BaseModel):
    """Per-element result in a result set."""

    element_ref: str
    element_type: str
    values: dict[str, Any]


class ResultSetResponse(BaseModel):
    """Result set response model."""

    run_id: str
    analysis_type: str
    validation_snapshot: dict[str, Any]
    readiness_snapshot: dict[str, Any]
    element_results: list[ElementResultResponse]
    global_results: dict[str, Any]
    deterministic_signature: str


class ErrorResponse(BaseModel):
    """Error response model."""

    detail: str
    code: str | None = None


# =============================================================================
# Helper Functions
# =============================================================================


def _parse_uuid(value: str, field_name: str = "id") -> UUID:
    """Parse and validate a UUID string."""
    try:
        return UUID(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} musi być poprawnym UUID",
        ) from exc


def _parse_analysis_type(value: str) -> ExecutionAnalysisType:
    """Parse and validate an analysis type string."""
    try:
        return ExecutionAnalysisType(value)
    except ValueError as exc:
        valid = ", ".join(t.value for t in ExecutionAnalysisType)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nieprawidłowy typ analizy: {value}. Dozwolone: {valid}",
        ) from exc


# =============================================================================
# Endpoints
# =============================================================================


@router.post(
    "/api/execution/study-cases/{case_id}/runs",
    response_model=RunResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_run(
    case_id: str,
    request: CreateRunRequest,
) -> dict[str, Any]:
    """
    Utwórz nowy przebieg obliczeniowy.

    Sprawdza gotowość i uprawnienia przed utworzeniem.
    Solver input jest zamrażany i hashowany deterministycznie.

    POST /api/study-cases/{case_id}/runs
    """
    parsed_case_id = _parse_uuid(case_id, "case_id")
    analysis_type = _parse_analysis_type(request.analysis_type)
    engine = get_engine()

    try:
        run = engine.create_run(
            study_case_id=parsed_case_id,
            analysis_type=analysis_type,
            solver_input=request.solver_input,
            readiness=request.readiness,
            eligibility=request.eligibility,
        )
        return run.to_dict()
    except StudyCaseNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except RunNotReadyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except RunBlockedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.get(
    "/api/execution/study-cases/{case_id}/runs",
    response_model=RunListResponse,
)
def list_runs(case_id: str) -> dict[str, Any]:
    """
    Lista przebiegów obliczeniowych dla przypadku.

    Wyniki posortowane od najnowszego.

    GET /api/study-cases/{case_id}/runs
    """
    parsed_case_id = _parse_uuid(case_id, "case_id")
    engine = get_engine()

    runs = engine.list_runs_for_case(parsed_case_id)
    return {
        "runs": [r.to_dict() for r in runs],
        "count": len(runs),
    }


@router.post(
    "/api/execution/runs/{run_id}/execute",
    response_model=RunResponse,
)
def execute_run(run_id: str) -> dict[str, Any]:
    """
    Wykonaj oczekujący przebieg obliczeniowy.

    Zmienia status z PENDING na RUNNING.
    Faktyczne obliczenia wykonywane są asynchronicznie
    (w PR-14 synchronicznie dla uproszczenia).

    POST /api/runs/{run_id}/execute
    """
    parsed_run_id = _parse_uuid(run_id, "run_id")
    engine = get_engine()

    try:
        run = engine.start_run(parsed_run_id)
        return run.to_dict()
    except RunNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "/api/execution/runs/{run_id}",
    response_model=RunResponse,
)
def get_run(run_id: str) -> dict[str, Any]:
    """
    Pobierz szczegóły przebiegu obliczeniowego.

    GET /api/runs/{run_id}
    """
    parsed_run_id = _parse_uuid(run_id, "run_id")
    engine = get_engine()

    try:
        run = engine.get_run(parsed_run_id)
        return run.to_dict()
    except RunNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "/api/execution/runs/{run_id}/results",
    response_model=ResultSetResponse,
)
def get_run_results(run_id: str) -> dict[str, Any]:
    """
    Pobierz wyniki przebiegu obliczeniowego.

    Dostępne tylko dla przebiegów ze statusem DONE.

    GET /api/runs/{run_id}/results
    """
    parsed_run_id = _parse_uuid(run_id, "run_id")
    engine = get_engine()

    try:
        # First verify run exists and is DONE
        run = engine.get_run(parsed_run_id)
        if run.status != RunStatus.DONE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Wyniki niedostępne — status przebiegu: {run.status.value}",
            )
        result_set = engine.get_result_set(parsed_run_id)
        return result_set.to_dict()
    except RunNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ResultSetNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
