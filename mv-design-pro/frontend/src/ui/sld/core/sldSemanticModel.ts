/**
 * SldSemanticModelV1 — Jawny model semantyczny SLD.
 *
 * CANONICAL CONTRACT (BINDING):
 * - Jedyne źródło semantyki dla rendererów SLD.
 * - Budowany przez sldSemanticAdapter z TopologyInput + SegmentationResult + StationBlockDetails.
 * - Walidowany przez sldSemanticValidator przed renderingiem.
 * - NIE zawiera geometrii — tylko topologię i semantykę stacji/pól.
 *
 * DETERMINIZM:
 * - Ten sam TopologyInput → identyczny SldSemanticModelV1.
 * - Sortowanie po id na każdym etapie.
 */

import type { EmbeddingRoleV1 } from './fieldDeviceContracts';
import type { DeviceTypeV1 } from './fieldDeviceContracts';

// =============================================================================
// STATION KIND — kanoniczny typ stacji
// =============================================================================

export const StationKindSld = {
  INLINE: 'stacja_przelotowa',
  BRANCH: 'stacja_odgalezna',
  SECTIONAL: 'stacja_sekcyjna',
  TERMINAL: 'stacja_koncowa',
  OZE_CLUSTER: 'stacja_oze',
} as const;

export type StationKindSld = (typeof StationKindSld)[keyof typeof StationKindSld];

// =============================================================================
// BAY ROLE
// =============================================================================

export const BayRoleSld = {
  LINE_IN: 'LINE_IN',
  LINE_OUT: 'LINE_OUT',
  TRANSFORMER: 'TRANSFORMER',
  BRANCH: 'BRANCH',
  COUPLER: 'COUPLER',
  PV: 'PV',
  BESS: 'BESS',
  WIND: 'WIND',
  MEASUREMENT: 'MEASUREMENT',
} as const;

export type BayRoleSld = (typeof BayRoleSld)[keyof typeof BayRoleSld];

// =============================================================================
// DEVICE IN BAY
// =============================================================================

export interface SldDeviceV1 {
  readonly id: string;
  readonly deviceType: DeviceTypeV1;
  readonly state: 'OPEN' | 'CLOSED' | null;
  readonly label: string;
  readonly catalogRef: string | null;
}

// =============================================================================
// BAY
// =============================================================================

export interface SldBayV1 {
  readonly id: string;
  readonly bayRole: BayRoleSld;
  readonly busSectionId: string;
  /** Urządzenia w polu (uporządkowane: DS → CB → CT → RELAY → GENERATOR) */
  readonly devices: readonly SldDeviceV1[];
  /** Gałąź podłączona do pola */
  readonly connectedBranchId: string | null;
  /** Generator podłączony */
  readonly connectedGeneratorId: string | null;
  /** Etykieta pola */
  readonly label: string;
}

// =============================================================================
// TRUNK SEGMENT
// =============================================================================

export interface SldSegmentV1 {
  readonly segmentId: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly branchType: 'LINE' | 'CABLE' | null;
  readonly lengthKm: number | null;
  readonly label: string;
}

// =============================================================================
// BRANCH POINT
// =============================================================================

export interface SldBranchPointV1 {
  /** ID węzła junction */
  readonly nodeId: string;
  /** Pozycja na magistrali (indeks segmentu) */
  readonly positionOnTrunk: number;
  /** ID odgałęzień wychodzących z tego punktu */
  readonly branchPathIds: readonly string[];
}

// =============================================================================
// STATION REF (on trunk)
// =============================================================================

export interface SldStationRefV1 {
  readonly stationId: string;
  readonly stationKind: StationKindSld;
  /** Pozycja na magistrali (indeks segmentu po którym jest stacja) */
  readonly positionOnTrunk: number;
}

// =============================================================================
// TRUNK
// =============================================================================

export interface SldTrunkV1 {
  readonly id: string;
  /** Pole GPZ, z którego wychodzi magistrala */
  readonly sourceFieldId: string | null;
  /** Węzeł na szynie GPZ */
  readonly sourceNodeId: string;
  /** Uporządkowane segmenty magistrali */
  readonly orderedSegments: readonly SldSegmentV1[];
  /** Stacje na magistrali (w kolejności topologicznej) */
  readonly orderedStationRefs: readonly SldStationRefV1[];
  /** Punkty odgałęzienia na magistrali */
  readonly branchPoints: readonly SldBranchPointV1[];
}

// =============================================================================
// BRANCH PATH
// =============================================================================

export interface SldBranchPathV1 {
  readonly id: string;
  /** ID punktu odgałęzienia (junction node) */
  readonly junctionNodeId: string | null;
  /** ID magistrali, z której odchodzi */
  readonly parentTrunkId: string | null;
  /** Segmenty odgałęzienia (uporządkowane) */
  readonly orderedSegments: readonly SldSegmentV1[];
  /** Stacje na odgałęzieniu (uporządkowane) */
  readonly orderedStationIds: readonly string[];
}

// =============================================================================
// STATIONS
// =============================================================================

export interface SldInlineStationV1 {
  readonly id: string;
  readonly name: string;
  readonly stationKind: typeof StationKindSld.INLINE;
  readonly embeddingRole: EmbeddingRoleV1;
  readonly trunkId: string;
  readonly incomingSegmentId: string;
  readonly outgoingSegmentId: string;
  readonly incomingBay: SldBayV1;
  readonly outgoingBay: SldBayV1;
  readonly transformerBays: readonly SldBayV1[];
  readonly branchBays: readonly SldBayV1[];
  readonly generatorBays: readonly SldBayV1[];
}

export interface SldBranchStationV1 {
  readonly id: string;
  readonly name: string;
  readonly stationKind: typeof StationKindSld.BRANCH;
  readonly embeddingRole: EmbeddingRoleV1;
  readonly branchPathId: string | null;
  readonly incomingBay: SldBayV1 | null;
  readonly outgoingBay: SldBayV1 | null;
  readonly transformerBays: readonly SldBayV1[];
  readonly generatorBays: readonly SldBayV1[];
}

export interface SldSectionalStationV1 {
  readonly id: string;
  readonly name: string;
  readonly stationKind: typeof StationKindSld.SECTIONAL;
  readonly embeddingRole: EmbeddingRoleV1;
  readonly sectionABusId: string;
  readonly sectionBBusId: string;
  readonly tieBay: SldBayV1 | null;
  readonly normallyOpenPointId: string | null;
  readonly incomingBays: readonly SldBayV1[];
  readonly outgoingBays: readonly SldBayV1[];
  readonly transformerBays: readonly SldBayV1[];
}

export interface SldTerminalStationV1 {
  readonly id: string;
  readonly name: string;
  readonly stationKind: typeof StationKindSld.TERMINAL;
  readonly embeddingRole: EmbeddingRoleV1;
  readonly incomingBay: SldBayV1 | null;
  readonly transformerBays: readonly SldBayV1[];
  readonly generatorBays: readonly SldBayV1[];
}

// =============================================================================
// RESERVE LINK (NOP / Ring)
// =============================================================================

export interface SldReserveLinkV1 {
  readonly id: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly isNormallyOpen: boolean;
  readonly label: string;
  readonly branchType: 'LINE' | 'CABLE' | null;
  readonly lengthKm: number | null;
}

// =============================================================================
// DIAGNOSTIC
// =============================================================================

export interface SldSemanticDiagnosticV1 {
  readonly code: string;
  readonly message: string;
  readonly stationId: string | null;
  readonly severity: 'ERROR' | 'WARNING' | 'INFO';
}

// =============================================================================
// SEMANTIC MODEL (top-level)
// =============================================================================

export interface SldSemanticModelV1 {
  readonly version: 'V1';
  readonly snapshotId: string;
  readonly snapshotFingerprint: string;

  /** Magistrale główne (uporządkowane) */
  readonly trunks: readonly SldTrunkV1[];
  /** Odgałęzienia (uporządkowane) */
  readonly branchPaths: readonly SldBranchPathV1[];
  /** Stacje przelotowe */
  readonly inlineStations: readonly SldInlineStationV1[];
  /** Stacje odgałęźne */
  readonly branchStations: readonly SldBranchStationV1[];
  /** Stacje sekcyjne */
  readonly sectionalStations: readonly SldSectionalStationV1[];
  /** Stacje końcowe */
  readonly terminalStations: readonly SldTerminalStationV1[];
  /** Połączenia rezerwowe (ring/NOP) */
  readonly reserveLinks: readonly SldReserveLinkV1[];
  /** Diagnostyki */
  readonly diagnostics: readonly SldSemanticDiagnosticV1[];
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export type SldAnyStationV1 =
  | SldInlineStationV1
  | SldBranchStationV1
  | SldSectionalStationV1
  | SldTerminalStationV1;

export function isInlineStation(s: SldAnyStationV1): s is SldInlineStationV1 {
  return s.stationKind === StationKindSld.INLINE;
}

export function isBranchStation(s: SldAnyStationV1): s is SldBranchStationV1 {
  return s.stationKind === StationKindSld.BRANCH;
}

export function isSectionalStation(s: SldAnyStationV1): s is SldSectionalStationV1 {
  return s.stationKind === StationKindSld.SECTIONAL;
}

export function isTerminalStation(s: SldAnyStationV1): s is SldTerminalStationV1 {
  return s.stationKind === StationKindSld.TERMINAL;
}
