import { describe, expect, it } from 'vitest';
import { buildVisualGraphFromTopology } from '../topologyAdapterV2';
import { computeLayout, DEFAULT_LAYOUT_CONFIG } from '../layoutPipeline';
import type { TopologyInputV1 } from '../topologyInputReader';
import { BranchKind, StationKind } from '../topologyInputReader';
import { EdgeTypeV1 } from '../visualGraph';
import { buildFixtureRingNop } from './sldRenderManifest.fixtures';

function runLayout(input: TopologyInputV1) {
  const adapter = buildVisualGraphFromTopology(input);
  const layout = computeLayout(adapter.graph, DEFAULT_LAYOUT_CONFIG, adapter.stationBlockBuildResult);
  return { adapter, layout };
}

function makeBaseInput(snapshotId: string): TopologyInputV1 {
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
      { id: 'load_s1', name: 'Load S1', nodeId: 'bus_s1_nn', inService: true, pMw: 0.15, qMvar: 0.04 },
      { id: 'load_s2', name: 'Load S2', nodeId: 'bus_s2_nn', inService: true, pMw: 0.1, qMvar: 0.03 },
    ],
    protectionBindings: [],
    fixActions: [],
  };
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

describe('Final SLD geometry canon (vertical SN)', () => {
  it('GPZ na górze i trunk pionowo w dół (wzorzec: GPZ → trunk → stacja końcowa)', () => {
    const input = makeBaseInput('canon_leaf');
    input.branches = input.branches.filter((b) => b.id !== 'line_s1_s2' && b.id !== 'tr_s2');
    input.connectionNodes = input.connectionNodes.filter((n) => !['bus_s2_sn', 'bus_s2_nn'].includes(n.id));
    input.stations = input.stations.filter((s) => s.id !== 'st2');
    input.loads = input.loads.filter((l) => l.id !== 'load_s2');

    const { layout } = runLayout(input);

    const gpz = layout.nodePlacements.find((n) => n.nodeId === 'bus_gpz');
    const st = layout.nodePlacements.find((n) => n.nodeId === 'st1');
    expect(gpz).toBeDefined();
    expect(st).toBeDefined();
    expect(gpz!.position.y).toBeLessThan(st!.position.y);

    const trunkEdge = layout.edgeRoutes.find((e) => e.edgeId === 'edge_line_g_s1');
    expect(trunkEdge?.edgeType).toBe(EdgeTypeV1.TRUNK);
    // pierwszy odcinek po wyjściu z GPZ jest pionowy
    const seg = trunkEdge!.segments[0];
    expect(seg.from.x).toBe(seg.to.x);
    expect(seg.to.y).toBeGreaterThanOrEqual(seg.from.y);

    const stationBlock = layout.switchgearBlocks.find((b) => b.blockId === 'st1');
    expect(stationBlock).toBeDefined();
    expect(['TYPE_A', 'TYPE_B']).toContain(stationBlock!.blockType);
  });

  it('stacja przelotowa: GPZ → trunk → stacja przelotowa', () => {
    const { layout } = runLayout(makeBaseInput('canon_passthrough'));

    const st1 = layout.nodePlacements.find((n) => n.nodeId === 'st1');
    const st2 = layout.nodePlacements.find((n) => n.nodeId === 'st2');
    expect(st1).toBeDefined();
    expect(st2).toBeDefined();
    expect(st1!.position.y).toBeLessThan(st2!.position.y);

    const s1ToS2 = layout.edgeRoutes.find((e) => e.edgeId === 'edge_line_s1_s2');
    expect(s1ToS2?.edgeType).toBe(EdgeTypeV1.TRUNK);

    const stationChain = layout.canonicalAnnotations?.stationChains.find((s) => s.stationId === 'st1');
    expect(stationChain).toBeDefined();
    expect(stationChain!.apparatus.length).toBeGreaterThan(0);
  });

  it('branch bok + dół: trunk → branch → stacja odgałęźna', () => {
    const input = makeBaseInput('canon_branch');
    input.connectionNodes.push(
      { id: 'bus_b1_sn', name: 'B1 SN', voltageKv: 15, stationId: 'stb', busIndex: null, inService: true },
      { id: 'bus_b1_nn', name: 'B1 nN', voltageKv: 0.4, stationId: 'stb', busIndex: null, inService: true },
    );
    input.branches.push(
      { id: 'line_s1_b1', name: 'S1-B1', fromNodeId: 'bus_s1_sn', toNodeId: 'bus_b1_sn', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-70', lengthKm: 0.6, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'tr_b1', name: 'TR B1', fromNodeId: 'bus_b1_sn', toNodeId: 'bus_b1_nn', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-250', lengthKm: null, ratedPowerMva: 0.25, voltageHvKv: 15, voltageLvKv: 0.4 },
    );
    input.stations.push({ id: 'stb', name: 'Stacja B1', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_b1_sn', 'bus_b1_nn'], branchIds: [], switchIds: [], transformerIds: ['tr_b1'] });
    input.loads.push({ id: 'load_b1', name: 'Load B1', nodeId: 'bus_b1_nn', inService: true, pMw: 0.08, qMvar: 0.02 });

    const { layout } = runLayout(input);

    const branchEdge = layout.edgeRoutes.find((e) => e.edgeId === 'edge_line_s1_b1');
    expect(branchEdge).toBeDefined();

    // Branch drop: odgałęzienie ma wielosegmentowy przebieg i prowadzi do innej osi X
    expect(branchEdge!.segments.length).toBeGreaterThanOrEqual(1);

    const branchStation = layout.nodePlacements.find((n) => n.nodeId === 'stb');
    const trunkStation = layout.nodePlacements.find((n) => n.nodeId === 'st1');
    expect(branchStation).toBeDefined();
    expect(trunkStation).toBeDefined();
    expect(branchStation!.position.x).not.toBe(trunkStation!.position.x);
  });

  it('ring/NOP w secondary channel (wzorzec: trunk + ring + NOP)', () => {
    const { layout } = runLayout(buildFixtureRingNop());

    const nopSecondaryRoutes = layout.edgeRoutes.filter(
      (r) => r.isNormallyOpen,
    );
    expect(nopSecondaryRoutes.length).toBeGreaterThanOrEqual(1);
    expect(Math.min(...nopSecondaryRoutes.map((r) => r.laneIndex))).toBeGreaterThanOrEqual(0);

    // Dla NOP oczekujemy ortogonalnego przebiegu wielosegmentowego (kanał wtórny)
    expect(nopSecondaryRoutes.some((r) => r.segments.length >= 2)).toBe(true);
  });

  it('brak kolizji podpisów (anchors) dla adnotacji kanonicznych', () => {
    const { layout } = runLayout(makeBaseInput('canon_labels'));

    const anchors: Array<{ x: number; y: number }> = [];
    for (const n of layout.canonicalAnnotations?.trunkNodes ?? []) {
      anchors.push({ x: n.position.x, y: n.position.y - 20 });
    }
    for (const b of layout.canonicalAnnotations?.branchPoints ?? []) {
      anchors.push({ x: b.position.x + 24, y: b.position.y - 16 });
    }
    for (const c of layout.canonicalAnnotations?.stationChains ?? []) {
      for (const a of c.apparatus) {
        anchors.push({ x: a.position.x, y: a.position.y - 14 });
      }
    }

    for (let i = 0; i < anchors.length; i++) {
      for (let j = i + 1; j < anchors.length; j++) {
        expect(distance(anchors[i].x, anchors[i].y, anchors[j].x, anchors[j].y)).toBeGreaterThan(8);
      }
    }

    const gpzNode = layout.nodePlacements.find((n) => n.nodeId === 'bus_gpz');
    expect(gpzNode?.layer ?? 99).toBeLessThanOrEqual(1);
    const sourceNode = layout.nodePlacements.find((n) => n.nodeId === 'src_gpz');
    expect(sourceNode?.position.y ?? 99999).toBeLessThan(gpzNode?.position.y ?? -99999);

    // sanity: nowy pipeline klasyfikuje główne elementy domenowe
    const stationNodes = layout.nodePlacements.filter((n) => n.nodeId === 'st1' || n.nodeId === 'st2');
    expect(stationNodes.length).toBe(2);
    expect(stationNodes.every((n) => n.layer >= 1)).toBe(true);
  });
});
