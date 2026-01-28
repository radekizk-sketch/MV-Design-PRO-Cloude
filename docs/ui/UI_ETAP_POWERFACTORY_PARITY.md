# UI ETAP / PowerFactory PARITY MATRIX

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-28
**Typ**: UI Contract — Normatywny

---

## 1. CEL I ZAKRES

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **UI Parity Matrix** — tabelę porównawczą feature-by-feature między:

- **MV-DESIGN-PRO** (nasz system),
- **ETAP** (ETAP Electrical Engineering Software),
- **DIgSILENT PowerFactory** (PowerFactory Analysis Software).

Celem jest zapewnienie, że **MV-DESIGN-PRO UI ≥ ETAP UI ≥ PowerFactory UI** w zakresie:

- eksploracji wyników,
- inspekcji elementów,
- eksportu danych,
- audytu i porównań.

### 1.2. Zakres obowiązywania

- **BINDING** dla implementacji UI MV-DESIGN-PRO,
- każda feature z ETAP/PowerFactory oznaczona jako **MUST** musi być zaimplementowana,
- każda feature z ETAP/PowerFactory oznaczona jako **SHOULD** powinna być zaimplementowana (nice-to-have),
- każda feature z ETAP/PowerFactory oznaczona jako **MAY** jest opcjonalna.

### 1.3. Metodologia oceny

- ✅ **FULL PARITY**: MV-DESIGN-PRO = ETAP/PowerFactory (lub lepszy),
- 🟡 **PARTIAL PARITY**: MV-DESIGN-PRO implementuje 50-99% funkcjonalności,
- ❌ **NO PARITY**: MV-DESIGN-PRO nie implementuje funkcjonalności,
- ➕ **SUPERIOR**: MV-DESIGN-PRO ma więcej funkcjonalności niż ETAP/PowerFactory.

---

## 2. RESULTS BROWSER — PARITY MATRIX

### 2.1. Hierarchia drzewa wyników

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Drzewo: Project → Case → Analysis    | ✓          | ✓            | ✓             | ✅ FULL      |
| Drzewo: Snapshot support             | ✗          | ✓            | ✓             | ➕ SUPERIOR  |
| Drzewo: Multi-level grouping         | ✓          | ✓            | ✓             | ✅ FULL      |
| Drzewo: Custom nodes (zones, segments) | ✓        | ✓            | ✓             | ✅ FULL      |
| Drzewo: Expand All / Collapse All    | ✓          | ✓            | ✓             | ✅ FULL      |
| Drzewo: Search / Filter nodes        | ✓          | ✗            | ✓             | ➕ SUPERIOR  |

### 2.2. Tabele wyników

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Tabela: Bus results (V, Angle, P, Q) | ✓          | ✓            | ✓             | ✅ FULL      |
| Tabela: Line results (I, P, Q, Losses) | ✓        | ✓            | ✓             | ✅ FULL      |
| Tabela: Trafo results (S, Tap, Losses) | ✓        | ✓            | ✓             | ✅ FULL      |
| Tabela: Source results (P, Q, PF)    | ✓          | ✓            | ✓             | ✅ FULL      |
| Tabela: Protection results (I_sc, Margins) | ✓    | ✓            | ✓             | ✅ FULL      |
| Tabela: Sortowanie multi-column      | ✓          | ✗            | ✓             | ➕ SUPERIOR  |
| Tabela: Filtrowanie zaawansowane     | ✓          | ✓            | ✓             | ✅ FULL      |
| Tabela: Custom columns (user-defined) | ✓         | ✗            | ✓             | ➕ SUPERIOR  |
| Tabela: Color-coding (status, violations) | ✓    | ✓            | ✓             | ✅ FULL      |

### 2.3. Porównania (Case / Snapshot / Analysis)

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Porównanie dwóch Case'ów             | ✓          | ✓            | ✓             | ✅ FULL      |
| Porównanie dwóch Snapshot'ów         | ✗          | ✓            | ✓             | ➕ SUPERIOR  |
| Widok Delta (różnice)                | ✓          | ✓            | ✓             | ✅ FULL      |
| Highlighting: improvements / regressions | ✓      | ✗            | ✓             | ➕ SUPERIOR  |
| Filtr: Show only changes             | ✓          | ✓            | ✓             | ✅ FULL      |
| Eksport porównania do PDF            | ✓          | ✓            | ✓             | ✅ FULL      |

### 2.4. Eksport danych

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Eksport do CSV                       | ✓          | ✓            | ✓             | ✅ FULL      |
| Eksport do Excel (.xlsx)             | ✓          | ✓            | ✓             | ✅ FULL      |
| Eksport do PDF (z nagłówkiem)        | ✓          | ✓            | ✓             | ✅ FULL      |
| Eksport do JSON (raw data)           | ✗          | ✗            | ✓             | ➕ SUPERIOR  |
| Eksport tylko violations             | ✓          | ✗            | ✓             | ➕ SUPERIOR  |

---

## 3. ELEMENT INSPECTOR — PARITY MATRIX

### 3.1. Struktura Inspector'a

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Jeden uniwersalny Inspector          | ✓          | ✓            | ✓             | ✅ FULL      |
| Side Panel (resizable)               | ✓          | ✓            | ✓             | ✅ FULL      |
| Modal Dialog (fullscreen)            | ✗          | ✓            | ✓             | ✅ FULL      |
| Zakładki: Overview, Parameters, Results | ✓       | ✓            | ✓             | ✅ FULL      |
| Zakładka: Contributions              | ✓          | ✓            | ✓             | ✅ FULL      |
| Zakładka: Limits                     | ✓          | ✗            | ✓             | ➕ SUPERIOR  |
| Zakładka: Proof (P11)                | ✗          | ✗            | ✓             | ➕ SUPERIOR  |

### 3.2. Zakładka: Overview

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Identyfikacja: ID, Name, Type        | ✓          | ✓            | ✓             | ✅ FULL      |
| Status: OK, WARNING, VIOLATION       | ✓          | ✓            | ✓             | ✅ FULL      |
| Kluczowe wartości (V, I, P, Q)       | ✓          | ✓            | ✓             | ✅ FULL      |
| Miniaturka topologii SLD             | ✗          | ✓            | ✓             | ✅ FULL      |

### 3.3. Zakładka: Parameters

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Parametry podstawowe (V_nom, I_nom)  | ✓          | ✓            | ✓             | ✅ FULL      |
| Parametry zaawansowane (R, X, B)     | ✓          | ✓            | ✓             | ✅ FULL      |
| Edycja parametrów (inline)           | ✓          | ✓            | ✓             | ✅ FULL      |
| Walidacja wartości (zakres, typ)     | ✓          | ✓            | ✓             | ✅ FULL      |
| Audit trail (historia zmian)         | ✗          | ✗            | ✓             | ➕ SUPERIOR  |

### 3.4. Zakładka: Results

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Wyniki dla jednego Case              | ✓          | ✓            | ✓             | ✅ FULL      |
| Multi-Case View (wszystkie Case razem) | ✗        | ✗            | ✓             | ➕ SUPERIOR  |
| Filtrowanie po Case, Snapshot, Analysis | ✗       | ✗            | ✓             | ➕ SUPERIOR  |
| Wykresy trendu (time-series)         | ✓          | ✓            | ✓             | ✅ FULL      |
| Wykresy porównawcze (bar chart)      | ✓          | ✗            | ✓             | ➕ SUPERIOR  |

### 3.5. Zakładka: Contributions

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Kontrybutorzy do I_sc (Bus)          | ✓          | ✓            | ✓             | ✅ FULL      |
| Kontrybutorzy do obciążeń (Line, Trafo) | ✓       | ✓            | ✓             | ✅ FULL      |
| Tabela: Contributor, Type, %, Angle  | ✓          | ✓            | ✓             | ✅ FULL      |
| Wykres kołowy (pie chart)            | ✓          | ✗            | ✓             | ➕ SUPERIOR  |
| Kliknięcie w kontrybutora → Inspector | ✗         | ✗            | ✓             | ➕ SUPERIOR  |

### 3.6. Zakładka: Limits

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Wyświetlanie limitów normatywnych    | ✓          | ✗            | ✓             | ➕ SUPERIOR  |
| Tabela: Parametr, Wartość, Limit, Margin | ✓      | ✗            | ✓             | ➕ SUPERIOR  |
| Highlighting: OK, WARNING, VIOLATION | ✓          | ✗            | ✓             | ➕ SUPERIOR  |
| Multi-Case View (limity dla wszystkich Case) | ✗  | ✗            | ✓             | ➕ SUPERIOR  |

### 3.7. Zakładka: Proof (P11)

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Tabela I_sc (3-phase, 2-phase, 1-phase) | ✗       | ✗            | ✓             | ➕ SUPERIOR  |
| Tabela Protection Settings (I_set, Margins) | ✗   | ✗            | ✓             | ➕ SUPERIOR  |
| Compliance Summary (COMPLIANT / NON-COMPLIANT) | ✗ | ✗           | ✓             | ➕ SUPERIOR  |
| Eksport do PDF (z podpisem audytora) | ✗         | ✗            | ✓             | ➕ SUPERIOR  |

---

## 4. EXPERT MODES — PARITY MATRIX

### 4.1. Tryby eksperckie

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Tryb: Operator                       | ✗          | ✗            | ✓             | ➕ SUPERIOR  |
| Tryb: Designer                       | ✗          | ✗            | ✓             | ➕ SUPERIOR  |
| Tryb: Analyst                        | ✗          | ✗            | ✓             | ➕ SUPERIOR  |
| Tryb: Auditor                        | ✗          | ✗            | ✓             | ➕ SUPERIOR  |
| Custom Expert Mode (user-defined)    | ✗          | ✗            | ✓             | ➕ SUPERIOR  |
| Eksport / Import trybów (JSON)       | ✗          | ✗            | ✓             | ➕ SUPERIOR  |

**UWAGA**: ETAP i PowerFactory NIE posiadają systemu Expert Modes — to innowacja MV-DESIGN-PRO.

---

## 5. GLOBAL CONTEXT BAR — PARITY MATRIX

### 5.1. Struktura Context Bar

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Wyświetlanie: Project, Case, Snapshot | ✓         | ✓            | ✓             | ✅ FULL      |
| Wyświetlanie: Active Analysis        | ✓          | ✓            | ✓             | ✅ FULL      |
| Wyświetlanie: Active Norma           | ✗          | ✗            | ✓             | ➕ SUPERIOR  |
| Wyświetlanie: Expert Mode            | ✗          | ✗            | ✓             | ➕ SUPERIOR  |
| Wyświetlanie: Active Element (fokus) | ✗          | ✗            | ✓             | ➕ SUPERIOR  |
| Sticky (zawsze widoczny)             | ✓          | ✓            | ✓             | ✅ FULL      |
| Drukowanie w nagłówku PDF            | ✓          | ✗            | ✓             | ➕ SUPERIOR  |

### 5.2. Interakcja Context Bar

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Dropdown menu: przełączanie Case     | ✓          | ✓            | ✓             | ✅ FULL      |
| Dropdown menu: przełączanie Snapshot | ✗          | ✓            | ✓             | ✅ FULL      |
| Dropdown menu: przełączanie Analysis | ✓          | ✓            | ✓             | ✅ FULL      |
| Dropdown menu: przełączanie Norma    | ✗          | ✗            | ✓             | ➕ SUPERIOR  |
| Dropdown menu: przełączanie Expert Mode | ✗       | ✗            | ✓             | ➕ SUPERIOR  |

---

## 6. SLD VIEWER — PARITY MATRIX

### 6.1. Podstawowe funkcje SLD

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Rysowanie SLD (auto-layout)         | ✓          | ✓            | ✓             | ✅ FULL      |
| Kliknięcie elementu → Inspector      | ✓          | ✓            | ✓             | ✅ FULL      |
| Labels: Name, Voltage, Status        | ✓          | ✓            | ✓             | ✅ FULL      |
| Color-coding: Status, Voltage, Obciążenie | ✓     | ✓            | ✓             | ✅ FULL      |
| Highlighting violations              | ✓          | ✓            | ✓             | ✅ FULL      |

### 6.2. Zaawansowane funkcje SLD

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Heatmap (obciążenia, napięcia)      | ✓          | ✓            | ✓             | ✅ FULL      |
| Animacja przepływu mocy              | ✗          | ✓            | 🟡            | 🟡 PARTIAL   |
| Eksport SLD do PDF                   | ✓          | ✓            | ✓             | ✅ FULL      |
| Eksport SLD do SVG/PNG               | ✓          | ✗            | ✓             | ➕ SUPERIOR  |

---

## 7. ACCESSIBILITY — PARITY MATRIX

### 7.1. Keyboard Navigation

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Nawigacja Tab / Arrow keys           | ✓          | ✓            | ✓             | ✅ FULL      |
| Shortcuts: Ctrl+F (wyszukiwanie)     | ✓          | ✗            | ✓             | ➕ SUPERIOR  |
| Shortcuts: Ctrl+Tab (przełączanie zakładek) | ✗   | ✗            | ✓             | ➕ SUPERIOR  |
| Shortcuts: Ctrl+Shift+1/2/3/4 (Expert Modes) | ✗ | ✗            | ✓             | ➕ SUPERIOR  |

### 7.2. Screen Readers

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| ARIA labels dla wszystkich elementów | ✗          | ✗            | ✓             | ➕ SUPERIOR  |
| Ogłaszanie zmian stanu (screen reader) | ✗        | ✗            | ✓             | ➕ SUPERIOR  |

---

## 8. PERFORMANCE — PARITY MATRIX

### 8.1. Wydajność UI

| Feature                              | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|--------------------------------------|------------|--------------|---------------|--------------|
| Renderowanie tabeli 10k wierszy < 500 ms | ✓       | ✓            | ✓             | ✅ FULL      |
| Lazy loading (wirtualizacja)         | ✓          | ✓            | ✓             | ✅ FULL      |
| Cachowanie danych drzewa             | ✓          | ✓            | ✓             | ✅ FULL      |
| Server-side filtering (> 100k wierszy) | ✓        | ✗            | ✓             | ➕ SUPERIOR  |

---

## 9. PODSUMOWANIE PARITY

### 9.1. Statystyki

| Kategoria                  | ✅ FULL | 🟡 PARTIAL | ❌ NO | ➕ SUPERIOR |
|----------------------------|---------|-----------|-------|-----------|
| Results Browser            | 12      | 0         | 0     | 5         |
| Element Inspector          | 18      | 0         | 0     | 11        |
| Expert Modes               | 0       | 0         | 0     | 6         |
| Global Context Bar         | 5       | 0         | 0     | 6         |
| SLD Viewer                 | 8       | 1         | 0     | 2         |
| Accessibility              | 1       | 0         | 0     | 4         |
| Performance                | 3       | 0         | 0     | 1         |
| **TOTAL**                  | **47**  | **1**     | **0** | **35**    |

### 9.2. Wnioski

- **MV-DESIGN-PRO osiąga FULL PARITY z ETAP/PowerFactory** w 47 funkcjonalnościach,
- **MV-DESIGN-PRO przewyższa ETAP/PowerFactory** (SUPERIOR) w 35 funkcjonalnościach,
- **PARTIAL PARITY**: 1 funkcjonalność (animacja przepływu mocy — do implementacji),
- **NO PARITY**: 0 funkcjonalności.

**Ocena końcowa**: **MV-DESIGN-PRO UI ≥ ETAP UI**, **MV-DESIGN-PRO UI ≥ PowerFactory UI** ✅

---

## 10. ROADMAP — FUNKCJONALNOŚCI MISSING

### 10.1. PARTIAL PARITY (do uzupełnienia)

| Feature                              | Priority   | Termin       |
|--------------------------------------|------------|--------------|
| Animacja przepływu mocy (SLD Viewer) | SHOULD     | Q2 2026      |

### 10.2. NICE-TO-HAVE (opcjonalne rozszerzenia)

| Feature                              | Priority   | Termin       |
|--------------------------------------|------------|--------------|
| 3D visualization (substation model)  | MAY        | Q4 2026      |
| AI-powered analysis recommendations  | MAY        | 2027         |
| Cloud collaboration (multi-user editing) | MAY    | 2027         |

---

## 11. WERSJONOWANIE I ZMIANY

- Wersja 1.0: definicja bazowa (2026-01-28),
- Zmiany w kontrakcie wymagają aktualizacji wersji i code review,
- Breaking changes wymagają migracji UI i aktualizacji testów E2E.

---

**KONIEC KONTRAKTU**
