# ADR-005: Solver Input DTO Contracts

## Status
Accepted

## Context
PR3 must build solver inputs without invoking solvers. Power Flow already exposes
`PowerFlowInput`, while short-circuit analysis lacks an application-level input DTO.

## Decision
We introduce `ShortCircuitInput` as an application-level DTO within the Network Wizard
module. It holds `NetworkGraph`, BoundaryNode – węzeł przyłączenia, sources, and
fault/options dictionaries. Power Flow input continues to use the existing
`analysis.power_flow.types.PowerFlowInput` without modifications.

## Consequences
- Solver physics and result APIs remain untouched.
- API/GUI/CLI can assemble short-circuit inputs deterministically.
