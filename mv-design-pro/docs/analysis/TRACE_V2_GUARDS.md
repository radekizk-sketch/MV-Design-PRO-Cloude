# TRACE v2 — Guards & Test Plan

**Status**: BINDING (RUN #2B)

---

## 1. Merge Blockers

| Guard | Type | Blocks merge if |
|-------|------|-----------------|
| SolverBoundaryGuard | SHA-256 hash | Any solver file changed |
| ResultSetContractGuard | Git diff | Any ResultSet v1 mapping file changed |
| TraceDeterminismSuite | pytest | run_hash depends on trace OR signature not stable |
| UILeakGuard | Import scan | Trace types imported outside TraceViewer/TraceCompare |

## 2. TraceDeterminismSuite Tests

### test_run_hash_independence
- Build TraceArtifactV2 with two different substituted_latex values
- Assert run_hash is identical
- Assert trace_signature is different

### test_trace_signature_determinism
- Build same TraceArtifactV2 twice
- Assert trace_signature is identical (bit-for-bit)

### test_permutation_invariance
- Build trace with inputs in different order
- Assert run_hash is identical
- Assert trace_signature is identical

### test_canonical_float_consistency
- canonical_float(0.1 + 0.2) == canonical_float(0.3)
- canonical_float(1e-15) == 0.0 (below precision)

### test_golden_trace_sc
- Build SC trace for golden network node
- Compare against golden JSON fixture

### test_golden_trace_protection
- Build Protection trace for golden relay + test point
- Compare against golden JSON fixture

### test_golden_trace_load_flow
- Build LF trace for golden network
- Compare against golden JSON fixture

## 3. TraceDiffEngine Tests

### test_diff_symmetry
- diff(A, B).step_diffs mirrors diff(B, A).step_diffs (ADDED↔REMOVED)

### test_diff_deterministic_ordering
- Same inputs, different insertion order → identical diff result

### test_diff_stable_json
- Serialize diff result → JSON → deserialize → identical

## 4. LaTeX Export Tests

### test_golden_latex
- Generate LaTeX from golden trace
- Compare against golden .tex fixture (byte-for-byte)

### test_latex_stable_numbering
- Regenerate LaTeX → same equation/step numbers

### test_latex_no_timestamps
- Generated LaTeX contains no timestamps in signature block

## 5. CI Guard Scripts

### trace_determinism_guard.py
- Runs TraceDeterminismSuite
- Exit 0 = clean, Exit 1 = violation

### trace_ui_leak_guard.py
- Scans frontend imports
- TraceArtifactV2/TraceEquationStep/TraceDiffResult types
  only allowed in: proof/trace-v2/, proof/compare/
- Exit 0 = clean, Exit 1 = violation
