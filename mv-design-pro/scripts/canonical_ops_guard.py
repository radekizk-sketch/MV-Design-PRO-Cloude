#!/usr/bin/env python3
"""
canonical_ops_guard.py — CI guard for canonical operation names.

BINDING CONTRACT — Dodatek C §1

Scans frontend (TS/TSX) and backend (PY) source files to ensure:
1. Only canonical operation names are used in API calls.
2. Aliases appear ONLY in the designated mapping files.
3. No raw alias strings in route definitions or fetch calls.

Exit code 0 = pass, 1 = violations found.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Canonical names and aliases
# ---------------------------------------------------------------------------

CANONICAL_OPS: frozenset[str] = frozenset({
    "add_grid_source_sn",
    "continue_trunk_segment_sn",
    "insert_station_on_segment_sn",
    "start_branch_segment_sn",
    "connect_secondary_ring_sn",
    "set_normal_open_point",
    "add_transformer_sn_nn",
    "assign_catalog_to_element",
    "update_element_parameters",
})

ALIAS_NAMES: frozenset[str] = frozenset({
    "add_trunk_segment_sn",
    "insert_station_on_trunk_segment_sn",
    "insert_station_on_trunk_segment",
    "add_branch_segment_sn",
    "start_branch_from_port",
    "connect_ring_sn",
    "connect_secondary_ring",
})

# Files where aliases ARE allowed (the mapping/compatibility layer)
ALLOWED_ALIAS_FILES: frozenset[str] = frozenset({
    "canonical_ops.py",
    "canonicalOps.ts",
    "test_canonical_ops.py",
    "canonicalOps.test.ts",
    "canonical_ops_guard.py",
    "CONTRACT_CLOSURES_APPENDIX_CD.md",
})

# ---------------------------------------------------------------------------
# Scanning
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_SRC = REPO_ROOT / "backend" / "src"
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"


def _is_allowed_file(path: Path) -> bool:
    """Check if aliases are permitted in this file."""
    return path.name in ALLOWED_ALIAS_FILES


def _scan_file(path: Path, pattern: re.Pattern[str], label: str) -> list[str]:
    """Scan a single file for alias occurrences."""
    violations: list[str] = []
    if _is_allowed_file(path):
        return violations
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return violations
    for line_no, line in enumerate(text.splitlines(), start=1):
        for match in pattern.finditer(line):
            alias = match.group(0)
            violations.append(
                f"  {label} {path.relative_to(REPO_ROOT)}:{line_no}  "
                f"alias '{alias}' — use canonical name instead"
            )
    return violations


def scan_directory(
    directory: Path,
    extensions: tuple[str, ...],
    label: str,
) -> list[str]:
    """Scan all files with given extensions for alias usage."""
    if not directory.exists():
        return []
    # Build regex: match any alias as a whole word (in quotes or bare)
    alias_alternatives = "|".join(re.escape(a) for a in sorted(ALIAS_NAMES))
    pattern = re.compile(rf"\b({alias_alternatives})\b")
    violations: list[str] = []
    for ext in extensions:
        for path in directory.rglob(f"*{ext}"):
            violations.extend(_scan_file(path, pattern, label))
    return violations


def main() -> int:
    """Run the canonical ops guard."""
    print("canonical_ops_guard: scanning for non-canonical operation names...")

    violations: list[str] = []

    # Scan backend Python files
    violations.extend(scan_directory(BACKEND_SRC, (".py",), "[BE]"))

    # Scan frontend TypeScript files
    violations.extend(scan_directory(FRONTEND_SRC, (".ts", ".tsx"), "[FE]"))

    if violations:
        print(f"\nFAILED: {len(violations)} violation(s) found:\n")
        for v in sorted(violations):
            print(v)
        print(
            "\nAliases may only appear in the canonical mapping files: "
            f"{sorted(ALLOWED_ALIAS_FILES)}"
        )
        return 1

    print(f"PASSED: no alias violations in backend or frontend source.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
