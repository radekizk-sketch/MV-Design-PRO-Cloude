```md
Living Document Declaration: This ExecPlan is a controlled, versioned specification. It must be updated whenever assumptions, boundaries, or invariants change, and it enables a zero-context restart by any engineer.

# ExecPlan-16: Architectural CI Guard (lint architektury)

## Purpose / Big Picture
Wprowadzić automatyczny CI guard egzekwujący kanoniczne granice solver / analysis / case zgodnie z SYSTEM_SPEC.md i architektem systemu.

## Progress
- [ ] (INIT) Zdefiniować reguły importów w skrypcie arch_guard.py.
- [ ] Dodać job GitHub Actions uruchamiany na push i pull_request.
- [ ] Udokumentować guard w REPOSITORY-HYGIENE (krótka sekcja).

## Surprises & Discoveries
(None.)

## Decision Log
- Decision: Egzekwować granice warstw przez AST-based import guard.
  Rationale: Najprostszy, deterministyczny mechanizm zgodności bez zmian w logice aplikacji.
  Date/Author: 2026-01 / System Architecture

## What This Plan IS / IS NOT

IS:
- Minimalny CI guard sprawdzający zakazane importy wg kanonicznych reguł.
- Dodanie workflow CI uruchamianego przy push i pull_request.

IS NOT:
- Refaktoryzacja solverów/analysis/case.
- Zmiana API, algorytmów lub wyników.
- Linter stylu lub formatowania.

## Plan of Work (Small PR)
1) Dodać `scripts/arch_guard.py` (stdlib-only, AST, fail-fast).
2) Dodać `.github/workflows/arch-guard.yml`.
3) Dodać krótką notę w `docs/REPOSITORY-HYGIENE.md`.

## Acceptance
- CI failuje, jeśli solver importuje analysis/protection.
- CI failuje, jeśli analysis (w tym analysis/protection) importuje solvers.
- Brak zmian w kodzie aplikacyjnym.
```
