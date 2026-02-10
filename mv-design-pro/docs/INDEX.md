# Documentation Index

## Detailed Specification (SOURCE OF TRUTH)

The detailed specification (18 chapters) is the authoritative source of truth for the system:

| # | Chapter | File |
|---|---------|------|
| 01 | Purpose, Scope, Definitions | [`spec/SPEC_CHAPTER_01_PURPOSE_SCOPE_DEFINITIONS.md`](./spec/SPEC_CHAPTER_01_PURPOSE_SCOPE_DEFINITIONS.md) |
| 02 | ENM Domain Model | [`spec/SPEC_CHAPTER_02_ENM_DOMAIN_MODEL.md`](./spec/SPEC_CHAPTER_02_ENM_DOMAIN_MODEL.md) |
| 03 | Topology & Connectivity | [`spec/SPEC_CHAPTER_03_TOPOLOGY_CONNECTIVITY.md`](./spec/SPEC_CHAPTER_03_TOPOLOGY_CONNECTIVITY.md) |
| 04 | Lines & Cables (MV) | [`spec/SPEC_CHAPTER_04_LINES_CABLES_SN.md`](./spec/SPEC_CHAPTER_04_LINES_CABLES_SN.md) |
| 05 | System Canonical Contracts | [`spec/SPEC_CHAPTER_05_SYSTEM_CANONICAL_CONTRACTS.md`](./spec/SPEC_CHAPTER_05_SYSTEM_CANONICAL_CONTRACTS.md) |
| 06 | Solver Contracts & ENM Mapping | [`spec/SPEC_CHAPTER_06_SOLVER_CONTRACTS_AND_MAPPING.md`](./spec/SPEC_CHAPTER_06_SOLVER_CONTRACTS_AND_MAPPING.md) |
| 07 | Sources, Generators, Loads | [`spec/SPEC_CHAPTER_07_SOURCES_GENERATORS_LOADS.md`](./spec/SPEC_CHAPTER_07_SOURCES_GENERATORS_LOADS.md) |
| 08 | Type vs Instance & Catalogs | [`spec/SPEC_CHAPTER_08_TYPE_VS_INSTANCE_AND_CATALOGS.md`](./spec/SPEC_CHAPTER_08_TYPE_VS_INSTANCE_AND_CATALOGS.md) |
| 09 | Protection System | [`spec/SPEC_CHAPTER_09_PROTECTION_SYSTEM.md`](./spec/SPEC_CHAPTER_09_PROTECTION_SYSTEM.md) |
| 10 | Study Cases & Scenarios | [`spec/SPEC_CHAPTER_10_STUDY_CASES_AND_SCENARIOS.md`](./spec/SPEC_CHAPTER_10_STUDY_CASES_AND_SCENARIOS.md) |
| 11 | Reporting & Export | [`spec/SPEC_CHAPTER_11_REPORTING_AND_EXPORT.md`](./spec/SPEC_CHAPTER_11_REPORTING_AND_EXPORT.md) |
| 12 | Validation & QA | [`spec/SPEC_CHAPTER_12_VALIDATION_AND_QA.md`](./spec/SPEC_CHAPTER_12_VALIDATION_AND_QA.md) |
| 13 | Reporting & Exports (formal) | [`spec/SPEC_CHAPTER_13_REPORTING_AND_EXPORTS.md`](./spec/SPEC_CHAPTER_13_REPORTING_AND_EXPORTS.md) |
| 14 | Determinism & Versioning | [`spec/SPEC_CHAPTER_14_DETERMINISM_AND_VERSIONING.md`](./spec/SPEC_CHAPTER_14_DETERMINISM_AND_VERSIONING.md) |
| 15 | Governance & ADR | [`spec/SPEC_CHAPTER_15_GOVERNANCE_AND_ADR.md`](./spec/SPEC_CHAPTER_15_GOVERNANCE_AND_ADR.md) |
| 16 | External Integrations | [`spec/SPEC_CHAPTER_16_EXTERNAL_INTEGRATIONS.md`](./spec/SPEC_CHAPTER_16_EXTERNAL_INTEGRATIONS.md) |
| 17 | Testing & Acceptance | [`spec/SPEC_CHAPTER_17_TESTING_AND_ACCEPTANCE.md`](./spec/SPEC_CHAPTER_17_TESTING_AND_ACCEPTANCE.md) |
| 18 | Production & Maintenance | [`spec/SPEC_CHAPTER_18_PRODUCTION_AND_MAINTENANCE.md`](./spec/SPEC_CHAPTER_18_PRODUCTION_AND_MAINTENANCE.md) |

### Spec Supplements

- [`spec/AUDIT_SPEC_VS_CODE.md`](./spec/AUDIT_SPEC_VS_CODE.md) — Spec-vs-code gap analysis (BINDING decision matrix)
- [`spec/SPEC_EXPANSION_PLAN.md`](./spec/SPEC_EXPANSION_PLAN.md) — Spec expansion roadmap & AS-IS/TO-BE policy
- [`spec/SPEC_GAP_SUPPLEMENT_PROTECTION_WHITEBOX_LEGACY.md`](./spec/SPEC_GAP_SUPPLEMENT_PROTECTION_WHITEBOX_LEGACY.md) — Gap closure: Protection, WhiteBox, OperatingCase
- [`spec/ENERGY_NETWORK_MODEL.md`](./spec/ENERGY_NETWORK_MODEL.md) — ENM reference model
- [`spec/SLD_TOPOLOGICAL_ENGINE.md`](./spec/SLD_TOPOLOGICAL_ENGINE.md) — SLD engine spec
- [`spec/WIZARD_FLOW.md`](./spec/WIZARD_FLOW.md) — Wizard workflow

---

## Canonical (Binding / Reference)

- [SYSTEM_SPEC.md](../SYSTEM_SPEC.md) — System specification: executive overview + navigation (BINDING)
- [ARCHITECTURE.md](../ARCHITECTURE.md) — Detailed architecture (REFERENCE)
- [AGENTS.md](../AGENTS.md) — Governance rules (BINDING)
- [PLANS.md](../PLANS.md) — Active execution plan (LIVING)
- [POWERFACTORY_COMPLIANCE.md](../POWERFACTORY_COMPLIANCE.md) — Compliance checklist

---

## Operational Guides

- [00-System-Overview.md](./00-System-Overview.md)
- [01-Core.md](./01-Core.md)
- [02-Solvers.md](./02-Solvers.md)
- [03-Analyses.md](./03-Analyses.md)
- [04-Application.md](./04-Application.md)
- [analysis/SENSITIVITY_ANALYSIS_ETAP_PLUS.md](./analysis/SENSITIVITY_ANALYSIS_ETAP_PLUS.md) — Sensitivity & margin analysis
- [analysis/P26_AUTO_RECOMMENDATIONS_ETAP_PLUS.md](./analysis/P26_AUTO_RECOMMENDATIONS_ETAP_PLUS.md) — Auto recommendations
- [analysis/P27_SCENARIO_COMPARISON_ETAP_PLUS.md](./analysis/P27_SCENARIO_COMPARISON_ETAP_PLUS.md) — Scenario comparison
- [analysis/P28_COVERAGE_COMPLETENESS_SCORE.md](./analysis/P28_COVERAGE_COMPLETENESS_SCORE.md) — Coverage completeness score
- [analysis/P33_LF_SENSITIVITY_ETAP_KILLER.md](./analysis/P33_LF_SENSITIVITY_ETAP_KILLER.md) — Wrazliwosc napiec
- [architecture/STUDY_SCENARIO_WORKFLOW_ETAP_PLUS.md](./architecture/STUDY_SCENARIO_WORKFLOW_ETAP_PLUS.md) — Study/Scenario/Run workflow
- [GO-LIVE-CHECKLIST.md](./GO-LIVE-CHECKLIST.md)
- [REPOSITORY-HYGIENE.md](./REPOSITORY-HYGIENE.md)
- [ROADMAP.md](./ROADMAP.md)

---

## UI / UX Contracts (PowerFactory Parity)

- [ui/powerfactory_ui_parity.md](./ui/powerfactory_ui_parity.md)
- [ui/wizard_screens.md](./ui/wizard_screens.md)
- [ui/sld_rules.md](./ui/sld_rules.md)
- [ui/SLD_UI_CONTRACT.md](./ui/SLD_UI_CONTRACT.md) — Priority Stack, Dense SLD, Semantic Color, Print-First (CANONICAL)
- [ui/SLD_SCADA_CAD_CONTRACT.md](./ui/SLD_SCADA_CAD_CONTRACT.md) — SCADA SLD + CAD overlay (CANONICAL)
- [ui/SLD_SHORT_CIRCUIT_BUS_CENTRIC.md](./ui/SLD_SHORT_CIRCUIT_BUS_CENTRIC.md) — Prezentacja wynikow zwarciowych: BUS-centric (CANONICAL)
- [ui/SHORT_CIRCUIT_PANELS_AND_PRINTING.md](./ui/SHORT_CIRCUIT_PANELS_AND_PRINTING.md) — Panele zwarciowe, wydruk PDF/DOCX (CANONICAL)

### Results & Inspection UI

- [ui/RESULTS_BROWSER_CONTRACT.md](./ui/RESULTS_BROWSER_CONTRACT.md) — Results Browser (CANONICAL)
- [ui/VOLTAGE_PROFILE_BUS_CONTRACT.md](./ui/VOLTAGE_PROFILE_BUS_CONTRACT.md) — Profil napieciowy BUS-centric (CANONICAL)
- [ui/PROTECTION_INSIGHT_CONTRACT.md](./ui/PROTECTION_INSIGHT_CONTRACT.md) — Zabezpieczenia: analiza selektywnosci (CANONICAL)
- [ui/PROTECTION_CURVES_IT_SUPERIOR_CONTRACT.md](./ui/PROTECTION_CURVES_IT_SUPERIOR_CONTRACT.md) — Krzywe czasowo-pradowe I-t (CANONICAL)
- [ui/PDF_REPORT_SUPERIOR_CONTRACT.md](./ui/PDF_REPORT_SUPERIOR_CONTRACT.md) — Raport PDF (CANONICAL)
- [ui/ELEMENT_INSPECTOR_CONTRACT.md](./ui/ELEMENT_INSPECTOR_CONTRACT.md) — Element Inspector: multi-tab, multi-case (CANONICAL)
- [ui/EXPERT_MODES_CONTRACT.md](./ui/EXPERT_MODES_CONTRACT.md) — Expert Modes: Operator, Designer, Analyst, Auditor (CANONICAL)
- [ui/GLOBAL_CONTEXT_BAR.md](./ui/GLOBAL_CONTEXT_BAR.md) — Global Context Bar (CANONICAL)
- [ui/UI_ETAP_POWERFACTORY_PARITY.md](./ui/UI_ETAP_POWERFACTORY_PARITY.md) — UI Parity Matrix (CANONICAL)
- [ui/SWITCHING_STATE_EXPLORER_CONTRACT.md](./ui/SWITCHING_STATE_EXPLORER_CONTRACT.md) — Switching State Explorer (CANONICAL)

### UI Phase 2.x (PowerFactory++ Parity)

- [ui/SLD_RENDER_LAYERS_CONTRACT.md](./ui/SLD_RENDER_LAYERS_CONTRACT.md) — SLD Render Layers: CAD vs SCADA (CANONICAL)
- [ui/TOPOLOGY_TREE_CONTRACT.md](./ui/TOPOLOGY_TREE_CONTRACT.md) — Topology Tree (CANONICAL)
- [ui/SC_NODE_RESULTS_CONTRACT.md](./ui/SC_NODE_RESULTS_CONTRACT.md) — SC Node Results per BUS (CANONICAL)
- [ui/CATALOG_BROWSER_CONTRACT.md](./ui/CATALOG_BROWSER_CONTRACT.md) — Catalog Browser (CANONICAL)
- [ui/CASE_COMPARISON_UI_CONTRACT.md](./ui/CASE_COMPARISON_UI_CONTRACT.md) — Case Comparison: A vs B vs C (CANONICAL)

---

## Proof Engine

- [proof_engine/README.md](./proof_engine/README.md) — Pakiet kanoniczny (BINDING)
- [proof_engine/P11_OVERVIEW.md](./proof_engine/P11_OVERVIEW.md) — TraceArtifact, inwarianty, UX
- [proof_engine/P11_1a_MVP_SC3F_AND_VDROP.md](./proof_engine/P11_1a_MVP_SC3F_AND_VDROP.md) — MVP: SC3F + VDROP
- [proof_engine/P11_1b_REGULATION_Q_U.md](./proof_engine/P11_1b_REGULATION_Q_U.md) — Regulatory Q(U)
- [proof_engine/P11_1c_SC_ASYMMETRICAL.md](./proof_engine/P11_1c_SC_ASYMMETRICAL.md) — Skladowe symetryczne
- [proof_engine/P11_1d_PROOF_UI_EXPORT.md](./proof_engine/P11_1d_PROOF_UI_EXPORT.md) — Proof Inspector, eksport (CANONICAL)
- [proof_engine/P32_LOAD_FLOW_VOLTAGE_PROOF.md](./proof_engine/P32_LOAD_FLOW_VOLTAGE_PROOF.md) — Load Flow i spadki napiec (CANONICAL)
- [proof_engine/P14_PROOF_AUDIT_AND_COVERAGE.md](./proof_engine/P14_PROOF_AUDIT_AND_COVERAGE.md) — Proof Audit, Coverage Matrix (CANONICAL)
- [proof_engine/P15_LOAD_CURRENTS_OVERLOAD.md](./proof_engine/P15_LOAD_CURRENTS_OVERLOAD.md) — Prady robocze i przeciazenia (CANONICAL)
- [proof_engine/P17_LOSSES_ENERGY_PROFILE.md](./proof_engine/P17_LOSSES_ENERGY_PROFILE.md) — Energia strat (CANONICAL)
- [proof_engine/P18_PROTECTION_PROOF.md](./proof_engine/P18_PROTECTION_PROOF.md) — Zabezpieczenia nadpradowe (CANONICAL)
- [proof_engine/P20_NORMATIVE_COMPLETION.md](./proof_engine/P20_NORMATIVE_COMPLETION.md) — Normative Completion (CANONICAL)
- [proof_engine/P11_SC_CASE_MAPPING.md](./proof_engine/P11_SC_CASE_MAPPING.md) — Mapowanie Case zwarciowych (CANONICAL)
- [proof_engine/PROOF_SCHEMAS.md](./proof_engine/PROOF_SCHEMAS.md) — Schematy JSON (BINDING)
- [proof_engine/EQUATIONS_IEC60909_SC3F.md](./proof_engine/EQUATIONS_IEC60909_SC3F.md) — Rejestr rownan SC3F (BINDING)
- [proof_engine/EQUATIONS_VDROP.md](./proof_engine/EQUATIONS_VDROP.md) — Rejestr rownan VDROP (BINDING)

---

## Audit Reports

- [audit/spec_vs_code_gap_report.md](./audit/spec_vs_code_gap_report.md)
- [audit/STATE_OF_PROJECT.md](./audit/STATE_OF_PROJECT.md)

## Historical (Non-Canonical)

- [audit/historical_execplans/](./audit/historical_execplans/) — legacy ExecPlans
