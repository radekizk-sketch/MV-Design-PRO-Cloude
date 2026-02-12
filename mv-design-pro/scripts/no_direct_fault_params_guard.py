#!/usr/bin/env python3
"""
CI Guard: no_direct_fault_params_guard.py — PR-19

Blocks:
1. Usage of `fault_node_id` outside of FaultScenario domain / solver binding.
2. Direct calls to `execute_short_circuit` outside of ExecutionEngine.

Allowed locations (whitelist):
- domain/fault_scenario.py (domain model)
- application/solvers/short_circuit_binding.py (binding layer)
- application/execution_engine/service.py (engine orchestration)
- application/result_mapping/ (result mapping)
- tests/ (test files)
- scripts/ (this guard)

Exit 0 = PASS, Exit 1 = FAIL.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

# Root of the backend source
BACKEND_SRC = Path(__file__).resolve().parent.parent / "mv-design-pro" / "backend" / "src"
BACKEND_TESTS = Path(__file__).resolve().parent.parent / "mv-design-pro" / "backend" / "tests"

# Patterns to detect
FAULT_NODE_ID_PATTERN = re.compile(r"\bfault_node_id\b")
EXECUTE_SC_PATTERN = re.compile(r"\bexecute_short_circuit\b")

# Whitelisted paths (relative to backend src)
WHITELISTED_PATHS = {
    "domain/fault_scenario.py",
    "application/solvers/short_circuit_binding.py",
    "application/execution_engine/service.py",
    "application/result_mapping/short_circuit_to_resultset_v1.py",
    "application/fault_scenario_service.py",
}


def is_whitelisted(filepath: Path) -> bool:
    """Check if a file is in the whitelist or is a test/script."""
    # Tests and scripts are always allowed
    rel = str(filepath)
    if "/tests/" in rel or "/scripts/" in rel:
        return True

    # Check against whitelist
    try:
        relative = filepath.relative_to(BACKEND_SRC)
        return str(relative) in WHITELISTED_PATHS
    except ValueError:
        return True  # Outside backend src


def check_file(filepath: Path) -> list[str]:
    """Check a single file for violations."""
    violations: list[str] = []

    if not filepath.suffix == ".py":
        return violations

    if is_whitelisted(filepath):
        return violations

    try:
        content = filepath.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return violations

    for i, line in enumerate(content.splitlines(), 1):
        # Skip comments
        stripped = line.strip()
        if stripped.startswith("#"):
            continue

        if FAULT_NODE_ID_PATTERN.search(line):
            violations.append(
                f"  {filepath}:{i}: usage of 'fault_node_id' outside whitelisted module"
            )

        if EXECUTE_SC_PATTERN.search(line):
            violations.append(
                f"  {filepath}:{i}: direct call to 'execute_short_circuit' outside whitelisted module"
            )

    return violations


def main() -> int:
    violations: list[str] = []

    if not BACKEND_SRC.exists():
        print("WARN: Backend source directory not found, skipping guard.")
        return 0

    # Scan all Python files
    for py_file in BACKEND_SRC.rglob("*.py"):
        violations.extend(check_file(py_file))

    if violations:
        print("FAIL: Direct fault parameter usage detected outside whitelisted modules:")
        for v in sorted(violations):
            print(v)
        print(f"\n{len(violations)} violation(s) found.")
        print("Use FaultScenario domain objects instead of raw fault parameters.")
        return 1

    print("PASS: No direct fault parameter violations found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
