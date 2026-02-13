# SLD Test Matrix

**Status:** KANONICZNY | **Wersja:** 1.1 | **Data:** 2026-02-13
**Kontekst:** RUN #3A PR-3A-03 + RUN #3C (topology hardening) — Macierz testow SLD jako CI gate

---

## 1. Testy kontraktu VisualGraphV1

| ID | Test | Plik | Gate |
|----|------|------|------|
| VG-01 | Sortowanie kanoniczne nodes po id | `core/__tests__/visualGraph.test.ts` | CI |
| VG-02 | Sortowanie kanoniczne edges po id | j.w. | CI |
| VG-03 | Canonicalize niezalezne od kolejnosci wejscia | j.w. | CI |
| VG-04 | Typologia stacji A/B/C/D — porty IN/OUT/BRANCH | j.w. | CI |
| VG-05 | Enum NodeTypeV1 — 4 typy stacji | j.w. | CI |
| VG-06 | PV → GENERATOR_PV | j.w. | CI |
| VG-07 | BESS → GENERATOR_BESS | j.w. | CI |
| VG-08 | Zaden PV/BESS nie jest LOAD | j.w. | CI |
| VG-09 | Walidator odrzuca PV-jako-LOAD | j.w. | CI |
| VG-10 | EdgeTypeV1 — SECONDARY_CONNECTOR istnieje | j.w. | CI |
| VG-11 | NOP switch → isNormallyOpen=true | j.w. | CI |
| VG-12 | Brak PCC w NodeTypeV1/EdgeTypeV1/PortRoleV1 | j.w. | CI |
| VG-13 | Brak PCC w labelach konwertowanego grafu | j.w. | CI |
| VG-14 | Hash stability (ten sam input = ten sam hash) | j.w. | CI |
| VG-15 | Permutation invariance (reverse input = ten sam hash) | j.w. | CI |
| VG-16 | Hash jest 8-znakowy hex | j.w. | CI |
| VG-17 | Walidacja: poprawny graf przechodzi | j.w. | CI |
| VG-18 | Walidacja: duplikat id wykrywany | j.w. | CI |
| VG-19 | Walidacja: bledna wersja wykrywana | j.w. | CI |
| VG-20 | Wersja kontraktu = V1 | j.w. | CI |

## 2. Testy adaptera TopologyAdapterV1 (legacy, deleguje do V2)

| ID | Test | Plik | Gate |
|----|------|------|------|
| TA-01 | Kazdy symbol → wezel | `core/__tests__/visualGraph.test.ts` | CI |
| TA-02 | Transformer → TRANSFORMER_LINK edge | j.w. | CI |
| TA-03 | Szyna SN → BUS_SN | j.w. | CI |
| TA-04 | Szyna nN → BUS_NN | j.w. | CI |
| TA-05 | GPZ → GRID_SOURCE | j.w. | CI |
| TA-06 | Load → LOAD | j.w. | CI |
| TA-07 | Switch → SWITCH_* | j.w. | CI |
| TA-08 | Meta.version = V1 | j.w. | CI |
| TA-09 | Atrybuty kompletne (brak undefined) | j.w. | CI |

## 2b. Testy TopologyAdapterV2 — domain-driven (RUN #3C)

| ID | Test | Plik | Gate |
|----|------|------|------|
| TV2-01 | GN-DOM-01 (radial 3 stacje): brak self-edges | `core/__tests__/topologyAdapterV2.test.ts` | CI |
| TV2-02 | GN-DOM-02 (ring+NOP): brak self-edges | j.w. | CI |
| TV2-03 | GN-DOM-03 (OZE PV+BESS): brak self-edges | j.w. | CI |
| TV2-04 | GN-DOM-04 (TYPE_D sekcyjna): brak self-edges | j.w. | CI |
| TV2-05 | GN-DOM-05 (self-edge w danych): FixAction, nie w grafie | j.w. | CI |
| TV2-06 | GN-DOM-06 (multi-source): brak self-edges | j.w. | CI |
| TV2-07 | GN-DOM-07 (brak catalog): FixAction | j.w. | CI |
| TV2-08 | Bridge migration: AnySldSymbol → VisualGraphV1 | j.w. | CI |
| TV2-09 | Station TYPE_D: busCount >= 2 | j.w. | CI |
| TV2-10 | Station TYPE_B: DISTRIBUTION z transformerIds | j.w. | CI |
| TV2-11 | Segmentacja: NOP → SECONDARY_CONNECTOR | j.w. | CI |
| TV2-12 | Segmentacja: trunk istnieje w radial | j.w. | CI |
| TV2-13 | Segmentacja: bus coupler z BUS_LINK w stacji | j.w. | CI |
| TV2-14 | PV z GeneratorKind.PV → GENERATOR_PV | j.w. | CI |
| TV2-15 | BESS z GeneratorKind.BESS → GENERATOR_BESS | j.w. | CI |
| TV2-16 | PV z SymbolBridgeMetadata (bridge) | j.w. | CI |
| TV2-17 | Hash stability 100x (6 golden networks) | j.w. | CI |
| TV2-18 | Permutation invariance 50x (4 golden networks) | j.w. | CI |
| TV2-19 | Multi-source tie-break deterministyczny | j.w. | CI |
| TV2-20 | Stress test 500+ nodes: stability + no self-edges | j.w. | CI |

## 3. Testy determinizmu

| ID | Test | Plik | Gate |
|----|------|------|------|
| DET-01 | GN-SLD-01: 100x → identyczny hash | `core/__tests__/determinism.test.ts` | CI |
| DET-02 | GN-SLD-02: 100x → identyczny hash | j.w. | CI |
| DET-03 | GN-OZE-01: 100x → identyczny hash | j.w. | CI |
| DET-04 | GN-OZE-02: 100x → identyczny hash | j.w. | CI |
| DET-05 | GN-OZE-03: 100x → identyczny hash | j.w. | CI |
| DET-06 | GN-SLD-01: 50 permutacji → identyczny hash | j.w. | CI |
| DET-07 | GN-SLD-02: 50 permutacji → identyczny hash | j.w. | CI |
| DET-08 | GN-OZE-03: 50 permutacji → identyczny hash | j.w. | CI |
| DET-09 | GN-SLD-01: walidacja przechodzi | j.w. | CI |
| DET-10 | GN-SLD-02: walidacja przechodzi | j.w. | CI |
| DET-11 | GN-OZE-01: PV jest GENERATOR_PV | j.w. | CI |
| DET-12 | GN-OZE-02: BESS jest GENERATOR_BESS | j.w. | CI |
| DET-13 | GN-OZE-03: PV i BESS sa zrodlami | j.w. | CI |
| DET-14 | GN-SLD-01: unikalne node IDs | j.w. | CI |
| DET-15 | GN-SLD-01: unikalne edge IDs | j.w. | CI |
| DET-16 | GN-SLD-02: NOP isNormallyOpen | j.w. | CI |
| DET-17 | GN-SLD-01: statystyki (53 symboli) | j.w. | CI |
| DET-18 | GN-STRESS-500: 500+ wezlow — hash stability 10x | j.w. | CI |
| DET-19 | GN-STRESS-500: permutation invariance 5x | j.w. | CI |

## 4. Guard scripts

| ID | Guard | Plik | Gate |
|----|-------|------|------|
| GRD-01 | Single layout engine | `scripts/sld_determinism_guards.py` | CI |
| GRD-02 | No layout feature flags | j.w. | CI |
| GRD-03 | Overlay no layout imports | j.w. | CI |
| GRD-04 | PCC grep-zero | j.w. | CI |
| GRD-05 | No codenames in contract | j.w. | CI |
| GRD-06 | No Date.now() in SLD core | j.w. | CI |
| GRD-07 | No Math.random() in SLD core | j.w. | CI |
| GRD-08 | No self-edges in adapter (RUN #3C) | j.w. | CI |
| GRD-09 | No string typology heuristics (RUN #3C) | j.w. | CI |
| GRD-10 | No legacy adapter patterns (RUN #3C) | j.w. | CI |

## 5. Golden Networks

### 5.1 VisualGraph (RUN #3A)

| ID | Siec | Symbole | Cel |
|----|------|---------|-----|
| GN-SLD-01 | GPZ + magistrala + 10 stacji A | 53 | Radial, determinism, hash |
| GN-SLD-02 | GPZ + 2 sekcje + 4 stacje B + ring | 13 | NOP, secondary connectors, ring |
| GN-OZE-01 | PV na SN | 4 | OZE klasyfikacja |
| GN-OZE-02 | BESS na SN | 3 | OZE klasyfikacja |
| GN-OZE-03 | PV + BESS wielofunkcyjna | 5 | Stacja wielofunkcyjna |
| GN-STRESS-500 | 100 feederow | 500+ | Perf, stress, determinism |

### 5.2 TopologyAdapterV2 Domain Networks (RUN #3C)

| ID | Siec | Nodes | Cel |
|----|------|-------|-----|
| GN-DOM-01 | Radial: GPZ + 3 stacje | 8 | Radial, segmentacja, station types |
| GN-DOM-02 | Ring+NOP: 3 szyny + ring | 5 | NOP → SECONDARY_CONNECTOR, ring detection |
| GN-DOM-03 | OZE: PV + BESS | 6 | GeneratorKind → NodeType, zero heurystyk |
| GN-DOM-04 | TYPE_D: 2 szyny sekcyjne | 4 | Station TYPE_D, bus coupler |
| GN-DOM-05 | Self-edge w danych | 3 | FixAction emitted, edge filtered |
| GN-DOM-06 | Multi-source: 2 GPZ | 5 | Tie-break deterministyczny |
| GN-DOM-07 | Brak catalog ref | 3 | FixAction catalog.reference_missing |
