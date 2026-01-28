# TOPOLOGY TREE CONTRACT

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-28
**Typ**: UI Contract — Normatywny

---

## 1. CEL I ZAKRES

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **Topology Tree** — komponent UI MV-DESIGN-PRO, który:

- **wyświetla hierarchię topologiczną sieci** w formie drzewa: Project → Station → Voltage Level → Elements,
- **umożliwia eksplorację struktury sieci niezależnie od SLD**,
- **synchronizuje selekcję z SLD i Element Inspector**,
- **osiąga parity z ETAP / DIgSILENT PowerFactory w zakresie nawigacji topologicznej**.

### 1.2. Zakres obowiązywania

- **BINDING** dla implementacji UI MV-DESIGN-PRO,
- aplikuje się do wszystkich widoków (CAD Mode, SCADA Mode, Hybrid Mode),
- komponent MUST być dostępny w każdym trybie eksperckim (Operator, Designer, Analyst, Auditor),
- naruszenie kontraktu = regresja wymagająca hotfix.

---

## 2. DEFINICJA TOPOLOGY TREE

### 2.1. Rola w architekturze

**Topology Tree to WIDOK, nie model.**

**INVARIANT:**
- Topology Tree **NIE przechowuje danych** — odczytuje je z NetworkModel,
- Topology Tree **NIE modyfikuje topologii** — to tylko prezentacja hierarchii,
- Topology Tree **synchronizuje się** z SLD i Element Inspector.

### 2.2. Różnica: Topology Tree vs Results Browser

| Aspekt                  | Topology Tree                          | Results Browser                        |
|-------------------------|----------------------------------------|----------------------------------------|
| **Cel**                 | Nawigacja po topologii sieci           | Eksploracja wyników obliczeń           |
| **Hierarchia**          | Project → Station → VoltageLevel → Element | Project → Case → Snapshot → Analysis → Target |
| **Zawartość**           | Struktura fizyczna sieci (Bus, Line, Trafo) | Wyniki obliczeń (V, I, P, Q, Status)   |
| **Filtrowanie**         | Po typie elementu, napięciu, strefie   | Po Status, Violation, Case, Analysis   |
| **Selekcja**            | Kliknięcie → Element Inspector + SLD highlight | Kliknięcie → Element Inspector         |

---

## 3. HIERARCHIA TOPOLOGY TREE (BINDING)

### 3.1. Struktura drzewa (PowerFactory-aligned)

```
Project
  └── Station #1
        ├── Voltage Level 110 kV
        │     ├── Bus 110-01
        │     ├── Bus 110-02
        │     ├── Line 110-01 (110-01 → 110-02)
        │     ├── Transformer T1 (110 kV → 15 kV)
        │     └── Source Grid (110 kV)
        ├── Voltage Level 15 kV
        │     ├── Bus 15-01
        │     ├── Bus 15-02
        │     ├── Line 15-01 (15-01 → 15-02)
        │     ├── Load L1 (15-01)
        │     └── Switch SW1 (15-01 ↔ 15-02)
        └── Voltage Level 0.4 kV
              ├── Bus 0.4-01
              ├── Transformer T2 (15 kV → 0.4 kV)
              └── Load L2 (0.4-01)
  └── Station #2
        └── ...
```

### 3.2. Node Type: Project Root

**Właściwości (BINDING):**

| Pole                  | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Project Name`        | string     | MUST     | Nazwa projektu                            |
| `Project ID`          | UUID       | MUST     | Unikalny identyfikator projektu           |
| `Created At`          | datetime   | MUST     | Data utworzenia projektu                  |
| `Author`              | string     | MAY      | Autor projektu                            |
| `Description`         | text       | MAY      | Opis projektu                             |

**Ikona:** 📁 (folder projektu)

---

### 3.3. Node Type: Station

**Definicja:**
- Station to **kontener logiczny** (nie fizyczny),
- grupuje elementy według lokalizacji geograficznej (stacja transformatorowa, rozdzielnia),
- **NIE wpływa na solver** (czysto organizacyjne).

**Właściwości (BINDING):**

| Pole                  | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Station Name`        | string     | MUST     | Nazwa stacji (np. "GPZ Wschód")           |
| `Station ID`          | UUID       | MUST     | Unikalny identyfikator stacji             |
| `Location`            | GeoPoint   | MAY      | Współrzędne geograficzne (lat, lon)       |
| `Type`                | enum       | MAY      | GPZ (110/15 kV), RPZ (15/0.4 kV), Substation |
| `Elements Count`      | int        | MUST     | Liczba elementów w stacji                 |

**Ikona:** 🏭 (stacja), 🔌 (rozdzielnia)

**Rozwijanie:**
- Domyślnie: **zwinięta** (collapsed),
- Kliknięcie → rozwinięcie → pokazanie Voltage Levels.

---

### 3.4. Node Type: Voltage Level

**Definicja:**
- Voltage Level grupuje elementy według **poziomu napięcia znamionowego** (V_nom [kV]),
- **MUST** być zgodny z Bus.voltage_level_kv (wszystkie Bus w danym Voltage Level mają identyczne V_nom).

**Właściwości (BINDING):**

| Pole                  | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Voltage [kV]`        | float      | MUST     | Napięcie znamionowe (np. 110, 15, 0.4)    |
| `Voltage Level ID`    | UUID       | MUST     | Unikalny identyfikator poziomu napięcia   |
| `Elements Count`      | int        | MUST     | Liczba elementów na tym poziomie          |
| `Buses Count`         | int        | MUST     | Liczba Bus na tym poziomie                |

**Ikona:** ⚡ (napięcie), kolor zależny od V_nom (110 kV = czerwony, 15 kV = niebieski, 0.4 kV = zielony)

**Rozwijanie:**
- Domyślnie: **zwinięta** (collapsed),
- Kliknięcie → rozwinięcie → pokazanie elementów (Bus, Line, Trafo, Source, Load, Switch).

---

### 3.5. Node Type: Element (Bus, Line, Trafo, Source, Load, Switch)

**Definicja:**
- Element to **węzeł końcowy** w drzewie (leaf node),
- odpowiada **jeden do jednego** elementowi w NetworkModel,
- **NIE** ma pod-elementów (nie rozwija się).

**Właściwości wspólne (BINDING):**

| Pole                  | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Element ID`          | UUID       | MUST     | Unikalny identyfikator elementu           |
| `Element Name`        | string     | MUST     | Nazwa elementu                            |
| `Element Type`        | enum       | MUST     | BUS, LINE, TRAFO, SOURCE, LOAD, SWITCH    |
| `In Service`          | bool       | MUST     | Czy element jest w eksploatacji           |
| `Status`              | enum       | MUST     | OK, WARNING, VIOLATION, ERROR (dla SCADA) |

**Ikony elementów (BINDING):**

| Element Type          | Ikona      |
|-----------------------|------------|
| **Bus**               | ⬤ (pełne koło) |
| **Line**              | ─ (linia pozioma) |
| **Transformer**       | ⚡ (transformator) |
| **Source**            | ⚡ (źródło) |
| **Load**              | 🔌 (obciążenie) |
| **Switch**            | ⚙️ (przełącznik) |

---

## 4. FILTROWANIE I WYSZUKIWANIE

### 4.1. Filtr po typie elementu (BINDING)

Topology Tree **MUST** umożliwiać filtrowanie po typie elementu:

| Filtr                 | Działanie                                 | Domyślnie |
|-----------------------|-------------------------------------------|-----------|
| **Show Buses**        | Pokaż/ukryj Bus                           | ✓         |
| **Show Lines**        | Pokaż/ukryj Line                          | ✓         |
| **Show Transformers** | Pokaż/ukryj Transformer                   | ✓         |
| **Show Sources**      | Pokaż/ukryj Source                        | ✓         |
| **Show Loads**        | Pokaż/ukryj Load                          | ✓         |
| **Show Switches**     | Pokaż/ukryj Switch                        | ✓         |
| **Show Out of Service** | Pokaż/ukryj elementy "out of service"   | ✓         |

**Lokalizacja filtru:** górna część panelu Topology Tree (checkbox menu).

---

### 4.2. Filtr po napięciu (BINDING)

Topology Tree **MUST** umożliwiać filtrowanie po napięciu znamionowym:

| Filtr                 | Działanie                                 | Domyślnie |
|-----------------------|-------------------------------------------|-----------|
| **Show 110 kV**       | Pokaż/ukryj elementy 110 kV               | ✓         |
| **Show 15 kV**        | Pokaż/ukryj elementy 15 kV                | ✓         |
| **Show 0.4 kV**       | Pokaż/ukryj elementy 0.4 kV               | ✓         |

**Lokalizacja filtru:** dropdown menu "Voltage Levels" w górnej części panelu.

---

### 4.3. Wyszukiwanie (BINDING)

Topology Tree **MUST** posiadać **Search Box** (pole wyszukiwania):

| Feature               | Opis                                      |
|-----------------------|-------------------------------------------|
| **Search by Name**    | Wyszukiwanie po nazwie elementu (regex)   |
| **Search by ID**      | Wyszukiwanie po ID elementu               |
| **Highlight Results** | Podświetlenie wyników w drzewie (żółty)   |
| **Jump to First**     | Przeskok do pierwszego wyniku (Enter)     |

**Lokalizacja:** górna część panelu Topology Tree (nad drzewem).

---

## 5. SELEKCJA I SYNCHRONIZACJA

### 5.1. Kliknięcie w element drzewa (BINDING)

Kliknięcie w element w Topology Tree **MUST**:

1. **Otworzyć Element Inspector** (z zakładką zależną od Expert Mode),
2. **Podświetlić element na SLD** (jeśli widoczny),
3. **Zachować kontekst** (aktywny Case, Snapshot, Analysis).

**Przykład:**

- użytkownik klika "Bus 15-01" w drzewie,
- otwiera się Element Inspector z zakładką "Overview" (dla Operator Mode),
- Bus 15-01 zostaje podświetlony na SLD (żółte obramowanie).

---

### 5.2. Kliknięcie elementu na SLD → synchronizacja z Topology Tree (BINDING)

Kliknięcie elementu na SLD **MUST**:

1. **Podświetlić odpowiedni węzeł w Topology Tree** (żółte tło),
2. **Rozwinąć ścieżkę do elementu** (Station → Voltage Level → Element),
3. **Scrollować do elementu** (jeśli poza widokiem).

**Przykład:**

- użytkownik klika Bus 15-01 na SLD,
- Topology Tree automatycznie rozwija: Station #1 → Voltage Level 15 kV → Bus 15-01 (podświetlony).

---

### 5.3. Multi-select (opcjonalnie, SHOULD)

Topology Tree **SHOULD** umożliwiać multi-select (zaznaczenie wielu elementów):

- **Ctrl+Click**: dodaj element do selekcji,
- **Shift+Click**: zaznacz zakres elementów (od ostatniego do klikniętego),
- **Selekcja wielu elementów → Element Inspector**: wyświetlenie „Multi-Element View" (porównanie parametrów).

---

## 6. ROZWIJANIE I ZWIJANIE

### 6.1. Domyślne rozwinięcia zależne od Expert Mode (BINDING)

| Expert Mode           | Domyślne rozwinięcie                      |
|-----------------------|-------------------------------------------|
| **Operator**          | Project → Station (Voltage Levels zwinięte) |
| **Designer**          | Project → Station → Voltage Level (elementy zwinięte) |
| **Analyst**           | Wszystkie poziomy rozwinięte              |
| **Auditor**           | Wszystkie poziomy rozwinięte              |

---

### 6.2. Expand All / Collapse All (BINDING)

Topology Tree **MUST** posiadać przyciski:

- **Expand All**: rozwija wszystkie poziomy (Project → Station → Voltage Level → Elements),
- **Collapse All**: zwija wszystkie poziomy (tylko Project widoczny).

**Lokalizacja:** górna część panelu Topology Tree (obok Search Box).

---

## 7. DRAG & DROP (OPCJONALNIE, SHOULD)

### 7.1. Drag & Drop elementów między Stations (SHOULD)

Topology Tree **SHOULD** umożliwiać przenoszenie elementów między Stations (drag & drop):

- przeciągnięcie Bus z Station #1 → Station #2,
- MUST wyświetlić dialog potwierdzenia ("Move Bus 15-01 from Station #1 to Station #2?"),
- MUST zaktualizować NetworkModel (zmiana Station reference),
- MUST zsynchronizować SLD (przerysowanie).

**FORBIDDEN:**
- Drag & drop między Voltage Levels (Bus 15 kV NIE MOŻE być przeniesiony do 110 kV),
- Drag & drop Branch (Line, Trafo) — Branch ma dwa endpointy, więc drag & drop jest bezsensowny.

---

## 8. CONTEXT MENU (BINDING)

### 8.1. Prawy przycisk myszy → Context Menu

Kliknięcie prawym przyciskiem myszy na element w Topology Tree **MUST** otworzyć Context Menu:

| Opcja                 | Działanie                                 | Dostępność               |
|-----------------------|-------------------------------------------|--------------------------|
| **Inspect**           | Otworzyć Element Inspector                | Zawsze                   |
| **Show on SLD**       | Podświetlić element na SLD                | Jeśli widoczny           |
| **Edit Parameters**   | Otworzyć Inspector z zakładką Parameters  | Tylko Designer Mode      |
| **Toggle In Service** | Przełącz "in service" ON/OFF              | Tylko Designer Mode      |
| **Delete**            | Usunąć element (z potwierdzeniem)         | Tylko Designer Mode      |
| **Export Subtree**    | Eksportować poddrzewo do CSV/Excel        | Zawsze                   |

---

## 9. PARITY Z ETAP / DIGSILENT POWERFACTORY

### 9.1. PowerFactory Parity

| Feature                          | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|----------------------------------|------------|--------------|---------------|--------------|
| Hierarchia Project → Station → VoltageLevel → Element | ✓ | ✓      | ✓             | ✅ FULL      |
| Filtrowanie po typie elementu    | ✓          | ✓            | ✓             | ✅ FULL      |
| Wyszukiwanie po nazwie (regex)   | ✓          | ✗            | ✓             | ➕ SUPERIOR  |
| Synchronizacja z SLD (kliknięcie → highlight) | ✓  | ✓            | ✓             | ✅ FULL      |
| Expand All / Collapse All        | ✓          | ✓            | ✓             | ✅ FULL      |
| Context Menu (inspect, edit, delete) | ✓      | ✓            | ✓             | ✅ FULL      |
| Drag & Drop elementów między Stations | ✗     | ✓            | ✓             | ✅ FULL      |
| Multi-select (Ctrl+Click, Shift+Click) | ✗   | ✗            | ✓             | ➕ SUPERIOR  |

---

## 10. ACCESSIBILITY I UX

### 10.1. Keyboard Navigation

- **MUST** obsługiwać Arrow Up/Down (nawigacja między węzłami),
- **MUST** obsługiwać Arrow Right (rozwinięcie węzła), Arrow Left (zwinięcie węzła),
- **MUST** obsługiwać Enter (otwarcie Element Inspector dla zaznaczonego elementu),
- **MUST** obsługiwać Ctrl+F (fokus na Search Box).

### 10.2. Screen Readers

- **MUST** zawierać ARIA labels dla wszystkich węzłów drzewa,
- **MUST** ogłaszać zmianę selekcji przez screen reader ("Selected Bus 15-01").

---

## 11. PERFORMANCE

### 11.1. Wymagania wydajnościowe (BINDING)

- Renderowanie drzewa z 10 000 elementów **MUST** zajmować < 1000 ms,
- Rozwijanie węzła **MUST** zajmować < 100 ms,
- Wyszukiwanie (regex) w 10 000 elementach **MUST** zajmować < 500 ms,
- **MUST** używać lazy loading (wirtualizacja drzewa dla > 1000 elementów).

---

## 12. ZABRONIONE PRAKTYKI

### 12.1. FORBIDDEN

- **FORBIDDEN**: przechowywanie danych topologii w Topology Tree (tylko odczyt z NetworkModel),
- **FORBIDDEN**: modyfikacja topologii bez walidacji (zmiana Station/VoltageLevel),
- **FORBIDDEN**: brak synchronizacji z SLD (kliknięcie w drzewo MUST podświetlić element na SLD),
- **FORBIDDEN**: ukrywanie elementów "out of service" domyślnie (użytkownik decyduje przez filtr).

---

## 13. ZALEŻNOŚCI OD INNYCH KONTRAKTÓW

- **ELEMENT_INSPECTOR_CONTRACT.md**: kliknięcie w element MUST otworzyć Inspector,
- **GLOBAL_CONTEXT_BAR.md**: Topology Tree MUST reagować na zmianę Case/Snapshot,
- **EXPERT_MODES_CONTRACT.md**: domyślne rozwinięcia zależne od Expert Mode,
- **UI_ETAP_POWERFACTORY_PARITY.md**: Topology Tree MUST spełniać parity z ETAP/PowerFactory.

---

## 14. WERSJONOWANIE I ZMIANY

- Wersja 1.0: definicja bazowa (2026-01-28),
- Zmiany w kontrakcie wymagają aktualizacji wersji i code review,
- Breaking changes wymagają migracji UI i aktualizacji testów E2E.

---

**KONIEC KONTRAKTU**
