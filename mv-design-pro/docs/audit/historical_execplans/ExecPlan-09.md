```md
Living Document Declaration: This ExecPlan is a controlled, versioned specification. It must be updated whenever assumptions, boundaries, or invariants change, and it enables a zero-context restart by any engineer.

# ExecPlan-09: SLD Engine (Deterministic Projection)

## Purpose / Big Picture
Define the SLD engine as a pure, deterministic projection of the domain snapshot (NetworkGraph). This plan freezes the SLD boundaries so engineers can implement diagram rendering without guessing rules, without physics leakage, and with full auditability and reproducibility.

## Progress
- [ ] INIT: ExecPlan-09 drafted with required sections and deterministic projection rules
- [ ] Reviewed for compliance with .agent/PLANS.md structure and required headings
- [ ] Verified against ExecPlan-01 invariants and ExecPlan-07 frontend constraints
- [ ] Accepted as the frozen SLD architectural baseline

## Surprises & Discoveries

## Decision Log (Architectural Freezes)
1. The SLD is a read-only, deterministic projection of NetworkGraph snapshots and never a solver.
2. SLD must not infer, re-derive, approximate, or compute any domain or physics values.
3. SLD layout must be reproducible from the same snapshot and cannot depend on session state, device, or user history.
4. SLD consumes solver results strictly for visualization, verbatim, with white-box trace exposure.

## Outcomes & Retrospective
(TBD after implementation phase.)

## Context and Orientation
- ExecPlan-01 defines the authoritative domain model and invariants; SLD must not reinterpret them.
- ExecPlan-07 defines frontend architecture and NOT-A-SOLVER constraints; SLD is a projection within that frontend scope.
- This plan defines SLD behavior and determinism requirements, not rendering algorithms or UI technologies.

## What This Plan IS / IS NOT
**IS:** A frozen specification for the SLD engine as a deterministic, read-only projection of NetworkGraph snapshots for engineering visualization.  
**IS NOT:** A solver, a physics engine, a topology inference system, or an implementation plan for rendering technology.

## NOW vs LATER Commitments
**NOW:** Define SLD role, deterministic projection rules, layout determinism principles, and read-only contracts with domain and solver results.  
**LATER:** Performance or layout optimizations that preserve determinism and do not add computation or inference.

## SLD Role Definition
- The SLD is an engineering diagram, not a drawing: it must reflect the domain snapshot precisely and reproducibly.
- The SLD is a presentation projection, not a computation layer, and must not alter or infer topology.
- The SLD is a read-only consumer of domain snapshots and solver results.

## NOT-A-SOLVER Enforcement
- SLD performs **ZERO** physics and **ZERO** normative computation.
- SLD **never** re-derives, infers, or approximates values from topology or results.
- SLD **never** mutates domain state or solver results.
- Any computation beyond deterministic projection and display formatting is an architectural error.

## Deterministic Projection Rules
### Mapping from NetworkGraph to SLD Elements
- **Nodes** map to SLD bus elements with identity preserved (node ID is the SLD element ID).
- **Branches** map to SLD line/connection elements between the two endpoint node elements; no additional topology is inferred.
- **Transformers** map to SLD transformer elements connecting all transformer terminals to their referenced nodes; winding count and terminals are displayed as provided by the domain snapshot.
- **Sources** map to SLD source symbols attached to their single node.
- **Loads** map to SLD load symbols attached to their single node.
- **BoundaryNode** maps to a distinct SLD marker anchored to the BoundaryNode’s node.
- **in_service=false** entities are excluded from SLD projection entirely (no implied substitution or placeholder).

### Identity, Ordering, and Stability Guarantees
- SLD element identities must be stable and derived directly from domain entity IDs.
- SLD projection ordering must respect the deterministic ordering guarantees of NetworkGraph (ExecPlan-01).
- No local reordering, sorting by UI, or heuristics are permitted to change projection identity or structure.

### Parallel Branches and Transformers
- Parallel branches are represented as separate SLD elements, each preserving its unique entity ID and endpoint mapping.
- Multiple transformers between the same nodes are rendered as distinct elements with stable identities.
- No bundling, aggregation, or simplification is allowed; SLD must display each entity instance as-is.

## Layout Determinism Principles
- Layout must be deterministic and reproducible from the same snapshot and inputs.
- Layout must not depend on device, user session, timestamps, or nondeterministic state.
- Layout is a pure projection rule set; no adaptive or physics-based positioning is permitted.
- Regenerating the SLD from the same snapshot yields identical element placement order and relative structure.

## SLD Boundaries
### Allowed
- Deterministic mapping of domain entities to visual elements.
- Read-only display of solver result values and traces as provided.
- Highlighting, selection, and inspection of elements.

### Forbidden
- Any physics computation or normative evaluation.
- Any inference or reinterpretation of topology or electrical values.
- Any modification of domain state or solver results.
- Any generation of hidden topology or synthetic entities.

## SLD ↔ Domain Contract
### Read-Only Snapshot Consumption
- SLD consumes immutable domain snapshots as inputs.
- SLD respects domain invariants and does not reinterpret entity semantics.

### No Hidden or Derived Topology
- SLD must not introduce or derive connectivity beyond explicit NetworkGraph connections.
- No inferred buses, junctions, or rerouted connections are permitted.

### Snapshot Refresh Semantics
- When a new snapshot is published, SLD must discard prior projection and regenerate deterministically from the new snapshot.
- No incremental mutation of the prior projection is allowed.

## SLD ↔ Solver Results Contract
- Solver result containers are read-only and keyed by snapshot ID and entity ID.
- SLD may display results verbatim, with units and metadata preserved.
- No recomputation, aggregation, normalization, or inference is permitted.
- White-box traces must be exposed verbatim when available, without transformation.

## Interaction Model (Read-Only)
### Permitted Interactions
- Selection, hover, focus, and highlight of SLD elements.
- Read-only inspection panels that show domain attributes and solver results.
- Deterministic filtering by explicit user choice (e.g., show/hide categories) without altering projection identity.

### Forbidden Interactions
- Topology edits, entity creation, or deletion within the SLD.
- Dragging or rearranging elements that would alter the deterministic projection result.
- Any interaction that mutates domain state or solver results.

## Validation & Acceptance (Engineering-Verifiable)
- Given the same NetworkGraph snapshot and results container, the SLD projection is identical across sessions and machines.
- An auditor can trace every SLD element directly to a domain entity ID.
- No SLD view displays values not present in the domain snapshot or solver results.
- All excluded entities are exclusively those marked in_service=false in the domain snapshot.

## Idempotence and Recovery
- Regenerating the SLD from the same snapshot is idempotent and yields identical projection output.
- Recovery is achieved by reloading the last valid snapshot and regenerating deterministically.
- Any transient UI selection state can be discarded without affecting the projection.

## Interfaces and Dependencies
- **Depends on:** ExecPlan-01 (Domain Model, NetworkGraph invariants), ExecPlan-07 (Frontend Architecture).
- **Consumes:** Immutable NetworkGraph snapshots and external solver result containers.
- **Provides:** Deterministic SLD projection for engineering visualization and audit.

## Artifacts and Notes
- This plan is the authoritative, frozen specification for SLD deterministic projection.
- Future plans must not contradict the NOT-A-SOLVER rule or domain invariants.
```
