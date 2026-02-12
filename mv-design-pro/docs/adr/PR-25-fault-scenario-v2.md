# PR-25: Fault Scenario v2 — Contract, Validation, Eligibility, Binding, Determinism

## Status

IMPLEMENTED

## Context

PR-19/PR-24 introduced FaultScenario v1 with metallic-only faults and BUS/BRANCH location types. PR-25 extends the domain to support:

1. **Fault impedance (Zf)** — explicit user-provided impedance for faults through impedance
2. **Branch-point faults** — faults at arbitrary points on branches (alpha parameter)
3. **Arc parameters** — reserved field for future arc modeling (rejected in v2)

All extensions are backward-compatible. The solver (IEC 60909) is NOT modified.

## Decision

### Data Schema (v2)

```
FaultScenarioV2:
  id: UUID (stable)
  study_case_id: UUID
  name: str (PL, required)
  fault_type: SC_3F | SC_2F | SC_1F
  fault_mode: METALLIC | IMPEDANCE          # NEW (v2)
  fault_impedance?: { r_ohm, x_ohm }       # NEW (v2), required for IMPEDANCE
  fault_location:
    location_type: BUS | BRANCH | NODE | BRANCH_POINT
    element_ref: str
    position: float | null                   # alpha for BRANCH_POINT [0,1]
  arc_params: null                           # NEW (v2), reserved, rejected
  config: ShortCircuitConfig
  fault_impedance_type: METALLIC             # Legacy (v1), kept for compat
  z0_bus_data: dict | null
  content_hash: SHA-256
```

### Error Codes

| Code | Condition | Message (PL) | FixAction |
|------|-----------|--------------|-----------|
| `fault.mode_conflict_impedance_provided` | METALLIC + fault_impedance | Tryb metaliczny nie dopuszcza impedancji zwarcia | OPEN_MODAL |
| `fault.impedance_missing` | IMPEDANCE without fault_impedance | Tryb impedancyjny wymaga jawnej impedancji zwarcia | OPEN_MODAL |
| `fault.location.branch_point_alpha_missing` | BRANCH_POINT without position | Lokalizacja BRANCH_POINT wymaga parametru alpha | NAVIGATE_TO_ELEMENT |
| `fault.location.branch_point_alpha_out_of_range` | position outside [0,1] | Parametr alpha musi byc w zakresie [0, 1] | NAVIGATE_TO_ELEMENT |
| `fault.arc_params_unsupported` | arc_params not None | Parametry luku nie sa obsługiwane | OPEN_MODAL |
| `ELIG_BINDING_UNSUPPORTED_FAULT_IMPEDANCE` | IMPEDANCE in eligibility | Tryb zwarcia przez impedancje nie jest jeszcze obsługiwany | OPEN_MODAL |
| `ELIG_BINDING_UNSUPPORTED_BRANCH_POINT` | BRANCH_POINT in eligibility | Zwarcie w punkcie na galezi nie jest jeszcze obsługiwane | NAVIGATE_TO_ELEMENT |

### Adapter Mapping

The binding layer (`short_circuit_binding.py`) is NOT modified. v2 features that cannot be mapped to the solver are gated at the eligibility layer:

- **IMPEDANCE mode**: Blocked by `ELIG_BINDING_UNSUPPORTED_FAULT_IMPEDANCE` in eligibility check. The solver does not have a Zf parameter, and adding one would violate the solver-frozen invariant.
- **BRANCH_POINT location**: Blocked by `ELIG_BINDING_UNSUPPORTED_BRANCH_POINT` in eligibility check. The solver operates on nodes only; splitting a branch would require heuristics (forbidden).

### No Heuristics Rule

The following are explicitly forbidden:
- Auto-selection of nearest node for BRANCH_POINT
- Auto-splitting of branches
- Default impedance values for IMPEDANCE mode
- Auto-calculation of arc parameters
- Implicit conversion from BRANCH_POINT to NODE

### Determinism

1. **Hash**: `content_hash = SHA-256(canonical_json(sorted_keys, compact_separators))`
2. **Fields in hash**: analysis_type, arc_params, config, fault_impedance, fault_impedance_type, fault_mode, fault_type, location, name, z0_bus_data
3. **Stable JSON**: `json.dumps(content, sort_keys=True, separators=(",", ":"))`
4. **Tests**: `test_fault_scenario_v2_determinism.py` — 5 formal proof classes

### Backward Compatibility

- v1 scenarios (with `fault_impedance_type: METALLIC`, no `fault_mode`) deserialize correctly
- `fault_mode` defaults to `METALLIC` when absent in `from_dict()`
- `fault_impedance` defaults to `None`
- `arc_params` defaults to `None`
- `BUS` and `BRANCH` location types still valid

### Files Changed

| File | Change |
|------|--------|
| `backend/src/domain/fault_scenario.py` | FaultMode, FaultImpedance, v2 fields, validation |
| `backend/src/api/fault_scenarios.py` | v2 request/response models |
| `backend/src/application/fault_scenario_service.py` | v2 create/update/eligibility/overlay |
| `frontend/src/ui/fault-scenarios/types.ts` | v2 TypeScript types |
| `frontend/src/ui/fault-scenarios/FaultScenarioModal.tsx` | v2 UI (mode, Zf, location) |
| `frontend/src/ui/fault-scenarios/FaultScenariosPanel.tsx` | v2 display |
| `backend/tests/test_fault_scenario_v2.py` | v2 domain tests |
| `backend/tests/test_fault_scenario_v2_determinism.py` | Determinism proofs |

### Files NOT Changed (Solver Untouched)

- `backend/src/network_model/solvers/short_circuit_iec60909.py` — FROZEN
- `backend/src/network_model/solvers/short_circuit_core.py` — FROZEN
- `backend/src/application/solvers/short_circuit_binding.py` — UNCHANGED

## Consequences

1. v2 contract is in place for future solver extensions (adding Zf support, branch-point splitting)
2. UI supports full v2 editing (mode, impedance, branch-point alpha)
3. Unsupported features fail deterministically with Polish error messages and FixActions
4. ResultSet v1 is untouched — scenario impacts input/hash, not result structure
5. Zero PCC references introduced
