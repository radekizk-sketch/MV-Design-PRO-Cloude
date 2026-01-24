# Solvers — Notes (Operational)

> **Canonical definitions live in** [`SYSTEM_SPEC.md`](../SYSTEM_SPEC.md).
> This document is a practical orientation guide and avoids architectural decisions.

## 1. Where solvers live (as-is)
- **IEC 60909 short-circuit solver:**
  - `backend/src/network_model/solvers/short_circuit_iec60909.py`
- **Power Flow implementation (as-is location):**
  - `backend/src/analysis/power_flow/`

> **Note:** Power Flow is a solver by definition, even though its implementation currently resides under `analysis/`.
> See `SYSTEM_SPEC.md` for the binding semantics.

## 2. Operational conventions
- **Do not change** frozen Result APIs (IEC 60909).
- **White-box trace** must remain explicit and auditable.
- Keep solver changes deterministic and traceable.

## 3. Adding or updating solver documentation
- Document only **operational steps** here (e.g., how to run a solver, how to locate inputs/outputs).
- All solver semantics and boundary decisions belong in `SYSTEM_SPEC.md`.
