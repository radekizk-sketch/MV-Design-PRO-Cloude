# ADR-014: Separation of solver execution from persistence and UI

## Status
Accepted

## Context
Solver execution must remain isolated from persistence and UI concerns. The UI
should only consume persisted run metadata and on-demand overlays.

## Decision
NetworkWizardService orchestrates runs, builds solver inputs, executes solvers, and
stores lightweight summaries. UI logic and persistence logic are kept out of the
solver layer.

## Consequences
- Solver physics and APIs stay frozen.
- Persistence contains only metadata and summaries.
- UI receives stable, backend-generated data without embedding computations.
