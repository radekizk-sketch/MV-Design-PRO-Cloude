import type { AnySldSymbol, BranchSymbol, BusSymbol, LoadSymbol, SourceSymbol } from '../../sld-editor/types';
import { computeLayout, DEFAULT_LAYOUT_CONFIG } from './layoutPipeline';
import type { CanonicalAnnotationsV1 } from './layoutResult';
import { buildVisualGraphFromTopology } from './topologyAdapterV2';
import { BranchKind, StationKind, type TopologyInputV1 } from './topologyInputReader';

export type ReferenceScenarioId = 'leaf' | 'pass' | 'branch' | 'ring';

export interface ReferenceScenarioResult {
  readonly scenarioId: ReferenceScenarioId;
  readonly input: TopologyInputV1;
  readonly symbols: AnySldSymbol[];
  readonly canonicalAnnotations: CanonicalAnnotationsV1 | null;
}

function buildBaseInput(snapshotId: string): TopologyInputV1 {
  return {
    snapshotId,
    snapshotFingerprint: `${snapshotId}_fp`,
    connectionNodes: [
      { id: 'bus_gpz', name: 'GPZ', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_s1_sn', name: 'S1 SN', voltageKv: 15, stationId: 'st1', busIndex: null, inService: true },
      { id: 'bus_s1_nn', name: 'S1 nN', voltageKv: 0.4, stationId: 'st1', busIndex: null, inService: true },
      { id: 'bus_s2_sn', name: 'S2 SN', voltageKv: 15, stationId: 'st2', busIndex: null, inService: true },
      { id: 'bus_s2_nn', name: 'S2 nN', voltageKv: 0.4, stationId: 'st2', busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_g_s1', name: 'GPZ-S1', fromNodeId: 'bus_gpz', toNodeId: 'bus_s1_sn', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 1.2, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_s1_s2', name: 'S1-S2', fromNodeId: 'bus_s1_sn', toNodeId: 'bus_s2_sn', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 0.8, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'tr_s1', name: 'TR S1', fromNodeId: 'bus_s1_sn', toNodeId: 'bus_s1_nn', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-630', lengthKm: null, ratedPowerMva: 0.63, voltageHvKv: 15, voltageLvKv: 0.4 },
      { id: 'tr_s2', name: 'TR S2', fromNodeId: 'bus_s2_sn', toNodeId: 'bus_s2_nn', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-400', lengthKm: null, ratedPowerMva: 0.4, voltageHvKv: 15, voltageLvKv: 0.4 },
    ],
    devices: [],
    stations: [
      { id: 'st1', name: 'Stacja 1', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_s1_sn', 'bus_s1_nn'], branchIds: [], switchIds: [], transformerIds: ['tr_s1'] },
      { id: 'st2', name: 'Stacja 2', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_s2_sn', 'bus_s2_nn'], branchIds: [], switchIds: [], transformerIds: ['tr_s2'] },
    ],
    generators: [],
    sources: [{ id: 'src_gpz', name: 'Zasilanie GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [
      { id: 'load_s1', name: 'Odbiór S1', nodeId: 'bus_s1_nn', inService: true, pMw: 0.15, qMvar: 0.04 },
      { id: 'load_s2', name: 'Odbiór S2', nodeId: 'bus_s2_nn', inService: true, pMw: 0.1, qMvar: 0.03 },
    ],
    protectionBindings: [],
    fixActions: [],
  };
}

function buildScenarioInput(scenarioId: ReferenceScenarioId): TopologyInputV1 {
  if (scenarioId === 'leaf') {
    const input = buildBaseInput('canon_leaf');
    return {
      ...input,
      connectionNodes: input.connectionNodes.filter((n) => !['bus_s2_sn', 'bus_s2_nn'].includes(n.id)),
      branches: input.branches.filter((b) => !['line_s1_s2', 'tr_s2'].includes(b.id)),
      stations: input.stations.filter((s) => s.id !== 'st2'),
      loads: input.loads.filter((l) => l.id !== 'load_s2'),
    };
  }

  if (scenarioId === 'pass') {
    return buildBaseInput('canon_passthrough');
  }

  if (scenarioId === 'branch') {
    const input = buildBaseInput('canon_branch');
    input.connectionNodes.push(
      { id: 'bus_b1_sn', name: 'B1 SN', voltageKv: 15, stationId: 'stb', busIndex: null, inService: true },
      { id: 'bus_b1_nn', name: 'B1 nN', voltageKv: 0.4, stationId: 'stb', busIndex: null, inService: true },
    );
    input.branches.push(
      { id: 'line_s1_b1', name: 'S1-B1', fromNodeId: 'bus_s1_sn', toNodeId: 'bus_b1_sn', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-70', lengthKm: 0.6, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'tr_b1', name: 'TR B1', fromNodeId: 'bus_b1_sn', toNodeId: 'bus_b1_nn', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-250', lengthKm: null, ratedPowerMva: 0.25, voltageHvKv: 15, voltageLvKv: 0.4 },
    );
    input.stations.push({ id: 'stb', name: 'Stacja B1', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_b1_sn', 'bus_b1_nn'], branchIds: [], switchIds: [], transformerIds: ['tr_b1'] });
    input.loads.push({ id: 'load_b1', name: 'Odbiór B1', nodeId: 'bus_b1_nn', inService: true, pMw: 0.08, qMvar: 0.02 });
    return input;
  }

  const input = buildBaseInput('canon_ring');
  input.connectionNodes.push(
    { id: 'bus_s3_sn', name: 'S3 SN', voltageKv: 15, stationId: 'st3', busIndex: null, inService: true },
    { id: 'bus_s3_nn', name: 'S3 nN', voltageKv: 0.4, stationId: 'st3', busIndex: null, inService: true },
  );
  input.branches.push(
    { id: 'line_s2_s3', name: 'S2-S3', fromNodeId: 'bus_s2_sn', toNodeId: 'bus_s3_sn', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 0.75, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    { id: 'line_s3_s1_nop', name: 'S3-S1 punkt normalnie otwarty', fromNodeId: 'bus_s3_sn', toNodeId: 'bus_s1_sn', kind: BranchKind.LINE, isNormallyOpen: true, inService: true, catalogRef: 'AFL-120', lengthKm: 0.9, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    { id: 'tr_s3', name: 'TR S3', fromNodeId: 'bus_s3_sn', toNodeId: 'bus_s3_nn', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-400', lengthKm: null, ratedPowerMva: 0.4, voltageHvKv: 15, voltageLvKv: 0.4 },
  );
  input.stations.push({ id: 'st3', name: 'Stacja 3', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_s3_sn', 'bus_s3_nn'], branchIds: [], switchIds: [], transformerIds: ['tr_s3'] });
  input.loads.push({ id: 'load_s3', name: 'Odbiór S3', nodeId: 'bus_s3_nn', inService: true, pMw: 0.12, qMvar: 0.04 });
  return input;
}

function routeToPoints(routeSegments: readonly { from: { x: number; y: number }; to: { x: number; y: number } }[]): { x: number; y: number }[] {
  if (routeSegments.length === 0) return [];
  const points = [{ x: routeSegments[0].from.x, y: routeSegments[0].from.y }];
  for (const segment of routeSegments) {
    points.push({ x: segment.to.x, y: segment.to.y });
  }
  return points;
}

function createSymbols(input: TopologyInputV1, layout: ReturnType<typeof computeLayout>): AnySldSymbol[] {
  const placements = new Map(layout.nodePlacements.map((p) => [p.nodeId, p]));

  const buses: BusSymbol[] = input.connectionNodes.map((node) => {
    const placement = placements.get(node.id);
    return {
      id: node.id,
      elementId: node.id,
      elementType: 'Bus',
      elementName: node.name,
      inService: node.inService,
      position: { x: placement?.position.x ?? 0, y: placement?.position.y ?? 0 },
      width: 90,
      height: 10,
    };
  });

  const sources: SourceSymbol[] = input.sources.map((source) => {
    const placement = placements.get(source.id) ?? placements.get(source.nodeId);
    return {
      id: source.id,
      elementId: source.id,
      elementType: 'Source',
      elementName: source.name,
      inService: source.inService,
      connectedToNodeId: source.nodeId,
      position: { x: placement?.position.x ?? 0, y: (placement?.position.y ?? 0) - 80 },
    };
  });

  const loads: LoadSymbol[] = input.loads.map((load) => {
    const placement = placements.get(load.id) ?? placements.get(load.nodeId);
    return {
      id: load.id,
      elementId: load.id,
      elementType: 'Load',
      elementName: load.name,
      inService: load.inService,
      connectedToNodeId: load.nodeId,
      position: { x: placement?.position.x ?? 0, y: (placement?.position.y ?? 0) + 90 },
    };
  });

  const branches: BranchSymbol[] = input.branches.map((branch) => {
    const edgeId = `edge_${branch.id}`;
    const route = layout.edgeRoutes.find((edge) => edge.edgeId === edgeId);
    const branchType = branch.kind === BranchKind.CABLE ? 'CABLE' : 'LINE';
    return {
      id: branch.id,
      elementId: branch.id,
      elementType: branch.kind === BranchKind.TR_LINK ? 'TransformerBranch' : 'LineBranch',
      elementName: branch.name,
      inService: branch.inService,
      fromNodeId: branch.fromNodeId,
      toNodeId: branch.toNodeId,
      branchType,
      position: route?.startPoint ?? { x: 0, y: 0 },
      points: route ? routeToPoints(route.segments) : [],
    };
  });

  return [...buses, ...branches, ...sources, ...loads];
}

export function buildReferenceScenario(scenarioId: ReferenceScenarioId): ReferenceScenarioResult {
  const input = buildScenarioInput(scenarioId);
  const adapter = buildVisualGraphFromTopology(input);
  const layout = computeLayout(adapter.graph, DEFAULT_LAYOUT_CONFIG, adapter.stationBlockBuildResult);
  const symbols = createSymbols(input, layout);

  return {
    scenarioId,
    input,
    symbols,
    canonicalAnnotations: layout.canonicalAnnotations,
  };
}
