# ExecPlan: RunIndex (analysis_runs) — globalny indeks uruchomień + read API

## WHAT IT IS
- Minimalny PR dodający globalny indeks uruchomień analiz (analysis_runs) oraz read API umożliwiające pobranie envelope po samym run_id i listowanie uruchomień.
- Zapis RunIndex dla DesignSynth po wykonaniu analizy, bez zmian w solverach i Result API.

## WHAT IT IS NOT
- Brak zmian w solverach fizyki, brak zmian w Result API.
- Brak nowych zależności, brak re-eksportów w __init__.py, brak side-effect importów.
- Brak pełnej persystencji dla IEC 60909 (tylko jeśli już istnieje).

## Architectural Alignment / Remediation
- Rozstrzygnięcie: **Power Flow = solver** (fizyka, brak interpretacji).
- Rozstrzygnięcie: **Protection = analysis (NOT IMPLEMENTED)**.
- Zakres naprawy: **dokumentacja + semantyka** (bez zmian w kodzie).
- Poza zakresem: refaktoryzacje solverów, zmiany API, implementacja Protection.

### Definition of Done (DoD)
- Jedna specyfikacja kanoniczna (SYSTEM_SPEC.md).
- Brak sprzeczności w dokumentacji.
- Jednoznaczny podział solver / case / analysis.

## NOW (scope)
1) Dodać migrację i ORM dla tabeli analysis_runs.
2) Dodać repozytorium AnalysisRunRepository i dostęp w UnitOfWork.
3) Dodać application run_index (dataclass + index_run helper).
4) Zapisać RunIndex dla DesignSynth po udanym uruchomieniu.
5) Dodać read API: GET /analysis-runs/{run_id} oraz GET /analysis-runs.
6) Dodać testy API dla run index i uruchomić pytest -q.

## LATER (out of scope)
- Rozszerzenie indeksowania na IEC 60909, jeśli brak persystencji.
- Dalsze metadane i rozszerzone filtrowanie.
- Zmiany w solverach lub w Result API.

## STAGES
1) Persistence: migracja + ORM + repo + UoW.
2) Application: run_index helper + integracja DesignSynth.
3) API: nowe endpointy.
4) Tests: testy API + determinism helpers.
5) Validation: pytest -q.
