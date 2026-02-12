"""
Fault Scenarios API — PR-19

REST API endpoints for managing fault scenarios as first-class domain objects.

Endpoints:
    POST   /api/study-cases/{case_id}/fault-scenarios  — Create scenario
    GET    /api/study-cases/{case_id}/fault-scenarios  — List scenarios
    DELETE /api/fault-scenarios/{scenario_id}           — Delete scenario

All responses use Polish error messages for UI consistency.
ZERO heuristics. ZERO auto-completion.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from application.fault_scenario_service import (
    FaultScenarioDuplicateError,
    FaultScenarioNotFoundError,
    FaultScenarioService,
)
from domain.fault_scenario import (
    FaultScenarioValidationError,
    FaultType,
)

router = APIRouter(tags=["fault-scenarios"])

# Singleton service (in-memory for PR-19)
_service = FaultScenarioService()


def get_fault_scenario_service() -> FaultScenarioService:
    """Get the fault scenario service singleton."""
    return _service


# =============================================================================
# Request/Response Models
# =============================================================================


class FaultLocationRequest(BaseModel):
    """Fault location in the network."""

    element_ref: str = Field(..., description="Identyfikator elementu sieci")
    location_type: str = Field(
        ..., description="Typ lokalizacji: BUS lub BRANCH"
    )
    position: float | None = Field(
        None, description="Pozycja na gałęzi (0..1), wymagane dla BRANCH"
    )


class ShortCircuitConfigRequest(BaseModel):
    """Short-circuit calculation configuration."""

    c_factor: float = Field(1.10, description="Współczynnik napięciowy c (IEC 60909)")
    thermal_time_seconds: float = Field(1.0, description="Czas cieplny [s]")
    include_branch_contributions: bool = Field(
        False, description="Dołącz wkłady gałęziowe"
    )


class CreateFaultScenarioRequest(BaseModel):
    """Request to create a new fault scenario."""

    fault_type: str = Field(
        ..., description="Typ zwarcia: SC_3F, SC_2F, SC_1F"
    )
    location: FaultLocationRequest = Field(
        ..., description="Lokalizacja zwarcia"
    )
    config: ShortCircuitConfigRequest | None = Field(
        None, description="Konfiguracja obliczeń (opcjonalna)"
    )
    z0_bus_data: dict[str, Any] | None = Field(
        None, description="Dane impedancji zerowej (wymagane dla SC_1F)"
    )


class FaultScenarioResponse(BaseModel):
    """Fault scenario response model."""

    scenario_id: str
    study_case_id: str
    analysis_type: str
    fault_type: str
    location: dict[str, Any]
    config: dict[str, Any]
    z0_bus_data: dict[str, Any] | None = None
    content_hash: str


class FaultScenarioListResponse(BaseModel):
    """List of fault scenarios response."""

    scenarios: list[FaultScenarioResponse]
    count: int


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


def _parse_fault_type(value: str) -> str:
    """Validate a fault type string."""
    try:
        FaultType(value)
        return value
    except ValueError as exc:
        valid = ", ".join(t.value for t in FaultType)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nieprawidłowy typ zwarcia: {value}. Dozwolone: {valid}",
        ) from exc


# =============================================================================
# Endpoints
# =============================================================================


@router.post(
    "/api/study-cases/{case_id}/fault-scenarios",
    response_model=FaultScenarioResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_fault_scenario(
    case_id: str,
    request: CreateFaultScenarioRequest,
) -> dict[str, Any]:
    """
    Utwórz nowy scenariusz zwarcia.

    Waliduje invarianty: SC_1F wymaga z0_bus_data,
    BRANCH wymaga pozycji w (0,1), BUS nie może mieć pozycji.
    """
    parsed_case_id = _parse_uuid(case_id, "case_id")
    _parse_fault_type(request.fault_type)
    service = get_fault_scenario_service()

    location_dict = {
        "element_ref": request.location.element_ref,
        "location_type": request.location.location_type,
        "position": request.location.position,
    }

    config_dict = None
    if request.config is not None:
        config_dict = {
            "c_factor": request.config.c_factor,
            "thermal_time_seconds": request.config.thermal_time_seconds,
            "include_branch_contributions": request.config.include_branch_contributions,
        }

    try:
        scenario = service.create_scenario(
            study_case_id=parsed_case_id,
            fault_type=request.fault_type,
            location=location_dict,
            config=config_dict,
            z0_bus_data=request.z0_bus_data,
        )
        return scenario.to_dict()
    except FaultScenarioValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except FaultScenarioDuplicateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.get(
    "/api/study-cases/{case_id}/fault-scenarios",
    response_model=FaultScenarioListResponse,
)
def list_fault_scenarios(case_id: str) -> dict[str, Any]:
    """
    Lista scenariuszy zwarcia dla przypadku obliczeniowego.

    Posortowane deterministycznie po (fault_type, element_ref).
    """
    parsed_case_id = _parse_uuid(case_id, "case_id")
    service = get_fault_scenario_service()

    scenarios = service.list_scenarios(parsed_case_id)
    return {
        "scenarios": [s.to_dict() for s in scenarios],
        "count": len(scenarios),
    }


@router.delete(
    "/api/fault-scenarios/{scenario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
def delete_fault_scenario(scenario_id: str) -> None:
    """
    Usuń scenariusz zwarcia.
    """
    parsed_id = _parse_uuid(scenario_id, "scenario_id")
    service = get_fault_scenario_service()

    try:
        service.delete_scenario(parsed_id)
    except FaultScenarioNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
