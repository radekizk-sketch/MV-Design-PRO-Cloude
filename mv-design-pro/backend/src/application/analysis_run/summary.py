from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def summarize_pf_result(result_dict: dict[str, Any]) -> dict[str, Any]:
    node_voltage = result_dict.get("node_u_mag_pu") or {}
    node_summary = {
        node_id: {"u_mag_pu": float(node_voltage[node_id])}
        for node_id in sorted(node_voltage)
    }
    return {
        "analysis_type": "PF",
        "timestamp": _utc_timestamp(),
        "node_summary": node_summary,
    }


def summarize_sc_result(result_dict: dict[str, Any]) -> dict[str, Any]:
    fault_node_id = result_dict.get("fault_node_id")
    metrics = {
        "ikss_a": result_dict.get("ikss_a"),
        "ip_a": result_dict.get("ip_a"),
        "ith_a": result_dict.get("ith_a"),
    }
    metrics = {key: value for key, value in metrics.items() if value is not None}
    node_summary: dict[str, Any] = {}
    if fault_node_id is not None:
        node_summary[str(fault_node_id)] = metrics
    return {
        "analysis_type": "SC",
        "timestamp": _utc_timestamp(),
        "node_summary": node_summary,
    }
