# SLD Algorithm Layout Spec — Segmentacja Topologiczna

**Status:** KANONICZNY | **Wersja:** 1.0 | **Data:** 2026-02-13
**Kontekst:** RUN #3C — Formalny opis algorytmu segmentacji PrimaryTree/TRUNK/BRANCH/SECONDARY + station detection rules

---

## 1. Cel

Formalny opis algorytmu segmentacji topologicznej w `topologyAdapterV2.ts`.
Segmentacja klasyfikuje kazda krawedz VisualGraphV1 jako TRUNK, BRANCH, SECONDARY_CONNECTOR,
BUS_COUPLER, TRANSFORMER_LINK lub INTERNAL_SWITCHGEAR.

**Gwarancje:**
- Determinizm: ten sam TopologyInputV1 → identyczna segmentacja (bit-for-bit)
- Brak self-edges: kazda krawedz laczy DWA ROZNE nodeId
- Brak heurystyk stringowych: wszystkie typy z pol strukturalnych

---

## 2. Dane wejsciowe

```
TopologyInputV1 {
  connectionNodes: ConnectionNodeV1[]     // szyny (bus) — sortowane po id
  branches: TopologyBranchV1[]            // galezi (line/cable/bus_link/tr_link) — sortowane po id
  devices: TopologyDeviceV1[]             // aparaty (CB/DS/ES/relay) — sortowane po id
  stations: TopologyStationV1[]           // stacje z memberBusIds/memberBranchIds
  generators: TopologyGeneratorV1[]       // generatory (PV/BESS/WIND/SYNCHRONOUS) z kind
  sources: TopologySourceV1[]             // zrodla sieciowe (GPZ)
  loads: TopologyLoadV1[]                 // odbiory
  protectionBindings: TopologyProtectionV1[]
  snapshotId: string
  snapshotFingerprint: string
}
```

---

## 3. Algorytm segmentacji

### 3.1 Budowa grafu

1. **Wezly (nodes):**
   - Kazdy `connectionNode` → wezel `BUS_SN` (voltageKv >= 1) lub `BUS_NN` (voltageKv < 1)
   - Kazda `station` → wezel `STATION_SN_NN_*` (typ z classifyStationType)
   - Kazdy `source` → wezel `GRID_SOURCE`
   - Kazdy `generator` → wezel `GENERATOR_PV` / `GENERATOR_BESS` / `GENERATOR_WIND` (z kind)
   - Kazdy `load` → wezel `LOAD`
   - Sortowanie po id na kazdym etapie

2. **Krawedzie (edges):**
   - Kazdy `branch` → krawedz laczyca `fromNodeId` i `toNodeId`
   - **TWARDY INVARIANT:** `fromNodeId !== toNodeId` — jezeli rowne, emituj FixAction i pomin krawedz

### 3.2 BFS Spanning Tree

```
INPUT:  graf G = (V, E)
OUTPUT: drzewo T ⊆ E, korzenie roots[]

1. roots = wezly typu GRID_SOURCE, posortowane po id
2. Jezeli brak GRID_SOURCE: roots = [wezel o najnizszym id]
3. visited = {}
4. T = {}
5. Dla kazdego root w roots (w kolejnosci):
   a. Jezeli root ∈ visited: pomin
   b. BFS(root):
      - Kolejka Q = [root]
      - visited.add(root)
      - Dopoki Q niepusta:
        i.  u = Q.dequeue()
        ii. neighbors(u) = sasiedzi u posortowani po id (TIE-BREAK)
        iii.Dla kazdego v w neighbors(u):
            - Jezeli v ∉ visited:
              T.add(u→v)
              visited.add(v)
              Q.enqueue(v)
6. return T
```

**Determinizm:** Tie-break przez sortowanie sasiadow po id na kazdym kroku BFS.

### 3.3 Identyfikacja Trunk

```
INPUT:  drzewo T, root
OUTPUT: trunk_edges ⊆ T

1. Zbuduj distance_map: BFS od root, kazdy wezel → odleglosc od root
2. farthest = wezel o max odleglosci (tie-break: najnizszy id)
3. trunk_path = backtrack od farthest do root (po parent pointers z BFS)
4. trunk_edges = krawedzie na trunk_path
```

**Definicja:** TRUNK = najdluzsza sciezka w spanning tree od root (GRID_SOURCE).

### 3.4 Klasyfikacja krawedzi

```
Dla kazdej krawedzi e w E:
  1. Jezeli e ∈ T (spanning tree):
     a. Jezeli e ∈ trunk_edges → TRUNK
     b. W przeciwnym razie → BRANCH
  2. Jezeli e ∉ T (nie w spanning tree):
     a. Jezeli e ma device z isNormallyOpen=true → SECONDARY_CONNECTOR
     b. W przeciwnym razie → SECONDARY_CONNECTOR
  3. Nadpisania specjalne:
     a. Jezeli branch.kind == BUS_LINK && oba wezly w tej samej stacji → BUS_COUPLER
     b. Jezeli branch.kind == TR_LINK → TRANSFORMER_LINK
```

### 3.5 Wynik

Kazda krawedz VisualEdgeV1 ma pole `edgeType: EdgeTypeV1`:

| EdgeTypeV1 | Opis | Warunek |
|------------|------|---------|
| `TRUNK` | Magistrala od GPZ | Najdluzsza sciezka w spanning tree |
| `BRANCH` | Odgalezienie od trunk | Reszta spanning tree |
| `SECONDARY_CONNECTOR` | Ring close, NOP, zapas | Nie w spanning tree |
| `BUS_COUPLER` | Sprzeglo szyn | BUS_LINK w tej samej stacji |
| `TRANSFORMER_LINK` | Polaczenie transformatorowe | TR_LINK branch |
| `INTERNAL_SWITCHGEAR` | Wewnetrzne aparaty stacji | Krawedzie wewnatrz bloku stacji |

---

## 4. Station Detection Rules

### 4.1 Klasyfikacja stacji (classifyStationType)

```
INPUT:  station: TopologyStationV1
OUTPUT: StationType: TYPE_A | TYPE_B | TYPE_C | TYPE_D

Algorytm:
1. busCount = station.memberBusIds.length
2. branchCount = station.memberBranchIds.length
3. stationKind = station.stationType (z domeny)

Reguly (w kolejnosci priorytetu):
  a. busCount >= 2 → TYPE_D (sekcyjna: 2+ szynozbiorcze)
  b. stationKind == SWITCHING → TYPE_D
  c. branchCount >= 3 → TYPE_C (odgalezieniowa: 3+ galezi)
  d. stationKind == DISTRIBUTION && (switchIds.length > 0 || transformerIds.length > 0)
     → TYPE_B (pomiarowa z zabezpieczeniem)
  e. W przeciwnym razie → TYPE_A (podstawowa SN/nN)
     + emituj FixAction station.typology_fallback
```

### 4.2 Typy stacji

| Typ | Nazwa | Cechy | Regula |
|-----|-------|-------|--------|
| TYPE_A | Podstawowa (SN/nN) | 1 TR, linia zasilajaca, rozdzielnia nN | Domyslny |
| TYPE_B | Pomiarowa | Jak A + pole pomiarowe + zabezpieczenie | DISTRIBUTION + aparaty |
| TYPE_C | Odgalezieniowa | Jak B + pole odgalezieniowe | branchCount >= 3 |
| TYPE_D | Sekcyjna | 2+ szynozbiorcze, sprzeglo, lacznik sekcyjny | busCount >= 2 |

---

## 5. OZE Detection Rules

### 5.1 Klasyfikacja generatorow

```
INPUT:  generator: TopologyGeneratorV1
OUTPUT: NodeTypeV1

Mapowanie GeneratorKind → NodeTypeV1:
  PV          → GENERATOR_PV
  BESS        → GENERATOR_BESS
  WIND        → GENERATOR_WIND
  SYNCHRONOUS → GENERATOR (generic)
```

### 5.2 Bridge: SymbolBridgeMetadata

Dla sciezki bridge (readTopologyFromSymbols):
```
SymbolBridgeMetadata {
  generatorTypes: Map<symbolId, GeneratorKind>
  voltageOverrides: Map<symbolId, number>
  stationMembership: Map<symbolId, stationId>
}
```

Generator typ pochodzi WYLACZNIE z:
1. `metadata.generatorTypes[symbolId]` — jawne mapowanie
2. `symbol.elementType` — pole strukturalne
3. **NIGDY** z `symbol.elementName` — zero heurystyk stringowych

---

## 6. Invarianty (CI guards)

| # | Invariant | Guard |
|---|-----------|-------|
| INV-01 | Brak self-edges: `∀e ∈ E: e.fromNodeId ≠ e.toNodeId` | Guard 8 |
| INV-02 | Brak heurystyk stringowych w plikach kontraktowych | Guard 9 |
| INV-03 | Brak legacy kodu w adapterze V1 | Guard 10 |
| INV-04 | Determinizm: `hash(f(input)) == hash(f(permute(input)))` | Test TV2-18 |
| INV-05 | Stabilnosc: `hash(f(input)) == hash(f(input))` po 100x | Test TV2-17 |
| INV-06 | PV/BESS NIGDY jako LOAD | Test TV2-14..16 |
| INV-07 | TRUNK istnieje w kazdym grafie z GRID_SOURCE | Test TV2-12 |

---

## 7. Zlozonosc obliczeniowa

| Krok | Zlozonosc | Uzasadnienie |
|------|-----------|--------------|
| Budowa grafu | O(V + E) | Iteracja po wejsciu |
| Sortowanie sasiadow | O(V * d * log d) | d = max degree |
| BFS spanning tree | O(V + E) | Standardowy BFS |
| Identyfikacja trunk | O(V) | Backtrack po parent pointers |
| Klasyfikacja krawedzi | O(E) | Iteracja po krawedziach |
| **Laczna** | **O(V * d * log d + E)** | Dominuje sortowanie sasiadow |

Dla typowej sieci SN (V < 1000, d < 10): **< 10ms**.

---

## 8. Powiazane pliki

| Plik | Rola |
|------|------|
| `frontend/src/ui/sld/core/topologyAdapterV2.ts` | Implementacja segmentacji |
| `frontend/src/ui/sld/core/topologyInputReader.ts` | Kontrakt wejsciowy |
| `frontend/src/ui/sld/core/visualGraph.ts` | Kontrakt wyjsciowy (VisualGraphV1) |
| `frontend/src/ui/sld/core/__tests__/topologyAdapterV2.test.ts` | Testy 7 golden networks |
| `scripts/sld_determinism_guards.py` | Guards 8-10 |
