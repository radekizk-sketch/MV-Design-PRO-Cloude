# PowerFactory UI Parity Guidelines

**Reference:** SYSTEM_SPEC.md Section 18, ARCHITECTURE.md Section 14
**Status:** CANONICAL

---

## A. Lifecycle obliczeń (Calculation Lifecycle)

### A.1 Explicit Calculate Step

Calculations MUST be explicitly triggered by the user:

```
User clicks "Calculate"
        │
        ▼
NetworkValidator.validate()
        │
        ├── INVALID → Display errors, BLOCK solver
        │
        └── VALID
              │
              ▼
        Solver.solve()
              │
              ▼
        Results stored, state = FRESH
```

**Rules:**
- Solver MUST NOT run automatically on model change
- User MUST explicitly initiate calculation
- Invalid model MUST block solver execution (no override)

### A.2 Result Freshness States

| State | Description | User Action Required |
|-------|-------------|---------------------|
| **NONE** | Never computed | Run calculation |
| **FRESH** | Results current with model | None |
| **OUTDATED** | Model changed since computation | Re-run calculation |

**State Transitions:**

```
NONE ────────────► FRESH (after successful calculation)
                      │
                      │ (model change)
                      ▼
                  OUTDATED ────────► FRESH (after re-calculation)
                      │
                      │ (model change)
                      └──────────────► OUTDATED (stays outdated)
```

### A.3 Invalid Model Blocking

When NetworkValidator reports errors:

| Condition | Solver State | User Message |
|-----------|--------------|--------------|
| Validation ERROR | BLOCKED | "Model invalid. Fix errors before calculation." |
| Validation WARNING only | ALLOWED | "Warnings present. Proceed with calculation?" |
| Valid (no issues) | ALLOWED | (no message) |

---

## B. Semantyka `in_service` (In Service Semantics)

### B.1 Definition

The `in_service` flag determines element participation in calculations:

| `in_service` Value | Solver Behavior | SLD Appearance |
|--------------------|-----------------|----------------|
| `True` | Element INCLUDED in calculation | Normal display |
| `False` | Element EXCLUDED from calculation | Grayed out, dashed |

### B.2 Out-of-Service Element Display

Elements with `in_service = False`:

```
┌─────────────────────────────────────────┐
│ In Service (normal):                    │
│                                         │
│   ════════════════════  (solid line)    │
│                                         │
│ Out of Service:                         │
│                                         │
│   ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  (dashed, gray)  │
│                                         │
└─────────────────────────────────────────┘
```

**Rules:**
- Out-of-service elements MUST remain visible in SLD
- Out-of-service elements MUST be visually distinguished (grayed)
- Out-of-service elements MUST be excluded from solver input

### B.3 Distinction: `in_service` vs Switch State

| Property | Meaning | Affects Topology |
|----------|---------|------------------|
| `in_service = False` | Element does not exist for solver | Yes (removed) |
| `Switch.state = OPEN` | Connection interrupted | Yes (disconnected) |
| `Switch.state = CLOSED` | Connection active | No |

**Critical Distinction:**
- `in_service` removes the element entirely from solver consideration
- `Switch.OPEN` only interrupts the topological path (switch still exists)

---

## C. Property Grid

### C.1 Canonical Field Set

Each element type has a canonical, fixed set of fields:

| Field Category | Examples | Source |
|----------------|----------|--------|
| Identity | id, name | User input |
| Topology | from_bus_id, to_bus_id | User input |
| Electrical (direct) | length_km | User input |
| Electrical (from Type) | r_ohm_per_km, x_ohm_per_km | Catalog (read-only) |
| Status | in_service | User input |

### C.2 Unit Display

**MANDATORY:** Every numeric field MUST display its unit:

| Field | Display Format |
|-------|----------------|
| Length | `0.350 km` |
| Resistance | `0.206 Ω/km` |
| Reactance | `0.080 Ω/km` |
| Current | `270 A` |
| Voltage | `15.0 kV` |
| Power | `10.0 MVA` |

### C.3 Field Order Determinism

**MANDATORY:** Field display order MUST be deterministic:

1. Identity fields (name, id)
2. Topology fields (from_bus, to_bus)
3. Type reference
4. Electrical parameters (from type, read-only)
5. Local parameters (user-editable)
6. Status fields (in_service)

---

## D. Validation Philosophy

### D.1 Severity Levels

| Severity | Meaning | Solver Impact |
|----------|---------|---------------|
| **ERROR** | Critical issue | BLOCKS solver |
| **WARNING** | Non-critical issue | Solver allowed (with confirmation) |

### D.2 No Auto-Repair

**FORBIDDEN:**
- Automatic correction of invalid values
- Silent defaulting of missing parameters
- "Smart" fixes without user consent

**REQUIRED:**
- Display error message with specific issue
- User must manually correct the problem
- Re-validate after correction

### D.3 Validation Message Format

```
[ERROR] bus.voltage_valid: Bus "Bus_001" voltage must be > 0 (current: 0.0 kV)
[ERROR] network.source_present: Network requires at least one Source
[WARNING] branch.high_loading: Line "Line_005" may exceed thermal rating
```

---

## E. Determinizm i audyt (Determinism and Audit)

### E.1 Deterministic Computation

**INVARIANT:** Same input MUST produce same output, always.

```
NetworkSnapshot_A + CaseParameters_A → Result_A

If NetworkSnapshot_A == NetworkSnapshot_B
   AND CaseParameters_A == CaseParameters_B
THEN Result_A == Result_B (identical)
```

### E.2 No Randomness

**FORBIDDEN:**
- Random number generation in solvers
- Non-deterministic algorithm selection
- Time-dependent calculation variations
- Platform-dependent floating-point behavior (where avoidable)

### E.3 Audit Trail Requirements

Every calculation MUST produce:

| Artifact | Content |
|----------|---------|
| Input Snapshot | Frozen NetworkModel state |
| Parameters | All solver configuration |
| Intermediate Values | Y-bus matrix, impedances, iterations |
| Output Results | Final calculated values |
| Trace | Step-by-step calculation log |

### E.4 Manual Verification

**REQUIRED:** Any calculation step MUST be manually reproducible:

```
Given: WhiteBoxTrace with intermediate values
User can: Verify any step with calculator/spreadsheet
Result: Exact match between manual and solver computation
```

---

**END OF POWERFACTORY UI PARITY GUIDELINES**
