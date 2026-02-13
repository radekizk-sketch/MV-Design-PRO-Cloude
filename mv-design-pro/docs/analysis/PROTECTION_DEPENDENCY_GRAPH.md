# PROTECTION DEPENDENCY GRAPH

> **Status**: BINDING (Phase B)
> **Date**: 2026-02-12
> **Scope**: PR-27→PR-32 dependency order, gating rules, merge blockers

---

## 1. Dependency Graph

```
PR-26 (Protection Engine v1) ────── MERGED (BASE)
    │
    ▼
PR-27 (SC ↔ Protection Bridge) ─────────────────────────────────┐
    │                                                             │
    ├──▶ PR-28 (Coordination v1 — Selectivity Margins)           │
    │        │                                                    │
    │        ├──▶ PR-30 (Protection SLD Overlay Pro)              │
    │        │        │                                           │
    │        │        ├──▶ PR-31 (Report Model + Export Hook)     │
    │        │        │                                           │
    │        │        └──▶ PR-32 (Governance & Determinism Guards)│
    │        │                                                    │
    │        └──▶ PR-31 (Report Model + Export Hook)              │
    │                                                             │
    └──▶ PR-29 (Topology Links) ── OPTIONAL, PARALLEL ───────────┘
```

## 2. Merge Order (Sequential)

| Order | PR | Name | Depends On | Can Start After |
|-------|-----|------|------------|-----------------|
| 1 | PR-27 | SC ↔ Protection Bridge | PR-26 (merged) | Immediately |
| 2 | PR-28 | Coordination v1 | PR-27 | PR-27 merge |
| 3 | PR-30 | SLD Overlay Pro | PR-28 | PR-28 merge |
| 4 | PR-31 | Report Model + Export | PR-28, PR-30 | PR-30 merge |
| 5 | PR-32 | Governance & Guards | PR-27, PR-28, PR-30, PR-31 | PR-31 merge |
| — | PR-29 | Topology Links (optional) | PR-27 | PR-27 merge |

## 3. Gating Rules (Merge Blockers)

### PR-27: SC ↔ Protection Bridge

**BLOCKED if any of**:
- [ ] Any fallback/default in current source resolution
- [ ] Any auto-selection of `target_ref`
- [ ] Ambiguous SC→relay mapping does not produce deterministic error
- [ ] Ambiguous mapping does not produce FixAction candidates
- [ ] Hash input does not include `current_source` and user selections
- [ ] SC ResultSet v1 is modified in any way
- [ ] SC solver code is modified in any way

**Required tests**:
- [ ] Resolver unit tests (TEST_POINTS + SC_RESULT modes)
- [ ] Integration test: full pipeline with current source
- [ ] Ambiguous mapping → deterministic error + FixAction candidates
- [ ] Hash equality (identical input → identical hash)
- [ ] Permutation invariance (relay order does not change result)

### PR-28: Coordination v1

**BLOCKED if any of**:
- [ ] Automatic detection of upstream/downstream
- [ ] Any OK/FAIL/PASS verdict in result
- [ ] Missing trace for margin computation
- [ ] Non-deterministic margin ordering

**Required tests**:
- [ ] Golden margins (manually computed reference values)
- [ ] Sign test: swap upstream/downstream → sign of margin flips
- [ ] Determinism hash (identical input → identical signature)
- [ ] Empty pairs list → empty result (not error)

### PR-29: Topology Links (Optional)

**BLOCKED if any of**:
- [ ] Auto-inference of topology for selectivity pairs
- [ ] Heuristic relay→CB→element mapping

**Required tests**:
- [ ] ID consistency: relay_id ↔ cb_id ↔ target_ref
- [ ] Missing link → deterministic error (not fallback)

### PR-30: Protection SLD Overlay Pro

**BLOCKED if any of**:
- [ ] Overlay modifies SLD symbol geometry
- [ ] Layout depends on zoom level
- [ ] Unstable sort/keys in token list
- [ ] Physics computation in overlay code

**Required tests**:
- [ ] Snapshot: token list stability
- [ ] Determinism: overlay ordering
- [ ] No-physics guard passes on overlay code

### PR-31: Report Model + Export Hook

**BLOCKED if any of**:
- [ ] `current_source` missing from report model
- [ ] Unstable element ordering in report
- [ ] Locale-dependent float formatting
- [ ] Non-deterministic report signature

**Required tests**:
- [ ] Golden report JSON (reference comparison)
- [ ] Determinism: identical input → identical report hash
- [ ] Float format stability (dot separator, fixed precision)

### PR-32: Governance & Determinism Guards

**BLOCKED if any of**:
- [ ] diff-guard for SC solver does not exist
- [ ] SC ResultSet v1 schema guard does not exist
- [ ] No-heuristics pattern guard does not exist
- [ ] Guards do not run in CI pipeline
- [ ] Any existing guard is broken

**Required tests**:
- [ ] diff-guard catches modification of `network_model/solvers/`
- [ ] Schema guard catches modification of SC ResultSet v1 contract
- [ ] Pattern guard catches forbidden keywords (fallback, auto_select, default_target)
- [ ] All guards pass on current codebase
- [ ] Full determinism suite: hash equality + permutation tests for Protection

---

## 4. Commit Order Within Each PR

Each PR follows this internal commit sequence:

1. **Contracts + types** — frozen dataclasses, enums, type definitions
2. **Engine / resolver** — core logic (pure functions)
3. **Execution wiring** — integration with ExecutionEngine pipeline
4. **ResultSet mapping** — mapper to canonical ResultSet
5. **UI components** — frontend types, components, store (if applicable)
6. **SLD overlay** — overlay tokens, legend (if applicable)
7. **Tests + guards** — unit, integration, determinism, golden
8. **Docs update** — update canonical docs if needed

Commits are small, logical, and self-contained. No aesthetic refactors.

---

## 5. Definition of Done

Protection Block is complete when ALL of:

- [ ] PR-27 merged (SC ↔ Protection Bridge)
- [ ] PR-28 merged (Coordination v1)
- [ ] PR-30 merged (SLD Overlay Pro)
- [ ] PR-31 merged (Report Model + Export)
- [ ] PR-32 merged (Governance & Guards)
- [ ] (Optional) PR-29 merged (Topology Links)
- [ ] CI green on all PRs
- [ ] Determinism proven: hash equality + permutation invariance
- [ ] Zero heuristics, zero auto-completions
- [ ] SC solver untouched
- [ ] SC ResultSet v1 untouched
- [ ] Canonical documentation complete and consistent

---

*End of Protection Dependency Graph.*
