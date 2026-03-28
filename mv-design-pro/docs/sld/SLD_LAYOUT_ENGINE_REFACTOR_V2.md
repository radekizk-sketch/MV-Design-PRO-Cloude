# SLD LayoutEngine V2 — domknięcie architektury warstwowej

## Dlaczego poprzedni kontrakt był niewystarczający

`VisualGraphV1` mieszał semantykę SLD, elementy aparaturowe i dane o geometrii symboli (port `relativeX/relativeY`).
To utrudniało stabilny kontrakt między adapterem a silnikiem layoutu.

Od tego etapu `VisualGraphV1` ma status **legacy / kompatybilność**.

## Nowy podział warstw

```text
Snapshot / TopologyInput
  -> SldSemanticGraphV1 (kanon semantyczny)
  -> LayoutInputGraphV1 (kanon wejścia do layoutu)
  -> LayoutResultV1
  -> Renderer
```

## Kanon semantyczny

Plik: `frontend/src/ui/sld/core/sldSemanticGraph.ts`

- typ stacji: `nodeType: STATION_SN_NN` + `stationKind: A|B|C|D`
- typ generatora: `nodeType: GENERATOR` + `generatorKind: PV|BESS|WIND`
- brak `fromNodeId/toNodeId/connectedToNodeId` w atrybutach węzła
- brak geometrii portów (port = `{id, role}`)
- jawny model kontenerów: `containers[]`

## Kanon wejścia layoutu

Plik: `frontend/src/ui/sld/core/layoutInputGraph.ts`

- tylko dane potrzebne do layoutu/routingu,
- profile symboli i portów (`symbolProfile`, `portGeometry`) nakładane dopiero tutaj,
- constraints layoutu (`minSpacing`, `maxSpacing`, `keepRingSecondaryLane`).

## LayoutEngine

Plik: `frontend/src/ui/sld/core/layoutEngine.ts`

- LayoutEngine konsumuje `LayoutInputGraphV1`, nie `VisualGraphV1`.
- Strategie placement: `legacy | greedy | force-directed`.
- Routing: `orthogonal` (A* + obstacle avoidance) oraz `diagonal`.
- Legacy działa przez cienki bridge `LayoutInputGraphV1 -> VisualGraphV1`.

## Kompatybilność wsteczna

- `computeLegacyLayout(...)` pozostał bez zmian funkcjonalnych.
- Publiczny `computeLayout(...)`:
  1) `VisualGraphV1 -> SldSemanticGraphV1`
  2) `SldSemanticGraphV1 -> LayoutInputGraphV1`
  3) `LayoutEngine.compute(...)`
- Dla `strategy: 'legacy'` używany jest most zgodności do starego pipeline.
