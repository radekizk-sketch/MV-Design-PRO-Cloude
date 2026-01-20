# ADR-013: AnalysisRun as auditable execution unit

## Status
Accepted

## Context
PR5 requires a unified, auditable lifecycle for Power Flow and Short Circuit runs.
Runs must capture deterministic input snapshots and execution metadata without
changing solver APIs or storing heavy results in the database.

## Decision
We introduce `AnalysisRun` as a persisted execution unit with a deterministic `id`,
status lifecycle (REQUESTED → VALIDATED → RUNNING → FINISHED/FAILED), and a canonical
input snapshot. Only lightweight result summaries are stored.

## Consequences
- Runs are traceable and reproducible from their input snapshots.
- Solver APIs remain unchanged.
- The database stores only minimal summaries and error diagnostics.
