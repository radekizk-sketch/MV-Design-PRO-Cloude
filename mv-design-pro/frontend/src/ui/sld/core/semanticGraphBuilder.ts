import type { TopologyInputV1 } from './topologyInputReader';
import type { VisualGraphV1, NodeTypeV1 as LegacyNodeTypeV1, EdgeTypeV1, PortRoleV1 } from './visualGraph';
import {
  SLD_SEMANTIC_GRAPH_VERSION,
  SemanticClassV1,
  SemanticNodeTypeV1,
  DomainElementTypeV1,
  type SldSemanticGraphV1,
  type SemanticNodeV1,
  type SemanticEdgeV1,
  type StationKindV1,
  type GeneratorKindV1,
  canonicalizeSldSemanticGraph,
} from './sldSemanticGraph';

function mapDomainElementType(elementType: string): DomainElementTypeV1 {
  const upper = elementType.toUpperCase();
  if (upper.includes('BUS')) return DomainElementTypeV1.BUS;
  if (upper.includes('LINE')) return DomainElementTypeV1.LINE;
  if (upper.includes('CABLE')) return DomainElementTypeV1.CABLE;
  if (upper.includes('TRAFO') || upper.includes('TRANSFORMER')) return DomainElementTypeV1.TRANSFORMER;
  if (upper.includes('SWITCH') || upper.includes('BREAKER') || upper.includes('DISCONNECTOR')) return DomainElementTypeV1.SWITCH;
  if (upper.includes('SOURCE') || upper.includes('GRID')) return DomainElementTypeV1.SOURCE;
  if (upper.includes('LOAD')) return DomainElementTypeV1.LOAD;
  if (upper.includes('STATION')) return DomainElementTypeV1.STATION;
  if (upper.includes('GENERATOR') || upper.includes('PV') || upper.includes('BESS') || upper.includes('WIND')) return DomainElementTypeV1.GENERATOR;
  return DomainElementTypeV1.UNKNOWN;
}

function mapStationKind(nodeType: LegacyNodeTypeV1): StationKindV1 {
  if (nodeType === 'STATION_SN_NN_A') return 'A';
  if (nodeType === 'STATION_SN_NN_B') return 'B';
  if (nodeType === 'STATION_SN_NN_C') return 'C';
  if (nodeType === 'STATION_SN_NN_D') return 'D';
  if (nodeType === 'SWITCHGEAR_BLOCK') return 'B';
  return null;
}

function mapGeneratorKind(nodeType: LegacyNodeTypeV1): GeneratorKindV1 {
  if (nodeType === 'GENERATOR_PV') return 'PV';
  if (nodeType === 'GENERATOR_BESS') return 'BESS';
  if (nodeType === 'GENERATOR_WIND') return 'WIND';
  return null;
}

function mapSemanticNodeType(nodeType: LegacyNodeTypeV1): (typeof SemanticNodeTypeV1)[keyof typeof SemanticNodeTypeV1] {
  if (nodeType.startsWith('STATION_SN_NN_') || nodeType === 'SWITCHGEAR_BLOCK') return SemanticNodeTypeV1.STATION_SN_NN;
  if (nodeType.startsWith('GENERATOR_')) return SemanticNodeTypeV1.GENERATOR;
  return (SemanticNodeTypeV1[nodeType as keyof typeof SemanticNodeTypeV1] ?? SemanticNodeTypeV1.FEEDER_JUNCTION);
}

function mapNodeClass(nodeType: LegacyNodeTypeV1): (typeof SemanticClassV1)[keyof typeof SemanticClassV1] {
  if (nodeType === 'GRID_SOURCE') return SemanticClassV1.GRID;
  if (nodeType.startsWith('STATION_SN_NN_') || nodeType === 'SWITCHGEAR_BLOCK') return SemanticClassV1.STATION_CONTAINER;
  if (nodeType.startsWith('SWITCH_')) return SemanticClassV1.SWITCHING;
  if (nodeType === 'LOAD') return SemanticClassV1.LOAD;
  if (nodeType.startsWith('GENERATOR_')) return SemanticClassV1.GENERATION;
  return SemanticClassV1.NETWORK_TRUNK;
}

function mapEdgeClass(edgeType: EdgeTypeV1): (typeof SemanticClassV1)[keyof typeof SemanticClassV1] {
  if (edgeType === 'TRUNK') return SemanticClassV1.NETWORK_TRUNK;
  if (edgeType === 'BRANCH') return SemanticClassV1.NETWORK_BRANCH;
  if (edgeType === 'SECONDARY_CONNECTOR') return SemanticClassV1.NETWORK_SECONDARY;
  return SemanticClassV1.STATION_INTERNAL;
}

export function buildSldSemanticGraphFromVisualGraph(graph: VisualGraphV1): SldSemanticGraphV1 {
  const nodes: SemanticNodeV1[] = graph.nodes.map((node) => {
    const semanticClass = mapNodeClass(node.nodeType);
    return {
      id: node.id,
      nodeType: mapSemanticNodeType(node.nodeType),
      semanticClass,
      ports: node.ports.map((port) => ({
        id: port.id,
        role: port.role as PortRoleV1,
      })),
      attributes: {
        label: node.attributes.label,
        voltageKv: node.attributes.voltageKv,
        inService: node.attributes.inService,
        elementId: node.attributes.elementId,
        elementType: mapDomainElementType(node.attributes.elementType),
        elementName: node.attributes.elementName,
        switchState: node.attributes.switchState,
        branchType: node.attributes.branchType,
        ratedPowerMva: node.attributes.ratedPowerMva,
        stationKind: mapStationKind(node.nodeType),
        generatorKind: mapGeneratorKind(node.nodeType),
        semanticClass,
        containerId: (node.nodeType === 'SWITCHGEAR_BLOCK' ? node.id : null),
      },
    };
  });

  const edges: SemanticEdgeV1[] = graph.edges.map((edge) => ({
    id: edge.id,
    fromNodeId: edge.fromPortRef.nodeId,
    fromPortId: edge.fromPortRef.portId,
    toNodeId: edge.toPortRef.nodeId,
    toPortId: edge.toPortRef.portId,
    edgeType: edge.edgeType,
    semanticClass: mapEdgeClass(edge.edgeType),
    isNormallyOpen: edge.isNormallyOpen,
    lengthKm: edge.attributes.lengthKm,
    branchType: edge.attributes.branchType,
    inService: edge.attributes.inService,
  }));

  const stationNodes = nodes.filter((n) => n.nodeType === SemanticNodeTypeV1.STATION_SN_NN);
  const containers = stationNodes.map((station) => ({
    id: `container_${station.id}`,
    containerType: 'STATION' as const,
    ownerNodeId: station.id,
    childNodeIds: nodes
      .filter((n) => n.attributes.containerId === station.id)
      .map((n) => n.id)
      .sort(),
  }));

  return canonicalizeSldSemanticGraph({
    version: SLD_SEMANTIC_GRAPH_VERSION,
    nodes,
    edges,
    containers,
    meta: {
      snapshotId: graph.meta.snapshotId,
      snapshotFingerprint: graph.meta.snapshotFingerprint,
      createdAt: graph.meta.createdAt,
    },
  });
}

/**
 * Snapshot/TopologyInput -> SldSemanticGraphV1.
 *
 * Aktualnie używa przejściowej ścieżki przez VisualGraph (legacy adapter),
 * ale kontrakt wyjściowy pozostaje czysto semantyczny.
 */
export function buildSldSemanticGraphFromTopologyInput(
  input: TopologyInputV1,
  deps: {
    readonly buildLegacyVisualGraph: (topology: TopologyInputV1) => VisualGraphV1;
  },
): SldSemanticGraphV1 {
  const legacyGraph = deps.buildLegacyVisualGraph(input);
  return buildSldSemanticGraphFromVisualGraph(legacyGraph);
}
