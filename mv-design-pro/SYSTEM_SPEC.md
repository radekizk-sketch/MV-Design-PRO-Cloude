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
- Stores **ONLY** calculation parameters (configuration)
- References the Network Model (read-only)

### 3.2 Case Types

| Case Type | Purpose | Standard |
|-----------|---------|----------|
| **StudyCase** | Generic calculation scenario | P10 FULL MAX |
| **ShortCircuitCase** | Fault current calculations | IEC 60909 |
| **PowerFlowCase** | Load flow analysis | Newton-Raphson |
| **ProtectionCase** | Protection coordination | IEC 60255 (prospective) |

### 3.3 Case Immutability Rule

```
NetworkModel (MUTABLE by Wizard/SLD)
    │
    ├── StudyCase (config-only, P10 FULL MAX)
    ├── ShortCircuitCase (READ-ONLY view of model)
    ├── PowerFlowCase (READ-ONLY view of model)
    └── ProtectionCase (READ-ONLY view of model)
```

**Invariant:** Multiple Cases can reference the same NetworkModel. No Case can modify the model.

### 3.4 Study Case Lifecycle (P10 FULL MAX)

#### 3.4.1 Active Case Invariant

**BINDING:** Exactly ONE StudyCase can be active per project at any time.

| Operation | Effect |
|-----------|--------|
| Activate case A | All other cases deactivated, A becomes active |
| Create new case | New case is NOT active (unless explicitly set) |
| Clone case | Cloned case is NOT active |
| Delete active case | No active case until user selects another |

#### 3.4.2 Result Status Lifecycle

```
StudyCase.result_status:

NONE ─────────────► FRESH (after successful calculation)
  │                    │
  │                    │
  │                    ▼
  │               OUTDATED (after model or config change)
  │                    │
  └────────────────────┘ (re-calculation)
```

| Status | Description |
|--------|-------------|
| **NONE** | Never computed, no results |
| **FRESH** | Results computed on current model snapshot |
| **OUTDATED** | Model or config changed since last computation |

#### 3.4.3 Invalidation Rules (PowerFactory-grade)

| Event | Effect |
|-------|--------|
| NetworkModel change | ALL cases marked OUTDATED |
| Case config change | ONLY that case marked OUTDATED |
| Successful calculation | Case marked FRESH |
| Case clone | New case has NONE status (no results copied) |

#### 3.4.4 Clone vs Copy

**Clone** (PowerFactory-style):
- Configuration is COPIED
- Results are NOT copied
- Status = NONE
- is_active = False

```python
cloned = source_case.clone(new_name="Case (kopia)")
# cloned.config == source_case.config (copy)
# cloned.result_status == NONE
# cloned.result_refs == () (empty)
# cloned.is_active == False
```

#### 3.4.5 Compare Operation

Compare is a **100% read-only** operation:
- No mutations allowed
- Shows configuration differences between two cases
- Available in ALL operating modes

```python
comparison = compare_study_cases(case_a, case_b)
# comparison.case_a_name, comparison.case_b_name
# comparison.config_differences: List[ConfigDifference]
```

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

### 4.4 Parameter Precedence Rules

**Canonical precedence** for parameter resolution (PowerFactory-grade):

| Equipment | Precedence Rule |
|-----------|----------------|
| **Line/Cable** | `impedance_override > type_ref > instance` |
| **Transformer** | `type_ref > instance` |
| **Switch** | `type_ref > instance` (metadata only) |

**Backward Compatibility:**
- Models without `type_ref` use instance parameters (no migration required)
- Legacy behavior preserved: no numeric changes for existing models

**Validation:**
- `type_ref` specified but not found in catalog → `TypeNotFoundError`
- Ensures data integrity without silent fallbacks

**Implementation:**
- Centralized resolver: `network_model.catalog.resolver`
- Deterministic resolution across all equipment types
- Transparent source tracking via `ParameterSource` enum

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

This section defines the canonical user interaction model, fully aligned with DIgSILENT PowerFactory philosophy.

### 18.1 Model pracy użytkownika (User Workflow Model)

#### 18.1.1 Project Tree (PF-style)

The user MUST interact with the system through a hierarchical project tree structure:

```
Project
  └── NetworkModel (singleton)
        ├── Study Cases
        │     ├── ShortCircuitCase
        │     ├── PowerFlowCase
        │     └── ProtectionCase (prospective)
        ├── Calculations (solver runs)
        └── Results (per Case)
```

**Invariant:** There is exactly ONE NetworkModel per Project. All Study Cases reference this single model.

#### 18.1.2 Explicit Work Modes

The system MUST expose three distinct work modes:

| Mode | Purpose | Model State | Results State |
|------|---------|-------------|---------------|
| **Edit Mode** | Modify NetworkModel | MUTABLE | N/A (results invalidated) |
| **Study Case Mode** | Configure Case parameters | READ-ONLY (model) | CONFIGURABLE |
| **Result Mode** | View calculation results | READ-ONLY | READ-ONLY + Overlays |

**Rules:**
- The user MUST NOT modify NetworkModel while in Result Mode
- Switching from Edit Mode MUST invalidate all existing results
- Study Case Mode MUST NOT allow model mutations

### 18.2 Role komponentów (Component Roles)

#### 18.2.1 Wizard = PowerFactory Data Manager

The Wizard serves as the equivalent of PowerFactory's Data Manager:

| Wizard Function | PowerFactory Equivalent |
|-----------------|------------------------|
| Sequential element entry | Data Manager forms |
| Property editing | Element Properties dialog |
| Type selection | Type Library browser |
| Validation feedback | Check Network function |

**Rules:**
- Wizard MUST operate directly on NetworkModel
- Wizard MUST NOT maintain separate data store
- Wizard MUST NOT interpret physics or results
- Wizard MUST NOT contain PCC logic

#### 18.2.2 SLD = Graphical View of NetworkModel

The SLD (Single Line Diagram) is EXCLUSIVELY a visualization layer:

| SLD Function | PowerFactory Equivalent |
|--------------|------------------------|
| Symbol display | Graphic element |
| Position/layout | Graphic coordinates |
| Result overlay | Result display layer |
| Element selection | Object selection |

**Rules:**
- SLD MUST have 1:1 mapping: one symbol per one model object
- SLD MUST NOT contain virtual elements
- SLD MUST NOT store physics or calculation data
- SLD MUST NOT interpret results (interpretation belongs to Analysis layer)

#### 18.2.3 Calculation = Explicit Solver Invocation

Calculations MUST be explicitly triggered by the user:

**Rules:**
- Calculation MUST NOT run automatically on model change
- User MUST explicitly click "Calculate" to invoke solver
- Solver MUST reject invalid models (blocked by NetworkValidator)

#### 18.2.4 Analysis = Result Interpretation Layer

Analysis provides interpretation of solver results:

| Analysis Function | Output |
|-------------------|--------|
| Limit checking | Violations (thermal, voltage) |
| PCC identification | Boundary markers (overlays) |
| Protection coordination | Coordination curves |
| Compliance assessment | Normative status |

**Rules:**
- Analysis MUST NOT contain physics calculations
- Analysis MUST NOT modify NetworkModel
- PCC MUST be identified in Analysis layer ONLY (never in NetworkModel)

### 18.3 Reguły twarde (Hard Rules)

#### 18.3.1 Bijection: SLD ↔ NetworkModel

**MUST:** Each SLD symbol corresponds to exactly one NetworkModel object.

```
SLD Symbol          NetworkModel Object
───────────         ───────────────────
BusSymbol      ↔    Bus
LineSymbol     ↔    LineBranch
TrafoSymbol    ↔    TransformerBranch
SwitchSymbol   ↔    Switch
SourceSymbol   ↔    Source
LoadSymbol     ↔    Load
```

**MUST NOT:**
- Create SLD symbols without model object
- Create model objects invisible in SLD
- Create "helper" or "auxiliary" symbols
- Create "virtual nodes" or "aggregated symbols"

#### 18.3.2 No Virtual Elements

**MUST NOT** exist in NetworkModel:
- Virtual nodes
- Aggregated elements
- Helper objects
- Boundary markers (use Analysis layer)
- PCC markers (use Analysis layer)

#### 18.3.3 No Logic/Physics in UI

**MUST NOT** be performed by UI (Wizard/SLD):
- Impedance calculations
- Power flow calculations
- Short circuit calculations
- Result interpretation
- Limit checking
- PCC identification

**MUST** be delegated to:
- Solver layer (physics)
- Analysis layer (interpretation)

#### 18.3.4 PCC Exclusively in Analysis Layer

**BINDING:** PCC (Point of Common Coupling / punkt wspólnego przyłączenia) MUST NOT appear in NetworkModel.

| Layer | PCC Status |
|-------|------------|
| NetworkModel | FORBIDDEN |
| Wizard | FORBIDDEN (hint only in settings) |
| SLD | FORBIDDEN (overlay only from Analysis) |
| Analysis | ALLOWED (BoundaryIdentifier) |
| Export/Import | ALLOWED (as hint, not model data) |

---

## 19. Proof Pack / Mathematical Proof Engine (P11)

### 19.1 Pozycja w architekturze

```
┌─────────────────────────────────────────────────────────────┐
│                      SOLVER LAYER                            │
│  - IEC 60909 Short Circuit (FROZEN)                          │
│  - Newton-Raphson Power Flow (FROZEN)                        │
│  - WhiteBoxTrace (intermediate values)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │ trace + result (READ-ONLY)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 INTERPRETATION LAYER                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           PROOF ENGINE (P11)                         │    │
│  │  - TraceArtifact (immutable)                         │    │
│  │  - ProofDocument generator                           │    │
│  │  - Equation Registry (SC3F, VDROP)                   │    │
│  │  - Unit verification                                 │    │
│  │  - Export: JSON, LaTeX, PDF, DOCX                    │    │
│  └─────────────────────────────────────────────────────┘    │
│  - BoundaryIdentifier (PCC)                                  │
│  - Thermal Analysis                                          │
│  - Voltage Analysis                                          │
└─────────────────────────────────────────────────────────────┘
```

### 19.2 Kontrakty wejścia/wyjścia (BINDING)

#### 19.2.1 Wejście

| Źródło | Typ | Opis |
|--------|-----|------|
| `WhiteBoxTrace` | READ-ONLY | Wartości pośrednie z solvera |
| `SolverResult` | READ-ONLY | Wyniki końcowe (ikss_ka, ip_ka, ...) |
| `NetworkSnapshot` | READ-ONLY | Zamrożony stan sieci |
| `SolverConfig` | READ-ONLY | Parametry uruchomienia (c_factor, fault_type, ...) |

#### 19.2.2 Wyjście

| Artefakt | Format | Opis |
|----------|--------|------|
| `TraceArtifact` | frozen dataclass | Pełny ślad obliczeń |
| `ProofDocument` | JSON + LaTeX | Formalny dowód matematyczny |
| `proof.json` | JSON | Serializacja dowodu |
| `proof.tex` | LaTeX | Kod źródłowy dokumentu |
| `proof.pdf` | PDF | Dokument do wydruku |

### 19.3 Inwarianty (BINDING)

| Inwariant | Opis |
|-----------|------|
| **Solver nietknięty** | Proof Engine NIE modyfikuje solverów ani Result API |
| **Determinism** | Ten sam `run_id` → identyczny `proof.json` i `proof.tex` |
| **Czysta interpretacja** | Dowód generowany z gotowych danych trace/result |
| **Kompletność kroku** | Każdy krok ma: Wzór → Dane → Podstawienie → Wynik → Weryfikacja jednostek |
| **Traceability** | Każda wartość ma mapping key do źródła w trace/result |
| **LaTeX-only proof** | Proof Pack odrzuca „pół-matematykę"; dowód TYLKO w blokowym LaTeX `$$...$$` |
| **I_dyn mandatory** | Prąd dynamiczny jest OBOWIĄZKOWY w każdym dowodzie SC3F |
| **I_th mandatory** | Prąd cieplny równoważny jest OBOWIĄZKOWY w każdym dowodzie SC3F |

### 19.4 Terminologia UI (BINDING)

| Termin polski | Termin angielski | Lokalizacja UI |
|---------------|------------------|----------------|
| Ślad obliczeń | Trace | Results → [Case] → [Run] → Ślad obliczeń |
| Dowód matematyczny | Mathematical Proof | Results → [Case] → [Run] → Dowód matematyczny |
| Weryfikacja jednostek | Unit Check | Sekcja w każdym kroku dowodu |
| Krok dowodu | Proof Step | Element listy w Proof Inspector |

### 19.5 Kanoniczne źródła (docs/proof_engine/)

| Dokument | Zawartość | Status |
|----------|-----------|--------|
| `PROOF_SCHEMAS.md` | Schematy JSON (ProofDocument, ProofStep) | BINDING |
| `EQUATIONS_IEC60909_SC3F.md` | Rejestr równań SC3F z mapping keys | BINDING |
| `EQUATIONS_VDROP.md` | Rejestr równań VDROP z mapping keys | BINDING |
| `P11_1a_MVP_SC3F_AND_VDROP.md` | Specyfikacja MVP | BINDING |
| `P11_OVERVIEW.md` | Definicja TraceArtifact, inwarianty | BINDING |

---

**END OF CANONICAL SPECIFICATION**
