```md
Living Document Declaration: This ExecPlan is a controlled, versioned specification. It must be updated whenever assumptions, boundaries, or invariants change, and it enables a zero-context restart by any engineer.

# ExecPlan-11: Validation & Engineering Acceptance

## Purpose / Big Picture
Define how MV-DESIGN-PRO is validated and accepted as a production-grade engineering tool through observable behavior and artifacts, independent of internal implementation details. This plan establishes engineering-driven acceptance, ensures compliance with frozen ExecPlans, and enforces the NOT-A-SOLVER rule through black-box observable evidence.

## Progress
- [ ] INIT: ExecPlan-11 drafted with required sections and scope
- [ ] Reviewed for compliance with .agent/PLANS.md structure and required headings
- [ ] Verified alignment with ExecPlan-01, ExecPlan-07, ExecPlan-09, and ExecPlan-10 constraints
- [ ] Accepted as the validation and acceptance baseline

## Surprises & Discoveries

## Decision Log (Architectural Freezes)
1. Engineering acceptance is behavioral and artifact-based; no criterion references internal code structure.
2. Validation is layered across domain, solver results, frontend, SLD, and data contracts, each with observable inputs/outputs.
3. NOT-A-SOLVER compliance is validated by observable absence of physics computation in frontend and SLD, with explicit failure signatures if violated.
4. Acceptance artifacts are required evidence and must be auditable without code access.
5. Regression detection is defined by observable behavioral drift against frozen invariants and artifacts.

## Outcomes & Retrospective
(TBD after validation adoption and execution.)

## Context and Orientation
- ExecPlan-01 defines the authoritative domain model, invariants, and snapshot immutability.
- ExecPlan-07 defines frontend architecture and NOT-A-SOLVER constraints.
- ExecPlan-09 defines SLD deterministic projection and read-only consumption of results.
- ExecPlan-10 defines frozen frontend ↔ backend data contracts.
- This plan defines validation and acceptance only; it does not define test code, CI/CD, performance benchmarks, or solver numerical tolerances.

## What This Plan IS / IS NOT
**IS:** A behavior- and artifact-driven validation and acceptance standard for MV-DESIGN-PRO as an engineering tool. It specifies how engineers and auditors verify correctness, NOT-A-SOLVER compliance, and frozen-plan adherence without internal implementation knowledge.  
**IS NOT:** A unit testing framework, CI/CD design, performance benchmarking plan, numerical tolerance specification, or implementation guide.

## NOW vs LATER Commitments
**NOW:** Define validation philosophy, layers, acceptance scenarios, NOT-A-SOLVER validation, regression detection, and required artifacts.  
**LATER:** Implementation of tooling, automation, and operational processes that collect these artifacts without altering meaning.

## Validation Philosophy
- **Correctness in MV-DESIGN-PRO** means: the system exhibits engineering-meaningful behavior consistent with frozen domain invariants, delivers solver outputs as authoritative results, and preserves deterministic, read-only projections in the frontend and SLD.
- **Engineering acceptance** is not a test suite outcome; it is a human engineer’s observable confirmation that inputs and outputs align with domain expectations and frozen ExecPlans, evidenced by artifacts.
- **No internal dependence:** Validation must not depend on code internals, private data structures, or algorithm details. Only documented interfaces, snapshots, results, and artifacts are admissible evidence.

## Validation Layers
### 1) Domain Validation (Behavioral)
- Validate domain invariants by exercising model edits and observing acceptance/rejection responses and resulting snapshots.
- Evidence must show snapshot immutability, stable IDs, and invariant enforcement as defined by ExecPlan-01.

### 2) Solver Result Validation (Black-Box + White-Box)
- **Black-Box:** Provide domain snapshots to solver interface and observe solver outputs and result containers; confirm outputs are referenced to snapshot IDs and are consumable as authoritative results.
- **White-Box:** Verify that solver-produced traces (if available) are presented verbatim and are consistent with the outputs, without frontend or SLD transformation.
- Validation does not define numerical tolerances; it validates provenance, determinism, and reference integrity.

### 3) Frontend Validation (Engineering Interface)
- Validate frontend as a read-only engineering interface that initiates explicit edit actions but does not compute physics or norms.
- Observe that the frontend can load snapshots, display results, and submit actions without producing derived values.
- Evidence is based on visible UI behavior, action logs, and data contract artifacts.

### 4) SLD Validation (Deterministic Projection)
- Validate that SLD rendering is a deterministic projection of snapshots and solver results.
- Confirm that SLD does not alter, infer, or compute domain values; it only reflects authoritative inputs.
- Evidence must show identical SLD outputs for identical input snapshots/results.

### 5) Contract Validation (Frontend ↔ Backend)
- Validate that all data exchange adheres to frozen contract semantics: snapshot-based, immutable, and explicit.
- Confirm no derived or aggregated values cross boundaries, and that backend authority is preserved.

## Engineering Acceptance Scenarios
Each scenario is executed by an engineer using documented interfaces and produces observable artifacts. PASS/FAIL criteria must be explicit and based on observed inputs/outputs.

### Scenario A: Snapshot Immutability & Lineage
**Inputs:** Create a base snapshot, apply a single explicit edit action, and request the resulting snapshot.  
**Observable Outputs:** New snapshot ID, parent lineage reference, unchanged base snapshot.  
**PASS:** Base snapshot is unchanged; new snapshot has a new ID and correct parent reference.  
**FAIL:** Base snapshot mutated, no parent reference, or non-unique snapshot ID.

### Scenario B: Invariant Enforcement by Behavior
**Inputs:** Submit a model-edit action that violates a known domain invariant (per ExecPlan-01).  
**Observable Outputs:** Explicit rejection response with reason code/message.  
**PASS:** Action is rejected; no new snapshot created; rejection reason is explicit.  
**FAIL:** Action accepted, or rejection is ambiguous or missing.

### Scenario C: Solver Result Provenance
**Inputs:** Request solver results for a known snapshot.  
**Observable Outputs:** Result container referencing the snapshot ID, solver run ID, and raw solver values.  
**PASS:** Results are linked to the snapshot ID and provided as authoritative output; no frontend or SLD recomputation is required.  
**FAIL:** Results are not linked to snapshot ID, or frontend/SLD computes values.

### Scenario D: Frontend as Non-Solver
**Inputs:** Load snapshot and results into frontend; alter UI settings or visualization options.  
**Observable Outputs:** UI changes only affect presentation; no changes in authoritative values or results.  
**PASS:** Presentation changes do not alter domain or solver values; no derived results appear.  
**FAIL:** UI changes modify computed engineering values.

### Scenario E: SLD Deterministic Projection
**Inputs:** Provide identical snapshot/result pairs twice.  
**Observable Outputs:** Identical SLD diagram outputs.  
**PASS:** SLD output is stable and deterministic for identical inputs.  
**FAIL:** SLD output varies without input changes.

### Scenario F: Contract Boundary Compliance
**Inputs:** Inspect a recorded frontend ↔ backend exchange for a model edit and result request.  
**Observable Outputs:** Explicit snapshots, action payloads, and results without derived values.  
**PASS:** All exchanged fields are explicit, source-of-truth values; no inferred/aggregated data.  
**FAIL:** Derived values or computed fields are present in exchange.

## NOT-A-SOLVER Validation
- **Proof Approach:** Demonstrate that physics or norms are never computed in frontend or SLD by showing that all engineering values originate from solver results and are referenced to snapshot IDs.
- **Observable Failure Modes (if violated):**
  - Frontend/SLD produces engineering values without corresponding solver result containers.
  - UI interactions change engineering values without backend solver updates.
  - SLD derives or infers values not present in solver outputs.
- **PASS Criteria:** All engineering values are traceable to solver outputs; frontend and SLD only display or project.  
- **FAIL Criteria:** Any observed computation of physics or normative logic outside dedicated solvers.

## Regression & Drift Detection
- **Frozen Invariants Protection:** Validate that behaviors matching ExecPlan-01/07/09/10 remain observable; any deviation is a regression.
- **Breaking Change Definition:** Any change that alters observable snapshot immutability, contract semantics, solver result provenance, SLD determinism, or NOT-A-SOLVER compliance.
- **Drift Signals:** New or missing fields in exchanges, altered identifiers, non-deterministic SLD outputs, or acceptance of previously rejected invariant-breaking actions.
- **Response:** Any detected drift requires updating ExecPlans or rolling back; no silent changes.

## Acceptance Artifacts
- **Required Evidence:**
  - Snapshot lineage logs (IDs, timestamps, parent references).
  - Action submission and rejection records with reason codes.
  - Solver result containers with snapshot/run IDs.
  - SLD rendering outputs paired with input snapshots/results.
  - Frontend ↔ backend exchange captures (redacted as needed).
- **Auditor Consumption:** Artifacts must be human-readable, time-stamped, and traceable to the corresponding scenario; auditors verify compliance without source code access.

## Validation & Acceptance Criteria
- A human engineer can execute the scenarios and observe PASS/FAIL outcomes without reading code.
- All acceptance decisions are supported by artifacts that reference snapshots and solver outputs.
- NOT-A-SOLVER compliance is demonstrated by absence of engineering computations outside solvers.
- Frontend, SLD, and contract behavior align with frozen ExecPlans without reliance on internal implementation details.

## Idempotence and Recovery
- Re-running acceptance scenarios with identical inputs yields identical artifacts and outcomes.
- Recovery from failed scenarios is achieved by reloading the last accepted snapshot and rerunning the same inputs.
- No corrective action may involve modifying historical snapshots or results.

## Interfaces and Dependencies
- **Depends on:** ExecPlan-01 (Domain Model & IDs), ExecPlan-07 (Frontend Architecture), ExecPlan-09 (SLD Read-Only Consumption), ExecPlan-10 (Data Contracts).
- **Consumes:** Snapshots, solver results, action responses, and SLD projections as observable outputs.
- **Provides:** A repeatable, auditable validation and acceptance standard.
- **Guardrails:** NOT-A-SOLVER enforcement, snapshot immutability, contract explicitness, and deterministic projection.

## Artifacts and Notes
- This plan is the authoritative acceptance standard for MV-DESIGN-PRO as an engineering tool.
- All future validation evidence must be interpretable without internal code access.
```
