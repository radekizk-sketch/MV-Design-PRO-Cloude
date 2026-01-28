from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status

from api.dependencies import get_uow_factory
from application.proof_engine.proof_pack import (
    ProofPackBuilder,
    ProofPackContext,
    proof_pack_proof_type,
    resolve_mv_design_pro_version,
)
from application.proof_engine.serialization import proof_document_from_dict

router = APIRouter(prefix="/api/proof", tags=["proof-pack"])


@router.get("/{project_id}/{case_id}/{run_id}/pack")
def download_proof_pack(
    project_id: UUID,
    case_id: UUID,
    run_id: UUID,
    uow_factory=Depends(get_uow_factory),
) -> Response:
    with uow_factory() as uow:
        run = uow.analysis_runs.get(run_id)
        if run is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ProofDocument not found",
            )
        if run.project_id != project_id or run.operating_case_id != case_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ProofDocument not found",
            )
        results = uow.results.list_results(run_id)

    proof_payload = None
    for result in results:
        if result.get("result_type") == "proof_document":
            proof_payload = result.get("payload")
            break

    if proof_payload is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ProofDocument not found",
        )

    proof_doc = proof_document_from_dict(proof_payload)
    snapshot_id = _extract_snapshot_id(run.input_snapshot)
    context = ProofPackContext(
        project_id=str(project_id),
        case_id=str(case_id),
        run_id=str(run_id),
        snapshot_id=snapshot_id,
        mv_design_pro_version=resolve_mv_design_pro_version(),
    )
    pack_bytes = ProofPackBuilder(context).build(proof_doc)
    proof_type = proof_pack_proof_type(proof_doc.proof_type)
    filename = (
        "mv-design-pro__proofpack__"
        f"{proof_type}__{project_id}__{case_id}__{run_id}.zip"
    )
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=pack_bytes, media_type="application/zip", headers=headers)


def _extract_snapshot_id(payload: dict) -> str:
    snapshot_id = payload.get("snapshot_id")
    if snapshot_id:
        return str(snapshot_id)
    active_snapshot = payload.get("active_snapshot_id")
    if active_snapshot:
        return str(active_snapshot)
    return "unknown"
