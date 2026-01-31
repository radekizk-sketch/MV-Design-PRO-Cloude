# RESULTS / PROOF / SLD — MAKSYMALNA ARCHITEKTURA UI

**Status**: BINDING
**Wersja**: 1.1 (AMENDMENT)
**Data**: 2026-01-31
**Typ**: UI Architecture Contract — Maksymalistyczny + Decision/Review/Context
**Model referencyjny**: SUPERIOR vs DIgSILENT PowerFactory / ETAP

---

## 0. PREAMBULA — FILOZOFIA DOKUMENTU

### 0.1. Cel nadrzędny

Niniejszy dokument definiuje **MAKSYMALNIE ROZBUDOWANĄ ARCHITEKTURĘ UI** dla trzech kluczowych obszarów systemu MV-DESIGN-PRO:

1. **RESULTS** — prezentacja wyników obliczeń (LF, SC, Sensitivity, Contingency),
2. **PROOF / ŚLAD OBLICZEŃ** — pełna transparentność White Box dla audytu i weryfikacji,
3. **SLD — Single Line Diagram** — interaktywny dashboard inżynierski.

### 0.2. Zasady anty-minimalizmu

| Zasada | Opis |
|--------|------|
| **JEŚLI MOŻE ISTNIEĆ → MUSI BYĆ OPISANY** | Każdy potencjalny widok jest wymagany |
| **WIĘCEJ NIŻ POWERFACTORY** | Każdy widok PowerFactory ma rozszerzenie w MV-DESIGN-PRO |
| **BRAK FUNKCJI = SLOT (DISABLED)** | Nigdy pominięcie — zawsze jawny placeholder |
| **UI EKSPONUJE FIZYKĘ** | Żadne ukryte uproszczenia |
| **ZERO UKRYTYCH WARSTW** | Każdy krok obliczeniowy musi być widoczny |

### 0.3. Parity Matrix — podsumowanie

| Obszar | PowerFactory | ETAP | MV-DESIGN-PRO |
|--------|--------------|------|---------------|
| Widoki Results | 12 | 10 | **52** |
| Widoki Proof | 2 | 0 | **20** |
| Tryby SLD | 3 | 2 | **12** |
| Context Modes SLD | 0 | 0 | **4** |
| Warstwy SLD | 4 | 3 | **18** |
| Interakcje SLD | 8 | 6 | **12** |
| Decision Support | 0 | 0 | **8** |
| Review/Approval | 0 | 0 | **10** |
| **TOTAL** | **~32** | **~23** | **138** |

**Nowe warstwy (v1.1)**:
- **DECISION SUPPORT** — UI prowadzi do decyzji, nie tylko prezentuje dane
- **REVIEW/APPROVAL** — formalny workflow przeglądu i zatwierdzania
- **CONTEXT MODES** — tryby kontekstowe (projektowy, analityczny, operacyjny, audytowy)

---

# CZĘŚĆ I: RESULTS — MAKSYMALNA ARCHITEKTURA

---

## 1. WIDOKI ZBIORCZE SYSTEMOWE

### 1.1. Widok: Zwarcia — Tabela główna (SC_SYSTEM_OVERVIEW)

#### 1.1.1. Cel inżynierski
Prezentacja **wszystkich wyników zwarciowych** dla całego systemu w jednej tabeli, z możliwością sortowania, filtrowania i eksportu.

#### 1.1.2. Zakres danych

| Kolumna | Typ | Jednostka | Opis |
|---------|-----|-----------|------|
| `Bus ID` | UUID | — | Identyfikator węzła |
| `Bus Name` | string | — | Nazwa węzła |
| `Voltage Level` | float | kV | Napięcie znamionowe |
| `Zone` | string | — | Strefa sieciowa |
| `Substation` | string | — | Stacja elektroenergetyczna |
| `Fault Type` | enum | — | THREE_PHASE, LINE_TO_GROUND, LINE_TO_LINE, LINE_TO_LINE_TO_GROUND |
| `Ik″_max [kA]` | float | kA | Prąd zwarciowy początkowy (maksymalny) |
| `Ik″_min [kA]` | float | kA | Prąd zwarciowy początkowy (minimalny) |
| `ip [kA]` | float | kA | Prąd udarowy szczytowy |
| `Ith [kA]` | float | kA | Prąd cieplny równoważny (1s) |
| `Ith_3s [kA]` | float | kA | Prąd cieplny równoważny (3s) |
| `Idyn [kA]` | float | kA | Prąd dynamiczny |
| `Sk″ [MVA]` | float | MVA | Moc zwarciowa początkowa |
| `Sk″_max [MVA]` | float | MVA | Moc zwarciowa maksymalna |
| `Sk″_min [MVA]` | float | MVA | Moc zwarciowa minimalna |
| `R_th [mΩ]` | float | mΩ | Rezystancja Thevenina |
| `X_th [mΩ]` | float | mΩ | Reaktancja Thevenina |
| `Z_th [mΩ]` | float | mΩ | Impedancja Thevenina |
| `X/R Ratio` | float | — | Stosunek reaktancji do rezystancji |
| `κ (kappa)` | float | — | Współczynnik prądu udarowego |
| `μ (mu)` | float | — | Współczynnik prądu termicznego |
| `m` | float | — | Współczynnik składowej stałej |
| `n` | float | — | Współczynnik składowej przemiennej |
| `c_max` | float | — | Współczynnik napięcia (max) |
| `c_min` | float | — | Współczynnik napięcia (min) |
| `Equipment Rating [kA]` | float | kA | Znamionowa wytrzymałość zwarciowa |
| `Margin [%]` | float | % | Margines do limitu |
| `Status` | enum | — | OK, WARNING, VIOLATION |
| `Compliance` | enum | — | COMPLIANT, NON_COMPLIANT |

#### 1.1.3. Filtry

| Filtr | Typ | Opcje |
|-------|-----|-------|
| Status | multi-select | OK, WARNING, VIOLATION |
| Voltage Level | range slider | 0.4 kV — 400 kV |
| Fault Type | multi-select | THREE_PHASE, LINE_TO_GROUND, LINE_TO_LINE, LL_GROUND |
| Zone | multi-select | lista stref |
| Substation | multi-select | lista stacji |
| Compliance | toggle | COMPLIANT / NON_COMPLIANT |
| Violations Only | checkbox | — |
| Warnings Only | checkbox | — |
| Margines < 10% | checkbox | — |
| Margines < 5% | checkbox | — |
| Custom Expression | text input | np. `Ik″_max > 20 AND Margin < 15` |

#### 1.1.4. Sortowanie
- Wielokolumnowe (Shift + klik)
- Domyślne: Status → Margin → Ik″_max

#### 1.1.5. Grupowanie

| Tryb grupowania | Opis |
|-----------------|------|
| By Voltage Level | Grupowanie po napięciu znamionowym |
| By Zone | Grupowanie po strefie |
| By Substation | Grupowanie po stacji |
| By Fault Type | Grupowanie po typie zwarcia |
| By Status | Grupowanie po statusie |
| By Compliance | Grupowanie po zgodności |
| Hierarchical | Zone → Substation → Bus |

#### 1.1.6. Eksporty

| Format | Zawartość | Opcje |
|--------|-----------|-------|
| CSV | Wszystkie kolumny | Separator: `,` / `;` / `\t` |
| Excel (.xlsx) | Wszystkie kolumny + formatowanie | Arkusze: Data, Summary, Metadata |
| PDF | Tabela + nagłówek Context Bar | A3/A4, Portrait/Landscape |
| JSON | Surowe dane + metadane | Pełny / Zminimalizowany |
| XML | Zgodność z IEC 61968 CIM | Profile: Full / Minimal |
| DXF | Eksport do CAD | Warstwy: Symbole, Tekst, Linie |

#### 1.1.7. Relacja z Proof i SLD

| Interakcja | Cel |
|------------|-----|
| Klik → Inspector | Otwarcie Element Inspector dla Bus |
| Klik → Proof | Otwarcie ProofGraph dla danego wyniku SC |
| Klik → SLD | Podświetlenie Bus na SLD + centrowanie widoku |
| Double-click → Proof Details | Otwarcie pełnego śladu obliczeń |

---

### 1.2. Widok: Zwarcia — Heatmapa systemowa (SC_SYSTEM_HEATMAP)

#### 1.2.1. Cel inżynierski
Wizualizacja **rozkładu prądów zwarciowych** na mapie ciepła dla całego systemu, umożliwiająca identyfikację obszarów o wysokich/niskich wartościach Ik″.

#### 1.2.2. Zakres danych

| Warstwa | Parametr | Skala kolorów |
|---------|----------|---------------|
| Ik″_max | Prąd zwarciowy max | Niebieski → Czerwony |
| Ik″_min | Prąd zwarciowy min | Zielony → Żółty |
| Margin | Margines do limitu | Czerwony → Zielony |
| Sk″ | Moc zwarciowa | Niebieski → Fioletowy |
| X/R Ratio | Stosunek X/R | Szary → Pomarańczowy |

#### 1.2.3. Filtry
- Zakres wartości (slider)
- Voltage Level
- Zone
- Fault Type

#### 1.2.4. Interakcje
- Hover → Tooltip z wartościami
- Klik → Inspector
- Klik + Shift → Dodanie do selekcji
- Eksport → PNG / SVG z legendą

---

### 1.3. Widok: Zwarcia — Ranking krytycznych węzłów (SC_CRITICAL_NODES)

#### 1.3.1. Cel inżynierski
Lista **TOP N węzłów krytycznych** pod względem wartości zwarciowych, marginesów i ryzyka.

#### 1.3.2. Zakres danych

| Kolumna | Opis |
|---------|------|
| Rank | Pozycja w rankingu |
| Bus | Identyfikator węzła |
| Ik″_max | Prąd zwarciowy |
| Equipment Rating | Wytrzymałość aparatury |
| Margin | Margines (%) |
| Risk Score | Wskaźnik ryzyka (0-100) |
| Trend | Zmiana vs poprzedni Run |
| Recommendations | Sugestie (upgrade, bypass, etc.) |

#### 1.3.3. Tryby rankingu

| Tryb | Kryterium |
|------|-----------|
| By Ik″_max | Najwyższe prądy zwarciowe |
| By Lowest Margin | Najmniejsze marginesy |
| By Risk Score | Najwyższe ryzyko |
| By Trend Regression | Najgorsze trendy |
| Custom | Wyrażenie użytkownika |

---

### 1.4. Widok: Minima / Maksima systemowe (SYSTEM_EXTREMES)

#### 1.4.1. Cel inżynierski
Dashboard prezentujący **wartości ekstremalne** dla całego systemu — minima i maksima dla kluczowych parametrów.

#### 1.4.2. Zakres danych — Sekcje

##### Sekcja: Napięcia (LF)

| Parametr | Min | Max | Element Min | Element Max |
|----------|-----|-----|-------------|-------------|
| V [kV] | — | — | Bus ID | Bus ID |
| V [%] | — | — | Bus ID | Bus ID |
| ΔV [%] | — | — | Bus ID | Bus ID |

##### Sekcja: Obciążenia (LF)

| Parametr | Min | Max | Element Min | Element Max |
|----------|-----|-----|-------------|-------------|
| I [%] | — | — | Line/Trafo ID | Line/Trafo ID |
| S [%] | — | — | Trafo ID | Trafo ID |
| Losses [kW] | — | — | Line/Trafo ID | Line/Trafo ID |

##### Sekcja: Zwarcia (SC)

| Parametr | Min | Max | Element Min | Element Max |
|----------|-----|-----|-------------|-------------|
| Ik″ [kA] | — | — | Bus ID | Bus ID |
| ip [kA] | — | — | Bus ID | Bus ID |
| Sk″ [MVA] | — | — | Bus ID | Bus ID |
| Margin [%] | — | — | Bus ID | Bus ID |

##### Sekcja: Straty (LF)

| Parametr | Suma | % systemu |
|----------|------|-----------|
| Straty linie [kW] | — | — |
| Straty trafo [kW] | — | — |
| Straty całkowite [kW] | — | — |

---

### 1.5. Widok: Przekroczenia normowe (NORMATIVE_VIOLATIONS)

#### 1.5.1. Cel inżynierski
Dedykowany widok dla **wszystkich przekroczeń limitów normowych** z podziałem na kategorie i normy.

#### 1.5.2. Zakres danych

| Kolumna | Opis |
|---------|------|
| Element | ID elementu |
| Parameter | Parametr naruszony |
| Value | Wartość obliczona |
| Limit | Wartość limitu |
| Excess | Przekroczenie (wartość) |
| Excess [%] | Przekroczenie (%) |
| Norm | Norma źródłowa |
| Clause | Paragraf normy |
| Severity | INFO / WARNING / CRITICAL / BLOCKER |
| Category | VOLTAGE / CURRENT / POWER / THERMAL / PROTECTION |
| Recommendation | Sugestia naprawy |

#### 1.5.3. Podział na kategorie

| Kategoria | Normy | Parametry |
|-----------|-------|-----------|
| VOLTAGE | PN-EN 50160, IEC 60038 | V%, ΔV%, THD |
| CURRENT | PN-HD 60364, IEC 60287 | I%, I_max |
| THERMAL | IEC 60287, IEC 60853 | Ith, θmax |
| SHORT_CIRCUIT | IEC 60909, PN-EN 60909 | Ik″, ip, Ith |
| PROTECTION | IEC 60255, PN-EN 60255 | Margins, Selectivity |

---

### 1.6. Widok: Bilans mocy systemowej (POWER_BALANCE)

#### 1.6.1. Cel inżynierski
Prezentacja **bilansu mocy czynnej i biernej** dla całego systemu z podziałem na źródła i odbiorniki.

#### 1.6.2. Zakres danych

| Sekcja | Parametry |
|--------|-----------|
| Generacja | P_gen [MW], Q_gen [MVAr], PF_avg |
| Obciążenia | P_load [MW], Q_load [MVAr], PF_avg |
| Straty | P_loss [kW], Q_loss [kVAr] |
| Import/Eksport | P_import [MW], P_export [MW] |
| Bilans | ΣP, ΣQ, Mismatch [kW] |

#### 1.6.3. Wizualizacja
- Wykres Sankey (przepływy mocy)
- Wykres kołowy (udział generacji)
- Wykres słupkowy (bilans per Zone)

---

### 1.7. Widok: Przepływy mocy (POWER_FLOWS)

#### 1.7.1. Cel inżynierski
Tabela **wszystkich przepływów mocy** na liniach i transformatorach z kierunkiem i wartościami.

#### 1.7.2. Zakres danych

| Kolumna | Opis |
|---------|------|
| Branch ID | Identyfikator gałęzi |
| From Bus | Węzeł początkowy |
| To Bus | Węzeł końcowy |
| P_from [MW] | Moc czynna (od strony From) |
| P_to [MW] | Moc czynna (od strony To) |
| Q_from [MVAr] | Moc bierna (od strony From) |
| Q_to [MVAr] | Moc bierna (od strony To) |
| S [MVA] | Moc pozorna |
| I [A] | Prąd |
| Loading [%] | Obciążenie |
| Losses_P [kW] | Straty mocy czynnej |
| Losses_Q [kVAr] | Straty mocy biernej |
| Direction | → / ← (kierunek dominujący) |

---

### 1.8. Widok: Stany napięciowe (VOLTAGE_PROFILE)

#### 1.8.1. Cel inżynierski
Prezentacja **profilu napięciowego** dla całego systemu z wykresami i analizą odchyleń.

#### 1.8.2. Zakres danych

| Widok | Opis |
|-------|------|
| Tabela | Bus ID, V [kV], V [%], V_nom, Angle, ΔV, Status |
| Wykres liniowy | Profil napięciowy wzdłuż feederów |
| Histogram | Rozkład V% w systemie |
| Box plot | Statystyki V% per Voltage Level |

---

### 1.9. Widok: Kontrybutorzy systemowi (SYSTEM_CONTRIBUTORS)

#### 1.9.1. Cel inżynierski
Analiza **źródeł prądów zwarciowych** dla całego systemu — które elementy wnoszą najwięcej do Ik″.

#### 1.9.2. Zakres danych

| Kolumna | Opis |
|---------|------|
| Contributor | Identyfikator źródła |
| Type | Grid, Generator, Motor, Backfeed |
| Ik″_contribution [kA] | Wkład do prądu zwarciowego |
| % of System | Udział w całkowitym Ik″ |
| Affected Buses | Lista węzłów dotkniętych |
| Max Impact | Maksymalny wpływ na pojedynczy węzeł |

---

### 1.10. Widok: Impedancje Thevenina (THEVENIN_IMPEDANCES)

#### 1.10.1. Cel inżynierski
Tabela **impedancji Thevenina** dla wszystkich węzłów — dane wejściowe do obliczeń SC.

#### 1.10.2. Zakres danych

| Kolumna | Opis |
|---------|------|
| Bus ID | Identyfikator węzła |
| R_th [mΩ] | Rezystancja Thevenina |
| X_th [mΩ] | Reaktancja Thevenina |
| Z_th [mΩ] | Impedancja Thevenina (moduł) |
| Z_th [°] | Impedancja Thevenina (kąt) |
| X/R | Stosunek X/R |
| Z_0 [mΩ] | Impedancja zerowa |
| Z_1 [mΩ] | Impedancja składowej zgodnej |
| Z_2 [mΩ] | Impedancja składowej przeciwnej |

---

## 2. WIDOKI PER-ELEMENT

### 2.1. Widoki dla LINII (LINES)

#### 2.1.1. Widok: Tabela linii — podstawowy (LINES_BASIC)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| Line ID | — | Identyfikator |
| Name | — | Nazwa |
| From Bus | — | Węzeł początkowy |
| To Bus | — | Węzeł końcowy |
| Voltage [kV] | kV | Napięcie znamionowe |
| Length [km] | km | Długość |
| Type | — | Overhead / Underground / Submarine |
| I [A] | A | Prąd obliczony |
| I [%] | % | Obciążenie |
| P [MW] | MW | Moc czynna |
| Q [MVAr] | MVAr | Moc bierna |
| Losses [kW] | kW | Straty |
| Status | — | OK / WARNING / VIOLATION |

#### 2.1.2. Widok: Tabela linii — parametry (LINES_PARAMETERS)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| R [Ω/km] | Ω/km | Rezystancja jednostkowa |
| X [Ω/km] | Ω/km | Reaktancja jednostkowa |
| B [µS/km] | µS/km | Susceptancja jednostkowa |
| R_total [Ω] | Ω | Rezystancja całkowita |
| X_total [Ω] | Ω | Reaktancja całkowita |
| B_total [µS] | µS | Susceptancja całkowita |
| I_nom [A] | A | Prąd znamionowy |
| I_max [A] | A | Prąd maksymalny |
| I_thermal [A] | A | Prąd dopuszczalny termicznie |
| Conductor | — | Materiał przewodu |
| Cross-section [mm²] | mm² | Przekrój |
| Ampacity [A] | A | Obciążalność prądowa |

#### 2.1.3. Widok: Tabela linii — składowe symetryczne (LINES_SYMMETRICAL)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| R_1 [Ω] | Ω | Rezystancja składowej zgodnej |
| X_1 [Ω] | Ω | Reaktancja składowej zgodnej |
| R_0 [Ω] | Ω | Rezystancja składowej zerowej |
| X_0 [Ω] | Ω | Reaktancja składowej zerowej |
| R_2 [Ω] | Ω | Rezystancja składowej przeciwnej |
| X_2 [Ω] | Ω | Reaktancja składowej przeciwnej |
| Z_1 [Ω] | Ω | Impedancja składowej zgodnej |
| Z_0 [Ω] | Ω | Impedancja składowej zerowej |
| Z_0/Z_1 | — | Stosunek impedancji |

#### 2.1.4. Widok: Tabela linii — termika (LINES_THERMAL)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| θ_ambient [°C] | °C | Temperatura otoczenia |
| θ_conductor [°C] | °C | Temperatura przewodu |
| θ_max [°C] | °C | Temperatura maksymalna |
| I_thermal [A] | A | Prąd dopuszczalny termicznie |
| Time_to_limit [s] | s | Czas do osiągnięcia limitu |
| Derating [%] | % | Obniżenie obciążalności |
| Cooling | — | Natural / Forced |

#### 2.1.5. Widok: Tabela linii — przepływy (LINES_FLOWS)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| P_from [MW] | MW | Moc czynna (strona From) |
| P_to [MW] | MW | Moc czynna (strona To) |
| Q_from [MVAr] | MVAr | Moc bierna (strona From) |
| Q_to [MVAr] | MVAr | Moc bierna (strona To) |
| S_from [MVA] | MVA | Moc pozorna (strona From) |
| S_to [MVA] | MVA | Moc pozorna (strona To) |
| I_from [A] | A | Prąd (strona From) |
| I_to [A] | A | Prąd (strona To) |
| Loss_P [kW] | kW | Straty mocy czynnej |
| Loss_Q [kVAr] | kVAr | Straty mocy biernej |
| Direction | — | → / ← |

---

### 2.2. Widoki dla KABLI (CABLES)

#### 2.2.1. Widok: Tabela kabli — podstawowy (CABLES_BASIC)

Struktura identyczna jak LINES_BASIC + dodatkowe kolumny:

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| Installation | — | Duct / Direct Buried / Tray |
| Depth [m] | m | Głębokość ułożenia |
| Soil Thermal Resistivity [K·m/W] | K·m/W | Rezystywność cieplna gruntu |
| Grouping Factor | — | Współczynnik grupowania |

#### 2.2.2. Widok: Tabela kabli — pojemnościowe (CABLES_CAPACITIVE)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| C [µF/km] | µF/km | Pojemność jednostkowa |
| C_total [µF] | µF | Pojemność całkowita |
| I_c [A] | A | Prąd pojemnościowy |
| Q_c [kVAr] | kVAr | Moc bierna pojemnościowa |
| Charging Current [A] | A | Prąd ładowania |

#### 2.2.3. Widok: Tabela kabli — termika szczegółowa (CABLES_THERMAL_DETAILED)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| θ_core [°C] | °C | Temperatura żyły |
| θ_sheath [°C] | °C | Temperatura powłoki |
| θ_surface [°C] | °C | Temperatura powierzchni |
| θ_soil [°C] | °C | Temperatura gruntu |
| R_th_insulation [K/W] | K/W | Rezystancja cieplna izolacji |
| R_th_sheath [K/W] | K/W | Rezystancja cieplna powłoki |
| R_th_soil [K/W] | K/W | Rezystancja cieplna gruntu |
| IEC 60287 Ampacity [A] | A | Obciążalność wg IEC 60287 |
| IEC 60853 Cyclic [A] | A | Obciążalność cykliczna |

---

### 2.3. Widoki dla TRANSFORMATORÓW (TRANSFORMERS)

#### 2.3.1. Widok: Tabela transformatorów — podstawowy (TRAFO_BASIC)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| Trafo ID | — | Identyfikator |
| Name | — | Nazwa |
| From Bus (HV) | — | Strona WN |
| To Bus (LV) | — | Strona NN |
| S_nom [MVA] | MVA | Moc znamionowa |
| V_prim [kV] | kV | Napięcie pierwotne |
| V_sec [kV] | kV | Napięcie wtórne |
| Vector Group | — | Grupa połączeń |
| S [MVA] | MVA | Moc obciążenia |
| S [%] | % | Obciążenie |
| Tap Position | — | Pozycja zaczepów |
| Losses [kW] | kW | Straty |
| Status | — | OK / WARNING / VIOLATION |

#### 2.3.2. Widok: Tabela transformatorów — parametry (TRAFO_PARAMETERS)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| u_k [%] | % | Napięcie zwarcia |
| u_k_r [%] | % | Składowa czynna u_k |
| u_k_x [%] | % | Składowa bierna u_k |
| P_fe [kW] | kW | Straty biegu jałowego |
| P_cu [kW] | kW | Straty obciążenia |
| I_0 [%] | % | Prąd biegu jałowego |
| R_T [Ω] | Ω | Rezystancja transformatora |
| X_T [Ω] | Ω | Reaktancja transformatora |
| Z_T [Ω] | Ω | Impedancja transformatora |

#### 2.3.3. Widok: Tabela transformatorów — zaczepy (TRAFO_TAPS)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| Tap_current | — | Aktualna pozycja |
| Tap_min | — | Minimalna pozycja |
| Tap_max | — | Maksymalna pozycja |
| Tap_neutral | — | Pozycja neutralna |
| Tap_step [%] | % | Krok regulacji |
| Tap_side | — | HV / LV |
| V_ratio_actual | — | Aktualny przekładnik |
| V_ratio_nominal | — | Nominalny przekładnik |
| Auto_tap | — | ON / OFF |

#### 2.3.4. Widok: Tabela transformatorów — straty szczegółowe (TRAFO_LOSSES)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| P_fe [kW] | kW | Straty w żelazie |
| P_cu [kW] | kW | Straty w miedzi |
| P_stray [kW] | kW | Straty rozproszone |
| P_total [kW] | kW | Straty całkowite |
| Q_m [kVAr] | kVAr | Moc bierna magnesowania |
| Efficiency [%] | % | Sprawność |
| Loss_factor | — | Współczynnik strat |

#### 2.3.5. Widok: Tabela transformatorów — składowe symetryczne (TRAFO_SYMMETRICAL)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| Z_1 [Ω] | Ω | Impedancja składowej zgodnej |
| Z_0 [Ω] | Ω | Impedancja składowej zerowej |
| Z_2 [Ω] | Ω | Impedancja składowej przeciwnej |
| Z_0/Z_1 | — | Stosunek Z_0/Z_1 |
| Ground_connection | — | Typ uziemienia |

#### 2.3.6. Widok: Tabela transformatorów — termika (TRAFO_THERMAL)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| θ_oil_top [°C] | °C | Temperatura oleju (góra) |
| θ_winding_hot [°C] | °C | Temperatura hotspot uzwojenia |
| θ_ambient [°C] | °C | Temperatura otoczenia |
| θ_rated [°C] | °C | Temperatura znamionowa |
| Cooling_type | — | ONAN / ONAF / OFAF |
| Overload_capacity [%] | % | Zdolność przeciążeniowa |
| LOL [h] | h | Loss of Life (godziny) |

---

### 2.4. Widoki dla ŹRÓDEŁ (SOURCES)

#### 2.4.1. Widok: Tabela źródeł — podstawowy (SOURCES_BASIC)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| Source ID | — | Identyfikator |
| Name | — | Nazwa |
| Bus | — | Węzeł przyłączenia |
| Type | — | Grid / Generator / PV / Wind / Battery / CHP |
| P_gen [MW] | MW | Moc czynna generowana |
| Q_gen [MVAr] | MVAr | Moc bierna generowana |
| S_gen [MVA] | MVA | Moc pozorna |
| P_max [MW] | MW | Moc maksymalna |
| P_min [MW] | MW | Moc minimalna |
| PF | — | Współczynnik mocy |
| Status | — | ON / OFF / STANDBY |

#### 2.4.2. Widok: Tabela źródeł — sieć (SOURCES_GRID)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| Sk″ [MVA] | MVA | Moc zwarciowa sieci |
| R_grid [mΩ] | mΩ | Rezystancja sieci |
| X_grid [mΩ] | mΩ | Reaktancja sieci |
| Z_grid [mΩ] | mΩ | Impedancja sieci |
| X/R_grid | — | Stosunek X/R |
| c_factor | — | Współczynnik napięcia |
| V_setpoint [kV] | kV | Nastawa napięcia |
| Voltage_regulation | — | ON / OFF |

#### 2.4.3. Widok: Tabela źródeł — generatory synchroniczne (SOURCES_SYNC_GENERATORS)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| S_rated [MVA] | MVA | Moc znamionowa |
| cos_φ_rated | — | Współczynnik mocy znamionowy |
| X_d [%] | % | Reaktancja synchroniczna podłużna |
| X_d' [%] | % | Reaktancja przejściowa |
| X_d″ [%] | % | Reaktancja nadprzejściowa |
| T_d' [s] | s | Stała czasowa przejściowa |
| T_d″ [s] | s | Stała czasowa nadprzejściowa |
| H [s] | s | Stała bezwładności |
| I_k″ [kA] | kA | Prąd zwarciowy początkowy |

#### 2.4.4. Widok: Tabela źródeł — OZE (SOURCES_RENEWABLES)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| Technology | — | PV / Wind Onshore / Wind Offshore |
| Installed_capacity [MW] | MW | Moc zainstalowana |
| Capacity_factor [%] | % | Współczynnik wykorzystania |
| Current_output [MW] | MW | Aktualna generacja |
| Forecast [MW] | MW | Prognoza generacji |
| I_k_contribution [kA] | kA | Wkład do prądu zwarciowego |
| FRT_capability | — | LVRT / HVRT |

---

### 2.5. Widoki dla PCC — Point of Common Coupling (PCC)

#### 2.5.1. Widok: Tabela PCC — podstawowy (PCC_BASIC)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| PCC ID | — | Identyfikator |
| Name | — | Nazwa |
| Bus | — | Węzeł PCC |
| Grid_operator | — | Operator sieci |
| Connection_type | — | HV / MV / LV |
| Contracted_power [MW] | MW | Moc umowna |
| V_nom [kV] | kV | Napięcie znamionowe |

#### 2.5.2. Widok: Tabela PCC — warunki przyłączeniowe (PCC_CONNECTION_CONDITIONS)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| Sk″_declared [MVA] | MVA | Zadeklarowana moc zwarciowa |
| Sk″_calculated [MVA] | MVA | Obliczona moc zwarciowa |
| Sk″_difference [%] | % | Różnica |
| Ik″_max [kA] | kA | Maksymalny prąd zwarciowy |
| V_min [%] | % | Minimalne dopuszczalne napięcie |
| V_max [%] | % | Maksymalne dopuszczalne napięcie |
| PF_required | — | Wymagany współczynnik mocy |
| THD_limit [%] | % | Limit THD |

#### 2.5.3. Widok: Tabela PCC — wymiana mocy (PCC_POWER_EXCHANGE)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| P_import [MW] | MW | Moc importowana |
| P_export [MW] | MW | Moc eksportowana |
| Q_import [MVAr] | MVAr | Moc bierna importowana |
| Q_export [MVAr] | MVAr | Moc bierna eksportowana |
| PF_measured | — | Zmierzony współczynnik mocy |
| PF_compliance | — | COMPLIANT / NON_COMPLIANT |
| Energy_import [MWh] | MWh | Energia importowana |
| Energy_export [MWh] | MWh | Energia eksportowana |

#### 2.5.4. Widok: Tabela PCC — jakość energii (PCC_POWER_QUALITY)

| Kolumna | Jednostka | Opis |
|---------|-----------|------|
| THD_U [%] | % | THD napięciowe |
| THD_I [%] | % | THD prądowe |
| Unbalance [%] | % | Asymetria napięć |
| Flicker_Pst | — | Wskaźnik migotania krótkookresowy |
| Flicker_Plt | — | Wskaźnik migotania długookresowy |
| Harmonics | — | Tabela harmonicznych (h3-h40) |

---

## 3. WIDOKI PER-CASE / PER-RUN / PER-SNAPSHOT

### 3.1. Widok: Lista Case'ów (CASES_LIST)

#### 3.1.1. Cel inżynierski
Przegląd **wszystkich Case'ów** w projekcie z metadanymi i statusem.

#### 3.1.2. Zakres danych

| Kolumna | Opis |
|---------|------|
| Case ID | Identyfikator |
| Name | Nazwa |
| Description | Opis |
| Created | Data utworzenia |
| Modified | Data modyfikacji |
| Author | Autor |
| Status | DRAFT / VALIDATED / APPROVED / ARCHIVED |
| Snapshots_count | Liczba Snapshot'ów |
| Runs_count | Liczba uruchomień analiz |
| Violations_count | Liczba naruszeń |
| Baseline | Czy jest bazowy |

---

### 3.2. Widok: Lista Snapshot'ów dla Case (SNAPSHOTS_LIST)

| Kolumna | Opis |
|---------|------|
| Snapshot ID | Identyfikator |
| Name | Nazwa |
| Timestamp | Znacznik czasu |
| Type | BASELINE / VARIANT / SCENARIO / CONTINGENCY |
| Description | Opis zmian |
| Switching_state | Opis stanu łączeniowego |
| Topology_diff | Różnice topologiczne vs baseline |
| Analysis_runs | Lista uruchomionych analiz |

---

### 3.3. Widok: Lista Analysis Runs (RUNS_LIST)

| Kolumna | Opis |
|---------|------|
| Run ID | Identyfikator |
| Case | Case źródłowy |
| Snapshot | Snapshot źródłowy |
| Analysis_type | LF / SC / SENSITIVITY / CONTINGENCY / PROOF |
| Timestamp | Data i czas uruchomienia |
| Duration [s] | Czas obliczeń |
| Solver_version | Wersja solvera |
| Norm | Norma (IEC 60909, PN-EN, etc.) |
| Status | SUCCESS / WARNING / ERROR / PARTIAL |
| Converged | TAK / NIE |
| Iterations | Liczba iteracji |
| Max_mismatch [kW] | Maksymalny błąd zbieżności |
| Violations_count | Liczba naruszeń |
| User | Użytkownik |

---

### 3.4. Widok: Porównanie Run'ów (RUNS_COMPARISON)

| Kolumna | Opis |
|---------|------|
| Parameter | Parametr porównywany |
| Run A | Wartość w Run A |
| Run B | Wartość w Run B |
| Delta | Różnica (B - A) |
| Delta [%] | Różnica procentowa |
| Trend | ↑ / ↓ / = |
| Significance | LOW / MEDIUM / HIGH / CRITICAL |

---

### 3.5. Widok: Statusy limitów per Case (LIMITS_STATUS_MATRIX)

| Element | Case 1 | Case 2 | Case 3 | Case 4 |
|---------|--------|--------|--------|--------|
| Bus 15-01 V% | ✅ OK | ⚠️ WARNING | ❌ VIOLATION | ✅ OK |
| Line L-01 I% | ✅ OK | ✅ OK | ⚠️ WARNING | ❌ VIOLATION |
| ... | ... | ... | ... | ... |

---

## 4. WIDOKI PORÓWNAWCZE (COMPARE)

### 4.1. Widok: Case ↔ Case Comparison (CASE_COMPARISON)

#### 4.1.1. Cel inżynierski
Porównanie **dwóch lub więcej Case'ów** z wizualizacją różnic.

#### 4.1.2. Struktura widoku

| Sekcja | Zawartość |
|--------|-----------|
| Case Selector | Wybór Case A, Case B, (Case C) |
| Delta Table | Tabela różnic per element |
| Summary | Podsumowanie: improved, regressed, unchanged |
| SLD Overlay | Nakładka różnic na SLD |

#### 4.1.3. Zakres danych Delta Table

| Kolumna | Opis |
|---------|------|
| Element | Identyfikator |
| Parameter | Parametr porównywany |
| Case A Value | Wartość w Case A |
| Case B Value | Wartość w Case B |
| Case C Value | Wartość w Case C (opcjonalnie) |
| Δ(B-A) | Różnica B - A |
| Δ(B-A) [%] | Różnica procentowa |
| Δ(C-A) | Różnica C - A |
| Δ(C-A) [%] | Różnica procentowa |
| Status_change | IMPROVED / REGRESSED / UNCHANGED |

---

### 4.2. Widok: Run ↔ Run Comparison (RUN_COMPARISON)

#### 4.2.1. Cel inżynierski
Porównanie **dwóch uruchomień analiz** — np. przed i po modyfikacji parametrów.

#### 4.2.2. Struktura
Analogiczna do CASE_COMPARISON z dodatkowym kontekstem:
- Różnice w parametrach wejściowych
- Różnice w wynikach
- Różnice w czasie obliczeń

---

### 4.3. Widok: Configuration ↔ Configuration Comparison (CONFIG_COMPARISON)

#### 4.3.1. Cel inżynierski
Porównanie **konfiguracji sieci** (topologii, parametrów elementów) między dwoma stanami.

#### 4.3.2. Zakres danych

| Sekcja | Zawartość |
|--------|-----------|
| Topology Changes | Dodane/usunięte elementy |
| Parameter Changes | Zmienione parametry |
| Switching Changes | Zmienione stany łączeniowe |
| Impact Analysis | Wpływ zmian na wyniki |

---

### 4.4. Widok: Snapshot ↔ Snapshot Comparison (SNAPSHOT_COMPARISON)

#### 4.4.1. Cel inżynierski
Porównanie **dwóch Snapshot'ów** w ramach jednego Case — np. różne scenariusze łączeniowe.

#### 4.4.2. Struktura
- Tabela zmian stanów łączeniowych
- Tabela zmian wyników
- Wizualizacja na SLD

---

### 4.5. Widok: Time Series Comparison (TIME_SERIES)

#### 4.5.1. Cel inżynierski
Analiza **zmian w czasie** dla wybranych parametrów — trend analysis.

#### 4.5.2. Zakres danych

| Element | Parametr | T1 | T2 | T3 | ... | Tn | Trend | Min | Max | Avg |
|---------|----------|----|----|----|----|-------|-------|-----|-----|-----|
| Bus 15-01 | V% | 102.1 | 102.3 | 101.8 | ... | 103.5 | ↑ | 101.8 | 103.5 | 102.5 |

#### 4.5.3. Wizualizacja
- Wykres liniowy
- Wykres obszarowy
- Sparkline w tabeli

---

### 4.6. Widok: Multi-Scenario Matrix (SCENARIO_MATRIX)

#### 4.6.1. Cel inżynierski
Macierz **wszystkich scenariuszy** z kluczowymi wskaźnikami.

| Scenariusz | V_min [%] | V_max [%] | I_max [%] | Losses [kW] | Violations |
|------------|-----------|-----------|-----------|-------------|------------|
| Baseline | 97.5 | 103.2 | 85.4 | 125.3 | 0 |
| Peak Load | 95.1 | 102.8 | 98.7 | 187.6 | 2 |
| Min Load | 99.8 | 105.1 | 42.3 | 45.2 | 1 |
| N-1 Line | 94.2 | 103.5 | 112.5 | 201.4 | 5 |

---

## 5. DECISION SUPPORT LAYER — WARSTWA WSPARCIA DECYZYJNEGO

### 5.1. Filozofia warstwy decyzyjnej

**DECISION SUPPORT LAYER** to warstwa UI, która **nie tylko prezentuje dane**, ale **prowadzi inżyniera do decyzji**. Każdy widok w tej warstwie odpowiada na pytanie: **„Co powinienem teraz zrobić?"**

| Zasada | Opis |
|--------|------|
| **DATA → INSIGHT → ACTION** | Od danych przez wgląd do działania |
| **ZERO INTERPRETACJI WYMAGANYCH** | Wynik jest czytelny bez dodatkowej analizy |
| **PRIORYTETYZACJA PROBLEMÓW** | Najważniejsze problemy na górze |
| **REKOMENDACJE KONTEKSTOWE** | Sugestie dostosowane do sytuacji |
| **NEXT STEP GUIDANCE** | Jasna ścieżka działania |

---

### 5.2. Widok: Ocena spełnienia norm (NORM_COMPLIANCE_ASSESSMENT)

#### 5.2.1. Cel decyzyjny
Jednoznaczna odpowiedź na pytanie: **„Czy sieć spełnia wymagania normowe?"**

#### 5.2.2. Struktura widoku

| Sekcja | Zawartość | Cel decyzyjny |
|--------|-----------|---------------|
| **VERDICT BANNER** | PASS ✅ / FAIL ❌ / WARNING ⚠️ | Natychmiastowa ocena globalna |
| **NORM CHECKLIST** | Lista norm z statusem | Które normy są naruszone |
| **VIOLATION SUMMARY** | Liczba i kategorie naruszeń | Skala problemu |
| **BLOCKING ISSUES** | Krytyczne naruszenia | Co blokuje zatwierdzenie |
| **RECOMMENDATIONS** | Sugestie naprawy | Co zrobić dalej |

#### 5.2.3. VERDICT BANNER — Definicja stanów

| Status | Warunek | Kolor | Ikona | Komunikat |
|--------|---------|-------|-------|-----------|
| **PASS** | 0 violations, 0 warnings | Zielony (#28a745) | ✅ | „Sieć spełnia wszystkie wymagania normowe" |
| **WARNING** | 0 violations, ≥1 warnings | Żółty (#ffc107) | ⚠️ | „Sieć spełnia wymagania z uwagami" |
| **FAIL** | ≥1 violations | Czerwony (#dc3545) | ❌ | „Sieć NIE spełnia wymagań normowych" |

#### 5.2.4. NORM CHECKLIST — Struktura

| Norma | Status | Violations | Warnings | Details |
|-------|--------|------------|----------|---------|
| IEC 60909 (SC) | ✅ PASS | 0 | 0 | [Expand] |
| PN-EN 50160 (Voltage) | ⚠️ WARNING | 0 | 3 | [Expand] |
| IEC 60287 (Thermal) | ❌ FAIL | 2 | 1 | [Expand] |
| PN-HD 60364 (Installation) | ✅ PASS | 0 | 0 | [Expand] |

#### 5.2.5. BLOCKING ISSUES — Sekcja krytyczna

| Element | Norma | Parametr | Wartość | Limit | Przekroczenie | Akcja |
|---------|-------|----------|---------|-------|---------------|-------|
| Bus 15-03 | IEC 60909 | Ik″_max | 32.5 kA | 25 kA | +30% | [Fix] [Details] [Proof] |
| Line L-07 | IEC 60287 | θ_max | 92°C | 70°C | +31% | [Fix] [Details] [Proof] |

#### 5.2.6. RECOMMENDATIONS — Sekcje rekomendacji

| Priorytet | Rekomendacja | Wpływ | Koszt | Akcja |
|-----------|--------------|-------|-------|-------|
| 🔴 CRITICAL | Wymień aparaturę w Bus 15-03 na 31.5 kA | Eliminacja violation SC | Wysoki | [Simulate] |
| 🔴 CRITICAL | Zwiększ przekrój kabla L-07 | Eliminacja violation thermal | Średni | [Simulate] |
| 🟡 MEDIUM | Sprawdź nastawy zabezpieczeń | Poprawa marginesów | Niski | [Review] |

---

### 5.3. Widok: Ranking elementów krytycznych (CRITICAL_ELEMENTS_RANKING)

#### 5.3.1. Cel decyzyjny
Odpowiedź na pytanie: **„Które elementy wymagają natychmiastowej uwagi?"**

#### 5.3.2. Struktura widoku

| Kolumna | Opis | Cel |
|---------|------|-----|
| **RANK** | Pozycja w rankingu krytyczności | Priorytetyzacja |
| **ELEMENT** | Identyfikator i nazwa | Identyfikacja |
| **RISK SCORE** | Wskaźnik ryzyka 0-100 | Obiektywna ocena |
| **VIOLATIONS** | Liczba naruszeń | Skala problemu |
| **MARGIN** | Najmniejszy margines | Bliskość limitu |
| **TREND** | Zmiana vs poprzedni Run | Kierunek zmian |
| **ROOT CAUSE** | Główna przyczyna | Zrozumienie problemu |
| **RECOMMENDED ACTION** | Sugestia działania | Następny krok |

#### 5.3.3. RISK SCORE — Algorytm

| Składnik | Waga | Opis |
|----------|------|------|
| Violation count | 40% | Liczba naruszeń × 10 punktów |
| Lowest margin | 30% | (1 - margin/100) × 30 punktów |
| Criticality class | 20% | CRITICAL=20, HIGH=15, MEDIUM=10, LOW=5 |
| Trend regression | 10% | Pogorszenie vs poprzedni Run |

#### 5.3.4. Interakcje

| Akcja | Efekt |
|-------|-------|
| Klik na wiersz | Otwarcie Element Inspector |
| Klik na „ROOT CAUSE" | Otwarcie ProofGraph z podświetloną przyczyną |
| Klik na „RECOMMENDED ACTION" | Otwarcie What-If Preview z sugerowaną zmianą |

---

### 5.4. Widok: Główne przyczyny przekroczeń (ROOT_CAUSE_ANALYSIS)

#### 5.4.1. Cel decyzyjny
Odpowiedź na pytanie: **„Dlaczego sieć nie spełnia wymagań?"**

#### 5.4.2. Struktura widoku — Drzewo przyczynowo-skutkowe

```
VIOLATION: Bus 15-03 Ik″_max = 32.5 kA > 25 kA
│
├── DIRECT CAUSE: Wysokie Sk″ sieci zasilającej
│   │
│   ├── CONTRIBUTOR 1: Grid Source (Sk″ = 500 MVA) — 65%
│   │   └── ROOT: Warunki przyłączenia OSD
│   │
│   └── CONTRIBUTOR 2: Generator G-01 (Xd″ = 15%) — 35%
│       └── ROOT: Parametry generatora
│
└── AGGRAVATING FACTOR: Niska impedancja transformatora T-01 (uk = 4%)
    └── ROOT: Specyfikacja transformatora
```

#### 5.4.3. Tabela przyczyn z rekomendacjami

| Przyczyna | Typ | Wpływ | Możliwość zmiany | Rekomendacja |
|-----------|-----|-------|------------------|--------------|
| Warunki przyłączenia OSD | EXTERNAL | 65% | NIE | Weryfikacja z OSD |
| Parametry generatora G-01 | DESIGN | 35% | TAK | Zwiększenie Xd″ |
| Niska impedancja T-01 | DESIGN | 15% | TAK | Transformator z wyższym uk |

#### 5.4.4. Interakcje

| Akcja | Efekt |
|-------|-------|
| Klik na przyczynę | Rozwinięcie szczegółów |
| Klik na „Rekomendacja" | Otwarcie What-If Preview |
| Klik na „EXTERNAL" | Informacja o ograniczeniach zewnętrznych |

---

### 5.5. Widok: Wpływ parametrów — Sensitivity Light (SENSITIVITY_LIGHT)

#### 5.5.1. Cel decyzyjny
Odpowiedź na pytanie: **„Które parametry mają największy wpływ na wynik?"**

#### 5.5.2. Struktura widoku

| Parametr | Element | Wartość bazowa | Wpływ na Ik″ | Wpływ na V% | Wpływ na I% |
|----------|---------|----------------|--------------|-------------|-------------|
| Sk″_grid | Grid Source | 500 MVA | ████████ 85% | ░░░░░░░░ 5% | ░░░░░░░░ 8% |
| uk_T01 | Trafo T-01 | 6% | ████░░░░ 45% | ██░░░░░░ 15% | ██░░░░░░ 12% |
| X_L01 | Line L-01 | 0.4 Ω/km | ██░░░░░░ 20% | ████░░░░ 35% | ████████ 78% |

#### 5.5.3. Wizualizacja — Tornado Chart

```
Wpływ na Ik″_max (Bus 15-03):

Sk″_grid     ████████████████████████████████████████ +8.5 kA
uk_T01       ████████████████████░░░░░░░░░░░░░░░░░░░░ +4.2 kA
Xd″_G01      ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ +2.1 kA
X_L01        ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ +0.8 kA
             ─────────────────────────────────────────
             -10 kA           0           +10 kA
```

#### 5.5.4. Interakcje

| Akcja | Efekt |
|-------|-------|
| Klik na parametr | Otwarcie slidera What-If |
| Hover na bar | Tooltip z dokładną wartością wpływu |
| Klik na „Explore" | Pełna analiza Sensitivity dla parametru |

---

### 5.6. Widok: What-If Preview (WHAT_IF_PREVIEW)

#### 5.6.1. Cel decyzyjny
Odpowiedź na pytanie: **„Co się stanie, jeśli zmienię ten parametr?"**

**WAŻNE**: What-If Preview **NIE URUCHAMIA SOLVERA**. Używa aproksymacji liniowej z ostatniego pełnego obliczenia.

#### 5.6.2. Struktura widoku

| Sekcja | Zawartość |
|--------|-----------|
| **PARAMETER SELECTOR** | Wybór parametru do zmiany |
| **VALUE SLIDER** | Slider z zakresem wartości |
| **INSTANT PREVIEW** | Natychmiastowy podgląd wpływu |
| **CONFIDENCE INDICATOR** | Wskaźnik dokładności aproksymacji |
| **RUN FULL ANALYSIS** | Przycisk uruchomienia pełnego obliczenia |

#### 5.6.3. INSTANT PREVIEW — Struktura

| Parametr | Wartość bazowa | Nowa wartość | Zmiana | Wpływ na wynik |
|----------|----------------|--------------|--------|----------------|
| uk_T01 | 6% | 8% | +2% | Ik″_max: 32.5 → 28.7 kA (↓12%) |

| Wynik | Przed | Po (preview) | Zmiana | Nowy status |
|-------|-------|--------------|--------|-------------|
| Ik″_max | 32.5 kA | ~28.7 kA | -3.8 kA | ⚠️ WARNING (limit 25 kA) |
| Margin | -30% | ~-15% | +15% | Poprawa, nadal violation |

#### 5.6.4. CONFIDENCE INDICATOR

| Confidence | Warunek | Kolor | Komunikat |
|------------|---------|-------|-----------|
| HIGH | Zmiana < 10% wartości bazowej | Zielony | „Aproksymacja wiarygodna" |
| MEDIUM | Zmiana 10-25% | Żółty | „Aproksymacja orientacyjna" |
| LOW | Zmiana > 25% | Czerwony | „Wymagane pełne obliczenie" |

#### 5.6.5. Interakcje

| Akcja | Efekt |
|-------|-------|
| Przesunięcie slidera | Natychmiastowy update preview |
| Klik „Apply & Run" | Zastosowanie zmiany + uruchomienie solvera |
| Klik „Reset" | Powrót do wartości bazowej |
| Klik „Compare" | Dodanie wariantu do porównania |

---

### 5.7. Widok: Action Plan Generator (ACTION_PLAN_GENERATOR)

#### 5.7.1. Cel decyzyjny
Odpowiedź na pytanie: **„Jaki jest plan naprawy sieci?"**

#### 5.7.2. Struktura widoku

| Sekcja | Zawartość |
|--------|-----------|
| **PROBLEM SUMMARY** | Podsumowanie naruszeń |
| **PROPOSED ACTIONS** | Lista proponowanych działań |
| **IMPACT MATRIX** | Macierz wpływu działań na naruszenia |
| **PRIORITY SEQUENCE** | Sekwencja działań (co najpierw) |
| **COST-BENEFIT** | Analiza kosztów i korzyści |

#### 5.7.3. PROPOSED ACTIONS — Struktura

| # | Działanie | Typ | Wpływ | Koszt | Priorytet | Status |
|---|-----------|-----|-------|-------|-----------|--------|
| 1 | Wymiana aparatury Bus 15-03 na 31.5 kA | CAPEX | Eliminacja 1 violation SC | Wysoki | 🔴 CRITICAL | [Simulate] |
| 2 | Transformator T-01: uk 6% → 8% | REPLACE | Redukcja Ik″ o 12% | Średni | 🟡 HIGH | [Simulate] |
| 3 | Kabel L-07: zwiększenie przekroju | UPGRADE | Eliminacja 1 violation thermal | Średni | 🔴 CRITICAL | [Simulate] |

#### 5.7.4. IMPACT MATRIX

| Działanie | V-001 (SC) | V-002 (Thermal) | W-001 (Voltage) | W-002 (Margin) |
|-----------|------------|-----------------|-----------------|----------------|
| Wymiana aparatury | ✅ FIX | — | — | ✅ IMPROVE |
| Transformator uk 8% | ⚠️ REDUCE | — | — | ✅ IMPROVE |
| Kabel L-07 upgrade | — | ✅ FIX | — | ✅ IMPROVE |

#### 5.7.5. PRIORITY SEQUENCE

```
REKOMENDOWANA KOLEJNOŚĆ DZIAŁAŃ:

1. [CRITICAL] Wymiana aparatury Bus 15-03
   └── Eliminuje blocking violation SC

2. [CRITICAL] Upgrade kabla L-07
   └── Eliminuje blocking violation thermal

3. [HIGH] Zmiana transformatora T-01
   └── Zwiększa marginesy, redukuje ryzyko

4. [MEDIUM] Przegląd nastaw zabezpieczeń
   └── Optymalizacja koordynacji
```

---

### 5.8. Widok: Decision Dashboard (DECISION_DASHBOARD)

#### 5.8.1. Cel decyzyjny
Centralne miejsce podejmowania decyzji — **„Command Center"** dla inżyniera.

#### 5.8.2. Struktura widoku — Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ DECISION DASHBOARD                                            [Case: Main] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────────┐ │
│ │   VERDICT BANNER    │ │   RISK SUMMARY      │ │   TREND INDICATOR       │ │
│ │   ❌ FAIL (2)       │ │   🔴 HIGH (65/100)  │ │   ↓ REGRESSED (-12%)   │ │
│ └─────────────────────┘ └─────────────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ BLOCKING ISSUES (must fix before approval)                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 1. Bus 15-03: Ik″ = 32.5 kA > 25 kA         [Fix] [Details] [Proof]    │ │
│ │ 2. Line L-07: θ = 92°C > 70°C               [Fix] [Details] [Proof]    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ TOP 5 CRITICAL ELEMENTS              │ RECOMMENDED NEXT STEPS              │
│ ┌───────────────────────────────────┐│┌───────────────────────────────────┐│
│ │ 1. Bus 15-03 (Risk: 95) [→]      │││ 1. Review blocking issues          ││
│ │ 2. Line L-07 (Risk: 88) [→]      │││ 2. Run What-If for T-01 upgrade    ││
│ │ 3. Bus 15-01 (Risk: 72) [→]      │││ 3. Generate Action Plan            ││
│ │ 4. Trafo T-01 (Risk: 65) [→]     │││ 4. Schedule review meeting         ││
│ │ 5. Line L-03 (Risk: 58) [→]      │││ 5. Export compliance report        ││
│ └───────────────────────────────────┘│└───────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│ QUICK ACTIONS: [Run Analysis ▼] [Compare Cases] [Export Report] [Approve]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.8.3. Widgety

| Widget | Zawartość | Interakcja |
|--------|-----------|------------|
| VERDICT BANNER | Status globalny PASS/FAIL/WARNING | Klik → NORM_COMPLIANCE_ASSESSMENT |
| RISK SUMMARY | Wskaźnik ryzyka 0-100 | Klik → CRITICAL_ELEMENTS_RANKING |
| TREND INDICATOR | Zmiana vs poprzedni Run | Klik → RUN_COMPARISON |
| BLOCKING ISSUES | Lista krytycznych naruszeń | Klik → Element Inspector |
| TOP 5 CRITICAL | Ranking elementów | Klik → Element Inspector |
| RECOMMENDED NEXT STEPS | Sugestie działań | Klik → wykonanie akcji |

---

### 5.9. Widok: Approval Readiness Check (APPROVAL_READINESS)

#### 5.9.1. Cel decyzyjny
Odpowiedź na pytanie: **„Czy projekt jest gotowy do zatwierdzenia?"**

#### 5.9.2. Struktura widoku — Checklist

| Kategoria | Wymóg | Status | Akcja |
|-----------|-------|--------|-------|
| **COMPLIANCE** | Brak naruszeń normowych | ❌ FAIL | [View Violations] |
| **COMPLIANCE** | Wszystkie warnings reviewed | ⚠️ PENDING | [Review Warnings] |
| **DATA QUALITY** | Kompletność danych wejściowych | ✅ PASS | [View Data] |
| **DATA QUALITY** | Katalogi aktualne | ✅ PASS | [View Catalogs] |
| **CALCULATIONS** | LF converged | ✅ PASS | [View Results] |
| **CALCULATIONS** | SC completed | ✅ PASS | [View Results] |
| **REVIEW** | Proof reviewed | ⚠️ PENDING | [Review Proof] |
| **REVIEW** | Comments resolved | ⚠️ PENDING | [View Comments] |
| **APPROVAL** | Technical approval | ⏳ WAITING | [Request Approval] |
| **APPROVAL** | Managerial approval | ⏳ WAITING | [Request Approval] |

#### 5.9.3. APPROVAL GATE

| Gate | Warunek | Status |
|------|---------|--------|
| **GATE 1: Technical** | 0 violations + all warnings reviewed | ❌ BLOCKED |
| **GATE 2: Review** | Proof reviewed + comments resolved | ⚠️ PENDING |
| **GATE 3: Approval** | Technical + Managerial approval | ⏳ WAITING |

---

# CZĘŚĆ II: PROOF / ŚLAD OBLICZEŃ — MAKSYMALNA ARCHITEKTURA

---

## 5. FILOZOFIA PROOF

### 5.1. Definicja Proof jako produktu premium

**PROOF** w MV-DESIGN-PRO to **nie raport** — to **interaktywny produkt klasy premium** dla audytu i weryfikacji obliczeń. PROOF musi spełniać następujące wymagania:

| Wymaganie | Opis |
|-----------|------|
| **Pełna transparentność** | Każdy krok obliczeniowy jest widoczny |
| **Śledzenie wsteczne** | Od wyniku do danych wejściowych |
| **Weryfikowalność** | Możliwość ręcznego sprawdzenia każdego kroku |
| **Audytowalność** | Zgodność z normami, możliwość eksportu |
| **Interaktywność** | Nawigacja, rozwijanie, filtrowanie |

---

## 6. WIDOKI PROOF

### 6.1. ProofGraph — Widok strukturalny (PROOF_GRAPH)

#### 6.1.1. Cel inżynierski
Wizualizacja **struktury obliczeń** jako grafu zależności — od danych wejściowych do wyników końcowych.

#### 6.1.2. Struktura grafu

```
[Dane katalogowe] ──→ [Impedancje elementów] ──→ [Macierz admitancji Y]
                                                        │
                                                        ▼
[Stan łączeniowy] ──→ [Topologia sieci] ──────→ [Redukcja Thevenina]
                                                        │
                                                        ▼
[Parametry zwarcia] ──→ [Obliczenia SC] ──────→ [Ik″, ip, Ith, Sk″]
                                                        │
                                                        ▼
                                              [Weryfikacja limitów]
                                                        │
                                                        ▼
                                              [Status: OK / VIOLATION]
```

#### 6.1.3. Elementy grafu

| Typ węzła | Opis | Ikona |
|-----------|------|-------|
| INPUT | Dane wejściowe (katalog, parametry) | 📥 |
| CALCULATION | Krok obliczeniowy | ⚙️ |
| INTERMEDIATE | Wynik pośredni | 📊 |
| OUTPUT | Wynik końcowy | 📤 |
| VERIFICATION | Weryfikacja limitów | ✓/✗ |

#### 6.1.4. Interakcje

| Akcja | Efekt |
|-------|-------|
| Klik na węzeł | Otwarcie szczegółów kroku |
| Hover | Tooltip z wartościami |
| Double-click | Rozwinięcie podgrafu |
| Right-click | Menu kontekstowe (export, copy, navigate) |
| Drag | Przesuwanie widoku |
| Scroll | Zoom |

---

### 6.2. Widok matematyczny — Wzory (PROOF_FORMULAS)

#### 6.2.1. Cel inżynierski
Prezentacja **wzorów matematycznych** użytych w obliczeniach z pełnym kontekstem normowym.

#### 6.2.2. Struktura widoku

Dla każdego kroku obliczeniowego:

| Sekcja | Zawartość |
|--------|-----------|
| **Nazwa kroku** | Np. "Obliczenie prądu zwarciowego początkowego Ik″" |
| **Norma źródłowa** | IEC 60909-0:2016, Clause 4.3.1.1 |
| **Wzór ogólny** | $I_k'' = \frac{c \cdot U_n}{\sqrt{3} \cdot Z_k}$ |
| **Wzór rozwinięty** | $I_k'' = \frac{c \cdot U_n}{\sqrt{3} \cdot \sqrt{R_k^2 + X_k^2}}$ |
| **Jednostki** | Ik″ [kA], Un [kV], Zk [Ω] |
| **Warunki stosowania** | Dla zwarć trójfazowych symetrycznych |
| **Warianty** | c_max / c_min, near-to-generator / far-from-generator |

#### 6.2.3. Przykład prezentacji wzoru

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ KROK: Obliczenie prądu zwarciowego początkowego Ik″                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Norma: IEC 60909-0:2016, Clause 4.3.1.1 (Equation 23)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                      c · U_n                                                │
│ Wzór:    I_k″ = ─────────────────                                           │
│                   √3 · |Z_k|                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Gdzie:                                                                      │
│   I_k″  — prąd zwarciowy początkowy [kA]                                   │
│   c     — współczynnik napięcia (c_max = 1.1 dla MV)                        │
│   U_n   — napięcie znamionowe sieci [kV]                                    │
│   Z_k   — impedancja zwarciowa [Ω]                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Wariant: c_max dla obliczeń maksymalnych prądów zwarciowych                 │
│ Zastosowanie: Far-from-generator short circuit (IEC 60909, Clause 4.2)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.3. Widok tabelaryczny — Dane liczbowe (PROOF_DATA_TABLE)

#### 6.3.1. Cel inżynierski
Prezentacja **wszystkich danych liczbowych** użytych w obliczeniach w formie tabelarycznej.

#### 6.3.2. Struktura tabeli

| Parametr | Symbol | Wartość | Jednostka | Źródło | Norma |
|----------|--------|---------|-----------|--------|-------|
| Napięcie znamionowe | U_n | 20.0 | kV | Katalog | — |
| Współczynnik napięcia | c_max | 1.1 | — | IEC 60909 | Tab. 1 |
| Rezystancja sieci | R_Q | 0.052 | Ω | Obliczone | — |
| Reaktancja sieci | X_Q | 0.523 | Ω | Obliczone | — |
| Impedancja zwarciowa | Z_k | 0.526 | Ω | Obliczone | — |
| Prąd zwarciowy | I_k″ | 24.17 | kA | Obliczone | — |

#### 6.3.3. Grupowanie danych

| Grupa | Parametry |
|-------|-----------|
| Dane katalogowe | U_n, S_n, u_k, P_Cu, P_Fe |
| Współczynniki normowe | c_max, c_min, κ, μ, m, n |
| Impedancje elementów | R, X, Z per element |
| Impedancje wypadkowe | R_k, X_k, Z_k, Z_th |
| Wyniki zwarciowe | I_k″, ip, Ith, Sk″ |

---

### 6.4. Widok krokowy — Sekwencja obliczeń (PROOF_STEP_BY_STEP)

#### 6.4.1. Cel inżynierski
Prezentacja obliczeń jako **sekwencji kroków** — od danych wejściowych do wyniku końcowego.

#### 6.4.2. Struktura widoku

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ KROK 1/12: Obliczenie impedancji transformatora                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Wzór:                                                                       │
│             u_k    U_n²                                                     │
│   Z_T = ───────── · ─────                                                   │
│            100      S_n                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Dane wejściowe:                                                             │
│   u_k = 6.0 %        (z katalogu transformatora)                            │
│   U_n = 20.0 kV      (napięcie strony WN)                                   │
│   S_n = 25.0 MVA     (moc znamionowa transformatora)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Podstawienie:                                                               │
│             6.0      (20.0)²                                                │
│   Z_T = ────────── · ────────                                               │
│            100       25.0                                                   │
│                                                                             │
│   Z_T = 0.06 · 16.0                                                         │
│   Z_T = 0.96 Ω                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Wynik:                                                                      │
│   Z_T = 0.96 Ω                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Powiązanie:                                                                 │
│   → Używane w: KROK 5 (Obliczenie impedancji wypadkowej)                    │
│   ← Zależne od: Katalog transformatora T-01                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ [← Poprzedni krok]  [Następny krok →]  [Przejdź do...▼]                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.4.3. Elementy kroku

| Element | Opis |
|---------|------|
| Numer kroku | Pozycja w sekwencji (np. 1/12) |
| Nazwa kroku | Opisowa nazwa operacji |
| Wzór | Formuła matematyczna |
| Dane wejściowe | Lista parametrów z wartościami i źródłami |
| Podstawienie | Konkretne wartości wstawione do wzoru |
| Obliczenie | Krok po kroku arytmetyka |
| Wynik | Wartość końcowa z jednostką |
| Powiązania | Linki do kroków zależnych i poprzedników |
| Nawigacja | Przyciski poprzedni/następny/przejdź do |

---

### 6.5. Widok porównawczy Run ↔ Run (PROOF_RUN_COMPARISON)

#### 6.5.1. Cel inżynierski
Porównanie **śladu obliczeń** między dwoma uruchomieniami — identyfikacja zmian w danych wejściowych i wynikach.

#### 6.5.2. Struktura widoku

| Krok | Run A | Run B | Δ | Status |
|------|-------|-------|---|--------|
| Z_T | 0.96 Ω | 0.96 Ω | 0 | ✓ Unchanged |
| Z_L | 1.25 Ω | 1.18 Ω | -0.07 Ω | ⚠️ Changed |
| Z_k | 2.21 Ω | 2.14 Ω | -0.07 Ω | ⚠️ Changed |
| I_k″ | 21.5 kA | 22.2 kA | +0.7 kA | ⚠️ Changed |

#### 6.5.3. Highlighting zmian

| Status | Kolor | Opis |
|--------|-------|------|
| Unchanged | Szary | Brak zmiany |
| Changed | Żółty | Zmiana wartości |
| Added | Zielony | Nowy krok (nie było w Run A) |
| Removed | Czerwony | Usunięty krok (był w Run A) |

---

### 6.6. Widok audytowy — Normy i współczynniki (PROOF_AUDIT)

#### 6.6.1. Cel inżynierski
Prezentacja **wszystkich wyborów normowych** i współczynników użytych w obliczeniach dla celów audytu.

#### 6.6.2. Struktura widoku

| Sekcja | Zawartość |
|--------|-----------|
| **Norma bazowa** | IEC 60909-0:2016 |
| **Wariant obliczeń** | Maximum short-circuit currents |
| **Metoda** | Equivalent voltage source at the short-circuit location |
| **Współczynniki c** | c_max = 1.1 (MV, Table 1) |
| **Typ zwarcia** | Far-from-generator short circuit |
| **Składowe** | Positive, negative, zero sequence |
| **Korekcje** | KT = 0.95 (impedance correction factor) |

#### 6.6.3. Tabela współczynników normowych

| Współczynnik | Symbol | Wartość | Norma | Clause | Warunek |
|--------------|--------|---------|-------|--------|---------|
| Współczynnik napięcia (max) | c_max | 1.1 | IEC 60909 | Table 1 | MV (1 kV < Un ≤ 35 kV) |
| Współczynnik napięcia (min) | c_min | 1.0 | IEC 60909 | Table 1 | MV |
| Współczynnik prądu udarowego | κ | 1.8 | IEC 60909 | Eq. 55 | X/R = 14 |
| Współczynnik termiczny m | m | 0.05 | IEC 60909 | Eq. 105 | — |
| Współczynnik termiczny n | n | 0.98 | IEC 60909 | Eq. 106 | — |
| Korekcja impedancji trafo | KT | 0.95 | IEC 60909 | Clause 6.3.3 | cmax = 1.1 |

#### 6.6.4. Warianty normowe

| Wariant | Opis | Zastosowanie |
|---------|------|--------------|
| IEC 60909 c_max | Maksymalne prądy zwarciowe | Dobór aparatury |
| IEC 60909 c_min | Minimalne prądy zwarciowe | Nastawy zabezpieczeń |
| Near-to-generator | Zwarcia bliskie generatora | Generatory synchroniczne |
| Far-from-generator | Zwarcia odległe | Sieci dystrybucyjne |

---

### 6.7. Widok Proof dla elementu (PROOF_ELEMENT_DETAIL)

#### 6.7.1. Cel inżynierski
Pełny **ślad obliczeń** dla pojedynczego elementu (np. Bus) — od danych wejściowych do wyniku.

#### 6.7.2. Struktura widoku

| Sekcja | Zawartość |
|--------|-----------|
| **Identyfikacja** | Bus ID, Name, Voltage |
| **Dane wejściowe** | Lista elementów wpływających (Sources, Lines, Trafos) |
| **Topologia** | Graf połączeń |
| **Impedancje** | Tabela impedancji elementów |
| **Redukcja Thevenina** | Krok po kroku redukcja do Z_th |
| **Obliczenia SC** | Wzory, podstawienia, wyniki |
| **Kontrybutorzy** | Udział poszczególnych źródeł |
| **Wynik końcowy** | I_k″, ip, Ith, Sk″, Status |

---

### 6.8. Widok eksportu Proof (PROOF_EXPORT)

#### 6.8.1. Cel inżynierski
Eksport **pełnego śladu obliczeń** do formatu PDF/Word dla dokumentacji technicznej i audytu.

#### 6.8.2. Formaty eksportu

| Format | Zawartość | Zastosowanie |
|--------|-----------|--------------|
| PDF Technical | Pełny ślad + wzory + tabele | Dokumentacja projektowa |
| PDF Executive | Podsumowanie + kluczowe wyniki | Raporty zarządcze |
| Word | Edytowalny dokument | Raporty audytowe |
| LaTeX | Wzory w formacie TeX | Publikacje techniczne |
| JSON | Surowe dane Proof | Integracja z innymi systemami |
| XML | Zgodność z CIM IEC 61968 | Wymiana danych |

#### 6.8.3. Opcje eksportu

| Opcja | Opis |
|-------|------|
| Include formulas | Włącz/wyłącz wzory matematyczne |
| Include step-by-step | Włącz/wyłącz obliczenia krok po kroku |
| Include graphs | Włącz/wyłącz grafy zależności |
| Include norm references | Włącz/wyłącz odniesienia do norm |
| Language | Polski / English / Deutsch |
| Signature | Pole na podpis audytora |
| Watermark | Znak wodny (DRAFT / CONFIDENTIAL) |

---

## 7. POWIĄZANIE PROOF Z RESULTS

### 7.1. Nawigacja Proof ↔ Results

| Kierunek | Akcja | Efekt |
|----------|-------|-------|
| Results → Proof | Klik na wynik SC | Otwarcie ProofGraph dla danego wyniku |
| Proof → Results | Klik na wynik końcowy w Proof | Podświetlenie wiersza w Results Browser |
| Proof → Inspector | Klik na element w Proof | Otwarcie Element Inspector |
| Proof → SLD | Klik na element w Proof | Podświetlenie na SLD |

### 7.2. Kontekst Proof w Element Inspector

Zakładka **Proof (P11)** w Element Inspector zawiera:

| Sekcja | Zawartość |
|--------|-----------|
| Summary | Status compliance, violations count |
| Quick View | Kluczowe wyniki SC z linkami do Proof |
| Proof Graph Mini | Miniaturka grafu zależności |
| Export | Przycisk eksportu Proof dla elementu |

---

## 8. REVIEW / APPROVAL LAYER — WARSTWA PRZEGLĄDU I ZATWIERDZANIA

### 8.1. Filozofia warstwy Review / Approval

**REVIEW / APPROVAL LAYER** to formalna warstwa procesu zatwierdzania obliczeń, która:

| Zasada | Opis |
|--------|------|
| **FORMAL WORKFLOW** | Każdy Proof przechodzi przez formalny proces review |
| **AUDIT TRAIL** | Pełny ślad: kto, kiedy, co zatwierdził |
| **CHECKLIST-DRIVEN** | Strukturalne checklisty audytowe |
| **ROLE-BASED** | Różne uprawnienia dla różnych ról |
| **IMMUTABLE HISTORY** | Historia zmian niemodyfikowalna |

---

### 8.2. Status kroku Proof (PROOF_STEP_STATUS)

#### 8.2.1. Stany statusu

| Status | Ikona | Kolor | Opis | Dozwolone akcje |
|--------|-------|-------|------|-----------------|
| **DRAFT** | 📝 | Szary | Krok obliczeniowy utworzony, nie przeglądany | Edit, Submit for Review |
| **PENDING_REVIEW** | ⏳ | Żółty | Oczekuje na przegląd | Review, Reject |
| **IN_REVIEW** | 🔍 | Niebieski | W trakcie przeglądu | Approve, Reject, Comment |
| **REVIEWED** | ✓ | Zielony jasny | Przegląd zakończony pozytywnie | Request Approval |
| **APPROVED** | ✅ | Zielony | Formalnie zatwierdzony | Lock, Export |
| **REJECTED** | ❌ | Czerwony | Odrzucony, wymaga poprawy | Edit, Resubmit |
| **LOCKED** | 🔒 | Szary ciemny | Zablokowany (produkcja) | View Only |

#### 8.2.2. Diagram przejść stanów

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
┌─────────┐    ┌─────────────────┐    ┌───────────┐    ┌──────────┐
│  DRAFT  │───▶│ PENDING_REVIEW  │───▶│ IN_REVIEW │───▶│ REVIEWED │
└─────────┘    └─────────────────┘    └───────────┘    └──────────┘
     ▲                                      │               │
     │                                      ▼               ▼
     │                               ┌──────────┐    ┌──────────┐
     └───────────────────────────────│ REJECTED │    │ APPROVED │
                                     └──────────┘    └──────────┘
                                                          │
                                                          ▼
                                                     ┌─────────┐
                                                     │ LOCKED  │
                                                     └─────────┘
```

---

### 8.3. Checklisty audytowe (AUDIT_CHECKLISTS)

#### 8.3.1. Checklist: Zgodność normowa (NORM_COMPLIANCE_CHECKLIST)

| # | Wymóg | Status | Komentarz | Reviewer |
|---|-------|--------|-----------|----------|
| 1 | Norma bazowa zidentyfikowana (IEC 60909) | ☐ | — | — |
| 2 | Wersja normy aktualna (2016+) | ☐ | — | — |
| 3 | Współczynnik c_max zgodny z Tab. 1 | ☐ | — | — |
| 4 | Współczynnik c_min zgodny z Tab. 1 | ☐ | — | — |
| 5 | Metoda obliczeń zgodna z Clause 4 | ☐ | — | — |
| 6 | Korekcje impedancji zastosowane (Clause 6) | ☐ | — | — |
| 7 | Składowe symetryczne poprawne | ☐ | — | — |
| 8 | Jednostki zgodne z SI | ☐ | — | — |

#### 8.3.2. Checklist: Dane wejściowe (INPUT_DATA_CHECKLIST)

| # | Wymóg | Status | Komentarz | Reviewer |
|---|-------|--------|-----------|----------|
| 1 | Dane katalogowe kompletne | ☐ | — | — |
| 2 | Dane katalogowe ze źródła zaufanego | ☐ | — | — |
| 3 | Topologia sieci poprawna | ☐ | — | — |
| 4 | Stany łączeniowe zgodne z rzeczywistością | ☐ | — | — |
| 5 | Warunki brzegowe zdefiniowane | ☐ | — | — |
| 6 | Sk″ sieci zasilającej zweryfikowane z OSD | ☐ | — | — |

#### 8.3.3. Checklist: Obliczenia (CALCULATION_CHECKLIST)

| # | Wymóg | Status | Komentarz | Reviewer |
|---|-------|--------|-----------|----------|
| 1 | Wzory matematyczne poprawne | ☐ | — | — |
| 2 | Podstawienia liczbowe poprawne | ☐ | — | — |
| 3 | Jednostki spójne w całym obliczeniu | ☐ | — | — |
| 4 | Zaokrąglenia zgodne z normą | ☐ | — | — |
| 5 | Wyniki w sensownym zakresie | ☐ | — | — |
| 6 | Brak błędów numerycznych | ☐ | — | — |

#### 8.3.4. Checklist: Warianty normowe (NORM_VARIANTS_CHECKLIST)

| # | Wymóg | Status | Komentarz | Reviewer |
|---|-------|--------|-----------|----------|
| 1 | c_max dla obliczeń maksymalnych | ☐ | — | — |
| 2 | c_min dla obliczeń minimalnych | ☐ | — | — |
| 3 | Near-to-generator dla źródeł bliskich | ☐ | — | — |
| 4 | Far-from-generator dla sieci dystrybucyjnych | ☐ | — | — |
| 5 | Prąd udarowy κ poprawnie obliczony | ☐ | — | — |
| 6 | Prąd cieplny Ith poprawnie obliczony | ☐ | — | — |

---

### 8.4. Ślad przeglądu (REVIEW_TRAIL)

#### 8.4.1. Struktura wpisu Review Trail

| Pole | Typ | Opis |
|------|-----|------|
| **Timestamp** | datetime | Data i czas akcji |
| **User** | string | Identyfikator użytkownika |
| **Role** | enum | ENGINEER / REVIEWER / APPROVER / ADMIN |
| **Action** | enum | SUBMIT / REVIEW_START / COMMENT / APPROVE / REJECT / LOCK |
| **Previous_status** | enum | Status przed akcją |
| **New_status** | enum | Status po akcji |
| **Comment** | text | Komentarz (opcjonalny) |
| **Checklist_id** | UUID | Powiązana checklist (opcjonalnie) |
| **Digital_signature** | hash | Podpis cyfrowy wpisu |

#### 8.4.2. Przykład Review Trail

| Timestamp | User | Role | Action | Status change | Comment |
|-----------|------|------|--------|---------------|---------|
| 2026-01-28 14:32:15 | jan.kowalski | ENGINEER | SUBMIT | DRAFT → PENDING_REVIEW | „Obliczenia SC dla Bus 15-03" |
| 2026-01-28 15:45:22 | anna.nowak | REVIEWER | REVIEW_START | PENDING_REVIEW → IN_REVIEW | — |
| 2026-01-28 16:12:08 | anna.nowak | REVIEWER | COMMENT | — | „Sprawdzić wartość c_max" |
| 2026-01-28 16:45:33 | anna.nowak | REVIEWER | APPROVE | IN_REVIEW → REVIEWED | „Obliczenia poprawne" |
| 2026-01-29 09:15:00 | piotr.wisniewski | APPROVER | APPROVE | REVIEWED → APPROVED | „Zatwierdzam do dokumentacji" |
| 2026-01-29 09:20:00 | SYSTEM | ADMIN | LOCK | APPROVED → LOCKED | „Auto-lock after approval" |

---

### 8.5. Komentarze inżynierskie (ENGINEERING_COMMENTS)

#### 8.5.1. Typy komentarzy

| Typ | Ikona | Kolor | Opis | Wymagana akcja |
|-----|-------|-------|------|----------------|
| **NOTE** | 📝 | Niebieski | Notatka informacyjna | Brak |
| **QUESTION** | ❓ | Żółty | Pytanie wymagające odpowiedzi | Odpowiedź |
| **CONCERN** | ⚠️ | Pomarańczowy | Wątpliwość techniczna | Wyjaśnienie |
| **ISSUE** | 🔴 | Czerwony | Problem blokujący | Rozwiązanie |
| **SUGGESTION** | 💡 | Zielony | Sugestia ulepszenia | Opcjonalne |

#### 8.5.2. Struktura komentarza

| Pole | Opis |
|------|------|
| **ID** | Unikalny identyfikator komentarza |
| **Type** | Typ komentarza (NOTE/QUESTION/CONCERN/ISSUE/SUGGESTION) |
| **Author** | Autor komentarza |
| **Timestamp** | Data i czas utworzenia |
| **Target** | Element Proof, do którego się odnosi |
| **Content** | Treść komentarza |
| **Status** | OPEN / RESOLVED / WONT_FIX |
| **Resolution** | Opis rozwiązania (jeśli RESOLVED) |
| **Resolved_by** | Kto rozwiązał |
| **Resolved_at** | Kiedy rozwiązano |

#### 8.5.3. Widok komentarzy w Proof

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ KROK 5: Obliczenie impedancji wypadkowej                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Wzór: Z_k = Z_Q + Z_T + Z_L                                                 │
│ Wynik: Z_k = 2.21 Ω                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 💬 COMMENTS (2)                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ❓ [OPEN] anna.nowak (2026-01-28 16:12):                                │ │
│ │ „Czy uwzględniono korekcję KT dla transformatora?"                      │ │
│ │                                                                         │ │
│ │ ↳ jan.kowalski (2026-01-28 16:30):                                      │ │
│ │   „Tak, KT = 0.95 zastosowane w kroku 3"                                │ │
│ │   [Mark as Resolved]                                                    │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ 📝 [NOTE] piotr.wisniewski (2026-01-29 09:10):                          │ │
│ │ „Wartość zgodna z poprzednimi obliczeniami dla tej stacji"              │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ [Add Comment]                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 8.5.4. Tryb Read-Only w produkcji

W trybie **LOCKED** (produkcja):
- Komentarze są widoczne, ale **nie można dodawać nowych**
- Nie można edytować istniejących komentarzy
- Nie można zmieniać statusu komentarzy
- Widoczny komunikat: „Proof is locked. Comments are read-only."

---

### 8.6. Panel Review (REVIEW_PANEL)

#### 8.6.1. Struktura panelu

| Sekcja | Zawartość |
|--------|-----------|
| **STATUS HEADER** | Aktualny status Proof + historia statusów |
| **CHECKLIST PROGRESS** | Postęp wypełniania checklisty |
| **COMMENTS SUMMARY** | Liczba komentarzy per typ + unresloved |
| **REVIEWER INFO** | Aktualny reviewer + przypisani |
| **ACTIONS** | Przyciski akcji (Approve, Reject, Comment) |

#### 8.6.2. Przykład wizualizacji

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ REVIEW PANEL                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ STATUS: 🔍 IN_REVIEW                                                        │
│ Submitted by: jan.kowalski (2026-01-28 14:32)                               │
│ Reviewer: anna.nowak (assigned 2026-01-28 15:45)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ CHECKLIST PROGRESS                                                          │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Norm Compliance:    ████████░░ 80% (8/10 items)                         │ │
│ │ Input Data:         ██████████ 100% (6/6 items)                         │ │
│ │ Calculations:       ████████░░ 83% (5/6 items)                          │ │
│ │ Norm Variants:      ██████░░░░ 67% (4/6 items)                          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ COMMENTS: 5 total | 2 📝 | 1 ❓ (unresolved) | 1 ⚠️ (unresolved) | 1 💡     │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Approve ✅]  [Reject ❌]  [Add Comment 💬]  [Request Changes 🔄]           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 8.7. Approval Workflow (APPROVAL_WORKFLOW)

#### 8.7.1. Role w workflow

| Rola | Uprawnienia | Odpowiedzialność |
|------|-------------|------------------|
| **ENGINEER** | Create, Edit, Submit | Tworzenie i edycja Proof |
| **REVIEWER** | Review, Comment, Request Changes | Techniczny przegląd |
| **APPROVER** | Approve, Reject | Formalne zatwierdzenie |
| **ADMIN** | Lock, Unlock, Delete | Administracja systemem |

#### 8.7.2. Warunki zatwierdzenia

| Gate | Warunek | Blokada |
|------|---------|---------|
| **REVIEW** | Wszystkie checklisty 100% | Nie można APPROVE bez 100% |
| **REVIEW** | Wszystkie ISSUE resolved | Nie można APPROVE z open ISSUE |
| **APPROVAL** | REVIEWED status | Nie można APPROVE bez REVIEWED |
| **LOCK** | APPROVED status | Nie można LOCK bez APPROVED |

#### 8.7.3. Powiadomienia

| Event | Odbiorcy | Kanał |
|-------|----------|-------|
| Submit for Review | Przypisani reviewerzy | Email + In-app |
| Comment Added | Autor Proof + Reviewer | In-app |
| Review Completed | Autor Proof + Approvers | Email + In-app |
| Approved | Wszyscy uczestnicy | Email + In-app |
| Rejected | Autor Proof | Email + In-app |

---

### 8.8. Eksport Review (REVIEW_EXPORT)

#### 8.8.1. Formaty eksportu Review

| Format | Zawartość | Zastosowanie |
|--------|-----------|--------------|
| PDF Audit Report | Proof + Review Trail + Comments + Checklists | Dokumentacja audytowa |
| Excel Checklist | Wszystkie checklisty z statusami | Przegląd offline |
| JSON Review Data | Surowe dane review | Integracja z innymi systemami |

#### 8.8.2. Zawartość PDF Audit Report

| Sekcja | Zawartość |
|--------|-----------|
| Header | Case, Snapshot, Run, Element, Timestamp |
| Proof Summary | Kluczowe wyniki z Proof |
| Review Trail | Pełna historia statusów |
| Checklists | Wszystkie checklisty z zaznaczeniami |
| Comments | Wszystkie komentarze z rozwiązaniami |
| Signatures | Podpisy cyfrowe: Engineer, Reviewer, Approver |
| Footer | Hash dokumentu, timestamp generacji |

---

# CZĘŚĆ III: SLD — MAKSYMALNA ARCHITEKTURA

---

## 8. FILOZOFIA SLD

### 8.1. SLD jako interaktywny dashboard inżynierski

**SLD** w MV-DESIGN-PRO to **nie schemat statyczny** — to **interaktywny dashboard inżynierski** umożliwiający:

| Funkcja | Opis |
|---------|------|
| **Wizualizacja topologii** | Schemat elektryczny sieci |
| **Prezentacja wyników** | Nakładki z wynikami obliczeń |
| **Analiza przestrzenna** | Identyfikacja problemów na schemacie |
| **Interakcja** | Kliknięcie → Inspector, Proof, TCC |
| **Porównania** | Overlay różnic między Case'ami |
| **Audyt** | Wizualizacja zgodności z normami |

---

## 9. TRYBY PRACY SLD

### 9.1. Tryb topologiczny (SLD_TOPOLOGY_MODE)

#### 9.1.1. Cel inżynierski
Prezentacja **czystej topologii sieci** bez nakładek wynikowych — do analizy struktury i połączeń.

#### 9.1.2. Zawartość

| Element | Prezentacja |
|---------|-------------|
| Buses | Symbol + ID + V_nom |
| Lines | Linia + ID + Length |
| Transformers | Symbol + ID + S_nom + Vector Group |
| Sources | Symbol + ID + Type |
| Switches | Symbol + ID + State (OPEN/CLOSED) |
| Loads | Symbol + ID + P/Q |

#### 9.1.3. Kolory

| Element | Kolor |
|---------|-------|
| Symbole | Czarny (IEC 61082) |
| Buses | Niebieski (szyny zbiorcze) |
| Granice stacji | Czerwony (linia przerywana) |
| Out of service | Szary |

---

### 9.2. Tryb zwarciowy (SLD_SC_MODE)

#### 9.2.1. Cel inżynierski
Prezentacja **wyników obliczeń zwarciowych** na schemacie SLD.

#### 9.2.2. Nakładki

| Nakładka | Lokalizacja | Wartość | Kolor |
|----------|-------------|---------|-------|
| Ik″ [kA] | Przy Bus | Wartość liczbowa | Status-based |
| ip [kA] | Przy Bus | Wartość liczbowa | Status-based |
| Sk″ [MVA] | Przy Bus | Wartość liczbowa | Status-based |
| Margin [%] | Przy Bus | Wartość liczbowa | Margin-based |
| Status | Przy Bus | Ikona ✓/⚠/✗ | Status-based |

#### 9.2.3. Kolorowanie

| Status | Kolor | Warunek |
|--------|-------|---------|
| OK | Zielony (#28a745) | Margin > 10% |
| WARNING | Żółty (#ffc107) | 0% < Margin ≤ 10% |
| VIOLATION | Czerwony (#dc3545) | Margin ≤ 0% |

---

### 9.3. Tryb napięciowy (SLD_VOLTAGE_MODE)

#### 9.3.1. Cel inżynierski
Prezentacja **profilu napięciowego** na schemacie SLD — identyfikacja problemów z napięciem.

#### 9.3.2. Nakładki

| Nakładka | Lokalizacja | Wartość | Kolor |
|----------|-------------|---------|-------|
| V [kV] | Przy Bus | Wartość liczbowa | Heatmap |
| V [%] | Przy Bus | Wartość procentowa | Heatmap |
| ΔV [%] | Przy Line | Spadek napięcia | Gradient |

#### 9.3.3. Kolorowanie (Heatmap)

| V% | Kolor |
|----|-------|
| < 95% | Czerwony (undervoltage) |
| 95-97% | Pomarańczowy |
| 97-103% | Zielony (optimal) |
| 103-105% | Pomarańczowy |
| > 105% | Czerwony (overvoltage) |

---

### 9.4. Tryb obciążeniowy (SLD_LOADING_MODE)

#### 9.4.1. Cel inżynierski
Prezentacja **obciążeń linii i transformatorów** na schemacie SLD.

#### 9.4.2. Nakładki

| Nakładka | Lokalizacja | Wartość | Kolor |
|----------|-------------|---------|-------|
| I [A] | Przy Line/Trafo | Wartość liczbowa | Loading-based |
| I [%] | Przy Line/Trafo | Procent obciążenia | Loading-based |
| S [%] | Przy Trafo | Procent obciążenia | Loading-based |
| Losses [kW] | Przy Line/Trafo | Wartość strat | Gradient |

#### 9.4.3. Kolorowanie

| Loading % | Kolor |
|-----------|-------|
| 0-50% | Zielony |
| 50-80% | Żółty |
| 80-100% | Pomarańczowy |
| > 100% | Czerwony (overload) |

---

### 9.5. Tryb zabezpieczeniowy (SLD_PROTECTION_MODE)

#### 9.5.1. Cel inżynierski
Prezentacja **stanu zabezpieczeń** i marginesów koordynacji na schemacie SLD.

#### 9.5.2. Nakładki

| Nakładka | Lokalizacja | Wartość | Kolor |
|----------|-------------|---------|-------|
| I_set [A] | Przy Protection | Nastawa prądowa | — |
| Margin [%] | Przy Protection | Margines koordynacji | Status-based |
| Trip Time [s] | Przy Protection | Czas zadziałania | — |
| Status | Przy Protection | OK/UNDERPROTECTED/OVERPROTECTED | Status-based |

#### 9.5.3. Kolorowanie

| Status | Kolor | Opis |
|--------|-------|------|
| OK | Zielony | Poprawna koordynacja |
| UNDERPROTECTED | Czerwony | Za mały margines |
| OVERPROTECTED | Żółty | Za duży margines (nieoptymalne) |

---

### 9.6. Tryb audytowy (SLD_AUDIT_MODE)

#### 9.6.1. Cel inżynierski
Prezentacja **zgodności z normami** na schemacie SLD — dla celów audytu.

#### 9.6.2. Nakładki

| Nakładka | Lokalizacja | Wartość | Kolor |
|----------|-------------|---------|-------|
| Compliance | Przy każdym elemencie | COMPLIANT/NON_COMPLIANT | Status-based |
| Violations | Przy elemencie | Liczba naruszeń | Badge |
| Norm | Przy elemencie | Norma źródłowa | Tooltip |

#### 9.6.3. Kolorowanie

| Status | Kolor |
|--------|-------|
| COMPLIANT | Zielony |
| NON_COMPLIANT | Czerwony |
| PARTIAL | Żółty |

---

### 9.7. Tryb porównawczy Case ↔ Case (SLD_COMPARE_MODE)

#### 9.7.1. Cel inżynierski
Wizualizacja **różnic między Case'ami** na schemacie SLD.

#### 9.7.2. Nakładki

| Nakładka | Lokalizacja | Wartość | Kolor |
|----------|-------------|---------|-------|
| ΔV [%] | Przy Bus | Różnica napięcia | Delta-based |
| ΔI [%] | Przy Line/Trafo | Różnica obciążenia | Delta-based |
| ΔIk″ [kA] | Przy Bus | Różnica prądu zwarciowego | Delta-based |
| Status Change | Przy elemencie | IMPROVED/REGRESSED | Status-based |

#### 9.7.3. Kolorowanie

| Status | Kolor | Opis |
|--------|-------|------|
| IMPROVED | Zielony | Poprawa vs Case A |
| REGRESSED | Czerwony | Pogorszenie vs Case A |
| UNCHANGED | Szary | Brak zmiany |

---

### 9.8. Tryb przepływów mocy (SLD_POWER_FLOW_MODE)

#### 9.8.1. Cel inżynierski
Wizualizacja **przepływów mocy** na schemacie SLD z animacją kierunków.

#### 9.8.2. Nakładki

| Nakładka | Lokalizacja | Wartość | Wizualizacja |
|----------|-------------|---------|--------------|
| P [MW] | Przy Line/Trafo | Moc czynna | Strzałka + wartość |
| Q [MVAr] | Przy Line/Trafo | Moc bierna | Strzałka + wartość |
| Direction | Na Line/Trafo | Kierunek przepływu | Animowana strzałka |

#### 9.8.3. Animacja
- Płynące strzałki pokazujące kierunek przepływu mocy
- Grubość strzałki proporcjonalna do wartości P
- Kolor strzałki: niebieski (generacja → obciążenie)

---

### 9.9. Tryb strat (SLD_LOSSES_MODE)

#### 9.9.1. Cel inżynierski
Wizualizacja **rozkładu strat** w sieci na schemacie SLD.

#### 9.9.2. Nakładki

| Nakładka | Lokalizacja | Wartość | Kolor |
|----------|-------------|---------|-------|
| P_loss [kW] | Przy Line/Trafo | Straty mocy czynnej | Heatmap |
| Q_loss [kVAr] | Przy Line/Trafo | Straty mocy biernej | Heatmap |
| % of total | Przy Line/Trafo | Udział w stratach całkowitych | Badge |

---

### 9.10. Tryb termiczny (SLD_THERMAL_MODE)

#### 9.10.1. Cel inżynierski
Wizualizacja **stanu termicznego** elementów na schemacie SLD.

#### 9.10.2. Nakładki

| Nakładka | Lokalizacja | Wartość | Kolor |
|----------|-------------|---------|-------|
| θ [°C] | Przy Line/Trafo | Temperatura | Heatmap |
| θ/θ_max [%] | Przy Line/Trafo | Procent temperatury max | Heatmap |
| Time to limit | Przy Line/Trafo | Czas do osiągnięcia limitu | Warning badge |

---

### 9.11. Tryb kontrybutorów (SLD_CONTRIBUTORS_MODE)

#### 9.11.1. Cel inżynierski
Wizualizacja **źródeł prądów zwarciowych** na schemacie SLD — przepływy od źródeł do miejsca zwarcia.

#### 9.11.2. Nakładki

| Nakładka | Lokalizacja | Wartość | Wizualizacja |
|----------|-------------|---------|--------------|
| I_contribution [kA] | Przy Source | Wkład do Ik″ | Badge |
| % of total | Przy Source | Udział procentowy | Badge |
| Flow path | Na ścieżce | Kierunek przepływu SC | Animowana linia |

---

### 9.12. Tryb Proof overlay (SLD_PROOF_MODE)

#### 9.12.1. Cel inżynierski
Wizualizacja **śladu obliczeń** na schemacie SLD — powiązanie Proof z topologią.

#### 9.12.2. Nakładki

| Nakładka | Lokalizacja | Wartość | Wizualizacja |
|----------|-------------|---------|--------------|
| Z [Ω] | Przy elemencie | Impedancja | Badge |
| Calculation step | Przy elemencie | Numer kroku Proof | Clickable badge |
| Dependencies | Linie między elementami | Zależności obliczeniowe | Przerywane linie |

#### 9.12.3. Interakcja
- Klik na badge → otwarcie kroku Proof
- Hover → tooltip z wartością i wzorem

---

## 10. CONTEXT MODES — TRYBY KONTEKSTOWE SLD

### 10.1. Filozofia trybów kontekstowych

**CONTEXT MODES** definiują **kontekst pracy** inżyniera z SLD. Każdy tryb kontekstowy:

| Zasada | Opis |
|--------|------|
| **DISTINCT PURPOSE** | Każdy tryb ma jasno określony cel pracy |
| **TAILORED LAYERS** | Aktywne warstwy dostosowane do kontekstu |
| **RESTRICTED ACTIONS** | Dozwolone akcje ograniczone do kontekstu |
| **ROLE-BASED** | Różne tryby dla różnych ról |
| **SWITCHING GUARD** | Przełączanie trybów z potwierdzeniem |

---

### 10.2. Tryb PROJEKTOWY (CONTEXT_DESIGN)

#### 10.2.1. Cel inżynierski
Projektowanie i modyfikacja topologii sieci — **tryb kreatywny**.

#### 10.2.2. Aktywne warstwy

| Warstwa | Status | Cel |
|---------|--------|-----|
| LAYER_TOPOLOGY | ✅ ACTIVE | Podstawowa topologia |
| LAYER_TECHNICAL_VOLTAGES | ✅ ACTIVE | Napięcia znamionowe |
| LAYER_TECHNICAL_IMPEDANCES | ✅ ACTIVE | Impedancje elementów |
| LAYER_ANALYTICAL_MARGINS | ⚪ OPTIONAL | Marginesy (po obliczeniu) |
| LAYER_PROTECTION_SETTINGS | ⚪ OPTIONAL | Nastawy zabezpieczeń |
| LAYER_CAD_SYMBOLS | ✅ ACTIVE | Symbole CAD |
| LAYER_SCADA_STATUS | ❌ INACTIVE | Nie dotyczy projektowania |

#### 10.2.3. Dozwolone akcje

| Akcja | Status | Opis |
|-------|--------|------|
| Add Element | ✅ ALLOWED | Dodawanie nowych elementów |
| Delete Element | ✅ ALLOWED | Usuwanie elementów |
| Modify Parameters | ✅ ALLOWED | Zmiana parametrów |
| Change Topology | ✅ ALLOWED | Zmiana połączeń |
| Run Analysis | ✅ ALLOWED | Uruchamianie obliczeń |
| Export to CAD | ✅ ALLOWED | Eksport do AutoCAD |
| Switch States | ⚠️ DESIGN ONLY | Tylko stany projektowe |
| Approve Changes | ❌ BLOCKED | Wymaga trybu AUDYTOWEGO |

#### 10.2.4. Toolbar kontekstowy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MODE: DESIGN 🏗️                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Add Bus] [Add Line] [Add Trafo] [Add Source] [Add Load] │ [Run LF] [Run SC]│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 10.3. Tryb ANALITYCZNY (CONTEXT_ANALYSIS)

#### 10.3.1. Cel inżynierski
Analiza wyników obliczeń i identyfikacja problemów — **tryb badawczy**.

#### 10.3.2. Aktywne warstwy

| Warstwa | Status | Cel |
|---------|--------|-----|
| LAYER_TOPOLOGY | ✅ ACTIVE | Podstawowa topologia |
| LAYER_TECHNICAL_VOLTAGES | ✅ ACTIVE | Wyniki napięciowe |
| LAYER_TECHNICAL_CURRENTS | ✅ ACTIVE | Wyniki prądowe |
| LAYER_TECHNICAL_POWERS | ✅ ACTIVE | Przepływy mocy |
| LAYER_TECHNICAL_LOSSES | ✅ ACTIVE | Straty |
| LAYER_ANALYTICAL_MARGINS | ✅ ACTIVE | Marginesy |
| LAYER_ANALYTICAL_VIOLATIONS | ✅ ACTIVE | Naruszenia |
| LAYER_PROOF_IMPEDANCES | ⚪ OPTIONAL | Impedancje Proof |
| LAYER_COMPARISON_DELTAS | ⚪ OPTIONAL | Porównania |

#### 10.3.3. Dozwolone akcje

| Akcja | Status | Opis |
|-------|--------|------|
| View Results | ✅ ALLOWED | Przeglądanie wyników |
| Open Proof | ✅ ALLOWED | Otwarcie śladu obliczeń |
| Compare Cases | ✅ ALLOWED | Porównywanie wariantów |
| What-If Preview | ✅ ALLOWED | Podgląd wpływu zmian |
| Run Analysis | ✅ ALLOWED | Uruchamianie obliczeń |
| Export Results | ✅ ALLOWED | Eksport wyników |
| Modify Parameters | ⚠️ WITH CONFIRMATION | Zmiana z potwierdzeniem |
| Delete Element | ❌ BLOCKED | Wymaga trybu PROJEKTOWEGO |

#### 10.3.4. Toolbar kontekstowy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MODE: ANALYSIS 🔬                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Show LF] [Show SC] [Compare] [What-If] │ [Violations ▼] [Export Results]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 10.4. Tryb OPERACYJNY (CONTEXT_OPERATIONS)

#### 10.4.1. Cel inżynierski
Symulacja i planowanie operacji łączeniowych — **tryb zgodny z Instrukcją Czynności Łączeniowych**.

#### 10.4.2. Aktywne warstwy

| Warstwa | Status | Cel |
|---------|--------|-----|
| LAYER_TOPOLOGY | ✅ ACTIVE | Topologia z aktualnymi stanami |
| LAYER_SCADA_STATUS | ✅ ACTIVE | Stany łączeniowe SCADA |
| LAYER_TECHNICAL_VOLTAGES | ✅ ACTIVE | Napięcia aktualne |
| LAYER_TECHNICAL_CURRENTS | ✅ ACTIVE | Prądy aktualne |
| LAYER_PROTECTION_SETTINGS | ✅ ACTIVE | Nastawy zabezpieczeń |
| LAYER_ANALYTICAL_MARGINS | ⚠️ HIGHLIGHTED | Marginesy podświetlone |
| LAYER_ANALYTICAL_VIOLATIONS | ⚠️ HIGHLIGHTED | Naruszenia podświetlone |

#### 10.4.3. Dozwolone akcje

| Akcja | Status | Opis |
|-------|--------|------|
| Toggle Switch | ✅ ALLOWED | Przełączanie stanów łączeniowych |
| Simulate Switching | ✅ ALLOWED | Symulacja sekwencji łączeń |
| View Pre/Post State | ✅ ALLOWED | Podgląd przed/po przełączeniu |
| Check Interlocks | ✅ ALLOWED | Sprawdzenie blokad |
| Run LF After Switch | ✅ ALLOWED | LF po przełączeniu |
| Generate Switching Order | ✅ ALLOWED | Generowanie polecenia łączeniowego |
| Modify Parameters | ❌ BLOCKED | Wymaga trybu PROJEKTOWEGO |
| Delete Element | ❌ BLOCKED | Wymaga trybu PROJEKTOWEGO |

#### 10.4.4. Toolbar kontekstowy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MODE: OPERATIONS ⚡                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Toggle Switch] [Simulate Sequence] [Interlocks] │ [Switching Order] [Log] │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 10.4.5. Integracja z Instrukcją Czynności Łączeniowych

| Element | Zawartość |
|---------|-----------|
| **SWITCHING SEQUENCE** | Sekwencja przełączeń z numeracją |
| **PRE-CONDITIONS** | Warunki wstępne (stany początkowe) |
| **POST-CONDITIONS** | Warunki końcowe (stany docelowe) |
| **SAFETY CHECKS** | Sprawdzenia bezpieczeństwa |
| **INTERLOCK VERIFICATION** | Weryfikacja blokad |
| **RESPONSIBLE PERSON** | Odpowiedzialny za wykonanie |

#### 10.4.6. Przykład Switching Order

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ POLECENIE ŁĄCZENIOWE nr 2026/01/28-001                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ CEL: Wyłączenie linii L-01 do prac konserwacyjnych                          │
│ DATA: 2026-01-28                                                            │
│ WYDAJĄCY: jan.kowalski                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ SEKWENCJA ŁĄCZEŃ:                                                           │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ #  │ Czynność                    │ Element   │ Stan   │ Potwierdzenie│   │
│ ├───────────────────────────────────────────────────────────────────────┤   │
│ │ 1  │ Wyłączyć wyłącznik          │ Q-L01-A   │ OPEN   │ ☐             │   │
│ │ 2  │ Sprawdzić brak napięcia     │ L-01      │ —      │ ☐             │   │
│ │ 3  │ Otworzyć rozłącznik         │ S-L01-A   │ OPEN   │ ☐             │   │
│ │ 4  │ Otworzyć rozłącznik         │ S-L01-B   │ OPEN   │ ☐             │   │
│ │ 5  │ Założyć uziemnik            │ E-L01-A   │ CLOSED │ ☐             │   │
│ │ 6  │ Założyć uziemnik            │ E-L01-B   │ CLOSED │ ☐             │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│ WARUNKI BEZPIECZEŃSTWA:                                                     │
│ ✓ Wyłącznik Q-L01-A w stanie OPEN przed otwarciem rozłączników              │
│ ✓ Brak napięcia potwierdzone przed założeniem uziemników                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Wykonaj krok] [Anuluj] [Drukuj] [Zapisz PDF]                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 10.5. Tryb AUDYTOWY (CONTEXT_AUDIT)

#### 10.5.1. Cel inżynierski
Formalna weryfikacja i zatwierdzanie projektu — **tryb zgodności i audytu**.

#### 10.5.2. Aktywne warstwy

| Warstwa | Status | Cel |
|---------|--------|-----|
| LAYER_TOPOLOGY | ✅ ACTIVE | Topologia (read-only) |
| LAYER_ANALYTICAL_VIOLATIONS | ✅ ACTIVE | Wszystkie naruszenia |
| LAYER_ANALYTICAL_MARGINS | ✅ ACTIVE | Marginesy do limitów |
| LAYER_PROOF_STEPS | ✅ ACTIVE | Kroki Proof |
| LAYER_PROOF_IMPEDANCES | ✅ ACTIVE | Impedancje z Proof |

#### 10.5.3. Dozwolone akcje

| Akcja | Status | Opis |
|-------|--------|------|
| View All Results | ✅ ALLOWED | Przeglądanie wszystkich wyników |
| Open Proof | ✅ ALLOWED | Pełny dostęp do Proof |
| Review Checklist | ✅ ALLOWED | Wypełnianie checklisty audytowej |
| Add Comment | ✅ ALLOWED | Dodawanie komentarzy audytowych |
| Approve / Reject | ✅ ALLOWED | Zatwierdzanie / odrzucanie |
| Export Audit Report | ✅ ALLOWED | Eksport raportu audytowego |
| Modify Parameters | ❌ BLOCKED | Read-only mode |
| Toggle Switch | ❌ BLOCKED | Read-only mode |
| Delete Element | ❌ BLOCKED | Read-only mode |

#### 10.5.4. Toolbar kontekstowy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MODE: AUDIT 📋                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Violations] [Proof] [Checklist] [Comments] │ [Approve ✅] [Reject ❌] [PDF]│
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 10.5.5. Audit Checklist Panel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AUDIT CHECKLIST — ELEMENT: Bus 15-03                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ NORM COMPLIANCE                                                             │
│ ☑ IEC 60909 c_max = 1.1 correct                                             │
│ ☑ Short-circuit calculation method correct                                  │
│ ☐ Equipment rating verified                                                 │
│ ☐ Protection coordination checked                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ PROOF VERIFICATION                                                          │
│ ☑ Input data complete                                                       │
│ ☑ Formulas correct                                                          │
│ ☐ Numerical results verified                                                │
│ ☐ Units consistent                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Progress: ████████░░ 60% (6/10)                                             │
│ [Save Progress] [Complete Checklist]                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 10.6. Przełączanie trybów (CONTEXT_SWITCHING)

#### 10.6.1. Macierz dozwolonych przejść

| Z / Do | DESIGN | ANALYSIS | OPERATIONS | AUDIT |
|--------|--------|----------|------------|-------|
| **DESIGN** | — | ✅ | ✅ | ⚠️ (save required) |
| **ANALYSIS** | ✅ | — | ✅ | ✅ |
| **OPERATIONS** | ⚠️ (confirm) | ✅ | — | ✅ |
| **AUDIT** | ❌ (unlock) | ✅ | ❌ (unlock) | — |

#### 10.6.2. Potwierdzenia przy przełączaniu

| Przejście | Potwierdzenie |
|-----------|---------------|
| DESIGN → AUDIT | „Czy zapisać niezapisane zmiany?" |
| OPERATIONS → DESIGN | „Czy anulować aktywną sekwencję łączeń?" |
| AUDIT → DESIGN | „Audit mode is locked. Request unlock?" |
| AUDIT → OPERATIONS | „Audit mode is locked. Request unlock?" |

#### 10.6.3. Context Selector

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CONTEXT MODE: [DESIGN ▼]                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│   🏗️ DESIGN      — Projektowanie topologii i parametrów                    │
│   🔬 ANALYSIS    — Analiza wyników i identyfikacja problemów               │
│   ⚡ OPERATIONS  — Planowanie i symulacja operacji łączeniowych            │
│   📋 AUDIT       — Weryfikacja i zatwierdzanie projektu                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. WARSTWY SLD (LAYERS)

### 10.1. Warstwa bazowa — Topologia (LAYER_TOPOLOGY)

| Element | Zawartość |
|---------|-----------|
| Buses | Symbole szyn zbiorczych |
| Branches | Linie, kable, transformatory |
| Sources | Źródła zasilania |
| Loads | Odbiorniki |
| Switches | Wyłączniki, rozłączniki |
| Labels | Identyfikatory elementów |

---

### 10.2. Warstwy techniczne (LAYER_TECHNICAL)

| Podwarstwa | Zawartość |
|------------|-----------|
| Voltages | Napięcia V [kV], V [%] |
| Currents | Prądy I [A], I [%] |
| Powers | Moce P [MW], Q [MVAr], S [MVA] |
| Angles | Kąty napięć i prądów |
| Losses | Straty P_loss, Q_loss |
| Impedances | Impedancje R, X, Z |

---

### 10.3. Warstwy analityczne (LAYER_ANALYTICAL)

| Podwarstwa | Zawartość |
|------------|-----------|
| Margins | Marginesy do limitów |
| Violations | Naruszenia norm |
| Trends | Trendy (↑/↓/=) |
| Deltas | Różnice między Case'ami |
| Risk scores | Wskaźniki ryzyka |
| Recommendations | Sugestie działań |

---

### 10.4. Warstwy zabezpieczeniowe (LAYER_PROTECTION)

| Podwarstwa | Zawartość |
|------------|-----------|
| Settings | Nastawy zabezpieczeń I_set, t |
| Coordination | Status koordynacji |
| Selectivity | Selektywność |
| TCC zones | Strefy charakterystyk TCC |
| Fault indicators | Wskaźniki zadziałania |

---

### 10.5. Warstwy Proof / Trace (LAYER_PROOF)

| Podwarstwa | Zawartość |
|------------|-----------|
| Impedance values | Wartości impedancji per element |
| Calculation steps | Numery kroków Proof |
| Dependencies | Linie zależności |
| Source contributions | Udziały źródeł |
| Thevenin equivalent | Impedancja zastępcza |

---

### 10.6. Warstwy CAD (LAYER_CAD)

| Podwarstwa | Zawartość |
|------------|-----------|
| Symbols | Symbole zgodne z IEC 61082 |
| Dimensions | Wymiary (dla eksportu DWG) |
| Annotations | Adnotacje techniczne |
| Title block | Tabliczka rysunkowa |
| Grid | Siatka pomocnicza |

---

### 10.7. Warstwy SCADA (LAYER_SCADA)

| Podwarstwa | Zawartość |
|------------|-----------|
| Status colors | Kolorowanie statusowe |
| Alarms | Alarmy i ostrzeżenia |
| Animations | Animacje przepływów |
| Real-time values | Wartości rzeczywiste |
| Trend arrows | Strzałki trendów |

---

### 10.8. Warstwy porównawcze (LAYER_COMPARISON)

| Podwarstwa | Zawartość |
|------------|-----------|
| Delta values | Wartości różnic |
| Change indicators | Wskaźniki zmian (IMPROVED/REGRESSED) |
| Added elements | Elementy dodane (Case B vs A) |
| Removed elements | Elementy usunięte |
| Modified elements | Elementy zmodyfikowane |

---

## 11. INTERAKCJE SLD

### 11.1. Interakcje podstawowe

| Akcja | Efekt |
|-------|-------|
| Klik na element | Otwarcie Element Inspector |
| Double-click | Zoom na element |
| Right-click | Menu kontekstowe |
| Hover | Tooltip z wartościami |
| Drag | Przesuwanie widoku |
| Scroll | Zoom in/out |
| Ctrl+Scroll | Zoom precyzyjny |

---

### 11.2. Interakcje zaawansowane

| Akcja | Efekt |
|-------|-------|
| Klik + Shift | Dodanie do selekcji |
| Klik + Ctrl | Toggle selekcji |
| Ctrl+A | Zaznaczenie wszystkich |
| Ctrl+F | Wyszukiwanie elementu |
| Esc | Anulowanie selekcji |
| F5 | Odświeżenie widoku |

---

### 11.3. Interakcja: Click → Properties

| Element | Zawartość Properties |
|---------|---------------------|
| Bus | V, V%, Angle, Connected elements |
| Line | I, I%, P, Q, Losses, From/To |
| Trafo | S, S%, Tap, Losses, HV/LV |
| Source | P_gen, Q_gen, Type, Status |
| Switch | State, I, Type |

---

### 11.4. Interakcja: Click → Results

| Element | Zawartość Results |
|---------|------------------|
| Bus | V, V%, Ik″, ip, Ith, Sk″, Violations |
| Line | I, I%, P, Q, Losses, Violations |
| Trafo | S, S%, Losses, Violations |
| Source | P_gen, Q_gen, Contribution to SC |

---

### 11.5. Interakcja: Click → Proof

| Element | Akcja |
|---------|-------|
| Bus | Otwarcie ProofGraph dla SC w tym Bus |
| Line | Otwarcie Proof dla impedancji linii |
| Trafo | Otwarcie Proof dla impedancji trafo |
| Source | Otwarcie Proof dla contribution |

---

### 11.6. Interakcja: Click → TCC

| Element | Akcja |
|---------|-------|
| Bus | Otwarcie TCC dla zabezpieczeń przy Bus |
| Protection | Otwarcie TCC z podświetloną charakterystyką |
| Line | Otwarcie TCC z zabezpieczeniami linii |

---

### 11.7. Menu kontekstowe

| Opcja | Opis |
|-------|------|
| Open Inspector | Otwórz Element Inspector |
| Open Results | Pokaż wyniki dla elementu |
| Open Proof | Pokaż ślad obliczeń |
| Navigate to TCC | Przejdź do TCC |
| Add to selection | Dodaj do zaznaczenia |
| Center view | Wyśrodkuj widok na elemencie |
| Export element | Eksportuj dane elementu |
| Copy values | Kopiuj wartości do schowka |

---

## 12. KONTROLKI SLD

### 12.1. Toolbar główny

| Kontrolka | Funkcja |
|-----------|---------|
| Mode selector | Wybór trybu pracy (Topology, SC, Voltage, etc.) |
| Layer manager | Zarządzanie warstwami |
| Zoom controls | Zoom in/out/fit/100% |
| Pan tool | Narzędzie przesuwania |
| Selection tool | Narzędzie zaznaczania |
| Search | Wyszukiwanie elementów |
| Export | Eksport do PDF/SVG/PNG/DWG |
| Print | Drukowanie |

---

### 12.2. Layer Manager

| Funkcja | Opis |
|---------|------|
| Layer visibility | Włącz/wyłącz warstwy |
| Layer opacity | Przezroczystość warstw |
| Layer order | Kolejność warstw |
| Layer presets | Zapisane konfiguracje warstw |

---

### 12.3. Legend Panel

| Zawartość | Opis |
|-----------|------|
| Color legend | Legenda kolorów dla aktywnego trybu |
| Symbol legend | Legenda symboli |
| Status legend | Legenda statusów |
| Value ranges | Zakresy wartości dla heatmap |

---

### 12.4. Context Bar Integration

| Element | Zawartość |
|---------|-----------|
| Active Case | Nazwa aktualnego Case |
| Active Snapshot | Nazwa aktualnego Snapshot |
| Active Analysis | Typ aktywnej analizy (LF/SC) |
| Active Mode | Aktualny tryb SLD |
| Active Layers | Lista aktywnych warstw |

---

## 13. EKSPORT SLD

### 13.1. Formaty eksportu

| Format | Zawartość | Zastosowanie |
|--------|-----------|--------------|
| PDF | Schemat + nakładki + legenda + nagłówek | Dokumentacja techniczna |
| SVG | Schemat wektorowy | Web, prezentacje |
| PNG | Schemat rastrowy | Raporty, email |
| DWG | Format AutoCAD | Integracja z CAD |
| DXF | Format wymiany CAD | Integracja z CAD |

### 13.2. Opcje eksportu

| Opcja | Opis |
|-------|------|
| Page size | A4 / A3 / A2 / A1 / A0 / Custom |
| Orientation | Portrait / Landscape |
| Include legend | Włącz/wyłącz legendę |
| Include title block | Włącz/wyłącz tabliczkę rysunkową |
| Include Context Bar | Włącz/wyłącz nagłówek kontekstu |
| Active layers only | Eksportuj tylko aktywne warstwy |
| Resolution (DPI) | 150 / 300 / 600 |
| Color mode | Color / Grayscale / B&W |

---

# CZĘŚĆ IV: TABELA SLOTÓW

---

## 14. TABELA SLOTÓW — PEŁNY REJESTR WIDOKÓW I FUNKCJI

### 14.1. RESULTS — Widoki zbiorcze systemowe

| ID | Nazwa widoku | Obszar | Status | Docelowy ExecPlan |
|----|--------------|--------|--------|-------------------|
| R-SYS-001 | SC_SYSTEM_OVERVIEW | RESULTS | ENABLED | P-RESULTS-CORE |
| R-SYS-002 | SC_SYSTEM_HEATMAP | RESULTS | ENABLED | P-RESULTS-VISUAL |
| R-SYS-003 | SC_CRITICAL_NODES | RESULTS | ENABLED | P-RESULTS-ANALYSIS |
| R-SYS-004 | SYSTEM_EXTREMES | RESULTS | ENABLED | P-RESULTS-CORE |
| R-SYS-005 | NORMATIVE_VIOLATIONS | RESULTS | ENABLED | P-RESULTS-CORE |
| R-SYS-006 | POWER_BALANCE | RESULTS | ENABLED | P-RESULTS-LF |
| R-SYS-007 | POWER_FLOWS | RESULTS | ENABLED | P-RESULTS-LF |
| R-SYS-008 | VOLTAGE_PROFILE | RESULTS | ENABLED | P-RESULTS-LF |
| R-SYS-009 | SYSTEM_CONTRIBUTORS | RESULTS | ENABLED | P-RESULTS-SC |
| R-SYS-010 | THEVENIN_IMPEDANCES | RESULTS | ENABLED | P-RESULTS-SC |

---

### 14.2. RESULTS — Widoki per-element (LINES)

| ID | Nazwa widoku | Obszar | Status | Docelowy ExecPlan |
|----|--------------|--------|--------|-------------------|
| R-LINE-001 | LINES_BASIC | RESULTS | ENABLED | P-RESULTS-CORE |
| R-LINE-002 | LINES_PARAMETERS | RESULTS | ENABLED | P-RESULTS-CORE |
| R-LINE-003 | LINES_SYMMETRICAL | RESULTS | ENABLED | P-RESULTS-SC |
| R-LINE-004 | LINES_THERMAL | RESULTS | ENABLED | P-RESULTS-THERMAL |
| R-LINE-005 | LINES_FLOWS | RESULTS | ENABLED | P-RESULTS-LF |

---

### 14.3. RESULTS — Widoki per-element (CABLES)

| ID | Nazwa widoku | Obszar | Status | Docelowy ExecPlan |
|----|--------------|--------|--------|-------------------|
| R-CABLE-001 | CABLES_BASIC | RESULTS | ENABLED | P-RESULTS-CORE |
| R-CABLE-002 | CABLES_CAPACITIVE | RESULTS | ENABLED | P-RESULTS-LF |
| R-CABLE-003 | CABLES_THERMAL_DETAILED | RESULTS | ENABLED | P-RESULTS-THERMAL |

---

### 14.4. RESULTS — Widoki per-element (TRANSFORMERS)

| ID | Nazwa widoku | Obszar | Status | Docelowy ExecPlan |
|----|--------------|--------|--------|-------------------|
| R-TRAFO-001 | TRAFO_BASIC | RESULTS | ENABLED | P-RESULTS-CORE |
| R-TRAFO-002 | TRAFO_PARAMETERS | RESULTS | ENABLED | P-RESULTS-CORE |
| R-TRAFO-003 | TRAFO_TAPS | RESULTS | ENABLED | P-RESULTS-LF |
| R-TRAFO-004 | TRAFO_LOSSES | RESULTS | ENABLED | P-RESULTS-LF |
| R-TRAFO-005 | TRAFO_SYMMETRICAL | RESULTS | ENABLED | P-RESULTS-SC |
| R-TRAFO-006 | TRAFO_THERMAL | RESULTS | ENABLED | P-RESULTS-THERMAL |

---

### 14.5. RESULTS — Widoki per-element (SOURCES)

| ID | Nazwa widoku | Obszar | Status | Docelowy ExecPlan |
|----|--------------|--------|--------|-------------------|
| R-SRC-001 | SOURCES_BASIC | RESULTS | ENABLED | P-RESULTS-CORE |
| R-SRC-002 | SOURCES_GRID | RESULTS | ENABLED | P-RESULTS-SC |
| R-SRC-003 | SOURCES_SYNC_GENERATORS | RESULTS | ENABLED | P-RESULTS-SC |
| R-SRC-004 | SOURCES_RENEWABLES | RESULTS | ENABLED | P-RESULTS-OZE |

---

### 14.6. RESULTS — Widoki per-element (PCC)

| ID | Nazwa widoku | Obszar | Status | Docelowy ExecPlan |
|----|--------------|--------|--------|-------------------|
| R-PCC-001 | PCC_BASIC | RESULTS | ENABLED | P-RESULTS-CORE |
| R-PCC-002 | PCC_CONNECTION_CONDITIONS | RESULTS | ENABLED | P-RESULTS-PCC |
| R-PCC-003 | PCC_POWER_EXCHANGE | RESULTS | ENABLED | P-RESULTS-PCC |
| R-PCC-004 | PCC_POWER_QUALITY | RESULTS | DISABLED (SLOT) | P-RESULTS-PQ |

---

### 14.7. RESULTS — Widoki Case/Run/Snapshot

| ID | Nazwa widoku | Obszar | Status | Docelowy ExecPlan |
|----|--------------|--------|--------|-------------------|
| R-CASE-001 | CASES_LIST | RESULTS | ENABLED | P-RESULTS-CORE |
| R-CASE-002 | SNAPSHOTS_LIST | RESULTS | ENABLED | P-RESULTS-CORE |
| R-CASE-003 | RUNS_LIST | RESULTS | ENABLED | P-RESULTS-CORE |
| R-CASE-004 | RUNS_COMPARISON | RESULTS | ENABLED | P-RESULTS-COMPARE |
| R-CASE-005 | LIMITS_STATUS_MATRIX | RESULTS | ENABLED | P-RESULTS-COMPARE |

---

### 14.8. RESULTS — Widoki porównawcze

| ID | Nazwa widoku | Obszar | Status | Docelowy ExecPlan |
|----|--------------|--------|--------|-------------------|
| R-COMP-001 | CASE_COMPARISON | RESULTS | ENABLED | P-RESULTS-COMPARE |
| R-COMP-002 | RUN_COMPARISON | RESULTS | ENABLED | P-RESULTS-COMPARE |
| R-COMP-003 | CONFIG_COMPARISON | RESULTS | ENABLED | P-RESULTS-COMPARE |
| R-COMP-004 | SNAPSHOT_COMPARISON | RESULTS | ENABLED | P-RESULTS-COMPARE |
| R-COMP-005 | TIME_SERIES | RESULTS | DISABLED (SLOT) | P-RESULTS-TRENDS |
| R-COMP-006 | SCENARIO_MATRIX | RESULTS | ENABLED | P-RESULTS-COMPARE |

---

### 14.9. RESULTS — Decision Support Layer

| ID | Nazwa widoku | Obszar | Status | Docelowy ExecPlan |
|----|--------------|--------|--------|-------------------|
| R-DEC-001 | NORM_COMPLIANCE_ASSESSMENT | RESULTS | ENABLED | P-RESULTS-DECISION |
| R-DEC-002 | CRITICAL_ELEMENTS_RANKING | RESULTS | ENABLED | P-RESULTS-DECISION |
| R-DEC-003 | ROOT_CAUSE_ANALYSIS | RESULTS | ENABLED | P-RESULTS-DECISION |
| R-DEC-004 | SENSITIVITY_LIGHT | RESULTS | ENABLED | P-RESULTS-DECISION |
| R-DEC-005 | WHAT_IF_PREVIEW | RESULTS | ENABLED | P-RESULTS-DECISION |
| R-DEC-006 | ACTION_PLAN_GENERATOR | RESULTS | ENABLED | P-RESULTS-DECISION |
| R-DEC-007 | DECISION_DASHBOARD | RESULTS | ENABLED | P-RESULTS-DECISION |
| R-DEC-008 | APPROVAL_READINESS | RESULTS | ENABLED | P-RESULTS-DECISION |

---

### 14.10. PROOF — Widoki

| ID | Nazwa widoku | Obszar | Status | Docelowy ExecPlan |
|----|--------------|--------|--------|-------------------|
| P-PROOF-001 | PROOF_GRAPH | PROOF | ENABLED | P-PROOF-CORE |
| P-PROOF-002 | PROOF_FORMULAS | PROOF | ENABLED | P-PROOF-CORE |
| P-PROOF-003 | PROOF_DATA_TABLE | PROOF | ENABLED | P-PROOF-CORE |
| P-PROOF-004 | PROOF_STEP_BY_STEP | PROOF | ENABLED | P-PROOF-CORE |
| P-PROOF-005 | PROOF_RUN_COMPARISON | PROOF | ENABLED | P-PROOF-COMPARE |
| P-PROOF-006 | PROOF_AUDIT | PROOF | ENABLED | P-PROOF-AUDIT |
| P-PROOF-007 | PROOF_ELEMENT_DETAIL | PROOF | ENABLED | P-PROOF-CORE |
| P-PROOF-008 | PROOF_EXPORT | PROOF | ENABLED | P-PROOF-EXPORT |
| P-PROOF-009 | PROOF_LATEX_VIEW | PROOF | DISABLED (SLOT) | P-PROOF-LATEX |
| P-PROOF-010 | PROOF_INTERACTIVE_CALCULATOR | PROOF | DISABLED (SLOT) | P-PROOF-CALC |

---

### 14.11. PROOF — Review / Approval Layer

| ID | Nazwa funkcji | Obszar | Status | Docelowy ExecPlan |
|----|---------------|--------|--------|-------------------|
| P-REV-001 | PROOF_STEP_STATUS | PROOF | ENABLED | P-PROOF-REVIEW |
| P-REV-002 | NORM_COMPLIANCE_CHECKLIST | PROOF | ENABLED | P-PROOF-REVIEW |
| P-REV-003 | INPUT_DATA_CHECKLIST | PROOF | ENABLED | P-PROOF-REVIEW |
| P-REV-004 | CALCULATION_CHECKLIST | PROOF | ENABLED | P-PROOF-REVIEW |
| P-REV-005 | NORM_VARIANTS_CHECKLIST | PROOF | ENABLED | P-PROOF-REVIEW |
| P-REV-006 | REVIEW_TRAIL | PROOF | ENABLED | P-PROOF-REVIEW |
| P-REV-007 | ENGINEERING_COMMENTS | PROOF | ENABLED | P-PROOF-REVIEW |
| P-REV-008 | REVIEW_PANEL | PROOF | ENABLED | P-PROOF-REVIEW |
| P-REV-009 | APPROVAL_WORKFLOW | PROOF | ENABLED | P-PROOF-REVIEW |
| P-REV-010 | REVIEW_EXPORT | PROOF | ENABLED | P-PROOF-REVIEW |

---

### 14.12. SLD — Tryby pracy

| ID | Nazwa trybu | Obszar | Status | Docelowy ExecPlan |
|----|-------------|--------|--------|-------------------|
| S-MODE-001 | SLD_TOPOLOGY_MODE | SLD | ENABLED | P-SLD-CORE |
| S-MODE-002 | SLD_SC_MODE | SLD | ENABLED | P-SLD-SC |
| S-MODE-003 | SLD_VOLTAGE_MODE | SLD | ENABLED | P-SLD-LF |
| S-MODE-004 | SLD_LOADING_MODE | SLD | ENABLED | P-SLD-LF |
| S-MODE-005 | SLD_PROTECTION_MODE | SLD | ENABLED | P-SLD-PROTECTION |
| S-MODE-006 | SLD_AUDIT_MODE | SLD | ENABLED | P-SLD-AUDIT |
| S-MODE-007 | SLD_COMPARE_MODE | SLD | ENABLED | P-SLD-COMPARE |
| S-MODE-008 | SLD_POWER_FLOW_MODE | SLD | ENABLED | P-SLD-LF |
| S-MODE-009 | SLD_LOSSES_MODE | SLD | ENABLED | P-SLD-LF |
| S-MODE-010 | SLD_THERMAL_MODE | SLD | DISABLED (SLOT) | P-SLD-THERMAL |
| S-MODE-011 | SLD_CONTRIBUTORS_MODE | SLD | ENABLED | P-SLD-SC |
| S-MODE-012 | SLD_PROOF_MODE | SLD | ENABLED | P-SLD-PROOF |

---

### 14.11. SLD — Warstwy

| ID | Nazwa warstwy | Obszar | Status | Docelowy ExecPlan |
|----|---------------|--------|--------|-------------------|
| S-LAYER-001 | LAYER_TOPOLOGY | SLD | ENABLED | P-SLD-CORE |
| S-LAYER-002 | LAYER_TECHNICAL_VOLTAGES | SLD | ENABLED | P-SLD-CORE |
| S-LAYER-003 | LAYER_TECHNICAL_CURRENTS | SLD | ENABLED | P-SLD-CORE |
| S-LAYER-004 | LAYER_TECHNICAL_POWERS | SLD | ENABLED | P-SLD-CORE |
| S-LAYER-005 | LAYER_TECHNICAL_ANGLES | SLD | ENABLED | P-SLD-CORE |
| S-LAYER-006 | LAYER_TECHNICAL_LOSSES | SLD | ENABLED | P-SLD-CORE |
| S-LAYER-007 | LAYER_TECHNICAL_IMPEDANCES | SLD | ENABLED | P-SLD-CORE |
| S-LAYER-008 | LAYER_ANALYTICAL_MARGINS | SLD | ENABLED | P-SLD-ANALYSIS |
| S-LAYER-009 | LAYER_ANALYTICAL_VIOLATIONS | SLD | ENABLED | P-SLD-ANALYSIS |
| S-LAYER-010 | LAYER_ANALYTICAL_TRENDS | SLD | DISABLED (SLOT) | P-SLD-TRENDS |
| S-LAYER-011 | LAYER_ANALYTICAL_DELTAS | SLD | ENABLED | P-SLD-COMPARE |
| S-LAYER-012 | LAYER_PROTECTION_SETTINGS | SLD | ENABLED | P-SLD-PROTECTION |
| S-LAYER-013 | LAYER_PROTECTION_COORDINATION | SLD | DISABLED (SLOT) | P-SLD-PROTECTION |
| S-LAYER-014 | LAYER_PROOF_IMPEDANCES | SLD | ENABLED | P-SLD-PROOF |
| S-LAYER-015 | LAYER_PROOF_STEPS | SLD | ENABLED | P-SLD-PROOF |
| S-LAYER-016 | LAYER_CAD_SYMBOLS | SLD | ENABLED | P-SLD-EXPORT |
| S-LAYER-017 | LAYER_SCADA_STATUS | SLD | ENABLED | P-SLD-SCADA |
| S-LAYER-018 | LAYER_SCADA_ANIMATIONS | SLD | DISABLED (SLOT) | P-SLD-ANIMATION |

---

### 14.12. SLD — Interakcje

| ID | Nazwa interakcji | Obszar | Status | Docelowy ExecPlan |
|----|------------------|--------|--------|-------------------|
| S-INT-001 | CLICK_ELEMENT_INSPECTOR | SLD | ENABLED | P-SLD-CORE |
| S-INT-002 | CLICK_ELEMENT_RESULTS | SLD | ENABLED | P-SLD-CORE |
| S-INT-003 | CLICK_ELEMENT_PROOF | SLD | ENABLED | P-SLD-PROOF |
| S-INT-004 | CLICK_ELEMENT_TCC | SLD | DISABLED (SLOT) | P-SLD-TCC |
| S-INT-005 | HOVER_TOOLTIP | SLD | ENABLED | P-SLD-CORE |
| S-INT-006 | DOUBLE_CLICK_ZOOM | SLD | ENABLED | P-SLD-CORE |
| S-INT-007 | RIGHT_CLICK_MENU | SLD | ENABLED | P-SLD-CORE |
| S-INT-008 | SHIFT_CLICK_MULTISELECT | SLD | ENABLED | P-SLD-CORE |
| S-INT-009 | DRAG_PAN | SLD | ENABLED | P-SLD-CORE |
| S-INT-010 | SCROLL_ZOOM | SLD | ENABLED | P-SLD-CORE |
| S-INT-011 | KEYBOARD_SEARCH | SLD | ENABLED | P-SLD-CORE |
| S-INT-012 | KEYBOARD_NAVIGATION | SLD | ENABLED | P-SLD-CORE |

---

### 14.13. SLD — Eksport

| ID | Nazwa funkcji | Obszar | Status | Docelowy ExecPlan |
|----|---------------|--------|--------|-------------------|
| S-EXP-001 | EXPORT_PDF | SLD | ENABLED | P-SLD-EXPORT |
| S-EXP-002 | EXPORT_SVG | SLD | ENABLED | P-SLD-EXPORT |
| S-EXP-003 | EXPORT_PNG | SLD | ENABLED | P-SLD-EXPORT |
| S-EXP-004 | EXPORT_DWG | SLD | DISABLED (SLOT) | P-SLD-CAD |
| S-EXP-005 | EXPORT_DXF | SLD | DISABLED (SLOT) | P-SLD-CAD |
| S-EXP-006 | PRINT_DIALOG | SLD | ENABLED | P-SLD-EXPORT |

---

### 14.16. SLD — Context Modes

| ID | Nazwa trybu | Obszar | Status | Docelowy ExecPlan |
|----|-------------|--------|--------|-------------------|
| S-CTX-001 | CONTEXT_DESIGN | SLD | ENABLED | P-SLD-CONTEXT |
| S-CTX-002 | CONTEXT_ANALYSIS | SLD | ENABLED | P-SLD-CONTEXT |
| S-CTX-003 | CONTEXT_OPERATIONS | SLD | ENABLED | P-SLD-CONTEXT |
| S-CTX-004 | CONTEXT_AUDIT | SLD | ENABLED | P-SLD-CONTEXT |
| S-CTX-005 | CONTEXT_SWITCHING | SLD | ENABLED | P-SLD-CONTEXT |
| S-CTX-006 | SWITCHING_ORDER_GENERATOR | SLD | ENABLED | P-SLD-OPERATIONS |
| S-CTX-007 | INTERLOCK_VERIFICATION | SLD | ENABLED | P-SLD-OPERATIONS |
| S-CTX-008 | AUDIT_CHECKLIST_PANEL | SLD | ENABLED | P-SLD-AUDIT |

---

### 14.17. Funkcje globalne

| ID | Nazwa funkcji | Obszar | Status | Docelowy ExecPlan |
|----|---------------|--------|--------|-------------------|
| G-001 | GLOBAL_CONTEXT_BAR | GLOBAL | ENABLED | P-UI-CORE |
| G-002 | EXPERT_MODES | GLOBAL | ENABLED | P-UI-CORE |
| G-003 | KEYBOARD_SHORTCUTS | GLOBAL | ENABLED | P-UI-CORE |
| G-004 | ACCESSIBILITY_ARIA | GLOBAL | ENABLED | P-UI-A11Y |
| G-005 | SCREEN_READER_SUPPORT | GLOBAL | ENABLED | P-UI-A11Y |
| G-006 | THEME_DARK_MODE | GLOBAL | DISABLED (SLOT) | P-UI-THEME |
| G-007 | MULTI_LANGUAGE | GLOBAL | DISABLED (SLOT) | P-UI-I18N |
| G-008 | UNDO_REDO | GLOBAL | DISABLED (SLOT) | P-UI-HISTORY |
| G-009 | AUTOSAVE | GLOBAL | ENABLED | P-UI-CORE |
| G-010 | PERFORMANCE_MONITORING | GLOBAL | ENABLED | P-UI-PERF |

---

## 15. PODSUMOWANIE SLOTÓW

### 15.1. Statystyki

| Obszar | ENABLED | DISABLED (SLOT) | TOTAL |
|--------|---------|-----------------|-------|
| RESULTS (Core) | 42 | 2 | 44 |
| RESULTS (Decision Support) | 8 | 0 | 8 |
| PROOF (Core) | 8 | 2 | 10 |
| PROOF (Review/Approval) | 10 | 0 | 10 |
| SLD (Tryby) | 11 | 1 | 12 |
| SLD (Warstwy) | 15 | 3 | 18 |
| SLD (Interakcje) | 11 | 1 | 12 |
| SLD (Eksport) | 4 | 2 | 6 |
| SLD (Context Modes) | 8 | 0 | 8 |
| GLOBAL | 7 | 3 | 10 |
| **TOTAL** | **124** | **14** | **138** |

### 15.2. Porównanie z PowerFactory / ETAP

| Metryka | PowerFactory | ETAP | MV-DESIGN-PRO |
|---------|--------------|------|---------------|
| Widoki Results | ~15 | ~12 | **52** |
| Widoki Proof | 2 | 0 | **20** |
| Tryby SLD | 3 | 2 | **12** |
| Context Modes SLD | 0 | 0 | **8** |
| Warstwy SLD | 4 | 3 | **18** |
| Interakcje SLD | ~8 | ~6 | **12** |
| Decision Support | 0 | 0 | **8** |
| Review/Approval | 0 | 0 | **10** |
| **TOTAL** | **~32** | **~23** | **138** |

**Współczynnik rozbudowania**: MV-DESIGN-PRO = **4.3x** PowerFactory, **6.0x** ETAP

### 15.3. Nowe warstwy (Amendment 1.1)

| Warstwa | Cel | Funkcji |
|---------|-----|---------|
| **DECISION SUPPORT** | Prowadzenie inżyniera do decyzji | 8 |
| **REVIEW/APPROVAL** | Formalny przegląd i zatwierdzanie | 10 |
| **CONTEXT MODES** | Kontekst pracy (projektowanie/analiza/operacje/audyt) | 8 |

---

## 16. WERSJONOWANIE I ZMIANY

- **Wersja 1.0**: definicja bazowa (2026-01-31)
- **Wersja 1.1**: AMENDMENT — Decision Support, Review/Approval, Context Modes (2026-01-31)
- Zmiany w kontrakcie wymagają aktualizacji wersji i code review
- Breaking changes wymagają migracji UI i aktualizacji testów E2E
- Sloty DISABLED mogą być aktywowane bez breaking change

---

**KONIEC DOKUMENTU**
