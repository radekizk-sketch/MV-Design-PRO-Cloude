# SLD — KANONICZNA SPECYFIKACJA

**Wersja**: 1.0
**Data**: 2026-02-02
**Status**: BINDING (WIĄŻĄCY)
**Autor**: Claude Code (Główny Architekt SLD)

---

## 1. DEFINICJA SLD

### 1.1 Co to jest SLD

**SLD (Single Line Diagram)** to **deterministyczna wizualizacja topologii sieci elektroenergetycznej**, gdzie:
- Każdy symbol odpowiada dokładnie jednemu elementowi modelu sieci
- Każde połączenie odzwierciedla relację elektryczną między elementami
- Układ schematu wynika z topologii, nie z preferencji rysunkowych

### 1.2 Czym SLD NIE JEST

SLD **nie jest**:
- Edytorem graficznym (Paint/Inkscape)
- Rysunkiem swobodnym
- Schematem dekoracyjnym
- Wizualizacją danych bez relacji z modelem

### 1.3 Paradygmat: Model-First

```
NetworkModel (źródło prawdy)
      │
      ▼
SLD (widok topologii) → GENEROWANY z modelu
      │
      ▼
Obliczenia (power flow, short circuit) → WYMAGAJĄ poprawnego modelu
```

**Zasada**: Model sieci jest źródłem prawdy. SLD jest jego projekcją graficzną.

---

## 2. BIJEKCJA SYMBOL ↔ ELEMENT

### 2.1 Definicja Bijekcji

Każdy symbol na schemacie SLD **musi** posiadać dokładnie jeden odpowiadający element w modelu sieci.

```typescript
interface SldSymbol {
  id: string;         // Unikalny ID symbolu
  elementId: string;  // ID elementu w NetworkModel (BIJECTION)
  elementType: ElementType;
}
```

### 2.2 Mapowanie Typów

| Element modelu | Symbol ETAP | Plik SVG |
|----------------|-------------|----------|
| Bus | busbar | `busbar.svg` |
| LineBranch (LINE) | line_overhead | `line_overhead.svg` |
| LineBranch (CABLE) | line_cable | `line_cable.svg` |
| TransformerBranch | transformer_2w / transformer_3w | `transformer_2w.svg` |
| Switch (BREAKER) | circuit_breaker | `circuit_breaker.svg` |
| Switch (DISCONNECTOR) | disconnector | `disconnector.svg` |
| Source (GRID) | utility_feeder | `utility_feeder.svg` |
| Source (PV) | pv | `pv.svg` |
| Source (WIND) | fw | `fw.svg` |
| Source (BESS) | bess | `bess.svg` |
| Source (GENERATOR) | generator | `generator.svg` |
| Load | load | (do zdefiniowania) |
| CT | ct | `ct.svg` |
| VT | vt | `vt.svg` |
| Ground | ground | `ground.svg` |

### 2.3 Zakazy

**ZAKAZANE:**
- Symbol bez `elementId` (orphan symbol)
- Dwa symbole z tym samym `elementId`
- Element modelu bez symbolu (hidden element)
- Symbol typu niezgodnego z `elementType`

---

## 3. PORTY ELEKTRYCZNE

### 3.1 Definicja Portu

**Port** to punkt przyłączeniowy symbolu, przez który następuje połączenie elektryczne z innym symbolem.

```typescript
interface SymbolPort {
  name: 'top' | 'bottom' | 'left' | 'right';
  x: number;  // Współrzędna w viewBox (0-100)
  y: number;
}

interface SymbolPorts {
  top?: SymbolPort;
  bottom?: SymbolPort;
  left?: SymbolPort;
  right?: SymbolPort;
}
```

### 3.2 Reguły Portów

1. **Każdy symbol posiada zdefiniowane porty** (ports.json)
2. **Porty są punktami elektrycznymi**, nie dekoracyjnymi
3. **Połączenie = port ↔ port** (nie symbol ↔ symbol)
4. **Porty transformują się przy rotacji** symbolu

### 3.3 Transformacja Portów przy Rotacji

```
Rotacja 0°:   bez zmian
Rotacja 90°:  x' = 100 - y, y' = x      (top→right, right→bottom, ...)
Rotacja 180°: x' = 100 - x, y' = 100 - y (top↔bottom, left↔right)
Rotacja 270°: x' = y, y' = 100 - x      (top→left, left→bottom, ...)
```

---

## 4. POŁĄCZENIA

### 4.1 Definicja Połączenia

**Połączenie** to graficzna reprezentacja relacji elektrycznej między dwoma elementami sieci.

```typescript
interface Connection {
  id: string;
  fromSymbolId: string;
  fromPortName: PortName;
  toSymbolId: string;
  toPortName: PortName;
  path: Position[];  // Punkty łamanej (orthogonal routing)
}
```

### 4.2 Reguły Połączeń

1. **Połączenie jest zawsze port↔port**
2. **Połączenie odzwierciedla relację w modelu** (fromNodeId/toNodeId)
3. **Nie istnieją połączenia "w powietrzu"** — muszą kończyć się na porcie
4. **Ręczne rysowanie połączeń jest ZAKAZANE**

### 4.3 Orthogonal Routing

Połączenia są renderowane jako **łamane prostopadłe** (orthogonal polylines):
- Tylko kąty 0° i 90°
- Minimalizacja skrzyżowań
- Minimalizacja długości
- Unikanie nakładania na symbole

```
     [Bus A]
        │
        └─────┐
              │
           [Switch]
              │
        ┌─────┘
        │
     [Bus B]
```

---

## 5. AUTO-LAYOUT

### 5.1 Wymagania Auto-Layout

System **musi** posiadać algorytm auto-layout spełniający:

| Wymaganie | Opis |
|-----------|------|
| Deterministyczny | Ten sam model → ten sam układ |
| Hierarchiczny | Zasilanie od góry do dołu (lub L→R) |
| Layered | Szyny na oddzielnych poziomach |
| Orthogonal | Połączenia prostokątne |
| Readable | Minimalizacja skrzyżowań |

### 5.2 Algorytm Sugiyama (Layer-Based)

Rekomendowany algorytm: **Sugiyama framework** z modyfikacjami dla SLD:

1. **Cycle removal** — usunięcie cykli (tymczasowe odwrócenie krawędzi)
2. **Layer assignment** — przypisanie węzłów do warstw (poziomów)
3. **Crossing minimization** — minimalizacja skrzyżowań w każdej warstwie
4. **Coordinate assignment** — obliczenie współrzędnych X/Y
5. **Edge routing** — orthogonal routing połączeń

### 5.3 Reguły Specyficzne dla SLD

1. **Szyny (Bus) zawsze poziomo** — szerokość proporcjonalna do liczby przyłączeń
2. **Źródła na górze** — utility_feeder, generator, pv, fw, bess
3. **Obciążenia na dole** — Load na najniższej warstwie
4. **Transformatory między warstwami napięciowymi**
5. **Łączniki (Switch) na gałęziach**, nie jako osobne węzły

### 5.4 Grid System

| Parametr | Wartość | Opis |
|----------|---------|------|
| GRID_SIZE | 20 px | Podstawowa jednostka siatki |
| SYMBOL_WIDTH | 40-80 px | Szerokość symbolu |
| SYMBOL_HEIGHT | 40-80 px | Wysokość symbolu |
| BUS_MIN_WIDTH | 60 px | Minimalna szerokość szyny |
| LAYER_SPACING | 100 px | Odstęp między warstwami |
| NODE_SPACING | 80 px | Odstęp między węzłami w warstwie |

---

## 6. INTERAKCJE UŻYTKOWNIKA

### 6.1 Model Interakcji ETAP-Style

| Akcja użytkownika | Efekt |
|-------------------|-------|
| Kliknięcie w szynę | Kontekst "Dodaj element" → tworzy element w modelu + symbol |
| Kliknięcie w port (źródło) + port (cel) | Tworzy gałąź/łącznik w modelu + połączenie |
| Przeciągnięcie symbolu | Przesuwa symbol (NIE zrywa połączeń!) |
| Delete na symbolu | Usuwa element z modelu + symbol + połączenia |

### 6.2 Zakazy Interakcji

**ZAKAZANE:**
- Rysowanie swobodnych linii (SVG freestyle)
- Tworzenie symbolu bez elementu modelu
- Kopiowanie symbolu bez kopiowania elementu
- Przesuwanie symbolu tak, że połączenia stają się niepoprawne

### 6.3 Snap-to-Port

Podczas tworzenia połączenia:
1. Kursor przyciąga się do najbliższego portu
2. Połączenie może rozpocząć się tylko od portu
3. Połączenie może zakończyć się tylko na porcie

---

## 7. WSTAWIANIE ELEMENTÓW

### 7.1 Workflow Wstawiania

```
1. Użytkownik wybiera typ elementu z palety (np. "Wyłącznik")
2. Kliknięcie w szynie/porcie docelowym
3. System:
   a) Tworzy nowy element w NetworkModel
   b) Tworzy symbol SLD z elementId
   c) Ustala pozycję (snap to grid)
   d) Tworzy połączenie port↔port
4. Auto-layout opcjonalnie przeorganizowuje układ
```

### 7.2 Paleta Elementów

Dostępne elementy do wstawienia:
- Szyna (Bus)
- Linia napowietrzna (LineBranch LINE)
- Linia kablowa (LineBranch CABLE)
- Transformator 2-uzwojeniowy
- Transformator 3-uzwojeniowy
- Wyłącznik (Switch BREAKER)
- Rozłącznik (Switch DISCONNECTOR)
- Źródło sieciowe (Source GRID)
- Fotowoltaika (Source PV)
- Farma wiatrowa (Source WIND)
- Magazyn energii (Source BESS)
- Generator (Source GENERATOR)
- Obciążenie (Load)

### 7.3 Reguły Wstawiania

1. **Wstawiany element musi być poprawny topologicznie**
   - Gałąź wymaga dwóch węzłów (from, to)
   - Źródło/Load wymaga jednego węzła
   - Switch wymaga dwóch węzłów

2. **Pozycja wynika z kontekstu**
   - Kliknięcie w szynę → pod/nad szyną
   - Kliknięcie w wolne miejsce → nowa szyna + element

---

## 8. WALIDACJA

### 8.1 Walidacja Topologiczna

Przed zapisaniem/obliczeniami system weryfikuje:

| Reguła | Opis | Błąd |
|--------|------|------|
| V-01 | Każdy symbol ma elementId | "Orphan symbol" |
| V-02 | Każdy element ma symbol | "Hidden element" |
| V-03 | Połączenia port↔port | "Invalid connection" |
| V-04 | Brak cykli bez źródła | "Floating island" |
| V-05 | Minimum 1 źródło | "No source" |

### 8.2 Walidacja Geometryczna

| Reguła | Opis | Błąd |
|--------|------|------|
| G-01 | Symbole nie nakładają się | "Symbol collision" |
| G-02 | Połączenia nie przechodzą przez symbole | "Connection crosses symbol" |
| G-03 | Pozycje na siatce | "Off-grid position" |

### 8.3 Blokada Niespójności

**System MUSI blokować zapis** schematu, który:
- Zawiera symbole bez elementów
- Zawiera połączenia bez odpowiedników w modelu
- Narusza bijekcję symbol↔element

---

## 9. DETERMINISTYCZNOŚĆ

### 9.1 Gwarancja Powtarzalności

**Ten sam model sieci → ten sam schemat SLD**

Implementacja:
- Auto-layout jest deterministyczny (bez Math.random())
- Sortowanie po ID elementu (string order)
- Tie-breaking po nazwie, potem po hash'u parametrów

### 9.2 Test Deterministyczności

```typescript
function testDeterminism(model: NetworkModel): boolean {
  const layout1 = generateLayout(model);
  const layout2 = generateLayout(model);
  return deepEqual(layout1, layout2);  // MUSI być true
}
```

---

## 10. STANY WIZUALNE

### 10.1 Energizacja

| Stan | Kolor linii | Opis |
|------|-------------|------|
| Energized | Czarny #1f2937 | Element pod napięciem |
| De-energized | Szary #9ca3af | Element bez napięcia |

Algorytm: BFS od źródeł, OPEN switch blokuje przepływ.

### 10.2 Stan Łącznika

| Stan | Wizualizacja |
|------|--------------|
| CLOSED | Połączenie ciągłe |
| OPEN | Przerwa w połączeniu |
| UNKNOWN | Linia przerywana |

### 10.3 In-Service

| Stan | Wizualizacja |
|------|--------------|
| In-service | Pełna opacity |
| Out-of-service | 50% opacity, linia przerywana |

### 10.4 Selekcja

| Stan | Wizualizacja |
|------|--------------|
| Selected | Niebieska obwódka #3b82f6 |
| Hover | Podświetlenie |
| Highlighted (issue) | Kolor wg severity (red/yellow/blue) |

---

## 11. EKSPORT

### 11.1 Formaty Eksportu

| Format | Zastosowanie | Wymóg |
|--------|--------------|-------|
| PNG | Dokumentacja, e-mail | Scale 1x/2x/3x |
| PDF | Dokumentacja formalna | A4/A3, metadata |
| SVG | Edycja wektorowa | Pełna struktura |
| DXF | Import do CAD | (opcjonalnie) |

### 11.2 Print-First

**Ekran = PDF = prawda dokumentacji**
- Wszystkie elementy widoczne
- Kolory semantyczne zachowane
- Etykiety czytelne
- Skala podana w stopce

---

## 12. HIERARCHIA DOKUMENTÓW

```
SYSTEM_SPEC.md (architektura całego systemu)
    │
    └── SLD_KANONICZNA_SPECYFIKACJA.md (ten dokument — BINDING)
            │
            ├── SLD_UI_ARCHITECTURE.md (szczegóły UI)
            ├── sld_rules.md (reguły fundamentalne)
            ├── etap_symbols/README.md (biblioteka symboli)
            └── AUDYT_SLD_ETAP.md (wyniki audytu)
```

---

## 13. ZAKAZY (ABSOLUTNE)

| # | Zakaz | Uzasadnienie |
|---|-------|--------------|
| Z-01 | Rysowanie SVG "na oko" | Niespójność z modelem |
| Z-02 | Losowe pozycjonowanie | Brak deterministyczności |
| Z-03 | Połączenia bez portów | Niepoprawna topologia |
| Z-04 | Symbole bez elementów | Orphan symbols |
| Z-05 | Estetyczne uproszczenia | Utrata informacji |
| Z-06 | Copy/paste bez tworzenia elementu | Niespójność model↔SLD |

---

## 14. SŁOWNIK

| Termin | Definicja |
|--------|-----------|
| **SLD** | Single Line Diagram — schemat jednokreskowy |
| **Symbol** | Graficzna reprezentacja elementu sieci |
| **Port** | Punkt przyłączeniowy symbolu |
| **Połączenie** | Graficzna reprezentacja relacji elektrycznej |
| **Bijekcja** | Relacja 1:1 (każdy symbol ↔ jeden element) |
| **Auto-layout** | Automatyczne rozmieszczenie symboli |
| **Orthogonal routing** | Routing połączeń pod kątem 0°/90° |
| **Energizacja** | Stan elektryczny (pod napięciem / bez napięcia) |

---

## 15. CHANGELOG

| Wersja | Data | Zmiany |
|--------|------|--------|
| 1.0 | 2026-02-02 | Wersja początkowa |

---

**Koniec specyfikacji**

**Status**: Ten dokument jest **WIĄŻĄCY** dla wszystkich zmian w module SLD.
