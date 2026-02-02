"""
Reference Patterns API — Wzorce odniesienia

READ-ONLY API for running and viewing reference pattern validations.
Pattern A: Dobór I>> dla linii SN (selektywność, czułość, cieplne, SPZ)

CANONICAL ALIGNMENT:
- NOT-A-SOLVER: Reference patterns are INTERPRETATION layer (no physics)
- WHITE BOX: Full trace of validation steps
- DETERMINISM: Same inputs → identical outputs
- Polish labels (100% PL UI)

NO CODENAMES IN UI.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from application.reference_patterns import (
    PATTERN_ID,
    PATTERN_NAME_PL,
    PATTERN_A_FIXTURES_SUBDIR,
    ReferencePatternResult,
    run_pattern_a,
    load_fixture,
    fixture_to_input,
    get_pattern_a_fixtures_dir,
)

router = APIRouter(
    prefix="/api/reference-patterns",
    tags=["reference-patterns"],
)


# =============================================================================
# Request/Response Models
# =============================================================================


class PatternMetadata(BaseModel):
    """Pattern metadata for listing."""

    pattern_id: str
    name_pl: str
    description_pl: str


class FixtureMetadata(BaseModel):
    """Fixture metadata for listing."""

    fixture_id: str
    filename: str
    description: str | None = None
    expected_verdict: str | None = None
    notes_pl: str | None = None


class PatternRunRequest(BaseModel):
    """Request body for running a pattern."""

    pattern_id: str
    fixture_file: str | None = None
    input_override: dict[str, Any] | None = None


class PatternRunResponse(BaseModel):
    """Response for pattern run."""

    run_id: str
    pattern_id: str
    name_pl: str
    verdict: str
    verdict_description_pl: str
    summary_pl: str
    checks: list[dict[str, Any]]
    trace: list[dict[str, Any]]
    artifacts: dict[str, Any]


class PatternListResponse(BaseModel):
    """Response for pattern list."""

    patterns: list[PatternMetadata]


class FixtureListResponse(BaseModel):
    """Response for fixture list."""

    pattern_id: str
    fixtures: list[FixtureMetadata]


# =============================================================================
# Helper Functions
# =============================================================================


def result_to_response(result: ReferencePatternResult, run_id: str) -> PatternRunResponse:
    """Convert ReferencePatternResult to API response."""
    data = result.to_dict()
    return PatternRunResponse(
        run_id=run_id,
        pattern_id=data["pattern_id"],
        name_pl=data["name_pl"],
        verdict=data["verdict"],
        verdict_description_pl=data["verdict_description_pl"],
        summary_pl=data["summary_pl"],
        checks=data["checks"],
        trace=data["trace"],
        artifacts=data["artifacts"],
    )


def list_pattern_a_fixtures() -> list[FixtureMetadata]:
    """List available fixtures for Pattern A."""
    fixtures_dir = get_pattern_a_fixtures_dir()
    fixtures: list[FixtureMetadata] = []

    if not fixtures_dir.exists():
        return fixtures

    for filepath in sorted(fixtures_dir.glob("*.json")):
        try:
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)

            fixture_id = filepath.stem
            fixtures.append(
                FixtureMetadata(
                    fixture_id=fixture_id,
                    filename=filepath.name,
                    description=data.get("_description"),
                    expected_verdict=data.get("_expected_verdict"),
                    notes_pl=data.get("_notes_pl"),
                )
            )
        except (json.JSONDecodeError, OSError):
            # Skip invalid files
            continue

    return fixtures


# =============================================================================
# Endpoints
# =============================================================================


@router.get("/patterns", response_model=PatternListResponse)
async def list_patterns() -> PatternListResponse:
    """
    List available reference patterns.

    Currently only Pattern A is available.
    """
    patterns = [
        PatternMetadata(
            pattern_id=PATTERN_ID,
            name_pl=PATTERN_NAME_PL,
            description_pl="Wzorzec walidacji doboru nastaw I>> dla linii SN — "
            "selektywność, czułość, wytrzymałość cieplna, blokada SPZ",
        )
    ]
    return PatternListResponse(patterns=patterns)


@router.get("/patterns/{pattern_id}/fixtures", response_model=FixtureListResponse)
async def list_pattern_fixtures(pattern_id: str) -> FixtureListResponse:
    """
    List available fixtures (test cases) for a pattern.

    Pattern A fixtures: case_A_zgodne, case_B_niezgodne, case_C_graniczne
    """
    if pattern_id != PATTERN_ID:
        raise HTTPException(
            status_code=404,
            detail=f"Wzorzec '{pattern_id}' nie istnieje. Dostępny: {PATTERN_ID}",
        )

    fixtures = list_pattern_a_fixtures()
    return FixtureListResponse(pattern_id=pattern_id, fixtures=fixtures)


@router.post("/run", response_model=PatternRunResponse)
async def run_pattern(request: PatternRunRequest) -> PatternRunResponse:
    """
    Run a reference pattern validation.

    Args:
        request: Pattern run request with pattern_id and optional fixture/input override

    Returns:
        Pattern validation result with verdict, checks, trace, and artifacts
    """
    if request.pattern_id != PATTERN_ID:
        raise HTTPException(
            status_code=400,
            detail=f"Nieznany wzorzec: '{request.pattern_id}'. Dostępny: {PATTERN_ID}",
        )

    run_id = str(uuid4())

    try:
        if request.fixture_file:
            # Run with fixture
            result = run_pattern_a(fixture_file=request.fixture_file)
        elif request.input_override:
            # Run with custom input
            # For now, we require a fixture base — override functionality can be added later
            raise HTTPException(
                status_code=400,
                detail="Uruchomienie z input_override wymaga bazowego fixture_file",
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Wymagany fixture_file lub input_override",
            )

        return result_to_response(result, run_id)

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Błąd wykonania wzorca: {str(e)}",
        )


@router.get("/fixtures/{fixture_file}", response_model=PatternRunResponse)
async def run_pattern_with_fixture(fixture_file: str) -> PatternRunResponse:
    """
    Run Pattern A with a specific fixture file (convenience GET endpoint).

    Args:
        fixture_file: Fixture filename (e.g., "case_A_zgodne.json")

    Returns:
        Pattern validation result
    """
    run_id = str(uuid4())

    try:
        result = run_pattern_a(fixture_file=fixture_file)
        return result_to_response(result, run_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Błąd wykonania wzorca: {str(e)}",
        )
