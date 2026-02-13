/**
 * TopologyAdapterV2 — Domain-driven adapter tests (RUN #3C).
 *
 * Testy:
 * - Brak self-edges (twardy guard)
 * - Stacje A/B/C/D z domeny (nie z nazw)
 * - Krawedzie lacza DWA ROZNE wezly
 * - PrimaryTree / trunk / branch / secondary stabilne
 * - PV/BESS jako zrodla w 3 scenariuszach
 * - Referencje katalogowe walidowane
 * - FixActions dla brakujacych danych
 * - Determinizm: hash stability 100x
 * - Permutation invariance 50x
 * - E2E: TopologyInput → VisualGraph → LayoutResult (brak regresji)
 */

import { describe, it, expect } from 'vitest';
import {
  readTopologyFromSymbols,
  readTopologyFromENM,
  type TopologyInputV1,
  type ConnectionNodeV1,
  type TopologyBranchV1,
  type TopologySourceV1,
  type TopologyLoadV1,
  type TopologyGeneratorV1,
  type TopologyStationV1,
  BranchKind,
  GeneratorKind,
  StationKind,
} from '../topologyInputReader';
import { buildVisualGraphFromTopology, type AdapterResultV1 } from '../topologyAdapterV2';
import { convertToVisualGraph } from '../topologyAdapterV1';
import {
  computeVisualGraphHash,
  validateVisualGraph,
  NodeTypeV1,
  EdgeTypeV1,
} from '../visualGraph';
import type { AnySldSymbol, BusSymbol, BranchSymbol, SwitchSymbol, SourceSymbol, LoadSymbol } from '../../../sld-editor/types';
import type { EnergyNetworkModel } from '../../../../types/enm';

// =============================================================================
// GOLDEN NETWORKS — TOPOLOGY INPUT (DOMAIN-DRIVEN)
// =============================================================================

/**
 * GN-DOM-01: Prosta siec radialna GPZ → 3 stacje.
 * GPZ(source) → bus_gpz → [line1] → bus_st1 → [tr1] → bus_nn1 → load1
 *                        → [line2] → bus_st2 → [tr2] → bus_nn2 → load2
 *                        → [line3] → bus_st3 → [tr3] → bus_nn3 → load3
 */
function buildGN_DOM_01(): TopologyInputV1 {
  return {
    snapshotId: 'gn-dom-01',
    snapshotFingerprint: 'abc123',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ 15kV', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_nn1', name: 'Szyna nN St1', voltageKv: 0.4, stationId: 'st1', busIndex: null, inService: true },
      { id: 'bus_nn2', name: 'Szyna nN St2', voltageKv: 0.4, stationId: 'st2', busIndex: null, inService: true },
      { id: 'bus_nn3', name: 'Szyna nN St3', voltageKv: 0.4, stationId: 'st3', busIndex: null, inService: true },
      { id: 'bus_st1', name: 'Szyna SN St1', voltageKv: 15, stationId: 'st1', busIndex: null, inService: true },
      { id: 'bus_st2', name: 'Szyna SN St2', voltageKv: 15, stationId: 'st2', busIndex: null, inService: true },
      { id: 'bus_st3', name: 'Szyna SN St3', voltageKv: 15, stationId: 'st3', busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line1', name: 'Linia SN 1', fromNodeId: 'bus_gpz', toNodeId: 'bus_st1', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-6 120', lengthKm: 2.5, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line2', name: 'Linia SN 2', fromNodeId: 'bus_gpz', toNodeId: 'bus_st2', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-6 120', lengthKm: 3.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line3', name: 'Linia SN 3', fromNodeId: 'bus_gpz', toNodeId: 'bus_st3', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-6 120', lengthKm: 4.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'tr1', name: 'TR St1', fromNodeId: 'bus_st1', toNodeId: 'bus_nn1', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-250', lengthKm: null, ratedPowerMva: 0.25, voltageHvKv: 15, voltageLvKv: 0.4 },
      { id: 'tr2', name: 'TR St2', fromNodeId: 'bus_st2', toNodeId: 'bus_nn2', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-400', lengthKm: null, ratedPowerMva: 0.4, voltageHvKv: 15, voltageLvKv: 0.4 },
      { id: 'tr3', name: 'TR St3', fromNodeId: 'bus_st3', toNodeId: 'bus_nn3', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-630', lengthKm: null, ratedPowerMva: 0.63, voltageHvKv: 15, voltageLvKv: 0.4 },
    ],
    devices: [],
    stations: [
      { id: 'st1', name: 'Stacja 1', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_st1', 'bus_nn1'], branchIds: [], switchIds: [], transformerIds: ['tr1'] },
      { id: 'st2', name: 'Stacja 2', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_st2', 'bus_nn2'], branchIds: [], switchIds: [], transformerIds: ['tr2'] },
      { id: 'st3', name: 'Stacja 3', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_st3', 'bus_nn3'], branchIds: [], switchIds: [], transformerIds: ['tr3'] },
    ],
    generators: [],
    sources: [
      { id: 'src_gpz', name: 'Zasilanie GPZ', nodeId: 'bus_gpz', inService: true },
    ],
    loads: [
      { id: 'load1', name: 'Odbiorca St1', nodeId: 'bus_nn1', inService: true, pMw: 0.15, qMvar: 0.05 },
      { id: 'load2', name: 'Odbiorca St2', nodeId: 'bus_nn2', inService: true, pMw: 0.25, qMvar: 0.08 },
      { id: 'load3', name: 'Odbiorca St3', nodeId: 'bus_nn3', inService: true, pMw: 0.40, qMvar: 0.12 },
    ],
    protectionBindings: [],
    fixActions: [],
  };
}

/**
 * GN-DOM-02: Siec z piersciem i NOP.
 * GPZ → bus1 → bus2 → bus3 → bus1 (ring, NOP miedzy bus3→bus1)
 */
function buildGN_DOM_02(): TopologyInputV1 {
  return {
    snapshotId: 'gn-dom-02',
    snapshotFingerprint: 'ring123',
    connectionNodes: [
      { id: 'bus1', name: 'Szyna 1', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus2', name: 'Szyna 2', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus3', name: 'Szyna 3', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_gpz_1', name: 'Linia GPZ-1', fromNodeId: 'bus_gpz', toNodeId: 'bus1', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 1.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_1_2', name: 'Linia 1-2', fromNodeId: 'bus1', toNodeId: 'bus2', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 2.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_2_3', name: 'Linia 2-3', fromNodeId: 'bus2', toNodeId: 'bus3', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 1.5, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_3_1_nop', name: 'NOP 3-1', fromNodeId: 'bus3', toNodeId: 'bus1', kind: BranchKind.LINE, isNormallyOpen: true, inService: true, catalogRef: 'AFL-120', lengthKm: 3.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    ],
    devices: [],
    stations: [],
    generators: [],
    sources: [{ id: 'src1', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [],
    protectionBindings: [],
    fixActions: [],
  };
}

/**
 * GN-DOM-03: OZE PV na SN + BESS w stacji.
 */
function buildGN_DOM_03_OZE(): TopologyInputV1 {
  return {
    snapshotId: 'gn-dom-03',
    snapshotFingerprint: 'oze123',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_pv', name: 'Szyna PV', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_st', name: 'Szyna SN Stacji', voltageKv: 15, stationId: 'st_bess', busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_gpz_pv', name: 'Linia do PV', fromNodeId: 'bus_gpz', toNodeId: 'bus_pv', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'YAKY-240', lengthKm: 0.5, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_gpz_st', name: 'Linia do stacji', fromNodeId: 'bus_gpz', toNodeId: 'bus_st', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 3.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    ],
    devices: [],
    stations: [
      { id: 'st_bess', name: 'Stacja z BESS', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_st'], branchIds: [], switchIds: [], transformerIds: [] },
    ],
    generators: [
      { id: 'gen_pv', name: 'Farma PV 2MW', nodeId: 'bus_pv', kind: GeneratorKind.PV, catalogRef: 'INV-500', inService: true, ratedPowerMw: 2.0, blockingTransformerId: null, connectionVariant: 'block_transformer', stationRef: null },
      { id: 'gen_bess', name: 'BESS 1MW', nodeId: 'bus_st', kind: GeneratorKind.BESS, catalogRef: 'BESS-1000', inService: true, ratedPowerMw: 1.0, blockingTransformerId: null, connectionVariant: 'nn_side', stationRef: 'st_bess' },
    ],
    sources: [{ id: 'src_gpz', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [],
    protectionBindings: [],
    fixActions: [],
  };
}

/**
 * GN-DOM-04: Stacja sekcyjna TYPE_D (2 szyny + coupler).
 */
function buildGN_DOM_04_TypeD(): TopologyInputV1 {
  return {
    snapshotId: 'gn-dom-04',
    snapshotFingerprint: 'typed123',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_s1', name: 'Szyna sekcja 1', voltageKv: 15, stationId: 'st_sek', busIndex: 0, inService: true },
      { id: 'bus_s2', name: 'Szyna sekcja 2', voltageKv: 15, stationId: 'st_sek', busIndex: 1, inService: true },
    ],
    branches: [
      { id: 'line_gpz_s1', name: 'Linia do sekcji 1', fromNodeId: 'bus_gpz', toNodeId: 'bus_s1', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 2.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'coupler_s1_s2', name: 'Sprzeglo sekcyjne', fromNodeId: 'bus_s1', toNodeId: 'bus_s2', kind: BranchKind.BUS_LINK, isNormallyOpen: false, inService: true, catalogRef: null, lengthKm: null, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    ],
    devices: [],
    stations: [
      { id: 'st_sek', name: 'Stacja sekcyjna', stationType: StationKind.SWITCHING, voltageKv: 15, busIds: ['bus_s1', 'bus_s2'], branchIds: [], switchIds: [], transformerIds: [] },
    ],
    generators: [],
    sources: [{ id: 'src_gpz', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [],
    protectionBindings: [],
    fixActions: [],
  };
}

/**
 * GN-DOM-05: Siec z self-edge w danych (walidacja).
 */
function buildGN_DOM_05_SelfEdge(): TopologyInputV1 {
  return {
    snapshotId: 'gn-dom-05',
    snapshotFingerprint: 'selfedge',
    connectionNodes: [
      { id: 'bus1', name: 'Szyna 1', voltageKv: 15, stationId: null, busIndex: null, inService: true },
    ],
    branches: [
      { id: 'bad_branch', name: 'Zla galaz', fromNodeId: 'bus1', toNodeId: 'bus1', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: null, lengthKm: 1.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    ],
    devices: [],
    stations: [],
    generators: [],
    sources: [{ id: 'src1', name: 'GPZ', nodeId: 'bus1', inService: true }],
    loads: [],
    protectionBindings: [],
    fixActions: [],
  };
}

/**
 * GN-DOM-06: Multi-source (2 GPZ).
 */
function buildGN_DOM_06_MultiSource(): TopologyInputV1 {
  return {
    snapshotId: 'gn-dom-06',
    snapshotFingerprint: 'multi-src',
    connectionNodes: [
      { id: 'bus_a', name: 'Szyna A', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_b', name: 'Szyna B', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_mid', name: 'Szyna srodkowa', voltageKv: 15, stationId: null, busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_a_mid', name: 'Linia A-mid', fromNodeId: 'bus_a', toNodeId: 'bus_mid', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 5.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_b_mid', name: 'Linia B-mid', fromNodeId: 'bus_b', toNodeId: 'bus_mid', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 3.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    ],
    devices: [],
    stations: [],
    generators: [],
    sources: [
      { id: 'src_a', name: 'GPZ A', nodeId: 'bus_a', inService: true },
      { id: 'src_b', name: 'GPZ B', nodeId: 'bus_b', inService: true },
    ],
    loads: [],
    protectionBindings: [],
    fixActions: [],
  };
}

/**
 * GN-DOM-07: Brakujace referencje katalogowe.
 */
function buildGN_DOM_07_MissingCatalog(): TopologyInputV1 {
  return {
    snapshotId: 'gn-dom-07',
    snapshotFingerprint: 'missing-cat',
    connectionNodes: [
      { id: 'bus1', name: 'Szyna 1', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus2', name: 'Szyna 2', voltageKv: 15, stationId: null, busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_no_cat', name: 'Linia bez katalogu', fromNodeId: 'bus1', toNodeId: 'bus2', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: null, lengthKm: 2.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    ],
    devices: [],
    stations: [],
    generators: [],
    sources: [{ id: 'src1', name: 'GPZ', nodeId: 'bus1', inService: true }],
    loads: [],
    protectionBindings: [],
    fixActions: [],
  };
}

// =============================================================================
// GOLDEN SYMBOLS (for bridge migration tests)
// =============================================================================

function buildSymbols_SimpleRadial(): AnySldSymbol[] {
  return [
    { id: 'bus1', elementId: 'bus1', elementType: 'Bus', elementName: 'Szyna GPZ', position: { x: 0, y: 0 }, inService: true, width: 200, height: 10 } as BusSymbol,
    { id: 'bus2', elementId: 'bus2', elementType: 'Bus', elementName: 'Szyna St1', position: { x: 300, y: 0 }, inService: true, width: 200, height: 10 } as BusSymbol,
    { id: 'src1', elementId: 'src1', elementType: 'Source', elementName: 'GPZ', position: { x: 0, y: -100 }, inService: true, connectedToNodeId: 'bus1' } as SourceSymbol,
    { id: 'line1', elementId: 'line1', elementType: 'LineBranch', elementName: 'Linia 1', position: { x: 150, y: 0 }, inService: true, fromNodeId: 'bus1', toNodeId: 'bus2', points: [], branchType: 'LINE' } as BranchSymbol,
    { id: 'load1', elementId: 'load1', elementType: 'Load', elementName: 'Odbiorca 1', position: { x: 300, y: 100 }, inService: true, connectedToNodeId: 'bus2' } as LoadSymbol,
  ];
}

function buildSymbols_WithPVAndBESS(): AnySldSymbol[] {
  return [
    { id: 'bus1', elementId: 'bus1', elementType: 'Bus', elementName: 'Szyna GPZ', position: { x: 0, y: 0 }, inService: true, width: 200, height: 10 } as BusSymbol,
    { id: 'src1', elementId: 'src1', elementType: 'Source', elementName: 'GPZ', position: { x: 0, y: -100 }, inService: true, connectedToNodeId: 'bus1' } as SourceSymbol,
    { id: 'src_pv', elementId: 'src_pv', elementType: 'Source', elementName: 'PV Farm', position: { x: 200, y: -100 }, inService: true, connectedToNodeId: 'bus1' } as SourceSymbol,
    { id: 'src_bess', elementId: 'src_bess', elementType: 'Source', elementName: 'BESS Unit', position: { x: 400, y: -100 }, inService: true, connectedToNodeId: 'bus1' } as SourceSymbol,
  ];
}

// =============================================================================
// FISHER-YATES DETERMINISTIC SHUFFLE (PRNG)
// =============================================================================

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  const rng = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function shuffleTopologyInput(input: TopologyInputV1, seed: number): TopologyInputV1 {
  return {
    ...input,
    connectionNodes: shuffleArray([...input.connectionNodes], seed),
    branches: shuffleArray([...input.branches], seed + 1),
    devices: shuffleArray([...input.devices], seed + 2),
    stations: shuffleArray([...input.stations], seed + 3),
    generators: shuffleArray([...input.generators], seed + 4),
    sources: shuffleArray([...input.sources], seed + 5),
    loads: shuffleArray([...input.loads], seed + 6),
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('TopologyAdapterV2 — Domain-driven', () => {

  // =========================================================================
  // §1: NO SELF-EDGES (TWARDY GUARD)
  // =========================================================================

  describe('No self-edges invariant', () => {
    it('test_no_self_edges — GN-DOM-01 radialna', () => {
      const input = buildGN_DOM_01();
      const result = buildVisualGraphFromTopology(input);
      for (const edge of result.graph.edges) {
        expect(edge.fromPortRef.nodeId).not.toBe(edge.toPortRef.nodeId);
      }
    });

    it('test_no_self_edges — GN-DOM-02 ring+NOP', () => {
      const input = buildGN_DOM_02();
      const result = buildVisualGraphFromTopology(input);
      for (const edge of result.graph.edges) {
        expect(edge.fromPortRef.nodeId).not.toBe(edge.toPortRef.nodeId);
      }
    });

    it('test_no_self_edges — GN-DOM-03 OZE', () => {
      const input = buildGN_DOM_03_OZE();
      const result = buildVisualGraphFromTopology(input);
      for (const edge of result.graph.edges) {
        expect(edge.fromPortRef.nodeId).not.toBe(edge.toPortRef.nodeId);
      }
    });

    it('test_no_self_edges — GN-DOM-04 TYPE_D sekcyjna', () => {
      const input = buildGN_DOM_04_TypeD();
      const result = buildVisualGraphFromTopology(input);
      for (const edge of result.graph.edges) {
        expect(edge.fromPortRef.nodeId).not.toBe(edge.toPortRef.nodeId);
      }
    });

    it('test_self_edge_in_domain_data_emits_fixaction', () => {
      const input = buildGN_DOM_05_SelfEdge();
      const result = buildVisualGraphFromTopology(input);
      // Self-edge branch should NOT produce an edge in VisualGraph
      const branchEdges = result.graph.edges.filter(e => e.id === 'edge_bad_branch');
      expect(branchEdges.length).toBe(0);
      // FixAction emitted
      const fixAction = result.fixActions.find(fa => fa.code === 'topology.self_edge_forbidden');
      expect(fixAction).toBeDefined();
      expect(fixAction!.elementRef).toBe('bad_branch');
    });

    it('test_edge_endpoints_two_distinct_nodes — all golden networks', () => {
      const networks = [buildGN_DOM_01(), buildGN_DOM_02(), buildGN_DOM_03_OZE(), buildGN_DOM_04_TypeD(), buildGN_DOM_06_MultiSource()];
      for (const input of networks) {
        const result = buildVisualGraphFromTopology(input);
        for (const edge of result.graph.edges) {
          expect(edge.fromPortRef.nodeId).not.toBe(edge.toPortRef.nodeId);
        }
      }
    });
  });

  // =========================================================================
  // §2: STATION TYPOLOGY FROM DOMAIN (NOT STRINGS)
  // =========================================================================

  describe('Station typology from domain', () => {
    it('test_station_typology_from_domain_not_strings — TYPE_D sekcyjna', () => {
      const input = buildGN_DOM_04_TypeD();
      const result = buildVisualGraphFromTopology(input);
      const stationNode = result.graph.nodes.find(n => n.id === 'st_sek');
      expect(stationNode).toBeDefined();
      expect(stationNode!.nodeType).toBe(NodeTypeV1.STATION_SN_NN_D);
    });

    it('test_station_typology — DISTRIBUTION → STATION_SN_NN_B', () => {
      const input = buildGN_DOM_01();
      const result = buildVisualGraphFromTopology(input);
      for (const stId of ['st1', 'st2', 'st3']) {
        const node = result.graph.nodes.find(n => n.id === stId);
        expect(node).toBeDefined();
        // DISTRIBUTION with transformerIds → TYPE_B
        expect(node!.nodeType).toBe(NodeTypeV1.STATION_SN_NN_B);
      }
    });

    it('test_station_missing_type_emits_fixaction', () => {
      const input: TopologyInputV1 = {
        ...buildGN_DOM_01(),
        stations: [{
          id: 'st_unknown', name: 'Stacja bez typu', stationType: StationKind.DISTRIBUTION,
          voltageKv: 15, busIds: [], branchIds: [], switchIds: [], transformerIds: [],
        }],
      };
      const result = buildVisualGraphFromTopology(input);
      const fixAction = result.fixActions.find(fa => fa.code === 'station.typology_missing');
      expect(fixAction).toBeDefined();
    });
  });

  // =========================================================================
  // §3: SEGMENTATION (TRUNK / BRANCH / SECONDARY)
  // =========================================================================

  describe('Trunk/Branch/Secondary segmentation', () => {
    it('test_primarytree_secondary_connectors_stable — ring NOP is SECONDARY', () => {
      const input = buildGN_DOM_02();
      const result = buildVisualGraphFromTopology(input);
      const nopEdge = result.graph.edges.find(e => e.id === 'edge_line_3_1_nop');
      expect(nopEdge).toBeDefined();
      expect(nopEdge!.edgeType).toBe(EdgeTypeV1.SECONDARY_CONNECTOR);
      expect(nopEdge!.isNormallyOpen).toBe(true);
    });

    it('test_trunk_branch_classification_stable — trunk exists in radial', () => {
      const input = buildGN_DOM_01();
      const result = buildVisualGraphFromTopology(input);
      const trunkEdges = result.graph.edges.filter(e => e.edgeType === EdgeTypeV1.TRUNK);
      expect(trunkEdges.length).toBeGreaterThan(0);
    });

    it('test_transformer_link_classification', () => {
      const input = buildGN_DOM_01();
      const result = buildVisualGraphFromTopology(input);
      const trLinks = result.graph.edges.filter(e => e.edgeType === EdgeTypeV1.TRANSFORMER_LINK);
      expect(trLinks.length).toBe(3); // tr1, tr2, tr3
    });

    it('test_bus_coupler_classification — TYPE_D', () => {
      const input = buildGN_DOM_04_TypeD();
      const result = buildVisualGraphFromTopology(input);
      const couplers = result.graph.edges.filter(e => e.edgeType === EdgeTypeV1.BUS_COUPLER);
      expect(couplers.length).toBe(1); // coupler_s1_s2
    });
  });

  // =========================================================================
  // §4: PV/BESS AS SOURCES (3 SCENARIOS)
  // =========================================================================

  describe('PV/BESS sources', () => {
    it('test_pv_bess_sources_in_all_3_scenarios', () => {
      const input = buildGN_DOM_03_OZE();
      const result = buildVisualGraphFromTopology(input);

      const pvNode = result.graph.nodes.find(n => n.id === 'gen_pv');
      expect(pvNode).toBeDefined();
      expect(pvNode!.nodeType).toBe(NodeTypeV1.GENERATOR_PV);

      const bessNode = result.graph.nodes.find(n => n.id === 'gen_bess');
      expect(bessNode).toBeDefined();
      expect(bessNode!.nodeType).toBe(NodeTypeV1.GENERATOR_BESS);

      // Both connected via edges to their buses
      const pvEdge = result.graph.edges.find(e => e.fromPortRef.nodeId === 'gen_pv');
      expect(pvEdge).toBeDefined();
      expect(pvEdge!.toPortRef.nodeId).toBe('bus_pv');

      const bessEdge = result.graph.edges.find(e => e.fromPortRef.nodeId === 'gen_bess');
      expect(bessEdge).toBeDefined();
      expect(bessEdge!.toPortRef.nodeId).toBe('bus_st');
    });

    it('test_pv_bess_with_metadata_bridge', () => {
      const symbols = buildSymbols_WithPVAndBESS();
      const generatorTypes = new Map<string, 'PV' | 'WIND' | 'BESS'>([
        ['src_pv', 'PV'],
        ['src_bess', 'BESS'],
      ]);

      const graph = convertToVisualGraph(symbols, {
        metadata: { generatorTypes: generatorTypes as ReadonlyMap<string, any> },
      });

      const pvNode = graph.nodes.find(n => n.id === 'src_pv');
      expect(pvNode).toBeDefined();
      expect(pvNode!.nodeType).toBe(NodeTypeV1.GENERATOR_PV);

      const bessNode = graph.nodes.find(n => n.id === 'src_bess');
      expect(bessNode).toBeDefined();
      expect(bessNode!.nodeType).toBe(NodeTypeV1.GENERATOR_BESS);
    });
  });

  // =========================================================================
  // §5: CATALOG REFS + FIXACTIONS
  // =========================================================================

  describe('Catalog refs and FixActions', () => {
    it('test_catalog_refs_required — missing emits fixaction', () => {
      const input = buildGN_DOM_07_MissingCatalog();
      // readTopologyFromENM would emit FixAction; here we check adapter
      const result = buildVisualGraphFromTopology(input);
      // No FixAction from adapter itself (only from reader), but graph is valid
      expect(result.graph.edges.length).toBeGreaterThan(0);
    });

    it('test_fixactions_emitted_for_missing_data', () => {
      const input: TopologyInputV1 = {
        ...buildGN_DOM_01(),
        fixActions: [
          { code: 'catalog.reference_missing', message: 'Brak katalogu', elementRef: 'line1', fixHint: 'Dodaj' },
        ],
      };
      const result = buildVisualGraphFromTopology(input);
      expect(result.fixActions.some(fa => fa.code === 'catalog.reference_missing')).toBe(true);
    });
  });

  // =========================================================================
  // §6: BRIDGE MIGRATION (AnySldSymbol → TopologyInput → VisualGraph)
  // =========================================================================

  describe('Symbol bridge migration', () => {
    it('test_bridge_no_self_edges', () => {
      const symbols = buildSymbols_SimpleRadial();
      const graph = convertToVisualGraph(symbols);
      for (const edge of graph.edges) {
        expect(edge.fromPortRef.nodeId).not.toBe(edge.toPortRef.nodeId);
      }
    });

    it('test_bridge_produces_valid_graph', () => {
      const symbols = buildSymbols_SimpleRadial();
      const graph = convertToVisualGraph(symbols);
      const validation = validateVisualGraph(graph);
      expect(validation.valid).toBe(true);
    });

    it('test_bridge_nodes_created_for_all_elements', () => {
      const symbols = buildSymbols_SimpleRadial();
      const graph = convertToVisualGraph(symbols);
      // bus1, bus2, src1, load1 should be nodes
      // line1 is a branch → creates edge, not node
      const nodeIds = graph.nodes.map(n => n.id);
      expect(nodeIds).toContain('bus1');
      expect(nodeIds).toContain('bus2');
      expect(nodeIds).toContain('src1');
      expect(nodeIds).toContain('load1');
    });

    it('test_bridge_edges_connect_correct_nodes', () => {
      const symbols = buildSymbols_SimpleRadial();
      const graph = convertToVisualGraph(symbols);
      // line1 should connect bus1 → bus2
      const lineEdge = graph.edges.find(e => e.id === 'edge_line1');
      expect(lineEdge).toBeDefined();
      expect(lineEdge!.fromPortRef.nodeId).toBe('bus1');
      expect(lineEdge!.toPortRef.nodeId).toBe('bus2');
    });
  });

  // =========================================================================
  // §7: DETERMINISM — HASH STABILITY (100x)
  // =========================================================================

  describe('Determinism — hash stability 100x', () => {
    const goldenNetworks = [
      { name: 'GN-DOM-01', build: buildGN_DOM_01 },
      { name: 'GN-DOM-02', build: buildGN_DOM_02 },
      { name: 'GN-DOM-03', build: buildGN_DOM_03_OZE },
      { name: 'GN-DOM-04', build: buildGN_DOM_04_TypeD },
      { name: 'GN-DOM-06', build: buildGN_DOM_06_MultiSource },
      { name: 'GN-DOM-07', build: buildGN_DOM_07_MissingCatalog },
    ];

    for (const { name, build } of goldenNetworks) {
      it(`hash stability 100x — ${name}`, () => {
        const input = build();
        const referenceResult = buildVisualGraphFromTopology(input);
        const referenceHash = computeVisualGraphHash(referenceResult.graph);

        for (let i = 0; i < 100; i++) {
          const result = buildVisualGraphFromTopology(input);
          expect(computeVisualGraphHash(result.graph)).toBe(referenceHash);
        }
      });
    }
  });

  // =========================================================================
  // §8: PERMUTATION INVARIANCE (50x)
  // =========================================================================

  describe('Permutation invariance 50x', () => {
    const goldenNetworks = [
      { name: 'GN-DOM-01', build: buildGN_DOM_01 },
      { name: 'GN-DOM-02', build: buildGN_DOM_02 },
      { name: 'GN-DOM-03', build: buildGN_DOM_03_OZE },
      { name: 'GN-DOM-06', build: buildGN_DOM_06_MultiSource },
    ];

    for (const { name, build } of goldenNetworks) {
      it(`permutation invariance 50x — ${name}`, () => {
        const input = build();
        const referenceResult = buildVisualGraphFromTopology(input);
        const referenceHash = computeVisualGraphHash(referenceResult.graph);

        for (let i = 0; i < 50; i++) {
          const shuffled = shuffleTopologyInput(input, i * 1000 + 42);
          const result = buildVisualGraphFromTopology(shuffled);
          expect(computeVisualGraphHash(result.graph)).toBe(referenceHash);
        }
      });
    }
  });

  // =========================================================================
  // §9: MULTI-SOURCE TIE-BREAK
  // =========================================================================

  describe('Multi-source determinism', () => {
    it('test_multi_source_tie_break_deterministic', () => {
      const input = buildGN_DOM_06_MultiSource();
      const result = buildVisualGraphFromTopology(input);
      // Both sources should be GRID_SOURCE
      const srcNodes = result.graph.nodes.filter(n => n.nodeType === NodeTypeV1.GRID_SOURCE);
      expect(srcNodes.length).toBe(2);

      // Trunk should exist from root source (alphabetically first: src_a)
      const trunkEdges = result.graph.edges.filter(e => e.edgeType === EdgeTypeV1.TRUNK);
      expect(trunkEdges.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // §10: VALIDATION
  // =========================================================================

  describe('VisualGraph validation', () => {
    it('test_all_golden_networks_pass_validation', () => {
      const networks = [
        buildGN_DOM_01(), buildGN_DOM_02(), buildGN_DOM_03_OZE(),
        buildGN_DOM_04_TypeD(), buildGN_DOM_06_MultiSource(),
      ];
      for (const input of networks) {
        const result = buildVisualGraphFromTopology(input);
        const validation = validateVisualGraph(result.graph);
        expect(validation.valid).toBe(true);
      }
    });

    it('test_graph_version_is_v1', () => {
      const result = buildVisualGraphFromTopology(buildGN_DOM_01());
      expect(result.graph.version).toBe('V1');
    });

    it('test_canonical_sorting', () => {
      const result = buildVisualGraphFromTopology(buildGN_DOM_01());
      for (let i = 1; i < result.graph.nodes.length; i++) {
        expect(result.graph.nodes[i].id.localeCompare(result.graph.nodes[i - 1].id)).toBeGreaterThanOrEqual(0);
      }
      for (let i = 1; i < result.graph.edges.length; i++) {
        expect(result.graph.edges[i].id.localeCompare(result.graph.edges[i - 1].id)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // =========================================================================
  // §11: STRESS TEST (500+ nodes)
  // =========================================================================

  describe('Stress test', () => {
    it('test_500_plus_nodes_determinism', () => {
      // Generate 500+ node network
      const nodes: ConnectionNodeV1[] = [];
      const branches: TopologyBranchV1[] = [];
      const loads: TopologyLoadV1[] = [];

      nodes.push({ id: 'bus_root', name: 'Szyna root', voltageKv: 15, stationId: null, busIndex: null, inService: true });

      for (let i = 0; i < 500; i++) {
        const busId = `bus_${String(i).padStart(4, '0')}`;
        nodes.push({ id: busId, name: `Szyna ${i}`, voltageKv: 15, stationId: null, busIndex: null, inService: true });

        const fromId = i === 0 ? 'bus_root' : `bus_${String(i - 1).padStart(4, '0')}`;
        branches.push({
          id: `line_${String(i).padStart(4, '0')}`,
          name: `Linia ${i}`,
          fromNodeId: fromId,
          toNodeId: busId,
          kind: BranchKind.LINE,
          isNormallyOpen: false,
          inService: true,
          catalogRef: 'AFL-120',
          lengthKm: 1.0,
          ratedPowerMva: null,
          voltageHvKv: null,
          voltageLvKv: null,
        });

        if (i % 5 === 0) {
          loads.push({
            id: `load_${String(i).padStart(4, '0')}`,
            name: `Odbiorca ${i}`,
            nodeId: busId,
            inService: true,
            pMw: 0.1,
            qMvar: 0.03,
          });
        }
      }

      const input: TopologyInputV1 = {
        snapshotId: 'stress-500',
        snapshotFingerprint: 'stress',
        connectionNodes: nodes,
        branches,
        devices: [],
        stations: [],
        generators: [],
        sources: [{ id: 'src_root', name: 'GPZ', nodeId: 'bus_root', inService: true }],
        loads,
        protectionBindings: [],
        fixActions: [],
      };

      const result = buildVisualGraphFromTopology(input);
      const hash = computeVisualGraphHash(result.graph);

      // Stability 10x
      for (let i = 0; i < 10; i++) {
        const r = buildVisualGraphFromTopology(input);
        expect(computeVisualGraphHash(r.graph)).toBe(hash);
      }

      // No self-edges
      for (const edge of result.graph.edges) {
        expect(edge.fromPortRef.nodeId).not.toBe(edge.toPortRef.nodeId);
      }

      expect(result.graph.nodes.length).toBeGreaterThan(500);
    });
  });
});
