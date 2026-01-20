from __future__ import annotations

from typing import Any


class ResultSldOverlayBuilder:
    def build_short_circuit_overlay(
        self, sld_payload: dict[str, Any] | None, result_payload: dict[str, Any] | None
    ) -> dict[str, list[dict[str, Any]]]:
        overlay = {"nodes": [], "branches": []}
        if not sld_payload or not result_payload:
            return overlay

        fault_node_id = result_payload.get("fault_node_id")
        if fault_node_id is None:
            return overlay

        metrics = {
            "ik_a": result_payload.get("ikss_a") or result_payload.get("ik_a"),
            "ib_a": result_payload.get("ib_a"),
            "sz_mva": result_payload.get("sk_mva") or result_payload.get("sz_mva"),
        }
        metrics = {key: value for key, value in metrics.items() if value is not None}
        if not metrics:
            return overlay

        for node in sld_payload.get("nodes", []):
            if str(node.get("node_id")) != str(fault_node_id):
                continue
            overlay["nodes"].append({"node_id": node.get("node_id"), **metrics})
            break

        return overlay
