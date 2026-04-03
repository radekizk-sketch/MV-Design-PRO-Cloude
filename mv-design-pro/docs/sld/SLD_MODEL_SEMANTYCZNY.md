# SLD_MODEL_SEMANTYCZNY

Status: wiazacy dla aktualnych modulow semantycznych.

Kod:
- `frontend/src/ui/sld/core/sldSemanticAdapter.ts`
- `frontend/src/ui/sld/core/semanticGraphBuilder.ts`
- `frontend/src/ui/sld/core/stationBlockBuilder.ts`
- `frontend/src/ui/sld/core/__tests__/*`

Stan aktywny:
- repo ma wydzielona warstwe semantyczna SLD i testy kontraktowe tej warstwy,
- adapter i buildery modeluja graf semantyczny, bloki stacyjne i relacje topologiczne.

Regula wiazaca:
- dokumentacja ma rozrozniac istnienie modelu semantycznego od tego, czy dany ekran renderuje bezposrednio z tego modelu.

Stan aktualny ekranu:
- `SldEditorPage.tsx` renderuje live SLD z `enmSnapshotToSldSymbols(snapshot)`,
- aktywny ekran nie jest jeszcze przepiety bezposrednio na `SldSemanticModelV1`.

Wniosek:
- model semantyczny istnieje i jest testowany,
- runtime edycyjny nadal korzysta z prostszej projekcji snapshot -> symbole -> layout.
