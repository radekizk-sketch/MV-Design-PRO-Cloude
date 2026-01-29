# Documentation Index

## Canonical (Binding / Reference)
- [SYSTEM_SPEC.md](../SYSTEM_SPEC.md) — Canonical system specification (BINDING)
- [ARCHITECTURE.md](../ARCHITECTURE.md) — Detailed architecture (REFERENCE)
- [AGENTS.md](../AGENTS.md) — Governance rules (BINDING)
- [PLANS.md](../PLANS.md) — Active execution plan (LIVING)
- [POWERFACTORY_COMPLIANCE.md](../POWERFACTORY_COMPLIANCE.md) — Compliance checklist

## Operational Guides
- [00-System-Overview.md](./00-System-Overview.md)
- [01-Core.md](./01-Core.md)
- [02-Solvers.md](./02-Solvers.md)
- [03-Analyses.md](./03-Analyses.md)
- [04-Application.md](./04-Application.md)
- [docs/analysis/SENSITIVITY_ANALYSIS_ETAP_PLUS.md](./analysis/SENSITIVITY_ANALYSIS_ETAP_PLUS.md) — **P25: Sensitivity & margin analysis (ETAP++)**
- [docs/architecture/STUDY_SCENARIO_WORKFLOW_ETAP_PLUS.md](./architecture/STUDY_SCENARIO_WORKFLOW_ETAP_PLUS.md) — **P23: Study/Scenario/Run workflow (ETAP++)**
- [GO-LIVE-CHECKLIST.md](./GO-LIVE-CHECKLIST.md)
- [REPOSITORY-HYGIENE.md](./REPOSITORY-HYGIENE.md)
- [ROADMAP.md](./ROADMAP.md)

## UI / UX (PowerFactory Parity)
- [docs/ui/powerfactory_ui_parity.md](./ui/powerfactory_ui_parity.md)
- [docs/ui/wizard_screens.md](./ui/wizard_screens.md)
- [docs/ui/sld_rules.md](./ui/sld_rules.md)
- [docs/ui/SLD_UI_CONTRACT.md](./ui/SLD_UI_CONTRACT.md) — **Kontrakty UI: Priority Stack, Dense SLD, Semantic Color, Print-First, Interaction (CANONICAL)**
- [docs/ui/SLD_SCADA_CAD_CONTRACT.md](./ui/SLD_SCADA_CAD_CONTRACT.md) — **SCADA SLD + CAD overlay: kontrakt widoku (CANONICAL)**
- [docs/ui/SLD_SHORT_CIRCUIT_BUS_CENTRIC.md](./ui/SLD_SHORT_CIRCUIT_BUS_CENTRIC.md) — **Prezentacja wyników zwarciowych: BUS-centric, Case MAX/MIN/N-1 (CANONICAL)**
- [docs/ui/SHORT_CIRCUIT_PANELS_AND_PRINTING.md](./ui/SHORT_CIRCUIT_PANELS_AND_PRINTING.md) — **Panele zwarciowe, porównawcze, wydruk PDF/DOCX (CANONICAL)**

### UI Eksploracji Wyników i Inspekcji Elementów (ETAP / PowerFactory Grade)
- [docs/ui/RESULTS_BROWSER_CONTRACT.md](./ui/RESULTS_BROWSER_CONTRACT.md) — **Results Browser: drzewo wyników, tabele, porównania Case/Snapshot, eksport (CANONICAL)**
- [docs/ui/VOLTAGE_PROFILE_BUS_CONTRACT.md](./ui/VOLTAGE_PROFILE_BUS_CONTRACT.md) — **Profil napięciowy (BUS-centric): tabela napięć per BUS, progi PASS/WARNING/FAIL, determinism (CANONICAL)**
- [docs/ui/PROTECTION_INSIGHT_CONTRACT.md](./ui/PROTECTION_INSIGHT_CONTRACT.md) — **Zabezpieczenia: analiza selektywności i rezerwowości (P22a) — bez krzywych I–t (CANONICAL)**
- [docs/ui/PROTECTION_CURVES_IT_SUPERIOR_CONTRACT.md](./ui/PROTECTION_CURVES_IT_SUPERIOR_CONTRACT.md) — **Krzywe czasowo-prądowe I–t (C-P22) — ETAP++ (CANONICAL)**
- [docs/ui/PDF_REPORT_SUPERIOR_CONTRACT.md](./ui/PDF_REPORT_SUPERIOR_CONTRACT.md) — **Raport PDF P24+ (ETAP+): determinism, jawna ścieżka decyzyjna (CANONICAL)**
- [docs/ui/ELEMENT_INSPECTOR_CONTRACT.md](./ui/ELEMENT_INSPECTOR_CONTRACT.md) — **Element Inspector: zakładki (Overview, Parameters, Results, Contributions, Limits, Proof P11), multi-case view (CANONICAL)**
- [docs/ui/EXPERT_MODES_CONTRACT.md](./ui/EXPERT_MODES_CONTRACT.md) — **Expert Modes: Operator, Designer, Analyst, Auditor — NO SIMPLIFICATION RULE (CANONICAL)**
- [docs/ui/GLOBAL_CONTEXT_BAR.md](./ui/GLOBAL_CONTEXT_BAR.md) — **Global Context Bar: sticky top bar, drukowany w nagłówku PDF (CANONICAL)**
- [docs/ui/UI_ETAP_POWERFACTORY_PARITY.md](./ui/UI_ETAP_POWERFACTORY_PARITY.md) — **UI Parity Matrix: MV-DESIGN-PRO vs ETAP vs PowerFactory (47 FULL, 35 SUPERIOR) (CANONICAL)**
- [docs/ui/SWITCHING_STATE_EXPLORER_CONTRACT.md](./ui/SWITCHING_STATE_EXPLORER_CONTRACT.md) — **Switching State Explorer: eksploracja stanów łączeniowych (OPEN/CLOSED), algorytmiczna identyfikacja Islands (graph traversal), Topology Checks (pre-solver validation), integracje SLD/Inspector/Results/Tree (CANONICAL)**

### UI PF++ (Phase 2.x) — Eksploracja i Kontrola
- [docs/ui/SLD_RENDER_LAYERS_CONTRACT.md](./ui/SLD_RENDER_LAYERS_CONTRACT.md) — **SLD Render Layers: CAD vs SCADA, tryby CAD/SCADA/HYBRID (CANONICAL)**
- [docs/ui/TOPOLOGY_TREE_CONTRACT.md](./ui/TOPOLOGY_TREE_CONTRACT.md) — **Topology Tree: hierarchia Project→Station→VoltageLevel→Element, Single Global Focus (CANONICAL)**
- [docs/ui/SC_NODE_RESULTS_CONTRACT.md](./ui/SC_NODE_RESULTS_CONTRACT.md) — **SC Node Results: wyniki zwarciowe WYŁĄCZNIE per BUS, IEC 60909 (CANONICAL)**
- [docs/ui/CATALOG_BROWSER_CONTRACT.md](./ui/CATALOG_BROWSER_CONTRACT.md) — **Catalog Browser: Type→Instances, pasywne elementy TYLKO (CANONICAL)**
- [docs/ui/CASE_COMPARISON_UI_CONTRACT.md](./ui/CASE_COMPARISON_UI_CONTRACT.md) — **Case Comparison: A vs B vs C, Delta, WHY Panel, SLD Overlay (CANONICAL)**

## Proof Engine (P11) — Canonical Knowledge Pack
- [docs/proof_engine/README.md](./proof_engine/README.md) — Pakiet kanoniczny (BINDING)
- [docs/proof_engine/P11_OVERVIEW.md](./proof_engine/P11_OVERVIEW.md) — TraceArtifact, inwarianty, UX
- [docs/proof_engine/P11_1a_MVP_SC3F_AND_VDROP.md](./proof_engine/P11_1a_MVP_SC3F_AND_VDROP.md) — MVP: SC3F + VDROP
- [docs/proof_engine/P11_1b_REGULATION_Q_U.md](./proof_engine/P11_1b_REGULATION_Q_U.md) — Regulatory Q(U), cosφ(P)
- [docs/proof_engine/P11_1c_SC_ASYMMETRICAL.md](./proof_engine/P11_1c_SC_ASYMMETRICAL.md) — Składowe symetryczne (SKELETON)
- [docs/proof_engine/P11_1d_PROOF_UI_EXPORT.md](./proof_engine/P11_1d_PROOF_UI_EXPORT.md) — **Proof Inspector (CANONICAL): read-only viewer, eksport JSON/LaTeX/PDF/DOCX**
- [docs/proof_engine/P14_PROOF_AUDIT_AND_COVERAGE.md](./proof_engine/P14_PROOF_AUDIT_AND_COVERAGE.md) — **P14: Proof Audit, Coverage Matrix (CANONICAL, META)**
- [docs/proof_engine/P15_LOAD_CURRENTS_OVERLOAD.md](./proof_engine/P15_LOAD_CURRENTS_OVERLOAD.md) — **P15: Prądy robocze i przeciążenia (CANONICAL)**
- [docs/proof_engine/P17_LOSSES_ENERGY_PROFILE.md](./proof_engine/P17_LOSSES_ENERGY_PROFILE.md) — **P17: Energia strat (profil czasowy) (CANONICAL)**
- [docs/proof_engine/P18_PROTECTION_PROOF.md](./proof_engine/P18_PROTECTION_PROOF.md) — **P18: Zabezpieczenia nadprądowe i selektywność (CANONICAL)**
- [docs/proof_engine/P20_NORMATIVE_COMPLETION.md](./proof_engine/P20_NORMATIVE_COMPLETION.md) — **P20: Normative Completion (PASS/FAIL) (CANONICAL)**
- [docs/proof_engine/P11_SC_CASE_MAPPING.md](./proof_engine/P11_SC_CASE_MAPPING.md) — **Mapowanie Case zwarciowych (MAX/MIN/N-1) na ProofDocument: trace_id, snapshot, anti-double-counting (CANONICAL)**
- [docs/proof_engine/PROOF_SCHEMAS.md](./proof_engine/PROOF_SCHEMAS.md) — Schematy JSON (BINDING)
- [docs/proof_engine/EQUATIONS_IEC60909_SC3F.md](./proof_engine/EQUATIONS_IEC60909_SC3F.md) — Rejestr równań SC3F (BINDING)
- [docs/proof_engine/EQUATIONS_VDROP.md](./proof_engine/EQUATIONS_VDROP.md) — Rejestr równań VDROP (BINDING)

## Proof Packs P14–P19 (FUTURE) — Canonical Sources (doc-only)
- [PLANS.md](../PLANS.md) — TODO backlog P14–P19 (CANONICAL SOURCES)
- [SYSTEM_SPEC.md](../SYSTEM_SPEC.md) — sekcje TODO P14–P19 (CANONICAL SOURCES)
- [ARCHITECTURE.md](../ARCHITECTURE.md) — sekcje TODO P14–P19 (CANONICAL SOURCES)
- [POWERFACTORY_COMPLIANCE.md](../POWERFACTORY_COMPLIANCE.md) — checklisty P14–P19 (CANONICAL SOURCES)
- [AGENTS.md](../AGENTS.md) — reguły + TODO P14–P19 (CANONICAL SOURCES)
- [docs/proof_engine/README.md](./proof_engine/README.md) — reguły Proof Engine + TODO P14–P19 (CANONICAL SOURCES)
- [docs/proof_engine/P11_OVERVIEW.md](./proof_engine/P11_OVERVIEW.md) — TODO P14–P19 (CANONICAL SOURCES)
- [docs/proof_engine/P11_1a_MVP_SC3F_AND_VDROP.md](./proof_engine/P11_1a_MVP_SC3F_AND_VDROP.md) — TODO P14–P19 (CANONICAL SOURCES)
- [docs/proof_engine/P11_1b_REGULATION_Q_U.md](./proof_engine/P11_1b_REGULATION_Q_U.md) — TODO P14–P19 (CANONICAL SOURCES)
- [docs/proof_engine/P11_1c_SC_ASYMMETRICAL.md](./proof_engine/P11_1c_SC_ASYMMETRICAL.md) — TODO P14–P19 (CANONICAL SOURCES)
- [docs/proof_engine/P11_1d_PROOF_UI_EXPORT.md](./proof_engine/P11_1d_PROOF_UI_EXPORT.md) — TODO P14–P19 (CANONICAL SOURCES)
- [docs/proof_engine/PROOF_SCHEMAS.md](./proof_engine/PROOF_SCHEMAS.md) — TODO P14–P19 (CANONICAL SOURCES)

## Audit Reports
- [docs/audit/spec_vs_code_gap_report.md](./audit/spec_vs_code_gap_report.md)

## Historical (Non-Canonical)
- [docs/audit/historical_execplans/](./audit/historical_execplans/) — legacy ExecPlans

## TODO — Proof Packs P14–P19 (FUTURE PACKS)

### TODO-P14-001 (PLANNED) — P14: Power Flow Proof Pack (audit wyników PF) [FUTURE PACK]
- Priority: MUST
- Inputs: TraceArtifact, PowerFlowResult
- Output: ProofPack P14 (ProofDocument: Audit rozpływu mocy)
- DoD:
  - [ ] Dowód bilansu węzła dla mocy czynnej i biernej z mapowaniem do TraceArtifact.

    $$
    \sum P = 0,\quad \sum Q = 0
    $$

  - [ ] Bilans gałęzi dla mocy czynnej i biernej uwzględnia straty oraz spadek napięcia.

    $$
    P_{in} \rightarrow P_{out} + P_{loss},\quad Q_{in} \rightarrow Q_{out} + \Delta U
    $$

  - [ ] Straty linii liczone jawnie z prądu i rezystancji.

    $$
    P_{loss} = I^{2} \cdot R
    $$

  - [ ] Porównanie counterfactual Case A vs Case B z raportem różnic.

    $$
    \Delta P,\ \Delta Q,\ \Delta U
    $$

### TODO-P16-001 (PLANNED) — P16: Losses & Energy Proof Pack [FUTURE PACK]
- Priority: MUST
- Inputs: TraceArtifact, PowerFlowResult, Catalog
- Output: ProofPack P16 (ProofDocument: Straty mocy i energii)
- DoD:
  - [ ] Straty linii wyprowadzone z prądu i rezystancji.

    $$
    P_{loss,line} = I^{2} \cdot R
    $$

  - [ ] Straty transformatora z danych katalogowych: suma P0 i Pk.

    $$
    P_{loss,trafo} = P_{0} + P_{k}
    $$

  - [ ] Energia strat z profilu obciążenia (integracja w czasie).

    $$
    E_{loss} = \int P_{loss} \, dt
    $$

### P17 — Losses Energy Profile Proof Pack (IMPLEMENTED)
- Priority: MUST
- Inputs: TraceArtifact, PowerFlowResult, Catalog
- Output: ProofPack P17 (ProofDocument: Energia strat — profil czasowy)
- DoD (DONE):
  - [x] Energia strat z profilu obciążenia w postaci sumy dyskretnej.
  - [x] Wariant stały dla stałej mocy strat i czasu trwania.
  - [x] Deterministyczny ProofDocument z pełną weryfikacją jednostek.
