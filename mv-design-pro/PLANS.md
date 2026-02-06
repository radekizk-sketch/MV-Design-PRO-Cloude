# MV-DESIGN-PRO Operational Plan

**Version:** 4.0
**Status:** LIVING DOCUMENT
**Reference:** SYSTEM_SPEC.md (authoritative)

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
| Phase 5: Interpretation Layer | BoundaryIdentifier, PCC moved to analysis | DONE |
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

---

## 3. Active Work

### 3.1 Memory Canonization V3.0 (current)

Objective: Transform repo documentation into clean, canonical Opus memory.

Tasks:
- [x] Full repo scan
- [x] Document chaos detection
- [x] Rewrite AGENTS.md (192 lines, clean governance)
- [x] Rewrite SYSTEM_SPEC.md (483 lines, full function map)
- [x] Rewrite ARCHITECTURE.md (490 lines, true architecture)
- [x] Rewrite PLANS.md (this file)
- [ ] Move historical ExecPlans to archive
- [ ] Clean duplicate docs

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
| P16: Normative Coordination | Selectivity coordination (DEFERRED from earlier) | PLANNED |
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
| Duplicate UI contract docs | LOW | Some contracts exist in both `docs/ui/` and root `docs/ui/` |
| Large test fixtures | LOW | Some test files contain large inline fixtures |
| ADR numbering conflicts | LOW | ADR-002, ADR-003, ADR-006, ADR-007, ADR-008 have duplicate numbers |
| Historical ExecPlans | LOW | 16 old ExecPlans in `docs/audit/historical_execplans/` should be archived |

---

## 6. Architecture Risks

| Risk | Mitigation |
|------|------------|
| Shadow data stores | Enforced by Single Model Rule + code review |
| Physics leaking into non-solver layers | NOT-A-SOLVER rule + test guards |
| Result API drift | Frozen API rule + version bump requirement |
| Proof determinism regression | SHA-256 fingerprint tests |
| UI codename leaks | `no_codenames_guard.py` script |

---

## 7. Historical ExecPlans

All historical ExecPlans (01-16) are archived in `docs/audit/historical_execplans/`.
They document the evolution of the project but are NOT part of the canonical plan.
Current truth: this PLANS.md document.

---

**END OF OPERATIONAL PLAN**
