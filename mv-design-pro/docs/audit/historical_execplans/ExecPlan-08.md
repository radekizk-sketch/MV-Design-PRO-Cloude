```md
Living Document Declaration: This ExecPlan is a controlled, versioned specification. It must be updated whenever assumptions, boundaries, or invariants change, and it enables a zero-context restart by any engineer.

# ExecPlan-08: Wizard / Model-Edit Actions (Controlled Mutation)

## Purpose / Big Picture
Establish the Wizard as the sole sanctioned pathway for domain model mutation, strictly through explicit model-edit actions that produce new immutable snapshots in the backend. This plan freezes the Wizard’s role, boundaries, and contracts so editing is fully controlled, auditable, and never a solver.

## Progress
- [ ] Drafted with required sections and architectural freezes
- [ ] Reviewed for compliance with .agent/PLANS.md structure
- [ ] Verified against ExecPlan-01 domain invariants and NOT-A-SOLVER rule
- [ ] Accepted as the Wizard architectural baseline

## Surprises & Discoveries

## Decision Log (Architectural Freezes)
1. The Wizard is the only sanctioned pathway for domain mutation, and it only emits explicit model-edit actions.
2. The Wizard is NOT a solver and performs zero physics, zero normative computation, and no inference.
3. Domain mutation occurs only in the backend through creation of new immutable snapshots.
4. Every mutation must be traceable to explicit user intent captured in an action with lineage to a parent snapshot.
5. The Wizard cannot access or depend on hidden state beyond the current snapshot and user-provided inputs.

## Outcomes & Retrospective
(TBD after implementation phase.)

## Context and Orientation
- ExecPlan-01 is the authoritative source of domain semantics and invariants; the Wizard must not reinterpret it.
- ExecPlan-07 defines the frontend architecture and NOT-A-SOLVER rule for UI layers; this plan defines Wizard editing boundaries.
- ExecPlan-10 defines frontend ↔ backend data contracts; this plan defines the semantics and responsibilities of Wizard actions within that contract.
- This plan does not define UI layouts, transport schemas, or any solver logic.

## What This Plan IS / IS NOT
**IS:** A frozen architectural specification for Wizard-driven editing via explicit model-edit actions that yield immutable snapshots.  
**IS NOT:** A solver, a physics engine, a normative validator, a UI flow, a transport protocol, or an implementation guide.

## NOW vs LATER Commitments
**NOW:** Freeze Wizard role, action philosophy, contracts, and non-negotiable NOT-A-SOLVER constraints.  
**LATER:** Implement Wizard UI flows and backend action handling per ExecPlan-10 and ExecPlan-11.

## Wizard Role Definition
### Role and Purpose
- Capture explicit user intent for edits without performing any computation beyond structural checks.
- Emit model-edit actions that describe the intended mutation, referencing the current snapshot and target entity IDs.
- Maintain strict separation from domain mutation logic; the Wizard never applies edits locally.

### Relationship to Frontend, Domain, and Backend
- **Frontend:** Wizard is an interaction layer component that collects user intent and formats explicit actions.
- **Domain:** Wizard consumes snapshots read-only and never mutates domain state directly.
- **Backend:** Wizard submits actions to the backend for validation and snapshot creation.

## NOT-A-SOLVER Enforcement (Wizard-Specific)
- The Wizard performs **ZERO** physics and **ZERO** normative computation.
- The Wizard **never** infers or derives engineering values or defaults from physics or standards.
- The Wizard **never** computes or approximates results; it only relays user intent.
- Any Wizard behavior beyond structural validation is an architectural error.

## Model-Edit Action Principles
- **Intent-Based Edits:** Actions encode user intent (create, connect, update, deactivate) rather than direct mutation of stored state.
- **Snapshot Lineage:** Every action references a parent snapshot ID; acceptance creates a new immutable snapshot.
- **Determinism:** Given the same snapshot and user inputs, the Wizard emits identical actions.
- **Explicitness:** All changes must be named, scoped, and refer to explicit entity IDs and fields; no implicit edits.

## Allowed Wizard Responsibilities
- Collect user inputs and construct explicit model-edit actions.
- Perform structural validation only (required fields present, types valid, IDs exist in current snapshot).
- Provide user-facing warnings about missing required inputs or invalid references.
- Present read-only context from the snapshot to help user decisions.
- Support action drafting, review, and submission without mutating the domain locally.

## Forbidden Wizard Responsibilities
- Any physics computation, normative validation, or rule-based inference (ExecPlan-01, ExecPlan-07).
- Deriving engineering values or auto-filling values based on domain knowledge.
- Mutating domain state directly or locally; only backend snapshot creation is allowed.
- Generating or modifying solver result containers or their interpretation.
- Creating hidden or implicit state that is not represented in explicit actions.

## Wizard ↔ Domain Contract
- Actions must reference a specific parent snapshot ID and explicit entity IDs.
- Actions must declare the intended change set explicitly (field-level intent).
- The Wizard may only read snapshot data; it may not cache or alter domain state.
- No hidden or implicit state: every input affecting an action must be explicit and auditable.

## Wizard ↔ Backend Contract
- **Submission:** Wizard submits action payloads referencing the parent snapshot.
- **Acceptance:** Backend validates domain invariants and, if accepted, returns a new immutable snapshot ID.
- **Rejection:** Backend returns structured validation errors without inference or suggested values.
- **Error Handling:** Wizard displays backend errors verbatim; it must not reinterpret or compute corrections.

## User Interaction Constraints
- Allowed interactions: select entities, input explicit values, confirm action summaries, submit actions.
- Forbidden interactions: auto-correction based on physics, normative suggestions, or inferred defaults.
- The Wizard must not present solver-like recommendations or computed constraints.

## Validation & Acceptance (Engineering-Verifiable)
- Wizard validates only structural and referential integrity of action payloads.
- Backend is the sole authority for domain invariants and snapshot acceptance.
- Auditors can trace every accepted snapshot to a specific action with explicit user inputs.
- No Wizard behavior can be interpreted as solver or normative computation.

## Idempotence and Recovery
- Replaying identical user inputs against the same snapshot yields identical actions.
- Failed submissions do not alter the domain; the Wizard can retry with corrected inputs.
- Recovery is achieved by reloading the last accepted snapshot and rehydrating Wizard context.

## Interfaces and Dependencies
- **Depends on:** ExecPlan-01 (Domain Model), ExecPlan-07 (Frontend Architecture), ExecPlan-10 (Data Contracts), ExecPlan-11 (Validation & Engineering Acceptance).
- **Provides to:** Backend action ingestion and snapshot lineage, audit trails, and Wizard UI flows.
- **Invariants:** NOT-A-SOLVER rule, explicit action-only mutation, snapshot immutability.
- **Guardrails:** No hidden state, no inference, no local domain mutation.

## Artifacts and Notes
- This plan is the authoritative Wizard editing baseline and must not be contradicted by future plans.
- All future Wizard or editing implementations must adhere to explicit model-edit actions and backend snapshot creation.
```
