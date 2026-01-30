# Indeks dokumentów (kanoniczny)

**Cel:** jednolity spis dokumentów, ich ról oraz statusu (BINDING / guidance).

## 1. Dokumenty BINDING (wiążące)

- `SYSTEM_SPEC.md` — specyfikacja architektury i zasad systemu (BINDING).
- `AGENTS.md` — zasady governance, warstwy i zakazy (BINDING).
- `PLANS.md` — jedyny mechanizm wykonawczy (ExecPlans) i status prac (BINDING).
- `POWERFACTORY_COMPLIANCE.md` — checklisty zgodności PF (BINDING).
- `docs/INDEX.md` — indeks źródeł P14–P19 (BINDING, zgodnie z AGENTS.md).

## 2. Dokumenty referencyjne (guidance)

- `ARCHITECTURE.md` — architektura szczegółowa (REFERENCE).
- `README.md` — przegląd repozytorium (REFERENCE).
- `docs/00-System-Overview.md` — kontekst systemu (REFERENCE).
- `docs/01-Core.md` — warstwa Core (REFERENCE).
- `docs/02-Solvers.md` — warstwa solverów (REFERENCE).
- `docs/03-Analyses.md` — warstwa analiz (REFERENCE).
- `docs/04-Application.md` — warstwa application (REFERENCE).

## 3. Single Source of Truth (SSOT)

### 3.1 IEC 60909 — wyniki i trace

- **API wyników:** `backend/src/network_model/solvers/short_circuit_iec60909.py` (ShortCircuitResult + `to_dict` + `white_box_trace`).
- **Kontrakty i testy stabilności:** `backend/tests/test_result_api_contract.py`.
- **Zasady i audit dowodu:** `docs/proof_engine/README.md`, `docs/proof_engine/PROOF_SCHEMAS.md`, `docs/proof_engine/EQUATIONS_IEC60909_SC3F.md`.

### 3.2 P11 / P14–P17 (Proof Engine)

- **P11 (SC3F/VDROP):** `docs/proof_engine/P11_1a_MVP_SC3F_AND_VDROP.md`.
- **Schematy i registry:** `docs/proof_engine/PROOF_SCHEMAS.md`, `docs/proof_engine/EQUATIONS_IEC60909_SC3F.md`, `docs/proof_engine/EQUATIONS_VDROP.md`.
- **P14–P17 (kanon przyszłych pakietów):** `docs/INDEX.md` + sekcje TODO w `SYSTEM_SPEC.md`, `ARCHITECTURE.md`, `POWERFACTORY_COMPLIANCE.md`, `PLANS.md`.

### 3.3 UI/Wizard — zasady i kontrakty

- **Ekrany i workflow:** `docs/ui/wizard_screens.md` (KANONICZNY).
- **Zasady SLD:** `docs/ui/sld_rules.md` (KANONICZNY).
- **Kontrakty UI:** `docs/ui/SLD_UI_CONTRACT.md`, `docs/ui/RESULTS_BROWSER_CONTRACT.md`, `docs/ui/ELEMENT_INSPECTOR_CONTRACT.md`, `docs/ui/CASE_COMPARISON_UI_CONTRACT.md`.

## 4. Dokumenty audytowe

- `docs/audit/STATE_OF_PROJECT.md` — kanoniczny raport stanu projektu.
- `docs/audit/ROADMAP.md` — roadmapa PR-owa (JEDEN PROBLEM = JEDEN PR).
- `docs/audit/DOC_CLEANUP_PLAN.md` — plan porządkowania dokumentacji.
- `docs/audit/spec_vs_code_gap_report.md` — historyczny raport zgodności spec vs code.
