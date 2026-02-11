"""
Result Contract v1 API — PR-15: Canonical ResultSet endpoint

Endpoints:
    GET  /api/execution/runs/{run_id}/results/v1 — Get ResultSetV1
    GET  /api/result-contract/schema             — Get locked JSON schema

Prefixed to avoid conflicts with existing ResultSet endpoints.
"""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from application.execution_engine import (
    ExecutionEngineService,
    RunNotFoundError,
    ResultSetNotFoundError,
)
from domain.execution import RunStatus
from domain.result_builder_v1 import build_resultset_v1
from domain.result_contract_v1 import ResultSetV1
from domain.result_contract_v1_schema import generate_schema

router = APIRouter(tags=["result-contract-v1"])


def _get_engine() -> ExecutionEngineService:
    """Get the execution engine singleton (shared with execution_runs)."""
    from api.execution_runs import get_engine

    return get_engine()


def _parse_uuid(value: str, field_name: str = "id") -> UUID:
    """Parse and validate a UUID string."""
    try:
        return UUID(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} musi być poprawnym UUID",
        ) from exc


# =============================================================================
# Endpoints
# =============================================================================


@router.get(
    "/api/execution/runs/{run_id}/results/v1",
)
def get_resultset_v1(run_id: str) -> dict[str, Any]:
    """
    Pobierz wyniki w formacie ResultSetV1 (kontrakt kanoniczny).

    Konwertuje istniejący ResultSet do formatu ResultSetV1 z overlay_payload.
    Dostępne tylko dla przebiegów ze statusem DONE.

    GET /api/execution/runs/{run_id}/results/v1
    """
    parsed_run_id = _parse_uuid(run_id, "run_id")
    engine = _get_engine()

    try:
        run = engine.get_run(parsed_run_id)
        if run.status != RunStatus.DONE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Wyniki niedostępne — status przebiegu: {run.status.value}"
                ),
            )
        result_set = engine.get_result_set(parsed_run_id)
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

    # Convert PR-14 ResultSet → ResultSetV1
    rs_dict = result_set.to_dict()
    element_results_raw = [
        {
            "element_ref": er["element_ref"],
            "element_type": er.get("element_type", "unknown"),
            "values": er.get("values", {}),
        }
        for er in rs_dict.get("element_results", [])
    ]

    result_v1 = build_resultset_v1(
        run_id=str(run.id),
        analysis_type=run.analysis_type.value,
        solver_input_hash=run.solver_input_hash,
        validation=rs_dict.get("validation_snapshot", {}),
        readiness=rs_dict.get("readiness_snapshot", {}),
        element_results_raw=element_results_raw,
        global_results=rs_dict.get("global_results", {}),
    )

    return json.loads(result_v1.model_dump_json())


@router.get("/api/result-contract/schema")
def get_result_contract_schema() -> dict[str, Any]:
    """
    Pobierz schemat JSON kontraktu ResultSetV1.

    GET /api/result-contract/schema
    """
    return generate_schema()
