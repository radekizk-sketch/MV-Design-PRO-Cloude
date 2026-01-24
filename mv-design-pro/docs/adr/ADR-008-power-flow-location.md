# ADR-008: Lokalizacja Power Flow w `analysis/` zamiast `solvers/`

## Status

**Superseded by [`SYSTEM_SPEC.md`](../../SYSTEM_SPEC.md).**
This ADR is retained for historical context only.

## Kontekst (historyczny)
Power Flow był opisywany jako komponent w `analysis/power_flow/` ze względu na overlay specs
i interpretacyjne elementy (violations/limits).

## Aktualizacja (obowiązująca)
- **Power Flow jest solverem fizycznym** (bez interpretacji).
- **Lokalizacja w `analysis/` jest stanem AS-IS**, ale nie definiuje semantyki.
- Wszelkie decyzje architektoniczne dotyczące solver/case/analysis są w `SYSTEM_SPEC.md`.
