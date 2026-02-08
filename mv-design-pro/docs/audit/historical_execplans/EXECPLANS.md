# NOTE
Canonical architecture is defined in [`SYSTEM_SPEC.md`](../../SYSTEM_SPEC.md).
This document is a historical catalog of ExecPlans and must not be treated as an architectural source of truth.

```md
# MV-DESIGN-PRO — Ezechiel Plan (Industrial-Grade System)

## Purpose
Establish the master system plan for MV-DESIGN-PRO with industrial-grade quality, deterministic behavior, and auditability comparable to DIgSILENT PowerFactory. This plan governs all subordinate stage ExecPlans and ensures a clear separation between solvers, analyses, reporting, and UI.

## What this IS
A system-wide, authoritative blueprint for architecture, governance, and execution sequencing. It defines immutable boundaries, frozen APIs, roles, and the compliance obligations for every subsystem.

## What this is NOT
It is not an implementation task list, not a solver specification, and not a substitute for stage ExecPlans. It does not grant permission to compute physics outside core solvers.

## Immutable Assumptions
- Target quality: DIgSILENT PowerFactory class.
- IEC / PN-EN 60909 solver Result API is FROZEN.
- Protection NEVER computes physics.
- White-Box calculations are mandatory.
- BoundaryNode terminology (“węzeł przyłączenia”) is mandatory.
- Deterministic, auditable behavior.
- Small PRs preferred (even if planned in large blocks).
- ExecPlans are mandatory for all complex work.

## System Roles
- Power System Engineer — normative authority, final arbiter.
- Protection Engineer — settings, selectivity, interpretation.
- Design Engineer — topology, BoundaryNode, OZE integration.
- Reviewer / Auditor — traceability, white-box verification.
- Software Engineer — implementation under ExecPlan constraints.
- AI Coding Agent (Codex) — stateless executor of ExecPlans.

## Architectural Guardrails
- Only dedicated core solvers compute physics.
- Protection, reporting, and frontend must be pure interpretation and projection layers.
- Frozen Result APIs may only be adapted, never broken.
- White-box traceability must be preserved end-to-end.

## Deliverables
- ExecPlan-00 through ExecPlan-13 (stage plans).
- Repository hygiene specification (KEEP / REMOVE / CREATE).
- Updated AGENTS.md and .agent/PLANS.md.

## NOW vs LATER
NOW is defined by stage ExecPlans 00–11. LATER is defined exclusively in ExecPlan-12, including controlled extensions such as ExecPlan-13.

## Progress
- [ ] Master plan acknowledged by maintainers.
- [ ] Stage ExecPlans authored and stored in-repo.
- [ ] Repository hygiene specification published.
```

```md
# ExecPlan-00: Repository Governance & Architecture Baseline

## Purpose
Define repository governance, architectural baseline, and enforceable boundaries for solver vs analysis vs UI.

## What this IS
A governance and architecture baseline that defines structure, ownership, and lifecycle rules for the repository.

## What this is NOT
It is not a refactor plan, not an implementation plan, and not a solver specification.

## NOW
- Define repository governance artifacts (AGENTS.md, .agent/PLANS.md).
- Specify architecture baseline and dependency direction.
- Establish role mapping to modules and ownership.

## LATER
- Automated policy enforcement (CI checks) after baseline acceptance.

## Dependencies
- None.

## Guardrails
- NOT-A-SOLVER rule is absolute.
- Frozen Result APIs remain unchanged.

## Progress
- [ ] Governance artifacts created.
- [ ] Architecture baseline documented.
```

```md
# ExecPlan-01: Core Domain Model & NetworkGraph (frozen invariants)

## Purpose
Define the canonical domain model and NetworkGraph invariants that all layers must consume.

## What this IS
A formal definition of domain entities, relationships, and invariants for deterministic modeling.

## What this is NOT
It is not a solver and does not compute physics.

## NOW
- Identify domain entities and invariants.
- Define NetworkGraph projection rules.
- Establish mapping for BoundaryNode and OZE terminology.

## LATER
- Extend domain for future equipment types in a backward-compatible manner.

## Dependencies
- ExecPlan-00.

## Guardrails
- Domain model is authoritative for all projections.
- No derived physics outside solvers.

## Progress
- [ ] Domain entities documented.
- [ ] NetworkGraph invariants frozen.
```

```md
# ExecPlan-02: IEC / PN-EN 60909 Short-Circuit Solver (FROZEN, reference authority)

## Purpose
Declare the short-circuit solver as the single authoritative source of IEC / PN-EN 60909 computations.

## What this IS
A governance plan for the solver’s boundary, inputs, outputs, and frozen Result API.

## What this is NOT
It is not a reimplementation or alteration of solver algorithms.

## NOW
- Affirm solver authority and frozen Result API.
- Define solver input contract with domain model.
- Document white-box trace expectations.

## LATER
- Solver optimization or performance work under separate ExecPlan.

## Dependencies
- ExecPlan-01.

## Guardrails
- No other layer computes short-circuit quantities.
- Result API remains frozen.

## Progress
- [ ] Solver authority documented.
- [ ] Input contract aligned to domain model.
```

```md
# ExecPlan-03: Power Flow Solver (current + controlled extensions)

## Purpose
Define the power flow solver as the sole engine for steady-state computations and its extension policy.

## What this IS
A boundary and governance plan for power flow computations, including controlled future extensions.

## What this is NOT
It is not a restatement of algorithms outside the solver.

## NOW
- Affirm solver authority and integration points.
- Define input/output contracts aligned with domain model.
- Establish extension policy that does not break frozen APIs.

## LATER
- Controlled extensions approved by the Power System Engineer.

## Dependencies
- ExecPlan-01.

## Guardrails
- No other layer computes steady-state quantities.
- Solver outputs are read-only to other layers.

## Progress
- [ ] Authority and contracts defined.
- [ ] Extension policy documented.
```

```md
# ExecPlan-04: Protection Analysis Layer (INTERPRETATION ONLY)

## Purpose
Define protection analysis as a pure interpretation layer consuming solver results without computing physics.

## What this IS
An interpretation and settings evaluation layer with traceability to solver outputs.

## What this is NOT
It is not a solver and must not derive or approximate physics.

## NOW
- Define interpretation workflows for protection engineering.
- Map outputs to white-box traces for audit.
- Ensure read-only consumption of solver results.

## LATER
- Additional protection schemes governed by engineering approval.

## Dependencies
- ExecPlan-02 and ExecPlan-03.

## Guardrails
- Protection NEVER computes physics.
- All outputs trace directly to solver results.

## Progress
- [ ] Interpretation workflows defined.
- [ ] Traceability contract documented.
```

```md
# ExecPlan-05: Result APIs & White-Box Traceability

## Purpose
Define stable Result APIs and ensure white-box traceability from inputs to outputs.

## What this IS
A governance plan for Result APIs, trace logs, and audit surfaces.

## What this is NOT
It is not a UI spec or a reporting engine.

## NOW
- Inventory Result APIs and freeze boundaries.
- Define traceability artifacts and storage formats.
- Establish audit narratives for reviewers.

## LATER
- Extended trace detail under explicit performance budgets.

## Dependencies
- ExecPlan-02 and ExecPlan-03.

## Guardrails
- Frozen APIs may only be adapted, never broken.
- Traceability must be deterministic and reproducible.

## Progress
- [ ] Result API inventory complete.
- [ ] Traceability artifacts defined.
```

```md
# ExecPlan-06: Reporting & Export (JSON / JSONL / DOCX / PDF)

## Purpose
Define reporting and export as a projection of solver results and traceability artifacts.

## What this IS
A reporting layer that serializes outputs without recomputation.

## What this is NOT
It is not a solver and must not transform physics results beyond presentation formatting.

## NOW
- Define export formats and schemas.
- Map white-box traces into report sections.
- Ensure deterministic, reproducible rendering.

## LATER
- Additional formats only after schema stabilization.

## Dependencies
- ExecPlan-05.

## Guardrails
- Reporting NEVER computes physics.
- Reporting remains read-only to solver outputs.

## Progress
- [ ] Export schemas defined.
- [ ] Trace-to-report mapping documented.
```

```md
# ExecPlan-07: Frontend Architecture (Engineering Interface)

## Purpose
Define the frontend as an engineering interface that edits the model and displays solver results.

## What this IS
A deterministic projection layer with zero physics, aligned to domain model and solver outputs.

## What this is NOT
It is not a solver and must not approximate or re-derive physics.

## NOW
- Define UI architecture and data flow boundaries.
- Define SLD as a projection of NetworkGraph.
- Ensure read-only display of solver results and traces.

## LATER
- UX enhancements that do not alter data contracts.

## Dependencies
- ExecPlan-01 and ExecPlan-05.

## Guardrails
- Frontend contains ZERO physics.
- Frontend only presents and edits models.

## Progress
- [ ] Frontend architecture baseline documented.
- [ ] SLD projection rules referenced.
```

```md
# ExecPlan-08: Network Wizard (SN / nn / BoundaryNode / OZE)

## Purpose
Define the network wizard as a structured editor for model creation using mandatory terminology.

## What this IS
A guided model editor aligned with domain model and engineering roles.

## What this is NOT
It is not a solver and must not compute any electrical quantities.

## NOW
- Define wizard steps and role responsibilities.
- Enforce BoundaryNode (“węzeł przyłączenia”) terminology.
- Ensure output is a valid NetworkGraph definition.

## LATER
- Additional guided templates approved by engineers.

## Dependencies
- ExecPlan-01 and ExecPlan-07.

## Guardrails
- Wizard produces models only, no physics.
- Deterministic mapping to NetworkGraph.

## Progress
- [ ] Wizard flow documented.
- [ ] Terminology enforcement defined.
```

```md
# ExecPlan-09: SLD Engine (deterministic projection of NetworkGraph)

## Purpose
Define the single-line diagram engine as a deterministic projection of NetworkGraph.

## What this IS
A projection engine that renders topology without computing physics.

## What this is NOT
It is not a solver or an analysis engine.

## NOW
- Define projection rules and layout determinism.
- Map domain entities to visual primitives.

## LATER
- Layout optimizations that preserve determinism.

## Dependencies
- ExecPlan-01 and ExecPlan-07.

## Guardrails
- SLD must be a projection of NetworkGraph only.
- No electrical calculations outside solvers.

## Progress
- [ ] Projection rules documented.
- [ ] Determinism constraints defined.
```

```md
# ExecPlan-10: Frontend ↔ Backend Data Contracts

## Purpose
Define explicit data contracts between frontend and backend for models, results, and traces.

## What this IS
A schema and versioning plan that enforces solver boundaries and read-only results.

## What this is NOT
It is not an implementation of APIs or a migration plan.

## NOW
- Define model schema versions and validation rules.
- Define result and trace read-only contracts.
- Establish compatibility policy.

## LATER
- Automated contract testing after schema stabilization.

## Dependencies
- ExecPlan-01 and ExecPlan-05.

## Guardrails
- Contracts forbid physics computations outside solvers.
- Backward compatibility for frozen Result APIs.

## Progress
- [ ] Contract schemas drafted.
- [ ] Compatibility policy documented.
```

```md
# ExecPlan-11: Validation & Engineering Acceptance

## Purpose
Define validation, verification, and acceptance criteria aligned with engineering roles.

## What this IS
A plan for deterministic validation, audit, and review protocols.

## What this is NOT
It is not a solver or testing implementation.

## NOW
- Define acceptance criteria for each role.
- Define white-box verification routines.
- Establish audit trails for reviewer sign-off.

## LATER
- Certification or external compliance workflows.

## Dependencies
- ExecPlan-05.

## Guardrails
- Validation uses solver results as source of truth.
- All evidence is traceable and reproducible.

## Progress
- [ ] Acceptance criteria documented.
- [ ] Audit protocol defined.
```

```md
# ExecPlan-12: Future Extensions (explicitly marked LATER)

## Purpose
Define future extensions that are explicitly deferred and out of scope for NOW.

## What this IS
A curated list of deferred capabilities with prerequisites.

## What this is NOT
It is not active scope or an implementation plan.

## NOW
- Document deferred capabilities and prerequisites.

## LATER
- Execute deferred capabilities only under new ExecPlans.

## Dependencies
- All prior ExecPlans as baseline.

## Guardrails
- Deferred work must not conflict with frozen APIs or NOT-A-SOLVER rules.

## Progress
- [ ] Deferred capabilities listed.
- [ ] Prerequisites captured.
```

```md
# ExecPlan-13: DesignSynth (Project Designer) — Case-level Connection Study Pipeline

## Purpose
Define a case-level orchestration pipeline that synthesizes connection-study design proposals and evidence without adding new physics outside solvers.

## What this IS
A controlled extension plan that introduces DesignSynth artifacts, stage pipeline (D1–D6), and evidence requirements aligned to frozen architecture.

## What this is NOT
It is not a solver, UI specification, or domain mutation path; all physics remain within core solvers.

## NOW
- Define DesignSynth scope, artifacts, pipeline stages, and acceptance criteria.
- Define interfaces to Wizard actions, Snapshot Store, and AnalysisRuns.
- Define evidence requirements and governance gates.

## LATER
- Implement staged milestones (M1+) starting with D1 Cable sizing MVP.

## Dependencies
- ExecPlan-01, ExecPlan-07, ExecPlan-08, ExecPlan-09, ExecPlan-10, ExecPlan-11, ExecPlan-12.

## Guardrails
- NOT-A-SOLVER is absolute; DesignSynth consumes solver results only.
- Snapshot immutability and frozen contracts remain intact.

## Progress
- [ ] DesignSynth stage plan documented and approved.
```
