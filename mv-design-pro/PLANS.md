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

## 5. Phase 3: Catalog Layer (PENDING)

### 5.1 Task 3.1: Create Catalog Directory

**Actions:**
- [ ] Create `backend/src/network_model/catalog/`
- [ ] Create `types.py` with immutable type classes
- [ ] Create `repository.py` with CatalogRepository

### 5.2 Task 3.2: Formalize Type Classes

**Actions:**
- [ ] Make LineType frozen dataclass
- [ ] Make CableType frozen dataclass
- [ ] Make TransformerType frozen dataclass
- [ ] Add manufacturer, rating fields

### 5.3 Task 3.3: Migrate Type References

**Actions:**
- [ ] Update branch classes to use type_ref
- [ ] Migrate existing type data
- [ ] Update wizard service

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

---

**END OF EXECUTION PLAN**
