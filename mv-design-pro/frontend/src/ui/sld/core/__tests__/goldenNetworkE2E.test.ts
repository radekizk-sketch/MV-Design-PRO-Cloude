/**
 * goldenNetworkE2E.test.ts — RUN #3E §7: Golden Network E2E reference tests.
 *
 * BINDING: Full pipeline determinism for 7 reference topologies:
 *   TopologyInput → VisualGraph → LayoutResult → ElementRef → ExportManifest
 *
 * Golden Networks:
 *   GN-E2E-01: GPZ + 10 stations (radial)
 *   GN-E2E-02: Ring with NOP
 *   GN-E2E-03: Branch station (Type C single feeder)
 *   GN-E2E-04: Sectional station (Type D, 2 buses + coupler)
 *   GN-E2E-05: PV nn_side connection
 *   GN-E2E-06: BESS nn_side connection
 *   GN-E2E-07: PV + BESS block_transformer
 *
 * Each golden network verifies:
 *   1. Full pipeline produces valid output
 *   2. Hash stability (100x)
 *   3. Permutation invariance (50x)
 *   4. ExportManifest deterministic seal
 */

import { describe, it, expect } from 'vitest';
import type {
  TopologyInputV1,
  ConnectionNodeV1,
  TopologyBranchV1,
  TopologyStationV1,
  TopologyGeneratorV1,
  TopologySourceV1,
  TopologyLoadV1,
} from '../topologyInputReader';
import { BranchKind, GeneratorKind, StationKind } from '../topologyInputReader';
import { buildVisualGraphFromTopology } from '../topologyAdapterV2';
import {
  computeVisualGraphHash,
  validateVisualGraph,
  NodeTypeV1,
} from '../visualGraph';
import { computeLayout } from '../layoutPipeline';
import { computeLayoutResultHash, validateLayoutResult } from '../layoutResult';
import { buildExportManifest } from '../exportManifest';
import type { ExportManifestV1 } from '../exportManifest';

// =============================================================================
// GOLDEN NETWORKS — TopologyInputV1 BUILDERS
// =============================================================================

/** GN-E2E-01: GPZ + 10 stations (radial magistrala). */
function buildGN_E2E_01(): TopologyInputV1 {
  const nodes: ConnectionNodeV1[] = [
    { id: 'bus_gpz', name: 'Szyna GPZ 15kV', voltageKv: 15, stationId: null, busIndex: null, inService: true },
  ];
  const branches: TopologyBranchV1[] = [];
  const stations: TopologyStationV1[] = [];
  const loads: TopologyLoadV1[] = [];

  for (let i = 1; i <= 10; i++) {
    const pad = String(i).padStart(2, '0');
    const snBusId = `bus_sn_st${pad}`;
    const nnBusId = `bus_nn_st${pad}`;
    const stId = `st${pad}`;
    const fromId = i === 1 ? 'bus_gpz' : `bus_sn_st${String(i - 1).padStart(2, '0')}`;

    nodes.push(
      { id: snBusId, name: `Szyna SN St${pad}`, voltageKv: 15, stationId: stId, busIndex: null, inService: true },
      { id: nnBusId, name: `Szyna nN St${pad}`, voltageKv: 0.4, stationId: stId, busIndex: null, inService: true },
    );
    branches.push(
      { id: `line_${pad}`, name: `Linia SN ${pad}`, fromNodeId: fromId, toNodeId: snBusId, kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-6 120', lengthKm: 2.0 + i * 0.3, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: `tr_${pad}`, name: `TR St${pad}`, fromNodeId: snBusId, toNodeId: nnBusId, kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-250', lengthKm: null, ratedPowerMva: 0.25, voltageHvKv: 15, voltageLvKv: 0.4 },
    );
    stations.push(
      { id: stId, name: `Stacja ${pad}`, stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: [snBusId, nnBusId], branchIds: [], switchIds: [], transformerIds: [`tr_${pad}`] },
    );
    loads.push(
      { id: `load_${pad}`, name: `Odbiorca ${pad}`, nodeId: nnBusId, inService: true, pMw: 0.1 + i * 0.02, qMvar: 0.03 },
    );
  }

  return {
    snapshotId: 'gn-e2e-01',
    snapshotFingerprint: 'e2e01_fp_abc',
    connectionNodes: nodes,
    branches,
    devices: [],
    stations,
    generators: [],
    sources: [{ id: 'src_gpz', name: 'Zasilanie GPZ', nodeId: 'bus_gpz', inService: true }],
    loads,
    protectionBindings: [],
    fixActions: [],
  };
}

/** GN-E2E-02: Ring with NOP (4 buses in ring, NOP between bus4 and bus1). */
function buildGN_E2E_02(): TopologyInputV1 {
  return {
    snapshotId: 'gn-e2e-02',
    snapshotFingerprint: 'e2e02_fp_ring',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_r1', name: 'Szyna Ring 1', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_r2', name: 'Szyna Ring 2', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_r3', name: 'Szyna Ring 3', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_r4', name: 'Szyna Ring 4', voltageKv: 15, stationId: null, busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_gpz_r1', name: 'Linia GPZ-R1', fromNodeId: 'bus_gpz', toNodeId: 'bus_r1', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 1.5, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_r1_r2', name: 'Linia R1-R2', fromNodeId: 'bus_r1', toNodeId: 'bus_r2', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 2.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_r2_r3', name: 'Linia R2-R3', fromNodeId: 'bus_r2', toNodeId: 'bus_r3', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 1.8, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_r3_r4', name: 'Linia R3-R4', fromNodeId: 'bus_r3', toNodeId: 'bus_r4', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 2.5, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'nop_r4_gpz', name: 'NOP Ring', fromNodeId: 'bus_r4', toNodeId: 'bus_gpz', kind: BranchKind.LINE, isNormallyOpen: true, inService: true, catalogRef: 'AFL-120', lengthKm: 3.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    ],
    devices: [],
    stations: [],
    generators: [],
    sources: [{ id: 'src_gpz', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [],
    protectionBindings: [],
    fixActions: [],
  };
}

/** GN-E2E-03: Branch station (Type C single feeder). */
function buildGN_E2E_03(): TopologyInputV1 {
  return {
    snapshotId: 'gn-e2e-03',
    snapshotFingerprint: 'e2e03_fp_branch',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_sn_c', name: 'Szyna SN Stacja C', voltageKv: 15, stationId: 'st_c', busIndex: null, inService: true },
      { id: 'bus_nn_c', name: 'Szyna nN Stacja C', voltageKv: 0.4, stationId: 'st_c', busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_branch', name: 'Odgalezienie do C', fromNodeId: 'bus_gpz', toNodeId: 'bus_sn_c', kind: BranchKind.CABLE, isNormallyOpen: false, inService: true, catalogRef: 'YAKY-240', lengthKm: 1.2, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'tr_c', name: 'TR Stacja C', fromNodeId: 'bus_sn_c', toNodeId: 'bus_nn_c', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-400', lengthKm: null, ratedPowerMva: 0.4, voltageHvKv: 15, voltageLvKv: 0.4 },
    ],
    devices: [],
    stations: [
      { id: 'st_c', name: 'Stacja C', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_sn_c', 'bus_nn_c'], branchIds: [], switchIds: [], transformerIds: ['tr_c'] },
    ],
    generators: [],
    sources: [{ id: 'src_gpz', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [
      { id: 'load_c', name: 'Odbiorca C', nodeId: 'bus_nn_c', inService: true, pMw: 0.3, qMvar: 0.1 },
    ],
    protectionBindings: [],
    fixActions: [],
  };
}

/** GN-E2E-04: Sectional station (Type D, 2 buses + coupler). */
function buildGN_E2E_04(): TopologyInputV1 {
  return {
    snapshotId: 'gn-e2e-04',
    snapshotFingerprint: 'e2e04_fp_typed',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_s1', name: 'Szyna sekcja 1', voltageKv: 15, stationId: 'st_sek', busIndex: 0, inService: true },
      { id: 'bus_s2', name: 'Szyna sekcja 2', voltageKv: 15, stationId: 'st_sek', busIndex: 1, inService: true },
      { id: 'bus_nn_s1', name: 'Szyna nN sekcja 1', voltageKv: 0.4, stationId: 'st_sek', busIndex: null, inService: true },
      { id: 'bus_nn_s2', name: 'Szyna nN sekcja 2', voltageKv: 0.4, stationId: 'st_sek', busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_gpz_s1', name: 'Linia GPZ-S1', fromNodeId: 'bus_gpz', toNodeId: 'bus_s1', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 2.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'coupler', name: 'Sprzeglo sekcyjne', fromNodeId: 'bus_s1', toNodeId: 'bus_s2', kind: BranchKind.BUS_LINK, isNormallyOpen: false, inService: true, catalogRef: null, lengthKm: null, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'tr_s1', name: 'TR sekcja 1', fromNodeId: 'bus_s1', toNodeId: 'bus_nn_s1', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-250', lengthKm: null, ratedPowerMva: 0.25, voltageHvKv: 15, voltageLvKv: 0.4 },
      { id: 'tr_s2', name: 'TR sekcja 2', fromNodeId: 'bus_s2', toNodeId: 'bus_nn_s2', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-250', lengthKm: null, ratedPowerMva: 0.25, voltageHvKv: 15, voltageLvKv: 0.4 },
    ],
    devices: [],
    stations: [
      { id: 'st_sek', name: 'Stacja sekcyjna', stationType: StationKind.SWITCHING, voltageKv: 15, busIds: ['bus_s1', 'bus_s2'], branchIds: [], switchIds: [], transformerIds: ['tr_s1', 'tr_s2'] },
    ],
    generators: [],
    sources: [{ id: 'src_gpz', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [
      { id: 'load_s1', name: 'Odbiorca S1', nodeId: 'bus_nn_s1', inService: true, pMw: 0.15, qMvar: 0.05 },
      { id: 'load_s2', name: 'Odbiorca S2', nodeId: 'bus_nn_s2', inService: true, pMw: 0.2, qMvar: 0.06 },
    ],
    protectionBindings: [],
    fixActions: [],
  };
}

/** GN-E2E-05: PV nn_side (PV connected on nN side of station). */
function buildGN_E2E_05(): TopologyInputV1 {
  return {
    snapshotId: 'gn-e2e-05',
    snapshotFingerprint: 'e2e05_fp_pv_nn',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_sn_st', name: 'Szyna SN Stacja', voltageKv: 15, stationId: 'st_pv', busIndex: null, inService: true },
      { id: 'bus_nn_st', name: 'Szyna nN Stacja', voltageKv: 0.4, stationId: 'st_pv', busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_gpz_st', name: 'Linia GPZ-St', fromNodeId: 'bus_gpz', toNodeId: 'bus_sn_st', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 3.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'tr_st', name: 'TR Stacja PV', fromNodeId: 'bus_sn_st', toNodeId: 'bus_nn_st', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-630', lengthKm: null, ratedPowerMva: 0.63, voltageHvKv: 15, voltageLvKv: 0.4 },
    ],
    devices: [],
    stations: [
      { id: 'st_pv', name: 'Stacja z PV', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_sn_st', 'bus_nn_st'], branchIds: [], switchIds: [], transformerIds: ['tr_st'] },
    ],
    generators: [
      { id: 'gen_pv', name: 'PV 50kW', nodeId: 'bus_nn_st', kind: GeneratorKind.PV, catalogRef: 'INV-50', inService: true, ratedPowerMw: 0.05, blockingTransformerId: null, connectionVariant: 'nn_side', stationRef: 'st_pv' },
    ],
    sources: [{ id: 'src_gpz', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [
      { id: 'load_st', name: 'Odbiorca Stacja', nodeId: 'bus_nn_st', inService: true, pMw: 0.2, qMvar: 0.06 },
    ],
    protectionBindings: [],
    fixActions: [],
  };
}

/** GN-E2E-06: BESS nn_side (BESS connected on nN side of station). */
function buildGN_E2E_06(): TopologyInputV1 {
  return {
    snapshotId: 'gn-e2e-06',
    snapshotFingerprint: 'e2e06_fp_bess_nn',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_sn_st', name: 'Szyna SN Stacja', voltageKv: 15, stationId: 'st_bess', busIndex: null, inService: true },
      { id: 'bus_nn_st', name: 'Szyna nN Stacja', voltageKv: 0.4, stationId: 'st_bess', busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_gpz_st', name: 'Linia GPZ-St', fromNodeId: 'bus_gpz', toNodeId: 'bus_sn_st', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 4.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'tr_st', name: 'TR Stacja BESS', fromNodeId: 'bus_sn_st', toNodeId: 'bus_nn_st', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-400', lengthKm: null, ratedPowerMva: 0.4, voltageHvKv: 15, voltageLvKv: 0.4 },
    ],
    devices: [],
    stations: [
      { id: 'st_bess', name: 'Stacja z BESS', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_sn_st', 'bus_nn_st'], branchIds: [], switchIds: [], transformerIds: ['tr_st'] },
    ],
    generators: [
      { id: 'gen_bess', name: 'BESS 200kW', nodeId: 'bus_nn_st', kind: GeneratorKind.BESS, catalogRef: 'BESS-200', inService: true, ratedPowerMw: 0.2, blockingTransformerId: null, connectionVariant: 'nn_side', stationRef: 'st_bess' },
    ],
    sources: [{ id: 'src_gpz', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [
      { id: 'load_st', name: 'Odbiorca Stacja', nodeId: 'bus_nn_st', inService: true, pMw: 0.15, qMvar: 0.05 },
    ],
    protectionBindings: [],
    fixActions: [],
  };
}

/** GN-E2E-07: PV + BESS block_transformer (both via dedicated transformers on SN). */
function buildGN_E2E_07(): TopologyInputV1 {
  return {
    snapshotId: 'gn-e2e-07',
    snapshotFingerprint: 'e2e07_fp_block',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_pv_sn', name: 'Szyna SN PV', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_bess_sn', name: 'Szyna SN BESS', voltageKv: 15, stationId: null, busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_gpz_pv', name: 'Linia GPZ-PV', fromNodeId: 'bus_gpz', toNodeId: 'bus_pv_sn', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 2.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_gpz_bess', name: 'Linia GPZ-BESS', fromNodeId: 'bus_gpz', toNodeId: 'bus_bess_sn', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 1.5, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    ],
    devices: [],
    stations: [],
    generators: [
      { id: 'gen_pv', name: 'PV 2MW', nodeId: 'bus_pv_sn', kind: GeneratorKind.PV, catalogRef: 'INV-500', inService: true, ratedPowerMw: 2.0, blockingTransformerId: null, connectionVariant: 'block_transformer', stationRef: null },
      { id: 'gen_bess', name: 'BESS 1MW', nodeId: 'bus_bess_sn', kind: GeneratorKind.BESS, catalogRef: 'BESS-1000', inService: true, ratedPowerMw: 1.0, blockingTransformerId: null, connectionVariant: 'block_transformer', stationRef: null },
    ],
    sources: [{ id: 'src_gpz', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [],
    protectionBindings: [],
    fixActions: [],
  };
}

// =============================================================================
// ALL GOLDEN NETWORKS
// =============================================================================

const GOLDEN_NETWORKS = [
  { name: 'GN-E2E-01 (radial 10 stations)', build: buildGN_E2E_01 },
  { name: 'GN-E2E-02 (ring with NOP)', build: buildGN_E2E_02 },
  { name: 'GN-E2E-03 (branch station)', build: buildGN_E2E_03 },
  { name: 'GN-E2E-04 (sectional Type D)', build: buildGN_E2E_04 },
  { name: 'GN-E2E-05 (PV nn_side)', build: buildGN_E2E_05 },
  { name: 'GN-E2E-06 (BESS nn_side)', build: buildGN_E2E_06 },
  { name: 'GN-E2E-07 (PV+BESS block_transformer)', build: buildGN_E2E_07 },
];

// =============================================================================
// DETERMINISTIC SHUFFLE (Fisher-Yates with seeded PRNG)
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
// HELPER: Run full pipeline
// =============================================================================

function runFullPipeline(input: TopologyInputV1) {
  const adapterResult = buildVisualGraphFromTopology(input);
  const layoutResult = computeLayout(adapterResult.graph, undefined, adapterResult.stationBlockDetails);
  const graphHash = computeVisualGraphHash(adapterResult.graph);
  const layoutHash = computeLayoutResultHash(layoutResult);

  // Collect all elementIds from VisualGraph nodes
  const elementIds = adapterResult.graph.nodes
    .map(n => n.attributes.elementId)
    .filter((id): id is string => id != null);

  const manifest = buildExportManifest({
    snapshotHash: input.snapshotFingerprint,
    layoutHash,
    elementIds,
    analysisTypes: [],
    readinessStatus: 'READY',
  });

  return { adapterResult, layoutResult, graphHash, layoutHash, manifest };
}

// =============================================================================
// TESTS: §7.1 — FULL PIPELINE VALIDITY
// =============================================================================

describe('Golden Network E2E — full pipeline validity', () => {
  for (const { name, build } of GOLDEN_NETWORKS) {
    it(`${name}: VisualGraph passes validation`, () => {
      const input = build();
      const { adapterResult } = runFullPipeline(input);
      const validation = validateVisualGraph(adapterResult.graph);
      expect(validation.valid).toBe(true);
    });

    it(`${name}: LayoutResult passes validation`, () => {
      const input = build();
      const { layoutResult } = runFullPipeline(input);
      const validation = validateLayoutResult(layoutResult);
      expect(validation.valid).toBe(true);
    });

    it(`${name}: no self-edges in VisualGraph`, () => {
      const input = build();
      const { adapterResult } = runFullPipeline(input);
      for (const edge of adapterResult.graph.edges) {
        expect(edge.fromPortRef.nodeId).not.toBe(edge.toPortRef.nodeId);
      }
    });

    it(`${name}: ExportManifest has valid contentHash`, () => {
      const input = build();
      const { manifest } = runFullPipeline(input);
      expect(manifest.contentHash).toBeTruthy();
      expect(manifest.contentHash.length).toBe(64); // 8 * 8 hex chars from syncSha256
      expect(manifest.specVersion).toBe('1.1');
      expect(manifest.readinessStatus).toBe('READY');
    });
  }
});

// =============================================================================
// TESTS: §7.2 — HASH STABILITY (100x)
// =============================================================================

describe('Golden Network E2E — hash stability 100x', () => {
  for (const { name, build } of GOLDEN_NETWORKS) {
    it(`${name}: graph + layout hash stable 100x`, () => {
      const input = build();
      const ref = runFullPipeline(input);

      for (let i = 0; i < 100; i++) {
        const run = runFullPipeline(input);
        expect(run.graphHash).toBe(ref.graphHash);
        expect(run.layoutHash).toBe(ref.layoutHash);
        expect(run.manifest.contentHash).toBe(ref.manifest.contentHash);
      }
    });
  }
});

// =============================================================================
// TESTS: §7.3 — PERMUTATION INVARIANCE (50x)
// =============================================================================

describe('Golden Network E2E — permutation invariance 50x', () => {
  for (const { name, build } of GOLDEN_NETWORKS) {
    it(`${name}: shuffled input → same hashes`, () => {
      const input = build();
      const ref = runFullPipeline(input);

      for (let seed = 1; seed <= 50; seed++) {
        const shuffled = shuffleTopologyInput(input, seed * 1000 + 42);
        const run = runFullPipeline(shuffled);
        expect(run.graphHash).toBe(ref.graphHash);
        expect(run.layoutHash).toBe(ref.layoutHash);
      }
    });
  }
});

// =============================================================================
// TESTS: §7.4 — TOPOLOGY-SPECIFIC INVARIANTS
// =============================================================================

describe('Golden Network E2E — topology-specific invariants', () => {
  it('GN-E2E-01: 10 stations detected, all TYPE_B', () => {
    const input = buildGN_E2E_01();
    const { adapterResult } = runFullPipeline(input);
    const stationNodes = adapterResult.graph.nodes.filter(
      n => n.nodeType === NodeTypeV1.STATION_SN_NN_B,
    );
    expect(stationNodes.length).toBe(10);
  });

  it('GN-E2E-02: NOP edge is isNormallyOpen=true', () => {
    const input = buildGN_E2E_02();
    const { adapterResult } = runFullPipeline(input);
    const nopEdge = adapterResult.graph.edges.find(e => e.isNormallyOpen === true);
    expect(nopEdge).toBeDefined();
  });

  it('GN-E2E-03: branch station Type B detected', () => {
    const input = buildGN_E2E_03();
    const { adapterResult } = runFullPipeline(input);
    const stNode = adapterResult.graph.nodes.find(n => n.id === 'st_c');
    expect(stNode).toBeDefined();
    expect(stNode!.nodeType).toBe(NodeTypeV1.STATION_SN_NN_B);
  });

  it('GN-E2E-04: sectional station Type D detected', () => {
    const input = buildGN_E2E_04();
    const { adapterResult } = runFullPipeline(input);
    const stNode = adapterResult.graph.nodes.find(n => n.id === 'st_sek');
    expect(stNode).toBeDefined();
    expect(stNode!.nodeType).toBe(NodeTypeV1.STATION_SN_NN_D);
  });

  it('GN-E2E-05: PV generator node is GENERATOR_PV', () => {
    const input = buildGN_E2E_05();
    const { adapterResult } = runFullPipeline(input);
    const pvNode = adapterResult.graph.nodes.find(n => n.id === 'gen_pv');
    expect(pvNode).toBeDefined();
    expect(pvNode!.nodeType).toBe(NodeTypeV1.GENERATOR_PV);
  });

  it('GN-E2E-06: BESS generator node is GENERATOR_BESS', () => {
    const input = buildGN_E2E_06();
    const { adapterResult } = runFullPipeline(input);
    const bessNode = adapterResult.graph.nodes.find(n => n.id === 'gen_bess');
    expect(bessNode).toBeDefined();
    expect(bessNode!.nodeType).toBe(NodeTypeV1.GENERATOR_BESS);
  });

  it('GN-E2E-07: both PV and BESS on SN (block_transformer)', () => {
    const input = buildGN_E2E_07();
    const { adapterResult } = runFullPipeline(input);
    const pvNode = adapterResult.graph.nodes.find(n => n.id === 'gen_pv');
    const bessNode = adapterResult.graph.nodes.find(n => n.id === 'gen_bess');
    expect(pvNode).toBeDefined();
    expect(pvNode!.nodeType).toBe(NodeTypeV1.GENERATOR_PV);
    expect(bessNode).toBeDefined();
    expect(bessNode!.nodeType).toBe(NodeTypeV1.GENERATOR_BESS);
  });

  it('GN-E2E-07: ExportManifest elementIds include both generators', () => {
    const input = buildGN_E2E_07();
    const { manifest } = runFullPipeline(input);
    expect(manifest.elementIds).toContain('gen_pv');
    expect(manifest.elementIds).toContain('gen_bess');
    // elementIds are sorted
    const sorted = [...manifest.elementIds].sort();
    expect([...manifest.elementIds]).toEqual(sorted);
  });
});

// =============================================================================
// TESTS: §7.5 — EXPORT MANIFEST CROSS-NETWORK DETERMINISM
// =============================================================================

describe('Golden Network E2E — ExportManifest cross-network', () => {
  it('different networks produce different contentHash', () => {
    const hashes = new Set<string>();
    for (const { build } of GOLDEN_NETWORKS) {
      const { manifest } = runFullPipeline(build());
      hashes.add(manifest.contentHash);
    }
    // All 7 networks must produce distinct hashes
    expect(hashes.size).toBe(GOLDEN_NETWORKS.length);
  });

  it('manifest elementIds are sorted and deduplicated across all networks', () => {
    for (const { build } of GOLDEN_NETWORKS) {
      const { manifest } = runFullPipeline(build());
      const sorted = [...manifest.elementIds].sort();
      expect([...manifest.elementIds]).toEqual(sorted);
      // No duplicates
      expect(new Set(manifest.elementIds).size).toBe(manifest.elementIds.length);
    }
  });
});
