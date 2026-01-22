```md
Living Document Declaration: This ExecPlan is a controlled, versioned specification. It must be updated whenever assumptions, boundaries, or invariants change, and it enables a zero-context restart by any engineer.

# ExecPlan-07: Frontend Architecture (Engineering Interface)

## Purpose / Big Picture
Define the frontend as a first-class engineering interface, comparable in rigor to DIgSILENT / ETAP-class tools, while strictly enforcing the NOT-A-SOLVER rule. This plan freezes the frontend scope, boundaries, and contracts so SLD and Wizard implementations can proceed without architectural guessing and without physics leakage.

## Progress
- [ ] Drafted with required sections and architectural freezes
- [ ] Reviewed for compliance with .agent/PLANS.md structure
- [ ] Verified against ExecPlan-01 domain invariants and NOT-A-SOLVER rule
- [ ] Accepted as the frontend architectural baseline

## Surprises & Discoveries

## Decision Log (Architectural Freezes)
1. The frontend is an engineering interface only; it performs zero physics and zero normative computation.
2. Frontend consumes domain snapshots and solver results read-only; it never mutates domain state implicitly.
3. All domain mutations originate from explicit model-edit actions (Wizard outputs) that create new snapshots.
4. Frontend projections are deterministic, derived from the domain snapshot without reinterpretation.
5. Result visualization is strictly representational and must not re-derive or approximate results.

## Outcomes & Retrospective
(TBD after implementation phase.)

## Context and Orientation
- ExecPlan-01 is the authoritative source of domain semantics and invariants; the frontend must not reinterpret it.
- This plan defines the frontend architecture and contracts, not UI layouts or implementation details.
- This plan does not define SLD rendering algorithms (ExecPlan-09), Wizard workflows (ExecPlan-08), or transport protocols (ExecPlan-10).

## What This Plan IS / IS NOT
**IS:** A frozen architectural specification for the frontend engineering interface, its boundaries, and its read-only contracts with domain and solver results.  
**IS NOT:** A solver, a normative calculator, a UI mockup, a transport specification, or a workflow definition.

## NOW vs LATER Commitments
**NOW:** Freeze frontend role, boundaries, architecture layers, and contracts with domain and solver results.  
**LATER:** Implement SLD projection (ExecPlan-09), Wizard workflows (ExecPlan-08), and transport protocols (ExecPlan-10).

## Frontend Role Definition
### Role and Responsibilities (Engineering Interface)
- Serve as the engineering interface for network modeling, inspection, and result visualization.
- Provide deterministic projections of the domain snapshot for SLD and tabular inspection.
- Facilitate explicit model-edit actions through Wizard-driven workflows (not defined here).
- Provide traceable, auditable views of solver results without interpretation or recomputation.

### Supported Engineering Workflows (by role)
- **System Engineer:** Create and review network model snapshots; verify connectivity and metadata completeness.
- **Protection Engineer:** Inspect solver result containers for protection-relevant parameters without recomputing them.
- **Reviewer/Auditor:** Compare snapshots, verify action history, and inspect solver result traces.

## NOT-A-SOLVER Enforcement
- Frontend performs **ZERO** physics and **ZERO** normative computation.
- Frontend **never** re-derives, approximates, or infers results beyond what solvers provide.
- Frontend **never** mutates domain state implicitly; all modifications are explicit actions that yield new snapshots.
- Frontend **never** constructs hidden state that contradicts the domain model or solver results.
- Any computation beyond structural validation is an architectural error.

## Frontend Architecture Overview
### Logical Layers
1. **Presentation Layer**
   - Pure rendering and interaction surfaces.
   - No domain mutation, no computation beyond display formatting.
2. **Projection Layer**
   - Deterministic, read-only projections of domain snapshots and solver results.
   - Maps domain entities to UI-ready structures without semantic reinterpretation.
3. **Interaction Layer**
   - Captures user intent and produces explicit model-edit actions (Wizard outputs).
   - Does not apply changes directly; actions are sent for domain snapshot creation.

### Separation from Domain and Solvers
- Domain model is consumed read-only from snapshots (ExecPlan-01).
- Solver results are consumed read-only as external result containers keyed by snapshot and entity ID.
- No direct domain mutation or solver invocation occurs within the frontend.

### Deterministic Behavior Requirements
- Given the same domain snapshot and result container, projections are identical across sessions.
- Stable identity and ordering from the domain must be preserved in projections.
- UI state must be derived solely from explicit inputs (snapshot + results + user selections).

## Frontend ↔ Domain Contract
### Read-Only Snapshot Consumption
- Frontend consumes domain snapshots as immutable inputs.
- Projections must respect domain invariants and identifiers without reinterpretation.

### Explicit Model-Edit Actions (Wizard)
- All edits are expressed as explicit actions (create, connect, deactivate, etc.)
- Actions yield a new domain snapshot when accepted by the domain layer.
- The frontend may stage draft actions but cannot apply them locally.

### Snapshot Refresh Semantics
- The frontend must refresh its projections whenever a new snapshot is published.
- Stale projections must be invalidated; no background mutation of the prior snapshot is allowed.

## Frontend ↔ Solver Results Contract
### Read-Only Result Consumption
- Solver result containers are read-only and keyed by snapshot ID and entity identity.
- The frontend must not merge or reinterpret results to create new engineering values.

### Result Visualization Rules
- Results are displayed exactly as provided, with units and metadata preserved.
- White-box traces may be exposed verbatim to support auditability.
- No re-computation, smoothing, or inferred values are allowed.

## Validation & Acceptance (Engineering-Verifiable)
### What the Frontend Validates
- Structural completeness: required fields present for model-edit actions.
- Referential integrity: selected entity IDs exist in the current snapshot.
- User input constraints: basic typing, formatting, and required fields.

### What the Frontend Does NOT Validate
- Physics correctness, normative compliance, or protection coordination.
- Any solver-specific consistency or boundary checking.

### Acceptance Criteria
- Auditors can verify that no UI component performs physics or normative calculations.
- Domain snapshots and solver results are treated as immutable read-only inputs.
- All domain modifications originate from explicit model-edit actions.

## Idempotence and Recovery
- Replaying the same user action sequence against the same snapshot yields identical actions.
- Recovery is achieved by reloading the last valid snapshot and rehydrating projections.
- Draft actions can be discarded without side effects to the domain.

## Interfaces and Dependencies
- **Depends on:** ExecPlan-01 (Domain Model), solver result containers (frozen APIs).
- **Provides to:** SLD projection (ExecPlan-09), Wizard workflows (ExecPlan-08), reporting views (read-only).
- **Invariants:** No hidden domain state, no solver invocation, no implicit mutation.
- **Guardrails:** Deterministic projections and strict read-only consumption.

## Artifacts and Notes
- This plan is the authoritative frontend architectural baseline.
- Future ExecPlans must not contradict the boundaries or contracts established here.
```
