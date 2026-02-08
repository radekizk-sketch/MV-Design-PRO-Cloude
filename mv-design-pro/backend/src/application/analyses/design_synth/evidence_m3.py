from __future__ import annotations

from typing import Any

from application.analyses.design_synth.canonical import canonicalize_json
from application.analyses.design_synth.trace import DesignSynthTrace

EVIDENCE_SCHEMA_VERSION = "M3"


def build_evidence_payload(
    *,
    case_id: str,
    base_snapshot_id: str,
    spec_payload_canonical: dict[str, Any],
    connection_node: dict[str, Any],
    trace: DesignSynthTrace,
    design_spec_id: str,
    design_proposal_id: str,
    design_evidence_id: str,
    report_json: dict[str, Any],
    report_fingerprint: str,
    created_at_utc_iso: str,
) -> dict[str, Any]:
    # BoundaryNode – węzeł przyłączenia is stored under the `connection_node` key.
    report_summary = _build_report_summary(report_json)
    payload = {
        "inputs": {
            "case_id": case_id,
            "base_snapshot_id": base_snapshot_id,
            "spec_payload_canonical": spec_payload_canonical,
            "connection_node": connection_node,
        },
        "transformations": trace.to_dict()["steps"],
        "outputs": {
            "design_spec_id": design_spec_id,
            "design_proposal_id": design_proposal_id,
            "report_fingerprint": report_fingerprint,
            "report_summary": report_summary,
        },
        "refs": {
            "snapshot_refs": [base_snapshot_id],
            "artifact_refs": [
                {"type": "design_spec", "id": design_spec_id},
                {"type": "design_proposal", "id": design_proposal_id},
                {"type": "design_evidence", "id": design_evidence_id},
            ],
        },
        "meta": {
            "schema_version": EVIDENCE_SCHEMA_VERSION,
            "created_at_utc": created_at_utc_iso,
        },
    }
    return canonicalize_json(payload)


def _build_report_summary(report_json: dict[str, Any]) -> dict[str, Any]:
    return {
        "top_level_keys": sorted(report_json.keys()),
        "section_counts": {
            key: _count_summary(value) for key, value in sorted(report_json.items())
        },
    }


def _count_summary(value: Any) -> int:
    if isinstance(value, dict):
        return len(value.keys())
    if isinstance(value, list):
        return len(value)
    return 1
