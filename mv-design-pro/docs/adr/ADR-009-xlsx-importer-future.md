# ADR-009: XLSX Importer Deferred

## Status
Accepted

## Context
PR3 requires JSON and CSV import/export. XLSX support is optional and should only be
added if it is already standard in the repository.

## Decision
We defer XLSX import/export to a future PR. JSON and CSV contracts cover all required
workflows for PR3.

## Consequences
- No XLSX importer is included in the current implementation.
- Future work can add XLSX support without breaking existing contracts.
