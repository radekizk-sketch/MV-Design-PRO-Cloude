# SLD LAYOUT HYBRID SPEC — ABB + PowerFactory (KANON)

**Status**: BINDING
**Data**: 2026-02-24
**Wersja**: 1.0.0
**Zakres**: Specyfikacja silnika układu hybrydowego SLD

---

## 1. KONTEKST

System MV-DESIGN-PRO używa jednego kanonicznego silnika layoutu SLD:
`frontend/src/ui/sld/core/layoutPipeline.ts` — 7-fazowy pipeline ABB+PowerFactory.

Silnik łączy podejście ABB (GPZ u góry, pionowe magistrale w dół) z infrastrukturą
Sugiyama (klasyfikacja bayów, minimalizacja przecięć) z `engine/sld-layout/`.

---

## 2. ARCHITEKTURA

```
Snapshot → TopologyAdapter → VisualGraphV1 → LayoutPipeline → LayoutResultV1
                                                    ↑
                                          IndustrialAesthetics.ts
                                          bayClassification.ts
                                          crossingMinimization.ts
```

### 2.1 Wejście: VisualGraphV1 (FROZEN)
- `nodes: VisualNodeV1[]` — 19 typów węzłów
- `edges: VisualEdgeV1[]` — 6 typów krawędzi (TRUNK, BRANCH, SECONDARY_CONNECTOR, ...)
- `meta: VisualGraphMetaV1` — snapshotId, fingerprint
- Kanoniczne sortowanie po id

### 2.2 Wyjście: LayoutResultV1 (FROZEN)
- `nodePlacements: NodePlacementV1[]` — pozycje, rozmiary, bounds
- `edgeRoutes: EdgeRouteV1[]` — segmenty ortogonalne
- `switchgearBlocks: SwitchgearBlockV1[]` — bloki stacji A/B/C/D
- `hash: string` — deterministyczny FNV-1a hash geometrii
- `canonicalAnnotations: CanonicalAnnotationsV1 | null`

---

## 3. 7 FAZ PIPELINE'U

| Faza | Funkcja | Opis |
|------|---------|------|
| 1 | `phase1_place_gpz_and_fields` | GPZ u góry, źródła, TR WN/SN, szyna GPZ |
| 2 | `phase2_build_trunk_topology` | BFS trunk, bay classification, crossing minimization |
| 3 | `phase3_place_stations_and_branches` | Stacje "drop", L-shape branches, quarantine |
| 4 | `phase4_route_all_edges` | Orthogonal routing (vertical-first trunk, L-shape branch) |
| 5 | `phase5_place_labels` | (delegowane do warstwy renderowania) |
| 6 | `phase6_enforce_invariants_and_finalize` | Y-only push-away, catalog refs, relay bindings |
| 7 | `phase7_generate_canonical_annotations` | ETAP/IEC adnotacje (trunk nodes, segments, chains) |

### 3.1 Faza 2 — HYBRID: Bay Classification + Crossing Minimization

**Nowość w wersji hybrid:**
1. Po BFS trunk identyfikujemy feedery
2. `classifyFeeders()` klasyfikuje typ każdego feedera (incomer/feeder/oze/tie/bess)
3. `minimizeCrossings()` optymalizuje kolejność feederów (barycenter heuristic)
4. Feedery posortowane po: priorytecie typu → barycentrum → ID (deterministic tiebreak)

**Priorytet typów (lewo → prawo):**
| Priorytet | Typ |
|-----------|-----|
| 1 | incomer |
| 2 | measurement |
| 3 | generator |
| 5 | feeder |
| 6 | oze_pv |
| 7 | oze_wind |
| 8 | bess |
| 9 | auxiliary |
| 15 | tie |
| 20 | unknown |

---

## 4. STAŁE GEOMETRYCZNE (IndustrialAesthetics.ts)

| Stała | Wartość | Opis | Relacja |
|-------|---------|------|---------|
| GRID_BASE | 20 px | Jednostka siatki | — |
| Y_GPZ | 60 px | Y szyny GPZ | 3 × GRID_BASE |
| Y_MAIN | 400 px | Y magistrali głównej SN | — |
| Y_RING | 320 px | Y kanału ringowego | Y_MAIN - 4×GRID_BASE |
| Y_BRANCH | 480 px | Y odgałęzień | Y_MAIN + 4×GRID_BASE |
| GRID_SPACING_MAIN | 280 px | Pitch stacji | 14 × GRID_BASE |
| X_START | 40 px | Offset X | 2 × GRID_BASE |
| PITCH_FIELD_X | 280 px | Pitch pól GPZ | = GRID_SPACING_MAIN |
| TRUNK_STEP_Y | 100 px | Krok trunk | 5 × GRID_BASE |
| BRANCH_OFFSET_X | 140 px | Offset odgałęzienia | 7 × GRID_BASE |
| OFFSET_POLE | 60 px | Odstęp pól stacji | 3 × GRID_BASE |
| STATION_BLOCK_HEIGHT | 160 px | Wysokość bloku stacji | 8 × GRID_BASE |
| STATION_BLOCK_WIDTH | 120 px | Szerokość bloku stacji | 6 × GRID_BASE |

**Invariant**: Wszystkie stałe % GRID_BASE === 0.

---

## 5. DETERMINIZM

### 5.1 Gwarancje
- Ten sam VisualGraphV1 → identyczny LayoutResultV1 (bit-for-bit)
- Permutacja kolejności nodes/edges w input → identyczny output hash
- 100× repetition → identyczny hash (stability test)
- 50× permutation → identyczny hash (permutation invariance)

### 5.2 Mechanizmy
- Stable sort z ID tiebreaker wszędzie
- Snap to GRID_BASE (kwantyzacja)
- Max 20 iteracji overlap resolution
- Max 20 iteracji crossing minimization
- Brak `Math.random()`, `Date.now()`, `crypto.randomUUID()` w silniku

---

## 6. GOLDEN NETWORKS (12+)

| ID | Opis | Elementy |
|----|------|----------|
| GN-HYB-01 | GPZ + 3 stacje radial (typ A) | 18 |
| GN-HYB-02 | GPZ + 5 stacji trunk + ring NOP | 13 |
| GN-HYB-03 | GPZ + stacja B + PV | 8 |
| GN-HYB-04 | GPZ + stacja C + branch + BESS | 10 |
| GN-HYB-05 | GPZ + stacja D sekcyjna | 8 |
| GN-HYB-06 | Multi-feeder GPZ (3 pola) | 10 |
| GN-HYB-07 | Trunk + 3 L-shape branches | 16 |
| GN-HYB-08 | Ring 4 stacje + NOP | 22 |
| GN-HYB-09 | PV + BESS + Wind | 6 |
| GN-HYB-10 | 20 stacji radial (stress) | 62 |
| GN-HYB-11 | Dual ring (2 pierścienie) | 16 |
| GN-HYB-12 | Stacja D + sprzęgło + 2 feedery | 13 |

**Każda golden network weryfikuje**: hash stability 100×, permutation invariance 50×, grid alignment, orthogonal routing, zero overlaps.

---

## 7. CI GUARDS

| Strażnik | Plik | Sprawdza |
|----------|------|----------|
| sld_layout_hybrid_guard | `scripts/sld_layout_hybrid_guard.py` | Forbidden patterns, hybrid imports, pipeline phases, aesthetics constants, golden tests |
| sld_orthogonal_guard | `scripts/sld_orthogonal_guard.py` | Brak skosów/łuków w routingu |
| sld_determinism_guards | `scripts/sld_determinism_guards.py` | (istniejący) 67 sub-guardów |

---

## 8. ZAKAZY

1. **ZAKAZ** łuków, krzywych Beziera i diagonali w routingu
2. **ZAKAZ** Math.random(), Date.now() w silniku layoutu
3. **ZAKAZ** importów React w silniku layoutu
4. **ZAKAZ** niecałkowitych współrzędnych (x % GRID_BASE !== 0)
5. **ZAKAZ** przesuwania w osi X w overlap resolution (Y-ONLY push-away)
6. **ZAKAZ** feature flag na ścieżce krytycznej layoutu
7. **ZAKAZ** równoległych implementacji silnika (JEDEN pipeline)

---

*Dokument wiążący. Silnik layoutu hybrydowego jest jedynym kanonicznym silnikiem SLD.*
