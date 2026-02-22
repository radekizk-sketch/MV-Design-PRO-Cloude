"""
ENM API — persistence + validation + run dispatch + topology operations.

Routes:
  GET  /api/cases/{case_id}/enm              → current EnergyNetworkModel
  PUT  /api/cases/{case_id}/enm              → autosave (revision++, hash recomputed)
  GET  /api/cases/{case_id}/enm/validate     → ValidationResult
  GET  /api/cases/{case_id}/enm/topology     → TopologyGraph (substations, bays, junctions, corridors)
  GET  /api/cases/{case_id}/enm/topology/summary → TopologySummary (graph view: adjacency, spine, laterals)
  GET  /api/cases/{case_id}/enm/readiness    → ReadinessMatrix (SC/PF/PR)
  POST /api/cases/{case_id}/enm/ops          → Topology operations (atomic graph CRUD)
  POST /api/cases/{case_id}/runs/short-circuit → dispatch SC run via ENM
  POST /api/cases/{case_id}/runs/power-flow    → dispatch PF run via ENM
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

from pydantic import BaseModel, Field

from enm.hash import compute_enm_hash
from enm.mapping import map_enm_to_network_graph
from enm.models import EnergyNetworkModel, ENMDefaults, ENMHeader
from enm.topology_ops import (
    TopologySummary,
    attach_protection,
    compute_topology_summary,
    create_branch,
    create_device,
    create_measurement,
    create_node,
    delete_branch,
    delete_device,
    delete_measurement,
    delete_node,
    detach_protection,
    update_branch,
    update_device,
    update_node,
    update_protection,
)
from enm.validator import ENMValidator, ValidationResult

from application.eligibility_service import EligibilityService

from application.network_wizard.schema import (
    ApplyStepResponse,
    CanProceedResponse,
    WizardStateResponse,
    WizardStepRequest,
)
from application.network_wizard.step_controller import (
    apply_step as ctrl_apply_step,
    can_proceed as ctrl_can_proceed,
)
from application.network_wizard.validator import validate_wizard_state

router = APIRouter(prefix="/api/cases", tags=["enm"])

# ---------------------------------------------------------------------------
# Persistence layer — ENM stored in DB via repository, with in-memory fallback
# ---------------------------------------------------------------------------
_enm_store: dict[str, EnergyNetworkModel] = {}

# Optional UoW factory — set via configure_enm_persistence()
_uow_factory: Any = None


def configure_enm_persistence(uow_factory: Any) -> None:
    """Configure ENM persistence with a UoW factory (called at app startup)."""
    global _uow_factory
    _uow_factory = uow_factory


def _get_enm(case_id: str) -> EnergyNetworkModel:
    """Get ENM for case: try DB first, then in-memory cache, then create default."""
    # Check in-memory cache first (hot path)
    if case_id in _enm_store:
        return _enm_store[case_id]

    # Try loading from DB
    if _uow_factory is not None:
        try:
            with _uow_factory() as uow:
                row = uow.enm.get_by_case_id(case_id)
                if row is not None:
                    enm = EnergyNetworkModel.model_validate(row["enm_json"])
                    _enm_store[case_id] = enm
                    return enm
        except Exception:
            pass  # Fall through to create default

    # Create empty default
    enm = EnergyNetworkModel(
        header=ENMHeader(
            name=f"Model sieci — {case_id[:8]}",
            defaults=ENMDefaults(),
        ),
    )
    enm.header.hash_sha256 = compute_enm_hash(enm)
    _enm_store[case_id] = enm
    return enm


def _set_enm(case_id: str, enm: EnergyNetworkModel) -> EnergyNetworkModel:
    """Store ENM with revision bump, hash recomputation, and DB persistence."""
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

    # Persist to DB
    if _uow_factory is not None:
        try:
            with _uow_factory() as uow:
                uow.enm.upsert(
                    case_id=case_id,
                    enm_json=enm.model_dump(mode="json"),
                    revision=enm.header.revision,
                    hash_sha256=new_hash,
                    commit=False,
                )
        except Exception:
            pass  # In-memory cache remains authoritative

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


@router.get("/{case_id}/enm/topology")
async def get_enm_topology(case_id: str) -> dict[str, Any]:
    """Zwróć podsumowanie topologii (stacje, pola, węzły T, magistrale)."""
    enm = _get_enm(case_id)
    return {
        "case_id": case_id,
        "substations": [s.model_dump(mode="json") for s in enm.substations],
        "bays": [b.model_dump(mode="json") for b in enm.bays],
        "junctions": [j.model_dump(mode="json") for j in enm.junctions],
        "corridors": [c.model_dump(mode="json") for c in enm.corridors],
        "bus_count": len(enm.buses),
        "branch_count": len(enm.branches),
        "transformer_count": len(enm.transformers),
    }


@router.get("/{case_id}/enm/readiness")
async def get_enm_readiness(case_id: str) -> dict[str, Any]:
    """Zwróć macierz gotowości dla wszystkich typów analiz."""
    enm = _get_enm(case_id)
    validator = ENMValidator()
    validation = validator.validate(enm)
    readiness = validator.readiness(validation)

    has_protection_data = (
        bool(enm.protection_assignments)
        or (bool(enm.bays) and any(
            b.protection_ref is not None for b in enm.bays
        ))
    )

    return {
        "case_id": case_id,
        "enm_revision": enm.header.revision,
        "validation": validation.model_dump(mode="json"),
        "readiness": readiness.model_dump(mode="json"),
        "analysis_readiness": {
            "short_circuit_3f": validation.analysis_available.short_circuit_3f,
            "short_circuit_1f": validation.analysis_available.short_circuit_1f,
            "load_flow": validation.analysis_available.load_flow,
            "protection": has_protection_data and readiness.ready,
        },
        "topology_completeness": {
            "has_substations": len(enm.substations) > 0,
            "has_bays": len(enm.bays) > 0,
            "has_junctions": len(enm.junctions) > 0,
            "has_corridors": len(enm.corridors) > 0,
        },
        "element_counts": {
            "buses": len(enm.buses),
            "branches": len(enm.branches),
            "transformers": len(enm.transformers),
            "sources": len(enm.sources),
            "loads": len(enm.loads),
            "generators": len(enm.generators),
            "substations": len(enm.substations),
            "bays": len(enm.bays),
            "junctions": len(enm.junctions),
            "corridors": len(enm.corridors),
            "measurements": len(enm.measurements),
            "protection_assignments": len(enm.protection_assignments),
        },
    }


# ---------------------------------------------------------------------------
# Engineering Readiness (aggregated UX endpoint)
# ---------------------------------------------------------------------------


@router.get("/{case_id}/engineering-readiness")
async def get_engineering_readiness(case_id: str) -> dict[str, Any]:
    """Agregacyjny endpoint inżynierskiej gotowości modelu.

    Łączy walidację + readiness + fix_action w jeden response
    dla Engineering Readiness Panel.
    NIE zmienia istniejącego /readiness — to nowy endpoint UX.
    Deterministyczny: ten sam ENM → identyczny wynik.
    """
    enm = _get_enm(case_id)
    validator = ENMValidator()
    validation = validator.validate(enm)
    readiness = validator.readiness(validation)

    issues_out: list[dict[str, Any]] = []
    for issue in validation.issues:
        item: dict[str, Any] = {
            "code": issue.code,
            "severity": issue.severity,
            "element_ref": issue.element_refs[0] if issue.element_refs else None,
            "element_refs": issue.element_refs,
            "message_pl": issue.message_pl,
            "wizard_step_hint": issue.wizard_step_hint,
            "suggested_fix": issue.suggested_fix,
            "fix_action": (
                issue.fix_action.model_dump(mode="json")
                if issue.fix_action
                else None
            ),
        }
        issues_out.append(item)

    by_severity = {"BLOCKER": 0, "IMPORTANT": 0, "INFO": 0}
    for issue in validation.issues:
        by_severity[issue.severity] = by_severity.get(issue.severity, 0) + 1

    return {
        "case_id": case_id,
        "enm_revision": enm.header.revision,
        "status": validation.status,
        "ready": readiness.ready,
        "validation": validation.model_dump(mode="json"),
        "readiness": readiness.model_dump(mode="json"),
        "issues": issues_out,
        "total_count": len(issues_out),
        "by_severity": by_severity,
        "analysis_available": validation.analysis_available.model_dump(mode="json"),
    }


# ---------------------------------------------------------------------------
# Analysis Eligibility Matrix (PR-17)
# ---------------------------------------------------------------------------


@router.get("/{case_id}/analysis-eligibility")
async def get_analysis_eligibility(case_id: str) -> dict[str, Any]:
    """Macierz zdolności uruchomienia analiz (eligibility).

    Dla każdego typu analizy (SC_3F, SC_2F, SC_1F, LOAD_FLOW) zwraca:
    - status: ELIGIBLE / INELIGIBLE
    - blockers, warnings, info
    - fix_actions (deklaratywne sugestie naprawcze)
    - content_hash (deterministyczny SHA-256)

    Niezależna od walidacji i readiness — osobna warstwa.
    Deterministyczny: identyczny ENM -> identyczny wynik.
    """
    enm = _get_enm(case_id)
    validator = ENMValidator()
    validation = validator.validate(enm)
    readiness = validator.readiness(validation)

    service = EligibilityService()
    matrix = service.compute_matrix(
        enm=enm,
        readiness=readiness,
        case_id=case_id,
    )

    return matrix.to_dict()


# ---------------------------------------------------------------------------
# Topology Summary (graph view)
# ---------------------------------------------------------------------------


@router.get("/{case_id}/enm/topology/summary")
async def get_topology_summary(case_id: str) -> dict[str, Any]:
    """Zwróć podsumowanie topologiczne: adjacency, spine, laterals.

    Używane przez Tree i SLD do wyświetlania struktury sieci.
    DETERMINISTYCZNE: ten sam ENM → identyczny wynik.
    """
    enm = _get_enm(case_id)
    enm_dict = enm.model_dump(mode="json")
    summary = compute_topology_summary(enm_dict)
    return {
        "case_id": case_id,
        "enm_revision": enm.header.revision,
        "bus_count": summary.bus_count,
        "branch_count": summary.branch_count,
        "transformer_count": summary.transformer_count,
        "source_count": summary.source_count,
        "load_count": summary.load_count,
        "generator_count": summary.generator_count,
        "measurement_count": summary.measurement_count,
        "protection_count": summary.protection_count,
        "is_radial": summary.is_radial,
        "has_cycles": summary.has_cycles,
        "adjacency": [
            {
                "bus_ref": e.bus_ref,
                "neighbor_ref": e.neighbor_ref,
                "via_ref": e.via_ref,
                "via_type": e.via_type,
            }
            for e in summary.adjacency
        ],
        "spine": [
            {
                "bus_ref": s.bus_ref,
                "depth": s.depth,
                "is_source": s.is_source,
                "children_refs": list(s.children_refs),
            }
            for s in summary.spine
        ],
        "lateral_roots": list(summary.lateral_roots),
    }


# ---------------------------------------------------------------------------
# Topology Operations (atomic graph CRUD)
# ---------------------------------------------------------------------------


class TopologyOpRequest(BaseModel):
    """Żądanie operacji topologicznej."""
    op: str = Field(..., description="Typ operacji (create_node, update_node, delete_node, "
                    "create_branch, update_branch, delete_branch, "
                    "create_device, update_device, delete_device, "
                    "create_measurement, delete_measurement, "
                    "attach_protection, update_protection, detach_protection)")
    data: dict[str, Any] = Field(default_factory=dict, description="Dane operacji")


_OP_DISPATCH = {
    "create_node": lambda enm, data: create_node(enm, data),
    "update_node": lambda enm, data: update_node(enm, data),
    "delete_node": lambda enm, data: delete_node(enm, data.get("ref_id", "")),
    "create_branch": lambda enm, data: create_branch(enm, data),
    "update_branch": lambda enm, data: update_branch(enm, data),
    "delete_branch": lambda enm, data: delete_branch(enm, data.get("ref_id", "")),
    "create_device": lambda enm, data: create_device(enm, data),
    "update_device": lambda enm, data: update_device(enm, data),
    "delete_device": lambda enm, data: delete_device(
        enm, data.get("device_type", ""), data.get("ref_id", ""),
    ),
    "create_measurement": lambda enm, data: create_measurement(enm, data),
    "delete_measurement": lambda enm, data: delete_measurement(enm, data.get("ref_id", "")),
    "attach_protection": lambda enm, data: attach_protection(enm, data),
    "update_protection": lambda enm, data: update_protection(enm, data),
    "detach_protection": lambda enm, data: detach_protection(enm, data.get("ref_id", "")),
}


@router.post("/{case_id}/enm/ops")
async def topology_ops(case_id: str, req: TopologyOpRequest) -> dict[str, Any]:
    """Atomic topology operation: validate → mutate → persist.

    Supports: create/update/delete for nodes, branches, devices,
    measurements, and protection assignments.
    Returns operation result with issues and updated ENM revision.
    """
    handler = _OP_DISPATCH.get(req.op)
    if not handler:
        raise HTTPException(
            status_code=400,
            detail=f"Nieznana operacja: '{req.op}'. "
                   f"Dostępne: {', '.join(sorted(_OP_DISPATCH.keys()))}",
        )

    enm = _get_enm(case_id)
    enm_dict = enm.model_dump(mode="json")

    result = handler(enm_dict, req.data)

    if result.success:
        saved = _set_enm(case_id, EnergyNetworkModel.model_validate(result.enm))
        return {
            "success": True,
            "op": req.op,
            "created_ref": result.created_ref,
            "issues": [
                {"code": i.code, "severity": i.severity,
                 "message_pl": i.message_pl, "element_ref": i.element_ref}
                for i in result.issues
            ],
            "revision": saved.header.revision,
        }

    return {
        "success": False,
        "op": req.op,
        "created_ref": None,
        "issues": [
            {"code": i.code, "severity": i.severity,
             "message_pl": i.message_pl, "element_ref": i.element_ref}
            for i in result.issues
        ],
        "revision": enm.header.revision,
    }


class BatchOpsRequest(BaseModel):
    """Żądanie wielu operacji topologicznych (batch)."""
    operations: list[TopologyOpRequest] = Field(
        ..., description="Lista operacji do wykonania sekwencyjnie"
    )


@router.post("/{case_id}/enm/ops/batch")
async def topology_ops_batch(case_id: str, req: BatchOpsRequest) -> dict[str, Any]:
    """Batch topology operations: execute sequentially, rollback all on BLOCKER.

    Each operation is applied sequentially on the result of the previous one.
    If any operation fails with BLOCKER, ALL operations are rolled back.
    """
    enm = _get_enm(case_id)
    enm_dict = enm.model_dump(mode="json")

    results: list[dict[str, Any]] = []
    current_enm = enm_dict

    for op_req in req.operations:
        handler = _OP_DISPATCH.get(op_req.op)
        if not handler:
            return {
                "success": False,
                "results": results,
                "error": f"Nieznana operacja: '{op_req.op}'",
                "revision": enm.header.revision,
            }

        result = handler(current_enm, op_req.data)
        op_result = {
            "op": op_req.op,
            "success": result.success,
            "created_ref": result.created_ref,
            "issues": [
                {"code": i.code, "severity": i.severity,
                 "message_pl": i.message_pl, "element_ref": i.element_ref}
                for i in result.issues
            ],
        }
        results.append(op_result)

        if not result.success:
            # Rollback: return original ENM
            return {
                "success": False,
                "results": results,
                "error": f"Operacja '{op_req.op}' nie powiodła się — rollback",
                "revision": enm.header.revision,
            }

        current_enm = result.enm

    # All operations succeeded — persist
    saved = _set_enm(case_id, EnergyNetworkModel.model_validate(current_enm))
    return {
        "success": True,
        "results": results,
        "error": None,
        "revision": saved.header.revision,
    }


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


# ---------------------------------------------------------------------------
# Wizard step controller endpoints
# ---------------------------------------------------------------------------


@router.get("/{case_id}/wizard/state")
async def get_wizard_state(case_id: str) -> dict[str, Any]:
    """Return full wizard state for case (deterministic).

    Computes K1-K10 step states, readiness matrix, element counts.
    Used for restoring wizard state after refresh / deep-link.
    """
    enm = _get_enm(case_id)
    enm_dict = enm.model_dump(mode="json")
    ws = validate_wizard_state(enm_dict)
    return ws.model_dump(mode="json")


@router.post("/{case_id}/wizard/apply-step")
async def wizard_apply_step(case_id: str, req: WizardStepRequest) -> dict[str, Any]:
    """Atomic step application: preconditions → mutate → postconditions.

    If preconditions fail → original ENM unchanged, success=False.
    If postconditions fail → rollback, original ENM unchanged, success=False.
    On success → ENM saved with revision++, returns new wizard state.
    """
    enm = _get_enm(case_id)
    enm_dict = enm.model_dump(mode="json")

    result = ctrl_apply_step(enm_dict, req.step_id, req.data)

    if result.success:
        # Persist mutated ENM
        saved = _set_enm(case_id, EnergyNetworkModel.model_validate(result.enm))
        saved_dict = saved.model_dump(mode="json")
        ws = validate_wizard_state(saved_dict)
        return ApplyStepResponse(
            success=True,
            step_id=result.step_id,
            precondition_issues=result.precondition_issues,
            postcondition_issues=result.postcondition_issues,
            can_proceed=result.can_proceed,
            current_step=result.current_step,
            next_step=result.next_step,
            revision=saved.header.revision,
            wizard_state=ws,
        ).model_dump(mode="json")

    # Failure: return issues, ENM unchanged
    ws = validate_wizard_state(enm_dict)
    return ApplyStepResponse(
        success=False,
        step_id=result.step_id,
        precondition_issues=result.precondition_issues,
        postcondition_issues=result.postcondition_issues,
        can_proceed=False,
        current_step=result.current_step,
        next_step=result.next_step,
        revision=enm.header.revision,
        wizard_state=ws,
    ).model_dump(mode="json")


@router.get("/{case_id}/wizard/can-proceed")
async def wizard_can_proceed(
    case_id: str, from_step: str = "K1", to_step: str = "K2"
) -> dict[str, Any]:
    """Check if step transition is allowed.

    Forward transitions require no BLOCKER in current step
    and no BLOCKER preconditions for target step.
    Backward transitions are always allowed.
    """
    enm = _get_enm(case_id)
    enm_dict = enm.model_dump(mode="json")
    result = ctrl_can_proceed(from_step, to_step, enm_dict)
    return CanProceedResponse(
        allowed=result.allowed,
        from_step=result.from_step,
        to_step=result.to_step,
        blocking_issues=result.blocking_issues,
    ).model_dump(mode="json")


# ---------------------------------------------------------------------------
# Domain Operations (canonical V1 — semantic network building ops)
# ---------------------------------------------------------------------------


class DomainOpPayloadModel(BaseModel):
    """Payload operacji domenowej."""
    name: str = Field(..., description="Kanoniczna nazwa operacji")
    idempotency_key: str = Field("", description="Klucz idempotencji")
    payload: dict[str, Any] = Field(default_factory=dict)


class DomainOpEnvelopeModel(BaseModel):
    """Wspólny envelope wywołania operacji domenowej."""
    project_id: str = ""
    snapshot_base_hash: str = ""
    operation: DomainOpPayloadModel


@router.post("/{case_id}/enm/domain-ops")
async def domain_ops(case_id: str, req: DomainOpEnvelopeModel) -> dict[str, Any]:
    """Kanoniczny endpoint operacji domenowych V1.

    Wspólny kontrakt dla wszystkich operacji budowy sieci SN:
    add_grid_source_sn, continue_trunk_segment_sn,
    insert_station_on_segment_sn, start_branch_segment_sn,
    insert_section_switch_sn, connect_secondary_ring_sn,
    set_normal_open_point, add_transformer_sn_nn,
    assign_catalog_to_element, update_element_parameters.

    Aliasy (stare nazwy) są tłumaczone automatycznie na nazwy kanoniczne.
    Odpowiedź zawiera: snapshot, readiness, fix_actions, changes,
    selection_hint, audit_trail, domain_events.
    """
    from enm.domain_operations import execute_domain_operation

    enm = _get_enm(case_id)
    enm_dict = enm.model_dump(mode="json")

    # Walidacja snapshot_base_hash (optimistic concurrency)
    current_hash = enm.header.hash_sha256
    if req.snapshot_base_hash and req.snapshot_base_hash != current_hash:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Konflikt wersji: oczekiwany hash '{req.snapshot_base_hash}', "
                f"aktualny '{current_hash}'. Odśwież snapshot i spróbuj ponownie."
            ),
        )

    result = execute_domain_operation(
        enm_dict=enm_dict,
        op_name=req.operation.name,
        payload=req.operation.payload,
    )

    # Persist if operation succeeded (snapshot present and valid)
    if result.get("snapshot") and not result.get("error"):
        try:
            new_enm = EnergyNetworkModel.model_validate(result["snapshot"])
            saved = _set_enm(case_id, new_enm)
            result["snapshot"] = saved.model_dump(mode="json")
        except Exception as e:
            result["error"] = f"Błąd zapisu snapshot: {e}"
            result["error_code"] = "api.snapshot_validation_failed"
            result["snapshot"] = None

    return result
