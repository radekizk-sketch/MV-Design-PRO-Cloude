# SWITCHING STATE VIEW CONTRACT

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-28
**Typ**: UI Contract — Normatywny

---

## 1. CEL I ZAKRES

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **Switching State View** — komponent UI MV-DESIGN-PRO, który:

- **eksploruje stany łączeniowe przełączników** (OPEN/CLOSED),
- **wizualizuje izolowane wyspy (islands) i spójność sieci**,
- **umożliwia analizę scenariuszy łączeniowych** (switching scenarios),
- **powiązuje stany łączeniowe z Case i Snapshot**,
- **osiąga parity z ETAP / DIgSILENT PowerFactory w zakresie analizy stanów łączeniowych**.

### 1.2. Zakres obowiązywania

- **BINDING** dla implementacji UI MV-DESIGN-PRO,
- aplikuje się do wszystkich widoków (SLD, Topology Tree, Results Browser),
- komponent MUST być dostępny w każdym trybie eksperckim (Operator, Designer, Analyst, Auditor),
- naruszenie kontraktu = regresja wymagająca hotfix.

---

## 2. DEFINICJA SWITCHING STATE VIEW

### 2.1. Cel

**Switching State View** to komponent UI, który:

- **wizualizuje stany wszystkich przełączników** w sieci (Switch, Breaker, Disconnector),
- **identyfikuje izolowane wyspy** (islands) w sieci,
- **umożliwia symulację zmian stanów** (switching operations),
- **wyświetla konsekwencje operacji łączeniowych** (wpływ na spójność sieci, wyniki LF/SC).

### 2.2. Różnica: Switching State View vs Topology Tree

| Aspekt                  | Switching State View                   | Topology Tree                        |
|-------------------------|----------------------------------------|--------------------------------------|
| **Cel**                 | Analiza stanów łączeniowych            | Nawigacja po topologii sieci         |
| **Hierarchia**          | Flat list przełączników (wszystkie poziomy razem) | Project → Station → VoltageLevel → Element |
| **Zawartość**           | Stany OPEN/CLOSED + islands            | Struktura fizyczna sieci             |
| **Filtrowanie**         | Po stanie (OPEN/CLOSED), po typie przełącznika | Po typie elementu, napięciu, strefie |
| **Symulacja**           | Umożliwia zmianę stanów (Toggle)       | Tylko odczyt                         |

---

## 3. STRUKTURA SWITCHING STATE VIEW (BINDING)

### 3.1. Panel główny

Switching State View **MUST** składać się z trzech sekcji:

1. **Switch List** (lista przełączników),
2. **Island View** (wizualizacja wysp),
3. **Switching Scenario Manager** (zarządzanie scenariuszami).

---

### 3.2. Sekcja: Switch List

#### 3.2.1. Tabela przełączników (BINDING)

Switch List **MUST** wyświetlać tabelę wszystkich przełączników z następującymi kolumnami:

| Kolumna               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `ID`                  | string     | MUST     | Unikalny identyfikator przełącznika       |
| `Name`                | string     | MUST     | Nazwa przełącznika                        |
| `Type`                | enum       | MUST     | BREAKER, DISCONNECTOR, LOAD_SWITCH, FUSE  |
| `State`               | enum       | MUST     | OPEN, CLOSED                              |
| `From Bus`            | string     | MUST     | Węzeł początkowy                          |
| `To Bus`              | string     | MUST     | Węzeł końcowy                             |
| `Voltage [kV]`        | float      | MUST     | Napięcie znamionowe                       |
| `I_nom [A]`           | float      | MAY      | Prąd znamionowy (dla CLOSED)              |
| `In Service`          | bool       | MUST     | Czy przełącznik jest w eksploatacji       |

#### 3.2.2. Kolorowanie wierszy (BINDING)

| Stan                  | Kolor tła                | Ikona          |
|-----------------------|--------------------------|----------------|
| **CLOSED**            | Zielony (#d4edda)        | ✅ (zamknięty) |
| **OPEN**              | Szary (#e9ecef)          | ⬜ (otwarty)   |
| **OUT_OF_SERVICE**    | Czerwony (#f8d7da)       | ❌ (wyłączony) |

#### 3.2.3. Sortowanie i filtrowanie (BINDING)

**MUST:**
- Sortować po dowolnej kolumnie (rosnąco / malejąco),
- Filtrować po State (OPEN, CLOSED, OUT_OF_SERVICE),
- Filtrować po Type (BREAKER, DISCONNECTOR, LOAD_SWITCH, FUSE),
- Filtrować po Voltage (110 kV, 15 kV, 0.4 kV).

---

### 3.3. Sekcja: Island View

#### 3.3.1. Definicja Island (wyspy)

**Island** to **izolowany fragment sieci** (connected component), który:

- zawiera grupę Bus połączonych przez CLOSED switches i branches,
- NIE ma połączenia elektrycznego z innymi Islands (wszystkie przełączniki między Islands są OPEN),
- MUST być identyfikowany algorytmicznie (graph traversal po NetworkGraph z uwzględnieniem stanów CLOSED/OPEN).

#### 3.3.2. Identyfikacja Islands (BINDING)

MV-DESIGN-PRO **MUST** identyfikować Islands algorytmicznie:

```
Algorithm: FindIslands(NetworkGraph, SwitchStates)
  1. Zbuduj graf topologii z uwzględnieniem tylko CLOSED switches i branches
  2. Uruchom BFS/DFS dla każdego nieodwiedzonego Bus
  3. Każda grupa Bus osiągalna w jednym przebiegu = 1 Island
  4. Zwróć listę Islands: [Island_1, Island_2, ..., Island_N]
```

**Przykład:**

- Sieć z 10 Bus,
- 2 switches OPEN (SW1, SW2),
- Identyfikacja: Island_1 (Bus 1-5), Island_2 (Bus 6-8), Island_3 (Bus 9-10).

#### 3.3.3. Tabela Islands (BINDING)

Island View **MUST** wyświetlać tabelę Islands:

| Kolumna               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Island ID`           | int        | MUST     | Numer wyspy (1, 2, 3, ...)                |
| `Island Name`         | string     | MAY      | Nazwa wyspy (user-defined)                |
| `Buses Count`         | int        | MUST     | Liczba Bus w wyspie                       |
| `Elements Count`      | int        | MUST     | Liczba wszystkich elementów w wyspie      |
| `Has Source`          | bool       | MUST     | Czy wyspa ma źródło (Grid, Generator)     |
| `Status`              | enum       | MUST     | ENERGIZED (z źródłem), ISOLATED (bez źródła) |

#### 3.3.4. Kolorowanie wierszy Islands (BINDING)

| Status                | Kolor tła                | Ikona          |
|-----------------------|--------------------------|----------------|
| **ENERGIZED**         | Zielony (#d4edda)        | ⚡ (zasilane)  |
| **ISOLATED**          | Czerwony (#f8d7da)       | 🚫 (odizolowane) |

#### 3.3.5. Wizualizacja Islands na SLD (BINDING)

SLD **MUST** wizualizować Islands poprzez:

- **kolorowanie tła Bus** w zależności od Island ID (każda Island = inny kolor),
- **boundary markers** (czerwona linia przerywana) między Islands (na miejscu OPEN switches),
- **legenda Islands** (lista kolorów + nazwy Islands).

**Przykład:**

- Island_1 (zasilany): Bus 1-5 mają tło zielone,
- Island_2 (odizolowany): Bus 6-8 mają tło czerwone,
- Przełącznik SW1 (OPEN) między Bus 5 i Bus 6: czerwona linia przerywana.

---

### 3.4. Sekcja: Switching Scenario Manager

#### 3.4.1. Cel

**Switching Scenario Manager** to komponent, który:

- **umożliwia tworzenie scenariuszy łączeniowych** (kombinacje stanów przełączników),
- **symuluje wpływ operacji łączeniowych** na spójność sieci i wyniki LF/SC,
- **zapisuje scenariusze jako Snapshots** (dla późniejszej analizy).

#### 3.4.2. Tworzenie scenariusza (BINDING)

Użytkownik **MUST** mieć możliwość:

1. **Wybrać przełączniki do zmiany** (multi-select z Switch List),
2. **Zmienić stany** (Toggle OPEN ↔ CLOSED),
3. **Podejrzeć konsekwencje** (preview Islands + status ENERGIZED/ISOLATED),
4. **Zapisać scenariusz jako Snapshot** (z nazwą i opisem).

**UI Flow:**

1. Kliknięcie przycisku "New Scenario",
2. Otwiera się dialog "Switching Scenario Editor":
   - lista przełączników z checkboxami,
   - przycisk "Toggle Selected" (OPEN ↔ CLOSED),
   - preview Islands (live update przy zmianie stanów),
3. Kliknięcie "Save as Snapshot" → nowy Snapshot w Case.

#### 3.4.3. Symulacja operacji łączeniowej (BINDING)

**Symulacja operacji łączeniowej** to **read-only preview** wpływu zmiany stanu przełączników na sieć:

- **NIE modyfikuje NetworkModel** (to tylko preview),
- **NIE uruchamia solverów** (tylko identyfikacja Islands),
- **Wyświetla preview:** liczba Islands, status ENERGIZED/ISOLATED, lista Bus w każdej Island.

**FORBIDDEN:**
- Automatyczne uruchamianie solverów (LF, SC) po zmianie stanu (użytkownik decyduje),
- Permanentna zmiana stanów bez zapisu jako Snapshot (musi być zapisana).

---

## 4. POWIĄZANIE Z CASE I SNAPSHOT

### 4.1. Stany łączeniowe w Case (BINDING)

**Case** przechowuje **referencję do Snapshot**, który zawiera:

- **stan NetworkModel** (Bus, Line, Trafo, Source, Load),
- **stany wszystkich przełączników** (Switch.state: OPEN/CLOSED).

**INVARIANT:**
- Zmiana stanu przełącznika **MUST** tworzyć nowy Snapshot (zachowanie oryginalnego stanu),
- **Case NIE MOŻE modyfikować NetworkModel** (tylko odczyt przez Snapshot).

### 4.2. Switching Scenario jako Snapshot Variant (BINDING)

**Switching Scenario** to **wariant Snapshot** z modyfikacjami stanów przełączników:

| Snapshot Type         | Opis                                      |
|-----------------------|-------------------------------------------|
| **Baseline**          | Stan bazowy (wszystkie stany zgodne z projektem) |
| **Switching Variant** | Wariant z modyfikacjami stanów przełączników (np. "SW1 OPEN, SW2 CLOSED") |

**Przykład:**

- Snapshot "Baseline" (SW1 CLOSED, SW2 CLOSED),
- Snapshot "Switching Variant A" (SW1 OPEN, SW2 CLOSED) → 2 Islands,
- Snapshot "Switching Variant B" (SW1 CLOSED, SW2 OPEN) → 2 Islands (inne).

---

## 5. PARITY Z ETAP / DIGSILENT POWERFACTORY

### 5.1. PowerFactory Parity

| Feature                          | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|----------------------------------|------------|--------------|---------------|--------------|
| Lista przełączników (Switch List) | ✓         | ✓            | ✓             | ✅ FULL      |
| Identyfikacja Islands (algorytmiczna) | ✓     | ✓            | ✓             | ✅ FULL      |
| Wizualizacja Islands na SLD      | ✓          | ✓            | ✓             | ✅ FULL      |
| Symulacja operacji łączeniowych (preview) | ✓ | ✓            | ✓             | ✅ FULL      |
| Zapisanie scenariusza jako Snapshot | ✗      | ✓            | ✓             | ✅ FULL      |
| Filtrowanie po stanie (OPEN/CLOSED) | ✓      | ✓            | ✓             | ✅ FULL      |
| Multi-select przełączników (Toggle batch) | ✗ | ✗            | ✓             | ➕ SUPERIOR  |

---

## 6. ACCESSIBILITY I UX

### 6.1. Keyboard Navigation

- **MUST** obsługiwać Space (Toggle stanu przełącznika dla zaznaczonego wiersza),
- **MUST** obsługiwać Ctrl+Click (multi-select przełączników),
- **MUST** obsługiwać Ctrl+T (Toggle Selected),
- **MUST** obsługiwać Enter (Preview Islands).

### 6.2. Screen Readers

- **MUST** zawierać ARIA labels dla wszystkich przełączników,
- **MUST** ogłaszać zmianę stanu przez screen reader ("Switch SW1 toggled to OPEN").

---

## 7. PERFORMANCE

### 7.1. Wymagania wydajnościowe (BINDING)

- Identyfikacja Islands dla sieci 1000 elementów **MUST** zajmować < 500 ms,
- Toggle stanu przełącznika **MUST** zajmować < 100 ms,
- Preview Islands (live update) **MUST** zajmować < 300 ms,
- **MUST** używać incremental graph update (tylko zmiany, nie pełne przeliczenie).

---

## 8. ZABRONIONE PRAKTYKI

### 8.1. FORBIDDEN

- **FORBIDDEN**: permanentna zmiana stanów przełączników bez zapisu jako Snapshot,
- **FORBIDDEN**: automatyczne uruchamianie solverów (LF, SC) po Toggle (użytkownik decyduje),
- **FORBIDDEN**: brak walidacji spójności sieci (Islands MUST być identyfikowane),
- **FORBIDDEN**: ukrywanie przełączników OUT_OF_SERVICE (wszystkie widoczne, filtr opcjonalny).

---

## 9. ZALEŻNOŚCI OD INNYCH KONTRAKTÓW

- **TOPOLOGY_TREE_CONTRACT.md**: Switching State View MUST być dostępny z Topology Tree (Context Menu: "Show Switching State"),
- **SLD_RENDER_LAYERS_CONTRACT.md**: Switching State View MUST wizualizować Islands na SLD (SCADA Layer),
- **CASE_COMPARISON_UI_CONTRACT.md**: porównanie scenariuszy łączeniowych (Switching Variant A vs B),
- **GLOBAL_CONTEXT_BAR.md**: Switching State View MUST wyświetlać aktywny Snapshot.

---

## 10. WERSJONOWANIE I ZMIANY

- Wersja 1.0: definicja bazowa (2026-01-28),
- Zmiany w kontrakcie wymagają aktualizacji wersji i code review,
- Breaking changes wymagają migracji UI i aktualizacji testów E2E.

---

**KONIEC KONTRAKTU**
