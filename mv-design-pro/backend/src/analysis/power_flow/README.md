# Power Flow Solver v1 (PR1)

Power Flow v1 provides a deterministic Newton–Raphson solver for the slack island
using a per-unit system and industrial sign conventions. The module is designed
as a stable analytical component ready for PowerFactory-style extensions in PF v2.

## Usage

```python
from analysis.power_flow import PowerFlowInput, PowerFlowOptions, PowerFlowSolver
from analysis.power_flow.types import SlackSpec, PQSpec

pf_input = PowerFlowInput(
    graph=graph,
    base_mva=10.0,
    slack=SlackSpec(node_id="A", u_pu=1.0, angle_rad=0.0),
    pq=[PQSpec(node_id="B", p_mw=1.5, q_mvar=0.4)],
    options=PowerFlowOptions(),
)

result = PowerFlowSolver().solve(pf_input)
print(result.node_voltage_pu)
```

## Per-unit system (pu)

- `p_pu = p_mw / base_mva`, `q_pu = q_mvar / base_mva`.
- Voltages are in pu and angles in radians.
- If nodes expose `voltage_level` (kV), the solver interprets pu results with
  respect to the slack node base voltage. PF v1 does not yet return kV/kA.
- If `voltage_level` is missing/zero, PF v1 operates in pu-only mode.

## Sign convention

- `p_mw > 0`, `q_mvar > 0` indicates consumption (load).
- `p_mw < 0`, `q_mvar < 0` indicates generation.

## Slack island rule

Only the island connected to the slack node is solved. All other islands are
reported in `white_box_trace.islands.not_solved_island_nodes` and excluded from
`node_voltage_pu`.

## v1 limitations

- Slack + PQ only (no PV buses).
- No OLTC or off-nominal tap handling.
- No explicit shunt elements or compensation devices.
- No limit enforcement (voltages, currents, apparent power).
- Base-voltage conversion to kV/kA deferred to v2.

## BACKLOG PF v2 (PowerFactory parity minimum)

1. PV buses with Qmin/Qmax and automatic PV↔PQ switching.
2. Transformer off-nominal ratio/tap + optional OLTC control.
3. Explicit shunt/compensation elements.
4. Limit reporting: Umin/Umax, Imax/Smax with ranking of violations.
5. kV/kA conversion when `voltage_level` is available.
6. Convergence stabilization (line search / FDLF option).
7. Batch scenarios / N-1 automation.
