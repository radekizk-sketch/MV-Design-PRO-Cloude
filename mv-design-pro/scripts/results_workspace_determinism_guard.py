#!/usr/bin/env python3
"""
Results Workspace Determinism Guard — PR-23

CI sentinel that blocks merge if results workspace code contains
non-deterministic patterns.

SCANNED DIRECTORIES:
  frontend/src/ui/results-workspace/
  backend/src/application/read_models/

BLOCKED PATTERNS:
  - Date.now()         — non-deterministic timestamp
  - Math.random()      — non-deterministic value
  - .sort() without comparator (JS) — implementation-dependent order
  - dynamic keys (computed property names from runtime values)

ALLOWED CONTEXTS:
  - Comments
  - Test files (may reference patterns in descriptions)
  - Import statements
  - String literals in test descriptions

EXIT CODES:
  0 = clean (no violations)
  1 = violation found
  2 = scanned directories not found (skip)
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

# Directories to scan
SCAN_DIRS = [
    REPO_ROOT / "frontend" / "src" / "ui" / "results-workspace",
    REPO_ROOT / "backend" / "src" / "application" / "read_models",
]

# File extensions to scan
SCAN_EXTENSIONS_FRONTEND = {".ts", ".tsx"}
SCAN_EXTENSIONS_BACKEND = {".py"}

# Non-determinism patterns (frontend)
FRONTEND_VIOLATIONS = [
    (re.compile(r"Date\.now\(\)"), "Date.now() — non-deterministic timestamp"),
    (re.compile(r"Math\.random\(\)"), "Math.random() — non-deterministic value"),
    (re.compile(r"\.sort\(\s*\)"), ".sort() without comparator — non-deterministic order"),
    (re.compile(r"\[`?\$\{[^}]+\}`?\]"), "dynamic computed key — non-deterministic property"),
    (re.compile(r"new Date\(\)(?!.*test)"), "new Date() — non-deterministic timestamp"),
    (re.compile(r"performance\.now\(\)"), "performance.now() — non-deterministic timing"),
    (re.compile(r"crypto\.randomUUID\(\)"), "crypto.randomUUID() — non-deterministic ID"),
]

# Non-determinism patterns (backend)
BACKEND_VIOLATIONS = [
    (re.compile(r"random\."), "random.* — non-deterministic value"),
    (re.compile(r"time\.time\(\)"), "time.time() — non-deterministic timestamp"),
    (re.compile(r"uuid4\(\)"), "uuid4() — non-deterministic ID generation"),
    (re.compile(r"\.sort\(\s*\)(?!.*key=)"), ".sort() without key — may be non-deterministic"),
    (re.compile(r"sorted\([^)]*\)(?!.*key=)"), "sorted() without key — may be non-deterministic"),
]

# Lines to skip
SKIP_LINE_PATTERNS = [
    re.compile(r"^\s*#"),           # Python comment
    re.compile(r"^\s*//"),          # JS comment
    re.compile(r"^\s*\*"),          # Block comment continuation
    re.compile(r"^\s*/\*"),         # Block comment start
    re.compile(r"^\s*import\s"),    # Import statements
    re.compile(r"^\s*from\s"),      # Python from-imports
    re.compile(r'^\s*"""'),         # Python docstrings
    re.compile(r"^\s*'''"),         # Python docstrings
]

# Exclude test files from violations
EXCLUDE_PATTERNS = [
    re.compile(r"__tests__"),
    re.compile(r"\.test\."),
    re.compile(r"\.spec\."),
    re.compile(r"tests/"),
    re.compile(r"test_"),
]


def _should_skip_line(line: str) -> bool:
    for pattern in SKIP_LINE_PATTERNS:
        if pattern.search(line):
            return True
    return False


def _should_exclude_file(path: Path) -> bool:
    path_str = str(path)
    for pattern in EXCLUDE_PATTERNS:
        if pattern.search(path_str):
            return True
    return False


def _scan_file(
    path: Path,
    violations: list[tuple[re.Pattern, str]],
) -> list[tuple[int, str, str]]:
    results: list[tuple[int, str, str]] = []

    try:
        content = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return results

    for line_no, line in enumerate(content.splitlines(), start=1):
        if _should_skip_line(line):
            continue

        for pattern, description in violations:
            if pattern.search(line):
                results.append((line_no, line.strip(), description))

    return results


def main() -> int:
    found_any_dir = False
    all_violations: list[tuple[Path, int, str, str]] = []

    for scan_dir in SCAN_DIRS:
        if not scan_dir.exists():
            continue
        found_any_dir = True

        # Determine which violation patterns to use
        is_frontend = "frontend" in str(scan_dir)
        violations = FRONTEND_VIOLATIONS if is_frontend else BACKEND_VIOLATIONS
        extensions = SCAN_EXTENSIONS_FRONTEND if is_frontend else SCAN_EXTENSIONS_BACKEND

        for path in sorted(scan_dir.rglob("*")):
            if not path.is_file():
                continue
            if path.suffix not in extensions:
                continue
            if _should_exclude_file(path):
                continue

            file_violations = _scan_file(path, violations)
            for line_no, line_content, description in file_violations:
                all_violations.append((path, line_no, line_content, description))

    if not found_any_dir:
        print(
            "results-workspace-determinism-guard: no scanned directories found",
            file=sys.stderr,
        )
        return 2

    if all_violations:
        print(
            "RESULTS-WORKSPACE-DETERMINISM-GUARD VIOLATIONS:",
            file=sys.stderr,
        )
        for path, line_no, line_content, description in all_violations:
            rel_path = path.relative_to(REPO_ROOT)
            print(
                f"  {rel_path}:{line_no}: {line_content}",
                file=sys.stderr,
            )
            print(
                f"    -> {description}",
                file=sys.stderr,
            )
        print(
            f"\n{len(all_violations)} violation(s) found. "
            "Results workspace code must be fully deterministic.",
            file=sys.stderr,
        )
        return 1

    print("results-workspace-determinism-guard: PASS (0 violations)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
