# MV-DESIGN-PRO — FULL ARCHITECTURE (CANONICAL)
## Better-Than-PowerFactory / No-Compromise

**Status:** BINDING
**Wersja:** 1.0
**Data:** 2026-01-30
**Autor:** Opus 4.5 (Główny Architekt Systemu)

---

## 1. WIZJA ARCHITEKTONICZNA

MV-DESIGN-PRO to system projektowania sieci SN/nn, który:
- Osiąga **pełny parytet funkcjonalny** z DIgSILENT PowerFactory
- **Przewyższa PowerFactory** w obszarach: Proof/Trace, Case Engine, SLD wynikowy, Protection UX
- Działa **deterministycznie**, **audytowalnie**, **po polsku**
- Eliminuje "magiczne defaulty" — każda decyzja jest jawna i śledzalna

---

## 2. NIEZMIENNE OGRANICZENIA (FROZEN)

| Komponent | Status | Lokalizacja |
|-----------|--------|-------------|
| **Solver IEC 60909** | FROZEN | `network_model/solvers/short_circuit_iec60909.py` |
| **ShortCircuitResult** | FROZEN | `network_model/solvers/short_circuit_iec60909.py` |
| **to_dict()** | FROZEN | Result serialization |
| **white_box_trace** | FROZEN | `network_model/solvers/power_flow_trace.py` |
| **P11 Proof Engine** | BINDING | `application/proof_engine/` |
| **Result Comparison API** | FROZEN | `domain/results.py` |

**Zasada:** Te komponenty są fundamentem systemu. Rozszerzamy je przez kompozycję, nie przez modyfikację.

---

## 3. ARCHITEKTURA WARSTWOWA (FULL)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WARSTWA PREZENTACJI (UI)                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│
│  │ SLD Editor  │ │ ProofGraph  │ │ TCC Viewer  │ │ Case Matrix Browser ││
│  │  (wynikowy) │ │    (UX)     │ │ (Protection)│ │   (Scenario Grid)   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│
│  │  Property   │ │  Results    │ │ Comparison  │ │   Catalog Browser   ││
│  │    Grid     │ │  Inspector  │ │    View     │ │  (Type Library)     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       WARSTWA APLIKACYJNA (SERVICES)                    │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                      CASE ENGINE 2.0                                ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ ││
│  │  │ Project  │→│  Case    │→│   Run    │→│ Snapshot │→│  Result   │ ││
│  │  │ Manager  │ │ Pipeline │ │ Executor │ │  Store   │ │   Cache   │ ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘ ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐ │
│  │   Proof Engine   │ │ Protection Engine│ │   Interpretation Layer  │ │
│  │  (P11 BINDING)   │ │  (TCC + Select.) │ │  (Normative + Limits)   │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────────┘ │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐ │
│  │  SLD Service     │ │ Comparison Svc   │ │   Reporting Service     │ │
│  │  (Layout+Overlay)│ │ (Diff + Delta)   │ │   (PDF/DOCX Export)     │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         WARSTWA DOMENOWA (DOMAIN)                       │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐ │
│  │   NetworkGraph   │ │   StudyCase      │ │   AnalysisRun            │ │
│  │   (Topologia)    │ │   (Case Model)   │ │   (Run Model)            │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────────┘ │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐ │
│  │  NetworkSnapshot │ │  ProtectionZone  │ │   ProofDocument          │ │
│  │  (Frozen State)  │ │  (Coord. Group)  │ │   (Audit Trail)          │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         WARSTWA SOLVERÓW (FROZEN)                       │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐ │
│  │  IEC 60909 SC    │ │  Newton-Raphson  │ │   Y-Bus Builder          │ │
│  │    Solver        │ │   Power Flow     │ │   (Admittance)           │ │
│  │    [FROZEN]      │ │    [FROZEN]      │ │     [FROZEN]             │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      WARSTWA KATALOGU (TYPE LIBRARY)                    │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐ │
│  │   LineType       │ │ TransformerType  │ │  ProtectionDeviceType    │ │
│  │   CableType      │ │  ConverterType   │ │  ProtectionCurve         │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │              TypeLibraryGovernance (P13b COMPLETE)                  ││
│  │   • Deterministic Fingerprinting (SHA-256)                          ││
│  │   • Source Attribution (norma/karta/producent)                      ││
│  │   • Version Control + Conflict Detection                            ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. CASE ENGINE 2.0 — SZCZEGÓŁY

### 4.1 Hierarchia obiektów

```
Project
  └── Case[]
        ├── Assumptions (parametry wejściowe)
        ├── SolveSet (konfiguracja solverów)
        ├── Limits (kryteria oceny)
        └── Run[]
              ├── Snapshot (zamrożony stan sieci)
              ├── Results (wyniki obliczeń)
              ├── ProofPack (ślad audytowy)
              └── Reports (wygenerowane raporty)
```

### 4.2 Case Pipeline

```python
@dataclass(frozen=True)
class CasePipeline:
    """Immutable pipeline definition for a study case."""

    # Stage 1: Model Selection
    network_snapshot_id: str
    topology_variant: TopologyVariant  # NORMAL / N-1 / MAINTENANCE

    # Stage 2: Assumptions
    assumptions: CaseAssumptions  # Voltage factors, temperature, etc.

    # Stage 3: Solver Configuration
    solve_set: SolveSet  # Which analyses to run

    # Stage 4: Evaluation Limits
    limits: EvaluationLimits  # Thermal, voltage, SC limits

    # Stage 5: Report Configuration
    report_config: ReportConfig  # What to export

    def fingerprint(self) -> str:
        """Deterministic hash of entire pipeline."""
        ...
```

### 4.3 Scenario Matrix (PRZEWAGA NAD PF)

```python
@dataclass
class ScenarioMatrix:
    """Automatic generation of case grid."""

    base_case: CasePipeline

    # Axes of variation
    topology_variants: list[TopologyVariant]
    load_scenarios: list[LoadScenario]  # MIN / NORMAL / MAX
    generation_scenarios: list[GenerationScenario]
    fault_locations: list[str]  # Bus IDs for SC analysis

    def generate_cases(self) -> list[CasePipeline]:
        """Generate all combinations (Cartesian product)."""
        ...

    def total_cases(self) -> int:
        """Number of cases in matrix."""
        return (
            len(self.topology_variants) *
            len(self.load_scenarios) *
            len(self.generation_scenarios) *
            len(self.fault_locations)
        )
```

### 4.4 Batch Solve + Cache

```python
class BatchSolver:
    """Execute multiple cases with intelligent caching."""

    def __init__(self, cache: ResultCache):
        self._cache = cache

    def solve_batch(
        self,
        cases: list[CasePipeline],
        parallel: bool = True,
    ) -> list[RunResult]:
        results = []
        for case in cases:
            cache_key = case.fingerprint()
            if cached := self._cache.get(cache_key):
                results.append(cached)
            else:
                result = self._solve_single(case)
                self._cache.put(cache_key, result)
                results.append(result)
        return results
```

### 4.5 Run Diff (PRZEWAGA NAD PF)

```python
@dataclass
class RunDiff:
    """Explain why results changed between runs."""

    run_a_id: str
    run_b_id: str

    # Input changes
    model_changes: list[ModelChange]  # What changed in network
    assumption_changes: list[AssumptionChange]
    solver_config_changes: list[SolverConfigChange]

    # Result changes
    result_deltas: dict[str, NumericDelta]

    # Root cause analysis
    primary_cause: str  # "Topology change: Switch SW-01 opened"
    impact_chain: list[str]  # ["Z_eq increased", "Ik'' decreased"]
```

---

## 5. PROOF ENGINE / WHITE BOX — SZCZEGÓŁY

### 5.1 ProofGraph jako pierwsza klasa

```python
@dataclass
class ProofGraph:
    """Directed acyclic graph of proof steps."""

    nodes: dict[str, ProofNode]  # node_id -> node
    edges: list[ProofEdge]  # dependencies

    root_result: str  # Final result node ID

    def traverse_proof(self, result_id: str) -> Iterator[ProofNode]:
        """Walk back from result to inputs."""
        ...

    def to_latex(self) -> str:
        """Export as LaTeX derivation."""
        ...

    def to_interactive_html(self) -> str:
        """Export as clickable HTML proof."""
        ...


@dataclass
class ProofNode:
    """Single step in proof chain."""

    node_id: str
    node_type: ProofNodeType  # INPUT / FORMULA / INTERMEDIATE / RESULT

    # For FORMULA nodes
    equation_id: str | None  # Reference to EquationRegistry
    latex_formula: str | None

    # Values
    inputs: dict[str, ProofValue]  # symbol -> value
    output: ProofValue

    # Traceability
    source_norm: str | None  # "IEC 60909:2016 eq. 29"
    variant: str | None  # "Method A" / "Method B"


@dataclass
class ProofValue:
    """Value with full metadata."""

    symbol: str  # "Z_eq"
    value: complex | float
    unit: str  # "Ω"
    precision: int  # Significant digits

    # Source tracing
    source_type: SourceType  # CATALOG / CALCULATED / ASSUMED / USER_INPUT
    source_ref: str | None  # Catalog entry ID, equation ID, etc.
```

### 5.2 Click-through: Element → Result → Proof

```
┌──────────────────────────────────────────────────────────────────┐
│                        SLD VIEW                                  │
│                                                                  │
│    [TR-01] ──────[BUS-A]────── [LINE-01] ────[BUS-B]            │
│       │              │                           │               │
│       │         Ik'' = 12.5 kA                   │               │
│       │              ↓ click                     │               │
│       │                                          │               │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    RESULTS INSPECTOR                             │
│                                                                  │
│  Bus: BUS-A                                                      │
│  ├── Ik'' = 12.5 kA        [View Proof →]                       │
│  ├── ip  = 31.8 kA         [View Proof →]                       │
│  ├── Ith = 12.1 kA         [View Proof →]                       │
│  └── Sk'' = 216 MVA        [View Proof →]                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      PROOF INSPECTOR                             │
│                                                                  │
│  Ik'' at BUS-A                                                   │
│  ══════════════                                                  │
│                                                                  │
│  Formula (IEC 60909:2016 eq. 29):                               │
│                                                                  │
│       c × Un                                                     │
│  Ik'' = ─────────                                                │
│        √3 × |Zk|                                                 │
│                                                                  │
│  Substitution:                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ c   = 1.10        [Voltage factor, max, IEC 60909 Tab. 1]  │ │
│  │ Un  = 10.0 kV     [Nominal voltage, from network model]    │ │
│  │ Zk  = 0.508 Ω     [← View derivation]                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Calculation:                                                    │
│       1.10 × 10000                                               │
│  Ik'' = ─────────────── = 12.513 kA                             │
│        √3 × 0.508                                                │
│                                                                  │
│  Verification: ✓ PASS (within 0.1% of reported value)           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5.3 Porównanie Proof między runami

```python
@dataclass
class ProofComparison:
    """Compare proof chains between two runs."""

    run_a_proof: ProofGraph
    run_b_proof: ProofGraph

    # Structural comparison
    added_nodes: list[str]
    removed_nodes: list[str]
    modified_nodes: list[ProofNodeDiff]

    # Value comparison
    input_changes: list[InputValueChange]
    intermediate_changes: list[IntermediateValueChange]
    result_changes: list[ResultValueChange]

    def explain_difference(self) -> str:
        """Human-readable explanation of why results differ."""
        ...
```

---

## 6. PROTECTION ENGINE (FULL) — SZCZEGÓŁY

### 6.1 TCC Engine

```python
class TCCEngine:
    """Time-Current Characteristic calculation engine."""

    def __init__(self, curve_library: CurveLibrary):
        self._curves = curve_library

    def evaluate_trip_time(
        self,
        device: ProtectionDevice,
        fault_current: float,  # kA
        curve_type: CurveType,  # IEC / IEEE / MANUFACTURER
    ) -> TripEvaluation:
        """Calculate trip time for given fault current."""
        ...

    def plot_curve(
        self,
        device: ProtectionDevice,
        i_range: tuple[float, float],  # (I_min, I_max) in kA
    ) -> TCCPlotData:
        """Generate TCC plot data."""
        ...


@dataclass
class TripEvaluation:
    """Result of trip time evaluation."""

    device_id: str
    fault_current_kA: float

    # Trip characteristics
    will_trip: bool
    trip_time_s: float | None
    trip_zone: str | None  # "Instantaneous" / "Time-delayed" / "No trip"

    # Thermal stress
    i2t_let_through: float | None  # A²s

    # Source tracing
    curve_source: str  # "IEC 60255-151" / "Manufacturer: ABB REF615"
    settings_source: str  # "User input" / "Template: Standard MV"
```

### 6.2 Krzywe producentów z metadanymi

```python
@dataclass
class ManufacturerCurve:
    """Protection curve with full provenance."""

    curve_id: str

    # Identification
    manufacturer: str  # "ABB", "Siemens", "SEL"
    device_family: str  # "REF615", "7SJ82", "751"
    curve_name: str  # "Very Inverse"

    # Curve data
    curve_type: CurveType  # IEC_STANDARD_INVERSE / IEEE_VERY_INVERSE / CUSTOM
    time_dial_range: tuple[float, float]
    pickup_range: tuple[float, float]

    # For custom curves
    custom_points: list[tuple[float, float]] | None  # (I/I_pickup, t)
    custom_equation: str | None  # "t = 0.14 / ((I/Is)^0.02 - 1)"

    # Provenance (OBOWIĄZKOWE)
    source_document: str  # "ABB REF615 Technical Manual, Doc. 1MRS756887"
    source_version: str  # "Rev. E, 2023-03"
    source_page: str | None  # "p. 245"
    import_date: datetime

    # Validation
    validation_status: ValidationStatus  # VALIDATED / PENDING / REJECTED
    validated_by: str | None
    validation_date: datetime | None
```

### 6.3 Overlay: Ik″ / ip / Ith / Idyn / I²t

```python
@dataclass
class ProtectionOverlay:
    """Overlay fault currents on TCC diagram."""

    # Fault current levels (vertical lines on TCC)
    ik_pp_3f: float  # Ik'' three-phase
    ik_pp_1f: float | None  # Ik'' single-phase
    ik_pp_2f: float | None  # Ik'' two-phase

    ip_peak: float  # Peak current
    ith_thermal: float  # Thermal equivalent
    idyn_dynamic: float  # Dynamic (for breaker rating)

    # Thermal limits (horizontal bands)
    i2t_withstand: float  # Equipment I²t withstand

    # Derived markers
    min_breaking_current: float
    max_breaking_current: float

    def to_plot_annotations(self) -> list[PlotAnnotation]:
        """Convert to TCC plot annotations."""
        ...
```

### 6.4 Selektywność (PRZEWAGA NAD PF)

```python
@dataclass
class SelectivityAnalysis:
    """Comprehensive selectivity analysis."""

    upstream_device: ProtectionDevice
    downstream_device: ProtectionDevice

    # Analysis results
    time_selectivity: TimeSelectivityResult
    current_selectivity: CurrentSelectivityResult
    energy_selectivity: EnergySelectivityResult

    # Overall verdict
    is_selective: bool
    selectivity_margin: float  # seconds (for time) or ratio (for energy)

    # Collision points (EXPLAIN WHY)
    collision_points: list[SelectivityCollision]


@dataclass
class SelectivityCollision:
    """Specific point where selectivity fails."""

    fault_current_kA: float

    upstream_trip_time_s: float
    downstream_trip_time_s: float

    required_margin_s: float  # Per standard (typically 0.3s)
    actual_margin_s: float

    failure_type: str  # "TIME_OVERLAP" / "UPSTREAM_FASTER" / "ENERGY_EXCEED"

    recommendation: str  # "Increase upstream time dial to 0.5"


@dataclass
class TimeSelectivityResult:
    """Time grading analysis."""

    is_selective: bool
    min_margin_s: float
    margin_at_max_fault: float
    margin_at_min_fault: float

    grading_curve: list[tuple[float, float]]  # (I, margin) pairs


@dataclass
class EnergySelectivityResult:
    """Energy (I²t) let-through analysis."""

    is_selective: bool

    downstream_let_through: float  # A²s at max fault
    upstream_withstand: float  # A²s

    margin_ratio: float  # upstream_withstand / downstream_let_through
```

---

## 7. SLD WYNIKOWY — SZCZEGÓŁY

### 7.1 SLD jako View, nie rysunek

```python
class SLDResultView:
    """SLD as a result-driven view, not a drawing."""

    def __init__(
        self,
        network: NetworkGraph,
        layout: SLDLayout,
        run_result: RunResult | None = None,
    ):
        self._network = network
        self._layout = layout
        self._result = run_result

    def render(
        self,
        layers: set[SLDLayer],
        comparison_run: RunResult | None = None,
    ) -> SLDRenderData:
        """Render SLD with selected result layers."""
        ...


class SLDLayer(Enum):
    """Available overlay layers."""

    # Topological (always available)
    TOPOLOGY = "topology"
    EQUIPMENT_LABELS = "equipment_labels"

    # Voltage results
    VOLTAGE_MAGNITUDE = "voltage_magnitude"
    VOLTAGE_ANGLE = "voltage_angle"
    VOLTAGE_PROFILE = "voltage_profile"  # Color gradient

    # Current results
    BRANCH_CURRENTS = "branch_currents"
    CURRENT_LOADING = "current_loading"  # % of rating

    # Power flow results
    ACTIVE_POWER = "active_power"
    REACTIVE_POWER = "reactive_power"
    POWER_ARROWS = "power_arrows"  # Direction indicators

    # Short-circuit results
    SC_CURRENTS = "sc_currents"  # Ik'' at buses
    SC_CONTRIBUTIONS = "sc_contributions"  # Per-source contributions

    # Margins and status
    THERMAL_MARGINS = "thermal_margins"
    VOLTAGE_MARGINS = "voltage_margins"

    # Protection
    PROTECTION_STATUS = "protection_status"  # Trip/No-trip indicators
    PROTECTION_ZONES = "protection_zones"  # Coordination groups

    # Comparison
    DELTA_OVERLAY = "delta_overlay"  # Diff between two runs
```

### 7.2 Click: Element → Properties → Results → Proof → TCC

```
User clicks on [TR-01] transformer
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CONTEXT MENU                                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ → View Properties                                           │ │
│ │ → View Results                                              │ │
│ │ → View Proof                                                │ │
│ │ → View Protection (TCC)                                     │ │
│ │ → Compare with Run...                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

"View Properties" opens:
┌─────────────────────────────────────────────────────────────────┐
│ PROPERTY GRID: TR-01                                            │
│ ═══════════════════════════════════════════════════════════════ │
│                                                                 │
│ ▼ Identification                                                │
│   ID:          TR-01                                            │
│   Name:        Transformator główny                             │
│   Type:        [TNOV-630/10] ← click to view catalog           │
│                                                                 │
│ ▼ Electrical Parameters                                         │
│   Sn:          630 kVA       [Source: Catalog]                 │
│   Un1/Un2:     10/0.4 kV     [Source: Catalog]                 │
│   uk%:         4.0 %         [Source: Catalog]                 │
│   Pk:          6.5 kW        [Source: Catalog]                 │
│   i0%:         1.5 %         [Source: Catalog]                 │
│   p0:          1.1 kW        [Source: Catalog]                 │
│   Vector:      Dyn5          [Source: Catalog]                 │
│                                                                 │
│ ▼ Calculated Impedance (from current run)                      │
│   Zk:          0.254 Ω       [View derivation →]               │
│   R/X:         0.25          [View derivation →]               │
│                                                                 │
│ ▼ Protection                                                    │
│   HV Fuse:     [F-01] NHGG 63A  [View TCC →]                   │
│   LV Breaker:  [CB-01] NSX250   [View TCC →]                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Porównanie dwóch Case'ów na jednym SLD

```python
@dataclass
class SLDComparisonView:
    """Overlay two runs on single SLD."""

    base_run: RunResult
    compare_run: RunResult

    # Display options
    delta_mode: DeltaMode  # ABSOLUTE / PERCENT / SIDE_BY_SIDE
    highlight_threshold: float  # Highlight if delta > threshold

    def render_comparison(self) -> SLDRenderData:
        """Render SLD with comparison overlays."""
        ...


# Visual representation:
#
# ┌──────────────────────────────────────────────────────────────┐
# │                    SLD COMPARISON VIEW                       │
# │                                                              │
# │    [TR-01] ──────[BUS-A]────── [LINE-01] ────[BUS-B]        │
# │                     │                           │            │
# │              ┌──────┴──────┐             ┌──────┴──────┐     │
# │              │ Ik''        │             │ Ik''        │     │
# │              │ Run A: 12.5 │             │ Run A: 8.3  │     │
# │              │ Run B: 13.1 │             │ Run B: 8.7  │     │
# │              │ Δ: +4.8%  ▲ │             │ Δ: +4.8%  ▲ │     │
# │              └─────────────┘             └─────────────┘     │
# │                                                              │
# │  Legend: ▲ Increased  ▼ Decreased  ● No change              │
# │                                                              │
# └──────────────────────────────────────────────────────────────┘
```

---

## 8. KATALOG TYPÓW — SINGLE SOURCE OF TRUTH

### 8.1 Parametr z pełnymi metadanymi

```python
@dataclass
class CatalogParameter:
    """Single parameter with full provenance."""

    name: str  # "uk_percent"
    display_name_pl: str  # "Napięcie zwarciowe uk%"

    # Value
    value: float | complex | str
    unit: str  # "%"

    # Provenance (OBOWIĄZKOWE — brak = błąd)
    source_type: SourceType  # STANDARD / DATASHEET / MANUFACTURER / CALCULATED
    source_document: str  # "IEC 60076-1:2011" / "ABB datasheet 1LAB000123"
    source_version: str | None  # "Ed. 3.0"
    source_page: str | None  # "Table 5"
    source_date: date | None  # Date of document

    # Validity
    valid_range: tuple[float, float] | None  # (min, max)
    typical_range: tuple[float, float] | None

    # Metadata
    import_date: datetime
    imported_by: str | None  # User or system


class SourceType(Enum):
    """Type of data source."""

    STANDARD = "standard"  # IEC, IEEE, EN
    DATASHEET = "datasheet"  # Manufacturer datasheet
    MANUFACTURER = "manufacturer"  # Direct from manufacturer
    TEST_REPORT = "test_report"  # Type test or routine test
    CALCULATED = "calculated"  # Derived from other parameters
    ASSUMED = "assumed"  # Engineering assumption (requires justification)
    USER_INPUT = "user_input"  # Manual entry (requires validation)
```

### 8.2 Walidacja źródła

```python
class CatalogValidator:
    """Validate catalog entries have proper sources."""

    def validate_entry(self, entry: CatalogEntry) -> ValidationResult:
        errors = []
        warnings = []

        for param in entry.parameters:
            if param.source_type is None:
                errors.append(
                    f"Parameter '{param.name}' has no source — REJECTED"
                )
            elif param.source_type == SourceType.ASSUMED:
                if not param.justification:
                    errors.append(
                        f"Assumed parameter '{param.name}' requires justification"
                    )
                else:
                    warnings.append(
                        f"Parameter '{param.name}' is assumed: {param.justification}"
                    )
            elif param.source_type == SourceType.USER_INPUT:
                warnings.append(
                    f"Parameter '{param.name}' is user input — requires validation"
                )

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
        )
```

### 8.3 Data Book Export

```python
class DataBookExporter:
    """Export complete catalog as auditable Data Book."""

    def export(
        self,
        catalog: TypeLibrary,
        format: ExportFormat,  # PDF / XLSX / JSON
    ) -> bytes:
        """
        Export catalog with:
        - All parameters
        - All sources
        - All versions
        - Change history
        - Validation status
        """
        ...
```

---

## 9. UI/UX PRINCIPLES (FULL, PL)

### 9.1 Zero magicznych defaultów

```python
# WRONG — hidden default
def calculate_sc(bus_id: str):
    c_factor = 1.1  # Hidden assumption!
    ...

# CORRECT — explicit, traceable
def calculate_sc(
    bus_id: str,
    assumptions: SCAssumptions,  # User must provide
) -> SCResult:
    c_factor = assumptions.voltage_factor  # From user input
    # Log source for audit trail
    trace.log_assumption("c_factor", c_factor, assumptions.voltage_factor_source)
    ...
```

### 9.2 Hierarchia + Presety + Tryb ekspercki

```
┌─────────────────────────────────────────────────────────────────┐
│ CALCULATION SETTINGS                                            │
│ ═══════════════════════════════════════════════════════════════ │
│                                                                 │
│ Preset: [Standard IEC 60909 ▼]                                 │
│                                                                 │
│ ☑ Show expert options                                          │
│                                                                 │
│ ▼ Voltage Factors                                               │
│   ├─ c_max (max fault): 1.10  [IEC 60909 Tab. 1, MV networks] │
│   ├─ c_min (min fault): 1.00  [IEC 60909 Tab. 1]              │
│   └─ Applied to: [All buses ▼]                                 │
│                                                                 │
│ ▼ Method Selection                                              │
│   ├─ Transformer method: [Method B ▼]                          │
│   │   ℹ️ Method B: Separate R and X (more accurate)            │
│   │   ℹ️ Method A: Combined Z (conservative)                   │
│   └─ Motor contribution: [Include ▼]                           │
│       ℹ️ IEC 60909 allows excluding for Sn < 100 kVA          │
│                                                                 │
│ ▼ Advanced (Expert)                                             │
│   ├─ κ calculation: [IEC 60909 eq. 56 ▼]                       │
│   ├─ Thermal equivalent: [IEC 60909 eq. 107 ▼]                 │
│   └─ Asymmetry factor m: [Auto from R/X ▼]                     │
│                                                                 │
│                                    [Reset to Preset] [Apply]   │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Tooltip: wzór + wpływ

```
Hovering over "c_max = 1.10":

┌─────────────────────────────────────────────────────────────────┐
│ Voltage Factor c_max                                            │
│ ═══════════════════════════════════════════════════════════════ │
│                                                                 │
│ Formula:                                                        │
│         c × Un                                                  │
│   Ik'' = ─────────                                              │
│         √3 × |Zk|                                               │
│                                                                 │
│ Impact:                                                         │
│   • Higher c → Higher Ik''                                     │
│   • c = 1.10 increases Ik'' by 10% vs c = 1.00                 │
│                                                                 │
│ Source:                                                         │
│   IEC 60909:2016 Table 1                                        │
│   "Voltage factor c for medium voltage networks (1 kV < Un ≤   │
│   35 kV), maximum short-circuit currents"                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. PCC — PUNKT WSPÓLNEGO PRZYŁĄCZENIA

### 10.1 Konsekwentna terminologia

| Kontekst | Termin | NIGDY nie używać |
|----------|--------|------------------|
| UI labels | "PCC – punkt wspólnego przyłączenia" | "POI", "Point of Connection" |
| Code comments | "PCC (punkt wspólnego przyłączenia)" | "grid connection point" |
| Documentation | "PCC" (po pierwszym rozwinięciu) | Skróty bez rozwinięcia |
| Reports | "Punkt wspólnego przyłączenia (PCC)" | Angielskie terminy |

### 10.2 PCC w modelu

```python
@dataclass
class PCCDefinition:
    """Punkt wspólnego przyłączenia — definicja."""

    bus_id: str  # Bus representing PCC

    # Grid equivalent at PCC
    sk_pp_mva: float  # Moc zwarciowa sieci zasilającej
    rk_xk_ratio: float  # Stosunek R/X sieci

    # Contractual limits
    max_power_import_mw: float | None
    max_power_export_mw: float | None
    voltage_limits: tuple[float, float] | None  # (U_min_pu, U_max_pu)

    # Source
    source_document: str  # "Warunki przyłączenia nr WP/2024/123"
```

---

## 11. MAPA: PARYTET PF vs PRZEWAGA MV-DESIGN-PRO

| Obszar | PowerFactory | MV-DESIGN-PRO | Status |
|--------|--------------|---------------|--------|
| **IEC 60909 SC** | ✓ Pełny | ✓ Pełny | PARYTET |
| **Power Flow** | ✓ Newton-Raphson | ✓ Newton-Raphson | PARYTET |
| **Ślad obliczeń** | ⚠️ Ograniczony | ✓ **White Box FULL** | **PRZEWAGA** |
| **Case Engine** | ✓ Study Cases | ✓ **Case Engine 2.0** | **PRZEWAGA** |
| | Single case workflow | Scenario Matrix, Batch, Diff | |
| **Proof/Audit** | ❌ Brak | ✓ **ProofGraph + Pack** | **PRZEWAGA** |
| **TCC/Protection** | ✓ Pełny | ✓ Pełny + **Explain Why** | **PRZEWAGA** |
| **Selektywność** | ✓ Graficzna | ✓ **Liczbowa + Graficzna** | **PRZEWAGA** |
| **SLD** | ✓ Edytor graficzny | ✓ **SLD wynikowy** | **PRZEWAGA** |
| | Rysunek | View z overlay'ami | |
| **Type Library** | ✓ Pełny | ✓ Pełny + **Provenance** | **PRZEWAGA** |
| | Parametry | Parametry + źródła + wersje | |
| **Porównanie runów** | ⚠️ Manual | ✓ **Auto Diff** | **PRZEWAGA** |
| **Determinizm** | ⚠️ Zależny od ustawień | ✓ **100% deterministyczny** | **PRZEWAGA** |
| **Audytowalność** | ⚠️ Ograniczona | ✓ **Pełna (CI-ready)** | **PRZEWAGA** |
| **Język** | EN/DE/... | **100% PL** | PARYTET* |

\* Parytet w sensie pełnej lokalizacji; przewaga dla użytkowników PL.

---

## 12. GLOSSARY (PL)

| Termin | Definicja |
|--------|-----------|
| **Case** | Konfiguracja obliczeń: snapshot + assumptions + solve set |
| **Run** | Pojedyncze wykonanie Case'a z wynikami |
| **Snapshot** | Zamrożony stan sieci w momencie obliczeń |
| **ProofPack** | Audytowalny pakiet z dowodem obliczeń |
| **ProofGraph** | Graf zależności w dowodzie matematycznym |
| **TCC** | Time-Current Characteristic (charakterystyka czasowo-prądowa) |
| **PCC** | Punkt wspólnego przyłączenia |
| **White Box** | Pełny ślad obliczeń (wszystkie wartości pośrednie) |
| **Scenario Matrix** | Siatka przypadków do automatycznego generowania |
| **Run Diff** | Porównanie dwóch runów z wyjaśnieniem różnic |

---

**Koniec dokumentu FULL_ARCHITECTURE_CANONICAL.md**
