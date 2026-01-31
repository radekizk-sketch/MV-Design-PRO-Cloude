# SLD UI ARCHITECTURE — MV-DESIGN-PRO

**Status**: BINDING
**Wersja**: 1.1
**Data**: 2026-01-31
**Typ**: Architecture Document — Warstwa SLD (Single Line Diagram)
**Zależność nadrzędna**: UI_CORE_ARCHITECTURE.md
**Dokumenty równoległe**: RESULTS_UI_ARCHITECTURE.md, PROOF_UI_ARCHITECTURE.md

---

## 1. CEL I ZAKRES DOKUMENTU

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **architekturę warstwy SLD** w UI MV-DESIGN-PRO — kompletny framework dla wizualizacji topologicznej sieci elektroenergetycznej, prezentacji wyników obliczeń oraz nawigacji do szczegółowych analiz.

Dokument stanowi **źródło prawdy** dla:

- struktury UI schematu jednokreskowego,
- modelu obiektów wizualnych SLD,
- trybów pracy i warstw renderowania,
- integracji z warstwami RESULTS, PROOF i UI CORE,
- mechanizmów nawigacji i synchronizacji selekcji.

### 1.2. Czym JEST warstwa SLD

| Aspekt | Definicja |
|--------|-----------|
| **Widok topologiczny** | Prezentacja struktury sieci w formie schematu jednokreskowego zgodnego z IEC 61082 |
| **Widok wynikowy** | Nakładka (overlay) z wynikami obliczeń: napięcia, prądy, statusy |
| **Punkt wejścia** | Główny interfejs dostępu do: Przeglądu wyników, Inspektora elementu, Śladu obliczeń |
| **Wielowarstwowość** | System warstw semantycznych z kontrolą widoczności |
| **Wielotrybowość** | Różne tryby pracy dostosowane do roli użytkownika |

### 1.3. Czym NIE JEST warstwa SLD

| Aspekt | Wyjaśnienie |
|--------|-------------|
| **NIE jest edytorem CAD** | SLD nie umożliwia tworzenia ani modyfikacji geometrii schematów |
| **NIE jest solverem** | SLD prezentuje wyniki, nie wykonuje obliczeń |
| **NIE jest edytorem parametrów** | Modyfikacja parametrów odbywa się w Inspektorze elementu |
| **NIE jest systemem SCADA** | SLD nie komunikuje się z urządzeniami runtime |

### 1.4. Zakres obowiązywania

- **BINDING** dla całej warstwy prezentacji schematu jednokreskowego,
- **PODRZĘDNY** wobec `UI_CORE_ARCHITECTURE.md` (architektura nadrzędna),
- **RÓWNOLEGŁY** do `RESULTS_UI_ARCHITECTURE.md` i `PROOF_UI_ARCHITECTURE.md`,
- implementacje UI **MUST** być zgodne z niniejszą architekturą.

### 1.5. Odbiorcy dokumentu

| Rola | Zastosowanie dokumentu |
|------|------------------------|
| Architekci UI | Projektowanie komponentów SLD |
| Deweloperzy frontend | Implementacja warstw i trybów |
| Product Ownerzy | Weryfikacja zakresu funkcjonalnego |
| QA (testy E2E) | Scenariusze testowe dla interakcji |

---

## 2. ROLA SLD W ARCHITEKTURZE UI

### 2.1. Miejsce w architekturze warstwowej

```
┌─────────────────────────────────────────────────────────────────────┐
│                           UI CORE                                   │
│  (Context Bar, Navigation, Inspector, SLD — shell aplikacji)        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│   │   RESULTS   │◀──│     SLD     │──▶│    PROOF    │              │
│   │   LAYER     │   │    LAYER    │   │    LAYER    │              │
│   │             │──▶│ (Schemat)   │◀──│             │              │
│   └─────────────┘   └─────────────┘   └─────────────┘              │
│         ▲                 ▲                 ▲                       │
│         │                 │                 │                       │
├─────────┴─────────────────┴─────────────────┴───────────────────────┤
│                        SOLVER LAYER                                 │
│           (Load Flow, Short-Circuit, Protection)                    │
├─────────────────────────────────────────────────────────────────────┤
│                        MODEL LAYER                                  │
│                   (NetworkModel, Topologia)                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2. Relacja CORE ↔ RESULTS ↔ PROOF ↔ SLD

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│    UI CORE      │         │      SLD        │         │    RESULTS      │
│                 │         │   (Schemat)     │         │                 │
│  • Navigation   │◀───────▶│  • Topologia    │────────▶│  • Browser      │
│  • Inspector    │         │  • Overlay      │         │  • Tables       │
│  • Context Bar  │         │  • Warstwy      │◀────────│  • Comparisons  │
│                 │         │  • Tryby        │         │                 │
└─────────────────┘         └────────┬────────┘         └─────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │     PROOF       │
                            │                 │
                            │  • Ślad obliczeń│
                            │  • Audyt        │
                            └─────────────────┘
```

### 2.3. SLD jako główny punkt wejścia

SLD pełni funkcję **centralnego punktu nawigacji** w architekturze UI:

| Akcja na SLD | Cel nawigacji | Mechanizm |
|--------------|---------------|-----------|
| Klik w element | Inspektor elementu | Otwarcie panelu bocznego z detalami |
| Prawy klik → „Przegląd wyników" | Warstwa RESULTS | Filtrowanie wyników do kontekstu elementu |
| Prawy klik → „Ślad obliczeń" | Warstwa PROOF | Otwarcie śladu dla wybranego elementu |
| Hover nad elementem | Tooltip z kluczowymi wartościami | Szybki podgląd bez nawigacji |

### 2.4. Przepływy danych

| Kierunek | Dane | Opis |
|----------|------|------|
| MODEL → SLD | Topologia | Struktura sieci do wizualizacji |
| SOLVER → SLD | Wyniki | Wartości do nakładki (overlay) |
| SLD → CORE | Selekcja | Wybrany element → Inspector, Navigation |
| CORE → SLD | Kontekst | Case, Snapshot, Run → filtrowanie overlay |
| SLD → RESULTS | Nawigacja | Element → kontekstowe wyniki |
| SLD → PROOF | Nawigacja | Element → ślad obliczeń |

---

## 3. MODEL OBIEKTÓW SLD

### 3.1. Obiekty topologiczne (UI-side)

SLD operuje na **modelu obiektów wizualnych**, który jest projekcją modelu sieciowego:

| Obiekt UI | Odpowiednik MODEL | Symbol | Opis |
|-----------|-------------------|--------|------|
| **Węzeł (Node)** | Bus | Prostokąt / szyna | Punkt przyłączenia elementów |
| **Gałąź (Branch)** | Line | Linia ciągła | Połączenie między węzłami |
| **Łącznik (Switch)** | Switch, Breaker, Disconnector | Symbol IEC | Element przełączający |
| **Transformator** | Transformer | Symbol IEC (dwa okręgi) | Przemiana napięcia |
| **Źródło (Source)** | Generator, Grid, PV | Symbol IEC | Źródło mocy |
| **Punkt wspólnego przyłączenia (PCC)** | PCC | Oznaczenie granicy | Granica systemu |
| **Obciążenie (Load)** | Load | Strzałka w dół | Odbiór mocy |

### 3.2. Atrybuty wizualne obiektów

Każdy obiekt SLD **MUST** posiadać następujące atrybuty wizualne:

```
SLDObject = {
    id:             String,         // Unikalny identyfikator
    type:           ObjectType,     // NODE, BRANCH, SWITCH, TRANSFORMER, SOURCE, PCC, LOAD

    // Geometria
    position:       Point,          // Pozycja (x, y) na canvas
    bounds:         Rectangle,      // Prostokąt ograniczający (dla hit-testing)

    // Powiązanie z modelem
    model_id:       String,         // ID obiektu w NetworkModel
    model_type:     ModelType,      // BUS, LINE, TRAFO, ...

    // Stan wizualny
    visible:        Boolean,        // Widoczność
    selected:       Boolean,        // Zaznaczenie
    highlighted:    Boolean,        // Podświetlenie (np. hover, search result)

    // Dane do nakładki (overlay)
    overlay_data:   OverlayData,    // Wartości wynikowe, statusy

    // Etykiety
    labels:         Label[],        // Lista etykiet (ID, napięcie, prąd, ...)
}
```

### 3.3. OverlayData — dane nakładki wynikowej

```
OverlayData = {
    // Wartości liczbowe
    values: {
        voltage_kV:     Number | null,  // Napięcie [kV]
        voltage_pu:     Number | null,  // Napięcie [pu]
        current_A:      Number | null,  // Prąd [A]
        current_pct:    Number | null,  // Prąd [% In]
        power_MW:       Number | null,  // Moc czynna [MW]
        power_MVAr:     Number | null,  // Moc bierna [MVAr]
        losses_kW:      Number | null,  // Straty [kW]
    },

    // Status decyzyjny
    status:         DecisionStatus,     // PASS, WARNING, FAIL, INFO, UNKNOWN

    // Źródło danych
    run_id:         UUID,               // ID uruchomienia solvera
    analysis_type:  AnalysisType,       // LF, SC

    // Nawigacja
    has_results:    Boolean,            // Czy są dostępne szczegółowe wyniki
    has_proof:      Boolean,            // Czy jest dostępny ślad obliczeń
}
```

### 3.4. Hierarchia obiektów

```
┌─────────────────────────────────────────────────────────────────────┐
│ SLD OBJECT HIERARCHY                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SLDCanvas                                                          │
│  └── SLDLayer[]                                                     │
│       ├── TopologyLayer (static)                                    │
│       │    └── SLDObject[]                                          │
│       │         ├── Node (Bus)                                      │
│       │         ├── Branch (Line)                                   │
│       │         ├── Switch (Breaker, Disconnector)                  │
│       │         ├── Transformer                                     │
│       │         ├── Source (Generator, Grid)                        │
│       │         ├── PCC                                             │
│       │         └── Load                                            │
│       ├── OverlayLayer (dynamic)                                    │
│       │    └── OverlayMarker[]                                      │
│       │         ├── VoltageMarker                                   │
│       │         ├── CurrentMarker                                   │
│       │         ├── StatusMarker                                    │
│       │         └── NavigationMarker                                │
│       └── InteractionLayer (ephemeral)                              │
│            └── SelectionHighlight, HoverHighlight, SearchHighlight  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. STRUKTURA UI SLD

### 4.1. Komponenty UI SLD

```
┌─────────────────────────────────────────────────────────────────────┐
│                          SLD VIEW                                   │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ TOOLBAR                                                         │ │
│ │ [Tryb] [Warstwy] [Zoom] [Dopasuj] [Eksport] [Szukaj]           │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┬───────────────────────┐ │
│ │                                         │                       │ │
│ │                                         │  LEGEND               │ │
│ │           MAIN CANVAS                   │  (Legenda)            │ │
│ │                                         │                       │ │
│ │       (Schemat jednokreskowy)           │  • Kolory statusów    │ │
│ │                                         │  • Napięcia           │ │
│ │                                         │  • Symbole            │ │
│ │                                         │                       │ │
│ │                                         ├───────────────────────┤ │
│ │                                         │                       │ │
│ │                                         │  MINIMAP              │ │
│ │                                         │  (Mapa podglądu)      │ │
│ │                                         │                       │ │
│ │                                         │                       │ │
│ └─────────────────────────────────────────┴───────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ STATUS BAR                                                      │ │
│ │ Elementy: 127 │ Zaznaczenie: BUS-GPZ-01 │ Tryb: Analityczny    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2. Toolbar — pasek narzędzi

Toolbar **MUST** zawierać następujące kontrolki:

| Kontrolka | Funkcja | Typ | Wymaganie |
|-----------|---------|-----|-----------|
| **Tryb** | Przełączanie trybu pracy (Projektowy / Analityczny / Operacyjny / Audytowy) | Dropdown | MUST |
| **Warstwy** | Panel kontroli widoczności warstw | Dropdown/Panel | MUST |
| **Zoom** | Kontrola powiększenia (+, -, slider) | Przyciski + slider | MUST |
| **Dopasuj** | Dopasuj widok do całości / zaznaczenia | Przycisk | MUST |
| **Eksport** | Eksport do PDF/SVG/PNG | Dropdown | MUST |
| **Szukaj** | Wyszukiwanie elementu po ID/nazwie | Input + autocomplete | MUST |

### 4.3. Main Canvas — główny obszar schematu

Main Canvas to centralny obszar renderowania schematu jednokreskowego.

**Wymagania funkcjonalne (BINDING):**

| Funkcja | Typ | Opis |
|---------|-----|------|
| Pan (przesuwanie) | MUST | Przeciąganie myszą / touch / klawisze strzałek |
| Zoom (powiększenie) | MUST | Scroll / pinch / przyciski +/- |
| Selekcja elementu | MUST | Klik → zaznaczenie, Ctrl+Klik → multi-select |
| Hover highlight | MUST | Podświetlenie przy najechaniu myszą |
| Context menu | MUST | Prawy klik → menu kontekstowe |
| Double-click | SHOULD | Szybkie przejście do Inspektora |

### 4.4. Legend — legenda

Legenda **MUST** być widoczna w trybach z aktywnymi nakładkami (overlay):

| Element legendy | Typ | Wymaganie |
|-----------------|-----|-----------|
| Kolory statusów (PASS/WARNING/FAIL) | Skala kolorów | MUST |
| Skala napięć (jeśli warstwa aktywna) | Gradient kolorów | MUST |
| Skala prądów (jeśli warstwa aktywna) | Gradient kolorów | MUST |
| Symbole stanów łączników | Ikony | MUST |
| Timestamp wyników | Tekst | MUST |

### 4.5. Minimap — mapa podglądu

Minimap to zminiaturyzowany widok całej sieci z zaznaczeniem aktualnego viewport:

| Funkcja | Typ | Opis |
|---------|-----|------|
| Widok całości | MUST | Miniatura całego schematu |
| Viewport indicator | MUST | Prostokąt pokazujący aktualny widok |
| Nawigacja przez klik | MUST | Klik w minimapę → przesunięcie widoku |
| Przeciąganie viewport | SHOULD | Drag viewport indicator → przesuwanie |
| Ukrywalność | MUST | Możliwość ukrycia/pokazania minimapy |

---

## 5. TRYBY SLD (BINDING)

### 5.0. Zasady fundamentalne trybów (BINDING)

**Snapshot jako źródło prawdy:**

SLD **ZAWSZE** operuje na aktywnym Snapshot wybranym w Context Bar. Wszystkie dane topologiczne i wynikowe prezentowane na schemacie pochodzą wyłącznie z tego Snapshot.

**Niemutowalność danych wejściowych:**

- SLD **MUST NOT** modyfikować danych Snapshot — jest warstwą tylko do odczytu
- Preview zmian (np. symulacja przełączeń w trybie Operacyjnym) **NIE JEST** zapisem — to jedynie wizualizacja hipotetyczna
- Każda trwała zmiana (np. nowy stan łącznika) **MUST** być zapisana jako nowy Snapshot przez dedykowany mechanizm (Switching Scenario Manager)
- SLD **MUST** wyświetlać wyraźny komunikat rozróżniający tryb preview od stanu zapisanego

**Zasada (BINDING):**

```
PREVIEW ≠ ZAPIS
Wizualizacja hipotetyczna NIE modyfikuje danych.
Zapis wymaga jawnej akcji użytkownika i tworzy nowy Snapshot.
```

### 5.1. Tryb Projektowy

**Cel**: Praca z topologią sieci podczas fazy projektowania.

| Aspekt | Wartość |
|--------|---------|
| **Nazwa UI** | „Projektowy" |
| **Główny fokus** | Struktura sieci, parametry katalogowe |
| **Domyślne warstwy** | Topologia, Etykiety parametrów |
| **Nakładka wyników** | Wyłączona domyślnie |
| **Interakcje dozwolone** | Selekcja, nawigacja, podgląd parametrów |
| **Interakcje zabronione** | Edycja geometrii (to nie jest edytor CAD) |

**Domyślna konfiguracja warstw:**

| Warstwa | Stan |
|---------|------|
| Topologia i stany łączników | WIDOCZNA |
| Napięcia | UKRYTA |
| Prądy | UKRYTA |
| Limity / przekroczenia | UKRYTA |
| Statusy decyzyjne | UKRYTA |
| Znaczniki nawigacyjne | UKRYTA |

### 5.2. Tryb Analityczny

**Cel**: Analiza wyników obliczeń (rozpływy mocy, zwarcia).

| Aspekt | Wartość |
|--------|---------|
| **Nazwa UI** | „Analityczny" |
| **Główny fokus** | Wyniki obliczeń, statusy, przekroczenia |
| **Domyślne warstwy** | Topologia, Napięcia, Prądy, Statusy |
| **Nakładka wyników** | Włączona |
| **Interakcje dozwolone** | Selekcja, nawigacja do RESULTS, nawigacja do PROOF |
| **Interakcje zabronione** | Modyfikacja wyników |

**Domyślna konfiguracja warstw:**

| Warstwa | Stan |
|---------|------|
| Topologia i stany łączników | WIDOCZNA |
| Napięcia | WIDOCZNA |
| Prądy | WIDOCZNA |
| Limity / przekroczenia | WIDOCZNA |
| Statusy decyzyjne | WIDOCZNA |
| Znaczniki nawigacyjne | WIDOCZNA |

### 5.3. Tryb Operacyjny

**Cel**: Wsparcie dla operacji łączeniowych zgodnie z „Instrukcją czynności łączeniowych" (wyd. 8).

| Aspekt | Wartość |
|--------|---------|
| **Nazwa UI** | „Operacyjny" |
| **Główny fokus** | Stany łączników, wyspy (islands), ciągłość zasilania |
| **Domyślne warstwy** | Topologia, Stany łączników, Wyspy |
| **Nakładka wyników** | Częściowa (napięcia, stany) |
| **Interakcje dozwolone** | Symulacja przełączeń (preview), podgląd wysp |
| **Interakcje zabronione** | Bezpośrednia modyfikacja stanów bez zapisu jako Snapshot |

**Domyślna konfiguracja warstw:**

| Warstwa | Stan |
|---------|------|
| Topologia i stany łączników | WIDOCZNA (podkreślone stany) |
| Napięcia | WIDOCZNA |
| Prądy | UKRYTA |
| Limity / przekroczenia | UKRYTA |
| Statusy decyzyjne | WIDOCZNA (tylko dla łączników) |
| Znaczniki nawigacyjne | UKRYTA |

**Zgodność z „Instrukcją czynności łączeniowych" (wyd. 8):**

| Wymaganie normatywne | Implementacja UI |
|----------------------|------------------|
| Jednoznaczna identyfikacja łączników | Etykiety z ID i nazwą zawsze widoczne |
| Widoczny stan OTWARTY/ZAMKNIĘTY | Kolorowanie + symbol IEC |
| Identyfikacja wysp | Kolorowanie tła węzłów per wyspa |
| Ostrzeżenie przed wyłączeniem pod obciążeniem | Status WARNING dla łączników z prądem |

### 5.4. Tryb Audytowy

**Cel**: Weryfikacja zgodności z normami, dostęp do śladów obliczeń.

| Aspekt | Wartość |
|--------|---------|
| **Nazwa UI** | „Audytowy" |
| **Główny fokus** | Zgodność, ślady obliczeń, pełne dane |
| **Domyślne warstwy** | Wszystkie warstwy widoczne |
| **Nakładka wyników** | Pełna (wszystkie parametry) |
| **Interakcje dozwolone** | Nawigacja do PROOF, eksport raportów |
| **Interakcje zabronione** | Modyfikacja czegokolwiek |

**Domyślna konfiguracja warstw:**

| Warstwa | Stan |
|---------|------|
| Topologia i stany łączników | WIDOCZNA |
| Napięcia | WIDOCZNA |
| Prądy | WIDOCZNA |
| Limity / przekroczenia | WIDOCZNA |
| Statusy decyzyjne | WIDOCZNA |
| Znaczniki nawigacyjne | WIDOCZNA (podkreślone) |

---

## 6. WARSTWY SLD (LAYERS) — BINDING

### 6.1. Definicja warstw

SLD stosuje **semantyczny podział warstw** z możliwością indywidualnej kontroli widoczności:

| ID | Nazwa warstwy | Typ | Zawartość |
|----|---------------|-----|-----------|
| **L1** | Topologia i stany łączników | Statyczna + Dynamiczna | Symbole, połączenia, stany OTWARTY/ZAMKNIĘTY |
| **L2** | Napięcia | Dynamiczna | Wartości napięć, odchyłki, kolorowanie |
| **L3** | Prądy | Dynamiczna | Wartości prądów w gałęziach, kolorowanie obciążeń |
| **L4** | Limity / przekroczenia | Dynamiczna | Kolorystyka normatywna (zielony/żółty/czerwony) |
| **L5** | Statusy decyzyjne | Dynamiczna | Znaczniki PASS/WARNING/FAIL |
| **L6** | Znaczniki nawigacyjne | Interaktywna | Linki do Przeglądu wyników i Śladu obliczeń |

### 6.2. Warstwa L1: Topologia i stany łączników

**Zawartość:**

| Element | Reprezentacja | Kolorowanie |
|---------|---------------|-------------|
| Węzły (Bus) | Prostokąt / szyna | Czarny (standard IEC) |
| Gałęzie (Line) | Linia ciągła | Czarny |
| Transformatory | Symbol IEC | Czarny |
| Źródła | Symbol IEC | Czarny |
| Łączniki ZAMKNIĘTE | Symbol IEC (zamknięty) | Zielony |
| Łączniki OTWARTE | Symbol IEC (otwarty) | Szary |
| Łączniki wyłączone z eksploatacji | Symbol IEC | Czerwony (przekreślony) |

**Wymagania (BINDING):**

- Warstwa L1 **MUST** być zawsze widoczna (nie można jej ukryć)
- Stany łączników **MUST** być aktualizowane zgodnie z aktywnym Snapshot
- Symbole **MUST** być zgodne z IEC 61082

### 6.3. Warstwa L2: Napięcia

**Zawartość:**

| Element | Wartość | Format | Kolorowanie |
|---------|---------|--------|-------------|
| Węzły (Bus) | Napięcie [kV] | „20.1 kV" | Gradient wg odchyłki |
| Węzły (Bus) | Napięcie [%] | „100.5%" | Gradient wg odchyłki |
| Węzły (Bus) | Napięcie [pu] | „1.005 pu" | Gradient wg odchyłki |

**Kolorowanie odchyłek napięcia (BINDING):**

| Zakres odchyłki | Kolor | Status |
|-----------------|-------|--------|
| ±5% (norma PN-EN 50160) | Zielony (#22C55E) | OK |
| ±5% do ±10% | Żółty (#EAB308) | WARNING |
| > ±10% | Czerwony (#EF4444) | FAIL |

### 6.4. Warstwa L3: Prądy

**Zawartość:**

| Element | Wartość | Format | Kolorowanie |
|---------|---------|--------|-------------|
| Gałęzie (Line) | Prąd [A] | „245 A" | Gradient wg obciążenia |
| Gałęzie (Line) | Prąd [%In] | „78%" | Gradient wg obciążenia |
| Transformatory | Prąd [A] | „512 A" | Gradient wg obciążenia |
| Łączniki (zamknięte) | Prąd [A] | „245 A" | Gradient wg obciążenia |

**Kolorowanie obciążeń (BINDING):**

| Zakres obciążenia | Kolor | Status |
|-------------------|-------|--------|
| 0–80% In | Zielony (#22C55E) | OK |
| 80–100% In | Żółty (#EAB308) | WARNING |
| > 100% In | Czerwony (#EF4444) | FAIL |

### 6.5. Warstwa L4: Limity / przekroczenia

**Zawartość:**

Warstwa L4 nakłada **kolorystykę normatywną** na elementy, które przekraczają limity:

| Typ przekroczenia | Wizualizacja | Kolor |
|-------------------|--------------|-------|
| Przekroczenie napięcia | Obramowanie węzła | Czerwony |
| Przekroczenie prądu | Pogrubienie linii | Czerwony |
| Przekroczenie mocy zwarciowej | Marker przy węźle | Czerwony |
| Blisko limitu (80–100%) | Obramowanie | Żółty |

**Wymagania (BINDING):**

- Warstwa L4 **MUST** być renderowana ponad warstwami L2 i L3
- Elementy z przekroczeniami **MUST** być widoczne nawet przy dużym oddaleniu (zoom out)
- Animacja pulsująca **MAY** być użyta dla krytycznych przekroczeń (FAIL)

### 6.6. Warstwa L5: Statusy decyzyjne

**Zawartość:**

Warstwa L5 wyświetla **znaczniki statusów decyzyjnych** zgodne z Decision Support Layer (UI CORE):

| Status | Symbol | Kolor | Pozycja |
|--------|--------|-------|---------|
| PASS | ✓ (checkmark) | Zielony (#22C55E) | Prawy górny róg symbolu |
| WARNING | ⚠ (warning) | Żółty (#EAB308) | Prawy górny róg symbolu |
| FAIL | ✗ (cross) | Czerwony (#EF4444) | Prawy górny róg symbolu |
| INFO | ℹ (info) | Niebieski (#3B82F6) | Prawy górny róg symbolu |
| UNKNOWN | ? (question) | Szary (#94A3B8) | Prawy górny róg symbolu |

**Wymagania (BINDING):**

- Statusy **MUST** być widoczne dla każdego elementu z wynikami
- Statusy **MUST** być klikalne (klik → Inspector z zakładką Limity)
- Statusy **MUST** być widoczne przy każdym poziomie zoom

### 6.7. Warstwa L6: Znaczniki nawigacyjne

**Zawartość:**

Warstwa L6 wyświetla **znaczniki nawigacyjne** umożliwiające szybki dostęp do szczegółów:

| Znacznik | Ikona | Akcja | Warunek widoczności |
|----------|-------|-------|---------------------|
| „Przegląd wyników" | 📊 | Nawigacja do RESULTS | Element ma wyniki |
| „Ślad obliczeń" | 📝 | Nawigacja do PROOF | Element ma ślad |
| „Kontrybutorzy" | 🔗 | Nawigacja do listy kontrybutorów | Element ma kontrybutorów (zwarcie) |

**Wymagania (BINDING):**

- Znaczniki **MUST** być widoczne tylko dla elementów z dostępnymi danymi
- Znaczniki **MUST** być klikalne
- Znaczniki **SHOULD** pojawiać się przy hover nad elementem

### 6.8. Priorytety wizualne (BINDING)

SLD stosuje **jednoznaczną kolejność nakładania warstw i znaczników**. Priorytety są **normatywne i niekonfigurowalne** — implementacja UI **MUST** przestrzegać tej hierarchii.

**Kolejność renderowania (od dołu do góry):**

| Priorytet | Warstwa / Element | Uzasadnienie |
|-----------|-------------------|--------------|
| 1 (najniżej) | L1: Topologia (symbole, linie) | Warstwa bazowa |
| 2 | L2: Napięcia (etykiety, kolorowanie) | Dane wynikowe |
| 3 | L3: Prądy (etykiety, kolorowanie) | Dane wynikowe |
| 4 | L4: Limity / przekroczenia (obramowania) | Ostrzeżenia |
| 5 | Delta overlay (porównania Case) | Tryb porównania |
| 6 | L5: Statusy decyzyjne (PASS/WARNING/FAIL) | Decyzje |
| 7 (najwyżej) | L6: Znaczniki nawigacyjne + Interakcje | Nawigacja |

**Hierarchia znaczników statusów (przy kolizji):**

| Priorytet | Status | Uzasadnienie |
|-----------|--------|--------------|
| 1 (najwyższy) | FAIL | Krytyczne — zawsze widoczny |
| 2 | WARNING | Ostrzeżenie — widoczny jeśli brak FAIL |
| 3 | Delta (REGRESSED) | Pogorszenie w porównaniu |
| 4 | Delta (IMPROVED) | Poprawa w porównaniu |
| 5 | INFO | Informacyjny |
| 6 (najniższy) | PASS | Domyślny — ukrywany przy zagęszczeniu |

**Zasady (BINDING):**

- Przy kolizji znaczników na tym samym elemencie **MUST** być widoczny znacznik o wyższym priorytecie
- Warstwa L6 (nawigacja) **MUST** być zawsze ponad warstwami danych
- Znacznik FAIL **MUST** być widoczny niezależnie od poziomu zoom
- Priorytety **MUST NOT** być konfigurowalne przez użytkownika

### 6.9. Obsługa braku danych (UNKNOWN / N/A)

SLD **MUST** jednoznacznie obsługiwać sytuacje braku danych wynikowych.

**Kiedy pojawia się UNKNOWN:**

| Sytuacja | Zachowanie UI | Status |
|----------|---------------|--------|
| Brak aktywnego Run (nie uruchomiono solvera) | Nakładka wyników niewidoczna, tooltip: „Brak wyników — uruchom obliczenia" | N/A |
| Run zakończony błędem dla elementu | Znacznik UNKNOWN (szary ?), tooltip: „Obliczenia nieukończone" | UNKNOWN |
| Element nie uczestniczy w analizie | Brak znacznika, brak nakładki | N/A |
| Brak Proof dla elementu | Znacznik „Ślad obliczeń" niewidoczny, menu kontekstowe: pozycja wyszarzona | N/A |
| Porównanie Case — brak danych w jednym Case | Delta: „N/A", kolor neutralny (szary) | N/A |
| Snapshot bez wyników | Komunikat w legendzie: „Snapshot bez wyników obliczeniowych" | N/A |

**Zasady (BINDING):**

- UNKNOWN **MUST NOT** być traktowany jako FAIL — to brak danych, nie błąd
- UNKNOWN **MUST** mieć dedykowany znacznik wizualny (szary ?) odróżnialny od FAIL
- Przy braku Run, warstwy L2–L5 **MUST** być automatycznie ukryte (nie puste)
- Nawigacja do PROOF **MUST** być zablokowana (wyszarzona) gdy brak śladu
- W trybie porównania, brak danych po jednej stronie **MUST** być oznaczony jako „N/A" (nie jako 0 ani puste pole)

### 6.10. Dostępność i czytelność (A11Y)

SLD **MUST** spełniać wymagania dostępności zgodnie z WCAG 2.1 Level AA.

**Zasada fundamentalna (BINDING):**

Kolor **NIE JEST** jedynym nośnikiem informacji. Każdy status i stan **MUST** być rozróżnialny przez kombinację:

| Nośnik | Rola | Przykład |
|--------|------|----------|
| **Kolor** | Szybka identyfikacja wizualna | Zielony / Żółty / Czerwony |
| **Ikona / Kształt** | Rozróżnienie bez koloru | ✓ / ⚠ / ✗ |
| **Etykieta tekstowa** | Dostępność dla screen readers | „PASS", „WARNING", „FAIL" |

**Wymagania dostępności (BINDING):**

| Wymaganie | Implementacja | Poziom |
|-----------|---------------|--------|
| Kontrast kolorów | Minimum 4.5:1 dla tekstu, 3:1 dla elementów graficznych | MUST |
| Ikony + kolor | Każdy status ma dedykowaną ikonę niezależną od koloru | MUST |
| Etykiety ARIA | Wszystkie znaczniki statusów posiadają aria-label | MUST |
| Fokus klawiaturowy | Elementy SLD osiągalne przez Tab, nawigacja strzałkami | MUST |
| Tryb wysokiego kontrastu | Alternatywna paleta kolorów dla osób z zaburzeniami widzenia | SHOULD |
| Powiększenie tekstu | Etykiety czytelne przy zoom 200% | MUST |

**Paleta kolorów — tryb standardowy vs wysoki kontrast:**

| Status | Kolor standardowy | Kolor wysoki kontrast |
|--------|-------------------|----------------------|
| PASS | #22C55E (zielony) | #00FF00 (jaskrawy zielony) |
| WARNING | #EAB308 (żółty) | #FFFF00 (jaskrawy żółty) |
| FAIL | #EF4444 (czerwony) | #FF0000 (jaskrawy czerwony) |
| UNKNOWN | #94A3B8 (szary) | #FFFFFF (biały z czarnym obramowaniem) |

---

## 7. INTERAKCJE I SYNCHRONIZACJA (BINDING)

### 7.1. Jedno źródło prawdy selekcji

**Zasada (BINDING):**

```
SELEKCJA JEST SYNCHRONIZOWANA MIĘDZY:
SLD ↔ Navigation Panel ↔ Inspector ↔ Results Browser

JEDNO ZAZNACZENIE = JEDEN ELEMENT WE WSZYSTKICH WIDOKACH
```

**Implementacja:**

| Źródło akcji | Propagacja |
|--------------|------------|
| Klik w element na SLD | → Navigation Panel (select) → Inspector (open) |
| Klik w element w Navigation Panel | → SLD (highlight + center) → Inspector (open) |
| Klik w wiersz w Results Browser | → SLD (highlight + center) → Navigation Panel (select) → Inspector (open) |
| Klik w element w Inspector (np. kontrybutor) | → SLD (highlight + center) → Navigation Panel (select) |

### 7.2. Interakcja: Klik → Inspektor elementu

| Akcja | Reakcja |
|-------|---------|
| Klik lewym przyciskiem | Zaznaczenie elementu + otwarcie Inspektora |
| Ctrl + Klik | Dodanie do multi-selekcji (Inspector pokazuje agregat) |
| Double-click | Zaznaczenie + otwarcie Inspektora w trybie pełnoekranowym |

### 7.3. Interakcja: Klik → Przegląd wyników

| Akcja | Reakcja |
|-------|---------|
| Prawy klik → „Przegląd wyników" | Otwarcie Results Browser z filtrem do elementu |
| Klik w znacznik 📊 | j.w. |

**Kontekst przekazywany do RESULTS:**

- `element_id` — ID elementu
- `element_type` — typ elementu (BUS, LINE, TRAFO, ...)
- `run_id` — aktywne uruchomienie (z Context Bar)
- `analysis_type` — typ analizy (LF, SC)

### 7.4. Interakcja: Klik → Ślad obliczeń

| Akcja | Reakcja |
|-------|---------|
| Prawy klik → „Ślad obliczeń" | Otwarcie PROOF Panel dla elementu |
| Klik w znacznik 📝 | j.w. |

**Kontekst przekazywany do PROOF:**

- `element_id` — ID elementu
- `run_id` — aktywne uruchomienie
- `parameter` — opcjonalnie parametr (np. Ik")

### 7.5. Porównania Case ↔ Case (Delta Overlay)

SLD **MUST** obsługiwać tryb wizualny porównania dwóch Case'ów:

| Funkcja | Implementacja |
|---------|---------------|
| Aktywacja | Menu: „Porównaj z..." → wybór Case B |
| Delta napięć | Kolorowanie wg zmiany: zielony (poprawa), czerwony (pogorszenie) |
| Delta prądów | Kolorowanie wg zmiany obciążeń |
| Delta statusów | Znaczniki: IMPROVED ↑, REGRESSED ↓, NO_CHANGE — |

**Wizualizacja Delta (BINDING):**

| Zmiana | Kolor | Symbol |
|--------|-------|--------|
| IMPROVED (poprawa) | Zielony (#22C55E) | ↑ |
| REGRESSED (pogorszenie) | Czerwony (#EF4444) | ↓ |
| NO_CHANGE | Szary (neutralny) | — |

---

## 8. DECISION SUPPORT W SLD

### 8.1. Prezentacja statusów na schemacie

Decision Support Layer jest **integralną częścią SLD** i prezentuje statusy decyzyjne bezpośrednio na elementach schematu:

| Status | Wizualizacja na SLD | Pozycja |
|--------|---------------------|---------|
| **PASS** | Zielony znacznik ✓ | Prawy górny róg symbolu |
| **WARNING** | Żółty znacznik ⚠ | Prawy górny róg symbolu |
| **FAIL** | Czerwony znacznik ✗ | Prawy górny róg symbolu + pulsacja |
| **INFO** | Niebieski znacznik ℹ | Prawy górny róg symbolu |
| **UNKNOWN** | Szary znacznik ? | Prawy górny róg symbolu |

### 8.2. Hierarchia wizualna statusów

Przy zagęszczeniu elementów (zoom out), SLD **MUST** stosować hierarchię wizualną:

| Poziom zoom | Widoczność |
|-------------|------------|
| 100%+ (bliski) | Wszystkie znaczniki statusów widoczne |
| 50-100% | Tylko FAIL i WARNING widoczne |
| 25-50% | Tylko FAIL widoczne (pulsujące) |
| < 25% | Zagregowane znaczniki per obszar |

### 8.3. Akcje „co dalej?" po wykryciu statusu

SLD **MUST** oferować kontekstowe akcje dla elementów ze statusami:

| Status | Akcje dostępne |
|--------|----------------|
| **PASS** | [Inspektor] [Przegląd wyników] |
| **WARNING** | [Inspektor] [Przegląd wyników] [Ślad obliczeń] |
| **FAIL** | [Inspektor] [Przegląd wyników] [Ślad obliczeń] [Kontrybutorzy] [Eksport raportu] |

**Menu kontekstowe dla FAIL (BINDING):**

```
┌─────────────────────────────────────────────────────────────────────┐
│ BUS-PT-01 — ❌ FAIL                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Prąd zwarciowy Ik" = 28.5 kA                                      │
│  Limit: 25.0 kA (IEC 60909)                                        │
│  Przekroczenie: +14%                                               │
│                                                                     │
│  ────────────────────────────────────────                          │
│  📋  Otwórz Inspektor elementu                                     │
│  📊  Przegląd wyników                                              │
│  📝  Ślad obliczeń                                                 │
│  🔗  Pokaż kontrybutorów                                           │
│  📤  Eksportuj raport                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. PERFORMANCE I SKALOWANIE

### 9.1. Wymagania wydajnościowe (BINDING)

| Operacja | Maksymalny czas |
|----------|-----------------|
| Renderowanie SLD (100 elementów) | < 200 ms |
| Renderowanie SLD (1000 elementów) | < 500 ms |
| Renderowanie SLD (10000 elementów) | < 2000 ms |
| Pan/Zoom (interaktywny) | < 16 ms (60 FPS) |
| Zmiana warstwy (toggle) | < 100 ms |
| Zmiana trybu | < 200 ms |
| Aktualizacja overlay (wyniki) | < 300 ms |
| Wyszukiwanie elementu | < 100 ms |
| Eksport PDF (A3, 300 DPI) | < 3000 ms |

### 9.2. Techniki optymalizacji

| Technika | Zastosowanie |
|----------|--------------|
| **Canvas / WebGL** | Renderowanie dużych schematów (> 1000 elementów) |
| **Virtual rendering** | Renderowanie tylko widocznych elementów (viewport culling) |
| **Level of Detail (LOD)** | Uproszczenie symboli przy oddaleniu |
| **Lazy loading** | Ładowanie detali na żądanie (przy przybliżeniu) |
| **Tile-based rendering** | Podział canvas na kafelki |
| **Worker threads** | Obliczenia layout w tle |
| **Caching** | Cache dla overlay data |

### 9.3. Level of Detail (LOD)

| Poziom zoom | LOD | Widoczność detali |
|-------------|-----|-------------------|
| 100%+ | HIGH | Wszystkie etykiety, wszystkie znaczniki, pełne symbole |
| 50-100% | MEDIUM | Główne etykiety, znaczniki statusów, uproszczone symbole |
| 25-50% | LOW | Tylko ID, tylko FAIL markers, prostokąty zamiast symboli |
| < 25% | MINIMAL | Tylko kontury, zagregowane statusy per obszar |

### 9.4. Duże sieci (> 5000 elementów)

Dla sieci powyżej 5000 elementów SLD **MUST** stosować:

| Mechanizm | Opis |
|-----------|------|
| **Progressive rendering** | Najpierw kontury, potem detale |
| **Cluster view** | Grupowanie elementów w klastry przy oddaleniu |
| **Search-first navigation** | Zachęta do wyszukiwania zamiast scrollowania |
| **Viewport warnings** | Komunikat: „Wyświetlanie X z Y elementów" |

---

## 10. NON-GOALS SLD

### 10.1. Definicja Non-Goals

Warstwa SLD **NIE JEST ODPOWIEDZIALNA** za:

| Non-Goal | Uzasadnienie | Gdzie należy |
|----------|--------------|--------------|
| **Edycja geometrii CAD** | SLD nie jest edytorem schematów | Zewnętrzny edytor CAD |
| **Tworzenie nowych elementów** | SLD wizualizuje, nie tworzy | Model Editor (przyszłość) |
| **Obliczenia** | SLD prezentuje wyniki, nie oblicza | Solver Layer |
| **Edycja parametrów** | SLD nawiguje do edycji | Inspector Panel |
| **Bezpośrednia modyfikacja stanów** | SLD pokazuje preview, zapis przez Snapshot | Switching Scenario Manager |
| **Komunikacja SCADA** | SLD nie jest systemem runtime | SCADA Gateway (przyszłość) |
| **Generowanie raportów (logika)** | SLD inicjuje eksport | Report Engine |

### 10.2. Granice odpowiedzialności SLD

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SLD LAYER SCOPE                              │
├─────────────────────────────────────────────────────────────────────┤
│ ✅ Wizualizacja topologii sieci                                     │
│ ✅ Prezentacja wyników obliczeń (overlay)                           │
│ ✅ Nawigacja do Inspector, RESULTS, PROOF                           │
│ ✅ Synchronizacja selekcji z innymi widokami                        │
│ ✅ Kontrola warstw i trybów                                         │
│ ✅ Eksport do PDF/SVG/PNG                                           │
│ ✅ Wyszukiwanie elementów                                           │
│ ✅ Decision Support (wizualizacja statusów)                         │
│ ✅ Porównania Case (delta overlay)                                  │
├─────────────────────────────────────────────────────────────────────┤
│ ❌ Tworzenie/edycja geometrii schematów                             │
│ ❌ Obliczenia (LF, SC, Protection)                                  │
│ ❌ Edycja parametrów elementów                                      │
│ ❌ Zarządzanie Case/Snapshot                                        │
│ ❌ Komunikacja z urządzeniami SCADA                                 │
│ ❌ Generowanie PDF (logika renderingu)                              │
│ ❌ Walidacja topologii                                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.3. Anti-patterns (FORBIDDEN)

| Anti-pattern | Dlaczego FORBIDDEN |
|--------------|-------------------|
| Edycja parametrów bezpośrednio na SLD | Narusza separation of concerns (Inspector) |
| Obliczenia w warstwie SLD | Narusza architekturę warstwową |
| Hard-coded wartości wyników | Wyniki należą do Solver Layer |
| Ukrywanie elementów bez kontroli użytkownika | Narusza NO SIMPLIFICATION |
| Modyfikacja stanów łączników bez Snapshot | Narusza immutability modelu |
| „Magiczne" zmiany parametrów przez klik | Brak transparentności |

---

## 11. ZALEŻNOŚCI DOKUMENTÓW

### 11.1. Macierz zależności

| Dokument | Relacja | Opis |
|----------|---------|------|
| `UI_CORE_ARCHITECTURE.md` | **NADRZĘDNY** | Architektura fundamentalna UI |
| `RESULTS_UI_ARCHITECTURE.md` | **RÓWNOLEGŁY** | Architektura wyników (integracja) |
| `PROOF_UI_ARCHITECTURE.md` | **RÓWNOLEGŁY** | Architektura śladów obliczeń (integracja) |
| `SLD_RENDER_LAYERS_CONTRACT.md` | **PODRZĘDNY** | Szczegóły warstw CAD/SCADA |
| `SWITCHING_STATE_VIEW_CONTRACT.md` | ZALEŻNOŚĆ | Stany łączników, wyspy |
| `ELEMENT_INSPECTOR_CONTRACT.md` | ZALEŻNOŚĆ | Nawigacja SLD → Inspector |
| `GLOBAL_CONTEXT_BAR.md` | ZALEŻNOŚĆ | Synchronizacja kontekstu |
| `EXPERT_MODES_CONTRACT.md` | ZALEŻNOŚĆ | Tryby eksperckie |
| `TOPOLOGY_TREE_CONTRACT.md` | ZALEŻNOŚĆ | Synchronizacja selekcji |

### 11.2. Hierarchia dokumentów

```
UI_CORE_ARCHITECTURE.md (NADRZĘDNY)
         │
         ├─── RESULTS_UI_ARCHITECTURE.md (RÓWNOLEGŁY)
         │
         ├─── PROOF_UI_ARCHITECTURE.md (RÓWNOLEGŁY)
         │
         └─── SLD_UI_ARCHITECTURE.md (TEN DOKUMENT)
                   │
                   ├─── SLD_RENDER_LAYERS_CONTRACT.md
                   ├─── SWITCHING_STATE_VIEW_CONTRACT.md
                   ├─── ELEMENT_INSPECTOR_CONTRACT.md
                   ├─── TOPOLOGY_TREE_CONTRACT.md
                   └─── GLOBAL_CONTEXT_BAR.md
```

### 11.3. Mapowanie na istniejące kontrakty

| Funkcja SLD | Kontrakt źródłowy | Sekcja |
|-------------|-------------------|--------|
| Warstwy CAD/SCADA | `SLD_RENDER_LAYERS_CONTRACT.md` | sekcja 2-3 |
| Tryby CAD/SCADA/Hybrid | `SLD_RENDER_LAYERS_CONTRACT.md` | sekcja 3 |
| Stany łączników | `SWITCHING_STATE_VIEW_CONTRACT.md` | sekcja 3.2 |
| Wyspy (Islands) | `SWITCHING_STATE_VIEW_CONTRACT.md` | sekcja 3.3 |
| Klik → Inspector | `ELEMENT_INSPECTOR_CONTRACT.md` | sekcja 2 |
| Drzewo topologii | `TOPOLOGY_TREE_CONTRACT.md` | sekcja 2 |
| Synchronizacja kontekstu | `GLOBAL_CONTEXT_BAR.md` | sekcja 3 |
| Tryby eksperckie | `EXPERT_MODES_CONTRACT.md` | sekcja 2 |

### 11.4. Kontrakty do utworzenia (FUTURE)

| Kontrakt | Status | Zakres |
|----------|--------|--------|
| `SLD_INTERACTION_CONTRACT.md` | FUTURE | Szczegóły interakcji (pan, zoom, selection) |
| `SLD_EXPORT_CONTRACT.md` | FUTURE | Format i parametry eksportu PDF/SVG/PNG |
| `SLD_OVERLAY_DATA_CONTRACT.md` | FUTURE | Struktura danych nakładki wynikowej |
| `SLD_DELTA_OVERLAY_CONTRACT.md` | FUTURE | Tryb porównania Case ↔ Case |
| `SLD_LOD_CONTRACT.md` | FUTURE | Poziomy szczegółowości (Level of Detail) |
| `SLD_MINIMAP_CONTRACT.md` | FUTURE | Funkcjonalność minimapy |

---

## 12. WYMAGANIA TESTOWALNOŚCI (QA / E2E)

### 12.1. Identyfikatory testowe (BINDING)

Każdy element SLD **MUST** posiadać deterministyczny identyfikator umożliwiający automatyzację testów:

| Element | Atrybut testowy | Format | Przykład |
|---------|-----------------|--------|----------|
| Obiekt SLD | `data-testid` | `sld-{type}-{model_id}` | `sld-bus-BUS-GPZ-01` |
| Znacznik statusu | `data-testid` | `sld-status-{model_id}` | `sld-status-BUS-GPZ-01` |
| Znacznik nawigacyjny | `data-testid` | `sld-nav-{action}-{model_id}` | `sld-nav-results-LINE-01` |
| Warstwa | `data-layer-id` | `sld-layer-{L1-L6}` | `sld-layer-L5` |
| Toolbar button | `data-testid` | `sld-toolbar-{action}` | `sld-toolbar-zoom-in` |

**Zasady (BINDING):**

- Identyfikatory **MUST** być stabilne między renderowaniami (deterministyczne)
- Identyfikatory **MUST** być unikalne w obrębie całego SLD
- Identyfikatory **MUST NOT** zawierać losowych sufiksów (np. UUID)

### 12.2. Selektywność elementów (BINDING)

Każdy interaktywny element SLD **MUST** być osiągalny w testach E2E:

| Wymaganie | Implementacja | Poziom |
|-----------|---------------|--------|
| Klik w element | Element posiada hit-box i `data-testid` | MUST |
| Hover nad elementem | Element reaguje na `mouseenter`/`mouseleave` | MUST |
| Selekcja klawiszowa | Element osiągalny przez Tab + Enter | MUST |
| Odczyt statusu | Status dostępny przez `data-status` attribute | MUST |
| Odczyt wartości | Wartości overlay dostępne przez `data-value-*` | SHOULD |

### 12.3. Sterowalność warstw (BINDING)

Warstwy SLD **MUST** być sterowalne programowo dla celów testowych:

| Operacja | API testowe | Przykład |
|----------|-------------|----------|
| Włączenie warstwy | `SLD.layers.enable(layerId)` | `SLD.layers.enable('L5')` |
| Wyłączenie warstwy | `SLD.layers.disable(layerId)` | `SLD.layers.disable('L2')` |
| Odczyt stanu warstwy | `SLD.layers.isEnabled(layerId)` | `SLD.layers.isEnabled('L4') → true` |
| Reset do domyślnych | `SLD.layers.resetToDefault(mode)` | `SLD.layers.resetToDefault('analytical')` |

**Zasady (BINDING):**

- API testowe **MUST** być dostępne w trybie testowym (env: test/e2e)
- API testowe **MAY** być niedostępne w produkcji (opcjonalne ukrycie)
- Zmiany warstw przez API **MUST** być natychmiastowo odzwierciedlone w renderingu

### 12.4. Asercje testowe

Testy E2E **MUST** mieć możliwość weryfikacji:

| Asercja | Mechanizm |
|---------|-----------|
| Element jest widoczny | `element.isVisible()` + viewport check |
| Element ma status FAIL | `element.getAttribute('data-status') === 'FAIL'` |
| Warstwa L5 jest aktywna | `SLD.layers.isEnabled('L5') === true` |
| Tryb jest Analityczny | `SLD.mode.current() === 'analytical'` |
| Selekcja zawiera element | `SLD.selection.includes('BUS-GPZ-01')` |
| Nakładka pokazuje wartość | `element.getAttribute('data-value-voltage') === '20.1'` |

---

## 13. CHANGELOG

| Wersja | Data | Zmiany |
|--------|------|--------|
| **1.0** | 2026-01-31 | Definicja bazowa |
| **1.1** | 2026-01-31 | Dodano: priorytety wizualne, obsługa UNKNOWN/N/A, A11Y, zasady Snapshot, testowalność |

---

**KONIEC DOKUMENTU**
