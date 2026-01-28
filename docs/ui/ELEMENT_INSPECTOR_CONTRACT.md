# ELEMENT INSPECTOR CONTRACT

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-28
**Typ**: UI Contract — Normatywny

---

## 1. CEL I ZAKRES

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **Element Inspector** — komponent UI klasy **ETAP / DIgSILENT PowerFactory**, umożliwiający:

- **pełną inspekcję dowolnego elementu sieci** (BUS, LINE, TRAFO, SOURCE, PROTECTION),
- **dostęp do wszystkich parametrów, wyników, kontrybutorów i limitów**,
- **pracę w kontekście wielu Case'ów jednocześnie**,
- **audyt i porównania bez przełączania widoków**.

### 1.2. Zakres obowiązywania

- **BINDING** dla implementacji UI MV-DESIGN-PRO,
- aplikuje się do wszystkich typów elementów sieci,
- komponent MUST być dostępny w każdym trybie eksperckim,
- naruszenie kontraktu = regresja wymagająca hotfix.

---

## 2. ARCHITEKTURA INSPEKTORA

### 2.1. Jeden kanoniczny inspektor

MV-DESIGN-PRO **MUST** posiadać **jeden** uniwersalny Element Inspector:

- **FORBIDDEN**: osobne inspektory dla Bus, Line, Trafo (duplikacja kodu),
- **MUST**: jeden komponent z dynamicznymi zakładkami zależnymi od typu elementu,
- **MUST**: zachowywać stan Inspector'a przy przełączaniu elementów (history navigation).

### 2.2. Pozycjonowanie i layout

- **MUST** być dostępny jako:
  - **Side Panel** (domyślnie: prawy panel, 30-40% szerokości ekranu),
  - **Modal Dialog** (na żądanie, pełnoekranowy lub centrowany),
  - **Bottom Drawer** (dla małych ekranów, < 1024px).
- **MUST** być resizable (użytkownik może zmienić szerokość),
- **MUST** zachowywać preferowane pozycjonowanie w profilu użytkownika.

---

## 3. ZAKŁADKI (TABS) — KONTRAKT BINDING

Element Inspector **MUST** zawierać następujące zakładki (w tej kolejności):

1. **Overview** (przegląd podstawowy),
2. **Parameters** (parametry techniczne),
3. **Results** (wyniki obliczeń),
4. **Contributions** (kontrybutorzy do zwarć / obciążenia),
5. **Limits** (limity normatywne),
6. **Proof (P11)** (dowód P11, tylko dla Bus i Protection).

### 3.1. Widoczność zakładek zależna od typu elementu

| Typ elementu       | Overview | Parameters | Results | Contributions | Limits | Proof (P11) |
|--------------------|----------|------------|---------|---------------|--------|-------------|
| **Bus**            | ✓        | ✓          | ✓       | ✓             | ✓      | ✓           |
| **Line**           | ✓        | ✓          | ✓       | ✓             | ✓      | —           |
| **Transformer**    | ✓        | ✓          | ✓       | ✓             | ✓      | —           |
| **Source**         | ✓        | ✓          | ✓       | ✓             | —      | —           |
| **Protection**     | ✓        | ✓          | ✓       | —             | ✓      | ✓           |
| **Load**           | ✓        | ✓          | ✓       | —             | —      | —           |

**WAŻNE**: Brak zakładki dla typu elementu **NIE OZNACZA** ukrycia — zakładka jest nieaktywna (grayed out) z tooltipem "Not applicable for this element type".

---

## 4. ZAKŁADKA: OVERVIEW

### 4.1. Cel

Szybki przegląd elementu: identyfikacja, status, kluczowe wartości.

### 4.2. Sekcje (BINDING)

#### 4.2.1. Identyfikacja elementu

| Pole               | Typ        | Wymagane | Opis                                      |
|--------------------|------------|----------|-------------------------------------------|
| `ID`               | string     | MUST     | Unikalny identyfikator                    |
| `Name`             | string     | MUST     | Nazwa elementu                            |
| `Type`             | enum       | MUST     | Typ (BUS, LINE, TRAFO, SOURCE, ...)       |
| `Description`      | text       | MAY      | Opis (user-defined)                       |
| `Zone`             | string     | MAY      | Strefa sieciowa                           |
| `Substation`       | string     | MAY      | Podstacja (jeśli dotyczy)                 |

#### 4.2.2. Status elementu

| Pole               | Typ        | Wymagane | Opis                                      |
|--------------------|------------|----------|-------------------------------------------|
| `Status`           | enum       | MUST     | OK, WARNING, VIOLATION, ERROR, NOT_CONVERGED |
| `In Service`       | bool       | MUST     | Czy element jest w eksploatacji           |
| `Violations Count` | int        | MUST     | Liczba naruszeń limitów                   |

#### 4.2.3. Kluczowe wartości (dynamiczne, zależne od typu)

**Bus**:
- `V [kV]`: napięcie obliczone,
- `V [%]`: napięcie w % Un,
- `Angle [deg]`: kąt napięcia,
- `Connected Elements`: liczba elementów podłączonych.

**Line**:
- `I [A]`: prąd obliczony,
- `I [%]`: obciążenie w % Inom,
- `P [MW]`, `Q [MVAr]`: przepływy mocy,
- `Losses [kW]`: straty.

**Transformer**:
- `S [MVA]`: moc pozorna,
- `S [%]`: obciążenie w % Snom,
- `Tap Position`: pozycja zaczepów,
- `Losses [kW]`: straty.

**Source**:
- `P_gen [MW]`, `Q_gen [MVAr]`: generacja mocy,
- `PF`: współczynnik mocy,
- `Type`: Grid, Generator, PV, Wind, Battery.

#### 4.2.4. Miniaturka topologii (opcjonalna)

- **SHOULD** zawierać miniaturkę SLD z podświetlonym elementem,
- kliknięcie w miniaturkę **SHOULD** otworzyć pełny widok SLD.

---

## 5. ZAKŁADKA: PARAMETERS

### 5.1. Cel

Pełne parametry techniczne elementu (dane katalogowe, impedancje, charakterystyki).

### 5.2. Sekcje (BINDING)

#### 5.2.1. Parametry podstawowe (wszystkie elementy)

| Pole               | Typ        | Wymagane | Opis                                      |
|--------------------|------------|----------|-------------------------------------------|
| `Manufacturer`     | string     | MAY      | Producent                                 |
| `Model`            | string     | MAY      | Model                                     |
| `Year`             | int        | MAY      | Rok produkcji                             |
| `Serial Number`    | string     | MAY      | Numer seryjny                             |
| `Standard`         | enum       | MUST     | PN-EN, NEC, IEC, etc.                     |

#### 5.2.2. Parametry specyficzne: Bus

| Pole               | Typ        | Wymagane | Opis                                      |
|--------------------|------------|----------|-------------------------------------------|
| `V_nom [kV]`       | float      | MUST     | Napięcie znamionowe                       |
| `V_min [%]`        | float      | MUST     | Limit dolny napięcia (norma)              |
| `V_max [%]`        | float      | MUST     | Limit górny napięcia (norma)              |
| `Bus Type`         | enum       | MUST     | PQ, PV, SLACK, ISOLATED                   |
| `Initial V [kV]`   | float      | MAY      | Napięcie początkowe (flat start)          |
| `Initial Angle [deg]` | float   | MAY      | Kąt początkowy                            |

#### 5.2.3. Parametry specyficzne: Line

| Pole               | Typ        | Wymagane | Opis                                      |
|--------------------|------------|----------|-------------------------------------------|
| `From Bus`         | string     | MUST     | Węzeł początkowy                          |
| `To Bus`           | string     | MUST     | Węzeł końcowy                             |
| `Length [km]`      | float      | MUST     | Długość linii                             |
| `R [Ω/km]`         | float      | MUST     | Rezystancja jednostkowa                   |
| `X [Ω/km]`         | float      | MUST     | Reaktancja jednostkowa                    |
| `B [µS/km]`        | float      | MAY      | Susceptancja jednostkowa                  |
| `I_nom [A]`        | float      | MUST     | Prąd znamionowy                           |
| `I_max [A]`        | float      | MUST     | Prąd maksymalny (norma)                   |
| `Cable Type`       | enum       | MAY      | Overhead, Underground, Submarine          |
| `Conductor Material` | enum     | MAY      | Cu, Al, ACSR                              |
| `Cross-Section [mm²]` | float   | MAY      | Przekrój przewodu                         |

#### 5.2.4. Parametry specyficzne: Transformer

| Pole               | Typ        | Wymagane | Opis                                      |
|--------------------|------------|----------|-------------------------------------------|
| `From Bus`         | string     | MUST     | Węzeł strony pierwotnej                   |
| `To Bus`           | string     | MUST     | Węzeł strony wtórnej                      |
| `S_nom [MVA]`      | float      | MUST     | Moc znamionowa                            |
| `V_prim [kV]`      | float      | MUST     | Napięcie pierwotne                        |
| `V_sec [kV]`       | float      | MUST     | Napięcie wtórne                           |
| `u_k [%]`          | float      | MUST     | Napięcie zwarcia                          |
| `P_fe [kW]`        | float      | MAY      | Straty w żelazie (biegu jałowego)         |
| `P_cu [kW]`        | float      | MAY      | Straty w miedzi (obciążenia)              |
| `Vector Group`     | enum       | MUST     | Dyn11, Yzn11, Yyn0, etc.                  |
| `Tap Changer`      | bool       | MUST     | Czy posiada przełącznik zaczepów          |
| `Tap Min`          | int        | MAY      | Minimalna pozycja zaczepów                |
| `Tap Max`          | int        | MAY      | Maksymalna pozycja zaczepów               |
| `Tap Step [%]`     | float      | MAY      | Krok regulacji [%]                        |
| `Tap Neutral`      | int        | MAY      | Pozycja neutralna                         |

#### 5.2.5. Parametry specyficzne: Source

| Pole               | Typ        | Wymagane | Opis                                      |
|--------------------|------------|----------|-------------------------------------------|
| `Bus`              | string     | MUST     | Węzeł przyłączenia                        |
| `Type`             | enum       | MUST     | Grid, Generator, PV, Wind, Battery        |
| `P_max [MW]`       | float      | MUST     | Moc maksymalna                            |
| `Q_max [MVAr]`     | float      | MUST     | Moc bierna maksymalna                     |
| `P_min [MW]`       | float      | MAY      | Moc minimalna                             |
| `Q_min [MVAr]`     | float      | MAY      | Moc bierna minimalna                      |
| `V_setpoint [kV]`  | float      | MAY      | Nastawa napięcia (dla PV bus)             |
| `PF`               | float      | MAY      | Współczynnik mocy                         |
| `Z_grid [Ω]`       | complex    | MAY      | Impedancja sieci (dla Grid)               |
| `X/R Ratio`        | float      | MAY      | Stosunek X/R (dla Grid)                   |

### 5.3. Edycja parametrów

- **MUST** umożliwiać edycję parametrów **tylko w trybie Designer / Analyst**,
- **MUST** walidować wartości przed zapisem (zakres, typ, zależności),
- **MUST** wyświetlać ostrzeżenie przy zmianie parametrów wpływających na wyniki,
- **MUST** logować zmiany parametrów (audit trail).

---

## 6. ZAKŁADKA: RESULTS

### 6.1. Cel

Wyniki obliczeń dla danego elementu we **wszystkich Case'ach i Snapshot'ach**.

### 6.2. Multi-Case View (BINDING)

Results tab **MUST** wyświetlać wyniki w formacie tabeli:

| Case       | Snapshot   | Analysis   | Parametr         | Wartość      | Status     |
|------------|------------|------------|------------------|--------------|------------|
| Case 1     | Baseline   | LF         | V [kV]           | 10.95        | OK         |
| Case 1     | Baseline   | SC         | I_sc_max [kA]    | 25.3         | OK         |
| Case 1     | Variant A  | LF         | V [kV]           | 10.82        | WARNING    |
| Case 2     | Baseline   | LF         | V [kV]           | 11.20        | VIOLATION  |

#### 6.2.1. Kolumny (BINDING)

| Kolumna       | Typ        | Wymagane | Opis                                      |
|---------------|------------|----------|-------------------------------------------|
| `Case`        | string     | MUST     | Nazwa Case                                |
| `Snapshot`    | string     | MUST     | Nazwa Snapshot                            |
| `Analysis`    | enum       | MUST     | LF, SC, Proof, Sensitivity, Contingency   |
| `Timestamp`   | datetime   | MUST     | Data i czas obliczeń                      |
| `Parameter`   | string     | MUST     | Nazwa parametru wyniku                    |
| `Value`       | float      | MUST     | Wartość obliczona                         |
| `Unit`        | string     | MUST     | Jednostka                                 |
| `Status`      | enum       | MUST     | OK, WARNING, VIOLATION, ERROR             |
| `Limit`       | float      | MAY      | Wartość limitu normatywnego               |

### 6.3. Filtrowanie wyników

- **MUST** umożliwiać filtrowanie po Case, Snapshot, Analysis,
- **MUST** umożliwiać filtrowanie po Status (tylko violations),
- **SHOULD** umożliwiać grupowanie wyników (np. wszystkie LF razem).

### 6.4. Wykresy (opcjonalne, SHOULD)

- **SHOULD** wyświetlać wykres trendu parametru w czasie (time-series),
- **SHOULD** wyświetlać wykres porównawczy między Case'ami (bar chart),
- **SHOULD** umożliwiać eksport wykresu do PNG/SVG.

---

## 7. ZAKŁADKA: CONTRIBUTIONS

### 7.1. Cel

Wyświetlenie kontrybutorów do:
- **prądów zwarciowych** (dla Bus),
- **obciążeń** (dla Line, Trafo),
- **strat** (dla Line, Trafo).

### 7.2. Contributions: Prądy zwarciowe (Bus)

Dla Bus, Contributions tab **MUST** wyświetlać:

| Contributor       | Type       | I_sc [kA]  | % of Total | Angle [deg] |
|-------------------|------------|------------|------------|-------------|
| Source #1         | Grid       | 15.2       | 60%        | -85°        |
| Generator #2      | Generator  | 8.5        | 34%        | -82°        |
| Line #3 (backfeed)| Line       | 1.5        | 6%         | -78°        |
| **TOTAL**         | —          | **25.2**   | **100%**   | **-84°**    |

#### 7.2.1. Kolumny (BINDING)

| Kolumna       | Typ        | Wymagane | Opis                                      |
|---------------|------------|----------|-------------------------------------------|
| `Contributor` | string     | MUST     | Nazwa elementu kontrybutora               |
| `Type`        | enum       | MUST     | Grid, Generator, Line (backfeed), etc.    |
| `I_sc [kA]`   | float      | MUST     | Prąd zwarciowy od kontrybutora            |
| `% of Total`  | float      | MUST     | Udział w całkowitym prądzie [%]           |
| `Angle [deg]` | float      | MAY      | Kąt prądu zwarciowego                     |
| `Distance [km]` | float    | MAY      | Odległość od kontrybutora                 |

### 7.3. Contributions: Obciążenia (Line, Trafo)

Dla Line / Trafo, Contributions tab **MUST** wyświetlać:

| Source            | Type       | P [MW]     | Q [MVAr]   | % of Total |
|-------------------|------------|------------|------------|------------|
| Load #1           | Load       | 2.5        | 0.8        | 45%        |
| Load #2           | Load       | 1.8        | 0.6        | 32%        |
| Generator #3 (reverse) | Generator | -1.2   | -0.3       | -22%       |
| **TOTAL (net)**   | —          | **3.1**    | **1.1**    | **100%**   |

### 7.4. Wizualizacja (opcjonalna, SHOULD)

- **SHOULD** wyświetlać wykres kołowy (pie chart) z udziałami kontrybutorów,
- **SHOULD** umożliwiać kliknięcie w kontrybutora → otwarcie jego Inspector'a.

---

## 8. ZAKŁADKA: LIMITS

### 8.1. Cel

Wyświetlenie wszystkich limitów normatywnych dla danego elementu i ich statusu.

### 8.2. Struktura tabeli (BINDING)

| Limit Parameter    | Value      | Limit      | Margin     | Status      | Norma         |
|--------------------|------------|------------|------------|-------------|---------------|
| V [%]              | 103.5      | 110        | +6.5       | OK          | PN-EN 50160   |
| V [%]              | 103.5      | 95 (min)   | +8.5       | OK          | PN-EN 50160   |
| I [%]              | 87.2       | 100        | +12.8      | OK          | PN-HD 60364   |
| S [%]              | 92.5       | 100        | +7.5       | OK          | IEC 60076     |
| I_sc [kA]          | 25.3       | 31.5       | +6.2       | OK          | IEC 60909     |

#### 8.2.1. Kolumny (BINDING)

| Kolumna           | Typ        | Wymagane | Opis                                      |
|-------------------|------------|----------|-------------------------------------------|
| `Limit Parameter` | string     | MUST     | Nazwa parametru (V, I, S, I_sc, etc.)     |
| `Value`           | float      | MUST     | Wartość obliczona                         |
| `Limit`           | float      | MUST     | Wartość limitu normatywnego               |
| `Margin`          | float      | MUST     | Margines (Limit - Value)                  |
| `Margin [%]`      | float      | MAY      | Margines procentowy                       |
| `Status`          | enum       | MUST     | OK, WARNING, VIOLATION                    |
| `Norma`           | string     | MUST     | Norma źródłowa (PN-EN 50160, IEC 60909)   |
| `Severity`        | enum       | MAY      | INFO, WARNING, CRITICAL                   |

### 8.3. Highlighting statusu

- **OK**: zielony,
- **WARNING**: żółty (margin < 10%),
- **VIOLATION**: czerwony (przekroczenie limitu).

### 8.4. Multi-Case View

- **SHOULD** umożliwiać wyświetlenie limitów dla wielu Case'ów w jednej tabeli,
- **MUST** podświetlać zmiany statusu między Case'ami.

---

## 9. ZAKŁADKA: PROOF (P11)

### 9.1. Cel

Wyświetlenie **dowodu P11** (proof of compliance) dla Bus i Protection.

### 9.2. Zakres

- **MUST** być widoczna tylko dla Bus i Protection,
- **MUST** zawierać pełny audyt prądów zwarciowych, nastaw zabezpieczeń, marginesów.

### 9.3. Sekcje (BINDING)

#### 9.3.1. Short-Circuit Currents

| Fault Type        | I_sc [kA]  | Standard   | Limit [kA] | Status      |
|-------------------|------------|------------|------------|-------------|
| 3-phase (max)     | 25.3       | IEC 60909  | 31.5       | OK          |
| 2-phase (max)     | 21.9       | IEC 60909  | 31.5       | OK          |
| 1-phase (max)     | 18.7       | IEC 60909  | 31.5       | OK          |
| 1-phase (min)     | 8.2        | IEC 60909  | 10.0 (min) | WARNING     |

#### 9.3.2. Protection Settings

| Protection Device | I_set [kA] | I_sc_max [kA] | I_sc_min [kA] | Margin Max | Margin Min | Status      |
|-------------------|------------|---------------|---------------|------------|------------|-------------|
| Circuit Breaker #1| 20.0       | 25.3          | 8.2           | +5.3 (26%) | -11.8 (59%)| OK          |
| Relay #2          | 12.0       | 25.3          | 8.2           | +13.3 (111%)| -3.8 (32%) | WARNING     |

#### 9.3.3. Compliance Summary

- **MUST** zawierać sekcję "Compliance Summary":
  - liczba naruszeń,
  - liczba warnings,
  - status globalny: COMPLIANT / NON-COMPLIANT,
  - data audytu,
  - audytor (user).

### 9.4. Eksport do PDF

- **MUST** umożliwiać eksport Proof (P11) do PDF,
- PDF **MUST** zawierać:
  - nagłówek z Global Context Bar (Case, Snapshot, Norma),
  - wszystkie tabele z sekcji 9.3,
  - podpis audytora,
  - datę i czas wygenerowania.

---

## 10. INTEGRACJA Z INNYMI KOMPONENTAMI

### 10.1. Results Browser

- Kliknięcie w wiersz w Results Browser **MUST** otworzyć Element Inspector,
- Element Inspector **MUST** zachować kontekst Results Browser (możliwość powrotu).

### 10.2. SLD Viewer

- Kliknięcie w element na SLD **MUST** otworzyć Element Inspector,
- Element Inspector **SHOULD** podświetlić element na SLD (jeśli SLD jest widoczny).

### 10.3. Global Context Bar

- Element Inspector **MUST** wyświetlać Global Context Bar (Case, Snapshot, Analysis, Norma),
- Context Bar **MUST** być synchronizowany z Results Browser.

---

## 11. EXPERT MODES — WPŁYW NA INSPECTOR

### 11.1. Tryb Operator

- domyślnie otwarta zakładka: **Overview**,
- zakładki **Parameters**, **Contributions** ukryte (grayed out),
- zakładka **Results**: tylko podstawowe parametry (V, I, S),
- zakładka **Limits**: tylko violations.

### 11.2. Tryb Designer

- domyślnie otwarta zakładka: **Parameters**,
- wszystkie zakładki widoczne,
- zakładka **Results**: wszystkie parametry,
- zakładka **Limits**: wszystkie limity + margins.

### 11.3. Tryb Analyst

- domyślnie otwarta zakładka: **Results**,
- wszystkie zakładki widoczne,
- zakładka **Contributions**: pełne dane + wykresy,
- zakładka **Proof (P11)**: pełny audyt.

### 11.4. Tryb Auditor

- domyślnie otwarta zakładka: **Proof (P11)**,
- wszystkie zakładki widoczne,
- zakładka **Results**: multi-case view domyślnie włączony,
- zakładka **Limits**: multi-case view + audit trail.

**WAŻNE**: Tryby **NIE ukrywają danych** — tylko zmieniają domyślne zakładki i widoczność sekcji. Użytkownik zawsze może przełączyć zakładkę.

---

## 12. PERFORMANCE I SKALOWALNOŚĆ

### 12.1. Wymagania wydajnościowe (BINDING)

- **MUST** otworzyć Inspector w < 300 ms,
- **MUST** załadować zakładkę Results (multi-case) w < 500 ms,
- **MUST** cachować dane elementu w pamięci,
- **SHOULD** umożliwiać lazy loading zakładek (ładowanie on-demand).

### 12.2. Ograniczenia

- **FORBIDDEN**: ładowanie wszystkich Case'ów do DOM jednocześnie,
- **FORBIDDEN**: synchroniczne przetwarzanie > 100 Case'ów bez progress bar,
- **MUST**: wyświetlać progress bar przy operacjach > 1s.

---

## 13. ACCESSIBILITY I UX

### 13.1. Keyboard Navigation

- **MUST** obsługiwać nawigację klawiaturą (Tab, Arrow keys),
- **MUST** obsługiwać Ctrl+Tab (przełączanie zakładek),
- **MUST** obsługiwać Esc (zamknięcie Inspector'a),
- **SHOULD** obsługiwać Ctrl+F (wyszukiwanie w zakładce).

### 13.2. Screen Readers

- **MUST** zawierać ARIA labels dla wszystkich zakładek i sekcji,
- **MUST** ogłaszać zmiany zakładki przez screen reader.

---

## 14. ZABRONIONE PRAKTYKI

### 14.1. FORBIDDEN

- **FORBIDDEN**: osobne inspektory dla różnych typów elementów (duplikacja kodu),
- **FORBIDDEN**: ukrywanie zakładek "dla uproszczenia" — grayed out, nie hidden,
- **FORBIDDEN**: brak multi-case view w zakładce Results,
- **FORBIDDEN**: brak możliwości eksportu Proof (P11) do PDF,
- **FORBIDDEN**: hard-coded nazwy parametrów — muszą być konfigurowalne.

---

## 15. ZALEŻNOŚCI OD INNYCH KONTRAKTÓW

- **RESULTS_BROWSER_CONTRACT.md**: Results Browser musi umożliwiać otwarcie Element Inspector,
- **GLOBAL_CONTEXT_BAR.md**: Element Inspector musi wyświetlać Global Context Bar,
- **EXPERT_MODES_CONTRACT.md**: Element Inspector musi reagować na zmianę Expert Mode,
- **UI_ETAP_POWERFACTORY_PARITY.md**: Element Inspector musi spełniać parity z ETAP/PowerFactory.

---

## 16. WERSJONOWANIE I ZMIANY

- Wersja 1.0: definicja bazowa (2026-01-28),
- Zmiany w kontrakcie wymagają aktualizacji wersji i code review,
- Breaking changes wymagają migracji UI i aktualizacji testów E2E.

---

**KONIEC KONTRAKTU**
