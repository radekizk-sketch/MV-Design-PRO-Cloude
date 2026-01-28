# Panele zwarciowe i wydruk: Layout i reguły (CANONICAL)

**Status:** CANONICAL (BINDING)
**Wersja:** 1.0
**Data:** 2026-01-28
**Referencje:**
- `SLD_SCADA_CAD_CONTRACT.md` — kontrakt widoku SLD
- `SLD_SHORT_CIRCUIT_BUS_CENTRIC.md` — prezentacja wyników zwarciowych
- `P11_SC_CASE_MAPPING.md` — mapowanie na P11
- `P11_1d_PROOF_UI_EXPORT.md` — eksport do PDF/DOCX

---

## 1. Cel i zakres dokumentu

Niniejszy dokument definiuje **wiążący kontrakt** dla:

1. **Paneli zwarciowych** — prezentacja wyników dla wszystkich BUS i Case,
2. **Paneli porównawczych** — porównanie Case A vs B vs C (lub MAX/MIN/N-1),
3. **Wydruku (PDF/DOCX)** — layout, format, metadane.

**Zasada fundamentalna:**

> Wydruk = snapshot UI bez utraty informacji.
> Jedna strona BUS = fragment SLD + tabela wyników + tabela wkładów + metadane.

Dokument jest **BINDING** dla:
- warstwy UI (panele wyników),
- logiki eksportu (PDF/DOCX generator),
- warstwy P11 (Proof Inspector, trace).

---

## 2. Terminologia (BINDING)

| Termin | Definicja | Przykład |
|--------|-----------|----------|
| **Panel zwarciowy** | Tabela zawierająca wyniki zwarciowe dla wszystkich BUS i jednego Case | Tabela: BUS → `Ik″`, `ip`, `Ith`, `Sk″` dla Case MAX |
| **Panel porównawczy** | Tabela porównująca wyniki między Case (A/B/C… lub MAX/MIN/N-1) | Kolumny: BUS, Case A, Case B, Case C, Min, Max |
| **Snapshot** | Stan sieci (NetworkModel + konfiguracja) w momencie obliczeń | Snapshot ID: `20260128T123045` |
| **Trace ID** | Unikalny identyfikator dowodu (proof) dla konkretnej wartości wynikowej | `trace_id: IEC60909_Ik_B02_MAX_abc123` |
| **Metadane** | Informacje kontekstowe o obliczeniach (norma, data, autor, snapshot) | IEC 60909, 2026-01-28, Jan Kowalski |
| **Strona BUS** | Jedna strona wydruku dedykowana jednemu BUS (fragment SLD + wyniki + wkłady) | Strona dla BUS B-02 |

---

## 3. Panel zwarciowy: wyniki dla jednego Case

### 3.1 Definicja

**CANONICAL:**

**Panel zwarciowy** to tabela zawierająca wyniki zwarciowe dla **wszystkich BUS** w sieci dla **jednego Case** (MAX / MIN / N-1).

### 3.2 Struktura tabeli

**MUST:**

Tabela zawiera następujące kolumny:

| BUS | Un [kV] | Ik″ [kA] | ip [kA] | Ith [kA] | Sk″ [MVA] | Case |
|-----|---------|----------|---------|----------|-----------|------|
| B-01 | 15.0 | 12.5 | 32.8 | 11.2 | 325 | MAX |
| B-02 | 15.0 | 10.8 | 28.3 | 9.7 | 280 | MAX |
| B-03 | 0.4 | 9.2 | 24.1 | 8.3 | 6.4 | MAX |

**Kolejność kolumn (BINDING):**
1. `BUS` — nazwa szyny,
2. `Un` — napięcie znamionowe [kV],
3. `Ik″` — prąd zwarciowy początkowy [kA],
4. `ip` — prąd zwarciowy udarowy [kA],
5. `Ith` — prąd zwarciowy cieplny [kA],
6. `Sk″` — moc zwarciowa [MVA],
7. `Case` — nazwa Case (MAX / MIN / N-1).

### 3.3 Sortowanie wierszy

**BINDING:**

Wiersze są sortowane według jednego z kryteriów (wybór użytkownika):

| Kryterium | Opis | Przykład |
|-----------|------|----------|
| **Alfabetycznie (domyślnie)** | Według nazwy BUS (A-Z) | B-01, B-02, B-03 |
| **Według `Ik″` malejąco** | Największy prąd zwarciowy na górze | B-01 (12.5), B-02 (10.8), B-03 (9.2) |
| **Według `Sk″` malejąco** | Największa moc zwarciowa na górze | B-01 (325), B-02 (280), B-03 (6.4) |
| **Według poziomu napięcia** | Najpierw WN, potem SN, potem nn | SN (15 kV), nn (0.4 kV) |

**Domyślnie:** Alfabetycznie (deterministyczność).

### 3.4 Precyzja wyświetlania

**MUST:**

| Kolumna | Precyzja | Przykład |
|---------|----------|----------|
| `Un` | 0.1 kV | `15.0 kV` |
| `Ik″` | 0.1 kA | `12.5 kA` |
| `ip` | 0.1 kA | `32.8 kA` |
| `Ith` | 0.1 kA | `11.2 kA` |
| `Sk″` | 1 MVA (dla SN/WN), 0.1 MVA (dla nn) | `325 MVA`, `6.4 MVA` |

**FORBIDDEN:**
- Nadmierna precyzja (np. `12.4567 kA`).
- Brak jednostek (np. `12.5` zamiast `12.5 kA`).

### 3.5 Kolory wierszy (opcjonalnie)

**ALLOWED:**

System **może** kolorować wiersze według wartości `Ik″`:

| Wartość `Ik″` | Kolor wiersza | Opis |
|---------------|---------------|------|
| `Ik″ < 5 kA` | **Zielony** | Niski prąd zwarciowy |
| `5 kA ≤ Ik″ < 15 kA` | **Żółty** | Średni prąd zwarciowy |
| `Ik″ ≥ 15 kA` | **Czerwony** | Wysoki prąd zwarciowy |

**MUST:**
- Kolory są zachowane w PDF (jeśli drukarka kolorowa).
- W wydruku monochromatycznym: kolory zastąpione wzorami (np. zielony → jasny szary, czerwony → ciemny szary).

---

## 4. Panel porównawczy: Case A vs B vs C

### 4.1 Definicja

**CANONICAL:**

**Panel porównawczy** to tabela porównująca wyniki zwarciowe między różnymi Case dla tych samych BUS.

### 4.2 Struktura tabeli (wariant A/B/C)

**MUST:**

Jeśli użytkownik definiuje Case z niestandardowymi nazwami (A, B, C…):

| BUS | Un [kV] | Case A: Ik″ [kA] | Case B: Ik″ [kA] | Case C: Ik″ [kA] | Min [kA] | Max [kA] | Δ (Max/Min) |
|-----|---------|------------------|------------------|------------------|----------|----------|-------------|
| B-01 | 15.0 | 12.5 | 10.3 | 8.2 | 8.2 | 12.5 | 1.52 |
| B-02 | 15.0 | 10.8 | 9.1 | 6.5 | 6.5 | 10.8 | 1.66 |
| B-03 | 0.4 | 9.2 | 7.8 | 5.1 | 5.1 | 9.2 | 1.80 |

**Kolumny:**
1. `BUS` — nazwa szyny,
2. `Un` — napięcie znamionowe,
3. `Case A: Ik″` — wynik dla Case A,
4. `Case B: Ik″` — wynik dla Case B,
5. `Case C: Ik″` — wynik dla Case C,
6. `Min` — wartość minimalna (spośród A/B/C),
7. `Max` — wartość maksymalna (spośród A/B/C),
8. `Δ (Max/Min)` — stosunek Max/Min (miara rozstępu).

### 4.3 Struktura tabeli (wariant MAX/MIN/N-1)

**MUST:**

Jeśli użytkownik używa standardowych Case (MAX/MIN/N-1):

| BUS | Un [kV] | MAX: Ik″ [kA] | MIN: Ik″ [kA] | N-1: Ik″ [kA] | Δ (MAX/MIN) |
|-----|---------|---------------|---------------|---------------|-------------|
| B-01 | 15.0 | 12.5 | 8.2 | 10.3 | 1.52 |
| B-02 | 15.0 | 10.8 | 6.5 | 9.1 | 1.66 |
| B-03 | 0.4 | 9.2 | 5.1 | 7.8 | 1.80 |

### 4.4 Kolumna `Δ (Max/Min)`

**CANONICAL:**

Kolumna `Δ (Max/Min)` pokazuje **stosunek** największego do najmniejszego prądu zwarciowego:

```
Δ = Ik″(MAX) / Ik″(MIN)
```

**Interpretacja:**

| Wartość Δ | Interpretacja | Opis |
|-----------|---------------|------|
| `Δ < 1.5` | **Niski rozstęp** | Sieć mało wrażliwa na konfigurację źródeł |
| `1.5 ≤ Δ < 2.0` | **Średni rozstęp** | Normalna wrażliwość |
| `Δ ≥ 2.0` | **Wysoki rozstęp** | Sieć bardzo wrażliwa na konfigurację źródeł (np. duży udział PV/WIND) |

**MUST:**
- Kolumna `Δ` jest wyświetlana z precyzją 0.01 (np. `1.52`).
- Jeśli `Δ ≥ 2.0` → wiersz kolorowany na żółty/pomarańczowy (ostrzeżenie).

### 4.5 Wizualizacja porównawcza (wykres)

**ALLOWED:**

System **może** pokazywać wykres słupkowy porównujący Case:

```
   Ik″ [kA]
    15 ┤         ████  ← MAX
       │         ████
    10 ┤    ████ ████  ← N-1
       │    ████ ████
     5 ┤████ ████ ████  ← MIN
       │████ ████ ████
     0 └─────────────────
        B-01 B-02 B-03
```

**MUST:**
- Wykres jest opcjonalny (nie zastępuje tabeli).
- Wykres jest eksportowany do PDF (jeśli użytkownik go włączył).

---

## 5. Tabela wkładów (contributions)

### 5.1 Definicja

**CANONICAL:**

**Tabela wkładów** pokazuje, skąd pochodzi prąd zwarciowy w danym BUS (rozkład wkładów).

**Referencja:** `SLD_SHORT_CIRCUIT_BUS_CENTRIC.md` § 6.

### 5.2 Struktura tabeli

**MUST:**

Tabela zawiera następujące kolumny:

| Element | Typ | Wkład [kA] | Udział [%] |
|---------|-----|------------|------------|
| Sieć zewnętrzna (GRID) | Source | 5.8 | 46.4% |
| Transformator T-01 | TransformerBranch | 3.5 | 28.0% |
| PV-01 | Source (PV) | 1.2 | 9.6% |
| BESS-01 | Source (BESS) | 0.8 | 6.4% |
| Linia L-12 (z B-01) | LineBranch | 1.2 | 9.6% |
| **SUMA** | — | **12.5** | **100.0%** |

**Kolejność wierszy:**
- Od największego do najmniejszego wkładu (`Wkład DESC`).

**Precyzja:**
- `Wkład`: 0.1 kA,
- `Udział`: 0.1%.

### 5.3 Kiedy pokazywać tabelę wkładów?

**MUST:**

Tabela wkładów jest wyświetlana:

1. **W panelu bocznym** (UI) — po kliknięciu BUS w panelu zwarciowym.
2. **W wydruku** (PDF) — na stronie dedykowanej danemu BUS (§ 8).

**FORBIDDEN:**

- Pokazywanie tabeli wkładów dla wszystkich BUS jednocześnie (zbyt duża ilość danych).
- Pomijanie wkładów < 0.1 kA (każdy wkład musi być widoczny).

### 5.4 Wizualizacja wkładów (wykres kołowy)

**ALLOWED:**

System **może** pokazywać wykres kołowy (pie chart) dla wkładów:

```
        ╭─────────────╮
       ╱               ╲
      │   46.4% GRID   │
      │   28.0% T-01   │
      │   9.6% PV-01   │
       ╲   6.4% BESS   ╱
        ╰─────────────╯
```

**MUST:**
- Wykres jest opcjonalny (nie zastępuje tabeli).
- Wykres jest eksportowany do PDF.

---

## 6. Metadane obliczeń

### 6.1 Co to są metadane?

**CANONICAL:**

**Metadane** to informacje kontekstowe o obliczeniach, które **muszą** być widoczne w UI i w wydruku.

### 6.2 Obowiązkowe metadane

**MUST:**

Każdy wynik zwarciowy (panel, wydruk) **musi** zawierać następujące metadane:

| Metadana | Opis | Przykład |
|----------|------|----------|
| **Norma** | Standard obliczeń zwarciowych | `IEC/PN-EN 60909-0:2016` |
| **Snapshot ID** | Identyfikator stanu sieci | `20260128T123045` |
| **Data obliczeń** | Data i godzina wykonania obliczeń | `2026-01-28 12:30:45` |
| **Autor** | Użytkownik, który wykonał obliczenia | `Jan Kowalski` |
| **Case** | Nazwa przypadku obliczeniowego | `MAX` / `MIN` / `N-1: T-01` |
| **Trace ID** (opcjonalnie) | Link do dowodu (P11) | `IEC60909_Ik_B02_MAX_abc123` |

### 6.3 Layout metadanych w UI

**MUST:**

Metadane są wyświetlane w **nagłówku panelu** (nad tabelą wyników):

```
┌───────────────────────────────────────────────────────────┐
│ Wyniki obliczeń zwarciowych (Case: MAX)                   │
│ ───────────────────────────────────────────────────────── │
│ Norma: IEC/PN-EN 60909-0:2016                             │
│ Snapshot: 20260128T123045 | Data: 2026-01-28 12:30:45     │
│ Autor: Jan Kowalski                                        │
└───────────────────────────────────────────────────────────┘
```

### 6.4 Layout metadanych w PDF

**MUST:**

Metadane są wyświetlane w **nagłówku strony** (każda strona PDF):

```
┌───────────────────────────────────────────────────────────┐
│ MV-DESIGN-PRO — Wyniki obliczeń zwarciowych               │
│ ───────────────────────────────────────────────────────── │
│ Projekt: Elektrownia PV XYZ                               │
│ Norma: IEC/PN-EN 60909-0:2016                             │
│ Case: MAX (zwarcie trójfazowe symetryczne)                │
│ Data obliczeń: 2026-01-28 12:30:45                        │
│ Autor: Jan Kowalski                                        │
│ Snapshot ID: 20260128T123045                              │
└───────────────────────────────────────────────────────────┘
```

---

## 7. Layout wydruku: zasada 1:1

### 7.1 Zasada fundamentalna

**CANONICAL:**

> Wydruk (PDF/DOCX) jest **1:1 snapchotem UI** bez utraty informacji.

**MUST:**
- Wszystko, co widoczne na ekranie → widoczne w PDF.
- Panele zwarciowe → pełne tabele w PDF.
- Tabele wkładów → pełne (nie obcięte).
- Kolory BUS → zachowane (jeśli drukarka kolorowa).
- SCADA SLD + CAD overlay → obie warstwy w PDF.

**FORBIDDEN:**
- Ukrywanie elementów przy wydruku (np. CAD overlay).
- Obcinanie tabel (np. tylko pierwsze 10 BUS zamiast wszystkich).
- Zmiana formatowania (np. INLINE → SIDE STACK bez zgody użytkownika).

### 7.2 Format strony

**MUST:**

| Parametr | Wartość domyślna | Możliwe opcje |
|----------|------------------|---------------|
| **Format papieru** | A4 (210 × 297 mm) | A4, A3, Letter |
| **Orientacja** | Pionowa (portrait) | Pionowa, pozioma (landscape) |
| **Marginesy** | 20 mm (wszystkie strony) | 10-30 mm |
| **Czcionka** | Sans-serif (np. Arial, Helvetica) | Sans-serif, monospace (dla liczb) |
| **Rozmiar czcionki** | 10 pt (tekst), 8 pt (tabele) | 8-12 pt |

**ALLOWED:**
- Użytkownik może zmienić format papieru (A4 → A3 dla dużych diagramów).
- Użytkownik może zmienić orientację (pionowa → pozioma dla szerokich tabel).

### 7.3 Wielostronicowość

**MUST:**

Jeśli zawartość nie mieści się na jednej stronie:

1. **Tabele:** Kontynuuj na następnej stronie, powtórz nagłówek tabeli.
2. **Diagram SLD:** Podziel na logiczne sekcje (np. jeden poziom napięcia = jedna strona).
3. **Oznaczenie kontynuacji:** "ciąg dalszy na stronie X".

**FORBIDDEN:**
- Cięcie elementów w połowie (np. transformator na dwóch stronach).
- Brak informacji o kontynuacji.

---

## 8. Strona BUS: dedykowana strona dla jednego BUS

### 8.1 Definicja

**CANONICAL:**

**Strona BUS** to jedna strona PDF dedykowana **jednemu BUS**, zawierająca:

1. Fragment SLD (BUS + elementy bezpośrednio połączone),
2. Wyniki zwarciowe (`Ik″`, `ip`, `Ith`, `Sk″`) dla wszystkich Case (MAX/MIN/N-1),
3. Tabela wkładów (contributions),
4. Metadane (norma, snapshot, data, trace).

### 8.2 Layout strony BUS

**MUST:**

```
┌───────────────────────────────────────────────────────────┐
│ [Nagłówek: metadane projektu, norma, Case]                │
├───────────────────────────────────────────────────────────┤
│                                                            │
│ [Fragment SLD: BUS B-02 + elementy połączone]             │
│                                                            │
│   ════════════════════════════════════════════            │
│      BUS B-02 | 15 kV                                      │
│      Ik″ = 12.5 kA, ip = 32.8 kA, Sk″ = 325 MVA          │
│   ════════════════════════════════════════════            │
│       ║          ║          ║                              │
│     [GRID]     [T-01]     [PV-01]                          │
│                                                            │
├───────────────────────────────────────────────────────────┤
│ [Tabela wyników: BUS B-02 dla Case MAX/MIN/N-1]           │
│                                                            │
│  Case │ Ik″ [kA] │ ip [kA] │ Ith [kA] │ Sk″ [MVA]         │
│  ─────┼──────────┼─────────┼──────────┼───────────        │
│  MAX  │ 12.5     │ 32.8    │ 11.2     │ 325               │
│  MIN  │ 8.2      │ 21.5    │ 7.4      │ 213               │
│  N-1  │ 10.3     │ 27.0    │ 9.3      │ 268               │
│                                                            │
├───────────────────────────────────────────────────────────┤
│ [Tabela wkładów: BUS B-02, Case MAX]                      │
│                                                            │
│  Element         │ Typ   │ Wkład [kA] │ Udział [%]        │
│  ────────────────┼───────┼────────────┼───────────        │
│  GRID            │ Source│ 5.8        │ 46.4%             │
│  T-01            │ Trafo │ 3.5        │ 28.0%             │
│  PV-01           │ PV    │ 1.2        │ 9.6%              │
│  BESS-01         │ BESS  │ 0.8        │ 6.4%              │
│  L-12 (z B-01)   │ Line  │ 1.2        │ 9.6%              │
│  ────────────────┼───────┼────────────┼───────────        │
│  SUMA            │ —     │ 12.5       │ 100.0%            │
│                                                            │
├───────────────────────────────────────────────────────────┤
│ [Stopka: numer strony, snapshot ID, trace ID]             │
└───────────────────────────────────────────────────────────┘
```

### 8.3 Kiedy używać strony BUS?

**MUST:**

Strona BUS jest generowana **dla każdego BUS**, jeśli użytkownik wybierze opcję:

- "Raport szczegółowy" — każdy BUS na osobnej stronie,
- "Raport audytu" — pełna dokumentacja projektu.

**ALLOWED:**

Użytkownik może wybrać **tylko wybrane BUS** (nie wszystkie) do raportu szczegółowego.

**FORBIDDEN:**

- Pomijanie BUS bez zgody użytkownika (domyślnie: wszystkie BUS).

---

## 9. Raport zbiorczo: wszystkie BUS w jednym dokumencie

### 9.1 Definicja

**CANONICAL:**

**Raport zbiorczo** to dokument PDF/DOCX zawierający:

1. **Strona tytułowa** (metadane projektu),
2. **Panel zwarciowy** (tabela: wszystkie BUS + jeden Case),
3. **Panel porównawczy** (tabela: wszystkie BUS + wszystkie Case),
4. **Strony BUS** (opcjonalnie: jedna strona na BUS),
5. **Załączniki** (opcjonalnie: schematy, katalogi elementów).

### 9.2 Struktura raportu zbiorczego

**MUST:**

```
┌───────────────────────────────────────────────────────────┐
│ 1. Strona tytułowa                                         │
│    - Tytuł projektu                                        │
│    - Autor                                                 │
│    - Data                                                  │
│    - Norma                                                 │
│                                                            │
│ 2. Spis treści (opcjonalnie)                              │
│                                                            │
│ 3. Panel zwarciowy (Case: MAX)                             │
│    - Tabela: wszystkie BUS + wyniki                       │
│                                                            │
│ 4. Panel porównawczy (MAX/MIN/N-1)                         │
│    - Tabela: wszystkie BUS + porównanie Case              │
│                                                            │
│ 5. Strony BUS (opcjonalnie)                                │
│    - Strona 1: BUS B-01                                    │
│    - Strona 2: BUS B-02                                    │
│    - Strona 3: BUS B-03                                    │
│    - ...                                                   │
│                                                            │
│ 6. Załączniki (opcjonalnie)                                │
│    - Schemat SLD (pełny)                                   │
│    - Katalog elementów (linie, transformatory, źródła)    │
│    - Trace (opcjonalnie: link do P11 Proof Inspector)     │
└───────────────────────────────────────────────────────────┘
```

### 9.3 Strona tytułowa

**MUST:**

Strona tytułowa zawiera:

```
┌───────────────────────────────────────────────────────────┐
│                                                            │
│                  MV-DESIGN-PRO                             │
│                                                            │
│         Raport obliczeń zwarciowych                        │
│                                                            │
│ ═══════════════════════════════════════════════════════   │
│                                                            │
│ Projekt: Elektrownia PV XYZ                                │
│ Norma: IEC/PN-EN 60909-0:2016                              │
│ Case: MAX / MIN / N-1                                      │
│                                                            │
│ Data obliczeń: 2026-01-28                                  │
│ Autor: Jan Kowalski                                        │
│ Snapshot ID: 20260128T123045                               │
│                                                            │
│ ═══════════════════════════════════════════════════════   │
│                                                            │
│ Wygenerowane przez MV-DESIGN-PRO v1.0                      │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

---

## 10. Eksport do DOCX

### 10.1 Różnice między PDF a DOCX

**CANONICAL:**

| Format | Zalety | Wady |
|--------|--------|------|
| **PDF** | Niezmienne formatowanie, uniwersalny | Trudno edytować |
| **DOCX** | Edytowalny (MS Word, LibreOffice) | Formatowanie może się zmienić przy otwarciu |

### 10.2 Wymagania dla DOCX

**MUST:**

DOCX **musi** zawierać:

1. **Takie samo** treści jak PDF (1:1).
2. **Edytowalne tabele** (użytkownik może dodać komentarze, zmienić wartości).
3. **Edytowalne obrazy** (diagram SLD jako obraz wektorowy SVG lub PNG).
4. **Metadane** w właściwościach dokumentu (autor, tytuł, data).

**ALLOWED:**

- Diagram SLD jako **obraz osadzony** (SVG preferowany, PNG jako fallback).
- Użytkownik może edytować tekst i tabele, ale **nie może** zmieniać wyników obliczeń (wyniki są tylko do odczytu w sensie logicznym).

**FORBIDDEN:**

- Eksport DOCX bez tabel (np. tylko tekst).
- Utrata metadanych przy eksporcie.

---

## 11. Deterministyczność wydruku

### 11.1 Zasada deterministyczności

**CANONICAL:**

> Identyczny stan sieci (NetworkModel + Case) **MUSI** generować identyczny wydruk.

**MUST:**

- Kolejność BUS w tabeli: alfabetyczna (lub według `Ik″ DESC`, jeśli użytkownik wybierze).
- Kolejność wkładów: od największego do najmniejszego.
- Format liczb: stała precyzja (§ 3.4).
- Layout strony: stały (nagłówek, tabela, stopka w tej samej kolejności).

**FORBIDDEN:**

- Losowa kolejność BUS (niedeterministyczna).
- Zmieniająca się precyzja liczb przy kolejnych eksportach.
- Różne formaty wydruku dla tego samego stanu sieci.

### 11.2 Hash sprawdzalności

**ALLOWED:**

System **może** dołączyć **hash** stanu sieci do wydruku (stopka):

```
Snapshot hash: abc123def456...
```

**Cel:**
- Weryfikacja, że wydruk odpowiada konkretnemu stanowi sieci.
- Użytkownik może porównać hash w PDF z hash w bazie danych.

---

## 12. Integracja z P11 (White Box)

### 12.1 Trace ID w wydruku

**MUST:**

Każda wartość w wydruku (`Ik″`, `ip`, `Ith`, `Sk″`) **może** mieć **trace_id** (link do dowodu):

```
┌───────────────────────────────────────────────────────────┐
│ BUS B-02 | Case MAX                                        │
│ ───────────────────────────────────────────────────────── │
│ Ik″ = 12.5 kA  [trace: IEC60909_Ik_B02_MAX_abc123]        │
│ ip  = 32.8 kA  [trace: IEC60909_ip_B02_MAX_def456]        │
│ Ith = 11.2 kA  [trace: IEC60909_Ith_B02_MAX_ghi789]       │
│ Sk″ = 325 MVA  [trace: IEC60909_Sk_B02_MAX_jkl012]        │
└───────────────────────────────────────────────────────────┘
```

**ALLOWED:**

- Trace ID jako **link** w PDF (użytkownik może kliknąć → otworzyć Proof Inspector).
- Trace ID jako **tekst** (jeśli PDF nie obsługuje linków).

**FORBIDDEN:**

- Brak trace ID w wydruku audytu (audyt **musi** mieć pełną śledzalność).

### 12.2 Link do Proof Inspector

**ALLOWED:**

System **może** dołączyć **link do Proof Inspector** w wydruku:

```
┌───────────────────────────────────────────────────────────┐
│ Dowód obliczeń (P11 White Box):                            │
│ https://mv-design-pro.local/proof/IEC60909_Ik_B02_MAX     │
└───────────────────────────────────────────────────────────┘
```

**MUST:**
- Link jest **opcjonalny** (nie wszystkie projekty wymagają dowodów).
- Link jest **dostępny** tylko jeśli P11 jest aktywny (Proof Engine włączony).

---

## 13. Podsumowanie reguł (checklist)

**Implementacja zgodna z SHORT_CIRCUIT_PANELS_AND_PRINTING, jeśli:**

- [ ] Panel zwarciowy zawiera: BUS, Un, `Ik″`, `ip`, `Ith`, `Sk″`, Case.
- [ ] Panel porównawczy zawiera: BUS, Case A/B/C (lub MAX/MIN/N-1), Min, Max, Δ.
- [ ] Tabela wkładów zawiera: Element, Typ, Wkład, Udział, SUMA = `Ik″`.
- [ ] Metadane zawierają: Norma, Snapshot ID, Data, Autor, Case.
- [ ] Wydruk (PDF/DOCX) = 1:1 snapshot UI (bez utraty informacji).
- [ ] Strona BUS zawiera: fragment SLD + tabela wyników + tabela wkładów + metadane.
- [ ] Raport zbiorczo zawiera: strona tytułowa + panel zwarciowy + panel porównawczy + strony BUS (opcjonalnie).
- [ ] DOCX zawiera: takie samo treści jak PDF + edytowalne tabele.
- [ ] Wydruk jest **deterministyczny** (identyczny stan sieci → identyczny PDF).
- [ ] Trace ID jest dołączony do wydruku (opcjonalnie, jeśli P11 aktywny).

---

**KONIEC DOKUMENTU SHORT_CIRCUIT_PANELS_AND_PRINTING.md**
**Status:** CANONICAL (BINDING)
**Dokument jest źródłem prawdy dla paneli wyników i wydruku w MV-DESIGN-PRO.**
