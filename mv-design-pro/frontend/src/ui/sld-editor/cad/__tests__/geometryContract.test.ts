import { describe, expect, it } from 'vitest';
import type { CadOverridesDocument, SldGeometry } from '../geometryContract';
import {
  applyGeometryMode,
  evaluateCadOverridesStatus,
  serializeCadOverridesDocument,
} from '../geometryContract';

const createDoc = (overrides: Partial<CadOverridesDocument> = {}): CadOverridesDocument => ({
  schemaVersion: 1,
  mode: 'CAD',
  baseFingerprint: 'fingerprint-1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  nodes: {
    nodeB: { pos: { x: 20, y: 30 } },
    nodeA: { pos: { x: 10, y: 15 } },
  },
  edges: {
    edgeB: { bends: [{ x: 5, y: 6 }] },
    edgeA: { bends: [{ x: 1, y: 2 }] },
  },
  labels: {
    labelB: { anchor: { x: 3, y: 4 } },
    labelA: { offset: { dx: 1, dy: 2 } },
  },
  ...overrides,
});

describe('geometryContract', () => {
  it('serializes overrides deterministycznie', () => {
    const doc1 = createDoc();
    const doc2 = createDoc({
      nodes: {
        nodeA: { pos: { x: 10, y: 15 } },
        nodeB: { pos: { x: 20, y: 30 } },
      },
      edges: {
        edgeA: { bends: [{ x: 1, y: 2 }] },
        edgeB: { bends: [{ x: 5, y: 6 }] },
      },
      labels: {
        labelA: { offset: { dx: 1, dy: 2 } },
        labelB: { anchor: { x: 3, y: 4 } },
      },
    });

    const serialized1 = serializeCadOverridesDocument(doc1);
    const serialized2 = serializeCadOverridesDocument(doc2);

    expect(serialized1).toBe(serialized2);
  });

  it('ocenia status VALID i STALE bez konfliktow', () => {
    const doc = createDoc();
    const ids = {
      nodes: ['nodeA', 'nodeB'],
      edges: ['edgeA', 'edgeB'],
      labels: ['labelA', 'labelB'],
    };

    const valid = evaluateCadOverridesStatus('fingerprint-1', doc.baseFingerprint, doc, ids);
    expect(valid.status).toBe('VALID');
    expect(valid.issues).toHaveLength(0);

    const stale = evaluateCadOverridesStatus('fingerprint-2', doc.baseFingerprint, doc, ids);
    expect(stale.status).toBe('STALE');
    expect(stale.issues).toHaveLength(0);
  });

  it('ocenia status CONFLICT dla brakujacych ID lub NaN', () => {
    const doc = createDoc({
      nodes: {
        nodeA: { pos: { x: Number.NaN, y: 0 } },
      },
      edges: {},
      labels: {},
    });

    const ids = {
      nodes: ['nodeB'],
      edges: ['edgeA'],
      labels: ['labelA'],
    };

    const report = evaluateCadOverridesStatus('fingerprint-1', doc.baseFingerprint, doc, ids);
    expect(report.status).toBe('CONFLICT');
    expect(report.issues.length).toBeGreaterThan(0);
  });

  it('aplikuje tryb AUTO bez zmian', () => {
    const autoGeometry: SldGeometry = {
      nodes: {
        node1: { pos: { x: 1, y: 2 } },
      },
      edges: {
        edge1: { bends: [{ x: 3, y: 4 }] },
      },
    };

    const effective = applyGeometryMode(autoGeometry, {
      ...createDoc({ nodes: {}, edges: {}, labels: undefined }),
      mode: 'AUTO',
    });

    expect(effective).toEqual(autoGeometry);
  });

  it('aplikuje tryb CAD z nadpisaniami i fallback do AUTO', () => {
    const autoGeometry: SldGeometry = {
      nodes: {
        node1: { pos: { x: 1, y: 2 } },
        node2: { pos: { x: 10, y: 20 } },
      },
      edges: {
        edge1: { bends: [{ x: 3, y: 4 }] },
      },
    };

    const doc = createDoc({
      mode: 'CAD',
      nodes: {
        node1: { pos: { x: 100, y: 200 } },
      },
      edges: {
        edge1: { bends: [{ x: 30, y: 40 }] },
      },
      labels: undefined,
    });

    const effective = applyGeometryMode(autoGeometry, doc);

    expect(effective.nodes.node1.pos).toEqual({ x: 100, y: 200 });
    expect(effective.nodes.node2.pos).toEqual({ x: 10, y: 20 });
    expect(effective.edges.edge1.bends).toEqual([{ x: 30, y: 40 }]);
  });

  it('aplikuje tryb HYBRID tak samo jak CAD', () => {
    const autoGeometry: SldGeometry = {
      nodes: {
        node1: { pos: { x: 1, y: 2 } },
      },
      edges: {
        edge1: { bends: [{ x: 3, y: 4 }] },
      },
    };

    const doc = createDoc({
      mode: 'HYBRID',
      nodes: {
        node1: { pos: { x: 7, y: 9 } },
      },
      edges: {
        edge1: { bends: [{ x: 8, y: 10 }] },
      },
      labels: undefined,
    });

    const effective = applyGeometryMode(autoGeometry, doc);

    expect(effective.nodes.node1.pos).toEqual({ x: 7, y: 9 });
    expect(effective.edges.edge1.bends).toEqual([{ x: 8, y: 10 }]);
  });
});
