# RESULTS TABLES CONTRACT

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-28
**Typ**: UI Contract — Normatywny

---

## 1. CEL I ZAKRES

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **Results Tables** — komponent tabelarycznej prezentacji wyników klasy **ETAP / DIgSILENT PowerFactory**, umożliwiający:

- **pełną eksplorację wyników w formie tabelarycznej** (równorzędnej z SLD),
- **porównania A/B/C/D… (dowolna liczba Case / Run / Snapshot)**,
- **widoki Min/Max** (minimum i maksimum z wielu Case'ów),
- **zaawansowane sortowanie, filtrowanie, grupowanie**,
- **eksport i wydruk** zachowujący pełną treść i kontekst.

### 1.2. Zakres obowiązywania

- **BINDING** dla implementacji UI MV-DESIGN-PRO,
- aplikuje się do wszystkich analiz (LF, SC, Proof, Sensitivity, Contingency),
- komponent MUST być dostępny w Results Browser,
- naruszenie kontraktu = regresja wymagająca hotfix.

### 1.3. Relacja do RESULTS_BROWSER_CONTRACT.md

- **RESULTS_BROWSER_CONTRACT.md** definiuje całościowy Results Browser (drzewo + tabele),
- **RESULTS_TABLES_CONTRACT.md** (ten dokument) definiuje szczegóły implementacji tabel wyników,
- oba dokumenty są **BINDING** i komplementarne.

---

## 2. ARCHITEKTURA TABEL WYNIKÓW

### 2.1. Rodzaje tabel (BINDING)

Results Tables MUST implementować następujące rodzaje tabel:

| Rodzaj tabeli | Opis | Wymagane |
|---------------|------|----------|
| **Single Case Table** | Wyniki dla jednego Case / Run | MUST |
| **Comparison Table (A/B)** | Porównanie dwóch Case'ów | MUST |
| **Multi-Comparison Table (A/B/C/...)** | Porównanie 3+ Case'ów | MUST |
| **Min/Max Table** | Minimum i maksimum z wielu Case'ów | MUST |
| **Time-Series Table** | Wyniki dla serii czasowej (opcjonalnie) | MAY |

### 2.2. Hierarchia danych

Każda tabela MUST zawierać następujące poziomy hierarchii:

```
Table Root
├── Target Type (Buses, Lines, Transformers, Sources, Protections)
│   ├── Element #1
│   │   ├── Parameter #1 (np. V [kV])
│   │   ├── Parameter #2 (np. V [%])
│   │   └── ...
│   ├── Element #2
│   │   └── ...
│   └── ...
```

### 2.3. Grupowanie

Tabele MUST umożliwiać grupowanie według:

- **Zone** (strefa sieciowa),
- **Voltage Level** (poziom napięcia),
- **Status** (OK, WARNING, VIOLATION, ERROR),
- **Custom** (użytkownik definiuje własne grupy).

---

## 3. KOLUMNY I TYPY DANYCH

### 3.1. Kolumny wspólne (wszystkie tabele)

Wszystkie tabele MUST zawierać następujące kolumny wspólne:

| Kolumna           | Typ        | Wymagane | Opis                                      |
|-------------------|------------|----------|-------------------------------------------|
| `ID`              | string     | MUST     | Unikalny identyfikator elementu          |
| `Name`            | string     | MUST     | Nazwa elementu                            |
| `Type`            | enum       | MUST     | Typ elementu (BUS, LINE, TRAFO, ...)      |
| `Zone`            | string     | MAY      | Strefa sieciowa                           |
| `Voltage [kV]`    | float      | MUST     | Napięcie znamionowe                       |
| `Status`          | enum       | MUST     | OK, WARNING, VIOLATION, ERROR             |

### 3.2. Kolumny specyficzne: Buses

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
| `I_sc_max [kA]`     | float      | MAY      | Prąd zwarciowy maksymalny (SC analysis) |
| `I_sc_min [kA]`     | float      | MAY      | Prąd zwarciowy minimalny (SC analysis)  |

### 3.3. Kolumny specyficzne: Lines

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

### 3.4. Kolumny specyficzne: Transformers

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

### 3.5. Kolumny specyficzne: Sources

| Kolumna             | Typ        | Wymagane | Opis                                    |
|---------------------|------------|----------|-----------------------------------------|
| `Bus`               | string     | MUST     | Węzeł przyłączenia                      |
| `P_gen [MW]`        | float      | MUST     | Moc czynna generowana                   |
| `Q_gen [MVAr]`      | float      | MUST     | Moc bierna generowana                   |
| `P_max [MW]`        | float      | MUST     | Moc maksymalna                          |
| `Q_max [MVAr]`      | float      | MUST     | Moc bierna maksymalna                   |
| `PF`                | float      | MAY      | Współczynnik mocy                       |
| `Type`              | enum       | MUST     | Grid, Generator, PV, Wind, Battery      |

### 3.6. Kolumny specyficzne: Protections (P11)

| Kolumna             | Typ        | Wymagane | Opis                                    |
|---------------------|------------|----------|-----------------------------------------|
| `Bus`               | string     | MUST     | Węzeł chroniony                         |
| `I_sc_max [kA]`     | float      | MUST     | Prąd zwarciowy maksymalny               |
| `I_sc_min [kA]`     | float      | MUST     | Prąd zwarciowy minimalny                |
| `I_protection [kA]` | float      | MUST     | Prąd nastawczy zabezpieczenia           |
| `Margin [%]`        | float      | MUST     | Margines zabezpieczenia                 |
| `Status`            | enum       | MUST     | OK, UNDERPROTECTED, OVERPROTECTED       |

---

## 4. PORÓWNANIA (A/B/C/D/...)

### 4.1. Tryb porównania dwóch Case'ów (A/B)

Comparison Table (A/B) MUST zawierać:

| Kolumna           | Typ        | Wymagane | Opis                                      |
|-------------------|------------|----------|-------------------------------------------|
| `Element ID`      | string     | MUST     | Identyfikator elementu                    |
| `Element Name`    | string     | MUST     | Nazwa elementu                            |
| `Parameter`       | string     | MUST     | Nazwa parametru (np. "V [%]")             |
| `Case A`          | float      | MUST     | Wartość w Case A                          |
| `Case B`          | float      | MUST     | Wartość w Case B                          |
| `Delta (B-A)`     | float      | MUST     | Różnica: Case B - Case A                  |
| `Delta [%]`       | float      | MUST     | Różnica procentowa: (B-A)/A * 100         |
| `Status A`        | enum       | MUST     | Status w Case A (OK/WARNING/VIOLATION)    |
| `Status B`        | enum       | MUST     | Status w Case B (OK/WARNING/VIOLATION)    |
| `Change Type`     | enum       | MUST     | IMPROVEMENT / REGRESSION / UNCHANGED      |

### 4.2. Tryb porównania wielu Case'ów (A/B/C/...)

Multi-Comparison Table MUST umożliwiać porównanie **3 lub więcej Case'ów** w jednej tabeli:

| Kolumna           | Typ        | Wymagane | Opis                                      |
|-------------------|------------|----------|-------------------------------------------|
| `Element ID`      | string     | MUST     | Identyfikator elementu                    |
| `Element Name`    | string     | MUST     | Nazwa elementu                            |
| `Parameter`       | string     | MUST     | Nazwa parametru (np. "V [%]")             |
| `Case A`          | float      | MUST     | Wartość w Case A                          |
| `Case B`          | float      | MUST     | Wartość w Case B                          |
| `Case C`          | float      | MUST     | Wartość w Case C                          |
| `...`             | float      | MUST     | Wartości w kolejnych Case'ach             |
| `Min`             | float      | MUST     | Minimum ze wszystkich Case'ów             |
| `Max`             | float      | MUST     | Maksimum ze wszystkich Case'ów            |
| `Range`           | float      | MUST     | Zakres: Max - Min                         |
| `Std Dev`         | float      | MAY      | Odchylenie standardowe                    |

### 4.3. Highlighting porównań (BINDING)

Tabele porównawcze MUST implementować następujące zasady kolorowania:

| Typ zmiany            | Kolor      | Warunek                                      |
|-----------------------|------------|----------------------------------------------|
| **IMPROVEMENT**       | Zielony    | Status zmieniony: VIOLATION → OK             |
| **REGRESSION**        | Czerwony   | Status zmieniony: OK → VIOLATION             |
| **UNCHANGED (OK)**    | Normalny   | Status bez zmiany, wartość w normie          |
| **UNCHANGED (VIOLATION)** | Żółty  | Status bez zmiany, wartość poza normą        |

### 4.4. Filtrowanie zmian

Tabele porównawcze MUST implementować następujące filtry:

| Filtr                     | Typ          | Wymagane | Opis                                      |
|---------------------------|--------------|----------|-------------------------------------------|
| **Show only changes**     | checkbox     | MUST     | Pokaż tylko elementy z Delta ≠ 0          |
| **Show only violations**  | checkbox     | MUST     | Pokaż tylko elementy z naruszeniami       |
| **Show improvements**     | checkbox     | MUST     | Pokaż tylko poprawy (VIOLATION → OK)      |
| **Show regressions**      | checkbox     | MUST     | Pokaż tylko pogorszenia (OK → VIOLATION)  |
| **Threshold Delta [%]**   | number input | SHOULD   | Pokaż tylko zmiany > X%                   |

---

## 5. MIN/MAX VIEWS

### 5.1. Cel widoków Min/Max

Min/Max Views MUST umożliwiać analizę **envelope** wyników z wielu Case'ów:

- **Minimum**: najniższa wartość danego parametru ze wszystkich Case'ów,
- **Maximum**: najwyższa wartość danego parametru ze wszystkich Case'ów,
- **Case of Min**: który Case wygenerował minimum,
- **Case of Max**: który Case wygenerował maksimum.

### 5.2. Struktura tabeli Min/Max (BINDING)

Min/Max Table MUST zawierać następujące kolumny:

| Kolumna           | Typ        | Wymagane | Opis                                      |
|-------------------|------------|----------|-------------------------------------------|
| `Element ID`      | string     | MUST     | Identyfikator elementu                    |
| `Element Name`    | string     | MUST     | Nazwa elementu                            |
| `Parameter`       | string     | MUST     | Nazwa parametru (np. "V [%]")             |
| `Min Value`       | float      | MUST     | Wartość minimalna                         |
| `Case of Min`     | string     | MUST     | Nazwa Case generującego Min               |
| `Max Value`       | float      | MUST     | Wartość maksymalna                        |
| `Case of Max`     | string     | MUST     | Nazwa Case generującego Max               |
| `Range`           | float      | MUST     | Zakres: Max - Min                         |
| `Status (Min)`    | enum       | MUST     | Status dla Min (OK/WARNING/VIOLATION)     |
| `Status (Max)`    | enum       | MUST     | Status dla Max (OK/WARNING/VIOLATION)     |

### 5.3. Kliknięcie w wartość Min/Max

Kliknięcie w wartość `Min Value` lub `Max Value` MUST:

- otworzyć **Single Case Table** dla Case generującego tę wartość,
- podświetlić odpowiedni wiersz w tabeli,
- wyświetlić kontekst (Case, Snapshot, Analysis) w Global Context Bar.

### 5.4. Zastosowania Min/Max Views

Min/Max Views są szczególnie użyteczne dla:

- **analiz N-1** (porównanie Case MAX, Case MIN, Case N-1),
- **analiz scenariuszy** (porównanie wielu wariantów rozwoju sieci),
- **analiz wrażliwości** (minimum i maksimum dla różnych parametrów).

---

## 6. SORTOWANIE I FILTROWANIE

### 6.1. Sortowanie (BINDING)

Wszystkie tabele MUST implementować następujące funkcje sortowania:

| Funkcja sortowania | Wymagane | Opis                                      |
|--------------------|----------|-------------------------------------------|
| **Single-column sort** | MUST | Sortowanie po jednej kolumnie (rosnąco / malejąco) |
| **Multi-column sort** | MUST | Sortowanie po wielu kolumnach (Shift+Click) |
| **Sort by Status** | MUST | Priorytet: ERROR > VIOLATION > WARNING > OK |
| **Sort by Violation** | MUST | Priorytet: Violations first, then OK |
| **Preserve sort state** | MUST | Zachowywanie kolejności sortowania w sesji |

### 6.2. Domyślna kolejność sortowania

Domyślnie tabele MUST być sortowane według następującej kolejności:

1. **Status** (ERROR > VIOLATION > WARNING > OK),
2. **Violation** (true > false),
3. **Name** (alfabetycznie).

### 6.3. Filtrowanie (BINDING)

Wszystkie tabele MUST implementować następujące filtry:

| Filtr               | Typ              | Wymagane | Opis                                      |
|---------------------|------------------|----------|-------------------------------------------|
| **Status Filter**   | multi-select     | MUST     | OK, WARNING, VIOLATION, ERROR             |
| **Violation Only**  | checkbox         | MUST     | Pokaż tylko elementy z naruszeniami       |
| **Zone Filter**     | multi-select     | MAY      | Filtrowanie po strefie sieciowej          |
| **Voltage Filter**  | range slider     | MUST     | Filtrowanie po napięciu znamionowym       |
| **Name Search**     | text input       | MUST     | Wyszukiwanie po nazwie (regex)            |
| **Custom Filter**   | expression       | SHOULD   | Zaawansowane wyrażenie (np. `V% < 95`)    |
| **Element Type Filter** | multi-select | MUST     | BUS, LINE, TRAFO, SOURCE, PROTECTION      |

### 6.4. Kombinowanie filtrów

Filtry MUST działać kumulatywnie (AND logic):

- filtr `Violation Only` AND `Zone = "Zone 1"` → tylko naruszenia w strefie 1,
- filtr `Status = VIOLATION` AND `Voltage = 15 kV` → tylko naruszenia na poziomie 15 kV.

### 6.5. Reset filtrów

Tabela MUST zawierać przycisk **"Reset Filters"**, który:

- usuwa wszystkie aktywne filtry,
- przywraca domyślne sortowanie,
- wyświetla wszystkie wiersze.

---

## 7. GRUPOWANIE

### 7.1. Grupowanie wierszy (BINDING)

Tabele MUST umożliwiać grupowanie wierszy według następujących kryteriów:

| Kryterium grupowania | Wymagane | Opis                                      |
|----------------------|----------|-------------------------------------------|
| **Zone**             | MUST     | Grupowanie po strefie sieciowej           |
| **Voltage Level**    | MUST     | Grupowanie po poziomie napięcia           |
| **Status**           | MUST     | Grupowanie po statusie (OK/WARNING/VIOLATION) |
| **Element Type**     | MUST     | Grupowanie po typie (BUS/LINE/TRAFO)     |
| **Custom**           | MAY      | Użytkownik definiuje własne grupy         |

### 7.2. Składanie i rozwijanie grup

- Kliknięcie nagłówka grupy MUST rozwinąć/zwinąć grupę,
- Przycisk **"Expand All"** MUST rozwinąć wszystkie grupy,
- Przycisk **"Collapse All"** MUST zwinąć wszystkie grupy,
- Stan rozwinięcia MUST być zachowany w sesji.

### 7.3. Podsumowania grup

Dla każdej grupy tabela SHOULD wyświetlać podsumowanie:

- **Liczba elementów** w grupie,
- **Liczba naruszeo** w grupie,
- **Min/Max** wartości w grupie (dla parametrów liczbowych).

---

## 8. EKSPORT I WYDRUK

### 8.1. Formaty eksportu (BINDING)

Tabele MUST umożliwiać eksport do następujących formatów:

| Format | Wymagane | Opis                                      |
|--------|----------|-------------------------------------------|
| **CSV** | MUST    | Standardowy CSV (separator: `;` lub `,`)  |
| **Excel (.xlsx)** | MUST | Excel z formatowaniem (kolory, bold) |
| **PDF** | MUST    | PDF z nagłówkiem kontekstu (Global Context Bar) |
| **JSON** | SHOULD  | JSON z pełną strukturą danych             |
| **Markdown** | MAY | Markdown table (dla dokumentacji)        |

### 8.2. Wymagania eksportu CSV

Eksport CSV MUST spełniać następujące wymagania:

- **Separator**: `;` (średnik) lub `,` (przecinek) — konfigurowalne,
- **Encoding**: UTF-8 with BOM,
- **Header row**: pierwsza linia zawiera nazwy kolumn,
- **Units**: jednostki w nawiasach w nazwie kolumny (np. "V [kV]"),
- **Decimal separator**: `.` (kropka) — zawsze, niezależnie od locale.

### 8.3. Wymagania eksportu Excel

Eksport Excel (.xlsx) MUST spełniać następujące wymagania:

- **Formatowanie**: zachowanie kolorów (zielony/żółty/czerwony),
- **Bold**: nagłówki pogrubione,
- **Autofilter**: włączony dla wszystkich kolumn,
- **Freeze panes**: zamrożenie pierwszego wiersza (nagłówki),
- **Column width**: automatyczne dopasowanie szerokości kolumn,
- **Number format**: jednostki w formacie komórki (np. `0.00 "kV"`).

### 8.4. Wymagania eksportu PDF (BINDING)

Eksport PDF MUST spełniać następujące wymagania:

#### 8.4.1. Nagłówek PDF

Każdy PDF MUST zawierać nagłówek z Global Context Bar:

```
─────────────────────────────────────────────────────────────────────
MV-DESIGN-PRO — Results Table
─────────────────────────────────────────────────────────────────────
Project:       [Project Name]
Case:          [Case Name] (lub: Case A, Case B, Case C — dla porównań)
Snapshot:      [Snapshot Name] (Timestamp: [YYYY-MM-DD HH:MM:SS])
Analysis:      [Analysis Type] (Status: [Success/Warning/Error])
Norma:         [Norma Name] ([Version])
Expert Mode:   [Mode Name]
Generated:     [YYYY-MM-DD HH:MM:SS]
User:          [Username]
─────────────────────────────────────────────────────────────────────
```

#### 8.4.2. Formatowanie PDF

- **Orientacja**: automatyczna (Portrait dla < 8 kolumn, Landscape dla ≥ 8 kolumn),
- **Font**: Times New Roman, 10pt (nagłówki: 12pt bold),
- **Kolory**: zachowanie kolorów semantycznych (zielony/żółty/czerwony),
- **Paginacja**: numeracja stron (Page X of Y),
- **Footer**: skrócona wersja nagłówka (Project | Case | Analysis | Page X of Y),
- **Table split**: automatyczne dzielenie długich tabel na strony (zachowanie nagłówków).

### 8.5. Opcje eksportu

Przy eksporcie użytkownik MUST móc wybrać:

| Opcja | Domyślnie | Opis                                      |
|-------|-----------|-------------------------------------------|
| **Export visible rows only** | Zaznaczone | Eksportuj tylko przefiltrowane wiersze |
| **Export all rows** | Niezaznaczone | Eksportuj wszystkie wiersze (ignoruj filtry) |
| **Export visible columns only** | Zaznaczone | Eksportuj tylko widoczne kolumny |
| **Export all columns** | Niezaznaczone | Eksportuj wszystkie kolumny |
| **Include groups** | Zaznaczone | Zachowaj grupowanie w eksporcie |

---

## 9. PERFORMANCE I SKALOWALNOŚĆ

### 9.1. Wymagania wydajnościowe (BINDING)

Tabele MUST spełniać następujące wymagania wydajnościowe:

| Operacja | Liczba wierszy | Max czas | Wymagane |
|----------|----------------|----------|----------|
| **Renderowanie tabeli** | 1 000 | < 200 ms | MUST |
| **Renderowanie tabeli** | 10 000 | < 500 ms | MUST |
| **Sortowanie** | 10 000 | < 300 ms | MUST |
| **Filtrowanie** | 10 000 | < 400 ms | MUST |
| **Eksport CSV** | 100 000 | < 5 s | MUST |
| **Eksport Excel** | 100 000 | < 10 s | MUST |
| **Eksport PDF** | 10 000 | < 15 s | MUST |

### 9.2. Wirtualizacja wierszy

Dla tabel z > 1 000 wierszy MUST być zastosowana **wirtualizacja** (lazy loading):

- renderowanie tylko widocznych wierszy (viewport),
- dynamiczne ładowanie wierszy przy scrollowaniu,
- zachowanie płynności (60 FPS).

### 9.3. Server-side filtering

Dla tabel z > 100 000 wierszy SHOULD być zastosowane **server-side filtering**:

- filtry wysyłane jako query do API,
- API zwraca przefiltrowane wyniki,
- paginacja wyników (np. 1 000 wierszy na stronę).

### 9.4. Cachowanie

- **MUST** cachować dane tabeli w pamięci (w ramach sesji),
- **MUST** aktualizować cache tylko przy zmianie Case/Snapshot/Analysis,
- **SHOULD** cachować wyniki sortowania i filtrowania.

### 9.5. Progress Bar

Dla operacji > 1 s (eksport, długie filtrowanie) MUST wyświetlać progress bar:

- deterministic progress (jeśli możliwe),
- czas pozostały (estimated time remaining),
- możliwość anulowania operacji (Cancel button).

---

## 10. ACCESSIBILITY I UX

### 10.1. Keyboard Navigation

Tabele MUST obsługiwać nawigację klawiaturą:

| Klawisz | Akcja |
|---------|-------|
| **Tab** | Przejście do następnej kolumny |
| **Shift+Tab** | Przejście do poprzedniej kolumny |
| **Arrow Up/Down** | Przejście do poprzedniego/następnego wiersza |
| **Arrow Left/Right** | Scroll poziomy (jeśli tabela szeroka) |
| **Enter** | Otwarcie Element Inspector dla wybranego wiersza |
| **Space** | Zaznaczenie/odznaczenie wiersza (multi-select) |
| **Ctrl+A** | Zaznaczenie wszystkich wierszy |
| **Ctrl+C** | Kopiowanie zaznaczonych wierszy do schowka (CSV) |
| **Esc** | Anulowanie zaznaczenia / zamknięcie filtrów |

### 10.2. Screen Readers

- **MUST** zawierać ARIA labels dla wszystkich elementów interaktywnych,
- **MUST** ogłaszać zmiany stanu (sortowanie, filtrowanie) przez screen reader,
- **MUST** zawierać `role="table"`, `role="row"`, `role="columnheader"`, `role="cell"`,
- **MUST** ogłaszać liczbę wierszy i kolumn przy otwieraniu tabeli.

### 10.3. Visual Feedback

- **Hover** nad wierszem: podświetlenie wiersza (light gray background),
- **Focus** na wierszu: obramowanie (blue outline),
- **Selected** wiersz: tło (blue background, white text),
- **Sorting indicator**: strzałka w nagłówku kolumny (▲ rosnąco, ▼ malejąco),
- **Filter indicator**: ikona filtra w nagłówku kolumny (🔽 aktywny filtr).

---

## 11. ZABRONIONE PRAKTYKI

### 11.1. FORBIDDEN

- **FORBIDDEN**: ukrywanie kolumn "dla uproszczenia" — użytkownik decyduje,
- **FORBIDDEN**: tworzenie "basic table" i "advanced table" — jedna tabela z opcjami,
- **FORBIDDEN**: pomijanie wyników z warnings/errors — wszystkie widoczne,
- **FORBIDDEN**: hard-coded listy kolumn — kolumny muszą być konfigurowalne,
- **FORBIDDEN**: brak możliwości eksportu danych,
- **FORBIDDEN**: eksport PDF bez nagłówka kontekstu (Global Context Bar),
- **FORBIDDEN**: eksport CSV bez jednostek w nazwach kolumn,
- **FORBIDDEN**: zmiana wartości podczas hover (read-only zawsze),
- **FORBIDDEN**: sortowanie bez zachowania stanu w sesji,
- **FORBIDDEN**: filtrowanie bez możliwości resetu,
- **FORBIDDEN**: tabele bez wirtualizacji dla > 1 000 wierszy,
- **FORBIDDEN**: operacje > 1 s bez progress bar,
- **FORBIDDEN**: brak keyboard navigation,
- **FORBIDDEN**: brak ARIA labels (accessibility),
- **FORBIDDEN**: kolorowanie według typu elementu zamiast semantyki (Status).

---

## 12. ZALEŻNOŚCI OD INNYCH KONTRAKTÓW

- **RESULTS_BROWSER_CONTRACT.md**: Results Tables są częścią Results Browser,
- **ELEMENT_INSPECTOR_CONTRACT.md**: kliknięcie w wiersz tabeli otwiera Element Inspector,
- **GLOBAL_CONTEXT_BAR.md**: Context Bar musi być drukowany w nagłówku PDF,
- **EXPERT_MODES_CONTRACT.md**: Results Tables muszą reagować na zmianę Expert Mode,
- **UI_ETAP_POWERFACTORY_PARITY.md**: Results Tables muszą spełniać parity z ETAP/PowerFactory,
- **SLD_UI_CONTRACT.md**: Semantic Color Contract (kolor = znaczenie, nie typ elementu).

---

## 13. WERSJONOWANIE I ZMIANY

- Wersja 1.0: definicja bazowa (2026-01-28),
- Zmiany w kontrakcie wymagają aktualizacji wersji i code review,
- Breaking changes wymagają migracji UI i aktualizacji testów E2E.

---

**KONIEC KONTRAKTU**
