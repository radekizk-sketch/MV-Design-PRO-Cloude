```md
Living Document Declaration: This ExecPlan is a controlled, versioned specification. It must be updated whenever assumptions, boundaries, or invariants change, and it enables a zero-context restart by any engineer.

# ExecPlan-14: Short-Circuit Analyses (SN vs nn, osobne ścieżki)

## Purpose / Big Picture

This plan defines how MV-DESIGN-PRO performs short-circuit analyses in an industrial, auditable way, while strictly separating methodologies for SN and nn. After this change, an engineer can run short-circuit studies that are appropriate to the project design mode (SN network vs nn network), obtain result containers keyed by (case_id, snapshot_id, run_id), and generate evidence suitable for connection-study packages and protection interpretation.

The system will:
- For SN: compute short-circuit quantities under IEC/PN-EN 60909 methodology (three-phase and earth-fault where applicable), using the existing solver result APIs (frozen).
- For nn: run an nn-specific fault-loop / disconnection verification workflow (ADS / Zs / Ia) as a separate path; it must never be “half-implemented” inside SN logic.
- Never mix SN and nn criteria or outputs in a single run.

## Progress

- [x] (INIT) Define ProjectDesignMode gate for all short-circuit workflows (SN_NETWORK vs NN_NETWORK).
- [ ] Specify SN short-circuit scope, inputs, and frozen outputs (IEC/PN-EN 60909).
- [ ] Specify nn fault-loop / ADS scope, inputs, and outputs (separate methodology).
- [x] Define case-level Run types and result container storage rules (no domain mutation).
- [ ] Define evidence and acceptance scenarios for SN and nn separately.
- [ ] Produce implementation map (PR-by-PR) for adding or wiring these analyses without touching frozen solver result APIs.

## Surprises & Discoveries

(Empty at initialization. Record unexpected solver limitations, missing input fields, or mapping ambiguities here with concise evidence.)

## Decision Log

- Decision: Short-circuit analyses are gated by ProjectDesignMode and must not execute outside their mode.
  Rationale: SN and nn are fundamentally different engineering methodologies; mixing them causes incorrect outputs and governance drift.
  Date/Author: 2026-01 / System Architecture

- Decision: SN short-circuit inputs support two modeling entry points: “simplified” (direct SN bus fault parameters) and “full” (WN + WN/SN transformer) consistent with the GPZ entry workflow.
  Rationale: The UI/workflow already distinguishes simplified vs full source modeling at the supply point.
  Date/Author: 2026-01 / System Architecture

- Decision: OZE fault contribution models are explicit and typed (current-source vs voltage-source/impedance) and stored as case-level inputs; short-circuit solver consumes them read-only.
  Rationale: The reference algorithm describes distinct OZE short-circuit model families and typical behaviors; they must not be inferred.
  Date/Author: 2026-01 / System Architecture

- Decision: No “DesignSynth cable sizing” logic is embedded in short-circuit analyses. Cable sizing for nn is not part of SN short-circuit work, and vice versa.
  Rationale: Prevents cross-methodology leakage and keeps scope auditable.
  Date/Author: 2026-01 / System Architecture

## Outcomes & Retrospective

(To be filled after SN and nn paths are implemented and validated with artifacts.)

## Context and Orientation

MV-DESIGN-PRO is snapshot-based. The NetworkGraph snapshot is immutable; mutations occur only via explicit Wizard actions that create a new snapshot (ExecPlan-08). Analyses are case-level activities producing result containers keyed to (case_id, snapshot_id, run_id) (ExecPlan-10/11). The short-circuit result API for IEC 60909 is already considered frozen in the project’s governance context.

The product’s algorithmic UI specification describes the supply-point (“GPZ”) modeling with a simplified mode (direct short-circuit parameters at SN bus) and a full mode (WN network + WN/SN transformer, then derived SN fault strength).

This plan defines how short-circuit analyses are executed, stored, and validated for SN vs nn as separate, non-interchangeable paths.

## Definitions (plain language)

- SN: średnie napięcie.
- nn: niskie napięcie.
- ProjectDesignMode: the project-wide mode indicating whether the designed network is SN_NETWORK or NN_NETWORK. Short-circuit analyses must enforce this gate.
- Short-circuit analysis (SN): computing fault currents and related quantities for SN networks under IEC/PN-EN 60909 assumptions.
- Fault-loop / ADS analysis (nn): verification of disconnection conditions in nn, typically expressed via loop impedance and protection trip conditions; treated as a different method than IEC 60909 SN studies.
- Evidence: the auditable artifact set that proves a result is tied to a specific snapshot and solver run and includes white-box traces when available.

## What This Plan IS / IS NOT

IS:
- A frozen specification for two separate short-circuit analysis paths (SN vs nn), their gating, required inputs, and outputs as case-level artifacts.
- A definition of run/evidence rules and acceptance criteria for these analyses.

IS NOT:
- A change to domain semantics (ExecPlan-01).
- A frontend/UI rendering plan (ExecPlan-07/09).
- A plan to implement cable sizing in short-circuit logic.
- A change to frozen solver result APIs.

## ProjectDesignMode Gate (Non-negotiable)

All short-circuit workflows MUST begin by determining ProjectDesignMode:

- SN_NETWORK:
  - Allowed: SN short-circuit analyses (IEC/PN-EN 60909 scope).
  - Forbidden: nn fault-loop / ADS computations.
- NN_NETWORK:
  - Allowed: nn fault-loop / ADS computations.
  - Forbidden: SN IEC/PN-EN 60909 SN short-circuit pipeline.

If mode is missing or ambiguous, the system must return a hard, machine-readable error. No fallback assumptions.

## SN Path — Short-Circuit Analyses (IEC/PN-EN 60909)

### Purpose (SN)

Provide fault quantities for SN networks suitable for:
- equipment duty checks (e.g., thermal and dynamic),
- protection interpretation (in the protection layer, case-level),
- connection-study evidence.

### Inputs (SN, case-level)

Inputs are explicit and must not be inferred. Two supported supply modeling entry points:

1) Simplified supply point (direct SN bus parameters):
- Un(SN)
- Sk" at SN bus OR Ik" at SN bus OR equivalent Rs/Xs
- R/X ratio
- c-factors cmax/cmin
These align with the supply-point workflow where the user inputs Sk" or Ik" plus R/X and c-factors.

2) Full supply point (WN + WN/SN transformer):
- Un(WN), Sk"(WN), R/X at WN
- Transformer parameters (Sn, uk, ΔPk, vector group if applicable)
- Derived equivalent seen on SN
This aligns with the “full mode” workflow and the derived SN fault strength presentation.

OZE contribution inputs (optional, typed):
- PV / BESS / FW current-source models with k-factor limits (e.g., Ik"/In typical ranges) and R/X assumptions where explicitly set.
- DFIG/SCIG impedance-type models with X"d etc. as explicit inputs when selected.
The reference algorithm distinguishes these model families and typical behaviors; implement them as explicit types rather than inference.

Network topology inputs:
- Snapshot (NetworkGraph) with in_service filtering.
- Explicit switch states if modeled as topology changes (no hidden edits).

### Scope (SN)

At minimum:
- 3-phase short-circuit at selected nodes (including BoundaryNode – węzeł przyłączenia, when present).
- Earth-fault short-circuit only if the network has explicit earthing/return-path modeling adequate for it; otherwise, do not fake it.

Outputs must include at least the frozen IEC 60909 quantities already established in the project (e.g., Ik", Ib, Ith, peak/dynamic where available, Sz/Sk where defined by existing APIs). Do not rename or restructure existing result container fields.

### Outputs (SN, case-level)

- ShortCircuitResult container keyed by:
  - case_id
  - snapshot_id
  - run_id
- White-box trace attached verbatim as already standardized by the project result API.

No domain mutation. No storing complex types that are not JSON-safe; results must be serializable in the established canonical format.

### SN Acceptance (behavior)

- Running SN short-circuit analysis on the same snapshot produces deterministic results and trace ordering.
- Results are referenced to the snapshot_id and do not “float” with later snapshots.
- If the supply point is defined in simplified mode, results reference the entered Sk"/R/X/c factors; if full mode, evidence references transformer and WN parameters.

## nn Path — Fault-Loop / ADS Analyses (Separate Methodology)

### Purpose (nn)

Provide nn-specific disconnection verification suitable for:
- confirming protective disconnection conditions,
- producing evidence for acceptance of nn networks.

This is not IEC 60909 SN fault duty analysis. It is a separate path.

### Inputs (nn, case-level)

- NN network type (TN/TT/IT) as explicit case input.
- Protective device data as explicit case-level settings (not computed here).
- Required line/loop modeling data must be explicit; if the domain snapshot does not represent the needed return paths/PE/PEN, the nn path must fail rather than infer.

### Scope (nn)

- Compute/verify loop impedance and trip conditions for designated endpoints (feeds, circuits).
- Provide PASS/FAIL and margins as evidence artifacts.
- Any physics computation required for nn must be performed by a dedicated solver path, not by UI or by SN logic.

### Outputs (nn, case-level)

- NnFaultLoopResult container keyed by:
  - case_id
  - snapshot_id
  - run_id
- Evidence includes:
  - explicit device assumptions used,
  - computed loop values,
  - PASS/FAIL by rule statement.

### nn Acceptance (behavior)

- Deterministic results for the same snapshot + case inputs.
- Explicit hard failure if required return-path/earthing inputs are missing (no heuristics).
- No reuse of SN IEC 60909 outputs as “nn substitute”.

## Plan of Work

### Milestone M1 — Gating & Run Types (No new math)

- Introduce ProjectDesignMode enforcement for analyses execution routing.
- Add analysis run types:
  - short_circuit_sn
  - fault_loop_nn
- Ensure persistence, run_id plumbing, and evidence storage follow existing patterns.

### Milestone M2 — SN Wiring (IEC 60909)

- Wire existing/frozen SN short-circuit solver into the analysis-run service under short_circuit_sn.
- Ensure input mapping supports both simplified and full supply point modes, as in the GPZ workflow.
- Ensure OZE model inputs are explicit and typed as per the algorithm’s model families.

### Milestone M3 — nn Path Stub + Hard Fail (Safety-first)

- Add nn fault-loop analysis entrypoint that validates required inputs and fails clearly if missing.
- Do not implement “partial nn” inside SN pipelines.

### Milestone M4 — nn Solver Implementation (Dedicated)

- Implement nn fault-loop computations as a dedicated solver module (not in UI, not in DesignSynth).
- Add evidence-first acceptance tests.

## Concrete Steps

From repository root:

1) Add governance doc:
   - mv-design-pro/governance/execplans/ExecPlan-14.md (this file)

2) Add design mode gate:
   - Extend project/case metadata to store ProjectDesignMode (SN_NETWORK / NN_NETWORK).
   - Enforce in analysis run creation/execution.

3) Add analysis run types:
   - Ensure run lifecycle stores (case_id, snapshot_id, run_id, result_type, result_json).

4) Implement SN short-circuit analysis wiring:
   - Map inputs for GPZ simplified/full.
   - Preserve result API and trace.

5) Implement nn entrypoint:
   - Validate required nn inputs; if missing → explicit error.
   - In later PRs: add dedicated nn solver and tests.

## Validation and Acceptance

Acceptance requires separate scenario sets for SN and nn:

SN Scenarios:
- A: Simplified supply point (Sk"/R/X/c factors) → SC run produces results and trace keyed to snapshot_id.
- B: Full supply point (WN + WN/SN transformer) → derived SN fault strength and SC run evidence references transformer parameters.
- C: OZE current-source vs impedance-source selection changes results only when explicitly configured, never inferred.

nn Scenarios:
- D: NN mode set, required earthing/return-path inputs present → fault-loop run produces PASS/FAIL evidence.
- E: Missing nn-required inputs → hard fail with explicit reason codes.

Global:
- Determinism: same snapshot + same case inputs → identical results/evidence.
- NOT-A-SOLVER: UI/SLD never compute these values; only solver runs generate them.

## Idempotence and Recovery

- Re-running a short-circuit analysis for the same (case_id, snapshot_id) produces a new run_id but identical numerical results and trace ordering (within solver determinism).
- Recovery is performed by selecting the prior snapshot_id and rerunning; historical results remain immutable.

## Artifacts and Notes

Artifacts produced:
- SN: ShortCircuitResult JSON (canonical) + white-box trace + evidence statements referencing supply modeling mode.
- nn: NnFaultLoopResult JSON (canonical) + PASS/FAIL evidence.

All future work must preserve:
- Mode separation (SN vs nn),
- Frozen result APIs,
- Snapshot-based, read-only consumption and auditable run/evidence linkage.

---

Change Note (initial creation):
- Created ExecPlan-14 to formalize strict separation of SN IEC/PN-EN 60909 short-circuit analyses and nn fault-loop/ADS analyses, gated by ProjectDesignMode, with snapshot/run-based evidence storage.
- Rationale: prevent methodology mixing, enforce auditability, and align with the existing GPZ supply modeling workflows (simplified vs full).
```
