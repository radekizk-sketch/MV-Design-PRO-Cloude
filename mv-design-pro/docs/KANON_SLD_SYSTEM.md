# KANON_SLD_SYSTEM — Kanoniczny System Schematu Jednokreskowego

## 1. Zasada naczelna

**SLD jest deterministyczną projekcją ENM na przestrzeń 2D.**

```
ENM (EnergyNetworkModel) ──→ TopologyGraph ──→ SLD Layout ──→ Canvas
     źródło prawdy            analiza              geometria     wizualizacja
```

Przepływ danych jest jednokierunkowy: model → schemat. SLD NIE mutuje modelu.

## 2. Architektura warstw

```
┌─────────────────────────────────────────────────┐
│               CANVAS (Prezentacja)               │
│  SVG/Canvas rendering, interakcja użytkownika    │
│  Klik → SelectionRef → Inspektor / Kreator       │
└─────────────────────────────────────────────────┘
                        ↑
┌─────────────────────────────────────────────────┐
│           STATION GEOMETRY (Overlay)             │
│  StationBoundingBox, TrunkPath, EntryPoint       │
│  Obliczane z: ENM + TopologyGraph + bus_positions │
└─────────────────────────────────────────────────┘
                        ↑
┌─────────────────────────────────────────────────┐
│           SLD LAYOUT PIPELINE (5 faz)            │
│  1. Voltage Bands  2. Bay Detection              │
│  3. Crossing Min   4. Coordinates                │
│  5. Edge Routing + Label Placement               │
└─────────────────────────────────────────────────┘
                        ↑
┌─────────────────────────────────────────────────┐
│           TOPOLOGY GRAPH (Analiza)               │
│  build_topology_graph(ENM) → TopologyGraph       │
│  Trunk, Corridors, Junctions, EntryPoints        │
└─────────────────────────────────────────────────┘
                        ↑
┌─────────────────────────────────────────────────┐
│       ENM (EnergyNetworkModel) — Model           │
│  Bus, Branch, Transformer, Source, Load           │
│  + Substation, Bay, Junction, Corridor            │
│  Jedno źródło prawdy, wersjonowane               │
└─────────────────────────────────────────────────┘
```

## 3. Encje topologiczne

| Encja | Opis | Warstwa SLD |
|-------|------|-------------|
| **Substation** | Stacja SN/nn (kontener logiczny) | StationBoundingBox (NO_ROUTE_RECT) |
| **Bay** | Pole rozdzielcze (IN, OUT, TR, OZE...) | Bay detection w pipeline |
| **Junction** | Węzeł T (rozgałęzienie magistrali) | Marker na trunk path |
| **Corridor** | Magistrala (ciąg linii SN) | TrunkPath highlight |

## 4. SelectionRef — system nawigacji

Kliknięcie elementu na SLD generuje `SelectionRef`:

```typescript
interface SelectionRef {
  elementId: string;           // kanoniczny elementId (= ENMElement.ref_id)
  element_type: string;       // bus | branch | transformer | ...
  wizard_step_hint: string;   // K1-K10 — krok kreatora
}
```

**Nawigacja**:
- SLD → Inspektor: wyświetl właściwości ENM + wyniki obliczeń
- SLD → Kreator: otwórz odpowiedni krok (K2 dla źródeł, K4 dla linii...)
- Raport → SLD: podświetl element na schemacie

## 5. Geometria stacyjna

### StationBoundingBox (NO_ROUTE_RECT)

Prostokąt stacji na schemacie, obliczany z pozycji szyn stacji:

```python
@dataclass(frozen=True)
class StationBoundingBox:
    substation_ref: str
    station_name: str
    station_type: str    # gpz | mv_lv | switching | customer
    x: float
    y: float
    width: float
    height: float
    bus_refs: tuple[str, ...]
    bay_count: int
```

Kolory ramki:
- GPZ: czerwony (`#dc2626`)
- SN/nn: niebieski (`#2563eb`)
- Rozdzielcza: pomarańczowy (`#d97706`)
- Odbiorcy: zielony (`#059669`)

### TrunkPath (tor główny)

Wyróżniona ścieżka od GPZ do końca magistrali, rysowana grubszą linią:

```python
@dataclass(frozen=True)
class TrunkPathSegment:
    branch_ref: str
    from_bus_ref: str
    to_bus_ref: str
    order: int           # kolejność w torze
    length_km: float
    is_highlighted: bool
```

### EntryPointMarker

Punkt wejścia kabli zewnętrznych na krawędzi ramki stacji:

```python
@dataclass(frozen=True)
class EntryPointMarker:
    substation_ref: str
    bus_ref: str
    entry_side: str      # top | bottom | left | right
    x: float
    y: float
    label: str           # "Wejście: <nazwa stacji>"
```

## 6. Cross-reference raport ↔ SLD

Każdy element w raporcie posiada powiązanie:

```python
@dataclass(frozen=True)
class CrossReference:
    enm_ref_id: str          # identyfikator w modelu
    enm_element_type: str    # typ elementu
    enm_element_name: str    # nazwa (PL)
    sld_symbol_id: str       # ID symbolu na SLD
    wizard_step_hint: str    # krok kreatora
    report_section: str      # sekcja raportu
```

Sekcje raportu:
- Topologia sieci (szyny)
- Zasilanie (źródła)
- Linie i kable (gałęzie)
- Transformatory
- Odbiory (odbiorniki)
- Generacja (generatory OZE)
- Stacje
- Magistrale

## 7. Złota Sieć Testowa

Deterministyczny fixture do testów integracyjnych:

- **20 stacji**: 1 GPZ + 19 SN/nn
- **31+ segmentów** kablowych
- **2 magistrale**: M1 (radialna) + M2 (pierścieniowa z NO point)
- **3 węzły T**
- **2 generatory OZE** (PV + WIND)
- **22 transformatory** (2 WN/SN + 19 SN/nn + 1 dodatkowy)

## 8. Invarianty (BINDING)

1. **Determinizm**: Ten sam ENM → identyczny SLD, bit-po-bicie (154 testy, 100x hash, 50x permutacja)
2. **Bijection**: Każdy symbol SLD ↔ dokładnie jeden element ENM
3. **NO_ROUTE_RECT**: Trasy kablowe nie przechodzą przez ramki stacji
4. **SelectionRef**: Klik na SLD zawsze generuje poprawny SelectionRef
5. **Cross-reference**: Każdy element raportu ma powiązanie do ENM
6. **Polish labels**: Etykiety UI wyłącznie po polsku, bez nazw kodowych
7. **White Box**: Obliczenia solverów audytowalne (nie dotyczy SLD)
8. **FROZEN solvers**: Warstwa SLD NIE dotyka solverów (IEC 60909, Newton-Raphson)
9. **Zero fabrication** (RUN #3D-FIX): Brak danych → FixAction, nigdy domyslna wartosc (np. voltageKv: null, nie 15)
10. **Zero string heuristics** (RUN #3D-FIX): Typologia z danych domenowych (nodeType, generatorKind), nie z nazw
11. **Semantic ports** (RUN #3D-FIX): Porty szyn: IN/OUT (nie generyczne BUS), rozwiazywane przez resolvePortId
12. **Station typology validation** (RUN #3D-FIX): validateEmbeddingVsDomain → station.typology_conflict FixAction
