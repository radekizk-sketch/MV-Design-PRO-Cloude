/**
 * LayoutResultV1 — Zamrozony kontrakt wyjscia Layout Engine.
 *
 * CANONICAL CONTRACT (BINDING):
 * - Wersja: V1
 * - Jedyne wyjscie Layout Engine.
 * - Immutable (readonly).
 * - Hash liczony WYLACZNIE z world geometry (nie camera/overlay/viewport).
 * - Canonical JSON serialization ze stabilnym sortowaniem.
 *
 * PIPELINE:
 *   VisualGraphV1 → LayoutEngine → LayoutResultV1
 *
 * DETERMINIZM:
 * - Ten sam VisualGraphV1 → identyczny LayoutResultV1 (bit-for-bit).
 * - Hash stabilny pod permutacja wejscia.
 * - nodePlacements i edgeRoutes sortowane po id.
 * - bounds deterministyczne.
 */

import type { StationBlockDetailV1 } from './fieldDeviceContracts';

// =============================================================================
// VERSION
// =============================================================================

export const LAYOUT_RESULT_VERSION = 'V1' as const;

// =============================================================================
// GEOMETRY PRIMITIVES
// =============================================================================

/** Punkt 2D w world coordinates (piksele). */
export interface PointV1 {
  readonly x: number;
  readonly y: number;
}

/** Prostokat w world coordinates. */
export interface RectangleV1 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

// =============================================================================
// NODE PLACEMENT
// =============================================================================

/**
 * Pozycja wezla po layoutcie.
 *
 * Zawiera world coords (nie screen coords).
 * Niezalezna od camera/zoom/pan.
 */
export interface NodePlacementV1 {
  /** ID wezla (= VisualNodeV1.id) */
  readonly nodeId: string;
  /** Pozycja srodka symbolu w world coords */
  readonly position: PointV1;
  /** Rozmiar symbolu [px] */
  readonly size: Readonly<{ width: number; height: number }>;
  /** Bounding box symbolu (pozycja + rozmiar) */
  readonly bounds: RectangleV1;
  /** Warstwa topologiczna (L0-L12) */
  readonly layer: number;
  /** Band index (dla branch) */
  readonly bandIndex: number;
  /** Czy pozycja automatyczna (true) czy z user override (false) */
  readonly autoPositioned: boolean;
}

// =============================================================================
// EDGE ROUTE
// =============================================================================

/** Segment sciezki (orthogonal). */
export interface PathSegmentV1 {
  readonly from: PointV1;
  readonly to: PointV1;
}

/**
 * Trasa krawedzi po layoutcie.
 *
 * Kazda krawedz ma sciezke jako sekwencje segmentow ortogonalnych.
 * laneIndex jest deterministyczny i stabilny pod permutacja.
 */
export interface EdgeRouteV1 {
  /** ID krawedzi (= VisualEdgeV1.id) */
  readonly edgeId: string;
  /** Typ krawedzi (TRUNK/BRANCH/SECONDARY_CONNECTOR/...) */
  readonly edgeType: string;
  /** Segmenty sciezki (ortogonalne) */
  readonly segments: readonly PathSegmentV1[];
  /** Punkt startowy */
  readonly startPoint: PointV1;
  /** Punkt koncowy */
  readonly endPoint: PointV1;
  /** Lane index (dla secondary connectors — deterministyczny) */
  readonly laneIndex: number;
  /** Czy krawedz jest NOP (normally open point) */
  readonly isNormallyOpen: boolean;
}

// =============================================================================
// SWITCHGEAR BLOCK
// =============================================================================

/**
 * Typ embedded switchgear block (stacja A/B/C/D).
 */
export const StationBlockType = {
  /** Typ A: leaf — 1 TR, linia zasilajaca, rozdzielnia nN */
  TYPE_A: 'TYPE_A',
  /** Typ B: passthrough — jak A + pole pomiarowe + zabezpieczenie nadpradowe */
  TYPE_B: 'TYPE_B',
  /** Typ C: trunk+branch — jak B + pole odgalezieniowe */
  TYPE_C: 'TYPE_C',
  /** Typ D: sekcyjna — 2 szyny, sprzeglo, lacznik sekcyjny */
  TYPE_D: 'TYPE_D',
} as const;

export type StationBlockType = (typeof StationBlockType)[keyof typeof StationBlockType];

/**
 * Embedded switchgear block w layoucie.
 *
 * Stacja jako podgraf z portami, bounds i wewnetrzna geometria.
 * Bounds sluzy jako NO_ROUTE_RECT (routing omija stacje).
 */
export interface SwitchgearBlockV1 {
  /** ID bloku (= id wezla stacji w VisualGraphV1) */
  readonly blockId: string;
  /** Typ stacji */
  readonly blockType: StationBlockType;
  /** Bounds bloku (NO_ROUTE_RECT) */
  readonly bounds: RectangleV1;
  /** Porty bloku z world coords */
  readonly ports: readonly SwitchgearPortV1[];
  /** Wewnetrzne elementy bloku (TR, CB, szyna nN, pola) */
  readonly internalNodes: readonly string[];
  /** Label stacji */
  readonly label: string;
  /** Szczegoly pol/urzadzen/kotwiców (RUN #3D; opcjonalne dla kompatybilnosci) */
  readonly detail: StationBlockDetailV1 | null;
}

/** Port bloku switchgear z absolutna pozycja. */
export interface SwitchgearPortV1 {
  /** ID portu */
  readonly portId: string;
  /** Rola portu (IN/OUT/BRANCH) */
  readonly role: string;
  /** Pozycja absolutna w world coords */
  readonly position: PointV1;
}

// =============================================================================
// CATALOG REFERENCE
// =============================================================================

/**
 * Referencja do katalogu urzadzen.
 *
 * ZAKAZ auto-mutacji:
 * - SLD NIE dodaje urzadzen automatycznie.
 * - Kazdy element MUSI miec referencje do katalogu.
 * - Brak referencji → ValidationError + FixAction.
 */
export interface CatalogRefV1 {
  /** ID wezla ktorego dotyczy referencja */
  readonly nodeId: string;
  /** ID typu w katalogu (lub null jesli brak — generuje ValidationError) */
  readonly catalogTypeId: string | null;
  /** Kategoria katalogu */
  readonly catalogCategory: CatalogCategory;
}

export const CatalogCategory = {
  BREAKER: 'BREAKER',
  DISCONNECTOR: 'DISCONNECTOR',
  FUSE: 'FUSE',
  CT: 'CT',
  VT: 'VT',
  TRANSFORMER: 'TRANSFORMER',
  LINE: 'LINE',
  CABLE: 'CABLE',
  RELAY: 'RELAY',
  PV_INVERTER: 'PV_INVERTER',
  BESS_PCS: 'BESS_PCS',
} as const;

export type CatalogCategory = (typeof CatalogCategory)[keyof typeof CatalogCategory];

// =============================================================================
// PROTECTION BINDING
// =============================================================================

/**
 * Powiazanie relay z wylacznikiem (CB).
 *
 * Relay stacking:
 * - Jeden RelayBlock na CB.
 * - Funkcje sortowane deterministycznie po ANSI code.
 * - Relay geometrycznie NAD CB (staly offset world coords).
 * - CT w torze mocy.
 */
export interface RelayBindingV1 {
  /** ID wylacznika (CB) do ktorego przypisany jest relay */
  readonly breakerNodeId: string;
  /** ID relay (z protection engine) */
  readonly relayId: string;
  /** Funkcje ochronne (sortowane po ANSI code) */
  readonly functions: readonly string[];
  /** ID przekladnika pradowego (CT) */
  readonly ctNodeId: string | null;
  /** Pozycja relay w world coords (nad CB) */
  readonly relayPosition: PointV1;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Blad walidacji layoutu z sugerowana akcja naprawcza.
 */
export interface LayoutValidationErrorV1 {
  /** Kod bledu */
  readonly code: string;
  /** Opis bledu */
  readonly message: string;
  /** Dotyczy wezla (jezeli dotyczy) */
  readonly nodeId: string | null;
  /** Sugerowana akcja naprawcza */
  readonly fixAction: string | null;
}

// =============================================================================
// LAYOUT RESULT (top-level)
// =============================================================================

/**
 * LayoutResultV1 — zamrozony wynik Layout Engine.
 *
 * INVARIANTY:
 * 1. nodePlacements sortowane po nodeId.
 * 2. edgeRoutes sortowane po edgeId.
 * 3. switchgearBlocks sortowane po blockId.
 * 4. catalogRefs sortowane po nodeId.
 * 5. Hash liczony WYLACZNIE z world geometry.
 * 6. Hash NIE zalezy od camera/overlay/viewport.
 * 7. Symbol-symbol overlap == 0.
 * 8. bounds obejmuje wszystkie elementy.
 */
export interface LayoutResultV1 {
  /** Wersja kontraktu */
  readonly version: typeof LAYOUT_RESULT_VERSION;
  /** Pozycje wezlow (sortowane po nodeId) */
  readonly nodePlacements: readonly NodePlacementV1[];
  /** Trasy krawedzi (sortowane po edgeId) */
  readonly edgeRoutes: readonly EdgeRouteV1[];
  /** Embedded switchgear blocks (sortowane po blockId) */
  readonly switchgearBlocks: readonly SwitchgearBlockV1[];
  /** Referencje do katalogu (sortowane po nodeId) */
  readonly catalogRefs: readonly CatalogRefV1[];
  /** Powiazania relay (sortowane po breakerNodeId) */
  readonly relayBindings: readonly RelayBindingV1[];
  /** Bledy walidacji (brak referencji katalogowej, etc.) */
  readonly validationErrors: readonly LayoutValidationErrorV1[];
  /** Bounding box calego layoutu */
  readonly bounds: RectangleV1;
  /** Deterministyczny hash (world geometry only) */
  readonly hash: string;
  /** Canonical SLD annotations (Phase 7, nullable for backwards compatibility) */
  readonly canonicalAnnotations: CanonicalAnnotationsV1 | null;
}

// =============================================================================
// CANONICAL SLD ANNOTATIONS (Phase 7)
// =============================================================================

/**
 * Annotacja węzła na torze głównym.
 * Numerowany punkt rozgałęzienia z parametrami elektrycznymi.
 */
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

/**
 * Annotacja odcinka toru głównego z parametrami impedancyjnymi.
 */
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

/**
 * Punkt odgałęzienia na torze głównym z aparaturą.
 */
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

/**
 * Łańcuch aparatów stacyjnych (QS -> Q -> CT -> T -> BUS NN -> feeders).
 */
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

/**
 * Pojedynczy aparat w łańcuchu stacyjnym.
 */
export interface StationApparatusItemV1 {
  readonly designation: string;
  readonly symbolType: string;
  readonly label: string;
  readonly parameters: Record<string, string | number>;
  readonly position: PointV1;
}

/**
 * Feeder na szynie NN.
 */
export interface NNFeederV1 {
  readonly designation: string;
  readonly type: 'load' | 'generator_pv' | 'generator_bess';
  readonly power_kW: number;
  readonly cosPhi: number | null;
  readonly additionalParams: Record<string, string | number>;
}

/**
 * Przekaźnik zabezpieczeniowy w łańcuchu stacyjnym.
 */
export interface ProtectionRelayV1 {
  readonly designation: string;
  readonly ansiCode: string;
  readonly function: string;
  readonly setting_Ir_A: number;
  readonly setting_t_s: number;
}

/**
 * Kontener adnotacji kanonicznego SLD (Phase 7 output).
 * Immutable, sorted, deterministic.
 */
export interface CanonicalAnnotationsV1 {
  readonly trunkNodes: readonly TrunkNodeAnnotationV1[];
  readonly trunkSegments: readonly TrunkSegmentAnnotationV1[];
  readonly branchPoints: readonly BranchPointV1[];
  readonly stationChains: readonly StationApparatusChainV1[];
}

// =============================================================================
// CANONICAL SERIALIZER
// =============================================================================

/**
 * Kanonizuje LayoutResultV1 — sortuje wszystkie tablice deterministycznie.
 */
export function canonicalizeLayoutResult(result: LayoutResultV1): LayoutResultV1 {
  return {
    version: result.version,
    nodePlacements: [...result.nodePlacements].sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
    edgeRoutes: [...result.edgeRoutes].sort((a, b) => a.edgeId.localeCompare(b.edgeId)),
    switchgearBlocks: [...result.switchgearBlocks].sort((a, b) => a.blockId.localeCompare(b.blockId)),
    catalogRefs: [...result.catalogRefs].sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
    relayBindings: [...result.relayBindings].sort((a, b) => a.breakerNodeId.localeCompare(b.breakerNodeId)),
    validationErrors: [...result.validationErrors].sort((a, b) => (a.nodeId ?? '').localeCompare(b.nodeId ?? '')),
    bounds: result.bounds,
    hash: result.hash,
    canonicalAnnotations: result.canonicalAnnotations,
  };
}

/**
 * Oblicza deterministyczny hash LayoutResultV1.
 *
 * Hash liczy sie WYLACZNIE z world geometry:
 * - nodePlacements (pozycje, rozmiary)
 * - edgeRoutes (segmenty)
 * - switchgearBlocks (bounds)
 * - bounds
 *
 * Hash NIE zawiera:
 * - catalogRefs (bo to dane katalogu, nie geometria)
 * - relayBindings (bo to protection, nie geometria)
 * - validationErrors (bo to diagnostyka, nie geometria)
 */
export function computeLayoutResultHash(result: LayoutResultV1): string {
  const canonical = canonicalizeLayoutResult(result);

  const hashInput = {
    placements: canonical.nodePlacements.map(p => ({
      id: p.nodeId,
      x: p.position.x,
      y: p.position.y,
      w: p.size.width,
      h: p.size.height,
      layer: p.layer,
      band: p.bandIndex,
    })),
    routes: canonical.edgeRoutes.map(r => ({
      id: r.edgeId,
      segments: r.segments.map(s => ({
        fx: s.from.x, fy: s.from.y,
        tx: s.to.x, ty: s.to.y,
      })),
      lane: r.laneIndex,
    })),
    blocks: canonical.switchgearBlocks.map(b => ({
      id: b.blockId,
      type: b.blockType,
      x: b.bounds.x, y: b.bounds.y,
      w: b.bounds.width, h: b.bounds.height,
    })),
    bounds: canonical.bounds,
  };

  const json = JSON.stringify(hashInput);

  // FNV-1a 32-bit hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Waliduje LayoutResultV1 pod katem inwariantow.
 */
export interface LayoutResultValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateLayoutResult(result: LayoutResultV1): LayoutResultValidationResult {
  const errors: string[] = [];

  // 1. Wersja
  if (result.version !== LAYOUT_RESULT_VERSION) {
    errors.push(`Oczekiwana wersja ${LAYOUT_RESULT_VERSION}, otrzymano ${result.version}`);
  }

  // 2. Sortowanie
  for (let i = 1; i < result.nodePlacements.length; i++) {
    if (result.nodePlacements[i].nodeId.localeCompare(result.nodePlacements[i - 1].nodeId) < 0) {
      errors.push('nodePlacements nie sa posortowane po nodeId');
      break;
    }
  }
  for (let i = 1; i < result.edgeRoutes.length; i++) {
    if (result.edgeRoutes[i].edgeId.localeCompare(result.edgeRoutes[i - 1].edgeId) < 0) {
      errors.push('edgeRoutes nie sa posortowane po edgeId');
      break;
    }
  }

  // 3. Symbol-symbol overlap == 0
  for (let i = 0; i < result.nodePlacements.length; i++) {
    for (let j = i + 1; j < result.nodePlacements.length; j++) {
      const a = result.nodePlacements[i].bounds;
      const b = result.nodePlacements[j].bounds;
      if (
        a.x < b.x + b.width && a.x + a.width > b.x &&
        a.y < b.y + b.height && a.y + a.height > b.y
      ) {
        errors.push(
          `Symbol-symbol overlap: ${result.nodePlacements[i].nodeId} ∩ ${result.nodePlacements[j].nodeId}`
        );
      }
    }
  }

  // 4. Bounds obejmuje wszystkie elementy
  for (const p of result.nodePlacements) {
    if (
      p.bounds.x < result.bounds.x ||
      p.bounds.y < result.bounds.y ||
      p.bounds.x + p.bounds.width > result.bounds.x + result.bounds.width ||
      p.bounds.y + p.bounds.height > result.bounds.y + result.bounds.height
    ) {
      errors.push(`Wezel ${p.nodeId} poza bounds layoutu`);
    }
  }

  // 5. Hash consistency
  const recomputedHash = computeLayoutResultHash(result);
  if (recomputedHash !== result.hash) {
    errors.push(`Hash niespojny: zapisany ${result.hash}, obliczony ${recomputedHash}`);
  }

  return { valid: errors.length === 0, errors };
}
