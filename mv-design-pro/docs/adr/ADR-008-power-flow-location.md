# ADR-008: Lokalizacja Power Flow w `analysis/` zamiast `solvers/`

## Status

Accepted (potwierdza ADR-001)

## Kontekst

Solver Power Flow jest zlokalizowany w `analysis/power_flow/` zamiast
`network_model/solvers/`. Ta decyzja może wydawać się niespójna z lokalizacją
IEC 60909 w `network_model/solvers/`.

Podczas audytu zidentyfikowano:
1. Puste katalogi `src/solvers/power_flow/` i `src/solvers/short_circuit/`
2. Power Flow zawiera overlay specs (violations, limits)
3. ADR-001 uzasadnia podejście overlay

## Decyzja

**Power Flow pozostaje w `analysis/power_flow/` ze względu na overlay pattern.**

### Uzasadnienie:

1. **Overlay specs** - Power Flow przyjmuje dodatkowe specyfikacje (PV, shunts, taps, limits)
   które NIE pochodzą z core model, ale są nakładane jako overlay:
   ```python
   @dataclass
   class PowerFlowInput:
       graph: NetworkGraph           # Z Core
       pv: list[PVSpec] = []         # Overlay
       shunts: list[ShuntSpec] = []  # Overlay
       bus_limits: list[...] = []    # Overlay
   ```

2. **Violations** - wynik zawiera interpretację (przekroczenia limitów)
   która wykracza poza czysty solver

3. **Spójność z ADR-001** - decyzja jest zgodna z wcześniejszym ADR

### Puste katalogi `src/solvers/`:

Katalogi `src/solvers/power_flow/` i `src/solvers/short_circuit/` są **placeholder'ami**
i powinny zostać usunięte lub oznaczone jako deprecated, aby uniknąć konfuzji.

### Alternatywa rozważana (odrzucona):

Przeniesienie Power Flow do `network_model/solvers/` z oddzieleniem violations:
- **Odrzucona** - wymagałoby znaczącej refaktoryzacji
- **Ryzyko regresji** - Power Flow działa poprawnie w obecnej lokalizacji

## Konsekwencje

### Pozytywne:

- Zgodność z ADR-001
- Overlay specs są jasno oddzielone
- Brak ryzyka regresji

### Negatywne:

- Dwie lokalizacje solverów (może mylić nowych developerów)
- Puste katalogi `src/solvers/` powodują konfuzję

### Działania:

- Dokumentacja jasno opisuje różnicę
- Puste katalogi `src/solvers/` powinny być usunięte w FAZA 1

## Powiązane

- [ADR-001](./ADR-001-power-flow-v2-overlay-vs-core.md) - oryginalna decyzja
- [ADR-006](./ADR-006-solver-layer-separation.md) - separacja solverów
