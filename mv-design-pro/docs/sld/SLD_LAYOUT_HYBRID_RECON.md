# SLD LAYOUT HYBRID RECON — ABB + PowerFactory

**Status**: BINDING
**Data**: 2026-02-24
**Zakres**: Mapa istniejącej ścieżki renderowania SLD, analiza dwóch pipeline'ów, decyzja architektoniczna

---

## 1. DWA KONKURUJĄCE PIPELINE'Y

### Pipeline A: `engine/sld-layout/` (5-fazowy, Sugiyama)

| Cecha | Wartość |
|-------|---------|
| Lokalizacja | `frontend/src/engine/sld-layout/` |
| Fazy | 1. Voltage bands → 2. Bay detection → 3. Crossing min → 4. Coordinates → 5. Edge routing + labels |
| Wejście | `LayoutSymbol[]` (płaska tablica symboli z voltageKV) |
| Wyjście | `LayoutResult` (Map-based: positions, busbarGeometries, routedEdges, labelPositions) |
| Podejście | Generyczny Sugiyama — pasma napięciowe, bay detection, barycenter crossing minimization |
| Pliki | 11 core + 7 testów (~326 KB) |
| Konfiguracja | `DEFAULT_LAYOUT_CONFIG` (bayGap=160) + `INDUSTRIAL_LAYOUT_CONFIG` (bayGap=280) |
| Testy | determinism.test.ts, voltage-bands.test.ts, stationGeometry.test.ts, 4 integracyjne |

**Zalety**: Dobra infrastruktura bay detection, crossing minimization, obsługa sub-busbarów.
**Wady**: Generyczny — nie rozumie topologii SN (trunk/branch/ring). Nie produkuje LayoutResultV1 z hash.

### Pipeline B: `ui/sld/core/layoutPipeline.ts` (7-fazowy, ABB/PF vertical SN)

| Cecha | Wartość |
|-------|---------|
| Lokalizacja | `frontend/src/ui/sld/core/layoutPipeline.ts` |
| Fazy | 1. Place GPZ+fields → 2. Build trunk topology → 3. Place stations+branches → 4. Route edges → 5. Labels → 6. Invariants+hash → 7. Canonical annotations |
| Wejście | `VisualGraphV1` (typowany kontrakt z PortRefV1, EdgeTypeV1) |
| Wyjście | `LayoutResultV1` (z hash SHA, switchgear blocks, canonical annotations) |
| Podejście | Domenowo-specyficzny — GPZ u góry, pionowe magistrale, L-shape branches, stacje jako "drop" |
| Pliki | 1 core (1685 linii) + ~25 testów |
| Konfiguracja | `IndustrialAesthetics.ts` (GRID_BASE=20, Y_GPZ=60, PITCH_FIELD_X=280, TRUNK_STEP_Y=100) |
| Testy | layoutPipeline.test.ts, goldenNetworkE2E.test.ts, industrialAestheticsLayout.test.ts, 20+ więcej |

**Zalety**: Rozumie topologię SN (trunk BFS, feeder fields, ring/NOP routing). Produkuje LayoutResultV1 z hash deterministycznym. Styl ABB/PF.
**Wady**: Monolityczny (1 plik). Brak crossing minimization. Brak bay classification.

---

## 2. STAŁE GEOMETRYCZNE (IndustrialAesthetics.ts)

| Stała | Wartość | Opis |
|-------|---------|------|
| `GRID_BASE` | 20 px | Jednostka siatki (wszystko wielokrotności) |
| `Y_GPZ` | 60 px | Y szyny GPZ |
| `Y_MAIN` | 400 px | Y magistrali głównej SN |
| `Y_RING` | 320 px | Y kanału ringowego |
| `Y_BRANCH` | 480 px | Y odgałęzień |
| `GRID_SPACING_MAIN` | 280 px | Odległość centrum-centrum stacji |
| `X_START` | 40 px | Offset startowy X |
| `PITCH_FIELD_X` | 280 px | Pitch pól GPZ |
| `TRUNK_STEP_Y` | 100 px | Krok pionowy trunk |
| `BRANCH_OFFSET_X` | 140 px | Offset boczny odgałęzienia |
| `SECONDARY_CHANNEL_OFFSET_X` | 80 px | Offset kanału ring/NOP |
| `STATION_BLOCK_HEIGHT` | 160 px | Wysokość bloku stacji |
| `STATION_BLOCK_WIDTH` | 120 px | Szerokość bloku stacji |
| `OFFSET_POLE` | 60 px | Odstęp pól w stacji |

Walidacja: `verifyAestheticContract()` — 14 sprawdzeń.

---

## 3. KONTRAKTY TYPÓW

### Wejście: `VisualGraphV1` (BINDING)
- Lokalizacja: `ui/sld/core/visualGraph.ts`
- `nodes: VisualNodeV1[]` — 19 typów (NodeTypeV1)
- `edges: VisualEdgeV1[]` — 6 typów krawędzi (EdgeTypeV1: TRUNK, BRANCH, SECONDARY_CONNECTOR, BUS_COUPLER, TRANSFORMER_LINK, INTERNAL_SWITCHGEAR)
- `meta: VisualGraphMetaV1` — snapshotId, fingerprint
- Kanoniczne sortowanie po id (FNV-1a hash)

### Wyjście: `LayoutResultV1` (BINDING)
- Lokalizacja: `ui/sld/core/layoutResult.ts`
- `nodePlacements: NodePlacementV1[]` — pozycje (x,y), rozmiar, bounds, layer, bandIndex
- `edgeRoutes: EdgeRouteV1[]` — segmenty ortogonalne, laneIndex
- `switchgearBlocks: SwitchgearBlockV1[]` — bloki stacji A/B/C/D z portami
- `catalogRefs: CatalogRefV1[]` — referencje katalogowe
- `relayBindings: RelayBindingV1[]` — powiązania zabezpieczeń
- `validationErrors: LayoutValidationErrorV1[]` — błędy walidacji
- `bounds: RectangleV1` — bounding box
- `hash: string` — deterministyczny hash geometrii
- `canonicalAnnotations: CanonicalAnnotationsV1 | null` — adnotacje ETAP/IEC

### Adapter: `topologyAdapterV1.ts`
- `convertToVisualGraph(symbols: AnySldSymbol[], options?): VisualGraphV1`
- Mapuje `AnySldSymbol[]` → `VisualNodeV1[]` + `VisualEdgeV1[]`
- Klasyfikuje krawędzie (TRUNK/BRANCH/SECONDARY_CONNECTOR)
- Generator metadata: `GeneratorKind` (PV/BESS/WIND)

---

## 4. ISTNIEJĄCE GOLDEN NETWORKS

### W determinism.test.ts (core):
| ID | Opis | Symboli | Węzłów VG |
|----|------|---------|-----------|
| GN-SLD-01 | GPZ + 10 stacji typ A (radial) | 53 | 32 |
| GN-SLD-02 | GPZ + 2 sekcje + 4 stacje + ring + NOP | 13 | — |
| GN-OZE-01 | PV na SN (pole przyłączeniowe) | 4 | — |
| GN-OZE-02 | BESS na SN | 3 | — |
| GN-OZE-03 | PV + BESS (stacja wielofunkcyjna) | 5 | — |
| GN-STRESS-500 | 100 feederów × 6 elementów | 602 | — |

### W layoutPipeline.test.ts:
| ID | Opis |
|----|------|
| GN-SLD-01 | GPZ + 10 stacji A (rozszerzony) |
| GN-SLD-02 | Ring + NOP + 4 stacje |
| GN-SLD-03 | Stacja typ C + branch |
| GN-SLD-04 | Stacja typ D (sekcyjna) |
| GN-SLD-05 | Multi-feeder (3 magistrale) |
| GN-OZE-01 | PV na SN |
| GN-OZE-02 | BESS na SN |
| GN-OZE-03 | PV + BESS |

### W engine/sld-layout/tests:
| Plik | Opis |
|------|------|
| radial-network.test.ts | Prosta sieć radialna |
| multi-feeder.test.ts | Wiele feederów |
| przylacze-sn-nn.test.ts | Przyłącze SN/nN |
| oze-bess.test.ts | OZE + BESS |

---

## 5. CI PIPELINE

Workflow: `.github/workflows/sld-determinism.yml`
- Python SLD guards
- 18 Vitest contract tests (SLD core)
- Render artefacts

---

## 6. DECYZJA ARCHITEKTONICZNA — HYBRID

### Pipeline B jest KANONICZNYM silnikiem layoutu SLD.

**Uzasadnienie:**
1. Pipeline B rozumie topologię SN (trunk BFS, feeder fields, ring/NOP)
2. Pipeline B produkuje `LayoutResultV1` z hash deterministycznym
3. Pipeline B używa `IndustrialAesthetics.ts` — jedynego źródła prawdy geometrii
4. Pipeline B ma styl ABB/PowerFactory (GPZ u góry, sieć buduje się w dół)
5. Pipeline B ma 25+ testów z golden networks

### Co integrujemy z Pipeline A:
1. **Bay classification** — algorytm z `phase2-bay-detection.ts` (feeder/incomer/tie/oze/bess)
2. **Crossing minimization** — barycenter heuristic z `phase3-crossing-min.ts`
3. **Voltage color mapping** — z `config/voltage-colors.ts`
4. **Industrial config** — `INDUSTRIAL_LAYOUT_CONFIG` jest już zsynchronizowany

### Co NIE robimy:
- NIE zastępujemy Pipeline B Pipeline'm A
- NIE tworzymy trzeciego pipeline'u
- NIE zmieniamy kontraktu `VisualGraphV1` ani `LayoutResultV1`

---

## 7. PLAN IMPLEMENTACJI

### PR-SLD-HYB-01: Refaktor layoutPipeline.ts na moduły
- Rozbicie 1685-liniowego pliku na osobne moduły:
  - `hybridPhase1_gpzAndFields.ts`
  - `hybridPhase2_trunkTopology.ts`
  - `hybridPhase3_stationsAndBranches.ts`
  - `hybridPhase4_routing.ts`
  - `hybridPhase5_labels.ts`
  - `hybridPhase6_invariants.ts`
  - `hybridPhase7_annotations.ts`
- Zachowanie 100% kompatybilności z istniejącymi testami

### PR-SLD-HYB-02: Integracja bay detection + crossing min
- Import bay classification z engine
- Barycenter crossing minimization na trunk feeders
- Nowe testy determinizmu

### PR-SLD-HYB-03: 12+ golden networks
- Rozszerzenie zestawu golden networks do 12+
- Render artefacts (hash JSON)
- Stress test 500+ węzłów

### PR-SLD-HYB-04: CI guards
- `sld_layout_determinism_guard.py`
- `sld_orthogonal_guard.py`
- Integracja z `sld-determinism.yml`

---

*Dokument wiążący. Pipeline B (layoutPipeline.ts) jest kanonicznym silnikiem SLD.*
