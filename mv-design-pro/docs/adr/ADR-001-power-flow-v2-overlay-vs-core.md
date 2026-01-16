# ADR-001: Power Flow v2 - overlay specs vs core model

## Status
Accepted (PR2: Power Flow Solver v2)

## Context
Power Flow v2 extends PF v1 with PV buses, shunts, taps, limits and additional
reporting. The core network model currently exposes basic topology and electrical
parameters and is also used by other solvers (IEC 60909).

We need PF v2 parity with PowerFactory-style extensions without refactoring the
core model or impacting short-circuit calculations.

## Decision
All PF v2 extensions are modeled as overlay specifications keyed by `node_id`
or `branch_id`:
- PV setpoints and Q limits (`PVSpec`)
- Shunt elements (`ShuntSpec`)
- Transformer tap ratios (`TransformerTapSpec`)
- Voltage and branch limits (`BusVoltageLimitSpec`, `BranchLimitSpec`)

The core network model remains unchanged. PF v2 reads core data for topology,
base impedances and ratings, then applies overlays during Y-bus assembly and
post-processing.

## Consequences
- Backward compatibility for PF v1 and existing APIs is preserved.
- IEC 60909 solver remains untouched and stable.
- Additional data for PF v2 can be provided without core schema changes.
- A future ADR can revisit core model expansion once PF v2 stabilizes.
