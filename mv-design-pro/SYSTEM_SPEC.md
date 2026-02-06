# MV-DESIGN-PRO System Specification

**Version:** 3.0
**Status:** CANONICAL & BINDING
**Architecture Model:** DIgSILENT PowerFactory (Conceptual Alignment)

This document is the **single source of truth** for architecture, terminology, system boundaries, and function status in MV-DESIGN-PRO.

---

## 1. Architectural Principles

The system is aligned with DIgSILENT PowerFactory:
- One explicit NetworkModel per project (singleton)
- Multiple Study Cases (calculation scenarios)
- No fictional entities in solvers
- All calculations WHITE BOX (auditable)
- Strict layer separation: Solver / Analysis / Application / Presentation

---

## 2. Network Model (Singleton)

There is exactly ONE NetworkModel per project. It contains only physical electrical elements.

### 2.1 Core Elements

| Element | Description | Physics Impact |
|---------|-------------|----------------|
| **Bus** | Electrical node (single potential) | Yes - voltage level |
| **Line** | Overhead line (explicit branch) | Yes - R/X impedance |
| **Cable** | Underground cable (explicit branch) | Yes - R/X + capacitance |
| **Transformer2W** | Two-winding transformer | Yes - impedance transformation |
| **Transformer3W** | Three-winding transformer | Yes - impedance transformation |
| **Switch/Breaker** | Switching device | NO - topology only (OPEN/CLOSE) |
| **Source** | External Grid / Generator / Inverter | Yes - power injection |
| **Load** | Electrical load | Yes - power consumption |

### 2.2 NOT in NetworkModel

- PCC (Point of Common Coupling) - interpretation, not physics
- Boundary markers - belong to Analysis layer
- Legal/contractual boundaries
- Station containers store no physics (logical grouping only)

### 2.3 Element Specifications

```
Bus:
  id: UUID, name: str, voltage_level_kv: float
  node_type: SLACK | PQ | PV
  voltage_magnitude_pu: float, voltage_angle_rad: float
  active_power_mw: float, reactive_power_mvar: float

LineBranch:
  id: UUID, from_bus_id: UUID, to_bus_id: UUID
  type_ref: UUID -> Catalog, length_km: float
  r_ohm_per_km: float, x_ohm_per_km: float, b_us_per_km: float
  rated_current_a: float, in_service: bool

TransformerBranch:
  id: UUID, from_bus_id: UUID (HV), to_bus_id: UUID (LV)
  type_ref: UUID -> Catalog
  rated_power_mva: float, voltage_hv_kv: float, voltage_lv_kv: float
  uk_percent: float, pk_kw: float
  tap_position: int, tap_step_percent: float, in_service: bool

Switch:
  id: UUID, from_bus_id: UUID, to_bus_id: UUID
  switch_type: BREAKER | DISCONNECTOR | LOAD_SWITCH | FUSE
  state: OPEN | CLOSED (NO impedance)

Source:
  id: UUID, bus_id: UUID
  source_type: EXTERNAL_GRID | GENERATOR | INVERTER
  p_mw: float, q_mvar: float, u_pu: float
  sk_mva: float, rx_ratio: float, in_service: bool

Load:
  id: UUID, bus_id: UUID
  p_mw: float, q_mvar: float, in_service: bool

Station:
  id: UUID, name: str, elements: List[ElementRef]
  (logical container only, NO physics)
```

### 2.4 NetworkGraph

- Uses NetworkX MultiGraph internally for topology
- `get_effective_topology()` considers switch states
- `find_islands()` identifies connected components
- Immutable snapshots via `NetworkSnapshot` (frozen dataclass)

---

## 3. Type Catalog (Library)

### 3.1 Principles

- Types are **immutable** once created
- Types are **shared** across projects
- Instances store only: reference + local parameters (e.g., length)
- Catalog manages PASSIVE elements only (Line, Cable, Transformer, Switch types)
- Source, Load, Protection parameters are Case-dependent, NOT cataloged

### 3.2 Parameter Precedence

| Equipment | Precedence |
|-----------|-----------|
| Line/Cable | impedance_override > type_ref > instance |
| Transformer | type_ref > instance |
| Switch | type_ref > instance (metadata only) |

- Centralized resolver: `network_model.catalog.resolver`
- `type_ref` not found in catalog = `TypeNotFoundError` (no silent fallback)

---

## 4. Study Case Architecture

### 4.1 Case Definition

**Case != Model.** A Case is a calculation scenario that:
- CANNOT mutate the NetworkModel
- Stores ONLY calculation parameters
- References the NetworkModel (read-only)

### 4.2 Case Types

| Case Type | Purpose | Standard |
|-----------|---------|----------|
| StudyCase | Generic calculation scenario | - |
| ShortCircuitCase | Fault current calculations | IEC 60909 |
| PowerFlowCase | Load flow analysis | Newton-Raphson |
| ProtectionCase | Protection coordination | IEC 60255 (prospective) |

### 4.3 Active Case Invariant

Exactly ONE StudyCase can be active per project at any time.

### 4.4 Result Status Lifecycle

```
NONE ──> FRESH (after successful calculation)
FRESH ──> OUTDATED (after model or config change)
OUTDATED ──> FRESH (after re-calculation)
```

### 4.5 Invalidation Rules

| Event | Effect |
|-------|--------|
| NetworkModel change | ALL cases marked OUTDATED |
| Case config change | ONLY that case marked OUTDATED |
| Successful calculation | Case marked FRESH |
| Case clone | New case has NONE status (no results copied) |

---

## 5. Solver Layer (WHITE BOX)

### 5.1 Definition

Solver = pure physics + computational algorithm. No interpretation, no limits, no normative assessment. Full white-box trace required.

### 5.2 Implemented Solvers

| Solver | Location | Status |
|--------|----------|--------|
| IEC 60909 Short Circuit | `network_model.solvers.short_circuit_iec60909` | STABLE |
| Newton-Raphson Power Flow | `network_model.solvers.power_flow_newton` | STABLE |
| Gauss-Seidel Power Flow | `network_model.solvers.power_flow_gauss_seidel` | STABLE |
| Fast Decoupled Power Flow | `network_model.solvers.power_flow_fast_decoupled` | STABLE |

### 5.3 White Box Requirements (MANDATORY)

All solvers MUST:
1. Expose calculation steps (Y-bus, Z-thevenin, Jacobian, iterations)
2. Provide all intermediate values
3. Allow manual numerical audit
4. Document assumptions explicitly

### 5.4 Frozen Result API

```python
@dataclass(frozen=True)
class ShortCircuitResult:
    ikss_ka: float    # Initial symmetrical short-circuit current
    ip_ka: float      # Peak short-circuit current
    ith_ka: float     # Thermal equivalent current
    white_box_trace: WhiteBoxTrace

@dataclass(frozen=True)
class PowerFlowResult:
    bus_voltages: Dict[UUID, BusVoltage]
    branch_flows: Dict[UUID, BranchFlow]
    losses: LossResult
    white_box_trace: WhiteBoxTrace
```

FROZEN: These APIs cannot change without major version bump.

### 5.5 Forbidden Practices

- Black-box solvers
- Hidden corrections
- Undocumented simplifications
- Implicit assumptions

---

## 6. Analysis / Interpretation Layer

### 6.1 Definition

Analysis = interpretation of solver results. No physics. No model modification.

### 6.1a Normative Completion Reference

Wiążące mapowanie IEC 60909-0:2016 (§4.1–§4.8) dla asymetrycznych zwarć i pakietu dowodowego jest utrzymywane w `docs/proof/NORMATIVE_COMPLETION_PACK_IEC_60909.md`.

### 6.2 Implemented Analyses

| Analysis | Input | Output | Status |
|----------|-------|--------|--------|
| Protection Analysis | SC results | Coordination, settings | STABLE |
| Protection Coordination | SC results, device params | Selectivity check | STABLE |
| Protection Curves I-t | Device params | Time-current curves | STABLE |
| Voltage Analysis | PF results | Voltage violations | STABLE |
| Voltage Profile | PF results | Bus voltage profiles | STABLE |
| Thermal/Overload Analysis | PF results | Branch overload warnings | STABLE |
| Boundary Identifier (PCC) | Network topology | PCC bus identification | STABLE |
| Normative Evaluator | All results | PN-EN compliance | STABLE |
| Coverage Score | All results | Completeness assessment | STABLE |
| LF Sensitivity | PF results | Sensitivity analysis | STABLE |
| Scenario Comparison | Multiple cases | Delta analysis | STABLE |
| Auto Recommendations | All results | Improvement suggestions | STABLE |

---

## 7. Proof Engine

### 7.1 Position in Architecture

```
SOLVER (frozen) ──> WhiteBoxTrace + SolverResult (READ-ONLY)
                          │
                    PROOF ENGINE (interpretation)
                          │
                    TraceArtifact ──> ProofDocument ──> Export (JSON/LaTeX/PDF/DOCX)
```

### 7.2 Invariants (BINDING)

| Invariant | Description |
|-----------|-------------|
| Solver untouched | Proof Engine does NOT modify solvers or Result API |
| Determinism | Same run_id = identical proof.json and proof.tex |
| Pure interpretation | Proofs generated from existing trace/result data |
| Step completeness | Each step: Formula > Data > Substitution > Result > Unit Check |
| Traceability | Every value has mapping key to source in trace/result |
| LaTeX-only math | Block `$$...$$` only, no inline `$...$` |
| I_dyn mandatory | Dynamic current required in every SC3F proof |
| I_th mandatory | Thermal equivalent current required in every SC3F proof |

### 7.3 Implemented Proof Packs

| Pack | Content | Status |
|------|---------|--------|
| SC3F (IEC 60909) | Three-phase short circuit proof | STABLE |
| VDROP | Voltage drop proof | STABLE |
| Equipment Proof | Equipment thermal/dynamic withstand | STABLE |
| Power Flow | Load flow audit proof | STABLE |
| Losses & Energy | Power losses proof | STABLE |
| Protection Overcurrent | Protection settings proof | STABLE |
| Earthing/Ground Fault | Ground fault proof (MV) | STABLE |
| Load Flow Voltage | LF voltage profile proof | STABLE |

### 7.4 Planned Proof Packs

| Pack | Content | Status |
|------|---------|--------|
| SC Asymmetrical (1F, 2F) | Asymmetrical fault proofs | PLANNED |
| Regulation Q(U) | Reactive power regulation proof | PLANNED |
| Normative Completion (P20) | Full normative compliance proof | PLANNED |

### 7.5 Equation Registries

| Registry | Content | Location |
|----------|---------|----------|
| SC3F | EQ_SC3F_001..010 | `docs/proof_engine/EQUATIONS_IEC60909_SC3F.md` |
| VDROP | EQ_VDROP_001..009 | `docs/proof_engine/EQUATIONS_VDROP.md` |

---

## 8. Validation Layer

NetworkValidator runs BEFORE any solver execution:

| Rule | Description | Blocking |
|------|-------------|----------|
| network.connected | Graph must be connected | Yes |
| network.source_present | At least one source | Yes |
| network.no_dangling | No dangling elements | Yes |
| bus.voltage_valid | Voltage > 0 | Yes |
| branch.endpoints_exist | Both endpoints exist | Yes |
| transformer.hv_lv_different | HV != LV voltage | Yes |

---

## 9. Application Layer

### 9.1 Wizard (Network Editor)

- Sequential controller for NetworkModel access
- Operates DIRECTLY on NetworkModel (no separate data store)
- Steps: Project > Catalog > Buses > Lines > Transformers > Sources > Switches > Validate > Cases > Results

### 9.2 SLD (Single Line Diagram)

- ONLY a visualization of the NetworkModel
- 1:1 mapping: one SLD symbol = one model object
- Auto-layout engine with 5-phase pipeline
- Result overlays (SC, PF, Protection)
- Export: PNG, PDF, SVG
- CAD geometry overrides (AUTO / CAD / HYBRID modes)

### 9.3 Wizard/SLD Unity

Both Wizard and SLD edit THE SAME NetworkModel instance. No state duplication, no auxiliary models, no pending-changes buffers.

---

## 10. User Interaction Model

### 10.1 Work Modes

| Mode | Purpose | Model State | Results State |
|------|---------|-------------|---------------|
| Edit Mode | Modify NetworkModel | MUTABLE | N/A (invalidated) |
| Study Case Mode | Configure Case params | READ-ONLY | CONFIGURABLE |
| Result Mode | View calculation results | READ-ONLY | READ-ONLY + Overlays |

### 10.2 PowerFactory Component Mapping

| PowerFactory | MV-DESIGN-PRO | Description |
|-------------|---------------|-------------|
| Data Manager | Wizard | Sequential element entry |
| Study Case | Case | Calculation scenario |
| Calculation Command | Solver Run | Explicit invocation |
| Result Browser | Results Browser | View solver output |
| Type Library | Catalog | Immutable type defs |
| Graphic (SLD) | SLD | Topological diagram |
| Element Properties | Property Grid / Inspector | Field editor |
| Check Network | NetworkValidator | Pre-solver validation |

---

## 11. Canonical Terminology

### 11.1 Binding Terms

| Term | Definition | PowerFactory Equivalent |
|------|------------|------------------------|
| Bus | Electrical node (single potential) | Terminal |
| Branch | Physical connection with impedance | Line/Cable/Trafo |
| Switch | Switching apparatus (no impedance) | Switch/Breaker |
| Station | Logical container (no physics) | Substation folder |
| Case | Calculation scenario | Study Case |
| Catalog | Type library | Type Library |

### 11.2 Forbidden Terms in Core Model

- PCC (belongs to interpretation layer)
- Connection Point (use Bus)
- Virtual Node (no virtual entities)
- Aggregated Element (no aggregation)

---

## 12. Function Map

### 12.1 STABLE (implemented and tested)

| Function | Module | Tests |
|----------|--------|-------|
| Network Model (Bus, Branch, Switch, Source, Load) | `network_model.core` | Yes |
| NetworkGraph (topology, islands) | `network_model.core.graph` | Yes |
| Network Snapshot (immutable) | `network_model.core.snapshot` | Yes |
| IEC 60909 Short Circuit Solver | `network_model.solvers` | Yes |
| Newton-Raphson Power Flow | `network_model.solvers` | Yes |
| Gauss-Seidel Power Flow | `network_model.solvers` | Yes |
| Fast Decoupled Power Flow | `network_model.solvers` | Yes |
| Y-bus Matrix Builder | `network_model.solvers` | Yes |
| White Box Trace | `network_model.whitebox` | Yes |
| Type Catalog (Line, Cable, Trafo types) | `network_model.catalog` | Yes |
| Catalog Resolver (parameter precedence) | `network_model.catalog.resolver` | Yes |
| Study Case Lifecycle (NONE/FRESH/OUTDATED) | `application.study_case` | Yes |
| Active Case Management | `application.active_case` | Yes |
| Network Wizard Service | `application.network_wizard` | Yes |
| Wizard Actions & Runtime | `application.wizard_actions/runtime` | Yes |
| SLD Projection | `application.sld` | Yes |
| SLD Auto-Layout (5-phase pipeline) | Frontend engine | Yes |
| Proof Engine (SC3F, VDROP, Equipment) | `proof_engine` | Yes |
| Proof Pack Publication | `proof_engine` | Yes |
| Protection Analysis (overcurrent, coordination) | `application.analyses.protection` | Yes |
| Protection Library (vendor curves, IDMT) | `application.analyses.protection.catalog` | Yes |
| Voltage Analysis / Profile | `analysis.voltage` | Yes |
| Normative Evaluator | `analysis.normative` | Yes |
| Coverage Score | `analysis.coverage_score` | Yes |
| LF Sensitivity | `analysis.lf_sensitivity` | Yes |
| Scenario Comparison | `analysis.scenario_comparison` | Yes |
| Auto Recommendations | `analysis.recommendations` | Yes |
| Boundary Identifier (PCC) | `analysis.boundary` | Yes |
| Analysis Run Service (unified pipeline) | `application.analysis_run` | Yes |
| Design Synthesis (connection study) | `application.analyses.design_synth` | Yes |
| Project Archive (import/export ZIP) | `application.project_archive` | Yes |
| PDF/DOCX Report Generation | `analysis.pdf_report` | Yes |
| Power Flow Comparison | `analysis.power_flow` | Yes |
| Reference Patterns | `application.reference_patterns` | Yes |
| API Layer (FastAPI endpoints) | `api` | Yes |
| Frontend SLD Editor + Symbols | `ui/sld` | Yes |
| Frontend Results Browser | `ui/results-browser` | Yes |
| Frontend Case Manager | `ui/case-manager` | Yes |
| Frontend Proof Inspector | `proof-inspector` | Yes |
| Frontend Protection Diagnostics | `ui/protection-diagnostics` | Yes |
| Frontend Voltage Profile | `ui/voltage-profile` | Yes |
| Frontend Power Flow Results | `ui/power-flow-results` | Yes |
| Frontend Protection Curves | `ui/protection-curves` | Yes |
| Frontend Designer / Wizard | `designer` | Yes |
| Frontend Context Menu | `ui/context-menu` | Yes |
| Frontend Issue Panel | `ui/issue-panel` | Yes |
| Frontend Status Bar | `ui/status-bar` | Yes |
| Frontend SLD Export (PNG/PDF) | `ui/sld/export` | Yes |

### 12.2 COMPLETED (formerly IN PROGRESS)

| Function | Status | Notes |
|----------|--------|-------|
| NetworkValidator (full PowerFactory-grade) | DONE | 13 rules, suggested_fix, Polish messages, switch/inverter/impedance/polarity/voltage checks. 29 tests. |
| Bus terminology rename (Node -> Bus) | DONE | DTOs, API, frontend types renamed with backward-compat aliases. Zero regressions. |
| Phase 6: Wizard/SLD Unity verification | DONE | 27 backend + 23 frontend formal verification tests. Single model, round-trip, determinism confirmed. |

### 12.3 PLANNED

| Function | Priority |
|----------|----------|
| SC Asymmetrical Proofs (1F, 2F) | HIGH |
| Regulation Q(U) Proofs | MEDIUM |
| Normative Completion Pack (P20) | HIGH |
| XLSX Network Importer | LOW |
| Cloud Backup Integration | LOW |
| Incremental Archive Export | LOW |

---

## 13. Immutable Invariants

1. WHITE BOX Trace is foundational. All solvers expose intermediate values.
2. Result API IEC 60909 is FROZEN: `ShortCircuitResult`, `to_dict()`, `white_box_trace`.
3. Separation: solver != case != analysis.
4. Normative language: IEC / PN-EN.
5. Single NetworkModel per project.
6. Case cannot mutate model.
7. Validation before computation.
8. Determinism: same input = same output.
9. PCC is NOT in NetworkModel.
10. No project codenames in UI-visible strings.

---

## 14. Reference Documents

| Category | Location |
|----------|----------|
| UI Contracts | `docs/ui/*.md` |
| Proof Engine Specs | `docs/proof_engine/*.md` |
| Architecture Decision Records | `docs/adr/ADR-*.md` |
| Protection Specs | `docs/protection/*.md` |
| Analysis Specs | `docs/analysis/*.md` |
| Historical ExecPlans (archive) | `docs/audit/historical_execplans/` |

---

**END OF SYSTEM SPECIFICATION**
