# ADR-001: Power Flow v2 - overlay specs vs core model

## Status

**Superseded by [`SYSTEM_SPEC.md`](../../SYSTEM_SPEC.md).**
This ADR is retained for historical context only.

## Kontekst (historyczny)
Power Flow v2 rozszerzał PF v1 o dodatkowe specyfikacje (PV, shunts, taps, limits)
traktowane jako overlay względem core modelu.

## Aktualizacja (obowiązująca)
- **Power Flow jest solverem fizycznym** i nie zawiera interpretacji.
- Semantyka solver/case/analysis jest zdefiniowana wyłącznie w `SYSTEM_SPEC.md`.
