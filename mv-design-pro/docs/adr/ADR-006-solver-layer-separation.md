# ADR-006: Separacja Warstwy Solvers od OSD i Regulacji

## Status

**Superseded by [`SYSTEM_SPEC.md`](../../SYSTEM_SPEC.md).**
This ADR is retained for historical context only.

## Kontekst (historyczny)
System MV-DESIGN-PRO musi oddzielać czystą fizykę od interpretacji normowej,
aby zachować deterministyczne solvery i audytowalność wyników.

## Decyzja (historyczna)
- Solvery nie zawierają logiki OSD ani regulacji.
- Interpretacja wyników należy do warstwy analysis.

## Aktualizacja (obowiązująca)
- **Power Flow jest solverem fizycznym** (nie analysis).
- **Protection jest analysis** i **NOT IMPLEMENTED**.
- Definicje solver/case/analysis są zdefiniowane wyłącznie w `SYSTEM_SPEC.md`.
