from __future__ import annotations

from typing import Any

from application.analyses.design_synth.canonical import canonicalize_json
from application.analyses.design_synth.fingerprint import fingerprint_json
from application.analyses.protection.overcurrent.inputs import ProtectionInput
from application.analyses.protection.overcurrent.settings import OvercurrentSettingsV0

BoundaryNode_LABEL = "BoundaryNode – węzeł przyłączenia"


def build_overcurrent_report_v0(
    input: ProtectionInput,
    settings: OvercurrentSettingsV0,
    *,
    run_meta: dict[str, Any],
) -> dict[str, Any]:
    report_body: dict[str, Any] = {
        "analysis_type": "protection.overcurrent.v0",
        "inputs": {
            "connection_node": input.connection_node,
            "connection_label": BoundaryNode_LABEL,
            "fault_levels": input.fault_levels,
            "case_id": input.case_id,
            "base_snapshot_id": input.base_snapshot_id,
            "topology_ref": input.topology_ref,
            "source_run_id": input.source_run_id,
        },
        "settings": settings.to_dict(),
        "assumptions": settings.assumptions,
        "warnings": settings.warnings,
        "trace_summary": {
            "steps": [
                "read_short_circuit_run",
                "build_protection_input",
                "compute_settings",
                "build_report",
                "index_run",
            ],
            "warning_count": len(settings.warnings),
        },
        "run_meta": run_meta,
    }
    report_body = canonicalize_json(report_body)
    report_fingerprint = fingerprint_json(report_body)
    return canonicalize_json({**report_body, "fingerprint": report_fingerprint})
