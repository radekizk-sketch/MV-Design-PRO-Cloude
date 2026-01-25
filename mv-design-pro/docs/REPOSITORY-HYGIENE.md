# Repository Hygiene Specification

## Purpose
Define the structural hygiene for MV-DESIGN-PRO to preserve determinism, auditability, and clear solver boundaries.

## KEEP
- `backend/` as the authoritative home for core solvers and Result APIs.
- `frontend/` as the deterministic engineering interface (no physics).
- `SYSTEM_SPEC.md` as the single source of architectural truth.
- `docs/` for operational guides and checklists (non-architectural).
- `docs/audit/historical_execplans/` as the historical storage for legacy ExecPlans (non-canonical).

## REMOVE
- Ad-hoc or duplicated solver logic in non-solver layers.
- Unversioned documents that conflict with ExecPlans or frozen APIs.
- Any reporting logic that recomputes or approximates physics.

## CREATE
- Governance artifacts: `AGENTS.md` and `.agent/PLANS.md`.
- Audit reports in `docs/audit/` (including historical ExecPlans where needed).
- Traceability documentation tied to Result APIs.
- CI architectural guard (`scripts/arch_guard.py`) enforcing solver/analysis boundaries.

## Architectural Rationale
- Enforces clear solver boundaries and prevents physics leakage.
- Keeps governance and plans discoverable and auditable.
- Aligns repository structure with deterministic, role-based workflows.
