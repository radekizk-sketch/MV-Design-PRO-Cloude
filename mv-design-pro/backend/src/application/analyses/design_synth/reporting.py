from __future__ import annotations

from typing import Any

from application.analyses.design_synth.canonical import canonicalize_json
from application.analyses.design_synth.models import DesignProposal, DesignSpec

PCC_SECTION_TITLE = "PCC – punkt wspólnego przyłączenia"


def build_connection_study_report(
    spec: DesignSpec, proposal: DesignProposal
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
    }
    return canonicalize_json(report_body)


def _extract_pcc(spec_json: dict[str, Any]) -> dict[str, Any]:
    if "pcc" in spec_json:
        return spec_json["pcc"]
    if "PCC" in spec_json:
        return spec_json["PCC"]
    return {}

