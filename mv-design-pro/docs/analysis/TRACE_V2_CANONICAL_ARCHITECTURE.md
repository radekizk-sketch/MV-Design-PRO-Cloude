# TRACE v2 — Canonical Architecture

**Status**: BINDING (RUN #2B)
**MathSpecVersion**: 1.0.0

---

## 1. Cel

TraceArtifactV2 jest zunifikowanym, immutable artefaktem dowodowym dla trzech analiz:
- SC (IEC 60909)
- Protection (50/51 + IEC IDMT)
- Load Flow (Newton-Raphson / Gauss-Seidel / Fast-Decoupled)

## 2. Warstwy (acykliczne)

```
Domain (immutable)
  ├── TraceArtifactV2          — kanoniczny artefakt trace
  ├── TraceValue               — typowana wartość z jednostką
  ├── TraceEquationStep        — krok równania z registry
  ├── EquationRegistryV2       — rejestr równań (wersjonowany)
  ├── MathSpecVersion          — semver specyfikacji matematycznej
  └── TraceDiffResult          — wynik porównania trace

Adapters (application layer)
  ├── TraceEmitterSC           — SC ResultSet v1 → TraceArtifactV2
  ├── TraceEmitterProtection   — Protection ResultSet v1 → TraceArtifactV2
  └── TraceEmitterLoadFlow     — LF ResultSet v1 + PowerFlowTrace → TraceArtifactV2

Diff (pure, domain)
  └── TraceDiffEngine          — porównanie dwóch TraceArtifactV2

Export (application layer)
  └── LaTeXGenerator           — TraceArtifactV2 + Registry → LaTeX

Governance (CI)
  ├── SolverBoundaryGuard      — SHA-256 hash solverów
  ├── ResultSetContractGuard   — frozen contract check
  ├── TraceDeterminismSuite    — run_hash independence + signature stability
  └── UILeakGuard              — trace types isolation
```

## 3. Sygnatury (BINDING)

### run_hash
- Wejście: `SHA-256(canonical(SnapshotHash + AnalysisInput + MathSpecVersion))`
- NIE zależy od trace, LaTeX, renderingu
- Identyczny input → identyczny run_hash

### trace_signature
- Wejście: `SHA-256(canonical(TraceArtifactV2.to_canonical_dict()))`
- Zależy od TraceArtifactV2 + EquationRegistry
- Zmiana formatu (substituted_latex) może zmienić trace_signature
- Zmiana formatu NIE zmienia run_hash

### Test blokujący
```
assert run_hash_before == run_hash_after   # po zmianie formatu LaTeX
assert trace_sig_before != trace_sig_after  # po zmianie substituted_latex (dozwolone)
```

## 4. Zakazy (MERGE BLOCKERS)

1. Solver IEC 60909 — NIETYKALNY
2. ResultSet v1 (SC/Protection/LF) — NIETYKALNY
3. Brak heurystyk w diff (zero epsilon, zero tolerance)
4. run_hash NIE zależy od trace
5. Brak nazw kodowych w UI
6. Trace types import TYLKO w TraceViewer/TraceCompare

## 5. Canonical Float Policy

Jedna funkcja `canonical_float(x, precision=10)` w backend:
- `round(x, precision)` z deterministic precision
- Brak progów tolerancji
- Spójna dla SC, Protection, LF

## 6. Determinism Invariants

- Identyczny Snapshot + AnalysisInput + MathSpecVersion → identyczny run_hash
- Identyczny TraceArtifactV2 → identyczna trace_signature
- Sortowanie: inputs (sorted keys), equation_steps (sorted by step_id), outputs (sorted keys)
- Permutacja wejść NIE zmienia run_hash ani trace_signature
