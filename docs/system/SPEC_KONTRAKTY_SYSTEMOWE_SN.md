# KONTRAKTY SYSTEMOWE SIECI TERENOWEJ SN

**Data:** 2026-03-14
**Wersja:** 2.0
**Status:** WIAZACY

---

## 1. KONTRAKT SEMANTYCZNY SLD

Jeden jawny model semantyczny SLD, budowany przez adapter z Snapshot/ENM.

```typescript
/**
 * SldSemanticModelV1 — jedyny jawny model semantyczny dla SLD.
 *
 * Budowany przez adapter (topologyAdapterV2 + stationBlockBuilder).
 * Konsumowany przez layoutPipeline i renderery.
 * NIE zawiera geometrii — tylko topologie i semantyke.
 *
 * GWARANCJE:
 * - Deterministyczny (ten sam Snapshot -> identyczny model)
 * - Kompletny (wszystkie byty SLD maja odpowiednik)
 * - Walidowalny (kontrakty per typ stacji)
 * - Spójny z modelem obliczeniowym (ten sam Snapshot)
 */
export interface SldSemanticModelV1 {
  /** Wersja kontraktu */
  readonly version: 'V1';
  /** ID snapshot zródlowy */
  readonly snapshotId: string;
  /** Fingerprint snapshot */
  readonly snapshotFingerprint: string;

  /** GPZ (Glówny Punkt Zasilajacy) */
  readonly gpz: SldGpzV1;
  /** Magistrale glówne (uporzadkowane) */
  readonly trunks: readonly SldTrunkV1[];
  /** Odgalezienia (z magistrali i z odgalezien — pelna rekurencja) */
  readonly branchPaths: readonly SldBranchPathV1[];
  /** Stacje przelotowe (na magistralach) */
  readonly inlineStations: readonly SldInlineStationV1[];
  /** Stacje odgalezne (na odgalezieniach) */
  readonly branchStations: readonly SldBranchStationV1[];
  /** Stacje sekcyjne */
  readonly sectionalStations: readonly SldSectionalStationV1[];
  /** Stacje koncowe */
  readonly terminalStations: readonly SldTerminalStationV1[];
  /** Polaczenia rezerwowe (ring/NOP) */
  readonly reserveLinks: readonly SldReserveLinkV1[];
  /** Diagnostyki (FixActions) */
  readonly diagnostics: readonly SldSemanticDiagnosticV1[];
}
```

### 1.1 GPZ

```typescript
export interface SldGpzV1 {
  readonly id: string;
  readonly name: string;
  /** Wezel SLACK */
  readonly slackNodeId: string;
  /** Sekcje szyny SN */
  readonly busSections: readonly SldBusSectionV1[];
  /** Pola zasilajace (z WN) */
  readonly supplyFields: readonly SldBayV1[];
  /** Pola magistralowe (wyjscia na magistrale) */
  readonly trunkFields: readonly SldBayV1[];
  /** Pola pomiarowe */
  readonly measurementFields: readonly SldBayV1[];
  /** Pola sprzegla sekcyjnego (jesli GPZ ma 2+ sekcje) */
  readonly couplerFields: readonly SldBayV1[];
}

export interface SldBusSectionV1 {
  readonly id: string;
  readonly busNodeId: string;
  readonly label: string;
  readonly voltageKv: number;
}
```

### 1.2 Magistrala

```typescript
export interface SldTrunkV1 {
  readonly id: string;
  /** Pole GPZ, z którego wychodzi magistrala */
  readonly sourceFieldId: string;
  /** Wezel na szynie GPZ */
  readonly sourceNodeId: string;
  /** Uporzadkowane segmenty magistrali */
  readonly orderedSegments: readonly SldSegmentV1[];
  /** Stacje na magistrali (w kolejnosci topologicznej) */
  readonly orderedStationRefs: readonly SldStationRefV1[];
  /** Punkty odgalezienia na magistrali */
  readonly branchPoints: readonly SldBranchPointV1[];
  /** Lacze pierscieniowe (null = brak) */
  readonly ringConnection: SldReserveLinkV1 | null;
}

export interface SldSegmentV1 {
  readonly segmentId: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly branchType: 'LINE' | 'CABLE';
  readonly lengthKm: number | null;
  readonly label: string;
  /** Parametry (do overlay — NIE do obliczen) */
  readonly rOhmPerKm: number | null;
  readonly xOhmPerKm: number | null;
}

export interface SldStationRefV1 {
  readonly stationId: string;
  readonly stationKind: StationKind;
  readonly positionOnTrunk: number;
}

export interface SldBranchPointV1 {
  readonly nodeId: string;
  readonly positionOnTrunk: number;
  readonly branchPathIds: readonly string[];
}

export type StationKind =
  | 'stacja_przelotowa'
  | 'stacja_odgalezna'
  | 'stacja_sekcyjna'
  | 'stacja_koncowa';
```

### 1.3 Odgalezienie

```typescript
export interface SldBranchPathV1 {
  readonly id: string;
  /** ID magistrali nadrzednej (lub odgalezienia nadrzednego) */
  readonly parentPathId: string;
  /** ID wezla junction na magistrali */
  readonly junctionNodeId: string;
  /** Uporzadkowane segmenty odgalezienia */
  readonly orderedSegments: readonly SldSegmentV1[];
  /** Stacje na odgalezieniu */
  readonly orderedStationRefs: readonly SldStationRefV1[];
  /** Podgalezienia */
  readonly subBranchIds: readonly string[];
  /** Glebokosc zagniezdzenia */
  readonly nestingDepth: number;
}
```

### 1.4 Stacja przelotowa

```typescript
export interface SldInlineStationV1 {
  readonly id: string;
  readonly name: string;
  readonly trunkId: string;
  /** Segment magistrali wchodzacy */
  readonly incomingSegmentId: string;
  /** Segment magistrali wychodzacy */
  readonly outgoingSegmentId: string;
  /** Pole liniowe wejsciowe (obowiazkowe) */
  readonly incomingBay: SldBayV1;
  /** Pole liniowe wyjsciowe (obowiazkowe) */
  readonly outgoingBay: SldBayV1;
  /** Pola transformatorowe */
  readonly transformerBays: readonly SldBayV1[];
  /** Pola odgalezieniowe */
  readonly branchBays: readonly SldBayV1[];
  /** Pola OZE */
  readonly generatorBays: readonly SldBayV1[];
  /** Szyna stacji (lokalna rozdzielnica SN) */
  readonly busSection: SldBusSectionV1;
  /** Kontrakt topologiczny */
  readonly topologyContract: 'main_path_mandatory';
}
```

### 1.5 Stacja odgalezna

```typescript
export interface SldBranchStationV1 {
  readonly id: string;
  readonly name: string;
  readonly branchPathId: string;
  readonly incomingBay: SldBayV1;
  readonly outgoingBay: SldBayV1 | null;
  readonly transformerBays: readonly SldBayV1[];
  readonly generatorBays: readonly SldBayV1[];
  readonly busSection: SldBusSectionV1;
  readonly topologyContract: 'no_main_through';
}
```

### 1.6 Stacja sekcyjna

```typescript
export interface SldSectionalStationV1 {
  readonly id: string;
  readonly name: string;
  readonly sectionA: SldStationSectionV1;
  readonly sectionB: SldStationSectionV1;
  readonly tieBay: SldBayV1;
  readonly normallyOpenPointId: string | null;
  readonly reserveIncomingBays: readonly SldBayV1[];
  readonly topologyContract: 'two_sections_with_tie';
}

export interface SldStationSectionV1 {
  readonly id: string;
  readonly busSection: SldBusSectionV1;
  readonly lineBays: readonly SldBayV1[];
  readonly transformerBays: readonly SldBayV1[];
  readonly generatorBays: readonly SldBayV1[];
}
```

### 1.7 Stacja koncowa

```typescript
export interface SldTerminalStationV1 {
  readonly id: string;
  readonly name: string;
  readonly incomingBay: SldBayV1;
  readonly outgoingBay: null;
  readonly transformerBays: readonly SldBayV1[];
  readonly generatorBays: readonly SldBayV1[];
  readonly busSection: SldBusSectionV1;
  readonly topologyContract: 'no_outgoing_main';
}
```

### 1.8 Pole (Bay)

```typescript
export interface SldBayV1 {
  readonly id: string;
  readonly bayRole: BayRole;
  readonly busSectionId: string;
  /** Urzadzenia w polu (uporzadkowane: DS -> CB -> CT -> RELAY) */
  readonly devices: readonly SldDeviceV1[];
  /** Galaz podlaczona do pola (null = brak) */
  readonly connectedBranchId: string | null;
  /** Generator podlaczony (null = brak) */
  readonly connectedGeneratorId: string | null;
  /** Transformator podlaczony (null = brak) */
  readonly connectedTransformerId: string | null;
  /** Etykieta pola */
  readonly label: string;
  /** Referencja katalogowa */
  readonly catalogRef: string | null;
}

export type BayRole =
  | 'LINE_IN'
  | 'LINE_OUT'
  | 'TRANSFORMER'
  | 'BRANCH'
  | 'COUPLER'
  | 'PV'
  | 'BESS'
  | 'WIND'
  | 'MEASUREMENT'
  | 'SUPPLY';

export interface SldDeviceV1 {
  readonly id: string;
  readonly deviceType: DeviceType;
  readonly state: 'OPEN' | 'CLOSED' | null;
  readonly label: string;
  readonly catalogRef: string | null;
}

export type DeviceType =
  | 'CB' | 'DS' | 'LS' | 'ES'
  | 'CT' | 'VT' | 'RELAY' | 'FUSE';
```

### 1.9 Polaczenie rezerwowe

```typescript
export interface SldReserveLinkV1 {
  readonly id: string;
  readonly branchId: string;
  readonly nodeA_Id: string;
  readonly nodeB_Id: string;
  readonly isNormallyOpen: boolean;
  readonly nopSwitchId: string | null;
  readonly linkType: 'RING' | 'RESERVE_FEED' | 'TIE';
}
```

### 1.10 Diagnostyka

```typescript
export interface SldSemanticDiagnosticV1 {
  readonly code: string;
  readonly message: string;
  readonly severity: 'ERROR' | 'WARNING' | 'INFO';
  readonly stationId: string | null;
  readonly bayId: string | null;
  readonly fixAction: string | null;
}
```

---

## 2. KONTRAKT ADAPTERA

```typescript
/**
 * Adapter: Snapshot -> SldSemanticModel.
 *
 * GWARANCJE:
 * - Deterministyczny (ten sam Snapshot -> identyczny model)
 * - Brak heurystyk stringowych
 * - Brak fabrykowania bytów
 * - Brak danych -> FixAction (nie zgadywanie)
 * - Spójny z modelem obliczeniowym (ten sam Snapshot)
 *
 * WEJSCIE:
 * - TopologyInputV1 (z ENM lub z SLD symbols)
 *
 * WYJSCIE:
 * - SldSemanticModelV1 (pelny model semantyczny)
 */
export function buildSldSemanticModel(
  input: TopologyInputV1,
): SldSemanticModelV1;

/**
 * ALGORYTM:
 * 1. Zbuduj graf aktywnych krawedzi (ignoruj NOP)
 * 2. BFS spanning tree od GRID_SOURCE
 * 3. Wyznacz TRUNK = najdluzsza sciezka
 * 4. Wyznacz BRANCH = pozostale sciezki w spanning tree
 * 5. Wyznacz SECONDARY = krawedzie poza spanning tree
 * 6. Przypisz role stacjom (inline/branch/sectional/terminal)
 * 7. Zbuduj pola per stacja (na podstawie incydentnych krawedzi i urzadzen)
 * 8. Zbuduj SldSemanticModelV1
 * 9. Waliduj model
 * 10. Zwróc model + diagnostyki
 */
```

---

## 3. KONTRAKT WALIDATORA SEMANTYCZNEGO

```typescript
export interface SldSemanticValidationResult {
  readonly valid: boolean;
  readonly errors: readonly SldSemanticError[];
  readonly warnings: readonly SldSemanticError[];
}

export interface SldSemanticError {
  readonly code: string;
  readonly message: string;
  readonly stationId: string | null;
  readonly bayId: string | null;
  readonly severity: 'ERROR' | 'WARNING';
}

/**
 * Waliduje SldSemanticModel przed renderingiem.
 *
 * REGULY:
 * SV01: Inline station MUSI miec incoming + outgoing bay
 * SV02: Inline station incoming i outgoing MUSZA byc rózne segmenty
 * SV03: Branch station NIE MOZE miec pól LINE_IN + LINE_OUT na trunk
 * SV04: Sectional station MUSI miec >=2 sekcje + tie bay
 * SV05: Terminal station MUSI miec incoming bay, NIE MOZE miec outgoing
 * SV06: Kazde pole MUSI miec >=1 urzadzenie
 * SV07: NOP MUSI laczyc dwa rózne trunki lub sekcje
 * SV08: Kazda magistrala zaczyna sie od pola GPZ
 * SV09: Punkt odgalezienia ma >=3 incydentne krawedzie
 * SV10: Brak cykli w spanning tree
 */
export function validateSldSemanticModel(
  model: SldSemanticModelV1,
): SldSemanticValidationResult;
```

---

## 4. KONTRAKT GEOMETRII

```typescript
/**
 * SldGeometryConfig — konfiguracja silnika geometrii.
 */
export interface SldGeometryConfig {
  /** Os X magistrali (startowa) */
  readonly trunkAxisX: number;              // default: 400
  /** Krok Y miedzy elementami magistrali */
  readonly mainVerticalPitch: number;       // default: 100
  /** Przesuniecie X odgalezienia */
  readonly branchHorizontalPitch: number;   // default: 280
  /** Minimalna odleglosc Y miedzy stacjami */
  readonly stationMinSpacingY: number;      // default: 200
  /** Przesuniecie X kanalu rezerwowego */
  readonly reserveChannelOffsetX: number;   // default: 80
  /** Margines bezpieczenstwa etykiet */
  readonly parameterBoxSafeMargin: number;  // default: 10
  /** Szerokosc stacji inline */
  readonly inlineStationWidth: number;      // default: 200
  /** Wysokosc naglówka stacji */
  readonly inlineStationHeaderHeight: number; // default: 30
  /** Pitch pól na szynie GPZ */
  readonly gpzFieldPitch: number;           // default: 280
  /** Szerokosc szyny GPZ */
  readonly gpzBusWidth: number;             // default: 8
  /** Szerokosc szyny stacji */
  readonly stationBusWidth: number;         // default: 5
  /** Grid snap */
  readonly gridSnap: number;               // default: 20
}

/**
 * Geometry: SldSemanticModel -> LayoutResult.
 *
 * REGULY:
 * G01: Jedna dominujaca os magistrali (pionowa)
 * G02: GPZ u góry, siec w dól
 * G03: Odgalezienia w bok (L-shape)
 * G04: Stacja przelotowa przejmuje tor glówny
 * G05: Ring/NOP w osobnym kanale geometrycznym
 * G06: Etykiety na osobnej warstwie z buforem
 * G07: Determinizm (ten sam model -> identyczny layout)
 * G08: Grid-snap (20px)
 * G09: Y-only collision resolution (zachowanie kolumn)
 * G10: Brak kolizji symbol-symbol (CI gate)
 */
export function layoutSldSemanticModel(
  model: SldSemanticModelV1,
  config: SldGeometryConfig,
): SldLayoutResultV1;

export interface SldLayoutResultV1 {
  readonly positions: ReadonlyMap<string, Position>;
  readonly routing: readonly RoutingSegment[];
  readonly layoutHash: string;  // SHA-256
  readonly collisions: readonly Collision[];  // MUSI byc puste
}
```

---

## 5. KONTRAKT RENDERERA

```typescript
/**
 * Renderer: LayoutResult -> SVG.
 *
 * REGULY:
 * R01: Renderer NIE rekonstruuje topologii
 * R02: Renderer NIE inferuje typu stacji
 * R03: Renderer NIE zgaduje roli pola
 * R04: Renderer czyta WYLACZNIE LayoutResult + SldSemanticModel
 * R05: Renderer uzywa WYLACZNIE kanonicznych symboli z EtapSymbolRenderer
 * R06: Renderer stosuje WYLACZNIE style z kanonicznych zródel
 * R07: Renderer NIE mutuje geometrii (overlay jest osobna warstwa)
 * R08: Renderer NIE zawiera fizyki (obliczenia w solverach)
 */
```

---

## 6. KONTRAKT STACJI PRZELOTOWEJ — SZCZEGÓLY

Stacja przelotowa jest najczestszym typem stacji w sieci terenowej SN i wymaga
szczególnego kontraktu, poniewaz to ona "przejmuje" tor glówny.

### 6.1 Fizyczna definicja

Stacja przelotowa to stacja SN, przez która przechodzi magistrala glówna.
Magistrala wchodzi z góry (pole LINE_IN) i wychodzi dolem (pole LINE_OUT).
Transformator SN/nN i odgalezienia to pola BOCZNE.

### 6.2 Topologiczna definicja

```
WARUNKI:
  - Na spanning tree trunk path
  - 2 incydentne trunk edges (incoming + outgoing)
  - 0 incydentnych branch edges (odgalezienia to pola boczne, nie krawedzie trunk)
  - incomingSegmentId != outgoingSegmentId
```

### 6.3 Geometryczny kontrakt

```
PRZYKLAD POPRAWNY:
        zasilanie z GPZ
              |
              |
        [LINIA IN]
              |
        =====SZYNA STACJI=====
        |     |     |        |
        TR   ODG   OZE   LINIA OUT
        |                    |
        T                    |
                             |
                    dalsza magistrala


PRZYKLAD BLEDNY (ZAKAZANY — stacja obok magistrali):
        magistrala glówna
              |
              |   [stacja obok]
              |-->[ IN ][ TR ][ OUT ]
              |
        dalsza magistrala

PRZYKLAD BLEDNY (ZAKAZANY — powrót bokiem):
        magistrala
              |
           [ IN ]
              |
           [szyna]----[ OUT ]
              |
        powrót bokiem
              |
        glówny pion
```

### 6.4 Testy obowiazkowe

```
TEST 1: Inline station has IN + OUT bays
  GIVEN: stacja przelotowa S1
  THEN: S1.incomingBay.bayRole == 'LINE_IN'
  AND: S1.outgoingBay.bayRole == 'LINE_OUT'

TEST 2: Inline station main path is through
  GIVEN: stacja przelotowa S1 na trunk T1
  THEN: S1.incomingSegmentId jest na T1
  AND: S1.outgoingSegmentId jest na T1
  AND: S1.incomingSegmentId != S1.outgoingSegmentId

TEST 3: No parallel bypass
  GIVEN: stacja przelotowa S1
  THEN: nie istnieje sciezka z S1.incoming_node do S1.outgoing_node
        omijajaca S1

TEST 4: OUT continues trunk
  GIVEN: stacja przelotowa S1 z pole LINE_OUT
  THEN: pole LINE_OUT.connectedBranchId jest nastepnym segmentem magistrali
```

---

## 7. MAPA KONTRAKTÓW -> PLIKI

| Kontrakt | Plik docelowy | Status |
|----------|--------------|--------|
| SldSemanticModelV1 | `frontend/src/ui/sld/core/sldSemanticModel.ts` | NOWY |
| SldGpzV1 | `frontend/src/ui/sld/core/sldSemanticModel.ts` | NOWY |
| SldTrunkV1 | `frontend/src/ui/sld/core/sldSemanticModel.ts` | NOWY |
| SldInlineStationV1 | `frontend/src/ui/sld/core/sldSemanticModel.ts` | NOWY |
| SldBranchStationV1 | `frontend/src/ui/sld/core/sldSemanticModel.ts` | NOWY |
| SldSectionalStationV1 | `frontend/src/ui/sld/core/sldSemanticModel.ts` | NOWY |
| SldTerminalStationV1 | `frontend/src/ui/sld/core/sldSemanticModel.ts` | NOWY |
| SldBayV1 | `frontend/src/ui/sld/core/sldSemanticModel.ts` | NOWY |
| SldReserveLinkV1 | `frontend/src/ui/sld/core/sldSemanticModel.ts` | NOWY |
| buildSldSemanticModel() | `frontend/src/ui/sld/core/sldSemanticAdapter.ts` | NOWY |
| validateSldSemanticModel() | `frontend/src/ui/sld/core/sldSemanticValidator.ts` | NOWY |
| SldGeometryConfig | `frontend/src/ui/sld/core/sldGeometryConfig.ts` | NOWY |
| SldLayoutResultV1 | `frontend/src/ui/sld/core/layoutResult.ts` | ISTNIEJACY |
| StationTopologyKind | `backend/src/network_model/core/station.py` | DO ROZSZERZENIA |
| Bay, BayRole | `backend/src/network_model/core/bay.py` | NOWY |
| TrunkSegmentation | `backend/src/network_model/core/trunk.py` | NOWY |
