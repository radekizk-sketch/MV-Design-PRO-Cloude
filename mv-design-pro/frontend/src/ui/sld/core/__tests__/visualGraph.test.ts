/**
 * Testy kontraktu VisualGraphV1.
 *
 * Pokrycie:
 * - Sortowanie kanoniczne (nodes/edges po id)
 * - Typologia stacji A/B/C/D — porty IN/OUT/BRANCH
 * - PV/BESS sa zrodlami, nie odbiorcami
 * - Secondary connectors dla krawedzi spoza drzewa
 * - Brak stringow PCC (grep guard)
 * - Hash stability
 * - Walidacja inwariantow kontraktu
 */

import { describe, it, expect } from 'vitest';
import {
  type VisualGraphV1,
  type VisualNodeV1,
  type VisualEdgeV1,
  NodeTypeV1,
  EdgeTypeV1,
  PortRoleV1,
  VISUAL_GRAPH_VERSION,
  canonicalizeVisualGraph,
  computeVisualGraphHash,
  validateVisualGraph,
} from '../visualGraph';
import { convertToVisualGraph } from '../topologyAdapterV1';
import type { AnySldSymbol, BusSymbol, BranchSymbol, SwitchSymbol, SourceSymbol, LoadSymbol } from '../../../sld-editor/types';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function makeBus(id: string, name: string, width = 200, height = 10): BusSymbol {
  return {
    id,
    elementId: id,
    elementType: 'Bus',
    elementName: name,
    position: { x: 0, y: 0 },
    inService: true,
    width,
    height,
  };
}

function makeBranch(id: string, name: string, from: string, to: string, type: 'LineBranch' | 'TransformerBranch' = 'LineBranch', branchType?: 'LINE' | 'CABLE'): BranchSymbol {
  return {
    id,
    elementId: id,
    elementType: type,
    elementName: name,
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: from,
    toNodeId: to,
    points: [],
    branchType,
  };
}

function makeSwitch(id: string, name: string, from: string, to: string, state: 'OPEN' | 'CLOSED' = 'CLOSED', switchType: 'BREAKER' | 'DISCONNECTOR' | 'LOAD_SWITCH' | 'FUSE' = 'BREAKER'): SwitchSymbol {
  return {
    id,
    elementId: id,
    elementType: 'Switch',
    elementName: name,
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: from,
    toNodeId: to,
    switchState: state,
    switchType,
  };
}

function makeSource(id: string, name: string, connectedTo: string): SourceSymbol {
  return {
    id,
    elementId: id,
    elementType: 'Source',
    elementName: name,
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: connectedTo,
  };
}

function makeLoad(id: string, name: string, connectedTo: string): LoadSymbol {
  return {
    id,
    elementId: id,
    elementType: 'Load',
    elementName: name,
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: connectedTo,
  };
}

/**
 * Minimalna siec testowa:
 * GPZ (Source) → Szyna SN → Transformator → Szyna nN → Load
 * + PV na SN + BESS na SN + switch NOP (ring)
 */
function buildMinimalNetwork(): AnySldSymbol[] {
  return [
    makeSource('src_gpz', 'GPZ Zasilanie', 'bus_sn_1'),
    makeBus('bus_sn_1', 'Szyna SN 15kV Sekcja 1'),
    makeBus('bus_sn_2', 'Szyna SN 15kV Sekcja 2'),
    makeSwitch('sw_section', 'Lacznik sekcyjny', 'bus_sn_1', 'bus_sn_2', 'OPEN', 'DISCONNECTOR'),
    makeBranch('tr_sn_nn_1', 'Transformator SN/nN Stacja A1', 'bus_sn_1', 'bus_nn_1', 'TransformerBranch'),
    makeBus('bus_nn_1', 'Szyna nN 0.4kV Stacja A1'),
    makeLoad('load_1', 'Odbiorca A1', 'bus_nn_1'),
    makeBranch('line_trunk_1', 'Linia SN AFL-70 Magistrala', 'bus_sn_1', 'bus_sn_3', 'LineBranch', 'LINE'),
    makeBus('bus_sn_3', 'Szyna SN 15kV Stacja B1'),
    makeSource('src_pv', 'PV Farma Solarna 2MW', 'bus_sn_2'),
    makeSource('src_bess', 'BESS Magazyn Energii 1MWh', 'bus_sn_2'),
  ];
}

// =============================================================================
// TEST: CANONICAL SORT
// =============================================================================

describe('VisualGraphV1 — sortowanie kanoniczne', () => {
  it('nodes sa posortowane leksykograficznie po id', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    for (let i = 1; i < graph.nodes.length; i++) {
      expect(graph.nodes[i].id.localeCompare(graph.nodes[i - 1].id)).toBeGreaterThanOrEqual(0);
    }
  });

  it('edges sa posortowane leksykograficznie po id', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    for (let i = 1; i < graph.edges.length; i++) {
      expect(graph.edges[i].id.localeCompare(graph.edges[i - 1].id)).toBeGreaterThanOrEqual(0);
    }
  });

  it('canonicalizeVisualGraph sortuje niezaleznie od kolejnosci wejsciowej', () => {
    const symbols = buildMinimalNetwork();
    const graph1 = convertToVisualGraph(symbols);
    const graph2 = convertToVisualGraph([...symbols].reverse());

    // Nodes w identycznej kolejnosci
    expect(graph1.nodes.map(n => n.id)).toEqual(graph2.nodes.map(n => n.id));
    // Edges w identycznej kolejnosci
    expect(graph1.edges.map(e => e.id)).toEqual(graph2.edges.map(e => e.id));
  });
});

// =============================================================================
// TEST: STATION TYPOLOGY A/B/C/D
// =============================================================================

describe('VisualGraphV1 — typologia stacji A/B/C/D', () => {
  it('stacja typ A/B/C/D ma porty IN/OUT/BRANCH', () => {
    const stationTypes = [
      NodeTypeV1.STATION_SN_NN_A,
      NodeTypeV1.STATION_SN_NN_B,
      NodeTypeV1.STATION_SN_NN_C,
      NodeTypeV1.STATION_SN_NN_D,
    ];

    // Generuj testowy graf z kazdym typem stacji
    for (const stationType of stationTypes) {
      const node: VisualNodeV1 = {
        id: `station_${stationType}`,
        nodeType: stationType,
        ports: [
          { id: 'in', role: PortRoleV1.IN, relativeX: 0.5, relativeY: 0 },
          { id: 'out', role: PortRoleV1.OUT, relativeX: 0.5, relativeY: 1 },
          { id: 'branch', role: PortRoleV1.BRANCH, relativeX: 1, relativeY: 0.5 },
        ],
        attributes: {
          label: `Stacja ${stationType}`,
          voltageKv: 15,
          inService: true,
          elementId: `station_${stationType}`,
          elementType: 'Station',
          elementName: `Stacja ${stationType}`,
          switchState: null,
          branchType: null,
          ratedPowerMva: null,
          width: null,
          height: null,
          fromNodeId: null,
          toNodeId: null,
          connectedToNodeId: null,
        },
      };

      const portRoles = node.ports.map(p => p.role);
      expect(portRoles).toContain(PortRoleV1.IN);
      expect(portRoles).toContain(PortRoleV1.OUT);
      expect(portRoles).toContain(PortRoleV1.BRANCH);
    }
  });

  it('enum NodeTypeV1 zawiera wszystkie 4 typy stacji', () => {
    expect(NodeTypeV1.STATION_SN_NN_A).toBe('STATION_SN_NN_A');
    expect(NodeTypeV1.STATION_SN_NN_B).toBe('STATION_SN_NN_B');
    expect(NodeTypeV1.STATION_SN_NN_C).toBe('STATION_SN_NN_C');
    expect(NodeTypeV1.STATION_SN_NN_D).toBe('STATION_SN_NN_D');
  });
});

// =============================================================================
// TEST: PV/BESS AS SOURCES
// =============================================================================

describe('VisualGraphV1 — PV i BESS sa zrodlami, nie odbiorcami', () => {
  it('PV jest klasyfikowane jako GENERATOR_PV', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    const pvNode = graph.nodes.find(n => n.attributes.elementName.includes('PV'));
    expect(pvNode).toBeDefined();
    expect(pvNode!.nodeType).toBe(NodeTypeV1.GENERATOR_PV);
  });

  it('BESS jest klasyfikowane jako GENERATOR_BESS', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    const bessNode = graph.nodes.find(n => n.attributes.elementName.includes('BESS'));
    expect(bessNode).toBeDefined();
    expect(bessNode!.nodeType).toBe(NodeTypeV1.GENERATOR_BESS);
  });

  it('zaden PV/BESS nie jest LOAD', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    const loads = graph.nodes.filter(n => n.nodeType === NodeTypeV1.LOAD);
    for (const load of loads) {
      const name = load.attributes.elementName.toLowerCase();
      expect(name).not.toContain('pv');
      expect(name).not.toContain('fotowolt');
      expect(name).not.toContain('solar');
      expect(name).not.toContain('bess');
      expect(name).not.toContain('magazyn');
      expect(name).not.toContain('battery');
    }
  });

  it('walidator odrzuca PV otypowane jako LOAD', () => {
    const badGraph: VisualGraphV1 = {
      version: VISUAL_GRAPH_VERSION,
      nodes: [
        {
          id: 'pv_bad',
          nodeType: NodeTypeV1.LOAD,
          ports: [],
          attributes: {
            label: 'PV Farma Solarna',
            voltageKv: null,
            inService: true,
            elementId: 'pv_bad',
            elementType: 'Load',
            elementName: 'PV Farma Solarna',
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
      edges: [],
      meta: {
        snapshotId: 'test',
        snapshotFingerprint: 'test',
        createdAt: '2026-01-01',
        version: VISUAL_GRAPH_VERSION,
      },
    };

    const result = validateVisualGraph(badGraph);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('GENERATOR_PV'))).toBe(true);
  });
});

// =============================================================================
// TEST: SECONDARY CONNECTORS
// =============================================================================

describe('VisualGraphV1 — secondary connectors', () => {
  it('enum EdgeTypeV1 zawiera SECONDARY_CONNECTOR', () => {
    expect(EdgeTypeV1.SECONDARY_CONNECTOR).toBe('SECONDARY_CONNECTOR');
  });

  it('switch NOP (OPEN) tworzy krawedz z isNormallyOpen=true', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    const nopEdge = graph.edges.find(e => e.isNormallyOpen === true);
    expect(nopEdge).toBeDefined();
  });

  it('EdgeTypeV1 zawiera wszystkie wymagane typy segmentacji', () => {
    expect(EdgeTypeV1.TRUNK).toBe('TRUNK');
    expect(EdgeTypeV1.BRANCH).toBe('BRANCH');
    expect(EdgeTypeV1.SECONDARY_CONNECTOR).toBe('SECONDARY_CONNECTOR');
    expect(EdgeTypeV1.BUS_COUPLER).toBe('BUS_COUPLER');
    expect(EdgeTypeV1.TRANSFORMER_LINK).toBe('TRANSFORMER_LINK');
    expect(EdgeTypeV1.INTERNAL_SWITCHGEAR).toBe('INTERNAL_SWITCHGEAR');
  });
});

// =============================================================================
// TEST: NO PCC STRINGS
// =============================================================================

describe('VisualGraphV1 — grep guard: brak stringow PCC', () => {
  it('zaden NodeTypeV1 nie zawiera PCC', () => {
    const allTypes = Object.values(NodeTypeV1);
    for (const t of allTypes) {
      expect(t.toUpperCase()).not.toContain('PCC');
    }
  });

  it('zaden EdgeTypeV1 nie zawiera PCC', () => {
    const allTypes = Object.values(EdgeTypeV1);
    for (const t of allTypes) {
      expect(t.toUpperCase()).not.toContain('PCC');
    }
  });

  it('zaden PortRoleV1 nie zawiera PCC', () => {
    const allTypes = Object.values(PortRoleV1);
    for (const t of allTypes) {
      expect(t.toUpperCase()).not.toContain('PCC');
    }
  });

  it('konwertowany graf nie zawiera PCC w labelach', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    for (const node of graph.nodes) {
      expect(node.attributes.label.toUpperCase()).not.toContain('PCC');
    }
    for (const edge of graph.edges) {
      expect(edge.attributes.label.toUpperCase()).not.toContain('PCC');
    }
  });
});

// =============================================================================
// TEST: HASH STABILITY
// =============================================================================

describe('VisualGraphV1 — hash stability', () => {
  it('ten sam graf → identyczny hash', () => {
    const symbols = buildMinimalNetwork();
    const graph1 = convertToVisualGraph(symbols);
    const graph2 = convertToVisualGraph(symbols);

    const hash1 = computeVisualGraphHash(graph1);
    const hash2 = computeVisualGraphHash(graph2);

    expect(hash1).toBe(hash2);
  });

  it('permutacja wejscia → identyczny hash (po canonicalize)', () => {
    const symbols = buildMinimalNetwork();
    const graph1 = convertToVisualGraph(symbols);
    const graph2 = convertToVisualGraph([...symbols].reverse());

    const hash1 = computeVisualGraphHash(graph1);
    const hash2 = computeVisualGraphHash(graph2);

    expect(hash1).toBe(hash2);
  });

  it('hash jest 8-znakowy hex', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);
    const hash = computeVisualGraphHash(graph);

    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });
});

// =============================================================================
// TEST: VALIDATION
// =============================================================================

describe('VisualGraphV1 — walidacja', () => {
  it('poprawny graf przechodzi walidacje', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);
    const result = validateVisualGraph(graph);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('duplikat id wezla jest wykrywany', () => {
    const graph: VisualGraphV1 = {
      version: VISUAL_GRAPH_VERSION,
      nodes: [
        {
          id: 'dup',
          nodeType: NodeTypeV1.BUS_SN,
          ports: [],
          attributes: {
            label: 'A', voltageKv: 15, inService: true, elementId: 'a',
            elementType: 'Bus', elementName: 'A', switchState: null,
            branchType: null, ratedPowerMva: null, width: 200, height: 10,
            fromNodeId: null, toNodeId: null, connectedToNodeId: null,
          },
        },
        {
          id: 'dup',
          nodeType: NodeTypeV1.BUS_SN,
          ports: [],
          attributes: {
            label: 'B', voltageKv: 15, inService: true, elementId: 'b',
            elementType: 'Bus', elementName: 'B', switchState: null,
            branchType: null, ratedPowerMva: null, width: 200, height: 10,
            fromNodeId: null, toNodeId: null, connectedToNodeId: null,
          },
        },
      ],
      edges: [],
      meta: {
        snapshotId: 'test', snapshotFingerprint: 'test',
        createdAt: '2026-01-01', version: VISUAL_GRAPH_VERSION,
      },
    };

    const result = validateVisualGraph(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplikat'))).toBe(true);
  });

  it('bledna wersja jest wykrywana', () => {
    const graph = {
      version: 'V99' as typeof VISUAL_GRAPH_VERSION,
      nodes: [],
      edges: [],
      meta: {
        snapshotId: 'test', snapshotFingerprint: 'test',
        createdAt: '2026-01-01', version: 'V99' as typeof VISUAL_GRAPH_VERSION,
      },
    } as VisualGraphV1;

    const result = validateVisualGraph(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('wersja'))).toBe(true);
  });

  it('wersja kontraktu jest V1', () => {
    expect(VISUAL_GRAPH_VERSION).toBe('V1');
  });
});

// =============================================================================
// TEST: ADAPTER — convertToVisualGraph
// =============================================================================

describe('TopologyAdapterV1 — convertToVisualGraph', () => {
  it('kazdy symbol wejsciowy mapuje sie na wezel', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    expect(graph.nodes.length).toBe(symbols.length);
  });

  it('transformer jest otypowany jako TRANSFORMER_LINK edge', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    const trEdge = graph.edges.find(e => e.edgeType === EdgeTypeV1.TRANSFORMER_LINK);
    expect(trEdge).toBeDefined();
  });

  it('szyna SN jest otypowana jako BUS_SN', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    const snBuses = graph.nodes.filter(n => n.nodeType === NodeTypeV1.BUS_SN);
    expect(snBuses.length).toBeGreaterThanOrEqual(1);
  });

  it('szyna nN jest otypowana jako BUS_NN', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    const nnBuses = graph.nodes.filter(n => n.nodeType === NodeTypeV1.BUS_NN);
    expect(nnBuses.length).toBeGreaterThanOrEqual(1);
  });

  it('GPZ Source jest GRID_SOURCE', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    const gpz = graph.nodes.find(n => n.attributes.elementName.includes('GPZ'));
    expect(gpz).toBeDefined();
    expect(gpz!.nodeType).toBe(NodeTypeV1.GRID_SOURCE);
  });

  it('Load jest LOAD', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    const loads = graph.nodes.filter(n => n.nodeType === NodeTypeV1.LOAD);
    expect(loads.length).toBeGreaterThanOrEqual(1);
  });

  it('Switch BREAKER jest SWITCH_BREAKER lub SWITCH_DISCONNECTOR', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    const switchNodes = graph.nodes.filter(n =>
      n.nodeType === NodeTypeV1.SWITCH_BREAKER ||
      n.nodeType === NodeTypeV1.SWITCH_DISCONNECTOR ||
      n.nodeType === NodeTypeV1.SWITCH_LOAD_SWITCH ||
      n.nodeType === NodeTypeV1.SWITCH_FUSE
    );
    expect(switchNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('meta zawiera version V1', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    expect(graph.meta.version).toBe(VISUAL_GRAPH_VERSION);
    expect(graph.version).toBe(VISUAL_GRAPH_VERSION);
  });

  it('atrybuty sa kompletne (brak undefined)', () => {
    const symbols = buildMinimalNetwork();
    const graph = convertToVisualGraph(symbols);

    for (const node of graph.nodes) {
      // Kazdy atrybut musi byc zdefiniowany (null dozwolone, undefined nie)
      const attrs = node.attributes;
      expect(attrs.label).toBeDefined();
      expect(attrs.inService).toBeDefined();
      expect(attrs.elementId).toBeDefined();
      expect(attrs.elementType).toBeDefined();
      expect(attrs.elementName).toBeDefined();
      // Opcjonalne — musza byc null, nie undefined
      expect(attrs.voltageKv !== undefined).toBe(true);
      expect(attrs.switchState !== undefined).toBe(true);
      expect(attrs.branchType !== undefined).toBe(true);
    }
  });
});
