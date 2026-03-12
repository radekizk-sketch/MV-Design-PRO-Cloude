# SLD_SYSTEM_SPEC_CANONICAL

## Kanon systemu
1. Wejście: `Snapshot + logical_views`.
2. Adapter topologii wizualnej buduje model: trunk / branch / station / secondary links / ring / NOP.
   - Jeśli `logical_views.trunks[]/branches[]/secondary_connectors[]` są obecne, adapter MUSI użyć ich wprost jako kanonicznej segmentacji (bez heurystycznego odtwarzania osi magistrali).
3. Silnik geometrii wylicza deterministyczne współrzędne bazowe.
4. Renderer rysuje wyłącznie geometrię bazową (bez własnych heurystyk układu).
5. Overlay wyników/diagnostyki/selekcji działa wyłącznie jako warstwa prezentacyjna.
6. Geometria GPZ jest nienaruszalna globalnie: szyna SN GPZ jest zawsze pozioma, a pola/odejścia SN wychodzą pionowo w dół.

## Kontrakt topologii wizualnej (KROK B)
Adapter zwraca jawny kontrakt semantyczny `VisualTopologyContractV1` z rozdzieleniem klas bytów:
- `GpzVisual`
- `BusbarSnVisual`
- `FieldSnVisual`
- `TrunkSegmentVisual`
- `BranchSegmentVisual`
- `BranchJunctionVisual`
- `StationVisual`
- `RingConnectorVisual`
- `NopVisual`

Każdy byt ma obowiązkowe pola: `id`, `kind`, `role`, `domainElementId`, `topologyClass`, `ports[]`, `selectionElementId`, `inspectorElementId`.

## Model stacji
`StationVisual.stationRole` jest mapowany z embeddingu stacji:
- `TRUNK_LEAF` → `koncowa`
- `TRUNK_INLINE` → `przelotowa`
- `TRUNK_BRANCH` → `odgalezna`
- `LOCAL_SECTIONAL` → `sekcyjna`

Porty stacji są jawne:
- wejście SN (`wejscie_sn`) zawsze,
- wyjście SN (`wyjscie_sn`) dla stacji nie-końcowych,
- port odgałęzienia (`port_odgalezienia`) dla stacji odgałęźnych.

## Model ring / NOP
- ring jest modelowany przez `RingConnectorVisual` (klasa `sieciowy_wtorny`),
- NOP jest bytem `NopVisual` z `segmentId` i rolą `nop_eksploatacyjny`,
- NOP nie jest przerwą geometryczną; jest jawnie materializowany i utrzymywany przez `isNormallyOpen`.

## Invarianty twarde
- Brak demo path w głównej ścieżce SLD (`App -> SldEditorPage`, `App -> SLDViewPage`).
- Ten sam snapshot hash => ten sam układ bazowy.
- Overlay nie modyfikuje hash snapshotu ani geometrii bazowej.
- Brak mocków API w krytycznym browser E2E.


## Warstwa artefaktów renderu
- `SldRenderManifest` może opcjonalnie materializować podsumowanie `visualTopology` (`visualTopologySummary`) do audytu zgodności semantyki z renderem.
- Podsumowanie jest tylko odczytem kontraktu semantycznego i nie mutuje geometrii bazowej ani hashy layoutu.
