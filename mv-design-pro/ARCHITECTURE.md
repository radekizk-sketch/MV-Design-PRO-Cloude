# MV-DESIGN-PRO Architecture (PowerFactory Aligned)

**Version:** 2.0
**Status:** CANONICAL
**Reference:** SYSTEM_SPEC.md

---

## 1. Architectural Vision

MV-DESIGN-PRO follows the **DIgSILENT PowerFactory conceptual model**:

```
┌────────────────────────────────────────────────────────────────────┐
│                        MV-DESIGN-PRO                               │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    APPLICATION LAYER                          │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │ │
│  │  │   WIZARD    │  │    SLD      │  │  REPORTING ENGINE   │  │ │
│  │  │  (Editor)   │  │ (Visualize) │  │   (Export/Print)    │  │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │ │
│  └─────────┼────────────────┼────────────────────┼──────────────┘ │
│            │                │                    │                 │
│            └────────────────┼────────────────────┘                 │
│                             ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    DOMAIN LAYER                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │                  NETWORK MODEL                           │ │ │
│  │  │  ┌───────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │ │ │
│  │  │  │  BUS  │ │  LINE  │ │ CABLE  │ │ TRAFO  │ │ SWITCH │ │ │ │
│  │  │  └───────┘ └────────┘ └────────┘ └────────┘ └────────┘ │ │ │
│  │  │  ┌────────┐ ┌────────┐                                  │ │ │
│  │  │  │ SOURCE │ │  LOAD  │                                  │ │ │
│  │  │  └────────┘ └────────┘                                  │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │                             │                                 │ │
│  │  ┌─────────────────────────┼─────────────────────────────┐   │ │
│  │  │        CATALOG          │        VALIDATION            │   │ │
│  │  │  ┌─────────────────┐    │   ┌─────────────────────┐   │   │ │
│  │  │  │   TYPE LIBRARY  │    │   │  NETWORK VALIDATOR  │   │   │ │
│  │  │  │ (immutable)     │    │   │  (pre-solver check) │   │   │ │
│  │  │  └─────────────────┘    │   └─────────────────────┘   │   │ │
│  │  └─────────────────────────┼─────────────────────────────┘   │ │
│  └────────────────────────────┼─────────────────────────────────┘ │
│                               │                                    │
│  ┌────────────────────────────┼─────────────────────────────────┐ │
│  │                    CASE LAYER                                 │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │ │
│  │  │ SHORT CIRC  │ │ POWER FLOW  │ │      PROTECTION         │ │ │
│  │  │    CASE     │ │    CASE     │ │        CASE             │ │ │
│  │  │ (IEC 60909) │ │  (N-R)      │ │    (prospective)        │ │ │
│  │  └──────┬──────┘ └──────┬──────┘ └───────────┬─────────────┘ │ │
│  └─────────┼───────────────┼────────────────────┼────────────────┘ │
│            │               │                    │                  │
│  ┌─────────┼───────────────┼────────────────────┼────────────────┐ │
│  │         ▼               ▼                    ▼    SOLVER LAYER│ │
│  │  ┌───────────────────────────────────────────────────────┐   │ │
│  │  │              WHITE BOX SOLVERS                         │   │ │
│  │  │  ┌─────────────────┐    ┌─────────────────────────┐   │   │ │
│  │  │  │   IEC 60909     │    │    NEWTON-RAPHSON       │   │   │ │
│  │  │  │ Short Circuit   │    │     Power Flow          │   │   │ │
│  │  │  │                 │    │                         │   │   │ │
│  │  │  │ - Z_thevenin    │    │ - Y_bus matrix          │   │   │ │
│  │  │  │ - I_k''         │    │ - Jacobian              │   │   │ │
│  │  │  │ - i_p           │    │ - V, delta iterations   │   │   │ │
│  │  │  │ - I_th          │    │ - P, Q flows            │   │   │ │
│  │  │  └─────────────────┘    └─────────────────────────┘   │   │ │
│  │  └───────────────────────────────────────────────────────┘   │ │
│  │                              │                                │ │
│  │  ┌───────────────────────────┼───────────────────────────┐   │ │
│  │  │         WHITE BOX TRACE   │                            │   │ │
│  │  │  - Input snapshot (frozen)                             │   │ │
│  │  │  - Intermediate values                                 │   │ │
│  │  │  - Output results                                      │   │ │
│  │  │  - Audit trail                                         │   │ │
│  │  └───────────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                               │                                    │
│  ┌────────────────────────────┼─────────────────────────────────┐ │
│  │                    ANALYSIS LAYER                             │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │ │
│  │  │  THERMAL    │ │   VOLTAGE   │ │      PROTECTION         │ │ │
│  │  │  ANALYSIS   │ │  ANALYSIS   │ │      ANALYSIS           │ │ │
│  │  │ (overloads) │ │ (violations)│ │   (coordination)        │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Network Model Layer

### 2.1 Core Elements

#### Bus (Electrical Node)

```python
@dataclass
class Bus:
    """
    Electrical node with single potential.
    PowerFactory equivalent: Terminal
    """
    id: UUID
    name: str
    voltage_level_kv: float
    node_type: NodeType  # SLACK, PQ, PV

    # Power Flow parameters
    voltage_magnitude_pu: float | None = None
    voltage_angle_rad: float | None = None
    active_power_mw: float | None = None
    reactive_power_mvar: float | None = None
```

#### Branch (Physical Connection)

```python
@dataclass
class LineBranch:
    """
    Overhead line or cable with impedance.
    """
    id: UUID
    name: str
    from_bus_id: UUID
    to_bus_id: UUID
    branch_type: BranchType  # LINE, CABLE

    # Impedance parameters (from Catalog or direct)
    type_ref: UUID | None = None  # Reference to Catalog
    r_ohm_per_km: float = 0.0
    x_ohm_per_km: float = 0.0
    b_us_per_km: float = 0.0
    length_km: float = 0.0
    rated_current_a: float = 0.0

    in_service: bool = True

@dataclass
class TransformerBranch:
    """
    Two-winding transformer.
    """
    id: UUID
    name: str
    from_bus_id: UUID  # HV side
    to_bus_id: UUID    # LV side

    # Nameplate data
    type_ref: UUID | None = None
    rated_power_mva: float = 0.0
    voltage_hv_kv: float = 0.0
    voltage_lv_kv: float = 0.0
    uk_percent: float = 0.0
    pk_kw: float = 0.0

    # Tap changer
    tap_position: int = 0
    tap_step_percent: float = 2.5

    in_service: bool = True
```

#### Switch (Apparatus - No Physics)

```python
@dataclass
class Switch:
    """
    Switching apparatus with NO impedance.
    Changes topology only.
    """
    id: UUID
    name: str
    from_bus_id: UUID
    to_bus_id: UUID
    switch_type: SwitchType  # BREAKER, DISCONNECTOR, LOAD_SWITCH, FUSE
    state: SwitchState  # OPEN, CLOSED

    # NO impedance fields - switches have zero impedance
    # They only affect network topology
```

#### Source and Load

```python
@dataclass
class Source:
    """
    Power injection (External Grid, Generator).
    """
    id: UUID
    name: str
    bus_id: UUID
    source_type: SourceType  # EXTERNAL_GRID, GENERATOR, INVERTER

    # Source parameters
    p_mw: float = 0.0
    q_mvar: float = 0.0
    u_pu: float = 1.0

    # Short circuit parameters
    sk_mva: float | None = None
    rx_ratio: float | None = None

    in_service: bool = True

@dataclass
class Load:
    """
    Power consumption.
    """
    id: UUID
    name: str
    bus_id: UUID

    p_mw: float = 0.0
    q_mvar: float = 0.0

    in_service: bool = True
```

### 2.2 NetworkGraph

```python
class NetworkGraph:
    """
    Topological representation of the network.
    Uses NetworkX MultiGraph internally.
    """
    buses: Dict[UUID, Bus]
    branches: Dict[UUID, Branch]
    switches: Dict[UUID, Switch]
    sources: Dict[UUID, Source]
    loads: Dict[UUID, Load]

    _graph: nx.MultiGraph  # Topology only

    def get_effective_topology(self) -> nx.Graph:
        """
        Returns topology considering switch states.
        OPEN switches = disconnected
        CLOSED switches = connected (zero impedance)
        """

    def find_islands(self) -> List[List[UUID]]:
        """Find connected components."""

    def is_connected(self) -> bool:
        """Check if network is fully connected."""
```

### 2.3 NetworkSnapshot (Immutable)

```python
@dataclass(frozen=True)
class NetworkSnapshot:
    """
    Immutable snapshot of network state.
    Used for solver input and audit.
    """
    id: UUID
    created_at: datetime
    parent_snapshot_id: UUID | None

    buses: Tuple[Bus, ...]
    branches: Tuple[Branch, ...]
    switches: Tuple[Switch, ...]
    sources: Tuple[Source, ...]
    loads: Tuple[Load, ...]

    def to_graph(self) -> NetworkGraph:
        """Convert to mutable graph for analysis."""

    def fingerprint(self) -> str:
        """Deterministic hash for comparison."""
```

---

## 3. Catalog Layer (Type Library)

### 3.1 Immutable Types

```python
@dataclass(frozen=True)
class LineType:
    """Immutable line type definition."""
    id: UUID
    name: str
    manufacturer: str | None

    r_ohm_per_km: float
    x_ohm_per_km: float
    b_us_per_km: float
    rated_current_a: float
    max_temperature_c: float = 70.0

@dataclass(frozen=True)
class CableType:
    """Immutable cable type definition."""
    id: UUID
    name: str
    manufacturer: str | None

    r_ohm_per_km: float
    x_ohm_per_km: float
    c_nf_per_km: float
    rated_current_a: float
    voltage_rating_kv: float

@dataclass(frozen=True)
class TransformerType:
    """Immutable transformer type definition."""
    id: UUID
    name: str
    manufacturer: str | None

    rated_power_mva: float
    voltage_hv_kv: float
    voltage_lv_kv: float
    uk_percent: float
    pk_kw: float
    i0_percent: float
    p0_kw: float
    vector_group: str = "Dyn11"
```

### 3.2 Catalog Repository

```python
class CatalogRepository:
    """
    Manages type libraries.
    Types are shared across projects.
    """
    def get_line_type(self, type_id: UUID) -> LineType | None: ...
    def get_cable_type(self, type_id: UUID) -> CableType | None: ...
    def get_transformer_type(self, type_id: UUID) -> TransformerType | None: ...

    def list_line_types(self) -> List[LineType]: ...
    def list_cable_types(self) -> List[CableType]: ...
    def list_transformer_types(self) -> List[TransformerType]: ...
```

---

## 4. Validation Layer

### 4.1 NetworkValidator

```python
class NetworkValidator:
    """
    PowerFactory-style validation.
    Must pass before any solver execution.
    """

    def validate(self, model: NetworkGraph) -> ValidationReport:
        """
        Run all validation rules.
        Returns report with errors and warnings.
        """
        report = ValidationReport()

        # Graph connectivity
        report = self._check_connectivity(model, report)

        # No dangling elements
        report = self._check_dangling_elements(model, report)

        # Source presence
        report = self._check_source_presence(model, report)

        # Bus voltage validity
        report = self._check_bus_voltages(model, report)

        # Branch endpoint validity
        report = self._check_branch_endpoints(model, report)

        # Transformer voltage mismatch
        report = self._check_transformer_voltages(model, report)

        return report

    def _check_connectivity(self, model, report) -> ValidationReport:
        """Graph must have at least one source-connected island."""

    def _check_dangling_elements(self, model, report) -> ValidationReport:
        """No elements without connections."""

    def _check_source_presence(self, model, report) -> ValidationReport:
        """At least one source required."""

    def _check_bus_voltages(self, model, report) -> ValidationReport:
        """All bus voltages > 0."""

    def _check_branch_endpoints(self, model, report) -> ValidationReport:
        """All branch endpoints must exist."""

    def _check_transformer_voltages(self, model, report) -> ValidationReport:
        """HV and LV must differ."""
```

### 4.2 ValidationReport

```python
@dataclass
class ValidationIssue:
    code: str
    message: str
    severity: Severity  # ERROR, WARNING
    element_id: UUID | None = None
    field: str | None = None

@dataclass
class ValidationReport:
    issues: Tuple[ValidationIssue, ...]

    @property
    def is_valid(self) -> bool:
        """No blocking errors."""
        return not any(i.severity == Severity.ERROR for i in self.issues)

    @property
    def errors(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == Severity.ERROR]

    @property
    def warnings(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == Severity.WARNING]
```

---

## 5. Case Layer

### 5.1 Case Definition

```python
@dataclass
class StudyCase:
    """
    Base class for all study cases.
    CANNOT mutate the network model.
    """
    id: UUID
    name: str
    project_id: UUID

    # Reference to network snapshot (immutable)
    network_snapshot_id: UUID

    # Case-specific parameters
    parameters: Dict[str, Any]

    # Result state
    result_state: ResultState  # NONE, FRESH, OUTDATED

    def get_network_snapshot(self) -> NetworkSnapshot:
        """Get the immutable network state for this case."""
```

### 5.2 Short Circuit Case (IEC 60909)

```python
@dataclass
class ShortCircuitCase(StudyCase):
    """
    IEC 60909 short circuit calculation case.
    """
    fault_location: FaultLocation  # Bus ID or Branch ID + position
    fault_type: FaultType  # THREE_PHASE, LINE_TO_GROUND, etc.
    calculation_method: CalculationMethod  # IEC_60909_METHOD_B, etc.

    # Voltage factor
    c_max: float = 1.1
    c_min: float = 1.0

    # Result (when computed)
    result: ShortCircuitResult | None = None
```

### 5.3 Power Flow Case

```python
@dataclass
class PowerFlowCase(StudyCase):
    """
    Newton-Raphson power flow case.
    """
    # Solver options
    max_iterations: int = 50
    tolerance: float = 1e-6

    # Slack bus override (if not using default)
    slack_bus_id: UUID | None = None

    # Result (when computed)
    result: PowerFlowResult | None = None
```

---

## 6. Solver Layer (WHITE BOX)

### 6.1 Solver Interface

```python
class Solver(Protocol):
    """
    All solvers must implement this interface.
    """

    def solve(self, input: SolverInput) -> SolverResult:
        """
        Execute calculation.
        Must return WHITE BOX result with all intermediate values.
        """
        ...

@dataclass
class SolverResult:
    """
    Base result with WHITE BOX trace.
    """
    input_snapshot: NetworkSnapshot  # Frozen input
    intermediate: Dict[str, Any]  # All intermediate values
    output: Dict[str, Any]  # Final results
    white_box_trace: WhiteBoxTrace
```

### 6.2 IEC 60909 Short Circuit Solver

```python
class ShortCircuitSolverIEC60909:
    """
    IEC 60909 short circuit solver.
    WHITE BOX implementation.
    """

    def solve(self, case: ShortCircuitCase) -> ShortCircuitResult:
        trace = WhiteBoxTrace()

        # Step 1: Build equivalent circuit
        trace.step("build_equivalent_circuit")
        z_source = self._calculate_source_impedance(case)
        trace.record("z_source", z_source)

        # Step 2: Calculate Thevenin impedance
        trace.step("calculate_thevenin")
        z_th = self._calculate_thevenin_impedance(case, z_source)
        trace.record("z_thevenin", z_th)

        # Step 3: Calculate initial symmetrical current
        trace.step("calculate_ikss")
        c = case.c_max
        u_n = case.fault_location.voltage_kv
        ikss = (c * u_n * 1000) / (math.sqrt(3) * abs(z_th))
        trace.record("ikss_ka", ikss / 1000)

        # Step 4: Calculate peak current
        trace.step("calculate_ip")
        kappa = self._calculate_kappa(z_th)
        trace.record("kappa", kappa)
        ip = kappa * math.sqrt(2) * ikss
        trace.record("ip_ka", ip / 1000)

        # Step 5: Calculate thermal current
        trace.step("calculate_ith")
        m_n = self._calculate_mn(case)
        trace.record("m_n", m_n)
        ith = ikss * math.sqrt(m_n + 1)
        trace.record("ith_ka", ith / 1000)

        return ShortCircuitResult(
            ikss_ka=ikss / 1000,
            ip_ka=ip / 1000,
            ith_ka=ith / 1000,
            z_thevenin=z_th,
            kappa=kappa,
            white_box_trace=trace,
        )
```

### 6.3 Power Flow Solver (Newton-Raphson)

```python
class PowerFlowSolverNewtonRaphson:
    """
    Newton-Raphson power flow solver.
    WHITE BOX implementation.
    """

    def solve(self, case: PowerFlowCase) -> PowerFlowResult:
        trace = WhiteBoxTrace()

        # Step 1: Build Y-bus matrix
        trace.step("build_ybus")
        y_bus = self._build_ybus_matrix(case)
        trace.record("y_bus", y_bus.tolist())

        # Step 2: Initialize voltage vector
        trace.step("initialize_voltage")
        v = self._initialize_voltage(case)
        trace.record("v_initial", v.tolist())

        # Step 3: Newton-Raphson iterations
        for iteration in range(case.max_iterations):
            trace.step(f"iteration_{iteration}")

            # Calculate power mismatches
            p_calc, q_calc = self._calculate_power(v, y_bus)
            p_mismatch = case.p_scheduled - p_calc
            q_mismatch = case.q_scheduled - q_calc
            trace.record(f"p_mismatch_{iteration}", p_mismatch.tolist())
            trace.record(f"q_mismatch_{iteration}", q_mismatch.tolist())

            # Check convergence
            if self._is_converged(p_mismatch, q_mismatch, case.tolerance):
                trace.record("converged_at_iteration", iteration)
                break

            # Build Jacobian
            jacobian = self._build_jacobian(v, y_bus)
            trace.record(f"jacobian_{iteration}", jacobian.tolist())

            # Solve correction
            delta = np.linalg.solve(jacobian, np.concatenate([p_mismatch, q_mismatch]))
            trace.record(f"delta_{iteration}", delta.tolist())

            # Update voltage
            v = self._update_voltage(v, delta)
            trace.record(f"v_{iteration}", v.tolist())

        return PowerFlowResult(
            bus_voltages=self._extract_bus_voltages(v),
            branch_flows=self._calculate_branch_flows(v, y_bus),
            losses=self._calculate_losses(v, y_bus),
            white_box_trace=trace,
        )
```

### 6.4 White Box Trace

```python
@dataclass
class WhiteBoxTrace:
    """
    Audit trail for solver calculations.
    """
    steps: List[TraceStep] = field(default_factory=list)
    values: Dict[str, Any] = field(default_factory=dict)

    def step(self, name: str) -> None:
        """Mark start of calculation step."""
        self.steps.append(TraceStep(name=name, timestamp=datetime.now()))

    def record(self, key: str, value: Any) -> None:
        """Record intermediate value."""
        self.values[key] = value

    def to_dict(self) -> dict:
        """Export for audit."""
        return {
            "steps": [s.to_dict() for s in self.steps],
            "values": self._serialize_values(self.values),
        }

    def verify_manually(self) -> str:
        """
        Generate human-readable audit trail
        for manual verification.
        """
```

---

## 7. Application Layer

### 7.1 Wizard (Network Editor Controller)

```python
class NetworkWizard:
    """
    Sequential controller for network editing.
    NOT a separate model - operates on NetworkModel.
    """

    def __init__(self, network: NetworkGraph, catalog: CatalogRepository):
        self.network = network
        self.catalog = catalog
        self.validator = NetworkValidator()

    # Step 1: Project
    def create_project(self, name: str) -> Project: ...

    # Step 2: Type Library
    def select_line_type(self, type_id: UUID) -> LineType: ...
    def select_transformer_type(self, type_id: UUID) -> TransformerType: ...

    # Step 3: Buses
    def add_bus(self, bus: Bus) -> Bus:
        """Add bus to NetworkModel."""
        self.network.add_bus(bus)
        return bus

    # Step 4: Lines/Cables
    def add_line(self, line: LineBranch) -> LineBranch:
        """Add line to NetworkModel."""
        self.network.add_branch(line)
        return line

    # Step 5: Transformers
    def add_transformer(self, trafo: TransformerBranch) -> TransformerBranch:
        """Add transformer to NetworkModel."""
        self.network.add_branch(trafo)
        return trafo

    # Step 6: Sources
    def add_source(self, source: Source) -> Source:
        """Add source to NetworkModel."""
        self.network.add_source(source)
        return source

    # Step 7: Switches
    def add_switch(self, switch: Switch) -> Switch:
        """Add switch to NetworkModel."""
        self.network.add_switch(switch)
        return switch

    # Step 8: Validation
    def validate(self) -> ValidationReport:
        """Run NetworkValidator."""
        return self.validator.validate(self.network)

    # Step 9: Cases
    def create_short_circuit_case(self, params: dict) -> ShortCircuitCase: ...
    def create_power_flow_case(self, params: dict) -> PowerFlowCase: ...
```

### 7.2 SLD (Single Line Diagram)

```python
class SldDiagram:
    """
    Visualization of NetworkModel.
    NOT a separate data store.
    """

    def __init__(self, network: NetworkGraph):
        self.network = network
        self.layout: Dict[UUID, Position] = {}

    def get_bus_symbol(self, bus_id: UUID) -> SldBusSymbol:
        """Get visual representation of bus from NetworkModel."""
        bus = self.network.get_bus(bus_id)
        position = self.layout.get(bus_id, Position(0, 0))
        return SldBusSymbol(bus=bus, position=position)

    def get_branch_symbol(self, branch_id: UUID) -> SldBranchSymbol:
        """Get visual representation of branch from NetworkModel."""
        branch = self.network.get_branch(branch_id)
        return SldBranchSymbol(branch=branch)

    def edit_bus(self, bus_id: UUID, changes: dict) -> Bus:
        """
        Edit bus through SLD.
        MODIFIES the same NetworkModel as Wizard.
        """
        bus = self.network.get_bus(bus_id)
        updated = dataclasses.replace(bus, **changes)
        self.network.update_bus(updated)
        return updated

    def auto_layout(self) -> None:
        """Calculate automatic layout positions."""
```

---

## 8. Data Flow

### 8.1 Edit Flow

```
User Action (Wizard or SLD)
         │
         ▼
   NetworkModel.modify()
         │
         ├──► SLD.refresh()  ◄── Reflects change immediately
         │
         └──► Case.invalidate_results()  ◄── All results marked OUTDATED
```

### 8.2 Calculation Flow

```
User: "Run Short Circuit"
         │
         ▼
   NetworkValidator.validate()
         │
         ├── INVALID → Block with error message
         │
         └── VALID
                │
                ▼
         Create NetworkSnapshot (immutable)
                │
                ▼
         ShortCircuitSolver.solve()
                │
                ▼
         ShortCircuitResult (with WHITE BOX trace)
                │
                ▼
         Store result, mark case as FRESH
```

---

## 9. Interpretation Layer (Not Solver)

### 9.1 Boundary Identification

```python
class BoundaryIdentifier:
    """
    Identifies PCC and other boundaries.
    THIS IS INTERPRETATION, NOT PHYSICS.
    """

    def identify_pcc(self, network: NetworkGraph) -> UUID | None:
        """
        Find Point of Common Coupling.
        Uses heuristics, not physics.
        Returns bus_id that represents PCC.
        """
        # Look for bus connected to external grid source
        for source in network.sources.values():
            if source.source_type == SourceType.EXTERNAL_GRID:
                return source.bus_id
        return None
```

### 9.2 Analysis (Post-Solver)

```python
class ThermalAnalysis:
    """
    Interprets power flow results.
    Checks for overloads.
    """

    def analyze(self, result: PowerFlowResult) -> List[ThermalViolation]:
        violations = []
        for branch_flow in result.branch_flows:
            if branch_flow.loading_percent > 100:
                violations.append(ThermalViolation(
                    branch_id=branch_flow.branch_id,
                    loading_percent=branch_flow.loading_percent,
                    severity="ERROR" if branch_flow.loading_percent > 120 else "WARNING",
                ))
        return violations
```

---

## 10. Result Invalidation

### 10.1 Model Change Detection

```python
class ResultInvalidator:
    """
    Marks results as outdated when model changes.
    """

    def on_model_change(self, change_event: ModelChangeEvent) -> None:
        """
        Called whenever NetworkModel is modified.
        """
        for case in self.get_all_cases():
            case.result_state = ResultState.OUTDATED
            case.result = None
```

### 10.2 Freshness States

```
NONE     ──► FRESH (after successful computation)
FRESH    ──► OUTDATED (after model change)
OUTDATED ──► FRESH (after re-computation)
```

---

## 11. File Organization

```
backend/src/
├── network_model/
│   ├── core/
│   │   ├── __init__.py
│   │   ├── bus.py              # Bus (electrical node)
│   │   ├── branch.py           # LineBranch, TransformerBranch
│   │   ├── switch.py           # Switch (apparatus)
│   │   ├── source.py           # Source, Load
│   │   ├── graph.py            # NetworkGraph
│   │   └── snapshot.py         # NetworkSnapshot
│   ├── catalog/
│   │   ├── __init__.py
│   │   ├── types.py            # LineType, CableType, TransformerType
│   │   └── repository.py       # CatalogRepository
│   ├── validation/
│   │   ├── __init__.py
│   │   └── validator.py        # NetworkValidator
│   ├── solvers/
│   │   ├── __init__.py
│   │   ├── short_circuit_iec60909.py
│   │   └── power_flow_newton.py
│   └── whitebox/
│       ├── __init__.py
│       └── tracer.py           # WhiteBoxTrace
├── cases/
│   ├── __init__.py
│   ├── base.py                 # StudyCase base
│   ├── short_circuit_case.py
│   └── power_flow_case.py
├── analyses/
│   ├── __init__.py
│   ├── boundary.py             # BoundaryIdentifier (PCC)
│   ├── thermal.py              # ThermalAnalysis
│   ├── voltage.py              # VoltageAnalysis
│   └── protection/             # ProtectionAnalysis (prospective)
├── application/
│   ├── wizard/
│   │   ├── __init__.py
│   │   └── service.py          # NetworkWizard
│   └── sld/
│       ├── __init__.py
│       ├── diagram.py          # SldDiagram
│       └── layout.py           # Auto-layout
└── infrastructure/
    ├── persistence/
    └── repositories/
```

---

## 12. API Contracts

### 12.1 Wizard API

```python
# Add bus
POST /api/projects/{project_id}/buses
{
    "name": "Bus 1",
    "voltage_level_kv": 15.0,
    "node_type": "PQ"
}

# Add branch
POST /api/projects/{project_id}/branches
{
    "name": "Line 1",
    "branch_type": "LINE",
    "from_bus_id": "uuid",
    "to_bus_id": "uuid",
    "type_ref": "uuid"  # Reference to Catalog
}

# Validate
POST /api/projects/{project_id}/validate
Response: ValidationReport
```

### 12.2 Case API

```python
# Create short circuit case
POST /api/projects/{project_id}/cases/short-circuit
{
    "name": "SC Case 1",
    "fault_location": {"bus_id": "uuid"},
    "fault_type": "THREE_PHASE",
    "c_max": 1.1
}

# Run case
POST /api/cases/{case_id}/run
Response: {
    "result": ShortCircuitResult,
    "white_box_trace": WhiteBoxTrace
}
```

---

## 13. Compliance Matrix

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Single NetworkModel | NetworkGraph | DONE |
| Bus (not Node) | Rename pending | TODO |
| Switch without R/X | Switch class | DONE |
| Station = logical | Not in solver | DONE |
| Case immutability | NetworkSnapshot | DONE |
| Catalog | CatalogRepository | DONE |
| WHITE BOX solvers | WhiteBoxTrace | DONE |
| NetworkValidator | validator.py | TODO |
| PCC in interpretation | BoundaryIdentifier | TODO |
| Result invalidation | ResultInvalidator | TODO |

---

**END OF ARCHITECTURE DOCUMENT**
