# CASE COMPARISON UI CONTRACT

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-28
**Typ**: UI Contract — Normatywny

---

## 1. CEL I ZAKRES

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **Case Comparison UI** — komponent UI MV-DESIGN-PRO, który:

- **umożliwia porównanie dwóch lub trzech Case'ów** (Case A vs Case B vs Case C),
- **wyświetla różnice (Delta) w wynikach**: ΔU, ΔP, ΔQ, ΔIk″,
- **prezentuje tabelę porównawczą + overlay różnic na SLD**,
- **umożliwia analizę scenariuszy „before/after"** (istniejący vs planowany),
- **osiąga parity z ETAP / DIgSILENT PowerFactory w zakresie porównań Case'ów**.

### 1.2. Zakres obowiązywania

- **BINDING** dla implementacji UI MV-DESIGN-PRO,
- aplikuje się do wszystkich trybów eksperckich (szczególnie Designer, Analyst, Auditor),
- komponent MUST być dostępny niezależnie od widoku SLD,
- naruszenie kontraktu = regresja wymagająca hotfix.

---

## 2. DEFINICJA CASE COMPARISON UI

### 2.1. Cel

**Case Comparison UI** to komponent, który:

- **porównuje wyniki obliczeń** (LF, SC) między dwoma lub trzema Case'ami,
- **oblicza różnice (Delta)** dla każdego parametru (ΔU, ΔP, ΔQ, ΔIk″),
- **wizualizuje różnice** w formie tabeli + overlay na SLD,
- **umożliwia filtrowanie** (show only changes, show only improvements/regressions).

### 2.2. Różnica: Case Comparison vs Snapshot Comparison

| Aspekt                  | Case Comparison                        | Snapshot Comparison                  |
|-------------------------|----------------------------------------|--------------------------------------|
| **Cel**                 | Porównanie różnych wariantów projektu  | Porównanie stanów sieci w czasie     |
| **Hierarchia**          | Case A vs Case B (różne konfiguracje) | Snapshot A vs Snapshot B (ten sam Case) |
| **Zawartość**           | Różnice w wynikach LF, SC              | Różnice w topologii + wynikach       |
| **Use Case**            | Before/after (istniejący vs planowany) | Switching scenarios (OPEN vs CLOSED) |

---

## 3. STRUKTURA CASE COMPARISON UI (BINDING)

### 3.1. Panel główny

Case Comparison UI **MUST** składać się z trzech sekcji:

1. **Case Selector** (wybór Case'ów do porównania),
2. **Comparison Table** (tabela porównawcza),
3. **SLD Overlay** (wizualizacja różnic na SLD).

---

### 3.2. Sekcja: Case Selector

#### 3.2.1. Wybór Case'ów (BINDING)

Case Selector **MUST** umożliwiać wybór:

- **Case A** (bazowy, "existing"),
- **Case B** (porównywany, "planned"),
- **Case C** (opcjonalnie, trzeci wariant).

**Format:**

```
┌─────────────────────────────────────────────────────────────┐
│ Compare Cases                                               │
├─────────────────────────────────────────────────────────────┤
│ Case A (Baseline):    [Dropdown: Case 1 - Existing Network] │
│ Case B (Comparison):  [Dropdown: Case 2 - Planned Expansion]│
│ Case C (Optional):    [Dropdown: None                      ▼]│
├─────────────────────────────────────────────────────────────┤
│ Analysis Type:        [Dropdown: Load Flow (LF)            ▼]│
│ Snapshot:             [Dropdown: Baseline                  ▼]│
├─────────────────────────────────────────────────────────────┤
│ [ Compare ]  [ Export to PDF ]  [ Reset ]                   │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.2. Walidacja (BINDING)

**MUST:**
- Walidować, że Case A ≠ Case B (różne Case'y),
- Walidować, że Case A i Case B mają wyniki dla wybranego Analysis Type (LF, SC),
- Wyświetlić błąd, jeśli brak wyników: "Case B does not have Load Flow results. Run analysis first."

---

### 3.3. Sekcja: Comparison Table

#### 3.3.1. Tabela porównawcza (BINDING)

Comparison Table **MUST** wyświetlać następujące kolumny:

| Kolumna               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Element ID`          | string     | MUST     | Identyfikator elementu (Bus, Line, Trafo) |
| `Element Name`        | string     | MUST     | Nazwa elementu                            |
| `Element Type`        | enum       | MUST     | BUS, LINE, TRAFO, SOURCE                  |
| `Parameter`           | string     | MUST     | Parametr porównywany (V, I, P, Q, Ik″)    |
| `Case A Value`        | float      | MUST     | Wartość w Case A                          |
| `Case B Value`        | float      | MUST     | Wartość w Case B                          |
| `Delta (B - A)`       | float      | MUST     | Różnica (Case B - Case A)                 |
| `Delta %`             | float      | MUST     | Różnica procentowa [(B - A) / A × 100%]   |
| `Status Change`       | enum       | MUST     | IMPROVED, REGRESSED, NO_CHANGE            |

#### 3.3.2. Kolorowanie wierszy (BINDING)

| Status Change         | Kolor tła                | Ikona          |
|-----------------------|--------------------------|----------------|
| **IMPROVED**          | Zielony (#d4edda)        | ✅ (poprawa)   |
| **REGRESSED**         | Czerwony (#f8d7da)       | ❌ (pogorszenie) |
| **NO_CHANGE**         | Biały (domyślny)         | -              |

**Przykład:**

- Bus 15-01: V% = 103.5% (Case A) → V% = 101.2% (Case B), Delta = -2.3%, Status = **IMPROVED** (bliżej 100%),
- Line 15-01: I% = 85% (Case A) → I% = 95% (Case B), Delta = +10%, Status = **REGRESSED** (wyższe obciążenie).

#### 3.3.3. Sortowanie i filtrowanie (BINDING)

**MUST:**
- Sortować po dowolnej kolumnie (rosnąco / malejąco),
- Filtrować po Element Type (BUS, LINE, TRAFO),
- Filtrować po Status Change (IMPROVED, REGRESSED, NO_CHANGE),
- **Show Only Changes** (Delta ≠ 0),
- **Show Only Improvements** (Status = IMPROVED),
- **Show Only Regressions** (Status = REGRESSED).

---

### 3.4. Sekcja: SLD Overlay

#### 3.4.1. Wizualizacja różnic na SLD (BINDING)

SLD **MUST** wyświetlać różnice jako overlay na elementach:

| Element               | Overlay                                   | Kolor                     |
|-----------------------|-------------------------------------------|---------------------------|
| **Bus**               | ΔV [%] (Delta napięcia)                   | Zielony (IMPROVED), Czerwony (REGRESSED) |
| **Line**              | ΔI [%] (Delta obciążenia)                 | Zielony (IMPROVED), Czerwony (REGRESSED) |
| **Transformer**       | ΔS [%] (Delta obciążenia)                 | Zielony (IMPROVED), Czerwony (REGRESSED) |

**Przykład wizualizacji:**

```
   Bus 15-01
   ⬤ 10.5 kV (Case A) → 10.3 kV (Case B)
   ΔV: -2.3% (zielony - IMPROVED)
        │
        │ Line #1
        │ I: 85% (Case A) → 95% (Case B)
        │ ΔI: +10% (czerwony - REGRESSED)
        │
   Bus 15-02
   ⬤ 10.3 kV (Case A) → 10.2 kV (Case B)
   ΔV: -1.0% (zielony - IMPROVED)
```

#### 3.4.2. Legenda różnic (BINDING)

SLD **MUST** wyświetlać legendę różnic:

```
┌─────────────────────────────────────────────────────────────┐
│ Legend: Delta (Case B - Case A)                             │
├─────────────────────────────────────────────────────────────┤
│ ✅ IMPROVED   (zielony)  — wartość bliższa optymalnej        │
│ ❌ REGRESSED  (czerwony) — wartość gorsza niż w Case A       │
│ - NO_CHANGE  (szary)     — brak zmiany (Delta = 0)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. PORÓWNANIE TRZECH CASE'ÓW (A vs B vs C)

### 4.1. Rozszerzenie tabeli (BINDING)

Jeśli wybrano **Case C**, tabela **MUST** zawierać dodatkowe kolumny:

| Kolumna               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Case C Value`        | float      | MUST     | Wartość w Case C                          |
| `Delta (C - A)`       | float      | MUST     | Różnica (Case C - Case A)                 |
| `Delta (C - B)`       | float      | MUST     | Różnica (Case C - Case B)                 |

### 4.2. Wizualizacja (BINDING)

SLD **MUST** wyświetlać overlay dla trzech Case'ów:

```
   Bus 15-01
   ⬤ Case A: 10.5 kV
      Case B: 10.3 kV (ΔV: -2.3%, zielony)
      Case C: 10.6 kV (ΔV: +1.0%, czerwony)
```

---

## 5. EKSPORT PORÓWNANIA

### 5.1. Eksport do PDF (BINDING)

**MUST** umożliwiać eksport porównania do PDF:

- **Zawartość:**
  - Global Context Bar (Case A, Case B, Case C, Analysis Type),
  - Comparison Table (wszystkie wiersze lub tylko filtered),
  - SLD Overlay (schemat z różnicami),
  - Legenda różnic.
- **Format:** A3 (landscape), Times New Roman, 300 DPI.

### 5.2. Eksport do Excel (BINDING)

**MUST** umożliwiać eksport Comparison Table do Excel (.xlsx):

- **Zawartość:**
  - arkusz 1: Comparison Table (wszystkie kolumny),
  - arkusz 2: Summary (liczba IMPROVED, REGRESSED, NO_CHANGE),
  - arkusz 3: Metadata (Case A, Case B, Case C, Analysis Type, Timestamp).

---

## 6. PARITY Z ETAP / DIGSILENT POWERFACTORY

### 6.1. PowerFactory Parity

| Feature                          | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|----------------------------------|------------|--------------|---------------|--------------|
| Porównanie dwóch Case'ów (A vs B) | ✓         | ✓            | ✓             | ✅ FULL      |
| Porównanie trzech Case'ów (A vs B vs C) | ✗  | ✓            | ✓             | ✅ FULL      |
| Tabela porównawcza (Delta, Delta %) | ✓      | ✓            | ✓             | ✅ FULL      |
| Highlighting improvements/regressions | ✓   | ✗            | ✓             | ➕ SUPERIOR  |
| SLD Overlay (różnice na schemacie) | ✓       | ✓            | ✓             | ✅ FULL      |
| Filtr "Show Only Changes"        | ✓          | ✓            | ✓             | ✅ FULL      |
| Eksport porównania do PDF        | ✓          | ✓            | ✓             | ✅ FULL      |
| Eksport porównania do Excel      | ✓          | ✗            | ✓             | ➕ SUPERIOR  |

---

## 7. ACCESSIBILITY I UX

### 7.1. Keyboard Navigation

- **MUST** obsługiwać Tab (nawigacja między Case Selector, Comparison Table),
- **MUST** obsługiwać Enter (uruchomienie porównania),
- **MUST** obsługiwać Ctrl+E (eksport do PDF),
- **MUST** obsługiwać Ctrl+F (wyszukiwanie w Comparison Table).

### 7.2. Screen Readers

- **MUST** zawierać ARIA labels dla wszystkich kolumn Comparison Table,
- **MUST** ogłaszać zmiany statusu przez screen reader ("Bus 15-01, Delta -2.3%, Status IMPROVED").

---

## 8. PERFORMANCE

### 8.1. Wymagania wydajnościowe (BINDING)

- Obliczenie różnic (Delta) dla 1000 elementów **MUST** zajmować < 1000 ms,
- Renderowanie Comparison Table **MUST** zajmować < 500 ms,
- Eksport do PDF **MUST** zajmować < 3000 ms,
- **MUST** używać lazy loading (wirtualizacja dla > 500 elementów).

---

## 9. ZABRONIONE PRAKTYKI

### 9.1. FORBIDDEN

- **FORBIDDEN**: porównanie Case'ów bez wyników (walidacja obowiązkowa),
- **FORBIDDEN**: brak filtra "Show Only Changes" (użytkownik musi mieć możliwość ukrycia wierszy bez zmian),
- **FORBIDDEN**: brak legendy różnic na SLD Overlay,
- **FORBIDDEN**: hard-coded kolory improvements/regressions (kolory MUST być zgodne z SEMANTIC_COLOR_CONTRACT.md).

---

## 10. ZALEŻNOŚCI OD INNYCH KONTRAKTÓW

- **RESULTS_BROWSER_CONTRACT.md**: Case Comparison UI MUST być dostępny z Results Browser (Context Menu: "Compare Cases"),
- **SLD_RENDER_LAYERS_CONTRACT.md**: SLD Overlay MUST być w SCADA Layer,
- **GLOBAL_CONTEXT_BAR.md**: Case Comparison UI MUST wyświetlać Global Context Bar (Case A, Case B, Case C),
- **EXPERT_MODES_CONTRACT.md**: Case Comparison UI MUST być dostępny w trybachDesigner, Analyst, Auditor.

---

## 11. WERSJONOWANIE I ZMIANY

- Wersja 1.0: definicja bazowa (2026-01-28),
- Zmiany w kontrakcie wymagają aktualizacji wersji i code review,
- Breaking changes wymagają migracji UI i aktualizacji testów E2E.

---

**KONIEC KONTRAKTU**
