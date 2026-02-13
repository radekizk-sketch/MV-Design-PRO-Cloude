# MV-DESIGN-PRO Operational Plan

**Version:** 5.0
**Status:** LIVING DOCUMENT
**Reference:** [`SYSTEM_SPEC.md`](SYSTEM_SPEC.md) (executive overview), [`docs/spec/`](docs/spec/) (detailed spec — source of truth)

---

## 1. Project Status Summary

MV-DESIGN-PRO is a functional Medium Voltage network design and analysis system with:
- 4 solvers (IEC 60909 SC, NR/GS/FD Power Flow)
- 8+ proof packs (SC3F, VDROP, Equipment, PF, Losses, Protection, Earthing, LF Voltage)
- 12+ analysis modules (Protection, Voltage, Normative, Coverage, Sensitivity, Comparison, Recommendations)
- Full frontend: SLD editor, Results Browser, Case Manager, Proof Inspector, Protection Diagnostics
- 1600+ backend tests
- Project import/export (ZIP, deterministic, versioned)
- CAD geometry editing in SLD
- PDF/DOCX report generation

---

## 2. Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1: Documentation | Canonical docs (SYSTEM_SPEC, ARCHITECTURE, AGENTS, PLANS) | DONE |
| Phase 1.x: PF UI/UX Parity | PowerFactory alignment docs | DONE |
| Phase 1.y: UI Contracts | SLD, Results, Inspector contracts | DONE |
| Phase 1.z: UI Exploration | Results/Inspector exploration docs | DONE |
| Phase 2: NetworkModel Core | Core elements, graph, snapshot | DONE (code) |
| Phase 2.x: UI PF++ Contracts | Advanced UI contracts (topology tree, switching, SC node) | DONE (docs) |
| Phase 3: Catalog Layer | Immutable types, resolver, governance | DONE |
| Phase 4: Case Layer | Case lifecycle, invalidation, clone | DONE |
| Phase 5: Interpretation Layer | BoundaryIdentifier, BoundaryNode moved to analysis | DONE |
| Phase 6: Wizard/SLD Unity | Verify single model access | DONE (27 backend + 23 frontend tests) |
| P10a: State/Lifecycle | Case result status machine | DONE |
| P10b: Result State + Comparison | A/B comparison | DONE |
| P11: Proof Engine | SC3F, VDROP proofs | DONE |
| P11a: Results Inspector | Read-only + trace + SLD overlay | DONE |
| P11b: Frontend Results Inspector | Result view | DONE |
| P11c: Results Browser + A/B Compare | UI-only | DONE |
| P12: Equipment Proof Pack | Thermal/dynamic withstand | DONE |
| P12a: Data Manager Parity | Case manager + active case + mode blocks | DONE |
| P14: Proof Audit & Coverage | Audit coverage | DONE |
| P14a: Protection Library (foundation) | Vendor curves, IDMT | DONE |
| P14b: Protection Library Governance | Manifest, fingerprint, export/import | DONE |
| P14c: Protection Case Config | Protection config | DONE |
| P15a: Protection Analysis Foundation | Backend overcurrent analysis | DONE |
| P23: Study/Scenario Orchestration | Scenario workflow | DONE (docs) |
| P30a: Undo/Redo Infrastructure | Command history | DONE |
| P30c: Property Grid Multi-Edit | Multi-selection editing | DONE |
| P30d: Issue Panel / Validation Browser | Validation display | DONE |
| P30e: Context Property Grid | Context-sensitive grid | DONE |
| P30f: SLD Layout Determinism Tests | Auto-layout tests | DONE |
| P31: Project Import/Export | ZIP archive (deterministic) | DONE |
| SLD CAD Geometry | CadOverridesDocument contract | DONE |
| SLD CAD Tools | Drag, bends, reset, status | DONE |
| SLD Fit-to-Content | Viewport fit action | DONE |
| SLD Routing Corridors | Connection routing obstacles | DONE |
| Infra: /api/health | Health endpoint + API URL separation | DONE |
| Memory Canonization V3.0 | This canonization pass | DONE |
| EP-1: Application API | Projects + Cases + Network persistence | DONE |
| EP-4: Case-Bound Runs | POST /cases/{cid}/runs/short-circuit, loadflow, protection | DONE |
| EP-5: SC Asymmetrical | Solver supports 1F, 2F, 2F+G (already existed) | DONE |
| EP-6: Protection Settings | I>/I>> dobor nastaw (Hoppel method) | DONE |
| EP-7: Q(U) Regulation | Proof pack NC RfG compliance | DONE |
| EP-9: PostgreSQL | Full SQLAlchemy ORM (was already migrated) | DONE |
| EP-10: XLSX Importer | Import sieci z Excel | DONE |
| EP-11: Docker + Health | Rozszerzony health: db_ok, engine_ok, solvers, uptime | DONE |
| EP-3: Wizard K1-K10 | Frontend kreator budowy sieci | DONE |
| ENM v1.0 | EnergyNetworkModel contract + mapping + validator + API + Wizard | DONE |

---

## 3. Active Work

### 3.1 Docs Sync to Spec Canon (current)

Objective: Synchronize all repo documentation entrypoints with `docs/spec/` (18 chapters) as the source of truth.

Tasks:
- [x] Full repo scan (RECON)
- [x] Document chaos detection (20 inconsistencies identified)
- [x] Rewrite AGENTS.md (clean governance)
- [x] Rewrite SYSTEM_SPEC.md (executive overview + navigation to 18 spec chapters)
- [x] Rewrite ARCHITECTURE.md (spec chapter references in every section)
- [x] Rewrite PLANS.md (this file)
- [x] Sync README.md (root + mv-design-pro) — removed prohibited terms, fixed paths, added spec links
- [x] Sync docs/INDEX.md — added spec chapter table, fixed broken links
- [x] Add docs_guard.py CI guard (PCC + broken link check)
- [x] Clean remaining duplicate docs in docs/ outside docs/spec/
- [x] Mark/move deprecated notes and operational files

---

## 4. Next Priorities

### 4.1 HIGH Priority

| Item | Description | Status |
|------|-------------|--------|
| Phase 6: Wizard/SLD Unity | Formal verification that Wizard and SLD operate on same model | DONE |
| NetworkValidator Extension | Full PowerFactory-grade validation rules (13 rules, 29 tests) | DONE |
| Bus Terminology Completion | Finish Node -> Bus rename in all code paths | DONE |
| SC Asymmetrical Proofs | 1F, 2F, 2F-Z fault proof packs (IEC 60909) | DONE |
| Normative Completion Pack (IEC 60909 §4.1) | Domknięcie mapowania norma→dowód + golden proofs + CI gates | DONE |

### 4.2 MEDIUM Priority

| Item | Description | Status |
|------|-------------|--------|
| Regulation Q(U) Proofs | Reactive power regulation proof pack | DONE |
| PR-27: SC ↔ Protection Bridge | Current source resolution (TEST_POINTS / SC_RESULT), FixActions | DONE |
| PR-28: Coordination v1 | Selectivity margins (explicit pairs, numbers only) | DONE |
| PR-29: Topology Links | Unified relay↔CB↔target_ref IDs (optional) | PLANNED |
| PR-30: Protection SLD Overlay Pro | Token-only overlay (t51, margins) | DONE |
| PR-31: Protection Report Model | Export-ready data model (PDF/DOCX) | DONE |
| PR-32: Governance & Determinism Guards | Solver diff-guard, schema guard, no-heuristics guard | DONE |
| Frontend Test Coverage | Increase Vitest + Playwright coverage | PLANNED |
| CI Pipeline Enhancement | Add frontend type-check and lint to CI | PLANNED |

### 4.3 LOW Priority

| Item | Description | Status |
|------|-------------|--------|
| XLSX Network Importer | Import from spreadsheet (ADR-009) | DONE |
| Cloud Backup Integration | S3/GCS integration | PLANNED |
| Incremental Archive Export | Delta export | PLANNED |
| Archive Diff | Compare two project archives | PLANNED |

---

## 5. Technical Debt

| Issue | Severity | Description |
|-------|----------|-------------|
| Node/Bus terminology | RESOLVED | DTOs, API, frontend types renamed with backward-compat aliases |
| Stale root-level docs | RESOLVED | AUDIT.md, P13B_SUMMARY.md, AUDIT_PCC_REMOVAL.md marked DEPRECATED |
| Duplicate DOCS_INDEX.md | RESOLVED | Deleted (superseded by docs/INDEX.md) |
| Duplicate UI contract docs | LOW | Some contracts exist in both `docs/ui/` and root `docs/ui/` |
| Large test fixtures | LOW | Some test files contain large inline fixtures |
| ADR numbering conflicts | LOW | ADR-002, ADR-003, ADR-006, ADR-007, ADR-008 have duplicate numbers |
| Historical ExecPlans | LOW | 16 old ExecPlans in `docs/audit/historical_execplans/` should be archived |

---

## 6. Architecture Risks

| Risk | Mitigation |
|------|------------|
| Shadow data stores | Enforced by Single Model Rule + code review |
| Physics leaking into non-solver layers | NOT-A-SOLVER rule + test guards + arch_guard.py |
| Protection heuristics/auto-selection | protection_no_heuristics_guard.py (PR-32, DONE) |
| SC solver modification by Protection PRs | solver_diff_guard.py (PR-32, DONE) |
| SC ResultSet v1 drift | resultset_v1_schema_guard.py (PR-32, DONE) |
| Result API drift | Frozen API rule + version bump requirement |
| Proof determinism regression | SHA-256 fingerprint tests |
| UI codename leaks | `no_codenames_guard.py` script |
| Documentation drift | `docs_guard.py` — PCC prohibition + broken link check in entrypoints |

---

## 7. Canonical Documentation

| Document | Location | Status |
|----------|----------|--------|
| Detailed Specification (18 chapters) | [`docs/spec/SPEC_CHAPTER_*.md`](docs/spec/) | SOURCE OF TRUTH |
| Spec-vs-Code Audit | [`docs/spec/AUDIT_SPEC_VS_CODE.md`](docs/spec/AUDIT_SPEC_VS_CODE.md) | BINDING |
| Spec Expansion Plan | [`docs/spec/SPEC_EXPANSION_PLAN.md`](docs/spec/SPEC_EXPANSION_PLAN.md) | REFERENCE |
| System Spec (overview) | [`SYSTEM_SPEC.md`](SYSTEM_SPEC.md) | BINDING |
| Architecture | [`ARCHITECTURE.md`](ARCHITECTURE.md) | BINDING |
| Agent Governance | [`AGENTS.md`](AGENTS.md) | BINDING |
| Documentation Index | [`docs/INDEX.md`](docs/INDEX.md) | REFERENCE |

## 8. Historical ExecPlans

All historical ExecPlans (01-16) are archived in `docs/audit/historical_execplans/`.
They document the evolution of the project but are NOT part of the canonical plan.
Current truth: this PLANS.md document.

---

**END OF OPERATIONAL PLAN**
