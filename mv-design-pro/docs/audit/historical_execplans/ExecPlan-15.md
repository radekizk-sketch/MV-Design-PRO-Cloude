```md
Living Document Declaration: This ExecPlan is a controlled, versioned specification. It must be updated whenever assumptions, boundaries, or invariants change, and it enables a zero-context restart by any engineer.

# ExecPlan-15: Unified Analysis Run Contract (v0)

## Purpose / Big Picture
Establish a single, minimal “run envelope” contract that wraps analysis executions with consistent metadata, artifact references, and trace links. This enables deterministic auditing across multiple analyses (DesignSynth, IEC 60909 short-circuit, future PF/protection) without altering solver result APIs.

## Progress
- [x] (INIT) Define v0 envelope DTO and deterministic fingerprint rules.
- [x] Add DesignSynth adapter mapping to v0 envelope.
- [x] Add ADR documenting v0 contract and versioning rules.
- [x] Add adapter tests for determinism.
- [x] Add protection device-mapping analysis skeleton with run envelope adapter (PR-1).
- [x] Add vendor adapter v0 for protection device catalog mapping with vendor-specific keys (PR-2).

## Surprises & Discoveries
(None.)

## Decision Log
- Decision: Introduce AnalysisRunEnvelope v0 as a thin wrapper around analysis results.
  Rationale: Standardizes run metadata without changing solver result APIs.
  Date/Author: 2026-01 / System Architecture

- Decision: Use evidence UUID as run_id for DesignSynth adapter.
  Rationale: Ensures deterministic correlation between evidence and run metadata.
  Date/Author: 2026-01 / System Architecture

## What This Plan IS / IS NOT

IS:
- A minimal, stable DTO + adapter strategy for run metadata.
- A deterministic fingerprint rule using canonical JSON.

IS NOT:
- A refactor of solver outputs or physics computations.
- A persistence or API routing redesign.
- A change to existing analysis run storage.

## Plan of Work (Small PR)
1) Add ADR documenting the v0 envelope contract and versioning.
2) Add application DTO for AnalysisRunEnvelope + helpers.
3) Add DesignSynth adapter and deterministic tests.
4) Keep solver result APIs unchanged.
5) Add protection device-mapping analysis skeleton using RunIndex + v0 envelope.

## Acceptance
- Envelope DTO is JSON-serializable and deterministic.
- DesignSynth adapter yields stable fingerprints across repeated calls.
- BoundaryNode – węzeł przyłączenia is referenced as an input for connection studies via the spec artifact reference.

## Outcomes & Retrospective
(To be filled after rollout across additional analyses.)
```
