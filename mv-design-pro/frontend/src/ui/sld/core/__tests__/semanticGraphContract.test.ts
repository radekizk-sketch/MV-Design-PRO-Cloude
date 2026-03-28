import { describe, expect, it } from 'vitest';

import {
  EdgeTypeV1,
  NodeTypeV1,
  buildSldSemanticGraphFromVisualGraph,
  type VisualGraphV1,
} from '../index';

function legacyGraph(): VisualGraphV1 {
  return {
    version: 'V1',
    nodes: [
      {
        id: 'stationA',
        nodeType: NodeTypeV1.STATION_SN_NN_A,
        ports: [{ id: 'in', role: 'IN', relativeX: 0.5, relativeY: 0 }],
        attributes: {
          label: 'ST A',
          voltageKv: 15,
          inService: true,
          elementId: 'stationA',
          elementType: 'STATION',
          elementName: 'ST A',
          switchState: null,
          branchType: null,
          ratedPowerMva: null,
          width: null,
          height: null,
          fromNodeId: 'x',
          toNodeId: 'y',
          connectedToNodeId: 'z',
        },
      },
      {
        id: 'pv1',
        nodeType: NodeTypeV1.GENERATOR_PV,
        ports: [{ id: 'out', role: 'OUT', relativeX: 0.5, relativeY: 1 }],
        attributes: {
          label: 'PV',
          voltageKv: 0.4,
          inService: true,
          elementId: 'pv1',
          elementType: 'GENERATOR',
          elementName: 'PV',
          switchState: null,
          branchType: null,
          ratedPowerMva: 1,
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
        fromPortRef: { nodeId: 'stationA', portId: 'in' },
        toPortRef: { nodeId: 'pv1', portId: 'out' },
        edgeType: EdgeTypeV1.BRANCH,
        isNormallyOpen: false,
        attributes: { label: 'e1', lengthKm: 0.2, branchType: 'CABLE', inService: true },
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

describe('SldSemanticGraphV1 contract', () => {
  it('maps station kind to stationKind attribute and normalized node type', () => {
    const semantic = buildSldSemanticGraphFromVisualGraph(legacyGraph());
    const station = semantic.nodes.find((n) => n.id === 'stationA');
    expect(station?.nodeType).toBe('STATION_SN_NN');
    expect(station?.attributes.stationKind).toBe('A');
  });

  it('maps generator to GENERATOR + generatorKind', () => {
    const semantic = buildSldSemanticGraphFromVisualGraph(legacyGraph());
    const pv = semantic.nodes.find((n) => n.id === 'pv1');
    expect(pv?.nodeType).toBe('GENERATOR');
    expect(pv?.attributes.generatorKind).toBe('PV');
  });

  it('semantic ports do not expose geometry', () => {
    const semantic = buildSldSemanticGraphFromVisualGraph(legacyGraph());
    expect(Object.keys(semantic.nodes[0].ports[0]).sort()).toEqual(['id', 'role']);
  });

  it('semantic attributes do not include topology leak fields', () => {
    const semantic = buildSldSemanticGraphFromVisualGraph(legacyGraph());
    const attrs = semantic.nodes[0].attributes as Record<string, unknown>;
    expect(attrs.fromNodeId).toBeUndefined();
    expect(attrs.toNodeId).toBeUndefined();
    expect(attrs.connectedToNodeId).toBeUndefined();
  });

  it('is deterministic across 100 runs', () => {
    const fingerprints = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const semantic = buildSldSemanticGraphFromVisualGraph(legacyGraph());
      fingerprints.add(JSON.stringify(semantic));
    }
    expect(fingerprints.size).toBe(1);
  });
});
