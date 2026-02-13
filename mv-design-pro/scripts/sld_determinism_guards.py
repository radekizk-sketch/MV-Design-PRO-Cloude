#!/usr/bin/env python3
"""
SLD Determinism Guards — CI gates for ETAP-grade SLD.

Guards:
1. Single layout engine entrypoint (no dual-engine)
2. No layout feature flags (layout_v2, experimental_layout, new_layout)
3. Overlay cannot import layout mutators / geometry writers
4. PCC grep-zero (entire repo)
5. No codenames in VisualGraph contract
6. Layout hash independent of camera (no Date.now/Math.random in pipeline)
7. LayoutResultV1 contract immutability (no mutable fields)

Exit code: 0 = OK, 1 = violations found.

PR-3A-03 RUN #3A + RUN #3B + RUN #3C

Guards dodane w RUN #3C:
8. No self-edges in VisualGraph adapter (fromPortRef.nodeId != toPortRef.nodeId)
9. No string-based typology heuristics (includes('station'), name-based detection)
10. No legacy adapter patterns (extractVoltageFromName, classifyNodeType with name)
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

# Sciezka do repo
REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_SRC = REPO_ROOT / "mv-design-pro" / "frontend" / "src"
BACKEND_SRC = REPO_ROOT / "mv-design-pro" / "backend" / "src"

# Kolory ANSI
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"


def find_files(root: Path, extensions: tuple) -> List[Path]:
    """Znajdz pliki z danymi rozszerzeniami."""
    files = []
    if not root.exists():
        return files
    for ext in extensions:
        files.extend(root.rglob(f"*{ext}"))
    return sorted(files)


# =========================================================================
# GUARD 1: Single layout engine entrypoint (no dual-engine)
# =========================================================================

def guard_single_layout_engine() -> List[str]:
    """
    Sprawdz czy istnieje tylko jeden layout engine entrypoint.
    Szukaj wzorcow: 'computeLayout', 'runLayout', 'executeLayout'
    w plikach ktore nie sa testami ani dokumentacja.
    """
    violations = []
    layout_entrypoints = []

    ts_files = find_files(FRONTEND_SRC, (".ts", ".tsx"))
    for f in ts_files:
        # Pomijaj testy i node_modules
        rel = str(f.relative_to(FRONTEND_SRC))
        if "__tests__" in rel or "node_modules" in rel or ".test." in rel or ".spec." in rel:
            continue

        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue

        # Szukaj eksportow funkcji layoutu ktore moga byc entrypointami
        # Pattern: export function compute*Layout lub export function run*Layout
        matches = re.findall(
            r'export\s+function\s+(compute\w*Layout|run\w*Layout|execute\w*Layout)\b',
            content,
        )
        for match in matches:
            layout_entrypoints.append((rel, match))

    # Dozwolone entrypointy (known good):
    allowed = {
        "computeTopologicalLayout",
        "computeBusbarAutoLayout",
        "computeSldAutoLayout",  # alias
        "computeIncrementalLayout",
        "computeLayout",  # RUN #3B — canonical 6-phase pipeline
    }

    for path, func_name in layout_entrypoints:
        if func_name not in allowed:
            violations.append(
                f"  Niedozwolony layout entrypoint: {func_name} w {path}"
            )

    return violations


# =========================================================================
# GUARD 2: No layout feature flags
# =========================================================================

def guard_no_layout_feature_flags() -> List[str]:
    """
    Sprawdz brak feature flags layoutu:
    layout_v2, experimental_layout, new_layout, LAYOUT_V2, etc.
    SLD_AUTO_LAYOUT_V1 jest dozwolone (istniejacy opt-in).
    """
    violations = []
    forbidden_patterns = [
        r"\blayout_v2\b",
        r"\bLAYOUT_V2\b",
        r"\bexperimental_layout\b",
        r"\bnew_layout\b",
        r"\blegacy_layout\b",
        r"\bold_layout\b",
        r"\blayout_v3\b",
        r"\bLAYOUT_V3\b",
    ]

    ts_files = find_files(FRONTEND_SRC, (".ts", ".tsx"))
    for f in ts_files:
        rel = str(f.relative_to(FRONTEND_SRC))
        if "node_modules" in rel:
            continue

        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue

        for pattern in forbidden_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for m in matches:
                line_no = content[:m.start()].count('\n') + 1
                violations.append(
                    f"  Zabroniony layout feature flag: '{m.group()}' w {rel}:{line_no}"
                )

    return violations


# =========================================================================
# GUARD 3: Overlay cannot import layout mutators
# =========================================================================

def guard_overlay_no_layout_imports() -> List[str]:
    """
    Sprawdz ze moduly overlay nie importuja mutatorow layoutu.
    sld-overlay/ nie moze importowac z topological-layout/ ani sld/layout/.
    """
    violations = []
    overlay_dir = FRONTEND_SRC / "ui" / "sld-overlay"

    if not overlay_dir.exists():
        return violations

    ts_files = find_files(overlay_dir, (".ts", ".tsx"))
    forbidden_import_patterns = [
        r"from\s+['\"].*topological-layout",
        r"from\s+['\"].*sld-editor/utils",
        r"from\s+['\"].*sld/layout",
        r"import.*from\s+['\"].*geometricSkeleton",
        r"import.*from\s+['\"].*roleAssigner",
        r"import.*from\s+['\"].*collisionGuard",
    ]

    for f in ts_files:
        rel = str(f.relative_to(FRONTEND_SRC))
        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue

        for pattern in forbidden_import_patterns:
            matches = re.finditer(pattern, content)
            for m in matches:
                line_no = content[:m.start()].count('\n') + 1
                violations.append(
                    f"  Overlay importuje layout mutator: '{m.group().strip()}' w {rel}:{line_no}"
                )

    return violations


# =========================================================================
# GUARD 4: PCC grep-zero
# =========================================================================

def guard_pcc_grep_zero() -> List[str]:
    """
    Sprawdz brak PCC jako koncepcji domeny w calym repo.
    Dozwolone konteksty: komentarze dokumentujace zakaz, testy sprawdzajace zakaz,
    filtrowanie PCC z wejscia (defensywne).
    """
    violations = []

    all_dirs = [FRONTEND_SRC, BACKEND_SRC]

    # Dozwolone pliki (guard scripts, dokumentacja zakazu, testy zakazu)
    allowed_paths = {
        "sld_determinism_guards.py",
        "docs_guard.py",
        "roleAssigner.ts",  # filterPccNodes jest obrona defensywna
        "PCC_OCCURRENCES_SCAN.md",
    }

    for src_dir in all_dirs:
        ts_py_files = find_files(src_dir, (".ts", ".tsx", ".py"))
        for f in ts_py_files:
            rel = str(f.relative_to(REPO_ROOT))
            basename = f.name

            if basename in allowed_paths:
                continue
            if "__tests__" in rel or ".test." in rel or ".spec." in rel:
                continue
            if "node_modules" in rel:
                continue

            try:
                content = f.read_text(encoding="utf-8")
            except Exception:
                continue

            # Szukaj PCC jako identyfikator (nie w komentarzach)
            lines = content.split('\n')
            for line_no, line in enumerate(lines, 1):
                stripped = line.strip()
                # Pomijaj komentarze
                if stripped.startswith('//') or stripped.startswith('#') or stripped.startswith('*'):
                    continue
                # Szukaj PCC jako osobne slowo (nie czesc innego slowa)
                if re.search(r'\bPCC\b', line) and not re.search(r'(forbidden|prohibited|NOT|nie|zakaz|brak|filter)', line, re.IGNORECASE):
                    violations.append(
                        f"  PCC reference: '{stripped[:80]}' w {rel}:{line_no}"
                    )

    return violations


# =========================================================================
# GUARD 5: No codenames in VisualGraph contract
# =========================================================================

def guard_no_codenames_in_contract() -> List[str]:
    """
    Sprawdz brak nazw kodowych (P7, P11, P14, etc.) w plikach kontraktu VisualGraph.
    """
    violations = []
    contract_dir = FRONTEND_SRC / "ui" / "sld" / "core"

    if not contract_dir.exists():
        return violations

    ts_files = find_files(contract_dir, (".ts",))
    codename_pattern = re.compile(r'\bP\d{1,2}\b')

    for f in ts_files:
        if "__tests__" in str(f):
            continue

        rel = str(f.relative_to(FRONTEND_SRC))
        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue

        matches = codename_pattern.finditer(content)
        for m in matches:
            line_no = content[:m.start()].count('\n') + 1
            violations.append(
                f"  Codename w kontrakcie: '{m.group()}' w {rel}:{line_no}"
            )

    return violations


# =========================================================================
# GUARD 6: Layout hash independent of camera (no nondeterminism sources)
# =========================================================================

def guard_layout_no_nondeterminism() -> List[str]:
    """
    Sprawdz brak zrodel niedeterminizmu w pipeline layoutu i kontraktach.
    Zabronione w plikach kontraktu/pipeline:
    - Date.now(), Math.random(), new Date(), performance.now()
    - crypto.randomUUID(), crypto.getRandomValues()
    """
    violations = []
    contract_dir = FRONTEND_SRC / "ui" / "sld" / "core"

    if not contract_dir.exists():
        return violations

    ts_files = find_files(contract_dir, (".ts",))

    forbidden_patterns = [
        (r'\bDate\.now\s*\(\)', "Date.now()"),
        (r'\bMath\.random\s*\(\)', "Math.random()"),
        (r'\bnew\s+Date\s*\(\)', "new Date()"),
        (r'\bperformance\.now\s*\(\)', "performance.now()"),
        (r'\bcrypto\.randomUUID\s*\(\)', "crypto.randomUUID()"),
        (r'\bcrypto\.getRandomValues\b', "crypto.getRandomValues()"),
    ]

    for f in ts_files:
        rel = str(f.relative_to(FRONTEND_SRC))
        # Testy moga uzywac PRNG do permutacji (Fisher-Yates)
        if "__tests__" in rel or ".test." in rel or ".spec." in rel:
            continue

        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue

        for pattern, label in forbidden_patterns:
            matches = re.finditer(pattern, content)
            for m in matches:
                line_no = content[:m.start()].count('\n') + 1
                violations.append(
                    f"  Zrodlo niedeterminizmu: '{label}' w {rel}:{line_no}"
                )

    return violations


# =========================================================================
# GUARD 7: LayoutResultV1 contract immutability (readonly fields)
# =========================================================================

def guard_layout_result_immutability() -> List[str]:
    """
    Sprawdz ze plik layoutResult.ts nie zawiera mutowalnych pol w interfejsach.
    Kazde pole interfejsu MUSI byc readonly.
    """
    violations = []
    layout_result_file = FRONTEND_SRC / "ui" / "sld" / "core" / "layoutResult.ts"

    if not layout_result_file.exists():
        return violations

    try:
        content = layout_result_file.read_text(encoding="utf-8")
    except Exception:
        return violations

    in_interface = False
    brace_depth = 0
    interface_name = ""

    for line_no, line in enumerate(content.split('\n'), 1):
        stripped = line.strip()

        # Wykryj poczatek interfejsu
        iface_match = re.match(r'export\s+interface\s+(\w+)', stripped)
        if iface_match:
            in_interface = True
            interface_name = iface_match.group(1)
            brace_depth = 0

        if in_interface:
            brace_depth += stripped.count('{') - stripped.count('}')
            if brace_depth <= 0 and '{' not in stripped and '}' in stripped:
                in_interface = False
                continue

            # Sprawdz czy pole jest readonly (pomijaj puste linie, komentarze, nawiasy)
            if (
                stripped
                and not stripped.startswith('//')
                and not stripped.startswith('*')
                and not stripped.startswith('/**')
                and not stripped.startswith('{')
                and not stripped.startswith('}')
                and ':' in stripped
                and not stripped.startswith('readonly')
                and not stripped.startswith('export')
                and not stripped.startswith('interface')
            ):
                violations.append(
                    f"  Mutowalne pole w {interface_name}: '{stripped[:60]}' "
                    f"w layoutResult.ts:{line_no}"
                )

    return violations


# =========================================================================
# GUARD 8: No self-edges in adapter output (RUN #3C)
# =========================================================================

def guard_no_self_edges_in_adapter() -> List[str]:
    """
    Sprawdz ze pliki adaptera nie generuja self-edges.
    Self-edge = fromPortRef.nodeId i toPortRef.nodeId wskazuja na ten sam wezel.
    Szukaj wzorcow: { nodeId: s.id, portId: ... } powtorzonych w fromPortRef i toPortRef.
    """
    violations = []
    adapter_files = [
        FRONTEND_SRC / "ui" / "sld" / "core" / "topologyAdapterV1.ts",
        FRONTEND_SRC / "ui" / "sld" / "core" / "topologyAdapterV2.ts",
    ]

    for f in adapter_files:
        if not f.exists():
            continue
        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue

        rel = str(f.relative_to(FRONTEND_SRC))

        # Szukaj wzorca: fromPortRef: { nodeId: X, ... }, toPortRef: { nodeId: X, ... }
        # gdzie X jest ta sama zmienna (np. s.id)
        lines = content.split('\n')
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            # Szukaj linii z fromPortRef i toPortRef z tym samym nodeId
            if 'fromPortRef' in line and 'nodeId' in line:
                # Pobierz nodeId
                m = re.search(r'nodeId:\s*(\S+)', line)
                if m:
                    from_node = m.group(1).rstrip(',')
                    # Sprawdz nastepna linie (toPortRef)
                    for j in range(i + 1, min(i + 5, len(lines))):
                        to_line = lines[j].strip()
                        if 'toPortRef' in to_line and 'nodeId' in to_line:
                            m2 = re.search(r'nodeId:\s*(\S+)', to_line)
                            if m2:
                                to_node = m2.group(1).rstrip(',')
                                if from_node == to_node and from_node not in ('branch.fromNodeId', 'branch.toNodeId', 'source.id', 'source.nodeId', 'gen.id', 'gen.nodeId', 'load.id', 'load.nodeId'):
                                    violations.append(
                                        f"  Mozliwy self-edge: fromPortRef.nodeId={from_node}, "
                                        f"toPortRef.nodeId={to_node} w {rel}:{i + 1}"
                                    )
                            break
            i += 1

    return violations


# =========================================================================
# GUARD 9: No string-based typology heuristics (RUN #3C)
# =========================================================================

def guard_no_string_typology_heuristics() -> List[str]:
    """
    Sprawdz brak heurystyk stringowych do wykrywania stacji/typow.
    Zabronione wzorce w plikach kontraktu (nie testach):
    - name.includes('station'), name.includes('stacja')
    - .replace('station_', ''), .replace('bus_sn_st_', '')
    - extractVoltageFromName (legacy)
    - classifyNodeType z uzyciem elementName.toLowerCase()
    """
    violations = []
    contract_dir = FRONTEND_SRC / "ui" / "sld" / "core"

    if not contract_dir.exists():
        return violations

    ts_files = find_files(contract_dir, (".ts",))

    forbidden_patterns = [
        (r"\.includes\(['\"]station", "includes('station')"),
        (r"\.includes\(['\"]stacja", "includes('stacja')"),
        (r"\.replace\(['\"]station_", "replace('station_')"),
        (r"\.replace\(['\"]bus_sn_st_", "replace('bus_sn_st_')"),
        (r"\bextractVoltageFromName\b", "extractVoltageFromName()"),
        (r"elementName\.toLowerCase\(\)", "elementName.toLowerCase()"),
        (r"\.includes\(['\"]pv['\"]", "includes('pv') — heurystyka PV"),
        (r"\.includes\(['\"]bess['\"]", "includes('bess') — heurystyka BESS"),
        (r"\.includes\(['\"]fotowolt", "includes('fotowolt') — heurystyka PV"),
        (r"\.includes\(['\"]magazyn", "includes('magazyn') — heurystyka BESS"),
    ]

    for f in ts_files:
        rel = str(f.relative_to(FRONTEND_SRC))
        if "__tests__" in rel or ".test." in rel or ".spec." in rel:
            continue

        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue

        for pattern, label in forbidden_patterns:
            matches = re.finditer(pattern, content)
            for m in matches:
                line_no = content[:m.start()].count('\n') + 1
                violations.append(
                    f"  Heurystyka stringowa: '{label}' w {rel}:{line_no}"
                )

    return violations


# =========================================================================
# GUARD 10: No legacy adapter patterns (RUN #3C)
# =========================================================================

def guard_no_legacy_adapter() -> List[str]:
    """
    Sprawdz brak legacy wzorcow adaptera V1 (przed migracja RUN #3C).
    Zabronione w plikach kontraktu (nie testach):
    - Bezposrednie uzycie buildVoltageMap, buildAdjacency, buildSpanningTree
      jako lokalnych funkcji (powinny byc w V2 pipeline)
    - new Date() w meta (niedeterminizm)
    """
    violations = []
    adapter_file = FRONTEND_SRC / "ui" / "sld" / "core" / "topologyAdapterV1.ts"

    if not adapter_file.exists():
        return violations

    try:
        content = adapter_file.read_text(encoding="utf-8")
    except Exception:
        return violations

    legacy_patterns = [
        (r'\bfunction\s+buildVoltageMap\b', "buildVoltageMap (legacy)"),
        (r'\bfunction\s+buildAdjacency\b', "buildAdjacency (legacy)"),
        (r'\bfunction\s+extractVoltageFromName\b', "extractVoltageFromName (legacy)"),
        (r'\bfunction\s+classifyNodeType\b', "classifyNodeType (legacy)"),
        (r'\bnew\s+Date\(\)', "new Date() (nondeterministic)"),
    ]

    for pattern, label in legacy_patterns:
        matches = re.finditer(pattern, content)
        for m in matches:
            line_no = content[:m.start()].count('\n') + 1
            violations.append(
                f"  Legacy pattern: '{label}' w topologyAdapterV1.ts:{line_no}"
            )

    return violations


# =========================================================================
# MAIN
# =========================================================================

def main() -> int:
    guards: List[Tuple[str, List[str]]] = [
        ("GUARD 1: Single layout engine (no dual-engine)", guard_single_layout_engine()),
        ("GUARD 2: No layout feature flags", guard_no_layout_feature_flags()),
        ("GUARD 3: Overlay no layout imports", guard_overlay_no_layout_imports()),
        ("GUARD 4: PCC grep-zero", guard_pcc_grep_zero()),
        ("GUARD 5: No codenames in contract", guard_no_codenames_in_contract()),
        ("GUARD 6: Layout hash camera-independent (no nondeterminism)", guard_layout_no_nondeterminism()),
        ("GUARD 7: LayoutResultV1 immutability (readonly)", guard_layout_result_immutability()),
        ("GUARD 8: No self-edges in adapter (RUN #3C)", guard_no_self_edges_in_adapter()),
        ("GUARD 9: No string typology heuristics (RUN #3C)", guard_no_string_typology_heuristics()),
        ("GUARD 10: No legacy adapter patterns (RUN #3C)", guard_no_legacy_adapter()),
    ]

    total_violations = 0
    for name, violations in guards:
        if violations:
            print(f"{RED}FAIL{RESET} {name} ({len(violations)} violations)")
            for v in violations:
                print(f"  {v}")
            total_violations += len(violations)
        else:
            print(f"{GREEN}PASS{RESET} {name}")

    print()
    if total_violations > 0:
        print(f"{RED}TOTAL: {total_violations} violations — CI BLOCKED{RESET}")
        return 1
    else:
        print(f"{GREEN}ALL GUARDS PASSED — OK{RESET}")
        return 0


if __name__ == "__main__":
    sys.exit(main())
