# SLD Semantic Model — Canonical V1

## Cel

Dokument definiuje kanoniczny model semantyczny SLD niezależny od geometrii renderera.

## Najważniejsze reguły

1. `nodeType: STATION_SN_NN` + `stationKind`.
2. `nodeType: GENERATOR` + `generatorKind`.
3. Topologia tylko w relacjach krawędzi, nie w atrybutach node.
4. Port semantyczny: tylko `id` + `role`.
5. Jawne kontenery semantyczne (`containers`) dla struktur stacyjnych.

## Struktura kontraktu

- `SldSemanticGraphV1`
  - `nodes: SemanticNodeV1[]`
  - `edges: SemanticEdgeV1[]`
  - `containers: SemanticContainerV1[]`

## Relacja do warstw

- Snapshot/TopologyInput -> `SldSemanticGraphV1`
- `SldSemanticGraphV1` -> `LayoutInputGraphV1`
- `LayoutInputGraphV1` -> `LayoutResultV1`

## Status

Ten model jest kanonicznym kontraktem publicznym dla warstwy semantycznej SLD.
`VisualGraphV1` ma status przejściowy (legacy).
