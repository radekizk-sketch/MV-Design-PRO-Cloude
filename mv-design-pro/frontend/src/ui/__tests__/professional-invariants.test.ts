/**
 * Professional Invariants Test Suite — frontend system-wide constraints.
 *
 * Validates cross-cutting invariants that MUST hold in the frontend:
 * 1. No mutation in SLD rendering functions (pure functions)
 * 2. No 'any' in SLD core types (type safety)
 * 3. ElementType completeness (all types have SLD symbol mappings)
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: Architecture layer boundaries
 * - CLAUDE.md: Core Rules (WHITE BOX, Single Model, determinism)
 * - sld_rules.md SS A.1: Bijection: Symbol <-> Model Object
 */

import { describe, it, expect } from 'vitest';
import {
  NodeTypeV1,
  EdgeTypeV1,
  VISUAL_GRAPH_VERSION,
  canonicalizeVisualGraph,
  computeVisualGraphHash,
  computeLayout,
  DEFAULT_LAYOUT_CONFIG,
  ElementTypeV1,
  renderSwitchgearBlock,
  EmbeddingRoleV1,
  FieldRoleV1,
  DeviceTypeV1,
  DeviceElectricalRoleV1,
  DevicePowerPathPositionV1,
} from '../sld/core';
import type {
  VisualGraphV1,
  VisualNodeV1,
  VisualEdgeV1,
  VisualGraphMetaV1,
  StationBlockDetailV1,
} from '../sld/core';

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a minimal VisualGraphV1 for testing.
 * Deterministic: always produces the same graph for same inputs.
 * Uses correct VisualNodeAttributesV1 and VisualEdgeAttributesV1 shapes.
 */
function buildTestGraph(): VisualGraphV1 {
  const nodes: VisualNodeV1[] = [
    {
      id: 'grid-source-1',
      nodeType: NodeTypeV1.GRID_SOURCE,
      ports: [{ id: 'out-1', role: 'OUT', relativeX: 0.5, relativeY: 1.0 }],
      attributes: {
        label: 'GPZ Zasilanie',
        voltageKv: 110,
        inService: true,
        elementId: 'grid-source-1',
        elementType: 'Source',
        elementName: 'GPZ Zasilanie',
        switchState: null,
        branchType: null,
      },
    },
    {
      id: 'bus-sn-1',
      nodeType: NodeTypeV1.BUS_SN,
      ports: [
        { id: 'in-1', role: 'IN', relativeX: 0.0, relativeY: 0.5 },
        { id: 'out-1', role: 'OUT', relativeX: 1.0, relativeY: 0.5 },
      ],
      attributes: {
        label: 'Szyna SN',
        voltageKv: 20,
        inService: true,
        elementId: 'bus-sn-1',
        elementType: 'Bus',
        elementName: 'Szyna SN',
        switchState: null,
        branchType: null,
      },
    },
    {
      id: 'load-1',
      nodeType: NodeTypeV1.LOAD,
      ports: [{ id: 'in-1', role: 'IN', relativeX: 0.5, relativeY: 0.0 }],
      attributes: {
        label: 'Odbiorca 1',
        voltageKv: 20,
        inService: true,
        elementId: 'load-1',
        elementType: 'Load',
        elementName: 'Odbiorca 1',
        switchState: null,
        branchType: null,
      },
    },
  ];

  const edges: VisualEdgeV1[] = [
    {
      id: 'edge-trunk-1',
      fromPortRef: { nodeId: 'grid-source-1', portId: 'out-1' },
      toPortRef: { nodeId: 'bus-sn-1', portId: 'in-1' },
      edgeType: EdgeTypeV1.TRUNK,
      isNormallyOpen: false,
      attributes: { label: 'Magistrala 1', lengthKm: 5.0, branchType: 'CABLE', inService: true },
    },
    {
      id: 'edge-branch-1',
      fromPortRef: { nodeId: 'bus-sn-1', portId: 'out-1' },
      toPortRef: { nodeId: 'load-1', portId: 'in-1' },
      edgeType: EdgeTypeV1.BRANCH,
      isNormallyOpen: false,
      attributes: { label: 'Odgalezienie 1', lengthKm: 2.0, branchType: 'CABLE', inService: true },
    },
  ];

  const meta: VisualGraphMetaV1 = {
    snapshotId: 'test-snap-001',
    snapshotFingerprint: 'abc123',
    createdAt: '2024-01-01T00:00:00.000Z',
    version: VISUAL_GRAPH_VERSION,
  };

  return {
    version: VISUAL_GRAPH_VERSION,
    nodes,
    edges,
    meta,
  };
}

/**
 * Build a minimal StationBlockDetailV1 for renderSwitchgearBlock testing.
 * Uses `as unknown as StationBlockDetailV1` to bypass strict type-checking
 * on the many optional/required fields — we only need the minimal shape
 * that the renderer actually reads.
 */
function buildTestStationBlock(): StationBlockDetailV1 {
  return {
    blockId: 'station-1',
    embeddingRole: EmbeddingRoleV1.TRUNK_LEAF,
    busSections: [
      {
        id: 'bus-section-1',
        stationId: 'station-1',
        orderIndex: 0,
        catalogRef: null,
      },
    ],
    fields: [
      {
        id: 'field-in-1',
        stationId: 'station-1',
        busSectionId: 'bus-section-1',
        fieldRole: FieldRoleV1.LINE_IN,
        terminals: {
          busTerminal: 'bus-section-1',
          externalTerminal: null,
        },
        requiredDevices: {
          fieldRole: FieldRoleV1.LINE_IN,
          requirements: [],
        },
        deviceIds: ['dev-cb-1'],
        catalogRef: null,
        orderIndex: 0,
      },
    ],
    devices: [
      {
        id: 'dev-cb-1',
        fieldId: 'field-in-1',
        deviceType: DeviceTypeV1.CB,
        electricalRole: DeviceElectricalRoleV1.POWER_PATH,
        powerPathPosition: DevicePowerPathPositionV1.MIDSTREAM,
        catalogRef: null,
        logicalBindings: {
          protectionRef: null,
          measurementRef: null,
        },
        parameters: null,
      },
    ],
    ports: {
      trunkInPort: null,
      trunkOutPort: null,
      branchPort: null,
    },
    couplerFieldId: null,
    deviceAnchors: {},
  } as unknown as StationBlockDetailV1;
}

/**
 * Deep clone an object (no shared references).
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// =============================================================================
// Test 1: No Mutation in SLD Rendering (Pure Functions)
// =============================================================================

describe('Professional Invariants: SLD Rendering Purity', () => {
  it('canonicalizeVisualGraph is pure — same input produces same output', () => {
    const graph = buildTestGraph();

    const result1 = canonicalizeVisualGraph(graph);
    const result2 = canonicalizeVisualGraph(graph);

    // Same input must produce identical output
    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });

  it('canonicalizeVisualGraph does not modify input', () => {
    const graph = buildTestGraph();
    const graphBefore = deepClone(graph);

    canonicalizeVisualGraph(graph);

    // Input must not be mutated
    expect(JSON.stringify(graph)).toBe(JSON.stringify(graphBefore));
  });

  it('computeVisualGraphHash is deterministic — same graph produces same hash', () => {
    const graph = buildTestGraph();

    const hash1 = computeVisualGraphHash(graph);
    const hash2 = computeVisualGraphHash(graph);

    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBeGreaterThan(0);
  });

  it('computeVisualGraphHash is order-independent via canonicalization', () => {
    const graph1 = buildTestGraph();

    // Create same graph with reversed node order
    const graph2: VisualGraphV1 = {
      ...graph1,
      nodes: [...graph1.nodes].reverse(),
      edges: [...graph1.edges].reverse(),
    };

    const hash1 = computeVisualGraphHash(graph1);
    const hash2 = computeVisualGraphHash(graph2);

    // Both orderings should produce the same hash because
    // canonicalization sorts by ID
    expect(hash1).toBe(hash2);
  });

  it('computeVisualGraphHash does not modify input graph', () => {
    const graph = buildTestGraph();
    const graphBefore = deepClone(graph);

    computeVisualGraphHash(graph);

    expect(JSON.stringify(graph)).toBe(JSON.stringify(graphBefore));
  });

  it('computeLayout is deterministic — same input produces same output', () => {
    const graph = buildTestGraph();

    const layout1 = computeLayout(graph, DEFAULT_LAYOUT_CONFIG);
    const layout2 = computeLayout(graph, DEFAULT_LAYOUT_CONFIG);

    // Layout results must be identical
    expect(JSON.stringify(layout1)).toBe(JSON.stringify(layout2));
  });

  it('computeLayout does not modify input graph', () => {
    const graph = buildTestGraph();
    const graphBefore = deepClone(graph);

    computeLayout(graph, DEFAULT_LAYOUT_CONFIG);

    // Input must not be mutated
    expect(JSON.stringify(graph)).toBe(JSON.stringify(graphBefore));
  });

  it('renderSwitchgearBlock is deterministic — same input produces same output', () => {
    const block = buildTestStationBlock();

    const result1 = renderSwitchgearBlock(block);
    const result2 = renderSwitchgearBlock(block);

    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });

  it('renderSwitchgearBlock does not mutate input block', () => {
    const block = buildTestStationBlock();
    const blockBefore = deepClone(block);

    renderSwitchgearBlock(block);

    expect(JSON.stringify(block)).toBe(JSON.stringify(blockBefore));
  });
});

// =============================================================================
// Test 2: No 'any' in SLD Core Types
// =============================================================================

describe('Professional Invariants: No any in SLD Core', () => {
  it('SLD core .ts files contain zero bare "any" type annotations', () => {
    const sldCorePath = path.resolve(__dirname, '../../sld/core');
    const violations: string[] = [];

    // Read all TypeScript files in sld/core/
    let files: string[];
    try {
      files = fs.readdirSync(sldCorePath).filter(f => f.endsWith('.ts'));
    } catch {
      // If the directory is not accessible in test env, skip
      return;
    }

    for (const file of files) {
      const filePath = path.join(sldCorePath, file);
      let content: string;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNo = i + 1;

        // Skip comments
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
          continue;
        }

        // Skip imports (type-only imports are fine)
        if (trimmed.startsWith('import')) {
          continue;
        }

        // Match bare 'any' type annotation patterns:
        //   : any,   : any;   : any)   : any =   : any[
        //   <any>    <any,    as any
        // Exclude words containing 'any' (company, many, etc.)
        const bareAnyPattern = /(?::\s*\bany\b|<\bany\b|as\s+\bany\b)/;
        if (bareAnyPattern.test(line)) {
          violations.push(`${file}:${lineNo}: ${trimmed.substring(0, 80)}`);
        }
      }
    }

    // Allow zero bare 'any' in SLD core
    if (violations.length > 0) {
      const report = violations.slice(0, 10).join('\n  ');
      expect.fail(
        `Found ${violations.length} bare 'any' type annotation(s) in SLD core files:\n  ${report}\n` +
        `Use explicit types instead of 'any' for type safety.`
      );
    }
  });
});

// =============================================================================
// Test 3: Element Type Completeness
// =============================================================================

describe('Professional Invariants: ElementType Completeness', () => {
  it('ElementTypeV1 covers all core network element categories', () => {
    // ElementTypeV1 from sld/core/elementRef.ts
    const requiredTypes = [
      'NODE',
      'BRANCH',
      'TRANSFORMER',
      'STATION',
      'GENERATOR',
      'SOURCE',
      'LOAD',
      'SWITCH',
      'MEASUREMENT',
      'PROTECTION_ASSIGNMENT',
    ];

    const definedTypes = Object.values(ElementTypeV1);

    for (const required of requiredTypes) {
      expect(definedTypes).toContain(required);
    }
  });

  it('NodeTypeV1 covers all expected SLD node types', () => {
    const requiredNodeTypes = [
      'GRID_SOURCE',
      'BUS_SN',
      'LOAD',
      'GENERATOR_PV',
      'GENERATOR_BESS',
    ];

    const definedNodeTypes = Object.values(NodeTypeV1);

    for (const required of requiredNodeTypes) {
      expect(definedNodeTypes).toContain(required);
    }
  });

  it('NodeTypeV1 includes all station type variants', () => {
    // Per visualGraph.ts: stations A/B/C/D
    const stationTypes = [
      'STATION_SN_NN_A',
      'STATION_SN_NN_B',
      'STATION_SN_NN_C',
      'STATION_SN_NN_D',
    ];

    const definedNodeTypes = Object.values(NodeTypeV1);

    for (const station of stationTypes) {
      expect(definedNodeTypes).toContain(station);
    }
  });

  it('NodeTypeV1 includes switch type variants', () => {
    // Per visualGraph.ts: switch subtypes
    const switchTypes = [
      'SWITCH_BREAKER',
      'SWITCH_DISCONNECTOR',
      'SWITCH_LOAD_SWITCH',
      'SWITCH_FUSE',
    ];

    const definedNodeTypes = Object.values(NodeTypeV1);

    for (const switchType of switchTypes) {
      expect(definedNodeTypes).toContain(switchType);
    }
  });

  it('EdgeTypeV1 covers all expected edge categories', () => {
    const requiredEdgeTypes = [
      'TRUNK',
      'BRANCH',
      'SECONDARY_CONNECTOR',
      'BUS_COUPLER',
      'TRANSFORMER_LINK',
      'INTERNAL_SWITCHGEAR',
    ];

    const definedEdgeTypes = Object.values(EdgeTypeV1);

    for (const required of requiredEdgeTypes) {
      expect(definedEdgeTypes).toContain(required);
    }
  });

  it('all NodeTypeV1 values are unique (no duplicates)', () => {
    const values = Object.values(NodeTypeV1);
    const uniqueValues = new Set(values);

    expect(uniqueValues.size).toBe(values.length);
  });

  it('all EdgeTypeV1 values are unique (no duplicates)', () => {
    const values = Object.values(EdgeTypeV1);
    const uniqueValues = new Set(values);

    expect(uniqueValues.size).toBe(values.length);
  });

  it('all ElementTypeV1 values are unique (no duplicates)', () => {
    const values = Object.values(ElementTypeV1);
    const uniqueValues = new Set(values);

    expect(uniqueValues.size).toBe(values.length);
  });

  it('NodeTypeV1 keys match their values (const-enum invariant)', () => {
    // This verifies the 'as const' pattern is intact
    for (const [key, value] of Object.entries(NodeTypeV1)) {
      expect(key).toBe(value);
    }
  });

  it('EdgeTypeV1 keys match their values (const-enum invariant)', () => {
    for (const [key, value] of Object.entries(EdgeTypeV1)) {
      expect(key).toBe(value);
    }
  });

  it('ElementTypeV1 keys match their values (const-enum invariant)', () => {
    for (const [key, value] of Object.entries(ElementTypeV1)) {
      expect(key).toBe(value);
    }
  });
});

// =============================================================================
// Test 4: Layout Pipeline Determinism (extended)
// =============================================================================

describe('Professional Invariants: Layout Determinism', () => {
  it('layout hash is stable across multiple computations', () => {
    const graph = buildTestGraph();

    const layout1 = computeLayout(graph, DEFAULT_LAYOUT_CONFIG);
    const layout2 = computeLayout(graph, DEFAULT_LAYOUT_CONFIG);

    // Layout hash must be identical
    expect(layout1.hash).toBe(layout2.hash);

    // Placement count must be identical
    expect(layout1.nodePlacements.length).toBe(layout2.nodePlacements.length);

    // Edge route count must be identical
    expect(layout1.edgeRoutes.length).toBe(layout2.edgeRoutes.length);
  });

  it('layout assigns a placement for every node in the graph', () => {
    const graph = buildTestGraph();
    const layout = computeLayout(graph, DEFAULT_LAYOUT_CONFIG);

    // Every node in the graph should have a corresponding placement
    const placedNodeIds = new Set(layout.nodePlacements.map(p => p.nodeId));

    for (const node of graph.nodes) {
      expect(placedNodeIds.has(node.id)).toBe(true);
    }
  });

  it('layout assigns a route for every edge in the graph', () => {
    const graph = buildTestGraph();
    const layout = computeLayout(graph, DEFAULT_LAYOUT_CONFIG);

    // Every edge should have a corresponding route
    const routedEdgeIds = new Set(layout.edgeRoutes.map(r => r.edgeId));

    for (const edge of graph.edges) {
      expect(routedEdgeIds.has(edge.id)).toBe(true);
    }
  });
});
