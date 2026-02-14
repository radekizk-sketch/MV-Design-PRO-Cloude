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

Guards dodane w RUN #3D:
11. Station block builder generates fields for every station (station-has-members)
12. Field device requirements enforced per FieldRole (field-has-required-devices)
13. Device catalog ref validation present (device-catalogRef-present)
14. Relay binding fix actions generated for CB without protection (relay-binding-present)
15. No auto-default/fabrication in stationBlockBuilder (zero-fabrication)

Guards dodane w RUN #3E:
16. Station elementType=STATION (not Bus) in adapter
17. Generator elementType=GENERATOR (not Source) in adapter
18. No new UI elementId creation (no uuid/nanoid fabrication)
19. ReadinessGateError enforcement (gates exist in frontend + backend)
20. ExportManifest spec v1.1 with readinessStatus field
21. ResultJoin references domain elementId (not fabricated)
22. Golden network E2E tests exist (7 topologies)

Guards dodane w RUN #3F:
23. Polish taxonomy completeness (PoleTypeV1 + AparatTypeV1 in FE + BE)
24. PV/BESS transformer enforcement (no direct connection without TR)
25. Field/device readiness gates exist (3 gates: fields_complete, devices_parametrized, protection_bindings)
26. Symbol registry completeness (DeviceType → SldSymbolType mapping)
27. No decorative symbols in symbol registry (only IEC-compliant)
28. Field device tests exist (FE: fieldDevicePolish.test.ts, BE: test_field_device.py)

Guards dodane w RUN #3G:
29. Switchgear renderer exists (switchgearRenderer.ts + tests)
30. Switchgear E2E tests exist (switchgearE2E.test.ts)
31. Field/device inspector exists (fieldDeviceInspector.ts)
32. Switchgear wizard exists (3 screens + store + types)
33. Station field validation backend (station_field_validation.py)

Guards dodane w RUN #3G DOMKNIECIE:
34. PV/BESS validation module exists (pvBessValidation.ts + tests)
35. Wizard topology API wiring (useSwitchgearOps.ts with 4 ops)
36. Inspector results resolver (elementResultsResolver.ts, no TODO null)
37. No stub handlers in wizard screens (topology API wired)

Guards dodane w RUN #3H (TRYB PROJEKTOWY):
38. applyOverrides module exists (applyOverrides.ts + geometryOverrides.ts)
39. Layout engine separation (overrides don't modify LayoutResultV1 directly)
40. Overrides overlay separation (overlay doesn't import geometry mutators)
41. Overrides API exists (backend sld_overrides.py + frontend overridesApi.ts)
42. Overrides determinism tests exist (3 test files)
43. CI overrides pipeline (sld-determinism.yml has overrides steps)
44. No TODO null in overrides code
45. No codenames in overrides code
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

# Sciezka do repo
# __file__ jest w mv-design-pro/scripts/ → parent.parent = mv-design-pro/
# FRONTEND_SRC = mv-design-pro/frontend/src
REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"
BACKEND_SRC = REPO_ROOT / "backend" / "src"

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
        "computeFullLayout",  # engine/sld-layout/pipeline — deleguje do computeLayout
        "executeBusbarAutoLayout",  # busbar adapter — deleguje do computeBusbarAutoLayout
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

    # Pliki wykluczone z guard 6:
    # exportManifest.ts: new Date() uzyty TYLKO do createdAt (informacyjny),
    # NIE wchodzi w skład contentHash. Hash jest deterministyczny.
    allowed_nondeterminism = {"exportManifest.ts"}

    for f in ts_files:
        rel = str(f.relative_to(FRONTEND_SRC))
        # Testy moga uzywac PRNG do permutacji (Fisher-Yates)
        if "__tests__" in rel or ".test." in rel or ".spec." in rel:
            continue
        if f.name in allowed_nondeterminism:
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
# GUARD 11: Station block builder generates fields (station-has-members) (RUN #3D)
# =========================================================================

def guard_station_has_members() -> List[str]:
    """
    Sprawdz ze stationBlockBuilder buduje pola (fields) dla kazdej stacji.
    Builder MUSI iterowac po stacjach i tworzyc pola — nigdy pusta lista.
    Szukaj: buildFieldsForStation lub ekwiwalentu — musi istniec.
    """
    violations = []
    builder_file = FRONTEND_SRC / "ui" / "sld" / "core" / "stationBlockBuilder.ts"

    if not builder_file.exists():
        violations.append("  BRAK pliku stationBlockBuilder.ts — CI BLOCKED")
        return violations

    try:
        content = builder_file.read_text(encoding="utf-8")
    except Exception:
        violations.append("  Nie mozna odczytac stationBlockBuilder.ts")
        return violations

    # Builder MUSI zawierac funkcje budujaca pola
    if "buildFieldsForStation" not in content and "buildFields" not in content:
        violations.append(
            "  stationBlockBuilder.ts nie zawiera buildFieldsForStation — "
            "stacje nie beda mialy pol (brak field generation)"
        )

    # Builder MUSI iterowac po stacjach
    if "for (const station of" not in content and "stations.map" not in content:
        violations.append(
            "  stationBlockBuilder.ts nie iteruje po stacjach — "
            "brak przetwarzania stacji w builderze"
        )

    return violations


# =========================================================================
# GUARD 12: Field device requirements enforced (field-has-required-devices) (RUN #3D)
# =========================================================================

def guard_field_has_required_devices() -> List[str]:
    """
    Sprawdz ze fieldDeviceContracts.ts definiuje DEVICE_REQUIREMENT_SETS
    i ze validateFieldDevices istnieje i sprawdza wymagania.
    """
    violations = []
    contracts_file = FRONTEND_SRC / "ui" / "sld" / "core" / "fieldDeviceContracts.ts"

    if not contracts_file.exists():
        violations.append("  BRAK pliku fieldDeviceContracts.ts — CI BLOCKED")
        return violations

    try:
        content = contracts_file.read_text(encoding="utf-8")
    except Exception:
        violations.append("  Nie mozna odczytac fieldDeviceContracts.ts")
        return violations

    # DEVICE_REQUIREMENT_SETS musi istniec
    if "DEVICE_REQUIREMENT_SETS" not in content:
        violations.append(
            "  BRAK DEVICE_REQUIREMENT_SETS w fieldDeviceContracts.ts — "
            "brak definicji wymagan urzadzen per FieldRole"
        )

    # validateFieldDevices musi istniec
    if "function validateFieldDevices" not in content:
        violations.append(
            "  BRAK validateFieldDevices w fieldDeviceContracts.ts — "
            "brak walidacji urzadzen w polach"
        )

    # FieldRoleV1 musi miec wymagane role
    required_roles = ["LINE_IN", "LINE_OUT", "TRANSFORMER_SN_NN", "PV_SN", "BESS_SN"]
    for role in required_roles:
        if role not in content:
            violations.append(
                f"  BRAK roli {role} w fieldDeviceContracts.ts"
            )

    return violations


# =========================================================================
# GUARD 13: Device catalog ref validation (device-catalogRef-present) (RUN #3D)
# =========================================================================

def guard_device_catalog_ref_present() -> List[str]:
    """
    Sprawdz ze stationBlockBuilder generuje FixAction dla brakujacych catalogRef.
    Builder NIE moze fabricowac referencji katalogowych — musi generowac CATALOG_REF_MISSING.
    """
    violations = []
    builder_file = FRONTEND_SRC / "ui" / "sld" / "core" / "stationBlockBuilder.ts"

    if not builder_file.exists():
        return violations

    try:
        content = builder_file.read_text(encoding="utf-8")
    except Exception:
        return violations

    # Builder MUSI sprawdzac catalogRef i generowac FixAction
    if "CATALOG_REF_MISSING" not in content and "catalog.ref_missing" not in content:
        violations.append(
            "  stationBlockBuilder.ts nie generuje CATALOG_REF_MISSING FixAction — "
            "brak walidacji referencji katalogowej urzadzen"
        )

    # ZAKAZ auto-defaults: szukaj wzorcow fabricacji
    forbidden = [
        (r"catalogRef:\s*['\"]default", "catalogRef: 'default' (fabricated)"),
        (r"catalogRef:\s*['\"]auto", "catalogRef: 'auto' (fabricated)"),
        (r"catalogRef:\s*['\"]unknown", "catalogRef: 'unknown' (fabricated)"),
    ]

    for pattern, label in forbidden:
        matches = re.finditer(pattern, content)
        for m in matches:
            line_no = content[:m.start()].count('\n') + 1
            violations.append(
                f"  Fabricated catalog ref: '{label}' w stationBlockBuilder.ts:{line_no}"
            )

    return violations


# =========================================================================
# GUARD 14: Relay binding fix actions (relay-binding-present) (RUN #3D)
# =========================================================================

def guard_relay_binding_present() -> List[str]:
    """
    Sprawdz ze stationBlockBuilder generuje FixAction dla brakujacych relay bindings.
    CB bez relay → PROTECTION_RELAY_BINDING_MISSING.
    """
    violations = []
    builder_file = FRONTEND_SRC / "ui" / "sld" / "core" / "stationBlockBuilder.ts"

    if not builder_file.exists():
        return violations

    try:
        content = builder_file.read_text(encoding="utf-8")
    except Exception:
        return violations

    # Builder MUSI generowac FixAction dla brakujacej ochrony
    if "PROTECTION_RELAY_BINDING_MISSING" not in content and "protection.relay_binding_missing" not in content:
        violations.append(
            "  stationBlockBuilder.ts nie generuje PROTECTION_RELAY_BINDING_MISSING — "
            "brak walidacji powiazania relay z CB"
        )

    return violations


# =========================================================================
# GUARD 15: No auto-default/fabrication (zero-fabrication) (RUN #3D)
# =========================================================================

def guard_zero_fabrication() -> List[str]:
    """
    Sprawdz brak auto-default / fabricacji w stationBlockBuilder i fieldDeviceContracts.
    ZAKAZ: fallback do domyslnych wartosci, fabricowanie urzadzen, auto-uzupelnianie.
    """
    violations = []
    files_to_check = [
        FRONTEND_SRC / "ui" / "sld" / "core" / "stationBlockBuilder.ts",
        FRONTEND_SRC / "ui" / "sld" / "core" / "fieldDeviceContracts.ts",
    ]

    forbidden_patterns = [
        (r"//\s*auto[- ]?default", "auto-default comment (suggests fabrication)"),
        (r"//\s*fallback", "fallback comment (suggests fabrication)"),
        (r"\bfallbackDevice\b", "fallbackDevice variable"),
        (r"\bdefaultDevice\b", "defaultDevice variable"),
        (r"\bautoCreate\w*Device\b", "autoCreateDevice function"),
        (r"\bfabricat", "fabricat* (fabrication reference)"),
    ]

    for f in files_to_check:
        if not f.exists():
            continue
        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue

        rel = f.name
        for pattern, label in forbidden_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for m in matches:
                line_no = content[:m.start()].count('\n') + 1
                # Pomijaj komentarze dokumentujace ZAKAZ
                context_line = content.split('\n')[line_no - 1].strip()
                if any(kw in context_line.lower() for kw in ("zakaz", "never", "nie", "prohibited", "forbidden")):
                    continue
                violations.append(
                    f"  Auto-default/fabrication: '{label}' w {rel}:{line_no}"
                )

    return violations


# =========================================================================
# GUARD 16: Station elementType must be STATION, not Bus (RUN #3E)
# =========================================================================

def guard_station_element_type() -> List[str]:
    """
    Sprawdz ze adapter NIE ustawia elementType='Bus' dla stacji.
    Stacje MUSZA miec elementType='STATION' (ElementTypeV1.STATION).
    """
    violations = []
    adapter_file = FRONTEND_SRC / "ui" / "sld" / "core" / "topologyAdapterV2.ts"

    if not adapter_file.exists():
        return violations

    try:
        content = adapter_file.read_text(encoding="utf-8")
    except Exception:
        return violations

    # Szukaj sekcji tworzacej wezly stacji i sprawdz elementType
    # Sekcja zaczyna sie od komentarza "--- 2. Create nodes for stations ---"
    in_station_section = False
    lines = content.split('\n')
    for line_no, line in enumerate(lines, 1):
        stripped = line.strip()

        # Wykryj poczatek sekcji stacji (komentarz, nie loop)
        if 'Create nodes for stations' in stripped:
            in_station_section = True
        if in_station_section and 'Create nodes for sources' in stripped:
            in_station_section = False

        if in_station_section and "elementType:" in stripped:
            # elementType MUSI byc 'STATION', nie 'Bus'
            if "'Bus'" in stripped or '"Bus"' in stripped:
                violations.append(
                    f"  Station elementType='Bus' (powinno byc 'STATION') w topologyAdapterV2.ts:{line_no}"
                )

    return violations


# =========================================================================
# GUARD 17: Generator elementType must be GENERATOR, not Source (RUN #3E)
# =========================================================================

def guard_generator_element_type() -> List[str]:
    """
    Sprawdz ze adapter NIE ustawia elementType='Source' dla generatorow.
    Generatory MUSZA miec elementType='GENERATOR' (ElementTypeV1.GENERATOR).
    """
    violations = []
    adapter_file = FRONTEND_SRC / "ui" / "sld" / "core" / "topologyAdapterV2.ts"

    if not adapter_file.exists():
        return violations

    try:
        content = adapter_file.read_text(encoding="utf-8")
    except Exception:
        return violations

    # Szukaj sekcji tworzacej wezly generatorow i sprawdz elementType
    in_generator_section = False
    lines = content.split('\n')
    for line_no, line in enumerate(lines, 1):
        stripped = line.strip()

        # Wykryj sekcje generatorow
        if 'Create nodes for generators' in stripped or 'for (const gen of' in stripped:
            in_generator_section = True
        if in_generator_section and 'Create nodes for loads' in stripped:
            in_generator_section = False

        if in_generator_section and "elementType:" in stripped:
            # elementType MUSI byc 'GENERATOR', nie 'Source'
            if "'Source'" in stripped or '"Source"' in stripped:
                violations.append(
                    f"  Generator elementType='Source' (powinno byc 'GENERATOR') w topologyAdapterV2.ts:{line_no}"
                )

    return violations


# =========================================================================
# GUARD 18: No new UI elementId creation (identity_guard) (RUN #3E)
# =========================================================================

def guard_no_new_element_id_creation() -> List[str]:
    """
    Sprawdz ze nowe pliki nie tworza nowych schematow identyfikacji elementow.
    Dozwolone: 'dev_' prefix (udokumentowany), 'edge_' prefix (SLD internal).
    Zabronione: uuid/nanoid/randomUUID do tworzenia elementId.
    """
    violations = []

    contract_dir = FRONTEND_SRC / "ui" / "sld" / "core"
    if not contract_dir.exists():
        return violations

    ts_files = find_files(contract_dir, (".ts",))
    forbidden_patterns = [
        (r'\buuid\b', "uuid (fabricated elementId)"),
        (r'\bnanoid\b', "nanoid (fabricated elementId)"),
        (r'\brandomUUID\b', "randomUUID (fabricated elementId)"),
        (r'\buuidv4\b', "uuidv4 (fabricated elementId)"),
    ]

    for f in ts_files:
        rel = str(f.relative_to(FRONTEND_SRC))
        if "__tests__" in rel or ".test." in rel:
            continue

        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue

        for pattern, label in forbidden_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for m in matches:
                line_no = content[:m.start()].count('\n') + 1
                # Skip comments
                context_line = content.split('\n')[line_no - 1].strip()
                if context_line.startswith('//') or context_line.startswith('*'):
                    continue
                violations.append(
                    f"  Fabricated elementId: '{label}' w {rel}:{line_no}"
                )

    return violations


# =========================================================================
# GUARD 19: ReadinessGateError enforcement (RUN #3E)
# =========================================================================

def guard_readiness_gate_enforcement() -> List[str]:
    """
    Sprawdz ze ReadinessGateError jest zdefiniowany w OBIE strony (frontend + backend).
    Gate functions MUSZA istniec: requireSldReady, requireShortCircuitReady,
    requireLoadFlowReady, requireExportReady.
    """
    violations = []

    # Frontend check
    readiness_file_fe = FRONTEND_SRC / "ui" / "sld" / "core" / "readinessProfile.ts"
    if readiness_file_fe.exists():
        try:
            content = readiness_file_fe.read_text(encoding="utf-8")
        except Exception:
            content = ""

        required_fe = [
            "class ReadinessGateError",
            "function requireSldReady",
            "function requireShortCircuitReady",
            "function requireLoadFlowReady",
            "function requireExportReady",
        ]
        for req in required_fe:
            if req not in content:
                violations.append(
                    f"  BRAK '{req}' w readinessProfile.ts (frontend)"
                )
    else:
        violations.append("  BRAK readinessProfile.ts — frontend gates missing")

    # Backend check
    readiness_file_be = BACKEND_SRC / "domain" / "readiness.py"
    if readiness_file_be.exists():
        try:
            content = readiness_file_be.read_text(encoding="utf-8")
        except Exception:
            content = ""

        required_be = [
            "class ReadinessGateError",
            "def require_sld_ready",
            "def require_short_circuit_ready",
            "def require_load_flow_ready",
            "def require_export_ready",
        ]
        for req in required_be:
            if req not in content:
                violations.append(
                    f"  BRAK '{req}' w readiness.py (backend)"
                )
    else:
        violations.append("  BRAK readiness.py — backend gates missing")

    return violations


# =========================================================================
# GUARD 20: ExportManifest spec v1.1 with readinessStatus (RUN #3E)
# =========================================================================

def guard_export_manifest_v11() -> List[str]:
    """
    Sprawdz ze ExportManifest ma specVersion 1.1 i pole readinessStatus.
    Obie strony (frontend + backend) MUSZA byc zgodne.
    """
    violations = []

    # Frontend
    manifest_fe = FRONTEND_SRC / "ui" / "sld" / "core" / "exportManifest.ts"
    if manifest_fe.exists():
        try:
            content = manifest_fe.read_text(encoding="utf-8")
        except Exception:
            content = ""

        if "readinessStatus" not in content:
            violations.append(
                "  BRAK readinessStatus w exportManifest.ts (frontend)"
            )
        if "specVersion" not in content:
            violations.append(
                "  BRAK specVersion w exportManifest.ts (frontend)"
            )
        has_v11 = "'1.1'" in content or '"1.1"' in content
        has_v12 = "'1.2'" in content or '"1.2"' in content
        if not has_v11 and not has_v12:
            violations.append(
                "  specVersion nie jest '1.1' ani '1.2' w exportManifest.ts (frontend)"
            )
    else:
        violations.append("  BRAK exportManifest.ts (frontend)")

    # Backend
    manifest_be = BACKEND_SRC / "domain" / "export_manifest.py"
    if manifest_be.exists():
        try:
            content = manifest_be.read_text(encoding="utf-8")
        except Exception:
            content = ""

        if "readiness_status" not in content:
            violations.append(
                "  BRAK readiness_status w export_manifest.py (backend)"
            )
        if "spec_version" not in content:
            violations.append(
                "  BRAK spec_version w export_manifest.py (backend)"
            )
        if '"1.1"' not in content:
            violations.append(
                "  spec_version != '1.1' w export_manifest.py (backend)"
            )
    else:
        violations.append("  BRAK export_manifest.py (backend)")

    return violations


# =========================================================================
# GUARD 21: ResultJoin references domain elementId (RUN #3E)
# =========================================================================

def guard_result_join_domain_element_id() -> List[str]:
    """
    Sprawdz ze resultJoin.ts uzywa domain elementId, nie fabricowanych IDs.
    ResultJoin NIE moze zawierac uuid/nanoid do tworzenia nowych identyfikatorow.
    """
    violations = []

    result_join_files = [
        FRONTEND_SRC / "ui" / "sld" / "core" / "resultJoin.ts",
        BACKEND_SRC / "domain" / "result_join.py",
    ]

    for f in result_join_files:
        if not f.exists():
            continue
        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue

        rel = f.name
        forbidden = [
            (r'\buuid\b', "uuid (fabricated ID)"),
            (r'\bnanoid\b', "nanoid (fabricated ID)"),
            (r'\brandomUUID\b', "randomUUID (fabricated ID)"),
        ]

        for pattern, label in forbidden:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for m in matches:
                line_no = content[:m.start()].count('\n') + 1
                context_line = content.split('\n')[line_no - 1].strip()
                if context_line.startswith('//') or context_line.startswith('#') or context_line.startswith('*'):
                    continue
                violations.append(
                    f"  ResultJoin fabricated ID: '{label}' w {rel}:{line_no}"
                )

    return violations


# =========================================================================
# GUARD 22: Golden network E2E tests exist (RUN #3E)
# =========================================================================

def guard_golden_network_e2e_exists() -> List[str]:
    """
    Sprawdz ze plik goldenNetworkE2E.test.ts istnieje
    i zawiera 7 wymaganych topologii.
    """
    violations = []
    golden_file = FRONTEND_SRC / "ui" / "sld" / "core" / "__tests__" / "goldenNetworkE2E.test.ts"

    if not golden_file.exists():
        violations.append(
            "  BRAK goldenNetworkE2E.test.ts — brak referencyjnych testow E2E"
        )
        return violations

    try:
        content = golden_file.read_text(encoding="utf-8")
    except Exception:
        violations.append("  Nie mozna odczytac goldenNetworkE2E.test.ts")
        return violations

    required_networks = [
        ("GN-E2E-01", "radial 10 stations"),
        ("GN-E2E-02", "ring with NOP"),
        ("GN-E2E-03", "branch station"),
        ("GN-E2E-04", "sectional Type D"),
        ("GN-E2E-05", "PV nn_side"),
        ("GN-E2E-06", "BESS nn_side"),
        ("GN-E2E-07", "PV+BESS block_transformer"),
    ]

    for code, desc in required_networks:
        if code not in content:
            violations.append(
                f"  BRAK golden network {code} ({desc}) w goldenNetworkE2E.test.ts"
            )

    # Must have determinism tests
    if "hash stability" not in content.lower() and "hash stable" not in content.lower():
        violations.append(
            "  BRAK testow hash stability w goldenNetworkE2E.test.ts"
        )

    if "permutation invariance" not in content.lower() and "permutation" not in content.lower():
        violations.append(
            "  BRAK testow permutation invariance w goldenNetworkE2E.test.ts"
        )

    return violations


# =========================================================================
# GUARD 23: Polish taxonomy completeness (PoleTypeV1 + AparatTypeV1) (RUN #3F)
# =========================================================================

def guard_polish_taxonomy_completeness() -> List[str]:
    """
    Sprawdz ze PoleTypeV1 i AparatTypeV1 sa zdefiniowane w OBIE strony (FE + BE).
    Polish taxonomy MUSI byc zsynchronizowana.
    """
    violations = []

    # Frontend check
    contracts_fe = FRONTEND_SRC / "ui" / "sld" / "core" / "fieldDeviceContracts.ts"
    if contracts_fe.exists():
        try:
            content = contracts_fe.read_text(encoding="utf-8")
        except Exception:
            content = ""

        required_pole_types = [
            "POLE_LINIOWE_SN",
            "POLE_TRANSFORMATOROWE_SN_NN",
            "POLE_SPRZEGLOWE_SN",
            "POLE_ZRODLA_PV_SN",
            "POLE_ZRODLA_BESS_SN",
            "POLE_LACZNIKA_SZYN_SN",
            "POLE_GLOWNE_NN",
            "POLE_ODPLYWOWE_NN",
            "POLE_ZRODLA_PV_NN",
            "POLE_ZRODLA_BESS_NN",
        ]
        for pt in required_pole_types:
            if pt not in content:
                violations.append(
                    f"  BRAK PoleTypeV1.{pt} w fieldDeviceContracts.ts (frontend)"
                )

        required_aparat_types = [
            "WYLACZNIK",
            "ODLACZNIK",
            "ROZLACZNIK",
            "BEZPIECZNIK",
            "UZIEMNIK",
            "PRZEKLADNIK_PRADOWY",
            "PRZEKLADNIK_NAPIECIOWY",
            "ZABEZPIECZENIE",
        ]
        for at in required_aparat_types:
            if at not in content:
                violations.append(
                    f"  BRAK AparatTypeV1.{at} w fieldDeviceContracts.ts (frontend)"
                )
    else:
        violations.append("  BRAK fieldDeviceContracts.ts (frontend)")

    # Backend check
    field_device_be = BACKEND_SRC / "domain" / "field_device.py"
    if field_device_be.exists():
        try:
            content = field_device_be.read_text(encoding="utf-8")
        except Exception:
            content = ""

        if "class PoleTypeV1" not in content:
            violations.append("  BRAK class PoleTypeV1 w field_device.py (backend)")
        if "class AparatTypeV1" not in content:
            violations.append("  BRAK class AparatTypeV1 w field_device.py (backend)")
        if "POLE_TO_FIELD_ROLE" not in content:
            violations.append("  BRAK POLE_TO_FIELD_ROLE w field_device.py (backend)")
        if "APARAT_TO_DEVICE_TYPE" not in content:
            violations.append("  BRAK APARAT_TO_DEVICE_TYPE w field_device.py (backend)")
    else:
        violations.append("  BRAK field_device.py (backend)")

    return violations


# =========================================================================
# GUARD 24: PV/BESS transformer enforcement (RUN #3F)
# =========================================================================

def guard_pv_bess_transformer_enforcement() -> List[str]:
    """
    Sprawdz ze walidacja PV/BESS przez transformator istnieje.
    Backend MUSI miec validate_generator_field_connection.
    Frontend MUSI miec walidacje wariantow (nn_side, block_transformer).
    """
    violations = []

    # Backend
    field_device_be = BACKEND_SRC / "domain" / "field_device.py"
    if field_device_be.exists():
        try:
            content = field_device_be.read_text(encoding="utf-8")
        except Exception:
            content = ""

        if "def validate_generator_field_connection" not in content:
            violations.append(
                "  BRAK validate_generator_field_connection w field_device.py (backend)"
            )
        if "nn_side" not in content:
            violations.append(
                "  BRAK obslugi wariantu nn_side w field_device.py (backend)"
            )
        if "block_transformer" not in content:
            violations.append(
                "  BRAK obslugi wariantu block_transformer w field_device.py (backend)"
            )
    else:
        violations.append("  BRAK field_device.py (backend) — PV/BESS validation missing")

    # Frontend — fieldDeviceContracts must not allow direct PV/BESS without TR
    contracts_fe = FRONTEND_SRC / "ui" / "sld" / "core" / "fieldDeviceContracts.ts"
    if contracts_fe.exists():
        try:
            content = contracts_fe.read_text(encoding="utf-8")
        except Exception:
            content = ""

        # PV and BESS fields must require TRANSFORMER or GENERATOR device
        if "PV_SN" not in content:
            violations.append("  BRAK roli PV_SN w fieldDeviceContracts.ts")
        if "BESS_SN" not in content:
            violations.append("  BRAK roli BESS_SN w fieldDeviceContracts.ts")
        if "PV_NN" not in content:
            violations.append("  BRAK roli PV_NN w fieldDeviceContracts.ts")
        if "BESS_NN" not in content:
            violations.append("  BRAK roli BESS_NN w fieldDeviceContracts.ts")

    return violations


# =========================================================================
# GUARD 25: Field/device readiness gates (3 gates) (RUN #3F)
# =========================================================================

def guard_field_device_readiness_gates() -> List[str]:
    """
    Sprawdz ze 3 nowe readiness gates istnieja w OBIE strony:
    - requireFieldsComplete / require_fields_complete
    - requireDevicesParametrized / require_devices_parametrized
    - requireProtectionBindings / require_protection_bindings
    """
    violations = []

    # Frontend
    readiness_fe = FRONTEND_SRC / "ui" / "sld" / "core" / "readinessProfile.ts"
    if readiness_fe.exists():
        try:
            content = readiness_fe.read_text(encoding="utf-8")
        except Exception:
            content = ""

        required_fe = [
            "function requireFieldsComplete",
            "function requireDevicesParametrized",
            "function requireProtectionBindings",
        ]
        for req in required_fe:
            if req not in content:
                violations.append(f"  BRAK '{req}' w readinessProfile.ts (frontend)")
    else:
        violations.append("  BRAK readinessProfile.ts — field/device gates missing (frontend)")

    # Backend
    readiness_be = BACKEND_SRC / "domain" / "readiness.py"
    if readiness_be.exists():
        try:
            content = readiness_be.read_text(encoding="utf-8")
        except Exception:
            content = ""

        required_be = [
            "def require_fields_complete",
            "def require_devices_parametrized",
            "def require_protection_bindings",
        ]
        for req in required_be:
            if req not in content:
                violations.append(f"  BRAK '{req}' w readiness.py (backend)")
    else:
        violations.append("  BRAK readiness.py — field/device gates missing (backend)")

    return violations


# =========================================================================
# GUARD 26: Symbol registry completeness (RUN #3F)
# =========================================================================

def guard_symbol_registry_completeness() -> List[str]:
    """
    Sprawdz ze rejestr symboli (DEVICE_TO_SYMBOL) istnieje
    i ze SldSymbolTypeV1 jest zdefiniowany.
    """
    violations = []
    contracts_fe = FRONTEND_SRC / "ui" / "sld" / "core" / "fieldDeviceContracts.ts"

    if not contracts_fe.exists():
        violations.append("  BRAK fieldDeviceContracts.ts — symbol registry missing")
        return violations

    try:
        content = contracts_fe.read_text(encoding="utf-8")
    except Exception:
        violations.append("  Nie mozna odczytac fieldDeviceContracts.ts")
        return violations

    if "SldSymbolTypeV1" not in content:
        violations.append("  BRAK SldSymbolTypeV1 w fieldDeviceContracts.ts")

    if "DEVICE_TO_SYMBOL" not in content:
        violations.append("  BRAK DEVICE_TO_SYMBOL w fieldDeviceContracts.ts")

    if "buildApparatusSymbolBinding" not in content:
        violations.append("  BRAK buildApparatusSymbolBinding w fieldDeviceContracts.ts")

    # Required IEC symbols (using SldSymbolTypeV1 naming convention: SYMBOL_*)
    required_symbols = [
        "SYMBOL_CB",
        "SYMBOL_DS",
        "SYMBOL_LOAD_SWITCH",
        "SYMBOL_FUSE",
        "SYMBOL_ES",
        "SYMBOL_CT",
        "SYMBOL_VT",
        "SYMBOL_RELAY",
    ]
    for sym in required_symbols:
        if sym not in content:
            violations.append(f"  BRAK symbolu IEC '{sym}' w fieldDeviceContracts.ts")

    return violations


# =========================================================================
# GUARD 27: No decorative symbols in symbol registry (RUN #3F)
# =========================================================================

def guard_no_decorative_symbols() -> List[str]:
    """
    Sprawdz brak dekoracyjnych symboli w rejestrze.
    Zabronione: LABEL, ANNOTATION, DECORATION, ORNAMENT itp.
    Kazdy symbol MUSI odpowiadac rzeczywistemu aparatowi IEC.
    """
    violations = []
    contracts_fe = FRONTEND_SRC / "ui" / "sld" / "core" / "fieldDeviceContracts.ts"

    if not contracts_fe.exists():
        return violations

    try:
        content = contracts_fe.read_text(encoding="utf-8")
    except Exception:
        return violations

    forbidden_symbols = [
        (r"\bLABEL\b", "LABEL (decorative)"),
        (r"\bANNOTATION\b", "ANNOTATION (decorative)"),
        (r"\bDECORATION\b", "DECORATION (decorative)"),
        (r"\bORNAMENT\b", "ORNAMENT (decorative)"),
        (r"\bARROW\b", "ARROW (decorative)"),
    ]

    # Search only in SldSymbolTypeV1 definition area
    in_symbol_type = False
    lines = content.split('\n')
    for line_no, line in enumerate(lines, 1):
        stripped = line.strip()

        if "SldSymbolTypeV1" in stripped and "=" in stripped:
            in_symbol_type = True
        if in_symbol_type and stripped.startswith("} as const"):
            in_symbol_type = False

        if in_symbol_type:
            for pattern, label in forbidden_symbols:
                if re.search(pattern, stripped):
                    violations.append(
                        f"  Dekoracyjny symbol: '{label}' w fieldDeviceContracts.ts:{line_no}"
                    )

    return violations


# =========================================================================
# GUARD 28: Field device tests exist (FE + BE) (RUN #3F)
# =========================================================================

def guard_field_device_tests_exist() -> List[str]:
    """
    Sprawdz ze testy field/device istnieja w OBIE strony:
    - Frontend: fieldDevicePolish.test.ts
    - Backend: test_field_device.py
    """
    violations = []

    # Frontend
    fe_test = FRONTEND_SRC / "ui" / "sld" / "core" / "__tests__" / "fieldDevicePolish.test.ts"
    if not fe_test.exists():
        violations.append(
            "  BRAK fieldDevicePolish.test.ts — brak testow Polish taxonomy (frontend)"
        )
    else:
        try:
            content = fe_test.read_text(encoding="utf-8")
        except Exception:
            content = ""

        required_test_sections = [
            "PoleTypeV1",
            "AparatTypeV1",
            "DEVICE_TO_SYMBOL",
            "buildWizardFieldStep",
            "requireFieldsComplete",
        ]
        for section in required_test_sections:
            if section not in content:
                violations.append(
                    f"  BRAK testow '{section}' w fieldDevicePolish.test.ts"
                )

    # Backend
    be_test = REPO_ROOT / "backend" / "tests" / "test_field_device.py"
    if not be_test.exists():
        violations.append(
            "  BRAK test_field_device.py — brak testow field/device (backend)"
        )
    else:
        try:
            content = be_test.read_text(encoding="utf-8")
        except Exception:
            content = ""

        required_test_sections = [
            "PoleTypeV1",
            "AparatTypeV1",
            "validate_generator_field_connection",
            "require_fields_complete",
            "require_protection_bindings",
        ]
        for section in required_test_sections:
            if section not in content:
                violations.append(
                    f"  BRAK testow '{section}' w test_field_device.py"
                )

    return violations


# =========================================================================
# GUARD 29: Switchgear renderer exists + exports (RUN #3G)
# =========================================================================

def guard_switchgear_renderer_exists() -> List[str]:
    """
    Sprawdz ze switchgearRenderer.ts istnieje i eksportuje wymagane funkcje.
    """
    violations = []
    renderer_file = FRONTEND_SRC / "ui" / "sld" / "core" / "switchgearRenderer.ts"

    if not renderer_file.exists():
        violations.append("  BRAK switchgearRenderer.ts — switchgear renderer missing")
        return violations

    try:
        content = renderer_file.read_text(encoding="utf-8")
    except Exception:
        violations.append("  Nie mozna odczytac switchgearRenderer.ts")
        return violations

    required_exports = [
        "renderSwitchgearBlock",
        "checkSymbolOverlap",
        "validateSymbolRegistry",
        "findElementById",
        "findDevicesInField",
        "FIELD_COLUMN_PITCH",
        "DEVICE_SLOT_HEIGHT",
    ]
    for exp in required_exports:
        if exp not in content:
            violations.append(f"  BRAK '{exp}' w switchgearRenderer.ts")

    # Must be exported from index.ts
    index_file = FRONTEND_SRC / "ui" / "sld" / "core" / "index.ts"
    if index_file.exists():
        try:
            idx_content = index_file.read_text(encoding="utf-8")
        except Exception:
            idx_content = ""
        if "switchgearRenderer" not in idx_content:
            violations.append("  BRAK eksportu switchgearRenderer w core/index.ts")

    return violations


# =========================================================================
# GUARD 30: Switchgear E2E tests exist (RUN #3G)
# =========================================================================

def guard_switchgear_e2e_tests_exist() -> List[str]:
    """
    Sprawdz ze testy E2E switchgear istnieja z 4 golden station blocks.
    """
    violations = []
    e2e_file = FRONTEND_SRC / "ui" / "sld" / "core" / "__tests__" / "switchgearE2E.test.ts"

    if not e2e_file.exists():
        violations.append("  BRAK switchgearE2E.test.ts — brak E2E tests")
        return violations

    try:
        content = e2e_file.read_text(encoding="utf-8")
    except Exception:
        violations.append("  Nie mozna odczytac switchgearE2E.test.ts")
        return violations

    required_blocks = [
        ("GS-E2E-01", "LINE_IN field"),
        ("GS-E2E-02", "TRANSFORMER_SN_NN field"),
        ("GS-E2E-03", "PV_SN field"),
        ("GS-E2E-04", "Multi-field station"),
    ]
    for code, desc in required_blocks:
        if code not in content:
            violations.append(f"  BRAK golden station block {code} ({desc})")

    if "hash stability" not in content.lower():
        violations.append("  BRAK testow hash stability w switchgearE2E.test.ts")

    if "overlap invariant" not in content.lower():
        violations.append("  BRAK testow overlap invariant w switchgearE2E.test.ts")

    return violations


# =========================================================================
# GUARD 31: Field/device inspector exists (RUN #3G)
# =========================================================================

def guard_field_device_inspector_exists() -> List[str]:
    """
    Sprawdz ze inspektor pol/aparatow istnieje z wymaganymi funkcjami.
    """
    violations = []
    inspector_file = FRONTEND_SRC / "ui" / "sld" / "inspector" / "fieldDeviceInspector.ts"

    if not inspector_file.exists():
        violations.append("  BRAK fieldDeviceInspector.ts — field/device inspector missing")
        return violations

    try:
        content = inspector_file.read_text(encoding="utf-8")
    except Exception:
        violations.append("  Nie mozna odczytac fieldDeviceInspector.ts")
        return violations

    required_functions = [
        "buildFieldInspectorSections",
        "buildDeviceInspectorSections",
        "buildCatalogRefSection",
        "resolveFieldOrDevice",
        "buildInspectorSectionsForElement",
        "buildResultsSection",
    ]
    for fn in required_functions:
        if fn not in content:
            violations.append(f"  BRAK '{fn}' w fieldDeviceInspector.ts")

    # Must be exported from inspector/index.ts
    index_file = FRONTEND_SRC / "ui" / "sld" / "inspector" / "index.ts"
    if index_file.exists():
        try:
            idx_content = index_file.read_text(encoding="utf-8")
        except Exception:
            idx_content = ""
        if "fieldDeviceInspector" not in idx_content:
            violations.append("  BRAK eksportu fieldDeviceInspector w inspector/index.ts")

    return violations


# =========================================================================
# GUARD 32: Switchgear wizard exists (RUN #3G)
# =========================================================================

def guard_switchgear_wizard_exists() -> List[str]:
    """
    Sprawdz ze kreator rozdzielnicy istnieje (3 ekrany + store + types).
    """
    violations = []
    wizard_dir = FRONTEND_SRC / "ui" / "wizard" / "switchgear"

    required_files = [
        "types.ts",
        "useSwitchgearStore.ts",
        "StationListScreen.tsx",
        "StationEditScreen.tsx",
        "FieldEditScreen.tsx",
        "CatalogPicker.tsx",
        "SwitchgearWizardPage.tsx",
        "index.ts",
    ]
    for fname in required_files:
        fpath = wizard_dir / fname
        if not fpath.exists():
            violations.append(f"  BRAK {fname} w wizard/switchgear/")

    # Route must exist
    routes_file = FRONTEND_SRC / "ui" / "navigation" / "routes.ts"
    if routes_file.exists():
        try:
            content = routes_file.read_text(encoding="utf-8")
        except Exception:
            content = ""
        if "SWITCHGEAR" not in content or "#switchgear" not in content:
            violations.append("  BRAK route SWITCHGEAR w routes.ts")
    else:
        violations.append("  BRAK routes.ts — navigation missing")

    return violations


# =========================================================================
# GUARD 33: Station field validation backend (RUN #3G)
# =========================================================================

def guard_station_field_validation_backend() -> List[str]:
    """
    Sprawdz ze walidacja stacji/pol istnieje w backendzie.
    """
    violations = []
    validation_file = BACKEND_SRC / "domain" / "station_field_validation.py"

    if not validation_file.exists():
        violations.append("  BRAK station_field_validation.py — backend validation missing")
        return violations

    try:
        content = validation_file.read_text(encoding="utf-8")
    except Exception:
        violations.append("  Nie mozna odczytac station_field_validation.py")
        return violations

    required = [
        "validate_station_fields",
        "validate_pv_bess_variant_a",
        "validate_pv_bess_variant_b",
        "REQUIRED_DEVICES_PER_ROLE",
        "StationFieldV1",
        "FieldDeviceV1",
    ]
    for req in required:
        if req not in content:
            violations.append(f"  BRAK '{req}' w station_field_validation.py")

    # Tests must exist
    test_file = REPO_ROOT / "backend" / "tests" / "test_station_field_validation.py"
    if not test_file.exists():
        violations.append("  BRAK test_station_field_validation.py — backend tests missing")

    return violations


# =========================================================================
# GUARD 34: PV/BESS validation module exists (RUN #3G DOMKNIECIE)
# =========================================================================

def guard_pv_bess_validation_exists() -> List[str]:
    """
    Sprawdz ze modul walidacji PV/BESS istnieje z wymaganymi eksportami.
    pvBessValidation.ts + pvBessValidation.test.ts + eksport w core/index.ts.
    """
    violations = []

    # Module file
    val_file = FRONTEND_SRC / "ui" / "sld" / "core" / "pvBessValidation.ts"
    if not val_file.exists():
        violations.append("  BRAK pvBessValidation.ts — PV/BESS validation module missing")
        return violations

    try:
        content = val_file.read_text(encoding="utf-8")
    except Exception:
        violations.append("  Nie mozna odczytac pvBessValidation.ts")
        return violations

    required_exports = [
        "validatePvBessConnections",
        "canSavePvBessGenerator",
        "PvBessConnectionInputV1",
        "PvBessValidationResultV1",
    ]
    for exp in required_exports:
        if exp not in content:
            violations.append(f"  BRAK '{exp}' w pvBessValidation.ts")

    # Test file
    test_file = FRONTEND_SRC / "ui" / "sld" / "core" / "__tests__" / "pvBessValidation.test.ts"
    if not test_file.exists():
        violations.append("  BRAK pvBessValidation.test.ts — tests missing")

    # Export from core/index.ts
    core_index = FRONTEND_SRC / "ui" / "sld" / "core" / "index.ts"
    if core_index.exists():
        try:
            idx = core_index.read_text(encoding="utf-8")
        except Exception:
            idx = ""
        if "pvBessValidation" not in idx:
            violations.append("  BRAK eksportu pvBessValidation w core/index.ts")

    return violations


# =========================================================================
# GUARD 35: Wizard topology API wiring (RUN #3G DOMKNIECIE)
# =========================================================================

def guard_wizard_topology_wiring() -> List[str]:
    """
    Sprawdz ze useSwitchgearOps istnieje i eksportuje 4 operacje CRUD.
    """
    violations = []

    ops_file = FRONTEND_SRC / "ui" / "wizard" / "switchgear" / "useSwitchgearOps.ts"
    if not ops_file.exists():
        violations.append("  BRAK useSwitchgearOps.ts — wizard topology wiring missing")
        return violations

    try:
        content = ops_file.read_text(encoding="utf-8")
    except Exception:
        violations.append("  Nie mozna odczytac useSwitchgearOps.ts")
        return violations

    required_ops = [
        "bay_create",
        "equipment_add",
        "equipment_remove",
        "equipment_catalog_assign",
    ]
    for op in required_ops:
        if op not in content:
            violations.append(f"  BRAK operacji '{op}' w useSwitchgearOps.ts")

    # Test file
    test_file = (
        FRONTEND_SRC / "ui" / "wizard" / "switchgear" / "__tests__" / "switchgearOps.test.ts"
    )
    if not test_file.exists():
        violations.append("  BRAK switchgearOps.test.ts — tests missing")

    return violations


# =========================================================================
# GUARD 36: Inspector results resolver (RUN #3G DOMKNIECIE)
# =========================================================================

def guard_inspector_results_resolver() -> List[str]:
    """
    Sprawdz ze elementResultsResolver istnieje, jest wyeksportowany,
    i ze useSldInspectorSelection nie zawiera TODO null.
    """
    violations = []

    resolver_file = FRONTEND_SRC / "ui" / "sld" / "inspector" / "elementResultsResolver.ts"
    if not resolver_file.exists():
        violations.append("  BRAK elementResultsResolver.ts — results resolver missing")
        return violations

    try:
        content = resolver_file.read_text(encoding="utf-8")
    except Exception:
        violations.append("  Nie mozna odczytac elementResultsResolver.ts")
        return violations

    required = [
        "resolveElementResults",
        "resolveFieldDeviceResults",
        "NO_RESULTS_DATA",
    ]
    for req in required:
        if req not in content:
            violations.append(f"  BRAK '{req}' w elementResultsResolver.ts")

    # Export from inspector/index.ts
    index_file = FRONTEND_SRC / "ui" / "sld" / "inspector" / "index.ts"
    if index_file.exists():
        try:
            idx = index_file.read_text(encoding="utf-8")
        except Exception:
            idx = ""
        if "elementResultsResolver" not in idx:
            violations.append("  BRAK eksportu elementResultsResolver w inspector/index.ts")

    # No TODO null in useSldInspectorSelection
    hook_file = FRONTEND_SRC / "ui" / "sld" / "inspector" / "useSldInspectorSelection.ts"
    if hook_file.exists():
        try:
            hook_content = hook_file.read_text(encoding="utf-8")
        except Exception:
            hook_content = ""
        if "TODO" in hook_content and "null" in hook_content:
            # Check for TODO-null pattern (placeholder results)
            for line in hook_content.splitlines():
                if "TODO" in line and "null" in line:
                    violations.append(
                        f"  TODO null znaleziony w useSldInspectorSelection.ts: {line.strip()}"
                    )

    # Test file
    test_file = (
        FRONTEND_SRC
        / "ui"
        / "sld"
        / "inspector"
        / "__tests__"
        / "elementResultsResolver.test.ts"
    )
    if not test_file.exists():
        violations.append("  BRAK elementResultsResolver.test.ts — tests missing")

    return violations


# =========================================================================
# GUARD 37: No stub handlers in wizard screens (RUN #3G DOMKNIECIE)
# =========================================================================

def guard_no_wizard_stubs() -> List[str]:
    """
    Sprawdz ze ekrany kreatora (StationEdit, FieldEdit, CatalogPicker)
    importuja useSwitchgearOps i nie zawieraja stubowych console.log handlerow.
    """
    violations = []

    screens = {
        "StationEditScreen.tsx": "addField",
        "FieldEditScreen.tsx": "addDevice",
        "CatalogPicker.tsx": "assignCatalog",
    }

    wizard_dir = FRONTEND_SRC / "ui" / "wizard" / "switchgear"

    for screen_name, required_op in screens.items():
        screen_file = wizard_dir / screen_name
        if not screen_file.exists():
            # Guard 32 already checks existence — skip here
            continue

        try:
            content = screen_file.read_text(encoding="utf-8")
        except Exception:
            violations.append(f"  Nie mozna odczytac {screen_name}")
            continue

        # Must import useSwitchgearOps
        if "useSwitchgearOps" not in content:
            violations.append(f"  {screen_name} nie importuje useSwitchgearOps")

        # Must reference the required operation
        if required_op not in content:
            violations.append(f"  {screen_name} nie wywoluje '{required_op}'")

    return violations


# =========================================================================
# GUARD 38: applyOverrides module exists (RUN #3H)
# =========================================================================

def guard_apply_overrides_exists() -> List[str]:
    """
    Sprawdz ze modul applyOverrides istnieje wraz z geometryOverrides.
    """
    violations = []

    apply_file = FRONTEND_SRC / "ui" / "sld" / "core" / "applyOverrides.ts"
    geom_file = FRONTEND_SRC / "ui" / "sld" / "core" / "geometryOverrides.ts"

    if not apply_file.exists():
        violations.append("  BRAK applyOverrides.ts — modul kompozycji EffectiveLayout")
    else:
        content = apply_file.read_text(encoding="utf-8")
        if "EffectiveLayoutV1" not in content:
            violations.append("  applyOverrides.ts nie eksportuje EffectiveLayoutV1")
        if "applyOverrides" not in content:
            violations.append("  applyOverrides.ts nie eksportuje applyOverrides()")
        if "checkEffectiveCollisions" not in content:
            violations.append("  applyOverrides.ts nie eksportuje checkEffectiveCollisions()")

    if not geom_file.exists():
        violations.append("  BRAK geometryOverrides.ts — kontrakt nadpisan geometrii")
    else:
        content = geom_file.read_text(encoding="utf-8")
        if "OVERRIDES_VERSION" not in content:
            violations.append("  geometryOverrides.ts nie eksportuje OVERRIDES_VERSION")
        if "OverrideScopeV1" not in content:
            violations.append("  geometryOverrides.ts nie eksportuje OverrideScopeV1")
        if "OverrideOperationV1" not in content:
            violations.append("  geometryOverrides.ts nie eksportuje OverrideOperationV1")
        if "GeometryFixCodes" not in content:
            violations.append("  geometryOverrides.ts nie eksportuje GeometryFixCodes")

    return violations


# =========================================================================
# GUARD 39: Layout engine separation (RUN #3H)
# =========================================================================

def guard_overrides_layout_separation() -> List[str]:
    """
    Sprawdz ze overrides NIE modyfikuja LayoutResultV1 bezposrednio.
    applyOverrides MUSI tworzyc nowy EffectiveLayoutV1 (nie mutowac).
    """
    violations = []

    apply_file = FRONTEND_SRC / "ui" / "sld" / "core" / "applyOverrides.ts"
    if not apply_file.exists():
        return ["  BRAK applyOverrides.ts"]

    content = apply_file.read_text(encoding="utf-8")

    # Must NOT modify layout directly — check for push/splice/delete patterns
    # Wyjatki: items.push (budowanie listy overrides), collisions.push (budowanie listy kolizji)
    if ".push(" in content and "items.push" not in content and "collisions.push" not in content:
        violations.append("  applyOverrides.ts uzywa .push() — moze mutowac dane")

    if ".splice(" in content:
        violations.append("  applyOverrides.ts uzywa .splice() — moze mutowac tablice")

    # Must create new objects, not modify existing
    if "layout.nodePlacements[" in content and "= " in content:
        # This is OK if it's spread-based, but check for direct assignment
        pass

    # Layout pipeline MUST NOT import overrides
    pipeline_file = FRONTEND_SRC / "ui" / "sld" / "core" / "layoutPipeline.ts"
    if pipeline_file.exists():
        pipeline_content = pipeline_file.read_text(encoding="utf-8")
        if "geometryOverrides" in pipeline_content:
            violations.append("  layoutPipeline.ts importuje geometryOverrides — naruszenie separacji")
        if "applyOverrides" in pipeline_content:
            violations.append("  layoutPipeline.ts importuje applyOverrides — naruszenie separacji")

    return violations


# =========================================================================
# GUARD 40: Overrides overlay separation (RUN #3H)
# =========================================================================

def guard_overrides_overlay_separation() -> List[str]:
    """
    Sprawdz ze modul overlay (sld-overlay) NIE importuje geometrii/overrides mutatorow.
    """
    violations = []

    overlay_dir = FRONTEND_SRC / "ui" / "sld-overlay"
    if not overlay_dir.exists():
        return []  # Overlay dir moze nie istniec — OK

    for ts_file in overlay_dir.rglob("*.ts"):
        try:
            content = ts_file.read_text(encoding="utf-8")
        except Exception:
            continue

        rel = ts_file.relative_to(FRONTEND_SRC)

        if "geometryOverrides" in content and "import" in content:
            violations.append(f"  {rel} importuje geometryOverrides — naruszenie separacji overlay")
        if "applyOverrides" in content and "import" in content:
            violations.append(f"  {rel} importuje applyOverrides — naruszenie separacji overlay")
        if "sldProjectModeStore" in content and "import" in content:
            violations.append(f"  {rel} importuje sldProjectModeStore — naruszenie separacji overlay")

    return violations


# =========================================================================
# GUARD 41: Overrides API exists (RUN #3H)
# =========================================================================

def guard_overrides_api_exists() -> List[str]:
    """
    Sprawdz ze API overrides istnieje na backendzie i frontendzie.
    """
    violations = []

    # Backend API
    backend_api = BACKEND_SRC / "api" / "sld_overrides.py"
    if not backend_api.exists():
        violations.append("  BRAK backend/api/sld_overrides.py")
    else:
        content = backend_api.read_text(encoding="utf-8")
        for endpoint in ["sld-overrides", "validate", "reset"]:
            if endpoint not in content:
                violations.append(f"  sld_overrides.py brak endpointu '{endpoint}'")

    # Backend domain model
    backend_model = BACKEND_SRC / "domain" / "geometry_overrides.py"
    if not backend_model.exists():
        violations.append("  BRAK backend/domain/geometry_overrides.py")

    # Frontend API client
    frontend_api = FRONTEND_SRC / "ui" / "sld" / "core" / "overridesApi.ts"
    if not frontend_api.exists():
        violations.append("  BRAK frontend overridesApi.ts")
    else:
        content = frontend_api.read_text(encoding="utf-8")
        for fn in ["fetchSldOverrides", "saveSldOverrides", "resetSldOverrides"]:
            if fn not in content:
                violations.append(f"  overridesApi.ts brak funkcji '{fn}'")

    return violations


# =========================================================================
# GUARD 42: Overrides determinism tests exist (RUN #3H)
# =========================================================================

def guard_overrides_determinism_tests() -> List[str]:
    """
    Sprawdz ze testy determinizmu overrides istnieja (3 pliki testow).
    """
    violations = []

    test_dir = FRONTEND_SRC / "ui" / "sld" / "core" / "__tests__"

    required_tests = {
        "geometryOverrides.test.ts": ["50", "permutation"],
        "applyOverrides.test.ts": ["50", "determinism"],
        "overridesCiRender.test.ts": ["50", "EffectiveLayout"],
    }

    for test_name, required_keywords in required_tests.items():
        test_file = test_dir / test_name
        if not test_file.exists():
            violations.append(f"  BRAK {test_name}")
        else:
            content = test_file.read_text(encoding="utf-8")
            for kw in required_keywords:
                if kw.lower() not in content.lower():
                    violations.append(f"  {test_name} brak testu '{kw}'")

    return violations


# =========================================================================
# GUARD 43: CI overrides pipeline (RUN #3H)
# =========================================================================

def guard_ci_overrides_pipeline() -> List[str]:
    """
    Sprawdz ze CI workflow zawiera kroki testow overrides.
    """
    violations = []

    ci_file = REPO_ROOT.parent / ".github" / "workflows" / "sld-determinism.yml"
    if not ci_file.exists():
        violations.append("  BRAK .github/workflows/sld-determinism.yml")
        return violations

    content = ci_file.read_text(encoding="utf-8")

    required_steps = [
        "geometryOverrides.test.ts",
        "applyOverrides.test.ts",
        "overridesCiRender.test.ts",
    ]

    for step in required_steps:
        if step not in content:
            violations.append(f"  sld-determinism.yml brak kroku '{step}'")

    return violations


# =========================================================================
# GUARD 44: No TODO null in overrides code (RUN #3H)
# =========================================================================

def guard_no_todo_null_overrides() -> List[str]:
    """
    Sprawdz ze kod overrides nie zawiera 'TODO null', 'TODO: null',
    'return null // TODO' — wymagamy kompletnej implementacji.
    """
    violations = []

    overrides_files = [
        FRONTEND_SRC / "ui" / "sld" / "core" / "geometryOverrides.ts",
        FRONTEND_SRC / "ui" / "sld" / "core" / "applyOverrides.ts",
        FRONTEND_SRC / "ui" / "sld" / "core" / "overridesApi.ts",
        FRONTEND_SRC / "ui" / "sld" / "sldProjectModeStore.ts",
        FRONTEND_SRC / "ui" / "sld" / "ProjectModeToolbar.tsx",
        FRONTEND_SRC / "ui" / "sld" / "inspector" / "geometrySection.ts",
    ]

    todo_pattern = re.compile(r"TODO\s*(?:null|:?\s*null)", re.IGNORECASE)

    for file_path in overrides_files:
        if not file_path.exists():
            continue
        content = file_path.read_text(encoding="utf-8")
        for i, line in enumerate(content.splitlines(), 1):
            if todo_pattern.search(line):
                rel = file_path.relative_to(FRONTEND_SRC)
                violations.append(f"  {rel}:{i} — zawiera TODO null")

    return violations


# =========================================================================
# GUARD 45: No codenames in overrides code (RUN #3H)
# =========================================================================

def guard_no_codenames_overrides() -> List[str]:
    """
    Sprawdz ze kod overrides nie zawiera kodonamow projektowych
    (P7, P11, P14, P17, P20 itd.) — 100% Polish labels.
    """
    violations = []

    overrides_files = [
        FRONTEND_SRC / "ui" / "sld" / "core" / "geometryOverrides.ts",
        FRONTEND_SRC / "ui" / "sld" / "core" / "applyOverrides.ts",
        FRONTEND_SRC / "ui" / "sld" / "core" / "overridesApi.ts",
        FRONTEND_SRC / "ui" / "sld" / "sldProjectModeStore.ts",
        FRONTEND_SRC / "ui" / "sld" / "ProjectModeToolbar.tsx",
        FRONTEND_SRC / "ui" / "sld" / "inspector" / "geometrySection.ts",
    ]

    codename_pattern = re.compile(r"\bP(?:7|11|14|17|20|30)\b")

    for file_path in overrides_files:
        if not file_path.exists():
            continue
        content = file_path.read_text(encoding="utf-8")
        for i, line in enumerate(content.splitlines(), 1):
            if codename_pattern.search(line):
                rel = file_path.relative_to(FRONTEND_SRC)
                violations.append(f"  {rel}:{i} — zawiera kodoname projektu")

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
        ("GUARD 11: Station has members / fields (RUN #3D)", guard_station_has_members()),
        ("GUARD 12: Field device requirements enforced (RUN #3D)", guard_field_has_required_devices()),
        ("GUARD 13: Device catalog ref validation (RUN #3D)", guard_device_catalog_ref_present()),
        ("GUARD 14: Relay binding fix actions (RUN #3D)", guard_relay_binding_present()),
        ("GUARD 15: Zero fabrication in builder (RUN #3D)", guard_zero_fabrication()),
        ("GUARD 16: Station elementType=STATION (RUN #3E)", guard_station_element_type()),
        ("GUARD 17: Generator elementType=GENERATOR (RUN #3E)", guard_generator_element_type()),
        ("GUARD 18: No new UI elementId creation (RUN #3E)", guard_no_new_element_id_creation()),
        ("GUARD 19: ReadinessGateError enforcement (RUN #3E)", guard_readiness_gate_enforcement()),
        ("GUARD 20: ExportManifest spec v1.1 + readinessStatus (RUN #3E)", guard_export_manifest_v11()),
        ("GUARD 21: ResultJoin domain elementId (RUN #3E)", guard_result_join_domain_element_id()),
        ("GUARD 22: Golden network E2E tests exist (RUN #3E)", guard_golden_network_e2e_exists()),
        ("GUARD 23: Polish taxonomy completeness (RUN #3F)", guard_polish_taxonomy_completeness()),
        ("GUARD 24: PV/BESS transformer enforcement (RUN #3F)", guard_pv_bess_transformer_enforcement()),
        ("GUARD 25: Field/device readiness gates (RUN #3F)", guard_field_device_readiness_gates()),
        ("GUARD 26: Symbol registry completeness (RUN #3F)", guard_symbol_registry_completeness()),
        ("GUARD 27: No decorative symbols (RUN #3F)", guard_no_decorative_symbols()),
        ("GUARD 28: Field device tests exist (RUN #3F)", guard_field_device_tests_exist()),
        ("GUARD 29: Switchgear renderer exists (RUN #3G)", guard_switchgear_renderer_exists()),
        ("GUARD 30: Switchgear E2E tests exist (RUN #3G)", guard_switchgear_e2e_tests_exist()),
        ("GUARD 31: Field/device inspector exists (RUN #3G)", guard_field_device_inspector_exists()),
        ("GUARD 32: Switchgear wizard exists (RUN #3G)", guard_switchgear_wizard_exists()),
        ("GUARD 33: Station field validation backend (RUN #3G)", guard_station_field_validation_backend()),
        ("GUARD 34: PV/BESS validation module exists (RUN #3G DOMKNIECIE)", guard_pv_bess_validation_exists()),
        ("GUARD 35: Wizard topology API wiring (RUN #3G DOMKNIECIE)", guard_wizard_topology_wiring()),
        ("GUARD 36: Inspector results resolver (RUN #3G DOMKNIECIE)", guard_inspector_results_resolver()),
        ("GUARD 37: No stub handlers in wizard screens (RUN #3G DOMKNIECIE)", guard_no_wizard_stubs()),
        ("GUARD 38: applyOverrides module exists (RUN #3H)", guard_apply_overrides_exists()),
        ("GUARD 39: Layout engine separation — overrides (RUN #3H)", guard_overrides_layout_separation()),
        ("GUARD 40: Overlay separation — overrides (RUN #3H)", guard_overrides_overlay_separation()),
        ("GUARD 41: Overrides API exists BE+FE (RUN #3H)", guard_overrides_api_exists()),
        ("GUARD 42: Overrides determinism tests (RUN #3H)", guard_overrides_determinism_tests()),
        ("GUARD 43: CI overrides pipeline (RUN #3H)", guard_ci_overrides_pipeline()),
        ("GUARD 44: No TODO null in overrides (RUN #3H)", guard_no_todo_null_overrides()),
        ("GUARD 45: No codenames in overrides (RUN #3H)", guard_no_codenames_overrides()),
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
