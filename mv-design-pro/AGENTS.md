# MV-DESIGN-PRO Agent Governance

## Authority & Scope
- This repository is governed by ExecPlans. Every non-trivial change MUST be derived from an approved ExecPlan.
- Codex acts as a stateless executor of ExecPlans and MUST NOT invent scope beyond the plan.
- Architectural authority is explicit: only the System Architect defines solver boundaries and dependencies.

## NOT-A-SOLVER Rule (Immutable)
- Protection is NOT a solver.
- Frontend is NOT a solver.
- Reporting is NOT a solver.
- Only dedicated core solvers compute physics.

## Execution Requirements
- Update or create ExecPlans before implementing architectural changes.
- Preserve frozen Result APIs and deterministic behavior.
- Keep all changes auditable and white-box traceable.
- Small PRs are preferred, even when ExecPlans are large.

## Deliverables Discipline
- All ExecPlans must be self-contained, novice-readable, and restartable from zero context.
- Each ExecPlan must define WHAT IT IS and WHAT IT IS NOT, plus NOW vs LATER.
- Use maximal responsibility blocks for stage plans.
