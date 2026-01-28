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

**Definition of Done:**
- [x] Charakterystyka Q(U) zdefiniowana z wszystkimi parametrami
- [x] Charakterystyka cosφ(P) zdefiniowana z wszystkimi parametrami
- [x] Równanie wpływu Q na ΔU udokumentowane
- [x] Counterfactual Proof zdefiniowany
- [x] Kroki dowodu Q(U) z mapping keys
- [x] Przykład counterfactual udokumentowany

### 14.4 P11.1c — Zwarcia niesymetryczne (składowe symetryczne)

**Definition of Done:**
- [x] P11.1c SKELETON (structure-only) udokumentowany
- [x] Rejestr równań SC1 (placeholdery, bez matematyki)
- [x] Generator dowodu SC1 (stub, bez obliczeń)
- [x] Testy strukturalne SC1 (brak testów numerycznych)

### 14.5 P11.1d — Proof Inspector UI + Eksport

**Definition of Done:**
- [x] Layout Proof Inspector zdefiniowany
- [x] Sekcje kroku (Wzór/Dane/Podstawienie/Wynik/Weryfikacja) opisane
- [x] Nawigacja (spis, przyciski, skróty) opisana
- [x] Widok podsumowania opisany
- [x] Kontrakty eksportu (LaTeX/PDF/DOCX/Markdown) zdefiniowane
- [x] Tryb read-only udokumentowany
- [x] Komponenty UI wyspecyfikowane
- [x] Wymagania dostępności (a11y) opisane

### 14.6 P11.2 — Proof Inspector UX / UI Parity (PowerFactory-style)

**Definition of Done:**
- [x] Dwupanelowy układ PF (drzewo dowodu + szczegóły kroku)
- [x] Nagłówek PF-style z metadanymi i banerem „Tylko do odczytu"
- [x] Tryby widoku Executive/Engineering/Academic (read-only filtr prezentacji)
- [x] Porównanie A/B dla counterfactual (tabela + szybkie skoki)
- [x] UI eksportu JSON/LaTeX/PDF z deterministyczną nazwą pliku
- [x] Minimalna dostępność: aria-labels, focus outline, nawigacja klawiaturą

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

## 16. Change Log (continued)

| Date | Version | Changes |
|------|---------|---------|
| 2026-01 | 2.11 | P11: Proof Engine / Mathematical Proof Engine documentation (DOC ONLY) |
| 2026-01 | 2.12 | P11.1a MVP: SC3F IEC60909 + VDROP proof specifications |
| 2026-01 | 2.13 | P11.1b-d: Regulation Q(U), asymmetrical SC, UI/export specs |
| 2026-01 | 2.14 | P11 Professor Audit: LaTeX-only policy, I_dyn/I_th mandatory, SC3F Gold Standard |
| 2026-02 | 2.15 | P11.2 Proof Inspector UX/UI parity (PowerFactory-style, read-only) |

---

**END OF EXECUTION PLAN**
