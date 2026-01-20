# ADR-004: Network Import/Export Contracts

## Status
Accepted

## Context
PR3 requires deterministic import/export of network models for API/GUI/CLI usage, with
JSON and CSV payloads and stable UUID handling.

## Decision
We define a JSON export contract that includes project metadata, nodes, branches,
operating cases, study cases, PCC – punkt wspólnego przyłączenia, and sources. CSV
imports support minimal node/branch fields with JSON-encoded attributes. Import reports
include created/updated/skipped counts and validation output.

## Consequences
- Exported payloads are deterministic via stable sorting and canonicalized JSON.
- CSV imports are minimal but sufficient for batch workflows.
- Validation is always executed post-import to ensure industrial-grade consistency.
