"""
ENM API — persistence + validation + run dispatch.

Routes:
  GET  /api/cases/{case_id}/enm           → current EnergyNetworkModel
  PUT  /api/cases/{case_id}/enm           → autosave (revision++, hash recomputed)
  GET  /api/cases/{case_id}/enm/validate  → ValidationResult
  POST /api/cases/{case_id}/runs/short-circuit → dispatch SC run via ENM
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

from enm.hash import compute_enm_hash
from enm.mapping import map_enm_to_network_graph
from enm.models import EnergyNetworkModel, ENMDefaults, ENMHeader
from enm.validator import ENMValidator, ValidationResult

router = APIRouter(prefix="/api/cases", tags=["enm"])

# ---------------------------------------------------------------------------
# In-memory storage (production DB is future scope)
# ---------------------------------------------------------------------------
_enm_store: dict[str, EnergyNetworkModel] = {}


def _get_enm(case_id: str) -> EnergyNetworkModel:
    """Get ENM for case, or create empty default."""
    if case_id not in _enm_store:
        enm = EnergyNetworkModel(
            header=ENMHeader(
                name=f"Model sieci — {case_id[:8]}",
                defaults=ENMDefaults(),
            ),
        )
        enm.header.hash_sha256 = compute_enm_hash(enm)
        _enm_store[case_id] = enm
    return _enm_store[case_id]


def _set_enm(case_id: str, enm: EnergyNetworkModel) -> EnergyNetworkModel:
    """Store ENM with revision bump and hash recomputation."""
    new_hash = compute_enm_hash(enm)

    existing = _enm_store.get(case_id)
    if existing and existing.header.hash_sha256 == new_hash:
        # No-op: identical content
        return existing

    old_rev = existing.header.revision if existing else 0
    enm.header.revision = old_rev + 1
    enm.header.updated_at = datetime.now(timezone.utc)
    enm.header.hash_sha256 = new_hash

    _enm_store[case_id] = enm
    return enm


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/{case_id}/enm")
async def get_enm(case_id: str) -> dict[str, Any]:
    """Return current EnergyNetworkModel for case."""
    enm = _get_enm(case_id)
    return enm.model_dump(mode="json")


@router.put("/{case_id}/enm")
async def put_enm(case_id: str, payload: EnergyNetworkModel) -> dict[str, Any]:
    """Autosave ENM: revision++, hash recomputed."""
    saved = _set_enm(case_id, payload)
    return saved.model_dump(mode="json")


@router.get("/{case_id}/enm/validate")
async def validate_enm(case_id: str) -> dict[str, Any]:
    """Validate ENM and return readiness gate result."""
    enm = _get_enm(case_id)
    validator = ENMValidator()
    result = validator.validate(enm)
    return result.model_dump(mode="json")


# ---------------------------------------------------------------------------
# Run dispatch: ENM → NetworkGraph → Solver → Result
# ---------------------------------------------------------------------------

# Cache: (case_id, enm_hash) → result
_run_cache: dict[tuple[str, str], dict] = {}


@router.post("/{case_id}/runs/short-circuit")
async def run_short_circuit(case_id: str) -> dict[str, Any]:
    """
    Dispatch short-circuit 3F run:
    1. Load ENM
    2. Validate (must not FAIL)
    3. Map ENM → NetworkGraph
    4. Run solver
    5. Cache + return
    """
    enm = _get_enm(case_id)

    # Validate
    validator = ENMValidator()
    validation = validator.validate(enm)
    if validation.status == "FAIL":
        raise HTTPException(
            status_code=422,
            detail=[i.model_dump(mode="json") for i in validation.issues],
        )

    # Check cache
    enm_hash = compute_enm_hash(enm)
    cache_key = (case_id, enm_hash)
    if cache_key in _run_cache:
        return _run_cache[cache_key]

    # Map ENM → NetworkGraph
    graph = map_enm_to_network_graph(enm)

    # Find fault nodes (all buses)
    from network_model.solvers.short_circuit_iec60909 import (
        ShortCircuitIEC60909Solver,
        ShortCircuitType,
    )

    results_per_bus: list[dict] = []

    c_max = 1.10
    tk_s = 1.0

    for node_id in sorted(graph.nodes.keys()):
        try:
            result = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
                graph=graph,
                fault_node_id=node_id,
                c_factor=c_max,
                tk_s=tk_s,
            )
            results_per_bus.append(result.to_dict())
        except Exception:
            # Skip nodes where SC calculation fails
            pass

    response = {
        "case_id": case_id,
        "enm_revision": enm.header.revision,
        "enm_hash": enm_hash,
        "analysis_type": "short_circuit_3f",
        "results": results_per_bus,
    }

    _run_cache[cache_key] = response
    return response
