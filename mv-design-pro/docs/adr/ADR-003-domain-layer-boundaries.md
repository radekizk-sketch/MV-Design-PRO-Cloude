# ADR-003: Warstwa domenowa i granice odpowiedzialności

## Status
Accepted

## Context
Industrializacja wymaga jawnej warstwy domenowej niezależnej od solverów, DB i UI.
Domena ma definiować obiekty Project/Network/Case/StudyRun oraz wspierać
walidacje, w tym spójne użycie terminu **„PCC – punkt wspólnego przyłączenia”**.

## Decision
Wprowadzamy warstwę `domain/` z podstawowymi encjami:
- `Project`, `Network`, `OperatingCase`, `StudyCase`, `Scenario`, `StudyRun`.
- `ValidationReport` z listą `ValidationIssue` zapewnia deterministyczny format walidacji.
- API domenowe jest niezależne od solverów i I/O, ale stanowi kontrakt
  dla warstwy aplikacyjnej (Network Wizard, StudyRunner).

## Consequences
- Warstwa domenowa staje się źródłem prawdy dla identyfikatorów i granic danych.
- Solvery pozostają bez zmian i bez zależności od DB/UI.
- Umożliwia to spójną industrializację w kolejnych PR-ach (DB, kreator, CLI).
