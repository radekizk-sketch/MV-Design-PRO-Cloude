from __future__ import annotations

from typing import Any


def parse_network_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "project": payload.get("project", {}),
        "nodes": payload.get("nodes", []),
        "branches": payload.get("branches", []),
        "operating_cases": payload.get("operating_cases", []),
        "study_cases": payload.get("study_cases", []),
        "pcc_node_id": payload.get("pcc_node_id"),
        "sources": payload.get("sources", []),
        "loads": payload.get("loads", []),
        "grounding": payload.get("grounding", {}),
        "limits": payload.get("limits", {}),
        "line_types": payload.get("line_types", []),
        "cable_types": payload.get("cable_types", []),
        "transformer_types": payload.get("transformer_types", []),
        "switching_states": payload.get("switching_states", []),
        "schema_version": payload.get("schema_version", "1.0"),
        "export_version": payload.get("export_version", "1.0"),
    }
