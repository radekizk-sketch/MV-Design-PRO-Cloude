# CATALOG BROWSER CONTRACT

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-28
**Typ**: UI Contract — Normatywny

---

## 1. CEL I ZAKRES

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **Catalog Browser** — komponent UI MV-DESIGN-PRO, który:

- **umożliwia przeglądanie katalogów typów PASYWNYCH elementów sieci** (LineType, CableType, TransformerType, SwitchType),
- **wyświetla relację Type → Instances** (które elementy sieci używają danego typu),
- **prezentuje pełne parametry katalogowe** (R/X/B, ratings, manufacturer),
- **umożliwia zarządzanie katalogiem** (dodawanie, edycja, usuwanie typów),
- **osiąga parity z ETAP / DIgSILENT PowerFactory w zakresie zarządzania katalogiem**.

**Paradygmat fundamentalny (BINDING):**

> **TYPE jest źródłem prawdy. INSTANCES są tylko użyciami.**

Catalog Browser realizuje model **Type-centric** zgodnie z praktyką ETAP / DIgSILENT PowerFactory:
- **TYPE** definiuje parametry katalogowe (R, X, B, I_nom, S_nom),
- **INSTANCE** (element w sieci) **odwołuje się** do TYPE i używa jego parametrów,
- Zmiana TYPE → automatyczna zmiana wszystkich INSTANCES (po potwierdzeniu użytkownika).

### 1.2. Zakres obowiązywania

- **BINDING** dla implementacji UI MV-DESIGN-PRO,
- aplikuje się do wszystkich trybów eksperckich (szczególnie Designer, Analyst),
- komponent MUST być dostępny niezależnie od widoku SLD,
- naruszenie kontraktu = regresja wymagająca hotfix.

### 1.3. Zakres katalogu (PASYWNE ELEMENTY TYLKO)

**Catalog Browser obejmuje WYŁĄCZNIE elementy pasywne sieci:**

| Kategoria             | Typ                     | Zakres parametrów                         |
|-----------------------|-------------------------|-------------------------------------------|
| **Line Types**        | LineType                | R, X, B, I_nom, I_max, conductor material |
| **Cable Types**       | CableType               | R, X, C, I_nom, I_max, voltage rating     |
| **Transformer Types** | TransformerType         | S_nom, V_prim, V_sec, u_k, P_fe, P_cu    |
| **Switch Types**      | SwitchType              | I_nom, I_breaking, type (breaker, disconnector) |

**FORBIDDEN (kategorie wykluczone):**

| Kategoria             | Powód wykluczenia                                           |
|-----------------------|-------------------------------------------------------------|
| **Source Types**      | Źródła (Grid, Generator, PV, FW, BESS) mają **parametry Case-dependent** (P_gen, Q_gen, U_setpoint), nie katalogowe |
| **Load Types**        | Obciążenia mają **parametry Case-dependent** (P_load, Q_load, profil czasowy), nie katalogowe |
| **Protection Types**  | Zabezpieczenia mają **parametry nastawcze** (I_set, t_trip, charakterystyki), nie katalogowe |

**Zasada (BINDING):**
- **Catalog Browser** zarządza wyłącznie **parametrami fizycznymi elementów pasywnych** (impedancje, ratinki),
- **NIE zarządza** parametrami generacji, obciążenia, nastaw zabezpieczeń,
- **NIE zarządza** parametrami Case-dependent (P, Q, U_setpoint).

---

## 2. DEFINICJA CATALOG BROWSER

### 2.1. Rola w architekturze

**Catalog Browser to WIDOK biblioteki typów (Type Library).**

**INVARIANT:**
- Catalog Browser **odczytuje typy z CatalogRepository** (read-only dla Operator/Analyst),
- Catalog Browser **umożliwia edycję typów** (tylko Designer Mode),
- Catalog Browser **NIE przechowuje danych** — to tylko interfejs do Catalog.

### 2.2. Różnica: Catalog Browser vs Topology Tree

| Aspekt                  | Catalog Browser                        | Topology Tree                        |
|-------------------------|----------------------------------------|--------------------------------------|
| **Cel**                 | Przeglądanie i edycja typów katalogowych | Nawigacja po topologii sieci         |
| **Hierarchia**          | Catalog → Type Category → Type → Instances | Project → Station → VoltageLevel → Element |
| **Zawartość**           | Parametry katalogowe (R, X, B, ratings) | Struktura fizyczna sieci (Bus, Line) |
| **Edycja**              | Dodawanie, edycja, usuwanie typów (Designer) | Brak (tylko odczyt)                  |
| **Relacja Type → Instance** | Wyświetlanie instancji używających typu | Brak                                 |

---

## 3. STRUKTURA CATALOG BROWSER (BINDING)

### 3.1. Panel główny

Catalog Browser **MUST** składać się z trzech sekcji:

1. **Type Category List** (lista kategorii typów),
2. **Type List** (lista typów w kategorii),
3. **Type Details** (szczegóły wybranego typu + lista instancji).

---

### 3.2. Sekcja: Type Category List

#### 3.2.1. Kategorie typów (BINDING)

**PASYWNE ELEMENTY TYLKO:**

| Kategoria             | Ikona      | Liczba typów (przykład) | Opis                                      |
|-----------------------|------------|-------------------------|-------------------------------------------|
| **Line Types**        | ─          | 25                      | Linie napowietrzne (overhead lines)       |
| **Cable Types**       | ═          | 15                      | Kable (underground cables)                |
| **Transformer Types** | ⚡          | 10                      | Transformatory (two-winding transformers) |
| **Switch Types**      | ⚙️          | 8                       | Aparatura łączeniowa (switching apparatus) |

**FORBIDDEN:**
- **Source Types** (Grid, Generator, PV, FW, BESS) — parametry Case-dependent, nie katalogowe,
- **Load Types** — parametry Case-dependent, nie katalogowe,
- **Protection Types** — parametry nastawcze, nie katalogowe.

#### 3.2.2. Interakcja

- Kliknięcie kategorii → otwarcie Type List (lista typów w tej kategorii),
- Domyślnie: **Line Types** (najpopularniejsza kategoria).

---

### 3.3. Sekcja: Type List

#### 3.3.1. Tabela typów (BINDING)

Type List **MUST** wyświetlać tabelę typów z następującymi kolumnami:

| Kolumna               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Type ID`             | UUID       | MUST     | Unikalny identyfikator typu               |
| `Type Name`           | string     | MUST     | Nazwa typu (np. "ACSR 185")               |
| `Manufacturer`        | string     | MAY      | Producent                                 |
| `Category`            | enum       | MUST     | LINE, CABLE, TRAFO, SWITCH, SOURCE        |
| `Rating`              | string     | MAY      | Rating (np. "I_nom 350 A", "S_nom 40 MVA") |
| `Instances Count`     | int        | MUST     | Liczba instancji używających tego typu   |
| `Created At`          | datetime   | MAY      | Data dodania typu do katalogu            |

#### 3.3.2. Sortowanie i filtrowanie (BINDING)

**MUST:**
- Sortować po dowolnej kolumnie (rosnąco / malejąco),
- Filtrować po Manufacturer (dropdown menu),
- Wyszukiwać po Type Name (regex).

#### 3.3.3. Kolorowanie wierszy (BINDING)

| Stan                  | Kolor tła                | Ikona          |
|-----------------------|--------------------------|----------------|
| **Używany (Instances > 0)** | Biały (domyślny)   | -              |
| **Nieużywany (Instances = 0)** | Szary (#f8f9fa) | ⚠️ (ostrzeżenie) |

---

### 3.4. Sekcja: Type Details

#### 3.4.1. Zakładki (BINDING)

Type Details **MUST** zawierać następujące zakładki:

1. **Overview** (przegląd podstawowy),
2. **Parameters** (parametry katalogowe),
3. **Instances** (lista instancji używających tego typu),
4. **Technical Data** (dane techniczne, manufacturer, certyfikaty).

---

#### 3.4.2. Zakładka: Overview

**Zawartość (BINDING):**

| Pole                  | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Type Name`           | string     | MUST     | Nazwa typu                                |
| `Category`            | enum       | MUST     | LINE, CABLE, TRAFO, SWITCH, SOURCE        |
| `Manufacturer`        | string     | MAY      | Producent                                 |
| `Model`               | string     | MAY      | Model                                     |
| `Year`                | int        | MAY      | Rok produkcji                             |
| `Instances Count`     | int        | MUST     | Liczba instancji                          |
| `Created At`          | datetime   | MAY      | Data dodania do katalogu                  |
| `Updated At`          | datetime   | MAY      | Data ostatniej aktualizacji               |

---

#### 3.4.3. Zakładka: Parameters (Line Type)

**Zawartość (BINDING):**

| Parametr              | Wartość      | Jednostka | Edytowalne (Designer) |
|-----------------------|--------------|-----------|----------------------|
| **R (Ω/km)**          | 0.206        | Ω/km      | ✓                    |
| **X (Ω/km)**          | 0.080        | Ω/km      | ✓                    |
| **B (µS/km)**         | 260.0        | µS/km     | ✓                    |
| **I_nom (A)**         | 350          | A         | ✓                    |
| **I_max (A)**         | 420          | A         | ✓                    |
| **Conductor Material**| Al           | -         | ✓                    |
| **Cross-Section (mm²)**| 185         | mm²       | ✓                    |
| **Max Temperature (°C)**| 70         | °C        | ✓                    |

---

#### 3.4.4. Zakładka: Parameters (Transformer Type)

**Zawartość (BINDING):**

| Parametr              | Wartość      | Jednostka | Edytowalne (Designer) |
|-----------------------|--------------|-----------|----------------------|
| **S_nom (MVA)**       | 40           | MVA       | ✓                    |
| **V_prim (kV)**       | 110          | kV        | ✓                    |
| **V_sec (kV)**        | 15           | kV        | ✓                    |
| **u_k (%)**           | 10.5         | %         | ✓                    |
| **P_fe (kW)**         | 25           | kW        | ✓                    |
| **P_cu (kW)**         | 150          | kW        | ✓                    |
| **Vector Group**      | Dyn11        | -         | ✓                    |
| **Tap Changer**       | Yes          | -         | ✓                    |
| **Tap Range**         | ±5 x 2.5%    | %         | ✓                    |

---

#### 3.4.5. Zakładka: Instances

**Zawartość (BINDING):**

Tabela instancji używających danego typu:

| Instance ID           | Instance Name         | Location (Station)   | In Service |
|-----------------------|-----------------------|----------------------|------------|
| LINE-001              | Line 110-01           | Station #1           | ✓          |
| LINE-002              | Line 110-02           | Station #2           | ✓          |
| LINE-003              | Line 110-03           | Station #1           | ✗          |

**Interakcja:**
- Kliknięcie w Instance Name → otwarcie Element Inspector dla tej instancji,
- Kliknięcie prawym przyciskiem → Context Menu (Inspect, Show on SLD, Edit Parameters).

---

#### 3.4.6. Zakładka: Technical Data

**Zawartość (BINDING):**

| Pole                  | Wartość                                   |
|-----------------------|-------------------------------------------|
| **Manufacturer**      | ABC Cables Ltd.                           |
| **Model**             | ACSR 185                                  |
| **Serial Number**     | SN-2024-185-001                           |
| **Certificate**       | IEC 61089:2018 (link do PDF)              |
| **Datasheet**         | [Download PDF]                            |
| **Standards**         | IEC 61089, PN-EN 50182                    |
| **Notes**             | High-temperature conductor (HTLS)         |

---

## 4. ZARZĄDZANIE KATALOGIEM (DESIGNER MODE)

### 4.1. Dodawanie nowego typu (BINDING)

**MUST** umożliwiać dodawanie nowego typu (tylko Designer Mode):

1. Kliknięcie przycisku "Add New Type" (w Type List),
2. Otwiera się dialog "New Type Editor":
   - wybór kategorii (LINE, CABLE, TRAFO, SWITCH, SOURCE),
   - wypełnienie pól (Type Name, Manufacturer, Parameters),
   - walidacja pól (R > 0, X > 0, I_nom > 0),
3. Kliknięcie "Save" → nowy typ dodany do Catalog.

### 4.2. Edycja istniejącego typu (BINDING)

**MUST** umożliwiać edycję istniejącego typu (tylko Designer Mode):

1. Kliknięcie przycisku "Edit" (w Type Details → zakładka Parameters),
2. Otwiera się dialog "Type Editor" (edytowalne pola Parameters),
3. Walidacja zmian (R > 0, X > 0, I_nom > 0),
4. Kliknięcie "Save" → typ zaktualizowany w Catalog.

**OSTRZEŻENIE:**
- Jeśli typ ma instancje (Instances > 0), UI **MUST** wyświetlić ostrzeżenie:
  - "This type is used by {N} instances. Changes will affect all instances. Continue?"
- Jeśli użytkownik potwierdzi → typ zaktualizowany, wszystkie instancje otrzymują nowe parametry.

### 4.3. Usuwanie typu (BINDING)

**MUST** umożliwiać usuwanie typu (tylko Designer Mode):

1. Kliknięcie przycisku "Delete" (w Type Details),
2. **MUST** sprawdzić, czy typ ma instancje (Instances Count):
   - **Jeśli Instances = 0**: wyświetlić dialog potwierdzenia "Delete type {Type Name}?",
   - **Jeśli Instances > 0**: **FORBIDDEN** usunięcie, wyświetlić błąd "Cannot delete type {Type Name} because it is used by {N} instances. Remove instances first."

**ZABRONIONE:**
- Usuwanie typu z instancjami (musi być Instances = 0).

---

## 5. IMPORT / EXPORT KATALOGU

### 5.1. Eksport katalogu (BINDING)

**MUST** umożliwiać eksport całego katalogu lub wybranej kategorii:

- **Format:** JSON, CSV, Excel (.xlsx),
- **Zawartość:** wszystkie typy + parametry (bez instancji),
- **Use Case:** backup katalogu, migracja między projektami.

### 5.2. Import katalogu (BINDING)

**MUST** umożliwiać import typów z pliku:

- **Format:** JSON, CSV, Excel (.xlsx),
- **Walidacja:** sprawdzenie unikalności Type Name, walidacja parametrów (R > 0, X > 0),
- **Conflict Resolution:** jeśli typ o tej samej nazwie już istnieje:
  - opcja "Skip" (pomiń, zachowaj istniejący),
  - opcja "Overwrite" (nadpisz istniejący),
  - opcja "Rename" (dodaj suffix "_imported").

---

## 6. PARITY Z ETAP / DIGSILENT POWERFACTORY

### 6.1. PowerFactory Parity (Passive Equipment)

**Paradygmat Type-centric (ETAP / PowerFactory aligned):**

MV-DESIGN-PRO realizuje **identyczny** model Type Library jak ETAP / DIgSILENT PowerFactory dla elementów pasywnych:

| Feature                          | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|----------------------------------|------------|--------------|---------------|--------------|
| **Katalog typów (Type Library)**     | ✓          | ✓            | ✓             | ✅ FULL      |
| **TYPE → INSTANCES (relacja 1:N)**  | ✓          | ✓            | ✓             | ✅ FULL      |
| **TYPE jako źródło prawdy**         | ✓          | ✓            | ✓             | ✅ FULL      |
| **Hierarchia: Category → Type → Instances** | ✓ | ✓            | ✓             | ✅ FULL      |
| **Edycja typów (Designer Mode)**    | ✓          | ✓            | ✓             | ✅ FULL      |
| **Propagacja zmian TYPE → INSTANCES** | ✓        | ✓            | ✓             | ✅ FULL      |
| **Ostrzeżenie przy edycji typu z instancjami** | ✓ | ✓          | ✓             | ✅ FULL      |
| **Zabronione usuwanie typu z instancjami** | ✓   | ✓            | ✓             | ✅ FULL      |
| **Import / Export katalogu (JSON, CSV, Excel)** | ✓ | ✗           | ✓             | ➕ SUPERIOR  |
| **Audyt użycia typu (Instances Count)** | ✓     | ✓            | ✓             | ✅ FULL      |

**Ocena końcowa:** **MV-DESIGN-PRO Catalog Browser ≥ ETAP ≥ PowerFactory** dla elementów pasywnych ✅

### 6.2. Różnice vs ETAP / PowerFactory

| Aspekt                  | ETAP / PowerFactory                        | MV-DESIGN-PRO                             |
|-------------------------|--------------------------------------------|-------------------------------------------|
| **Zakres katalogu**     | Wszystkie elementy (w tym Source, Load)    | **PASYWNE TYLKO** (Line, Cable, Trafo, Switch) |
| **Parametry Source**    | W katalogu (jako SourceType)              | **FORBIDDEN** (parametry Case-dependent)  |
| **Parametry Load**      | W katalogu (jako LoadType)                | **FORBIDDEN** (parametry Case-dependent)  |
| **Parametry Protection**| W katalogu (jako ProtectionType)          | **FORBIDDEN** (parametry nastawcze)       |

**Uzasadnienie:**
- **TYPE** definiuje **parametry niezmienne** (R, X, B, I_nom, S_nom),
- **Source, Load, Protection** mają **parametry zmienne** (P_gen, Q_gen, U_setpoint, I_set, t_trip),
- **ETAP / PowerFactory** zarządzają parametrami zmiennymi przez **Case / Scenario**, nie przez Catalog,
- **MV-DESIGN-PRO** rozdziela **katalog (pasywne)** od **konfiguracji (aktywne)** dla maksymalnej przejrzystości.

---

## 7. ACCESSIBILITY I UX

### 7.1. Keyboard Navigation

- **MUST** obsługiwać Tab (nawigacja między Type List, Type Details),
- **MUST** obsługiwać Enter (otwarcie Type Details dla zaznaczonego typu),
- **MUST** obsługiwać Ctrl+F (wyszukiwanie typu w Type List),
- **MUST** obsługiwać Ctrl+N (dodanie nowego typu, tylko Designer Mode).

### 7.2. Screen Readers

- **MUST** zawierać ARIA labels dla wszystkich kolumn Type List,
- **MUST** ogłaszać zmianę typu przez screen reader ("Selected Line Type ACSR 185").

---

## 8. PERFORMANCE

### 8.1. Wymagania wydajnościowe (BINDING)

- Renderowanie Type List z 500 typów **MUST** zajmować < 1000 ms,
- Wyszukiwanie w Type List (regex) **MUST** zajmować < 300 ms,
- Otwieranie Type Details **MUST** zajmować < 200 ms,
- **MUST** używać lazy loading (wirtualizacja dla > 500 typów).

---

## 9. ZABRONIONE PRAKTYKI

### 9.1. FORBIDDEN

**UI i zarządzanie:**
- **FORBIDDEN**: edycja typów w trybie Operator / Analyst (tylko Designer),
- **FORBIDDEN**: usuwanie typu z instancjami (Instances > 0),
- **FORBIDDEN**: brak ostrzeżenia przy edycji typu z instancjami,
- **FORBIDDEN**: hard-coded typy katalogowe (wszystkie typy w bazie danych, konfigurowalne).

**Zakres katalogu (BINDING):**
- **FORBIDDEN**: kategoria "Source Types" (Grid, Generator, PV, FW, BESS) w Catalog Browser,
- **FORBIDDEN**: kategoria "Load Types" w Catalog Browser,
- **FORBIDDEN**: kategoria "Protection Types" w Catalog Browser,
- **FORBIDDEN**: parametry Case-dependent (P_gen, Q_gen, U_setpoint) w Type Details,
- **FORBIDDEN**: parametry nastawcze (I_set, t_trip, charakterystyki) w Type Details.

**Uzasadnienie:**
- **Catalog Browser zarządza wyłącznie parametrami NIEZMIENNYMI** (impedancje, ratinki),
- **Parametry ZMIENNE** (generacja, obciążenie, nastawy) są zarządzane przez **Case / Scenario**, nie przez Catalog.

---

## 10. ZALEŻNOŚCI OD INNYCH KONTRAKTÓW

- **ELEMENT_INSPECTOR_CONTRACT.md**: Type Details → Instances → kliknięcie MUST otworzyć Element Inspector,
- **TOPOLOGY_TREE_CONTRACT.md**: Catalog Browser MUST być dostępny z Topology Tree (Context Menu: "Show Type in Catalog"),
- **EXPERT_MODES_CONTRACT.md**: edycja typów MUST być dostępna tylko w Designer Mode,
- **GLOBAL_CONTEXT_BAR.md**: Catalog Browser MUST wyświetlać aktywny Expert Mode.

---

## 11. WERSJONOWANIE I ZMIANY

- Wersja 1.0: definicja bazowa (2026-01-28),
- Zmiany w kontrakcie wymagają aktualizacji wersji i code review,
- Breaking changes wymagają migracji UI i aktualizacji testów E2E.

---

**KONIEC KONTRAKTU**
