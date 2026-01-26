from __future__ import annotations

from typing import Any


def export_network_payload(
    *,
    project: dict[str, Any],
    nodes: list[dict[str, Any]],
    branches: list[dict[str, Any]],
    operating_cases: list[dict[str, Any]],
    study_cases: list[dict[str, Any]],
    pcc_node_id: str | None,
    sources: list[dict[str, Any]],
    loads: list[dict[str, Any]],
    grounding: dict[str, Any],
    limits: dict[str, Any],
    line_types: list[dict[str, Any]],
    cable_types: list[dict[str, Any]],
    transformer_types: list[dict[str, Any]],
    inverter_types: list[dict[str, Any]],
    switching_states: list[dict[str, Any]],
    schema_version: str,
    export_version: str = "1.0",
) -> dict[str, Any]:
    buses = []
    for node in nodes:
        bus = dict(node)
        if "node_type" in bus:
            bus["bus_type"] = bus.pop("node_type")
        buses.append(bus)
    return {
        "export_version": export_version,
        "schema_version": schema_version,
        "project": project,
        "nodes": nodes,
        "buses": buses,
        "branches": branches,
        "operating_cases": operating_cases,
        "study_cases": study_cases,
        "pcc_node_id": pcc_node_id,
        "sources": sources,
        "loads": loads,
        "grounding": grounding,
        "limits": limits,
        "line_types": line_types,
        "cable_types": cable_types,
        "transformer_types": transformer_types,
        "inverter_types": inverter_types,
        "switching_states": switching_states,
    }
