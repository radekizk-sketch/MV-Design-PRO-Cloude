# RESULTS BROWSER CONTRACT

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-28
**Typ**: UI Contract — Normatywny

---

## 1. CEL I ZAKRES

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **Results Browser** — komponent UI klasy **ETAP / DIgSILENT PowerFactory**, umożliwiający:

- **pełną eksplorację wyników obliczeń niezależnie od SLD**,
- **dostęp do wszystkich analiz, Case'ów, Snapshot'ów i Run'ów**,
- **tabelaryczną prezentację wyników równorzędną z widokiem SLD**,
- **sortowanie, filtrowanie, porównania i audyt bez klikania po schemacie**.

### 1.2. Zakres obowiązywania

- **BINDING** dla implementacji UI MV-DESIGN-PRO,
- aplikuje się do wszystkich analiz (LF, SC, Proof, Sensitivity, Contingency),
- komponent MUST być dostępny w każdym trybie eksperckim,
- naruszenie kontraktu = regresja wymagająca hotfix.

---

## 2. ARCHITEKTURA DRZEWA WYNIKÓW

### 2.1. Hierarchia danych (BINDING)

Results Browser MUST implementować następującą hierarchię:

```
Project Root
├── Case #1
│   ├── Snapshot A
│   │   ├── Analysis Run #1 (LF)
│   │   │   ├── Target: Buses
│   │   │   ├── Target: Lines
│   │   │   ├── Target: Transformers
│   │   │   ├── Target: Sources
│   │   │   └── Target: Protections (P11)
│   │   ├── Analysis Run #2 (SC)
│   │   │   └── ...
│   │   └── Analysis Run #3 (Proof)
│   │       └── ...
│   └── Snapshot B
│       └── ...
└── Case #2
    └── ...
```

### 2.2. Wymagania struktury drzewa

#### 2.2.1. Node Type: Project Root

- **MUST** być root node w drzewie,
- **MUST** zawierać nazwę projektu i datę otwarcia,
- **MAY** zawierać metadane: autor, wersja, norma bazowa.

#### 2.2.2. Node Type: Case

- **MUST** odpowiadać jednemu Case z modelu,
- **MUST** wyświetlać nazwę Case, datę utworzenia, opis,
- **MUST** zawierać listę Snapshot'ów,
- **MUST** umożliwiać filtrowanie według normy (PN-EN, NEC, IEC).

#### 2.2.3. Node Type: Snapshot

- **MUST** odpowiadać jednemu Snapshot (stan sieci),
- **MUST** wyświetlać timestamp, użytkownika, diff względem Case bazowego,
- **MAY** zawierać tag: "baseline", "variant", "scenario".

#### 2.2.4. Node Type: Analysis Run

- **MUST** odpowiadać jednemu uruchomieniu analizy (LF, SC, Proof, etc.),
- **MUST** zawierać:
  - typ analizy,
  - timestamp,
  - status (success, warning, error, partial),
  - liczbę violations,
  - solver version,
  - compute time.

#### 2.2.5. Node Type: Target

- **MUST** odpowiadać jednemu typowi elementów sieci:
  - Buses,
  - Lines,
  - Transformers,
  - Sources,
  - Protections (P11),
  - Custom (grid segments, zones).

### 2.3. Rozwijanie i zwijanie

- **MUST** umożliwiać rozwijanie/zwijanie wszystkich poziomów,
- **MUST** zachowywać stan rozwinięcia w sesji,
- **SHOULD** zapisywać preferowane rozwinięcie w profilu użytkownika,
- **MUST** obsługiwać Expand All / Collapse All.

---

## 3. TABELE WYNIKÓW — WIDOK GŁÓWNY

### 3.1. Równorzędność z SLD

Results Browser **MUST** traktować widok tabelaryczny jako **równorzędny z SLD**:

- widok SLD = spatial navigation,
- widok tabelaryczny = data navigation,
- przełączanie: **SLD ↔ Table** bez utraty kontekstu.

### 3.2. Kolumny (BINDING)

Tabele wyników **MUST** zawierać następujące kolumny (minimum):

#### 3.2.1. Kolumny wspólne (wszystkie Target'y)

| Kolumna           | Typ        | Wymagane | Opis                                      |
|-------------------|------------|----------|-------------------------------------------|
| `ID`              | string     | MUST     | Unikalny identyfikator elementu          |
| `Name`            | string     | MUST     | Nazwa elementu                            |
| `Type`            | enum       | MUST     | Typ elementu (BUS, LINE, TRAFO, ...)      |
| `Zone`            | string     | MAY      | Strefa sieciowa                           |
| `Voltage [kV]`    | float      | MUST     | Napięcie znamionowe                       |
| `Status`          | enum       | MUST     | OK, WARNING, VIOLATION, ERROR             |

#### 3.2.2. Kolumny specyficzne: Buses

| Kolumna             | Typ        | Wymagane | Opis                                    |
|---------------------|------------|----------|-----------------------------------------|
| `V [kV]`            | float      | MUST     | Napięcie obliczone                      |
| `V [%]`             | float      | MUST     | Napięcie w % Un                         |
| `Angle [deg]`       | float      | MUST     | Kąt napięcia                            |
| `P [MW]`            | float      | MUST     | Moc czynna (bilans węzła)               |
| `Q [MVAr]`          | float      | MUST     | Moc bierna (bilans węzła)               |
| `V_min [%]`         | float      | MUST     | Limit dolny napięcia (norma)            |
| `V_max [%]`         | float      | MUST     | Limit górny napięcia (norma)            |
| `Violation`         | bool       | MUST     | Czy naruszono limity                    |

#### 3.2.3. Kolumny specyficzne: Lines

| Kolumna             | Typ        | Wymagane | Opis                                    |
|---------------------|------------|----------|-----------------------------------------|
| `From Bus`          | string     | MUST     | Węzeł początkowy                        |
| `To Bus`            | string     | MUST     | Węzeł końcowy                           |
| `I [A]`             | float      | MUST     | Prąd obliczony                          |
| `I [%]`             | float      | MUST     | Obciążenie w % Inom                     |
| `I_nom [A]`         | float      | MUST     | Prąd znamionowy                         |
| `I_max [A]`         | float      | MUST     | Prąd maksymalny (norma)                 |
| `P [MW]`            | float      | MUST     | Moc czynna przepływu                    |
| `Q [MVAr]`          | float      | MUST     | Moc bierna przepływu                    |
| `Losses [kW]`       | float      | MAY      | Straty mocy czynnej                     |
| `Violation`         | bool       | MUST     | Czy naruszono limity                    |

#### 3.2.4. Kolumny specyficzne: Transformers

| Kolumna             | Typ        | Wymagane | Opis                                    |
|---------------------|------------|----------|-----------------------------------------|
| `From Bus`          | string     | MUST     | Węzeł strony pierwotnej                 |
| `To Bus`            | string     | MUST     | Węzeł strony wtórnej                    |
| `S [MVA]`           | float      | MUST     | Moc pozorna                             |
| `S [%]`             | float      | MUST     | Obciążenie w % Snom                     |
| `S_nom [MVA]`       | float      | MUST     | Moc znamionowa                          |
| `Tap Position`      | int        | MUST     | Pozycja zaczepów                        |
| `P [MW]`            | float      | MUST     | Moc czynna                              |
| `Q [MVAr]`          | float      | MUST     | Moc bierna                              |
| `Losses [kW]`       | float      | MAY      | Straty mocy                             |
| `Violation`         | bool       | MUST     | Czy naruszono limity                    |

#### 3.2.5. Kolumny specyficzne: Sources

| Kolumna             | Typ        | Wymagane | Opis                                    |
|---------------------|------------|----------|-----------------------------------------|
| `Bus`               | string     | MUST     | Węzeł przyłączenia                      |
| `P_gen [MW]`        | float      | MUST     | Moc czynna generowana                   |
| `Q_gen [MVAr]`      | float      | MUST     | Moc bierna generowana                   |
| `P_max [MW]`        | float      | MUST     | Moc maksymalna                          |
| `Q_max [MVAr]`      | float      | MUST     | Moc bierna maksymalna                   |
| `PF`                | float      | MAY      | Współczynnik mocy                       |
| `Type`              | enum       | MUST     | Grid, Generator, PV, Wind, Battery      |

#### 3.2.6. Kolumny specyficzne: Protections (P11)

| Kolumna             | Typ        | Wymagane | Opis                                    |
|---------------------|------------|----------|-----------------------------------------|
| `Bus`               | string     | MUST     | Węzeł chroniony                         |
| `I_sc_max [kA]`     | float      | MUST     | Prąd zwarciowy maksymalny               |
| `I_sc_min [kA]`     | float      | MUST     | Prąd zwarciowy minimalny                |
| `I_protection [kA]` | float      | MUST     | Prąd nastawczy zabezpieczenia           |
| `Margin [%]`        | float      | MUST     | Margines zabezpieczenia                 |
| `Status`            | enum       | MUST     | OK, UNDERPROTECTED, OVERPROTECTED       |

### 3.3. Sortowanie i filtrowanie

#### 3.3.1. Sortowanie (BINDING)

- **MUST** umożliwiać sortowanie po dowolnej kolumnie (rosnąco / malejąco),
- **MUST** zachowywać kolejność sortowania w sesji,
- **MUST** obsługiwać multi-column sort (kliknięcie z Shift),
- **SHOULD** domyślnie sortować po `Status` → `Violation` → `Name`.

#### 3.3.2. Filtrowanie (BINDING)

Results Browser **MUST** implementować następujące filtry:

| Filtr               | Typ              | Wymagane | Opis                                      |
|---------------------|------------------|----------|-------------------------------------------|
| **Status Filter**   | multi-select     | MUST     | OK, WARNING, VIOLATION, ERROR             |
| **Violation Only**  | checkbox         | MUST     | Pokaż tylko elementy z naruszeniami       |
| **Zone Filter**     | multi-select     | MAY      | Filtrowanie po strefie sieciowej          |
| **Voltage Filter**  | range slider     | MUST     | Filtrowanie po napięciu znamionowym       |
| **Name Search**     | text input       | MUST     | Wyszukiwanie po nazwie (regex)            |
| **Custom Filter**   | expression       | SHOULD   | Zaawansowane wyrażenie (np. `V% < 95`)    |

### 3.4. Eksport danych

- **MUST** umożliwiać eksport tabeli do CSV,
- **MUST** umożliwiać eksport tabeli do Excel (.xlsx),
- **SHOULD** umożliwiać eksport tabeli do PDF (z nagłówkiem kontekstu),
- **MUST** eksportować tylko widoczne (przefiltrowane) wiersze,
- **MAY** eksportować wszystkie kolumny lub wybrane.

---

## 4. PORÓWNANIA (CASE / SNAPSHOT / ANALYSIS)

### 4.1. Tryb porównania

Results Browser **MUST** umożliwiać porównanie:

- dwóch Case'ów (np. existing vs. planned),
- dwóch Snapshot'ów (np. baseline vs. variant),
- dwóch Analysis Run'ów (np. LF przed vs. po optymalizacji).

### 4.2. Widok porównawczy

Widok porównawczy **MUST** zawierać:

- kolumny z wartościami z obu przypadków (Case A, Case B),
- kolumnę **Delta** (różnica: Case B - Case A),
- kolumnę **Delta %** (różnica procentowa),
- highlighting:
  - zielony: poprawa (np. violation → OK),
  - czerwony: pogorszenie (np. OK → violation),
  - żółty: zmiana, ale wciąż violation.

### 4.3. Filtrowanie zmian

- **MUST** umożliwiać filtr "Show only changes" (delta ≠ 0),
- **MUST** umożliwiać filtr "Show only violations" (w obu lub w jednym),
- **SHOULD** umożliwiać filtr "Show improvements / Show regressions".

---

## 5. INTEGRACJA Z ELEMENTEM INSPECTOR

### 5.1. Kliknięcie w wiersz tabeli

Kliknięcie w wiersz tabeli **MUST**:

- otworzyć **Element Inspector** (zdefiniowany w `ELEMENT_INSPECTOR_CONTRACT.md`),
- ustawić kontekst Inspector'a na kliknięty element,
- zachować kontekst Results Browser (możliwość powrotu).

### 5.2. Synchronizacja z SLD

Jeśli SLD jest widoczny:

- kliknięcie w wiersz tabeli **SHOULD** podświetlić element na SLD,
- kliknięcie elementu na SLD **SHOULD** podświetlić odpowiedni wiersz w tabeli.

---

## 6. GLOBAL CONTEXT BAR — INTEGRACJA

Results Browser **MUST** wyświetlać **Global Context Bar** (zdefiniowany w `GLOBAL_CONTEXT_BAR.md`):

- **Active Case**: który Case jest aktywny,
- **Active Snapshot**: który Snapshot jest aktywny,
- **Active Analysis**: która analiza jest aktywna,
- **Norma**: PN-EN 50160, NEC, IEC 60909,
- **Expert Mode**: Operator, Designer, Analyst, Auditor.

Context Bar **MUST** być zawsze widoczny i drukowany w nagłówku PDF.

---

## 7. EXPERT MODES — WPŁYW NA RESULTS BROWSER

### 7.1. Tryb Operator

- domyślnie rozwinięte: Case → Snapshot → Analysis Run,
- domyślnie widoczne kolumny: Name, Voltage, Status, Violation,
- ukryte: zaawansowane kolumny (kąty, impedancje, losses).

### 7.2. Tryb Designer

- domyślnie rozwinięte: Case → Snapshot → Analysis Run → Target,
- domyślnie widoczne kolumny: wszystkie podstawowe + P, Q, I, V%,
- widoczne: losses, tap positions.

### 7.3. Tryb Analyst

- domyślnie rozwinięte: wszystkie poziomy,
- domyślnie widoczne kolumny: wszystkie,
- widoczne: kąty, impedancje, contributions, margins.

### 7.4. Tryb Auditor

- domyślnie rozwinięte: wszystkie poziomy,
- domyślnie widoczne kolumny: wszystkie + metadane (timestamp, user, diff),
- widoczne: wszystkie dane do porównania i audytu.

**WAŻNE**: Tryby **NIE ukrywają danych** — tylko zmieniają domyślne rozwinięcia i preferowane kolumny. Użytkownik zawsze może rozwinąć/dodać kolumny.

---

## 8. PERFORMANCE I SKALOWALNOŚĆ

### 8.1. Wymagania wydajnościowe (BINDING)

- **MUST** renderować tabelę z 10 000 wierszy w < 500 ms,
- **MUST** obsługiwać lazy loading (wirtualizacja wierszy),
- **MUST** cachować dane drzewa w pamięci,
- **SHOULD** umożliwiać server-side filtering dla > 100k wierszy.

### 8.2. Ograniczenia

- **FORBIDDEN**: ładowanie wszystkich wyników do DOM jednocześnie,
- **FORBIDDEN**: synchroniczne przetwarzanie > 1000 elementów bez progress bar,
- **MUST**: wyświetlać progress bar przy operacjach > 1s.

---

## 9. ACCESSIBILITY I UX

### 9.1. Keyboard Navigation

- **MUST** obsługiwać nawigację klawiaturą (Tab, Arrow keys),
- **MUST** obsługiwać Enter (rozwiń/zwiń node),
- **MUST** obsługiwać Space (zaznacz/odznacz checkbox filtra),
- **SHOULD** obsługiwać Ctrl+F (wyszukiwanie w tabeli).

### 9.2. Screen Readers

- **MUST** zawierać ARIA labels dla wszystkich elementów interaktywnych,
- **MUST** ogłaszać zmiany stanu (rozwinięcie, filtrowanie) przez screen reader.

---

## 10. ZABRONIONE PRAKTYKI

### 10.1. FORBIDDEN

- **FORBIDDEN**: ukrywanie kolumn "dla uproszczenia" — użytkownik decyduje,
- **FORBIDDEN**: tworzenie "basic UI" i "advanced UI" — jedno UI z opcjami,
- **FORBIDDEN**: pomijanie analiz z warnings/errors — wszystkie widoczne,
- **FORBIDDEN**: hard-coded listy kolumn — kolumny muszą być konfigurowalne,
- **FORBIDDEN**: brak możliwości eksportu danych.

---

## 11. ZALEŻNOŚCI OD INNYCH KONTRAKTÓW

- **ELEMENT_INSPECTOR_CONTRACT.md**: Element Inspector musi obsługiwać wszystkie elementy z Results Browser,
- **GLOBAL_CONTEXT_BAR.md**: Context Bar musi być synchronizowany z aktywnym Case/Snapshot/Analysis,
- **EXPERT_MODES_CONTRACT.md**: Results Browser musi reagować na zmianę Expert Mode,
- **UI_ETAP_POWERFACTORY_PARITY.md**: Results Browser musi spełniać parity z ETAP/PowerFactory.

---

## 12. WERSJONOWANIE I ZMIANY

- Wersja 1.0: definicja bazowa (2026-01-28),
- Zmiany w kontrakcie wymagają aktualizacji wersji i code review,
- Breaking changes wymagają migracji UI i aktualizacji testów E2E.

---

**KONIEC KONTRAKTU**
