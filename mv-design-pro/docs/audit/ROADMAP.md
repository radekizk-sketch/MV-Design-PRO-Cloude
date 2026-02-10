# Roadmapa PR-owa (audit PF)

Zasada nadrzędna: **JEDEN PROBLEM = JEDEN PR**. Żadnych zmian solverów i zamrożonego Result API IEC 60909.

| PR-ID | Cel | Zakres | DoD | Ryzyko | Test plan | Pliki dotknięte |
|---|---|---|---|---|---|---|
| R01 (doc-only) | Audyt + indeks dokumentów + plan czyszczenia | `docs/audit/*`, `docs/INDEX.md`, ujednolicenie PL w wybranych docs | Nowe raporty audytu, spójny indeks, plan cleanup | Niskie | Brak (doc-only) | `docs/audit/STATE_OF_PROJECT.md`, `docs/audit/ROADMAP.md`, `docs/audit/DOC_CLEANUP_PLAN.md`, `docs/INDEX.md`, `docs/01-Core.md`, `docs/04-Application.md`, `docs/ui/sld_rules.md` |
| R02 (code+tests) | Egzekwowanie niezmienności Case (immutability) | Wzmocnienie reguł Case → NetworkModel (read-only) + walidacje | Case nie mutuje NetworkModel, testy regresji | Średnie | `pytest backend/tests/application/study_case/*` | `backend/src/domain/study_case.py`, `backend/src/application/study_case/*`, testy |
| R03 (code+tests) | Jedność Wizard/SLD (Single Model Rule) | Audyt i spięcie jednego źródła NetworkModel dla Wizard i SLD | Potwierdzenie jednej instancji modelu, brak shadow store | Średnie | `pytest backend/tests/application/sld/*` | `backend/src/application/network_model/*`, `backend/src/application/sld/*` |
| R04 (code+tests) | Uzupełnienie eksportów Power Flow | Dodanie PDF/DOCX dla PowerFlowResult (bez zmian solvera) | Eksport PF: JSON/JSONL/PDF/DOCX | Średnie | `pytest backend/tests/test_power_flow_export.py` + nowe testy PDF/DOCX | `backend/src/network_model/reporting/*` |
| R05 (code+tests) | Protection Overcurrent v0 — pełny pipeline | Domknięcie raportu, trace i DoD dla v0 | Status SUCCEEDED/DEGRADED, determinism, raport PL | Średnie | `pytest backend/tests/application/analyses/protection/*` | `backend/src/application/analyses/protection/overcurrent/*` |
| R06 (doc-only) | Ujednolicenie języka PL w kontraktach UI | Tłumaczenia i ujednolicenie terminologii | 100% PL w kontraktach UI | Niskie | Brak (doc-only) | `docs/ui/*.md` |
