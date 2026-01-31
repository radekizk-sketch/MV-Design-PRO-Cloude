# UI CORE ARCHITECTURE — MV-DESIGN-PRO

**Status**: BINDING
**Wersja**: 1.1
**Data**: 2026-01-31
**Typ**: Architecture Document — Fundamentalny

---

## 1. CEL I ZAKRES DOKUMENTU

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **architekturę fundamentalną UI MV-DESIGN-PRO** — kompletny framework konceptualny i strukturalny dla interfejsu użytkownika systemu analizy sieci elektroenergetycznych.

Dokument stanowi **źródło prawdy** dla:

- globalnych zasad projektowania UI (PowerFactory+),
- hierarchii nawigacji i struktury aplikacji,
- filozofii produktowej „MAX, bez MVP",
- wszystkich decyzji architektonicznych UI.

### 1.2. Zakres obowiązywania

- **BINDING** dla całego UI MV-DESIGN-PRO,
- każda implementacja UI **MUST** być zgodna z niniejszą architekturą,
- każdy nowy komponent UI **MUST** być spójny z opisanymi zasadami,
- naruszenie architektury = regresja wymagająca natychmiastowego hotfixa.

### 1.3. Odbiorcy dokumentu

- Architekci UI,
- Deweloperzy frontend,
- Product Ownerzy,
- QA (testy E2E).

---

## 2. FILOZOFIA PRODUKTOWA: „MAX, BEZ MVP"

### 2.1. Definicja filozofii

MV-DESIGN-PRO **NIE** stosuje podejścia MVP (Minimum Viable Product).

Zamiast tego stosujemy podejście **MAX** (Maximum Achievable eXcellence):

| Aspekt | MVP (❌ FORBIDDEN) | MAX (✅ REQUIRED) |
|--------|-------------------|------------------|
| Zakres | Minimalne funkcje | Wszystkie funkcje od startu |
| Jakość | „Wystarczająco dobre" | Profesjonalnie doskonałe |
| Dane | Ukrywanie złożoności | Jawność wszystkich danych |
| UX | Uproszczone widoki | Pełne widoki eksperckie |
| Iteracje | Iteracyjne dodawanie | Kompletność od początku |

### 2.2. Zasada NO SIMPLIFICATION

**FUNDAMENTALNA ZASADA UI:**

```
DANE NIGDY NIE SĄ UKRYWANE „DLA UPROSZCZENIA".
DANE SĄ ZAWSZE DOSTĘPNE — TYLKO FOKUS JEST ZMIENNY.
```

Oznacza to:

- **FORBIDDEN**: „Ukryjmy to, użytkownik tego nie potrzebuje",
- **FORBIDDEN**: „Uprośćmy interfejs, pokażmy mniej danych",
- **FORBIDDEN**: „Ta informacja jest zbyt techniczna dla użytkownika",
- **REQUIRED**: „Wszystkie dane dostępne, fokus definiowany przez Expert Mode".

### 2.3. Jawność ponad wygodę

MV-DESIGN-PRO preferuje **jawność** nad **wygodę**:

| Decyzja | Wybór |
|---------|-------|
| Mniej kliknięć vs więcej informacji | Więcej informacji |
| Czyste UI vs kompletne UI | Kompletne UI |
| Prosty widok vs pełny widok | Pełny widok |
| Domyślne ukrywanie vs domyślne pokazywanie | Domyślne pokazywanie |

### 2.4. Uzasadnienie filozofii MAX

MV-DESIGN-PRO jest narzędziem dla **inżynierów elektryków**, którzy:

- wymagają pełnego dostępu do danych obliczeniowych,
- podejmują decyzje na podstawie szczegółowych wartości liczbowych,
- odpowiadają za bezpieczeństwo sieci elektroenergetycznych,
- potrzebują audytowalności i transparentności wyników.

**Ukrywanie danych = ryzyko błędnych decyzji = niedopuszczalne.**

---

## 3. POZYCJA RYNKOWA: PowerFactory+

### 3.1. Definicja PowerFactory+

MV-DESIGN-PRO jest systemem klasy **PowerFactory+**, co oznacza:

```
MV-DESIGN-PRO UI ≥ PowerFactory UI ≥ ETAP UI
```

### 3.2. Benchmark konkurencji

| System | Producent | Pozycja rynkowa |
|--------|-----------|-----------------|
| DIgSILENT PowerFactory | DIgSILENT GmbH | Lider przemysłowy, standard de facto |
| ETAP | ETAP (Operation Technology) | Silna pozycja, szczególnie USA |
| **MV-DESIGN-PRO** | **[Nasz system]** | **PowerFactory+ (superior)** |

### 3.3. Wymagania PowerFactory+

MV-DESIGN-PRO **MUST** implementować:

1. **100% funkcjonalności PowerFactory** (FULL PARITY),
2. **100% funkcjonalności ETAP** (FULL PARITY),
3. **Dodatkowe funkcjonalności SUPERIOR** (przewaga konkurencyjna).

### 3.4. Macierz parity (podsumowanie)

| Kategoria | FULL PARITY | SUPERIOR | PARTIAL |
|-----------|-------------|----------|---------|
| Results Browser | 12 | 5 | 0 |
| Element Inspector | 18 | 11 | 0 |
| Expert Modes | 0 | 6 | 0 |
| Global Context Bar | 5 | 6 | 0 |
| SLD Viewer | 8 | 2 | 1 |
| **RAZEM** | **43** | **30** | **1** |

**Wniosek**: MV-DESIGN-PRO osiąga i przewyższa funkcjonalność PowerFactory/ETAP.

---

## 4. GŁÓWNA STRUKTURA APLIKACJI

### 4.1. Layout fundamentalny

Aplikacja MV-DESIGN-PRO składa się z **czterech stałych stref**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GLOBAL CONTEXT BAR (STICKY)                     │
│  Project │ Case │ Snapshot │ Run │ Analysis │ Norma │ Expert Mode   │
├─────────────┬───────────────────────────────────────┬───────────────┤
│             │                                       │               │
│  NAVIGATION │           MAIN WORKSPACE              │   INSPECTOR   │
│    PANEL    │                                       │     PANEL     │
│             │        (SLD / Results / Editor)       │               │
│   (Tree)    │                                       │  (Element     │
│             │                                       │   Details)    │
│             │                                       │               │
├─────────────┴───────────────────────────────────────┴───────────────┤
│                         STATUS BAR (OPTIONAL)                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2. Strefy UI (definicje)

| Strefa | Pozycja | Rozmiar | Widoczność | Funkcja |
|--------|---------|---------|------------|---------|
| **Global Context Bar** | Góra | 48-64px wysokość | ZAWSZE widoczny | Kontekst pracy (Case, Snapshot, Run) |
| **Navigation Panel** | Lewa | 250-400px szerokość | Zwijany | Drzewo nawigacji (Topology, Results) |
| **Main Workspace** | Centrum | Elastyczny | ZAWSZE widoczny | Główny obszar roboczy (SLD, tabele) |
| **Inspector Panel** | Prawa | 350-500px szerokość | Na żądanie | Szczegóły wybranego elementu |
| **Status Bar** | Dół | 24-32px wysokość | Opcjonalny | Status obliczeń, postęp, komunikaty |

### 4.3. Responsywność stref

**Desktop (≥ 1920px):**
- Wszystkie strefy widoczne,
- Navigation Panel: 300px,
- Inspector Panel: 450px,
- Main Workspace: reszta.

**Laptop (1280px – 1919px):**
- Wszystkie strefy widoczne,
- Navigation Panel: 250px,
- Inspector Panel: 350px,
- Main Workspace: reszta.

**Tablet (768px – 1279px):**
- Navigation Panel: overlay (drawer),
- Inspector Panel: overlay (drawer),
- Main Workspace: 100%.

**Mobile (< 768px):**
- Navigation Panel: overlay (drawer),
- Inspector Panel: fullscreen modal,
- Main Workspace: 100%,
- Global Context Bar: collapsed (hamburger menu).

---

## 5. GLOBAL CONTEXT BAR — PASEK KONTEKSTU

### 5.1. Funkcja

Global Context Bar to **stała, zawsze widoczna belka kontekstu** wyświetlająca:

- aktualny kontekst pracy użytkownika,
- możliwość szybkiego przełączania kontekstu,
- informacje niezbędne do orientacji w przestrzeni obliczeniowej.

### 5.2. Hierarchia kontekstu (BINDING)

Context Bar wyświetla następującą hierarchię (od lewej do prawej):

```
PROJECT → CASE → SNAPSHOT → RUN → ANALYSIS → NORMA → EXPERT MODE → ELEMENT
```

| Poziom | Opis | Przykład |
|--------|------|----------|
| **PROJECT** | Projekt nadrzędny | „Rozdzielnia SN Kraków-Południe" |
| **CASE** | Wariant obliczeniowy | „Case 1: Zima szczyt", „Case 2: Lato noc" |
| **SNAPSHOT** | Zamrożony stan sieci | „Baseline 2026-01", „Variant A" |
| **RUN** | Pojedyncze uruchomienie solvera | „Run #1 (2026-01-31 14:32)" |
| **ANALYSIS** | Typ analizy | „Load Flow", „Short-Circuit", „Proof" |
| **NORMA** | Obowiązująca norma | „PN-EN 50160:2023", „IEC 60909:2016" |
| **EXPERT MODE** | Tryb ekspercki użytkownika | „Designer", „Analyst", „Auditor" |
| **ELEMENT** | Aktualnie wybrany element (opcjonalnie) | „BUS-GPZ-01" |

### 5.3. Wymagania Context Bar (BINDING)

| Wymaganie | Typ | Opis |
|-----------|-----|------|
| Sticky position | MUST | Zawsze widoczny przy scrollowaniu |
| Z-index najwyższy | MUST | Nad wszystkimi komponentami (poza modalami) |
| Synchronizacja z UI | MUST | Zmiana kontekstu w dowolnym miejscu aktualizuje Context Bar |
| Drukowanie w PDF | MUST | Kontekst w nagłówku każdego eksportowanego dokumentu |
| Szybkie przełączanie | MUST | Dropdown menu dla każdego poziomu hierarchii |
| Keyboard shortcuts | SHOULD | Ctrl+1, Ctrl+2, ... dla przełączania poziomów |

### 5.4. Semantyka kolorów Context Bar

| Stan | Kolor | Znaczenie |
|------|-------|-----------|
| Normalny | Neutralny (szary/biały) | Kontekst aktywny, bez problemów |
| Modified | Żółty/pomarańczowy | Niezapisane zmiany w kontekście |
| Error | Czerwony | Błąd w obliczeniach dla kontekstu |
| Outdated | Fioletowy | Wyniki nieaktualne (zmiana parametrów) |

---

## 6. NAVIGATION PANEL — PANEL NAWIGACJI

### 6.1. Funkcja

Navigation Panel to **hierarchiczne drzewo nawigacji** umożliwiające eksplorację:

- struktury topologicznej sieci,
- hierarchii wyników obliczeń,
- katalogów typów elementów.

### 6.2. Tryby nawigacji

Navigation Panel **MUST** obsługiwać następujące tryby:

| Tryb | Ikona | Hierarchia | Zastosowanie |
|------|-------|------------|--------------|
| **Topology Tree** | 🗺️ | Station → Voltage Level → Equipment | Eksploracja struktury sieci |
| **Results Tree** | 📊 | Case → Snapshot → Analysis → Target | Eksploracja wyników |
| **Catalog Tree** | 📚 | Category → Type → Instance | Eksploracja katalogów typów |

### 6.3. Topology Tree — struktura

```
📁 Project: Rozdzielnia SN
├── 📍 Station: GPZ Kraków-Południe
│   ├── ⚡ Voltage Level: 110 kV
│   │   ├── 🔲 BUS-110-A
│   │   ├── 🔲 BUS-110-B
│   │   └── 🔌 TRAFO-110/20-T1
│   └── ⚡ Voltage Level: 20 kV
│       ├── 🔲 BUS-20-MAIN
│       ├── ─── LINE-F1
│       ├── ─── LINE-F2
│       └── 🔌 TRAFO-20/0.4-T2
└── 📍 Station: GPZ Tarnów
    └── ...
```

### 6.4. Results Tree — struktura

```
📁 Project: Rozdzielnia SN
├── 📁 Case 1: Zima szczyt
│   ├── 📸 Snapshot: Baseline 2026-01
│   │   ├── ⚡ Load Flow
│   │   │   ├── 🔲 Bus Results (47 items)
│   │   │   ├── ─── Line Results (23 items)
│   │   │   └── 🔌 Trafo Results (8 items)
│   │   └── ⚠️ Short-Circuit
│   │       └── 🔲 Bus SC Results (47 items)
│   └── 📸 Snapshot: Variant A
│       └── ...
└── 📁 Case 2: Lato noc
    └── ...
```

### 6.5. Funkcjonalności Navigation Panel (BINDING)

| Funkcja | Typ | Opis |
|---------|-----|------|
| Expand All / Collapse All | MUST | Rozwinięcie/zwinięcie całego drzewa |
| Search / Filter | MUST | Wyszukiwanie po nazwie, ID, typie |
| Drag & Drop | SHOULD | Przeciąganie elementów (gdzie semantycznie sensowne) |
| Context menu | MUST | Prawy klik — menu kontekstowe |
| Multi-select | MUST | Ctrl+Click — wielokrotny wybór |
| Sync with SLD | MUST | Zaznaczenie w drzewie = podświetlenie na SLD |
| Sync with Inspector | MUST | Zaznaczenie w drzewie = otwarcie Inspector |

---

## 7. MAIN WORKSPACE — GŁÓWNY OBSZAR ROBOCZY

### 7.1. Funkcja

Main Workspace to **centralny obszar roboczy** aplikacji, w którym użytkownik:

- przegląda schemat jednokreskowy (SLD),
- analizuje tabele wyników,
- edytuje parametry sieci,
- porównuje warianty obliczeniowe.

### 7.2. Tryby Workspace

Main Workspace **MUST** obsługiwać następujące tryby:

| Tryb | Ikona | Zawartość | Zastosowanie |
|------|-------|-----------|--------------|
| **SLD View** | 🗺️ | Schemat jednokreskowy | Wizualizacja topologii i wyników |
| **Table View** | 📊 | Tabele wyników | Analiza tabelaryczna wyników |
| **Editor View** | ✏️ | Edytor parametrów | Edycja parametrów elementów |
| **Comparison View** | ⚖️ | Porównanie Case/Snapshot | Analiza różnic między wariantami |
| **Report View** | 📄 | Podgląd raportu | Podgląd przed eksportem PDF |

### 7.3. SLD View — warstwy renderingu

SLD View stosuje **semantyczny podział warstw**:

| Warstwa | Typ | Zawartość | Tryb |
|---------|-----|-----------|------|
| **SLD_CAD_LAYER** | Statyczna | Symbole, połączenia, etykiety | CAD Mode |
| **SLD_SCADA_LAYER** | Dynamiczna | Wyniki, kolory, animacje | SCADA Mode |
| **SLD_OVERLAY_LAYER** | Interaktywna | Hover, selection, highlights | Zawsze aktywna |

### 7.4. Table View — struktura tabel

Każda tabela wyników **MUST** zawierać:

| Element | Typ | Opis |
|---------|-----|------|
| Header | MUST | Nagłówki kolumn (sortowalne) |
| Filters | MUST | Filtrowanie zaawansowane (multi-column) |
| Rows | MUST | Wiersze danych (wirtualizacja dla > 1000) |
| Status indicators | MUST | Kolory statusu (OK, WARNING, VIOLATION) |
| Actions | MUST | Eksport, Inspector, Navigate to SLD |

### 7.5. Zakładki Workspace

Workspace **MUST** obsługiwać **zakładki (tabs)** dla:

- wielu otwartych widoków SLD,
- wielu otwartych tabel wyników,
- wielu otwartych porównań.

Zakładki **MUST** być:
- przeciągalne (reorder),
- zamykalne (close button),
- duplikowalne (duplicate tab),
- odłączalne (detach to new window) — opcjonalnie.

---

## 8. INSPECTOR PANEL — PANEL WŁAŚCIWOŚCI

### 8.1. Funkcja

Inspector Panel to **panel boczny** wyświetlający szczegółowe informacje o wybranym elemencie sieci.

### 8.2. Tryby wyświetlania Inspector

| Tryb | Opis | Kiedy |
|------|------|-------|
| **Side Panel** | Panel boczny (350-500px) | Domyślnie |
| **Floating Window** | Pływające okno (resizable) | Na żądanie użytkownika |
| **Fullscreen Modal** | Pełnoekranowy modal | Tablet/Mobile |
| **Hidden** | Ukryty | Brak zaznaczonego elementu |

### 8.3. Struktura Inspector (BINDING)

Inspector **MUST** zawierać następujące zakładki:

| Zakładka | Ikona | Zawartość | Widoczność |
|----------|-------|-----------|------------|
| **Overview** | 📋 | Identyfikacja + kluczowe wartości | ZAWSZE |
| **Parameters** | ⚙️ | Parametry elementu (edytowalne) | ZAWSZE |
| **Results** | 📊 | Wyniki obliczeń (LF, SC) | Gdy są wyniki |
| **Contributions** | 🔗 | Kontrybutorzy (do I_sc, obciążeń) | Gdy sensowne |
| **Limits** | ⚠️ | Limity normatywne vs wartości | Gdy są limity |
| **Proof** | 📝 | Dowód P11 (audytowalny) | Gdy proof dostępny |

### 8.4. Kontekstowa siatka właściwości

Inspector Panel **MUST** wyświetlać właściwości w **kontekstowej siatce**:

```
┌────────────────────────────────────────┐
│ ELEMENT: BUS-GPZ-01                    │
│ Type: Bus │ Status: OK                 │
├────────────────────────────────────────┤
│ [Overview] [Parameters] [Results] ...  │
├────────────────────────────────────────┤
│                                        │
│  Property          │ Value    │ Unit   │
│ ───────────────────┼──────────┼─────── │
│  Voltage (nom)     │ 20.0     │ kV     │
│  Voltage (actual)  │ 19.8     │ kV     │
│  Voltage (pu)      │ 0.99     │ pu     │
│  Angle             │ -2.3     │ deg    │
│  P (injection)     │ 12.5     │ MW     │
│  Q (injection)     │ 4.2      │ Mvar   │
│                                        │
└────────────────────────────────────────┘
```

### 8.5. Tryby pracy Inspector (Expert Modes)

Inspector dostosowuje **fokus i rozwinięcia** do Expert Mode:

| Expert Mode | Domyślnie rozwinięte | Fokus |
|-------------|---------------------|-------|
| **Operator** | Overview, Results | Wartości runtime, status |
| **Designer** | Parameters, Limits | Parametry projektowe |
| **Analyst** | Results, Contributions | Wyniki analityczne |
| **Auditor** | Proof, Limits | Zgodność, dowody P11 |

**UWAGA**: Żadna sekcja nie jest **ukrywana** — tylko **domyślne rozwinięcie** się zmienia.

---

## 9. PANELE WYNIKOWE

### 9.1. Typy paneli wynikowych

MV-DESIGN-PRO oferuje następujące panele wynikowe:

| Panel | Źródło danych | Zawartość |
|-------|---------------|-----------|
| **Results Browser** | Solver (LF, SC) | Hierarchia wyników |
| **Element Inspector** | Solver + Model | Wyniki per element |
| **Comparison Panel** | Solver (multi-Case) | Delta między wariantami |
| **Proof Panel** | Solver + Norma | Dowody P11, compliance |

### 9.2. Results Browser — architektura

```
┌─────────────────────────────────────────────────────────────────────┐
│ RESULTS BROWSER                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [🔍 Search] [⬇️ Filters] [📊 Sort] [📤 Export]                     │
│                                                                     │
│  ┌─────────────────┬───────────────────────────────────────────────┐
│  │ TREE            │ TABLE                                         │
│  │                 │                                               │
│  │ 📁 Case 1       │ ID       │ Name      │ V [kV] │ Status │ ...  │
│  │ ├─ 📸 Baseline  │ BUS-001  │ GPZ-Main  │ 19.8   │ OK     │      │
│  │ │  ├─ ⚡ LF     │ BUS-002  │ GPZ-Aux   │ 20.1   │ OK     │      │
│  │ │  └─ ⚠️ SC    │ BUS-003  │ PT-001    │ 19.2   │ WARN   │      │
│  │ └─ 📸 Variant A │ ...      │ ...       │ ...    │ ...    │      │
│  │                 │                                               │
│  └─────────────────┴───────────────────────────────────────────────┘
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.3. Proof Panel — architektura

Panel Proof (P11) służy do **audytowalnej prezentacji dowodów** zgodności z normami:

```
┌─────────────────────────────────────────────────────────────────────┐
│ PROOF PANEL — BUS-GPZ-01                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  COMPLIANCE STATUS: ✅ COMPLIANT                                    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐
│  │ SHORT-CIRCUIT CURRENTS (IEC 60909)                              │
│  ├─────────────────────────────────────────────────────────────────┤
│  │ Fault Type    │ Ik" [kA] │ ip [kA] │ Ith [kA] │ Limit │ Status │
│  │ 3-phase sym   │ 12.5     │ 31.8    │ 12.7     │ 25.0  │ OK     │
│  │ 2-phase       │ 10.8     │ 27.5    │ 11.0     │ 25.0  │ OK     │
│  │ 1-phase-gnd   │ 8.2      │ 20.9    │ 8.4      │ 25.0  │ OK     │
│  └─────────────────────────────────────────────────────────────────┘
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐
│  │ PROTECTION COORDINATION                                          │
│  ├─────────────────────────────────────────────────────────────────┤
│  │ Parameter     │ Value    │ Limit    │ Margin   │ Status         │
│  │ I_set / Ik_min │ 0.35    │ < 0.80   │ 56%      │ OK             │
│  │ t_clear       │ 120 ms   │ < 500 ms │ 76%      │ OK             │
│  └─────────────────────────────────────────────────────────────────┘
│                                                                     │
│  [📤 Export PDF] [📋 Copy] [🖨️ Print]                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. NAWIGACJA

### 10.1. Model nawigacji

MV-DESIGN-PRO stosuje model **nawigacji kontekstowej**:

```
GLOBAL CONTEXT → LOCAL SELECTION → DETAIL VIEW
     ↓                  ↓                ↓
Context Bar      Navigation Panel    Inspector
```

### 10.2. Przepływy nawigacji

| Źródło | Akcja | Cel |
|--------|-------|-----|
| Navigation Panel | Klik w element | Inspector Panel (otwarcie) |
| Navigation Panel | Klik w element | SLD View (highlight) |
| SLD View | Klik w element | Inspector Panel (otwarcie) |
| SLD View | Klik w element | Navigation Panel (select) |
| Inspector Panel | Klik w kontrybutora | Inspector Panel (zmiana elementu) |
| Context Bar | Zmiana Case | Results Browser (reload) |
| Context Bar | Zmiana Snapshot | SLD View (reload) |
| Results Table | Klik w wiersz | Inspector Panel (otwarcie) |

### 10.3. Synchronizacja selekcji

**ZASADA**: Selekcja elementu **MUST** być zsynchronizowana między:

- Navigation Panel (zaznaczenie w drzewie),
- SLD View (podświetlenie na schemacie),
- Inspector Panel (otwarty element),
- Results Table (podświetlony wiersz).

**Zmiana selekcji w jednym miejscu = zmiana we wszystkich miejscach.**

### 10.4. Keyboard Navigation

| Skrót | Akcja |
|-------|-------|
| `Tab` / `Shift+Tab` | Nawigacja między strefami |
| `Arrow Up/Down` | Nawigacja w drzewie/tabeli |
| `Arrow Left/Right` | Expand/Collapse węzła drzewa |
| `Enter` | Wybór elementu (otwarcie Inspector) |
| `Esc` | Zamknięcie Inspector / anulowanie |
| `Ctrl+F` | Wyszukiwanie globalne |
| `Ctrl+1/2/3/4` | Przełączanie zakładek Workspace |
| `Ctrl+Shift+1/2/3/4` | Przełączanie Expert Mode |
| `F5` | Odświeżenie wyników |
| `Ctrl+E` | Eksport aktywnego widoku |

---

## 11. EKSPORT I DRUKOWANIE

### 11.1. Formaty eksportu

MV-DESIGN-PRO **MUST** obsługiwać następujące formaty eksportu:

| Format | Zastosowanie | Zawartość |
|--------|--------------|-----------|
| **PDF** | Raporty, dowody P11 | Formatowany dokument z nagłówkiem |
| **Excel (.xlsx)** | Analiza danych | Surowe dane + formuły |
| **CSV** | Import/export | Surowe dane (bez formatowania) |
| **JSON** | API, integracje | Strukturyzowane dane |
| **SVG/PNG** | SLD | Grafika wektorowa/rastrowa |

### 11.2. Nagłówek PDF (BINDING)

Każdy eksport PDF **MUST** zawierać nagłówek z Global Context:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MV-DESIGN-PRO — Analysis Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project:       Rozdzielnia SN Kraków-Południe
Case:          Case 1: Zima szczyt
Snapshot:      Baseline 2026-01 (2026-01-15 08:00:00)
Run:           Run #3 (2026-01-31 14:32:15)
Analysis:      Short-Circuit (IEC 60909)
Norma:         IEC 60909:2016
Expert Mode:   Auditor
Generated:     2026-01-31 14:45:23
User:          jan.kowalski@firma.pl
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 11.3. Stopka PDF

Każda strona PDF **MUST** zawierać stopkę:

```
Project: Rozdzielnia SN │ Case: Zima szczyt │ Analysis: SC │ Page 3 of 12
```

---

## 12. ZASADY GLOBALNE UI

### 12.1. Zasady wizualne

| Zasada | Opis |
|--------|------|
| **Konsystencja** | Identyczne wzorce dla identycznych akcji |
| **Hierarchia** | Jasna hierarchia wizualna (typografia, kolory) |
| **Feedback** | Natychmiastowy feedback dla każdej akcji |
| **Czytelność** | Dane numeryczne czytelne (formatowanie, jednostki) |
| **Profesjonalizm** | Estetyka narzędzia inżynierskiego (nie „consumer app") |

### 12.2. Zasady kolorystyczne

| Kategoria | Kolor | Zastosowanie |
|-----------|-------|--------------|
| **Status OK** | Zielony (#22C55E) | Wartość w normie |
| **Status WARNING** | Żółty (#EAB308) | Wartość blisko limitu (80-100%) |
| **Status VIOLATION** | Czerwony (#EF4444) | Wartość przekracza limit |
| **Status INFO** | Niebieski (#3B82F6) | Informacja neutralna |
| **Background** | Neutralny (#F8FAFC) | Tło aplikacji |
| **Surface** | Biały (#FFFFFF) | Karty, panele |
| **Text Primary** | Ciemnoszary (#1E293B) | Tekst główny |
| **Text Secondary** | Szary (#64748B) | Tekst pomocniczy |

### 12.3. Zasady typograficzne

| Element | Rozmiar | Waga | Zastosowanie |
|---------|---------|------|--------------|
| **H1** | 24px | 700 | Tytuły główne |
| **H2** | 20px | 600 | Tytuły sekcji |
| **H3** | 16px | 600 | Tytuły podsekcji |
| **Body** | 14px | 400 | Tekst podstawowy |
| **Caption** | 12px | 400 | Etykiety, jednostki |
| **Data** | 14px (mono) | 400 | Wartości numeryczne |

### 12.4. Zasady interakcji

| Zasada | Opis |
|--------|------|
| **Single source of truth** | Jeden element = jedno miejsce edycji |
| **Undo/Redo** | Każda edycja odwracalna (Ctrl+Z/Y) |
| **Confirmation** | Destrukcyjne akcje wymagają potwierdzenia |
| **Progress** | Długie operacje pokazują postęp |
| **Error handling** | Jasne komunikaty błędów z sugestią naprawy |

---

## 13. PERFORMANCE UI

### 13.1. Wymagania wydajnościowe (BINDING)

| Operacja | Maksymalny czas |
|----------|-----------------|
| Zmiana kontekstu (Case, Snapshot) | < 300 ms |
| Otwarcie Inspector | < 100 ms |
| Renderowanie tabeli (1000 wierszy) | < 200 ms |
| Renderowanie tabeli (10000 wierszy) | < 500 ms |
| Wyszukiwanie w drzewie | < 50 ms |
| Eksport PDF (10 stron) | < 3 s |

### 13.2. Techniki optymalizacji

| Technika | Zastosowanie |
|----------|--------------|
| **Virtual scrolling** | Tabele > 100 wierszy |
| **Lazy loading** | Drzewo > 1000 węzłów |
| **Debouncing** | Wyszukiwanie, filtry |
| **Caching** | Lista Case'ów, Snapshot'ów |
| **Web Workers** | Obliczenia w tle |

---

## 14. ACCESSIBILITY

### 14.1. Wymagania WCAG 2.1 AA

MV-DESIGN-PRO **MUST** spełniać WCAG 2.1 Level AA:

| Wymaganie | Implementacja |
|-----------|---------------|
| **Kontrast** | Minimum 4.5:1 dla tekstu |
| **Keyboard** | Pełna nawigacja klawiaturą |
| **Screen readers** | ARIA labels dla wszystkich elementów |
| **Focus visible** | Widoczny fokus dla elementów interaktywnych |
| **Error identification** | Jasna identyfikacja błędów |

### 14.2. ARIA labels

Każdy interaktywny element **MUST** mieć:

- `aria-label` lub `aria-labelledby`,
- `role` (jeśli niestandardowy element),
- `aria-expanded` (dla elementów rozwijalnych),
- `aria-selected` (dla elementów wybieralnych).

---

## 15. ZABRONIONE PRAKTYKI (FORBIDDEN)

### 15.1. Lista zakazów UI

| Zakaz | Uzasadnienie |
|-------|--------------|
| **FORBIDDEN**: Ukrywanie danych „dla uproszczenia" | Narusza NO SIMPLIFICATION |
| **FORBIDDEN**: Modale blokujące dostęp do Context Bar | Context Bar zawsze widoczny |
| **FORBIDDEN**: Niespójne wzorce interakcji | Narusza konsystencję |
| **FORBIDDEN**: Brak synchronizacji selekcji | Dezorientuje użytkownika |
| **FORBIDDEN**: Opóźnienie > 300 ms dla zmiany kontekstu | Narusza responsywność |
| **FORBIDDEN**: Eksport PDF bez nagłówka kontekstu | Narusza audytowalność |
| **FORBIDDEN**: Hard-coded wartości (bez źródła z modelu) | Narusza single source of truth |
| **FORBIDDEN**: Destrukcyjne akcje bez potwierdzenia | Narusza bezpieczeństwo danych |
| **FORBIDDEN**: Brak keyboard navigation | Narusza accessibility |
| **FORBIDDEN**: „Consumer app" estetyka | Narusza profesjonalizm |

---

## 16. ZALEŻNOŚCI OD INNYCH KONTRAKTÓW

| Kontrakt | Zależność |
|----------|-----------|
| `GLOBAL_CONTEXT_BAR.md` | Szczegółowa specyfikacja Context Bar |
| `RESULTS_BROWSER_CONTRACT.md` | Szczegółowa specyfikacja Results Browser |
| `ELEMENT_INSPECTOR_CONTRACT.md` | Szczegółowa specyfikacja Inspector |
| `EXPERT_MODES_CONTRACT.md` | Szczegółowa specyfikacja Expert Modes |
| `UI_ETAP_POWERFACTORY_PARITY.md` | Macierz parity z konkurencją |
| `SLD_RENDER_LAYERS_CONTRACT.md` | Specyfikacja warstw SLD |
| `TOPOLOGY_TREE_CONTRACT.md` | Specyfikacja drzewa topologii |
| `CATALOG_BROWSER_CONTRACT.md` | Specyfikacja przeglądarki katalogów |

---

## 17. WERSJONOWANIE I ZMIANY

- **Wersja 1.0**: Definicja bazowa (2026-01-31),
- **Wersja 1.1**: Dodano sekcje 19-22 (Decision Support Layer, Status Funkcji UI, Non-Goals, Kontrakty) (2026-01-31),
- Zmiany w architekturze wymagają aktualizacji wersji i code review,
- Breaking changes wymagają migracji wszystkich komponentów UI.

---

## 18. SŁOWNIK TERMINÓW

| Termin | Definicja |
|--------|-----------|
| **Case** | Wariant obliczeniowy (np. „Zima szczyt", „Lato noc") |
| **Snapshot** | Zamrożony stan sieci w danym momencie |
| **Run** | Pojedyncze uruchomienie solvera (LF, SC) |
| **Analysis** | Typ analizy (Load Flow, Short-Circuit, Proof) |
| **Norma** | Standard normatywny (IEC, PN-EN, IEEE) |
| **Expert Mode** | Tryb ekspercki dostosowujący UI do roli użytkownika |
| **Inspector** | Panel szczegółów wybranego elementu |
| **SLD** | Single Line Diagram — schemat jednokreskowy |
| **P11** | Proof — dowód audytowalny zgodności z normami |
| **PARITY** | Funkcjonalna równoważność z konkurencją |
| **SUPERIOR** | Funkcjonalna przewaga nad konkurencją |

---

## 19. DECISION SUPPORT LAYER (UI CORE)

### 19.1. Definicja Decision Support Layer

Decision Support Layer to **fundamentalna warstwa UI** odpowiedzialna za prezentację ocen decyzyjnych wyników obliczeń. Warstwa ta stanowi **integralną część UI CORE** — nie jest opcjonalnym dodatkiem ani wtyczką.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DECISION SUPPORT LAYER                          │
│                         (UI CORE)                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PASS   │   FAIL   │   WARNING   │   INFO   │   UNKNOWN           │
│    ✅    │    ❌    │     ⚠️     │    ℹ️    │      ❓              │
│                                                                     │
│   Wartość      Wartość      Wartość       Dane         Brak        │
│   w normie     poza normą   blisko        neutralne    danych      │
│                             limitu                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 19.2. Statusy decyzyjne (BINDING)

| Status | Symbol | Kolor | Definicja | Próg |
|--------|--------|-------|-----------|------|
| **PASS** | ✅ | Zielony (#22C55E) | Wartość mieści się w dopuszczalnym zakresie normy | value ≤ 80% limit |
| **FAIL** | ❌ | Czerwony (#EF4444) | Wartość przekracza dopuszczalny zakres normy | value > 100% limit |
| **WARNING** | ⚠️ | Żółty (#EAB308) | Wartość blisko granicy normy — wymaga uwagi | 80% limit < value ≤ 100% limit |
| **INFO** | ℹ️ | Niebieski (#3B82F6) | Dane informacyjne bez kryterium normatywnego | brak kryterium |
| **UNKNOWN** | ❓ | Szary (#94A3B8) | Brak danych lub niemożność oceny | brak wartości / brak limitu |

### 19.3. Hierarchia krytyczności

Decision Support Layer stosuje **hierarchię krytyczności** dla agregacji statusów:

```
FAIL > WARNING > UNKNOWN > PASS > INFO
  ↓       ↓         ↓        ↓      ↓
  5       4         3        2      1
```

**Zasady agregacji:**

| Kontekst | Reguła agregacji | Przykład |
|----------|-----------------|----------|
| Element → Ogółem | Najwyższa krytyczność | Bus: PASS (V), FAIL (Ik) → FAIL |
| Case → Ogółem | Najwyższa krytyczność | Case: 45 PASS, 2 WARNING, 1 FAIL → FAIL |
| Analysis → Ogółem | Najwyższa krytyczność | LF: PASS, SC: FAIL → FAIL |
| Snapshot → Ogółem | Najwyższa krytyczność | Wszystkie analizy |

### 19.4. Propagacja statusów w hierarchii UI

```
┌─────────────────────────────────────────────────────────────────────┐
│ GLOBAL CONTEXT BAR                                                  │
│ [Project: ✅] [Case: ⚠️] [Snapshot: ⚠️] [Run: ⚠️]                  │
├─────────────────────────────────────────────────────────────────────┤
│ NAVIGATION PANEL            │ MAIN WORKSPACE (Table View)          │
│                             │                                       │
│ 📁 Case 1: ⚠️               │ ID       │ Name    │ Status │ V[kV]  │
│ ├─ 📸 Baseline: ⚠️          │ BUS-001  │ GPZ-01  │ ✅     │ 19.8   │
│ │  ├─ ⚡ LF: ✅              │ BUS-002  │ GPZ-02  │ ⚠️     │ 21.2   │
│ │  └─ ⚠️ SC: ⚠️             │ BUS-003  │ PT-01   │ ✅     │ 20.1   │
│ │                           │ BUS-004  │ PT-02   │ ❌     │ 22.8   │
│                             │                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 19.5. Relacja Decision Support Layer ↔ RESULTS

| Aspekt | Decision Support Layer | RESULTS |
|--------|------------------------|---------|
| **Funkcja** | Ocena decyzyjna | Dane surowe |
| **Zawartość** | Status (PASS/FAIL/WARNING) | Wartości liczbowe |
| **Źródło** | Algorytm ewaluacji | Solver (LF, SC) |
| **Widoczność** | Ikony, kolory, badges | Tabele, wykresy |
| **Użytkownik** | Szybka orientacja | Szczegółowa analiza |

**Zasada (BINDING):**
```
DECISION SUPPORT LAYER NIGDY NIE ZASTĘPUJE RESULTS.
DECISION SUPPORT LAYER UZUPEŁNIA RESULTS O OCENĘ DECYZYJNĄ.
```

### 19.6. Relacja Decision Support Layer ↔ PROOF

| Aspekt | Decision Support Layer | PROOF |
|--------|------------------------|-------|
| **Funkcja** | Szybka orientacja | Formalna weryfikacja |
| **Głębokość** | Status zagregowany | Pełny audit trail |
| **Format** | Ikona + kolor | Dokument PDF |
| **Audytowalność** | Poglądowa | Pełna (P11) |
| **Użytkownik** | Operator, Analyst | Auditor |

**Zasada (BINDING):**
```
DECISION SUPPORT LAYER = PIERWSZY POZIOM OCENY (QUICK SCAN).
PROOF = PEŁNA WERYFIKACJA NORMATYWNA (AUDIT).
```

### 19.7. Wymagania implementacyjne Decision Support Layer

| Wymaganie | Typ | Opis |
|-----------|-----|------|
| Status na każdym elemencie | MUST | Każdy element z wynikami ma status |
| Status w Navigation Panel | MUST | Ikony statusu przy węzłach drzewa |
| Status w tabelach | MUST | Kolumna Status z ikonami/kolorami |
| Status na SLD | MUST | Overlay kolorów na elementach |
| Status w Context Bar | SHOULD | Agregowany status Case/Snapshot |
| Filtrowanie po statusie | MUST | „Pokaż tylko FAIL", „Pokaż tylko WARNING" |
| Sortowanie po statusie | MUST | Najpoważniejsze na górze |

---

## 20. STATUS FUNKCJI UI

### 20.1. Definicja statusów funkcji

Każda funkcja UI w MV-DESIGN-PRO posiada jawny **status dostępności**:

| Status | Symbol | Definicja |
|--------|--------|-----------|
| **ENABLED** | ✅ | Funkcja w pełni zaimplementowana i dostępna |
| **DISABLED** | ⛔ | Funkcja zaimplementowana, ale wyłączona (konfiguracja / licencja) |
| **FUTURE** | 🔮 | Funkcja zaplanowana, jeszcze niezaimplementowana |

### 20.2. Zasady stosowania statusów

**ENABLED:**
- Funkcja przeszła pełne testy (unit, integration, E2E),
- Funkcja jest udokumentowana,
- Funkcja jest dostępna dla wszystkich użytkowników (lub zgodnie z licencją),
- Funkcja jest stabilna (brak known critical bugs).

**DISABLED:**
- Funkcja jest zaimplementowana w kodzie,
- Funkcja jest wyłączona przez konfigurację lub brak licencji,
- UI **MUST** wyświetlać jasny komunikat o przyczynie wyłączenia,
- UI **MUST NOT** ukrywać funkcji — pokazuje ją jako niedostępną.

**FUTURE:**
- Funkcja jest zaplanowana w roadmapie,
- Funkcja **MUST NOT** być widoczna w produkcyjnym UI,
- Funkcja może być widoczna w trybie deweloperskim (feature flag),
- Dokumentacja może wspominać o funkcji z oznaczeniem FUTURE.

### 20.3. Prezentacja statusów w UI

| Status | Wizualizacja UI |
|--------|-----------------|
| **ENABLED** | Normalny wygląd, pełna interaktywność |
| **DISABLED** | Wyszarzony (opacity: 0.5), kursor „not-allowed", tooltip z przyczyną |
| **FUTURE** | Niewidoczny w produkcji, opcjonalnie z badge „Coming Soon" w dev mode |

### 20.4. Tabela przykładów statusów funkcji

| Funkcja | Status | Uzasadnienie |
|---------|--------|--------------|
| Load Flow Analysis | ENABLED | Podstawowa funkcjonalność |
| Short-Circuit Analysis (IEC 60909) | ENABLED | Podstawowa funkcjonalność |
| Short-Circuit Analysis (ANSI/IEEE) | DISABLED | Wymaga licencji rozszerzonej |
| Transient Stability Analysis | FUTURE | Zaplanowane na Q3 2026 |
| Arc Flash Analysis | FUTURE | Zaplanowane na Q4 2026 |
| Export to PDF | ENABLED | Podstawowa funkcjonalność |
| Export to PowerFactory format | DISABLED | Wymaga licencji Premium |
| Export to ETAP format | FUTURE | Zaplanowane na Q2 2026 |
| Real-time SCADA integration | DISABLED | Wymaga modułu SCADA Gateway |
| Multi-user collaboration | FUTURE | Zaplanowane na 2027 |
| Offline mode | ENABLED | Podstawowa funkcjonalność |
| Cloud sync | DISABLED | Wymaga subskrypcji Cloud |
| Protection Coordination | ENABLED | Podstawowa funkcjonalność |
| Relay Settings Optimization | FUTURE | Zaplanowane na Q3 2026 |
| Cable Sizing Calculator | ENABLED | Podstawowa funkcjonalność |
| Harmonic Analysis | FUTURE | Zaplanowane na Q4 2026 |

### 20.5. Wymagania dla DISABLED funkcji (BINDING)

| Wymaganie | Typ | Opis |
|-----------|-----|------|
| Widoczność | MUST | Funkcja DISABLED jest widoczna, ale nieaktywna |
| Tooltip | MUST | Tooltip wyjaśnia przyczynę wyłączenia |
| Call-to-action | SHOULD | Link do strony licencji / upgrade |
| Brak ukrywania | MUST | Funkcja nigdy nie jest ukrywana „dla uproszczenia" |
| Spójność | MUST | Wygląd DISABLED jest spójny w całym UI |

### 20.6. Feature Flags (wewnętrzne)

Statusy funkcji są kontrolowane przez **feature flags**:

| Flag | Wartość | Efekt |
|------|---------|-------|
| `feature.scada.enabled` | `true/false` | SCADA integration |
| `feature.ansi_sc.enabled` | `true/false` | ANSI Short-Circuit |
| `feature.cloud_sync.enabled` | `true/false` | Cloud synchronization |
| `feature.dev_mode` | `true/false` | Pokaż FUTURE features |

---

## 21. NON-GOALS UI CORE

### 21.1. Definicja Non-Goals

Niniejsza sekcja jawnie definiuje **funkcjonalności wykluczane z zakresu UI CORE** MV-DESIGN-PRO. Wykluczenie z UI CORE nie oznacza wykluczenia z produktu — oznacza, że dana funkcjonalność należy do innej warstwy lub modułu.

### 21.2. Lista Non-Goals UI CORE

| Non-Goal | Uzasadnienie | Gdzie należy |
|----------|--------------|--------------|
| **Logika obliczeniowa** | UI CORE prezentuje wyniki, nie oblicza | Solver Layer (Backend) |
| **Walidacja modelu sieci** | UI CORE nie sprawdza poprawności topologii | Model Validation Layer |
| **Persystencja danych** | UI CORE nie zarządza zapisem/odczytem | Data Layer (Backend) |
| **Autoryzacja użytkowników** | UI CORE nie weryfikuje uprawnień | Auth Layer |
| **Szyfrowanie danych** | UI CORE nie szyfruje | Security Layer |
| **Synchronizacja z SCADA** | UI CORE nie komunikuje się z systemami SCADA | SCADA Gateway Module |
| **Generowanie raportów (logika)** | UI CORE inicjuje eksport, nie generuje PDF | Report Engine |
| **Obliczenia real-time** | UI CORE nie wykonuje obliczeń na żywo | Real-time Engine |
| **Zarządzanie licencjami** | UI CORE sprawdza status, nie zarządza | License Manager |
| **Backup/Restore** | UI CORE nie zarządza kopiami zapasowymi | Data Management Layer |

### 21.3. Granice odpowiedzialności UI CORE

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UI CORE SCOPE                               │
├─────────────────────────────────────────────────────────────────────┤
│ ✅ Prezentacja danych                                               │
│ ✅ Nawigacja użytkownika                                            │
│ ✅ Interakcja (klik, drag, edit)                                    │
│ ✅ Wizualizacja wyników                                             │
│ ✅ Decision Support (PASS/FAIL/WARNING)                             │
│ ✅ Eksport (inicjacja)                                              │
│ ✅ Filtrowanie, sortowanie, wyszukiwanie                            │
│ ✅ Synchronizacja selekcji między panelami                          │
│ ✅ Responsywność (desktop/tablet/mobile)                            │
│ ✅ Accessibility (WCAG 2.1 AA)                                      │
├─────────────────────────────────────────────────────────────────────┤
│ ❌ Logika biznesowa                                                 │
│ ❌ Obliczenia elektryczne                                           │
│ ❌ Walidacja danych wejściowych (poza walidacją formularzy)         │
│ ❌ Komunikacja z systemami zewnętrznymi                             │
│ ❌ Zarządzanie stanem aplikacji (poza UI state)                     │
│ ❌ Autoryzacja / Autentykacja                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 21.4. Konsekwencje Non-Goals

| Non-Goal | Konsekwencja dla UI CORE |
|----------|--------------------------|
| Logika obliczeniowa w Backend | UI CORE wywołuje API, czeka na wyniki |
| Autoryzacja w Auth Layer | UI CORE otrzymuje informację o uprawnieniach, nie decyduje |
| Persystencja w Data Layer | UI CORE wywołuje „save", nie zarządza plikami |
| SCADA w osobnym module | UI CORE nie wie o połączeniu SCADA, wyświetla dane jak inne |

### 21.5. Anti-patterns (FORBIDDEN)

| Anti-pattern | Dlaczego FORBIDDEN |
|--------------|-------------------|
| Obliczenia w UI | Narusza separation of concerns |
| Bezpośredni dostęp do bazy danych z UI | Narusza architekturę warstwową |
| Hardcoded limity normatywne w UI | Limity należą do Norma Engine |
| Logika walidacji modelu w UI | Walidacja należy do Model Layer |
| Zarządzanie sesjami użytkowników w UI | Należy do Auth Layer |

---

## 22. KONTRAKTY MIĘDZY WARSTWAMI UI

### 22.1. Definicja kontraktów międzywarstwowych

Kontrakty między warstwami UI definiują **interfejsy komunikacji** między komponentami architektury MV-DESIGN-PRO. Każdy kontrakt jest **BINDING** i nie może być naruszany.

### 22.2. Kontrakt CORE ↔ RESULTS

**Kierunek:** RESULTS → CORE (jednokierunkowy)

```
┌─────────────────┐         ┌─────────────────┐
│    RESULTS      │────────▶│    UI CORE      │
│    LAYER        │         │                 │
│                 │         │  • Prezentacja  │
│  • Solver LF    │         │  • Wizualizacja │
│  • Solver SC    │         │  • Nawigacja    │
│  • Raw Data     │         │  • Eksport      │
│                 │         │                 │
└─────────────────┘         └─────────────────┘
```

**Interfejs kontraktu:**

| Element | Typ | Opis |
|---------|-----|------|
| `ResultSet` | Object | Zestaw wyników dla Analysis/Run |
| `ResultSet.analysis_type` | Enum | LF, SC, PROOF |
| `ResultSet.run_id` | UUID | Identyfikator Run |
| `ResultSet.timestamp` | DateTime | Czas uruchomienia |
| `ResultSet.status` | Enum | SUCCESS, FAILED, PARTIAL |
| `ResultSet.elements[]` | Array | Lista wyników per element |
| `ResultSet.elements[].id` | String | ID elementu |
| `ResultSet.elements[].type` | Enum | BUS, LINE, TRAFO, ... |
| `ResultSet.elements[].values{}` | Object | Wartości wynikowe |
| `ResultSet.elements[].status` | Enum | PASS, FAIL, WARNING, INFO, UNKNOWN |

**Gwarancje RESULTS → CORE:**

| Gwarancja | Opis |
|-----------|------|
| Kompletność | Wszystkie elementy z wynikami są w ResultSet |
| Immutability | ResultSet nie zmienia się po dostarczeniu |
| Status per element | Każdy element ma obliczony status |
| Jednostki | Wartości zawsze z jednostką (kV, kA, MW, ...) |

**Obowiązki CORE:**

| Obowiązek | Opis |
|-----------|------|
| Prezentacja zgodna z ResultSet | CORE nie modyfikuje wartości |
| Obsługa wszystkich statusów | CORE obsługuje PASS, FAIL, WARNING, INFO, UNKNOWN |
| Obsługa FAILED Run | CORE wyświetla komunikat błędu |

### 22.3. Kontrakt CORE ↔ PROOF

**Kierunek:** PROOF ↔ CORE (dwukierunkowy)

```
┌─────────────────┐         ┌─────────────────┐
│     PROOF       │◀───────▶│    UI CORE      │
│     LAYER       │         │                 │
│                 │         │  • Prezentacja  │
│  • P11 Engine   │────────▶│  • Inspector    │
│  • Compliance   │         │  • Proof Panel  │
│  • Audit Trail  │         │  • Export PDF   │
│                 │◀────────│                 │
│                 │ Request │  • Trigger      │
└─────────────────┘         └─────────────────┘
```

**Interfejs kontraktu (PROOF → CORE):**

| Element | Typ | Opis |
|---------|-----|------|
| `ProofDocument` | Object | Dokument dowodowy P11 |
| `ProofDocument.element_id` | String | ID elementu |
| `ProofDocument.norma` | String | Norma (IEC 60909, PN-EN 50160, ...) |
| `ProofDocument.compliance_status` | Enum | COMPLIANT, NON_COMPLIANT, PARTIAL |
| `ProofDocument.checks[]` | Array | Lista sprawdzeń |
| `ProofDocument.checks[].criterion` | String | Kryterium normy |
| `ProofDocument.checks[].value` | Number | Wartość obliczona |
| `ProofDocument.checks[].limit` | Number | Limit normatywny |
| `ProofDocument.checks[].margin` | Percent | Margines do limitu |
| `ProofDocument.checks[].status` | Enum | PASS, FAIL, WARNING |
| `ProofDocument.audit_trail[]` | Array | Historia obliczeń |

**Interfejs kontraktu (CORE → PROOF):**

| Element | Typ | Opis |
|---------|-----|------|
| `ProofRequest` | Object | Żądanie wygenerowania Proof |
| `ProofRequest.element_id` | String | ID elementu |
| `ProofRequest.run_id` | UUID | Identyfikator Run |
| `ProofRequest.norma` | String | Żądana norma |
| `ProofRequest.format` | Enum | JSON, PDF |

**Gwarancje PROOF → CORE:**

| Gwarancja | Opis |
|-----------|------|
| Kompletność | Wszystkie sprawdzenia normatywne |
| Audytowalność | Pełny audit trail |
| Formatowanie | PDF gotowy do druku |
| Spójność | Zgodność z ResultSet |

### 22.4. Kontrakt CORE ↔ SLD

**Kierunek:** CORE ↔ SLD (dwukierunkowy)

```
┌─────────────────┐         ┌─────────────────┐
│      SLD        │◀───────▶│    UI CORE      │
│     LAYER       │         │                 │
│                 │         │  • Selekcja     │
│  • CAD Layer    │────────▶│  • Context Bar  │
│  • SCADA Layer  │         │  • Inspector    │
│  • Overlay      │         │  • Navigation   │
│                 │◀────────│                 │
│                 │ Events  │  • Events       │
└─────────────────┘         └─────────────────┘
```

**Interfejs kontraktu (SLD → CORE):**

| Element | Typ | Opis |
|---------|-----|------|
| `SLD.onElementClick(element_id)` | Event | Kliknięcie w element |
| `SLD.onElementHover(element_id)` | Event | Hover nad elementem |
| `SLD.onSelectionChange(element_ids[])` | Event | Zmiana selekcji |
| `SLD.onViewportChange(bounds)` | Event | Zmiana widoku (pan/zoom) |
| `SLD.onLayerToggle(layer, visible)` | Event | Włączenie/wyłączenie warstwy |

**Interfejs kontraktu (CORE → SLD):**

| Element | Typ | Opis |
|---------|-----|------|
| `SLD.setSelection(element_ids[])` | Command | Ustaw selekcję |
| `SLD.highlightElement(element_id, style)` | Command | Podświetl element |
| `SLD.clearHighlights()` | Command | Usuń podświetlenia |
| `SLD.setOverlayData(data)` | Command | Ustaw dane overlay (wyniki) |
| `SLD.setLayerVisibility(layer, visible)` | Command | Zmień widoczność warstwy |
| `SLD.zoomToElement(element_id)` | Command | Przybliż do elementu |
| `SLD.zoomToFit()` | Command | Dopasuj widok do całości |

**Gwarancje SLD → CORE:**

| Gwarancja | Opis |
|-----------|------|
| Event consistency | Każdy klik/hover generuje event |
| Element ID validity | ID zawsze poprawne (z modelu) |
| Bounds accuracy | Viewport bounds dokładne |

**Gwarancje CORE → SLD:**

| Gwarancja | Opis |
|-----------|------|
| Valid element IDs | CORE wysyła tylko istniejące ID |
| Style consistency | Style zgodne z Design System |
| Performance | Overlay data zoptymalizowane |

### 22.5. Macierz zależności kontraktów

| Warstwa | RESULTS | PROOF | SLD | MODEL | AUTH |
|---------|---------|-------|-----|-------|------|
| **UI CORE** | ← odczyt | ↔ odczyt/żądanie | ↔ events/commands | ← odczyt | ← odczyt |
| **RESULTS** | — | → dostarcza | → dostarcza | ← odczyt | — |
| **PROOF** | ← odczyt | — | — | ← odczyt | — |
| **SLD** | ← odczyt | — | — | ← odczyt | — |

### 22.6. Obsługa błędów w kontraktach

| Scenariusz | Odpowiedzialność | Reakcja UI CORE |
|------------|------------------|-----------------|
| RESULTS zwraca błąd | RESULTS Layer | Wyświetl komunikat błędu, ukryj tabele wyników |
| PROOF niedostępny | PROOF Layer | Wyświetl „Proof unavailable", ukryj zakładkę Proof |
| SLD nie odpowiada | SLD Layer | Wyświetl placeholder, pozwól na nawigację Tree |
| MODEL niepoprawny | MODEL Layer | Wyświetl listę błędów, zablokuj obliczenia |
| AUTH timeout | AUTH Layer | Przekieruj do logowania |

### 22.7. Wersjonowanie kontraktów

| Kontrakt | Wersja | Kompatybilność |
|----------|--------|----------------|
| CORE ↔ RESULTS | 1.0 | Breaking changes wymagają migracji |
| CORE ↔ PROOF | 1.0 | Breaking changes wymagają migracji |
| CORE ↔ SLD | 1.0 | Breaking changes wymagają migracji |

---

## 23. CHANGELOG

| Wersja | Data | Zmiany |
|--------|------|--------|
| **1.0** | 2026-01-31 | Definicja bazowa |
| **1.1** | 2026-01-31 | Dodano sekcje: Decision Support Layer (19), Status Funkcji UI (20), Non-Goals UI CORE (21), Kontrakty między warstwami UI (22) |

---

**KONIEC DOKUMENTU**
