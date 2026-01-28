# MV-DESIGN-PRO — Dokumentacja UI (INDEX)

**Status**: CANONICAL
**Wersja**: 1.0
**Data**: 2026-01-28

---

## 1. CEL DOKUMENTU

Niniejszy dokument stanowi **indeks wszystkich kontraktów UI** w repozytorium MV-DESIGN-PRO.

Każdy kontrakt jest **BINDING** (wiążący) dla implementacji UI.

---

## 2. KONTRAKTY UI — PHASE 1.z (UI Eksploracji Wyników i Inspekcji Elementów)

### 2.1. Results Browser

**Plik:** [`docs/ui/RESULTS_BROWSER_CONTRACT.md`](./ui/RESULTS_BROWSER_CONTRACT.md)

**Opis:** Hierarchiczna eksploracja wyników obliczeń (Project → Case → Snapshot → Analysis → Target).

**Kluczowe funkcje:**
- Drzewo wyników (hierarchia),
- Tabele wyników (sortowanie, filtrowanie),
- Porównanie Case/Snapshot (Delta view),
- Eksport do CSV, Excel, PDF.

---

### 2.2. Element Inspector

**Plik:** [`docs/ui/ELEMENT_INSPECTOR_CONTRACT.md`](./ui/ELEMENT_INSPECTOR_CONTRACT.md)

**Opis:** Inspekcja dowolnego elementu sieci (Bus, Line, Trafo, Source, Protection).

**Kluczowe funkcje:**
- 6 zakładek: Overview, Parameters, Results, Contributions, Limits, Proof (P11),
- Multi-case view (wyniki dla wszystkich Case'ów w jednej tabeli),
- Eksport Proof (P11) do PDF.

---

### 2.3. Expert Modes

**Plik:** [`docs/ui/EXPERT_MODES_CONTRACT.md`](./ui/EXPERT_MODES_CONTRACT.md)

**Opis:** Tryby eksperckie (Operator, Designer, Analyst, Auditor) — dostosowanie UI do roli użytkownika.

**Kluczowe funkcje:**
- NO SIMPLIFICATION RULE (brak ukrywania danych),
- Domyślne rozwinięcia i widoczność sekcji zależne od trybu,
- Customizacja trybów (opcjonalnie).

---

### 2.4. Global Context Bar

**Plik:** [`docs/ui/GLOBAL_CONTEXT_BAR.md`](./ui/GLOBAL_CONTEXT_BAR.md)

**Opis:** Kontekst zawsze widoczny (sticky top bar) — Project, Case, Snapshot, Analysis, Norma, Expert Mode, Element, Timestamp.

**Kluczowe funkcje:**
- Sticky top bar (zawsze widoczny przy scrollowaniu),
- Drukowany w nagłówku PDF (przy eksporcie raportów, dowodów P11),
- Dropdown menu dla przełączania kontekstu.

---

### 2.5. UI ETAP / PowerFactory Parity

**Plik:** [`docs/ui/UI_ETAP_POWERFACTORY_PARITY.md`](./ui/UI_ETAP_POWERFACTORY_PARITY.md)

**Opis:** Macierz feature-by-feature: MV-DESIGN-PRO vs ETAP vs PowerFactory.

**Kluczowe wyniki:**
- 47 FULL PARITY features,
- 35 SUPERIOR features,
- 1 PARTIAL feature,
- 0 NO features.

**Ocena końcowa:** **MV-DESIGN-PRO UI ≥ ETAP UI**, **MV-DESIGN-PRO UI ≥ PowerFactory UI** ✅

---

## 3. KONTRAKTY UI — PHASE 2.x (UI PF++ — PowerFactory++ Parity)

### 3.1. SLD Render Layers

**Plik:** [`docs/ui/SLD_RENDER_LAYERS_CONTRACT.md`](./ui/SLD_RENDER_LAYERS_CONTRACT.md)

**Opis:** Rozdział semantyk renderingu SLD — CAD (statyczny schemat) vs SCADA (runtime monitoring).

**Kluczowe funkcje:**
- **SLD_CAD_LAYER:** statyczny, drukowany, zgodny z normami IEC 61082, IEEE 315,
- **SLD_SCADA_LAYER:** dynamiczny, runtime, kolory semantyczne, animacje przepływu mocy,
- **Tryby pracy:** CAD Mode, SCADA Mode, Hybrid Mode (konfigurowalne nakładki).

**Zakazy:**
- Mieszanie semantyk warstw (parametry katalogowe w SCADA, wyniki runtime w CAD),
- Eksport SCADA bez warstwy CAD.

---

### 3.2. Topology Tree

**Plik:** [`docs/ui/TOPOLOGY_TREE_CONTRACT.md`](./ui/TOPOLOGY_TREE_CONTRACT.md)

**Opis:** Hierarchiczna eksploracja struktury sieci (Project → Station → Voltage Level → Elements).

**Kluczowe funkcje:**
- Drzewo topologii (hierarchia),
- Synchronizacja selekcji z SLD i Element Inspector,
- Filtrowanie (typ elementu, napięcie, strefa),
- Wyszukiwanie (nazwa regex, ID).

**Zakazy:**
- Przechowywanie danych topologii w Topology Tree (tylko odczyt z NetworkModel),
- Brak synchronizacji z SLD.

---

### 3.3. Switching State View

**Plik:** [`docs/ui/SWITCHING_STATE_VIEW_CONTRACT.md`](./ui/SWITCHING_STATE_VIEW_CONTRACT.md)

**Opis:** Eksploracja stanów łączeniowych przełączników (OPEN/CLOSED) + identyfikacja izolowanych wysp (Islands).

**Kluczowe funkcje:**
- **Switch List:** tabela wszystkich przełączników (ID, Name, Type, State, From Bus, To Bus),
- **Island View:** algorytmiczna identyfikacja izolowanych wysp (connected components),
- **Switching Scenario Manager:** symulacja wpływu operacji łączeniowych na spójność sieci,
- **Wizualizacja Islands na SLD:** kolorowanie tła Bus (każda Island = inny kolor).

**Zakazy:**
- Permanentna zmiana stanów przełączników bez zapisu jako Snapshot,
- Automatyczne uruchamianie solverów (LF, SC) po Toggle.

---

### 3.4. SC Node Results

**Plik:** [`docs/ui/SC_NODE_RESULTS_CONTRACT.md`](./ui/SC_NODE_RESULTS_CONTRACT.md)

**Opis:** Wyniki zwarciowe WYŁĄCZNIE per BUS (węzłowo-centryczne).

**Kluczowe funkcje:**
- **Tabela SC:** Bus ID, Bus Name, Fault Type, Ik_max, Ik_min, ip, Ith, Sk, Status,
- **Element Inspector (Bus):** zakładka Results → sekcja Short-Circuit Results + Contributions,
- **SLD Overlay:** nakładka SC tylko na Bus (Ik_max [kA], Status kolor).

**Zakazy (FUNDAMENTALNE):**
- Prezentacja wyników SC „na linii" (linia to impedancja, nie węzeł),
- Prezentacja wyników SC „na transformatorze" (transformator to impedancja, nie węzeł),
- Używanie terminologii „fault current in line" w UI.

---

### 3.5. Catalog Browser

**Plik:** [`docs/ui/CATALOG_BROWSER_CONTRACT.md`](./ui/CATALOG_BROWSER_CONTRACT.md)

**Opis:** Przeglądanie katalogów typów elementów (LineType, TrafoType, SwitchType, SourceType) + relacja Type → Instances.

**Kluczowe funkcje:**
- **Type Category List:** Line Types, Cable Types, Transformer Types, Switch Types, Source Types,
- **Type List:** tabela typów (Type ID, Type Name, Manufacturer, Rating, Instances Count),
- **Type Details:** zakładki (Overview, Parameters, Instances, Technical Data),
- **Zarządzanie katalogiem (Designer Mode):** dodawanie, edycja, usuwanie typów.

**Zakazy:**
- Edycja typów w trybie Operator / Analyst (tylko Designer),
- Usuwanie typu z instancjami (Instances > 0).

---

### 3.6. Case Comparison UI

**Plik:** [`docs/ui/CASE_COMPARISON_UI_CONTRACT.md`](./ui/CASE_COMPARISON_UI_CONTRACT.md)

**Opis:** Porównanie dwóch lub trzech Case'ów (Case A vs Case B vs Case C) + wizualizacja różnic (Delta).

**Kluczowe funkcje:**
- **Case Selector:** wybór Case A (baseline), Case B (comparison), Case C (optional),
- **Comparison Table:** Delta (B - A), Delta %, Status Change (IMPROVED, REGRESSED, NO_CHANGE),
- **SLD Overlay:** wizualizacja różnic na SLD (ΔV [%], ΔI [%], kolory zielony/czerwony),
- **Eksport:** PDF (tabela + SLD Overlay + legenda), Excel (wszystkie kolumny + summary).

**Zakazy:**
- Porównanie Case'ów bez wyników (walidacja obowiązkowa),
- Brak filtra "Show Only Changes".

---

## 4. PARITY SUMMARY

### 4.1. Phase 1.z (UI Eksploracji Wyników i Inspekcji Elementów)

| Feature                          | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|----------------------------------|------------|--------------|---------------|--------------|
| Results Browser                  | ✓          | ✓            | ✓             | ✅ FULL      |
| Element Inspector                | ✓          | ✓            | ✓             | ✅ FULL      |
| Expert Modes                     | ✗          | ✗            | ✓             | ➕ SUPERIOR  |
| Global Context Bar               | ✗          | ✗            | ✓             | ➕ SUPERIOR  |

### 4.2. Phase 2.x (UI PF++ — PowerFactory++ Parity)

| Feature                          | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|----------------------------------|------------|--------------|---------------|--------------|
| SLD Render Layers (CAD vs SCADA) | ✗          | ✓            | ✓             | ✅ FULL      |
| Topology Tree (hierarchia)       | ✓          | ✓            | ✓             | ✅ FULL      |
| Switching State View (Islands)   | ✓          | ✓            | ✓             | ✅ FULL      |
| SC Results per BUS (węzłowo-centryczne) | ✓   | ✓            | ✓             | ✅ FULL      |
| Catalog Browser (Type Library)   | ✓          | ✓            | ✓             | ✅ FULL      |
| Case Comparison (A vs B vs C)    | ✗          | ✓            | ✓             | ✅ FULL      |
| **Hybrid Mode (konfigurowalne nakładki)** | ✗ | ✗            | ✓             | ➕ SUPERIOR  |

**Ocena końcowa:** **MV-DESIGN-PRO UI ≥ PowerFactory UI** w zakresie eksploracji i kontroli UI ✅

---

## 5. WERSJONOWANIE I ZMIANY

- Wersja 1.0: definicja bazowa (2026-01-28),
- Zmiany w indeksie wymagają aktualizacji wersji i code review,
- Dodanie nowych kontraktów UI: aktualizacja INDEX.md + ARCHITECTURE.md + PLANS.md.

---

**KONIEC INDEKSU**
