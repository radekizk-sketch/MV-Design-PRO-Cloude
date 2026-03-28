import { SemanticClassV1, type SldSemanticGraphV1, type SemanticNodeTypeV1 } from './sldSemanticGraph';
import type { EdgeTypeV1, PortRoleV1 } from './visualGraph';

export const LAYOUT_INPUT_GRAPH_VERSION = 'V1' as const;

export interface LayoutPortV1 {
  readonly id: string;
  readonly role: PortRoleV1;
}

export interface PortGeometryProfileV1 {
  readonly portId: string;
  readonly anchorX: number;
  readonly anchorY: number;
}

export interface SymbolProfileV1 {
  readonly width: number;
  readonly height: number;
  readonly portGeometry: readonly PortGeometryProfileV1[];
}

export interface LayoutNodeInputV1 {
  readonly id: string;
  readonly nodeType: SemanticNodeTypeV1;
  readonly semanticClass: string;
  readonly stationKind: 'A' | 'B' | 'C' | 'D' | null;
  readonly generatorKind: 'PV' | 'BESS' | 'WIND' | null;
  readonly containerId: string | null;
  readonly ports: readonly LayoutPortV1[];
  readonly symbolProfile: SymbolProfileV1;
  readonly label: string;
}

export interface LayoutEdgeInputV1 {
  readonly id: string;
  readonly fromNodeId: string;
  readonly fromPortId: string;
  readonly toNodeId: string;
  readonly toPortId: string;
  readonly edgeType: EdgeTypeV1;
  readonly semanticClass: string;
  readonly isNormallyOpen: boolean;
}

export interface LayoutInputGraphV1 {
  readonly version: typeof LAYOUT_INPUT_GRAPH_VERSION;
  readonly nodes: readonly LayoutNodeInputV1[];
  readonly edges: readonly LayoutEdgeInputV1[];
  readonly constraints: {
    readonly minSpacing: number;
    readonly maxSpacing: number;
    readonly keepRingSecondaryLane: boolean;
  };
  readonly meta: {
    readonly snapshotId: string;
    readonly snapshotFingerprint: string;
    readonly semanticFingerprint: string;
  };
}

function defaultSymbolProfile(nodeType: SemanticNodeTypeV1): SymbolProfileV1 {
  if (nodeType === 'STATION_SN_NN') {
    return {
      width: 180,
      height: 140,
      portGeometry: [
        { portId: 'in', anchorX: 0.5, anchorY: 0 },
        { portId: 'out', anchorX: 0.5, anchorY: 1 },
        { portId: 'branch', anchorX: 1, anchorY: 0.5 },
      ],
    };
  }
  if (nodeType === 'BUS_SN' || nodeType === 'BUS_NN') {
    return {
      width: 320,
      height: 14,
      portGeometry: [
        { portId: 'left', anchorX: 0, anchorY: 0.5 },
        { portId: 'right', anchorX: 1, anchorY: 0.5 },
      ],
    };
  }
  if (nodeType === 'GRID_SOURCE') {
    return {
      width: 180,
      height: 84,
      portGeometry: [{ portId: 'bottom', anchorX: 0.5, anchorY: 1 }],
    };
  }
  return {
    width: 64,
    height: 64,
    portGeometry: [
      { portId: 'in', anchorX: 0.5, anchorY: 0 },
      { portId: 'out', anchorX: 0.5, anchorY: 1 },
    ],
  };
}

export function buildLayoutInputGraph(
  semanticGraph: SldSemanticGraphV1,
  options?: { readonly minSpacing?: number; readonly maxSpacing?: number },
): LayoutInputGraphV1 {
  const nodes = semanticGraph.nodes.map((node) => ({
    id: node.id,
    nodeType: node.nodeType,
    semanticClass: node.semanticClass,
    stationKind: node.attributes.stationKind,
    generatorKind: node.attributes.generatorKind,
    containerId: node.attributes.containerId,
    ports: node.ports,
    symbolProfile: defaultSymbolProfile(node.nodeType),
    label: node.attributes.label,
  })).sort((a, b) => a.id.localeCompare(b.id));

  const edges = semanticGraph.edges.map((edge) => ({
    id: edge.id,
    fromNodeId: edge.fromNodeId,
    fromPortId: edge.fromPortId,
    toNodeId: edge.toNodeId,
    toPortId: edge.toPortId,
    edgeType: edge.edgeType,
    semanticClass: edge.semanticClass,
    isNormallyOpen: edge.isNormallyOpen,
  })).sort((a, b) => a.id.localeCompare(b.id));

  return {
    version: LAYOUT_INPUT_GRAPH_VERSION,
    nodes,
    edges,
    constraints: {
      minSpacing: options?.minSpacing ?? 120,
      maxSpacing: options?.maxSpacing ?? 360,
      keepRingSecondaryLane: true,
    },
    meta: {
      snapshotId: semanticGraph.meta.snapshotId,
      snapshotFingerprint: semanticGraph.meta.snapshotFingerprint,
      semanticFingerprint: semanticGraph.meta.snapshotFingerprint,
    },
  };
}

export function classifyEdgeSemanticClass(edgeType: EdgeTypeV1): string {
  if (edgeType === 'TRUNK') return SemanticClassV1.NETWORK_TRUNK;
  if (edgeType === 'BRANCH') return SemanticClassV1.NETWORK_BRANCH;
  if (edgeType === 'SECONDARY_CONNECTOR') return SemanticClassV1.NETWORK_SECONDARY;
  return SemanticClassV1.STATION_INTERNAL;
}
