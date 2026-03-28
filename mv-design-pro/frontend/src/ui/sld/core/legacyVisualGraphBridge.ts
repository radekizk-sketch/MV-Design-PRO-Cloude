import type { LayoutInputGraphV1 } from './layoutInputGraph';
import type { VisualGraphV1 } from './visualGraph';
import { VISUAL_GRAPH_VERSION } from './visualGraph';

function mapNodeType(nodeType: string, stationKind: 'A' | 'B' | 'C' | 'D' | null, generatorKind: 'PV' | 'BESS' | 'WIND' | null): VisualGraphV1['nodes'][number]['nodeType'] {
  if (nodeType === 'STATION_SN_NN') {
    if (stationKind === 'A') return 'STATION_SN_NN_A';
    if (stationKind === 'B') return 'STATION_SN_NN_B';
    if (stationKind === 'C') return 'STATION_SN_NN_C';
    if (stationKind === 'D') return 'STATION_SN_NN_D';
    return 'STATION_SN_NN_B';
  }
  if (nodeType === 'GENERATOR') {
    if (generatorKind === 'PV') return 'GENERATOR_PV';
    if (generatorKind === 'BESS') return 'GENERATOR_BESS';
    if (generatorKind === 'WIND') return 'GENERATOR_WIND';
    return 'GENERATOR_PV';
  }
  return nodeType as VisualGraphV1['nodes'][number]['nodeType'];
}

export function buildLegacyVisualGraphFromLayoutInput(input: LayoutInputGraphV1): VisualGraphV1 {
  return {
    version: VISUAL_GRAPH_VERSION,
    nodes: input.nodes.map((node) => ({
      id: node.id,
      nodeType: mapNodeType(node.nodeType, node.stationKind, node.generatorKind),
      ports: node.ports.map((port) => ({ id: port.id, role: port.role, relativeX: 0.5, relativeY: 0.5 })),
      attributes: {
        label: node.label,
        voltageKv: null,
        inService: true,
        elementId: node.id,
        elementType: node.nodeType,
        elementName: node.label,
        switchState: null,
        branchType: null,
        ratedPowerMva: null,
        width: node.symbolProfile.width,
        height: node.symbolProfile.height,
        fromNodeId: null,
        toNodeId: null,
        connectedToNodeId: null,
      },
    })),
    edges: input.edges.map((edge) => ({
      id: edge.id,
      fromPortRef: { nodeId: edge.fromNodeId, portId: edge.fromPortId },
      toPortRef: { nodeId: edge.toNodeId, portId: edge.toPortId },
      edgeType: edge.edgeType,
      isNormallyOpen: edge.isNormallyOpen,
      attributes: { label: edge.id, lengthKm: null, branchType: null, inService: true },
    })),
    meta: {
      snapshotId: input.meta.snapshotId,
      snapshotFingerprint: input.meta.snapshotFingerprint,
      createdAt: '1970-01-01T00:00:00.000Z',
      version: VISUAL_GRAPH_VERSION,
    },
  };
}
