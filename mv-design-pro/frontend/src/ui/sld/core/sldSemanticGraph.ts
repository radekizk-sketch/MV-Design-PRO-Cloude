/**
 * SldSemanticGraphV1 — KANONICZNY publiczny kontrakt semantyczny SLD.
 *
 * WARSTWY:
 * Snapshot -> SldSemanticGraphV1 -> LayoutInputGraphV1 -> LayoutResultV1 -> Renderer
 *
 * ZASADY:
 * - Bez geometrii symboli (brak relativeX/relativeY).
 * - Bez przecieku topologii do atrybutów węzła (brak from/to/connected w node attrs).
 * - Typ stacji przez stationKind, nie przez inflację nodeType.
 * - Typ generatora przez generatorKind, nie przez inflację nodeType.
 */

import type { EdgeTypeV1, PortRoleV1 } from './visualGraph';

export const SLD_SEMANTIC_GRAPH_VERSION = 'V1' as const;

export const SemanticNodeTypeV1 = {
  GRID_SOURCE: 'GRID_SOURCE',
  STATION_SN_NN: 'STATION_SN_NN',
  TRANSFORMER_WN_SN: 'TRANSFORMER_WN_SN',
  TRANSFORMER_SN_NN: 'TRANSFORMER_SN_NN',
  BUS_SN: 'BUS_SN',
  BUS_NN: 'BUS_NN',
  FEEDER_JUNCTION: 'FEEDER_JUNCTION',
  LOAD: 'LOAD',
  GENERATOR: 'GENERATOR',
  SWITCH_BREAKER: 'SWITCH_BREAKER',
  SWITCH_DISCONNECTOR: 'SWITCH_DISCONNECTOR',
  SWITCH_LOAD_SWITCH: 'SWITCH_LOAD_SWITCH',
  SWITCH_FUSE: 'SWITCH_FUSE',
  BRANCH_POLE: 'BRANCH_POLE',
  ZKSN_NODE: 'ZKSN_NODE',
} as const;

export type SemanticNodeTypeV1 = (typeof SemanticNodeTypeV1)[keyof typeof SemanticNodeTypeV1];

export type StationKindV1 = 'A' | 'B' | 'C' | 'D' | null;
export type GeneratorKindV1 = 'PV' | 'BESS' | 'WIND' | null;

export const SemanticClassV1 = {
  GRID: 'GRID',
  STATION_CONTAINER: 'STATION_CONTAINER',
  STATION_INTERNAL: 'STATION_INTERNAL',
  NETWORK_TRUNK: 'NETWORK_TRUNK',
  NETWORK_BRANCH: 'NETWORK_BRANCH',
  NETWORK_SECONDARY: 'NETWORK_SECONDARY',
  SWITCHING: 'SWITCHING',
  LOAD: 'LOAD',
  GENERATION: 'GENERATION',
} as const;

export type SemanticClassV1 = (typeof SemanticClassV1)[keyof typeof SemanticClassV1];

export const DomainElementTypeV1 = {
  BUS: 'BUS',
  LINE: 'LINE',
  CABLE: 'CABLE',
  TRANSFORMER: 'TRANSFORMER',
  SWITCH: 'SWITCH',
  SOURCE: 'SOURCE',
  LOAD: 'LOAD',
  STATION: 'STATION',
  GENERATOR: 'GENERATOR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type DomainElementTypeV1 = (typeof DomainElementTypeV1)[keyof typeof DomainElementTypeV1];

export interface SemanticPortV1 {
  readonly id: string;
  readonly role: PortRoleV1;
}

export interface SemanticNodeAttributesV1 {
  readonly label: string;
  readonly voltageKv: number | null;
  readonly inService: boolean;
  readonly elementId: string;
  readonly elementType: DomainElementTypeV1;
  readonly elementName: string;
  readonly switchState: 'OPEN' | 'CLOSED' | null;
  readonly branchType: 'LINE' | 'CABLE' | null;
  readonly ratedPowerMva: number | null;
  readonly stationKind: StationKindV1;
  readonly generatorKind: GeneratorKindV1;
  readonly semanticClass: SemanticClassV1;
  readonly containerId: string | null;
}

export interface SemanticNodeV1 {
  readonly id: string;
  readonly nodeType: SemanticNodeTypeV1;
  readonly semanticClass: SemanticClassV1;
  readonly ports: readonly SemanticPortV1[];
  readonly attributes: SemanticNodeAttributesV1;
}

export interface SemanticEdgeV1 {
  readonly id: string;
  readonly fromNodeId: string;
  readonly fromPortId: string;
  readonly toNodeId: string;
  readonly toPortId: string;
  readonly edgeType: EdgeTypeV1;
  readonly semanticClass: SemanticClassV1;
  readonly isNormallyOpen: boolean;
  readonly lengthKm: number | null;
  readonly branchType: 'LINE' | 'CABLE' | null;
  readonly inService: boolean;
}

export interface SemanticContainerV1 {
  readonly id: string;
  readonly containerType: 'STATION';
  readonly ownerNodeId: string;
  readonly childNodeIds: readonly string[];
}

export interface SldSemanticGraphV1 {
  readonly version: typeof SLD_SEMANTIC_GRAPH_VERSION;
  readonly nodes: readonly SemanticNodeV1[];
  readonly edges: readonly SemanticEdgeV1[];
  readonly containers: readonly SemanticContainerV1[];
  readonly meta: {
    readonly snapshotId: string;
    readonly snapshotFingerprint: string;
    readonly createdAt: string;
  };
}

export function canonicalizeSldSemanticGraph(graph: SldSemanticGraphV1): SldSemanticGraphV1 {
  return {
    ...graph,
    nodes: [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...graph.edges].sort((a, b) => a.id.localeCompare(b.id)),
    containers: [...graph.containers]
      .map((c) => ({ ...c, childNodeIds: [...c.childNodeIds].sort() }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function computeSldSemanticGraphFingerprint(graph: SldSemanticGraphV1): string {
  const canonical = canonicalizeSldSemanticGraph(graph);
  const json = JSON.stringify(canonical);
  let hash = 2166136261;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `ssg-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
