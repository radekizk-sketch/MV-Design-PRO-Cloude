# MV-DESIGN-PRO Execution Plan (PowerFactory Alignment)

**Version:** 2.0
**Status:** ACTIVE
**Created:** 2025-01
**Reference:** SYSTEM_SPEC.md, ARCHITECTURE.md

---

## 1. Executive Summary

This plan describes the complete refactoring of MV-DESIGN-PRO to align with DIgSILENT PowerFactory architecture.

### 1.1 Goals

1. **Single NetworkModel** - eliminate duplicate data stores
2. **PowerFactory terminology** - Bus, Branch, Switch, Case
3. **WHITE BOX solvers** - full audit trail
4. **Wizard/SLD unity** - both edit same model
5. **PCC to interpretation layer** - remove from model
6. **Case immutability** - cases cannot mutate model

### 1.2 Scope

**IN SCOPE:**
- Documentation refactor (COMPLETE)
- Code architecture refactor
- Terminology alignment
- NetworkValidator implementation
- Catalog layer formalization

**OUT OF SCOPE:**
- New features
- UI redesign
- New solver types
- Protection implementation

---

## 2. Phase Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Documentation (COMPLETE)                               │
│ - SYSTEM_SPEC.md                                                │
│ - ARCHITECTURE.md                                               │
│ - AGENTS.md                                                     │
│ - PLANS.md                                                      │
│ - README.md                                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1.x: PowerFactory UI/UX Parity (DOC ONLY) (COMPLETE)      │
│ - SYSTEM_SPEC.md Section 18: User Interaction Model             │
│ - ARCHITECTURE.md Section 14: PowerFactory UI/UX Parity         │
│ - docs/ui/powerfactory_ui_parity.md                             │
│ - docs/ui/wizard_screens.md                                     │
│ - docs/ui/sld_rules.md                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: NetworkModel Core (IN PROGRESS)                         │
│ - Remove PCC from NetworkGraph                                  │
│ - Add Switch class (apparatus without impedance)                │
│ - Formalize Bus terminology                                     │
│ - Implement NetworkValidator                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: Catalog Layer                                          │
│ - Create catalog/ directory                                     │
│ - Implement immutable type classes                              │
│ - Migrate type references                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: Case Layer                                             │
│ - Formalize Case immutability                                   │
│ - Implement result invalidation                                 │
│ - Create cases/ directory structure                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 5: Interpretation Layer (DONE)                            │
│ - Move PCC identification to analyses/                          │
│ - Create BoundaryIdentifier                                     │
│ - Separate analysis from solver                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 6: Wizard/SLD Unity                                       │
│ - Verify single model access                                    │
│ - Remove duplicate stores                                       │
│ - Synchronize edit flows                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase 1: Documentation (COMPLETE)

### 3.1 Deliverables

| File | Status | Description |
|------|--------|-------------|
| SYSTEM_SPEC.md | DONE | Canonical specification |
| ARCHITECTURE.md | DONE | Detailed architecture |
| AGENTS.md | DONE | Governance rules |
| PLANS.md | DONE | This execution plan |
| README.md | DONE | Project overview |

### 3.2 Completed Tasks

- [x] Rewrite SYSTEM_SPEC.md with PowerFactory alignment
- [x] Create ARCHITECTURE.md with layer diagrams
- [x] Update AGENTS.md with governance rules
- [x] Create PLANS.md with execution roadmap
- [x] Update README.md with architecture overview
- [x] Docs consolidation & audit report (`docs/audit/spec_vs_code_gap_report.md`)

---

## 3.5 Phase 1.x: PowerFactory UI/UX Parity (DOC ONLY) - COMPLETE

### 3.5.1 Goal

Align documentation with DIgSILENT PowerFactory mental model for user interaction, UI patterns, and workflow philosophy.

### 3.5.2 Scope

**IN SCOPE:**
- User Interaction Model documentation
- UI/UX parity guidelines
- Wizard workflow specification
- SLD rules specification
- Calculation lifecycle documentation
- `in_service` semantics documentation
- Validation philosophy documentation
- Determinism and audit requirements

**OUT OF SCOPE:**
- Code changes
- UI implementation
- Solver modifications
- API changes
- Schema changes

### 3.5.3 Deliverables

| File | Status | Description |
|------|--------|-------------|
| SYSTEM_SPEC.md Section 18 | DONE | User Interaction Model (PowerFactory-aligned) |
| ARCHITECTURE.md Section 14 | DONE | PowerFactory UI/UX Parity |
| docs/ui/powerfactory_ui_parity.md | DONE | Calculation lifecycle, in_service, validation |
| docs/ui/wizard_screens.md | DONE | Wizard workflow, UX rules, prohibitions |
| docs/ui/sld_rules.md | DONE | SLD principles, result overlays, modes |

### 3.5.4 Completed Tasks

- [x] Add User Interaction Model chapter to SYSTEM_SPEC.md (Section 18)
- [x] Add PowerFactory UI/UX Parity chapter to ARCHITECTURE.md (Section 14)
- [x] Create docs/ui/ directory
- [x] Create docs/ui/powerfactory_ui_parity.md (lifecycle, in_service, validation, determinism)
- [x] Create docs/ui/wizard_screens.md (workflow, UX rules, prohibitions)
- [x] Create docs/ui/sld_rules.md (SLD principles, results, modes)
- [x] Update PLANS.md with Phase 1.x

---

## 3.6 Phase 1.y: UI Contracts (SLD_UI_CONTRACT.md) - COMPLETE

### 3.6.1 Goal

Zdefiniowanie **wiążących kontraktów UI** dla warstwy prezentacji wyników i danych na diagramie SLD po zamrożeniu zasad SLD / IEC 60909.

### 3.6.2 Scope

**IN SCOPE:**
- UI Priority Stack (BUS > LINIA > CAD)
- Dense SLD Rules (INLINE → OFFSET → SIDE STACK)
- Semantic Color Contract (kolor = znaczenie, nie element)
- Print-First Contract (ekran = PDF = prawda)
- Interaction Contract (hover, click, ESC)

**OUT OF SCOPE:**
- Kod implementacyjny (tylko dokumentacja)
- UI mockupy (tylko specyfikacja tekstowa)
- Backend changes

### 3.6.3 Deliverables

| File | Status | Description |
|------|--------|-------------|
| docs/ui/SLD_UI_CONTRACT.md | DONE | Kontrakty UI: 5 zasad fundamentalnych (BINDING) |
| docs/ui/SLD_SCADA_CAD_CONTRACT.md (v1.1) | DONE | Uzupełnienie § 13 (integracja z kontraktami UI) |
| docs/ui/SLD_SHORT_CIRCUIT_BUS_CENTRIC.md (v1.1) | DONE | Uzupełnienie § 13 (integracja z kontraktami UI) |
| PLANS.md | DONE | Dodanie Phase 1.y |
| ARCHITECTURE.md | DONE | Referencja do kontraktów UI |
| docs/INDEX.md | DONE | Linki do SLD_UI_CONTRACT.md |

### 3.6.4 Completed Tasks

- [x] Utworzenie docs/ui/SLD_UI_CONTRACT.md z 5 kontraktami
- [x] Uzupełnienie docs/ui/SLD_SCADA_CAD_CONTRACT.md (§ 13)
- [x] Uzupełnienie docs/ui/SLD_SHORT_CIRCUIT_BUS_CENTRIC.md (§ 13)
- [x] Aktualizacja PLANS.md (dodanie Phase 1.y)
- [x] Aktualizacja ARCHITECTURE.md (referencja do kontraktów UI)
- [x] Aktualizacja docs/INDEX.md (linki)

### 3.6.5 Key Contracts (Summary)

| # | Kontrakt | Zasada |
|---|----------|--------|
| 1 | **UI Priority Stack** | BUS (wyniki) > LINIA (prąd) > CAD (parametry) |
| 2 | **Dense SLD Rules** | INLINE → OFFSET → SIDE STACK (auto, based on density) |
| 3 | **Semantic Color Contract** | Kolor = znaczenie (alarm, stan), nie typ elementu |
| 4 | **Print-First Contract** | Ekran = PDF = prawda projektu (żadne auto-hide) |
| 5 | **Interaction Contract** | Hover = informacja, Click = fokus+panel, ESC = powrót |

---

## 3.7 Phase 1.z: UI Eksploracji Wyników i Inspekcji Elementów (DOC ONLY) - COMPLETE

### 3.7.1 Goal

Zdefiniowanie **warstwy eksploracji wyników i inspekcji elementów UI** klasy ETAP / DIgSILENT PowerFactory:

- **Results Browser**: pełna eksploracja wyników niezależnie od SLD,
- **Element Inspector**: inspekcja dowolnego elementu (BUS, LINE, TRAFO, SOURCE, PROTECTION),
- **Expert Modes**: tryby eksperckie (Operator, Designer, Analyst, Auditor),
- **Global Context Bar**: kontekst zawsze widoczny (Case, Snapshot, Analysis, Norma, Mode),
- **ETAP / PowerFactory UI Parity**: macierz feature-by-feature.

### 3.7.2 Scope

**IN SCOPE:**
- Dokumentacja Results Browser (drzewo wyników, tabele, porównania, eksport)
- Dokumentacja Element Inspector (zakładki: Overview, Parameters, Results, Contributions, Limits, Proof P11)
- Dokumentacja Expert Modes (Operator, Designer, Analyst, Auditor — NO SIMPLIFICATION RULE)
- Dokumentacja Global Context Bar (sticky top bar, drukowany w PDF)
- Macierz UI Parity z ETAP / PowerFactory (feature-by-feature)

**OUT OF SCOPE:**
- Kod implementacyjny (tylko dokumentacja)
- UI mockupy (tylko specyfikacja tekstowa)
- Backend changes
- Solver modifications

### 3.7.3 Deliverables

| File | Status | Description |
|------|--------|-------------|
| docs/ui/RESULTS_BROWSER_CONTRACT.md | DONE | Results Browser: drzewo, tabele, porównania, eksport (BINDING) |
| docs/ui/ELEMENT_INSPECTOR_CONTRACT.md | DONE | Element Inspector: zakładki, multi-case view, Proof P11 (BINDING) |
| docs/ui/EXPERT_MODES_CONTRACT.md | DONE | Expert Modes: Operator, Designer, Analyst, Auditor (BINDING) |
| docs/ui/GLOBAL_CONTEXT_BAR.md | DONE | Global Context Bar: sticky top bar, PDF header (BINDING) |
| docs/ui/UI_ETAP_POWERFACTORY_PARITY.md | DONE | Macierz UI Parity: MV-DESIGN-PRO vs ETAP vs PowerFactory (BINDING) |
| PLANS.md | DONE | Dodanie Phase 1.z |
| ARCHITECTURE.md | DONE | Referencja do UI Eksploracji Wyników |
| docs/INDEX.md | DONE | Linki do kontraktów UI |

### 3.7.4 Completed Tasks

- [x] Utworzenie docs/ui/RESULTS_BROWSER_CONTRACT.md (hierarchia drzewa, tabele, porównania Case/Snapshot, eksport)
- [x] Utworzenie docs/ui/ELEMENT_INSPECTOR_CONTRACT.md (zakładki: Overview, Parameters, Results, Contributions, Limits, Proof P11)
- [x] Utworzenie docs/ui/EXPERT_MODES_CONTRACT.md (Operator, Designer, Analyst, Auditor — NO SIMPLIFICATION RULE)
- [x] Utworzenie docs/ui/GLOBAL_CONTEXT_BAR.md (sticky top bar, drukowany w nagłówku PDF)
- [x] Utworzenie docs/ui/UI_ETAP_POWERFACTORY_PARITY.md (macierz feature-by-feature, 47 FULL + 35 SUPERIOR)
- [x] Aktualizacja PLANS.md (dodanie Phase 1.z)
- [x] Aktualizacja ARCHITECTURE.md (referencja do UI Eksploracji Wyników)
- [x] Aktualizacja docs/INDEX.md (linki)

### 3.7.5 Key Principles (Summary)

| # | Zasada | Opis |
|---|--------|------|
| 1 | **NO SIMPLIFICATION RULE** | Brak „basic UI" — jeden UI z opcjami, użytkownik decyduje co zwija |
| 2 | **Multi-Case View** | Element Inspector pokazuje wyniki dla wszystkich Case'ów w jednej tabeli |
| 3 | **Expert Modes ≠ Access Control** | Tryby zmieniają tylko domyślne rozwinięcia, NIE ukrywają danych |
| 4 | **Global Context Bar Always Visible** | Sticky top bar, drukowany w nagłówku PDF przy eksporcie |
| 5 | **ETAP / PowerFactory Parity** | MV-DESIGN-PRO ≥ ETAP ≥ PowerFactory (47 FULL, 35 SUPERIOR, 1 PARTIAL, 0 NO) |

---

## 4. Phase 2: NetworkModel Core (IN PROGRESS)

### 4.1 Task 2.1: Remove PCC from NetworkGraph (DONE)

**Location:** `backend/src/network_model/core/graph.py`

**Completed state:**
```python
class NetworkGraph:
    # No PCC - PCC is identified in interpretation layer
```

**Actions (DONE - 2025-01):**
- [x] Remove `pcc_node_id` from NetworkGraph
- [x] Remove `is_pcc` from SldNodeSymbol and SldDiagram
- [x] Update snapshot.py serialization
- [x] Remove `set_pcc` action from action_envelope and action_apply
- [x] Update sld_projection.py (pcc_marker no longer generated from graph)
- [x] Update wizard service (pcc_node_id hint preserved in settings/application layer)
- [x] Update analysis_run service
- [x] Update SLD repository
- [x] Update tests to reflect new architecture
- [x] BoundaryIdentifier already exists in `application/analyses/boundary.py`

**Notes:**
- PCC – punkt wspólnego przyłączenia is now INTERPRETATION only
- PCC hint remains in wizard settings (application layer) for user selection
- BoundaryIdentifier provides heuristic PCC identification

### 4.2 Task 2.2: Add Switch Class

**Location:** `backend/src/network_model/core/switch.py` (NEW)

**Actions:**
- [x] Create Switch dataclass
- [x] Define SwitchType enum (BREAKER, DISCONNECTOR, LOAD_SWITCH, FUSE)
- [x] Define SwitchState enum (OPEN, CLOSED)
- [x] NO impedance fields
- [x] Add to NetworkGraph

**Changelog:**
- P1: Switch integrated into NetworkGraph effective topology (PF-compliant)

### 4.3 Task 2.3: Implement NetworkValidator

**Location:** `backend/src/network_model/validation/validator.py` (NEW)

**Actions:**
- [ ] Implement NetworkValidator class
- [ ] Add connectivity check
- [ ] Add source presence check
- [ ] Add dangling element check
- [ ] Add voltage validity check
- [ ] Add branch endpoint check

### 4.4 Task 2.4: Bus Terminology

**Actions:**
- [x] Add alias/documentation for Bus = Node
- [x] Update docstrings
- [x] Consider rename in next major version

### 4.5 Task 2.5: NetworkValidator gate (DONE)

**Location:** `backend/src/application/analysis_run/service.py`

**Actions (DONE):**
- [x] Wire NetworkValidator before solver execution (PF, SC)
- [x] Block on ERROR, log warnings

### 4.6 Task 2.6: Single NetworkModel invariant (DONE)

**Location:** `backend/src/application/network_model/`

**Actions (DONE):**
- [x] Centralize NetworkGraph construction via application-level builder
- [x] Enforce single NetworkModel id per project in snapshots and analysis
- [x] Add runtime invariant checks to block mismatched model usage

---

## 5. Phase 3: Catalog Layer (DONE)

### 5.1 Task 3.1: Create Catalog Directory

**Actions:**
- [x] Create `backend/src/network_model/catalog/`
- [x] Create `types.py` with immutable type classes
- [x] Create `repository.py` with CatalogRepository

### 5.2 Task 3.2: Formalize Type Classes

**Actions:**
- [x] Make LineType frozen dataclass
- [x] Make CableType frozen dataclass
- [x] Make TransformerType frozen dataclass
- [x] Add manufacturer, rating fields

### 5.3 Task 3.3: Migrate Type References

**Actions:**
- [x] Update branch classes to use type_ref
- [x] Migrate existing type data
- [x] Update wizard service

**Changelog:**
- P8: Type Library implemented (immutable types + type_ref + impedance override compat)

---

## 6. Phase 4: Case Layer (DONE)

### 6.1 Task 4.1: Case Immutability (DEFERRED)

**Actions:**
- [ ] Verify Case uses NetworkSnapshot
- [ ] Add immutability enforcement
- [ ] Document case-model relationship

### 6.2 Task 4.2: Result Invalidation (DONE - 2025-02)

**Actions:**
- [x] Implement ResultInvalidator
- [x] Add model change detection
- [x] Mark results as OUTDATED on change

### 6.3 Task 4.3: Case Directory Structure (DEFERRED)

**Actions:**
- [ ] Create `backend/src/cases/` if not exists
- [ ] Move/organize case classes
- [ ] Ensure separation from analyses

### 6.4 Task 4.4: Active Case Pointer (DONE)

**Actions (DONE - 2025-02):**
- [x] Add project-scoped Active Case pointer
- [x] Gate calculations on Active Case context (PF-style)

**Changelog:**
- P4: Result invalidation on NetworkModel change (PF-style)

---

## 7. Phase 5: Interpretation Layer (DONE)

### 7.1 Task 5.1: Create BoundaryIdentifier (DONE)

**Location:** `backend/src/analysis/boundary/` (NEW)

**Actions (DONE):**
- [x] BoundaryIdentifier class implemented in analysis layer
- [x] identify() reads NetworkSnapshot + case params (read-only)
- [x] Heuristics: external grid, generator-dominant, single-feeder, voltage-level
- [x] Deterministic result DTO with diagnostics

### 7.2 Task 5.2: PCC Migration (DONE)

**Actions (DONE - moved to Phase 2 Task 2.1):**
- [x] Wizard no longer stores PCC in NetworkGraph (pcc_node_id hint in settings)
- [x] SLD no longer stores is_pcc (removed from SldNodeSymbol)
- [x] PCC remains in export/import as application-level hint (not core model)

### 7.3 Task 5.3: Analysis Separation (DONE)

**Actions (DONE):**
- [x] Verify analyses don't contain physics
- [x] Document analysis vs solver boundary
- [x] Add analysis layer tests

### 7.4 Task 5.4: Power Flow solver boundary alignment (DONE)

**Location:** `backend/src/network_model/solvers/power_flow_newton.py`

**Actions (DONE):**
- [x] Relocate Newton-Raphson Power Flow physics into solver layer
- [x] Keep analysis layer orchestration-only with compatibility adapter
- [x] Add regression test for solver layer parity

---

## 8. Phase 6: Wizard/SLD Unity (PENDING)

### 8.1 Task 6.1: Verify Single Model

**Actions:**
- [ ] Audit wizard service for model access
- [ ] Audit SLD for model access
- [ ] Confirm same NetworkGraph instance

### 8.2 Task 6.2: Remove Duplicate Stores

**Actions:**
- [ ] Identify any duplicate state
- [ ] Consolidate to single source
- [ ] Update persistence layer

### 8.3 Task 6.3: Synchronize Edit Flows

**Actions:**
- [ ] Verify wizard edits propagate to SLD
- [ ] Verify SLD edits propagate to wizard
- [ ] Add integration tests

---

## 9. Compliance Checklist

### 9.1 PowerFactory Alignment

| Requirement | Phase | Status |
|-------------|-------|--------|
| Single NetworkModel | Phase 2 | DONE |
| Bus terminology | Phase 2 | DONE |
| Switch without impedance | Phase 2 | DONE |
| Station = logical only | N/A | DONE |
| Case immutability | Phase 4 | PENDING |
| Catalog layer | Phase 3 | PENDING |
| PCC not in model | Phase 2 | DONE |

### 9.2 WHITE BOX Compliance

| Requirement | Phase | Status |
|-------------|-------|--------|
| Solver trace | Existing | DONE |
| Intermediate values | Existing | DONE |
| Manual audit possible | Existing | DONE |
| No hidden corrections | Existing | DONE |

### 9.3 Wizard/SLD Unity

| Requirement | Phase | Status |
|-------------|-------|--------|
| Same model | Phase 6 | PENDING |
| No duplicates | Phase 6 | PENDING |
| Sync edits | Phase 6 | PENDING |

---

## 10. Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing tests | HIGH | Run tests after each change |
| API compatibility | MEDIUM | Version frozen APIs |
| Performance regression | LOW | Benchmark critical paths |
| Migration complexity | MEDIUM | Phase-by-phase approach |

---

## 11. Timeline Guidance

**Note:** No specific dates. Work in order of phases.

| Phase | Priority | Depends On |
|-------|----------|------------|
| Phase 1: Documentation | DONE | - |
| Phase 2: NetworkModel | HIGH | Phase 1 |
| Phase 3: Catalog | MEDIUM | Phase 2 |
| Phase 4: Case | MEDIUM | Phase 2 |
| Phase 5: Interpretation | MEDIUM | Phase 2 |
| Phase 6: Unity | LOW | Phase 2-5 |

---

## 12. Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-01 | 2.0 | Initial PowerFactory alignment plan |
| 2025-01 | 2.1 | Phase 2 Task 2.1 DONE: PCC removed from NetworkGraph |
| 2025-01 | 2.2 | Phase 1.x DONE: PowerFactory UI/UX Parity documentation |
| 2025-02 | 2.3 | Docs consolidation & spec vs code audit report completed |
| 2025-02 | 2.4 | P0: NetworkValidator wired as pre-solver gate (PF-compliant) |
| 2025-02 | 2.5 | P2: Active Case pointer added (PF-style calculation context) |
| 2025-03 | 2.6 | P3: Single NetworkModel invariant enforced (no shadow graphs) |
| 2025-03 | 2.7 | P5: BoundaryIdentifier (PCC heuristics) implemented as analysis-only |
| 2025-03 | 2.8 | P6: Power Flow solver relocated to solver layer (PowerFactory boundary compliance) |
| 2025-03 | 2.9 | Static inverter support (catalog + case setpoints) |
| 2025-03 | 2.10 | Static converter sources (PV/WIND/BESS) – catalog + case setpoints |
| 2026-01 | 2.11 | Phase 1.y: UI Contracts (SLD_UI_CONTRACT.md) – DOC LOCKED |
| 2026-01 | 2.12 | Phase 1.z: UI Eksploracji Wyników i Inspekcji Elementów – DOC LOCKED |
| 2026-01 | 2.13 | Phase 2.x: UI PF++ (PowerFactory++ Parity) – DOC LOCKED |
| 2026-01 | 2.14 | Phase 2.x.2: TOPOLOGY TREE & SELECTION SYNC – DOC LOCKED |
| 2026-07 | 2.15 | P20 merge + Proof Engine completion (P11–P20) |
| 2026-08 | 2.23 | P21: Voltage Profile (BUS-centric) view + contract |

---

## 12. Phase 2.x: UI PF++ (PowerFactory++ Parity) - DOC ONLY - COMPLETE

### 12.1 Cel fazy

Rozszerzenie warstwy UI do poziomu pełnej parytetu z ETAP / DIgSILENT PowerFactory poprzez dodanie **brakujących komponentów eksploracji i kontroli UI** klasy PowerFactory++:

- **SLD Render Layers** (CAD vs SCADA),
- **Topology Tree** (eksploracja topologii),
- **Switching State View** (stany łączeniowe),
- **SC Node Results** (wyniki zwarciowe per BUS),
- **Catalog Browser** (eksploracja katalogów i typów),
- **Case Comparison UI** (porównanie wariantów).

**INVARIANT:** Solver i Domain Layer pozostają **NIETKNIĘTE**. To wyłącznie dokumentacja UI.

### 12.2 Zakres fazy

| W zakresie | Poza zakresem |
|------------|---------------|
| Dokumentacja kontraktów UI | Implementacja kodu |
| Rozszerzenie ARCHITECTURE.md | Modyfikacja solverów |
| Rozszerzenie PLANS.md | Modyfikacja API |
| Utworzenie INDEX.md | Nowe funkcjonalności backend |

### 12.3 Deliverables (DOC ONLY)

| Plik | Opis | Status |
|------|------|--------|
| `docs/ui/SLD_RENDER_LAYERS_CONTRACT.md` | Definicja warstw CAD vs SCADA | DONE |
| `docs/ui/TOPOLOGY_TREE_CONTRACT.md` | Drzewo topologii (Project → Station → VoltageLevel → Element) | DONE |
| `docs/ui/SWITCHING_STATE_VIEW_CONTRACT.md` | Eksploracja stanów łączeniowych (OPEN/CLOSED) + Islands | DONE |
| `docs/ui/SC_NODE_RESULTS_CONTRACT.md` | Wyniki zwarciowe WYŁĄCZNIE per BUS (węzłowo-centryczne) | DONE |
| `docs/ui/CATALOG_BROWSER_CONTRACT.md` | Przeglądanie katalogów i typów (LineType, TrafoType, SwitchType) | DONE |
| `docs/ui/CASE_COMPARISON_UI_CONTRACT.md` | Porównanie Case A/B/C (ΔU, ΔP, ΔQ, ΔIk″) | DONE |
| `mv-design-pro/PLANS.md` | Dodanie Phase 2.x | DONE |
| `mv-design-pro/ARCHITECTURE.md` | Rozszerzenie o warstwę eksploracji UI | DONE |
| `docs/INDEX.md` | Linki do nowych kontraktów | DONE |

### 12.4 Completed Tasks

- [x] Utworzenie `docs/ui/SLD_RENDER_LAYERS_CONTRACT.md` (CAD vs SCADA Layer, tryby CAD/SCADA/HYBRID)
- [x] Utworzenie `docs/ui/TOPOLOGY_TREE_CONTRACT.md` (hierarchia Project → Station → VoltageLevel → Element)
- [x] Utworzenie `docs/ui/SWITCHING_STATE_VIEW_CONTRACT.md` (stany łączeniowe, identyfikacja Islands)
- [x] Utworzenie `docs/ui/SC_NODE_RESULTS_CONTRACT.md` (wyniki zwarciowe per BUS, ZAKAZ prezentacji „na linii")
- [x] Utworzenie `docs/ui/CATALOG_BROWSER_CONTRACT.md` (przeglądanie katalogów, relacja Type → Instances)
- [x] Utworzenie `docs/ui/CASE_COMPARISON_UI_CONTRACT.md` (porównanie Case A/B/C, Delta, SLD Overlay)
- [x] Aktualizacja `mv-design-pro/PLANS.md` (dodanie Phase 2.x)
- [x] Aktualizacja `mv-design-pro/ARCHITECTURE.md` (rozszerzenie o warstwę eksploracji UI)
- [x] Utworzenie `docs/INDEX.md` (linki do wszystkich kontraktów UI)

### 12.5 Key Principles (Summary)

| # | Zasada | Opis |
|---|--------|------|
| 1 | **SLD Render Layers** | Rozdział semantyk: CAD (statyczny, drukowany) vs SCADA (runtime, kolory) |
| 2 | **Topology Tree** | Hierarchia topologiczna (Project → Station → VoltageLevel → Element) jako alternatywa dla nawigacji SLD |
| 3 | **Switching State View** | Eksploracja stanów łączeniowych + identyfikacja Islands (algorytmiczna) |
| 4 | **SC Node Results** | Wyniki zwarciowe WYŁĄCZNIE per BUS (ZAKAZ „na linii", „na transformatorze") |
| 5 | **Catalog Browser** | Przeglądanie katalogów typów + relacja Type → Instances |
| 6 | **Case Comparison UI** | Porównanie Case A/B/C z tabelą Delta + SLD Overlay różnic |

### 12.6 UI PF++ Parity Matrix (Extended)

| Feature                          | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|----------------------------------|------------|--------------|---------------|--------------|
| SLD Render Layers (CAD vs SCADA) | ✗          | ✓            | ✓             | ✅ FULL      |
| Topology Tree (hierarchia)       | ✓          | ✓            | ✓             | ✅ FULL      |
| Switching State View (Islands)   | ✓          | ✓            | ✓             | ✅ FULL      |
| SC Results per BUS (węzłowo-centryczne) | ✓   | ✓            | ✓             | ✅ FULL      |
| Catalog Browser (Type Library)   | ✓          | ✓            | ✓             | ✅ FULL      |
| Case Comparison (A vs B vs C)    | ✗          | ✓            | ✓             | ✅ FULL      |
| **Hybrid Mode (konfigurowalne nakładki)** | ✗ | ✗            | ✓             | ➕ SUPERIOR  |

**Ocena końcowa:** **MV-DESIGN-PRO UI ≥ PowerFactory UI** w zakresie eksploracji i kontroli UI ✅

---

## 12.7. Phase 2.x.2: TOPOLOGY TREE & SELECTION SYNC — DOC LOCKED

### 12.7.1. Cel fazy

Rozszerzenie i formalizacja **zasad synchronizacji selekcji** (Selection Sync) między wszystkimi widokami UI:
- **Topology Tree**,
- **SLD**,
- **Results Browser**,
- **Element Inspector**.

**Zasada:** **SINGLE GLOBAL FOCUS** — jeden globalny fokus współdzielony przez wszystkie widoki (Single Source of Truth for Selection).

**INVARIANT:** Solver i Domain Layer pozostają **NIETKNIĘTE**. To wyłącznie dokumentacja UI.

### 12.7.2. Zakres fazy

| W zakresie | Poza zakresem |
|------------|---------------|
| Definicja Single Global Focus | Implementacja kodu |
| Zasady synchronizacji selekcji | Modyfikacja solverów |
| ESC behavior (cofanie fokusu) | Modyfikacja API |
| FORBIDDEN practices dla selekcji | Nowe funkcjonalności backend |

### 12.7.3. Deliverables (DOC ONLY)

| Plik | Opis | Status |
|------|------|--------|
| `docs/ui/TOPOLOGY_TREE_CONTRACT.md` (v1.1) | Rozszerzona sekcja 5: SELECTION & SYNC (Single Global Focus, ESC behavior, FORBIDDEN) | DONE |
| `mv-design-pro/PLANS.md` | Dodanie Phase 2.x.2 | DONE |
| `mv-design-pro/ARCHITECTURE.md` | Rozszerzenie § 18: Topology Tree jako kręgosłup nawigacji | DONE |

### 12.7.4. Completed Tasks

- [x] Rozszerzenie sekcji 5 w `docs/ui/TOPOLOGY_TREE_CONTRACT.md`:
  - Definicja Single Global Focus (Target Element, Active Case, Active Run, Active Snapshot, Active Analysis),
  - Global Focus Stack (hierarchiczny fokus),
  - ESC Behavior (cofanie fokusu bez resetowania kontekstu),
  - Synchronizacja Tree ↔ SLD,
  - Synchronizacja Tree ↔ Results Browser,
  - Synchronizacja Tree ↔ Element Inspector,
  - FORBIDDEN practices (rozjazd selekcji, wiele aktywnych fokusów).
- [x] Aktualizacja `mv-design-pro/PLANS.md` (dodanie Phase 2.x.2).
- [x] Aktualizacja `mv-design-pro/ARCHITECTURE.md` (rozszerzenie § 18.2.2: Topology Tree jako kręgosłup nawigacji).

### 12.7.5. Key Principles (Summary)

| # | Zasada | Opis |
|---|--------|------|
| 1 | **SINGLE GLOBAL FOCUS** | Jeden globalny fokus = (Target Element, Active Case, Active Run, Active Snapshot, Active Analysis) |
| 2 | **Synchronizacja 4-widokowa** | Topology Tree ↔ SLD ↔ Results Browser ↔ Element Inspector (każdy zmiana w jednym → aktualizacja wszystkich) |
| 3 | **ESC Behavior** | ESC cofa fokus o poziom wstecz (Element → Run → Snapshot → Case), **NIE resetuje** Active Case/Snapshot |
| 4 | **FORBIDDEN: Rozjazd selekcji** | Wiele aktywnych fokusów = regresja wymagająca hotfix |

### 12.7.6. UI Synchronization Contract (Extended)

**Before Phase 2.x.2:**
- Topology Tree synchro z SLD (klik w Tree → highlight SLD),
- Brak formalnej definicji "jednej prawdy selekcji",
- Brak zasad zachowania kontekstu przy przełączaniu widoków.

**After Phase 2.x.2 (DOC-LOCKED):**
- **SINGLE GLOBAL FOCUS** zdefiniowany jako INVARIANT,
- **Synchronizacja 4-widokowa** (Tree ↔ SLD ↔ Results ↔ Inspector) — każda zmiana w jednym widoku aktualizuje wszystkie pozostałe,
- **ESC Behavior** sformalizowany (cofanie fokusu bez resetowania kontekstu),
- **FORBIDDEN practices** (rozjazd selekcji, wiele fokusów) → każda to REGRESJA wymagająca HOTFIX.

---

## 12.8. Phase 2.x.3: SWITCHING STATE EXPLORER — DOC LOCKED

### 12.8.1. Cel fazy

Zdefiniowanie **Switching State Explorer** — narzędzia UI klasy DIgSILENT PowerFactory / ETAP dla eksploracji stanów łączeniowych aparatury (Switch) i ich wpływu na topologię efektywną sieci.

**Zakres:**
- Eksploracja stanów aparatów OPEN/CLOSED
- Algorytmiczna identyfikacja wysp (Islands) — graph traversal
- Ocena spójności i łączności sieci (pre-solver validation)
- Integracja z SLD (overlay Islands), Element Inspector, Results Browser, Topology Tree

**INVARIANT:** Solver i Domain Layer pozostają **NIETKNIĘTE**. To wyłącznie dokumentacja UI.

**NOT-A-SOLVER rule:** Switching State Explorer **NIE wykonuje** obliczeń fizycznych (prądy, napięcia). Tylko analiza topologiczna (connected components).

---

### 12.8.2. Zakres fazy

| W zakresie | Poza zakresem |
|------------|---------------|
| Definicje (Effective Topology, Island, Energized) | Implementacja kodu |
| UX: layout (Explorer panel + SLD overlay + checks) | Modyfikacja solverów |
| Integracje (SLD, Inspector, Results, Tree) | Modyfikacja API |
| Reguły invalidation wyników | Nowe funkcjonalności backend |
| Scenariusze poprawne i FORBIDDEN | Implementacja DB schema |
| Przykłady ASCII (2 Islands, ring open point) | |

---

### 12.8.3. Deliverables (DOC ONLY)

| Plik | Opis | Status |
|------|------|--------|
| `docs/ui/SWITCHING_STATE_EXPLORER_CONTRACT.md` | Definicje (Effective Topology, Island), UX (Explorer panel, SLD overlay, Topology Checks), integracje (SLD/Inspector/Results/Tree), scenariusze, przykłady ASCII | DONE |
| `mv-design-pro/PLANS.md` | Dodanie Phase 2.x.3 | DONE |
| `mv-design-pro/ARCHITECTURE.md` | Krótki podrozdział: Switching Explorer jako warstwa aplikacyjna, bez fizyki | DONE |
| `docs/INDEX.md` | Link do SWITCHING_STATE_EXPLORER_CONTRACT.md | DONE |

---

### 12.8.4. Completed Tasks

- [x] Utworzenie `docs/ui/SWITCHING_STATE_EXPLORER_CONTRACT.md`:
  - Definicje: Switching Apparatus, Effective Topology, Island, Energized vs De-energized (interpretacja UI, NIE fizyka)
  - UX: layout (Explorer panel z listą aparatów, filtrami, Topology Checks)
  - Integracje: SLD (overlay Islands, natychmiastowa zmiana symbolu), Element Inspector (zakładki Switch), Results Browser (invalidation rule), Topology Tree (synchronizacja 4-widokowa)
  - Reguły invalidation: zmiana stanu aparatu → Result status = OUTDATED
  - Scenariusze poprawne: eksploracja stanów, toggle State, batch switching, restore normal state
  - Scenariusze FORBIDDEN: auto-run solver, prezentacja "prądów w aparacie", auto-repair topology
  - Przykłady ASCII: 2 Islands (feeder odłączony), ring otwarty (dwa punkty otwarcia)
- [x] Aktualizacja `mv-design-pro/PLANS.md` (dodanie Phase 2.x.3)
- [x] Aktualizacja `mv-design-pro/ARCHITECTURE.md` (Switching Explorer jako warstwa aplikacyjna)
- [x] Aktualizacja `docs/INDEX.md` (link do kontraktu)

---

### 12.8.5. Key Principles (Summary)

| # | Zasada | Opis |
|---|--------|------|
| 1 | **NOT-A-SOLVER rule** | Switching Explorer wykonuje wyłącznie analizę topologiczną (graph traversal), NIE obliczenia fizyczne (prądy, napięcia) |
| 2 | **Effective Topology** | Graf sieci po uwzględnieniu stanów aparatów (OPEN → krawędź usunięta) i flag `in_service` |
| 3 | **Islands (algorytmiczne)** | Identyfikacja wysp jako connected components (BFS/DFS), NIE wynik solverów |
| 4 | **Natychmiastowa aktualizacja** | Toggle State → przeliczenie Effective Topology → aktualizacja Islands → aktualizacja SLD overlay (< 100 ms) |
| 5 | **Invalidation Rule** | Zmiana stanu aparatu → Result status = OUTDATED (z bannerem ostrzeżenia) |
| 6 | **Synchronizacja 4-widokowa** | Wybór aparatu w Explorerze → podświetlenie SLD/Tree/Inspector (zgodnie z Phase 2.x.2) |
| 7 | **MAX DATA, MAX CONTROL** | Brak uproszczeń, wszystkie aparaty widoczne, użytkownik decyduje o filtrowaniu |

---

### 12.8.6. UI Switching Explorer Compliance Checklist

**Implementacja zgodna z SWITCHING_STATE_EXPLORER_CONTRACT.md, jeśli:**

- [ ] Switching Explorer panel zaimplementowany jako równorzędny widok (z SLD, Results Browser, Topology Tree)
- [ ] Lista aparatów pokazuje wszystkie Switch z filtrami (Type, State, In Service, Feeder, Island)
- [ ] Szybkie wyszukiwanie po nazwie/ID (regex support)
- [ ] Toggle State (OPEN ↔ CLOSED) z natychmiastową aktualizacją Effective Topology + Islands
- [ ] Effective Topology przeliczana algorytmicznie (graph traversal, NOT solver)
- [ ] Islands wykrywane algorytmicznie (connected components, NOT solver)
- [ ] SLD overlay Islands (kolorowanie tła Bus lub obrys wysp)
- [ ] Topology Checks: liczba Islands, Islands bez Source, dangling Bus (pre-solver validation)
- [ ] Invalidation Rule: zmiana stanu → Result status = OUTDATED (z bannerem)
- [ ] Synchronizacja 4-widokowa: wybór aparatu → podświetlenie SLD/Tree/Inspector
- [ ] Element Inspector (Switch): zakładki Overview, Parameters, Switching History, Topology Impact
- [ ] Batch Operations: grupowa zmiana stanów (z potwierdzeniem)
- [ ] Restore Normal State: powrót do Case.baseline_switching_state
- [ ] Print/Export: wydruk listy aparatów + Island summary (PDF/Excel)
- [ ] FORBIDDEN: Auto-repair topology, Auto-run solver, Prezentacja "prądów w aparacie"

---

## 12.9. Phase 2.x.4: SHORT-CIRCUIT NODE RESULTS — DOC LOCKED

### 12.9.1. Cel fazy

Zdefiniowanie **kanonicznego widoku wyników zwarciowych IEC 60909 prezentowanych WYŁĄCZNIE per WĘZEŁ (BUS)**, zgodnie z praktyką ETAP / DIgSILENT PowerFactory.

**Zakres:**
- Wyniki zwarciowe dotyczą **konkretnego BUS** (węzła),
- **NIE dotyczą** linii jako całości,
- **NIE mogą być** prezentowane „na długości linii".

**Fundamentalna zasada (BINDING):**
- **Wyniki SC = wyniki zwarcia w węźle (Bus)**,
- **NIE ISTNIEJE** pojęcie „wynik zwarcia na linii",
- **NIE ISTNIEJE** pojęcie „wynik zwarcia na transformatorze",
- **Linia i transformator** to **elementy impedancyjne**, które **wpływają** na wynik SC w Bus, ale **NIE MAJĄ** własnych wyników SC.

**INVARIANT:** Solver i Domain Layer pozostają **NIETKNIĘTE**. To wyłącznie dokumentacja UI.

---

### 12.9.2. Zakres fazy

| W zakresie | Poza zakresem |
|------------|---------------|
| Definicja BUS-centric SC results | Implementacja kodu |
| Mapowanie IEC 60909 → UI | Modyfikacja solverów |
| Tabela wymaganych pól | Modyfikacja API |
| Relacje z SLD / Results Browser / Topology | Nowe funkcjonalności backend |
| Scenariusze poprawne i FORBIDDEN | Implementacja DB schema |
| Odniesienia do praktyki ETAP / DIgSILENT | |

---

### 12.9.3. Deliverables (DOC ONLY)

| Plik | Opis | Status |
|------|------|--------|
| `docs/ui/SC_NODE_RESULTS_CONTRACT.md` | Definicja BUS-centric SC results: struktura wyniku SC per Bus (Ik″, ip, Ith, Sk), prezentacja w Results Browser (tabela), Element Inspector (zakładka Results), SLD Viewer (nakładka tylko na Bus), terminologia FORBIDDEN („na linii", „na transformatorze"), parity z ETAP/PowerFactory | DONE |
| `mv-design-pro/PLANS.md` | Dodanie Phase 2.x.4 | DONE |
| `mv-design-pro/ARCHITECTURE.md` | Podrozdział: Short-Circuit Results as BUS-centric UI layer | DONE |
| `docs/INDEX.md` | Link do SC_NODE_RESULTS_CONTRACT.md | DONE |

---

### 12.9.4. Completed Tasks

- [x] Utworzenie `docs/ui/SC_NODE_RESULTS_CONTRACT.md`:
  - Fundamentalna zasada: BUS-centric short-circuit results (§ 2),
  - Struktura wyniku SC per Bus: Ik_max, Ik_min, ip, Ith, Sk, Fault Type, Status (§ 3),
  - Prezentacja w Results Browser: tabela z kolumnami (Bus ID, Bus Name, Voltage, Fault Type, Ik_max, Ik_min, ip, Ith, Sk, Status) (§ 4.1),
  - Prezentacja w Element Inspector (Bus): zakładka Results → sekcja Short-Circuit Results + Contributions (§ 4.2),
  - Prezentacja w SLD Viewer: nakładka SC tylko na Bus (Ik_max [kA], Status kolor) (§ 4.3),
  - Terminologia FORBIDDEN: „Prąd zwarciowy na linii", „Prąd zwarciowy na transformatorze", „Wynik SC dla Branch" (§ 5),
  - Parity z ETAP / DIgSILENT PowerFactory: wyniki SC per Bus (węzłowo-centryczne), tabela SC, contributions, nakładka SC na SLD (tylko Bus), BRAK wyników SC „na linii", BRAK wyników SC „na transformatorze" (§ 6),
  - Accessibility, Performance, ZABRONIONE PRAKTYKI (§ 7-9),
  - Zależności od innych kontraktów: RESULTS_BROWSER_CONTRACT, ELEMENT_INSPECTOR_CONTRACT, SLD_RENDER_LAYERS_CONTRACT, GLOBAL_CONTEXT_BAR (§ 10).
- [x] Aktualizacja `mv-design-pro/PLANS.md` (dodanie Phase 2.x.4)
- [x] Aktualizacja `mv-design-pro/ARCHITECTURE.md` (podrozdział 18.2.4: SC Node Results)
- [x] Aktualizacja `docs/INDEX.md` (sekcja 3.4: SC Node Results)

---

### 12.9.5. Key Principles (Summary)

| # | Zasada | Opis |
|---|--------|------|
| 1 | **BUS-CENTRIC SHORT-CIRCUIT RESULTS** | Wyniki zwarciowe są WYŁĄCZNIE per BUS (węzeł sieci), NIE per linia, NIE per transformator |
| 2 | **IEC 60909 Compliance** | Wyniki SC zawierają wszystkie parametry IEC 60909: Ik″ (max/min), ip, Ith, Sk, Fault Type, FaultSpec (c_max, c_min) |
| 3 | **Results Browser Integration** | Tabela SC dostępna w Results Browser z sortowaniem, filtrowaniem (violations only), eksportem do CSV/Excel/PDF |
| 4 | **Element Inspector Integration** | Zakładka Results (Bus) zawiera sekcję Short-Circuit Results + Contributions (kontrybutorzy do I_sc) |
| 5 | **SLD Overlay (Bus ONLY)** | Nakładka SC tylko na symbolu Bus (Ik_max [kA], Status kolor), FORBIDDEN: nakładka SC na linii lub transformatorze |
| 6 | **FORBIDDEN Terminology** | ZAKAZ terminologii: „Prąd zwarciowy na linii", „Prąd zwarciowy na transformatorze", „Fault current in line" |
| 7 | **ETAP / PowerFactory Parity** | Pełna parity z ETAP / DIgSILENT PowerFactory w zakresie prezentacji wyników zwarciowych per BUS |

---

### 12.9.6. UI SC Node Results Compliance Checklist

**Implementacja zgodna z SC_NODE_RESULTS_CONTRACT.md, jeśli:**

- [ ] Wyniki SC są prezentowane WYŁĄCZNIE per BUS (nie ma wyników SC „na linii", „na transformatorze")
- [ ] Results Browser implementuje tabelę SC z kolumnami: Bus ID, Bus Name, Voltage [kV], Fault Type, Ik_max [kA], Ik_min [kA], ip [kA], Ith [kA], Sk [MVA], Status
- [ ] Element Inspector (Bus) zawiera zakładkę Results → sekcję Short-Circuit Results (Ik_max, Ik_min, ip, Ith, Sk, X/R Ratio)
- [ ] Element Inspector (Bus) zawiera zakładkę Results → sekcję Contributions (kontrybutorzy do I_sc: Source Grid, Generator, Line backfeed)
- [ ] SLD Viewer wyświetla nakładkę SC tylko na symbolu Bus (Ik_max [kA], Status kolor: zielony/żółty/czerwony)
- [ ] FORBIDDEN: Nakładka SC na symbolu linii (linia NIE MA wyników SC)
- [ ] FORBIDDEN: Nakładka SC na symbolu transformatora (transformator NIE MA wyników SC)
- [ ] FORBIDDEN: Kolumna „Prąd zwarciowy na Branch" w Results Browser
- [ ] FORBIDDEN: Terminologia „fault current in line" w UI (tylko „fault current at Bus")
- [ ] Tabela SC obsługuje sortowanie (po dowolnej kolumnie), filtrowanie (violations only, voltage range, zone), eksport (CSV, Excel, PDF)
- [ ] Accessibility: ARIA labels dla kolumn tabeli SC, screen reader support („Bus 15-01, Ik max 25.3 kiloamperes, Status OK")
- [ ] Performance: renderowanie tabeli SC dla 1000 Bus < 1000 ms, sortowanie < 200 ms, filtrowanie < 300 ms, lazy loading (> 500 Bus)

---

## 13. Phase P11: Proof Engine / Mathematical Proof Engine (DOC ONLY)

### 13.1 Cel fazy

Wprowadzenie warstwy **interpretacji dowodowej** (Proof Engine), która generuje formalne dowody matematyczne z wyników solverów (WhiteBoxTrace + SolverResult).

**INVARIANT:** Solver i Result API IEC 60909 pozostają **NIETKNIĘTE**. Proof Engine jest warstwą interpretacji POST-HOC.

### 13.2 Zakres fazy

| W zakresie | Poza zakresem |
|------------|---------------|
| Dokumentacja Proof Engine (SPEC) | Implementacja kodu |
| Schematy JSON ProofDocument | Modyfikacja solverów |
| Rejestr równań SC3F, VDROP | Modyfikacja Result API |
| Definicje mapping keys | Nowe typy zwarć (implementacja) |

### 13.3 Deliverables (DOC ONLY)

| Plik | Opis | Status |
|------|------|--------|
| `docs/proof_engine/README.md` | Kanoniczny pakiet wiedzy | SPEC |
| `docs/proof_engine/P11_OVERVIEW.md` | TraceArtifact, inwarianty, UX | SPEC |
| `docs/proof_engine/P11_1a_MVP_SC3F_AND_VDROP.md` | MVP: SC3F + VDROP | SPEC |
| `docs/proof_engine/P11_1b_REGULATION_Q_U.md` | Dowód regulatora Q(U) | SPEC |
| `docs/proof_engine/P11_1c_SC_ASYMMETRICAL.md` | Składowe symetryczne | SPEC |
| `docs/proof_engine/P11_1d_PROOF_UI_EXPORT.md` | Proof Inspector UI | SPEC |
| `docs/proof_engine/PROOF_SCHEMAS.md` | Kanoniczne schematy JSON | SPEC |
| `docs/proof_engine/EQUATIONS_IEC60909_SC3F.md` | Rejestr równań SC3F | SPEC |
| `docs/proof_engine/EQUATIONS_VDROP.md` | Rejestr równań VDROP | SPEC |

---

## 14. P11 Execution Plan (Detailed)

### 14.1 P11 — White Box / Trace Inspector (dowodowy)

**Definition of Done:**
- [x] TraceArtifact zdefiniowany jako frozen dataclass
- [x] Mapping keys dla SC3F i VDROP udokumentowane
- [x] UI „Ślad obliczeń" opisany (read-only)
- [x] Pipeline integracji z ProofEngine opisany
- [x] Hierarchia Project → Case → Run → Artifact opisana

**Tests (Determinism):**
- TraceArtifact: ten sam run_id → identyczny artifact
- Mapping keys: stabilne między wersjami

### 14.2 P11.1a (MVP) — SC3F IEC60909 + VDROP

**Status:** DONE | CANONICAL & BINDING

**Cel:**
Deterministyczny, audytowalny dowód matematyczny (White Box) wyników SC3F IEC 60909 oraz VDROP.

**Zakres (FULL MATH):**
- SC3F: Thevenin ($$U_{th}, Z_{th}$$), $$I_{k}''$$, $$S_{k}''$$
- Anti-double-counting współczynnika $$c$$ (wariant A/B, dokładnie raz)
- VDROP: $$\Delta U$$ z rozbiciem $$R \cdot P$$ oraz $$X \cdot Q$$
- Format kroku dowodu (BINDING): **wzór → dane → podstawienie → wynik → weryfikacja jednostek**

**Inwarianty:**
- Solver i Result API IEC 60909 **NIETKNIĘTE**
- Proof Engine działa POST-HOC na `ShortCircuitResult` + `white_box_trace`
- Brak PASS/FAIL, brak uproszczeń domyślnych

**Determinism:**
- Stała kolejność kroków (EquationRegistry)
- Deterministyczne JSON / LaTeX / PDF / DOCX

**Relacje:**
- Baza dla: P11.1b, P11.1d, P14, P15, P17

**Definition of Done:**
- [x] ProofDocument zdefiniowany z wszystkimi polami
- [x] ProofStep z formatem Wzór→Dane→Podstawienie→Wynik→Jednostki
- [x] SC3F: 7-8 kroków dowodu z mapping keys
- [x] VDROP: 6 kroków dowodu z mapping keys
- [x] Format JSON (proof.json) udokumentowany
- [x] Format LaTeX (proof.tex) udokumentowany
- [x] Testy determinism zdefiniowane

**Tests (Determinism):**
- proof.json: identyczny dla tego samego TraceArtifact
- proof.tex: identyczny dla tego samego TraceArtifact
- Kolejność kroków: stabilna

### 14.3 P11.1b — Dowód regulatora Q(U), cosφ(P)

**Status:** REFERENCE | IN PROGRESS

**Cel:**
Dowód matematyczny regulatorów mocy biernej i współczynnika mocy.

**Zakres:**
- Q(U), cosφ(P)
- Scenariusze A/B (counterfactual)
- $$\Delta Q$$, $$\Delta k$$, brak klasyfikacji normowej

**Inwarianty:**
- LaTeX-only (blokowo), pełna weryfikacja jednostek
- POST-HOC, bez ingerencji w solvery

**Relacje:**
- Rozszerzenie P11.1a
- Wejście do P14 (coverage)

**Definition of Done:**
- [x] Charakterystyka Q(U) zdefiniowana z wszystkimi parametrami
- [x] Charakterystyka cosφ(P) zdefiniowana z wszystkimi parametrami
- [x] Równanie wpływu Q na ΔU udokumentowane
- [x] Counterfactual Proof zdefiniowany
- [ ] Kroki dowodu Q(U) z mapping keys (pełne A/B/Δ)
- [ ] Przykład counterfactual udokumentowany (pełny zestaw danych)

### 14.4 P11.1c — Zwarcia niesymetryczne (składowe symetryczne)

**Definition of Done:**
- [x] P11.1c SKELETON (structure-only) udokumentowany
- [x] Rejestr równań SC1 (placeholdery, bez matematyki)
- [x] Generator dowodu SC1 (stub, bez obliczeń)
- [x] Testy strukturalne SC1 (brak testów numerycznych)

### 14.5 P11.1d — Proof Inspector UI + Eksport

**Status:** REFERENCE | PARTLY DONE

**Cel:**
Read-only inspekcja dowodów matematycznych oraz deterministyczny eksport.

**Zakres:**
- Widoki: Header, Steps, Summary, Unit Check
- Widoki A/B/Δ tam, gdzie dotyczy
- Eksport: JSON / LaTeX / PDF / DOCX

**UX (BINDING):**
- Results → „Ślad obliczeń”
- UI wyłącznie po polsku

**Relacje:**
- Konsumuje P11.1a / P11.1b / P15 / P17

**Definition of Done:**
- [x] Layout Proof Inspector zdefiniowany
- [x] Sekcje kroku (Wzór/Dane/Podstawienie/Wynik/Weryfikacja) opisane
- [x] Nawigacja (spis, przyciski, skróty) opisana
- [x] Widok podsumowania opisany
- [ ] Kontrakty eksportu (LaTeX/PDF/DOCX/Markdown) doprecyzowane deterministycznie
- [x] Tryb read-only udokumentowany
- [ ] Komponenty UI wyspecyfikowane (braki w wariantach A/B/Δ)
- [ ] Wymagania dostępności (a11y) domknięte

### 14.6 P11.2 — Proof Inspector UX / UI Parity (PowerFactory-style)

**Definition of Done:**
- [x] Dwupanelowy układ PF (drzewo dowodu + szczegóły kroku)
- [x] Nagłówek PF-style z metadanymi i banerem „Tylko do odczytu"
- [x] Tryby widoku Executive/Engineering/Academic (read-only filtr prezentacji)
- [x] Porównanie A/B dla counterfactual (tabela + szybkie skoki)
- [x] UI eksportu JSON/LaTeX/PDF z deterministyczną nazwą pliku
- [x] Minimalna dostępność: aria-labels, focus outline, nawigacja klawiaturą

### 14.7 P11.3 — Proof Pack Publication (IN PROGRESS)

**Definition of Done:**
- [ ] Deterministyczny Proof Pack ZIP (manifest + proof.json + proof.tex + opcjonalny PDF)
- [ ] API download `/api/proof/{project_id}/{case_id}/{run_id}/pack`
- [ ] Testy determinism + manifest + checksum
- [ ] Dokumentacja kontraktu ZIP w `docs/proof_engine/P11_3_PROOF_PACK_PUBLICATION.md`
- [x] P11.4-min Proof Pack integrity-only (signature.json SHA-256)

---

## 15. P11 Compliance Checklist

### 15.1 Proof Engine Alignment

| Requirement | Phase | Status |
|-------------|-------|--------|
| Solver nietknięty | P11 | PASS (DOC ONLY) |
| Result API nietknięte | P11 | PASS (DOC ONLY) |
| TraceArtifact immutable | P11 | SPEC |
| ProofDocument deterministic | P11.1a | SPEC |
| Mapping keys literalne | P11.1a | SPEC |
| Rejestr równań SC3F | P11.1a | SPEC |
| Rejestr równań VDROP | P11.1a | SPEC |
| **LaTeX-only proof (block mode)** | P11.1a | **PASS** |
| **I_dyn mandatory** | P11.1a | **PASS** |
| **I_th mandatory** | P11.1a | **PASS** |
| **SC3F Gold Standard** | P11.1a | **PASS** |

### 15.2 Determinism Tests (Required)

| Test | Description | Status |
|------|-------------|--------|
| `test_trace_artifact_determinism` | Same run → identical artifact | SPEC |
| `test_proof_json_determinism` | Same artifact → identical JSON | SPEC |
| `test_proof_tex_determinism` | Same artifact → identical LaTeX | SPEC |
| `test_proof_step_order_stable` | Step order is fixed | SPEC |
| `test_mapping_keys_stable` | Keys don't change between versions | SPEC |

---

## 16. Phase P12: Equipment Proof Pack (MVP) — DONE

### 16.1 Cel fazy

Wprowadzenie **P12 Equipment Proof Pack** jako niezależnego modułu analizy
doboru aparatury na podstawie wyników P11 (bez nowych obliczeń fizycznych).

### 16.2 Deliverables (MVP)

| Element | Status | Opis |
|---------|--------|------|
| P12 moduł application/equipment_proof | DONE | Dataclassy wejścia/wyjścia + reguły U/Icu/Idyn/Ith |
| ProofDocument P12 | DONE | Generator dowodu z krokami i podsumowaniem |
| Proof Pack P12 | DONE | ZIP z manifest + proof.json + proof.tex |
| Testy determinism | DONE | JSON + ZIP deterministyczne |

---

## 17. Phase P14: Proof Audit & Coverage (DOC ONLY) — DONE

### 17.1 Cel fazy

Wprowadzenie **kanonicznej warstwy audytu** kompletności i pokrycia Proof Packów
bez dodawania obliczeń i bez modyfikacji solverów.

**Status:** DONE | CANONICAL & BINDING

**Zakres:**
- Coverage Matrix: wielkość → Proof Pack
- Reguła audytu: **brak dowodu = NOT COMPUTED**
- Wykrywanie luk (bez interpretacji norm)

**Inwarianty:**
- Warstwa META-only (bez obliczeń)
- Brak wpływu na solvery i Result API

**Relacje:**
- Prerequisite dla P15–P20

### 17.2 Deliverables (DOC ONLY)

| Plik | Opis | Status |
|------|------|--------|
| `docs/proof_engine/P14_PROOF_AUDIT_AND_COVERAGE.md` | Warstwa audytu: definicje, coverage, checklist | DONE |
| `docs/proof_engine/README.md` | Referencja do P14 (meta) | DONE |
| `docs/proof_engine/P11_OVERVIEW.md` | Referencja do P14 (meta) | DONE |
| `docs/INDEX.md` | Indeks P14 | DONE |
| `PLANS.md` | Aktualizacja planu | DONE |

### 17.3 Relacje

P14 jest **warstwą meta** i stanowi **prerequisite** dla P15–P20.

---

## 18. Change Log (continued)

| Date | Version | Changes |
|------|---------|---------|
| 2026-01 | 2.11 | P11: Proof Engine / Mathematical Proof Engine documentation (DOC ONLY) |
| 2026-01 | 2.12 | P11.1a MVP: SC3F IEC60909 + VDROP proof specifications |
| 2026-01 | 2.13 | P11.1b-d: Regulation Q(U), asymmetrical SC, UI/export specs |
| 2026-01 | 2.14 | P11 Professor Audit: LaTeX-only policy, I_dyn/I_th mandatory, SC3F Gold Standard |
| 2026-02 | 2.15 | P11.2 Proof Inspector UX/UI parity (PowerFactory-style, read-only) |
| 2026-03 | 2.16 | P12 MVP: Equipment Proof Pack (U, Icu, Idyn, Ith) |
| 2026-04 | 2.17 | P14 Proof Audit & Coverage (doc-only, meta layer) |
| 2026-05 | 2.18 | P15 Load Currents & Overload Proof Pack roadmap formalized (FULL MATH, deterministic) |
| 2026-01 | 2.22.3 | Phase 2.x.3: SWITCHING STATE EXPLORER — DOC LOCKED (eksploracja stanów łączeniowych, Islands, pre-solver validation) |
| 2026-01 | 2.22.4 | Phase 2.x.4: SHORT-CIRCUIT NODE RESULTS — DOC LOCKED (wyniki zwarciowe BUS-centric, IEC 60909, PF-grade) |
| 2026-01 | 2.22.5 | Phase 2.x.5: CATALOG BROWSER (PASSIVE EQUIPMENT) — DOC LOCKED (Type → Instances, pasywne elementy tylko, PF-grade) |
| 2026-06 | 2.22 | Proof Engine: LS registry initialization fix (EquationRegistry merge/freeze + import smoke test) |
| 2026-06 | 2.22.1 | P16.1 CI stabilization: test harness isolation for FastAPI-only fixtures |
| 2026-06 | 2.22.2 | P17 Losses Energy Profile Proof Pack implemented (FULL MATH, deterministic) |
| 2026-01 | 2.23 | **P10a STATE / LIFECYCLE** — Project → StudyCase → Run → Snapshot model (DONE) |
| 2026-01 | 2.24 | **P10b RESULT STATE + COMPARISON** — RunResultState + Case A/B Comparison Service (DONE) |
| 2026-01 | 2.25 | **P11a RESULTS INSPECTOR** — READ-ONLY Results Inspector + Trace View + SLD Overlay API (DONE) |
| 2026-01 | 2.26 | **P11b FRONTEND RESULTS INSPECTOR** — Frontend RESULT_VIEW mode + SLD Overlay rendering (DONE) |

| 2026-01 | 2.27 | **P11c RESULTS BROWSER + A/B COMPARE (UI-ONLY)** — Results history tree + A/B comparison UI + SLD comparison mode (DONE) |
| 2026-01 | 2.28 | **P12a DATA MANAGER PARITY** — Case Manager + Active Case Bar + MODE_EDIT/CASE_CONFIG/RESULT_VIEW blocks (DONE) |
_Versioning note: entries are normalized to 2.22.x to preserve monotonic versioning and avoid legacy 2.19.x references._

---

## 19. P10a STATE / LIFECYCLE — DONE

### 19.1 Overview

**P10a** introduces the **canonical, persistent, and deterministic** lifecycle model:
**Project → StudyCase → Run → Snapshot**

This is the **system layer** for MV-DESIGN-PRO, not UI.

### 19.2 Implemented Components

| Component | Description | Status |
|-----------|-------------|--------|
| **Project** | Root aggregate with `active_network_snapshot_id` | DONE |
| **StudyCase** | Calculation configuration with `network_snapshot_id` binding | DONE |
| **Run** (StudyRun) | Immutable calculation execution with `network_snapshot_id`, `solver_version_hash`, `result_state` | DONE |
| **NetworkSnapshot** | First-class object with deterministic `fingerprint` (SHA-256) | DONE |
| **LifecycleService** | Application service for result invalidation on model change | DONE |

### 19.3 Key Invariants

1. **Project.active_network_snapshot_id** — tracks current network state
2. **StudyCase.network_snapshot_id** — binding to specific snapshot, invalidated on change
3. **Run is immutable** — frozen dataclass, cannot be modified after creation
4. **Snapshot.fingerprint** — deterministic SHA-256 hash of canonical JSON
5. **Result invalidation** — when snapshot changes, FRESH → OUTDATED

### 19.4 Files Modified

| Layer | Files |
|-------|-------|
| **Domain** | `domain/models.py`, `domain/study_case.py` |
| **Network Model** | `network_model/core/snapshot.py` |
| **Persistence** | `infrastructure/persistence/models.py`, `infrastructure/persistence/repositories/*.py`, `infrastructure/persistence/unit_of_work.py` |
| **Application** | `application/lifecycle/service.py` (NEW) |
| **Tests** | `tests/test_p10a_lifecycle.py` (NEW, 22 tests) |

### 19.5 Test Coverage

- 22 determinism tests passing
- Fingerprint determinism verified
- Result invalidation lifecycle verified
- Domain model immutability verified

### 19.6 Exclusions (NOT modified)

- ❌ Solvers (IEC 60909, Power Flow)
- ❌ Result API
- ❌ white_box_trace
- ❌ UI / frontend
- ❌ PROOF / P11

---

## 20. P10b RESULT STATE + COMPARISON — DONE

### 20.1 Overview

**P10b** introduces **Result State** for Run lifecycle and **Case A/B Comparison Service**:
- Canonical `RunResultState` enum (NONE/FRESH/OUTDATED)
- Read-only comparison between two Study Runs
- Deterministic delta computation (no physics, no mutations)

This is the **backend-only** layer for result comparison, not UI.

### 20.2 Implemented Components

| Component | Description | Status |
|-----------|-------------|--------|
| **RunResultState** | Enum for Run result lifecycle (NONE/FRESH/OUTDATED) | DONE |
| **NumericDelta** | Numeric difference with delta, percent, sign | DONE |
| **ComplexDelta** | Complex number difference for impedances | DONE |
| **ShortCircuitComparison** | SC comparison (Ik'', Sk'', Zth, Ip, Ith) | DONE |
| **PowerFlowComparison** | PF comparison (losses, slack, per-node U, per-branch P/Q) | DONE |
| **RunComparisonResult** | Top-level comparison DTO | DONE |
| **ComparisonService** | Application service for run comparison | DONE |
| **Comparison API** | REST endpoint `/api/comparison/runs` | DONE |

### 20.3 Key Invariants

1. **READ-ONLY** — Zero physics calculations, zero state mutations
2. **SAME PROJECT** — Both runs must belong to the same project
3. **SAME ANALYSIS TYPE** — Both runs must have the same analysis type
4. **DATA FROM RESULT API** — Uses only stored result payloads
5. **DETERMINISTIC** — Same inputs produce identical comparison output

### 20.4 Comparison Scope (IEC 60909 / Power Flow)

| Analysis | Compared Values | Units |
|----------|-----------------|-------|
| **Short Circuit** | Ik'' (initial), Sk'' (power), Zth (impedance), Ip (peak), Ith (thermal) | A, MVA, Ω |
| **Power Flow** | Total losses (P, Q), Slack power, Per-node voltages, Per-branch powers | pu, kV, MW, Mvar |

### 20.5 Files Added/Modified

| Layer | Files |
|-------|-------|
| **Domain** | `domain/results.py` (NEW) — RunResultState, comparison DTOs |
| **Application** | `application/comparison/service.py` (NEW) — ComparisonService |
| **API** | `api/comparison.py` (NEW) — REST endpoint |
| **Tests** | `tests/test_p10b_comparison.py` (NEW) — determinism tests |

### 20.6 API Endpoint

```
POST /api/comparison/runs
Request: { "run_a_id": "<uuid>", "run_b_id": "<uuid>" }
Response: RunComparisonResult with all computed deltas
```

### 20.7 Test Coverage

- NumericDelta computation determinism
- ComplexDelta computation determinism
- ShortCircuitComparison construction
- PowerFlowComparison construction
- RunComparisonResult serialization
- Exception handling (ProjectMismatch, AnalysisTypeMismatch, RunNotFound)
- Edge cases (zero values, identical values, negative values)

### 20.8 Exclusions (NOT modified)

- ❌ Solvers (IEC 60909, Power Flow)
- ❌ Result API (frozen)
- ❌ white_box_trace
- ❌ UI / frontend
- ❌ PROOF / P11

---

## 21. P11a RESULTS INSPECTOR (READ-ONLY) + TRACE VIEW + SLD OVERLAY — DONE

### 21.1 Overview

**P11a** introduces the **Results Inspector** layer for deterministic, read-only exploration of analysis results:
- Deterministic result tables (Bus/Branch-centric)
- White box trace retrieval with run context
- SLD overlay API for mapping results to diagram symbols

This is the **backend-only** layer for RESULT_VIEW mode, not UI implementation.

### 21.2 Implemented Components

| Component | Description | Status |
|-----------|-------------|--------|
| **RunHeaderDTO** | Run metadata (id, project_id, case_id, snapshot_id, status, result_state, solver_kind, input_hash) | DONE |
| **ResultsIndexDTO** | Index of available tables with column metadata and units | DONE |
| **BusResultsDTO** | Deterministically sorted bus results (name, id) | DONE |
| **BranchResultsDTO** | Deterministically sorted branch results (name, id) | DONE |
| **ShortCircuitResultsDTO** | Deterministically sorted SC results (target_id) | DONE |
| **ExtendedTraceDTO** | White box trace + run context (snapshot_id, input_hash) | DONE |
| **SldResultOverlayDTO** | SLD overlay mapping (nodes + branches + result_status) | DONE |
| **ResultsInspectorService** | Application service for building DTOs from stored results | DONE |

### 21.3 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analysis-runs/{run_id}/results/index` | GET | Results index with available tables |
| `/analysis-runs/{run_id}/results/buses` | GET | Bus results table |
| `/analysis-runs/{run_id}/results/branches` | GET | Branch results table |
| `/analysis-runs/{run_id}/results/short-circuit` | GET | Short-circuit results (SC runs only) |
| `/analysis-runs/{run_id}/results/trace` | GET | Extended trace with run context |
| `/projects/{project_id}/sld/{diagram_id}/overlay?run_id=...` | GET | SLD result overlay |

### 21.4 Key Invariants

1. **READ-ONLY** — Zero physics calculations, zero state mutations
2. **NO PHYSICS** — All data from stored Result API + Run metadata only
3. **DETERMINISTIC SORTING** — Buses/Branches by (name, id), SC by target_id
4. **DETERMINISTIC JSON** — Same inputs produce identical responses
5. **POLISH LABELS** — UI-ready labels in Polish (label_pl)
6. **SLD OVERLAY IS MAPPING ONLY** — Does not mutate NetworkModel or SLD diagram

### 21.5 Column Definitions (Polish)

| Table | Columns (key: label_pl [unit]) |
|-------|--------------------------------|
| **buses** | bus_id: ID węzła, name: Nazwa, un_kv: Napięcie znamionowe [kV], u_kv: Napięcie [kV], u_pu: Napięcie [pu], angle_deg: Kąt [°], flags: Flagi |
| **branches** | branch_id: ID gałęzi, name: Nazwa, from_bus: Węzeł początkowy, to_bus: Węzeł końcowy, i_a: Prąd [A], s_mva: Moc pozorna [MVA], p_mw: Moc czynna [MW], q_mvar: Moc bierna [Mvar], loading_pct: Obciążenie [%], flags: Flagi |
| **short-circuit** | target_id: ID węzła zwarcia, target_name: Nazwa węzła, ikss_ka: Ik'' [kA], ip_ka: ip [kA], ith_ka: Ith [kA], sk_mva: Sk'' [MVA], fault_type: Rodzaj zwarcia, flags: Flagi |

### 21.6 Files Added/Modified

| Layer | Files |
|-------|-------|
| **DTOs** | `application/analysis_run/dtos.py` — P11a DTOs |
| **Service** | `application/analysis_run/results_inspector.py` (NEW) — ResultsInspectorService |
| **API** | `api/analysis_runs.py` — Results Inspector endpoints |
| **API** | `api/sld.py` (NEW) — SLD overlay endpoint |
| **Main** | `api/main.py` — Router registration |
| **Tests** | `tests/test_p11a_results_inspector.py` (NEW) — determinism tests |

### 21.7 Test Coverage

- DTO construction and serialization
- Deterministic sorting (name, id) for buses and branches
- Deterministic sorting (target_id) for short-circuit results
- SLD overlay mapping (no physics, no mutations)
- ExtendedTraceDTO construction
- ResultsIndexDTO column metadata
- Edge cases (empty results, missing data, Unicode)

### 21.8 Exclusions (NOT modified)

- ❌ Solvers (IEC 60909, Power Flow)
- ❌ Result API (frozen)
- ❌ white_box_trace format/semantics
- ❌ UI / frontend
- ❌ Proof Engine (P11.1+)

---

## 22. P11b FRONTEND RESULTS INSPECTOR (RESULT_VIEW) — DONE

### 22.1 Overview

**P11b** introduces the **Frontend Results Inspector** for RESULT_VIEW mode:
- Full Polish UI (100% PL)
- READ-ONLY mode with blocked editing actions
- Deterministic result tables (Bus/Branch/SC)
- Trace View for white_box_trace inspection
- SLD result overlay rendering

This is the **frontend-only** implementation consuming P11a backend endpoints.

### 22.2 Implemented Components

| Component | Description | Status |
|-----------|-------------|--------|
| **ResultsInspectorPage** | Main UI with tabs (Szyny, Gałęzie, Zwarcia, Ślad obliczeń) | DONE |
| **useResultsInspectorStore** | Zustand store for results state management | DONE |
| **BusResultsTable** | Deterministically sorted bus results with filtering | DONE |
| **BranchResultsTable** | Deterministically sorted branch results with filtering | DONE |
| **ShortCircuitResultsTable** | SC results table (for SC runs only) | DONE |
| **TraceView** | White box trace inspection with search and expand/collapse | DONE |
| **SldOverlay** | SLD result overlay component with loading colors | DONE |
| **RESULT_VIEW hooks** | Mode-gating hooks (useIsResultViewMode, useCanEnterResultView, etc.) | DONE |

### 22.3 Polish Labels (100% PL)

| Category | Polish Labels |
|----------|---------------|
| **Tabs** | Szyny, Gałęzie, Zwarcia, Ślad obliczeń |
| **Result Status** | Brak wyników, Wyniki aktualne, Wyniki nieaktualne |
| **Flags** | Węzeł bilansujący, Naruszenie napięcia, Przeciążenie |
| **Solver Types** | Rozpływ mocy, Zwarcie SN |
| **UI Elements** | Tylko do odczytu, Przeglądarka wyników, Filtruj..., Pokaż nakładkę wyników |

### 22.4 Mode Gating (RESULT_VIEW)

| Action | MODEL_EDIT | CASE_CONFIG | RESULT_VIEW |
|--------|------------|-------------|-------------|
| Add elements | ✓ | ✗ | ✗ |
| Edit model | ✓ | ✗ | ✗ |
| Delete elements | ✓ | ✗ | ✗ |
| View properties | ✓ (editable) | ✓ (read-only) | ✓ (read-only) |
| View results | ✗ | ✗ | ✓ |
| SLD overlay | Hidden | Hidden | Visible |

### 22.5 SLD Overlay Features

- Voltage labels on bus symbols (kV, pu)
- Current/loading labels on branch symbols
- Loading color-coding:
  - 0-80%: Green (normal)
  - 80-100%: Yellow (warning)
  - >100%: Red (overloaded)
- OUTDATED status indicator
- Toggle visibility checkbox

### 22.6 Files Added

| Layer | Files |
|-------|-------|
| **Types** | `frontend/src/ui/results-inspector/types.ts` — Frontend types matching P11a DTOs |
| **API** | `frontend/src/ui/results-inspector/api.ts` — API client for P11a endpoints |
| **Store** | `frontend/src/ui/results-inspector/store.ts` — Zustand store |
| **UI** | `frontend/src/ui/results-inspector/ResultsInspectorPage.tsx` — Main component |
| **UI** | `frontend/src/ui/results-inspector/SldOverlay.tsx` — SLD overlay component |
| **Tests** | `frontend/src/ui/results-inspector/__tests__/results-inspector.test.ts` — UI tests |
| **Mode Hooks** | `frontend/src/ui/selection/store.ts` — P11b mode-gating hooks added |

### 22.7 Test Coverage

- RESULT_VIEW mode blocks editing actions
- Run selection loads tables
- Tab switching works correctly
- Search/filter functionality
- Overlay toggle functionality
- Deterministic sorting (Polish locale)
- Polish labels verification

### 22.8 Exclusions (NOT modified)

- ❌ Backend (P11a endpoints unchanged)
- ❌ Solvers (no physics in UI)
- ❌ Result API (frozen)
- ❌ Network model mutations

---

## 12.10. Phase 2.x.5: CATALOG BROWSER (PASSIVE EQUIPMENT) — DOC LOCKED

### 12.10.1. Cel fazy

Zdefiniowanie **kanonicznego Catalog Browser** dla **PASYWNYCH ELEMENTÓW SIECI**, zgodnie z praktyką **ETAP / DIgSILENT PowerFactory**, oparty na zasadzie:

> **TYPE jest źródłem prawdy, INSTANCES są tylko użyciami.**

Catalog Browser ma umożliwiać:
- pełny przegląd typów (LineType, CableType, TransformerType, SwitchType),
- audyt parametrów katalogowych,
- śledzenie użycia typu w sieci (Type → Instances).

**INVARIANT:** Solver i Domain Layer pozostają **NIETKNIĘTE**. To wyłącznie dokumentacja UI.

---

### 12.10.2. Zakres fazy

| W zakresie | Poza zakresem |
|------------|---------------|
| Dokumentacja Catalog Browser (PASYWNE ONLY) | Implementacja kodu |
| Definicja Type-centric modelu | Modyfikacja solverów |
| Zakres pasywnych typów (LINE, CABLE, TRAFO, SWITCH) | Modyfikacja API |
| FORBIDDEN: Source Types, Load Types, Protection Types | Nowe funkcjonalności backend |

---

### 12.10.3. Deliverables (DOC ONLY)

| Plik | Opis | Status |
|------|------|--------|
| `docs/ui/CATALOG_BROWSER_CONTRACT.md` (v1.1) | Aktualizacja: PASYWNE TYLKO, FORBIDDEN dla Source/Load/Protection, wzmocnienie paradygmatu Type → Instances | DONE |
| `mv-design-pro/PLANS.md` | Dodanie Phase 2.x.5 | DONE |
| `mv-design-pro/ARCHITECTURE.md` | Podrozdział: Type-centric Catalog UI (PF-grade) | DONE |
| `docs/INDEX.md` | Weryfikacja linku do CATALOG_BROWSER_CONTRACT.md | DONE |

---

### 12.10.4. Completed Tasks

- [x] Aktualizacja `docs/ui/CATALOG_BROWSER_CONTRACT.md`:
  - § 1.1: dodanie paradygmatu "TYPE jest źródłem prawdy, INSTANCES są tylko użyciami",
  - § 1.3: definicja zakresu (PASYWNE TYLKO: LineType, CableType, TransformerType, SwitchType),
  - § 1.3: tabela FORBIDDEN (Source Types, Load Types, Protection Types),
  - § 3.2.1: aktualizacja Type Category List (usunięcie Source Types),
  - § 6.1: rozszerzenie PowerFactory Parity (Type-centric model, propagacja zmian TYPE → INSTANCES),
  - § 6.2: dodanie sekcji "Różnice vs ETAP / PowerFactory" (uzasadnienie PASYWNE ONLY),
  - § 9.1: dodanie sekcji FORBIDDEN dla kategorii (Source, Load, Protection).
- [x] Aktualizacja `mv-design-pro/PLANS.md` (dodanie Phase 2.x.5)
- [x] Aktualizacja `mv-design-pro/ARCHITECTURE.md` (podrozdział 18.2.5: Type-centric Catalog UI)
- [x] Weryfikacja `docs/INDEX.md` (link do CATALOG_BROWSER_CONTRACT.md)

---

### 12.10.5. Key Principles (Summary)

| # | Zasada | Opis |
|---|--------|------|
| 1 | **TYPE → INSTANCES (1:N)** | TYPE definiuje parametry katalogowe (R, X, B, I_nom, S_nom), INSTANCES odwołują się do TYPE |
| 2 | **PASYWNE ELEMENTY TYLKO** | Catalog Browser obejmuje wyłącznie: LineType, CableType, TransformerType, SwitchType |
| 3 | **FORBIDDEN: Source/Load/Protection** | Źródła, obciążenia, zabezpieczenia mają parametry Case-dependent lub nastawcze, nie katalogowe |
| 4 | **Propagacja zmian TYPE → INSTANCES** | Edycja TYPE → automatyczna zmiana wszystkich INSTANCES (po potwierdzeniu użytkownika) |
| 5 | **ETAP / PowerFactory Parity** | MV-DESIGN-PRO Catalog Browser ≥ ETAP ≥ PowerFactory dla elementów pasywnych |

---

### 12.10.6. UI Catalog Browser Contract (Extended)

**Before Phase 2.x.5:**
- Catalog Browser obejmował wszystkie typy elementów (w tym Source Types),
- Brak wyraźnego rozdziału między parametrami NIEZMIENNYMI (katalogowe) i ZMIENNYMI (Case-dependent).

**After Phase 2.x.5 (DOC-LOCKED):**
- **PASYWNE ELEMENTY TYLKO** (LineType, CableType, TransformerType, SwitchType),
- **FORBIDDEN**: Source Types, Load Types, Protection Types,
- **Paradygmat Type-centric** wzmocniony (TYPE jako źródło prawdy, INSTANCES jako użycia),
- **PowerFactory Parity** rozszerzona (propagacja zmian TYPE → INSTANCES, audyt użycia typu).

---

## 12.11. Phase 2.x.6: VOLTAGE PROFILE (BUS-CENTRIC) — P21

### 12.11.1. Cel fazy

Zdefiniowanie i wdrożenie **widoku profilu napięciowego (BUS-centric)** w stylu ETAP / PowerFactory:
- tabela napięć per BUS,
- statusy wg progów (PASS/WARNING/FAIL),
- ranking „najgorszych węzłów”,
- deterministyczne sortowanie i serializacja.

**INVARIANT:** Solver i Domain Layer pozostają **NIETKNIĘTE**. To wyłącznie agregacja wyników PF.

---

### 12.11.2. Zakres fazy

| W zakresie | Poza zakresem |
|------------|---------------|
| Analiza P21 (Voltage Profile View) | Implementacja solvera |
| Kontrakt UI „Profil napięć (węzły)” | Nowe obliczenia fizyczne |
| Deterministyczne DTO / serializer | Zmiany Result API IEC 60909 |
| Testy determinism i statusów | Frontend |

---

### 12.11.3. Deliverables

| Plik | Opis | Status |
|------|------|--------|
| `backend/src/analysis/voltage_profile/` | Modele, builder, serializer P21 | DONE |
| `backend/tests/analysis/test_voltage_profile_p21.py` | Testy determinism, sortowania, statusów, NOT_COMPUTED | DONE |
| `docs/ui/VOLTAGE_PROFILE_BUS_CONTRACT.md` | Kontrakt UI profilu napięciowego (BUS-centric) | DONE |
| `docs/INDEX.md` | Link do kontraktu P21 | DONE |
| `docs/ui/RESULTS_BROWSER_CONTRACT.md` | Pozycja Results → Profil napięć (węzły) | DONE |

---

### 12.11.4. Completed Tasks

- [x] Dodanie `analysis/voltage_profile` (DTO, builder, serializer, determinism).
- [x] Implementacja progów napięciowych i statusów PASS/WARNING/FAIL/NOT_COMPUTED.
- [x] Sortowanie deterministyczne (FAIL → WARNING → PASS → NOT_COMPUTED, |Δ%| desc, bus_id asc).
- [x] Testy P21: determinism, progi, sortowanie, brak danych.
- [x] Kontrakt UI: `VOLTAGE_PROFILE_BUS_CONTRACT.md`.
- [x] Aktualizacja `docs/INDEX.md` i `RESULTS_BROWSER_CONTRACT.md`.

---

## 12.12. Phase 2.x.7: PROTECTION INSIGHT (P22a) — SELECTIVITY EXPLAINER

### 12.12.1. Cel fazy

Warstwa analityczna dla selektywności i rezerwowości zabezpieczeń (P22a), bez krzywych I–t.

### 12.12.2. Zakres fazy

**IN SCOPE:**
- DTO, builder i serializer dla Protection Insight (read-only).
- Deterministyczne sortowanie i podsumowanie statusów.
- UI Contract dla Results → Zabezpieczenia → Analiza selektywności.

**OUT OF SCOPE:**
- Krzywe I–t, rendering, solver changes.
- Modyfikacja P18/P20.

### 12.12.3. Deliverables

| Plik | Opis | Status |
|------|------|--------|
| `backend/src/analysis/protection_insight/` | Modele, builder, serializer P22a | DONE |
| `backend/tests/analysis/test_protection_insight_p22a.py` | Testy determinism, marginesów, sortowania, NOT_EVALUATED | DONE |
| `docs/ui/PROTECTION_INSIGHT_CONTRACT.md` | Kontrakt UI P22a (bez krzywych I–t) | DONE |
| `docs/INDEX.md` | Link do kontraktu P22a | DONE |

### 12.12.4. Completed Tasks

- [x] Dodanie `analysis/protection_insight` (DTO, builder, serializer, determinism).
- [x] Integracja P18 (dane) + P20 (statusy selektywności) bez nowych obliczeń.
- [x] Deterministyczne sortowanie (FAIL → WARNING → NOT_EVALUATED → OK, device_id asc).
- [x] Testy P22a: determinism, marginesy %, NOT_EVALUATED, sortowanie.
- [x] Kontrakt UI: `PROTECTION_INSIGHT_CONTRACT.md`.
- [x] Aktualizacja `docs/INDEX.md`.

---

## 12.12.5. Phase 2.x.7b: PROTECTION CURVES I–t (C-P22) — ETAP++

### 12.12.5.1. Cel fazy

Zaimplementowanie deterministycznej prezentacji krzywych I–t (read‑only) z decyzją normatywną,
statusami PASS/WARNING/FAIL/NOT EVALUATED oraz jawnie pokazanymi marginesami.

### 12.12.5.2. Zakres fazy

**IN SCOPE:**
- Analysis layer: modele, builder, serializer dla C‑P22.
- Render SVG/PDF deterministyczny (log–log).
- Integracja z P24+ (sekcja „Krzywe I–t (jeśli dostępne)”).
- Testy determinismu, sortowania serii i markerów.
- Kontrakt UI w docs/ui.

**OUT OF SCOPE:**
- Nowa fizyka / solver changes.
- Modyfikacja Result API.

### 12.12.5.3. Deliverables

| Plik | Opis | Status |
|------|------|--------|
| `backend/src/analysis/protection_curves_it/` | Modele, builder, serializer, renderery C‑P22 | DONE |
| `backend/tests/analysis/test_protection_curves_it_cp22.py` | Testy determinismu, sortowania, NOT EVALUATED | DONE |
| `docs/ui/PROTECTION_CURVES_IT_SUPERIOR_CONTRACT.md` | Kontrakt UI C‑P22 | DONE |
| `docs/INDEX.md` | Link do kontraktu C‑P22 | DONE |
| `backend/src/analysis/reporting/pdf/p24_plus_report.py` | Sekcja „Krzywe I–t (jeśli dostępne)” | DONE |

### 12.12.5.4. Completed Tasks

- [x] Dodanie pakietu `analysis/protection_curves_it` (DTO, builder, serializer, renderers).
- [x] Deterministyczny SVG/PDF (log–log) z WHY, marginesami i statusami.
- [x] Overlay markerów Ik″/i_p/I_th (jeśli dostępne) z ProofDocument ID.
- [x] Integracja z P24+ (sekcja „Krzywe I–t” + NOT EVALUATED placeholder).
- [x] Testy C‑P22: determinism, sortowanie serii i markerów, NOT EVALUATED.
- [x] Dokumentacja UI: `PROTECTION_CURVES_IT_SUPERIOR_CONTRACT.md`.

---

## 12.13. Phase 2.x.8: PDF REPORT P24+ (ETAP+ SUPERIOR)

### 12.13.1. Cel fazy

Wdrożenie **deterministycznego raportu PDF P24+** klasy **ETAP+**:
- jawna ścieżka decyzyjna (WHY + margines + limit),
- osobna sekcja NOT COMPUTED,
- ranking krytycznych BUS,
- jawny ślad dowodowy (ProofDocument ID + hash),
- deterministyczny PDF (byte-identical).

**INVARIANT:** brak zmian w solverach i Result API.

---

### 12.13.2. Zakres fazy

| W zakresie | Poza zakresem |
|------------|---------------|
| Renderer PDF (backend) | Solver changes |
| Layout P24+ (sekcje stałe) | Frontend/UI |
| Determinism + hash | Krzywe I–t |
| Testy determinism | Zmiany P20/P18 |

---

### 12.13.3. Deliverables

| Plik | Opis | Status |
|------|------|--------|
| `backend/src/analysis/reporting/pdf/` | Renderer PDF P24+ (deterministic) | DONE |
| `backend/tests/analysis/test_pdf_report_p24_plus.py` | Testy: determinism, NOT COMPUTED, WHY, ranking | DONE |
| `docs/ui/PDF_REPORT_SUPERIOR_CONTRACT.md` | Kontrakt raportu P24+ (ETAP+) | DONE |
| `docs/INDEX.md` | Link do kontraktu P24+ | DONE |

---

### 12.13.4. Completed Tasks

- [x] Implementacja deterministycznego renderera PDF P24+ (reportlab, invariant=1).
- [x] Jawna ścieżka decyzyjna: źródło → reguła → wartość → limit → margines → decyzja.
- [x] Sekcja NOT COMPUTED z brakami danych.
- [x] Ranking Top 5 krytycznych BUS (P21).
- [x] Sekcja śladu dowodowego (ProofDocument ID + hash).
- [x] Testy determinism i kompletności sekcji.
- [x] Dodanie `reportlab` do zależności dev/test, aby testy PDF P24+ nie były pomijane w CI.

---

## 12.14. Phase 2.x.9: SENSITIVITY & MARGIN ANALYSIS (P25) — ETAP++

### 12.14.1. Cel fazy

Wdrożenie **deterministycznej analizy wrażliwości i marginesów** (P25) jako wyróżnika ETAP++:
- ranking driverów wpływu na decyzję końcową,
- post‑hoc tylko (bez solverów),
- jawna propagacja NOT COMPUTED,
- integracja z P24+ PDF.

**INVARIANT:** brak zmian w solverach i Result API.

---

### 12.14.2. Zakres fazy

| W zakresie | Poza zakresem |
|------------|---------------|
| DTO + builder + serializer P25 | Recompute fizyki |
| Perturbacje ±Δ% (P/Q, SC, margins, voltage limits) | Zmiany P20/P21/P22 danych źródłowych |
| Determinizm i stabilne hashowanie | UI/Frontend |
| Testy rankingów i marginesów | Solver changes |

---

### 12.14.3. Deliverables

| Plik | Opis | Status |
|------|------|--------|
| `backend/src/analysis/sensitivity/` | Modele, builder, serializer P25 | DONE |
| `backend/tests/analysis/test_sensitivity.py` | Testy P25: determinism, marginesy, NOT COMPUTED | DONE |
| `docs/analysis/SENSITIVITY_ANALYSIS_ETAP_PLUS.md` | Specyfikacja P25 (ETAP++) | DONE |
| `backend/src/analysis/reporting/pdf/p24_plus_report.py` | Sekcja P25 w raporcie PDF | DONE |
| `docs/INDEX.md` | Link do dokumentu P25 | DONE |

---

### 12.14.4. Completed Tasks

- [x] Dodanie pakietu `analysis/sensitivity` (DTO, builder, serializer, determinism).
- [x] Perturbacje ±Δ% dla P/Q, SC, margins oraz limitów napięć (post‑hoc only).
- [x] Ranking top driverów i stabilne hashowanie wyników.
- [x] Jawna propagacja NOT COMPUTED do wyników P25.
- [x] Integracja z PDF P24+ (sekcja P25, hash uwzględnia dane P25).
- [x] Testy P25: stabilność rankingu, matematyka marginesów, NOT COMPUTED.

---

## 12.14.5. Phase 2.x.9a: LOAD FLOW PROOF PACK (P32) + LF SENSITIVITY (P33) — ETAP-killer

**Status:** IN REVIEW — oznaczyć jako DONE po merge.

### 12.14.5.1. Cel

Deterministyczny dowód Load Flow i spadków napięć oraz analiza wrażliwości napięć w trybie post-hoc, bez ingerencji w solvery.

### 12.14.5.2. Deliverables

| Deliverable | Opis | Status |
|-------------|------|--------|
| `backend/src/application/proof_engine/` | ProofType i generator P32 | IN REVIEW |
| `backend/src/analysis/lf_sensitivity/` | Modele, builder, serializer P33 | IN REVIEW |
| `backend/src/analysis/reporting/pdf/p24_plus_report.py` | Sekcja P33 w raporcie PDF | IN REVIEW |
| `docs/proof_engine/P32_LOAD_FLOW_VOLTAGE_PROOF.md` | Specyfikacja P32 | IN REVIEW |
| `docs/analysis/P33_LF_SENSITIVITY_ETAP_KILLER.md` | Specyfikacja P33 | IN REVIEW |
| `backend/tests/proof_engine/test_load_flow_voltage_proof_p32.py` | Testy P32 | IN REVIEW |
| `backend/tests/analysis/test_lf_sensitivity_p33.py` | Testy P33 | IN REVIEW |
| `docs/INDEX.md` | Linki P32 i P33 | IN REVIEW |

### 12.14.5.3. Definition of Done

- [ ] Dowód P32 z deterministyczną kolejnością kroków i weryfikacją jednostek.
- [ ] Analiza P33 z rankingiem driverów oraz NOT COMPUTED.
- [ ] Integracja z PDF P24+ (sekcja P33).
- [ ] Oznaczenie statusu jako DONE po merge.

---

## 12.15. Phase 2.x.10: AUTO RECOMMENDATIONS (P26) — ETAP+++

### 12.15.1. Cel fazy

Wdrożenie **automatycznych rekomendacji post‑hoc** (P26) jako wyróżnika ETAP+++:
- rekomendacja główna (minimalny Δ),
- alternatywy (ranked),
- jawna propagacja NOT COMPUTED,
- integracja z P24+ PDF.

**INVARIANT:** brak zmian w solverach i Result API.

### 12.15.2. Zakres fazy

| W zakresie | Poza zakresem |
|------------|---------------|
| DTO + builder + serializer P26 | Recompute fizyki |
| Estymacja Δ na bazie P25 | Zmiany P20/P21/P22 danych źródłowych |
| Determinizm i stabilne hashowanie | UI/Frontend |
| Testy rekomendacji | Solver changes |

### 12.15.3. Deliverables

| Plik | Opis | Status |
|------|------|--------|
| `backend/src/analysis/recommendations/` | Modele, builder, serializer P26 | DONE |
| `backend/tests/analysis/test_recommendations.py` | Testy P26: determinism, minimal Δ, NOT COMPUTED | DONE |
| `docs/analysis/P26_AUTO_RECOMMENDATIONS_ETAP_PLUS.md` | Specyfikacja P26 (ETAP+++) | DONE |
| `backend/src/analysis/reporting/pdf/p24_plus_report.py` | Sekcja P26 w raporcie PDF | DONE |
| `docs/INDEX.md` | Link do dokumentu P26 | DONE |

### 12.15.4. Completed Tasks

- [x] Dodanie pakietu `analysis/recommendations` (DTO, builder, serializer, determinism).
- [x] Estymacja minimalnych zmian Δ na bazie P25 (post‑hoc only).
- [x] Rekomendacja główna + alternatywy (ranked, deterministic).
- [x] Jawna propagacja NOT COMPUTED do wyników P26.
- [x] Integracja z PDF P24+ (sekcja P26, hash uwzględnia dane P26).
- [x] Testy P26: determinism, minimal Δ, NOT COMPUTED.

---

## 12.16. Phase 2.x.11: SCENARIO COMPARISON (P27) — ETAP+++

### 12.16.1. Cel fazy

Wdrożenie **deterministycznego porównania scenariuszy A/B/C** (P27):
- stabilny ranking ryzyka,
- jawne WHY (dlaczego lepszy/gorszy),
- integracja z P24+ PDF.

**INVARIANT:** brak zmian w solverach i Result API.

### 12.16.2. Zakres fazy

| W zakresie | Poza zakresem |
|------------|---------------|
| DTO + builder + serializer P27 | Recompute fizyki |
| Porównanie P20/P25/P26 | Zmiany P23 |
| Determinizm i stabilne hashowanie | UI/Frontend |
| Testy porównań | Solver changes |

### 12.16.3. Deliverables

| Plik | Opis | Status |
|------|------|--------|
| `backend/src/analysis/scenario_comparison/` | Modele, builder, serializer P27 | DONE |
| `backend/tests/analysis/test_scenario_comparison.py` | Testy P27: ordering stability, winner, NOT COMPUTED | DONE |
| `docs/analysis/P27_SCENARIO_COMPARISON_ETAP_PLUS.md` | Specyfikacja P27 (ETAP+++) | DONE |
| `backend/src/analysis/reporting/pdf/p24_plus_report.py` | Sekcja P27 w raporcie PDF | DONE |
| `docs/INDEX.md` | Link do dokumentu P27 | DONE |

### 12.16.4. Completed Tasks

- [x] Dodanie pakietu `analysis/scenario_comparison` (DTO, builder, serializer, determinism).
- [x] Stabilny ranking ryzyka i jawne WHY dla scenariuszy.
- [x] Jawna propagacja NOT COMPUTED do wyników P27.
- [x] Integracja z PDF P24+ (sekcja P27, hash uwzględnia dane P27).
- [x] Testy P27: stabilny winner, ordering, NOT COMPUTED.

---

## 12.17. Phase 2.x.12: COVERAGE COMPLETENESS SCORE (P28) — ETAP+++

### 12.17.1. Cel fazy

Wdrożenie **liczbowego audytu kompletności analizy** (P28):
- score 0–100,
- lista braków i krytycznych luk,
- jawne kary za NOT COMPUTED,
- integracja z P24+ PDF.

**INVARIANT:** brak zmian w solverach i Result API.

### 12.17.2. Zakres fazy

| W zakresie | Poza zakresem |
|------------|---------------|
| DTO + builder + serializer P28 | Recompute fizyki |
| Skoring oparty o P14/P11–P19/P20/P21/P22/P25/P26 | UI/Frontend |
| Determinizm i stabilne hashowanie | Solver changes |
| Testy audytu | Zmiany w Proof Engine |

### 12.17.3. Deliverables

| Plik | Opis | Status |
|------|------|--------|
| `backend/src/analysis/coverage_score/` | Modele, builder, serializer P28 | DONE |
| `backend/tests/analysis/test_coverage_score.py` | Testy P28: score, gap detection, determinism | DONE |
| `docs/analysis/P28_COVERAGE_COMPLETENESS_SCORE.md` | Specyfikacja P28 (ETAP+++) | DONE |
| `backend/src/analysis/reporting/pdf/p24_plus_report.py` | Sekcja P28 w raporcie PDF | DONE |
| `docs/INDEX.md` | Link do dokumentu P28 | DONE |

### 12.17.4. Completed Tasks

- [x] Dodanie pakietu `analysis/coverage_score` (DTO, builder, serializer, determinism).
- [x] Skoring kompletności 0–100 z karami za NOT COMPUTED i brakujące proof packi.
- [x] Jawna lista braków i krytycznych luk (P14 GAPs).
- [x] Integracja z PDF P24+ (sekcja P28, hash uwzględnia dane P28).
- [x] Testy P28: score determinism, gap detection, stabilny ordering.

---

## 19. Proof Packs Roadmap (P15–P20) — CANONICAL

Poniższa roadmapa jest **jedynym kanonicznym planem** rozwoju Proof Packów.
Wszystkie pakiety pozostają POST-HOC i nie modyfikują solverów ani Result API.

### P15 — Load Currents & Overload Proof Pack

**Status:** DONE | CANONICAL & BINDING

- Prądy robocze LINE / CABLE / TRANSFORMER
- Przeciążenia (%In, %Sn), warianty A/B + $$\Delta$$
- FULL MATH, deterministyczny ProofDocument
- **Prerequisite:** P11.1a, P14

**DoD (target):**
- [x] Prądy obciążenia linii/kabli wyprowadzone z mocy pozornej.

  $$
  I = \frac{S}{\sqrt{3} \cdot U}
  $$

- [x] Przeciążenia linii/kabli (%In) z pełną weryfikacją jednostek.
- [x] Transformator: relacja obciążenia do mocy znamionowej i overload %.

  $$
  \frac{S}{S_n}
  $$

### P16 — Losses & Power Proof Pack (Physics-based)

**Status:** PLANNED | FUTURE

- Straty mocy (nie energia):
  - Linie: $$P = I^{2} R$$
  - Transformatory: $$P = P_{0} + P_{k}$$
- Dane katalogowe jako źródło prawdy
- Brak integracji w czasie
- **Prerequisite:** P11.1a, P14
- **Relacja:** wejście do P17

### P17 — Losses Energy Profile Proof Pack

**Status:** DONE | CANONICAL & BINDING

- Energia strat (profil czasowy)
- Suma dyskretna + wariant stały
- FULL MATH, deterministyczny
- **Prerequisite:** P14

### P18 — Protection Proof Pack (Overcurrent / Selectivity)

**Status:** DONE | CANONICAL & BINDING

- Porównania: $$I_{k}''$$ vs $$I_{cu}$$ / $$I_{dyn}$$ / $$I_{th}$$
- Selektywność (analityczna, bez EMT)
- Zabezpieczenia podstawowe i rezerwowe
- **Prerequisite:** P11.1a, P14, P15
- Deliverables:
   - [x] Generator dowodu P18 (Proof Engine)
   - [x] Rejestr równań i weryfikacja jednostek
   - [x] Widok Proof Inspector: tabele porównań i WHY
   - [x] Testy determinism + warnings
   - [x] Dokumentacja `docs/proof_engine/P18_PROTECTION_PROOF.md`

### P19 — Earthing / Ground Fault Proof Pack (SN)

**Status:** DONE | CANONICAL & BINDING

- Prądy doziemne (1F-Z, 2F-Z)
- Impedancja uziemienia
- Terminologia BINDING: 1F-Z, 2F, 2F-Z oraz **PCC – punkt wspólnego przyłączenia**
- **Prerequisite:** P11.1a, P14
- Deliverables:
   - [x] Generator dowodu P19 (Proof Engine)
   - [x] Rejestr równań i weryfikacja jednostek
   - [x] Widok Proof Inspector: prąd doziemny + opcjonalne napięcie dotykowe
   - [x] Testy determinism + NOT COMPUTED
   - [x] Dokumentacja `docs/proof_engine/P19_EARTHING_GROUND_FAULT_SN.md`

### P20 — Proof Coverage Completion (ETAP / PowerFactory Parity)

**Status:** DONE | CANONICAL & BINDING

- Domknięcie pokrycia względem ETAP / PowerFactory
- Lista FULL / PARTIAL / NOT COVERED
- META-only, bez obliczeń
- **Relacja:** konsumuje P14

---

## P23 — Study / Scenario Orchestration (ETAP++)

**Status:** DONE | CANONICAL & BINDING

**Cel:** wprowadzenie warstwy orchestration Study → Scenario → Run bez zmian solverów
i bez recompute, z deterministycznym śladem audytowym.

**Deliverables (P23):**
- [x] `backend/src/application/study_scenario/` (models, repository, serializer, orchestration)
- [x] Testy determinismu i workflow: `backend/tests/application/test_study_scenario_workflow_p23.py`
- [x] Dokumentacja: `docs/architecture/STUDY_SCENARIO_WORKFLOW_ETAP_PLUS.md`
- [x] Aktualizacja `docs/INDEX.md`

---

**END OF EXECUTION PLAN**

---

## 23. P11c RESULTS BROWSER + A/B COMPARE (UI-ONLY) — DONE

### 23.1 Overview

**P11c** introduces the **Results Browser** (run history tree) and **A/B Comparison UI** for comparing two Study Run results in PowerFactory-style interface.

This is **100% UI-only, read-only** — no physics calculations, no solver invocations, no model mutations.

### 23.2 Implemented Components

| Component | Description | Status |
|-----------|-------------|--------|
| **Run History Tree** | ProjectTree extended with RUN_ITEM nodes in "Wyniki" section | DONE |
| **RunHistoryItem** | Type for run metadata (run_id, case_name, solver_kind, created_at, result_state) | DONE |
| **ResultsComparisonPage** | UI component for A/B run comparison with delta tables | DONE |
| **Comparison API Client** | Frontend client for `/api/comparison/runs` endpoint (P10b) | DONE |
| **NumericDelta Types** | Frontend types matching backend DTOs (delta, percent, sign) | DONE |
| **Polish Labels** | 100% Polish UI labels for all comparison elements | DONE |
| **SLD Comparison Mode** | Documentation for overlay A/B switching (no delta calculation in UI) | DONE |
| **Minimal Tests** | Tests for comparison types, run history sorting, Polish labels | DONE |

### 23.3 Key Invariants

1. **UI-ONLY** — Zero physics calculations in frontend
2. **READ-ONLY** — No model mutations, no result modifications
3. **100% POLISH** — All UI labels in Polish language
4. **DETERMINISTIC** — Run history sorted by created_at DESC (newest first)
5. **BACKEND DELTAS** — All delta calculations performed by P10b backend
6. **NO SLD DELTA** — UI does not calculate overlay delta, only switches between A and B

### 23.4 UI Features

| Feature | Description |
|---------|-------------|
| **Run History in Tree** | "Wyniki" section shows chronological list of runs with status icons (FRESH/OUTDATED) |
| **Run Click** | Opens Results Inspector for selected run (P11b integration) |
| **A/B Selector** | Dropdown selectors for Run A (baseline) and Run B (comparison) |
| **Compare Button** | Triggers comparison via P10b backend API |
| **Delta Tables** | Buses (U_kv, U_pu) and Branches (P_mw, Q_mvar) with delta columns |
| **Show Only Changes** | Checkbox to filter rows with delta ≠ 0 |
| **Status Classification** | IMPROVED (green), REGRESSED (red), NO_CHANGE (gray) |

### 23.5 Files Modified/Created

| Path | Description |
|------|-------------|
| `frontend/src/ui/types.ts` | Added RUN_ITEM node type and run properties to TreeNode |
| `frontend/src/ui/project-tree/ProjectTree.tsx` | Extended with runHistory prop and buildRunNodes() |
| `frontend/src/ui/comparison/types.ts` | Comparison types (NumericDelta, RunComparisonResult, etc.) |
| `frontend/src/ui/comparison/api.ts` | API client for compareRuns() and fetchRunHistory() |
| `frontend/src/ui/comparison/ResultsComparisonPage.tsx` | Main comparison UI component |
| `frontend/src/ui/comparison/SLD_COMPARISON_MODE.md` | Documentation for SLD overlay A/B switching |
| `frontend/src/ui/comparison/__tests__/comparison.test.ts` | Minimal tests for comparison module |
| `frontend/src/ui/__tests__/project-tree-run-history.test.ts` | Tests for run history tree rendering |

### 23.6 API Integration (P10b)

Uses backend comparison endpoint:

```
POST /api/comparison/runs
Request: { "run_a_id": "<uuid>", "run_b_id": "<uuid>" }
Response: RunComparisonResult with node_voltages, branch_powers, short_circuit deltas
```

### 23.7 Tests

- Comparison type exports (Polish labels, colors)
- Run history sorting determinism (created_at DESC)
- Delta sign classification (positive, negative, zero)
- Polish UI labels verification (no English terms)
- ProjectTree RUN_ITEM node structure
- Solver kind Polish labels (PF → "Rozpływ", SC → "Zwarcie")

### 23.8 Documentation

- `SLD_COMPARISON_MODE.md` — How to use SldOverlay in comparison mode
- `RESULTS_BROWSER_CONTRACT.md` — Run history specification (pre-existing)
- `CASE_COMPARISON_UI_CONTRACT.md` — A/B comparison specification (pre-existing)

### 23.9 DoD (Definition of Done)

- [x] "Wyniki" section in ProjectTree shows run history
- [x] Run click opens Results Inspector (P11b)
- [x] ResultsComparisonPage with A/B selectors and Compare button
- [x] Delta tables for Buses and Branches
- [x] 100% Polish UI (all labels, messages)
- [x] Deterministic run sorting (created_at DESC)
- [x] No physics calculations in UI
- [x] No model mutations in RESULT_VIEW mode
- [x] Minimal tests passing
- [x] PLANS.md updated with P11c as DONE

---

## 24. P12a DATA MANAGER PARITY: CASE MANAGER + ACTIVE CASE + MODE BLOCKS — DONE

### 24.1 Overview

**P12a** introduces **PowerFactory-style case management** with:
- Explicit Active Case awareness (always visible bar)
- Case Manager panel (create/clone/delete/rename/activate)
- Operating mode separation: MODEL_EDIT / CASE_CONFIG / RESULT_VIEW
- Hard UI blocks based on operating mode

This is **UI + minimal state management** — no solver invocations, no physics calculations.

### 24.2 Implemented Components

| Component | Description | Status |
|-----------|-------------|--------|
| **App State Store** | Global state for activeProjectId, activeCaseId, activeCaseKind, activeMode, activeRunId | DONE |
| **Active Case Bar** | Always-visible bar with Polish labels (Aktywny przypadek, Typ, Stan wyników) | DONE |
| **Case Manager** | Panel with create/clone/delete/rename/activate actions | DONE |
| **Mode Gate** | Declarative mode-based UI gating components and hooks | DONE |
| **Main Layout** | Layout wrapper with Active Case Bar integration | DONE |

### 24.3 Global State Model

```typescript
interface AppState {
  activeProjectId: string | null;
  activeCaseId: string | null;
  activeCaseKind: 'ShortCircuitCase' | 'PowerFlowCase' | null;
  activeCaseResultStatus: 'NONE' | 'FRESH' | 'OUTDATED';
  activeMode: 'MODEL_EDIT' | 'CASE_CONFIG' | 'RESULT_VIEW';
  activeRunId: string | null;
  caseManagerOpen: boolean;
}
```

### 24.4 Operating Mode Rules

| Mode | Model | Case Config | Calculations | Results |
|------|-------|-------------|--------------|---------|
| **MODEL_EDIT** | MUTABLE | EDITABLE | ALLOWED | VIEW-ONLY |
| **CASE_CONFIG** | READ-ONLY | EDITABLE | BLOCKED | VIEW-ONLY |
| **RESULT_VIEW** | READ-ONLY | READ-ONLY | BLOCKED | FULL ACCESS |

### 24.5 Active Case Bar (Polish UI)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Aktywny przypadek: [SC-001] | Typ: Przypadek zwarciowy | ● Wyniki aktualne │
│ [Zmień przypadek] [Konfiguruj] [Oblicz] [Wyniki]                 [Edycja modelu] │
└─────────────────────────────────────────────────────────────────────────────┘
```

**REGUŁA:** Brak aktywnego przypadku → przycisk [Oblicz] NIEAKTYWNY z komunikatem PL.

### 24.6 Case Manager Actions

| Action | MODEL_EDIT | CASE_CONFIG | RESULT_VIEW |
|--------|------------|-------------|-------------|
| Nowy przypadek zwarciowy | ✓ | ✗ | ✗ |
| Nowy przypadek rozpływowy | ✓ | ✗ | ✗ |
| Klonuj | ✓ | ✗ | ✗ |
| Zmień nazwę | ✓ | ✗ | ✗ |
| Usuń | ✓ | ✗ | ✗ |
| Ustaw jako aktywny | ✓ | ✗ | ✗ |
| Edycja konfiguracji | ✓ | ✓ | ✗ |

### 24.7 Files Added

| Layer | Files |
|-------|-------|
| **App State** | `frontend/src/ui/app-state/store.ts` — Global state store (Zustand) |
| **App State** | `frontend/src/ui/app-state/index.ts` — Module exports |
| **Active Case Bar** | `frontend/src/ui/active-case-bar/ActiveCaseBar.tsx` — Always-visible bar |
| **Active Case Bar** | `frontend/src/ui/active-case-bar/index.ts` — Module exports |
| **Case Manager** | `frontend/src/ui/case-manager/CaseManager.tsx` — Case management panel |
| **Case Manager** | `frontend/src/ui/case-manager/useModeGating.ts` — Mode permission hooks |
| **Case Manager** | `frontend/src/ui/case-manager/index.ts` — Module exports |
| **Mode Gate** | `frontend/src/ui/mode-gate/ModeGate.tsx` — Declarative gating components |
| **Mode Gate** | `frontend/src/ui/mode-gate/useModePermissions.ts` — Permission matrix hooks |
| **Mode Gate** | `frontend/src/ui/mode-gate/index.ts` — Module exports |
| **Layout** | `frontend/src/ui/layout/MainLayout.tsx` — Main layout with case bar |
| **Layout** | `frontend/src/ui/layout/index.ts` — Module exports |
| **App** | `frontend/src/App.tsx` — Updated with MainLayout integration |
| **Tests** | `frontend/src/ui/__tests__/app-state-store.test.ts` — State management tests |
| **Tests** | `frontend/src/ui/__tests__/mode-permissions.test.ts` — Permission matrix tests |

### 24.8 Test Coverage

- Active case state management
- Mode switching and state transitions
- Calculation permission rules (no case, mode, result status)
- Hard block enforcement with Polish messages
- Deterministic case list sorting (name, then id)
- Polish labels verification

### 24.9 DoD (Definition of Done)

- [x] Pasek „Aktywny przypadek" zawsze widoczny, 100% PL
- [x] Case Manager: create/clone/delete/activate działa (UI)
- [x] Tryby MODEL_EDIT/CASE_CONFIG/RESULT_VIEW działają z twardymi blokadami
- [x] Determinizm list i testy blokad PASS
- [x] Jeden PR, brak refaktorów pobocznych
- [x] PLANS.md zaktualizowany: P12a jako DONE

### 24.10 Exclusions (NOT modified)

- ❌ Solvers (no physics)
- ❌ Backend Result API (frozen)
- ❌ white_box_trace
- ❌ Results Inspector/Overlay contracts (P11a) — only consumed
- ❌ PROOF / P11.1+

---

