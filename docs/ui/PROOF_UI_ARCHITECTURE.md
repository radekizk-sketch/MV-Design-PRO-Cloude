# PROOF UI ARCHITECTURE — MV-DESIGN-PRO

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-31
**Typ**: Architecture Document — Warstwa PROOF (White Box)
**Zależność nadrzędna**: UI_CORE_ARCHITECTURE.md
**Dokument równoległy**: RESULTS_UI_ARCHITECTURE.md

---

## 1. CEL I ZAKRES DOKUMENTU

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **architekturę warstwy PROOF** w UI MV-DESIGN-PRO — kompletny framework dla prezentacji **śladu obliczeń (White Box)**, weryfikacji deterministycznej oraz audytowalności wyników.

Dokument stanowi **źródło prawdy** dla:

- struktury UI prezentacji śladu obliczeń,
- mechanizmów nawigacji i eksploracji dowodów,
- integracji PROOF z warstwami RESULTS, SLD i Context Bar,
- wymagań UX dla trybów eksperckich (Analyst, Auditor).

### 1.2. Czym JEST warstwa PROOF

| Aspekt | Definicja |
|--------|-----------|
| **White Box** | Prezentacja pełnego śladu obliczeń — wzór → dane → podstawienie → wynik |
| **Deterministyczność** | Gwarancja, że ten sam input zawsze produkuje ten sam output wizualny |
| **Audytowalność** | Możliwość formalnej weryfikacji każdego kroku obliczeniowego |
| **P11 Compliance** | Dokumentacja zgodności z normami (IEC, PN-EN) w formacie audytowalnym |
| **Expert Support** | Wsparcie dla trybu Analyst i Auditor |

### 1.3. Czym NIE JEST warstwa PROOF

| Aspekt | Wyjaśnienie |
|--------|-------------|
| **NIE jest solverem** | PROOF nie wykonuje obliczeń — prezentuje ślad z Solver Layer |
| **NIE jest walidatorem** | PROOF nie sprawdza poprawności topologii — wizualizuje wyniki sprawdzeń |
| **NIE jest edytorem** | PROOF nie pozwala na modyfikację wyników ani parametrów |
| **NIE jest uproszczeniem** | PROOF pokazuje PEŁNY ślad, nie skróconą wersję |

### 1.4. Zakres obowiązywania

- **BINDING** dla całej warstwy prezentacji śladów obliczeń i dowodów,
- **PODRZĘDNY** wobec `UI_CORE_ARCHITECTURE.md` (architektura nadrzędna),
- **RÓWNOLEGŁY** do `RESULTS_UI_ARCHITECTURE.md` (architektura wyników),
- implementacje UI **MUST** być zgodne z niniejszą architekturą.

### 1.5. Odbiorcy dokumentu

| Rola | Zastosowanie dokumentu |
|------|------------------------|
| Architekci UI | Projektowanie komponentów PROOF |
| Deweloperzy frontend | Implementacja śladu obliczeń |
| Product Ownerzy | Weryfikacja zakresu funkcjonalnego |
| QA (testy E2E) | Scenariusze testowe dla audytowalności |
| Compliance Officers | Weryfikacja zgodności z normami |

---

## 2. ROLA PROOF W ARCHITEKTURZE UI

### 2.1. Miejsce w architekturze warstwowej

```
┌─────────────────────────────────────────────────────────────────────┐
│                           UI CORE                                   │
│  (Context Bar, Navigation, Inspector, SLD — shell aplikacji)        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│   │   RESULTS   │◀──│    PROOF    │──▶│     SLD     │              │
│   │   LAYER     │   │    LAYER    │   │    LAYER    │              │
│   │             │──▶│  (White Box)│   │             │              │
│   └─────────────┘   └─────────────┘   └─────────────┘              │
│         ▲                 ▲                 ▲                       │
│         │                 │                 │                       │
├─────────┴─────────────────┴─────────────────┴───────────────────────┤
│                        SOLVER LAYER                                 │
│      (Load Flow, Short-Circuit, Protection — generuje ślad)         │
├─────────────────────────────────────────────────────────────────────┤
│                        NORMA ENGINE                                 │
│           (IEC 60909, PN-EN 50160, IEEE — limity, kryteria)         │
├─────────────────────────────────────────────────────────────────────┤
│                        MODEL LAYER                                  │
│                   (NetworkModel, Topologia)                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2. Relacja CORE ↔ RESULTS ↔ PROOF

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│    UI CORE      │         │    RESULTS      │         │     PROOF       │
│                 │         │                 │         │   (White Box)   │
│  • Navigation   │◀───────▶│  • Browser      │────────▶│  • ProofGraph   │
│  • Inspector    │         │  • Tables       │         │  • ProofSteps   │
│  • Context Bar  │         │  • Comparisons  │◀────────│  • Audit Trail  │
│  • Expert Mode  │         │  • Decision Sup │         │  • P11 Export   │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                           │                           │
        │                           │                           │
        ▼                           ▼                           ▼
   Shell / Layout            Dane wynikowe            Ślad / Dowód
   (CO wyświetlić)          (CO policzone)          (JAK policzone)
```

### 2.3. Przepływy danych

| Kierunek | Dane | Opis |
|----------|------|------|
| PROOF → CORE | Selekcja ProofStep | Wybrany krok → Inspector, SLD highlight |
| CORE → PROOF | Kontekst | Element + Run + Norma → filtrowanie śladu |
| PROOF → RESULTS | Status P11 | Compliance status → Decision Support |
| RESULTS → PROOF | Żądanie | Inicjacja prezentacji śladu dla elementu |
| SOLVER → PROOF | ProofGraph | Kompletny ślad obliczeń z solvera |
| NORMA → PROOF | Criteria | Limity i kryteria do weryfikacji |

### 2.4. Zasada separacji RESULTS vs PROOF (BINDING)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   RESULTS = "CO" zostało policzone                                  │
│   ────────────────────────────────                                  │
│   • Wartość: Ik" = 12.5 kA                                          │
│   • Status: PASS / FAIL / WARNING                                   │
│   • Porównania: Delta między Case'ami                               │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PROOF = "JAK" zostało policzone                                   │
│   ───────────────────────────────                                   │
│   • Wzór: Ik" = cmax × Un / (√3 × Zk)                               │
│   • Dane: cmax = 1.1, Un = 20 kV, Zk = 1.016 Ω                      │
│   • Podstawienie: Ik" = 1.1 × 20000 / (1.732 × 1.016)               │
│   • Wynik: Ik" = 12508 A = 12.508 kA ≈ 12.5 kA                      │
│   • Jednostki: pełna analiza wymiarowa                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Zasada (BINDING):**
```
PROOF NIGDY NIE UKRYWA KROKÓW POŚREDNICH.
PROOF POKAZUJE PEŁNY ŚLAD OD INPUTU DO OUTPUTU.
```

---

## 3. MODEL DANYCH ŚLADU OBLICZEŃ

### 3.1. ProofStep — pojedynczy krok

**Definicja konceptualna:**

```
ProofStep = {
    step_id:        UUID,              // Unikalny identyfikator kroku
    sequence:       Integer,           // Numer kolejny w śladzie
    step_type:      StepType,          // INPUT | FORMULA | SUBSTITUTION | CALCULATION | OUTPUT

    // Kontekst
    element_id:     String,            // ID elementu (BUS-001, LINE-01, ...)
    parameter:      String,            // Parametr (Ik", ip, Ith, ...)

    // Treść kroku
    formula:        String,            // Wzór (LaTeX lub plain text)
    variables:      Variable[],        // Lista zmiennych z wartościami
    substitution:   String,            // Podstawienie liczbowe
    result:         Number,            // Wynik liczbowy
    unit:           String,            // Jednostka (kA, MW, Ω, ...)

    // Źródła
    source_steps:   UUID[],            // ID kroków źródłowych (dependencies)
    norma_ref:      String,            // Odniesienie do normy (np. "IEC 60909:2016 §4.3.1")

    // Metadane
    timestamp:      DateTime,          // Czas wykonania
    precision:      Integer,           // Liczba miejsc po przecinku
    rounding_rule:  String             // Reguła zaokrąglenia
}
```

### 3.2. StepType — typy kroków

| Typ | Symbol | Opis | Przykład |
|-----|--------|------|----------|
| **INPUT** | 📥 | Dane wejściowe z modelu | Un = 20 kV (z parametrów BUS) |
| **LOOKUP** | 📚 | Wartość z tabeli / normy | cmax = 1.1 (IEC 60909, Tab. 1) |
| **FORMULA** | 📐 | Definicja wzoru | Ik" = cmax × Un / (√3 × Zk) |
| **SUBSTITUTION** | 🔄 | Podstawienie wartości | Ik" = 1.1 × 20000 / (1.732 × 1.016) |
| **CALCULATION** | 🔢 | Obliczenie arytmetyczne | Ik" = 22000 / 1.760 = 12508 |
| **CONVERSION** | ↔️ | Konwersja jednostek | 12508 A → 12.508 kA |
| **OUTPUT** | 📤 | Wynik końcowy | Ik" = 12.5 kA |

### 3.3. ProofGraph — graf śladu

**Definicja konceptualna:**

```
ProofGraph = {
    graph_id:       UUID,              // Unikalny identyfikator grafu
    run_id:         UUID,              // ID uruchomienia solvera
    element_id:     String,            // ID elementu docelowego
    analysis_type:  AnalysisType,      // LF | SC | PROTECTION

    // Struktura
    steps:          ProofStep[],       // Uporządkowana lista kroków
    dependencies:   Edge[],            // Krawędzie zależności (step → step)

    // Agregaty
    input_count:    Integer,           // Liczba danych wejściowych
    formula_count:  Integer,           // Liczba zastosowanych wzorów
    total_steps:    Integer,           // Łączna liczba kroków

    // Wynik końcowy
    final_result:   ProofStep,         // Krok końcowy (OUTPUT)
    compliance:     ComplianceStatus,  // PASS | FAIL | WARNING

    // Metadane
    norma:          String,            // Norma (IEC 60909:2016)
    timestamp:      DateTime,          // Czas generacji
    deterministic:  Boolean            // Zawsze true (gwarancja)
}
```

### 3.4. Struktura zależności (DAG)

```
┌─────────────────────────────────────────────────────────────────────┐
│ PROOF GRAPH — DAG (Directed Acyclic Graph)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [INPUT: Un=20kV]──┐                                               │
│                     │                                               │
│   [INPUT: Zk=1.016Ω]┼──▶[FORMULA: Ik"=...]──▶[SUBST]──▶[OUTPUT]    │
│                     │                                               │
│   [LOOKUP: cmax=1.1]┘                                               │
│                                                                     │
│   Każdy krok wskazuje na swoje źródła (source_steps)                │
│   Graf jest acykliczny — brak cykli zależności                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.5. Variable — zmienna w kroku

```
Variable = {
    name:           String,            // Nazwa zmiennej (Un, Zk, cmax)
    symbol:         String,            // Symbol LaTeX (\(U_n\), \(Z_k\))
    value:          Number,            // Wartość liczbowa
    unit:           String,            // Jednostka
    source:         SourceType,        // MODEL | NORMA | CALCULATED
    source_step_id: UUID | null        // ID kroku źródłowego (jeśli CALCULATED)
}
```

---

## 4. STRUKTURA UI WARSTWY PROOF

### 4.1. Komponenty UI PROOF

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PROOF LAYER UI                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. PROOF PANEL (Inspector zakładka "Proof")                  │   │
│  │    → Ślad obliczeń dla wybranego elementu                    │   │
│  │    → Tryb: Linear View / Graph View                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 2. PROOF EXPLORER (Navigation Panel tryb "Proof Tree")       │   │
│  │    → Hierarchia: Element → Parameter → Steps                 │   │
│  │    → Filtrowanie po typie, statusie, normie                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 3. PROOF DETAIL (Modal / Fullscreen)                         │   │
│  │    → Rozwinięty widok pojedynczego ProofGraph                │   │
│  │    → Tryb audytu z pełnymi odniesieniami do norm             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 4. PROOF OVERLAY (SLD Layer)                                 │   │
│  │    → Wizualizacja ścieżki obliczeniowej na schemacie         │   │
│  │    → Highlight elementów uczestniczących w śladzie           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2. PROOF PANEL — struktura

```
┌─────────────────────────────────────────────────────────────────────┐
│ PROOF PANEL — BUS-GPZ-01                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ELEMENT: BUS-GPZ-01 │ ANALYSIS: Short-Circuit │ NORMA: IEC 60909   │
│  RUN: #3 (2026-01-31 14:32) │ STATUS: ✅ COMPLIANT                  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  [Linear View] [Graph View] [Audit Mode]            [📤 Export PDF] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ PARAMETER: Ik" (Initial short-circuit current)              │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                             │   │
│  │  #  │ Type    │ Content                        │ Value      │   │
│  │ ────┼─────────┼────────────────────────────────┼─────────── │   │
│  │  1  │ 📥 INPUT │ Un (Nominal voltage)          │ 20 kV      │   │
│  │  2  │ 📥 INPUT │ Zk (Short-circuit impedance)  │ 1.016 Ω    │   │
│  │  3  │ 📚 LOOKUP│ cmax (Voltage factor)         │ 1.1        │   │
│  │  4  │ 📐 FORMULA│ Ik" = cmax × Un / (√3 × Zk)  │ —          │   │
│  │  5  │ 🔄 SUBST │ Ik" = 1.1 × 20000 / (1.732 × 1.016)│ —     │   │
│  │  6  │ 🔢 CALC  │ Ik" = 22000 / 1.760           │ 12508 A    │   │
│  │  7  │ ↔️ CONV  │ 12508 A → kA                  │ 12.508 kA  │   │
│  │  8  │ 📤 OUTPUT│ Ik" (rounded)                 │ 12.5 kA    │   │
│  │                                                             │   │
│  │  LIMIT: 25.0 kA (IEC 60909 §4.5) │ MARGIN: 50% │ STATUS: ✅ │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ PARAMETER: ip (Peak short-circuit current)                  │   │
│  │ [Rozwiń ▼]                                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ PARAMETER: Ith (Thermal equivalent current)                 │   │
│  │ [Rozwiń ▼]                                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3. Tryby widoku PROOF PANEL

| Tryb | Opis | Zastosowanie |
|------|------|--------------|
| **Linear View** | Lista kroków w kolejności sekwencyjnej | Szybki przegląd, domyślny |
| **Graph View** | Interaktywny DAG z wizualizacją zależności | Analiza przepływu danych |
| **Audit Mode** | Rozszerzony widok z pełnymi odniesieniami do norm | Audytorzy, compliance |

### 4.4. Graph View — wizualizacja DAG

```
┌─────────────────────────────────────────────────────────────────────┐
│ PROOF GRAPH VIEW — Ik" Calculation                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    ┌──────────┐   ┌──────────┐   ┌──────────┐                      │
│    │ Un=20kV  │   │ Zk=1.016Ω│   │ cmax=1.1 │                      │
│    │  📥 INPUT │   │  📥 INPUT │   │ 📚 LOOKUP│                      │
│    └────┬─────┘   └────┬─────┘   └────┬─────┘                      │
│         │              │              │                             │
│         └──────────────┼──────────────┘                             │
│                        ▼                                            │
│              ┌─────────────────┐                                    │
│              │ 📐 FORMULA       │                                    │
│              │ Ik"=cmax×Un/    │                                    │
│              │ (√3×Zk)         │                                    │
│              └────────┬────────┘                                    │
│                       ▼                                             │
│              ┌─────────────────┐                                    │
│              │ 🔄 SUBSTITUTION  │                                    │
│              │ 1.1×20000/      │                                    │
│              │ (1.732×1.016)   │                                    │
│              └────────┬────────┘                                    │
│                       ▼                                             │
│              ┌─────────────────┐                                    │
│              │ 🔢 CALCULATION   │                                    │
│              │ = 12508 A       │                                    │
│              └────────┬────────┘                                    │
│                       ▼                                             │
│              ┌─────────────────┐                                    │
│              │ 📤 OUTPUT        │                                    │
│              │ Ik" = 12.5 kA   │                                    │
│              │     ✅ PASS      │                                    │
│              └─────────────────┘                                    │
│                                                                     │
│  [Pan] [Zoom] [Fit] [Export SVG]                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.5. PROOF EXPLORER — drzewo nawigacji

```
┌─────────────────────────────────────────────────────────────────────┐
│ PROOF EXPLORER                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [🔍 Search] [⬇️ Filter: All / FAIL / WARNING] [📊 Sort]            │
│                                                                     │
│  📁 Run #3 (2026-01-31 14:32)                                       │
│  ├── 📂 Short-Circuit Analysis (IEC 60909)                          │
│  │   ├── 🔲 BUS-GPZ-01 ✅                                            │
│  │   │   ├── Ik" = 12.5 kA ✅                                        │
│  │   │   ├── ip = 31.8 kA ✅                                         │
│  │   │   └── Ith = 12.7 kA ✅                                        │
│  │   ├── 🔲 BUS-GPZ-02 ⚠️                                            │
│  │   │   ├── Ik" = 19.2 kA ⚠️ (80% limit)                            │
│  │   │   ├── ip = 48.9 kA ⚠️                                         │
│  │   │   └── Ith = 19.5 kA ⚠️                                        │
│  │   └── 🔲 BUS-PT-01 ❌                                              │
│  │       ├── Ik" = 28.5 kA ❌ (> 25 kA limit)                         │
│  │       ├── ip = 72.5 kA ❌                                          │
│  │       └── Ith = 29.0 kA ❌                                         │
│  └── 📂 Load Flow Analysis (PN-EN 50160)                             │
│      └── ...                                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.6. Nawigacja w strukturze PROOF

| Akcja | Źródło | Cel |
|-------|--------|-----|
| Klik w element (Explorer) | PROOF Explorer | Otwarcie PROOF Panel dla elementu |
| Klik w parametr (Explorer) | PROOF Explorer | Rozwinięcie śladu parametru w Panel |
| Klik w krok (Panel) | PROOF Panel | Szczegóły kroku (tooltip / modal) |
| Klik w zależność (Graph) | Graph View | Nawigacja do kroku źródłowego |
| Double-click w element | PROOF Explorer | Otwarcie PROOF Detail (fullscreen) |

---

## 5. WORKFLOW UŻYTKOWNIKA

### 5.1. Scenariusze dostępu do PROOF

| Scenariusz | Punkt wejścia | Workflow |
|------------|---------------|----------|
| **Z Inspector** | Zakładka "Proof" | Element → Inspector → Proof Tab |
| **Z RESULTS** | Klik "Show Proof" | RESULTS Table → kontekstowe menu → Proof |
| **Z Navigation** | Proof Tree mode | Navigation Panel → tryb Proof → Element |
| **Z SLD** | Context menu | SLD → prawy klik → "Show Proof" |

### 5.2. Workflow dla statusu PASS

```
┌─────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: PASS                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. QUICK VERIFICATION                                              │
│     └─ Użytkownik widzi ✅ PASS — kończy weryfikację                │
│                                                                     │
│  2. DETAILED REVIEW (opcjonalnie)                                   │
│     ├─ Rozwinięcie śladu dla potwierdzenia                          │
│     ├─ Weryfikacja wartości wejściowych                             │
│     └─ Sprawdzenie marginesu do limitu                              │
│                                                                     │
│  3. EXPORT (dla dokumentacji)                                       │
│     └─ Generowanie PDF P11 dla archiwum projektu                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3. Workflow dla statusu FAIL

```
┌─────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: FAIL                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. IDENTYFIKACJA PROBLEMU                                          │
│     ├─ Element: BUS-PT-01                                           │
│     ├─ Parametr: Ik" = 28.5 kA                                      │
│     ├─ Limit: 25.0 kA (IEC 60909)                                   │
│     └─ Przekroczenie: +14%                                          │
│                                                                     │
│  2. ANALIZA ŚLADU                                                   │
│     ├─ Przegląd danych wejściowych (skąd wysokie Ik"?)              │
│     ├─ Identyfikacja kontrybutorów (które źródła?)                  │
│     └─ Nawigacja do elementów źródłowych                            │
│                                                                     │
│  3. AKCJE DOSTĘPNE                                                  │
│     ├─ [📊 Pokaż Contributions] → kto kontrybuuje do Ik"            │
│     ├─ [🗺️ Pokaż na SLD] → lokalizacja + ścieżka zwarcia           │
│     ├─ [📋 Generuj Proof P11] → formalny raport niezgodności        │
│     └─ [↩️ Wróć do RESULTS] → kontekst porównawczy                  │
│                                                                     │
│  4. DECYZJA PROJEKTOWA                                              │
│     ├─ Zwiększenie impedancji (np. reaktor)                         │
│     ├─ Zmiana konfiguracji sieci                                    │
│     └─ Upgrade aparatury (wyższe Ik_rated)                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.4. Workflow dla statusu WARNING

```
┌─────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: WARNING                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. IDENTYFIKACJA MARGINESU                                         │
│     ├─ Element: BUS-GPZ-02                                          │
│     ├─ Parametr: Ik" = 19.2 kA                                      │
│     ├─ Limit: 25.0 kA                                               │
│     ├─ Wykorzystanie: 76.8%                                         │
│     └─ Margines: 23.2% (< 20% = WARNING threshold)                  │
│                                                                     │
│  2. OCENA RYZYKA                                                    │
│     ├─ Czy margines jest wystarczający dla przyszłych rozbudów?     │
│     ├─ Jaki jest trend (porównanie z poprzednimi Case)?             │
│     └─ Jakie są scenariusze worst-case?                             │
│                                                                     │
│  3. AKCJE DOSTĘPNE                                                  │
│     ├─ [⚖️ Porównaj Case] → trend zmian Ik" między wariantami       │
│     ├─ [📊 Sensitivity] → analiza wrażliwości na zmiany             │
│     └─ [📋 Generuj raport] → dokumentacja dla decyzji               │
│                                                                     │
│  4. DECYZJA                                                         │
│     ├─ Akceptacja (dokumentowana)                                   │
│     └─ Działanie prewencyjne                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.5. Akcje kontekstowe (BINDING)

| Status | Akcje MUST | Akcje SHOULD |
|--------|------------|--------------|
| **PASS** | Pokaż ślad, Eksport PDF | — |
| **WARNING** | Pokaż ślad, Pokaż margines, Eksport PDF | Porównaj Case, Sensitivity |
| **FAIL** | Pokaż ślad, Pokaż kontrybutorów, Pokaż na SLD, Eksport PDF | Sugestie naprawy |

---

## 6. INTEGRACJA Z INNYMI WARSTWAMI

### 6.1. Integracja z Context Bar

Warstwa PROOF **MUST** reagować na zmiany w Global Context Bar:

| Zmiana w Context Bar | Reakcja PROOF |
|----------------------|---------------|
| Zmiana Run | Reload PROOF dla nowego Run (inne wyniki) |
| Zmiana Norma | Przeładowanie limitów i kryteriów |
| Zmiana Expert Mode | Zmiana poziomu szczegółowości widoku |
| Zmiana Element (selekcja) | Otwarcie PROOF dla nowego elementu |

**Context Bar w trybie PROOF (BINDING):**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Project │ Case │ Snapshot │ Run │ Analysis: Proof │ Norma │ Auditor │
│   📁    │  📂  │    📸    │  ▶️  │      📝         │ IEC   │   👁️    │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2. Integracja z RESULTS

| Kierunek | Dane | Opis |
|----------|------|------|
| RESULTS → PROOF | Żądanie Proof | Klik "Show Proof" w tabeli wyników |
| PROOF → RESULTS | Compliance Status | Status P11 widoczny w kolumnie Status |
| RESULTS → PROOF | Element context | Przekazanie element_id, run_id do PROOF |
| PROOF → RESULTS | Navigation back | Przycisk "Wróć do RESULTS" |

**Przejście RESULTS → PROOF:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ RESULTS TABLE                                                       │
├─────────────────────────────────────────────────────────────────────┤
│ ID       │ Name    │ Ik" [kA] │ Limit │ Status │ Actions           │
│ BUS-PT-01│ PT-01   │ 28.5     │ 25.0  │ ❌ FAIL │ [📝 Proof] [🗺️]   │
│                                                    ▲                │
│                                                    │                │
│                                           Klik otwiera PROOF Panel  │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3. Integracja z SLD

| Akcja PROOF | Reakcja SLD |
|-------------|-------------|
| Wybrany element w PROOF | Highlight elementu na SLD |
| Wybrany krok INPUT (element) | Highlight źródłowego elementu |
| Tryb "Proof Overlay" | Wizualizacja ścieżki zwarcia na SLD |
| Nawigacja do kontrybutora | Zoom + highlight kontrybutora |

**PROOF Overlay na SLD:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ SLD VIEW — PROOF OVERLAY ACTIVE                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│     ┌─────┐                                                         │
│     │ G1  │ ◄─── Źródło mocy zwarciowej (contributor)              │
│     └──┬──┘      Ik_contrib = 8.2 kA                                │
│        │                                                            │
│     ═══╪═══ ◄─── Szyna 110 kV                                       │
│        │                                                            │
│     ┌──┴──┐                                                         │
│     │ T1  │ ◄─── Transformator (impedancja w śladzie)              │
│     └──┬──┘      Zk_T1 = 0.45 Ω                                     │
│        │                                                            │
│     ═══╪═══ ◄─── Szyna 20 kV (FAULT LOCATION)                       │
│        │         ❌ Ik" = 28.5 kA > 25.0 kA limit                    │
│     ┌──┴──┐                                                         │
│     │ PT1 │ ◄─── Element z FAIL                                     │
│     └─────┘      [BUS-PT-01]                                        │
│                                                                     │
│  [Wyłącz Overlay] [Zoom to Fault] [Show All Contributors]           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.4. Kontrakt integracyjny CORE ↔ PROOF

**Kierunek: PROOF → CORE**

| Element | Typ | Opis |
|---------|-----|------|
| `ProofPanel.onStepSelect(step_id)` | Event | Wybrany krok w panelu |
| `ProofPanel.onElementNavigate(element_id)` | Event | Nawigacja do elementu źródłowego |
| `ProofPanel.onExportRequest(format)` | Event | Żądanie eksportu (PDF, JSON) |
| `ProofOverlay.onPathHighlight(path[])` | Event | Ścieżka do wizualizacji na SLD |

**Kierunek: CORE → PROOF**

| Element | Typ | Opis |
|---------|-----|------|
| `ProofPanel.loadProof(element_id, run_id)` | Command | Załaduj Proof dla elementu |
| `ProofPanel.setViewMode(mode)` | Command | Linear / Graph / Audit |
| `ProofPanel.expandParameter(param)` | Command | Rozwiń konkretny parametr |
| `ProofPanel.setExpertMode(mode)` | Command | Analyst / Auditor |

---

## 7. WYMAGANIA UX

### 7.1. Zasada jawności śladu (BINDING)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ZASADA: PEŁNY ŚLAD = BRAK UKRYTYCH KROKÓW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ✅ WYMAGANE:                                                       │
│     • Każdy krok obliczeniowy jest widoczny                         │
│     • Każda wartość ma jawne źródło (INPUT/LOOKUP/CALCULATED)       │
│     • Każdy wzór jest w pełni rozpisany                             │
│     • Każde zaokrąglenie jest udokumentowane                        │
│     • Każde odniesienie do normy jest jawne                         │
│                                                                     │
│  ❌ ZABRONIONE:                                                     │
│     • Ukrywanie kroków "dla uproszczenia"                           │
│     • Pomijanie pośrednich obliczeń                                 │
│     • Prezentacja tylko wyniku końcowego                            │
│     • Brak źródła dla wartości wejściowych                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2. Czytelność matematyczna

| Wymaganie | Typ | Opis |
|-----------|-----|------|
| Wzory w notacji matematycznej | MUST | LaTeX rendering lub unicode math |
| Wyrównanie wartości | MUST | Decimals wyrównane do przecinka |
| Jednostki przy każdej wartości | MUST | Jawne jednostki (kV, kA, Ω, ...) |
| Kolorowanie statusu | MUST | PASS=zielony, FAIL=czerwony, WARNING=żółty |
| Formatowanie dużych liczb | SHOULD | Separatory tysięcy (12 508 A) |

### 7.3. Nawigacja w śladzie

| Wymaganie | Typ | Opis |
|-----------|-----|------|
| Klik w wartość → źródło | MUST | Nawigacja do kroku, który obliczył wartość |
| Klik w zmienną → definicja | MUST | Tooltip z pełną definicją zmiennej |
| Expand/Collapse parametrów | MUST | Możliwość zwijania sekcji |
| Breadcrumb nawigacji | SHOULD | Ścieżka: Element → Parameter → Step |
| Keyboard navigation | MUST | Arrow keys, Enter, Escape |

### 7.4. Odniesienia do norm

| Wymaganie | Typ | Opis |
|-----------|-----|------|
| Jawne odniesienie do sekcji normy | MUST | "IEC 60909:2016 §4.3.1" |
| Tooltip z treścią kryterium | SHOULD | Pełny tekst wymagania normy |
| Link do dokumentacji normy | MAY | Zewnętrzny link (jeśli dostępny) |
| Wersja normy | MUST | Rok wydania normy |

### 7.5. Tryby eksperckie

| Expert Mode | Domyślna szczegółowość | Fokus |
|-------------|------------------------|-------|
| **Operator** | Collapsed (tylko OUTPUT) | Szybki status PASS/FAIL |
| **Designer** | Expanded inputs + formula | Weryfikacja parametrów projektowych |
| **Analyst** | Full expansion | Analiza pełnego śladu |
| **Auditor** | Full + norma references | Pełny audit z odniesieniami |

**Uwaga**: Żaden tryb NIE UKRYWA danych — różnica polega tylko na domyślnym rozwinięciu.

---

## 8. PERFORMANCE I DETERMINISM

### 8.1. Wymagania wydajnościowe (BINDING)

| Operacja | Maksymalny czas |
|----------|-----------------|
| Otwarcie PROOF Panel | < 200 ms |
| Renderowanie śladu (100 kroków) | < 300 ms |
| Renderowanie śladu (1000 kroków) | < 800 ms |
| Przełączenie Linear ↔ Graph View | < 200 ms |
| Generowanie Graph Layout (100 węzłów) | < 500 ms |
| Eksport PDF (1 element) | < 2000 ms |
| Eksport PDF (50 elementów) | < 10000 ms |

### 8.2. Techniki optymalizacji

| Technika | Zastosowanie |
|----------|--------------|
| **Lazy rendering** | Kroki poniżej viewport nie są renderowane |
| **Virtual scrolling** | Dla śladów > 100 kroków |
| **Memoization** | Cache dla Graph Layout |
| **Progressive rendering** | Najpierw OUTPUT, potem reszta |
| **Web Workers** | Layout computation dla Graph View |

### 8.3. Deterministyczność (BINDING)

```
┌─────────────────────────────────────────────────────────────────────┐
│ GWARANCJA DETERMINISTYCZNOŚCI                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Dla identycznego:                                                  │
│     • element_id                                                    │
│     • run_id                                                        │
│     • norma                                                         │
│                                                                     │
│  PROOF Layer ZAWSZE generuje identyczny:                            │
│     • ProofGraph (struktura)                                        │
│     • Kolejność kroków                                              │
│     • Wartości liczbowe                                             │
│     • Statusy compliance                                            │
│                                                                     │
│  BRAK elementów losowych, zależnych od czasu lub stanu UI.          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.4. Wymagania dla eksportu PDF

| Wymaganie | Typ | Opis |
|-----------|-----|------|
| Identyczny output | MUST | PDF zawsze identyczny dla tych samych danych |
| Nagłówek z kontekstem | MUST | Project, Case, Run, Norma, timestamp |
| Numeracja kroków | MUST | Spójna numeracja w całym dokumencie |
| Podpis cyfrowy | SHOULD | Opcjonalny podpis dla audytu |
| Wersja dokumentu | MUST | Numer wersji PROOF Engine |

---

## 9. NON-GOALS WARSTWY PROOF

### 9.1. Definicja Non-Goals

Warstwa PROOF UI **NIE JEST ODPOWIEDZIALNA** za:

| Non-Goal | Uzasadnienie | Gdzie należy |
|----------|--------------|--------------|
| **Wykonywanie obliczeń** | PROOF prezentuje, nie oblicza | Solver Layer |
| **Walidacja topologii** | PROOF nie sprawdza poprawności sieci | Model Validation |
| **Generowanie śladu (logika)** | PROOF wyświetla gotowy ślad | Solver Layer |
| **Definiowanie limitów** | PROOF używa limitów z Norma Engine | Norma Engine |
| **Edycja parametrów** | PROOF jest read-only | Inspector (Parameters) |
| **Modyfikacja wyników** | PROOF wyświetla immutable data | — (niemożliwe) |
| **Rendering SLD** | PROOF inicjuje overlay, nie rysuje | SLD Layer |
| **Porównania Case** | PROOF dla pojedynczego Run | RESULTS (Comparison) |

### 9.2. Granice odpowiedzialności PROOF UI

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PROOF UI LAYER SCOPE                           │
├─────────────────────────────────────────────────────────────────────┤
│ ✅ Prezentacja śladu obliczeń z Solver Layer                        │
│ ✅ Wizualizacja ProofGraph (Linear / Graph View)                    │
│ ✅ Nawigacja między krokami i elementami                            │
│ ✅ Prezentacja statusów compliance (PASS/FAIL/WARNING)              │
│ ✅ Odniesienia do norm (sekcje, paragrafy)                          │
│ ✅ Synchronizacja z Inspector, SLD, Context Bar                     │
│ ✅ Inicjacja eksportu PDF (P11)                                     │
│ ✅ Obsługa trybów eksperckich (Analyst, Auditor)                    │
├─────────────────────────────────────────────────────────────────────┤
│ ❌ Obliczenia (LF, SC, Protection)                                  │
│ ❌ Generowanie śladu (to robi Solver)                               │
│ ❌ Definiowanie kryteriów norm                                      │
│ ❌ Modyfikacja wartości                                             │
│ ❌ Rendering SLD (tylko overlay commands)                           │
│ ❌ Zarządzanie Run/Case/Snapshot                                    │
│ ❌ Generowanie PDF (logika renderingu — Report Engine)              │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.3. Anti-patterns (FORBIDDEN)

| Anti-pattern | Dlaczego FORBIDDEN |
|--------------|-------------------|
| Obliczenia w PROOF UI | PROOF prezentuje gotowy ślad, nie oblicza |
| Ukrywanie kroków "dla uproszczenia" | Narusza jawność śladu |
| Hard-coded limity normatywne | Limity należą do Norma Engine |
| Modyfikacja ProofGraph | ProofGraph jest immutable |
| Niedeterministyczny rendering | Narusza gwarancję deterministyczności |
| Pomijanie jednostek | Jednostki są integralną częścią śladu |

---

## 10. ZALEŻNOŚCI DOKUMENTÓW

### 10.1. Macierz zależności

| Dokument | Relacja | Opis |
|----------|---------|------|
| `UI_CORE_ARCHITECTURE.md` | **NADRZĘDNY** | Architektura fundamentalna UI |
| `RESULTS_UI_ARCHITECTURE.md` | **RÓWNOLEGŁY** | Architektura wyników (integracja) |
| `ELEMENT_INSPECTOR_CONTRACT.md` | ZALEŻNOŚĆ | Zakładka Proof w Inspector |
| `GLOBAL_CONTEXT_BAR.md` | ZALEŻNOŚĆ | Synchronizacja kontekstu |
| `EXPERT_MODES_CONTRACT.md` | ZALEŻNOŚĆ | Tryby eksperckie (Analyst, Auditor) |
| `SLD_RENDER_LAYERS_CONTRACT.md` | ZALEŻNOŚĆ | PROOF Overlay na SLD |
| `SC_NODE_RESULTS_CONTRACT.md` | ZALEŻNOŚĆ | Wyniki SC (źródło danych) |

### 10.2. Hierarchia dokumentów

```
UI_CORE_ARCHITECTURE.md (NADRZĘDNY)
         │
         ├─── RESULTS_UI_ARCHITECTURE.md (RÓWNOLEGŁY)
         │         │
         │         └─── integracja: Decision Support, Navigation
         │
         └─── PROOF_UI_ARCHITECTURE.md (TEN DOKUMENT)
                   │
                   ├─── ELEMENT_INSPECTOR_CONTRACT.md (zakładka Proof)
                   ├─── GLOBAL_CONTEXT_BAR.md (synchronizacja)
                   ├─── EXPERT_MODES_CONTRACT.md (Analyst, Auditor)
                   └─── SLD_RENDER_LAYERS_CONTRACT.md (overlay)
```

### 10.3. Kontrakty powiązane (do utworzenia)

| Kontrakt | Status | Zakres |
|----------|--------|--------|
| `PROOF_PANEL_CONTRACT.md` | FUTURE | Szczegóły implementacji panelu Proof |
| `PROOF_GRAPH_RENDER_CONTRACT.md` | FUTURE | Specyfikacja renderingu Graph View |
| `P11_EXPORT_CONTRACT.md` | FUTURE | Format i struktura eksportu PDF |

---

## 11. CHANGELOG

| Wersja | Data | Zmiany |
|--------|------|--------|
| **1.0** | 2026-01-31 | Definicja bazowa |

---

**KONIEC DOKUMENTU**
