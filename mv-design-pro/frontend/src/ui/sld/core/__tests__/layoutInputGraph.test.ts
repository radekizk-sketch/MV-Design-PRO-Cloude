import { describe, expect, it } from 'vitest';

import {
  EdgeTypeV1,
  NodeTypeV1,
  type VisualGraphV1,
  buildSldSemanticGraphFromVisualGraph,
  buildLayoutInputGraph,
} from '../index';

function sourceGraph(): VisualGraphV1 {
  return {
    version: 'V1',
    nodes: [
      {
        id: 'gpz',
        nodeType: NodeTypeV1.GRID_SOURCE,
        ports: [{ id: 'bottom', role: 'OUT', relativeX: 0.5, relativeY: 1 }],
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
        id: 'stB',
        nodeType: NodeTypeV1.STATION_SN_NN_B,
        ports: [{ id: 'in', role: 'IN', relativeX: 0.5, relativeY: 0 }],
        attributes: {
          label: 'ST B',
          voltageKv: 15,
          inService: true,
          elementId: 'stB',
          elementType: 'STATION',
          elementName: 'ST B',
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
        id: 'tr1',
        fromPortRef: { nodeId: 'gpz', portId: 'bottom' },
        toPortRef: { nodeId: 'stB', portId: 'in' },
        edgeType: EdgeTypeV1.TRUNK,
        isNormallyOpen: false,
        attributes: { label: 'tr1', lengthKm: 1, branchType: 'LINE', inService: true },
      },
    ],
    meta: { snapshotId: 's1', snapshotFingerprint: 'f1', createdAt: '2026-01-01T00:00:00.000Z', version: 'V1' },
  };
}

describe('LayoutInputGraphV1 transform', () => {
  it('applies symbol/port geometry profiles only at layout-input layer', () => {
    const semantic = buildSldSemanticGraphFromVisualGraph(sourceGraph());
    const layoutInput = buildLayoutInputGraph(semantic);

    expect(layoutInput.nodes[0].symbolProfile.portGeometry.length).toBeGreaterThan(0);
    expect(Object.keys(semantic.nodes[0].ports[0]).sort()).toEqual(['id', 'role']);
  });

  it('is deterministic across 100 runs', () => {
    const semantic = buildSldSemanticGraphFromVisualGraph(sourceGraph());
    const hashes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      hashes.add(JSON.stringify(buildLayoutInputGraph(semantic)));
    }
    expect(hashes.size).toBe(1);
  });
});
