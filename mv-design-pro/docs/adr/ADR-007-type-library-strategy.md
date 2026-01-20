# ADR-007: Type Library Strategy (Line/Cable/Transformer)

## Status
Accepted

## Context
The Network Wizard must support catalog-driven element types for lines, cables, and
transformers while allowing fallback parameters for bespoke assets.

## Decision
We store type libraries in dedicated tables (`line_types`, `cable_types`,
`transformer_types`) with deterministic JSON parameters. Network elements may reference
`type_id` or provide direct parameters.

## Consequences
- Catalogs can be imported/exported as part of network payloads.
- Validation can enforce type completeness or fallback parameters.
