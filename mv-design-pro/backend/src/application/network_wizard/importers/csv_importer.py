from __future__ import annotations

import json
from io import StringIO
from typing import Any


def parse_nodes_csv(nodes_csv: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    lines = StringIO(nodes_csv)
    header = lines.readline()
    if not header:
        return rows
    for line in lines:
        if not line.strip():
            continue
        parts = line.rstrip("\n").split(",", 4)
        if len(parts) < 4:
            continue
        raw_id = parts[0].strip()
        name = parts[1].strip()
        node_type = parts[2].strip()
        base_kv = float(parts[3] or 0.0)
        attrs_raw = parts[4].strip() if len(parts) > 4 else "{}"
        if not attrs_raw:
            attrs_raw = "{}"
        try:
            attrs = json.loads(attrs_raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid attrs_json for node '{name}'.") from exc
        rows.append(
            {
                "id": raw_id or None,
                "name": name,
                "node_type": node_type,
                "base_kv": base_kv,
                "attrs": attrs,
            }
        )
    return rows


def parse_branches_csv(branches_csv: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    lines = StringIO(branches_csv)
    header = lines.readline()
    if not header:
        return rows
    for line in lines:
        if not line.strip():
            continue
        parts = line.rstrip("\n").split(",", 7)
        if len(parts) < 6:
            continue
        raw_id = parts[0].strip()
        name = parts[1].strip()
        branch_type = parts[2].strip()
        from_node_id = parts[3].strip()
        to_node_id = parts[4].strip()
        in_service_raw = parts[5].strip()
        params_raw = ",".join(parts[6:]).strip() if len(parts) > 6 else "{}"
        if not params_raw:
            params_raw = "{}"
        try:
            params = json.loads(params_raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid params_json for branch '{name}'.") from exc
        in_service = True
        if in_service_raw != "":
            in_service = str(in_service_raw).lower() in {"1", "true", "yes", "y"}
        rows.append(
            {
                "id": raw_id or None,
                "name": name,
                "branch_type": branch_type,
                "from_node_id": from_node_id,
                "to_node_id": to_node_id,
                "in_service": in_service,
                "params": params,
            }
        )
    return rows
