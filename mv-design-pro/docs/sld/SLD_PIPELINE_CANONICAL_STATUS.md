# SLD Pipeline Canonical Status (Iteration: geometry closure)

## 1) Kanoniczny aktywny pipeline SLD (real implementation)

Poniższe pliki tworzą realny, aktywny pipeline (topologia → geometria → render):

- Adapter topologii wizualnej:
  - `frontend/src/ui/sld/core/topologyAdapter.ts`
  - `frontend/src/ui/sld/core/topologyAdapterV2.ts`
  - `frontend/src/ui/sld/core/topologyInputReader.ts`
- Silnik geometrii + segmentacja trunk/branch/secondary + ring/NOP:
  - `frontend/src/ui/sld/core/layoutPipeline.ts`
  - `frontend/src/ui/sld/core/visualGraph.ts`
  - `frontend/src/ui/sld/core/layoutResult.ts`
- Station block layout:
  - `frontend/src/ui/sld/core/stationBlockBuilder.ts`
  - `frontend/src/ui/sld/core/switchgearRenderer.ts`
- Label anchors / rozmieszczenie podpisów:
  - `frontend/src/ui/sld/core/layoutPipeline.ts` (phase5_place_labels)
  - `frontend/src/ui/sld/symbols/UnifiedSymbolRenderer.tsx` (ETAP anchor rules)
- Renderer oparty o nową geometrię:
  - `frontend/src/ui/sld/SLDViewCanvas.tsx` (bez `useAutoLayout` fallback)
  - `frontend/src/ui/sld/TrunkSpineRenderer.tsx`
  - `frontend/src/ui/sld/BranchRenderer.tsx`
  - `frontend/src/ui/sld/StationFieldRenderer.tsx`

## 2) Moduły legacy, które nadal istnieją (status)

### 2.1 Wygasić (legacy, niekanoniczne dla final SLD pipeline)

- `frontend/src/ui/sld-editor/hooks/useAutoLayout.ts`
  - Status: **WYGASIĆ**
  - Uzasadnienie: viewer SLD (`SLDViewCanvas`) nie może już uruchamiać lokalnego engine layoutu.

- `frontend/src/ui/sld/layout/*` (anchor/lane/orthogonal path)
  - Status: **WYGASIĆ / MIGROWAĆ DO CORE LUB USUNĄĆ**
  - Uzasadnienie: ten tor jest historycznym torem busbar-feeder i nie jest canonical source dla finalnego layout pipeline V1.

- `frontend/src/ui/sld/layout-integration/busbarFeedersAdapter.ts`
  - Status: **WYGASIĆ**
  - Uzasadnienie: zależność od `ui/sld/layout/*` (legacy track).

### 2.2 Zostawić jako część nowego kanonu

- `frontend/src/ui/sld/EtapSymbolRenderer.tsx`
  - Status: **ZOSTAWIĆ (KANON)**
  - Uzasadnienie: to biblioteka symboli ETAP używana przez renderer docelowy (`UnifiedSymbolRenderer`, `StationFieldRenderer`).

## 3) Wzorce referencyjne (jawne niezmienniki)

Domknięte testami końcowymi (`finalGeometryCanon.test.ts`):

1. `GPZ → trunk → stacja końcowa`
2. `GPZ → trunk → stacja przelotowa`
3. `trunk → branch → stacja odgałęźna`
4. `trunk + ring + NOP` (secondary connector)

Dodatkowo: test braku kolizji podpisów/anchorów dla adnotacji kanonicznych.
