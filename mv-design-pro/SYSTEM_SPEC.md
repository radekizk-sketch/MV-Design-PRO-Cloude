# MV-DESIGN-PRO — System Specification (Canonical)

**STATUS: CANONICAL & BINDING**
**Architecture Model: DIgSILENT PowerFactory (Conceptual Alignment)**

---

## 1. Purpose and Authority

This document is the **single source of truth** for architecture, terminology, and system boundaries in MV-DESIGN-PRO.
All other documentation, code, and implementation must align with this specification.

The system is architecturally aligned with **DIgSILENT PowerFactory** principles:
- One explicit Network Model
- Multiple Study Cases (calculation scenarios)
- No fictional entities in solvers
- No "intelligent" shortcuts
- No legal interpretations in physics
- All calculations must be **WHITE BOX** (auditable)

---

## 2. Core Architecture (PowerFactory Alignment)

### 2.1 Network Model (Singleton)

There is exactly **ONE NetworkModel** per project. The NetworkModel contains only physical electrical elements:

| Element | Description | Physics Impact |
|---------|-------------|----------------|
| **Bus** | Electrical node (single potential) | Yes - defines voltage level |
| **Line** | Overhead line (explicit branch) | Yes - R/X impedance |
| **Cable** | Underground cable (explicit branch) | Yes - R/X impedance + capacitance |
| **Transformer2W** | Two-winding transformer | Yes - impedance transformation |
| **Transformer3W** | Three-winding transformer | Yes - impedance transformation |
| **Switch/Breaker** | Switching device | **NO** - topology only (OPEN/CLOSE) |
| **Source** | External Grid / Generator | Yes - power injection |
| **Load** | Electrical load | Yes - power consumption |

**NOT in NetworkModel:**
- PCC (Point of Common Coupling) - this is an **interpretation**, not a physical element
- Boundary markers
- Legal/contractual boundaries
- Station containers (stations are logical groupings only)

### 2.2 Bus (Electrical Node)

A **Bus** is an electrical node with a single potential. In PowerFactory terminology:
- Node = Bus = single electrical potential
- Multiple equipment can connect to one Bus
- No physical dimensions (zero impedance)

```
Bus:
  id: UUID
  name: str
  voltage_level_kv: float
  node_type: SLACK | PQ | PV  # For power flow
```

### 2.3 Branch (Physical Connection)

Branches are physical connections with impedance:

```
LineBranch:
  id: UUID
  from_bus_id: UUID
  to_bus_id: UUID
  r_ohm_per_km: float
  x_ohm_per_km: float
  b_us_per_km: float
  length_km: float
  type_ref: UUID -> Catalog

TransformerBranch:
  id: UUID
  from_bus_id: UUID (HV side)
  to_bus_id: UUID (LV side)
  rated_power_mva: float
  uk_percent: float
  pk_kw: float
  type_ref: UUID -> Catalog
```

### 2.4 Switch/Breaker (Apparatus)

Switching apparatus has **NO impedance** and **NO physics impact**:
- Changes topology only (OPEN/CLOSE state)
- Does not affect power flow calculations directly
- Only affects which elements are connected

```
Switch:
  id: UUID
  from_bus_id: UUID
  to_bus_id: UUID
  state: OPEN | CLOSED
  switch_type: BREAKER | DISCONNECTOR | LOAD_SWITCH | FUSE
```

### 2.5 Station (Logical Container)

A **Station** is **NOT a physical object**:
- Purely logical grouping / folder
- No impact on solver
- Used for organization and reporting only

```
Station:
  id: UUID
  name: str
  elements: List[ElementRef]  # References to Buses, Branches, etc.
```

---

## 3. Study Case (Case) Architecture

### 3.1 Case Definition

**Case ≠ Model**

A Case is a calculation scenario that:
- **CANNOT mutate** the Network Model
- Stores **ONLY** calculation parameters
- References the Network Model (read-only)

### 3.2 Case Types

| Case Type | Purpose | Standard |
|-----------|---------|----------|
| **ShortCircuitCase** | Fault current calculations | IEC 60909 |
| **PowerFlowCase** | Load flow analysis | Newton-Raphson |
| **ProtectionCase** | Protection coordination | IEC 60255 (prospective) |

### 3.3 Case Immutability Rule

```
NetworkModel (MUTABLE by Wizard/SLD)
    │
    ├── ShortCircuitCase (READ-ONLY view of model)
    ├── PowerFlowCase (READ-ONLY view of model)
    └── ProtectionCase (READ-ONLY view of model)
```

**Invariant:** Multiple Cases can reference the same NetworkModel. No Case can modify the model.

---

## 4. Type Catalog (Library)

### 4.1 Catalog Definition

The **Catalog** is the single source of physical parameters:
- Types are **immutable** once created
- Types are **shared** across projects
- Instances store only: reference + local parameters (e.g., length)

### 4.2 Catalog Structure

```
Catalog:
  line_types: Dict[UUID, LineType]
  cable_types: Dict[UUID, CableType]
  transformer_types: Dict[UUID, TransformerType]
  switch_types: Dict[UUID, SwitchType]

LineType:
  id: UUID
  name: str
  r_ohm_per_km: float
  x_ohm_per_km: float
  b_us_per_km: float
  rated_current_a: float
  # Immutable parameters
```

### 4.3 Instance-Type Relationship

```
LineBranch (instance):
  type_ref: UUID -> Catalog.line_types
  length_km: float  # Local parameter only
  # All other parameters from type
```

---

## 5. Solver Layer (WHITE BOX)

### 5.1 Solver Definition

**Solver = pure physics + computational algorithm**
- **No interpretation** of results
- **No limits, violations, or normative assessment**
- **Full white-box trace** is required

### 5.2 White Box Requirements (MANDATORY)

All solvers MUST:
1. **Expose calculation steps** - every intermediate value accessible
2. **Provide intermediate values** - Y-bus matrix, impedances, currents
3. **Allow numerical audit** - manual recalculation possible
4. **Document assumptions** - no hidden corrections

**Result structure:**
```
SolverResult:
  input: SolverInput (frozen snapshot)
  intermediate:
    y_bus_matrix: ComplexMatrix
    z_thevenin: Dict[NodeId, Complex]
    # ... all intermediate values
  output:
    ikss_ka: Dict[NodeId, float]
    # ... final results
  white_box_trace: WhiteBoxTrace
```

### 5.3 Forbidden Practices

- Black-box solvers
- Hidden corrections
- Undocumented simplifications
- Implicit assumptions

### 5.4 Solver Types

| Solver | Layer | Physics |
|--------|-------|---------|
| IEC 60909 Short Circuit | `network_model.solvers` | Yes |
| Newton-Raphson Power Flow | `network_model.solvers` | Yes |

### 5.5 Result API (Frozen)

```python
@dataclass(frozen=True)
class ShortCircuitResult:
    ikss_ka: float
    ip_ka: float
    ith_ka: float
    white_box_trace: WhiteBoxTrace

    def to_dict(self) -> dict: ...
```

**FROZEN:** This API cannot be changed without major version bump.

---

## 6. Analysis Layer (Interpretation)

### 6.1 Analysis Definition

**Analysis = interpretation of solver results**
- Responsible for **violations, limits, scoring, normative criteria**
- **No physics**
- **No modification** of the model

### 6.2 Analysis vs Solver

| Aspect | Solver | Analysis |
|--------|--------|----------|
| Physics calculations | YES | NO |
| Limit checking | NO | YES |
| Normative assessment | NO | YES |
| Model modification | NO | NO |
| White-box trace | Required | N/A |

### 6.3 Analysis Types

| Analysis | Input | Output |
|----------|-------|--------|
| Protection Analysis | ShortCircuitResult | Violations, Coordination |
| Thermal Analysis | PowerFlowResult | Overload warnings |
| Voltage Analysis | PowerFlowResult | Voltage violations |

---

## 7. Validation Layer

### 7.1 NetworkValidator (PowerFactory-style)

Validation must run BEFORE any solver execution:

```python
class NetworkValidator:
    def validate(self, model: NetworkModel) -> ValidationReport:
        # 1. Graph connectivity
        # 2. No dangling elements
        # 3. Source presence
        # 4. Bus voltage level consistency
        # 5. Branch endpoint validity
```

### 7.2 Validation Rules

| Rule | Description | Blocking |
|------|-------------|----------|
| `network.connected` | Graph must be connected | Yes |
| `network.source_present` | At least one source | Yes |
| `network.no_dangling` | No dangling elements | Yes |
| `bus.voltage_valid` | Voltage > 0 | Yes |
| `branch.endpoints_exist` | Both endpoints exist | Yes |
| `transformer.hv_lv_different` | HV ≠ LV voltage | Yes |

### 7.3 Validation Flow

```
NetworkModel
    │
    ▼
NetworkValidator.validate()
    │
    ├── VALID → Solver execution allowed
    │
    └── INVALID → Solver execution BLOCKED
```

---

## 8. Wizard (Network Editor)

### 8.1 Wizard Definition

The **Wizard is NOT an editor of its own model**.
The Wizard is **ONLY**:
- Sequential controller for model access
- Guardian of validation and completeness
- UI navigation helper

### 8.2 Wizard Rules

- Each wizard step edits **ONE aspect** of the NetworkModel
- Wizard uses **the same objects** as SLD
- Wizard does **NOT create special entities**
- Wizard does **NOT hide elements**
- Wizard does **NOT aggregate physics**

### 8.3 Canonical Step Sequence

| Step | Aspect | Model Object |
|------|--------|--------------|
| 1 | Project / Study Case | Project |
| 2 | Type Library | Catalog |
| 3 | Buses (Nodes) | Bus |
| 4 | Lines / Cables | LineBranch |
| 5 | Transformers | TransformerBranch |
| 6 | Sources | Source |
| 7 | Switching Apparatus | Switch |
| 8 | Model Validation | NetworkValidator |
| 9 | Study Cases | ShortCircuitCase, PowerFlowCase |
| 10 | Results / Reports | Analysis |

---

## 9. SLD (Single Line Diagram)

### 9.1 SLD Definition

The **SLD is ONLY a visualization** of the NetworkModel:
- **NOT a separate model**
- **NOT storing logic**
- **NOT correcting topology**

### 9.2 SLD Rules

- Each SLD object = exactly one model object
- No helper objects
- No "logical symbols"
- No visual shortcuts without model equivalent

### 9.3 SLD ↔ Model Relationship

```
NetworkModel (single source of truth)
    │
    ├── Wizard (edit view)
    │
    └── SLD (visualization view)

Both views operate on THE SAME objects.
```

### 9.4 Edit Flow

```
Edit via Wizard → modifies NetworkModel → SLD reflects change
Edit via SLD → modifies NetworkModel → Wizard reflects change
```

### 9.5 Blocking Rules

| Condition | SLD State |
|-----------|-----------|
| No valid model | Read-only |
| Validation errors | Read-only |
| Valid model | Editable |

---

## 10. Outdated Results

### 10.1 Invalidation Rule

**Any change to NetworkModel invalidates ALL case results.**

```
NetworkModel.modify()
    │
    ▼
For each Case:
    Case.results = OUTDATED
```

### 10.2 Result Freshness

| State | Description |
|-------|-------------|
| FRESH | Results computed on current model snapshot |
| OUTDATED | Model changed since computation |
| NONE | Never computed |

---

## 11. Interpretation Layer

### 11.1 Definition

Protection, reports, assessments are a **LAYER ABOVE** results:
- NOT solvers
- NOT modifying physics
- Using solver results as input

### 11.2 Separation

```
Solver Layer (physics)
    │
    ▼
Analysis Layer (interpretation)
    │
    ▼
Reporting Layer (presentation)
```

---

## 12. Canonical Terminology

### 12.1 Binding Terms

| Term | Definition | PowerFactory Equivalent |
|------|------------|------------------------|
| Bus | Electrical node (single potential) | Terminal |
| Branch | Physical connection with impedance | Line/Cable/Trafo |
| Switch | Switching apparatus (no impedance) | Switch/Breaker |
| Station | Logical container (no physics) | Substation folder |
| Case | Calculation scenario | Study Case |
| Catalog | Type library | Type Library |

### 12.2 Forbidden Terms in Core Model

- PCC (belongs to interpretation layer)
- Connection Point (use Bus)
- Virtual Node (no virtual entities)
- Aggregated Element (no aggregation)

---

## 13. Invariants (Non-Negotiable)

1. **ExecPlan is the only change mechanism.** Update existing ExecPlan; do not create new ones.
2. **White-Box Trace is foundational.** All solvers must expose intermediate values.
3. **Result API IEC 60909 is frozen:** `ShortCircuitResult`, `to_dict()`, `white_box_trace`
4. **Separation:** `solver` ≠ `case` ≠ `analysis`
5. **Normative language:** IEC / PN-EN
6. **Single NetworkModel** per project
7. **Case cannot mutate model**
8. **Validation before computation**

---

## 14. File Structure (Canonical)

```
backend/src/
├── network_model/
│   ├── core/
│   │   ├── bus.py           # Bus (electrical node)
│   │   ├── branch.py        # Line, Cable, Transformer
│   │   ├── switch.py        # Switch, Breaker (apparatus)
│   │   ├── source.py        # External Grid, Generator
│   │   ├── load.py          # Electrical load
│   │   ├── graph.py         # NetworkGraph (topology)
│   │   └── snapshot.py      # Immutable snapshots
│   ├── catalog/
│   │   ├── types.py         # LineType, CableType, TransformerType
│   │   └── repository.py    # Catalog persistence
│   ├── validation/
│   │   └── validator.py     # NetworkValidator
│   ├── solvers/
│   │   ├── short_circuit_iec60909.py
│   │   └── power_flow_newton.py
│   └── whitebox/
│       └── tracer.py        # White-box trace utilities
├── cases/
│   ├── short_circuit_case.py
│   └── power_flow_case.py
├── analyses/
│   ├── protection/
│   ├── thermal/
│   └── voltage/
└── application/
    ├── wizard/              # Network Wizard (editor controller)
    └── sld/                 # SLD visualization
```

---

## 15. Compliance Checklist

### 15.1 PowerFactory Alignment

- [ ] Single NetworkModel per project
- [ ] Bus as electrical node (not "Node")
- [ ] Switch/Breaker has no R/X
- [ ] Station is logical only
- [ ] Case cannot mutate model
- [ ] Catalog as type library

### 15.2 White Box Compliance

- [ ] All solvers expose intermediate values
- [ ] Y-bus matrix accessible
- [ ] Thevenin impedances accessible
- [ ] Manual audit possible
- [ ] No hidden corrections

### 15.3 Wizard/SLD Unity

- [ ] Wizard edits NetworkModel directly
- [ ] SLD visualizes NetworkModel directly
- [ ] No separate data stores
- [ ] No PCC in NetworkModel
- [ ] No virtual entities

---

## 16. Risks / Ambiguities

| Risk | Status | Mitigation |
|------|--------|------------|
| Power Flow location vs. semantics | Known | Code is solver, location under analysis/ is documentation issue |
| PCC in current codebase | To refactor | Move PCC to interpretation layer |
| Node vs Bus terminology | To refactor | Rename to Bus in next iteration |

---

## 17. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01 | Initial specification |
| 2.0 | 2025-01 | PowerFactory alignment refactor |

---

## 18. User Interaction Model (PowerFactory-aligned)

### 18.1 Project Tree Structure (PF-style)

The user interaction model MUST mirror DIgSILENT PowerFactory's hierarchical project structure:

```
Project
├── NetworkModel (single, editable)
│   ├── Buses
│   ├── Lines / Cables
│   ├── Transformers
│   ├── Switches
│   ├── Sources
│   └── Loads
├── Study Cases
│   ├── ShortCircuitCase #1
│   ├── ShortCircuitCase #2
│   ├── PowerFlowCase #1
│   └── ...
├── Calculations (solver runs)
│   ├── ShortCircuitResult #1 → Case #1
│   └── PowerFlowResult #1 → Case #1
└── Results (analysis overlays)
    ├── ThermalAnalysis
    ├── VoltageAnalysis
    └── ProtectionAnalysis (prospective)
```

### 18.2 Operational Modes (MANDATORY)

The system MUST distinguish three operational modes, clearly visible to the user:

| Mode | Description | Editable | View |
|------|-------------|----------|------|
| **Edit Mode** | Direct modification of NetworkModel | YES | Network structure |
| **Study Case Mode** | Configuration of Case parameters | Case parameters ONLY | Case settings |
| **Result Mode** | Read-only inspection of results | NO | Results + overlays |

**Rules:**
- User MUST NOT be able to modify NetworkModel in Result Mode
- User MUST NOT be able to modify Case parameters in Edit Mode (separation of concerns)
- Mode switching MUST be explicit and visible (no implicit transitions)

### 18.3 Wizard Definition (PowerFactory Data Manager Equivalent)

**Wizard = PowerFactory Data Manager**

The Wizard is the sequential controller for NetworkModel creation and modification:

| PowerFactory Concept | MV-DESIGN-PRO Equivalent |
|---------------------|-------------------------|
| Data Manager | Wizard |
| Study Case | Case |
| Calculation | Solver Run |
| Results | Result + Analysis overlays |

**Wizard MUST:**
- Guide user through model creation in deterministic steps
- Operate ONLY on NetworkModel objects (no special entities)
- Enforce validation before solver execution
- Provide Property Grid interface for object editing

**Wizard MUST NOT:**
- Create virtual or helper objects
- Aggregate physics or calculations
- Hide elements from user view
- Provide "intelligent" shortcuts that bypass explicit steps

### 18.4 SLD Definition (Single Line Diagram)

**SLD = graphical view of NetworkModel ONLY**

| Rule | Description |
|------|-------------|
| 1:1 mapping | Each SLD symbol corresponds to exactly ONE NetworkModel object |
| No virtual elements | No helper lines, no logical symbols without model backing |
| No PCC symbol in model | PCC is displayed as overlay (interpretation layer) |
| Bidirectional sync | Edit via SLD → modifies NetworkModel → Wizard reflects change |

**SLD MUST:**
- Reflect NetworkModel state at all times
- Support double-click → Properties (Property Grid)
- Support context menu with PowerFactory-style actions
- Display element states (in_service, switch state)

**SLD MUST NOT:**
- Store topology or physics data
- Contain "smart" routing or auto-connection logic in model layer
- Display elements not present in NetworkModel

### 18.5 PCC (Point of Common Coupling) Rules

**PCC MUST NOT belong to NetworkModel.**

| Layer | PCC Handling |
|-------|--------------|
| NetworkModel | NO PCC field, no PCC object |
| Solver | NO PCC concept (pure physics) |
| Analysis (interpretation) | PCC identified via BoundaryIdentifier heuristics |
| SLD (display) | PCC shown as overlay/annotation ONLY |

**Rationale:** PCC is a contractual/interpretation concept, not a physical network element.

### 18.6 Property Grid (PowerFactory-style)

All object editing MUST use Property Grid pattern:

```
┌─────────────────────────────────────┐
│ Properties: Bus "Bus_001"           │
├─────────────────────────────────────┤
│ General                             │
│   Name:         [Bus_001        ]   │
│   Voltage (kV): [15.0           ]   │
│   Node Type:    [PQ       ▼     ]   │
├─────────────────────────────────────┤
│ Power Flow                          │
│   V magnitude:  [1.0   ] pu         │
│   V angle:      [0.0   ] rad        │
├─────────────────────────────────────┤
│ Short Circuit                       │
│   (derived from topology)           │
└─────────────────────────────────────┘
```

**Rules:**
- Double-click on Wizard list item → Property Grid
- Double-click on SLD symbol → Property Grid (same)
- All parameters visible, no hidden fields
- Read-only fields clearly marked

### 18.7 Invariants (Non-Negotiable)

1. **ONE NetworkModel** per project — no parallel data stores
2. **Wizard and SLD operate on the SAME NetworkModel** — no synchronization issues
3. **Case CANNOT mutate NetworkModel** — read-only view only
4. **PCC NOT in NetworkModel** — interpretation layer only
5. **No virtual elements** — every SLD symbol = model object
6. **Explicit mode transitions** — user always knows current mode
7. **Property Grid for all edits** — no hidden modification paths

---

**END OF CANONICAL SPECIFICATION**
