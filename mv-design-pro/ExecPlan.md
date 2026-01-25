# ExecPlan: PR-96 (v1) — Designer Completion: Usability + Determinism

> **Relationship to PLANS.md:** This is a feature-specific ExecPlan for PR-96 (Designer module).
> The canonical, system-wide PowerFactory alignment plan is documented in [PLANS.md](./PLANS.md).
> This ExecPlan follows the governance rules defined in [AGENTS.md](./AGENTS.md).

---

## WHAT IT IS
- Domknięcie modułu Projektanta (Designer) do stanu „v1 DONE”.
- Jawny, deterministyczny model stanu projektu (ProjectState) bez danych fizycznych.
- Spójne komunikaty ALLOWED/BLOCKED z kodami blokad i krótkimi opisami technicznymi.
- Walidacje jakościowe (bez norm) dla akcji: kompletność sieci, dostępność wyników solverów, obsługa akcji.
- Testy jednostkowe dla `can_run(action)` oraz `run(action)` bez mocków solverów.

## WHAT IT IS NOT
- Brak zmian w solverach, analysis, Result API ani Protection.
- Brak implementacji Protection i brak reguł normowych.
- Brak UI/UX oraz brak wymuszania kolejności działań (NO wizard).

## Architectural Alignment / Remediation
- **Solver ≠ Case ≠ Analysis** (SYSTEM_SPEC.md).
- **Power Flow = solver**, **Protection = analysis (NOT IMPLEMENTED)**.
- Projektant pozostaje constraint-based orchestrator bez obliczeń fizycznych.

## NOW (scope)
1) Rozszerzyć `application/designer` o:
   - `state.py` (ProjectState),
   - `messages.py` (kody i opisy blokad).
2) Ujednolicić `constraints.py`, `engine.py`, `context.py`, `errors.py`:
   - deterministyczne decyzje ALLOWED/BLOCKED z kodami.
   - brak ukrytego stanu.
3) Dodać testy jednostkowe modułu projektanta:
   - `can_run(action)`.
   - `run(action)`.

## LATER (out of scope)
- Integracja z UI lub API.
- Uruchamianie solverów lub analysis z poziomu Projektanta.
- Implementacja Protection lub interpretacji wyników.

## STAGES
1) Application: Designer (state, messages, constraints, engine, errors).
2) Validation: unit tests dla decyzji i uruchomienia.
