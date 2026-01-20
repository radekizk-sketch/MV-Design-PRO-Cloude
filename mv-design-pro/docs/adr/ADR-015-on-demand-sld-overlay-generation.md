# ADR-015: On-demand SLD overlay generation

## Status
Accepted

## Context
Analysis results must be visualized on SLDs without persisting overlays in the
database. Overlays should be generated using stored run summaries and current SLD
mappings.

## Decision
We generate overlays on demand by combining `AnalysisRun.result_summary_json` with
SLD symbols via `ResultSldOverlayBuilder`. Overlays are not stored in SLD tables.

## Consequences
- Overlays always reflect the latest mapping without extra migrations.
- Database storage remains lightweight.
- UI remains a pure rendering layer.
