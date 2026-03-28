import { describe, expect, it } from 'vitest';

import {
  EdgeTypeV1,
  NodeTypeV1,
  type VisualGraphV1,
  createLayoutEngine,
  DEFAULT_LAYOUT_CONFIG,
  buildSldSemanticGraphFromVisualGraph,
  buildLayoutInputGraph,
} from '../index';

function makeGraph(): VisualGraphV1 {
  return {
    version: 'V1',
    nodes: [
      {
        id: 'gpz',
        nodeType: NodeTypeV1.GRID_SOURCE,
        ports: [{ id: 'out', role: 'OUT', relativeX: 0.5, relativeY: 1 }],
        attributes: {
          label: 'GPZ',
          voltageKv: 110,
          inService: true,
          elementId: 'gpz',
          elementType: 'SOURCE',
          elementName: 'GPZ',
          switchState: null,
          branchType: null,
          ratedPowerMva: null,
          width: null,
          height: null,
          fromNodeId: null,
          toNodeId: null,
          connectedToNodeId: null,
        },
      },
      {
        id: 'bus',
        nodeType: NodeTypeV1.BUS_SN,
        ports: [
          { id: 'in', role: 'IN', relativeX: 0.5, relativeY: 0 },
          { id: 'out', role: 'OUT', relativeX: 0.5, relativeY: 1 },
        ],
        attributes: {
          label: 'BUS SN',
          voltageKv: 15,
          inService: true,
          elementId: 'bus',
          elementType: 'BUS',
          elementName: 'BUS',
          switchState: null,
          branchType: null,
          ratedPowerMva: null,
          width: 320,
          height: 14,
          fromNodeId: null,
          toNodeId: null,
          connectedToNodeId: null,
        },
      },
      {
        id: 'st1',
        nodeType: NodeTypeV1.STATION_SN_NN_A,
        ports: [{ id: 'in', role: 'IN', relativeX: 0.5, relativeY: 0 }],
        attributes: {
          label: 'ST-1',
          voltageKv: 15,
          inService: true,
          elementId: 'st1',
          elementType: 'STATION',
          elementName: 'ST-1',
          switchState: null,
          branchType: null,
          ratedPowerMva: null,
          width: null,
          height: null,
          fromNodeId: null,
          toNodeId: null,
          connectedToNodeId: null,
        },
      },
      {
        id: 'st2',
        nodeType: NodeTypeV1.STATION_SN_NN_B,
        ports: [{ id: 'in', role: 'IN', relativeX: 0.5, relativeY: 0 }],
        attributes: {
          label: 'ST-2',
          voltageKv: 15,
          inService: true,
          elementId: 'st2',
          elementType: 'STATION',
          elementName: 'ST-2',
          switchState: null,
          branchType: null,
          ratedPowerMva: null,
          width: null,
          height: null,
          fromNodeId: null,
          toNodeId: null,
          connectedToNodeId: null,
        },
      },
    ],
    edges: [
      {
        id: 'e1',
        fromPortRef: { nodeId: 'gpz', portId: 'out' },
        toPortRef: { nodeId: 'bus', portId: 'in' },
        edgeType: EdgeTypeV1.TRUNK,
        isNormallyOpen: false,
        attributes: { label: 'e1', lengthKm: 0.1, branchType: 'LINE', inService: true },
      },
      {
        id: 'e2',
        fromPortRef: { nodeId: 'bus', portId: 'out' },
        toPortRef: { nodeId: 'st1', portId: 'in' },
        edgeType: EdgeTypeV1.BRANCH,
        isNormallyOpen: false,
        attributes: { label: 'e2', lengthKm: 0.8, branchType: 'LINE', inService: true },
      },
      {
        id: 'e3',
        fromPortRef: { nodeId: 'bus', portId: 'out' },
        toPortRef: { nodeId: 'st2', portId: 'in' },
        edgeType: EdgeTypeV1.SECONDARY_CONNECTOR,
        isNormallyOpen: true,
        attributes: { label: 'e3', lengthKm: 1.2, branchType: 'CABLE', inService: true },
      },
    ],
    meta: {
      snapshotId: 's1',
      snapshotFingerprint: 'f1',
      createdAt: '2026-01-01T00:00:00.000Z',
      version: 'V1',
    },
  };
}

describe('LayoutEngine', () => {
  it('delegates to legacy strategy for backward compatibility', () => {
    const graph = makeGraph();
    const layoutInput = buildLayoutInputGraph(buildSldSemanticGraphFromVisualGraph(graph));
    const legacy = {
      version: 'V1',
      nodePlacements: [],
      edgeRoutes: [],
      switchgearBlocks: [],
      catalogRefs: [],
      relayBindings: [],
      validationErrors: [],
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      hash: 'legacy-hash',
      canonicalAnnotations: {
        trunkNodes: [],
        trunkSegments: [],
        branchPoints: [],
        stationChains: [],
        inlineBranchObjects: [],
      },
    } as const;

    const engine = createLayoutEngine(
      { strategy: 'legacy' },
      {
        legacyLayout: () => legacy,
      },
    );
    const out = engine.compute(layoutInput, DEFAULT_LAYOUT_CONFIG);

    expect(out.layout.hash).toBe(legacy.hash);
  });

  it('greedy strategy keeps minimum spacing between stations', () => {
    const graph = makeGraph();
    const layoutInput = buildLayoutInputGraph(buildSldSemanticGraphFromVisualGraph(graph));
    const engine = createLayoutEngine(
      { strategy: 'greedy', minSpacing: 140, routingStyle: 'orthogonal' },
      {
        legacyLayout: () => { throw new Error('legacy callback should not be called'); },
      },
    );

    const out = engine.compute(layoutInput, DEFAULT_LAYOUT_CONFIG);
    const stationPlacements = out.layout.nodePlacements.filter((n) => n.nodeId === 'st1' || n.nodeId === 'st2');
    const dist = Math.abs(stationPlacements[0].position.x - stationPlacements[1].position.x)
      + Math.abs(stationPlacements[0].position.y - stationPlacements[1].position.y);

    expect(dist).toBeGreaterThanOrEqual(140);
  });

  it('force-directed strategy is deterministic for identical input', () => {
    const graph = makeGraph();
    const layoutInput = buildLayoutInputGraph(buildSldSemanticGraphFromVisualGraph(graph));
    const engine = createLayoutEngine(
      { strategy: 'force-directed', minSpacing: 120, maxSpacing: 280 },
      {
        legacyLayout: () => { throw new Error('legacy callback should not be called'); },
      },
    );

    const first = engine.compute(layoutInput, DEFAULT_LAYOUT_CONFIG).layout.hash;
    const second = engine.compute(layoutInput, DEFAULT_LAYOUT_CONFIG).layout.hash;

    expect(first).toBe(second);
  });

  it('orthogonal style generates only axis-aligned segments', () => {
    const graph = makeGraph();
    const layoutInput = buildLayoutInputGraph(buildSldSemanticGraphFromVisualGraph(graph));
    const engine = createLayoutEngine(
      { strategy: 'greedy', routingStyle: 'orthogonal' },
      {
        legacyLayout: () => { throw new Error('legacy callback should not be called'); },
      },
    );

    const out = engine.compute(layoutInput, DEFAULT_LAYOUT_CONFIG);
    const allOrthogonal = out.layout.edgeRoutes.every((route) =>
      route.segments.every((seg) => seg.from.x === seg.to.x || seg.from.y === seg.to.y),
    );
    expect(allOrthogonal).toBe(true);
  });

  it('diagonal style allows non-orthogonal edges', () => {
    const graph = makeGraph();
    const layoutInput = buildLayoutInputGraph(buildSldSemanticGraphFromVisualGraph(graph));
    const engine = createLayoutEngine(
      { strategy: 'greedy', routingStyle: 'diagonal' },
      {
        legacyLayout: () => { throw new Error('legacy callback should not be called'); },
      },
    );

    const out = engine.compute(layoutInput, DEFAULT_LAYOUT_CONFIG);
    const hasDiagonal = out.layout.edgeRoutes.some((route) =>
      route.segments.some((seg) => seg.from.x !== seg.to.x && seg.from.y !== seg.to.y),
    );

    expect(hasDiagonal).toBe(true);
  });
});
