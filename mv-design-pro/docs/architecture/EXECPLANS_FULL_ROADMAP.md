# MV-DESIGN-PRO — EXECPLANS FULL ROADMAP
## Lista ExecPlanów z Definition of Done

**Status:** BINDING
**Wersja:** 1.0
**Data:** 2026-01-30

---

## PRZEGLĄD ETAPÓW

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXECPLANS TIMELINE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  P40 ──► P41 ──► P42 ──► P43 ──► P44 ──► P45 ──► P46                  │
│   │       │       │       │       │       │       │                     │
│   │       │       │       │       │       │       └─► Proof Extensions  │
│   │       │       │       │       │       └─► Protection TCC + Select.  │
│   │       │       │       │       └─► SLD Result View                   │
│   │       │       │       └─► ProofGraph UX                            │
│   │       │       └─► Case Engine 2.0                                  │
│   │       └─► UI Full Architecture (slots + disabled)                  │
│   └─► Prerequisites & Foundations                                       │
│                                                                         │
│  PARALLEL TRACKS:                                                       │
│  ├─► P13b Type Library Governance [COMPLETE]                           │
│  ├─► P11 Proof Engine [BINDING]                                        │
│  └─► P26-P33 Analysis Extensions [IN PROGRESS]                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## P40: PREREQUISITES & FOUNDATIONS

### Cel
Przygotowanie fundamentów dla FULL ARCHITECTURE — interfejsy, kontrakty, typy.

### Zakres

| Komponent | Opis | Pliki |
|-----------|------|-------|
| **Domain contracts** | Interfejsy dla Case, Run, Snapshot | `domain/contracts/` |
| **Event system** | Domain events dla Case lifecycle | `domain/events/` |
| **Hash utilities** | Deterministyczne hashowanie | `infrastructure/hashing.py` |
| **Validation framework** | Source validation for catalog | `network_model/catalog/validation.py` |

### Definition of Done

- [ ] `ICasePipeline` interface zdefiniowany
- [ ] `IRunExecutor` interface zdefiniowany
- [ ] `DomainEvent` base class z `CaseCreated`, `RunCompleted`, `SnapshotTaken`
- [ ] `deterministic_hash()` funkcja z testami determinizmu
- [ ] `CatalogValidator` z regułą "brak źródła = błąd"
- [ ] 100% unit test coverage dla nowych komponentów
- [ ] Dokumentacja interfejsów w docstrings

### Czego NIE dotykać

- Solver IEC 60909
- Result API
- Istniejące P11 Proof Engine
- Istniejąca struktura `StudyCase`

### Pliki do utworzenia

```
backend/src/
├── domain/
│   ├── contracts/
│   │   ├── __init__.py
│   │   ├── case_pipeline.py      # ICasePipeline
│   │   ├── run_executor.py       # IRunExecutor
│   │   └── snapshot_store.py     # ISnapshotStore
│   └── events/
│       ├── __init__.py
│       ├── base.py               # DomainEvent
│       └── case_events.py        # CaseCreated, RunCompleted, etc.
├── infrastructure/
│   └── hashing.py                # deterministic_hash()
└── network_model/
    └── catalog/
        └── validation.py         # CatalogValidator
```

### Estymacja

- Complexity: MEDIUM
- Risk: LOW (additive, no breaking changes)

---

## P41: UI FULL-ARCHITECTURE (SLOTS + DISABLED)

### Cel
Zbudować pełny szkielet UI z wszystkimi slotami — funkcje disabled oznaczone jako "Coming soon".

### Zakres

| Komponent | Opis | Pliki |
|-----------|------|-------|
| **Main layout** | Pełny layout z wszystkimi panelami | `frontend/src/ui/layout/` |
| **Menu structure** | 100% PL menu z wszystkimi opcjami | `frontend/src/ui/menu/` |
| **Panel slots** | Placeholder dla ProofGraph, TCC, etc. | `frontend/src/ui/panels/` |
| **Feature flags** | System flag dla disabled features | `frontend/src/features/` |

### Definition of Done

- [ ] Menu główne z wszystkimi opcjami (PL)
  - [ ] Plik → Projekt → Case → Run
  - [ ] Edycja → Sieć → Elementy → Typy
  - [ ] Obliczenia → Zwarcia → Rozpływ → Protection
  - [ ] Wyniki → Inspector → Proof → Porównanie
  - [ ] Eksport → PDF → DOCX → Data Book
- [ ] Panel slots:
  - [ ] SLD Editor (ACTIVE)
  - [ ] Property Grid (ACTIVE)
  - [ ] Results Inspector (ACTIVE)
  - [ ] ProofGraph Viewer (SLOT — "Wkrótce")
  - [ ] TCC Viewer (SLOT — "Wkrótce")
  - [ ] Case Matrix Browser (SLOT — "Wkrótce")
  - [ ] Run Comparison (SLOT — "Wkrótce")
- [ ] Feature flag system:
  - [ ] `FEATURE_PROOF_GRAPH: false`
  - [ ] `FEATURE_TCC_ENGINE: false`
  - [ ] `FEATURE_CASE_MATRIX: false`
  - [ ] `FEATURE_RUN_DIFF: false`
- [ ] Disabled features show tooltip: "Funkcja w przygotowaniu"
- [ ] Storybook stories dla wszystkich paneli

### Czego NIE dotykać

- Solver logic
- Backend API (except new endpoints for feature flags)
- Existing SLD editor internals
- Existing Results Inspector internals

### Pliki do utworzenia/modyfikacji

```
frontend/src/
├── ui/
│   ├── layout/
│   │   ├── MainLayout.tsx        # MODIFY: add panel slots
│   │   └── PanelSlot.tsx         # NEW: generic slot component
│   ├── menu/
│   │   ├── MainMenu.tsx          # MODIFY: full menu structure (PL)
│   │   └── menu-items.ts         # NEW: menu definitions
│   └── panels/
│       ├── ProofGraphSlot.tsx    # NEW: placeholder
│       ├── TCCViewerSlot.tsx     # NEW: placeholder
│       ├── CaseMatrixSlot.tsx    # NEW: placeholder
│       └── RunComparisonSlot.tsx # NEW: placeholder
├── features/
│   ├── index.ts                  # NEW: feature flag exports
│   └── flags.ts                  # NEW: feature definitions
└── i18n/
    └── pl/
        └── menu.json             # NEW/MODIFY: Polish translations
```

### Estymacja

- Complexity: MEDIUM
- Risk: LOW (UI only, no backend changes)

---

## P42: CASE ENGINE 2.0

### Cel
Implementacja pełnego Case Engine z hierarchią Project → Case → Run → Snapshot.

### Zakres

| Komponent | Opis | Pliki |
|-----------|------|-------|
| **Case Pipeline** | Immutable case definition | `domain/case_pipeline.py` |
| **Scenario Matrix** | Auto-generation of case grid | `application/case_engine/matrix.py` |
| **Batch Solver** | Parallel case execution | `application/case_engine/batch.py` |
| **Result Cache** | Hash-based result caching | `application/case_engine/cache.py` |
| **Run Diff** | Explain differences between runs | `application/case_engine/diff.py` |

### Definition of Done

- [ ] `CasePipeline` dataclass:
  - [ ] `network_snapshot_id: str`
  - [ ] `topology_variant: TopologyVariant`
  - [ ] `assumptions: CaseAssumptions`
  - [ ] `solve_set: SolveSet`
  - [ ] `limits: EvaluationLimits`
  - [ ] `report_config: ReportConfig`
  - [ ] `fingerprint() -> str` (deterministyczny)
- [ ] `ScenarioMatrix`:
  - [ ] `generate_cases() -> list[CasePipeline]`
  - [ ] `total_cases() -> int`
  - [ ] Cartesian product axes: topology × load × generation × faults
- [ ] `BatchSolver`:
  - [ ] `solve_batch(cases, parallel=True) -> list[RunResult]`
  - [ ] Cache hit/miss logging
  - [ ] Progress callback
- [ ] `ResultCache`:
  - [ ] `get(fingerprint) -> RunResult | None`
  - [ ] `put(fingerprint, result)`
  - [ ] TTL configuration
  - [ ] Memory/disk backend options
- [ ] `RunDiff`:
  - [ ] `compare(run_a, run_b) -> RunDiff`
  - [ ] `model_changes: list[ModelChange]`
  - [ ] `result_deltas: dict[str, NumericDelta]`
  - [ ] `primary_cause: str`
  - [ ] `impact_chain: list[str]`
- [ ] API endpoints:
  - [ ] `POST /cases` — create case
  - [ ] `POST /cases/matrix` — generate from matrix
  - [ ] `POST /cases/batch` — batch solve
  - [ ] `GET /runs/{id}/diff/{other_id}` — compare runs
- [ ] Integration tests:
  - [ ] Case fingerprint determinism
  - [ ] Matrix generation correctness
  - [ ] Cache hit/miss behavior
  - [ ] Diff accuracy

### Czego NIE dotykać

- Solver internals (use existing solvers via executor)
- Result API structure
- Existing `StudyCase` (extend, don't replace)

### Pliki do utworzenia

```
backend/src/
├── domain/
│   ├── case_pipeline.py          # CasePipeline, CaseAssumptions, SolveSet
│   └── run_diff.py               # RunDiff, ModelChange
├── application/
│   └── case_engine/
│       ├── __init__.py
│       ├── matrix.py             # ScenarioMatrix
│       ├── batch.py              # BatchSolver
│       ├── cache.py              # ResultCache
│       ├── diff.py               # RunDiffCalculator
│       └── executor.py           # CaseExecutor (wraps solvers)
├── api/
│   └── case_engine.py            # New endpoints
└── infrastructure/
    └── cache/
        ├── __init__.py
        ├── memory_cache.py
        └── disk_cache.py
```

### Estymacja

- Complexity: HIGH
- Risk: MEDIUM (new subsystem, careful integration needed)

---

## P43: PROOFGRAPH UX

### Cel
ProofGraph jako pierwsza klasa UI — interaktywny widok dowodu z click-through.

### Zakres

| Komponent | Opis | Pliki |
|-----------|------|-------|
| **ProofGraph model** | DAG of proof nodes | `application/proof_engine/graph.py` |
| **Graph builder** | Build from WhiteBoxTrace | `application/proof_engine/graph_builder.py` |
| **ProofGraph UI** | Interactive React component | `frontend/src/ui/proof-graph/` |
| **Click-through** | Element → Result → Proof navigation | `frontend/src/ui/navigation/` |

### Definition of Done

- [ ] `ProofGraph` dataclass:
  - [ ] `nodes: dict[str, ProofNode]`
  - [ ] `edges: list[ProofEdge]`
  - [ ] `root_result: str`
  - [ ] `traverse_proof(result_id) -> Iterator[ProofNode]`
  - [ ] `to_latex() -> str`
  - [ ] `to_interactive_html() -> str`
- [ ] `ProofNode`:
  - [ ] `node_type: ProofNodeType` (INPUT/FORMULA/INTERMEDIATE/RESULT)
  - [ ] `equation_id: str | None`
  - [ ] `latex_formula: str | None`
  - [ ] `inputs: dict[str, ProofValue]`
  - [ ] `output: ProofValue`
  - [ ] `source_norm: str | None`
- [ ] `ProofValue`:
  - [ ] `symbol, value, unit, precision`
  - [ ] `source_type: SourceType`
  - [ ] `source_ref: str | None`
- [ ] `ProofGraphBuilder`:
  - [ ] `build_from_trace(trace: WhiteBoxTrace) -> ProofGraph`
  - [ ] Automatic node dependency detection
- [ ] UI Component `<ProofGraphViewer>`:
  - [ ] DAG visualization (dagre-d3 or similar)
  - [ ] Node click → expand details
  - [ ] Formula rendering (KaTeX)
  - [ ] Zoom/pan controls
  - [ ] Export to PNG/SVG
- [ ] Click-through navigation:
  - [ ] SLD element click → Results panel
  - [ ] Result value click → ProofGraph (scrolled to node)
  - [ ] ProofGraph node click → Input source (catalog/model)
- [ ] `ProofComparison`:
  - [ ] `compare(graph_a, graph_b) -> ProofComparison`
  - [ ] Diff visualization in UI
- [ ] API endpoints:
  - [ ] `GET /runs/{id}/proof-graph` — get proof graph
  - [ ] `GET /runs/{id}/proof-graph/compare/{other_id}` — compare graphs

### Czego NIE dotykać

- Existing `ProofPack` structure (extend, don't replace)
- Existing `ProofInspector` (add GraphViewer alongside)
- Solver internals

### Pliki do utworzenia

```
backend/src/
├── application/
│   └── proof_engine/
│       ├── graph.py              # ProofGraph, ProofNode, ProofEdge
│       ├── graph_builder.py      # ProofGraphBuilder
│       └── graph_comparison.py   # ProofComparison
└── api/
    └── proof_graph.py            # New endpoints

frontend/src/
└── ui/
    └── proof-graph/
        ├── index.ts
        ├── ProofGraphViewer.tsx  # Main component
        ├── ProofNode.tsx         # Node rendering
        ├── ProofEdge.tsx         # Edge rendering
        ├── FormulaRenderer.tsx   # KaTeX integration
        ├── GraphControls.tsx     # Zoom/pan/export
        └── hooks/
            ├── useProofGraph.ts
            └── useGraphLayout.ts
```

### Estymacja

- Complexity: HIGH
- Risk: MEDIUM (new visualization, but builds on existing proof engine)

---

## P44: SLD RESULT VIEW

### Cel
SLD jako view wynikowy z warstwami i overlay'ami — nie tylko rysunek.

### Zakres

| Komponent | Opis | Pliki |
|-----------|------|-------|
| **SLD Layers** | Layer system for overlays | `application/sld/layers.py` |
| **Result overlay** | Overlay results on SLD | `application/sld/result_overlay.py` |
| **Comparison overlay** | Diff two runs on SLD | `application/sld/comparison_overlay.py` |
| **SLD Layer UI** | Layer controls in UI | `frontend/src/ui/sld-editor/layers/` |

### Definition of Done

- [ ] `SLDLayer` enum:
  - [ ] TOPOLOGY, EQUIPMENT_LABELS
  - [ ] VOLTAGE_MAGNITUDE, VOLTAGE_ANGLE, VOLTAGE_PROFILE
  - [ ] BRANCH_CURRENTS, CURRENT_LOADING
  - [ ] ACTIVE_POWER, REACTIVE_POWER, POWER_ARROWS
  - [ ] SC_CURRENTS, SC_CONTRIBUTIONS
  - [ ] THERMAL_MARGINS, VOLTAGE_MARGINS
  - [ ] PROTECTION_STATUS, PROTECTION_ZONES
  - [ ] DELTA_OVERLAY
- [ ] `SLDResultView`:
  - [ ] `render(layers: set[SLDLayer], comparison_run=None) -> SLDRenderData`
  - [ ] Layer visibility toggles
  - [ ] Color scales for gradients
- [ ] `SLDComparisonView`:
  - [ ] `render_comparison() -> SLDRenderData`
  - [ ] Delta mode: ABSOLUTE / PERCENT / SIDE_BY_SIDE
  - [ ] Highlight threshold configuration
- [ ] UI Components:
  - [ ] `<LayerControl>` — toggle layers
  - [ ] `<ResultBadge>` — show value on element
  - [ ] `<DeltaBadge>` — show delta between runs
  - [ ] `<ColorScale>` — legend for gradients
- [ ] Context menu integration:
  - [ ] "View Properties"
  - [ ] "View Results"
  - [ ] "View Proof"
  - [ ] "View Protection (TCC)"
  - [ ] "Compare with Run..."
- [ ] API endpoints:
  - [ ] `GET /sld/{id}/render?layers=...` — render with layers
  - [ ] `GET /sld/{id}/render/compare/{other_run_id}` — comparison

### Czego NIE dotykać

- Core SLD editor functionality (drawing tools)
- Existing SLD layout algorithm
- Network model structure

### Pliki do modyfikacji/utworzenia

```
backend/src/
├── application/
│   └── sld/
│       ├── layers.py             # SLDLayer enum, layer definitions
│       ├── result_overlay.py     # MODIFY: extend overlay logic
│       └── comparison_overlay.py # NEW: comparison rendering

frontend/src/
└── ui/
    └── sld-editor/
        ├── layers/
        │   ├── index.ts
        │   ├── LayerControl.tsx
        │   ├── LayerPanel.tsx
        │   └── layer-definitions.ts
        ├── overlays/
        │   ├── ResultBadge.tsx
        │   ├── DeltaBadge.tsx
        │   ├── ColorScale.tsx
        │   └── PowerArrow.tsx
        └── context-menu/
            └── element-actions.ts  # MODIFY: add new actions
```

### Estymacja

- Complexity: HIGH
- Risk: MEDIUM (extends existing SLD, careful not to break)

---

## P45: PROTECTION TCC + SELECTIVITY

### Cel
Pełny TCC engine z krzywymi producentów i analizą selektywności.

### Zakres

| Komponent | Opis | Pliki |
|-----------|------|-------|
| **TCC Engine** | Time-current calculations | `application/protection/tcc_engine.py` |
| **Curve Library** | Manufacturer curves | `network_model/catalog/protection_curves.py` |
| **Selectivity** | Time/current/energy analysis | `application/protection/selectivity.py` |
| **TCC UI** | Interactive TCC viewer | `frontend/src/ui/tcc-viewer/` |

### Definition of Done

- [ ] `TCCEngine`:
  - [ ] `evaluate_trip_time(device, fault_current, curve_type) -> TripEvaluation`
  - [ ] `plot_curve(device, i_range) -> TCCPlotData`
  - [ ] Support: IEC curves, IEEE curves, manufacturer custom
- [ ] `TripEvaluation`:
  - [ ] `will_trip: bool`
  - [ ] `trip_time_s: float | None`
  - [ ] `trip_zone: str | None`
  - [ ] `i2t_let_through: float | None`
  - [ ] `curve_source: str`
- [ ] `ManufacturerCurve`:
  - [ ] `manufacturer, device_family, curve_name`
  - [ ] `curve_type: CurveType`
  - [ ] `custom_points / custom_equation`
  - [ ] `source_document, source_version, source_page` (OBOWIĄZKOWE)
  - [ ] `validation_status: ValidationStatus`
- [ ] `ProtectionOverlay`:
  - [ ] `ik_pp_3f, ik_pp_1f, ik_pp_2f`
  - [ ] `ip_peak, ith_thermal, idyn_dynamic`
  - [ ] `i2t_withstand`
  - [ ] `to_plot_annotations() -> list[PlotAnnotation]`
- [ ] `SelectivityAnalysis`:
  - [ ] `time_selectivity: TimeSelectivityResult`
  - [ ] `current_selectivity: CurrentSelectivityResult`
  - [ ] `energy_selectivity: EnergySelectivityResult`
  - [ ] `is_selective: bool`
  - [ ] `collision_points: list[SelectivityCollision]`
- [ ] `SelectivityCollision`:
  - [ ] `fault_current_kA`
  - [ ] `upstream_trip_time_s, downstream_trip_time_s`
  - [ ] `required_margin_s, actual_margin_s`
  - [ ] `failure_type: str`
  - [ ] `recommendation: str`
- [ ] UI `<TCCViewer>`:
  - [ ] Log-log plot (current vs time)
  - [ ] Multiple curve overlay
  - [ ] Fault current markers (vertical lines)
  - [ ] I²t bands
  - [ ] Selectivity margin visualization
  - [ ] Zoom/pan
  - [ ] Export to PNG/SVG/PDF
- [ ] UI `<SelectivityReport>`:
  - [ ] Table of device pairs
  - [ ] Status: ✓ Selective / ⚠️ Marginal / ✗ Not selective
  - [ ] Click → TCC view with collision highlighted
  - [ ] "Explain why" button → collision details
- [ ] API endpoints:
  - [ ] `POST /protection/tcc/evaluate` — evaluate trip
  - [ ] `GET /protection/tcc/plot/{device_id}` — get curve data
  - [ ] `POST /protection/selectivity` — analyze pair
  - [ ] `GET /protection/selectivity/report` — full report

### Czego NIE dotykać

- Existing protection evaluation logic (extend, don't replace)
- Solver internals
- Existing curve storage (extend catalog)

### Pliki do utworzenia

```
backend/src/
├── application/
│   └── protection/
│       ├── tcc_engine.py         # TCCEngine
│       ├── selectivity.py        # SelectivityAnalyzer
│       ├── curve_evaluator.py    # Curve math
│       └── collision_detector.py # Collision detection
├── network_model/
│   └── catalog/
│       └── protection_curves.py  # MODIFY: add ManufacturerCurve
└── api/
    └── protection_tcc.py         # New endpoints

frontend/src/
└── ui/
    └── tcc-viewer/
        ├── index.ts
        ├── TCCViewer.tsx         # Main component
        ├── CurvePlot.tsx         # Log-log plot
        ├── FaultMarkers.tsx      # Vertical fault lines
        ├── SelectivityBands.tsx  # Margin visualization
        ├── CurveEditor.tsx       # Settings adjustment
        └── hooks/
            ├── useTCCData.ts
            └── useSelectivity.ts
```

### Estymacja

- Complexity: VERY HIGH
- Risk: HIGH (complex calculations, many edge cases)

---

## P46: PROOF EXTENSIONS (P11.1b–d, P17)

### Cel
Rozszerzenie Proof Engine o dodatkowe typy dowodów.

### Zakres

| Extension | Opis | Bazowy ExecPlan |
|-----------|------|-----------------|
| **P11.1b** | Regulacja Q/U | `P11_1b_REGULATION_Q_U.md` |
| **P11.1c** | SC asymetryczne | `P11_1c_SC_ASYMMETRICAL.md` |
| **P11.1d** | Proof UI Export | `P11_1d_PROOF_UI_EXPORT.md` |
| **P17** | Straty i profil energii | `P17_LOSSES_ENERGY_PROFILE.md` |

### Definition of Done (per extension)

#### P11.1b — Regulacja Q/U
- [ ] `ProofType.Q_U_REGULATION` w EquationRegistry
- [ ] Równania: Q-U droop, voltage setpoint, reactive power limits
- [ ] Proof template dla regulation analysis
- [ ] Test: pełny proof dla przykładowej sieci z PV

#### P11.1c — SC Asymetryczne
- [ ] `ProofType.SC1F_IEC60909` — single-phase to ground
- [ ] `ProofType.SC2F_IEC60909` — two-phase
- [ ] `ProofType.SC2FG_IEC60909` — two-phase to ground
- [ ] Sequence impedance equations (Z1, Z2, Z0)
- [ ] Test: pełny proof dla każdego typu zwarcia

#### P11.1d — Proof UI Export
- [ ] PDF export z pełnym formatowaniem
- [ ] LaTeX export (standalone document)
- [ ] JSON export (machine-readable)
- [ ] Batch export dla wielu runów
- [ ] Test: export determinism (same input → same output)

#### P17 — Straty i profil energii
- [ ] `ProofType.LOSSES` — straty mocy
- [ ] `ProofType.ENERGY_PROFILE` — profil energii w czasie
- [ ] Równania: straty w linii, transformatorze, load losses
- [ ] Integration z time-series data
- [ ] Test: suma strat = bilans mocy

### Czego NIE dotykać

- Core solver algorithms
- Existing proof types (extend registry)
- Frozen Result API

### Pliki do modyfikacji/utworzenia

```
backend/src/
└── application/
    └── proof_engine/
        ├── registries/
        │   ├── qu_regulation_equations.py  # P11.1b
        │   ├── sc_asymmetric_equations.py  # P11.1c
        │   └── losses_equations.py         # P17
        ├── exporters/
        │   ├── pdf_export.py               # P11.1d - MODIFY
        │   ├── latex_export.py             # P11.1d - MODIFY
        │   └── batch_export.py             # P11.1d - NEW
        └── types.py                        # MODIFY: add new ProofTypes
```

### Estymacja

- Complexity: MEDIUM per extension
- Risk: LOW (additive, follows established patterns)

---

## DEPENDENCY GRAPH

```
P40 (Prerequisites)
 │
 ├──────────────────────────────────────────────┐
 │                                              │
 ▼                                              ▼
P41 (UI Architecture)                    P42 (Case Engine 2.0)
 │                                              │
 │    ┌─────────────────────────────────────────┤
 │    │                                         │
 ▼    ▼                                         ▼
P44 (SLD Result)◄───────────────────────P43 (ProofGraph UX)
 │                                              │
 │                                              │
 ▼                                              ▼
P45 (Protection TCC)◄───────────────────P46 (Proof Extensions)
```

### Critical Path
```
P40 → P42 → P43 → P45
```

### Parallel Tracks
```
Track A: P40 → P41 → P44
Track B: P40 → P42 → P43 → P46
Track C: P40 → P42 → P45
```

---

## INTEGRATION MILESTONES

### M1: Foundation Complete
- P40 complete
- P41 UI skeleton deployed
- All feature flags functional

### M2: Case Engine Live
- P42 complete
- Scenario Matrix functional
- Batch solve working

### M3: ProofGraph Beta
- P43 complete
- Click-through working
- Proof comparison available

### M4: SLD 2.0
- P44 complete
- All layers functional
- Comparison overlay working

### M5: Protection Complete
- P45 complete
- TCC viewer deployed
- Selectivity analysis working

### M6: Full System
- P46 complete
- All proof types available
- Production ready

---

## RISK REGISTER

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| P45 TCC complexity | HIGH | MEDIUM | Early prototyping, manufacturer curve validation |
| P44 SLD performance | MEDIUM | MEDIUM | Virtual rendering, layer caching |
| P42 Cache invalidation | MEDIUM | LOW | Strict fingerprint contract, TTL |
| P43 Graph layout | LOW | MEDIUM | Use proven library (dagre), fallback layout |

---

## GOVERNANCE

### Review Checkpoints
- Each P-class requires architecture review before implementation
- DoD verification by independent reviewer
- No P-class closes without passing CI

### Change Control
- FROZEN components require RFC to modify
- BINDING documents require explicit approval to change
- New P-class requires this document update

---

**Koniec dokumentu EXECPLANS_FULL_ROADMAP.md**
