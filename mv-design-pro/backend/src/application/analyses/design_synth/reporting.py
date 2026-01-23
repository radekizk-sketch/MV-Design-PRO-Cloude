from __future__ import annotations

import hashlib
import json
from typing import Any

from application.analyses.design_synth.canonical import canonicalize_json
from application.analyses.design_synth.models import (
    DesignEvidence,
    DesignProposal,
    DesignSpec,
)

PCC_SECTION_TITLE = "PCC – punkt wspólnego przyłączenia"


def build_connection_study_report(
    spec: DesignSpec, proposal: DesignProposal, evidence: DesignEvidence
) -> dict[str, Any]:
    pcc_payload = _extract_pcc(spec.spec_json)
    report_body: dict[str, Any] = {
        "report_type": "connection_study",
        "case_id": str(spec.case_id),
        "base_snapshot_id": spec.base_snapshot_id,
        PCC_SECTION_TITLE: pcc_payload,
        "assumptions": spec.spec_json.get("assumptions", {}),
        "constraints": spec.spec_json.get("constraints", {}),
        "proposal": proposal.proposal_json,
        "evidence_summary": _build_evidence_summary(evidence.evidence_json),
    }
    canonical_report = canonicalize_json(report_body)
    fingerprint = _hash_report(canonical_report)
    report_with_fingerprint = dict(canonical_report)
    report_with_fingerprint["fingerprint"] = fingerprint
    return canonicalize_json(report_with_fingerprint)


def _extract_pcc(spec_json: dict[str, Any]) -> dict[str, Any]:
    if "pcc" in spec_json:
        return spec_json["pcc"]
    if "PCC" in spec_json:
        return spec_json["PCC"]
    return {}


def _build_evidence_summary(evidence_json: dict[str, Any]) -> dict[str, Any]:
    return {
        "references": evidence_json.get("references", {}),
        "trace": evidence_json.get("trace", {}),
        "outputs": evidence_json.get("outputs", {}),
    }


def _hash_report(report_payload: dict[str, Any]) -> str:
    payload = json.dumps(report_payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
