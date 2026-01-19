from __future__ import annotations

import csv
import json
from io import StringIO
from typing import Any


def parse_nodes_csv(nodes_csv: str) -> list[dict[str, Any]]:
    reader = csv.DictReader(StringIO(nodes_csv))
    rows: list[dict[str, Any]] = []
    for row in reader:
        attrs_raw = row.get("attrs_json") or row.get("attrs") or "{}"
        raw_id = (row.get("id") or "").strip()
        try:
            attrs = json.loads(attrs_raw) if attrs_raw else {}
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid attrs_json for node '{row.get('name')}'.") from exc
        rows.append(
            {
                "id": raw_id or None,
                "name": (row.get("name") or "").strip(),
                "node_type": (row.get("node_type") or "").strip(),
                "base_kv": float(row.get("base_kv") or 0.0),
                "attrs": attrs,
            }
        )
    return rows


def parse_branches_csv(branches_csv: str) -> list[dict[str, Any]]:
    reader = csv.DictReader(StringIO(branches_csv))
    rows: list[dict[str, Any]] = []
    for row in reader:
        params_raw = row.get("params_json") or row.get("params") or "{}"
        raw_id = (row.get("id") or "").strip()
        try:
            params = json.loads(params_raw) if params_raw else {}
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid params_json for branch '{row.get('name')}'.") from exc
        in_service_raw = row.get("in_service")
        in_service = True
        if in_service_raw is not None and in_service_raw != "":
            in_service = str(in_service_raw).lower() in {"1", "true", "yes", "y"}
        rows.append(
            {
                "id": raw_id or None,
                "name": (row.get("name") or "").strip(),
                "branch_type": (row.get("branch_type") or "").strip(),
                "from_node_id": (row.get("from_node_id") or "").strip(),
                "to_node_id": (row.get("to_node_id") or "").strip(),
                "in_service": in_service,
                "params": params,
            }
        )
    return rows
