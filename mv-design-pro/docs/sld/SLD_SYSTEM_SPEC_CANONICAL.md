# SLD_SYSTEM_SPEC_CANONICAL

## Kanon systemu
1. Wejście: `Snapshot + logical_views`.
2. Adapter topologii wizualnej buduje model: trunk / branch / station / secondary links / ring / NOP.
3. Silnik geometrii wylicza deterministyczne współrzędne bazowe.
4. Renderer rysuje wyłącznie geometrię bazową (bez własnych heurystyk układu).
5. Overlay wyników/diagnostyki/selekcji działa wyłącznie jako warstwa prezentacyjna.

## Invarianty twarde
- Brak demo path w głównej ścieżce SLD (`App -> SldEditorPage`, `App -> SLDViewPage`).
- Ten sam snapshot hash => ten sam układ bazowy.
- Overlay nie modyfikuje hash snapshotu ani geometrii bazowej.
- Brak mocków API w krytycznym browser E2E.
