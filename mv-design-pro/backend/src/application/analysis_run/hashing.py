from __future__ import annotations

import hashlib
import json
from typing import Any


def canonicalize(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {key: canonicalize(obj[key]) for key in sorted(obj)}
    if isinstance(obj, list):
        return [canonicalize(item) for item in obj]
    return obj


def to_canonical_json(obj: Any) -> str:
    canonical = canonicalize(obj)
    return json.dumps(canonical, sort_keys=True, separators=(",", ":"))


def compute_input_hash(canonical_json: str) -> str:
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()
