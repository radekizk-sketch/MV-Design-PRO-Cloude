#!/usr/bin/env python3
"""
ResultSet V1 Schema Guard — PR-32

Blocks merge if SC ResultSet v1 contract has structurally changed.
Compares frozen dataclass fields against stored schema snapshot.

PROTECTED CONTRACTS:
  backend/src/domain/execution.py — ResultSet, ElementResult frozen dataclasses

ALGORITHM:
  1. Parse protected files for frozen @dataclass definitions
  2. Extract field names and type annotations
  3. Compare against stored schema snapshot (JSON)
  4. If fields added/removed/retyped → FAIL

EXIT CODES:
  0 = clean (no schema drift)
  1 = schema drift detected
  2 = snapshot file missing (first run: generate with --init)
"""

from __future__ import annotations

import ast
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCHEMA_FILE = REPO_ROOT / "scripts" / "guard_references" / "resultset_v1_schema.json"

PROTECTED_CLASSES = {
    "backend/src/domain/execution.py": ["ResultSet", "ElementResult", "Run"],
}


def _extract_dataclass_fields(
    file_path: Path, class_names: list[str]
) -> dict[str, list[dict[str, str]]]:
    """Extract field names and type annotations from frozen dataclasses."""
    if not file_path.exists():
        return {}

    source = file_path.read_text(encoding="utf-8")
    tree = ast.parse(source)

    result: dict[str, list[dict[str, str]]] = {}

    for node in ast.walk(tree):
        if not isinstance(node, ast.ClassDef):
            continue
        if node.name not in class_names:
            continue

        fields: list[dict[str, str]] = []
        for item in node.body:
            if isinstance(item, ast.AnnAssign) and isinstance(
                item.target, ast.Name
            ):
                field_name = item.target.id
                type_str = ast.unparse(item.annotation)
                fields.append({"name": field_name, "type": type_str})

        result[node.name] = fields

    return result


def _compute_current_schema() -> dict[str, dict[str, list[dict[str, str]]]]:
    """Compute current schema for all protected classes."""
    schema: dict[str, dict[str, list[dict[str, str]]]] = {}

    for rel_path, class_names in PROTECTED_CLASSES.items():
        full_path = REPO_ROOT / rel_path
        fields = _extract_dataclass_fields(full_path, class_names)
        if fields:
            schema[rel_path] = fields

    return schema


def _load_reference_schema() -> dict | None:
    if not SCHEMA_FILE.exists():
        return None
    return json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))


def _save_reference_schema(schema: dict) -> None:
    SCHEMA_FILE.parent.mkdir(parents=True, exist_ok=True)
    SCHEMA_FILE.write_text(
        json.dumps(schema, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _compare_schemas(
    reference: dict, current: dict
) -> list[str]:
    """Compare two schema dicts and return list of drift descriptions."""
    drifts: list[str] = []

    for file_path, ref_classes in reference.items():
        cur_classes = current.get(file_path, {})

        for class_name, ref_fields in ref_classes.items():
            cur_fields = cur_classes.get(class_name)

            if cur_fields is None:
                drifts.append(f"  {file_path}::{class_name}: CLASS REMOVED")
                continue

            ref_names = {f["name"] for f in ref_fields}
            cur_names = {f["name"] for f in cur_fields}

            for removed in sorted(ref_names - cur_names):
                drifts.append(
                    f"  {file_path}::{class_name}.{removed}: FIELD REMOVED"
                )

            for added in sorted(cur_names - ref_names):
                drifts.append(
                    f"  {file_path}::{class_name}.{added}: FIELD ADDED"
                )

            # Check type changes
            ref_map = {f["name"]: f["type"] for f in ref_fields}
            cur_map = {f["name"]: f["type"] for f in cur_fields}

            for name in sorted(ref_names & cur_names):
                if ref_map[name] != cur_map[name]:
                    drifts.append(
                        f"  {file_path}::{class_name}.{name}: "
                        f"TYPE CHANGED ({ref_map[name]} → {cur_map[name]})"
                    )

    return drifts


def main() -> int:
    if "--init" in sys.argv:
        schema = _compute_current_schema()
        _save_reference_schema(schema)
        total_classes = sum(len(v) for v in schema.values())
        print(
            f"resultset-v1-schema-guard: initialized schema snapshot "
            f"({total_classes} classes)"
        )
        return 0

    reference = _load_reference_schema()
    if reference is None:
        print(
            "resultset-v1-schema-guard: snapshot file missing. "
            f"Run: python {Path(__file__).name} --init",
            file=sys.stderr,
        )
        return 2

    current = _compute_current_schema()
    drifts = _compare_schemas(reference, current)

    if drifts:
        print("RESULTSET-V1-SCHEMA-GUARD VIOLATIONS:", file=sys.stderr)
        for d in drifts:
            print(d, file=sys.stderr)
        print(
            f"\n{len(drifts)} drift(s) detected. "
            "SC ResultSet v1 contract must NOT be modified.",
            file=sys.stderr,
        )
        return 1

    total_classes = sum(len(v) for v in reference.items())
    print(f"resultset-v1-schema-guard: PASS ({total_classes} classes verified)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
