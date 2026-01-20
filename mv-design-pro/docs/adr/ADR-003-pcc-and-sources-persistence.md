# ADR-003: Persistence of PCC and Sources

## Status
Accepted

## Context
PR3 requires persistence of PCC – punkt wspólnego przyłączenia and source definitions.
PR2 schema does not include these fields.

## Decision
We extend the `projects` table with:
- `pcc_node_id` (nullable FK to `network_nodes`),
- `sources_jsonb` (deterministic JSON array).

This keeps the schema minimal while preserving deterministic serialization and
transactional updates via repositories.

## Consequences
- PCC and sources are stored alongside project metadata with stable JSON ordering.
- Imports/exports remain simple and avoid additional join tables unless needed later.
