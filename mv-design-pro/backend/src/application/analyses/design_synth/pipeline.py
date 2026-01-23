from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable
from uuid import UUID

from application.analyses.design_synth.canonical import canonicalize_json
from application.analyses.design_synth.reporting import (
    PCC_SECTION_TITLE,
    build_connection_study_report,
)
from application.analyses.design_synth.result import DesignSynthRunResult
from application.analyses.design_synth.service import DesignSynthService
from infrastructure.persistence.unit_of_work import UnitOfWork


def run_connection_study(
    case_id: UUID,
    base_snapshot_id: str,
    spec_payload: dict,
    *,
    uow_factory: Callable[[], UnitOfWork],
) -> DesignSynthRunResult:
    service = DesignSynthService(uow_factory)
    spec_id = service.create_spec(case_id, base_snapshot_id, spec_payload)
    spec = service.get_spec(spec_id)

    proposal_payload = _build_proposal_payload(spec.spec_json)
    proposal_id = service.create_proposal(
        case_id,
        base_snapshot_id,
        proposal_payload,
        status="GENERATED",
    )
    proposal = service.get_proposal(proposal_id)

    evidence_payload = _build_evidence_payload(
        case_id, base_snapshot_id, spec.spec_json, proposal.proposal_json
    )
    evidence_id = service.create_evidence(case_id, base_snapshot_id, evidence_payload)
    evidence = service.get_evidence(evidence_id)

    report_json = build_connection_study_report(spec, proposal, evidence)
    created_at = datetime.now(timezone.utc)

    return DesignSynthRunResult(
        case_id=case_id,
        base_snapshot_id=base_snapshot_id,
        design_spec_id=spec_id,
        design_proposal_id=proposal_id,
        design_evidence_id=evidence_id,
        report_json=report_json,
        created_at=created_at,
    )


def _build_proposal_payload(spec_payload: dict[str, Any]) -> dict[str, Any]:
    pcc_payload = _extract_pcc(spec_payload)
    proposal = {
        "stage": "connection_study",
        "proposal_version": "M2",
        "pcc": pcc_payload,
        "constraints": spec_payload.get("constraints", {}),
        "assumptions": spec_payload.get("assumptions", {}),
        "grid": spec_payload.get("grid", {}),
        "recommended_actions": [
            {
                "action": "review_constraints",
                "status": "pending",
                "notes": "Placeholder for deterministic connection study proposal.",
            }
        ],
        "notes": "Deterministic placeholder proposal. No solver execution.",
    }
    return canonicalize_json(proposal)


def _build_evidence_payload(
    case_id: UUID,
    base_snapshot_id: str,
    spec_payload: dict[str, Any],
    proposal_payload: dict[str, Any],
) -> dict[str, Any]:
    evidence = {
        "inputs": {
            "case_id": str(case_id),
            "base_snapshot_id": base_snapshot_id,
            "spec": spec_payload,
        },
        "outputs": {
            "proposal": proposal_payload,
        },
        "trace": {
            "steps": [
                {
                    "name": "spec_to_proposal",
                    "status": "ok",
                },
                {
                    "name": "proposal_to_report",
                    "status": "ok",
                },
            ]
        },
        "references": {
            "snapshot_id": base_snapshot_id,
            "analysis_runs": [],
        },
        "metadata": {
            "pipeline": "DesignSynth M2 connection study",
            "standard": "DIgSILENT PowerFactory",
            "pcc_label": PCC_SECTION_TITLE,
        },
    }
    return canonicalize_json(evidence)


def _extract_pcc(spec_payload: dict[str, Any]) -> dict[str, Any]:
    if "pcc" in spec_payload:
        return spec_payload["pcc"]
    if "PCC" in spec_payload:
        return spec_payload["PCC"]
    return {}
