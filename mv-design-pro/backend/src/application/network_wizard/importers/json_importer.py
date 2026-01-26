from __future__ import annotations

from typing import Any


def parse_network_payload(payload: dict[str, Any]) -> dict[str, Any]:
    raw_nodes = payload.get("nodes")
    if raw_nodes is None:
        raw_nodes = payload.get("buses", [])
    nodes = []
    for node in raw_nodes:
        node_type = node.get("node_type", node.get("bus_type"))
        nodes.append(
            {
                "id": node.get("id"),
                "name": node.get("name"),
                "node_type": node_type,
                "base_kv": node.get("base_kv"),
                "attrs": node.get("attrs", {}),
            }
        )

    branches = []
    for branch in payload.get("branches", []):
        branches.append(
            {
                "id": branch.get("id"),
                "name": branch.get("name"),
                "branch_type": branch.get("branch_type"),
                "from_node_id": str(branch.get("from_node_id", "")).strip(),
                "to_node_id": str(branch.get("to_node_id", "")).strip(),
                "in_service": branch.get("in_service", True),
                "params": branch.get("params", {}),
            }
        )

    operating_cases = []
    for case in payload.get("operating_cases", []):
        operating_cases.append(
            {
                "id": case.get("id"),
                "name": case.get("name"),
                "payload": case.get("payload", case.get("case_payload", {})),
            }
        )

    study_cases = []
    for case in payload.get("study_cases", []):
        study_cases.append(
            {
                "id": case.get("id"),
                "name": case.get("name"),
                "payload": case.get("payload", case.get("study_payload", {})),
            }
        )

    return {
        "project": payload.get("project", {}),
        "nodes": nodes,
        "branches": branches,
        "operating_cases": operating_cases,
        "study_cases": study_cases,
        "pcc_node_id": payload.get("pcc_node_id"),
        "sources": payload.get("sources", []),
        "loads": payload.get("loads", []),
        "grounding": payload.get("grounding", {}),
        "limits": payload.get("limits", {}),
        "line_types": payload.get("line_types", []),
        "cable_types": payload.get("cable_types", []),
        "transformer_types": payload.get("transformer_types", []),
        "inverter_types": payload.get("inverter_types", []),
        "switching_states": payload.get("switching_states", []),
        "schema_version": payload.get("schema_version", "1.0"),
        "export_version": payload.get("export_version", "1.0"),
    }
