# Solvers — Notes (Operational)

> **Canonical definitions live in** [`SYSTEM_SPEC.md`](../SYSTEM_SPEC.md).
> This document is a practical orientation guide and avoids architectural decisions.

## 1. Where solvers live (as-is)
- **IEC 60909 short-circuit solver:**
  - `backend/src/network_model/solvers/short_circuit_iec60909.py`
- **Power Flow Newton-Raphson solver:**
  - `backend/src/network_model/solvers/power_flow_newton.py`
  - `backend/src/network_model/solvers/power_flow_newton_internal.py`
- **Power Flow Gauss-Seidel solver (FIX-08):**
  - `backend/src/network_model/solvers/power_flow_gauss_seidel.py`
- **Analysis layer wrapper:**
  - `backend/src/analysis/power_flow/`

> **Note:** All physics solvers live in `network_model/solvers/`.
> The analysis layer wraps solvers and adds interpretation.

## 2. Operational conventions
- **Do not change** frozen Result APIs (IEC 60909).
- **White-box trace** must remain explicit and auditable.
- Keep solver changes deterministic and traceable.

## 3. Adding or updating solver documentation
- Document only **operational steps** here (e.g., how to run a solver, how to locate inputs/outputs).
- All solver semantics and boundary decisions belong in `SYSTEM_SPEC.md`.

## 4. Power Flow: Gauss-Seidel vs Newton-Raphson

### Comparison Table

| Kryterium | Gauss-Seidel | Newton-Raphson |
|-----------|:------------:|:--------------:|
| Szybkość zbieżności | ❌ Wolna (liniowa) | ✔️ Szybka (kwadratowa) |
| Stabilność | ⚠️ Może nie zbiegać się | ✔️ Stabilna dla większości sieci |
| White-Box trace | ✔️ Pełny | ✔️ Pełny |
| Zalecane do produkcji | ❌ | ✔️ |
| Zastosowanie edukacyjne | ✔️ | ⚠️ Bardziej skomplikowany |
| Weryfikacja wyników NR | ✔️ | — |

### Kiedy używać Gauss-Seidel?

1. **Edukacja i nauka** — prosty algorytm, łatwy do zrozumienia
2. **Weryfikacja wyników** — porównanie z Newton-Raphson (cross-check)
3. **Trudne przypadki zbieżności** — czasem GS z under-relaxation może pomóc
4. **Szybkie szacunki** — pierwsza iteracja GS daje przybliżone wyniki

### Kiedy używać Newton-Raphson?

1. **Produkcja** — standardowy solver dla wszystkich obliczeń
2. **Duże sieci** — GS zbyt wolny dla sieci > 50 węzłów
3. **Wymagana dokładność** — NR daje wyniki w mniejszej liczbie iteracji

### Przykład użycia Gauss-Seidel

```python
from network_model.solvers.power_flow_gauss_seidel import (
    GaussSeidelOptions,
    solve_power_flow_gauss_seidel,
)

# Opcje GS z przyspieszeniem (SOR)
gs_options = GaussSeidelOptions(
    acceleration_factor=1.5,  # Zakres: 0.5-2.0
    allow_fallback=True,      # Fallback do NR przy braku zbieżności
    max_iter=100,
    tolerance=1e-6,
)

result = solve_power_flow_gauss_seidel(pf_input, gs_options)

# Sprawdź, która metoda została użyta
print(result.solver_method)  # "gauss-seidel" lub "newton-raphson" (fallback)

if result.fallback_info:
    print(f"Użyto fallback: {result.fallback_info['fallback_used']}")
```

### Współczynnik przyspieszenia (acceleration_factor)

| Wartość | Nazwa metody | Zastosowanie |
|---------|--------------|--------------|
| 0.5 - 1.0 | Under-relaxation | Większa stabilność, wolniejsza zbieżność |
| 1.0 | Standard GS | Klasyczna metoda Gaussa-Seidla |
| 1.0 - 2.0 | Over-relaxation (SOR) | Szybsza zbieżność dla dobrze uwarunkowanych sieci |

**Typowa optymalna wartość:** 1.4 - 1.8 dla większości sieci.
