# ADR-006: Separacja Warstwy Solvers od OSD i Regulacji

## Status

Accepted

## Kontekst

System MV-DESIGN-PRO musi obsługiwać zarówno czyste obliczenia fizyczne (zwarcia, rozpływy),
jak i przyszłą integrację z wymogami OSD (Operator Systemu Dystrybucyjnego) i regulacjami
kodeksowymi (NC RfG, IRiESD).

Istnieje ryzyko, że logika regulacyjna zostanie wpleciona w solvery, co:
1. Utrudni testowanie solverów (zależność od zewnętrznych parametrów regulacyjnych)
2. Skomplikuje audyt obliczeń fizycznych
3. Uniemożliwi wymianę/aktualizację regulacji bez modyfikacji solverów

## Decyzja

**Solvery NIE MOGĄ zawierać logiki OSD ani regulacji.**

### Zasady obowiązujące:

1. **Solvery zwracają tylko wyniki fizyczne:**
   - Prądy, napięcia, moce w jednostkach SI lub pu
   - White-box trace obliczeń
   - Informacje o zbieżności

2. **Interpretacja wyników należy do warstwy Analysis:**
   - Sprawdzanie limitów (violations)
   - Porównanie z progami regulacyjnymi

3. **Logika OSD należy do przyszłej warstwy Compliance:**
   - Weryfikacja zgodności z NC RfG
   - Sprawdzenie wymogów IRiESD
   - Generowanie raportów dla OSD

### Struktura katalogów:

```
backend/src/
├── network_model/solvers/     # Czyste obliczenia fizyczne
├── analysis/                   # Interpretacja (violations)
└── compliance/                 # OSD/Regulacje (PLACEHOLDER)
```

## Konsekwencje

### Pozytywne:
- Solvery są deterministyczne i łatwe do testowania
- White-box trace zawiera tylko fakty fizyczne
- Przyszłe zmiany regulacji nie wymagają modyfikacji solverów
- Audyt obliczeń jest prosty (solver robi tylko fizykę)

### Negatywne:
- Wymaga jasnego podziału kodu między warstwy
- Violations muszą być obliczane osobno (nie w solverze)
- Przyszła warstwa Compliance musi być zaprojektowana od zera

### Wyjątki:
- Power Flow w `analysis/power_flow/` zawiera violations jako overlay
  (uzasadnione w ADR-001) - jest to akceptowalne, ponieważ:
  - Violations są oddzielone od core algorytmu NR
  - Overlay specs są opcjonalne
  - White-box trace oddziela fizykę od interpretacji
