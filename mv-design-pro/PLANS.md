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
│ PHASE 2: NetworkModel Core (NEXT)                               │
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
│ PHASE 5: Interpretation Layer                                   │
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

---

## 3.5 Phase 1.x: PowerFactory UI/UX Parity (DOC ONLY)

### 3.5.1 Purpose

Unify the mental model of MV-DESIGN-PRO users with DIgSILENT PowerFactory UI/UX conventions through documentation updates.

### 3.5.2 Scope

| In Scope | Out of Scope |
|----------|--------------|
| Documentation updates | Code changes |
| SYSTEM_SPEC.md additions | UI implementation |
| ARCHITECTURE.md additions | Solver modifications |
| New docs/ui/ folder | Model changes |
| PLANS.md update | API changes |

### 3.5.3 Deliverables

| File | Status | Description |
|------|--------|-------------|
| SYSTEM_SPEC.md (Section 18) | DONE | User Interaction Model (PowerFactory-aligned) |
| ARCHITECTURE.md (Section 14) | DONE | PowerFactory UI/UX Parity |
| docs/ui/powerfactory_ui_parity.md | DONE | UX guidelines document |
| docs/ui/wizard_screens.md | DONE | Wizard workflow specification |
| PLANS.md (this section) | DONE | Phase 1.x documentation |

### 3.5.4 Key Additions

1. **User Interaction Model (SYSTEM_SPEC.md)**
   - PF-style Project Tree structure
   - Operational modes (Edit / Case / Results)
   - Wizard = Data Manager equivalence
   - SLD rules (1:1 mapping)
   - PCC NOT in NetworkModel rule
   - Property Grid pattern

2. **PowerFactory UI/UX Parity (ARCHITECTURE.md)**
   - Concept mapping table (PF → MV-DESIGN-PRO)
   - UI behavior patterns
   - Wizard & SLD single model diagram
   - Mode visibility requirements
   - Terminology alignment

3. **docs/ui/powerfactory_ui_parity.md**
   - UX principles
   - Terminology consistency rules
   - Operational mode specifications
   - Interaction patterns
   - SLD conventions
   - Validation feedback

4. **docs/ui/wizard_screens.md**
   - Canonical step sequence
   - Screen specifications (Steps 1-10)
   - Property Grid standard
   - Modal dialog patterns
   - Wizard rules (non-negotiable)
   - Navigation rules

### 3.5.5 Explicitly Out of Scope

The following are NOT part of this phase:

- Implementation of UI components
- Frontend code changes
- Backend API changes
- Solver modifications
- NetworkModel schema changes
- Test code changes
- CI/CD changes

### 3.5.6 Compliance

This phase updates documentation only and does not alter:
- Existing architectural invariants
- Solver contracts (WHITE BOX)
- Case immutability rules
- PCC interpretation layer principle
- NetworkModel singleton principle

---

## 4. Phase 2: NetworkModel Core (PENDING)

### 4.1 Task 2.1: Remove PCC from NetworkGraph

**Location:** `backend/src/network_model/core/graph.py`

**Current state:**
```python
class NetworkGraph:
    ...
    pcc_node_id: str | None = None  # TO BE REMOVED
```

**Target state:**
```python
class NetworkGraph:
    # No PCC - PCC is identified in interpretation layer
```

**Actions:**
- [ ] Remove `pcc_node_id` from NetworkGraph
- [ ] Update all references
- [ ] Move PCC logic to `analyses/boundary.py`

### 4.2 Task 2.2: Add Switch Class

**Location:** `backend/src/network_model/core/switch.py` (NEW)

**Actions:**
- [ ] Create Switch dataclass
- [ ] Define SwitchType enum (BREAKER, DISCONNECTOR, LOAD_SWITCH, FUSE)
- [ ] Define SwitchState enum (OPEN, CLOSED)
- [ ] NO impedance fields
- [ ] Add to NetworkGraph

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
- [ ] Add alias/documentation for Bus = Node
- [ ] Update docstrings
- [ ] Consider rename in next major version

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

## 6. Phase 4: Case Layer (PENDING)

### 6.1 Task 4.1: Case Immutability

**Actions:**
- [ ] Verify Case uses NetworkSnapshot
- [ ] Add immutability enforcement
- [ ] Document case-model relationship

### 6.2 Task 4.2: Result Invalidation

**Actions:**
- [ ] Implement ResultInvalidator
- [ ] Add model change detection
- [ ] Mark results as OUTDATED on change

### 6.3 Task 4.3: Case Directory Structure

**Actions:**
- [ ] Create `backend/src/cases/` if not exists
- [ ] Move/organize case classes
- [ ] Ensure separation from analyses

---

## 7. Phase 5: Interpretation Layer (PENDING)

### 7.1 Task 5.1: Create BoundaryIdentifier

**Location:** `backend/src/analyses/boundary.py` (NEW)

**Actions:**
- [ ] Create BoundaryIdentifier class
- [ ] Implement identify_pcc() method
- [ ] Use heuristics (external grid connection)
- [ ] Document as interpretation, not physics

### 7.2 Task 5.2: PCC Migration

**Actions:**
- [ ] Update SLD to get PCC from BoundaryIdentifier
- [ ] Update wizard to not store PCC in model
- [ ] Remove PCC from export/import core

### 7.3 Task 5.3: Analysis Separation

**Actions:**
- [ ] Verify analyses don't contain physics
- [ ] Document analysis vs solver boundary
- [ ] Add analysis layer tests

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
| Single NetworkModel | Phase 2 | PENDING |
| Bus terminology | Phase 2 | PENDING |
| Switch without impedance | Phase 2 | PENDING |
| Station = logical only | N/A | DONE |
| Case immutability | Phase 4 | PENDING |
| Catalog layer | Phase 3 | PENDING |
| PCC not in model | Phase 5 | PENDING |

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

---

**END OF EXECUTION PLAN**
