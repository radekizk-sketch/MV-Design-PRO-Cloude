# RESULTS UI ARCHITECTURE — MV-DESIGN-PRO

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-31
**Typ**: Architecture Document — Warstwa RESULTS
**Zależność nadrzędna**: UI_CORE_ARCHITECTURE.md

---

## 1. CEL I ZAKRES DOKUMENTU

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **architekturę warstwy RESULTS** w UI MV-DESIGN-PRO — kompletny framework dla prezentacji, eksploracji i analizy wyników obliczeń.

Dokument **WIĄŻE** istniejące kontrakty UI w spójną architekturę, nie zastępując ich szczegółowych specyfikacji.

### 1.2. Zakres obowiązywania

- **BINDING** dla całej warstwy prezentacji wyników,
- **PODRZĘDNY** wobec `UI_CORE_ARCHITECTURE.md` (architektura nadrzędna),
- **NADRZĘDNY** wobec szczegółowych kontraktów RESULTS,
- implementacje UI **MUST** być zgodne z niniejszą architekturą.

### 1.3. Relacja do kontraktów

Ten dokument **NIE ZASTĘPUJE** szczegółowych kontraktów. Szczegóły implementacyjne znajdują się w:

| Kontrakt | Zakres |
|----------|--------|
| `RESULTS_BROWSER_CONTRACT.md` | Przeglądarka wyników (drzewo + tabele) |
| `ELEMENT_INSPECTOR_CONTRACT.md` | Inspekcja per-element (zakładka Results) |
| `CASE_COMPARISON_UI_CONTRACT.md` | Porównania Case ↔ Case |
| `SC_NODE_RESULTS_CONTRACT.md` | Wyniki zwarciowe (Bus-centric) |

---

## 2. ROLA RESULTS W ARCHITEKTURZE SYSTEMU

### 2.1. Miejsce w architekturze warstwowej

```
┌─────────────────────────────────────────────────────────────────────┐
│                           UI CORE                                   │
│  (Context Bar, Navigation, Inspector, SLD — shell aplikacji)        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│   │   RESULTS   │◀──│    PROOF    │   │     SLD     │              │
│   │   LAYER     │   │    LAYER    │   │    LAYER    │              │
│   │             │──▶│             │   │             │              │
│   └─────────────┘   └─────────────┘   └─────────────┘              │
│         ▲                 ▲                 ▲                       │
│         │                 │                 │                       │
├─────────┴─────────────────┴─────────────────┴───────────────────────┤
│                        SOLVER LAYER                                 │
│              (Load Flow, Short-Circuit, Protection)                 │
├─────────────────────────────────────────────────────────────────────┤
│                        MODEL LAYER                                  │
│                   (NetworkModel, Topologia)                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2. Definicja warstwy RESULTS

**RESULTS LAYER** to warstwa UI odpowiedzialna za:

| Odpowiedzialność | Opis |
|------------------|------|
| **Prezentacja wyników** | Wyświetlanie danych z Solver Layer |
| **Eksploracja hierarchiczna** | Nawigacja Case → Snapshot → Run → Target |
| **Analiza tabelaryczna** | Sortowanie, filtrowanie, wyszukiwanie |
| **Porównania** | Delta między Case'ami, Snapshot'ami |
| **Decision Support** | Statusy PASS/FAIL/WARNING per element |

### 2.3. Relacja CORE ↔ RESULTS ↔ PROOF

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│    UI CORE      │         │    RESULTS      │         │     PROOF       │
│                 │         │                 │         │                 │
│  • Navigation   │◀───────▶│  • Browser      │────────▶│  • P11 Engine   │
│  • Inspector    │         │  • Tables       │         │  • Compliance   │
│  • Context Bar  │         │  • Comparisons  │◀────────│  • Audit Trail  │
│                 │         │  • Decision Sup │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                           │                           │
        │                           │                           │
        ▼                           ▼                           ▼
   Shell/Layout              Data Presentation           Formal Verification
```

**Przepływy danych:**

| Kierunek | Dane | Opis |
|----------|------|------|
| RESULTS → CORE | Selekcja | Wybrany element → Inspector, SLD highlight |
| CORE → RESULTS | Kontekst | Aktywny Case/Snapshot → filtrowanie wyników |
| RESULTS → PROOF | Żądanie | Inicjacja generowania Proof dla elementu |
| PROOF → RESULTS | Dowód | P11 compliance status → status w tabelach |

---

## 3. STRUKTURA WARSTWY RESULTS

### 3.1. Komponenty RESULTS

Warstwa RESULTS składa się z **trzech głównych komponentów**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RESULTS LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. RESULTS BROWSER                                           │   │
│  │    (drzewo hierarchiczne + tabele wyników)                   │   │
│  │    → Kontrakt: RESULTS_BROWSER_CONTRACT.md                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 2. ELEMENT RESULTS (Inspector zakładka Results)              │   │
│  │    (wyniki per-element, multi-case view)                     │   │
│  │    → Kontrakt: ELEMENT_INSPECTOR_CONTRACT.md (sekcja 6)      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 3. COMPARISON VIEW                                           │   │
│  │    (porównania Case ↔ Case, Snapshot ↔ Snapshot)             │   │
│  │    → Kontrakt: CASE_COMPARISON_UI_CONTRACT.md                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2. Widoki globalne (Project-level)

| Widok | Opis | Źródło danych |
|-------|------|---------------|
| **Results Tree** | Hierarchia Project → Case → Snapshot → Run | Solver Layer |
| **Summary Dashboard** | Agregacja violations per Case | Solver Layer |
| **Cross-Case Matrix** | Porównanie wielu Case'ów | Solver Layer |

### 3.3. Widoki per-Case / Run / Snapshot

| Widok | Hierarchia | Zawartość |
|-------|------------|-----------|
| **Case Results** | Case → Snapshot → Run | Wszystkie wyniki dla Case |
| **Snapshot Results** | Snapshot → Run → Target | Wyniki dla stanu sieci |
| **Run Results** | Run → Target → Element | Wyniki pojedynczego uruchomienia |
| **Target Results** | Target → Element | Wyniki per typ elementu (Bus, Line, Trafo) |

### 3.4. Widoki per-element

| Widok | Lokalizacja | Zawartość |
|-------|-------------|-----------|
| **Element Inspector: Results** | Zakładka Results w Inspector | Multi-case view dla elementu |
| **Element Inspector: Contributions** | Zakładka Contributions | Kontrybutorzy do I_sc, obciążeń |
| **Element Inspector: Limits** | Zakładka Limits | Limity normatywne vs wartości |
| **Element Inspector: Proof** | Zakładka Proof (P11) | Dowód zgodności |

---

## 4. DECISION SUPPORT W WARSTWIE RESULTS

### 4.1. Integracja z UI CORE Decision Support Layer

Warstwa RESULTS **MUST** implementować Decision Support Layer zdefiniowany w `UI_CORE_ARCHITECTURE.md` (sekcja 19).

**Statusy decyzyjne (BINDING):**

| Status | Symbol | Definicja | Próg |
|--------|--------|-----------|------|
| **PASS** | ✅ | Wartość w normie | value ≤ 80% limit |
| **FAIL** | ❌ | Wartość poza normą | value > 100% limit |
| **WARNING** | ⚠️ | Wartość blisko limitu | 80% < value ≤ 100% |
| **INFO** | ℹ️ | Dane bez kryterium | brak limitu |
| **UNKNOWN** | ❓ | Brak danych | brak wartości |

### 4.2. Hierarchia krytyczności w RESULTS

```
FAIL > WARNING > UNKNOWN > PASS > INFO
  5       4         3        2      1
```

**Agregacja w hierarchii RESULTS:**

| Poziom | Reguła | Przykład |
|--------|--------|----------|
| Element | Najwyższa krytyczność wszystkich parametrów | Bus: V=PASS, Ik=FAIL → FAIL |
| Target | Najwyższa krytyczność wszystkich elementów | Buses: 45 PASS, 2 FAIL → FAIL |
| Run | Najwyższa krytyczność wszystkich Targets | LF Run: Buses=PASS, Lines=WARNING → WARNING |
| Snapshot | Najwyższa krytyczność wszystkich Runs | Snapshot: LF=PASS, SC=FAIL → FAIL |
| Case | Najwyższa krytyczność wszystkich Snapshots | Case: wszystkie wyniki |

### 4.3. Prezentacja statusów w RESULTS

| Komponent | Lokalizacja statusu | Format |
|-----------|---------------------|--------|
| Results Tree | Ikona przy węźle | ✅⚠️❌ przy nazwie |
| Results Table | Kolumna Status | Ikona + kolor tła wiersza |
| Element Inspector | Nagłówek + per-parametr | Badge + kolor wartości |
| Comparison Table | Kolumna Status Change | IMPROVED / REGRESSED / NO_CHANGE |

### 4.4. „Co dalej?" po wykryciu FAIL (BINDING)

Warstwa RESULTS **MUST** implementować workflow po wykryciu FAIL:

```
┌─────────────────────────────────────────────────────────────────────┐
│ FAIL DETECTED                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. IDENTYFIKACJA                                                   │
│     └─ Element ID, nazwa, typ, lokalizacja                          │
│                                                                     │
│  2. KONTEKST NARUSZENIA                                             │
│     └─ Wartość: 25.3 kA                                             │
│     └─ Limit: 20.0 kA (IEC 60909)                                   │
│     └─ Przekroczenie: +26.5%                                        │
│                                                                     │
│  3. AKCJE DOSTĘPNE                                                  │
│     ├─ [🔍 Otwórz Inspector] → szczegóły elementu                   │
│     ├─ [📊 Pokaż Contributions] → kontrybutorzy do Ik               │
│     ├─ [📋 Generuj Proof (P11)] → formalny dowód                    │
│     ├─ [🗺️ Pokaż na SLD] → lokalizacja na schemacie                │
│     └─ [📤 Eksport] → raport PDF/Excel                              │
│                                                                     │
│  4. SUGESTIE NAPRAWY (SHOULD)                                       │
│     └─ Tooltip: "Rozważ zwiększenie mocy zwarciowej źródła"         │
│     └─ Tooltip: "Sprawdź impedancję transformatora"                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Wymagania implementacyjne:**

| Wymaganie | Typ | Opis |
|-----------|-----|------|
| Klik w FAIL → Inspector | MUST | Otwarcie Inspector z zakładką Limits |
| Tooltip z kontekstem | MUST | Wartość, limit, przekroczenie % |
| Akcja „Pokaż na SLD" | MUST | Highlight elementu na schemacie |
| Filtr „Show only FAIL" | MUST | Szybkie zawężenie do violations |
| Sugestie naprawy | SHOULD | Kontekstowe podpowiedzi |

---

## 5. MAPOWANIE FUNKCJI NA KONTRAKTY

### 5.1. Macierz funkcji RESULTS

| Funkcja | Kontrakt źródłowy | Typ specyfikacji |
|---------|-------------------|------------------|
| **Drzewo wyników (hierarchia)** | `RESULTS_BROWSER_CONTRACT.md` sekcja 2 | ARCHITEKTURA |
| **Tabele wyników (kolumny)** | `RESULTS_BROWSER_CONTRACT.md` sekcja 3 | SZCZEGÓŁ kontraktu |
| **Sortowanie / filtrowanie** | `RESULTS_BROWSER_CONTRACT.md` sekcja 3.3 | SZCZEGÓŁ kontraktu |
| **Eksport (CSV, Excel, PDF)** | `RESULTS_BROWSER_CONTRACT.md` sekcja 3.4 | SZCZEGÓŁ kontraktu |
| **Porównania Case ↔ Case** | `CASE_COMPARISON_UI_CONTRACT.md` sekcja 3 | ARCHITEKTURA + SZCZEGÓŁ |
| **Delta Table** | `CASE_COMPARISON_UI_CONTRACT.md` sekcja 3.3 | SZCZEGÓŁ kontraktu |
| **SLD Overlay (różnice)** | `CASE_COMPARISON_UI_CONTRACT.md` sekcja 3.4 | SZCZEGÓŁ kontraktu |
| **Multi-case view (per-element)** | `ELEMENT_INSPECTOR_CONTRACT.md` sekcja 6 | ARCHITEKTURA |
| **Contributions (I_sc)** | `ELEMENT_INSPECTOR_CONTRACT.md` sekcja 7 | SZCZEGÓŁ kontraktu |
| **Wyniki SC (Bus-centric)** | `SC_NODE_RESULTS_CONTRACT.md` sekcja 3-4 | ARCHITEKTURA + SZCZEGÓŁ |

### 5.2. Rozgraniczenie ARCHITEKTURA vs SZCZEGÓŁ

| Typ | Definicja | Gdzie zdefiniowane |
|-----|-----------|-------------------|
| **ARCHITEKTURA** | Struktura, hierarchia, przepływy danych | Ten dokument + UI_CORE |
| **SZCZEGÓŁ kontraktu** | Kolumny tabeli, formaty, walidacje | Poszczególne *_CONTRACT.md |

**Zasada (BINDING):**
```
ARCHITEKTURA = "CO" i "DLACZEGO"
SZCZEGÓŁ KONTRAKTU = "JAK" i "Z JAKIMI PARAMETRAMI"
```

### 5.3. Zależności między kontraktami

```
RESULTS_UI_ARCHITECTURE.md (ten dokument)
         │
         ├─── RESULTS_BROWSER_CONTRACT.md
         │         │
         │         └─── zależność: GLOBAL_CONTEXT_BAR.md
         │         └─── zależność: EXPERT_MODES_CONTRACT.md
         │
         ├─── ELEMENT_INSPECTOR_CONTRACT.md (sekcja Results)
         │         │
         │         └─── zależność: SC_NODE_RESULTS_CONTRACT.md
         │
         ├─── CASE_COMPARISON_UI_CONTRACT.md
         │         │
         │         └─── zależność: SLD_RENDER_LAYERS_CONTRACT.md
         │
         └─── SC_NODE_RESULTS_CONTRACT.md
                   │
                   └─── zależność: ELEMENT_INSPECTOR_CONTRACT.md
```

---

## 6. PORÓWNANIA W WARSTWIE RESULTS

### 6.1. Typy porównań

| Typ porównania | Definicja | Kontrakt |
|----------------|-----------|----------|
| **Case ↔ Case** | Porównanie wariantów projektu (existing vs planned) | `CASE_COMPARISON_UI_CONTRACT.md` |
| **Snapshot ↔ Snapshot** | Porównanie stanów sieci w czasie | `CASE_COMPARISON_UI_CONTRACT.md` sekcja 2.2 |
| **Run ↔ Run** | Porównanie wyników przed/po optymalizacji | `RESULTS_BROWSER_CONTRACT.md` sekcja 4 |

### 6.2. Architektura porównań

```
┌─────────────────────────────────────────────────────────────────────┐
│ COMPARISON VIEW                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ SELECTOR                                                     │   │
│  │  Case A (Baseline): [Dropdown]                               │   │
│  │  Case B (Compare):  [Dropdown]                               │   │
│  │  Case C (Optional): [Dropdown]                               │   │
│  │  Analysis Type:     [LF / SC / Proof]                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ COMPARISON TABLE                                             │   │
│  │  Element │ Param │ Case A │ Case B │ Delta │ Delta% │ Status│   │
│  │  BUS-001 │ V [%] │ 103.5  │ 101.2  │ -2.3  │ -2.2%  │ IMPR  │   │
│  │  LINE-01 │ I [%] │ 85.0   │ 95.0   │ +10.0 │ +11.8% │ REGR  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ SLD OVERLAY                                                  │   │
│  │  Wizualizacja Delta na schemacie (zielony/czerwony)          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3. Status Change (BINDING)

| Status | Kolor | Definicja |
|--------|-------|-----------|
| **IMPROVED** | Zielony (#22C55E) | Wartość bliższa optimum / violation → OK |
| **REGRESSED** | Czerwony (#EF4444) | Wartość gorsza / OK → violation |
| **NO_CHANGE** | Szary (neutralny) | Delta = 0 lub zmiana nieistotna |

### 6.4. Filtry porównań (BINDING)

| Filtr | Typ | Opis |
|-------|-----|------|
| Show Only Changes | checkbox | Delta ≠ 0 |
| Show Only Improvements | checkbox | Status = IMPROVED |
| Show Only Regressions | checkbox | Status = REGRESSED |
| Show Only Violations | checkbox | Status (A lub B) = VIOLATION |
| Element Type | multi-select | BUS, LINE, TRAFO, SOURCE |

---

## 7. NON-GOALS WARSTWY RESULTS

### 7.1. Definicja Non-Goals

Warstwa RESULTS **NIE JEST ODPOWIEDZIALNA** za:

| Non-Goal | Uzasadnienie | Gdzie należy |
|----------|--------------|--------------|
| **Obliczanie wyników** | RESULTS prezentuje, nie oblicza | Solver Layer (Backend) |
| **Walidacja topologii** | RESULTS nie sprawdza poprawności sieci | Model Validation Layer |
| **Generowanie Proof (logika)** | RESULTS inicjuje, nie generuje | Proof Engine |
| **Rendering SLD** | RESULTS nie rysuje schematu | SLD Layer |
| **Edycja parametrów** | RESULTS wyświetla, nie edytuje | Inspector (Parameters tab) |
| **Zarządzanie Case/Snapshot** | RESULTS nawiguje, nie zarządza | Project Management Layer |
| **Eksport PDF (generowanie)** | RESULTS inicjuje, nie renderuje | Report Engine |

### 7.2. Granice odpowiedzialności RESULTS

```
┌─────────────────────────────────────────────────────────────────────┐
│                      RESULTS LAYER SCOPE                            │
├─────────────────────────────────────────────────────────────────────┤
│ ✅ Prezentacja wyników z Solver Layer                               │
│ ✅ Hierarchiczna nawigacja (Case → Snapshot → Run → Target)         │
│ ✅ Sortowanie, filtrowanie, wyszukiwanie                            │
│ ✅ Porównania (Delta, Status Change)                                │
│ ✅ Decision Support (PASS/FAIL/WARNING)                             │
│ ✅ Synchronizacja selekcji z Inspector i SLD                        │
│ ✅ Inicjacja eksportu (CSV, Excel, PDF)                             │
│ ✅ Inicjacja Proof generation                                       │
├─────────────────────────────────────────────────────────────────────┤
│ ❌ Obliczenia (LF, SC, Protection)                                  │
│ ❌ Modyfikacja wyników                                              │
│ ❌ Rendering SLD                                                    │
│ ❌ Edycja parametrów elementów                                      │
│ ❌ Zarządzanie Case/Snapshot (create, delete)                       │
│ ❌ Generowanie PDF (logika renderingu)                              │
│ ❌ Walidacja zgodności z normami (logika)                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3. Anti-patterns (FORBIDDEN)

| Anti-pattern | Dlaczego FORBIDDEN |
|--------------|-------------------|
| Obliczenia w RESULTS | Narusza separation of concerns |
| Modyfikacja ResultSet | ResultSet jest immutable |
| Hard-coded limity | Limity należą do Norma Engine |
| Bezpośredni dostęp do Solver | RESULTS otrzymuje dane przez kontrakt |
| Ukrywanie wyników z błędami | Narusza NO SIMPLIFICATION |

---

## 8. WYMAGANIA PERFORMANCE

### 8.1. Wymagania wydajnościowe (BINDING)

| Operacja | Maksymalny czas |
|----------|-----------------|
| Otwarcie Results Browser | < 300 ms |
| Renderowanie tabeli (1000 wierszy) | < 200 ms |
| Renderowanie tabeli (10000 wierszy) | < 500 ms |
| Sortowanie tabeli | < 200 ms |
| Filtrowanie tabeli | < 300 ms |
| Obliczenie Delta (1000 elementów) | < 1000 ms |
| Eksport do Excel (10000 wierszy) | < 3000 ms |

### 8.2. Techniki optymalizacji

| Technika | Zastosowanie |
|----------|--------------|
| **Virtual scrolling** | Tabele > 100 wierszy |
| **Lazy loading** | Drzewo > 1000 węzłów |
| **Memoization** | Obliczenia Delta |
| **Web Workers** | Sortowanie dużych zbiorów |
| **Pagination** | Eksport > 10000 wierszy |

---

## 9. INTEGRACJA Z UI CORE

### 9.1. Synchronizacja z Global Context Bar

Warstwa RESULTS **MUST** reagować na zmiany w Context Bar:

| Zmiana w Context Bar | Reakcja RESULTS |
|----------------------|-----------------|
| Zmiana Case | Reload Results Browser dla nowego Case |
| Zmiana Snapshot | Reload wyników dla nowego Snapshot |
| Zmiana Analysis | Filtrowanie po typie analizy |
| Zmiana Expert Mode | Zmiana domyślnych kolumn i rozwinięć |

### 9.2. Synchronizacja z Inspector

| Akcja w RESULTS | Reakcja Inspector |
|-----------------|-------------------|
| Klik w wiersz tabeli | Otwarcie Inspector dla elementu |
| Zmiana selekcji | Aktualizacja Inspector (jeśli otwarty) |
| Klik w kontrybutora | Nawigacja do Inspector kontrybutora |

### 9.3. Synchronizacja z SLD

| Akcja w RESULTS | Reakcja SLD |
|-----------------|-------------|
| Klik w wiersz tabeli | Highlight elementu na SLD |
| Hover nad wierszem | Hover highlight na SLD |
| Comparison overlay | SLD Overlay z Delta |

---

## 10. CHANGELOG

| Wersja | Data | Zmiany |
|--------|------|--------|
| **1.0** | 2026-01-31 | Definicja bazowa |

---

## 11. ZALEŻNOŚCI

| Dokument | Relacja |
|----------|---------|
| `UI_CORE_ARCHITECTURE.md` | NADRZĘDNY — architektura fundamentalna |
| `RESULTS_BROWSER_CONTRACT.md` | PODRZĘDNY — szczegóły Results Browser |
| `ELEMENT_INSPECTOR_CONTRACT.md` | PODRZĘDNY — zakładka Results |
| `CASE_COMPARISON_UI_CONTRACT.md` | PODRZĘDNY — porównania |
| `SC_NODE_RESULTS_CONTRACT.md` | PODRZĘDNY — wyniki SC |
| `GLOBAL_CONTEXT_BAR.md` | ZALEŻNOŚĆ — synchronizacja kontekstu |
| `EXPERT_MODES_CONTRACT.md` | ZALEŻNOŚĆ — tryby eksperckie |

---

**KONIEC DOKUMENTU**
