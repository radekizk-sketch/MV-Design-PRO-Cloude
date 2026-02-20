#!/usr/bin/env python3
"""CI Guard: FixAction completeness for BLOCKER readiness codes.

Ensures every BLOCKER readiness code has a FixAction leading to a repair path.
Runs as part of the Python CI pipeline.

EXIT CODES:
  0 — all BLOCKERs have FixActions
  1 — missing FixActions detected (CI FAIL)
"""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure src/ is importable
src_dir = Path(__file__).resolve().parent.parent / "backend" / "src"
sys.path.insert(0, str(src_dir))

from domain.readiness_fix_actions import check_blocker_fix_action_coverage  # noqa: E402


def main() -> int:
    print("=" * 70)
    print("  FixAction Completeness Guard")
    print("  Verifying all BLOCKER codes have FixAction mappings...")
    print("=" * 70)

    missing = check_blocker_fix_action_coverage()

    if not missing:
        print("\n  PASS: All known BLOCKER codes have FixActions.")
        print("=" * 70)
        return 0

    print(f"\n  FAIL: {len(missing)} BLOCKER code(s) without FixAction:")
    for code in missing:
        print(f"    - {code}")
    print()
    print("  Fix: Add entries to _FIX_ACTION_MAP in")
    print("       backend/src/domain/readiness_fix_actions.py")
    print("=" * 70)
    return 1


if __name__ == "__main__":
    sys.exit(main())
