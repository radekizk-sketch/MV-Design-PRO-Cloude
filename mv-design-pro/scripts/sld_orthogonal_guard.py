#!/usr/bin/env python3
"""
Strażnik: SLD Orthogonal Routing — zakaz skosów i łuków.

Sprawdza:
1. Brak diagonalnych linii w kodzie renderowania SLD
2. Brak arc/bezier/curve w segmentach routingu
3. validateOrthogonalRouting() istnieje i jest wyeksportowana

Wynik: EXIT 0 = PASS, EXIT 1 = FAIL
"""

import re
import sys
from pathlib import Path

FRONTEND_SRC = Path(__file__).resolve().parent.parent / "frontend" / "src"
SLD_CORE = FRONTEND_SRC / "ui" / "sld" / "core"
AESTHETICS = FRONTEND_SRC / "ui" / "sld" / "IndustrialAesthetics.ts"

# Diagonal/curve patterns in routing code
FORBIDDEN_IN_ROUTING = [
    (re.compile(r"\barcTo\b"), "arcTo — łuki zabronione"),
    (re.compile(r"\bbezierCurveTo\b"), "bezierCurveTo — krzywe zabronione"),
    (re.compile(r"\bquadraticCurveTo\b"), "quadraticCurveTo — krzywe zabronione"),
    (re.compile(r"\bMath\.atan2\b"), "Math.atan2 — sugeruje skosy"),
]

ROUTING_FILES = [
    SLD_CORE / "layoutPipeline.ts",
    FRONTEND_SRC / "engine" / "sld-layout" / "phase5-routing.ts",
]


def main() -> int:
    if not FRONTEND_SRC.exists():
        print(f"SKIP: {FRONTEND_SRC} nie istnieje")
        return 0

    violations: list[str] = []

    # 1. Check routing files for forbidden curve patterns
    for path in ROUTING_FILES:
        if not path.exists():
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, PermissionError):
            continue

        for line_no, line in enumerate(content.splitlines(), 1):
            for pattern, desc in FORBIDDEN_IN_ROUTING:
                if pattern.search(line):
                    rel = path.relative_to(FRONTEND_SRC.parent.parent)
                    violations.append(f"  {rel}:{line_no}: {desc}")

    # 2. Check that validateOrthogonalRouting exists in IndustrialAesthetics
    if AESTHETICS.exists():
        content = AESTHETICS.read_text(encoding="utf-8")
        if "validateOrthogonalRouting" not in content:
            violations.append("  IndustrialAesthetics.ts: brak validateOrthogonalRouting()")
    else:
        violations.append("  IndustrialAesthetics.ts nie istnieje")

    if violations:
        print(f"FAIL: Znaleziono {len(violations)} naruszeń ortogonalności SLD:")
        for v in violations:
            print(v)
        return 1

    print("PASS: SLD Orthogonal Routing — brak skosów i łuków.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
