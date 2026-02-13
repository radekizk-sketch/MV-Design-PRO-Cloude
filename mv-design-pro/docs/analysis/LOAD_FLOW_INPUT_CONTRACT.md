# LOAD FLOW INPUT CONTRACT — LoadFlowRunInput

> **Status**: BINDING (RUN #2A)
> **Date**: 2026-02-13
> **Scope**: Canonical input contract for `LoadFlowRunInput` — the application-level load flow run specification
> **Layer**: Application (wraps solver-level `PowerFlowInput`)
> **Rule**: ZERO DEFAULTS. Every field is mandatory and explicit. Missing fields produce `ValidationError` with stable error codes and deterministic `FixAction` payloads.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Contract Overview](#2-contract-overview)
3. [Section 1: slack_definition (MANDATORY)](#3-section-1-slack_definition-mandatory)
4. [Section 2: start_mode (MANDATORY)](#4-section-2-start_mode-mandatory)
5. [Section 3: convergence (MANDATORY)](#5-section-3-convergence-mandatory)
6. [Section 4: modeling_mode (MANDATORY)](#6-section-4-modeling_mode-mandatory)
7. [Section 5: load_modeling (MANDATORY)](#7-section-5-load_modeling-mandatory)
8. [Section 6: solver_options (MANDATORY)](#8-section-6-solver_options-mandatory)
9. [Validation Error Codes (Complete Registry)](#9-validation-error-codes-complete-registry)
10. [Canonical Serialization](#10-canonical-serialization)
11. [Mapping to Solver-Level PowerFlowInput](#11-mapping-to-solver-level-powerfloweinput)
12. [Invariants](#12-invariants)

---

## 1. Design Principles

### 1.1 ZERO DEFAULTS

`LoadFlowRunInput` is a **zero-defaults** contract. Every parameter that influences calculation results MUST be provided explicitly by the caller. There are no implicit fallbacks, no auto-inferred values, no heuristic substitutions.

**Rationale**: Defaults hide engineering decisions. In a safety-critical MV network design tool, every calculation parameter must be a conscious, auditable choice made by the engineer.

### 1.2 Relationship to PowerFlowInput

| Layer | Type | Purpose |
|-------|------|---------|
| Application | `LoadFlowRunInput` | User-facing contract. ZERO DEFAULTS. Validated before execution. |
| Solver | `PowerFlowInput` | Solver-internal contract. Accepts defaults (legacy). Fed by validated `LoadFlowRunInput`. |

`LoadFlowRunInput` wraps and populates `PowerFlowInput`. The solver-level `PowerFlowInput` is NOT modified (frozen API). The application layer translates a validated `LoadFlowRunInput` into a fully-populated `PowerFlowInput` with no remaining ambiguity.

### 1.3 Validation-First Architecture

Every missing or invalid field produces a `ValidationError` with:
- A **stable error code** (string, prefixed `LF_`)
- A **Polish human-readable message** (`message_pl`)
- A **FixAction** payload (deterministic, machine-readable suggestion)

FixActions are **never auto-executed**. They are rendered by the frontend as clickable suggestions.

---

## 2. Contract Overview

```python
@dataclass(frozen=True)
class LoadFlowRunInput:
    """
    Canonical input contract for Load Flow analysis.

    ZERO DEFAULTS. Every field is mandatory.
    Missing fields produce ValidationError with FixAction.

    Application-level contract — wraps solver-level PowerFlowInput.
    """

    # --- Network Reference ---
    network_snapshot_id: str                          # Binding reference to frozen network snapshot
    base_mva: float                                   # System base power [MVA], explicit

    # --- Sections (all MANDATORY) ---
    slack_definition: SlackDefinition                  # Section 1
    start_mode: StartMode                              # Section 2
    convergence: ConvergenceSpec                       # Section 3
    modeling_mode: ModelingMode                        # Section 4
    load_modeling: LoadModelingSpec                    # Section 5
    solver_options: SolverOptions                      # Section 6
```

### 2.1 Top-Level Fields

| Field | Type | Description | Missing Error |
|-------|------|-------------|---------------|
| `network_snapshot_id` | `str` | UUID of frozen network snapshot | `LF_MISSING_SNAPSHOT` |
| `base_mva` | `float` | System base power in MVA (must be > 0, finite) | `LF_MISSING_BASE_MVA` |
| `slack_definition` | `SlackDefinition` | Slack bus specification | `LF_MISSING_SLACK` |
| `start_mode` | `StartMode` | Initial voltage profile | `LF_MISSING_START_MODE` |
| `convergence` | `ConvergenceSpec` | Convergence criteria | `LF_MISSING_CONVERGENCE` |
| `modeling_mode` | `ModelingMode` | Power flow modeling type | `LF_MISSING_MODELING_MODE` |
| `load_modeling` | `LoadModelingSpec` | Explicit load P+Q specifications | `LF_MISSING_LOAD_MODELING` |
| `solver_options` | `SolverOptions` | Solver method and parameters | `LF_MISSING_SOLVER_OPTIONS` |

---

## 3. Section 1: slack_definition (MANDATORY)

### 3.1 Type Definition

```python
class SlackType(str, Enum):
    SINGLE = "SINGLE"
    DISTRIBUTED = "DISTRIBUTED"


@dataclass(frozen=True)
class SingleSlackSpec:
    """Single slack bus specification."""
    slack_node_id: str          # Explicit, stable node ID (must exist in snapshot)
    u_pu: float                 # Voltage magnitude [p.u.], explicit
    angle_rad: float            # Voltage angle [rad], explicit (0.0 is acceptable — reference)


@dataclass(frozen=True)
class DistributedSlackContributor:
    """One contributor to distributed slack."""
    source_id: str              # Source element ID (must have generation capability)
    weight: float               # Participation factor (0.0 < weight <= 1.0)


@dataclass(frozen=True)
class DistributedSlackSpec:
    """Distributed slack specification."""
    contributors: tuple[DistributedSlackContributor, ...]   # Sorted by source_id
    # Invariant: sum(weight for c in contributors) == 1.0 (within tolerance 1e-9)


@dataclass(frozen=True)
class SlackDefinition:
    """Complete slack bus definition."""
    slack_type: SlackType
    single: SingleSlackSpec | None           # Required when slack_type == SINGLE
    distributed: DistributedSlackSpec | None  # Required when slack_type == DISTRIBUTED
```

### 3.2 Validation Rules

| Rule | Condition | Error Code |
|------|-----------|------------|
| Slack definition missing | `slack_definition` is None or absent | `LF_MISSING_SLACK` |
| Slack type missing | `slack_type` is None or absent | `LF_SLACK_TYPE_MISSING` |
| Single slack: spec missing | `slack_type == SINGLE` and `single` is None | `LF_SLACK_SINGLE_SPEC_MISSING` |
| Single slack: node_id empty | `single.slack_node_id` is empty or None | `LF_SLACK_NODE_ID_EMPTY` |
| Single slack: node not in snapshot | `single.slack_node_id` not found in network snapshot nodes | `LF_SLACK_NODE_NOT_FOUND` |
| Single slack: u_pu not finite | `single.u_pu` is NaN, Inf, or None | `LF_SLACK_U_PU_INVALID` |
| Single slack: u_pu out of range | `single.u_pu <= 0.0` or `single.u_pu > 2.0` | `LF_SLACK_U_PU_OUT_OF_RANGE` |
| Single slack: angle_rad not finite | `single.angle_rad` is NaN or Inf | `LF_SLACK_ANGLE_INVALID` |
| Distributed slack: spec missing | `slack_type == DISTRIBUTED` and `distributed` is None | `LF_SLACK_DISTRIBUTED_SPEC_MISSING` |
| Distributed slack: empty contributors | `distributed.contributors` is empty | `LF_SLACK_DISTRIBUTED_NO_CONTRIBUTORS` |
| Distributed slack: weight sum != 1.0 | `abs(sum(weights) - 1.0) > 1e-9` | `LF_SLACK_DISTRIBUTED_WEIGHT_SUM` |
| Distributed slack: weight <= 0 | Any `contributor.weight <= 0.0` | `LF_SLACK_DISTRIBUTED_WEIGHT_NONPOSITIVE` |
| Distributed slack: weight > 1 | Any `contributor.weight > 1.0` | `LF_SLACK_DISTRIBUTED_WEIGHT_EXCEEDS_ONE` |
| Distributed slack: source not found | `contributor.source_id` not found in snapshot sources | `LF_SLACK_DISTRIBUTED_SOURCE_NOT_FOUND` |
| Distributed slack: duplicate source | Duplicate `source_id` in contributors list | `LF_SLACK_DISTRIBUTED_DUPLICATE_SOURCE` |

### 3.3 FixAction for LF_MISSING_SLACK

When `slack_definition` is entirely missing, the validator MUST:

1. Scan the network snapshot for candidate slack buses (nodes with attached sources)
2. Sort candidates **lexicographically by `node_id`** (deterministic ordering)
3. Return a `FixAction` with the sorted candidate list

```python
FixAction(
    action_type="SELECT_SLACK_BUS",
    element_ref=None,
    modal_type="SlackDefinitionModal",
    payload_hint={
        "candidates": [
            {
                "node_id": "bus-001",
                "attached_sources": ["source-001"],
                "voltage_kv": 110.0,
            },
            {
                "node_id": "bus-003",
                "attached_sources": ["source-002"],
                "voltage_kv": 110.0,
            },
        ],
        "suggested_type": "SINGLE",
        "suggested_u_pu": 1.0,
        "suggested_angle_rad": 0.0,
    },
)
```

**Candidate selection criteria**:
- Node must have at least one in-service source attached (source type GRID preferred)
- Candidates sorted lexicographically by `node_id`
- If no candidates exist, `candidates` list is empty (validation still fails with `LF_MISSING_SLACK`)

### 3.4 FixAction for LF_SLACK_DISTRIBUTED_WEIGHT_SUM

```python
FixAction(
    action_type="CORRECT_WEIGHTS",
    element_ref=None,
    modal_type="SlackDefinitionModal",
    payload_hint={
        "current_sum": 0.85,
        "expected_sum": 1.0,
        "contributors": [
            {"source_id": "source-001", "current_weight": 0.45},
            {"source_id": "source-003", "current_weight": 0.40},
        ],
    },
)
```

---

## 4. Section 2: start_mode (MANDATORY)

### 4.1 Type Definition

```python
class StartModeType(str, Enum):
    FLAT_START = "FLAT_START"
    CUSTOM_INITIAL = "CUSTOM_INITIAL"


@dataclass(frozen=True)
class InitialVoltage:
    """Initial voltage for a single bus."""
    node_id: str                # Bus node ID
    u_pu: float                 # Voltage magnitude [p.u.]
    angle_deg: float            # Voltage angle [degrees]


@dataclass(frozen=True)
class StartMode:
    """Initial voltage profile for power flow iteration."""
    mode: StartModeType
    initial_voltages: tuple[InitialVoltage, ...] | None
    # Required when mode == CUSTOM_INITIAL
    # Must cover ALL buses in the network snapshot
    # Sorted by node_id (lexicographic)
    # When mode == FLAT_START: must be None
```

### 4.2 Semantics

| Mode | Behavior |
|------|----------|
| `FLAT_START` | All buses initialized to V = 1.0 p.u., angle = 0.0 degrees. No `initial_voltages` required (must be None). |
| `CUSTOM_INITIAL` | Each bus initialized to the explicitly provided voltage. `initial_voltages` is mandatory and must cover every bus in the snapshot. |

### 4.3 Validation Rules

| Rule | Condition | Error Code |
|------|-----------|------------|
| Start mode missing | `start_mode` is None or absent | `LF_MISSING_START_MODE` |
| Mode type missing | `start_mode.mode` is None or absent | `LF_START_MODE_TYPE_MISSING` |
| Flat start with initial voltages | `mode == FLAT_START` and `initial_voltages` is not None | `LF_FLAT_START_HAS_INITIAL_VOLTAGES` |
| Custom initial: voltages missing | `mode == CUSTOM_INITIAL` and `initial_voltages` is None or empty | `LF_CUSTOM_INITIAL_VOLTAGES_MISSING` |
| Custom initial: incomplete coverage | `initial_voltages` does not cover all buses in snapshot | `LF_CUSTOM_INITIAL_INCOMPLETE` |
| Custom initial: unknown bus | `node_id` in `initial_voltages` not found in snapshot | `LF_CUSTOM_INITIAL_UNKNOWN_BUS` |
| Custom initial: duplicate bus | Duplicate `node_id` in `initial_voltages` | `LF_CUSTOM_INITIAL_DUPLICATE_BUS` |
| Custom initial: u_pu invalid | `u_pu` is NaN, Inf, or <= 0 | `LF_CUSTOM_INITIAL_U_PU_INVALID` |
| Custom initial: angle invalid | `angle_deg` is NaN or Inf | `LF_CUSTOM_INITIAL_ANGLE_INVALID` |

### 4.4 FixAction for LF_MISSING_START_MODE

```python
FixAction(
    action_type="SELECT_START_MODE",
    element_ref=None,
    modal_type="StartModeModal",
    payload_hint={
        "suggested_mode": "FLAT_START",
        "rationale_pl": "Tryb FLAT_START jest zalecany jako punkt startowy iteracji.",
    },
)
```

### 4.5 FixAction for LF_CUSTOM_INITIAL_INCOMPLETE

```python
FixAction(
    action_type="COMPLETE_INITIAL_VOLTAGES",
    element_ref=None,
    modal_type="StartModeModal",
    payload_hint={
        "missing_node_ids": ["bus-005", "bus-012"],  # sorted lexicographically
        "suggested_u_pu": 1.0,
        "suggested_angle_deg": 0.0,
    },
)
```

---

## 5. Section 3: convergence (MANDATORY)

### 5.1 Type Definition

```python
@dataclass(frozen=True)
class ConvergenceSpec:
    """Convergence criteria for iterative solver."""
    tolerance: float            # Mismatch tolerance [p.u.], explicit, no default
    iteration_limit: int        # Maximum number of iterations, explicit, no default
```

### 5.2 Validation Rules

| Rule | Condition | Error Code |
|------|-----------|------------|
| Convergence missing | `convergence` is None or absent | `LF_MISSING_CONVERGENCE` |
| Tolerance missing | `convergence.tolerance` is None | `LF_CONVERGENCE_TOLERANCE_MISSING` |
| Tolerance not finite | `tolerance` is NaN or Inf | `LF_CONVERGENCE_TOLERANCE_INVALID` |
| Tolerance non-positive | `tolerance <= 0.0` | `LF_CONVERGENCE_TOLERANCE_NONPOSITIVE` |
| Tolerance too large | `tolerance > 1.0` | `LF_CONVERGENCE_TOLERANCE_TOO_LARGE` |
| Iteration limit missing | `convergence.iteration_limit` is None | `LF_CONVERGENCE_ITER_LIMIT_MISSING` |
| Iteration limit non-positive | `iteration_limit <= 0` | `LF_CONVERGENCE_ITER_LIMIT_NONPOSITIVE` |
| Iteration limit too large | `iteration_limit > 10000` | `LF_CONVERGENCE_ITER_LIMIT_TOO_LARGE` |

### 5.3 FixAction for LF_MISSING_CONVERGENCE

```python
FixAction(
    action_type="SET_CONVERGENCE",
    element_ref=None,
    modal_type="ConvergenceModal",
    payload_hint={
        "suggested_tolerance": 1e-6,
        "suggested_iteration_limit": 50,
        "rationale_pl": (
            "Tolerancja 1e-6 p.u. i limit 50 iteracji to typowe wartości "
            "dla sieci SN (rozpływ mocy metodą Newtona-Raphsona)."
        ),
    },
)
```

### 5.4 FixAction for LF_CONVERGENCE_TOLERANCE_NONPOSITIVE

```python
FixAction(
    action_type="CORRECT_TOLERANCE",
    element_ref=None,
    modal_type="ConvergenceModal",
    payload_hint={
        "current_value": -0.001,
        "suggested_tolerance": 1e-6,
        "rationale_pl": "Tolerancja musi być dodatnia. Zalecana wartość: 1e-6 p.u.",
    },
)
```

### 5.5 FixAction for LF_CONVERGENCE_ITER_LIMIT_NONPOSITIVE

```python
FixAction(
    action_type="CORRECT_ITERATION_LIMIT",
    element_ref=None,
    modal_type="ConvergenceModal",
    payload_hint={
        "current_value": 0,
        "suggested_iteration_limit": 50,
        "rationale_pl": "Limit iteracji musi być dodatni. Zalecana wartość: 50.",
    },
)
```

---

## 6. Section 4: modeling_mode (MANDATORY)

### 6.1 Type Definition

```python
class ModelingMode(str, Enum):
    AC_POWER_FLOW = "AC_POWER_FLOW"
    # Future extensions (DC_POWER_FLOW, etc.) will be added here.
    # Currently only AC_POWER_FLOW is supported.
```

### 6.2 Semantics

| Mode | Description |
|------|-------------|
| `AC_POWER_FLOW` | Full AC power flow with real and reactive power, voltage magnitudes, and angles. Uses Newton-Raphson, Gauss-Seidel, or Fast-Decoupled method as specified in `solver_options`. |

### 6.3 Validation Rules

| Rule | Condition | Error Code |
|------|-----------|------------|
| Modeling mode missing | `modeling_mode` is None or absent | `LF_MISSING_MODELING_MODE` |
| Modeling mode unsupported | `modeling_mode` not in `{AC_POWER_FLOW}` | `LF_MODELING_MODE_UNSUPPORTED` |

### 6.4 FixAction for LF_MISSING_MODELING_MODE

```python
FixAction(
    action_type="SELECT_MODELING_MODE",
    element_ref=None,
    modal_type="ModelingModeModal",
    payload_hint={
        "available_modes": ["AC_POWER_FLOW"],
        "suggested_mode": "AC_POWER_FLOW",
        "rationale_pl": "Analiza AC jest jedynym wspieranym trybem rozpływu mocy.",
    },
)
```

---

## 7. Section 5: load_modeling (MANDATORY)

### 7.1 Type Definition

```python
@dataclass(frozen=True)
class LoadSpec:
    """Explicit P+Q specification for a single load."""
    load_id: str                # Load element ID (stable, from network snapshot)
    node_id: str                # Bus node ID where load is connected
    p_mw: float                 # Active power [MW], explicit
    q_mvar: float               # Reactive power [Mvar], explicit


@dataclass(frozen=True)
class GeneratorSpec:
    """Explicit specification for a PV or PQ generator."""
    source_id: str              # Source element ID
    node_id: str                # Bus node ID where generator is connected
    gen_type: str               # "PQ" | "PV"
    p_mw: float                 # Active power [MW], explicit
    q_mvar: float | None        # Reactive power [Mvar], explicit (required for PQ)
    u_pu: float | None          # Voltage setpoint [p.u.] (required for PV)
    q_min_mvar: float | None    # Reactive power lower limit [Mvar] (required for PV)
    q_max_mvar: float | None    # Reactive power upper limit [Mvar] (required for PV)


@dataclass(frozen=True)
class LoadModelingSpec:
    """Complete load and generation specification."""
    loads: tuple[LoadSpec, ...]              # Sorted by load_id, all in-service loads
    generators: tuple[GeneratorSpec, ...]    # Sorted by source_id, all in-service generators
```

### 7.2 Critical Rule: NO auto-cos-phi

**PROHIBITION**: The system MUST NEVER compute `Q` from `P` and `cos(phi)` automatically. Both `P_MW` and `Q_MVAR` must be explicitly provided for every load. If the domain model has a load with `P` but no `Q`, the input contract validation MUST reject it with `LF_LOAD_MISSING_Q` and provide a `FixAction` for the engineer to supply the value.

This rule exists because:
- `cos(phi)` assumptions hide engineering decisions
- Different load types have different power factors
- Auto-calculated Q values cannot be audited

### 7.3 Validation Rules

| Rule | Condition | Error Code |
|------|-----------|------------|
| Load modeling missing | `load_modeling` is None or absent | `LF_MISSING_LOAD_MODELING` |
| Load P missing | `load.p_mw` is None | `LF_LOAD_MISSING_P` |
| Load P not finite | `load.p_mw` is NaN or Inf | `LF_LOAD_P_INVALID` |
| Load Q missing | `load.q_mvar` is None | `LF_LOAD_MISSING_Q` |
| Load Q not finite | `load.q_mvar` is NaN or Inf | `LF_LOAD_Q_INVALID` |
| Load ID empty | `load.load_id` is empty or None | `LF_LOAD_ID_EMPTY` |
| Load node not found | `load.node_id` not found in snapshot | `LF_LOAD_NODE_NOT_FOUND` |
| Duplicate load ID | Duplicate `load_id` in loads list | `LF_LOAD_DUPLICATE_ID` |
| Generator source ID empty | `generator.source_id` is empty or None | `LF_GEN_SOURCE_ID_EMPTY` |
| Generator node not found | `generator.node_id` not found in snapshot | `LF_GEN_NODE_NOT_FOUND` |
| Generator type invalid | `generator.gen_type` not in `{"PQ", "PV"}` | `LF_GEN_TYPE_INVALID` |
| PQ generator Q missing | `gen_type == "PQ"` and `q_mvar` is None | `LF_GEN_PQ_MISSING_Q` |
| PV generator u_pu missing | `gen_type == "PV"` and `u_pu` is None | `LF_GEN_PV_MISSING_U_PU` |
| PV generator q_min missing | `gen_type == "PV"` and `q_min_mvar` is None | `LF_GEN_PV_MISSING_Q_MIN` |
| PV generator q_max missing | `gen_type == "PV"` and `q_max_mvar` is None | `LF_GEN_PV_MISSING_Q_MAX` |
| PV generator q_min > q_max | `q_min_mvar > q_max_mvar` | `LF_GEN_PV_Q_RANGE_INVERTED` |
| Generator P not finite | `generator.p_mw` is NaN or Inf | `LF_GEN_P_INVALID` |
| Duplicate generator source ID | Duplicate `source_id` in generators list | `LF_GEN_DUPLICATE_SOURCE_ID` |

### 7.4 FixAction for LF_LOAD_MISSING_Q

Generated **per load** that is missing `q_mvar`. Each missing load produces its own `ValidationError` + `FixAction`.

```python
FixAction(
    action_type="OPEN_MODAL",
    element_ref="load-003",
    modal_type="LoadModal",
    payload_hint={
        "load_id": "load-003",
        "node_id": "bus-007",
        "current_p_mw": 0.5,
        "missing_field": "q_mvar",
        "rationale_pl": (
            "Odbiór 'load-003' nie ma jawnie podanej mocy biernej (Q). "
            "Podaj wartość Q_MVAR. System NIE oblicza Q z cos(phi) automatycznie."
        ),
    },
)
```

### 7.5 FixAction for LF_LOAD_MISSING_P

```python
FixAction(
    action_type="OPEN_MODAL",
    element_ref="load-003",
    modal_type="LoadModal",
    payload_hint={
        "load_id": "load-003",
        "node_id": "bus-007",
        "missing_field": "p_mw",
        "rationale_pl": (
            "Odbiór 'load-003' nie ma jawnie podanej mocy czynnej (P). "
            "Podaj wartość P_MW."
        ),
    },
)
```

### 7.6 FixAction for LF_MISSING_LOAD_MODELING

```python
FixAction(
    action_type="CONFIGURE_LOADS",
    element_ref=None,
    modal_type="LoadModelingModal",
    payload_hint={
        "snapshot_loads_count": 5,
        "snapshot_generators_count": 2,
        "rationale_pl": (
            "Specyfikacja obciążeń jest wymagana. Dla każdego odbioru podaj P_MW i Q_MVAR. "
            "Dla każdego generatora podaj typ (PQ/PV) i odpowiednie parametry."
        ),
    },
)
```

---

## 8. Section 6: solver_options (MANDATORY)

### 8.1 Type Definition

```python
class SolverMethod(str, Enum):
    NEWTON_RAPHSON = "newton-raphson"
    GAUSS_SEIDEL = "gauss-seidel"
    FAST_DECOUPLED = "fast-decoupled"


class TraceLevel(str, Enum):
    SUMMARY = "summary"
    FULL = "full"


@dataclass(frozen=True)
class SolverOptions:
    """Solver method and parameters. All fields explicit."""
    solver_method: SolverMethod     # Explicit solver algorithm selection
    damping: float                  # Damping factor for Newton-Raphson (explicit)
    trace_level: TraceLevel         # White-box trace detail level (explicit)
```

### 8.2 Semantics

| Field | Description |
|-------|-------------|
| `solver_method` | Algorithm: `"newton-raphson"` (NR with Jacobian), `"gauss-seidel"` (GS iterative), `"fast-decoupled"` (FDLF with B'/B'' matrices). |
| `damping` | Damping factor applied to voltage update steps. Range: `0.0 < damping <= 1.0`. Used by all solver methods (NR: step damping, GS: relaxation, FDLF: step scaling). |
| `trace_level` | `"summary"`: basic convergence info (iteration count, max mismatch, norms). `"full"`: complete white-box trace (Jacobian matrices, per-bus mismatch, delta state, next state). |

### 8.3 Validation Rules

| Rule | Condition | Error Code |
|------|-----------|------------|
| Solver options missing | `solver_options` is None or absent | `LF_MISSING_SOLVER_OPTIONS` |
| Solver method missing | `solver_options.solver_method` is None | `LF_SOLVER_METHOD_MISSING` |
| Solver method unsupported | `solver_method` not in `{newton-raphson, gauss-seidel, fast-decoupled}` | `LF_SOLVER_METHOD_UNSUPPORTED` |
| Damping missing | `solver_options.damping` is None | `LF_SOLVER_DAMPING_MISSING` |
| Damping not finite | `damping` is NaN or Inf | `LF_SOLVER_DAMPING_INVALID` |
| Damping non-positive | `damping <= 0.0` | `LF_SOLVER_DAMPING_NONPOSITIVE` |
| Damping exceeds one | `damping > 1.0` | `LF_SOLVER_DAMPING_EXCEEDS_ONE` |
| Trace level missing | `solver_options.trace_level` is None | `LF_SOLVER_TRACE_LEVEL_MISSING` |
| Trace level unsupported | `trace_level` not in `{summary, full}` | `LF_SOLVER_TRACE_LEVEL_UNSUPPORTED` |

### 8.4 FixAction for LF_MISSING_SOLVER_OPTIONS

```python
FixAction(
    action_type="CONFIGURE_SOLVER",
    element_ref=None,
    modal_type="SolverOptionsModal",
    payload_hint={
        "available_methods": ["newton-raphson", "gauss-seidel", "fast-decoupled"],
        "suggested_method": "newton-raphson",
        "suggested_damping": 1.0,
        "suggested_trace_level": "summary",
        "rationale_pl": (
            "Metoda Newtona-Raphsona z tlumienie 1.0 jest zalecana "
            "dla typowych sieci SN. Trace 'summary' wystarczy do standardowych analiz."
        ),
    },
)
```

---

## 9. Validation Error Codes (Complete Registry)

### 9.1 Top-Level Errors

| Code | Severity | Message (Polish) | FixAction |
|------|----------|-------------------|-----------|
| `LF_MISSING_SNAPSHOT` | BLOCKER | `Brak identyfikatora snapshota sieci. Wymagany jest zamrożony snapshot modelu sieciowego.` | `action_type="CREATE_SNAPSHOT"`, `modal_type="SnapshotModal"` |
| `LF_MISSING_BASE_MVA` | BLOCKER | `Brak mocy bazowej (base_mva). Wymagana jest jawna wartość mocy bazowej systemu.` | `action_type="SET_BASE_MVA"`, `modal_type="BaseMvaModal"`, `payload_hint={"suggested_base_mva": 100.0}` |
| `LF_BASE_MVA_INVALID` | BLOCKER | `Moc bazowa (base_mva) jest nieprawidłowa — wartość musi być skończona i dodatnia.` | `action_type="CORRECT_BASE_MVA"`, `modal_type="BaseMvaModal"` |

### 9.2 Slack Definition Errors

| Code | Severity | Message (Polish) | FixAction Type |
|------|----------|-------------------|----------------|
| `LF_MISSING_SLACK` | BLOCKER | `Brak definicji szyny bilansującej. Rozpływ mocy wymaga jawnego wskazania szyny bilansującej.` | `SELECT_SLACK_BUS` (see 3.3) |
| `LF_SLACK_TYPE_MISSING` | BLOCKER | `Brak typu szyny bilansującej (SINGLE/DISTRIBUTED).` | `SELECT_SLACK_BUS` |
| `LF_SLACK_SINGLE_SPEC_MISSING` | BLOCKER | `Typ SINGLE wymaga specyfikacji SingleSlackSpec.` | `SELECT_SLACK_BUS` |
| `LF_SLACK_NODE_ID_EMPTY` | BLOCKER | `Identyfikator węzła szyny bilansującej jest pusty.` | `SELECT_SLACK_BUS` |
| `LF_SLACK_NODE_NOT_FOUND` | BLOCKER | `Węzeł szyny bilansującej '{node_id}' nie istnieje w snapshocie sieci.` | `SELECT_SLACK_BUS` with candidates |
| `LF_SLACK_U_PU_INVALID` | BLOCKER | `Napięcie szyny bilansującej (u_pu) jest nieprawidłowe — wartość musi być skończona.` | `CORRECT_SLACK_VOLTAGE` |
| `LF_SLACK_U_PU_OUT_OF_RANGE` | BLOCKER | `Napięcie szyny bilansującej (u_pu={value}) poza zakresem (0.0, 2.0].` | `CORRECT_SLACK_VOLTAGE` |
| `LF_SLACK_ANGLE_INVALID` | BLOCKER | `Kąt napięcia szyny bilansującej (angle_rad) jest nieprawidłowy — wartość musi być skończona.` | `CORRECT_SLACK_VOLTAGE` |
| `LF_SLACK_DISTRIBUTED_SPEC_MISSING` | BLOCKER | `Typ DISTRIBUTED wymaga specyfikacji DistributedSlackSpec.` | `SELECT_SLACK_BUS` |
| `LF_SLACK_DISTRIBUTED_NO_CONTRIBUTORS` | BLOCKER | `Lista uczestników bilansowania rozproszonego jest pusta.` | `CONFIGURE_DISTRIBUTED_SLACK` |
| `LF_SLACK_DISTRIBUTED_WEIGHT_SUM` | BLOCKER | `Suma wag bilansowania rozproszonego ({actual_sum}) nie równa się 1.0.` | `CORRECT_WEIGHTS` (see 3.4) |
| `LF_SLACK_DISTRIBUTED_WEIGHT_NONPOSITIVE` | BLOCKER | `Waga uczestnika '{source_id}' ({weight}) musi być dodatnia.` | `CORRECT_WEIGHTS` |
| `LF_SLACK_DISTRIBUTED_WEIGHT_EXCEEDS_ONE` | BLOCKER | `Waga uczestnika '{source_id}' ({weight}) przekracza 1.0.` | `CORRECT_WEIGHTS` |
| `LF_SLACK_DISTRIBUTED_SOURCE_NOT_FOUND` | BLOCKER | `Źródło '{source_id}' nie istnieje w snapshocie sieci.` | `SELECT_SLACK_BUS` |
| `LF_SLACK_DISTRIBUTED_DUPLICATE_SOURCE` | BLOCKER | `Zduplikowane źródło '{source_id}' w liście uczestników bilansowania rozproszonego.` | `CORRECT_WEIGHTS` |

### 9.3 Start Mode Errors

| Code | Severity | Message (Polish) | FixAction Type |
|------|----------|-------------------|----------------|
| `LF_MISSING_START_MODE` | BLOCKER | `Brak trybu startowego. Wymagany jest jawny wybór FLAT_START lub CUSTOM_INITIAL.` | `SELECT_START_MODE` (see 4.4) |
| `LF_START_MODE_TYPE_MISSING` | BLOCKER | `Brak typu trybu startowego (FLAT_START/CUSTOM_INITIAL).` | `SELECT_START_MODE` |
| `LF_FLAT_START_HAS_INITIAL_VOLTAGES` | BLOCKER | `Tryb FLAT_START nie dopuszcza jawnych napięć początkowych (initial_voltages musi być None).` | `action_type="REMOVE_INITIAL_VOLTAGES"` |
| `LF_CUSTOM_INITIAL_VOLTAGES_MISSING` | BLOCKER | `Tryb CUSTOM_INITIAL wymaga jawnych napięć początkowych dla wszystkich szyn.` | `COMPLETE_INITIAL_VOLTAGES` (see 4.5) |
| `LF_CUSTOM_INITIAL_INCOMPLETE` | BLOCKER | `Napięcia początkowe nie obejmują wszystkich szyn. Brakujące szyny: {missing_ids}.` | `COMPLETE_INITIAL_VOLTAGES` (see 4.5) |
| `LF_CUSTOM_INITIAL_UNKNOWN_BUS` | BLOCKER | `Szyna '{node_id}' w napięciach początkowych nie istnieje w snapshocie.` | `action_type="REMOVE_UNKNOWN_BUS"` |
| `LF_CUSTOM_INITIAL_DUPLICATE_BUS` | BLOCKER | `Zduplikowana szyna '{node_id}' w napięciach początkowych.` | `action_type="REMOVE_DUPLICATE"` |
| `LF_CUSTOM_INITIAL_U_PU_INVALID` | BLOCKER | `Napięcie początkowe szyny '{node_id}' (u_pu) jest nieprawidłowe.` | `action_type="CORRECT_INITIAL_VOLTAGE"` |
| `LF_CUSTOM_INITIAL_ANGLE_INVALID` | BLOCKER | `Kąt początkowy szyny '{node_id}' (angle_deg) jest nieprawidłowy.` | `action_type="CORRECT_INITIAL_VOLTAGE"` |

### 9.4 Convergence Errors

| Code | Severity | Message (Polish) | FixAction Type |
|------|----------|-------------------|----------------|
| `LF_MISSING_CONVERGENCE` | BLOCKER | `Brak kryteriów zbieżności. Wymagana jest jawna tolerancja i limit iteracji.` | `SET_CONVERGENCE` (see 5.3) |
| `LF_CONVERGENCE_TOLERANCE_MISSING` | BLOCKER | `Brak tolerancji zbieżności (tolerance).` | `SET_CONVERGENCE` |
| `LF_CONVERGENCE_TOLERANCE_INVALID` | BLOCKER | `Tolerancja zbieżności jest nieprawidłowa — wartość musi być skończona.` | `CORRECT_TOLERANCE` (see 5.4) |
| `LF_CONVERGENCE_TOLERANCE_NONPOSITIVE` | BLOCKER | `Tolerancja zbieżności ({value}) musi być dodatnia.` | `CORRECT_TOLERANCE` (see 5.4) |
| `LF_CONVERGENCE_TOLERANCE_TOO_LARGE` | BLOCKER | `Tolerancja zbieżności ({value}) przekracza 1.0 — zbyt duża dla rzetelnych wyników.` | `CORRECT_TOLERANCE` |
| `LF_CONVERGENCE_ITER_LIMIT_MISSING` | BLOCKER | `Brak limitu iteracji (iteration_limit).` | `SET_CONVERGENCE` |
| `LF_CONVERGENCE_ITER_LIMIT_NONPOSITIVE` | BLOCKER | `Limit iteracji ({value}) musi być dodatni.` | `CORRECT_ITERATION_LIMIT` (see 5.5) |
| `LF_CONVERGENCE_ITER_LIMIT_TOO_LARGE` | BLOCKER | `Limit iteracji ({value}) przekracza 10000 — nadmiarowy limit.` | `CORRECT_ITERATION_LIMIT` |

### 9.5 Modeling Mode Errors

| Code | Severity | Message (Polish) | FixAction Type |
|------|----------|-------------------|----------------|
| `LF_MISSING_MODELING_MODE` | BLOCKER | `Brak trybu modelowania. Wymagany jest jawny wybór trybu (AC_POWER_FLOW).` | `SELECT_MODELING_MODE` (see 6.4) |
| `LF_MODELING_MODE_UNSUPPORTED` | BLOCKER | `Tryb modelowania '{mode}' nie jest obsługiwany. Dostępne: AC_POWER_FLOW.` | `SELECT_MODELING_MODE` |

### 9.6 Load Modeling Errors

| Code | Severity | Message (Polish) | FixAction Type |
|------|----------|-------------------|----------------|
| `LF_MISSING_LOAD_MODELING` | BLOCKER | `Brak specyfikacji obciążeń. Wymagana jest jawna lista odbiorów z P_MW i Q_MVAR.` | `CONFIGURE_LOADS` (see 7.6) |
| `LF_LOAD_MISSING_P` | BLOCKER | `Odbiór '{load_id}' nie ma jawnie podanej mocy czynnej (P_MW).` | `OPEN_MODAL` (see 7.5) |
| `LF_LOAD_P_INVALID` | BLOCKER | `Moc czynna odbioru '{load_id}' (P_MW) jest nieprawidłowa — wartość musi być skończona.` | `OPEN_MODAL` |
| `LF_LOAD_MISSING_Q` | BLOCKER | `Odbiór '{load_id}' nie ma jawnie podanej mocy biernej (Q_MVAR). System NIE oblicza Q z cos(phi) automatycznie.` | `OPEN_MODAL` (see 7.4) |
| `LF_LOAD_Q_INVALID` | BLOCKER | `Moc bierna odbioru '{load_id}' (Q_MVAR) jest nieprawidłowa — wartość musi być skończona.` | `OPEN_MODAL` |
| `LF_LOAD_ID_EMPTY` | BLOCKER | `Identyfikator odbioru jest pusty.` | `OPEN_MODAL` |
| `LF_LOAD_NODE_NOT_FOUND` | BLOCKER | `Węzeł odbioru '{load_id}' (node_id='{node_id}') nie istnieje w snapshocie sieci.` | `OPEN_MODAL` |
| `LF_LOAD_DUPLICATE_ID` | BLOCKER | `Zduplikowany identyfikator odbioru '{load_id}'.` | `OPEN_MODAL` |
| `LF_GEN_SOURCE_ID_EMPTY` | BLOCKER | `Identyfikator źródła generatora jest pusty.` | `OPEN_MODAL` |
| `LF_GEN_NODE_NOT_FOUND` | BLOCKER | `Węzeł generatora '{source_id}' (node_id='{node_id}') nie istnieje w snapshocie sieci.` | `OPEN_MODAL` |
| `LF_GEN_TYPE_INVALID` | BLOCKER | `Typ generatora '{source_id}' ('{gen_type}') jest nieprawidłowy. Dozwolone: PQ, PV.` | `OPEN_MODAL` |
| `LF_GEN_PQ_MISSING_Q` | BLOCKER | `Generator PQ '{source_id}' nie ma jawnie podanej mocy biernej (Q_MVAR).` | `OPEN_MODAL` |
| `LF_GEN_PV_MISSING_U_PU` | BLOCKER | `Generator PV '{source_id}' nie ma jawnie podanego napięcia (u_pu).` | `OPEN_MODAL` |
| `LF_GEN_PV_MISSING_Q_MIN` | BLOCKER | `Generator PV '{source_id}' nie ma jawnie podanej dolnej granicy Q (q_min_mvar).` | `OPEN_MODAL` |
| `LF_GEN_PV_MISSING_Q_MAX` | BLOCKER | `Generator PV '{source_id}' nie ma jawnie podanej górnej granicy Q (q_max_mvar).` | `OPEN_MODAL` |
| `LF_GEN_PV_Q_RANGE_INVERTED` | BLOCKER | `Generator PV '{source_id}': q_min_mvar ({q_min}) > q_max_mvar ({q_max}).` | `OPEN_MODAL` |
| `LF_GEN_P_INVALID` | BLOCKER | `Moc czynna generatora '{source_id}' (P_MW) jest nieprawidłowa — wartość musi być skończona.` | `OPEN_MODAL` |
| `LF_GEN_DUPLICATE_SOURCE_ID` | BLOCKER | `Zduplikowany identyfikator źródła generatora '{source_id}'.` | `OPEN_MODAL` |

### 9.7 Solver Options Errors

| Code | Severity | Message (Polish) | FixAction Type |
|------|----------|-------------------|----------------|
| `LF_MISSING_SOLVER_OPTIONS` | BLOCKER | `Brak opcji solvera. Wymagany jest jawny wybór metody, tłumienia i poziomu śladu.` | `CONFIGURE_SOLVER` (see 8.4) |
| `LF_SOLVER_METHOD_MISSING` | BLOCKER | `Brak metody solvera (solver_method).` | `CONFIGURE_SOLVER` |
| `LF_SOLVER_METHOD_UNSUPPORTED` | BLOCKER | `Metoda solvera '{method}' nie jest obsługiwana. Dostępne: newton-raphson, gauss-seidel, fast-decoupled.` | `CONFIGURE_SOLVER` |
| `LF_SOLVER_DAMPING_MISSING` | BLOCKER | `Brak współczynnika tłumienia (damping).` | `CONFIGURE_SOLVER` |
| `LF_SOLVER_DAMPING_INVALID` | BLOCKER | `Współczynnik tłumienia jest nieprawidłowy — wartość musi być skończona.` | `CONFIGURE_SOLVER` |
| `LF_SOLVER_DAMPING_NONPOSITIVE` | BLOCKER | `Współczynnik tłumienia ({value}) musi być dodatni.` | `CONFIGURE_SOLVER` |
| `LF_SOLVER_DAMPING_EXCEEDS_ONE` | BLOCKER | `Współczynnik tłumienia ({value}) przekracza 1.0.` | `CONFIGURE_SOLVER` |
| `LF_SOLVER_TRACE_LEVEL_MISSING` | BLOCKER | `Brak poziomu śladu (trace_level).` | `CONFIGURE_SOLVER` |
| `LF_SOLVER_TRACE_LEVEL_UNSUPPORTED` | BLOCKER | `Poziom śladu '{level}' nie jest obsługiwany. Dostępne: summary, full.` | `CONFIGURE_SOLVER` |

### 9.8 Error Code Stability Contract

All error codes listed above are **STABLE**. Once assigned, a code string MUST NOT be changed or removed. New error codes may be added (append-only). Error code format: `LF_` prefix + `SECTION_` + `DESCRIPTION` in `SCREAMING_SNAKE_CASE`.

Total error codes in this contract: **55**.

---

## 10. Canonical Serialization

### 10.1 JSON Key Sorting

All JSON representations of `LoadFlowRunInput` MUST use **sorted keys** at every nesting level. This is required for deterministic hashing.

```python
json.dumps(payload, sort_keys=True, separators=(",", ":"))
```

- Separator: `(",", ":")` (compact, no whitespace)
- Key ordering: lexicographic (Python `sorted()` on string keys)

### 10.2 Deterministic List Ordering

All lists within `LoadFlowRunInput` MUST be sorted by their primary ID field:

| List | Sort Key | Sort Order |
|------|----------|------------|
| `slack_definition.distributed.contributors` | `source_id` | Lexicographic ascending |
| `start_mode.initial_voltages` | `node_id` | Lexicographic ascending |
| `load_modeling.loads` | `load_id` | Lexicographic ascending |
| `load_modeling.generators` | `source_id` | Lexicographic ascending |

**No secondary sort keys**. Primary ID is always sufficient (IDs are unique within their collection).

### 10.3 Stable Float Representation

Floats are serialized using Python's default `json.dumps` behavior (IEEE 754 representation). Special rules:

| Value | Serialization | Rule |
|-------|---------------|------|
| `1.0` | `1.0` | Always include decimal point |
| `0.001` | `0.001` | No scientific notation normalization by serializer |
| `1e-6` | `1e-06` | Python default float repr |
| `NaN` | **REJECTED** | NaN values are validation errors, never serialized |
| `Inf` | **REJECTED** | Inf values are validation errors, never serialized |

**Invariant**: A validated `LoadFlowRunInput` contains ONLY finite float values. NaN and Inf are caught by validation and never reach serialization.

### 10.4 SHA-256 Hash Computation

```python
import hashlib
import json


def compute_load_flow_input_hash(lf_input_dict: dict) -> str:
    """
    Compute deterministic SHA-256 hash of LoadFlowRunInput.

    Process:
    1. Recursively sort all dict keys (lexicographic)
    2. Sort all deterministic lists by their primary ID field
    3. Serialize to canonical JSON (sorted keys, compact separators)
    4. Encode to UTF-8 bytes
    5. Compute SHA-256 hex digest (lowercase, 64 characters)

    INVARIANT: Identical LoadFlowRunInput -> identical hash.
    """
    canonical = _canonicalize_lf(lf_input_dict)
    payload = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


# Deterministic list keys specific to LoadFlowRunInput
_LF_DETERMINISTIC_LIST_KEYS = {
    "contributors",          # distributed slack contributors
    "initial_voltages",      # custom initial voltages
    "loads",                 # load specifications
    "generators",            # generator specifications
}


def _canonicalize_lf(value, *, current_key=None):
    """Recursively canonicalize a JSON-like structure for deterministic hashing."""
    if isinstance(value, dict):
        return {
            key: _canonicalize_lf(value[key], current_key=key)
            for key in sorted(value.keys())
        }
    if isinstance(value, list):
        items = [_canonicalize_lf(item, current_key=current_key) for item in value]
        if current_key in _LF_DETERMINISTIC_LIST_KEYS:
            return sorted(items, key=_lf_stable_sort_key)
        return items
    return value


def _lf_stable_sort_key(item):
    """Stable sort key for deterministic list ordering."""
    if isinstance(item, dict):
        for key in ("load_id", "source_id", "node_id"):
            if key in item and item[key] is not None:
                return str(item[key])
    return str(item)
```

### 10.5 Hash Verification Example

```python
lf_input = {
    "network_snapshot_id": "550e8400-e29b-41d4-a716-446655440000",
    "base_mva": 100.0,
    "slack_definition": {
        "slack_type": "SINGLE",
        "single": {
            "slack_node_id": "bus-001",
            "u_pu": 1.0,
            "angle_rad": 0.0
        },
        "distributed": None
    },
    "start_mode": {
        "mode": "FLAT_START",
        "initial_voltages": None
    },
    "convergence": {
        "tolerance": 1e-6,
        "iteration_limit": 50
    },
    "modeling_mode": "AC_POWER_FLOW",
    "load_modeling": {
        "loads": [
            {"load_id": "load-001", "node_id": "bus-005", "p_mw": 0.5, "q_mvar": 0.2},
            {"load_id": "load-002", "node_id": "bus-007", "p_mw": 1.0, "q_mvar": 0.4}
        ],
        "generators": [
            {"source_id": "source-002", "node_id": "bus-003", "gen_type": "PV",
             "p_mw": 2.0, "q_mvar": None, "u_pu": 1.02, "q_min_mvar": -1.0, "q_max_mvar": 1.0}
        ]
    },
    "solver_options": {
        "solver_method": "newton-raphson",
        "damping": 1.0,
        "trace_level": "summary"
    }
}

hash_value = compute_load_flow_input_hash(lf_input)
# hash_value is a 64-character lowercase hex string
# Same input always produces the same hash
```

---

## 11. Mapping to Solver-Level PowerFlowInput

### 11.1 Translation Table

`LoadFlowRunInput` is translated to `PowerFlowInput` by the application layer. This translation is **deterministic** and **lossless** (all information is preserved).

| LoadFlowRunInput Field | PowerFlowInput Field | Translation |
|------------------------|----------------------|-------------|
| `network_snapshot_id` | `graph` | Resolve snapshot -> build `NetworkGraph` |
| `base_mva` | `base_mva` | Direct copy |
| `slack_definition.single.slack_node_id` | `slack.node_id` | Direct copy (SINGLE mode) |
| `slack_definition.single.u_pu` | `slack.u_pu` | Direct copy |
| `slack_definition.single.angle_rad` | `slack.angle_rad` | Direct copy |
| `convergence.tolerance` | `options.tolerance` | Direct copy |
| `convergence.iteration_limit` | `options.max_iter` | Direct copy |
| `start_mode.mode == FLAT_START` | `options.flat_start = True` | Mode translation |
| `start_mode.mode == CUSTOM_INITIAL` | `options.flat_start = False` + custom init state | Mode translation |
| `solver_options.damping` | `options.damping` | Direct copy |
| `solver_options.trace_level` | `options.trace_level` | Direct copy |
| `load_modeling.loads` | `pq` list (`PQSpec`) | `load_id` -> `node_id`, `p_mw`, `q_mvar` |
| `load_modeling.generators` (PQ) | `pq` list (`PQSpec`) | PQ generators appended to PQ list |
| `load_modeling.generators` (PV) | `pv` list (`PVSpec`) | PV generators -> `PVSpec` |

### 11.2 Distributed Slack Translation

When `slack_type == DISTRIBUTED`, the application layer:

1. Selects the contributor with the **highest weight** as the nominal `SlackSpec.node_id`
2. If weights are equal, selects the contributor with the **lexicographically smallest `source_id`**
3. Records the distributed slack configuration in the white-box trace
4. The actual distributed slack implementation depends on solver support (future extension)

**Current limitation**: The solver-level `PowerFlowInput` supports only `SINGLE` slack. Distributed slack is validated at the application layer but translated to single slack for the current solver. This translation is recorded in the trace for auditability.

### 11.3 Custom Initial Voltage Translation

When `start_mode.mode == CUSTOM_INITIAL`:

1. `options.flat_start` is set to `False`
2. `initial_voltages` are converted to the solver's initial state format: `{node_id: {"v_pu": u_pu, "theta_rad": angle_deg * pi / 180}}`
3. Angles are converted from degrees (user-facing) to radians (solver-internal)

---

## 12. Invariants

### 12.1 Contract Invariants (IMMUTABLE)

1. **ZERO DEFAULTS**: No field in `LoadFlowRunInput` has a default value. Every field must be explicitly provided.
2. **VALIDATION FIRST**: `LoadFlowRunInput` MUST pass all validation rules before translation to `PowerFlowInput`. No partial translation is allowed.
3. **DETERMINISTIC HASH**: Identical `LoadFlowRunInput` content produces identical SHA-256 hash. List ordering is canonicalized by primary ID fields.
4. **STABLE ERROR CODES**: Error codes are append-only. No code string is ever changed or removed.
5. **POLISH MESSAGES**: All `message_pl` strings are in Polish. No English UI-facing text.
6. **NO AUTO-COS-PHI**: The system never computes Q from P and cos(phi) automatically. Both P and Q must be explicit for every load.
7. **FIX ACTIONS NEVER AUTO-EXECUTE**: FixActions are suggestions only. The frontend renders them as clickable options. No automatic correction.
8. **SORTED COLLECTIONS**: All list fields are sorted by their primary ID. No implicit ordering. No secondary sort keys.
9. **FINITE FLOATS ONLY**: After validation, all float values in `LoadFlowRunInput` are finite (not NaN, not Inf). This is enforced by validation before serialization.
10. **SNAPSHOT BINDING**: `network_snapshot_id` binds the input to a specific frozen snapshot. Model changes after snapshot creation do not affect the input.

### 12.2 Compatibility with Existing System

| Existing Component | Impact | Action Required |
|-------------------|--------|-----------------|
| `PowerFlowInput` (solver-level) | **UNCHANGED** | No modification. `LoadFlowRunInput` wraps it. |
| `PowerFlowResultV1` (frozen) | **UNCHANGED** | No modification. Result contract is independent. |
| `PowerFlowTrace` (white-box) | **UNCHANGED** | No modification. Trace records solver internals. |
| `AnalysisRunService` | **MODIFIED** | Must accept `LoadFlowRunInput` and validate before building `PowerFlowInput`. |
| `EligibilityService` | **COMPLEMENTARY** | Eligibility checks (E1-E7) remain as pre-gate. `LoadFlowRunInput` validation is post-gate, pre-solver. |
| `compute_input_hash()` | **EXTENDED** | New `compute_load_flow_input_hash()` uses `_LF_DETERMINISTIC_LIST_KEYS`. |

### 12.3 Validation Pipeline

```
User Input
    |
    v
[1] EligibilityService._compute_load_flow()     # Pre-gate: E1-E7 checks
    |
    v
[2] LoadFlowRunInput construction                 # Zero-defaults contract assembly
    |
    v
[3] LoadFlowRunInput validation                   # All 55 error codes checked
    |                                              # FixActions generated for failures
    v
[4] compute_load_flow_input_hash()                 # Deterministic SHA-256
    |
    v
[5] Translation to PowerFlowInput                 # Lossless, deterministic
    |
    v
[6] NetworkValidator.validate(graph)              # Pre-solver network validation
    |
    v
[7] Solver execution (NR / GS / FDLF)            # Physics computation
    |
    v
[8] PowerFlowResultV1 + PowerFlowTrace           # Frozen result + white-box trace
```

Steps [1] through [6] MUST succeed before step [7] executes. Any failure at steps [1]-[6] produces a structured error response with FixActions. Step [7] never sees invalid input.

---

*End of LOAD FLOW INPUT CONTRACT.*
