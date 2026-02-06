# MV-DESIGN-PRO Agent Governance

**Version:** 3.0
**Status:** CANONICAL & BINDING
**Authority:** SYSTEM_SPEC.md > ARCHITECTURE.md > AGENTS.md > PLANS.md

---

## 1. Document Hierarchy

| Document | Purpose | Authority |
|----------|---------|-----------|
| **SYSTEM_SPEC.md** | Canonical system specification | BINDING (highest) |
| **ARCHITECTURE.md** | Technical architecture reference | BINDING |
| **AGENTS.md** | Agent governance rules (this file) | BINDING |
| **PLANS.md** | Operational status & next steps | LIVING |

In case of conflict: SYSTEM_SPEC.md wins. No other document overrides these four.

---

## 2. Immutable Rules

### 2.1 NOT-A-SOLVER Rule

Only dedicated solvers compute physics. Everything else is forbidden from physics:

| Component | Layer | Physics Allowed |
|-----------|-------|----------------|
| IEC 60909 Short Circuit | Solver | YES |
| Newton-Raphson Power Flow | Solver | YES |
| Protection | Analysis | NO |
| Proof Engine | Interpretation | NO |
| Wizard | Application | NO |
| SLD | Application | NO |
| Frontend/Reporting | Presentation | NO |
| Validation | Application | NO |

### 2.2 WHITE BOX Rule

All solvers MUST:
- Expose every intermediate value (Y-bus, Z-thevenin, Jacobian)
- Provide full calculation trace
- Enable manual numerical audit
- Document all assumptions

FORBIDDEN: black-box solvers, hidden corrections, undocumented simplifications.

### 2.3 Single Model Rule

- ONE NetworkModel per project (singleton)
- Wizard and SLD edit THE SAME model instance
- No shadow models, no duplicate data stores

### 2.4 Case Immutability Rule

- Case CANNOT mutate NetworkModel
- Case stores ONLY calculation parameters (configuration)
- Multiple Cases reference one Model (read-only view)
- Model change invalidates ALL case results

### 2.5 PCC Prohibition Rule

- PCC is NOT in NetworkModel (it is interpretation, not physics)
- PCC belongs ONLY in Analysis/Interpretation layer (BoundaryIdentifier)

### 2.6 Frozen Result API Rule

- ShortCircuitResult and PowerFlowResult APIs are FROZEN
- Changes require major version bump
- Proof Engine reads results READ-ONLY

### 2.7 Determinism Rule

- Same input MUST produce identical output
- Solver results, proof documents, exports must be deterministic
- SHA-256 fingerprints must be stable

---

## 3. Layer Boundaries

```
PRESENTATION ─── Frontend, Reports, Export (NO physics, NO model mutation)
     │
APPLICATION ──── Wizard, SLD, Validation (NO physics)
     │
DOMAIN ────────── NetworkModel, Catalog, Case (model mutation HERE ONLY)
     │
SOLVER ────────── IEC 60909, Newton-Raphson (PHYSICS HERE ONLY, WHITE BOX)
     │
INTERPRETATION ── Analysis, Proof Engine, Boundary (INTERPRETATION ONLY)
```

Cross-layer violations are architectural regressions requiring immediate fix.

---

## 4. Execution Protocol

### 4.1 Before Implementation

1. Read SYSTEM_SPEC.md
2. Check PLANS.md for current priorities
3. Verify no layer boundary violations
4. Verify no frozen API modifications

### 4.2 During Implementation

1. Preserve frozen Result APIs
2. Maintain deterministic behavior
3. Keep WHITE BOX traceability
4. Do not add PCC to NetworkModel
5. Do not add physics to non-solver layers
6. Do not create shadow data models

### 4.3 After Implementation

1. Update PLANS.md with completed work
2. Run full test suite (backend + frontend)
3. Verify WHITE BOX trace integrity
4. Create focused, small PRs

---

## 5. Prohibited Actions

### 5.1 NEVER

- Add PCC/boundary concepts to NetworkModel
- Add physics calculations to non-solver components
- Create black-box calculations
- Modify frozen Result APIs without version bump
- Create shadow/duplicate data models
- Bypass NetworkValidator before solver execution
- Use project codenames (P7, P11, P14, etc.) in UI-visible strings
- Create "basic UI" and "advanced UI" as separate interfaces

### 5.2 ALWAYS

- Maintain WHITE BOX traceability in solvers
- Preserve deterministic behavior
- Use Polish labels in UI
- Use IEC/PN-EN normative terminology
- Test solver changes with numerical audit
- Update PLANS.md after completing work

---

## 6. AI Agent Instructions

### 6.1 Context Loading

Before any implementation:
1. Read SYSTEM_SPEC.md (canonical truth)
2. Read ARCHITECTURE.md (layer details)
3. Read PLANS.md (current status)
4. Check relevant code before proposing changes

### 6.2 Behavioral Rules

1. Do not invent scope beyond the plan
2. Do not add features not requested
3. Default to "do not change" when uncertain
4. Reference SYSTEM_SPEC.md for architectural questions
5. Preserve all existing functionality (no regressions)
6. Follow existing code patterns and conventions

### 6.3 Proof Engine Rules (BINDING)

1. Take definitions, JSON schemas, LaTeX equations LITERALLY
2. Do NOT modify solvers or Result API
3. Use mapping keys literally in implementation
4. Maintain determinism: same run_id = identical proof output
5. Proof step format: Formula > Data > Substitution > Result > Unit Check
6. LaTeX block format ONLY: `$$...$$` (no inline `$...$`)
7. I_dyn and I_th are MANDATORY in every SC3F proof

---

## 7. Escalation

If any rule conflict is detected:
1. STOP implementation
2. Document conflict in PLANS.md
3. Request architectural review
4. Do not proceed until resolved

---

**END OF AGENT GOVERNANCE**
