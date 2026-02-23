#!/usr/bin/env python3
"""
Strażnik: zero feature flag na krytycznej ścieżce SLD.

Ścieżka krytyczna:
  - frontend/src/ui/sld/core/
  - frontend/src/engine/sld-layout/

Feature flagi (featureFlag, feature_flag, FF_, isEnabled) są zakazane
na krytycznej ścieżce, ponieważ wprowadzają niedeterminizm
i utrudniają audyt pipeline SLD.

Wynik: EXIT 0 = PASS, EXIT 1 = FAIL
"""

import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "frontend" / "src"

CRITICAL_PATHS = [
    BASE / "ui" / "sld" / "core",
    BASE / "engine" / "sld-layout",
]

PATTERNS = [
    re.compile(r"\bfeatureFlag\b"),
    re.compile(r"\bfeature_flag\b"),
    re.compile(r"\bFF_[A-Z]"),
    re.compile(r"\bisEnabled\s*\("),
    re.compile(r"\bisFeatureEnabled\b"),
    re.compile(r"\buseFeatureFlag\b"),
]

EXTENSIONS = {".ts", ".tsx", ".js", ".jsx"}


def main() -> int:
    violations: list[str] = []

    for critical_path in CRITICAL_PATHS:
        if not critical_path.exists():
            continue

        for path in critical_path.rglob("*"):
            if path.suffix not in EXTENSIONS:
                continue

            try:
                content = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, PermissionError):
                continue

            for line_no, line in enumerate(content.splitlines(), 1):
                for pattern in PATTERNS:
                    if pattern.search(line):
                        rel = path.relative_to(BASE.parent.parent)
                        violations.append(f"  {rel}:{line_no}: {line.strip()}")
                        break

    if violations:
        print(
            f"FAIL: Znaleziono {len(violations)} feature flag na krytycznej ścieżce SLD:"
        )
        for v in violations:
            print(v)
        print()
        print("UI V3 wymaga: zero feature flag na ścieżce krytycznej SLD pipeline.")
        return 1

    print("PASS: zero feature flag na krytycznej ścieżce SLD.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
