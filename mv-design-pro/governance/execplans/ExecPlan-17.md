```md
Living Document Declaration: This ExecPlan is a controlled, versioned specification. It must be updated whenever assumptions, boundaries, or invariants change, and it enables a zero-context restart by any engineer.

# ExecPlan-17: PR-101 Designer Wizard Skeleton (Read-Only UI)

## Purpose / Big Picture
Add a front-end, read-only wizard skeleton that renders the canonical algorithm steps 1:1 for Designer. The wizard is purely presentational and derives step status only from existing DesignerPage state (snapshot presence, available actions, last action result, backend-provided status/reasons). No backend or solver changes.

## Progress
- [ ] (INIT) Add DesignerWizard component rendering ALG_STEP 1–11 with titles from the canonical algorithm.
- [ ] Integrate DesignerWizard into DesignerPage when snapshotId is present.
- [ ] Keep UI deterministic and non-interactive (no new actions, no API calls).

## Surprises & Discoveries
(None.)

## Decision Log
- Decision: Wizard is read-only and uses only existing DesignerPage state for status display.
  Rationale: Aligns with canonical algorithm and NOT-A-SOLVER rule; UI must not infer or compute.
  Date/Author: 2026-01 / System Architecture

## What This Plan IS / IS NOT

IS:
- A presentational UI list of canonical wizard steps with status badges.
- Deterministic rendering derived only from existing API responses in DesignerPage.

IS NOT:
- Any backend change, solver change, or API change.
- A state machine, auto-advancement, or decision logic.
- A refactor of existing Designer logic beyond integration.

## Plan of Work (Small PR)
1) Create `frontend/src/designer/DesignerWizard.tsx` with step list rendering and status badges.
2) Integrate the wizard into `DesignerPage` when snapshotId is present.
3) Ensure status text uses ALLOW/BLOCK/RETURN/WARNING and reason text is optional.

## Acceptance
- Wizard renders ALG_STEP 1–11 with exact titles from the canonical algorithm.
- Wizard is visible only when snapshotId is present.
- No new API calls or action triggers.
```
