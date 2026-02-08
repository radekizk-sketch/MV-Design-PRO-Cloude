# ADR-006: Persistence of BoundaryNode, Sources, Loads, Grounding, Limits

## Status
Accepted

## Context
PR3 requires explicit persistence for BoundaryNode – węzeł przyłączenia, sources, loads,
network grounding, and operational limits. JSON payloads must remain deterministic and
schema-driven for import/export workflows.

## Decision
We introduce dedicated tables:
- `project_settings` for BoundaryNode, grounding, and limits
- `network_sources` and `network_loads` for node-attached assets

All payloads are stored as deterministic JSON and accessed only through repositories.

## Consequences
- Project configuration stays atomic and consistent across SQLite/PostgreSQL.
- Import/export workflows remain deterministic and versionable.
