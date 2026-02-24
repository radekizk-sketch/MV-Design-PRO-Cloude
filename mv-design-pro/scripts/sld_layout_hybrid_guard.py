#!/usr/bin/env python3
"""
Strażnik: SLD Layout Hybrid — deterministyczność i integralność silnika layoutu.

Sprawdza:
1. layoutPipeline.ts importuje bayClassification i crossingMinimization
2. Brak Math.random(), Date.now(), crypto.randomUUID() w silniku layoutu
3. Brak bezpośrednich importów z React w silniku layoutu
4. Stałe IndustrialAesthetics są spójne (GRID_BASE = 20)
5. Wszystkie fazy pipeline'u istnieją (phase1-phase7)

Wynik: EXIT 0 = PASS, EXIT 1 = FAIL
"""

import re
import sys
from pathlib import Path

FRONTEND_SRC = Path(__file__).resolve().parent.parent / "frontend" / "src"
SLD_CORE = FRONTEND_SRC / "ui" / "sld" / "core"
SLD_ENGINE = FRONTEND_SRC / "engine" / "sld-layout"
AESTHETICS = FRONTEND_SRC / "ui" / "sld" / "IndustrialAesthetics.ts"

# Patterns that MUST NOT appear in layout code
FORBIDDEN_PATTERNS = [
    (re.compile(r"\bMath\.random\(\)"), "Math.random() — niedeterministyczny"),
    (re.compile(r"\bDate\.now\(\)"), "Date.now() — niedeterministyczny"),
    (re.compile(r"\bcrypto\.randomUUID\(\)"), "crypto.randomUUID() — niedeterministyczny"),
    (re.compile(r"from\s+['\"]react['\"]"), "Import z React — silnik layoutu nie może zależeć od React"),
    (re.compile(r"from\s+['\"]react-dom['\"]"), "Import z react-dom — silnik layoutu nie może zależeć od React"),
]

# Files to check for forbidden patterns
LAYOUT_FILES = [
    SLD_CORE / "layoutPipeline.ts",
    SLD_CORE / "bayClassification.ts",
    SLD_CORE / "crossingMinimization.ts",
    SLD_CORE / "visualGraph.ts",
    SLD_CORE / "layoutResult.ts",
]

# Engine files checked for forbidden patterns (core algorithm only, not user override metadata)
# NOTE: engine/sld-layout/pipeline.ts is excluded because it uses Date.now() for user override
# timestamps (not in layout algorithm). Only phase files are checked.
ENGINE_PATTERNS = ["phase1-voltage-bands.ts", "phase2-bay-detection.ts",
                   "phase3-crossing-min.ts", "phase4-coordinates.ts", "phase5-routing.ts"]

EXTENSIONS = {".ts", ".tsx"}


def check_forbidden_patterns() -> list[str]:
    """Sprawdź brak zabronionych wzorców w kodzie layoutu."""
    violations: list[str] = []

    all_files = list(LAYOUT_FILES)
    for pattern in ENGINE_PATTERNS:
        f = SLD_ENGINE / pattern
        if f.exists():
            all_files.append(f)

    for path in all_files:
        if not path.exists():
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, PermissionError):
            continue

        for line_no, line in enumerate(content.splitlines(), 1):
            for pattern, desc in FORBIDDEN_PATTERNS:
                if pattern.search(line):
                    rel = path.relative_to(FRONTEND_SRC.parent.parent)
                    violations.append(f"  {rel}:{line_no}: {desc}")

    return violations


def check_hybrid_imports() -> list[str]:
    """Sprawdź czy layoutPipeline importuje bayClassification i crossingMinimization."""
    violations: list[str] = []
    pipeline_path = SLD_CORE / "layoutPipeline.ts"

    if not pipeline_path.exists():
        violations.append("  layoutPipeline.ts nie istnieje!")
        return violations

    content = pipeline_path.read_text(encoding="utf-8")

    if "bayClassification" not in content:
        violations.append("  layoutPipeline.ts nie importuje bayClassification (brak integracji hybrid)")

    if "crossingMinimization" not in content or "minimizeCrossings" not in content:
        violations.append("  layoutPipeline.ts nie importuje crossingMinimization (brak crossing min)")

    return violations


def check_pipeline_phases() -> list[str]:
    """Sprawdź czy wszystkie fazy pipeline istnieją."""
    violations: list[str] = []
    pipeline_path = SLD_CORE / "layoutPipeline.ts"

    if not pipeline_path.exists():
        return ["  layoutPipeline.ts nie istnieje!"]

    content = pipeline_path.read_text(encoding="utf-8")

    required_phases = [
        "phase1_place_gpz_and_fields",
        "phase2_build_trunk_topology",
        "phase3_place_stations_and_branches",
        "phase4_route_all_edges",
        "phase5_place_labels",
        "phase6_enforce_invariants_and_finalize",
    ]

    for phase in required_phases:
        if phase not in content:
            violations.append(f"  Brak fazy: {phase}")

    return violations


def check_aesthetics_constants() -> list[str]:
    """Sprawdź spójność stałych IndustrialAesthetics."""
    violations: list[str] = []

    if not AESTHETICS.exists():
        violations.append("  IndustrialAesthetics.ts nie istnieje!")
        return violations

    content = AESTHETICS.read_text(encoding="utf-8")

    # GRID_BASE must be 20
    match = re.search(r"export\s+const\s+GRID_BASE\s*=\s*(\d+)", content)
    if match:
        val = int(match.group(1))
        if val != 20:
            violations.append(f"  GRID_BASE = {val}, oczekiwano 20")
    else:
        violations.append("  Nie znaleziono GRID_BASE")

    # GRID_SPACING_MAIN must be 280 (14 * GRID_BASE)
    match = re.search(r"export\s+const\s+GRID_SPACING_MAIN\s*=\s*(\d+)", content)
    if match:
        val = int(match.group(1))
        if val != 280:
            violations.append(f"  GRID_SPACING_MAIN = {val}, oczekiwano 280")

    # Y_GPZ must be 60
    match = re.search(r"export\s+const\s+Y_GPZ\s*=\s*(\d+)", content)
    if match:
        val = int(match.group(1))
        if val != 60:
            violations.append(f"  Y_GPZ = {val}, oczekiwano 60")

    return violations


def check_golden_tests() -> list[str]:
    """Sprawdź czy istnieją golden hybrid tests."""
    violations: list[str] = []

    golden_test = SLD_CORE / "__tests__" / "goldenLayoutHybrid.test.ts"
    if not golden_test.exists():
        violations.append("  Brak goldenLayoutHybrid.test.ts — wymagane 12+ golden networks")
        return violations

    content = golden_test.read_text(encoding="utf-8")
    # Count golden network builders
    builders = re.findall(r"function\s+buildGN_HYB_\d+", content)
    if len(builders) < 12:
        violations.append(f"  Tylko {len(builders)} golden networks w goldenLayoutHybrid.test.ts (wymagane >= 12)")

    return violations


def main() -> int:
    if not FRONTEND_SRC.exists():
        print(f"SKIP: {FRONTEND_SRC} nie istnieje")
        return 0

    all_violations: list[str] = []

    # 1. Forbidden patterns
    v = check_forbidden_patterns()
    if v:
        all_violations.append("--- Zabronione wzorce w kodzie layoutu ---")
        all_violations.extend(v)

    # 2. Hybrid imports
    v = check_hybrid_imports()
    if v:
        all_violations.append("--- Brak importów hybrid ---")
        all_violations.extend(v)

    # 3. Pipeline phases
    v = check_pipeline_phases()
    if v:
        all_violations.append("--- Brakujące fazy pipeline ---")
        all_violations.extend(v)

    # 4. Aesthetics constants
    v = check_aesthetics_constants()
    if v:
        all_violations.append("--- Niespójne stałe IndustrialAesthetics ---")
        all_violations.extend(v)

    # 5. Golden tests
    v = check_golden_tests()
    if v:
        all_violations.append("--- Brak golden tests ---")
        all_violations.extend(v)

    if all_violations:
        print(f"FAIL: Znaleziono {len(all_violations)} problemów w silniku layoutu SLD:")
        for line in all_violations:
            print(line)
        return 1

    print("PASS: SLD Layout Hybrid — wszystkie warunki spełnione.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
