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
- [x] Audyt PF + indeks dokumentacji + plan czyszczenia docs (`docs/audit/STATE_OF_PROJECT.md`, `docs/audit/ROADMAP.md`, `docs/DOCS_INDEX.md`, `docs/audit/DOC_CLEANUP_PLAN.md`)
- [x] Error scan report (backend/frontend/CI) (`docs/audit/ERROR_SCAN_REPORT.md`)

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

### 6.1 Task 4.1: Case Immutability (DONE)

**Actions (DONE - 2025-03):**
- [x] Verify Case uses NetworkSnapshot bindings
- [x] Add immutability enforcement (read-only guard on snapshot access)
- [x] Add regression tests for immutability and snapshot actions

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

### 6.5 Task 4.5: StudyCaseService UoW lifecycle fix (DONE)

**Location:** `backend/src/application/study_case/service.py`

**Actions (DONE - 2025-03):**
- [x] Wrap all StudyCaseService operations in `with uow_factory() as uow`
- [x] Use `uow.cases` for repositories (no direct CaseRepository construction)
- [x] Rely on UnitOfWork.__exit__ for commit/rollback

### 6.6 Task 4.6: UoW lifecycle scan across backend (DONE)

**Location:** `backend/src/api/`, `backend/src/application/`, `backend/src/infrastructure/`

**Actions (DONE - 2025-03):**
- [x] Scan for UnitOfWork usage without context manager (uow_factory / self._uow_factory)
- [x] Verify all uow.session and uow.<repo> accesses occur inside `with ... as uow`
- [x] No fixes required (0 BUG findings)

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
| Case immutability | Phase 4 | DONE |
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
| 2026-09 | 2.24 | SLD CAD geometry contract (AUTO/CAD/HYBRID + overrides) |

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

## 18. Phase P14a: Protection Library (FOUNDATION, READ-ONLY) — DONE

### 18.1 Cel fazy

Wprowadzenie **podstawowej biblioteki referencyjnej** dla urządzeń zabezpieczeniowych (przekaźniki, bezpieczniki, etc.),
krzywych czasowo-prądowych oraz szablonów nastaw.

**KRYTYCZNE OGRANICZENIA:**
- **READ-ONLY FOUNDATION** — tylko modele danych i przeglądarka
- **NIE** solver / koordynacja / selektywność
- **NIE** fizyka / obliczenia / dobór nastaw
- **NIE** import/export (roadmap: P14b)
- **100% PL** w UI (zgodnie z wizard_screens.md)

### 18.2 Deliverables

| Plik | Opis | Status |
|------|------|--------|
| `backend/src/network_model/catalog/types.py` | Domain models: ProtectionDeviceType, ProtectionCurve, ProtectionSettingTemplate | DONE |
| `backend/src/network_model/catalog/repository.py` | Repository: list/get protection methods | DONE |
| `backend/src/infrastructure/persistence/models.py` | ORM models: ProtectionDeviceTypeORM, ProtectionCurveORM, ProtectionSettingTemplateORM | DONE |
| `backend/src/infrastructure/persistence/repositories/network_wizard_repository.py` | Persistence: list/get protection methods | DONE |
| `backend/src/application/network_wizard/service.py` | Service: list/get protection methods | DONE |
| `backend/src/api/catalog.py` | API endpoints READ-ONLY: `/protection/device-types`, `/protection/curves`, `/protection/templates` | DONE |
| `frontend/src/ui/protection/ProtectionLibraryBrowser.tsx` | UI: Przeglądarka biblioteki zabezpieczeń (100% PL, 3 zakładki) | DONE |
| `frontend/src/ui/protection/types.ts` | TypeScript interfaces | DONE |
| `frontend/src/ui/protection/api.ts` | API client | DONE |
| `backend/tests/test_protection_library.py` | Testy backend: determinism, immutability, get/list | DONE |
| `frontend/src/ui/protection/__tests__/ProtectionLibraryBrowser.test.ts` | Testy frontend: smoke render, filter/sort | DONE |
| `PLANS.md` | Aktualizacja planu | DONE |

### 18.3 Relacje

P14a jest **warstwą foundation** dla przyszłych faz protection:
- **P14b:** Import/Export protection library (governance)
- **P18:** Protection Proof Pack (overcurrent / selectivity) — korzysta z P14a device types

### 18.4 Definition of Done

- [x] Domain models frozen dataclasses z to_dict/from_dict
- [x] Repository z deterministycznym sortowaniem (name_pl → id)
- [x] Persistence (ORM + NetworkWizardRepository) READ-ONLY
- [x] API endpoints READ-ONLY (/protection/device-types, /protection/curves, /protection/templates)
- [x] UI ProtectionLibraryBrowser w 100% PL (Urządzenia, Krzywe, Szablony nastaw)
- [x] Testy backend (immutability, determinism, get/list)
- [x] Testy frontend (smoke render, filter/sort)
- [x] PLANS.md zaktualizowany

---

## 18.5 Phase P14b: Protection Library Governance (manifest+fingerprint, export/import, UI) — DONE

### 18.5.1 Cel fazy

**PowerFactory-grade governance dla Protection Library:**
- Manifest biblioteki (vendor/series/revision/schema_version/fingerprint)
- Deterministyczny eksport JSON z kanonicznym fingerprint (SHA-256)
- Safe import z MERGE/REPLACE modes i gate'ami
- Walidacja referencji (template→device_type, template→curve)
- UI: Export/Import buttons + Manifest panel + Import Report dialog

**SYSTEM LIBRARY:**
- **NIE** koordynacja / solver / fizyka
- **NIE** instancje / Case-dependent data
- **NIE** masowe migracje
- Import/Export działa na **library level** (oddzielenie od Case)

### 18.5.2 Deliverables

| Plik | Opis | Status |
|------|------|--------|
| `backend/src/network_model/catalog/governance.py` | ProtectionLibraryManifest, ProtectionLibraryExport, ProtectionImportReport, fingerprint functions | DONE |
| `backend/src/application/catalog_governance/service.py` | export_protection_library(), import_protection_library() with gates | DONE |
| `backend/src/api/catalog.py` | API endpoints: GET /protection/export, POST /protection/import | DONE |
| `backend/tests/test_protection_library.py` | Tests: determinism, fingerprint, merge/replace gates, ref validation | DONE |
| `frontend/src/ui/protection/api.ts` | exportProtectionLibrary(), importProtectionLibrary() | DONE |
| `frontend/src/ui/protection/ProtectionLibraryBrowser.tsx` | Export/Import buttons, Manifest panel, Import Report dialog | DONE |
| `PLANS.md` | Aktualizacja planu (sekcja 18.5) | DONE |

### 18.5.3 Relacje

P14b jest **governance layer** nad P14a:
- **P14a (foundation):** Domain models, repository, API READ-ONLY
- **P14b (governance):** Manifest+fingerprint, export/import, UI controls
- **P18:** Protection Proof Pack will use P14a+P14b library data

### 18.5.4 Definition of Done

**Backend:**
- [x] ProtectionLibraryManifest with library_id/vendor/series/revision/fingerprint
- [x] Deterministic fingerprint: SHA-256 of canonical JSON (sort_keys, stable ordering)
- [x] Deterministic export: sort_protection_types_deterministically (name_pl → id)
- [x] Safe import MERGE: adds new, checks immutability (same ID must have same data)
- [x] Safe import REPLACE: validates no usage, clears and replaces (safe for P14b)
- [x] Reference validation: template→device_type, template→curve (422 if missing)
- [x] ProtectionImportReport with added/skipped/conflicts/blocked (deterministic order)
- [x] API endpoints: GET /protection/export, POST /protection/import?mode=merge|replace
- [x] Tests: determinism (2x export → same fingerprint), conflict detection, ref validation

**Frontend:**
- [x] Export button: downloads JSON with manifest+fingerprint
- [x] Import button: file upload, MERGE mode default
- [x] Manifest panel: vendor/series/revision/schema_version/fingerprint display
- [x] Import Report dialog: added/skipped/conflicts/blocked sections (100% PL)
- [x] Manifest saved after export/import for display
- [x] READ-ONLY principle: no inline editing, only import/export

**Governance:**
- [x] Manifest tracks library version/vendor/series/revision
- [x] Fingerprint enables audit trail and version tracking
- [x] Import gates prevent data corruption (immutability check)
- [x] Reference validation prevents orphaned templates

---

## 18.6 Phase P14c: Protection Case Config (CONFIG ONLY) — DONE

**Status:** DONE | CANONICAL & BINDING

### 18.6.1. Cel fazy

Umożliwienie przypięcia **ProtectionSettingTemplate** do **StudyCase** z UI konfiguracją nastaw bez fizyki i obliczeń.

### 18.6.2. Zakres fazy

**IN SCOPE:**
- Domain: ProtectionConfig w StudyCase (template_ref, template_fingerprint, overrides, bound_at, library_manifest_ref)
- API: GET/PUT `/api/study-cases/{case_id}/protection-config`
- UI: Panel "Zabezpieczenia" w CASE_CONFIG (wybór szablonu, formularz nastaw, manifest, status zgodności)
- Testy: deterministyka backend + smoke frontend

**OUT OF SCOPE:**
- Solvery / koordynacja / dobór nastaw
- Result API / trace / proof
- Automatyczne migracje Case przy zmianie biblioteki
- PCC w NetworkModel

### 18.6.3. Deliverables

| Plik | Opis | Status |
|------|------|--------|
| `backend/src/domain/study_case.py` | ProtectionConfig w StudyCase | DONE |
| `backend/src/api/study_cases.py` | GET/PUT protection-config endpoints | DONE |
| `backend/src/application/study_case/service.py` | update_protection_config method | DONE |
| `frontend/src/ui/study-cases/ProtectionCaseConfigPanel.tsx` | Panel UI Zabezpieczenia (PL) | DONE |
| `frontend/src/ui/study-cases/api.ts` | API functions dla protection-config | DONE |
| `backend/tests/domain/test_protection_config.py` | Testy deterministyki i walidacji | DONE |
| `frontend/src/ui/study-cases/__tests__/ProtectionCaseConfigPanel.test.ts` | Smoke tests | DONE |

### 18.6.4. Completed Tasks

- [x] Rozszerzenie StudyCase o ProtectionConfig (domain)
- [x] Dodanie API endpoints GET/PUT protection-config
- [x] Implementacja UI panelu Zabezpieczenia w CASE_CONFIG
- [x] Testy backend (deterministyka, serializacja)
- [x] Testy frontend (smoke)
- [x] Aktualizacja PLANS.md (P14c DONE)

---

## 18.7 Phase P15a: Protection Analysis FOUNDATION (backend-only) — DONE

**Status:** DONE | CANONICAL & BINDING

### 18.7.1. Cel fazy

Wdrożenie **warstwy analizy zabezpieczeń nadprądowych** jako **interpretation layer** (NIE solver):
- Konsumuje: SC results + ProtectionCase config (P14c) + Protection Library (P14a/b)
- Produkuje: ProtectionResult + ProtectionTrace (deterministyczne, audytowalne)
- Zero fizyki poza solverami — tylko interpretacja wyników

**KRYTYCZNE OGRANICZENIA:**
- **NIE** modyfikuje NetworkModel
- **NIE** liczy fizyki (tylko interpretuje SC result)
- **NIE** koordynacja selektywności (roadmap: P15b)
- **NIE** UI/Frontend (backend-only)

### 18.7.2. Zakres fazy

**IN SCOPE:**
- ProtectionEvaluationEngine: deterministyczna ocena krzywych I-t
- ProtectionResult: evaluations[], summary (trips/no_trip/invalid)
- ProtectionTrace: audit trail (steps, inputs, outputs)
- ProtectionAnalysisRun: orchestration (CREATE → RUNNING → FINISHED/FAILED)
- API endpoints: POST /protection-runs, POST /execute, GET /results, GET /trace
- Testy: determinism (2x execute → identical JSON), walidacje, smoke

**OUT OF SCOPE:**
- Solvery (IEC 60909 / Power Flow)
- Koordynacja selektywności (P15b+)
- UI/Frontend
- P11 proof engine / LaTeX

### 18.7.3. Deliverables

| Plik | Opis | Status |
|------|------|--------|
| `backend/src/domain/protection_analysis.py` | Domain: ProtectionResult, ProtectionTrace, ProtectionEvaluation, ProtectionAnalysisRun | DONE |
| `backend/src/application/protection_analysis/engine.py` | ProtectionEvaluationEngine: IEC curves (inverse, definite_time) | DONE |
| `backend/src/application/protection_analysis/service.py` | ProtectionAnalysisService: create/execute/get | DONE |
| `backend/src/api/protection_runs.py` | API endpoints: POST /protection-runs, /execute, GET /results, /trace | DONE |
| `backend/tests/test_protection_analysis.py` | Testy: determinism, curve calculations, domain models | DONE |
| `PLANS.md` | Aktualizacja planu (P15a DONE) | DONE |

### 18.7.4. Supported Curve Types (P15a Foundation)

| Curve Kind | Standard | Parameters | Formula |
|------------|----------|------------|---------|
| `inverse` | IEC 60255-151 | A=0.14, B=0.02 | t = TMS × A / ((I/Ip)^B - 1) |
| `very_inverse` | IEC 60255-151 | A=13.5, B=1.0 | t = TMS × A / ((I/Ip)^B - 1) |
| `extremely_inverse` | IEC 60255-151 | A=80.0, B=2.0 | t = TMS × A / ((I/Ip)^B - 1) |
| `definite_time` | - | delay_s | t = delay_s (fixed) |

### 18.7.5. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/{project_id}/protection-runs` | Create new protection analysis run |
| POST | `/protection-runs/{run_id}/execute` | Execute protection analysis |
| GET | `/protection-runs/{run_id}` | Get run metadata |
| GET | `/protection-runs/{run_id}/results` | Get ProtectionResult |
| GET | `/protection-runs/{run_id}/trace` | Get ProtectionTrace |

### 18.7.6. Relacje

P15a jest **warstwą analysis** nad P14a/b/c:
- **P14a (library):** ProtectionDeviceType, ProtectionCurve, ProtectionSettingTemplate
- **P14b (governance):** Manifest, fingerprint, import/export
- **P14c (config):** ProtectionConfig w StudyCase (template_ref, overrides)
- **P15a (analysis):** Evaluation engine, results, trace
- **P15b (comparison):** Selectivity A/B comparison

### 18.7.7. Definition of Done

**Domain:**
- [x] ProtectionEvaluation: device_id, i_fault_a, i_pickup_a, t_trip_s, trip_state (TRIPS/NO_TRIP/INVALID)
- [x] ProtectionResult: evaluations[], summary (trips_count, no_trip_count, invalid_count)
- [x] ProtectionTrace: run_id, sc_run_id, template_ref, overrides, steps[]
- [x] ProtectionAnalysisRun: lifecycle (CREATED → RUNNING → FINISHED/FAILED)

**Engine:**
- [x] IEC inverse curves (SI, VI, EI) with A, B parameters
- [x] Definite-time curve with fixed delay
- [x] Margin calculation: (i_fault / i_pickup - 1) × 100%
- [x] Deterministic: 6 decimal places, no floating-point instability

**Service:**
- [x] create_run(): validate SC run FINISHED, template exists
- [x] execute_run(): run engine, store results + trace
- [x] get_result() / get_trace(): retrieve from storage

**API:**
- [x] POST /protection-runs → 201 Created
- [x] POST /execute → 200 OK with updated status
- [x] GET /results → ProtectionResult JSON
- [x] GET /trace → ProtectionTrace JSON

**Tests:**
- [x] Determinism: 2x execute → identical result + trace JSON
- [x] IEC SI curve: t ≈ 10s at 2x pickup (TMS=1)
- [x] TMS scaling: linear
- [x] No trip below pickup
- [x] Domain serialization roundtrip

---

#### Protection v1 — COMPLETE

**Zakres zrealizowany:**
- biblioteka zabezpieczeń jako SYSTEM (governance, fingerprint, import/export)
- konfiguracja zabezpieczeń w StudyCase
- analiza zabezpieczeń (czasy zadziałania, stany)
- porównanie wariantów A/B + deterministyczny ranking
- Results Inspector + SLD overlay (read-only)
- pełna deterministyka, trace audytowy, lifecycle Run

**Zakres świadomie NIEZAIMPLEMENTOWANY:**
- normowa koordynacja selektywności (P16 — DEFERRED)

**Status:** **PRODUKT GOTOWY (PowerFactory++)**

---

## 18.8 P16 — Normowa koordynacja selektywności (DEFERRED)

**Status:** DEFERRED (świadomie nieimplementowane)

**Zakres (PLANOWANY):**
- definicja stref zabezpieczeń (Protection Zones)
- relacje primary / backup (grading czasowy i/lub prądowy)
- raport selektywności (OK / WARNING / VIOLATION)

**Twarde założenia (NIE DO ZŁAMANIA):**
- brak jakiejkolwiek fizyki sieci (NO solver physics)
- brak modyfikacji wyników zwarć
- analiza oparta wyłącznie na wynikach Protection Analysis (P15)

**Wymagania audytowe:**
- pełna deterministyka wyników
- jawne reguły selektywności (trace decyzji)
- możliwość A/B porównania wariantów selektywności
- raportowalność (UI + eksport)

**Uwaga strategiczna:**
Ten etap wprowadza normatywny osąd inżynierski i wymaga
osobnej decyzji projektowej przed implementacją.

---

### Power Flow PF++ — NOWY FILAR

**Cel filaru:**
Zbudować deterministyczną, audytowalną analizę rozpływu mocy
klasy **wyższej niż PowerFactory**, opartą o:
- Project → Case → Run → Snapshot
- immutable Result API
- pełny white-box trace obliczeń
- A/B comparison jako byt pierwszej klasy

**Twarde założenia (NIE DO ZŁAMANIA):**
- brak uproszczeń względem klasycznego AC Power Flow
- determinism > performance
- fizyka wyłącznie w solverze
- UI i analizy = NOT-A-SOLVER
- brak „magii" i heurystyk bez śladu w trace

---

### P20 — Power Flow v1 (FOUNDATION)

**Zakres (KANONICZNY):**
- solver AC Newton–Raphson
- napięcia w węzłach (V, θ)
- rozpływy P/Q w gałęziach
- straty mocy
- status zbieżności
- pełny trace iteracji

**Integracja:**
- Run / Snapshot
- Results Inspector (tabele)
- SLD overlay (napięcia, obciążenia)
- A/B comparison wariantów Case

**Wykluczenia (NA TEN ETAP):**
- regulatory napięcia (OLTC)
- automatyki
- stany dynamiczne
- harmoniczne

**Status:** DONE

---

**Kolejność dalszych prac (kanoniczna):**
1. P20a — Power Flow Solver + Trace (backend-only) ✅ **DONE**
2. P20b — Results Inspector + SLD Overlay ✅ **DONE**
3. P20c — A/B Comparison + Ranking ✅ **DONE**
4. P20d — Export + Go-Live ✅ **DONE**

**Power Flow v1 — COMPLETE** ✅

---

### P20a — Power Flow v1 Solver + Trace (backend-only)

**Status:** DONE | CANONICAL & BINDING

**Zakres zrealizowany:**
- Deterministyczny AC Newton–Raphson (SLACK/PV/PQ)
- Pełny white-box trace iteracji:
  - `init_state` (V0, θ0)
  - `mismatch_per_bus` (ΔP, ΔQ per bus)
  - `jacobian` (J1..J4 bloki)
  - `delta_state` (Δθ, ΔV)
  - `state_next` (V, θ po aktualizacji)
- `PowerFlowTrace` DTO z pełną strukturą
- `PowerFlowResultV1` (immutable, zamrożone):
  - `bus_results[]`: bus_id, v_pu, angle_deg, p_injected_mw, q_injected_mvar
  - `branch_results[]`: branch_id, p_from_mw, q_from_mvar, p_to_mw, q_to_mvar, losses_p_mw, losses_q_mvar
  - `summary`: total_losses_p_mw, min_v_pu, max_v_pu
- Run lifecycle + cache po `input_hash`
- Dedykowane API endpoints:
  - POST `/projects/{project_id}/power-flow-runs`
  - POST `/power-flow-runs/{run_id}/execute`
  - GET `/power-flow-runs/{run_id}`
  - GET `/power-flow-runs/{run_id}/results`
  - GET `/power-flow-runs/{run_id}/trace`

**Testy:**
- [x] Determinism: 2× execute → identyczny JSON results i trace
- [x] Zbieżność: prosta sieć SLACK+PQ → converged=true
- [x] Failure: brak zbieżności → converged=false, trace kompletny
- [x] Permutacje: zmiana kolejności elementów → identyczny wynik

**Pliki:**
- `network_model/solvers/power_flow_newton.py` (rozszerzony o init_state)
- `network_model/solvers/power_flow_newton_internal.py` (full trace)
- `network_model/solvers/power_flow_trace.py` (NEW)
- `network_model/solvers/power_flow_result.py` (NEW)
- `network_model/solvers/power_flow_types.py` (trace_level option)
- `api/power_flow_runs.py` (NEW)
- `application/analysis_run/service.py` (cache deduplication)
- `tests/test_p20a_power_flow_determinism.py` (NEW)

---

### P20c — Power Flow A/B Comparison + Ranking

**Status:** DONE | CANONICAL & BINDING

**Zakres zrealizowany:**
- Deterministyczne porównanie dwóch PowerFlowRun (A vs B)
- Walidacje: oba runy FINISHED, ten sam project_id
- Bus diffs: delta V, delta angle, posortowane po bus_id
- Branch diffs: delta losses, delta power, posortowane po branch_id
- Ranking problemów z jawnymi regułami:
  1. `NON_CONVERGENCE_CHANGE` (severity 5) — zmiana zbieżności
  2. `VOLTAGE_DELTA_HIGH` (severity 4) — top N największych |delta_v_pu|
  3. `ANGLE_SHIFT_HIGH` (severity 3) — top N największych |delta_angle|
  4. `LOSSES_INCREASED/DECREASED` (severity 2-3) — zmiana strat
  5. `SLACK_POWER_CHANGED` (severity 2) — zmiana mocy bilansowej
- Pełny trace z:
  - `snapshot_id_a/b`, `input_hash_a/b`
  - Jawne progi rankingowe (VOLTAGE_DELTA_THRESHOLD_PU=0.02 etc.)
  - Kroki: MATCH_BUSES → MATCH_BRANCHES → RANK_ISSUES
- Cache: identyczna para (A,B) → ten sam comparison
- A→B != B→A (kierunkowe)

**API Endpoints:**
- POST `/power-flow-comparisons` — create comparison
- GET `/power-flow-comparisons/{id}` — metadata
- GET `/power-flow-comparisons/{id}/results` — full results
- GET `/power-flow-comparisons/{id}/trace` — audit trace

**Frontend:**
- UI read-only (PL), NOT-A-SOLVER
- Zakładki: Szyny – różnice, Gałęzie – różnice, Ranking problemów, Ślad porównania
- Filtrowanie tekstowe
- Sort domyślny = backend (deterministyczny)

**Testy:**
- [x] Determinism: 2× porównanie tej samej pary → identyczny JSON results+trace
- [x] Walidacje błędów 4xx deterministyczne
- [x] Frontend smoke: typy, etykiety PL, stałe

**Pliki:**
- `domain/power_flow_comparison.py` (NEW)
- `application/power_flow_comparison/service.py` (NEW)
- `api/power_flow_comparisons.py` (NEW)
- `frontend/src/ui/power-flow-comparison/` (NEW)
- `tests/domain/test_power_flow_comparison.py` (NEW)

---

### P20d — Power Flow Export + Go-Live (v1 COMPLETE)

**Status:** DONE | CANONICAL & BINDING

**Zakres zrealizowany:**
- Export raportów Power Flow (NOT-A-SOLVER):
  - Single Run: JSON, DOCX, PDF
  - Comparison: JSON, DOCX, PDF
- API Endpoints:
  - GET `/power-flow-runs/{id}/export/json`
  - GET `/power-flow-runs/{id}/export/docx`
  - GET `/power-flow-runs/{id}/export/pdf`
  - GET `/power-flow-comparisons/{id}/export/json`
  - GET `/power-flow-comparisons/{id}/export/docx`
  - GET `/power-flow-comparisons/{id}/export/pdf`
- UI export button (PL): "Eksportuj raport" dropdown
- GO-LIVE checklist: sekcja Power Flow v1 (determinism, trace, NOT-A-SOLVER)
- 100% polskie etykiety w raportach

**NOT-A-SOLVER Compliance:**
- Export używa WYŁĄCZNIE danych z PowerFlowResultV1.to_dict() i PowerFlowTrace.to_dict()
- Brak jakichkolwiek przeliczeń w warstwie export/UI
- Deterministyczny JSON (sort_keys=True)
- UTF-8 encoding mandatory

**Testy:**
- [x] Export JSON: deterministyczny (identyczny dla tego samego run)
- [x] Export comparison JSON: deterministyczny
- [x] UI smoke: przycisk wywołuje eksport

**Pliki:**
- `network_model/reporting/power_flow_export.py` (NEW)
- `network_model/reporting/power_flow_report_docx.py` (NEW)
- `network_model/reporting/power_flow_report_pdf.py` (NEW)
- `api/power_flow_runs.py` (extended: export endpoints)
- `api/power_flow_comparisons.py` (extended: export endpoints)
- `frontend/src/ui/power-flow-results/PowerFlowResultsInspectorPage.tsx` (extended: export button)
- `frontend/src/ui/power-flow-comparison/PowerFlowComparisonPage.tsx` (extended: export button)
- `docs/GO-LIVE-CHECKLIST.md` (extended: Power Flow v1 section)

---

### Power Flow v1 — COMPLETE ✅

**Data ukończenia:** 2026-01

**Zakres Power Flow v1:**
1. **P20a** — Solver + Trace (backend) ✅
2. **P20b** — Results Inspector + SLD Overlay ✅
3. **P20c** — A/B Comparison + Ranking ✅
4. **P20d** — Export + Go-Live ✅

**Analogia do Protection v1:**
- Pełny cykl: solver → results view → comparison → export → checklist
- NOT-A-SOLVER w UI/export
- Determinizm w każdej warstwie
- 100% polskie etykiety

**Kolejne kroki (FUTURE):**
- P16: Losses & Power Proof Pack (DEFERRED)
- P22: Voltage Profile view
- Regulatory/OLTC (FUTURE)

### P21 — Power Flow Proof Pack (Newton-Raphson Academic Proof)

**Status:** DONE | CANONICAL & BINDING

**Data ukończenia:** 2026-01

**Cel:** Akademicka warstwa dowodowa dla Power Flow NR:
- Formalny dowód matematyczny przebiegu iteracji Newton-Raphson
- Pełna możliwość ręcznej weryfikacji (White Box)
- Eksport do LaTeX, PDF, JSON

**Zakres:**
1. **PowerFlowProofDocument** — immutable, READ-ONLY struktura dowodowa
2. **Trace → Proof mapping** — deterministyczne mapowanie PowerFlowTrace → ProofStep[]
3. **Equation Registry** — kanoniczny rejestr równań (P(θ,V), Q(θ,V), Jacobian J₁-J₄)
4. **Eksport LaTeX** — kanoniczny format akademicki
5. **Eksport PDF** — via LaTeX lub ReportLab
6. **Eksport JSON** — strukturalny, audytowy

**Sekcje ProofDocument:**
1. Definicja problemu (sieć, baza mocy, typy węzłów)
2. Równania rozpływu mocy: P(θ,V), Q(θ,V)
3. Metoda Newton–Raphson (postać Jacobiego)
4. Stan początkowy (V₀, θ₀ — z trace)
5. Iteracje (DLA KAŻDEJ iteracji k): ΔP, ΔQ, norma, Jacobian, Δθ, ΔV
6. Kryterium zbieżności
7. Stan końcowy (V, θ, bilans mocy)
8. Weryfikacja (spójność jednostek, brak sprzeczności energetycznych)

**Czego NIE modyfikuje:**
- ❌ Solver NR (zamrożony)
- ❌ PowerFlowResult (zamrożony)
- ❌ Rankingi/interpretacje
- ❌ Normy (to NIE P16)

**Deliverables:**
- [x] `backend/src/network_model/proof/power_flow_proof_document.py` — struktury danych
- [x] `backend/src/network_model/proof/power_flow_equations.py` — rejestr równań
- [x] `backend/src/network_model/proof/power_flow_proof_builder.py` — mapper Trace → Proof
- [x] `backend/src/network_model/proof/power_flow_proof_export.py` — eksport LaTeX/PDF/JSON
- [x] `backend/src/api/power_flow_runs.py` — endpointy /export/proof/{json,latex,pdf}
- [x] `backend/tests/test_p21_power_flow_proof.py` — testy determinizmu

**DoD:**
- [x] PowerFlowProofDocument istnieje
- [x] Trace → Proof mapping kompletny
- [x] Eksport LaTeX + PDF + JSON działa
- [x] Determinizm potwierdzony testami

---

## 19. Proof Packs Roadmap (P15–P20) — CANONICAL

Poniższa roadmapa jest **jedynym kanonicznym planem** rozwoju Proof Packów.
Wszystkie pakiety pozostają POST-HOC i nie modyfikują solwerów ani Result API.

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

### P22 — Power Flow Interpretation Layer

**Status:** DONE | CANONICAL & BINDING

**Cel:** Dodać warstwę interpretacji wyników rozpływu mocy - czytelną inżyniersko, audytowalną, deterministyczną, gotową do A/B porównań.

**KANON (BINDING):**
- Analysis ≠ Solver (ZERO nowych obliczeń fizycznych)
- Interpretacja WYŁĄCZNIE na podstawie `PowerFlowResult`
- Determinizm absolutny
- 100% język polski
- Brak norm, brak „OK / VIOLATION" - tylko severity (INFO / WARN / HIGH)

**Reguły severity (stałe):**
- Voltage: |V - 1.0| < 2% → INFO, 2-5% → WARN, >5% → HIGH
- Branch loading: na podstawie strat (heurystyka)

**Deliverables (P22):**
- [x] `backend/src/analysis/power_flow_interpretation/models.py` - frozen dataclasses
- [x] `backend/src/analysis/power_flow_interpretation/builder.py` - PowerFlowInterpretationBuilder
- [x] `backend/src/analysis/power_flow_interpretation/serializer.py` - deterministic JSON
- [x] API endpoints: GET/POST `/power-flow-runs/{run_id}/interpretation`
- [x] Frontend: zakładka "Interpretacja" w Results Inspector
- [x] Testy determinizmu: `backend/tests/analysis/test_power_flow_interpretation_p22.py`

**Struktura wyniku:**
- `voltage_findings` - obserwacje napięciowe dla każdej szyny
- `branch_findings` - obserwacje obciążenia gałęzi
- `summary` - podsumowanie + ranking top N issues
- `trace` - ślad interpretacji (progi, reguły, źródła danych)

**API:**
- `GET /power-flow-runs/{run_id}/interpretation` - pobiera interpretację (cached)
- `POST /power-flow-runs/{run_id}/interpretation` - tworzy/pobiera interpretację (idempotent)

**UI:**
- Nowa zakładka "Interpretacja" w Power Flow Results Inspector
- Podsumowanie z licznikami HIGH/WARN/INFO
- Ranking najistotniejszych problemów
- Tabele obserwacji napięciowych i gałęziowych
- Ślad interpretacji (audit trail)

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

## 25. P30a UNDO/REDO INFRASTRUCTURE (ROLA BINDING) — DONE

**Typ:** UI-first infrastructure
**Status:** DONE
**Branch:** `claude/rola-binding-ui-MfIO6`
**Cel:** Globalny system UNDO/REDO dla edycji modelu i SLD w standardzie PowerFactory++

### 25.1 Zakres (PILOT)

Zaimplementować **minimalną infrastrukturę UNDO/REDO**:
- Command Pattern (Command interface + HistoryStore)
- Transakcje (grupowanie komend)
- UI (przyciski Cofnij/Ponów + skróty Ctrl+Z/Y)
- Mode gating (aktywne tylko w MODEL_EDIT)
- Testy jednostkowe

**PILOT:** Infrastruktura + UI + przykładowe komendy (PropertyEdit, SymbolMove). Pełna integracja z Property Grid/SLD w P30b+.

### 25.2 Command Pattern Architecture

```
ui/history/
├── Command.ts              # Interface Command, Transaction
├── HistoryStore.ts         # Zustand store (undo/redo stacks)
├── hooks.ts                # React hooks (useUndo, useRedo, etc.)
├── UndoRedoButtons.tsx     # UI components (100% PL)
├── commands/               # Command implementations
│   ├── PropertyEditCommand.ts
│   └── SymbolMoveCommand.ts
├── __tests__/
│   └── HistoryStore.test.ts
├── README.md               # Module documentation
└── index.ts                # Public API
```

### 25.3 Core Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Command interface** | `id`, `name_pl`, `timestamp`, `apply()`, `revert()` | ✓ |
| **HistoryStore** | Zustand store z `undoStack[]`, `redoStack[]`, `activeTransaction` | ✓ |
| **Transactions** | `beginTransaction()`, `commitTransaction()`, `rollbackTransaction()` | ✓ |
| **Mode gating** | Blocked in CASE_CONFIG & RESULT_VIEW, active in MODEL_EDIT | ✓ |
| **UI buttons** | Cofnij/Ponów z tooltips (nazwa ostatniej komendy) | ✓ |
| **Keyboard shortcuts** | Ctrl+Z (Undo), Ctrl+Y / Cmd+Shift+Z (Redo) | ✓ |
| **Stack limits** | Max 100 commands (prevent memory leaks) | ✓ |
| **Polish UI** | 100% PL (etykiety, tooltips, komunikaty) | ✓ |

### 25.4 Command Examples

#### PropertyEditCommand
```typescript
PropertyEditCommand.create({
  elementId: 'bus-1',
  elementName: 'Bus 1',
  fieldKey: 'name',
  fieldLabel: 'Nazwa',
  oldValue: 'Old Name',
  newValue: 'New Name',
  applyFn: async (value) => {
    await updateElement('bus-1', { name: value });
  },
});
```

#### SymbolMoveCommand (with Transaction)
```typescript
beginTransaction('Przesunięcie symboli (3)');

for (const element of selectedElements) {
  const command = SymbolMoveCommand.create({
    elementId: element.id,
    elementName: element.name,
    oldPosition: element.position,
    newPosition: element.newPosition,
    applyFn: async (pos) => {
      await updateSymbolPosition(element.id, pos);
    },
  });
  await executeCommand(command);
}

await commitTransaction(); // All commands = 1 undo operation
```

### 25.5 UI Integration

**Location:** Active Case Bar (po przycisku „Wyniki", przed Mode Indicator)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Aktywny przypadek: [SC-001] | Typ: Przypadek zwarciowy | ● Wyniki aktualne │
│ [Zmień przypadek] [Konfiguruj] [Oblicz] [Wyniki] | [↶ Cofnij] [↷ Ponów] | [Edycja modelu] │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tooltip examples:**
- Cofnij: „Cofnij: Edycja Bus 1.Nazwa"
- Ponów: „Ponów: Przesunięcie symbolu"

### 25.6 Mode Gating Rules

| Mode | UNDO/REDO | Buttons State | Reason |
|------|-----------|---------------|--------|
| **MODEL_EDIT** | ENABLED | Active (if stack not empty) | Editable mode |
| **CASE_CONFIG** | BLOCKED | Disabled | Model read-only |
| **RESULT_VIEW** | BLOCKED | Disabled | Everything read-only |

**Implementation:** Hooks `useUndo()`, `useRedo()` return `isEnabled: false` when mode ≠ MODEL_EDIT.

### 25.7 Transaction Examples

**Single action:** Edit field → 1 command → 1 undo
**Multi-select move:** Move 5 symbols → 1 transaction → 1 undo (all 5 revert)
**Complex edit:** Edit multiple fields → 1 transaction → 1 undo (all fields revert)

### 25.8 Files Added

| Layer | Files |
|-------|-------|
| **History Core** | `frontend/src/ui/history/Command.ts` |
| **History Core** | `frontend/src/ui/history/HistoryStore.ts` |
| **History Core** | `frontend/src/ui/history/hooks.ts` |
| **History UI** | `frontend/src/ui/history/UndoRedoButtons.tsx` |
| **Commands** | `frontend/src/ui/history/commands/PropertyEditCommand.ts` |
| **Commands** | `frontend/src/ui/history/commands/SymbolMoveCommand.ts` |
| **Tests** | `frontend/src/ui/history/__tests__/HistoryStore.test.ts` |
| **Docs** | `frontend/src/ui/history/README.md` |
| **Exports** | `frontend/src/ui/history/index.ts` |
| **Integration** | `frontend/src/ui/active-case-bar/ActiveCaseBar.tsx` (updated) |

### 25.9 Test Coverage

- Command push → apply → undo stack
- Undo → revert → redo stack
- Redo → re-apply → undo stack
- Transaction grouping (multiple commands = 1 undo)
- Clear redo stack on new command (linear history)
- Stack limit enforcement (max 100 commands)
- Empty stack handling (canUndo, canRedo return false)
- Transaction commit/rollback
- Label generation (Polish command names)

### 25.10 Keyboard Shortcuts

| Platform | Undo | Redo |
|----------|------|------|
| Windows/Linux | `Ctrl+Z` | `Ctrl+Y` |
| macOS | `Cmd+Z` | `Cmd+Shift+Z` |

Global keyboard listener in `UndoRedoButtons.tsx` component.

### 25.11 DoD (Definition of Done)

- [x] Command Pattern zaimplementowany (Command interface, HistoryStore)
- [x] Transakcje działają (beginTransaction, commitTransaction)
- [x] UI dodane (przyciski Cofnij/Ponów w Active Case Bar)
- [x] Skróty klawiszowe działają (Ctrl+Z, Ctrl+Y)
- [x] Mode gating działa (blocked w CASE_CONFIG/RESULT_VIEW)
- [x] Testy jednostkowe PASS
- [x] 100% Polish UI (etykiety, tooltips)
- [x] README.md z dokumentacją modułu
- [x] Jeden mały PR (tylko infrastruktura)
- [x] PLANS.md zaktualizowany: P30a jako DONE

### 25.12 Exclusions (NOT modified)

- ❌ Property Grid integration (P30b)
- ❌ SLD integration (P30c)
- ❌ Add/Delete element commands (P30d)
- ❌ Backend persistence (P30e)
- ❌ E2E tests (P30f)
- ❌ Solvers, Result API, Proof/Trace

### 25.13 Next Steps (Roadmap)

- **P30b**: SLD Editor (multi-select, drag, align/distribute) — DONE
- **P30c**: Property Grid Multi-Edit (Apply/Cancel, multi-select) — DONE
- **P30d**: Add/Delete element commands
- **P30e**: Backend persistence (undo across sessions)
- **P30f**: E2E tests (Playwright)

---

## 26. P30c PROPERTY GRID MULTI-EDIT (ROLA BINDING) — DONE

**Priority:** HIGH
**Status:** ✅ DONE
**Branch:** `claude/rola-binding-implementation-jSWjQ`
**Model:** Sonnet 4.5
**Typ:** UI-only, 1 mały PR

### 26.1 Cel (PowerFactory++ / ≥110% PF)

Podnieść Property Grid do standardu PowerFactory++:
- **Multi-edit** (wspólne pola dla wielu obiektów)
- **Inline validation + jednostki**
- **Apply/Cancel** jako **jedna transakcja UNDO/REDO**
- **Synchronizacja z selekcją** (SLD/Tree)
- **Blokady trybów** (CASE_CONFIG/RESULT_VIEW → read-only)

### 26.2 Zakres (MUST)

1. **Multi-edit (core)**:
   - Przy zaznaczeniu N obiektów: pokazuj tylko pola wspólne
   - Różne wartości → placeholder "— (różne)"
   - Zmiana wartości → zastosuj do wszystkich (1 transakcja)

2. **Inline validation + jednostki**:
   - Walidacja natychmiastowa (zakres, typ, required)
   - Jednostki jawnie w nagłówkach/tooltipach (np. kV, MW, Ω)
   - Komunikaty PL, bez modali

3. **Apply/Cancel (transakcje)**:
   - Edycja w grid = draft
   - "Zastosuj" → 1 komenda UNDO (PropertyBatchEditCommand)
   - "Anuluj" → porzuca draft, brak wpisu w historii

4. **Synchronizacja selekcji**:
   - Zmiana selekcji w SLD/Tree → grid się aktualizuje
   - Zmiana w grid → nie zmienia selekcji

5. **Blokady trybów**:
   - CASE_CONFIG/RESULT_VIEW: pola disabled, komunikat PL

### 26.3 Implementacja

**Kluczowe pliki:**

| Plik | Opis |
|------|------|
| `ui/types.ts` | Dodano `MultiSelection`, `MultiEditFieldValue`, `PropertyGridDraft` |
| `ui/selection/store.ts` | Rozszerzono o `selectedElements[]`, `selectElements()`, `getMultiSelection()` |
| `ui/property-grid/PropertyGridMultiEdit.tsx` | Główny component multi-edit z draft state |
| `ui/property-grid/multi-edit-helpers.ts` | Logika wspólnych pól, merge values, "— (różne)" |
| `ui/history/commands/PropertyBatchEditCommand.ts` | UNDO/REDO command dla batch edit |
| `ui/property-grid/PropertyGridContainer.tsx` | Wykrywa multi-select, używa PropertyGridMultiEdit |
| `ui/property-grid/__tests__/multi-edit-helpers.test.ts` | Testy jednostkowe |

**Mechanizm:**

1. **Selection Store**:
   - `selectedElements: SelectedElement[]` (ZAWSZE sortowane dla determinizmu)
   - `selectedElement` (computed: pierwszy element, kompatybilność wsteczna)
   - `selectElements()` (nowy action dla multi-select)
   - `getMultiSelection()` (zwraca `MultiSelection` z common type)

2. **Multi-Edit Logic** (`multi-edit-helpers.ts`):
   - `getCommonFields()`: znajduje pola wspólne dla wszystkich elementów
   - `mergeFieldValues()`: uniform (wszystkie te same) vs mixed (różne)
   - `formatMultiEditValue()`: wyświetla wartość lub "— (różne)"
   - `isMultiEditFieldEditable()`: tylko instance fields, nie type/calculated/audit

3. **PropertyGridMultiEdit**:
   - Draft state: `Map<fieldKey, newValue>`
   - Apply: tworzy `PropertyBatchEditCommand` z wszystkimi zmianami
   - Cancel: porzuca draft
   - Inline validation: blokuje Apply przy błędach

4. **PropertyBatchEditCommand**:
   - Jedna transakcja UNDO/REDO dla wszystkich zmian
   - `apply()`: stosuje `newValue` dla każdego elementu
   - `revert()`: przywraca `oldValue` dla każdego elementu
   - Deterministyczne (sortowane po elementId)

### 26.4 DoD (Definition of Done)

- [x] Multi-edit działa deterministycznie (sortowane IDs)
- [x] Walidacja + jednostki inline
- [x] Apply/Cancel = 1 UNDO/REDO
- [x] Sync z selekcją (selectedElements → PropertyGrid)
- [x] 100% PL (komunikaty, etykiety)
- [x] Blokady trybów (CASE_CONFIG/RESULT_VIEW)
- [x] Testy jednostkowe (multi-edit-helpers)
- [x] Jeden mały PR (UI-only)
- [x] PLANS.md: P30c DONE

### 26.5 Exclusions (NOT modified)

- ❌ Backend (tylko UI changes)
- ❌ Solverów / Result API / Proof
- ❌ Globalnych refaktorów store/router
- ❌ SLD Editor (już działa w P30b)

### 26.6 Next Steps

- **P30d**: Add/Delete element commands (UNDO/REDO)
- **P30e**: Backend persistence (undo across sessions)
- **P30f**: E2E tests (Playwright)
- **Synchronizacja z SLD**: Hook do przekazywania `selectedIds` → `selectedElements`

---

## 27. P30d ISSUE PANEL / VALIDATION BROWSER (ROLA BINDING) — DONE

**Priority:** HIGH
**Status:** ✅ DONE
**Branch:** `claude/rola-binding-ui-0zbgZ`
**Model:** Sonnet 4.5
**Commit:** 5be84d6

### 27.1 Cel (PowerFactory++ / ≥110% PF)

Dodać Issue Panel / Validation Browser jako centralny punkt:
- **Agregacja problemów** (model validation + P22 interpretation + protection)
- **Nawigacja do objektu** (Tree + SLD highlight)
- **Deterministyczny sort** (severity DESC, source, object_ref.id ASC)
- **100% READ-ONLY** (zero nowych obliczeń, tylko agregacja)
- **100% PL** (wszystkie komunikaty po polsku)

### 27.2 Zakres (MUST)

1. **Issue Model (UI)**:
   - Typ `Issue`: unified interface dla wszystkich źródeł
   - Severity: INFO / WARN / HIGH (zgodne z P22 BINDING thresholds)
   - Source: MODEL / POWER_FLOW / PROTECTION
   - Object reference: typ + id + opcjonalnie name
   - Evidence reference (np. "voltage_profile_fig_1")

2. **Backend Endpoint (READ-ONLY)**:
   - `GET /api/issues/study-cases/{case_id}/issues`
   - Agreguje ValidationReport (z failed AnalysisRun) + P22 interpretation
   - Deterministyczny sort
   - Stats: by_severity, by_source, total_count

3. **Issue Panel UI**:
   - Lista issues z filtrem (source, severity)
   - Klik issue → highlight na SLD + nawigacja (Tree)
   - Badge z licznikiem issues
   - Empty state: "Brak problemów – wszystko w porządku! ✓"

4. **SLD Highlight System**:
   - `highlightedIds` w SldEditorStore (niezależne od selection)
   - Kolory według severity:
     - HIGH: czerwony (#dc2626)
     - WARN: żółty (#f59e0b)
     - INFO: niebieski (#3b82f6)
   - Highlight znika po zmianie selekcji/focus

5. **Integracja z trybami**:
   - MODEL_EDIT: nawigacja + możliwość edycji po focus
   - RESULT_VIEW: nawigacja tylko do odczytu (komunikat PL)

### 27.3 Implementacja

**Backend:**

| Plik | Opis |
|------|------|
| `backend/src/api/issues.py` | Endpoint agregacji issues (ValidationReport + P22) |
| `backend/src/api/main.py` | Rejestracja issues router |

**Frontend:**

| Plik | Opis |
|------|------|
| `ui/types.ts` | Dodano `Issue`, `IssueFilter`, `IssueSeverity`, `IssueSource`, `IssueObjectRef` |
| `ui/issue-panel/IssuePanel.tsx` | Główny component z listą + filtrem |
| `ui/issue-panel/IssuePanelContainer.tsx` | Container z fetch + nawigacją |
| `ui/sld-editor/SldEditorStore.ts` | Dodano `highlightedIds`, `highlightSeverity`, `highlightSymbols()`, `clearHighlight()` |
| `ui/sld-editor/SldCanvas.tsx` | Renderowanie highlight z kolorami według severity |
| `ui/app-state/store.ts` | Dodano `issuePanelOpen`, `toggleIssuePanel()` |
| `ui/layout/MainLayout.tsx` | Integracja Issue Panel jako right sidebar |
| `ui/issue-panel/__tests__/IssuePanel.test.tsx` | Testy podstawowe |

**Mechanizm:**

1. **Backend Agregacja**:
   - Pobiera ostatni AnalysisRun dla case
   - Jeśli status=FAILED → parsuje ValidationReport z error_message
   - Jeśli status=FINISHED i typ=PF → pobiera P22 interpretation (cached)
   - Mapuje wszystko do wspólnego formatu Issue
   - Deterministyczny sort: severity_order[severity], source, object_ref.id

2. **Frontend Issue Panel**:
   - Fetch `/api/issues/study-cases/{case_id}/issues` przy zmianie case
   - Wyświetla listę z filtrem (severity, source)
   - Klik issue → `highlightSymbols([object_ref.id], severity)` + nawigacja Tree

3. **SLD Highlight**:
   - Nowy state: `highlightedIds`, `highlightSeverity` w SldEditorStore
   - SymbolRenderer sprawdza `highlighted && highlightSeverity` → ustawia kolor obrysu
   - Priority: highlight > selection > default

4. **Mode Gating**:
   - IssuePanelContainer sprawdza `activeMode`
   - W RESULT_VIEW: po kliknięciu issue wyświetla info "Edycja niedostępna w trybie przeglądania wyników"

### 27.4 DoD (Definition of Done)

- [x] Issue Panel działa jako centralna lista
- [x] Nawigacja do obiektu (Tree + SLD highlight)
- [x] Highlight deterministyczny z kolorami według severity
- [x] Dane tylko READ-ONLY (agregacja bez nowych obliczeń)
- [x] 100% PL (wszystkie komunikaty)
- [x] Jeden mały PR (backend + frontend)
- [x] Testy podstawowe (render, filter, click, sort)
- [x] PLANS.md: P30d DONE

### 27.5 Exclusions (NOT modified)

- ❌ Solverów / Result API / Proof
- ❌ Nowych reguł obliczeniowych
- ❌ Globalnych refaktorów UI
- ❌ Pełna integracja Tree navigation (TODO)
- ❌ Protection findings (TODO)

### 27.6 Next Steps

- **Tree Navigation**: Pełna integracja z ProjectTree (expand + select node)
- **Protection Findings**: Dodać mapowanie protection interpretation
- **ActiveCaseBar Toggle**: Przycisk do otwierania Issue Panel
- **Keyboard Shortcuts**: Skrót Ctrl+Shift+I do toggle Issue Panel
- **E2E Tests**: Playwright testy dla nawigacji + highlight

---

## 27a. P30e KONTEKSTOWA SIATKA WŁAŚCIWOŚCI (ROLA BINDING) — DONE

### 27a.1 Cel (PowerFactory++ / ≥110% PF)

**Role**: Kontekstowa siatka właściwości w standardzie PowerFactory

Zaimplementować **kontekstową siatkę właściwości** z trybami pracy:
- **MODEL_EDIT** (Edycja modelu): pola konstrukcyjne (geometria, typy, parametry stałe)
- **CASE_CONFIG** (Konfiguracja przypadku): pola wariantowe (status, parametry przypadku)
- **RESULT_VIEW** (Wyniki): pola wynikowe (prądy, napięcia, straty) — **100% READ-ONLY**

**KANON**:
- UI = NIE LICZY FIZYKI
- Twarde rozdzielenie trybów pracy
- 100% determinizm (te same akcje → ten sam stan)
- Integracja z UNDO/REDO (P30a)
- Synchronizacja z selekcją (P30b–d)
- 100% język polski

### 27a.2 Zakres (MUST)

#### 1. Tryby pracy (twarde)
- **Edycja modelu (MODEL_EDIT)**: pola konstrukcyjne
- **Case (CASE_CONFIG)**: pola wariantowe
- **Wyniki (RESULT_VIEW)**: pola wynikowe — **100% READ-ONLY**

Każdy tryb:
- Jawnie oznaczony w UI
- Determinuje **widoczność** i **edytowalność** pól

#### 2. Kontekstowość wg typu obiektu
Dla każdego typu (Bus, LineBranch, TransformerBranch, Switch, Source, Load):
- Zdefiniowana **lista pól** widocznych w danym trybie
- Ukryte pola nieistotne (brak "wszystkiego naraz")

Implementacja:
- Mapa kontekstu: `typ_obiektu × tryb → pola[]`
- Bez logiki warunkowej rozproszonej po komponentach

#### 3. Read-only w „Wynikach"
- Wszystkie pola **zablokowane** (editable = false)
- Czytelne etykiety + jednostki
- Komunikat PL: „Tryb wyników — edycja niedostępna. Wszystkie pola są tylko do odczytu."

#### 4. Integracja z UNDO/REDO
- Zmiany w **Edycji** i **Case**:
  - Edycja jako **szkic** (draft state)
  - „Zastosuj" = **jedna transakcja UNDO** (PropertyBatchEditCommand)
  - „Anuluj" = porzucenie szkicu (bez history entry)
- W „Wynikach":
  - Brak transakcji (read-only, no Apply/Cancel)

#### 5. Synchronizacja z selekcją
- Zmiana selekcji (SLD/Drzewo) → aktualizacja siatki
- Zmiana w siatce **nie zmienia selekcji**

#### 6. Walidacja i jednostki
- Walidacja inline (zakres, typ, wymagane)
- Jednostki w nagłówkach/podpowiedziach (kV, MW, Ω)
- Komunikaty wyłącznie po polsku

### 27a.3 Implementacja

#### Frontend: `field-definitions.ts`
```typescript
// P30e: Context-aware field definitions
export function getFieldDefinitionsForMode(
  elementType: ElementType,
  mode: OperatingMode
): PropertySection[]

// Mode-specific rules
function applyModelEditRules(...)   // Konstrukcyjne pola
function applyCaseConfigRules(...)  // Wariantowe pola
function applyResultViewRules(...)  // Wynikowe pola (100% READ-ONLY)
```

**Mapa kontekstowa (typ × tryb → pola)**:

**MODEL_EDIT**:
- identification, state, topology, type_reference, type_params, local_params, electrical_params, audit
- Edytowalne: instance fields (nie type, calculated, audit)

**CASE_CONFIG**:
- identification, state, topology, local_params, electrical_params
- Edytowalne tylko:
  - `in_service` (wszystkie typy)
  - Switch: `state` (OPEN/CLOSED)
  - TransformerBranch: `tap_position`
  - Load: `p_mw`, `q_mvar`, `cos_phi`
  - Source: `sk_mva`, `rx_ratio`

**RESULT_VIEW**:
- identification, state, topology, type_params, local_params, calculated
- **100% READ-ONLY** (wszystkie pola `editable = false`)

#### Frontend: `PropertyGrid.tsx` + `PropertyGridMultiEdit.tsx`
- Używają `getFieldDefinitionsForMode(elementType, mode)`
- W trybie RESULT_VIEW:
  - Komunikat: „Tryb wyników — edycja niedostępna"
  - Apply/Cancel **ukryte** (PropertyGridMultiEdit)
  - Wszystkie pola read-only

#### Frontend: `multi-edit-helpers.ts`
```typescript
// P30e: Now accepts operating mode
export function getCommonFields(
  elements: ElementData[],
  mode: OperatingMode = 'MODEL_EDIT'
): PropertySection[]
```

### 27a.4 Testy

**Plik**: `__tests__/field-definitions.test.ts` (320+ linii, 50+ test cases)

**Pokrycie**:
1. MODEL_EDIT:
   - Bus: includes identification, state, electrical_params, nameplate, audit
   - Bus: excludes calculated (not relevant in MODEL_EDIT)
   - LineBranch: local_params editable (branch_type, length_km)
   - TransformerBranch: tap_position editable
   - Switch: state (OPEN/CLOSED) editable
   - Load: electrical_params editable (p_mw, q_mvar, cos_phi)

2. CASE_CONFIG:
   - Bus: only in_service editable
   - Switch: state (OPEN/CLOSED) editable
   - TransformerBranch: tap_position editable
   - Load: p_mw, q_mvar editable (wariantowe)
   - Source: sk_mva, rx_ratio editable (wariantowe)

3. RESULT_VIEW:
   - All element types: **100% READ-ONLY**
   - Includes calculated fields (loading_percent, i_calculated_a, u_calculated, ikss_ka)
   - Excludes audit, nameplate

4. Determinism:
   - Same inputs → same outputs (field order deterministic)

5. Cross-mode validation:
   - Same object in 3 modes → different field sets
   - MODEL_EDIT has audit, CASE_CONFIG does not
   - RESULT_VIEW has calculated, MODEL_EDIT does not

### 27a.5 DoD (Definition of Done)

- [x] Kontekstowa siatka właściwości działa dla typów i trybów
- [x] Twarde read-only w „Wynikach" (100%)
- [x] UNDO/REDO działa w Edycji i Case (Apply/Cancel)
- [x] Synchronizacja z selekcją (SLD/Drzewo → siatka)
- [x] Walidacja inline i jednostki
- [x] 100% PL (komunikaty, etykiety)
- [x] Jeden mały PR (tylko UI, zero backendu)
- [x] Testy (50+ test cases, 100% coverage dla mode logic)
- [x] PLANS.md: **P30e ZAKOŃCZONE**

### 27a.6 Exclusions (NOT modified)

- ❌ Backendu (zero zmian API)
- ❌ Solverów / Result API / Proof
- ❌ Globalnych refaktorów UI
- ❌ PropertyGridContainer (legacy compatibility maintained)

### 27a.7 Pliki zmodyfikowane

**Frontend**:
- `field-definitions.ts` (+214 lines): `getFieldDefinitionsForMode()`, mode rules
- `PropertyGrid.tsx` (+8 lines): używa `getFieldDefinitionsForMode()`, komunikat read-only
- `PropertyGridMultiEdit.tsx` (+6 lines): używa `getCommonFields(mode)`, komunikat read-only
- `multi-edit-helpers.ts` (+2 lines): `getCommonFields()` przyjmuje `mode`
- `__tests__/field-definitions.test.ts` (+327 lines): 50+ test cases dla trybów

**PLANS.md**:
- Sekcja 27a (P30e) — dokumentacja implementacji

### 27a.8 Integracja z P30a–d

**P30a (UNDO/REDO)**:
- PropertyGrid: Apply → `PropertyBatchEditCommand` → `executeCommand()`
- PropertyGrid: Cancel → discard draft (no history)
- RESULT_VIEW: no Apply/Cancel (read-only)

**P30b–d (Selekcja, Multi-edit)**:
- Zmiana selekcji → `useMultiSelection()` → Property Grid aktualizuje się
- PropertyGridContainer routing: single → PropertyGrid, multi → PropertyGridMultiEdit
- Multi-edit draft: Apply/Cancel działa jak single-edit
- SLD auto-layout: warstwa clearances i anti-overlap (deterministyczna, bez edycji)

### 27a.9 Next Steps

- **Backend persistence** (P30e-backend): Undo across sessions
- **Add/Delete element commands**: UNDO/REDO dla dodawania/usuwania
- **Protection findings**: Integracja z Issue Panel
- **Keyboard shortcuts**: Skróty dla trybów pracy (Ctrl+1/2/3)

---

## 27b. P30f SLD Layout Determinism Tests (ROLA BINDING) — DONE

### 27b.1 Cel

Zapewnienie deterministycznego układu (auto-layout) i routingu połączeń
dla SLD (spine layout), niezależnie od kolejności wejściowej.

### 27b.2 Zakres (MUST)

- Testy deterministyczności auto-layoutu (2× identyczny input)
- Testy deterministyczności routingu (2× identyczny input)
- Niezmienność wyniku względem permutacji wejścia (nodes/edges)
- Snap do siatki (grid) dla layoutu i routingu
- Brak NaN/Infinity w wynikach
- 3 topologie: radialna, gwiazda, mała siatka

### 27b.3 Implementacja

**Frontend Tests**:

- `frontend/src/ui/sld-editor/__tests__/layoutDeterminism.test.ts`

### 27b.4 DoD (Definition of Done)

- [x] Deterministyczny wynik dla powtórzeń
- [x] Permutacje nie wpływają na wynik
- [x] Wszystkie współrzędne na siatce
- [x] Brak NaN/Infinity
- [x] Jeden mały PR (tylko testy)

### 27b.5 Maintenance Notes

- [x] PR-SLD-ETAP-GEOMETRY-FULL (#322): prefer coupler/topology-based busbar section detection, guarded name fallback, false-positive tests.

---

## 27c. PR-SLD-ROUTING-01 Routing korytarze + przeszkody — DONE

### 27c.1 Cel

Ulepszenie routingu SLD (PowerFactory/ETAP-grade):
- omijanie symboli i busbarów,
- stałe korytarze routingu,
- minimalna liczba załamań (I/L/Z + step-out),
- deterministyczny wynik niezależny od kolejności wejścia.

### 27c.2 Zakres (MUST)

- Model przeszkód AABB z marginesem (busbar + symbole)
- Deterministyczne sprawdzanie kolizji segmentów
- Planner I → L → Z → step-out bez losowości
- Normalizacja trasy (snap do siatki, redukcja współliniowych punktów)
- Testy deterministyczności + kolizji (3 nowe fixtures)

### 27c.3 Implementacja

**Frontend**:
- `frontend/src/ui/sld-editor/utils/connectionRouting.ts`
- `frontend/src/ui/sld-editor/__tests__/routingObstacleDeterminism.test.ts`

### 27c.4 DoD (Definition of Done)

- [x] Korytarze routingu + step-out bez losowości
- [x] Brak kolizji z AABB (z marginesem)
- [x] Determinism + permutation invariance
- [x] Grid snapping + brak NaN/Infinity
- [x] Jeden mały PR (routing + testy)

---

## 28. P31 PROJECT IMPORT / EXPORT (ROLA BINDING) — DONE

### 28.1 Context

**Role**: Project Archiving & Transfer

Funkcja pierwszej klasy dla eksportu i importu projektów MV-DESIGN PRO.
Pełny projekt (model + SLD + cases + runs + results + proof + interpretation)
w deterministycznym formacie gotowym do archiwizacji i przenoszenia.

**KANON**:
- Import/Export = NOT-A-SOLVER
- Zero nowych obliczeń
- Determinizm absolutny
- 100% PL
- Kompatybilność wsteczna (versioned format)

### 28.2 Format ProjectArchive

```
ProjectArchive {
  schema_version: "1.0.0"
  format_id: "MV-DESIGN-PRO-ARCHIVE"
  project_meta: {
    id, name, description, schema_version,
    active_network_snapshot_id, pcc_node_id,
    sources, created_at, updated_at, exported_at
  }
  network_model: {
    nodes[], branches[], sources[], loads[], snapshots[]
  }
  sld_diagrams: {
    diagrams[], node_symbols[], branch_symbols[], annotations[]
  }
  cases: {
    study_cases[], operating_cases[], switching_states[], settings
  }
  runs: {
    analysis_runs[], analysis_runs_index[], study_runs[]
  }
  results: {
    study_results[]
  }
  proofs: {
    design_specs[], design_proposals[], design_evidence[]
  }
  interpretations: { cached[] }
  issues: { snapshot[] }
  fingerprints: {
    archive_hash, project_meta_hash, network_model_hash,
    sld_hash, cases_hash, runs_hash, results_hash,
    proofs_hash, interpretations_hash, issues_hash
  }
}
```

**Format fizyczny**: JSON + ZIP (.mvdp.zip)
- `project.json` — pełne archiwum
- `manifest.json` — metadane + hash

### 28.3 Backend API

```
POST /projects/{project_id}/export
  → Response: application/zip (archiwum ZIP)

POST /projects/import
  → Request: multipart/form-data (file, new_name?, verify_integrity?)
  → Response: { status, project_id, warnings, errors, migrated_from_version }

POST /projects/import/preview
  → Request: multipart/form-data (file)
  → Response: { valid, format_id, schema_version, project_name,
               project_description, exported_at, archive_hash, summary }
```

**Walidacje**:
- Wersja schematu (kompatybilność wsteczna w ramach major)
- Integralność hashy (SHA-256)
- Read-only restore (bez przeliczania)

### 28.4 Frontend UI

**Komponenty**:
- `ProjectArchiveDialog` — główny dialog eksportu/importu
- Tryby: export | import | preview
- Drag & drop dla plików ZIP
- Podgląd zawartości archiwum przed importem

**Komunikaty PL**:
- "Eksportuj projekt" / "Importuj projekt"
- "Przeciągnij archiwum tutaj lub wybierz plik"
- "Import zakończony pomyślnie"
- "Błąd integralności sekcji..."
- "Zmigrowano z wersji X do Y"

### 28.5 Testy

**Domain Tests** (`test_project_archive.py`):
- Roundtrip: archive_to_dict → dict_to_archive → identical
- Determinism: 2× export = identical hash
- Integrity: tampered data detected
- Version compatibility: older version accepted, future rejected
- Edge cases: empty archive, unicode, large networks

**Service Integration Tests** (`test_project_archive_service.py`):
- Export creates valid ZIP with project.json + manifest.json
- Export contains all sections (network, cases, runs, results, proofs)
- Export is deterministic (2× export = identical content)
- Import creates new project with new IDs
- Import preserves network structure
- Roundtrip preserves data
- Preview shows content summary
- Error handling (invalid ZIP, missing project.json, nonexistent project)

### 28.6 Files Created

**Backend Domain**:
- `backend/src/domain/project_archive.py`

**Backend Application**:
- `backend/src/application/project_archive/__init__.py`
- `backend/src/application/project_archive/service.py`

**Backend API**:
- `backend/src/api/project_archive.py`
- Modified: `backend/src/api/main.py` (router registration)

**Frontend**:
- `frontend/src/ui/project-archive/types.ts`
- `frontend/src/ui/project-archive/api.ts`
- `frontend/src/ui/project-archive/ProjectArchiveDialog.tsx`
- `frontend/src/ui/project-archive/index.ts`

**Tests**:
- `backend/tests/application/project_archive/__init__.py`
- `backend/tests/application/project_archive/test_project_archive.py`
- `backend/tests/application/project_archive/test_project_archive_service.py`

### 28.7 DoD (Definition of Done)

- [x] Pełny projekt eksportowalny (wszystkie sekcje)
- [x] Import przywraca identyczny stan (z nowymi ID)
- [x] Determinizm potwierdzony testami (2× export = identical)
- [x] Integralność weryfikowana (SHA-256 fingerprints)
- [x] Kompatybilność wsteczna (versioned schema)
- [x] UI działa (PL) — dialog export/import/preview
- [x] Jeden PR
- [x] PLANS.md: P31 DONE

### 28.8 Exclusions (NOT modified)

- ❌ Solverów / obliczenia
- ❌ Wyników (tylko przechowywanie)
- ❌ Proof/trace (tylko przechowywanie)
- ❌ Norm / interpretacji (tylko przechowywanie)
- ❌ Catalog types (READ-ONLY, nie eksportowane)

### 28.9 Next Steps

- **UI Integration**: Dodać przycisk "Eksportuj/Importuj" do MainLayout lub toolbar
- **Catalog Export**: Opcjonalny eksport/import typów biblioteki
- **Incremental Archive**: Eksport tylko zmian od ostatniego archiwum
- **Cloud Backup**: Integracja z cloud storage (S3, GCS)
- **Archive Diff**: Porównanie dwóch archiwów

---

## 29. Infra: /api/health + rozdzielenie API URL (DONE)

**Cel:** smoke checks i jednoznaczna konfiguracja API dla frontendów (dev vs docker).

**Zakres (zrealizowane):**
- `GET /api/health` zwraca `{ "status": "ok" }` bez UoW/DB.
- Vite dev używa `VITE_API_URL_DEV`, build/compose używa `VITE_API_URL`.
- `docker-compose.yml`: ustawione `VITE_API_URL` + `VITE_API_URL_DEV` oraz healthcheck backendu.

---

---

## 30. SLD CAD Geometry Contract — DONE

### 30.1 Cel

Zalegalizowanie geometrii CAD w SLD jako kontraktu danych (bez narzedzi edycji i bez zmian algorytmow layoutu/routingu).

### 30.2 Zakres

- Tryby geometrii: AUTO / CAD / HYBRID
- Dwa zrodla geometrii: auto‑layout + overrides CAD
- Status audytu overrides (VALID/STALE/CONFLICT)
- Deterministyczna serializacja overrides
- Feature flag dla trybu geometrii (bez UI)

### 30.3 Zrealizowane elementy

- [x] Kanoniczny kontrakt `CadOverridesDocument`
- [x] Funkcje: applyGeometryMode, evaluateCadOverridesStatus, deterministyczna serializacja
- [x] Stan UI: tryb geometrii + status overrides (bez narzedzi edycji)
- [x] Testy jednostkowe kontraktu
- [x] Dokumentacja: `docs/ui/SLD_CAD_KANON.md`

### 30.4 Wykluczenia

- ❌ Brak narzedzi edycji w UI
- ❌ Brak zmian w algorytmach auto‑layoutu lub routingu
- ❌ Brak migracji backendu

---

## 30a. PR-SLD-CAD-TOOLS-01 Minimalne narzędzia CAD w SLD — DONE

### 30a.1 Cel

Wdrożenie minimalnych narzędzi edycji CAD geometrii w SLD (drag, bends, reset, status)
z zachowaniem deterministyczności i bez zmian topologii oraz backendu.

### 30a.2 Zakres (MUST)

- Drag & drop symboli z snap-to-grid (tylko geometria)
- Edycja łamań połączeń (dodaj/usuń/przesuń punkt)
- Reset do AUTO (element i globalnie)
- Widoczny status overrides: VALID/STALE/CONFLICT (PL)

### 30a.3 Implementacja

**Frontend:**

| Plik | Opis |
|------|------|
| `frontend/src/ui/sld-editor/SldCanvas.tsx` | Integracja CAD geometrii, bend handles, status overrides |
| `frontend/src/ui/sld-editor/SldToolbar.tsx` | Akcje CAD: dodaj/usuń bend, reset element/global |
| `frontend/src/ui/sld-editor/SldEditor.tsx` | Widoczny status CAD w nagłówku |
| `frontend/src/ui/sld-editor/SldEditorStore.ts` | Akcje i stan overrides, reset, status |
| `frontend/src/ui/sld-editor/utils/connectionRouting.ts` | Obsługa bends overrides w routingu |

**Testy:**

| Plik | Opis |
|------|------|
| `frontend/src/ui/sld-editor/__tests__/SldEditorStore.test.ts` | Testy overrides (drag/bends/reset) |
| `frontend/src/ui/sld-editor/__tests__/useSldDragCad.test.tsx` | Test drag end + zapis overrides |

### 30a.4 DoD (Definition of Done)

- [x] CAD działa tylko przy `sldCadEditingEnabled` i trybie != AUTO
- [x] Snap-to-grid zawsze aktywny dla CAD
- [x] Drag node zapisuje overrides + status
- [x] Bends edytowalne i deterministyczne
- [x] Reset elementu i globalny
- [x] Status VALID/STALE/CONFLICT widoczny w UI (PL)
- [x] Testy jednostkowe + test interakcji drag end

### 30a.5 Wykluczenia

- ❌ Brak persistence do backendu
- ❌ Brak edycji topologii
- ❌ Brak zmian w solverach

---

## 30b. PR-SLD-FIT-VIEW-01 „Dopasuj do schematu” (fit-to-content) — DONE

### 30b.1 Cel

Zapewnić deterministyczną akcję **„Dopasuj do schematu”** w SLD (fit-to-content) — tylko sterowanie viewportem,
bez zmian topologii/modelu.

### 30b.2 Zakres (MUST)

- Przycisk „Dopasuj do schematu” w toolbarze SLD (PL tooltip/aria).
- Deterministyczne wyliczenie viewportu na podstawie bbox symboli + bendów połączeń.
- Margines z tokenu `ETAP_GEOMETRY.view.fitPaddingPx`, zaokrąglanie zoom/pan.
- (NICE) skrót klawiszowy: `F`.

### 30b.3 Screenshot workflow (KANON)

Przed wykonaniem screenshotu SLD **zawsze**:

1. Kliknij „Dopasuj do schematu”.
2. Następnie wykonaj screenshot.

Przykład:

```bash
VITE_FF_SLD_CAD_EDITING_ENABLED=true npm run dev
# ręcznie kliknij: "Dopasuj do schematu"
npx playwright screenshot --viewport-size=2560,1440 http://localhost:5173 sld_screenshot_full_fit.png
```
