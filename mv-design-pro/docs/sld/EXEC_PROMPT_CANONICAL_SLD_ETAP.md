# PROMPT WYKONAWCZY — KANONICZNY SLD STYL ETAP / IEC 60617

> **TRYB**: Wykonawczy — realizuj bez zadawania pytań.
> **CEL**: Wprowadzenie kanonicznego schematu jednoliniowego SLD w stylu ETAP/PowerFactory
> z pełną integracją z istniejącym systemem MV-Design-PRO.
> **PRIORYTET**: Czytelność dla inżyniera energetyka > estetyka > kompaktowość.

---

## 0. KONTEKST — CO JUŻ ISTNIEJE

### Pliki kluczowe (NIE USUWAJ, ROZSZERZAJ):

| Plik | Rola | Akcja |
|------|------|-------|
| `frontend/src/ui/sld/core/visualGraph.ts` | Zamrożony kontrakt V1: NodeTypeV1, EdgeTypeV1, PortRoleV1 | **NIE MODYFIKUJ** |
| `frontend/src/ui/sld/core/layoutPipeline.ts` | 6-fazowy pipeline layoutu (vertical SN) | **ROZSZERZ** o Phase 7 |
| `frontend/src/ui/sld/core/layoutResult.ts` | LayoutResultV1, NodePlacementV1, EdgeRouteV1 | **ROZSZERZ** o nowe typy |
| `frontend/src/ui/sld/core/topologyAdapterV2.ts` | TopologyInput → VisualGraphV1 | **ROZSZERZ** o dane węzłowe |
| `frontend/src/ui/sld/IndustrialAesthetics.ts` | Stałe geometryczne GRID_BASE, Y_MAIN, etc. | **ROZSZERZ** o nowe stałe |
| `frontend/src/ui/sld/sldEtapStyle.ts` | ETAP_STROKE, kolory, typografia | **ROZSZERZ** o styl kanoniczny |
| `frontend/src/ui/sld/EtapSymbolRenderer.tsx` | Symbole SVG (viewBox 0 0 100 100) | **ROZSZERZ** o nowe symbole |
| `frontend/src/ui/sld/SymbolResolver.ts` | Mapowanie element → symbol ETAP | **ROZSZERZ** |
| `frontend/src/ui/sld/ConnectionRenderer.tsx` | Polyline SVG connections | **ROZSZERZ** o ● junction dots |
| `frontend/src/ui/sld/SLDViewCanvas.tsx` | Główny canvas SVG | **ROZSZERZ** o trunk rendering |
| `frontend/src/ui/sld/ResultsOverlay.tsx` | Overlay wyników na SLD | **ROZSZERZ** o dane węzłowe |
| `frontend/src/ui/sld/core/stationBlockBuilder.ts` | Budowa bloków stacyjnych | **ROZSZERZ** o łańcuch aparatów |

### Typy VisualGraph (ZAMROŻONE — nie modyfikuj):

```typescript
// NodeTypeV1: GRID_SOURCE, STATION_SN_NN_A/B/C/D, SWITCHGEAR_BLOCK,
//   TRANSFORMER_WN_SN, TRANSFORMER_SN_NN, BUS_SN, BUS_NN,
//   FEEDER_JUNCTION, LOAD, GENERATOR_PV, GENERATOR_BESS, GENERATOR_WIND,
//   SWITCH_BREAKER, SWITCH_DISCONNECTOR, SWITCH_LOAD_SWITCH, SWITCH_FUSE

// EdgeTypeV1: TRUNK, BRANCH, SECONDARY_CONNECTOR, BUS_COUPLER,
//   TRANSFORMER_LINK, INTERNAL_SWITCHGEAR

// PortRoleV1: IN, OUT, BRANCH, BUS, FIELD_IN, FIELD_OUT,
//   COUPLER_A, COUPLER_B, TRANSFORMER_HV, TRANSFORMER_LV
```

### Istniejące symbole ETAP SVG (etap_symbols/):

```
busbar.svg, circuit_breaker.svg, disconnector.svg, ct.svg, vt.svg,
transformer_2w.svg, transformer_3w.svg, generator.svg, pv.svg, bess.svg,
utility_feeder.svg, ground.svg, line_cable.svg, line_overhead.svg, fw.svg
```

### Istniejąca hierarchia stroke (sldEtapStyle.ts):

```typescript
ETAP_STROKE = { busbar: 5, feeder: 2.5, symbol: 2, aux: 1.5, leader: 1, detail: 1 }
```

---

## 1. KANONICZNE KONWENCJE SLD — ZASADY NADRZĘDNE

### 1.1 KROPKA POŁĄCZENIOWA (●) — IEC 61082

**REGUŁA**: Na KAŻDYM T-junction i KAŻDYM złączu między dwoma aparatami
musi być renderowana wypełniona kropka ● (filled circle).

```
Bez ●: Linie mogą się krzyżować lub łączyć — NIECZYTELNE
Z ●:   Jednoznaczne potwierdzenie połączenia elektrycznego
```

**Implementacja SVG**:
```tsx
<circle cx={x} cy={y} r={JUNCTION_DOT_RADIUS} fill={strokeColor} stroke="none" />
```

**Stała**: `JUNCTION_DOT_RADIUS = 4` px (dodaj do `IndustrialAesthetics.ts`)

**Gdzie renderować ●**:
1. Na torze głównym (║) w miejscu odejścia odgałęzienia
2. Między KAŻDYMI dwoma aparatami w łańcuchu stacyjnym (─╱─ ●─ ─╫─ ●─ ─CT─)
3. Na szynie zbiorczej w miejscu podłączenia feedera (═══●═══)
4. Na wejściu i wyjściu transformatora

**Gdzie NIE renderować ●**:
1. Na prostym połączeniu liniowym (środek odcinka)
2. Na skrzyżowaniu bez połączenia (crossing without junction)

### 1.2 NUMERACJA WĘZŁÓW (Nxx)

**REGUŁA**: Każdy punkt rozgałęzienia na torze głównym = numerowany węzeł
z parametrami: km od GPZ, napięcie U, prąd zwarciowy I″k3.

**Typ danych** (nowy, dodaj do `layoutResult.ts`):
```typescript
export interface TrunkNodeAnnotationV1 {
  readonly nodeId: string;         // "N01", "N02", ...
  readonly trunkId: string;        // "M1", "M2", ...
  readonly kmFromGPZ: number;      // odległość kumulowana [km]
  readonly voltageKV: number;      // napięcie w węźle [kV]
  readonly ikss3p: number;         // I″k3 [kA]
  readonly deltaU_percent: number; // spadek napięcia od GPZ [%]
  readonly position: PointV1;      // pozycja na canvas [px]
  readonly branchStationId: string | null; // ID stacji odgałęźnej (lub null dla GPZ)
}
```

**Renderowanie**: Etykieta po LEWEJ stronie toru głównego:
```
N02: 1.2km  14.88kV  5.8kA
```

### 1.3 HIERARCHIA GRUBOŚCI LINII

```
║  TOR GŁÓWNY magistrali    = ETAP_STROKE.busbar (5 px)  — DOMINUJĄCY
━━━ kabel odgałęzienia      = ETAP_STROKE.feeder (2.5 px)
╌╌╌ linia napow. odgał.     = ETAP_STROKE.feeder (2.5 px) + dasharray
│  instalacja stacyjna       = ETAP_STROKE.symbol (2 px)
═══ szyna zbiorcza NN        = ETAP_STROKE.busbar (5 px) - w skali NN
```

**Nowe stałe** (dodaj do `IndustrialAesthetics.ts`):
```typescript
export const TRUNK_STROKE_WIDTH = 5 as const;         // grubość toru głównego
export const BRANCH_LINE_STROKE_WIDTH = 2.5 as const;  // grubość odgałęzienia
export const STATION_INTERNAL_STROKE = 2 as const;     // grubość wewnątrz stacji
export const JUNCTION_DOT_RADIUS = 4 as const;         // promień kropki ●
export const OVERHEAD_DASH_ARRAY = '12 6' as const;    // wzór linii napowietrznej
export const CABLE_DASH_ARRAY = 'none' as const;       // kabel = ciągły
```

### 1.4 ODGAŁĘZIENIE PRZEZ APARAT

**REGUŁA**: KAŻDE odgałęzienie od toru głównego przechodzi przez
zdefiniowany aparat łączeniowy (rozłącznik odgałęźny).

**Koncepcja wizualna** (L-shape):
```
     ║                                              STACJA
     ●─→─ ─╱─ ─●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●   pole stacyjne
     ║    Q-Oxx      W-Oxx                      │   (pionowo w dół)
     ║    aparat     linia odgałęzienia          ●─ ─╱─ ─●  QS
     ║    odgałęźny  (typ, L, R, X, Iz)         ●─ ─╫─ ─●  CB
     ║                                           ●─ ─CT─ ─●  CT
     ║                                           ●── )( ──●  TR
     ║                                           ═══●═●═══   BUS NN
```

**Struktura danych** (nowy typ, dodaj do `layoutResult.ts`):
```typescript
export interface BranchPointV1 {
  readonly branchId: string;             // "OG-M1-01"
  readonly trunkNodeId: string;          // "N02" — węzeł na torze głównym
  readonly physicalLocation: 'ZK' | 'SO'; // złącze kablowe | słup odgałęźny
  readonly physicalLocationId: string;   // "ZK-01", "SO-02"
  readonly branchApparatus: {
    readonly designation: string;        // "Q-O1" (IEC 81346)
    readonly type: 'disconnector';       // typ aparatu
    readonly ratedCurrent_A: number;     // In [A]
    readonly ratedVoltage_kV: number;    // Ur [kV]
  };
  readonly branchLine: {
    readonly designation: string;        // "W-O1" (IEC 81346)
    readonly cableType: string;          // "YAKY 3×50mm²"
    readonly lengthKm: number;           // L [km]
    readonly resistance_ohm: number;     // R₁ [Ω]
    readonly reactance_ohm: number;      // X₁ [Ω]
    readonly ampacity_A: number;         // Iz [A]
    readonly isOverhead: boolean;        // true = napowietrzna, false = kabel
  };
  readonly targetStationId: string;      // "ST-M1-01"
  readonly position: PointV1;            // pozycja ● na torze głównym
}
```

### 1.5 ŁAŃCUCH APARATÓW STACYJNYCH

**REGUŁA**: Każda stacja ma standardowy łańcuch aparatów z ● między każdym.

**Stacja odbiorcza (TYPE_A/B):**
```
●─ ─╱─ ─●   QS-xx    rozłącznik SN      In=200A   Ur=17.5kV
│
●─ ─╫─ ─●   Q-xx     wyłącznik          In=630A   Icu=25kA
│
●─ ─CT─ ─●  A-xx     przekładnik        50/5A     kl.0.5s
│
●── )( ──●  T-xx     transformator       xxxkVA    Dyn11   uk=x%
│
═══●═══●═══  BUS NN  szyna NN 0.4kV
   │   │
  ─╫─ ─╫─   wyłączniki NN
   │   │
  ─▷  ─▷    obciążenia
```

**Stacja z OZE (PV/BESS) — dodatkowe elementy:**
```
│  (między CB a TR)
├──●─ ─┤>─   K-xxa   zabezp. 51   nadprądowe     Ir=xxA  t=x.xs
├──●─ ─┤>─   K-xxb   zabezp. 51N  ziemnozwarciowe
├──●─ ─┤>─   K-xxc   zabezp. 67   kierunkowe (WYMAGANE dla OZE)
│
```

**Na szynie NN — dodatkowe pole generatora:**
```
═══●═══●═══●═══  BUS NN
   │   │   │
  ─╫─ ─╫─ ─╫─   Q-PVx / Q-BESSx
   │   │   │
  ─▷  ─▷  (≈)   inwerter PV / BESS
              Pn=xxxkW  cosφ=x.xx
```

### 1.6 ODCINKI TORU GŁÓWNEGO — PARAMETRY

**REGUŁA**: Każdy odcinek toru głównego i KAŻDA linia odgałęzienia
musi mieć pełne parametry impedancyjne.

**Segment toru głównego** (rozszerz istniejący edge w LayoutResultV1):
```typescript
export interface TrunkSegmentAnnotationV1 {
  readonly segmentId: string;            // "W-M1-01"
  readonly designation: string;          // IEC 81346: "W-M1-01"
  readonly cableType: string;            // "YAKY 3×240mm²"
  readonly isOverhead: boolean;          // false = kabel, true = napowietrzna
  readonly lengthKm: number;             // L [km]
  readonly resistance_ohm: number;       // R₁ [Ω]  (w 20°C)
  readonly reactance_ohm: number;        // X₁ [Ω]  (f=50Hz)
  readonly capacitance_uF_per_km: number | null; // C₀ [μF/km] (tylko kabel)
  readonly ampacity_A: number;           // Iz [A] wg PN-HD 60364-5-52
  readonly current_A: number;            // aktualny prąd obciążenia [A]
  readonly power_MW: number;             // przepływ mocy [MW]
}
```

### 1.7 OZNACZENIA IEC 81346

| Litera | Znaczenie | Przykład |
|--------|-----------|---------|
| Q | Łącznik (CB, RL, odłącznik, uziemnik) | Q-F1, Q-O1, QS-01, Q-01 |
| T | Transformator | T-01, T-GPZ |
| W | Linia / kabel | W-M1-01, W-O1 |
| A | Przyrząd pomiarowy (CT, VT) | A-01, A-F1 |
| K | Zabezpieczenie (przekaźnik) | K-03a (51), K-03c (67) |
| G | Generator / inwerter | G-PV1, G-BESS1 |

### 1.8 KIERUNEK PRZEPŁYWU MOCY (→)

**Renderowanie**: mała strzałka SVG na odcinku, wskazująca kierunek
od źródła (GPZ) do odbioru (stacja końcowa).

```tsx
// Strzałka na połowie odcinka, w kierunku przepływu
<polygon points="0,-3 8,0 0,3" fill={color} transform={`translate(${mx},${my}) rotate(${angle})`} />
```

---

## 2. PLAN IMPLEMENTACJI — FAZY

### FAZA 1: Typy danych i stałe (NIE WYMAGA TESTÓW UI)

**Plik: `IndustrialAesthetics.ts`** — dodaj na końcu sekcji stałych:
```typescript
// § 1.9 STYL KANONICZNY SLD — ETAP/IEC
export const TRUNK_STROKE_WIDTH = 5 as const;
export const BRANCH_LINE_STROKE_WIDTH = 2.5 as const;
export const STATION_INTERNAL_STROKE = 2 as const;
export const JUNCTION_DOT_RADIUS = 4 as const;
export const OVERHEAD_DASH_ARRAY = '12 6' as const;
export const NODE_LABEL_OFFSET_X = -20 as const; // etykieta węzła po lewej
export const BRANCH_APPARATUS_WIDTH = 40 as const;
export const STATION_FIELD_OFFSET_X = 60 as const; // offset pola stacyjnego od toru
export const APPARATUS_CHAIN_STEP_Y = 40 as const; // krok pionowy w łańcuchu aparatów
export const NN_BUSBAR_WIDTH = 120 as const;
export const POWER_ARROW_SIZE = 8 as const;
```

**Plik: `layoutResult.ts`** — dodaj NOWE interfejsy (NIE modyfikuj istniejących):
```typescript
// === CANONICAL SLD ANNOTATIONS (Phase 7) ===

export interface TrunkNodeAnnotationV1 {
  readonly nodeId: string;
  readonly trunkId: string;
  readonly kmFromGPZ: number;
  readonly voltageKV: number;
  readonly ikss3p: number;
  readonly deltaU_percent: number;
  readonly position: PointV1;
  readonly branchStationId: string | null;
}

export interface TrunkSegmentAnnotationV1 {
  readonly segmentId: string;
  readonly designation: string;
  readonly cableType: string;
  readonly isOverhead: boolean;
  readonly lengthKm: number;
  readonly resistance_ohm: number;
  readonly reactance_ohm: number;
  readonly capacitance_uF_per_km: number | null;
  readonly ampacity_A: number;
  readonly current_A: number;
  readonly power_MW: number;
}

export interface BranchPointV1 {
  readonly branchId: string;
  readonly trunkNodeId: string;
  readonly physicalLocation: 'ZK' | 'SO';
  readonly physicalLocationId: string;
  readonly branchApparatus: {
    readonly designation: string;
    readonly type: 'disconnector';
    readonly ratedCurrent_A: number;
    readonly ratedVoltage_kV: number;
  };
  readonly branchLine: {
    readonly designation: string;
    readonly cableType: string;
    readonly lengthKm: number;
    readonly resistance_ohm: number;
    readonly reactance_ohm: number;
    readonly ampacity_A: number;
    readonly isOverhead: boolean;
  };
  readonly targetStationId: string;
  readonly position: PointV1;
}

export interface StationApparatusChainV1 {
  readonly stationId: string;
  readonly stationType: 'TYPE_A' | 'TYPE_B' | 'TYPE_C' | 'TYPE_D';
  readonly hasOZE: boolean;
  readonly ozeType: 'PV' | 'BESS' | 'WIND' | null;
  readonly apparatus: readonly StationApparatusItemV1[];
  readonly nnBusbar: {
    readonly voltageKV: number;
    readonly feeders: readonly NNFeederV1[];
  };
  readonly protection: readonly ProtectionRelayV1[];
}

export interface StationApparatusItemV1 {
  readonly designation: string;   // IEC 81346: "QS-01", "Q-01", "A-01", "T-01"
  readonly symbolType: string;    // 'disconnector' | 'circuit_breaker' | 'ct' | 'transformer_2w'
  readonly label: string;         // czytelna nazwa
  readonly parameters: Record<string, string | number>;
  readonly position: PointV1;
}

export interface NNFeederV1 {
  readonly designation: string;
  readonly type: 'load' | 'generator_pv' | 'generator_bess';
  readonly power_kW: number;
  readonly cosPhi: number | null;
  readonly additionalParams: Record<string, string | number>;
}

export interface ProtectionRelayV1 {
  readonly designation: string;   // "K-03a"
  readonly ansiCode: string;      // "51", "51N", "67"
  readonly function: string;      // "nadprądowe", "ziemnozwarciowe", "kierunkowe"
  readonly setting_Ir_A: number;
  readonly setting_t_s: number;
}

/** Rozszerzenie LayoutResultV1 — dodaj do istniejącego interfejsu */
export interface CanonicalAnnotationsV1 {
  readonly trunkNodes: readonly TrunkNodeAnnotationV1[];
  readonly trunkSegments: readonly TrunkSegmentAnnotationV1[];
  readonly branchPoints: readonly BranchPointV1[];
  readonly stationChains: readonly StationApparatusChainV1[];
}
```

---

### FAZA 2: Komponent JunctionDot (●)

**Nowy plik: `frontend/src/ui/sld/symbols/JunctionDot.tsx`**

```typescript
/**
 * JunctionDot — Kropka połączeniowa IEC 61082
 *
 * REGUŁA: Renderowana na KAŻDYM T-junction i między aparatami w łańcuchu.
 * Potwierdza wizualnie połączenie elektryczne.
 *
 * CANONICAL: IEC 61082 — "filled junction dot"
 */
import React from 'react';
import { JUNCTION_DOT_RADIUS } from '../IndustrialAesthetics';

export interface JunctionDotProps {
  x: number;
  y: number;
  color?: string;
  radius?: number;
}

export const JunctionDot: React.FC<JunctionDotProps> = ({
  x, y,
  color = 'currentColor',
  radius = JUNCTION_DOT_RADIUS,
}) => (
  <circle
    cx={x} cy={y} r={radius}
    fill={color}
    stroke="none"
    data-sld-role="junction-dot"
  />
);
```

---

### FAZA 3: Renderer toru głównego (TrunkSpineRenderer)

**Nowy plik: `frontend/src/ui/sld/TrunkSpineRenderer.tsx`**

Komponent renderuje:
1. **Grubą linię pionową** (║) — `strokeWidth = TRUNK_STROKE_WIDTH`
2. **Węzły Nxx** z etykietami po lewej (km, U, I″k3)
3. **Oznaczenia segmentów** (typ kabla/linii, parametry) między węzłami
4. **Kropki ●** w miejscach odgałęzień
5. **Uziemnik końcowy** (─╳─ ▽) na końcu magistrali

**Wejście**: `TrunkNodeAnnotationV1[]` + `TrunkSegmentAnnotationV1[]`

**SVG structure**:
```tsx
<g data-sld-role="trunk-spine" data-trunk-id={trunkId}>
  {/* Linia główna toru */}
  <line x1={x} y1={y1} x2={x} y2={y2}
    stroke={trunkColor} strokeWidth={TRUNK_STROKE_WIDTH}
    strokeLinecap="round"
  />

  {/* Węzły z etykietami */}
  {nodes.map(node => (
    <g key={node.nodeId}>
      <JunctionDot x={x} y={node.position.y} color={trunkColor} />
      <text x={x + NODE_LABEL_OFFSET_X} y={node.position.y}
        textAnchor="end" className="sld-node-label">
        {node.nodeId}: {node.kmFromGPZ}km  {node.voltageKV.toFixed(2)}kV  {node.ikss3p.toFixed(1)}kA
      </text>
    </g>
  ))}

  {/* Segmenty — etykiety parametrów */}
  {segments.map(seg => (
    <g key={seg.segmentId}>
      <text x={x + 15} y={segMidY} className="sld-segment-label">
        {seg.designation}: {seg.cableType} L={seg.lengthKm}km
      </text>
      <text x={x + 15} y={segMidY + 14} className="sld-segment-params">
        R={seg.resistance_ohm.toFixed(3)}Ω X={seg.reactance_ohm.toFixed(3)}Ω Iz={seg.ampacity_A}A
      </text>
      {/* Styl kabel vs napowietrzna */}
      {seg.isOverhead && (
        <line ... strokeDasharray={OVERHEAD_DASH_ARRAY} />
      )}
    </g>
  ))}
</g>
```

---

### FAZA 4: Renderer odgałęzienia (BranchRenderer)

**Nowy plik: `frontend/src/ui/sld/BranchRenderer.tsx`**

Renderuje L-shape: pozioma linia od ● na torze głównym → do wejścia stacji.

**Elementy SVG**:
1. **● na torze głównym** (junction dot)
2. **Symbol aparatu odgałęźnego** (─╱─) z etykietą
3. **Linia do stacji** (━━━ kabel lub ╌╌╌ napowietrzna) z parametrami
4. **● na wejściu stacji** (junction dot)
5. **Strzałka →** kierunku mocy
6. **Etykieta lokalizacji** (ZK-01 / SO-02)

**Wejście**: `BranchPointV1`

---

### FAZA 5: Renderer łańcucha aparatów stacyjnych (StationFieldRenderer)

**Nowy plik: `frontend/src/ui/sld/StationFieldRenderer.tsx`**

Renderuje pionowy łańcuch aparatów ze ● między każdym.

**Elementy SVG** (od góry do dołu):
```
●─ ─╱─ ─●   QS (rozłącznik)      parametry po prawej
│
●─ ─╫─ ─●   Q  (wyłącznik)       parametry po prawej
│
●─ ─CT─ ─●  A  (przekładnik)     parametry po prawej
│
[opcjonalnie: zabezpieczenia K dla stacji OZE]
│
●── )( ──●  T  (transformator)    parametry po prawej (ramka)
│
═══●═══●═══  szyna NN             parametry
   │   │ (│)
  ─╫─ ─╫─ (─╫─)                  wyłączniki NN
   │   │  (│)
  ─▷  ─▷  ((≈))                  obciążenia + generator OZE
```

**Stałe pozycjonowania**:
```typescript
const APPARATUS_STEP_Y = APPARATUS_CHAIN_STEP_Y; // 40 px między aparatami
const SYMBOL_CENTER_X = 0;                        // oś łańcucha
const LABEL_OFFSET_X = 30;                         // etykiety po prawej
const JUNCTION_X_OFFSET = 15;                      // ● na wejściu/wyjściu symbolu
```

Dla KAŻDEGO aparatu w łańcuchu:
```tsx
<g transform={`translate(${baseX}, ${baseY + i * APPARATUS_STEP_Y})`}>
  <JunctionDot x={0} y={-JUNCTION_X_OFFSET} />  {/* ● wejście */}
  <EtapSymbol symbolId={item.symbolType} size={30} />
  <JunctionDot x={0} y={JUNCTION_X_OFFSET} />   {/* ● wyjście */}
  <text x={LABEL_OFFSET_X} y={0} className="sld-apparatus-label">
    {item.designation}  {formatParams(item.parameters)}
  </text>
</g>
```

---

### FAZA 6: Nowe symbole SVG

**Dodaj do `EtapSymbolRenderer.tsx`** nowe symbole:

#### 6.1 Overcurrent Relay (─┤>─)
```tsx
const OvercurrentRelaySymbol: React.FC = ({ stroke, strokeWidth, opacity }) => (
  <g>
    <line x1="10" y1="50" x2="35" y2="50" stroke={stroke} strokeWidth={strokeWidth} />
    <rect x="35" y="35" width="30" height="30" fill="none" stroke={stroke} strokeWidth={strokeWidth} rx={2} />
    <text x="50" y="55" textAnchor="middle" fontSize="12" fill={stroke}>51</text>
    <line x1="65" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={strokeWidth} />
  </g>
);
```

#### 6.2 Earthing Switch (─╳─)
```tsx
const EarthingSwitchSymbol: React.FC = ({ stroke, strokeWidth, opacity }) => (
  <g>
    <line x1="10" y1="50" x2="40" y2="50" stroke={stroke} strokeWidth={strokeWidth} />
    <line x1="40" y1="35" x2="60" y2="65" stroke={stroke} strokeWidth={strokeWidth} />
    <line x1="40" y1="65" x2="60" y2="35" stroke={stroke} strokeWidth={strokeWidth} />
    <line x1="60" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={strokeWidth} />
    {/* Ground symbol */}
    <line x1="45" y1="75" x2="55" y2="75" stroke={stroke} strokeWidth={strokeWidth} />
    <line x1="47" y1="80" x2="53" y2="80" stroke={stroke} strokeWidth={1.5} />
    <line x1="49" y1="85" x2="51" y2="85" stroke={stroke} strokeWidth={1} />
  </g>
);
```

#### 6.3 Load Arrow (─▷)
```tsx
const LoadSymbol: React.FC = ({ stroke, strokeWidth, opacity }) => (
  <g>
    <line x1="50" y1="10" x2="50" y2="45" stroke={stroke} strokeWidth={strokeWidth} />
    <polygon points="35,45 65,45 50,75" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
  </g>
);
```

#### 6.4 Junction Dot (●)
(już zaimplementowane w Fazie 2, ale dodaj do palety)

**Zarejestruj w `SymbolResolver.ts`**:
```typescript
overcurrent_relay: 'overcurrent_relay',
earthing_switch: 'earthing_switch',
load_arrow: 'load_arrow',
junction_dot: 'junction_dot',
directional_relay: 'directional_relay',
```

---

### FAZA 7: Integracja z LayoutPipeline

**Plik: `layoutPipeline.ts`** — dodaj **phase7** po phase6:

```typescript
/**
 * Phase 7: Canonical SLD Annotations
 *
 * Generuje adnotacje kanonicznego schematu:
 * - TrunkNodeAnnotationV1[] — węzły na torze głównym
 * - TrunkSegmentAnnotationV1[] — odcinki toru głównego
 * - BranchPointV1[] — punkty odgałęźne z aparaturą
 * - StationApparatusChainV1[] — łańcuchy aparatów stacyjnych
 *
 * INPUT: VisualGraphV1 + NodePlacementV1[] + EdgeRouteV1[]
 * OUTPUT: CanonicalAnnotationsV1
 *
 * REGUŁA: Phase 7 NIE modyfikuje wyników Phase 1-6.
 *         Dodaje WYŁĄCZNIE adnotacje renderingowe.
 */
function phase7_generate_canonical_annotations(
  graph: VisualGraphV1,
  placements: readonly NodePlacementV1[],
  routes: readonly EdgeRouteV1[],
  config: LayoutGeometryConfigV1,
): CanonicalAnnotationsV1 {
  // 1. Identyfikuj tory główne (TRUNK edges) i zbuduj profil km/U/Ik
  // 2. Dla każdego węzła na torze: oblicz parametry zwarciowe i napięciowe
  // 3. Dla każdego BRANCH edge: zbuduj BranchPointV1 z aparaturą
  // 4. Dla każdej stacji: zbuduj StationApparatusChainV1
  // 5. Zwróć CanonicalAnnotationsV1 (immutable, sorted)
}
```

**Dodaj do LayoutResultV1** (rozszerz, nie modyfikuj):
```typescript
// W layoutResult.ts, rozszerz LayoutResultV1:
export interface LayoutResultV1 {
  // ... istniejące pola ...
  readonly canonicalAnnotations: CanonicalAnnotationsV1 | null; // Phase 7
}
```

**UWAGA**: Pole `canonicalAnnotations` jest **nullable** — istniejący kod
nie zepsuje się. Phase 7 wypełnia je gdy jest aktywna.

---

### FAZA 8: Integracja z SLDViewCanvas

**Plik: `SLDViewCanvas.tsx`** — dodaj warstwy renderowania:

```tsx
{/* Istniejące warstwy (NIE USUWAJ) */}
<g className="sld-connections">{/* ConnectionRenderer */}</g>
<g className="sld-symbols">{/* UnifiedSymbolRenderer */}</g>

{/* NOWE warstwy kanonicznego SLD */}
{layoutResult?.canonicalAnnotations && (
  <>
    <g className="sld-trunk-spines" style={{ pointerEvents: 'none' }}>
      <TrunkSpineRenderer
        nodes={layoutResult.canonicalAnnotations.trunkNodes}
        segments={layoutResult.canonicalAnnotations.trunkSegments}
      />
    </g>
    <g className="sld-branch-points" style={{ pointerEvents: 'none' }}>
      {layoutResult.canonicalAnnotations.branchPoints.map(bp => (
        <BranchRenderer key={bp.branchId} branch={bp} />
      ))}
    </g>
    <g className="sld-station-fields" style={{ pointerEvents: 'none' }}>
      {layoutResult.canonicalAnnotations.stationChains.map(sc => (
        <StationFieldRenderer key={sc.stationId} chain={sc} />
      ))}
    </g>
    <g className="sld-junction-dots" style={{ pointerEvents: 'none' }}>
      {/* Junction dots na WSZYSTKICH połączeniach */}
      <JunctionDotLayer annotations={layoutResult.canonicalAnnotations} />
    </g>
  </>
)}
```

**WAŻNE**: Nowe warstwy mają `pointerEvents: 'none'` — nie blokują
istniejącej interakcji (selection, hover, drag).

---

### FAZA 9: Stylizacja CSS

**Dodaj do istniejącego CSS** (lub Tailwind utility classes):

```css
/* Kanoniczny SLD — typografia */
.sld-node-label {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  fill: #374151;
  font-weight: 600;
}

.sld-segment-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  fill: #1D4ED8;
  font-weight: 500;
}

.sld-segment-params {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  fill: #6B7280;
}

.sld-apparatus-label {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 10px;
  fill: #374151;
}

.sld-apparatus-params {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  fill: #6B7280;
}

.sld-station-title {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 11px;
  fill: #111827;
  font-weight: 700;
}

.sld-iec-designation {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  fill: #DC2626;
  font-weight: 600;
}
```

---

### FAZA 10: Testy

**Nowy plik testów: `frontend/src/ui/sld/core/__tests__/canonicalSld.test.ts`**

```typescript
describe('Canonical SLD — ETAP/IEC Style', () => {

  describe('Junction Dots (●)', () => {
    it('renders ● at every T-junction on trunk', () => { /* ... */ });
    it('renders ● between every apparatus in station chain', () => { /* ... */ });
    it('renders ● at busbar feeder connections', () => { /* ... */ });
    it('does NOT render ● at simple line midpoints', () => { /* ... */ });
    it('dot radius equals JUNCTION_DOT_RADIUS constant', () => { /* ... */ });
  });

  describe('Trunk Node Annotations (Nxx)', () => {
    it('generates sequential node IDs N01..Nxx', () => { /* ... */ });
    it('km is monotonically increasing along trunk', () => { /* ... */ });
    it('voltage is monotonically decreasing along trunk', () => { /* ... */ });
    it('Ik3 is monotonically decreasing along trunk', () => { /* ... */ });
    it('deltaU equals (U_gpz - U_node) / U_gpz * 100', () => { /* ... */ });
    it('every branch point has a trunk node', () => { /* ... */ });
  });

  describe('Branch Points', () => {
    it('every branch has apparatus (Q-Oxx disconnector)', () => { /* ... */ });
    it('every branch has line with full parameters (R, X, L, Iz)', () => { /* ... */ });
    it('physical location is ZK (cable) or SO (overhead)', () => { /* ... */ });
    it('branch apparatus rated voltage >= network voltage', () => { /* ... */ });
    it('branch line ampacity >= 0', () => { /* ... */ });
  });

  describe('Station Apparatus Chains', () => {
    it('every station has QS → Q → CT → T chain', () => { /* ... */ });
    it('OZE stations have 67 directional protection', () => { /* ... */ });
    it('TYPE_A stations have no output field', () => { /* ... */ });
    it('all apparatus have IEC 81346 designations', () => { /* ... */ });
    it('NN busbar has correct number of feeders', () => { /* ... */ });
  });

  describe('Trunk Segments', () => {
    it('every segment has type, L, R, X, Iz', () => { /* ... */ });
    it('cable segments have isOverhead=false', () => { /* ... */ });
    it('overhead segments have isOverhead=true', () => { /* ... */ });
    it('IEC designation format W-Mx-yy', () => { /* ... */ });
  });

  describe('Determinism', () => {
    it('same input produces identical annotations', () => { /* ... */ });
    it('100 runs produce identical canonical hash', () => { /* ... */ });
    it('node permutation does not affect output', () => { /* ... */ });
  });

  describe('Visual Hierarchy', () => {
    it('trunk stroke width = TRUNK_STROKE_WIDTH (5px)', () => { /* ... */ });
    it('branch stroke width = BRANCH_LINE_STROKE_WIDTH (2.5px)', () => { /* ... */ });
    it('station internal stroke = STATION_INTERNAL_STROKE (2px)', () => { /* ... */ });
    it('overhead lines use OVERHEAD_DASH_ARRAY', () => { /* ... */ });
    it('cable lines are solid (no dash)', () => { /* ... */ });
  });
});
```

**Dodaj do `sld-determinism.yml`** workflow:
```yaml
- name: Canonical SLD contract tests
  run: npx vitest run src/ui/sld/core/__tests__/canonicalSld.test.ts --reporter=verbose
```

---

## 3. KOLEJNOŚĆ WYKONANIA

```
FAZA 1: Typy + stałe                    → layoutResult.ts, IndustrialAesthetics.ts
FAZA 2: JunctionDot component            → symbols/JunctionDot.tsx
FAZA 3: TrunkSpineRenderer               → TrunkSpineRenderer.tsx
FAZA 4: BranchRenderer                   → BranchRenderer.tsx
FAZA 5: StationFieldRenderer             → StationFieldRenderer.tsx
FAZA 6: Nowe symbole SVG                 → EtapSymbolRenderer.tsx, SymbolResolver.ts
FAZA 7: Phase 7 w LayoutPipeline         → layoutPipeline.ts, layoutResult.ts
FAZA 8: Integracja z SLDViewCanvas       → SLDViewCanvas.tsx
FAZA 9: Stylizacja CSS                   → sld.css lub tailwind
FAZA 10: Testy                           → canonicalSld.test.ts

PO KAŻDEJ FAZIE: npm test (vitest run --no-file-parallelism)
PO FAZIE 10:     npm run type-check && npm run lint
```

---

## 4. WARUNKI BRZEGOWE — CZEGO NIE ROBIĆ

1. **NIE modyfikuj** VisualGraphV1 (zamrożony kontrakt V1)
2. **NIE modyfikuj** istniejących testów (dodawaj NOWE)
3. **NIE usuwaj** istniejących komponentów (rozszerzaj)
4. **NIE dodawaj** fizyki do warstwy prezentacji
5. **NIE łam** determinizmu (ten sam input = ten sam output)
6. **NIE używaj** kodów projektowych (P7, P11, P14 itd.) w UI
7. **NIE zmieniaj** istniejącego zachowania Phase 1-6 pipeline
8. **NIE dodawaj** `canonicalAnnotations` do hasha layoutu (geometry-only hash)
9. **NIE blokuj** istniejącej interakcji (pointerEvents: 'none' na nowych warstwach)
10. **NIE używaj** emoji w kodzie ani komentarzach

---

## 5. WIZUALIZACJA DOCELOWA — REFERENCJA ASCII

Poniższy ASCII jest WZORCEM DOCELOWYM renderingu SVG.
Każdy element ASCII ma odpowiednik w komponentach:

```
      ●  N02:  km=1.2   U=14.88kV   I"k3=5.8kA         ← TrunkSpineRenderer (node label)
      ║╲                                                   ← TrunkSpineRenderer (spine line)
      ║ ●─→─ ─╱─ ─●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●      ← BranchRenderer (L-shape)
      ║      Q-O1       W-O1                        │     ← BranchRenderer (labels)
      ║      In=200A    YAKY 3×50mm²                │
      ║      Ur=17.5kV  L = 0.150 km                │
      ║      złącze     R = 0.038 Ω                  │
      ║      kablowe    X = 0.014 Ω                  │
      ║      ZK-01      Iz = 175 A                   │
      ║                                              │
      ║                                   ●─ ─╱─ ─●      ← StationFieldRenderer
      ║                                   │               ← JunctionDot between apparatus
      ║                                   ●─ ─╫─ ─●
      ║                                   │
      ║                                   ●─ ─CT─ ─●
      ║                                   │
      ║                               ┌───●───┐
      ║                               │  )(   │           ← EtapSymbol (transformer_2w)
      ║                               └───●───┘
      ║                                   │
      ║                          ═══●═════●═════●═══      ← busbar with JunctionDots
      ║                             │             │
      ║                            ─▷            ─▷       ← LoadSymbol
```

---

## 6. KOMENDY WERYFIKACJI

Po zakończeniu WSZYSTKICH faz, uruchom:

```bash
cd mv-design-pro/frontend

# 1. Testy jednostkowe
npm test

# 2. Type-check
npm run type-check

# 3. Lint
npm run lint

# 4. Build (produkcyjny)
npm run build

# 5. Guard scripts
cd .. && python scripts/no_codenames_guard.py
python scripts/sld_determinism_guards.py
```

WSZYSTKIE muszą przejść bez błędów.

---

## 7. DEFINICJA "DONE"

Implementacja jest GOTOWA gdy:

- [ ] ● (junction dot) renderuje się na KAŻDYM T-junction i między aparatami
- [ ] Węzły Nxx wyświetlają km/U/I″k3 po lewej stronie toru głównego
- [ ] Odcinki toru głównego mają pełne parametry (typ, L, R, X, Iz)
- [ ] KAŻDE odgałęzienie przechodzi przez zdefiniowany aparat (Q-Oxx)
- [ ] Linia odgałęzienia ma pełne parametry (typ, L, R, X, Iz)
- [ ] Lokalizacja fizyczna (ZK/SO) jest wyświetlana
- [ ] Stacje mają łańcuch: QS → Q → CT → T → BUS NN → ─▷
- [ ] Stacje OZE mają zabezpieczenie kierunkowe K-xx 67
- [ ] Inwertery PV/BESS renderują jako (≈) z parametrami
- [ ] Kable = linia ciągła, napowietrzne = przerywana
- [ ] Hierarchia grubości: tor główny > odgałęzienie > stacja
- [ ] Oznaczenia IEC 81346 (Q, T, W, A, K, G) na wszystkich aparatach
- [ ] → strzałka kierunku mocy na odcinkach
- [ ] Testy deterministyczne przechodzą (100 runs = identical hash)
- [ ] npm test, type-check, lint, build — ZERO ERRORS
- [ ] Istniejące 588 testów SLD nadal przechodzą
