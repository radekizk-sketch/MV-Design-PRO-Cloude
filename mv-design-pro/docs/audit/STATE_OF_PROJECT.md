# STATE_OF_PROJECT — Audyt stanu projektu (PF)

## A. Executive summary (1 strona)

**Status globalny:** rdzeń obliczeń (IEC 60909 + Power Flow) i warstwa katalogów są wdrożone z testami regresyjnymi. Warstwa dokumentacji UI jest rozbudowana i kanoniczna, ale wdrożenie UI/Wizard nie jest w pełni zweryfikowane pod kątem zgodności z PF. Eksporty wyników są pełne dla IEC 60909, natomiast Power Flow ma tylko JSON/JSONL. W obszarze Case/Scenario i ochrony nadprądowej istnieją częściowo zrealizowane pipeline’y, wymagające domknięcia.

**Top 5 ryzyk:**
1. **Niedomknięta niezmienność Case względem NetworkModel** — brak formalnego, egzekwowanego kontraktu read-only w całym workflow. (Dowód: PLANS.md, Task 4.1 jako DEFERRED.)
2. **Jedność Wizard/SLD (Single Model Rule) niezweryfikowana end-to-end** — brak dowodu integracyjnego, że obie warstwy edytują ten sam NetworkModel. (Dowód: PLANS.md, Phase 6 jako PENDING.)
3. **Eksport Power Flow bez PDF/DOCX** — brak parity z eksportami IEC 60909, ryzyko braków audytowych. (Dowód: brak generatorów PF PDF/DOCX w `backend/src/network_model/reporting/`.)
4. **Dokumentacja UI wciąż zawiera angielskie fragmenty w kontraktach** — ryzyko niespójności językowej i etykiet. (Dowód: `docs/ui/*`.)
5. **Protection (nadprądowe) jako pipeline wstępny** — obecny skeleton i v0, ale brak pełnego DoD oraz rozszerzeń PF-grade. (Dowód: `backend/src/application/analyses/protection/overcurrent/`.)

**Top 5 priorytetów:**
1. Domknięcie Case immutability + testy regresji.
2. Audyt i domknięcie jedności Wizard/SLD (Single Model Rule).
3. Eksport Power Flow do PDF/DOCX (doc-only + testy).
4. Porządkowanie i pełne tłumaczenie kontraktów UI na PL.
5. Domknięcie pipeline’u ochrony nadprądowej (v0 → PF-grade).

## B. Tabela stanu AS-IS (KANONICZNA)

| Obszar | Element | Status (DONE/IN-PROGRESS/GAP) | PF-parity (YES/PARTIAL/NO) | Dowód (konkretne pliki) | Testy (gdzie) | Uwagi techniczne |
|---|---|---|---|---|---|---|
| Model danych sieci | NetworkGraph + Bus/Branch/Transformer/Switch | IN-PROGRESS | PARTIAL | `backend/src/network_model/core/graph.py`, `backend/src/network_model/core/branch.py`, `backend/src/network_model/core/switch.py` | `backend/tests/test_branch.py` | Brak pełnej listy elementów PF (np. Station/Measurements); baza jest stabilna. |
| Katalog typów | Line/Cable/Transformer types (immutable) | DONE | PARTIAL | `backend/src/network_model/catalog/types.py`, `backend/src/network_model/catalog/repository.py` | `backend/tests/test_catalog_layer.py`, `backend/tests/network_model/catalog/test_resolver.py` | Determinizm i typy frozen. |
| PCC – punkt wspólnego przyłączenia | PCC jako warstwa interpretacji | DONE | YES | `backend/src/analysis/boundary/identifier.py`, `backend/src/application/analyses/boundary.py`, `backend/src/network_model/sld_projection.py` | `backend/tests/analysis/test_boundary_identifier.py`, `backend/tests/test_sld_projection.py` | PCC nie istnieje w NetworkModel. |
| IEC 60909 | Solver SC 3F/1F/2F/2F+G + white_box_trace | DONE | PARTIAL | `backend/src/network_model/solvers/short_circuit_iec60909.py` | `backend/tests/test_short_circuit_iec60909.py` | Pełny ślad white-box, brak zmian Result API. |
| IEC 60909 Result API | ShortCircuitResult + to_dict + white_box_trace | DONE | YES | `backend/src/network_model/solvers/short_circuit_iec60909.py` | `backend/tests/test_result_api_contract.py` | API zamrożone, kontrakty testowe. |
| Power Flow | Newton-Raphson solver + white_box_trace | DONE | PARTIAL | `backend/src/network_model/solvers/power_flow_newton.py` | `backend/tests/test_power_flow_v1.py`, `backend/tests/test_power_flow_v2.py` | PF-grade, ale bez pełnego eksportu PDF/DOCX. |
| Interpretacja PF | P22: interpretacja wyników PF | DONE | PARTIAL | `backend/src/analysis/power_flow_interpretation/builder.py` | `backend/tests/analysis/test_power_flow_interpretation_p22.py` | Deterministyczna interpretacja, PL opisy. |
| Eksport SC | JSON/JSONL + DOCX/PDF | DONE | YES | `backend/src/network_model/reporting/short_circuit_export.py`, `backend/src/network_model/reporting/short_circuit_report_docx.py`, `backend/src/network_model/reporting/short_circuit_report_pdf.py` | `backend/tests/test_short_circuit_report_docx.py`, `backend/tests/test_short_circuit_report_pdf.py` | Eksporty zgodne z Result API. |
| Eksport PF | JSON/JSONL | IN-PROGRESS | PARTIAL | `backend/src/network_model/reporting/power_flow_export.py` | `backend/tests/test_power_flow_export.py` | Brak PDF/DOCX. |
| Proof Engine | P11 SC3F + VDROP | DONE | PARTIAL | `backend/src/application/proof_engine/proof_generator.py`, `backend/src/application/proof_engine/equation_registry.py`, `docs/proof_engine/*` | `backend/tests/proof_engine/test_proof_engine.py`, `backend/tests/proof_engine/test_inspector.py` | Bez zmian solverów, pełny trace dowodowy. |
| Wizard/UI | Kontrakty UI + Wizard (doc-only) | IN-PROGRESS | PARTIAL | `docs/ui/wizard_screens.md`, `docs/ui/sld_rules.md`, `docs/ui/SLD_UI_CONTRACT.md` | — | Dokumentacja pełna, ale brak pełnego potwierdzenia wdrożenia UI. |
| Protection (nadprądowe) | Pipeline skeleton + v0 | IN-PROGRESS | NO | `backend/src/application/analyses/protection/overcurrent/` | `backend/tests/application/analyses/protection/*` | Wymaga domknięcia DoD i walidacji PF-grade. |
| Case / Scenario | Case immutability, katalog przypadków | GAP | NO | `PLANS.md` (Phase 4 Task 4.1, 4.3) | — | Brak egzekwowanego kontraktu niezmienności. |
| Wizard/SLD unity | Single Model Rule | GAP | NO | `PLANS.md` (Phase 6) | — | Brak pełnego audytu i testów integracyjnych. |

## C. Co jest “DONE 100%”

Poniższe obszary spełniają kryteria: implementacja + testy + dokumentacja kontraktu + determinism.

1. **Result API IEC 60909 (ShortCircuitResult + white_box_trace)**
   - Implementacja: `backend/src/network_model/solvers/short_circuit_iec60909.py`.
   - Testy kontraktowe: `backend/tests/test_result_api_contract.py`.
   - Dokumentacja kontraktowa: `docs/02-Solvers.md` + `SYSTEM_SPEC.md`.

2. **Eksporty SC (JSON/JSONL/DOCX/PDF)**
   - Implementacja: `backend/src/network_model/reporting/short_circuit_export.py`, `short_circuit_report_docx.py`, `short_circuit_report_pdf.py`.
   - Testy: `backend/tests/test_short_circuit_report_docx.py`, `backend/tests/test_short_circuit_report_pdf.py`.
   - Determinizm: sort_keys + stabilny format.

3. **Proof Engine P11 (SC3F + VDROP) — dokumentacja i testy**
   - Implementacja: `backend/src/application/proof_engine/*`.
   - Testy: `backend/tests/proof_engine/test_proof_engine.py`, `backend/tests/proof_engine/test_inspector.py`.
   - Dokumentacja kanoniczna: `docs/proof_engine/*`.

## D. GAPs i dług techniczny

1. **Case immutability i relacja Case → NetworkModel** (PRI: HIGH)
   - Wpływ: ryzyko naruszenia Single Model Rule i błędów deterministycznych.
   - Naprawa: egzekwowanie read-only w warstwie application, testy regresji.
   - Dowód: `PLANS.md` Phase 4 Task 4.1 (DEFERRED).

2. **Wizard/SLD unity (Single Model Rule)** (PRI: HIGH)
   - Wpływ: ryzyko shadow store i rozjazdów między UI.
   - Naprawa: audyt przepływu danych + testy integracyjne.
   - Dowód: `PLANS.md` Phase 6 (PENDING).

3. **Eksport Power Flow do PDF/DOCX** (PRI: MED)
   - Wpływ: brak pełnej audytowalności wyników PF.
   - Naprawa: generator PDF/DOCX analogiczny do SC, bez zmian solvera.

4. **Ujednolicenie języka PL w dokumentacji UI** (PRI: MED)
   - Wpływ: niespójność terminologii i etykiet.
   - Naprawa: tłumaczenie kontraktów UI i konsekwentne nazewnictwo PL.

5. **Protection Overcurrent v0 → PF-grade** (PRI: MED)
   - Wpływ: brak pełnej warstwy ochrony nadprądowej.
   - Naprawa: doprecyzowanie DoD, walidacje i determinism.

## E. Zgodność z ustaleniami projektu

- **Zamrożone API IEC 60909:** zachowane (ShortCircuitResult, `to_dict`, `white_box_trace`).
- **ExecPlans:** repo korzysta z `PLANS.md` jako mechanizmu zmian.
- **Język PL + PCC – punkt wspólnego przyłączenia:** dokumentacja wymaga pełnego ujednolicenia (patrz GAP #4).
- **BoundaryIdentifier:** PCC – punkt wspólnego przyłączenia w warstwie analizy, nie w NetworkModel.

## F. Rekomendacje PR-owe

Zob. `docs/audit/ROADMAP.md` — lista małych PR-ów zgodnie z zasadą **JEDEN PROBLEM = JEDEN PR**.
