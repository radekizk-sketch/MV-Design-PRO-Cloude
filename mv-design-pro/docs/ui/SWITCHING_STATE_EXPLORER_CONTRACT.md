# SWITCHING STATE EXPLORER — Kontrakt UI (PF-grade)

**Wersja:** 1.0
**Status:** CANONICAL (BINDING)
**Typ fazy:** DOC-ONLY (bez modyfikacji kodu, solverów, API, DB)
**Zakres:** PHASE 2.x.3
**Utworzono:** 2026-01-28

**Referencje (BINDING):**
- `SYSTEM_SPEC.md` — definicje NetworkModel, Switch, Case
- `ARCHITECTURE.md` — warstwa Application (NOT-A-SOLVER rule)
- `AGENTS.md` — governance, zasady normatywne
- `PLANS.md` — Phase 2.x.3
- `docs/ui/powerfactory_ui_parity.md` — tryby pracy, lifecycle
- `docs/ui/sld_rules.md` — integracja SLD
- `docs/ui/TOPOLOGY_TREE_CONTRACT.md` (jeśli istnieje) — synchronizacja selekcji
- `docs/ui/RESULTS_BROWSER_CONTRACT.md` — integracja z wynikami
- `docs/ui/ELEMENT_INSPECTOR_CONTRACT.md` — integracja z inspektorem

---

## 1. Executive Summary

**Switching State Explorer** to narzędzie UI klasy **DIgSILENT PowerFactory / ETAP** dla eksploracji stanów łączeniowych aparatury i ich wpływu na topologię efektywną sieci.

**Zakres funkcjonalny:**
- Przeglądanie i edycja (na poziomie UI-kontraktu) stanów aparatury OPEN/CLOSED
- Ocena spójności i łączności sieci (algorytmiczna identyfikacja wysp — Islands)
- Wizualizacja wpływu stanów na topologię efektywną
- Integracja z SLD, Element Inspector, Results Browser, Topology Tree

**NOT-A-SOLVER rule:** Switching State Explorer **NIE wykonuje obliczeń fizycznych** (prądy, napięcia). Obliczenia pozostają w warstwie Solver. Explorer wykonuje wyłącznie analizę topologiczną (graph traversal, connected components).

**MAX DATA, MAX CONTROL:** Brak uproszczeń. Wszystkie aparaty widoczne, wszystkie stany dostępne. Użytkownik decyduje o filtrowaniu.

---

## 2. Definicje terminów (BINDING)

### 2.1 Switching Apparatus (Aparat łączeniowy)

**Definicja:**
Element topologiczny bez impedancji (PF-rule), zmieniający efektywną topologię sieci poprzez stan OPEN/CLOSED.

**Typy aparatów (zgodnie z NetworkModel):**
| Typ | Identyfikator | Opis | Impedancja |
|-----|---------------|------|-----------|
| **Breaker** | BREAKER | Wyłącznik mocy | ZERO (PF-rule) |
| **Disconnector** | DISCONNECTOR | Odłącznik | ZERO (PF-rule) |
| **Load Switch** | LOAD_SWITCH | Łącznik obciążenia | ZERO (PF-rule) |
| **Fuse** | FUSE | Bezpiecznik | ZERO (PF-rule) |

**INVARIANT (PF-rule):** Aparat łączeniowy **NIE MA** impedancji (R, X, B). Zmienia **wyłącznie** topologię (węzły połączone/rozłączone).

---

### 2.2 Effective Topology (Topologia efektywna)

**Definicja:**
Graf sieci po uwzględnieniu:
- stanów aparatów łączeniowych (OPEN → krawędź usunięta, CLOSED → krawędź obecna),
- flag `in_service` (False → element usunięty z grafu).

**Reguły konstrukcji:**
1. Bazowy graf: wszystkie Bus + wszystkie Branch z `in_service = True`
2. Aparaty w stanie **CLOSED**: krawędź między `from_bus` i `to_bus` obecna (impedancja ZERO)
3. Aparaty w stanie **OPEN**: krawędź usunięta (Bus rozłączone)
4. Elementy z `in_service = False`: całkowicie usunięte z grafu

**MUST:** Effective Topology jest obliczana algorytmicznie (graph traversal) po każdej zmianie stanu aparatu.

---

### 2.3 Island (Wyspa)

**Definicja:**
Spójna składowa grafu efektywnego (connected component w sensie graph theory).

**Właściwości:**
- Każdy Bus należy do dokładnie jednej Island (lub jest izolowany — Island 1-elementowa)
- Bus w obrębie Island są połączone ścieżką topologiczną (istnieje path bez przejścia przez aparat OPEN)
- Różne Islands są rozłączone (nie istnieje path między nimi)

**Identyfikacja (algorytmiczna):**
Connected components detection (BFS/DFS na grafie Effective Topology).

**NOT-A-SOLVER rule:** Island **NIE jest** wynikiem obliczeń elektrycznych. To wynik graph traversal.

---

### 2.4 Energized vs De-energized (interpretacja UI)

**Definicja (semantyka UI, NIE fizyka):**

| Stan | Definicja | Interpretacja (nie-binding) |
|------|-----------|----------------------------|
| **Energized** | Island zawiera co najmniej 1 Source z `in_service = True` | Wyspa "zasilona" (potencjalnie pod napięciem) |
| **De-energized** | Island **nie zawiera** żadnego Source | Wyspa "odłączona od zasilania" |

**CRITICAL:** Status Energized/De-energized **NIE JEST** wynikiem obliczeń fizycznych (Power Flow, Short Circuit). To **interpretacja topologiczna**.

**FORBIDDEN:**
- Używanie wyniku Power Flow (napięcia U) do określenia statusu Energized (to byłoby SOLVER logic)
- Prezentowanie statusu Energized jako "gwarancji napięcia" (wymaga PF)

**ALLOWED:**
- Prezentowanie statusu Energized jako "flagi obecności źródła w wyspie" (interpretacja topologiczna)
- Wizualne ostrzeżenie: "Island de-energized (brak Source) — Power Flow może nie zbiegać"

---

## 3. Funkcje UI (PF-grade)

### 3.1 Widok „Switching Explorer" — pierwszy klasowy panel UI

**Cel:** Dedykowany panel dla eksploracji stanów łączeniowych i topologii efektywnej.

**Layout (równorzędny z SLD, Results Browser, Topology Tree):**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SWITCHING STATE EXPLORER                                [X Close]       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐ │
│ │ FILTRY                                                            │ │
│ │  Typ aparatu:   [All ▼] [BREAKER] [DISCONNECTOR] [LOAD_SWITCH]   │ │
│ │  Stan:          [All ▼] [OPEN] [CLOSED]                          │ │
│ │  In Service:    [All ▼] [True] [False]                           │ │
│ │  Feeder/Bay:    [All ▼] [Feeder-01] [Bay-A] ...                  │ │
│ │  Island ID:     [All ▼] [Island-1] [Island-2] ...                │ │
│ │  Szukaj (name): [_____________________] 🔍                        │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐ │
│ │ LISTA APARATÓW (250 elementów, posortowane: Name ↑)              │ │
│ ├─────┬────────────┬──────┬──────────┬──────────┬──────────┬───────┤ │
│ │  ID │ Name       │ Type │ State    │ From Bus │ To Bus   │Island │ │
│ ├─────┼────────────┼──────┼──────────┼──────────┼──────────┼───────┤ │
│ │ 001 │ CB-01      │ BRK  │ ● CLOSED │ Bus-01   │ Bus-02   │ Isl-1 │ │
│ │ 002 │ DS-01      │ DISC │ ○ OPEN   │ Bus-02   │ Bus-03   │ —     │ │
│ │ 003 │ CB-02      │ BRK  │ ● CLOSED │ Bus-03   │ Bus-04   │ Isl-2 │ │
│ │ ... │ ...        │ ...  │ ...      │ ...      │ ...      │ ...   │ │
│ └─────┴────────────┴──────┴──────────┴──────────┴──────────┴───────┘ │
│   [Toggle State] [Batch Operations ▼] [Restore Normal State]         │
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐ │
│ │ TOPOLOGY CHECKS (pre-solver validation)                          │ │
│ │  ✓ Liczba Islands:       3                                        │ │
│ │  ⚠ Islands bez Source:   2 (Island-2, Island-3)                  │ │
│ │  ⚠ Busy odłączone:       5 (Bus-10, Bus-11, Bus-12, ...)         │ │
│ │  ✓ Dangling elements:    0                                        │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐ │
│ │ OPCJE WIDOKU                                                      │ │
│ │  [ ] Pokaż tylko aparaty OPEN                                     │ │
│ │  [ ] Pokaż tylko aparaty out-of-service                           │ │
│ │  [x] Podświetl Islands na SLD                                     │ │
│ │  [x] Synchronizuj wybór z SLD/Tree                                │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Print / Export ▼] [Help]                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Funkcje MUST:**
1. **Lista aparatów**: wszystkie Switch z modelu, sortowalne, filtrowalne
2. **Szybkie wyszukiwanie**: po nazwie/ID (regex support)
3. **Toggle State**: przełączenie OPEN ↔ CLOSED (z potwierdzeniem, jeśli Result = FRESH)
4. **Batch Operations**: menu do grupowej zmiany stanów (zaznaczenie wielu + akcja)
5. **Restore Normal State**: powrót do stanu bazowego Case (Case.baseline_switching_state)
6. **Topology Checks**: sekcja walidacji (liczba Islands, Islands bez Source, dangling buses)
7. **Opcje widoku**: filtry szybkie (tylko OPEN, tylko out-of-service)
8. **Synchronizacja**: wybór aparatu w Explorerze → podświetlenie na SLD + fokus w Element Inspector
9. **Print/Export**: wydruk listy aparatów + Island summary (PDF/Excel)

---

### 3.2 Integracja z SLD (BINDING)

**Zasada (1:1 z SLD_UI_CONTRACT.md):** Stany aparatów na SLD są **zawsze jednoznaczne** (symbol + kolor stanu).

#### 3.2.1 Symbolika aparatów na SLD

| Stan | Symbol SLD | Kolor |
|------|-----------|-------|
| **CLOSED** | ──●── (symbol zamknięty) | Czarny (normalny) |
| **OPEN** | ── ── (symbol otwarty, przerwa) | Niebieski (stan otwarty) |
| **out-of-service** | ┄┄ ┄┄ (przerywany, szary) | Szary (wyłączony z obliczeń) |

**MUST:** Przełączenie aparatu (OPEN ↔ CLOSED) w Switching Explorer → natychmiastowa zmiana symbolu na SLD (bez odświeżania strony).

---

#### 3.2.2 Natychmiastowa zmiana Effective Topology

**INVARIANT:** Zmiana stanu aparatu → przeliczenie Effective Topology → aktualizacja Islands → aktualizacja overlay SLD.

**Pipeline (synchroniczny, < 100 ms):**
```
User: Toggle CB-01 (CLOSED → OPEN)
      │
      ▼
NetworkModel.update(Switch.state = OPEN)
      │
      ▼
EffectiveTopologyCalculator.recalculate()  ← graph traversal (NOT solver)
      │
      ▼
IslandDetector.detect_islands()  ← connected components (NOT solver)
      │
      ▼
SLD.update_overlay(Islands)  ← podświetlenie wysp (kolorowanie tła Bus)
      │
      ▼
TopologyChecks.refresh()  ← aktualizacja Topology Checks (liczba wysp)
```

**FORBIDDEN:**
- Opóźnione przeliczenie topologii (użytkownik musi kliknąć "Refresh")
- Oczekiwanie na uruchomienie solvera (PF, SC) do aktualizacji Islands
- Przechowywanie "starych" Islands po zmianie stanu aparatu

---

#### 3.2.3 Overlay Islands na SLD

**Cel:** Wizualizacja podziału sieci na wyspy (Islands) jako overlay SCADA, **NIE CAD**.

**MUST:** Overlay Islands działa w trybie **SCADA** (zgodnie z SLD_RENDER_LAYERS_CONTRACT.md, jeśli istnieje).

**Warianty wizualizacji (implementacja wybieralna):**

| Wariant | Opis | Przykład |
|---------|------|----------|
| **Kolorowanie tła Bus** | Każda Island = inny kolor tła | Island-1: zielony, Island-2: niebieski, Island-3: żółty |
| **Obrys wyspy** | Linia obrysowa wokół Bus należących do Island | Linia przerywana, grubość 2px |
| **Etykieta Island** | Etykieta tekstowa na SLD | "Island-1 (5 Bus, 1 Source)" |

**MUST:** Legenda kolorów Islands widoczna w rogu SLD (lub w panelu Switching Explorer).

**Przykład overlay (ASCII):**
```
┌─────────────────────────────────────────────────────────────┐
│ SLD (Effective Topology + Islands overlay)                  │
│                                                              │
│   ╔═══════════════════════════════╗                         │
│   ║ Island-1 (zielony)            ║                         │
│   ║  Bus-01 ════╦════ Bus-02      ║                         │
│   ║             ║                 ║                         │
│   ║          [Source]             ║                         │
│   ╚═════════════╩═════════════════╝                         │
│                 ║                                            │
│                 ║  CB-OPEN (aparat OPEN — granica wysp)     │
│                 ║                                            │
│   ╔═════════════╩═════════════════╗                         │
│   ║ Island-2 (niebieski)          ║                         │
│   ║  Bus-03 ════╦════ Bus-04      ║                         │
│   ║             ║                 ║                         │
│   ║         (brak Source)         ║  ← ostrzeżenie          │
│   ╚═════════════════════════════════╝                       │
│                                                              │
│ Legenda:                                                     │
│  ■ Island-1 (Energized, 1 Source)                           │
│  ■ Island-2 (De-energized, 0 Source)                        │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.3 Integracja z Results Browser (BINDING)

**Zasada (invalidation semantics):** Zmiana stanów aparatów **MAY** invalidate Results (jeśli obowiązuje kontrakt invalidation).

#### 3.3.1 Invalidation Rule (zgodnie z powerfactory_ui_parity.md)

**MUST:** Po zmianie stanu aparatu (OPEN ↔ CLOSED):
1. Status wyników Case przechodzi w stan **OUTDATED** (jeśli wyniki istniały)
2. Użytkownik widzi banner ostrzeżenia:
   ```
   ⚠ Wyniki obliczeń są NIEAKTUALNE (zmieniono topologię).
      [Uruchom ponownie obliczenia] [Anuluj zmiany]
   ```
3. Results Browser pokazuje ikonę **OUTDATED** przy Case

**FORBIDDEN:**
- Cicha zmiana topologii bez sygnalizacji wpływu na wyniki
- Automatyczne uruchomienie solverów po zmianie stanu aparatu (użytkownik decyduje)
- Usunięcie wyników bez ostrzeżenia

---

#### 3.3.2 Widoczność wyników w Results Browser

**MUST:** Results Browser pokazuje:
- **Listę Case'ów** z statusem wyników (NONE / FRESH / OUTDATED)
- **Filtr**: "Pokaż tylko Case z FRESH results"
- **Akcja**: "Mark all Cases as OUTDATED" (po zmianie stanów aparatów)

**Przykład (ASCII):**
```
┌─────────────────────────────────────────────────────────────┐
│ RESULTS BROWSER                                              │
│                                                              │
│ Case: SC-MAX                                                 │
│   Status: ⚠ OUTDATED (topologia zmieniona: 2026-01-28)      │
│   Last Run: 2026-01-27 14:30                                 │
│   [Re-run Calculation] [View Outdated Results]              │
│                                                              │
│ Case: SC-MIN                                                 │
│   Status: ✓ FRESH                                            │
│   Last Run: 2026-01-28 09:15                                 │
│   [View Results]                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.4 Integracja z Topology Tree (jeśli istnieje, zgodnie z Phase 2.x.2)

**Zasada (SINGLE GLOBAL FOCUS):** Wybór aparatu w Switching Explorer synchronizuje Topology Tree, SLD, Element Inspector.

#### 3.4.1 Synchronizacja selekcji (4-widokowa)

**MUST:**
1. Klik na aparacie w Switching Explorer → podświetlenie w Topology Tree (rozwinięcie ścieżki)
2. Klik na aparacie w Topology Tree → podświetlenie w Switching Explorer (scroll do wiersza)
3. Klik na aparacie na SLD → podświetlenie w Switching Explorer + Tree
4. Otwarcie Element Inspector (zakładka Switch) → odczyt Global Focus

**Przykład (ASCII — synchronizacja):**
```
┌──────────────────────────┬─────────────────────────────────────┐
│ TOPOLOGY TREE            │ SWITCHING EXPLORER                  │
│                          │                                     │
│  Project-01              │  ID   Name    Type  State           │
│   └─ Station-A           │  ──────────────────────────────     │
│       └─ VoltageLevel-15 │  002  CB-02   BRK   ● CLOSED  ←──┐ │
│           ├─ Bus-01      │                                  │ │
│           ├─ Bus-02      │ [podświetlony wiersz]            │ │
│           ├─ CB-01       │                                  │ │
│           ├─ CB-02  ←────┼──────────────────────────────────┘ │
│           └─ Line-01     │                                     │
└──────────────────────────┴─────────────────────────────────────┘
          ▲                            │
          │                            │
          └─────── Global Focus = CB-02 (synchronizacja)
```

---

#### 3.4.2 Stan aparatu w Topology Tree

**MUST:** Topology Tree pokazuje:
- Ikonę stanu aparatu: **●** (CLOSED) / **○** (OPEN)
- Przynależność do Island (opcjonalnie, jako tooltip)

**Przykład (ASCII — Topology Tree):**
```
Topology Tree:
  Project-01
   └─ Station-A
       └─ VoltageLevel-15
           ├─ Bus-01 (Island-1)
           ├─ CB-01 ● (CLOSED, Island-1)
           ├─ DS-01 ○ (OPEN, — boundary)
           ├─ Bus-02 (Island-2)
           └─ CB-02 ● (CLOSED, Island-2)
```

---

### 3.5 Integracja z Element Inspector (BINDING)

**Cel:** Element Inspector pokazuje szczegóły aparatu (zakładka "Switch").

#### 3.5.1 Zakładki Element Inspector dla Switch

**MUST:** Element Inspector dla Switch zawiera zakładki:

| Zakładka | Zawartość |
|----------|-----------|
| **Overview** | ID, Name, Type, State, From Bus, To Bus, Island ID, In Service |
| **Parameters** | Parametry techniczne (jeśli istnieją: rated_current, breaking_capacity) |
| **Switching History** | Historia zmian stanu (timestamp, user, OPEN → CLOSED) |
| **Topology Impact** | Wpływ na Islands (Before/After toggle) |
| **Results** | Brak (Switch nie ma wyników solverów — to aparat bez impedancji) |

**Przykład (ASCII — Element Inspector):**
```
┌─────────────────────────────────────────────────────────────┐
│ ELEMENT INSPECTOR: Switch CB-01                              │
├─────────────────────────────────────────────────────────────┤
│ [Overview] [Parameters] [Switching History] [Topology Impact]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ OVERVIEW                                                     │
│  ID:            CB-01                                        │
│  Name:          Circuit Breaker 01                           │
│  Type:          BREAKER                                      │
│  State:         ● CLOSED                                     │
│  From Bus:      Bus-01 (15 kV)                               │
│  To Bus:        Bus-02 (15 kV)                               │
│  Island ID:     Island-1                                     │
│  In Service:    ✓ True                                       │
│                                                              │
│  [Toggle State: OPEN ↔ CLOSED]                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

#### 3.5.2 Akcja Toggle State w Element Inspector

**MUST:**
- Przycisk [Toggle State] w Element Inspector → zmiana stanu Switch
- Natychmiastowa aktualizacja Effective Topology + Islands
- Synchronizacja z Switching Explorer (wiersz zaktualizowany)
- Synchronizacja z SLD (symbol zaktualizowany)

**FORBIDDEN:**
- Toggle State bez ostrzeżenia o invalidacji wyników (jeśli Result = FRESH)
- Brak synchronizacji po Toggle

---

### 3.6 Walidacja topologii (pre-solver, NOT-A-SOLVER)

**Cel:** Switching Explorer musi pokazywać sekcję **Topology Checks** (pre-solver validation).

#### 3.6.1 Topology Checks — lista sprawdzeń

**MUST:** Topology Checks zawiera:

| Check | Opis | Status |
|-------|------|--------|
| **Liczba Islands** | Liczba izolowanych wysp (connected components) | Informacyjny (liczba) |
| **Islands bez Source** | Lista Islands bez żadnego Source | ⚠ WARNING |
| **Busy odłączone (dangling)** | Bus bez żadnego połączenia (degree = 0) | ⚠ WARNING |
| **Source odłączony (dangling)** | Source na Bus bez połączeń | ⚠ WARNING |
| **Islands z wieloma Source** | Jedna Island z > 1 Source (potential conflict) | Informacyjny |

**Przykład (ASCII — Topology Checks):**
```
┌─────────────────────────────────────────────────────────────┐
│ TOPOLOGY CHECKS (pre-solver validation)                     │
│                                                              │
│  ✓ Liczba Islands:         3                                │
│  ⚠ Islands bez Source:     Island-2, Island-3               │
│      (Power Flow może nie zbiegać)                          │
│  ⚠ Busy odłączone:         5 (Bus-10, Bus-11, Bus-12, ...) │
│  ✓ Dangling elements:      0                                │
│  ℹ Islands z > 1 Source:   Island-1 (2 Source)              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**NOT-A-SOLVER rule:** Topology Checks **NIE wykonuje** obliczeń fizycznych. To wyłącznie graph analysis (degree, connected components, Source presence).

---

#### 3.6.2 FORBIDDEN w Topology Checks

**ZABRONIONE:**
- Wykonywanie obliczeń prądów, napięć w Topology Checks (to Solver Layer)
- Prezentowanie statusu "Energized" jako wyniku Power Flow (to interpretacja topologiczna, NIE wynik PF)
- Automatyczna "naprawa" topologii (przełączanie aparatów bez zgody użytkownika)
- Ukrywanie ostrzeżeń (wszystkie WARNING widoczne)

---

### 3.7 Tryby pracy Switching Explorer (MAX DANYCH, MAX KONTROLA)

**Zasada (PowerFactory-grade):** Brak uproszczeń. Wszystkie aparaty widoczne, wszystkie opcje dostępne.

#### 3.7.1 Panele rozwijane i modale

**ALLOWED (opcjonalne rozszerzenia):**

| Panel/Modal | Opis | Dostępność |
|-------------|------|-----------|
| **Batch Switching** | Symulacja wielu przełączeń jako zestaw zmian (Apply All / Revert All) | Dropdown menu "Batch Operations" |
| **Switching Sequence** | Kolejność operacji łączeniowych (opis, bez automatycznego wykonywania) | Modal "Define Sequence" |
| **Restore Normal State** | Powrót do stanu bazowego Case (Case.baseline_switching_state) | Przycisk w Switching Explorer |

**MUST:** Wszystkie operacje grupowe wymagają **potwierdzenia** (confirmation dialog):
```
┌─────────────────────────────────────────────────────────────┐
│ POTWIERDZENIE                                                │
│                                                              │
│  Czy chcesz zastosować 12 zmian stanów aparatów?            │
│   - CB-01: CLOSED → OPEN                                    │
│   - CB-02: OPEN → CLOSED                                    │
│   - DS-01: CLOSED → OPEN                                    │
│   ...                                                        │
│                                                              │
│  ⚠ Uwaga: Ta operacja invaliduje wyniki obliczeń.           │
│                                                              │
│  [Apply All] [Cancel]                                       │
└─────────────────────────────────────────────────────────────┘
```

---

#### 3.7.2 FORBIDDEN — uproszczenia

**ZABRONIONE:**
- "Basic Mode" (ukrywający aparaty out-of-service)
- Automatyczne filtrowanie aparatów (użytkownik decyduje)
- Ukrywanie ostrzeżeń "Islands bez Source" (dla uproszczenia UI)
- "Auto-repair topology" (automatyczne przełączanie aparatów)

---

### 3.8 Wydruk / Raport (drukowany PDF)

**Zasada (Print-First Contract, zgodnie z SLD_UI_CONTRACT.md):** Ekran = PDF (bez utraty informacji).

#### 3.8.1 Zawartość wydruku

**MUST:** Wydruk Switching Explorer zawiera:

| Sekcja | Zawartość |
|--------|-----------|
| **Nagłówek** | Project Name, Case Name, Snapshot Timestamp, User |
| **Lista aparatów** | Tabela: ID, Name, Type, State, From Bus, To Bus, Island ID |
| **Island Summary** | Tabela: Island ID, Number of Bus, Number of Source, Energized (Yes/No) |
| **Topology Checks** | Lista ostrzeżeń (Islands bez Source, dangling Bus) |
| **Różnice vs baseline** | Tabela aparatów z różnymi stanami względem Case.baseline_switching_state |

**Przykład (ASCII — wydruk PDF, strona 1):**
```
┌─────────────────────────────────────────────────────────────┐
│                  SWITCHING STATE REPORT                      │
│                                                              │
│  Project:       MV-Network-Demo                              │
│  Case:          SC-MAX                                       │
│  Snapshot:      2026-01-28 14:30:00                          │
│  User:          Jan Kowalski                                 │
│  Generated:     2026-01-28 14:35:12                          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LISTA APARATÓW (250 elementów)                              │
│                                                              │
│  ID    Name       Type  State    From Bus  To Bus   Island  │
│  ───────────────────────────────────────────────────────────│
│  001   CB-01      BRK   ● CLOSED Bus-01    Bus-02   Isl-1   │
│  002   DS-01      DISC  ○ OPEN   Bus-02    Bus-03   —       │
│  003   CB-02      BRK   ● CLOSED Bus-03    Bus-04   Isl-2   │
│  ...   ...        ...   ...      ...       ...      ...     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ISLAND SUMMARY                                              │
│                                                              │
│  Island  Buses  Sources  Energized                           │
│  ────────────────────────────────────────                    │
│  Isl-1     15      1       Yes                               │
│  Isl-2     10      0       No   ← ⚠ brak Source              │
│  Isl-3      5      0       No   ← ⚠ brak Source              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TOPOLOGY CHECKS                                             │
│                                                              │
│  ⚠ Islands bez Source: Isl-2, Isl-3                         │
│  ⚠ Busy odłączone: 5 (Bus-10, Bus-11, Bus-12, ...)          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  RÓŻNICE WZGLĘDEM BASELINE                                   │
│                                                              │
│  ID    Name       Baseline   Current   Change               │
│  ──────────────────────────────────────────────              │
│  002   DS-01      CLOSED     OPEN      ● → ○                │
│  007   CB-05      OPEN       CLOSED    ○ → ●                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Scenariusze użycia (Use Cases)

### 4.1 Scenariusz poprawny: Eksploracja stanów aparatów

**Aktorzy:** Operator, Designer, Analyst

**Cel:** Sprawdzenie aktualnych stanów aparatów i identyfikacja wysp.

**Kroki:**
1. Użytkownik otwiera Switching Explorer (menu: Tools → Switching State Explorer)
2. Widzi listę wszystkich aparatów z filtrami (Type, State, Feeder, Island)
3. Klika na aparat CB-01 → podświetlenie na SLD + fokus w Element Inspector
4. Widzi sekcję Topology Checks: 3 Islands, 2 bez Source
5. Widzi overlay Islands na SLD (kolorowanie tła Bus)
6. Eksportuje raport do PDF (lista aparatów + Island summary)

**Rezultat:** Użytkownik ma pełny wgląd w stany aparatów i topologię efektywną.

---

### 4.2 Scenariusz poprawny: Przełączenie aparatu i ocena wpływu

**Aktorzy:** Designer, Analyst

**Cel:** Zmiana stanu aparatu i ocena wpływu na Islands.

**Kroki:**
1. Użytkownik otwiera Switching Explorer
2. Filtruje aparaty: Type = BREAKER, State = CLOSED
3. Wybiera CB-02 (CLOSED)
4. Klika [Toggle State] → CB-02 przechodzi w stan OPEN
5. System:
   - Przelicza Effective Topology (graph traversal)
   - Wykrywa nowe Islands (Island-1 rozdziela się na Island-1a i Island-1b)
   - Aktualizuje overlay na SLD (nowe kolory wysp)
   - Aktualizuje Topology Checks (liczba wysp: 3 → 4)
   - Pokazuje banner: ⚠ Wyniki obliczeń OUTDATED
6. Użytkownik widzi w Element Inspector (zakładka Topology Impact):
   ```
   Before: CB-02 CLOSED → Island-1 (15 Bus, 1 Source)
   After:  CB-02 OPEN   → Island-1a (8 Bus, 1 Source) + Island-1b (7 Bus, 0 Source)
   ```
7. Użytkownik zapisuje zmianę lub cofa (Revert)

**Rezultat:** Użytkownik ocenił wpływ zmiany stanu aparatu na topologię bez uruchamiania solverów.

---

### 4.3 Scenariusz poprawny: Batch switching (operacje grupowe)

**Aktorzy:** Designer

**Cel:** Symulacja scenariusza operacyjnego (np. wyłączenie feedera).

**Kroki:**
1. Użytkownik otwiera Switching Explorer
2. Zaznacza aparaty (Ctrl+Click): CB-01, CB-02, DS-03 (wszystkie CLOSED)
3. Klika [Batch Operations ▼] → [Open Selected Switches]
4. System pokazuje modal potwierdzenia:
   ```
   Czy otworzyć 3 aparaty?
     - CB-01: CLOSED → OPEN
     - CB-02: CLOSED → OPEN
     - DS-03: CLOSED → OPEN

   ⚠ Ta operacja invaliduje wyniki obliczeń.

   [Apply] [Cancel]
   ```
5. Użytkownik klika [Apply]
6. System:
   - Zmienia stany aparatów
   - Przelicza Effective Topology
   - Aktualizuje Islands (1 → 4 wyspy)
   - Pokazuje banner OUTDATED

**Rezultat:** Użytkownik wykonał operację grupową i ocenił jej wpływ.

---

### 4.4 Scenariusz poprawny: Restore Normal State (powrót do bazowego)

**Aktorzy:** Operator, Designer

**Cel:** Przywrócenie stanu bazowego po eksperymentach.

**Kroki:**
1. Użytkownik eksperymentował ze stanami aparatów (10 zmian)
2. Klika [Restore Normal State]
3. System pokazuje modal:
   ```
   Czy przywrócić stan bazowy Case?

   Zmiany do cofnięcia:
     - CB-01: OPEN → CLOSED (baseline)
     - CB-02: CLOSED → OPEN (baseline)
     - ...

   [Restore] [Cancel]
   ```
4. Użytkownik klika [Restore]
5. System przywraca Case.baseline_switching_state

**Rezultat:** Sieć wraca do stanu bazowego.

---

### 4.5 Scenariusz FORBIDDEN: Automatyczne uruchomienie solvera

**ZABRONIONE:**

**Kroki (NIE implementować):**
1. Użytkownik przełącza aparat CB-01 (CLOSED → OPEN)
2. System automatycznie uruchamia Power Flow (bez zgody użytkownika)
3. Użytkownik widzi nowe wyniki (nie wie, że solver został uruchomiony)

**Dlaczego FORBIDDEN:**
- Naruszenie zasady "Explicit Calculate Step" (powerfactory_ui_parity.md)
- Użytkownik traci kontrolę nad obliczeniami
- Ryzyko nieoczekiwanych wyników (np. solver nie zbiega)

**Poprawne podejście:**
- System pokazuje banner: ⚠ Wyniki OUTDATED
- Użytkownik decyduje, kiedy uruchomić solver

---

### 4.6 Scenariusz FORBIDDEN: Prezentacja "prądów w aparacie"

**ZABRONIONE:**

**Kroki (NIE implementować):**
1. Użytkownik otwiera Switching Explorer
2. Widzi kolumnę "Current [A]" w liście aparatów
3. System pokazuje prądy przepływające przez aparat (z wyników Power Flow)

**Dlaczego FORBIDDEN:**
- Aparat łączeniowy **NIE MA** impedancji (PF-rule)
- "Prąd w aparacie" to interpretacja fizyczna (wymaga Power Flow)
- Switching Explorer to warstwa topologiczna (NOT-A-SOLVER)

**Poprawne podejście:**
- "Prądy w aparacie" pokazywane w Results Browser (po uruchomieniu PF)
- Switching Explorer pokazuje **wyłącznie** stan topologiczny (OPEN/CLOSED)

---

### 4.7 Scenariusz FORBIDDEN: "Auto-repair topology"

**ZABRONIONE:**

**Kroki (NIE implementować):**
1. System wykrywa Island bez Source (Island-2)
2. System automatycznie przełącza aparat DS-01 (OPEN → CLOSED) aby połączyć Islands
3. Użytkownik widzi zmianę bez swojego działania

**Dlaczego FORBIDDEN:**
- Naruszenie zasady "user control" (ARCHITECTURE.md)
- Ryzyko nieoczekiwanych zmian topologii
- Użytkownik traci pewność, co zostało zmienione

**Poprawne podejście:**
- System pokazuje ostrzeżenie: ⚠ Island-2 bez Source
- System **SUGERUJE** akcję: "Rozważ zamknięcie DS-01 aby połączyć Islands"
- Użytkownik decyduje, czy zastosować sugestię

---

## 5. Przykłady ASCII (Binding Illustrations)

### 5.1 Przykład 1: Dwie wyspy (Islands) — ring otwarty

**Topologia:**
- Bus-01, Bus-02, Bus-03, Bus-04 (ring)
- Aparat CB-01 (Bus-01 ↔ Bus-02): CLOSED
- Aparat CB-02 (Bus-02 ↔ Bus-03): CLOSED
- Aparat CB-03 (Bus-03 ↔ Bus-04): **OPEN** ← punkt otwarcia ringu
- Aparat CB-04 (Bus-04 ↔ Bus-01): CLOSED
- Source-01 na Bus-01

**Effective Topology:**
```
       [Source-01]
           │
         Bus-01
        ╱      ╲
  CB-01 ●      ● CB-04
      ╱          ╲
  Bus-02        Bus-04
      │            │
  CB-02 ●      ○ CB-03 (OPEN — granica wysp)
      │            │
  Bus-03 ─ ─ ─ ─ Bus-04 (nie połączone topologicznie)

Islands:
  Island-1: {Bus-01, Bus-02, Bus-03, Bus-04} → wszystkie połączone (ring zamknięty przez CB-01, CB-02, CB-04)

Uwaga: CB-03 OPEN, ale Bus-04 jest połączony z Bus-01 przez CB-04 (ring zamknięty)
→ Tylko JEDNA wyspa (Island-1)
```

**CRITICAL INSIGHT:** Ring otwarty (jeden aparat OPEN) **NIE tworzy** dwóch wysp, jeśli ring jest zamknięty przez inną ścieżkę. Islands zależą od **wszystkich** ścieżek topologicznych.

---

### 5.2 Przykład 2: Dwie wyspy (Islands) — feeder odłączony

**Topologia:**
- Bus-01 (z Source-01)
- Bus-02 (połączony z Bus-01 przez CB-01: CLOSED)
- Bus-03 (połączony z Bus-02 przez DS-01: **OPEN** ← boundary)
- Bus-04 (połączony z Bus-03 przez CB-02: CLOSED)

**Effective Topology:**
```
  [Source-01]
      │
    Bus-01
      │
  CB-01 ● (CLOSED)
      │
    Bus-02
      ║
      ║  DS-01 ○ (OPEN — granica wysp)
      ║
    Bus-03
      │
  CB-02 ● (CLOSED)
      │
    Bus-04

Islands:
  Island-1: {Bus-01, Bus-02} — Energized (zawiera Source-01)
  Island-2: {Bus-03, Bus-04} — De-energized (brak Source)
```

**Switching Explorer pokazuje:**
```
┌─────────────────────────────────────────────────────────────┐
│ TOPOLOGY CHECKS                                              │
│                                                              │
│  ✓ Liczba Islands:       2                                  │
│  ⚠ Islands bez Source:   Island-2 (Bus-03, Bus-04)          │
│                         Power Flow może nie zbiegać!         │
│  ✓ Dangling elements:    0                                  │
└─────────────────────────────────────────────────────────────┘
```

**SLD Overlay (Islands):**
```
┌─────────────────────────────────────────────────────────────┐
│ SLD                                                          │
│                                                              │
│   ╔═══════════════════╗                                     │
│   ║ Island-1 (■ zielony) — Energized                        │
│   ║   [Source-01]     ║                                     │
│   ║       │           ║                                     │
│   ║     Bus-01        ║                                     │
│   ║       │           ║                                     │
│   ║   CB-01 ●         ║                                     │
│   ║       │           ║                                     │
│   ║     Bus-02        ║                                     │
│   ╚═══════╩═══════════╝                                     │
│           ║                                                  │
│        DS-01 ○ (OPEN — boundary, czerwona linia przerywana) │
│           ║                                                  │
│   ╔═══════╩═══════════╗                                     │
│   ║ Island-2 (■ niebieski) — De-energized ⚠                 │
│   ║     Bus-03        ║                                     │
│   ║       │           ║                                     │
│   ║   CB-02 ●         ║                                     │
│   ║       │           ║                                     │
│   ║     Bus-04        ║                                     │
│   ╚═══════════════════╝                                     │
│                                                              │
│ Legenda:                                                     │
│  ■ Island-1 (Energized, 1 Source, 2 Bus)                    │
│  ■ Island-2 (De-energized, 0 Source, 2 Bus) ← ostrzeżenie   │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.3 Przykład 3: Ring otwarty w dwóch miejscach → dwie wyspy

**Topologia:**
- Bus-01 (z Source-01)
- Bus-02, Bus-03, Bus-04 (ring)
- Aparat CB-01 (Bus-01 ↔ Bus-02): CLOSED
- Aparat CB-02 (Bus-02 ↔ Bus-03): **OPEN** ← pierwszy punkt otwarcia
- Aparat CB-03 (Bus-03 ↔ Bus-04): **OPEN** ← drugi punkt otwarcia
- Aparat CB-04 (Bus-04 ↔ Bus-01): CLOSED

**Effective Topology:**
```
  [Source-01]
      │
    Bus-01
   ╱      ╲
CB-01●   ●CB-04
  │        │
Bus-02  Bus-04
  ║        ║
  ║CB-02○○CB-03 (oba OPEN)
  ║        ║
  Bus-03 (izolowany)

Islands:
  Island-1: {Bus-01, Bus-02, Bus-04} — Energized (zawiera Source-01)
  Island-2: {Bus-03} — De-energized (izolowany, brak ścieżki do Bus-01)
```

**Switching Explorer pokazuje:**
```
┌─────────────────────────────────────────────────────────────┐
│ TOPOLOGY CHECKS                                              │
│                                                              │
│  ✓ Liczba Islands:       2                                  │
│  ⚠ Islands bez Source:   Island-2 (Bus-03)                  │
│  ⚠ Bus izolowany:        Bus-03 (brak połączeń topologicznych)│
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Regr Compliance Checklist (Implementacja zgodna z kontraktem, jeśli:)

**Implementacja zgodna z SWITCHING_STATE_EXPLORER_CONTRACT.md, jeśli:**

- [ ] **Switching Explorer panel** zaimplementowany jako równorzędny widok (z SLD, Results Browser, Topology Tree)
- [ ] **Lista aparatów** pokazuje wszystkie Switch z filtrami (Type, State, In Service, Feeder, Island)
- [ ] **Szybkie wyszukiwanie** po nazwie/ID (regex support)
- [ ] **Toggle State** (OPEN ↔ CLOSED) z natychmiastową aktualizacją Effective Topology + Islands
- [ ] **Effective Topology** przeliczana algorytmicznie (graph traversal, NOT solver) po każdej zmianie stanu
- [ ] **Islands** wykrywane algorytmicznie (connected components, NOT solver)
- [ ] **SLD overlay Islands** (kolorowanie tła Bus lub obrys wysp)
- [ ] **Topology Checks** pokazują: liczba Islands, Islands bez Source, dangling Bus (pre-solver validation)
- [ ] **Invalidation Rule**: zmiana stanu aparatu → Result status = OUTDATED (z bannerem ostrzeżenia)
- [ ] **Synchronizacja 4-widokowa**: wybór aparatu w Explorerze → podświetlenie SLD/Tree/Inspector
- [ ] **Element Inspector (Switch)**: zakładki Overview, Parameters, Switching History, Topology Impact
- [ ] **Batch Operations**: grupowa zmiana stanów (z potwierdzeniem)
- [ ] **Restore Normal State**: powrót do Case.baseline_switching_state
- [ ] **Print/Export**: wydruk listy aparatów + Island summary (PDF/Excel)
- [ ] **NOT-A-SOLVER rule**: Switching Explorer **NIE wykonuje** obliczeń fizycznych (prądy, napięcia)
- [ ] **FORBIDDEN: Auto-repair topology** — system **NIE przełącza** aparatów bez zgody użytkownika
- [ ] **FORBIDDEN: Prezentacja "prądów w aparacie"** — to wynik Power Flow, nie topologii
- [ ] **FORBIDDEN: Automatyczne uruchomienie solvera** po zmianie stanu aparatu

---

## 7. Terminologia i zgodność z PowerFactory

### 7.1 Mapowanie terminów PowerFactory → MV-DESIGN-PRO

| PowerFactory Term | MV-DESIGN-PRO Term | Opis |
|-------------------|--------------------|------|
| **Switch** | Switch | Aparat łączeniowy (BREAKER, DISCONNECTOR, LOAD_SWITCH, FUSE) |
| **Topology** | Effective Topology | Graf sieci po uwzględnieniu stanów aparatów i `in_service` |
| **Island** | Island | Spójna składowa grafu (connected component) |
| **Out of Service** | `in_service = False` | Element wyłączony z obliczeń |
| **Pre-calculation Check** | Topology Checks | Walidacja topologii przed uruchomieniem solvera |
| **Study Case** | Case | Przypadek obliczeniowy (konfiguracja + opcjonalnie wyniki) |

---

### 7.2 Zgodność z ETAP

| ETAP Feature | MV-DESIGN-PRO Equivalent | Status |
|--------------|--------------------------|--------|
| **Switching View** | Switching State Explorer | ✅ FULL |
| **Island Detection** | Island Detector (graph traversal) | ✅ FULL |
| **Topology Validator** | Topology Checks (pre-solver) | ✅ FULL |
| **Switch Status Overlay (SLD)** | SLD overlay Islands + switch symbols | ✅ FULL |
| **Batch Switching Operations** | Batch Operations (group toggle) | ✅ FULL |

---

## 8. Change Log

| Data | Wersja | Zmiany |
|------|--------|--------|
| 2026-01-28 | 1.0 | Utworzenie SWITCHING_STATE_EXPLORER_CONTRACT.md (Phase 2.x.3, DOC-ONLY) |

---

**KONIEC DOKUMENTU**

**STATUS:** CANONICAL (BINDING) — każda implementacja Switching State Explorer MUSI być zgodna z tym kontraktem.
