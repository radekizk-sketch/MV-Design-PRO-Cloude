# MV-DESIGN-PRO — System Specification (Canonical)

## 1. Purpose and Authority
This document is the **single source of truth** for architecture, terminology, and system boundaries in MV-DESIGN-PRO.
All other documentation must align with this specification. If any information is ambiguous, it is preserved and flagged as a **risk**.

## 2. Canonical Definitions (Binding)
### 2.1 Solver
- **Solver = pure physics + computational algorithm.**
- **No interpretation** of results.
- **No limits, violations, or normative assessment.**
- **Full white-box trace** is required.

### 2.2 Case
- **Case = scenario of solver usage** and orchestration of computations.
- **No physics.**
- **No interpretation** of solver results.

### 2.3 Analysis
- **Analysis = interpretation** of solver results.
- Responsible for **violations, limits, scoring, normative criteria**.
- **No physics.**
- **No modification** of the model.

### 2.4 Power Flow
- **Power Flow is a physical solver.**
- Belongs to the **solvers** layer.
- **Must not** contain interpretive logic.

### 2.5 Protection
- **Protection is an Analysis.**
- **NOT a solver.**
- **Status: NOT IMPLEMENTED.**

## 3. Invariants (Non-Negotiable)
- **ExecPlan is the only change mechanism.** Update the existing ExecPlan; do not create new ones.
- **White-Box Trace is foundational.**
- **Result API IEC 60909 is frozen:**
  - `ShortCircuitResult`
  - `to_dict()`
  - `white_box_trace`
- **Separation:** `solver` ≠ `case` ≠ `analysis`.
- **Normative language:** IEC / PN-EN.
- **PCC definition:** “**PCC – punkt wspólnego przyłączenia**”.

## 4. As-Is State (Current, Explicit)
### 4.1 Power Flow
- Implementation exists in `backend/src/analysis/power_flow/`.
- **Semantics:** it is a **solver** (pure physics, no interpretation).
- **Risk:** directory placement conflicts with solver layer naming. This is a documentation and semantics issue only; **no code changes are in scope**.

### 4.2 Protection
- **Not implemented.** Any mention of protection functionality is **prospective** only.

### 4.3 Documentation Status
- Documentation previously contained conflicting statements about Power Flow and analysis/solver boundaries.
- This document supersedes those statements.

## 5. Documentation Topology
- **SYSTEM_SPEC.md** — canonical architecture and definitions (this file).
- **README.md** — high-level overview with a link to this specification.
- **docs/** — operational guides and how-to content only (no architectural decisions or normative definitions).

## 6. Risks / Ambiguities
- **Power Flow location vs. semantics:** The implementation resides under `analysis/`, while it is defined as a solver. This mismatch can confuse contributors and tooling.
