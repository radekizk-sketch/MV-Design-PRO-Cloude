"""P20a/P20b/P20d: Dedykowane API endpoints dla Power Flow v1.

Endpoints:
- GET /projects/{project_id}/power-flow-runs (list - P20b)
- POST /projects/{project_id}/power-flow-runs (create)
- POST /power-flow-runs/{run_id}/execute (execute)
- GET /power-flow-runs/{run_id} (meta)
- GET /power-flow-runs/{run_id}/results (PowerFlowResultV1)
- GET /power-flow-runs/{run_id}/trace (PowerFlowTrace)
- GET /power-flow-runs/{run_id}/export/json (P20d)
- GET /power-flow-runs/{run_id}/export/docx (P20d)
- GET /power-flow-runs/{run_id}/export/pdf (P20d)
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


# =============================================================================
# P20d: Export Endpoints
# =============================================================================


def _build_export_bundle(run_id: UUID, service: AnalysisRunService) -> dict[str, Any]:
    """P20d: Build export bundle from run data (NOT-A-SOLVER)."""
    run = service.get_run(run_id)

    if run.analysis_type != "PF":
        raise ValueError(f"Run {run_id} is not a power flow run")

    if run.status != "FINISHED":
        raise ValueError(f"Run {run_id} is not finished (status={run.status})")

    # Get results
    results = service.get_results(run_id)
    pf_result = None
    for result in results:
        if result.get("result_type") == "power_flow":
            pf_result = result.get("payload")
            break

    if pf_result is None:
        raise ValueError(f"Power flow results not found for run {run_id}")

    # Build result dict (analogous to get_power_flow_results)
    result_summary = run.result_summary or {}
    base_mva = pf_result.get("base_mva", 100.0)
    slack_node_id = pf_result.get("slack_node_id", "")

    node_u_mag = pf_result.get("node_u_mag_pu", {})
    node_angle_rad = pf_result.get("node_angle_rad", {})

    import math
    bus_results = []
    for bus_id in sorted(node_u_mag.keys()):
        v_pu = node_u_mag.get(bus_id, 0.0)
        angle_rad = node_angle_rad.get(bus_id, 0.0)
        angle_deg = math.degrees(angle_rad)
        bus_results.append({
            "bus_id": bus_id,
            "v_pu": v_pu,
            "angle_deg": angle_deg,
            "p_injected_mw": 0.0,
            "q_injected_mvar": 0.0,
        })

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

    result_data = {
        "result_version": "1.0.0",
        "converged": result_summary.get("converged", False),
        "iterations_count": result_summary.get("iterations", 0),
        "tolerance_used": pf_result.get("tolerance", 1e-8),
        "base_mva": base_mva,
        "slack_bus_id": slack_node_id,
        "bus_results": bus_results,
        "branch_results": branch_results,
        "summary": summary,
    }

    # Build trace data
    trace_payload = get_run_trace(run)
    white_box_trace = pf_result.get("white_box_trace", {}) if pf_result else {}
    nr_trace = white_box_trace.get("nr_trace", []) if isinstance(white_box_trace, dict) else []

    if trace_payload and isinstance(trace_payload, dict):
        nr_trace = trace_payload.get("nr_trace", nr_trace)

    snapshot = run.input_snapshot or {}

    trace_data = {
        "solver_version": "1.0.0",
        "input_hash": run.input_hash,
        "init_method": "flat" if snapshot.get("options", {}).get("flat_start", True) else "last_solution",
        "tolerance": snapshot.get("options", {}).get("tolerance", 1e-8),
        "max_iterations": snapshot.get("options", {}).get("max_iter", 30),
        "converged": result_summary.get("converged", False),
        "final_iterations_count": result_summary.get("iterations", 0),
        "iterations": nr_trace,
    }

    # Build metadata
    metadata = {
        "run_id": str(run.id),
        "project_id": str(run.project_id),
        "operating_case_id": str(run.operating_case_id),
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "input_hash": run.input_hash,
    }

    return {
        "result": result_data,
        "trace": trace_data,
        "metadata": metadata,
    }


@router.get("/power-flow-runs/{run_id}/export/json")
def export_power_flow_run_json(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
):
    """P20d: Eksportuj wyniki power flow do JSON."""
    from fastapi.responses import Response
    import json

    service = _build_service(uow_factory)
    try:
        bundle = _build_export_bundle(run_id, service)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # Build export payload
    export_payload = {
        "report_type": "power_flow_result",
        "report_version": "1.0.0",
        "metadata": bundle["metadata"],
        "result": bundle["result"],
        "trace_summary": {
            "solver_version": bundle["trace"].get("solver_version"),
            "input_hash": bundle["trace"].get("input_hash"),
            "converged": bundle["trace"].get("converged"),
            "final_iterations_count": bundle["trace"].get("final_iterations_count"),
        },
    }

    json_content = json.dumps(export_payload, indent=2, ensure_ascii=False, sort_keys=True)

    return Response(
        content=json_content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="power_flow_run_{run_id}.json"'},
    )


@router.get("/power-flow-runs/{run_id}/export/docx")
def export_power_flow_run_docx(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
):
    """P20d: Eksportuj raport power flow do DOCX."""
    from fastapi.responses import Response
    import io

    try:
        from docx import Document
        from docx.shared import Pt
        from docx.enum.text import WD_ALIGN_PARAGRAPH
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="DOCX export requires python-docx. Install with: pip install python-docx",
        )

    service = _build_service(uow_factory)
    try:
        bundle = _build_export_bundle(run_id, service)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    result = bundle["result"]
    trace = bundle["trace"]
    metadata = bundle["metadata"]

    # Create DOCX document
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    # Title
    heading = doc.add_heading("Raport rozplywu mocy", level=0)
    heading.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Status line
    status_parts = [
        f"Status: {'Zbiezny' if result.get('converged') else 'Niezbiezny'}",
        f"Iteracje: {result.get('iterations_count', '—')}",
        f"Run: {metadata.get('run_id', '—')[:8]}...",
    ]
    subtitle = doc.add_paragraph(" | ".join(status_parts))
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph()

    # Summary section
    doc.add_heading("Podsumowanie", level=1)
    summary = result.get("summary", {})
    summary_table = doc.add_table(rows=1, cols=2)
    summary_table.style = "Table Grid"

    hdr = summary_table.rows[0].cells
    hdr[0].text = "Parametr"
    hdr[1].text = "Wartosc"
    for cell in hdr:
        for p in cell.paragraphs:
            for r in p.runs:
                r.bold = True

    def add_row(table, label, value):
        row = table.add_row().cells
        row[0].text = label
        row[1].text = str(value) if value is not None else "—"

    add_row(summary_table, "Status zbieznosci", "Zbiezny" if result.get("converged") else "Niezbiezny")
    add_row(summary_table, "Liczba iteracji", result.get("iterations_count"))
    add_row(summary_table, "Wezel bilansujacy", result.get("slack_bus_id"))
    add_row(summary_table, "Calkowite straty P [MW]", f"{summary.get('total_losses_p_mw', 0):.4g}")
    add_row(summary_table, "Calkowite straty Q [Mvar]", f"{summary.get('total_losses_q_mvar', 0):.4g}")
    add_row(summary_table, "Min. napiecie [pu]", f"{summary.get('min_v_pu', 0):.4g}")
    add_row(summary_table, "Max. napiecie [pu]", f"{summary.get('max_v_pu', 0):.4g}")

    doc.add_paragraph()

    # Bus results (limited)
    doc.add_heading("Wyniki wezlowe (szyny)", level=1)
    bus_results = result.get("bus_results", [])
    if bus_results:
        bus_table = doc.add_table(rows=1, cols=5)
        bus_table.style = "Table Grid"
        bhdr = bus_table.rows[0].cells
        bhdr[0].text = "ID szyny"
        bhdr[1].text = "V [pu]"
        bhdr[2].text = "Kat [deg]"
        bhdr[3].text = "P_inj [MW]"
        bhdr[4].text = "Q_inj [Mvar]"
        for cell in bhdr:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.bold = True

        for bus in bus_results[:30]:
            row = bus_table.add_row().cells
            row[0].text = str(bus.get("bus_id", "—"))[:16]
            row[1].text = f"{bus.get('v_pu', 0):.4g}"
            row[2].text = f"{bus.get('angle_deg', 0):.2f}"
            row[3].text = f"{bus.get('p_injected_mw', 0):.3g}"
            row[4].text = f"{bus.get('q_injected_mvar', 0):.3g}"

        if len(bus_results) > 30:
            doc.add_paragraph(f"... oraz {len(bus_results) - 30} dodatkowych wezlow")
    else:
        doc.add_paragraph("Brak wynikow wezlowych.")

    # Save to BytesIO
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="power_flow_run_{run_id}.docx"'},
    )


@router.get("/power-flow-runs/{run_id}/export/pdf")
def export_power_flow_run_pdf(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
):
    """P20d: Eksportuj raport power flow do PDF."""
    from fastapi.responses import Response
    import io

    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="PDF export requires reportlab. Install with: pip install reportlab",
        )

    service = _build_service(uow_factory)
    try:
        bundle = _build_export_bundle(run_id, service)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    result = bundle["result"]
    metadata = bundle["metadata"]

    # Create PDF in memory
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    page_width, page_height = A4

    left_margin = 25 * mm
    top_margin = page_height - 25 * mm
    y = top_margin
    line_height = 5 * mm

    # Title
    c.setFont("Helvetica-Bold", 16)
    title = "Raport rozplywu mocy"
    c.drawString((page_width - c.stringWidth(title, "Helvetica-Bold", 16)) / 2, y, title)
    y -= 10 * mm

    # Status line
    c.setFont("Helvetica", 10)
    status_text = f"Status: {'Zbiezny' if result.get('converged') else 'Niezbiezny'} | Iteracje: {result.get('iterations_count', '—')} | Run: {metadata.get('run_id', '—')[:8]}..."
    c.drawString(left_margin, y, status_text)
    y -= 8 * mm

    # Summary
    c.setFont("Helvetica-Bold", 14)
    c.drawString(left_margin, y, "Podsumowanie")
    y -= 6 * mm

    c.setFont("Helvetica", 10)
    summary = result.get("summary", {})
    summary_lines = [
        f"Wezel bilansujacy: {result.get('slack_bus_id', '—')}",
        f"Calkowite straty P: {summary.get('total_losses_p_mw', 0):.4g} MW",
        f"Calkowite straty Q: {summary.get('total_losses_q_mvar', 0):.4g} Mvar",
        f"Min. napiecie: {summary.get('min_v_pu', 0):.4g} pu",
        f"Max. napiecie: {summary.get('max_v_pu', 0):.4g} pu",
    ]
    for line in summary_lines:
        c.drawString(left_margin, y, line)
        y -= line_height

    y -= 5 * mm

    # Bus results (limited)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(left_margin, y, "Wyniki wezlowe (top 20)")
    y -= 5 * mm

    c.setFont("Helvetica", 9)
    bus_results = result.get("bus_results", [])
    for bus in bus_results[:20]:
        text = f"{str(bus.get('bus_id', '—'))[:12]}: V={bus.get('v_pu', 0):.4g} pu, kat={bus.get('angle_deg', 0):.2f} deg"
        c.drawString(left_margin, y, text)
        y -= line_height
        if y < 30 * mm:
            c.showPage()
            y = top_margin

    c.save()
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="power_flow_run_{run_id}.pdf"'},
    )


# =============================================================================
# P21: Proof Export Endpoints
# =============================================================================


def _build_proof_objects(run_id: UUID, service: AnalysisRunService):
    """P21: Build PowerFlowTrace and PowerFlowResultV1 objects for proof generation."""
    import math
    from network_model.solvers.power_flow_result import (
        PowerFlowBranchResult,
        PowerFlowBusResult,
        PowerFlowResultV1,
        PowerFlowSummary,
    )
    from network_model.solvers.power_flow_trace import (
        PowerFlowIterationTrace,
        PowerFlowTrace,
    )

    run = service.get_run(run_id)

    if run.analysis_type != "PF":
        raise ValueError(f"Run {run_id} is not a power flow run")

    if run.status != "FINISHED":
        raise ValueError(f"Run {run_id} is not finished (status={run.status})")

    # Get results
    results = service.get_results(run_id)
    pf_result = None
    for result in results:
        if result.get("result_type") == "power_flow":
            pf_result = result.get("payload")
            break

    if pf_result is None:
        raise ValueError(f"Power flow results not found for run {run_id}")

    # Build PowerFlowResultV1
    result_summary = run.result_summary or {}
    base_mva = pf_result.get("base_mva", 100.0)
    slack_node_id = pf_result.get("slack_node_id", "")

    node_u_mag = pf_result.get("node_u_mag_pu", {})
    node_angle_rad = pf_result.get("node_angle_rad", {})

    bus_results = []
    for bus_id in sorted(node_u_mag.keys()):
        v_pu = node_u_mag.get(bus_id, 0.0)
        angle_rad = node_angle_rad.get(bus_id, 0.0)
        angle_deg = math.degrees(angle_rad)
        bus_results.append(PowerFlowBusResult(
            bus_id=bus_id,
            v_pu=v_pu,
            angle_deg=angle_deg,
            p_injected_mw=0.0,
            q_injected_mvar=0.0,
        ))

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
        branch_results.append(PowerFlowBranchResult(
            branch_id=branch_id,
            p_from_mw=p_from,
            q_from_mvar=q_from,
            p_to_mw=p_to,
            q_to_mvar=q_to,
            losses_p_mw=p_from + p_to,
            losses_q_mvar=q_from + q_to,
        ))

    losses_total = pf_result.get("losses_total_pu", {"re": 0.0, "im": 0.0})
    slack_power = pf_result.get("slack_power_pu", {"re": 0.0, "im": 0.0})
    v_values = list(node_u_mag.values())
    min_v = min(v_values) if v_values else 0.0
    max_v = max(v_values) if v_values else 0.0

    summary = PowerFlowSummary(
        total_losses_p_mw=(losses_total.get("re", 0.0) if isinstance(losses_total, dict) else losses_total.real) * base_mva,
        total_losses_q_mvar=(losses_total.get("im", 0.0) if isinstance(losses_total, dict) else losses_total.imag) * base_mva,
        min_v_pu=min_v,
        max_v_pu=max_v,
        slack_p_mw=(slack_power.get("re", 0.0) if isinstance(slack_power, dict) else slack_power.real) * base_mva,
        slack_q_mvar=(slack_power.get("im", 0.0) if isinstance(slack_power, dict) else slack_power.imag) * base_mva,
    )

    result_v1 = PowerFlowResultV1(
        result_version="1.0.0",
        converged=result_summary.get("converged", False),
        iterations_count=result_summary.get("iterations", 0),
        tolerance_used=pf_result.get("tolerance", 1e-8),
        base_mva=base_mva,
        slack_bus_id=slack_node_id,
        bus_results=tuple(bus_results),
        branch_results=tuple(branch_results),
        summary=summary,
    )

    # Build PowerFlowTrace
    trace_payload = get_run_trace(run)
    white_box_trace = pf_result.get("white_box_trace", {}) if pf_result else {}
    nr_trace = white_box_trace.get("nr_trace", []) if isinstance(white_box_trace, dict) else []
    ybus_trace = white_box_trace.get("ybus_trace", {}) if isinstance(white_box_trace, dict) else {}
    init_state = white_box_trace.get("init_state", {}) if isinstance(white_box_trace, dict) else {}

    if trace_payload and isinstance(trace_payload, dict):
        nr_trace = trace_payload.get("nr_trace", nr_trace)
        ybus_trace = trace_payload.get("ybus_trace", ybus_trace)
        init_state = trace_payload.get("init_state", init_state)

    snapshot = run.input_snapshot or {}

    # Build iteration traces
    iteration_traces = []
    for entry in nr_trace:
        iteration_traces.append(PowerFlowIterationTrace(
            k=entry.get("iter", entry.get("k", 0)),
            mismatch_per_bus=entry.get("mismatch_per_bus", {}),
            norm_mismatch=entry.get("mismatch_norm", entry.get("norm_mismatch", 0.0)),
            max_mismatch_pu=entry.get("max_mismatch_pu", 0.0),
            jacobian=entry.get("jacobian"),
            delta_state=entry.get("delta_state"),
            state_next=entry.get("state_next"),
            damping_used=entry.get("damping_used", 1.0),
            step_norm=entry.get("step_norm", 0.0),
            pv_to_pq_switches=entry.get("pv_to_pq_optional"),
            cause_if_failed=entry.get("cause_if_failed_optional"),
        ))

    pq_bus_ids = [spec.get("node_id", "") for spec in snapshot.get("pq", [])]
    pv_bus_ids = [spec.get("node_id", "") for spec in snapshot.get("pv", [])]

    trace_v1 = PowerFlowTrace(
        solver_version="1.0.0",
        input_hash=run.input_hash,
        snapshot_id=snapshot.get("snapshot_id"),
        case_id=str(run.operating_case_id) if run.operating_case_id else None,
        run_id=str(run.id),
        init_state=init_state,
        init_method="flat" if snapshot.get("options", {}).get("flat_start", True) else "last_solution",
        tolerance=snapshot.get("options", {}).get("tolerance", 1e-8),
        max_iterations=snapshot.get("options", {}).get("max_iter", 30),
        base_mva=snapshot.get("base_mva", 100.0),
        slack_bus_id=snapshot.get("slack", {}).get("node_id", ""),
        pq_bus_ids=tuple(sorted(pq_bus_ids)),
        pv_bus_ids=tuple(sorted(pv_bus_ids)),
        ybus_trace=ybus_trace,
        iterations=tuple(iteration_traces),
        converged=result_summary.get("converged", False),
        final_iterations_count=result_summary.get("iterations", 0),
    )

    return result_v1, trace_v1, run


@router.get("/power-flow-runs/{run_id}/export/proof/json")
def export_power_flow_proof_json(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
):
    """P21: Eksportuj dowod power flow do JSON (strukturalny, audytowy).

    DETERMINISTIC: Ten sam run → identyczny JSON (byte-for-byte).
    - document_id = sha256(run_id:input_hash:snapshot_id)
    - created_at = run.created_at (z persistence)
    """
    from fastapi.responses import Response
    import json
    from network_model.proof import build_power_flow_proof

    service = _build_service(uow_factory)
    try:
        result_v1, trace_v1, run = _build_proof_objects(run_id, service)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # P21 DETERMINISTIC: run_timestamp z persistence (NIE datetime.now())
    run_timestamp = run.created_at.isoformat() if run.created_at else "1970-01-01T00:00:00+00:00"

    # Build proof document
    proof = build_power_flow_proof(
        trace=trace_v1,
        result=result_v1,
        project_name=f"Projekt {run.project_id}",
        case_name=f"Przypadek {run.operating_case_id}",
        artifact_id=str(run.id),
        run_timestamp=run_timestamp,  # DETERMINISTIC: z persistence
    )

    # Serialize to JSON
    export_payload = {
        "report_type": "power_flow_proof",
        "report_version": proof.proof_version,
        "proof_document": proof.to_dict(),
    }

    json_content = json.dumps(export_payload, indent=2, ensure_ascii=False, sort_keys=True)

    return Response(
        content=json_content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="power_flow_proof_{run_id}.json"'},
    )


@router.get("/power-flow-runs/{run_id}/export/proof/latex")
def export_power_flow_proof_latex(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
):
    """P21: Eksportuj dowod power flow do LaTeX (.tex).

    DETERMINISTIC: Ten sam run → identyczny LaTeX (byte-for-byte).
    """
    from fastapi.responses import Response
    from network_model.proof import build_power_flow_proof, export_proof_to_latex
    import tempfile

    service = _build_service(uow_factory)
    try:
        result_v1, trace_v1, run = _build_proof_objects(run_id, service)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # P21 DETERMINISTIC: run_timestamp z persistence (NIE datetime.now())
    run_timestamp = run.created_at.isoformat() if run.created_at else "1970-01-01T00:00:00+00:00"

    # Build proof document
    proof = build_power_flow_proof(
        trace=trace_v1,
        result=result_v1,
        project_name=f"Projekt {run.project_id}",
        case_name=f"Przypadek {run.operating_case_id}",
        artifact_id=str(run.id),
        run_timestamp=run_timestamp,  # DETERMINISTIC: z persistence
    )

    # Export to LaTeX
    with tempfile.NamedTemporaryFile(suffix=".tex", delete=False) as tmp:
        export_proof_to_latex(proof, tmp.name)
        tmp.seek(0)
        latex_content = open(tmp.name, "r", encoding="utf-8").read()

    return Response(
        content=latex_content,
        media_type="application/x-tex",
        headers={"Content-Disposition": f'attachment; filename="power_flow_proof_{run_id}.tex"'},
    )


@router.get("/power-flow-runs/{run_id}/export/proof/pdf")
def export_power_flow_proof_pdf(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
):
    """P21: Eksportuj dowod power flow do PDF (via ReportLab lub LaTeX).

    DETERMINISTIC: Ten sam run → identyczny dowód (PDF struktura może się różnić
    ze względu na generatory PDF, ale dokument źródłowy jest deterministyczny).
    """
    from fastapi.responses import Response
    from network_model.proof import build_power_flow_proof, export_proof_to_pdf_simple
    import tempfile
    import os

    service = _build_service(uow_factory)
    try:
        result_v1, trace_v1, run = _build_proof_objects(run_id, service)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # P21 DETERMINISTIC: run_timestamp z persistence (NIE datetime.now())
    run_timestamp = run.created_at.isoformat() if run.created_at else "1970-01-01T00:00:00+00:00"

    # Build proof document
    proof = build_power_flow_proof(
        trace=trace_v1,
        result=result_v1,
        project_name=f"Projekt {run.project_id}",
        case_name=f"Przypadek {run.operating_case_id}",
        artifact_id=str(run.id),
        run_timestamp=run_timestamp,  # DETERMINISTIC: z persistence
    )

    # Export to PDF (using ReportLab fallback for simplicity)
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        try:
            export_proof_to_pdf_simple(proof, tmp.name)
            with open(tmp.name, "rb") as f:
                pdf_content = f.read()
        finally:
            os.unlink(tmp.name)

    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="power_flow_proof_{run_id}.pdf"'},
    )


# =============================================================================
# P22: Power Flow Interpretation Endpoints
# =============================================================================


# Cache: run_id -> interpretation (1 run -> 1 interpretation)
_interpretation_cache: dict[str, dict[str, Any]] = {}


@router.get("/power-flow-runs/{run_id}/interpretation")
def get_power_flow_interpretation(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """P22: Pobiera interpretacje wynikow rozplywu mocy.

    DETERMINISTIC: Ten sam run -> identyczna interpretacja.
    CACHED: 1 run -> 1 interpretation (cache in-memory).

    Interpretacja zawiera:
    - voltage_findings: obserwacje napieciowe z severity (INFO/WARN/HIGH)
    - branch_findings: obserwacje obciazenia galezi
    - summary: podsumowanie z rankingiem top issues
    - trace: slad interpretacji dla audytowalnosci
    """
    from datetime import datetime
    from analysis.power_flow.result import PowerFlowResult
    from analysis.power_flow_interpretation import (
        InterpretationContext,
        PowerFlowInterpretationBuilder,
    )

    # Check cache first
    run_id_str = str(run_id)
    if run_id_str in _interpretation_cache:
        return canonicalize_json(_interpretation_cache[run_id_str])

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

    if run.status != "FINISHED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Run {run_id} is not finished (status={run.status})",
        )

    # Get power flow results
    results = service.get_results(run_id)
    pf_result_payload = None
    for result in results:
        if result.get("result_type") == "power_flow":
            pf_result_payload = result.get("payload")
            break

    if pf_result_payload is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Power flow results not found for run {run_id}",
        )

    # Build PowerFlowResult from payload
    pf_result = PowerFlowResult(
        converged=pf_result_payload.get("converged", False),
        iterations=pf_result_payload.get("iterations", 0),
        tolerance=pf_result_payload.get("tolerance", 1e-8),
        max_mismatch_pu=pf_result_payload.get("max_mismatch_pu", 0.0),
        base_mva=pf_result_payload.get("base_mva", 100.0),
        slack_node_id=pf_result_payload.get("slack_node_id", ""),
        node_u_mag_pu=_parse_float_dict(pf_result_payload.get("node_u_mag_pu", {})),
        node_angle_rad=_parse_float_dict(pf_result_payload.get("node_angle_rad", {})),
        branch_s_from_mva=pf_result_payload.get("branch_s_from_mva", {}),
        branch_s_to_mva=pf_result_payload.get("branch_s_to_mva", {}),
    )

    # Build context
    snapshot = run.input_snapshot or {}
    run_timestamp = run.created_at if run.created_at else datetime(1970, 1, 1)

    context = InterpretationContext(
        project_name=f"Projekt {run.project_id}",
        case_name=f"Przypadek {run.operating_case_id}",
        run_timestamp=run_timestamp,
        snapshot_id=snapshot.get("snapshot_id"),
    )

    # Build interpretation
    builder = PowerFlowInterpretationBuilder(context=context)
    interpretation = builder.build(
        power_flow_result=pf_result,
        run_id=run_id_str,
        run_timestamp=run_timestamp,
    )

    # Serialize and cache
    result_dict = interpretation.to_dict()
    _interpretation_cache[run_id_str] = result_dict

    return canonicalize_json(result_dict)


@router.post("/power-flow-runs/{run_id}/interpretation")
def create_power_flow_interpretation(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """P22: Tworzy (lub pobiera z cache) interpretacje wynikow rozplywu mocy.

    IDEMPOTENT: Wielokrotne wywolanie zwraca ten sam wynik.
    DETERMINISTIC: Ten sam run -> identyczna interpretacja.

    Identyczne do GET, ale jako POST dla semantyki "create".
    """
    # Delegate to GET - interpretation is idempotent
    return get_power_flow_interpretation(run_id, uow_factory)


def _parse_float_dict(data: dict[str, Any]) -> dict[str, float]:
    """Parse dict values to float, handling various input formats."""
    result = {}
    for key, value in data.items():
        if isinstance(value, (int, float)):
            result[key] = float(value)
        elif isinstance(value, dict):
            # Complex number stored as {"re": x, "im": y}
            result[key] = float(value.get("re", value.get("real", 0.0)))
        else:
            result[key] = 0.0
    return result
