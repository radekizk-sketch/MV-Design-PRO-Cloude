# ExecPlan: PR-95 (v2) — Designer Module: Action + Constraints

## WHAT IT IS
- Minimalny moduł Projektanta (Designer) oparty na akcjach, który pozwala użytkownikowi wybrać co uruchomić.
- Jawne, deterministyczne ograniczenia (can_run) dla akcji: Short-Circuit, Power Flow, Analysis.
- Brak ingerencji w solvery i analysis; Projektant nie liczy fizyki ani nie interpretuje wyników.

## WHAT IT IS NOT
- Brak zmian w solverach, analysis, Result API, ani Protection.
- Brak wizardowej sekwencji kroków i brak wymuszania kolejności uruchomień.
- Brak UI i brak integracji z warstwą frontend.

## Architectural Alignment / Remediation
- **Solver ≠ Case ≠ Analysis** (zgodnie z SYSTEM_SPEC.md).
- **Power Flow = solver**, **Protection = analysis (NOT IMPLEMENTED)**.
- Projektant jest constraint-based orchestrator, nie wizard.

## NOW (scope)
1) Dodać moduł application/designer z:
   - definicjami akcji,
   - ProjectContext,
   - regułami can_run (constraints),
   - silnikiem run(action).
2) Zapewnić statusy ALLOWED/BLOCKED z jednoznacznym powodem blokady.
3) Zapewnić, że Run Analysis jest jawnie NOT IMPLEMENTED przy wywołaniu run.

## LATER (out of scope)
- Integracja z UI lub API.
- Uruchamianie solverów lub analysis z poziomu Projektanta.
- Implementacja Protection lub interpretacji wyników.

## STAGES
1) Application: moduł Projektanta (actions, context, constraints, engine, errors).
2) Validation: szybka kontrola jakości (lint/manual review) bez zmian w solverach.
