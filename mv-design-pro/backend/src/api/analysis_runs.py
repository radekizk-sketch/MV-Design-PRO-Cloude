from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from api.dependencies import get_uow_factory
from application.analyses.run_reader import read_run_envelope
from application.analysis_run import (
    AnalysisRunDetailDTO,
    AnalysisRunExportService,
    AnalysisRunService,
    AnalysisRunSummaryDTO,
    OverlayDTO,
    ResultItemDTO,
    ResultListDTO,
    TraceDTO,
    TraceSummaryDTO,
    build_deterministic_id,
    build_input_metadata,
    build_trace_summary,
    canonicalize_json,
    get_run_trace,
    minimize_summary,
)
from infrastructure.persistence.unit_of_work import UnitOfWork


router = APIRouter()


def _build_service(uow_factory: Any) -> AnalysisRunService:
    return AnalysisRunService(uow_factory)


def _build_export_service(uow_factory: Any) -> AnalysisRunExportService:
    return AnalysisRunExportService(uow_factory)


@router.get("/projects/{project_id}/analysis-runs")
def list_analysis_runs(
    project_id: UUID,
    analysis_type: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    service = _build_service(uow_factory)
    filters = {}
    if analysis_type:
        filters["analysis_type"] = analysis_type
    if status_filter:
        filters["status"] = status_filter
    runs = service.list_runs(project_id, filters)
    sliced = runs[offset : offset + limit]
    items = []
    for run in sliced:
        trace_payload = get_run_trace(run)
        trace_summary = (
            build_trace_summary(trace_payload) if trace_payload is not None else None
        )
        items.append(
            AnalysisRunSummaryDTO(
                id=run.id,
                deterministic_id=build_deterministic_id(run),
                analysis_type=run.analysis_type,
                status=run.status,
                created_at=run.created_at,
                finished_at=run.finished_at,
                input_hash=run.input_hash,
                summary_json=minimize_summary(run.result_summary),
                trace_summary=trace_summary,
            ).to_dict()
        )
    return canonicalize_json({"items": items, "count": len(runs)})


@router.get("/analysis-runs/{run_id}")
def get_analysis_run(
    run_id: str,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    index_entry = _get_run_index_entry(run_id, uow_factory=uow_factory)
    if index_entry is not None:
        try:
            envelope = read_run_envelope(
                index_entry.analysis_type, run_id, uow_factory=uow_factory
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
            ) from exc
        return envelope.to_dict()

    try:
        parsed_run_id = UUID(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    service = _build_service(uow_factory)
    try:
        run = service.get_run(parsed_run_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    trace_payload = get_run_trace(run)
    trace_summary = build_trace_summary(trace_payload) if trace_payload is not None else None
    dto = AnalysisRunDetailDTO(
        id=run.id,
        deterministic_id=build_deterministic_id(run),
        analysis_type=run.analysis_type,
        status=run.status,
        created_at=run.created_at,
        finished_at=run.finished_at,
        input_hash=run.input_hash,
        summary_json=run.result_summary,
        trace_summary=trace_summary,
        input_metadata=build_input_metadata(run.input_snapshot),
    )
    return canonicalize_json(dto.to_dict())


def _get_run_index_entry(run_id: str, *, uow_factory) -> Any | None:
    with uow_factory() as uow:
        return uow.analysis_runs_index.get(run_id)


@router.get("/analysis-runs/{run_id}/results")
def get_analysis_run_results(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    service = _build_service(uow_factory)
    results = service.get_results(run_id)
    items = []
    for result in results:
        payload = result.get("payload") or {}
        items.append(
            ResultItemDTO(
                id=result["id"],
                result_type=result["result_type"],
                created_at=result["created_at"],
                payload_summary=minimize_summary(payload),
            )
        )
    dto = ResultListDTO(results=tuple(items))
    return canonicalize_json(dto.to_dict())


@router.get("/analysis-runs/{run_id}/overlay")
def get_analysis_run_overlay(
    run_id: UUID,
    diagram_id: UUID = Query(...),
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    service = _build_service(uow_factory)
    try:
        run = service.get_run(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    try:
        overlay_payload = service.get_sld_overlay_for_run(run.project_id, diagram_id, run.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    dto = OverlayDTO(
        node_overlays=overlay_payload.get("nodes", []),
        branch_overlays=overlay_payload.get("branches", []),
    )
    return canonicalize_json(dto.to_dict())


@router.get("/analysis-runs/{run_id}/trace")
def get_analysis_run_trace(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    service = _build_service(uow_factory)
    try:
        run = service.get_run(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    trace_payload = get_run_trace(run)
    if trace_payload is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trace not available for this analysis run",
        )
    return canonicalize_json(TraceDTO(trace=trace_payload).to_dict())


@router.get("/analysis-runs/{run_id}/trace/summary")
def get_analysis_run_trace_summary(
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    service = _build_service(uow_factory)
    try:
        run = service.get_run(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    trace_payload = get_run_trace(run)
    if trace_payload is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trace not available for this analysis run",
        )
    summary = build_trace_summary(trace_payload)
    dto = TraceSummaryDTO(
        count=summary.get("count", 0),
        first_step=summary.get("first_step"),
        last_step=summary.get("last_step"),
        phases=summary.get("phases", []),
        duration_ms=summary.get("duration_ms"),
        warnings=summary.get("warnings", []),
    )
    return canonicalize_json(dto.to_dict())


@router.get("/projects/{project_id}/analysis-runs/{run_id}/export/docx")
def export_analysis_run_docx(
    project_id: UUID,
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
) -> Response:
    service = _build_export_service(uow_factory)
    try:
        bundle = service.export_run_bundle(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    if bundle.get("project", {}).get("id") != str(project_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AnalysisRun not found in project",
        )
    try:
        payload = service._render_docx(bundle)
    except ImportError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    headers = {
        "Content-Disposition": f'attachment; filename="analysis_run_{run_id}.docx"'
    }
    return Response(
        content=payload,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers=headers,
    )


@router.get("/projects/{project_id}/analysis-runs/{run_id}/export/pdf")
def export_analysis_run_pdf(
    project_id: UUID,
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
) -> Response:
    service = _build_export_service(uow_factory)
    try:
        bundle = service.export_run_bundle(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    if bundle.get("project", {}).get("id") != str(project_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AnalysisRun not found in project",
        )
    try:
        payload = service._render_pdf(bundle)
    except ImportError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    headers = {"Content-Disposition": f'attachment; filename="analysis_run_{run_id}.pdf"'}
    return Response(content=payload, media_type="application/pdf", headers=headers)
