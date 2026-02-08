```md
Living Document Declaration: This ExecPlan is a controlled, versioned specification. It must be updated whenever assumptions, boundaries, or invariants change, and it enables a zero-context restart by any engineer.

# ExecPlan-10: Frontend ↔ Backend Data Contracts (Frozen Integration)

## Purpose / Big Picture
Define strict, explicit, and minimal data contracts between frontend and backend so the frontend can operate as a pure engineering interface while the backend remains the single source of truth. This plan closes the frontend/backend integration layer architecturally, enforces the NOT-A-SOLVER rule by contract, and eliminates implicit computation, inference, or coupling.

## Progress
- [ ] INIT: ExecPlan-10 drafted with required sections and contract scope
- [ ] Reviewed for compliance with .agent/PLANS.md structure and required headings
- [ ] Verified against ExecPlan-01 domain invariants and ExecPlan-07 frontend constraints
- [ ] Accepted as the frozen frontend ↔ backend data contract baseline

## Surprises & Discoveries

## Decision Log (Architectural Freezes)
1. All frontend ↔ backend data exchange is snapshot-based; snapshots are immutable and read-only once published.
2. The backend is the sole source of truth for domain state and solver results; the frontend is a read-only consumer except for explicit model-edit actions.
3. Contracts forbid any derived, inferred, aggregated, or computed values crossing the boundary; only explicit, source-of-truth fields are allowed.
4. All identifiers are domain-stable IDs as defined by ExecPlan-01; no frontend-local identifiers are authoritative.
5. Any breach of NOT-A-SOLVER (frontend physics/norm computation or backend dependency on frontend state) is an architectural error.

## Outcomes & Retrospective
(TBD after implementation phase.)

## Context and Orientation
- ExecPlan-01 defines the authoritative domain model, invariants, and snapshot immutability.
- ExecPlan-07 defines frontend architecture and NOT-A-SOLVER constraints.
- ExecPlan-09 defines SLD deterministic projection and read-only consumption of results.
- This plan defines data contracts only; it does not define transport protocols, serialization formats, auth, performance, or implementation details.

## What This Plan IS / IS NOT
**IS:** A frozen specification of the explicit data contracts between frontend and backend for snapshots, solver results, edit actions, and errors.  
**IS NOT:** A transport protocol specification, serialization schema, authentication/authorization design, performance optimization plan, or implementation guide.

## NOW vs LATER Commitments
**NOW:** Freeze minimal, explicit, and auditable data contracts for snapshot exchange, solver results, model-edit actions, and error reporting.  
**LATER:** Implementation details, transport choices, and schema encodings that adhere to these contracts without adding semantics.

## Data Contract Philosophy
### Snapshot-Based Exchange
- All domain data is exchanged as immutable snapshots identified by a stable snapshot ID.
- Snapshots are read-only; once published, they are never mutated.
- Frontend may cache snapshots but must treat them as immutable and refresh on new snapshot IDs.

### Backend Authority vs Frontend Projection
- Backend is the single source of truth for domain state and solver results.
- Frontend only projects, displays, and initiates explicit model-edit actions; it never computes physics, norms, or inferred values.
- Backend solvers never depend on frontend state, UI state, or client-side computations.

### Minimalism and Explicitness
- Contracts include only raw, source-of-truth fields defined in ExecPlan-01 and solver result containers.
- No derived, aggregated, inferred, or normalized values are exchanged.
- Any field not explicitly defined here is forbidden to cross the boundary.

## Domain Snapshot Contract
### What the Frontend Receives
- Immutable NetworkGraph snapshot data for all domain entities (Node, Branch, Transformer, Source, Load, BoundaryNode) including only the canonical attributes defined by ExecPlan-01.
- Snapshot metadata: snapshot ID, creation timestamp, and optional parent snapshot ID (for lineage/audit), as assigned by the backend.
- Deterministic ordering information as defined by ExecPlan-01 (stable entity ordering must be preserved as-is).

### What the Frontend Is Forbidden to Modify
- No in-place edits to snapshot data.
- No implicit mutation of attributes, topology, or in_service flags.
- No creation of local “shadow” domain attributes that are treated as authoritative.

### Snapshot Identity and Versioning Semantics
- Snapshot ID is a stable, backend-assigned identifier and is the only authoritative snapshot reference.
- Snapshots are immutable; a new snapshot ID is issued for any accepted model-edit action.
- Optional parent snapshot ID provides lineage; lineage is read-only and must not be mutated by the frontend.
- Versioning is explicit via snapshot IDs; no implicit “latest” semantics are assumed without a backend-provided reference.

## Solver Results Contract
### How Results Are Exposed
- Solver results are provided as read-only result containers, separate from domain snapshots.
- Result containers reference the snapshot ID they were computed from; no cross-snapshot mixing is allowed.

### How Results Are Keyed
- Results are keyed by snapshot ID and domain entity IDs (as defined by ExecPlan-01).
- Each result record contains only solver-provided raw values and solver-provided metadata (units, references, timestamps).
- Result containers may include a solver run ID to support audit and reproducibility; this ID is backend-assigned.

### White-Box Trace Exposure Rules
- White-box traces are provided verbatim, as produced by solvers, and are read-only.
- Frontend may display traces but must not transform, infer, summarize, or recompute values.
- If no trace is provided, the frontend must not fabricate or infer trace content.

## Model-Edit Action Contract
### How the Frontend Submits Explicit Edit Actions
- The frontend submits explicit model-edit actions against a specific snapshot ID.
- Each action declares intent clearly (e.g., create entity, update attribute, connect entities, set in_service) and includes only required input fields.
- Actions are append-only requests; the frontend must not assume acceptance or apply changes locally.

### What the Backend Accepts or Rejects
- Backend validates actions against ExecPlan-01 invariants and any authoritative domain rules.
- Backend either accepts an action and issues a new snapshot ID, or rejects with explicit, machine-readable error details.
- Backend does not accept actions that depend on frontend-derived or inferred values.

### No Implicit Mutation Guarantees
- Submitting an action does not imply acceptance or mutation.
- Only an explicit backend response with a new snapshot ID represents a successful mutation.
- The frontend must treat all local drafts as provisional until a new snapshot is returned.

## Error & Validation Contract
### What Errors the Frontend May Detect
- Structural completeness for action submission (required fields present, type formats, basic value ranges).
- Referential integrity for action drafts (entity IDs exist in the referenced snapshot).
- UI-level input validation (required fields, basic formatting) without physics or normative rules.

### What Errors the Backend Must Report
- Domain invariant violations (topology consistency, missing required entities, invalid references).
- Solver-specific input invalidity (if solver results are requested for invalid snapshots).
- Action conflicts or stale snapshot references (e.g., action applied to a non-current snapshot).
- Any rejection must include explicit reason codes and human-readable messages.

### No Physics or Normative Validation in Frontend
- Frontend must not validate electrical calculations, norms, or protection logic.
- Any physics or normative validation is strictly backend/solver responsibility.

## Contract Stability & Evolution
### Backward Compatibility Rules
- Existing fields and meanings are frozen once published; changes must be additive.
- Deprecations require an explicit, versioned transition period defined in an updated ExecPlan.
- No breaking changes to identifiers, keying rules, or snapshot immutability are permitted without a new architecturally approved ExecPlan.

### Evolution Without Breaking Frozen Plans
- New fields must be explicitly declared and must not imply derived values or computation.
- Changes must preserve the NOT-A-SOLVER rule and ExecPlan-01 invariants.
- Any contract evolution must update this ExecPlan and be auditable with a decision log entry.

## Validation & Acceptance (Engineering-Verifiable)
- A reviewer can confirm that all frontend-consumed data is snapshot-based, immutable, and keyed by domain IDs.
- A reviewer can confirm that no contract includes derived, inferred, or aggregated values.
- Backend acceptance/rejection outcomes are explicit and auditable through snapshot IDs and error codes.
- A new engineer can implement frontend integration without guessing semantics or computing physics.

## Idempotence and Recovery
- Re-submitting the same action against the same snapshot yields the same accept/reject result (idempotent by snapshot ID).
- Recovery is achieved by reloading the last accepted snapshot and re-requesting required result containers.
- If a snapshot is missing results, the frontend must request or await backend-provided results; it must not recompute.

## Interfaces and Dependencies
- **Depends on:** ExecPlan-01 (Domain Model & IDs), ExecPlan-07 (Frontend Architecture), ExecPlan-09 (SLD Read-Only Consumption).
- **Consumes:** Immutable domain snapshots and read-only solver result containers from backend.
- **Provides:** Explicit model-edit actions and read-only projections within frontend.
- **Guardrails:** NOT-A-SOLVER enforcement, backend authority, and explicit snapshot-based contracts.

## Artifacts and Notes
- This plan is the authoritative, frozen specification for frontend ↔ backend data contracts.
- All future integration work must adhere to these contracts without adding implicit semantics.
```
