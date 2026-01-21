# MV-DESIGN-PRO — Mapa Drogowa do Uruchomienia Produkcyjnego

## Przegląd Faz

```
┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐    ┌────────────┐
│  FAZA 0     │ →  │    FAZA 1       │ →  │     FAZA 2       │ →  │   FAZA 3    │ →  │  FAZA 4    │
│  AS-IS      │    │  STABILIZACJA   │    │  ANALYSES READY  │    │  OSD READY  │    │  GO-LIVE   │
└─────────────┘    └─────────────────┘    └──────────────────┘    └─────────────┘    └────────────┘
     ↓                    ↓                       ↓                     ↓                  ↓
  Stan obecny       Uporządkowanie          Abstrakcja case'ów    Punkty zaczepienia   Uruchomienie
                    dokumentacji            Zabezpieczenia        dla OSD              produkcyjne
```

---

## FAZA 0 — AS-IS (Stan Obecny)

### Co Jest Gotowe

| Komponent                    | Status          | Uwagi                                       |
|------------------------------|-----------------|---------------------------------------------|
| NetworkGraph, Node, Branch   | ✅ Gotowe       | Core model stabilny                         |
| IEC 60909 Short-Circuit      | ✅ ZAMROŻONY    | Wzorzec poprawnej separacji                 |
| Power Flow (Newton-Raphson)  | ✅ Gotowe       | W `analysis/`, zawiera overlay specs        |
| NetworkWizardService         | ✅ Gotowe       | CRUD, walidacja, import/export JSON/CSV     |
| AnalysisRunService           | ✅ Gotowe       | Orkiestracja PF i SC                        |
| Persistence Layer            | ✅ Gotowe       | SQLite, UnitOfWork, Repositories            |
| SLD Layout                   | ✅ Gotowe       | Auto-layout, manual, overlay                |
| API FastAPI                  | ✅ Gotowe       | REST endpoints                              |
| Export PDF/DOCX              | ✅ Gotowe       | Raporty z wyników analiz                    |
| White-box Trace              | ✅ Gotowe       | Audytowalność obliczeń                      |

### Co Jest Zamrożone

| Komponent                    | Powód                                            |
|------------------------------|--------------------------------------------------|
| IEC 60909 Solver             | Wzorzec, zgodność z normą, testy referencyjne    |

### Znane Ograniczenia

| Ograniczenie                        | Wpływ                                      |
|-------------------------------------|---------------------------------------------|
| Brak logiki OSD/regulacji           | Compliance musi być dodane osobno           |
| Puste katalogi `src/solvers/`       | Konfuzja dla nowych developerów             |
| Power Flow w `analysis/`            | Niespójność lokalizacji z IEC 60909         |
| Brak abstrakcji zabezpieczeń        | Protection Analysis nie zaimplementowane    |
| Brak warstwy Compliance             | Weryfikacja NC RfG/IRiESD manualna          |

### Rozbieżności Dokumentacja ↔ Kod

| Rozbieżność                              | Lokalizacja                               |
|------------------------------------------|-------------------------------------------|
| Puste `src/solvers/`                     | Placeholder, nie używane                  |
| Power Flow overlay vs pure solver        | Uzasadnione w ADR-001, ADR-008            |

---

## FAZA 1 — STABILIZACJA

### Cele

- Uporządkowanie struktury katalogów
- Spójna dokumentacja
- Testy regresyjne dla solverów
- Usunięcie placeholder'ów

### Zadania

#### 1.1 Porządki w Strukturze

- [ ] Usunąć puste katalogi `src/solvers/power_flow/` i `src/solvers/short_circuit/`
- [ ] Dodać `__init__.py` z re-exportami w `network_model/solvers/`
- [ ] Upewnić się, że importy są spójne w całym projekcie

#### 1.2 Dokumentacja

- [x] Zaktualizować `docs/00-System-Overview.md`
- [x] Zaktualizować `docs/01-Core.md`
- [x] Zaktualizować `docs/02-Solvers.md`
- [x] Zaktualizować `docs/03-Analyses.md`
- [x] Zaktualizować `docs/04-Application.md`
- [x] Utworzyć nowe ADR (ADR-006, ADR-007, ADR-008)

#### 1.3 Testy Regresyjne

- [ ] Zdefiniować przypadki referencyjne dla IEC 60909
- [ ] Zdefiniować przypadki referencyjne dla Power Flow
- [ ] Dodać testy dla edge cases (wyspy, brak SLACK, etc.)
- [ ] CI/CD sprawdza testy przy każdym PR

#### 1.4 White-box Audit

- [ ] Przegląd white-box trace dla IEC 60909 (kompletność)
- [ ] Przegląd white-box trace dla Power Flow (kompletność)
- [ ] Dodać brakujące kroki jeśli potrzebne

### Kryteria Ukończenia

- [ ] Brak pustych katalogów placeholder
- [ ] Dokumentacja zgodna z kodem
- [ ] Testy regresyjne przechodzą
- [ ] CI/CD zielone

---

## FAZA 2 — ANALYSES READY

### Cele

- Abstrakcja case'ów analitycznych
- Zabezpieczenia jako warstwa analityczna
- Rozszerzenie violations

### Zadania

#### 2.1 Abstrakcja Case'ów

- [ ] Zdefiniować interfejs `AnalysisCase`
- [ ] Migrować istniejące case'y do nowej abstrakcji
- [ ] Dodać możliwość komponowania case'ów

#### 2.2 Protection Analysis (Zabezpieczenia)

- [ ] Utworzyć `analysis/protection/`
- [ ] Zaimplementować `OvercurrentCheck` (sprawdzenie nastawień)
- [ ] Zaimplementować `SelectivityCheck` (analiza selektywności)
- [ ] Integracja z wynikami SC i PF

**Ważne:** Protection Analysis NIE implementuje logiki OSD.
Tylko interpretuje wyniki fizyczne.

#### 2.3 Rozszerzenie Violations

- [ ] Dodać nowe typy violations dla Protection
- [ ] Ujednolicić format violations między PF i SC
- [ ] Dodać severity levels

#### 2.4 Reporting

- [ ] Rozszerzyć eksport PDF o Protection Analysis
- [ ] Dodać szablony raportów

### Kryteria Ukończenia

- [ ] Protection Analysis działa
- [ ] Case'y są abstrakcyjne i komponowalne
- [ ] Violations ujednolicone
- [ ] Raporty z zabezpieczeń generowane

---

## FAZA 3 — OSD READY (Bez Implementacji)

### Cele

- Przygotowanie punktów zaczepienia dla logiki OSD
- Dokumentacja wymogów NC RfG / IRiESD
- **BEZ implementacji logiki regulacyjnej**

### Zadania

#### 3.1 Warstwa Compliance (Placeholder)

- [ ] Utworzyć `compliance/` jako osobny moduł
- [ ] Zdefiniować interfejsy dla weryfikacji
- [ ] Dokumentacja: jak dodać nową regulację

```python
# compliance/interfaces.py
class ComplianceCheck(Protocol):
    def check(self, analysis_results: dict) -> ComplianceReport: ...
```

#### 3.2 Punkty Zaczepienia

- [ ] Zdefiniować hook w `AnalysisRunService` dla Compliance
- [ ] Zdefiniować format `ComplianceReport`
- [ ] Przygotować strukturę testów dla Compliance

#### 3.3 Dokumentacja Regulacyjna

- [ ] Lista wymogów NC RfG do weryfikacji
- [ ] Lista wymogów IRiESD do weryfikacji
- [ ] Mapowanie: wymóg → dane z solverów

### Kryteria Ukończenia

- [ ] Warstwa Compliance istnieje jako placeholder
- [ ] Interfejsy zdefiniowane
- [ ] Dokumentacja wymogów gotowa
- [ ] **Żadna logika OSD nie jest zaimplementowana**

---

## FAZA 4 — GO-LIVE

### Cele

- Spełnienie wszystkich warunków uruchomienia
- Checklisty przed produkcją
- Monitoring i logging

### Warunki Uruchomienia

#### Techniczne

- [ ] Core model zamrożony i przetestowany
- [ ] Solvery deterministyczne (te same dane = te same wyniki)
- [ ] Brak logiki OSD/regulacji w solverach
- [ ] Eksport wyników (PDF/DOCX/JSON) działa
- [ ] White-box trace kompletny
- [ ] Testy pokrywają przypadki referencyjne
- [ ] Performance: PF < 5s dla sieci 1000 węzłów
- [ ] Performance: SC < 2s dla pojedynczego zwarcia

#### Dokumentacja

- [ ] Dokumentacja zgodna z kodem
- [ ] ADR aktualne
- [ ] Instrukcja dla developera: jak dodać solver
- [ ] Instrukcja dla developera: jak dodać analysis

#### Operacyjne

- [ ] Logging skonfigurowany
- [ ] Metryki (liczba analiz, czasy wykonania)
- [ ] Backup bazy danych
- [ ] Procedura rollback

### Checklisty

Szczegółowa checklista: [GO-LIVE-CHECKLIST.md](./GO-LIVE-CHECKLIST.md)

---

## Priorytety

| Faza | Priorytet | Uzasadnienie                                      |
|------|-----------|---------------------------------------------------|
| 0    | —         | Stan obecny                                       |
| 1    | Wysoki    | Stabilizacja przed rozwojem                       |
| 2    | Średni    | Rozszerzenie funkcjonalności                      |
| 3    | Niski     | Przygotowanie na przyszłość (bez implementacji)   |
| 4    | Krytyczny | Warunek uruchomienia                              |

---

## Ryzyka

| Ryzyko                              | Mitigacja                                      |
|-------------------------------------|------------------------------------------------|
| Regresja w solverach                | Testy referencyjne, CI/CD                      |
| Wplecenie OSD w solvery             | Code review, ADR-006, ADR-007                  |
| Niespójna dokumentacja              | Automatyczna walidacja links                   |
| Performance dla dużych sieci        | Profiling, optymalizacja Y-bus                 |

---

## Powiązane Dokumenty

- [GO-LIVE-CHECKLIST.md](./GO-LIVE-CHECKLIST.md) - szczegółowa checklista
- [00-System-Overview.md](./00-System-Overview.md) - architektura
- [ADR-006](./adr/ADR-006-solver-layer-separation.md) - separacja solverów
- [ADR-007](./adr/ADR-007-iec60909-frozen-reference.md) - zamrożenie IEC 60909
