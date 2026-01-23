from __future__ import annotations

from typing import Any


def canonicalize_json(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: canonicalize_json(value[key]) for key in sorted(value.keys())}
    if isinstance(value, list):
        return [canonicalize_json(item) for item in value]
    if isinstance(value, tuple):
        return [canonicalize_json(item) for item in value]
    if isinstance(value, set):
        return sorted((canonicalize_json(item) for item in value), key=_stable_sort_key)
    return value


def _stable_sort_key(value: Any) -> str:
    if isinstance(value, dict):
        for key in ("id", "snapshot_id", "node_id", "branch_id", "name"):
            if key in value and value[key] is not None:
                return str(value[key])
    return str(value)
