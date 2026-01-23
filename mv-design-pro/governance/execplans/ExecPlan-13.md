```md
Living Document Declaration: This ExecPlan is a controlled, versioned specification. It must be updated whenever assumptions, boundaries, or invariants change, and it enables a zero-context restart by any engineer.

# ExecPlan-13 — DesignSynth (Project Designer) — Case-level Connection Study Pipeline

## Purpose / Big Picture
DesignSynth (“Project Designer”) enables engineers to perform end-to-end connection-study design work for MV projects in a reproducible, auditable way. After this change, an engineer can define a connection-study specification for an OperatingCase (case_id), run a guided synthesis that proposes cable lines, transformer station parameters, protection settings, instrument transformers (CT/VT), and reactive power compensation, and then apply those proposals through explicit model-edit actions to create new immutable snapshots. The system will prove each proposal with solver runs (power flow / short circuit) keyed to snapshot_id and case_id and will store evidence artifacts suitable for audits and reporting.

This change does not add new physics. It adds a case-level design pipeline that orchestrates existing solvers and produces auditable proposals and evidence.

## Progress
- [x] (INIT) Define DesignSynth scope and boundaries (what it is and is not).
- [ ] Define case-level data model: DesignSpec, DesignProposal, DesignEvidence, DesignActionsDraft.
- [ ] Define pipeline stages (D1–D6) and acceptance criteria per stage.
- [ ] Define interfaces to Wizard actions, Snapshot Store, and AnalysisRuns.
- [ ] Define evidence requirements (traceability via case_id/snapshot_id/run_id).
- [ ] Define validation and governance gates (Allowed vs Controlled; NOT-A-SOLVER).
- [ ] Produce implementation-ready plan (PR-by-PR milestones) without writing code.

## Surprises & Discoveries

(Empty at initialization. Record unexpected constraints, data gaps, or toolchain limitations here with evidence.)

## Decision Log
- Decision: DesignSynth is a case-level analysis/orchestrator that generates proposals and actions; it does not mutate domain state directly.
  Rationale: Preserves snapshot immutability and auditability (ExecPlan-01/08/10/11).
  Date/Author: 2026-01 / System Architecture

- Decision: All physical quantities required for design validation come from solver runs (PF/SC) keyed by case_id + snapshot_id + run_id.
  Rationale: Prevents hidden computation and enforces NOT-A-SOLVER discipline.
  Date/Author: 2026-01 / System Architecture

- Decision: Protection, apparatus selection, and compensation outputs are stored as case-level artifacts, never as solver logic or domain mutations.
  Rationale: Aligns with project rule: protection lives in case; domain remains pure topology/attributes.
  Date/Author: 2026-01 / System Architecture

## Outcomes & Retrospective

(To be completed after initial DesignSynth stage(s) are implemented and validated.)

## Context and Orientation

MV-DESIGN-PRO operates on immutable NetworkSnapshots (snapshot_id lineage) and OperatingCases (case_id) that point to an active snapshot. Editing occurs only via Wizard actions (ActionEnvelope / batch) that create new snapshots. SLD is a deterministic projection of snapshots. Solvers compute physics and produce result containers; analyses interpret results without computing physics.

DesignSynth is introduced as a case-level “Project Designer” pipeline for connection studies, covering: cable lines, transformer station (TR), protection (interpretation), instrument transformers (CT/VT), and compensation. It must remain auditable, deterministic, and strictly separated from physics computation.

Define “connection study” here as the engineering process of producing a compliant design package for grid connection: network configuration, equipment sizing, protection concept, and verification evidence.

## What DesignSynth IS / IS NOT

DesignSynth IS:
- A case-level orchestrator and synthesizer that:
  - consumes a DesignSpec and a case’s active snapshot,
  - runs required solver analyses (PF/SC) through AnalysisRuns,
  - produces a DesignProposal with explicit rationale and required evidence,
  - emits a Draft of model-edit actions (ActionEnvelope/batch) for the engineer to approve,
  - iterates until acceptance criteria are met.

DesignSynth IS NOT:
- A solver or physics engine.
- A UI system; UI is a client of DesignSynth.
- A place to embed normative computations that replace solvers.
- A mechanism to silently mutate the domain model.

## NOW vs LATER Commitments

NOW:
- Define case-level artifacts, stage pipeline, and acceptance criteria.
- Define interfaces to Wizard actions, Snapshot Store, and AnalysisRuns.
- Define evidence requirements, traceability, and governance gates.
- Produce an implementation-ready milestone plan (PR-by-PR) without writing code.

LATER:
- Implement DesignSynth milestones (M1+), beginning with D1 (Cable sizing) MVP.
- Expand to D2–D6 with traceable evidence and reporting artifacts.

## Invariants & Guardrails
- NOT-A-SOLVER is absolute: no physics or normative computation outside solvers.
- Snapshot immutability and lineage are preserved; DesignSynth never mutates domain state directly.
- Frozen Result APIs and data contracts remain intact (ExecPlan-05/10).
- All outputs are auditable and traceable to case_id, snapshot_id, and run_id.

## Dependencies
- **Depends on:** ExecPlan-01 (Domain), ExecPlan-07 (Frontend), ExecPlan-08 (Wizard), ExecPlan-09 (SLD), ExecPlan-10 (Data Contracts), ExecPlan-11 (Validation & Acceptance), ExecPlan-12 (Governance).
- **Provides to:** Case-level design orchestration, proposal drafting, evidence packaging, and reporting inputs.

## Core Concepts (Case-level Artifacts)

### DesignSpec (case-level input)

A structured, explicit specification attached to case_id that includes:
- Purpose: project type (connection study), scope boundaries.
- PCC – punkt wspólnego przyłączenia requirements (connection point assumptions, constraints).
- Electrical targets and constraints (e.g., permissible voltage drop range, thermal loading limits, short-circuit constraints, power factor targets).
- Candidate equipment and catalog constraints (allowed cable families, transformer rating ranges, CT/VT classes, compensation device constraints).
- Regulatory and utility requirements as explicit input statements (no hidden rules).

DesignSpec must be versioned (spec_id) and must reference case_id and the snapshot_id it was created against.

### DesignProposal (case-level output)

A structured proposal attached to case_id referencing:
- snapshot_id (input) and proposed action batch that will create the next snapshot,
- selected cable line parameters (type/size/installation assumptions as inputs),
- transformer station parameters (ratings, impedances as domain attributes if applicable),
- protection settings proposal (case-level settings), including selectivity notes,
- CT/VT selection proposal (ratios, classes) as case-level equipment specification,
- compensation proposal (device and setpoint intentions).

DesignProposal must contain only explicit values and references to evidence (run_id results). Any derived values must be traceable to solver outputs.

### DesignEvidence (case-level proof package)

Evidence bundle referencing:
- run_ids for PF and SC performed for a specific snapshot_id,
- white-box traces and key computed quantities as captured from result containers (verbatim),
- PASS/FAIL for each acceptance criterion with margins,
- links to generated artifacts (report files, JSON evidence).

### DesignActionsDraft (case-level action plan)

A batch of ActionEnvelope objects that, when applied, yields a new snapshot implementing the proposal. This batch is not applied automatically; it requires explicit engineer approval and follows Wizard mutation rules.

## Pipeline Stages (D1–D6)

DesignSynth is implemented incrementally in stages. Each stage must be independently verifiable and produce observable outputs and artifacts.

### D1 — Cable Line Sizing (Voltage Drop + Loading)

Scope:
- Propose cable line selection and validate via PF run results.
Outputs:
- Proposed cable parameters (as explicit domain attributes or equipment specification).
Evidence:
- PF run_id, voltage profile at relevant nodes, loading margins.
Acceptance:
- Voltage drop within DesignSpec limits; loading within thermal constraints as specified (expressed as explicit targets, not hidden norms).

### D2 — Transformer Station (TR) Sizing

Scope:
- Propose transformer rating and key parameters; validate via PF and SC as required.
Outputs:
- Transformer selection parameters and any required domain edits.
Evidence:
- PF run_id for steady-state; SC run_id for fault levels if required by DesignSpec.
Acceptance:
- Transformer within rating; constraints satisfied per DesignSpec statements.

### D3 — Instrument Transformers (CT/VT) Selection

Scope:
- Propose CT/VT ratios/classes for measurement/protection based on fault levels and operating currents (from solver results).
Outputs:
- CT/VT specification attached to case (not domain).
Evidence:
- PF/SC run_ids and value ranges.
Acceptance:
- CT/VT within requested ranges; explicit compliance statements with margins.

### D4 — Compensation (Reactive Power / Power Factor)

Scope:
- Propose compensation device sizing/setpoint intent based on PF results and DesignSpec targets (e.g., power factor).
Outputs:
- Compensation proposal (device and control intent), actions to add/adjust compensation elements if domain supports.
Evidence:
- PF run_id showing reactive power and voltage impact.
Acceptance:
- Targets satisfied; no adverse constraint violations.

### D5 — Protection (Interpretation, Case-level)

Scope:
- Derive protection settings proposals (overcurrent/earth fault etc.) using SC results and topology; no physics.
Outputs:
- Protection configuration artifact attached to case; suggested settings and selectivity notes.
Evidence:
- SC run_id quantities; trace of selection logic.
Acceptance:
- Settings satisfy explicit DesignSpec requirements (ranges, coordination criteria where specified).

### D6 — Connection Study Evidence Package (Reporting)

Scope:
- Generate a report/evidence pack for the connection study.
Outputs:
- Report files (PDF/DOCX) + structured JSON evidence package.
Evidence:
- All stage evidence aggregated, including run_id references and white-box traces.
Acceptance:
- Report generated; auditable linkage from statements to run_id evidence.

## Interfaces and Dependencies

DesignSynth depends on:
- Snapshot Store (PR-04): read snapshots by snapshot_id, store proposal metadata and evidence.
- Wizard mutation pathway (ExecPlan-08 + PR-02/03/06/07): apply action batches to create new snapshots.
- Case model: case_id and active_snapshot_id; case-level artifacts storage.
- AnalysisRuns (planned PR-09 in earlier roadmap): create and fetch solver result containers keyed by case_id + snapshot_id + run_id.
- Reporting subsystem (existing JSON/DOCX/PDF exporters) to produce evidence pack outputs, ensuring JSON-safe canonicalization.

DesignSynth provides:
- DesignSpec management (create/update per case),
- DesignProposal generation (per stage),
- DesignActionsDraft (batch actions) ready for explicit approval,
- DesignEvidence bundle for audit and reporting.

## Plan of Work

Implement DesignSynth as a new case-level analysis module that is strictly non-solver and audit-first. Start with D1 (Cable sizing) as MVP, because it exercises the full loop: spec → PF run → proposal → actions draft → snapshot → re-run PF → evidence.

All later stages build on the same mechanics, adding new proposal types and evidence checks.

## Concrete Steps (Implementation Milestones, PR-by-PR)

Milestone M1 (DesignSynth scaffolding + data model, no solver calls):
- Add case-level tables/models for DesignSpec, DesignProposal, DesignEvidence (minimal fields).
- Add service layer: create spec, store spec, list specs by case.
- Add JSON canonicalization for proposal/evidence storage if needed.

Milestone M2 (D1 Cable sizing MVP):
- Define D1 acceptance criteria driven by DesignSpec explicit limits.
- Implement orchestration that requests PF run for (case_id, snapshot_id) and stores run_id reference.
- Generate proposal + actions draft (no auto-apply).
- Provide CLI/service entrypoint to generate D1 proposal.

Milestone M3 (Apply proposal loop + evidence pack):
- Provide a “commit proposal actions” flow via Wizard actions.
- Re-run PF and store evidence PASS/FAIL.
- Generate a minimal evidence report (JSON) referencing run_ids.

Milestone M4+ (D2–D6):
- Add each stage with its own acceptance criteria and evidence references.
- Keep stages independently testable and incrementally deliverable.

## Validation and Acceptance

DesignSynth is accepted when:
- An engineer can create a DesignSpec for a case and snapshot.
- The system generates a D1 proposal and action draft.
- Applying the action draft creates a new snapshot with correct lineage.
- PF run is executed for both snapshots and evidence shows PASS/FAIL deterministically.
- All evidence is traceable by (case_id, snapshot_id, run_id) without referencing code internals.
- No physics computations occur outside solvers; NOT-A-SOLVER is demonstrably preserved.

## Idempotence and Recovery

- Re-running DesignSynth stage with the same inputs must produce the same proposal structure (except for generated IDs/timestamps), and the same evidence references.
- If a stage fails, no domain mutation occurs; only artifacts and logs are produced.
- Recovery consists of reverting to the last accepted snapshot_id and rerunning the stage.

## Artifacts and Notes

DesignSynth produces:
- DesignSpec JSON (case-level)
- DesignProposal JSON (case-level)
- DesignEvidence JSON (case-level)
- Optional report outputs (PDF/DOCX) with embedded references to run_ids

All artifacts must remain JSON-safe and deterministically serialized.

## Change Note (initial creation)
- Created ExecPlan-13 to define the case-level Project Designer (DesignSynth) pipeline for connection studies, aligned with frozen architecture and the rule that protection and design outputs live in OperatingCase.
- Rationale: enable industrial-grade, auditable, reproducible design workflows without introducing new physics outside solvers.
```
