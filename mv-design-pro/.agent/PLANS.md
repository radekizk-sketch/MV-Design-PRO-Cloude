# ExecPlan Constitution

## Purpose
This document defines how ExecPlans are authored, revised, and executed for MV-DESIGN-PRO. It is a living document that must enable a zero-context restart by any engineer or agent.

## Core Principles
- ExecPlans are mandatory for all complex work.
- Each ExecPlan must be self-contained, novice-readable, and restartable from zero context.
- The NOT-A-SOLVER rule is absolute and applies to all layers outside core solvers.
- Frozen Result APIs must remain intact; only adapters are permitted.
- Determinism, auditability, and white-box traceability are non-negotiable.

## Structure of an ExecPlan
- Title and scope.
- What it IS and what it IS NOT.
- NOW vs LATER commitments.
- Dependencies, invariants, and guardrails.
- Progress section with checklists only.

## Living-Document Rules
- Update ExecPlans when assumptions or boundaries change.
- Keep changes additive and explicitly versioned in the plan text.
- Avoid nested code fences; each ExecPlan is a single fenced block.

## Zero-Context Restart Guarantee
- Every plan must allow a new engineer to resume work without prior chat history.
- Every plan must identify authoritative sources within the repo.
