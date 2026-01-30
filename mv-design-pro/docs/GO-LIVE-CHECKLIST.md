# MV-DESIGN-PRO — Checklista Go-Live

## Cel Dokumentu

Ten dokument zawiera szczegółową checklistę warunków, które MUSZĄ być spełnione
przed uruchomieniem produkcyjnym systemu MV-DESIGN-PRO.

**Zasada:** Wszystkie checkboxy muszą być zaznaczone przed Go-Live.

---

## 1. Core Layer

### 1.1 Model Sieci

- [ ] `NetworkGraph` jest stabilny (brak planowanych zmian API)
- [ ] `Node` obsługuje typy: SLACK, PQ, PV
- [ ] `Branch` obsługuje typy: LINE, CABLE, TRANSFORMER, BREAKER, DISCONNECTOR
- [ ] `TransformerBranch` poprawnie oblicza impedancję zwarciową
- [ ] `LineBranch` poprawnie oblicza model PI
- [ ] `InverterSource` poprawnie oblicza wkład do zwarcia

### 1.2 Serializacja

- [ ] `Node.to_dict()` / `Node.from_dict()` działają poprawnie
- [ ] `Branch.to_dict()` / `Branch.from_dict()` działają poprawnie
- [ ] Serializacja jest deterministyczna (te same dane = ten sam JSON)

### 1.3 Granice

- [ ] Core NIE zawiera logiki walidacji biznesowej
- [ ] Core NIE zawiera logiki persystencji
- [ ] Core NIE zawiera logiki OSD/regulacji

---

## 2. Solvers Layer

### 2.1 IEC 60909 Short-Circuit

- [ ] Solver jest ZAMROŻONY (zgodnie z ADR-007)
- [ ] Obsługuje zwarcia: 3F, 1F, 2F, 2F+G
- [ ] Wynik zawiera: Ik'', Ip, Ith, Sk''
- [ ] Wynik zawiera wkłady źródeł (contributions)
- [ ] White-box trace jest kompletny
- [ ] Testy referencyjne przechodzą

### 2.2 Power Flow

- [ ] Algorytm Newton-Raphson jest zbieżny dla typowych sieci
- [ ] Obsługuje węzły: SLACK, PQ, PV
- [ ] Obsługuje overlay specs: shunts, taps, limits
- [ ] Wynik zawiera napięcia w pu i kV
- [ ] Wynik zawiera przepływy w pu i MVA
- [ ] Violations są obliczane poprawnie
- [ ] White-box trace jest kompletny
- [ ] Testy referencyjne przechodzą

### 2.3 P20: Power Flow v1 (Complete)

#### 2.3.1 Determinizm wynikow

- [ ] Te same dane wejściowe → identyczny PowerFlowResultV1
- [ ] Te same dane wejściowe → identyczny PowerFlowTrace
- [ ] Input hash (SHA-256) jest deterministyczny
- [ ] Result fingerprint jest deterministyczny

#### 2.3.2 Zbieznosc i bledy

- [ ] Test case: siec zbiezna (< max_iterations)
- [ ] Test case: siec niezbiezna (brak zbieznosci w max_iterations)
- [ ] Solver raportuje cause_if_failed przy braku zbieznosci
- [ ] Trace zawiera wszystkie iteracje z norm_mismatch

#### 2.3.3 NOT-A-SOLVER (UI/Export)

- [ ] UI Results Inspector NIE wykonuje obliczen fizycznych
- [ ] UI Comparison NIE wykonuje obliczen fizycznych
- [ ] Export JSON NIE wykonuje obliczen (tylko formatowanie)
- [ ] Export DOCX NIE wykonuje obliczen (tylko formatowanie)
- [ ] Export PDF NIE wykonuje obliczen (tylko formatowanie)

#### 2.3.4 API Result kompletnosc

- [ ] GET /power-flow-runs/{id}/results zwraca pelny PowerFlowResultV1
- [ ] GET /power-flow-runs/{id}/trace zwraca pelny PowerFlowTrace
- [ ] GET /power-flow-runs/{id}/export/json dziala
- [ ] GET /power-flow-runs/{id}/export/docx dziala
- [ ] GET /power-flow-runs/{id}/export/pdf dziala
- [ ] GET /power-flow-comparisons/{id}/export/json dziala
- [ ] GET /power-flow-comparisons/{id}/export/docx dziala
- [ ] GET /power-flow-comparisons/{id}/export/pdf dziala

#### 2.3.5 Polskie etykiety

- [ ] UI Results Inspector: 100% polskie etykiety
- [ ] UI Comparison: 100% polskie etykiety
- [ ] Raporty DOCX/PDF: 100% polskie etykiety

### 2.4 Determinizm ogolny

- [ ] Te same dane wejściowe → te same wyniki (IEC 60909)
- [ ] Te same dane wejściowe → te same wyniki (Power Flow)
- [ ] Input hash jest deterministyczny

### 2.5 Granice

- [ ] Solvery NIE zawierają logiki OSD/regulacji
- [ ] Solvery NIE zawierają logiki persystencji
- [ ] Solvery NIE wywołują API zewnętrznych

---

## 3. Analysis Layer

### 3.1 Violations

- [ ] Violations zawierają: type, id, value, limit, severity, direction
- [ ] Obsługiwane typy: bus_voltage, branch_loading, branch_current
- [ ] Violations są sortowane po severity

### 3.2 AnalysisRun

- [ ] Cykl życia: CREATED → VALIDATED → RUNNING → FINISHED/FAILED
- [ ] Input snapshot jest zapisywany
- [ ] Input hash umożliwia cache'owanie
- [ ] Result summary jest zapisywany
- [ ] Error message jest zapisywany przy FAILED

---

## 4. Application Layer

### 4.1 NetworkWizardService

- [ ] CRUD dla Project działa
- [ ] CRUD dla Node działa
- [ ] CRUD dla Branch działa
- [ ] CRUD dla Source działa
- [ ] CRUD dla Load działa
- [ ] CRUD dla OperatingCase działa
- [ ] Walidacja sieci zwraca poprawny ValidationReport
- [ ] Build NetworkGraph działa
- [ ] Build PowerFlowInput działa
- [ ] Build ShortCircuitInput działa

### 4.2 AnalysisRunService

- [ ] Create Power Flow run działa
- [ ] Create Short Circuit run działa
- [ ] Execute run działa
- [ ] Get results działa
- [ ] List runs z filtrami działa

### 4.3 Import/Export

- [ ] Export JSON jest deterministyczny
- [ ] Import JSON (merge mode) działa
- [ ] Import JSON (replace mode) działa
- [ ] Import CSV działa
- [ ] Export PDF działa
- [ ] Export DOCX działa

---

## 5. Infrastructure Layer

### 5.1 Persistence

- [ ] UnitOfWork działa poprawnie
- [ ] Transakcje są atomowe
- [ ] Rollback działa przy błędach
- [ ] Migracje bazy danych są aktualne

### 5.2 Repositories

- [ ] ProjectRepository działa
- [ ] NetworkRepository działa
- [ ] CaseRepository działa
- [ ] AnalysisRunRepository działa
- [ ] ResultRepository działa

---

## 6. API Layer

### 6.1 Endpoints

- [ ] GET /projects działa
- [ ] POST /projects działa
- [ ] GET /projects/{id}/network działa
- [ ] POST /projects/{id}/analysis-runs działa
- [ ] POST /analysis-runs/{id}/execute działa
- [ ] GET /analysis-runs/{id}/results działa

### 6.2 Błędy

- [ ] 404 dla nieistniejących zasobów
- [ ] 400 dla błędnych danych wejściowych
- [ ] 409 dla konfliktów
- [ ] 422 dla błędów walidacji
- [ ] 500 dla błędów serwera (z logowaniem)

---

## 7. Dokumentacja

### 7.1 Architektura

- [ ] `docs/00-System-Overview.md` jest aktualny
- [ ] `docs/01-Core.md` jest aktualny
- [ ] `docs/02-Solvers.md` jest aktualny
- [ ] `docs/03-Analyses.md` jest aktualny
- [ ] `docs/04-Application.md` jest aktualny

### 7.2 ADR

- [ ] Wszystkie ADR są aktualne
- [ ] Nowe decyzje mają ADR
- [ ] ADR opisują "dlaczego", nie tylko "co"

### 7.3 Instrukcje

- [ ] Instrukcja: jak dodać nowy solver
- [ ] Instrukcja: jak dodać nową analizę
- [ ] Instrukcja: jak dodać nowy typ case'u

---

## 8. Testy

### 8.1 Jednostkowe

- [ ] Pokrycie Core > 80%
- [ ] Pokrycie Solvers > 90%
- [ ] Pokrycie Application > 70%

### 8.2 Integracyjne

- [ ] Testy end-to-end dla Power Flow
- [ ] Testy end-to-end dla Short Circuit

### 8.3 Canonical workflow (backend tests)

**Uwaga:** repo root nie zawiera `pyproject.toml`; uruchamianie `pytest` z root jest **nieautorytatywne**.

```bash
cd mv-design-pro/backend && poetry install
cd mv-design-pro/backend && poetry run pytest -q
```
- [ ] Testy import/export round-trip

### 8.4 Referencyjne

- [ ] Przypadki referencyjne IEC 60909 (z normy)
- [ ] Przypadki referencyjne Power Flow (IEEE test cases)
- [ ] Wyniki porównane z niezależnym oprogramowaniem

---

## 9. Performance

### 9.1 Benchmarki

- [ ] Power Flow: < 5s dla sieci 1000 węzłów
- [ ] Short Circuit: < 2s dla pojedynczego zwarcia
- [ ] Import JSON: < 10s dla 10000 elementów
- [ ] Export PDF: < 30s dla pełnego raportu

### 9.2 Skalowalność

- [ ] Brak memory leaks przy wielu analizach
- [ ] Garbage collection działa poprawnie
- [ ] Brak blokujących operacji w API

---

## 10. Operacje

### 10.1 Logging

- [ ] Logi zawierają timestamp, level, message
- [ ] Błędy zawierają stack trace
- [ ] Logi nie zawierają danych wrażliwych

### 10.2 Monitoring

- [ ] Metryka: liczba analiz na godzinę
- [ ] Metryka: średni czas wykonania
- [ ] Metryka: liczba błędów
- [ ] Alert przy > 5% błędów

### 10.3 Backup

- [ ] Automatyczny backup bazy danych
- [ ] Procedura restore przetestowana
- [ ] Retention policy zdefiniowana

### 10.4 Rollback

- [ ] Procedura rollback zdefiniowana
- [ ] Rollback przetestowany
- [ ] Czas rollback < 15 minut

---

## 11. Bezpieczeństwo

### 11.1 Autentykacja

- [ ] API wymaga autentykacji (jeśli wymagane)
- [ ] Tokeny mają ograniczony czas życia
- [ ] Refresh tokens działają

### 11.2 Autoryzacja

- [ ] Użytkownicy mają dostęp tylko do swoich projektów
- [ ] Role są zdefiniowane (jeśli wymagane)

### 11.3 Dane

- [ ] Brak SQL injection
- [ ] Brak XSS
- [ ] Dane wrażliwe są szyfrowane

---

## 12. Zgodność Architektoniczna

### 12.1 Separacja

- [ ] Core NIE zależy od Application
- [ ] Solvers NIE zależą od API
- [ ] Domain NIE zależy od Infrastructure

### 12.2 OSD/Regulacje

- [ ] Solvery NIE zawierają logiki OSD
- [ ] Solvery NIE zawierają logiki regulacyjnej
- [ ] Compliance jest osobną warstwą (placeholder)

### 12.3 Determinizm

- [ ] Solvery są deterministyczne
- [ ] Export jest deterministyczny
- [ ] Input hash jest deterministyczny

---

## Podpisy

| Rola                    | Imię i nazwisko | Data       | Podpis |
|-------------------------|-----------------|------------|--------|
| Tech Lead               |                 |            |        |
| QA Lead                 |                 |            |        |
| Product Owner           |                 |            |        |
| DevOps                  |                 |            |        |

---

## Historia Zmian

| Data | Wersja | Autor | Opis zmiany |
|------|--------|-------|-------------|
|      | 1.0    |       | Wersja początkowa |

---

## Powiązane Dokumenty

- [ROADMAP.md](./ROADMAP.md) - mapa drogowa
- [00-System-Overview.md](./00-System-Overview.md) - architektura
- [ADR-006](./adr/ADR-006-solver-layer-separation.md) - separacja solverów
- [ADR-007](./adr/ADR-007-iec60909-frozen-reference.md) - zamrożenie IEC 60909
