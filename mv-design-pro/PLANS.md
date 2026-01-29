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

_Versioning note: entries are normalized to 2.22.x to preserve monotonic versioning and avoid legacy 2.19.x references._

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

## 19. Proof Packs Roadmap (P15–P20) — CANONICAL

Poniższa roadmapa jest **jedynym kanonicznym planem** rozwoju Proof Packów.
Wszystkie pakiety pozostają POST-HOC i nie modyfikują solverów ani Result API.

### P15 — Load Currents & Overload Proof Pack

**Status:** CANONICAL | IN PROGRESS

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

**Status:** PLANNED | FUTURE

- Prądy doziemne (1F-Z, 2F-Z)
- Impedancja uziemienia
- Terminologia BINDING: 1F-Z, 2F, 2F-Z oraz **PCC – punkt wspólnego przyłączenia**
- **Prerequisite:** P11.1a, P14

### P20 — Proof Coverage Completion (ETAP / PowerFactory Parity)

**Status:** PLANNED | META

- Domknięcie pokrycia względem ETAP / PowerFactory
- Lista FULL / PARTIAL / NOT COVERED
- META-only, bez obliczeń
- **Relacja:** konsumuje P14

---

**END OF EXECUTION PLAN**
