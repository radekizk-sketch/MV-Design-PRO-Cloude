# ADR-007: IEC 60909 jako Zamrożony Wzorzec

## Status

Accepted

## Kontekst

Solver zwarciowy IEC 60909 (`network_model/solvers/short_circuit_iec60909.py`) implementuje
normę międzynarodową dla obliczeń prądów zwarciowych. Kod jest:

1. Dobrze przetestowany
2. Zgodny z normą IEC 60909
3. Używany w produkcji
4. Przykładem poprawnej separacji warstw

Istnieje ryzyko, że przyszłe modyfikacje:
- Wprowadzą regresje w obliczeniach
- Dodadzą logikę niezgodną z normą
- Złamią separację solver ↔ analysis

## Decyzja

**Solver IEC 60909 jest ZAMROŻONY i stanowi wzorzec dla innych solverów.**

### Zasady:

1. **NIE modyfikować** bez jawnego ADR i przeglądu architektonicznego
2. **Wzorzec separacji:**
   - Czyste funkcje obliczeniowe w `short_circuit_core.py`
   - Główny solver w `short_circuit_iec60909.py`
   - Wynik jako frozen dataclass
   - White-box trace dla każdego kroku
3. **Testy referencyjne** - muszą przechodzić przed każdym releasem
4. **Nowe solvery** powinny naśladować tę strukturę

### Dozwolone zmiany (bez ADR):

- Poprawki błędów w obliczeniach (z testem regresyjnym)
- Rozszerzenia white-box trace
- Dodanie nowych typów zwarć (zachowując strukturę)

### Zabronione zmiany (wymagają ADR):

- Dodanie logiki OSD/regulacji
- Zmiana struktury wyników
- Dodanie zależności od warstwy application
- Modyfikacja formuł IEC 60909

## Konsekwencje

### Pozytywne:

- Stabilność obliczeń zwarciowych
- Wzorzec dla nowych solverów
- Łatwy audyt zgodności z normą

### Negatywne:

- Utrudnione szybkie poprawki (wymaga procesu)
- Nowe funkcjonalności muszą być starannie przemyślane

## Powiązane

- [ADR-006](./ADR-006-solver-layer-separation.md) - separacja solverów od OSD
