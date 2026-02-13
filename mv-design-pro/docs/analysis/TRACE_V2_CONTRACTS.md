# TRACE v2 — Contracts

**Status**: BINDING (RUN #2B)

---

## 1. TraceArtifactV2 Schema

```python
@dataclass(frozen=True)
class TraceArtifactV2:
    trace_id: str                              # stable UUID
    analysis_type: str                         # SC | PROTECTION | LOAD_FLOW
    math_spec_version: str                     # semver e.g. "1.0.0"
    snapshot_hash: str                         # SHA-256 of NetworkSnapshot
    run_hash: str                              # SHA-256(snapshot_hash + input + math_spec_version)
    inputs: dict[str, TraceValue]              # sorted by key
    equation_steps: tuple[TraceEquationStep, ...]  # sorted by step_id
    outputs: dict[str, TraceValue]             # sorted by key
    trace_signature: str                       # SHA-256(canonical JSON of this artifact)
```

## 2. TraceValue Schema

```python
@dataclass(frozen=True)
class TraceValue:
    name: str           # variable name
    value: float | str  # numerical or symbolic value
    unit: str           # SI unit or "—"
    label_pl: str       # Polish label for UI
```

## 3. TraceEquationStep Schema

```python
@dataclass(frozen=True)
class TraceEquationStep:
    step_id: str                              # stable, semantic e.g. "SC_ZK_001"
    subject_id: str                           # element/node ID this step relates to
    eq_id: str                                # from EquationRegistryV2
    label_pl: str                             # from registry; UI-friendly
    symbolic_latex: str                        # from registry
    substituted_latex: str                    # deterministic substitution
    inputs_used: tuple[str, ...]              # sorted input keys
    intermediate_values: dict[str, TraceValue] # sorted by key
    result: TraceValue                        # final result of this step
    origin: str                               # "input" | "solver" | "adapter"
    derived_in_adapter: bool                  # True only when origin="adapter"
```

## 4. TraceDiffResult Schema

```python
@dataclass(frozen=True)
class TraceDiffResult:
    trace_a_id: str
    trace_b_id: str
    input_diffs: tuple[TraceDiffEntry, ...]
    step_diffs: tuple[TraceStepDiff, ...]
    output_diffs: tuple[TraceDiffEntry, ...]
    summary: TraceDiffSummary

@dataclass(frozen=True)
class TraceDiffEntry:
    key: str
    value_a: str | None
    value_b: str | None
    status: str  # "UNCHANGED" | "CHANGED" | "ADDED" | "REMOVED"

@dataclass(frozen=True)
class TraceStepDiff:
    step_id: str
    status: str  # "UNCHANGED" | "CHANGED" | "ADDED" | "REMOVED"
    field_diffs: tuple[TraceDiffEntry, ...]
```

## 5. EquationRegistryV2 Schema

```python
@dataclass(frozen=True)
class EquationEntryV2:
    eq_id: str                   # stable, semantic e.g. "SC_IKSS"
    label_pl: str                # Polish label
    description_pl: str          # Polish description
    latex_symbolic: str          # symbolic LaTeX
    variables: tuple[EquationVariable, ...]
    source_norm: str             # IEC 60909 / IEC 60255 / etc.
    valid_from_math_spec: str    # MathSpecVersion semver

@dataclass(frozen=True)
class EquationVariable:
    name: str
    unit: str
    meaning_pl: str
```

## 6. MathSpecVersion Rules

- Semver format: MAJOR.MINOR.PATCH
- Pinned to each Run
- Equation change → MINOR bump
- Parameter change → PATCH bump
- Breaking change → MAJOR bump
- Current version: 1.0.0
