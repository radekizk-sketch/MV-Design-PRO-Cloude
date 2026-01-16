# Power Flow Solver v1 + v2 (PR1/PR2)

Power Flow v1 provides a deterministic Newton–Raphson solver for the slack island
using a per-unit system and industrial sign conventions. Power Flow v2 extends
v1 with PV buses, Q-limits, taps, shunts, violations, and kV/kA reporting while
keeping the v1 API stable and avoiding changes to the core network model.

## Usage

```python
from analysis.power_flow import PowerFlowInput, PowerFlowOptions, PowerFlowSolver
from analysis.power_flow import SlackSpec, PQSpec, PVSpec, ShuntSpec, TransformerTapSpec

pf_input = PowerFlowInput(
    graph=graph,
    base_mva=10.0,
    slack=SlackSpec(node_id="A", u_pu=1.0, angle_rad=0.0),
    pq=[PQSpec(node_id="B", p_mw=1.5, q_mvar=0.4)],
    pv=[PVSpec(node_id="C", p_mw=-1.0, u_pu=1.03, q_min_mvar=-0.5, q_max_mvar=0.5)],
    shunts=[ShuntSpec(node_id="B", b_pu=0.1)],
    taps=[TransformerTapSpec(branch_id="T1", tap_ratio=1.05)],
    options=PowerFlowOptions(),
)

result = PowerFlowSolver().solve(pf_input)
print(result.node_voltage_pu)
```

## Per-unit system (pu)

- `p_pu = p_mw / base_mva`, `q_pu = q_mvar / base_mva`.
- Voltages are in pu and angles in radians.
- If nodes expose `voltage_level` (kV), PF v2 also reports `node_voltage_kv`
  and `branch_current_ka` (where feasible). Each node uses its own base voltage.
- If `voltage_level` is missing/zero, kV/kA are omitted and noted in the trace.

## Sign convention

- `p_mw > 0`, `q_mvar > 0` indicates consumption (load).
- `p_mw < 0`, `q_mvar < 0` indicates generation.

## Slack island rule

Only the island connected to the slack node is solved. All other islands are
reported in `white_box_trace.islands.not_solved_island_nodes` and excluded from
`node_voltage_pu`.

## PF v2 extensions (PowerFactory parity minimum)

- PV buses with Qmin/Qmax limits and deterministic PV→PQ switching.
- Transformer off-nominal tap ratio handling (core tap or overlay spec).
- Explicit shunt/compensation elements (overlay).
- Limit reporting with severity ranking (bus voltage, branch loading/current).
- kV/kA conversion where `voltage_level` is available.
- Diagnostics in `white_box_trace` (switches, taps, shunts, violations, sources).

## Core vs overlay data (ADR alignment)

- Core model provides topology, base electrical parameters and ratings.
- PF v2 extensions (PV, shunts, taps, limits) are applied as overlay specs
  keyed by `node_id` or `branch_id`.
- The core model remains unchanged; future model expansion is planned in a
  separate stage (see ADR).

## BACKLOG (beyond PF v2)

1. Convergence stabilization (line search / FDLF option).
2. OLTC control / automatic tap optimization.
3. Batch scenarios / N-1 automation.
