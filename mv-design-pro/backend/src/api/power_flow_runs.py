"""P20a/P20b: Dedykowane API endpoints dla Power Flow v1.

Endpoints:
- GET /projects/{project_id}/power-flow-runs (list - P20b)
- POST /projects/{project_id}/power-flow-runs (create)
- POST /power-flow-runs/{run_id}/execute (execute)
- GET /power-flow-runs/{run_id} (meta)
- GET /power-flow-runs/{run_id}/results (PowerFlowResultV1)
- GET /power-flow-runs/{run_id}/trace (PowerFlowTrace)
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from api.dependencies import get_uow_factory
from application.analysis_run import (
    AnalysisRunService,
    build_deterministic_id,
    build_input_metadata,
    build_trace_summary,
    canonicalize_json,
    get_run_trace,
)
from infrastructure.persistence.unit_of_work import UnitOfWork


router = APIRouter(tags=["power-flow"])


# =============================================================================
# Pydantic Request/Response Models
# =============================================================================


class PowerFlowRunCreateRequest(BaseModel):
    """P20a: Request do utworzenia power flow run."""
    operating_case_id: UUID | None = Field(
        default=None,
        description="ID przypadku operacyjnego. Jeśli None, użyje Active Case."
    )
    options: dict[str, Any] | None = Field(
        default=None,
        description="Opcje solvera (tolerance, max_iter, trace_level, etc.)"
    )


class PowerFlowRunResponse(BaseModel):
    """P20a: Response z metadanymi power flow run."""
    id: str
    deterministic_id: str
    project_id: str
    operating_case_id: str
    analysis_type: str
    status: str
    result_status: str
    created_at: str
    started_at: str | None
    finished_at: str | None
    input_hash: str
    converged: bool | None = None
    iterations: int | None = None


class PowerFlowExecuteResponse(BaseModel):
    """P20a: Response po wykonaniu power flow."""
    id: str
    status: str
    converged: bool | None = None
    iterations: int | None = None
    error_message: str | None = None


# =============================================================================
# Service Factory
# =============================================================================


def _build_service(uow_factory: Any) -> AnalysisRunService:
    return AnalysisRunService(uow_factory)


# =============================================================================
# Endpoints
# =============================================================================


@router.get("/projects/{project_id}/power-flow-runs")
def list_power_flow_runs(
    project_id: UUID,
    status: str | None = Query(default=None, description="Filtruj po statusie (CREATED, RUNNING, FINISHED, FAILED)"),
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """P20b: Pobiera listę power flow runs dla projektu.

    Zwraca runs posortowane po created_at DESC (najnowsze pierwsze),
    z deduplication po id dla determinizmu.
    """
    service = _build_service(uow_factory)
    filters = {"analysis_type": "PF"}
    if status:
        filters["status"] = status

    runs = service.list_runs(project_id, filters)

    return canonicalize_json({
        "runs": [
            {
                "id": str(run.id),
                "project_id": str(run.project_id),
                "operating_case_id": str(run.operating_case_id),
                "status": run.status,
                "result_status": run.result_status,
                "created_at": run.created_at.isoformat() if run.created_at else None,
                "finished_at": run.finished_at.isoformat() if run.finished_at else None,
                "input_hash": run.input_hash,
                "converged": (run.result_summary or {}).get("converged"),
                "iterations": (run.result_summary or {}).get("iterations"),
            }
            for run in runs
        ],
        "total": len(runs),
    })


@router.post("/projects/{project_id}/power-flow-runs")
def create_power_flow_run(
    project_id: UUID,
    request: PowerFlowRunCreateRequest,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """P20a: Tworzy nowy power flow run.

    Jeśli run z identycznym input_hash już istnieje, zwraca istniejący run
    (cache deduplication - deterministic).
    """
    service = _build_service(uow_factory)
    try:
        # P20a: Dodaj trace_level do options jeśli nie podano
        options = dict(request.options or {})
        if "trace_level" not in options:
            options["trace_level"] = "summary"

        run = service.create_power_flow_run(
            project_id=project_id,
            operating_case_id=request.operating_case_id,
            options=options,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return canonicalize_json({
        "id": str(run.id),
        "deterministic_id": build_deterministic_id(run),
        "project_id": str(run.project_id),
        "operating_case_id": str(run.operating_case_id),
        "analysis_type": run.analysis_type,
        "status": run.status,
        "result_status": run.result_status,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "input_hash": run.input_hash,
    })


@router.post("/power-flow-runs/{run_id}/execute")
def execute_power_flow_run(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """P20a: Wykonuje power flow run.

    Przechodzi przez stany: CREATED → VALIDATED → RUNNING → FINISHED/FAILED.
    Jeśli run jest już FINISHED/FAILED, zwraca istniejący wynik.
    """
    service = _build_service(uow_factory)
    try:
        run = service.execute_run(run_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    result_summary = run.result_summary or {}
    return canonicalize_json({
        "id": str(run.id),
        "status": run.status,
        "converged": result_summary.get("converged"),
        "iterations": result_summary.get("iterations"),
        "error_message": run.error_message,
    })


@router.get("/power-flow-runs/{run_id}")
def get_power_flow_run(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """P20a: Pobiera metadane power flow run."""
    service = _build_service(uow_factory)
    try:
        run = service.get_run(run_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    if run.analysis_type != "PF":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Run {run_id} is not a power flow run (type={run.analysis_type})",
        )

    result_summary = run.result_summary or {}
    trace_payload = get_run_trace(run)
    trace_summary = build_trace_summary(trace_payload) if trace_payload else None

    return canonicalize_json({
        "id": str(run.id),
        "deterministic_id": build_deterministic_id(run),
        "project_id": str(run.project_id),
        "operating_case_id": str(run.operating_case_id),
        "analysis_type": run.analysis_type,
        "status": run.status,
        "result_status": run.result_status,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "input_hash": run.input_hash,
        "converged": result_summary.get("converged"),
        "iterations": result_summary.get("iterations"),
        "trace_summary": trace_summary,
        "input_metadata": build_input_metadata(run.input_snapshot),
    })


@router.get("/power-flow-runs/{run_id}/results")
def get_power_flow_results(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """P20a: Pobiera wyniki power flow (PowerFlowResultV1).

    Zwraca deterministycznie posortowane bus_results, branch_results i summary.
    """
    service = _build_service(uow_factory)
    try:
        run = service.get_run(run_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    if run.analysis_type != "PF":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Run {run_id} is not a power flow run",
        )

    if run.status != "FINISHED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Run {run_id} is not finished (status={run.status})",
        )

    # Pobierz wyniki z results repository
    results = service.get_results(run_id)
    pf_result = None
    for result in results:
        if result.get("result_type") == "power_flow":
            pf_result = result.get("payload")
            break

    if pf_result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Power flow results not found for run {run_id}",
        )

    # P20a: Buduj PowerFlowResultV1-compatible response
    result_summary = run.result_summary or {}
    base_mva = pf_result.get("base_mva", 100.0)
    slack_node_id = pf_result.get("slack_node_id", "")

    # Bus results (deterministycznie posortowane)
    node_u_mag = pf_result.get("node_u_mag_pu", {})
    node_angle_rad = pf_result.get("node_angle_rad", {})
    bus_results = []
    for bus_id in sorted(node_u_mag.keys()):
        import math
        v_pu = node_u_mag.get(bus_id, 0.0)
        angle_rad = node_angle_rad.get(bus_id, 0.0)
        angle_deg = math.degrees(angle_rad)
        bus_results.append({
            "bus_id": bus_id,
            "v_pu": v_pu,
            "angle_deg": angle_deg,
            "p_injected_mw": 0.0,  # TODO: compute from power injections
            "q_injected_mvar": 0.0,
        })

    # Branch results (deterministycznie posortowane)
    branch_s_from = pf_result.get("branch_s_from_mva", {})
    branch_s_to = pf_result.get("branch_s_to_mva", {})
    branch_results = []
    for branch_id in sorted(branch_s_from.keys()):
        s_from = branch_s_from.get(branch_id, {"re": 0.0, "im": 0.0})
        s_to = branch_s_to.get(branch_id, {"re": 0.0, "im": 0.0})
        p_from = s_from.get("re", 0.0) if isinstance(s_from, dict) else s_from.real
        q_from = s_from.get("im", 0.0) if isinstance(s_from, dict) else s_from.imag
        p_to = s_to.get("re", 0.0) if isinstance(s_to, dict) else s_to.real
        q_to = s_to.get("im", 0.0) if isinstance(s_to, dict) else s_to.imag
        losses_p = p_from + p_to
        losses_q = q_from + q_to
        branch_results.append({
            "branch_id": branch_id,
            "p_from_mw": p_from,
            "q_from_mvar": q_from,
            "p_to_mw": p_to,
            "q_to_mvar": q_to,
            "losses_p_mw": losses_p,
            "losses_q_mvar": losses_q,
        })

    # Summary
    losses_total = pf_result.get("losses_total_pu", {"re": 0.0, "im": 0.0})
    slack_power = pf_result.get("slack_power_pu", {"re": 0.0, "im": 0.0})
    v_values = list(node_u_mag.values())
    min_v = min(v_values) if v_values else 0.0
    max_v = max(v_values) if v_values else 0.0
    summary = {
        "total_losses_p_mw": (losses_total.get("re", 0.0) if isinstance(losses_total, dict) else losses_total.real) * base_mva,
        "total_losses_q_mvar": (losses_total.get("im", 0.0) if isinstance(losses_total, dict) else losses_total.imag) * base_mva,
        "min_v_pu": min_v,
        "max_v_pu": max_v,
        "slack_p_mw": (slack_power.get("re", 0.0) if isinstance(slack_power, dict) else slack_power.real) * base_mva,
        "slack_q_mvar": (slack_power.get("im", 0.0) if isinstance(slack_power, dict) else slack_power.imag) * base_mva,
    }

    return canonicalize_json({
        "result_version": "1.0.0",
        "converged": result_summary.get("converged", False),
        "iterations_count": result_summary.get("iterations", 0),
        "tolerance_used": pf_result.get("tolerance", 1e-8),
        "base_mva": base_mva,
        "slack_bus_id": slack_node_id,
        "bus_results": bus_results,
        "branch_results": branch_results,
        "summary": summary,
    })


@router.get("/power-flow-runs/{run_id}/trace")
def get_power_flow_trace(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """P20a: Pobiera pełny white-box trace power flow (PowerFlowTrace).

    Trace zawiera init_state, per-bus mismatch, Jacobian, delta_state, state_next
    dla każdej iteracji NR.
    """
    service = _build_service(uow_factory)
    try:
        run = service.get_run(run_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    if run.analysis_type != "PF":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Run {run_id} is not a power flow run",
        )

    # Pobierz trace z run lub results
    trace_payload = get_run_trace(run)

    # Pobierz wyniki dla dodatkowych informacji
    results = service.get_results(run_id)
    pf_result = None
    for result in results:
        if result.get("result_type") == "power_flow":
            pf_result = result.get("payload")
            break

    if trace_payload is None and pf_result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trace not available for run {run_id}",
        )

    # P20a: Buduj PowerFlowTrace-compatible response
    white_box_trace = pf_result.get("white_box_trace", {}) if pf_result else {}
    nr_trace = white_box_trace.get("nr_trace", []) if isinstance(white_box_trace, dict) else []
    ybus_trace = white_box_trace.get("ybus_trace", {}) if isinstance(white_box_trace, dict) else {}
    init_state = white_box_trace.get("init_state", {}) if isinstance(white_box_trace, dict) else {}

    # Jeśli mamy trace_payload (z run.trace_json), użyj go
    if trace_payload and isinstance(trace_payload, dict):
        nr_trace = trace_payload.get("nr_trace", nr_trace)
        ybus_trace = trace_payload.get("ybus_trace", ybus_trace)
        init_state = trace_payload.get("init_state", init_state)

    snapshot = run.input_snapshot or {}
    result_summary = run.result_summary or {}

    return canonicalize_json({
        "solver_version": "1.0.0",
        "input_hash": run.input_hash,
        "snapshot_id": snapshot.get("snapshot_id"),
        "case_id": str(run.operating_case_id) if run.operating_case_id else None,
        "run_id": str(run.id),
        "init_state": init_state,
        "init_method": "flat" if snapshot.get("options", {}).get("flat_start", True) else "last_solution",
        "tolerance": snapshot.get("options", {}).get("tolerance", 1e-8),
        "max_iterations": snapshot.get("options", {}).get("max_iter", 30),
        "base_mva": snapshot.get("base_mva", 100.0),
        "slack_bus_id": snapshot.get("slack", {}).get("node_id", ""),
        "pq_bus_ids": sorted([spec.get("node_id", "") for spec in snapshot.get("pq", [])]),
        "pv_bus_ids": sorted([spec.get("node_id", "") for spec in snapshot.get("pv", [])]),
        "ybus_trace": ybus_trace,
        "iterations": nr_trace,
        "converged": result_summary.get("converged", False),
        "final_iterations_count": result_summary.get("iterations", 0),
    })
