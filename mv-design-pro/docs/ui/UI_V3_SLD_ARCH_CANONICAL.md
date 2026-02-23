# UI V3 — ARCHITEKTURA SLD (KANON)

**Status**: BINDING
**Data**: 2026-02-23
**Wersja**: 1.0.0
**Zakres**: Kanoniczny pipeline SLD — od Snapshot do piksela

---

## 1. ZASADA NADRZĘDNA

SLD (Schemat jednokreskowy) = f(Snapshot). Deterministyczna transformacja:
- Ten sam Snapshot → identyczny SLD (geometria, symbole, etykiety, kolejności).
- Overlay = g(Layout, Results) — nałożenie wyników BEZ modyfikacji geometrii.
- Kamera (pan/zoom) NIE wpływa na układ.

---

## 2. PIPELINE SLD V3

```
  NetworkSnapshot
        │
        ▼
  ┌─────────────────────────────┐
  │  TopologyInputReader        │  Odczyt typów domenowych z ENM
  │  topologyInputReader.ts     │
  └────────────┬────────────────┘
               │ ENM elements
               ▼
  ┌─────────────────────────────┐
  │  TopologyAdapterV2          │  Budowa grafu wizualnego
  │  topologyAdapterV2.ts       │  Mapowanie: Bus→Node, Branch→Edge,
  │                             │  Station→StationBlock, Switch→SwitchNode
  └────────────┬────────────────┘
               │ VisualGraphV1
               ▼
  ┌─────────────────────────────┐
  │  SwitchgearConfig           │  Konfiguracja rozdzielnicy
  │  switchgearConfig.ts        │  Pola (Field), Aparaty (CB, DS)
  │  switchgearRenderer.ts      │
  └────────────┬────────────────┘
               │ VisualGraphV1 (wzbogacony)
               ▼
  ┌─────────────────────────────┐
  │  StationBlockBuilder        │  Budowa bloków stacji
  │  stationBlockBuilder.ts     │  Geometria: szyna, pola, aparaty
  └────────────┬────────────────┘
               │ VisualGraphV1 + StationBlocks
               ▼
  ┌─────────────────────────────────────────────────────────┐
  │  LayoutPipeline (5 faz)                                 │
  │  engine/sld-layout/pipeline.ts                          │
  │                                                         │
  │  Faza 1: voltage-bands.ts    → Przypisanie pasm napięć  │
  │  Faza 2: bay-detection.ts    → Wykrywanie pól           │
  │  Faza 3: crossing-min.ts     → Minimalizacja skrzyżowań │
  │  Faza 4: coordinates.ts      → Przypisanie współrzędnych │
  │  Faza 5: routing.ts          → Trasowanie krawędzi      │
  └────────────┬────────────────────────────────────────────┘
               │ LayoutResultV1
               ▼
  ┌─────────────────────────────┐
  │  GeometryOverrides          │  Nadpisania trybu projektowego (CAD)
  │  geometryOverrides.ts       │  Tylko w trybie PROJECT
  │  applyOverrides.ts          │  Kompozycja: auto + manual
  └────────────┬────────────────┘
               │ EffectiveLayout
               ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Renderer                                                │
  │                                                          │
  │  EtapSymbolRenderer.tsx    → Symbole ETAP (SVG)         │
  │  BranchRenderer.tsx        → Odcinki (linie/kable)      │
  │  ConnectionRenderer.tsx    → Połączenia                  │
  │  StationFieldRenderer.tsx  → Pola stacji                 │
  │  TrunkSpineRenderer.tsx    → Magistrala                  │
  │  JunctionDotLayer.tsx      → Węzły połączeń              │
  │  SldTechLabelsLayer.tsx    → Etykiety techniczne         │
  └────────────┬────────────────────────────────────────────┘
               │ SVG/Canvas output
               ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Overlay (niezależna ścieżka)                            │
  │                                                          │
  │  ResultJoin (resultJoin.ts)                              │
  │    → łączy LayoutResultV1 + ResultSetV1 → OverlayTokens │
  │                                                          │
  │  PowerFlowOverlay.tsx      → Nakładka rozpływu mocy     │
  │  ProtectionOverlayLayer.tsx → Nakładka zabezpieczeń     │
  │  DiagnosticsOverlay.tsx    → Nakładka diagnostyki       │
  │  ResultsOverlay.tsx        → Nakładka ogólna            │
  │                                                          │
  │  OverlayLegend.tsx         → Legenda                    │
  │  DeltaOverlayToggle.tsx    → Przełącznik porównania     │
  └─────────────────────────────────────────────────────────┘
```

---

## 3. KONTRAKTY DANYCH

### 3.1 VisualGraphV1
```typescript
interface VisualGraphV1 {
  nodes: VisualNodeV1[];       // Szyny (bus), łączniki (switch)
  edges: VisualEdgeV1[];       // Odcinki (branch), połączenia
  ports: VisualPortV1[];       // Porty połączeń
  stationBlocks: StationBlockV1[];  // Bloki stacji
  metadata: {
    snapshotHash: string;      // SHA-256 migawki źródłowej
    elementCount: number;      // Liczba elementów
    timestamp: string;         // ISO 8601
  };
}

interface VisualNodeV1 {
  id: string;                  // Deterministyczny
  elementRef: ElementRefV1;    // Odwołanie do elementu domenowego
  kind: 'bus' | 'switch' | 'junction' | 'source' | 'load' | 'transformer';
  label: string;               // Etykieta polska
  voltage_kv: number;          // Napięcie znamionowe
  position?: { x: number; y: number };  // Ustawiane przez LayoutPipeline
}

interface VisualEdgeV1 {
  id: string;
  from: string;                // id węzła źródłowego
  to: string;                  // id węzła docelowego
  elementRef: ElementRefV1;
  kind: 'line' | 'cable' | 'transformer_winding' | 'connection';
  label: string;
  waypoints?: { x: number; y: number }[];  // Ustawiane przez Phase 5
}
```

### 3.2 LayoutResultV1
```typescript
interface LayoutResultV1 {
  positions: Map<string, { x: number; y: number }>;  // nodeId → (x, y)
  edgeRoutes: Map<string, { x: number; y: number }[]>;  // edgeId → waypoints
  stationBounds: Map<string, BoundingBox>;  // stationId → bbox
  voltageBands: Map<number, { yMin: number; yMax: number }>;  // kV → band
  layoutHash: string;          // SHA-256 całego układu
  metadata: {
    phaseTimings: number[];    // ms per faza [F1, F2, F3, F4, F5]
    totalTimeMs: number;
    crossingCount: number;
    nodeCount: number;
    edgeCount: number;
  };
}
```

### 3.3 OverlayPayloadV1 (ZAMROŻONE — z ResultSetV1)
```typescript
interface OverlayPayloadV1 {
  elements: OverlayElementV1[];
  runId: string;
  analysisKind: 'SHORT_CIRCUIT' | 'LOAD_FLOW' | 'PROTECTION';
  metadata: {
    timestamp: string;
    caseId: string;
    caseName: string;
  };
}

interface OverlayElementV1 {
  elementId: string;
  metrics: OverlayMetricV1[];
  badges: OverlayBadgeV1[];
  severity: OverlaySeverity;   // 'ok' | 'warn' | 'error' | 'critical'
}
```

---

## 4. FAZY PIPELINE UKŁADU

### Faza 1: Pasma napięciowe (voltage-bands)
- **Wejście**: VisualGraphV1
- **Operacja**: Grupowanie węzłów wg napięcia (SN, nN).
- **Wyjście**: Przypisanie `band_index` do każdego węzła.
- **Plik**: `engine/sld-layout/phase1-voltage-bands.ts`
- **Deterministyczność**: TAK — sortowanie napięć malejąco.

### Faza 2: Wykrywanie pól (bay-detection)
- **Wejście**: VisualGraphV1 + band_index
- **Operacja**: Identyfikacja pól rozdzielniczych w stacjach.
- **Wyjście**: Grupy pól per stacja.
- **Plik**: `engine/sld-layout/phase2-bay-detection.ts`
- **Deterministyczność**: TAK — sortowanie pól wg ID.

### Faza 3: Minimalizacja skrzyżowań (crossing-min)
- **Wejście**: Grupy pól + topologia
- **Operacja**: Optymalizacja kolejności pól w celu minimalizacji skrzyżowań krawędzi.
- **Wyjście**: Zoptymalizowana kolejność pól.
- **Plik**: `engine/sld-layout/phase3-crossing-min.ts`
- **Deterministyczność**: TAK — algorytm deterministyczny (barycentric), brak losowości.

### Faza 4: Przypisanie współrzędnych (coordinates)
- **Wejście**: Zoptymalizowane kolejności + geometria stacji
- **Operacja**: Obliczenie pozycji (x, y) dla każdego węzła.
- **Wyjście**: Mapa `nodeId → (x, y)`.
- **Plik**: `engine/sld-layout/phase4-coordinates.ts`
- **Deterministyczność**: TAK — formułowe obliczenia z deterministycznymi wejściami.

### Faza 5: Trasowanie krawędzi (routing)
- **Wejście**: Pozycje węzłów + topologia krawędzi
- **Operacja**: Obliczenie trasy (waypoints) dla każdej krawędzi.
- **Wyjście**: Mapa `edgeId → waypoints[]`.
- **Plik**: `engine/sld-layout/phase5-routing.ts`
- **Deterministyczność**: TAK — trasowanie ortogonalne z deterministycznym resolverem kolizji.

---

## 5. TRYB PROJEKTOWY (CAD OVERRIDES)

### 5.1 Mechanizm
- Tryb projektowy pozwala ręcznie przesuwać elementy na SLD.
- Przesunięcia zapisywane jako `GeometryOverrides` (obok auto-layoutu).
- `applyOverrides(LayoutResultV1, GeometryOverrides) → EffectiveLayout`.
- Efektywny układ = auto-layout + manualne nadpisania.

### 5.2 Kontrakty
```typescript
interface GeometryOverrides {
  nodePositions: Map<string, { x: number; y: number }>;  // Ręczne pozycje
  edgeWaypoints: Map<string, { x: number; y: number }[]>;  // Ręczne trasy
  snapshotHash: string;  // Hash migawki przy której nadpisania były tworzone
}
```

### 5.3 Reguły
- Nadpisania są per-element (nie globalne).
- `snapshotHash` waliduje aktualność — jeśli Snapshot się zmienił, nadpisania mogą być nieaktualne.
- Nadpisania zapisywane na backendzie (`POST /api/sld-overrides`).
- Plik: `ui/sld/core/geometryOverrides.ts`, `ui/sld/core/applyOverrides.ts`.

---

## 6. SYMBOLE SLD

### 6.1 Standard wizualny
- Symbole zgodne ze standardem ETAP / IEC 60617.
- Renderowanie: SVG (React komponenty).
- Styl przemysłowy: `ui/sld/IndustrialAesthetics.ts`.

### 6.2 Mapowanie elementów → symboli
| Element domenowy | Symbol SLD | Renderer |
|-----------------|-----------|----------|
| GridSource (GPZ) | Źródło sieciowe (3 strzałki) | `EtapSymbolRenderer.tsx` |
| Bus (szyna) | Gruba linia pozioma | `EtapSymbolRenderer.tsx` |
| Branch (linia) | Linia ciągła + etykieta | `BranchRenderer.tsx` |
| Branch (kabel) | Linia z krzyżykami | `BranchRenderer.tsx` |
| Transformer2W | Dwa okręgi | `EtapSymbolRenderer.tsx` |
| Switch (wyłącznik CB) | Kwadrat z krzyżem | `EtapSymbolRenderer.tsx` |
| Switch (odłącznik DS) | Kąt otwarcia | `EtapSymbolRenderer.tsx` |
| Load | Strzałka w dół | `EtapSymbolRenderer.tsx` |
| Generator | Okrąg z „G" | `EtapSymbolRenderer.tsx` |
| Inverter (PV) | Okrąg z „~" + panel | `EtapSymbolRenderer.tsx` |
| Inverter (BESS) | Okrąg z „~" + bateria | `EtapSymbolRenderer.tsx` |
| Relay (zabezpieczenie) | Prostokąt nad wyłącznikiem | `StationFieldRenderer.tsx` |
| Station (blok) | Ramka z etykietą | `StationFieldRenderer.tsx` |
| NOP (punkt normalnie otwarty) | Łącznik otwarty z etykietą NOP | `EtapSymbolRenderer.tsx` |

### 6.3 Kanon: Zabezpieczenie (Relay) nad wyłącznikiem
- Zabezpieczenie przypięte do wyłącznika (CB).
- Renderowane NAD wyłącznikiem w osi pola.
- Nie jest samodzielnym elementem na SLD — jest atrybutem pola.
- Plik: `ui/sld/core/fieldDeviceContracts.ts`.

---

## 7. OVERLAY WYNIKÓW

### 7.1 Pipeline overlay
```
  ResultSetV1 (z backendu)
        │
        ▼
  ResultJoin (resultJoin.ts)
    Łączy: LayoutResultV1 (pozycje) + ResultSetV1 (wartości)
    Produkuje: OverlayTokens
        │
        ▼
  OverlayRenderer
    Renderuje tokeny jako warstwy SVG nad SLD:
    - Etykiety wartości (np. Ik" = 12.5 kA)
    - Kolory wg severity (zielony/żółty/czerwony/karmazynowy)
    - Ikony werdyktów (PASS/FAIL)
    - Strzałki kierunku przepływu mocy
```

### 7.2 Overlay delta (porównanie)
- Porównanie 2 przebiegów: RunA vs RunB.
- Wizualizacja: kolory zmiany (lepiej = niebieski, gorzej = czerwony, bez zmian = szary).
- Plik: `ui/sld-overlay/sldDeltaOverlayStore.ts`, `ui/sld-overlay/DeltaOverlayLegend.tsx`.

### 7.3 Invarianty overlay
1. Overlay NIE modyfikuje pozycji elementów.
2. Overlay NIE modyfikuje geometrii SLD.
3. Overlay jest warstwą wizualną NAD SLD.
4. Overlay NIE zawiera obliczeń fizycznych.
5. Overlay jest deterministyczny: te same dane → ten sam wynik wizualny.

---

## 8. BUDŻETY WYDAJNOŚCI

| Operacja | Budżet | Sieć referencyjna |
|----------|--------|-------------------|
| TopologyAdapterV2 | ≤ 10ms | 200 elementów |
| LayoutPipeline (5 faz) | ≤ 50ms | 200 elementów |
| StationBlockBuilder | ≤ 10ms | 20 stacji |
| Renderer (pełny) | ≤ 100ms | 200 elementów |
| Overlay (ResultJoin + render) | ≤ 30ms | 200 elementów |
| Eksport PNG | ≤ 500ms | 200 elementów |

---

## 9. TESTY DETERMINISTYCZNE SLD

| Test | Plik | Opis |
|------|------|------|
| VisualGraph kontrakt | `sld/core/__tests__/visualGraph.test.ts` | Struktura grafu wizualnego |
| Deterministyczność 100× | `sld/core/__tests__/determinism.test.ts` | Powtórzalność wyniku |
| LayoutPipeline kontrakt | `sld/core/__tests__/layoutPipeline.test.ts` | Poprawność 5-fazowego pipeline |
| TopologyAdapterV2 | `sld/core/__tests__/topologyAdapterV2.test.ts` | Mapowanie domenowe |
| StationBlockBuilder | `sld/core/__tests__/stationBlockBuilder.test.ts` | Budowa bloków stacji |
| SwitchgearConfig | `sld/core/__tests__/switchgearConfig.test.ts` | Konfiguracja rozdzielnicy |
| Hash parity | `sld/core/__tests__/switchgearConfig.hashParity.test.ts` | Zgodność hashy FE↔BE |
| Golden network E2E | `sld/core/__tests__/goldenNetworkE2E.test.ts` | Pełny pipeline golden |
| Przemysłowa estetyka | `sld/core/__tests__/industrialAestheticsLayout.test.ts` | Styl ETAP |
| Deterministyczność silnika | `engine/sld-layout/__tests__/determinism.test.ts` | Silnik układu 100× |
| Nadpisania geometrii | `sld/core/__tests__/geometryOverrides.test.ts` | Kontrakt CAD |
| Eksport manifest | `sld/core/__tests__/exportManifest.test.ts` | Deterministyczność eksportu |
| PV/BESS walidacja | `sld/core/__tests__/pvBessValidation.test.ts` | Reguła transformatora |

---

## 10. STRAŻNICY CI

| Strażnik | Plik | Cel |
|----------|------|-----|
| `sld_determinism_guards.py` | `scripts/sld_determinism_guards.py` | Deterministyczność renderowania |
| `sld_render_artifacts.ts` | `scripts/sld_render_artifacts.ts` | Generowanie artefaktów golden |
| `overlay_no_physics_guard.py` | `scripts/overlay_no_physics_guard.py` | Brak fizyki w overlay |
| `arch_guard.py` | `scripts/arch_guard.py` | Granice warstw SLD |

---

*Dokument wiążący. Pipeline SLD V3 jest deterministyczny, testowalny i weryfikowalny hashami.*
