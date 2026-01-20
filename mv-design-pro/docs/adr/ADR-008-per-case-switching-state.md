# ADR-008: Per-case Switching State Model

## Status
Accepted

## Context
Operating cases must represent switching states for breakers, disconnectors, couplers,
and other elements to match substation workflows.

## Decision
We introduce `network_switching_states` keyed by operating case and element IDs, storing
`element_type` and `in_service`. The Network Wizard applies these overrides when building
`NetworkGraph` and solver inputs.

## Consequences
- Switching states remain deterministic and stored in the database.
- Case-specific topology changes are reproducible and auditable.
