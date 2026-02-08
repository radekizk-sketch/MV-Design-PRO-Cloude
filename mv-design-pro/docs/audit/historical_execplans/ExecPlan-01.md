```md
Living Document Declaration: This ExecPlan is a controlled, versioned specification. It must be updated whenever assumptions, boundaries, or invariants change, and it enables a zero-context restart by any engineer.

# ExecPlan-01: Core Domain Model & NetworkGraph (Frozen Invariants)

## Purpose / Big Picture
Define the canonical domain layer for MV-DESIGN-PRO and freeze its invariants. This plan establishes the sole source of truth for network representation (NetworkGraph) and its domain entities so that solvers, protection, frontend, SLD, wizard, and reporting can interoperate without reinterpretation.

## Progress
- [ ] Drafted with required sections and architectural freezes
- [ ] Reviewed for compliance with .agent/PLANS.md structure
- [ ] Validated against NOT-A-SOLVER rule and frozen Result APIs
- [ ] Accepted as the architecturally frozen domain baseline

## Surprises & Discoveries

## Decision Log (Architectural Freezes)
1. The domain model (NetworkGraph + entities) is architecturally closed after this plan; downstream layers may not reinterpret or extend semantics.
2. Domain objects are snapshot-immutable; all changes occur via explicit model-edit actions that produce new snapshots.
3. Result APIs for IEC / PN-EN 60909 remain frozen; results are attached via external result containers, never by mutating domain entities.
4. BoundaryNode (węzeł przyłączenia) is a first-class domain concept and must exist in every network model.
5. NetworkGraph determinism (ordering, identity, referential stability) is mandatory for SLD projection and auditing.

## Outcomes & Retrospective
(TBD after implementation phase.)

## Context and Orientation
- This plan executes the next mandated stage after ExecPlan-00 and is the root of truth for all domain semantics.
- The domain layer is a pure data model: it describes the network, topology, and engineering-relevant attributes without performing any physics computations.
- This plan does not define solver algorithms, protection logic, frontend rendering, UI layouts, or performance optimizations.

## What This Plan IS / IS NOT
**IS:** An authoritative, frozen definition of the domain layer, NetworkGraph, and cross-layer contracts required for deterministic interpretation.  
**IS NOT:** A solver, protection, frontend, or reporting specification, nor an implementation guide.

## NOW vs LATER Commitments
**NOW:** Freeze domain boundaries, entity definitions, invariants, determinism guarantees, and layer contracts.  
**LATER:** Implementations of solvers, protection, UI, SLD rendering, and reporting that consume this model without reinterpretation.

## Interfaces and Dependencies
- This plan introduces no runtime interfaces and no executable APIs; it defines architectural contracts only.
- **Solvers** depend on the domain for read-only topology and attributes, and publish results externally without mutating the domain.
- **Frontend** depends on the domain as the single source of truth and may only modify it via explicit model-edit actions that produce new snapshots.
- **SLD** depends on deterministic identity and ordering for stable projection.
- **Wizard** depends on domain validation rules and emits explicit model-edit actions.
- **Protection** depends on domain topology and attributes but remains a non-solver layer; it must not compute physics.

## Canonical Domain Model Definition
### Domain Boundaries
**Belongs in the domain model:**
- NetworkGraph and all canonical entities (nodes, branches, transformers, sources, loads).
- Attribute schemas required to represent the electrical network and its engineering metadata (e.g., identifiers, name, nominal ratings, connection type, in_service state).
- Topology semantics and connectivity invariants.
- Explicit model-edit actions that define lawful mutations.

**Explicitly excluded from the domain model:**
- Solver algorithms, numerical routines, or physics calculations.
- Protection logic, coordination rules, relay settings derivation.
- UI state, rendering layout, or visualization logic.
- Reporting formatting, templates, or presentation-specific transformations.

### NetworkGraph Canonical Model
**NetworkGraph**
- A NetworkGraph is the canonical, deterministic representation of a single electrical network.
- It contains a fixed set of entities, each with a stable identity and reference.
- NetworkGraph is the sole source of truth for topology.

**Entities**
1. **Node**
   - Represents an electrical connection point (bus) in the network.
   - Has identity, name, optional metadata, and in_service flag.
   - Nodes are the endpoints for all branches and transformers.

2. **Branch**
   - Represents a two-terminal connection between nodes (e.g., line, cable, breaker).
   - Always connects exactly two nodes.
   - Has identity, name, type, rated attributes, and in_service flag.

3. **Transformer**
   - Represents a multi-winding transformer with a primary and one or more secondary terminals.
   - Always connects at least two nodes.
   - Has identity, name, vector group (if applicable), rated attributes, and in_service flag.

4. **Source**
   - Represents an external supply or generator feeding the network.
   - Always connects to exactly one node.
   - Has identity, name, rated attributes, and in_service flag.

5. **Load**
   - Represents an aggregate or explicit load.
   - Always connects to exactly one node.
   - Has identity, name, rated attributes, and in_service flag.

6. **BoundaryNode (węzeł przyłączenia)**
   - A mandatory domain element representing the point of common coupling.
   - BoundaryNode is tied to exactly one node in the NetworkGraph.
   - Each NetworkGraph has exactly one BoundaryNode.

### in_service Semantics
- The in_service flag indicates whether an entity is active in the network model.
- An out-of-service entity remains in the NetworkGraph but is excluded from solver inputs and SLD projections.
- in_service is a domain attribute and may only be changed via explicit model-edit actions.

### Topology Invariants
- All branches connect exactly two existing nodes.
- All transformers connect at least two existing nodes.
- All sources and loads connect exactly one existing node.
- BoundaryNode exists, is unique, and references an existing node.
- The NetworkGraph must be internally consistent; dangling references are invalid.

## Invariants & Forbidden Mutations
### Immutability & Lifecycle Rules
- Domain entities are snapshot-immutable: no implicit or in-place mutation is allowed.
- All changes occur via explicit model-edit actions that produce a new NetworkGraph snapshot.
- IDs are immutable and must never be reused.
- Removal is expressed as a model-edit action that produces a new snapshot; historical snapshots remain valid for audit and rollback.

### Forbidden Mutations
- Direct in-place edits of entity attributes by UI or solver layers.
- Topology changes outside explicit model-edit actions.
- Modifying solver results to infer or update domain attributes.
- Reinterpreting domain attributes at the UI layer to create hidden state.

## Determinism Guarantees
- **Ordering:** NetworkGraph maintains a stable, deterministic ordering for entities (e.g., by creation order or explicit deterministic index). The ordering must not change across serialization/deserialization.
- **Identity:** Every entity has a stable, unique identity (UUID or equivalent), never recycled.
- **Referential Stability:** References between entities (e.g., branch endpoints) are stable and preserved across projections for SLD and reporting.

## Domain ↔ Solver Contract
- Solvers may read all domain entities and their attributes.
- Solvers must not mutate domain entities or topology.
- Solver results are attached as separate result structures keyed by entity identity and NetworkGraph snapshot ID.
- Result containers must not introduce new domain attributes or alter the frozen domain model.

## Domain ↔ Frontend Contract
- The domain model is the single source of truth for network data and topology.
- Frontend edits must be expressed as explicit model-edit actions (create, connect, deactivate, etc.) that produce a new NetworkGraph snapshot.
- The UI must not hold hidden or derived state that diverges from the domain model.
- Frontend may cache read-only projections but must refresh on snapshot changes.

## Domain Interaction Scenarios (Wizard / SLD / Solver)
### Wizard
- Wizard workflows gather user input and emit explicit model-edit actions.
- Wizard does not compute physics or infer hidden parameters.
- Each wizard step yields a new NetworkGraph snapshot or a validated draft action.

### SLD
- SLD rendering consumes a read-only projection of NetworkGraph.
- SLD uses stable identity and ordering to map entities to visuals.
- SLD must not infer topology beyond what is explicitly in the NetworkGraph.

### Solver
- Solver ingests the NetworkGraph snapshot and builds a solver-specific model.
- Solver results are published to external result containers keyed by snapshot and entity ID.
- Solver does not mutate domain entities or topology.

## Validation & Acceptance (Engineering-Verifiable)
- A validator can confirm that every entity references existing nodes and BoundaryNode is unique.
- in_service entities only are included in solver inputs and SLD projections.
- Identity stability is verified across serialization/deserialization.
- A new engineer can implement Wizard and SLD without guessing topology semantics.

## Idempotence and Recovery
- Reapplying the same model-edit action to the same snapshot yields the same resulting snapshot.
- NetworkGraph snapshots are immutable and can be used for audit and rollback.
- Recovery consists of loading the last valid snapshot and reapplying persisted actions.

## Artifacts and Notes
- This plan produces the authoritative specification for the domain model and NetworkGraph.
- Future ExecPlans must not contradict the frozen invariants herein.
```
