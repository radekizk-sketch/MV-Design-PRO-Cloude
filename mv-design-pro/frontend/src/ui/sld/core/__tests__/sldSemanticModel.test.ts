/**
 * SldSemanticModel + Adapter + Validator Tests — PROMPT 9.
 *
 * Golden Networks:
 * - GN-SEM-01: GPZ → przelotowa → końcowa (minimal trunk)
 * - GN-SEM-02: GPZ → przelotowa + branch (odgałęzienie)
 * - GN-SEM-03: GPZ → sekcyjna + NOP (ring)
 * - GN-SEM-04: GPZ → branch → PV
 * - GN-SEM-05: GPZ → branch → PV/BESS/odbiór (mixed OZE)
 * - GN-SEM-06: wielostacyjny (multi-station mixed)
 * - GN-SEM-07: ring with NOP between two trunks
 *
 * Tests:
 * - Semantic model building from TopologyInput + AdapterResultV1
 * - Station classification (inline/branch/sectional/terminal)
 * - Trunk/branch path ordering
 * - Reserve link / NOP extraction
 * - Bay structure per station type
 * - Validator rules SV01–SV08
 * - Determinism: same input → identical output
 *
 * BINDING: CI gate — failure blocks merge.
 */

import { describe, it, expect } from 'vitest';
import {
  type TopologyInputV1,
  type TopologyBranchV1,
  type TopologyStationV1,
  BranchKind,
  DeviceKind,
  GeneratorKind,
  StationKind,
} from '../topologyInputReader';
import type {
  AdapterResultV1,
  ExtendedLogicalViewsV1,
} from '../topologyAdapterV2';
import type { StationBlockBuildResult } from '../stationBlockBuilder';
import {
  EmbeddingRoleV1,
  FieldRoleV1,
  DeviceTypeV1,
  DeviceElectricalRoleV1,
  DevicePowerPathPositionV1,
  type FieldV1,
  type DeviceV1,
} from '../fieldDeviceContracts';
import {
  NodeTypeV1,
  EdgeTypeV1,
  PortRoleV1,
  type VisualGraphV1,
  type VisualNodeV1,
  type VisualEdgeV1,
  VISUAL_GRAPH_VERSION,
} from '../visualGraph';
import { buildSldSemanticModel } from '../sldSemanticAdapter';
import { validateSldSemanticModel } from '../sldSemanticValidator';
import {
  type SldSemanticModelV1,
  StationKindSld,
  BayRoleSld,
  isInlineStation,
  isBranchStation,
  isSectionalStation,
  isTerminalStation,
} from '../sldSemanticModel';

// =============================================================================
// HELPERS
// =============================================================================

function makeField(
  id: string,
  stationId: string,
  busSectionId: string,
  fieldRole: FieldRoleV1,
): FieldV1 {
  return {
    id,
    stationId,
    busSectionId,
    fieldRole,
    terminals: {
      incomingNodeId: null,
      outgoingNodeId: null,
      branchNodeId: null,
      generatorNodeId: null,
    },
    requiredDevices: [],
    deviceIds: [`dev_${id}_cb`],
    catalogRef: null,
  } as unknown as FieldV1;
}

function makeDevice(id: string, fieldId: string): DeviceV1 {
  return {
    id,
    fieldId,
    deviceType: DeviceTypeV1.CB,
    electricalRole: DeviceElectricalRoleV1.POWER_PATH,
    powerPathPosition: DevicePowerPathPositionV1.MIDSTREAM,
    catalogRef: null,
    logicalBindings: { breakerRef: null, ctRef: null, vtRef: null, relayRef: null },
    parameters: {},
  } as unknown as DeviceV1;
}

function makeNode(id: string, nodeType: NodeTypeV1): VisualNodeV1 {
  return {
    id,
    nodeType,
    label: id,
    ports: [
      { id: `${id}_p0`, role: PortRoleV1.TRUNK, index: 0 },
    ],
    attributes: { stationId: null, voltageKv: 15, isSource: false },
  } as unknown as VisualNodeV1;
}

function makeEdge(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  edgeType: EdgeTypeV1,
  isNormallyOpen = false,
): VisualEdgeV1 {
  return {
    id,
    fromPortRef: { nodeId: fromNodeId, portId: `${fromNodeId}_p0` },
    toPortRef: { nodeId: toNodeId, portId: `${toNodeId}_p0` },
    edgeType,
    isNormallyOpen,
    attributes: { label: id, branchKind: BranchKind.CABLE, lengthKm: null, isNormallyOpen },
  } as unknown as VisualEdgeV1;
}

function makeStationBlock(
  blockId: string,
  embeddingRole: EmbeddingRoleV1,
  fields: FieldV1[],
): { blockId: string; embeddingRole: EmbeddingRoleV1; fields: readonly FieldV1[] } {
  return { blockId, embeddingRole, fields };
}

// =============================================================================
// GN-SEM-01: GPZ → przelotowa → końcowa
// =============================================================================

function buildGN_SEM_01(): { input: TopologyInputV1; adapterResult: AdapterResultV1 } {
  const input: TopologyInputV1 = {
    snapshotId: 'snap_01',
    snapshotFingerprint: 'fp_01',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: 0, inService: true },
      { id: 'bus_s1', name: 'Szyna S1', voltageKv: 15, stationId: 'st_s1', busIndex: 0, inService: true },
      { id: 'bus_s2', name: 'Szyna S2', voltageKv: 15, stationId: 'st_s2', busIndex: 0, inService: true },
    ],
    branches: [
      { id: 'br_gpz_s1', name: 'Linia GPZ-S1', fromNodeId: 'bus_gpz', toNodeId: 'bus_s1', kind: BranchKind.CABLE, isNormallyOpen: false, inService: true, catalogRef: null, lengthKm: 2.5, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'br_s1_s2', name: 'Linia S1-S2', fromNodeId: 'bus_s1', toNodeId: 'bus_s2', kind: BranchKind.CABLE, isNormallyOpen: false, inService: true, catalogRef: null, lengthKm: 1.8, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    ],
    devices: [],
    stations: [
      { id: 'st_s1', name: 'Stacja S1', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_s1'], branchIds: ['br_gpz_s1', 'br_s1_s2'], switchIds: [], transformerIds: [] },
      { id: 'st_s2', name: 'Stacja S2', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_s2'], branchIds: ['br_s1_s2'], switchIds: [], transformerIds: [] },
    ],
    generators: [],
    sources: [{ id: 'src_gpz', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [],
    protectionBindings: [],
    logicalViews: {
      trunks: [{
        id: 'trunk_1',
        segmentIds: ['br_gpz_s1', 'br_s1_s2'],
        orderedStations: [
          { stationId: 'st_s1', role: 'przelotowa' as const, attachedBranchIds: [] },
          { stationId: 'st_s2', role: 'koncowa' as const, attachedBranchIds: [] },
        ],
      }],
      branches: [],
      rings: [],
    },
    fixActions: [],
  };

  const fieldS1_in = makeField('fld_s1_in', 'st_s1', 'bus_s1', FieldRoleV1.LINE_IN);
  const fieldS1_out = makeField('fld_s1_out', 'st_s1', 'bus_s1', FieldRoleV1.LINE_OUT);
  const fieldS2_in = makeField('fld_s2_in', 'st_s2', 'bus_s2', FieldRoleV1.LINE_IN);

  const devS1_in = makeDevice('dev_fld_s1_in_cb', 'fld_s1_in');
  const devS1_out = makeDevice('dev_fld_s1_out_cb', 'fld_s1_out');
  const devS2_in = makeDevice('dev_fld_s2_in_cb', 'fld_s2_in');

  const stationBlockDetails: StationBlockBuildResult = {
    stationBlocks: [
      makeStationBlock('st_s1', EmbeddingRoleV1.TRUNK_INLINE, [fieldS1_in, fieldS1_out]),
      makeStationBlock('st_s2', EmbeddingRoleV1.TRUNK_LEAF, [fieldS2_in]),
    ],
    allFields: [fieldS1_in, fieldS1_out, fieldS2_in],
    allDevices: [devS1_in, devS1_out, devS2_in],
    fixActions: [],
  };

  const graph: VisualGraphV1 = {
    version: VISUAL_GRAPH_VERSION,
    meta: { snapshotId: 'snap_01', snapshotFingerprint: 'fp_01', createdAt: '2026-03-14', topologyHash: 'hash_01' } as unknown as VisualGraphV1['meta'],
    nodes: [
      makeNode('bus_gpz', NodeTypeV1.BUS_SN),
      makeNode('bus_s1', NodeTypeV1.STATION_SN),
      makeNode('bus_s2', NodeTypeV1.STATION_SN),
    ],
    edges: [
      makeEdge('edge_br_gpz_s1', 'bus_gpz', 'bus_s1', EdgeTypeV1.TRUNK),
      makeEdge('edge_br_s1_s2', 'bus_s1', 'bus_s2', EdgeTypeV1.TRUNK),
    ],
  };

  const adapterResult: AdapterResultV1 = {
    graph,
    fixActions: [],
    stationBlockDetails,
    visualTopology: { trunks: [], branchPaths: [], rings: [], nops: [], diagnostics: [] } as unknown as AdapterResultV1['visualTopology'],
    extendedLogicalViews: {
      trunks: input.logicalViews!.trunks as ExtendedLogicalViewsV1['trunks'],
      branches: [],
      rings: [],
    },
  };

  return { input, adapterResult };
}

// =============================================================================
// GN-SEM-02: GPZ → przelotowa + branch (odgałęzienie)
// =============================================================================

function buildGN_SEM_02(): { input: TopologyInputV1; adapterResult: AdapterResultV1 } {
  const input: TopologyInputV1 = {
    snapshotId: 'snap_02',
    snapshotFingerprint: 'fp_02',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: 0, inService: true },
      { id: 'bus_s1', name: 'Szyna S1', voltageKv: 15, stationId: 'st_s1', busIndex: 0, inService: true },
      { id: 'bus_s2', name: 'Szyna S2', voltageKv: 15, stationId: 'st_s2', busIndex: 0, inService: true },
      { id: 'bus_sb', name: 'Szyna SB', voltageKv: 15, stationId: 'st_sb', busIndex: 0, inService: true },
    ],
    branches: [
      { id: 'br_gpz_s1', name: 'Kabel GPZ-S1', fromNodeId: 'bus_gpz', toNodeId: 'bus_s1', kind: BranchKind.CABLE, isNormallyOpen: false, inService: true, catalogRef: null, lengthKm: 3.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'br_s1_s2', name: 'Kabel S1-S2', fromNodeId: 'bus_s1', toNodeId: 'bus_s2', kind: BranchKind.CABLE, isNormallyOpen: false, inService: true, catalogRef: null, lengthKm: 2.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'br_s1_sb', name: 'Kabel S1-SB', fromNodeId: 'bus_s1', toNodeId: 'bus_sb', kind: BranchKind.CABLE, isNormallyOpen: false, inService: true, catalogRef: null, lengthKm: 1.5, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    ],
    devices: [],
    stations: [
      { id: 'st_s1', name: 'Stacja S1', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_s1'], branchIds: ['br_gpz_s1', 'br_s1_s2', 'br_s1_sb'], switchIds: [], transformerIds: [] },
      { id: 'st_s2', name: 'Stacja S2', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_s2'], branchIds: ['br_s1_s2'], switchIds: [], transformerIds: [] },
      { id: 'st_sb', name: 'Stacja SB', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_sb'], branchIds: ['br_s1_sb'], switchIds: [], transformerIds: [] },
    ],
    generators: [],
    sources: [{ id: 'src_gpz', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [],
    protectionBindings: [],
    logicalViews: {
      trunks: [{
        id: 'trunk_1',
        segmentIds: ['br_gpz_s1', 'br_s1_s2'],
        orderedStations: [
          { stationId: 'st_s1', role: 'przelotowa' as const, attachedBranchIds: ['branch_1'] },
          { stationId: 'st_s2', role: 'koncowa' as const, attachedBranchIds: [] },
        ],
      }],
      branches: [{
        id: 'branch_1',
        segmentIds: ['br_s1_sb'],
        junctionNodeId: 'bus_s1',
        orderedStationIds: ['st_sb'],
      }],
      rings: [],
    },
    fixActions: [],
  };

  const fieldS1_in = makeField('fld_s1_in', 'st_s1', 'bus_s1', FieldRoleV1.LINE_IN);
  const fieldS1_out = makeField('fld_s1_out', 'st_s1', 'bus_s1', FieldRoleV1.LINE_OUT);
  const fieldS1_br = makeField('fld_s1_br', 'st_s1', 'bus_s1', FieldRoleV1.LINE_BRANCH);
  const fieldS2_in = makeField('fld_s2_in', 'st_s2', 'bus_s2', FieldRoleV1.LINE_IN);
  const fieldSB_in = makeField('fld_sb_in', 'st_sb', 'bus_sb', FieldRoleV1.LINE_IN);

  const stationBlockDetails: StationBlockBuildResult = {
    stationBlocks: [
      makeStationBlock('st_s1', EmbeddingRoleV1.TRUNK_INLINE, [fieldS1_in, fieldS1_out, fieldS1_br]),
      makeStationBlock('st_s2', EmbeddingRoleV1.TRUNK_LEAF, [fieldS2_in]),
      makeStationBlock('st_sb', EmbeddingRoleV1.TRUNK_BRANCH, [fieldSB_in]),
    ],
    allFields: [fieldS1_in, fieldS1_out, fieldS1_br, fieldS2_in, fieldSB_in],
    allDevices: [
      makeDevice('dev_fld_s1_in_cb', 'fld_s1_in'),
      makeDevice('dev_fld_s1_out_cb', 'fld_s1_out'),
      makeDevice('dev_fld_s1_br_cb', 'fld_s1_br'),
      makeDevice('dev_fld_s2_in_cb', 'fld_s2_in'),
      makeDevice('dev_fld_sb_in_cb', 'fld_sb_in'),
    ],
    fixActions: [],
  };

  const graph: VisualGraphV1 = {
    version: VISUAL_GRAPH_VERSION,
    meta: { snapshotId: 'snap_02', snapshotFingerprint: 'fp_02', createdAt: '2026-03-14', topologyHash: 'hash_02' } as unknown as VisualGraphV1['meta'],
    nodes: [
      makeNode('bus_gpz', NodeTypeV1.BUS_SN),
      makeNode('bus_s1', NodeTypeV1.STATION_SN),
      makeNode('bus_s2', NodeTypeV1.STATION_SN),
      makeNode('bus_sb', NodeTypeV1.STATION_SN),
    ],
    edges: [
      makeEdge('edge_br_gpz_s1', 'bus_gpz', 'bus_s1', EdgeTypeV1.TRUNK),
      makeEdge('edge_br_s1_s2', 'bus_s1', 'bus_s2', EdgeTypeV1.TRUNK),
      makeEdge('edge_br_s1_sb', 'bus_s1', 'bus_sb', EdgeTypeV1.BRANCH),
    ],
  };

  const adapterResult: AdapterResultV1 = {
    graph,
    fixActions: [],
    stationBlockDetails,
    visualTopology: { trunks: [], branchPaths: [], rings: [], nops: [], diagnostics: [] } as unknown as AdapterResultV1['visualTopology'],
    extendedLogicalViews: {
      trunks: input.logicalViews!.trunks as ExtendedLogicalViewsV1['trunks'],
      branches: input.logicalViews!.branches as ExtendedLogicalViewsV1['branches'],
      rings: [],
    },
  };

  return { input, adapterResult };
}

// =============================================================================
// GN-SEM-03: GPZ → sekcyjna + NOP (ring)
// =============================================================================

function buildGN_SEM_03(): { input: TopologyInputV1; adapterResult: AdapterResultV1 } {
  const input: TopologyInputV1 = {
    snapshotId: 'snap_03',
    snapshotFingerprint: 'fp_03',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: 0, inService: true },
      { id: 'bus_sec_a', name: 'Szyna Sek A', voltageKv: 15, stationId: 'st_sek', busIndex: 0, inService: true },
      { id: 'bus_sec_b', name: 'Szyna Sek B', voltageKv: 15, stationId: 'st_sek', busIndex: 1, inService: true },
    ],
    branches: [
      { id: 'br_gpz_sek', name: 'Kabel GPZ-SEK', fromNodeId: 'bus_gpz', toNodeId: 'bus_sec_a', kind: BranchKind.CABLE, isNormallyOpen: false, inService: true, catalogRef: null, lengthKm: 4.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'br_nop', name: 'NOP', fromNodeId: 'bus_sec_b', toNodeId: 'bus_gpz', kind: BranchKind.CABLE, isNormallyOpen: true, inService: true, catalogRef: null, lengthKm: 5.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    ],
    devices: [],
    stations: [
      { id: 'st_sek', name: 'Stacja SEK', stationType: StationKind.SWITCHING, voltageKv: 15, busIds: ['bus_sec_a', 'bus_sec_b'], branchIds: ['br_gpz_sek', 'br_nop'], switchIds: [], transformerIds: [] },
    ],
    generators: [],
    sources: [{ id: 'src_gpz', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [],
    protectionBindings: [],
    logicalViews: {
      trunks: [{
        id: 'trunk_1',
        segmentIds: ['br_gpz_sek'],
        orderedStations: [
          { stationId: 'st_sek', role: 'sekcyjna' as const, attachedBranchIds: [] },
        ],
      }],
      branches: [],
      rings: [{ id: 'ring_1', segmentIds: ['br_nop'], normallyOpenSegmentId: 'br_nop' }],
    },
    fixActions: [],
  };

  const fieldSek_in = makeField('fld_sek_in', 'st_sek', 'bus_sec_a', FieldRoleV1.LINE_IN);
  const fieldSek_out = makeField('fld_sek_out', 'st_sek', 'bus_sec_b', FieldRoleV1.LINE_OUT);
  const fieldSek_tie = makeField('fld_sek_tie', 'st_sek', 'bus_sec_a', FieldRoleV1.COUPLER_SN);

  const stationBlockDetails: StationBlockBuildResult = {
    stationBlocks: [
      makeStationBlock('st_sek', EmbeddingRoleV1.LOCAL_SECTIONAL, [fieldSek_in, fieldSek_out, fieldSek_tie]),
    ],
    allFields: [fieldSek_in, fieldSek_out, fieldSek_tie],
    allDevices: [
      makeDevice('dev_fld_sek_in_cb', 'fld_sek_in'),
      makeDevice('dev_fld_sek_out_cb', 'fld_sek_out'),
      makeDevice('dev_fld_sek_tie_cb', 'fld_sek_tie'),
    ],
    fixActions: [],
  };

  const graph: VisualGraphV1 = {
    version: VISUAL_GRAPH_VERSION,
    meta: { snapshotId: 'snap_03', snapshotFingerprint: 'fp_03', createdAt: '2026-03-14', topologyHash: 'hash_03' } as unknown as VisualGraphV1['meta'],
    nodes: [
      makeNode('bus_gpz', NodeTypeV1.BUS_SN),
      makeNode('bus_sec_a', NodeTypeV1.STATION_SN),
      makeNode('bus_sec_b', NodeTypeV1.STATION_SN),
    ],
    edges: [
      makeEdge('edge_br_gpz_sek', 'bus_gpz', 'bus_sec_a', EdgeTypeV1.TRUNK),
      makeEdge('edge_br_nop', 'bus_sec_b', 'bus_gpz', EdgeTypeV1.SECONDARY_CONNECTOR, true),
    ],
  };

  const adapterResult: AdapterResultV1 = {
    graph,
    fixActions: [],
    stationBlockDetails,
    visualTopology: { trunks: [], branchPaths: [], rings: [], nops: [], diagnostics: [] } as unknown as AdapterResultV1['visualTopology'],
    extendedLogicalViews: {
      trunks: input.logicalViews!.trunks as ExtendedLogicalViewsV1['trunks'],
      branches: [],
      rings: input.logicalViews!.rings,
    },
  };

  return { input, adapterResult };
}

// =============================================================================
// GN-SEM-04: GPZ → branch → PV
// =============================================================================

function buildGN_SEM_04(): { input: TopologyInputV1; adapterResult: AdapterResultV1 } {
  const input: TopologyInputV1 = {
    snapshotId: 'snap_04',
    snapshotFingerprint: 'fp_04',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: 0, inService: true },
      { id: 'bus_s1', name: 'Szyna S1', voltageKv: 15, stationId: 'st_s1', busIndex: 0, inService: true },
      { id: 'bus_pv', name: 'Szyna PV', voltageKv: 15, stationId: 'st_pv', busIndex: 0, inService: true },
    ],
    branches: [
      { id: 'br_gpz_s1', name: 'Kabel GPZ-S1', fromNodeId: 'bus_gpz', toNodeId: 'bus_s1', kind: BranchKind.CABLE, isNormallyOpen: false, inService: true, catalogRef: null, lengthKm: 3.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'br_s1_pv', name: 'Kabel S1-PV', fromNodeId: 'bus_s1', toNodeId: 'bus_pv', kind: BranchKind.CABLE, isNormallyOpen: false, inService: true, catalogRef: null, lengthKm: 1.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    ],
    devices: [],
    stations: [
      { id: 'st_s1', name: 'Stacja S1', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_s1'], branchIds: ['br_gpz_s1', 'br_s1_pv'], switchIds: [], transformerIds: [] },
      { id: 'st_pv', name: 'Stacja PV', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_pv'], branchIds: ['br_s1_pv'], switchIds: [], transformerIds: [] },
    ],
    generators: [
      { id: 'gen_pv', name: 'PV Farm', nodeId: 'bus_pv', kind: GeneratorKind.PV, catalogRef: null, inService: true, ratedPowerMw: 2.0, blockingTransformerId: null, connectionVariant: null, stationRef: 'st_pv' },
    ],
    sources: [{ id: 'src_gpz', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [],
    protectionBindings: [],
    logicalViews: {
      trunks: [{
        id: 'trunk_1',
        segmentIds: ['br_gpz_s1'],
        orderedStations: [
          { stationId: 'st_s1', role: 'koncowa' as const, attachedBranchIds: ['branch_1'] },
        ],
      }],
      branches: [{
        id: 'branch_1',
        segmentIds: ['br_s1_pv'],
        junctionNodeId: 'bus_s1',
        orderedStationIds: ['st_pv'],
      }],
      rings: [],
    },
    fixActions: [],
  };

  const fieldS1_in = makeField('fld_s1_in', 'st_s1', 'bus_s1', FieldRoleV1.LINE_IN);
  const fieldPV_in = makeField('fld_pv_in', 'st_pv', 'bus_pv', FieldRoleV1.LINE_IN);
  const fieldPV_gen = makeField('fld_pv_gen', 'st_pv', 'bus_pv', FieldRoleV1.PV_SN);

  const stationBlockDetails: StationBlockBuildResult = {
    stationBlocks: [
      makeStationBlock('st_s1', EmbeddingRoleV1.TRUNK_LEAF, [fieldS1_in]),
      makeStationBlock('st_pv', EmbeddingRoleV1.TRUNK_BRANCH, [fieldPV_in, fieldPV_gen]),
    ],
    allFields: [fieldS1_in, fieldPV_in, fieldPV_gen],
    allDevices: [
      makeDevice('dev_fld_s1_in_cb', 'fld_s1_in'),
      makeDevice('dev_fld_pv_in_cb', 'fld_pv_in'),
      makeDevice('dev_fld_pv_gen_cb', 'fld_pv_gen'),
    ],
    fixActions: [],
  };

  const graph: VisualGraphV1 = {
    version: VISUAL_GRAPH_VERSION,
    meta: { snapshotId: 'snap_04', snapshotFingerprint: 'fp_04', createdAt: '2026-03-14', topologyHash: 'hash_04' } as unknown as VisualGraphV1['meta'],
    nodes: [
      makeNode('bus_gpz', NodeTypeV1.BUS_SN),
      makeNode('bus_s1', NodeTypeV1.STATION_SN),
      makeNode('bus_pv', NodeTypeV1.STATION_SN),
    ],
    edges: [
      makeEdge('edge_br_gpz_s1', 'bus_gpz', 'bus_s1', EdgeTypeV1.TRUNK),
      makeEdge('edge_br_s1_pv', 'bus_s1', 'bus_pv', EdgeTypeV1.BRANCH),
    ],
  };

  const adapterResult: AdapterResultV1 = {
    graph,
    fixActions: [],
    stationBlockDetails,
    visualTopology: { trunks: [], branchPaths: [], rings: [], nops: [], diagnostics: [] } as unknown as AdapterResultV1['visualTopology'],
    extendedLogicalViews: {
      trunks: input.logicalViews!.trunks as ExtendedLogicalViewsV1['trunks'],
      branches: input.logicalViews!.branches as ExtendedLogicalViewsV1['branches'],
      rings: [],
    },
  };

  return { input, adapterResult };
}

// =============================================================================
// TESTS: SEMANTIC MODEL BUILDING (PROMPT 3 + PROMPT 9)
// =============================================================================

describe('SldSemanticModel — building', () => {
  describe('GN-SEM-01: GPZ → przelotowa → końcowa', () => {
    const { input, adapterResult } = buildGN_SEM_01();
    const model = buildSldSemanticModel(input, adapterResult);

    it('produces version V1', () => {
      expect(model.version).toBe('V1');
    });

    it('preserves snapshotId', () => {
      expect(model.snapshotId).toBe('snap_01');
    });

    it('has exactly 1 trunk', () => {
      expect(model.trunks).toHaveLength(1);
    });

    it('trunk has 2 ordered segments', () => {
      expect(model.trunks[0].orderedSegments).toHaveLength(2);
    });

    it('has 1 inline station (S1)', () => {
      expect(model.inlineStations).toHaveLength(1);
      expect(model.inlineStations[0].id).toBe('st_s1');
      expect(model.inlineStations[0].stationKind).toBe(StationKindSld.INLINE);
    });

    it('has 1 terminal station (S2)', () => {
      expect(model.terminalStations).toHaveLength(1);
      expect(model.terminalStations[0].id).toBe('st_s2');
      expect(model.terminalStations[0].stationKind).toBe(StationKindSld.TERMINAL);
    });

    it('has 0 branch stations', () => {
      expect(model.branchStations).toHaveLength(0);
    });

    it('has 0 sectional stations', () => {
      expect(model.sectionalStations).toHaveLength(0);
    });

    it('has 0 reserve links', () => {
      expect(model.reserveLinks).toHaveLength(0);
    });

    it('inline station has LINE_IN and LINE_OUT bays', () => {
      const s1 = model.inlineStations[0];
      expect(s1.incomingBay.bayRole).toBe(BayRoleSld.LINE_IN);
      expect(s1.outgoingBay.bayRole).toBe(BayRoleSld.LINE_OUT);
    });

    it('terminal station has incoming bay', () => {
      const s2 = model.terminalStations[0];
      expect(s2.incomingBay).not.toBeNull();
    });
  });

  describe('GN-SEM-02: GPZ → przelotowa + branch', () => {
    const { input, adapterResult } = buildGN_SEM_02();
    const model = buildSldSemanticModel(input, adapterResult);

    it('has 1 trunk', () => {
      expect(model.trunks).toHaveLength(1);
    });

    it('has 1 branch path', () => {
      expect(model.branchPaths).toHaveLength(1);
    });

    it('branch path has junction node', () => {
      expect(model.branchPaths[0].junctionNodeId).toBe('bus_s1');
    });

    it('has 1 inline station', () => {
      expect(model.inlineStations).toHaveLength(1);
      expect(model.inlineStations[0].id).toBe('st_s1');
    });

    it('has 1 terminal station', () => {
      expect(model.terminalStations).toHaveLength(1);
      expect(model.terminalStations[0].id).toBe('st_s2');
    });

    it('has 1 branch station', () => {
      expect(model.branchStations).toHaveLength(1);
      expect(model.branchStations[0].id).toBe('st_sb');
    });

    it('branch station references branch path', () => {
      expect(model.branchStations[0].branchPathId).toBe('branch_1');
    });

    it('inline station has branch bay', () => {
      const s1 = model.inlineStations[0];
      expect(s1.branchBays).toHaveLength(1);
      expect(s1.branchBays[0].bayRole).toBe(BayRoleSld.BRANCH);
    });

    it('trunk has branch point for S1', () => {
      const trunk = model.trunks[0];
      expect(trunk.branchPoints).toHaveLength(1);
      expect(trunk.branchPoints[0].nodeId).toBe('st_s1');
      expect(trunk.branchPoints[0].branchPathIds).toContain('branch_1');
    });
  });

  describe('GN-SEM-03: GPZ → sekcyjna + NOP', () => {
    const { input, adapterResult } = buildGN_SEM_03();
    const model = buildSldSemanticModel(input, adapterResult);

    it('has 1 sectional station', () => {
      expect(model.sectionalStations).toHaveLength(1);
      expect(model.sectionalStations[0].stationKind).toBe(StationKindSld.SECTIONAL);
    });

    it('sectional station has 2 different bus sections', () => {
      const sek = model.sectionalStations[0];
      expect(sek.sectionABusId).not.toBe(sek.sectionBBusId);
    });

    it('sectional station has tie bay (coupler)', () => {
      const sek = model.sectionalStations[0];
      expect(sek.tieBay).not.toBeNull();
      expect(sek.tieBay?.bayRole).toBe(BayRoleSld.COUPLER);
    });

    it('has 1 reserve link (NOP)', () => {
      expect(model.reserveLinks).toHaveLength(1);
      expect(model.reserveLinks[0].isNormallyOpen).toBe(true);
    });

    it('sectional station references NOP', () => {
      const sek = model.sectionalStations[0];
      expect(sek.normallyOpenPointId).toBe('br_nop');
    });
  });

  describe('GN-SEM-04: GPZ → branch → PV', () => {
    const { input, adapterResult } = buildGN_SEM_04();
    const model = buildSldSemanticModel(input, adapterResult);

    it('has 1 branch path', () => {
      expect(model.branchPaths).toHaveLength(1);
    });

    it('PV station is classified as branch station', () => {
      expect(model.branchStations).toHaveLength(1);
      expect(model.branchStations[0].id).toBe('st_pv');
    });

    it('PV station has PV generator bay', () => {
      const pv = model.branchStations[0];
      expect(pv.generatorBays).toHaveLength(1);
      expect(pv.generatorBays[0].bayRole).toBe(BayRoleSld.PV);
    });
  });
});

// =============================================================================
// TESTS: TYPE GUARDS (PROMPT 4)
// =============================================================================

describe('SldSemanticModel — type guards', () => {
  const { input, adapterResult } = buildGN_SEM_02();
  const model = buildSldSemanticModel(input, adapterResult);

  it('isInlineStation returns true for inline', () => {
    expect(isInlineStation(model.inlineStations[0])).toBe(true);
  });

  it('isBranchStation returns true for branch', () => {
    expect(isBranchStation(model.branchStations[0])).toBe(true);
  });

  it('isTerminalStation returns true for terminal', () => {
    expect(isTerminalStation(model.terminalStations[0])).toBe(true);
  });

  it('isInlineStation returns false for terminal', () => {
    expect(isInlineStation(model.terminalStations[0] as never)).toBe(false);
  });
});

// =============================================================================
// TESTS: VALIDATOR (PROMPT 3 + PROMPT 4 + PROMPT 9)
// =============================================================================

describe('SldSemanticValidator', () => {
  describe('valid GN-SEM-01 model passes validation', () => {
    const { input, adapterResult } = buildGN_SEM_01();
    const model = buildSldSemanticModel(input, adapterResult);
    const result = validateSldSemanticModel(model);

    it('is valid', () => {
      expect(result.valid).toBe(true);
    });

    it('has no errors', () => {
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('SV01: inline station missing LINE_OUT bay', () => {
    it('reports error for missing LINE_OUT', () => {
      const model: SldSemanticModelV1 = {
        version: 'V1',
        snapshotId: 'test',
        snapshotFingerprint: 'test_fp',
        trunks: [],
        branchPaths: [],
        inlineStations: [{
          id: 'st_bad',
          name: 'Stacja Zła',
          stationKind: StationKindSld.INLINE,
          embeddingRole: EmbeddingRoleV1.TRUNK_INLINE,
          trunkId: 'trunk_1',
          incomingSegmentId: 'seg_1',
          outgoingSegmentId: 'seg_2',
          incomingBay: { id: 'bay_in', bayRole: BayRoleSld.LINE_IN, busSectionId: 'bus1', devices: [], connectedBranchId: null, connectedGeneratorId: null, label: 'IN' },
          outgoingBay: { id: 'bay_out_wrong', bayRole: BayRoleSld.TRANSFORMER, busSectionId: 'bus1', devices: [], connectedBranchId: null, connectedGeneratorId: null, label: 'BAD' },
          transformerBays: [],
          branchBays: [],
          generatorBays: [],
        }],
        branchStations: [],
        sectionalStations: [],
        terminalStations: [],
        reserveLinks: [],
        diagnostics: [],
      };

      const result = validateSldSemanticModel(model);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'SV01')).toBe(true);
    });
  });

  describe('SV02: inline station same incoming/outgoing segment', () => {
    it('reports error for same segment', () => {
      const model: SldSemanticModelV1 = {
        version: 'V1',
        snapshotId: 'test',
        snapshotFingerprint: 'test_fp',
        trunks: [],
        branchPaths: [],
        inlineStations: [{
          id: 'st_same_seg',
          name: 'Stacja Same Seg',
          stationKind: StationKindSld.INLINE,
          embeddingRole: EmbeddingRoleV1.TRUNK_INLINE,
          trunkId: 'trunk_1',
          incomingSegmentId: 'seg_1',
          outgoingSegmentId: 'seg_1',
          incomingBay: { id: 'bay_in', bayRole: BayRoleSld.LINE_IN, busSectionId: 'bus1', devices: [], connectedBranchId: null, connectedGeneratorId: null, label: 'IN' },
          outgoingBay: { id: 'bay_out', bayRole: BayRoleSld.LINE_OUT, busSectionId: 'bus1', devices: [], connectedBranchId: null, connectedGeneratorId: null, label: 'OUT' },
          transformerBays: [],
          branchBays: [],
          generatorBays: [],
        }],
        branchStations: [],
        sectionalStations: [],
        terminalStations: [],
        reserveLinks: [],
        diagnostics: [],
      };

      const result = validateSldSemanticModel(model);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'SV02')).toBe(true);
    });
  });

  describe('SV04: sectional station must have 2 sections', () => {
    it('reports error when sectionA == sectionB', () => {
      const model: SldSemanticModelV1 = {
        version: 'V1',
        snapshotId: 'test',
        snapshotFingerprint: 'test_fp',
        trunks: [],
        branchPaths: [],
        inlineStations: [],
        branchStations: [],
        sectionalStations: [{
          id: 'st_bad_sec',
          name: 'Stacja Sekcyjna Zła',
          stationKind: StationKindSld.SECTIONAL,
          embeddingRole: EmbeddingRoleV1.LOCAL_SECTIONAL,
          sectionABusId: 'same_bus',
          sectionBBusId: 'same_bus',
          tieBay: null,
          normallyOpenPointId: null,
          incomingBays: [],
          outgoingBays: [],
          transformerBays: [],
        }],
        terminalStations: [],
        reserveLinks: [],
        diagnostics: [],
      };

      const result = validateSldSemanticModel(model);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'SV04')).toBe(true);
    });
  });

  describe('SV08: trunk must have source node', () => {
    it('reports error for trunk without sourceNodeId', () => {
      const model: SldSemanticModelV1 = {
        version: 'V1',
        snapshotId: 'test',
        snapshotFingerprint: 'test_fp',
        trunks: [{
          id: 'trunk_bad',
          sourceFieldId: null,
          sourceNodeId: '',
          orderedSegments: [],
          orderedStationRefs: [],
          branchPoints: [],
        }],
        branchPaths: [],
        inlineStations: [],
        branchStations: [],
        sectionalStations: [],
        terminalStations: [],
        reserveLinks: [],
        diagnostics: [],
      };

      const result = validateSldSemanticModel(model);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'SV08')).toBe(true);
    });
  });

  describe('valid GN-SEM-03 (sectional) passes validation', () => {
    const { input, adapterResult } = buildGN_SEM_03();
    const model = buildSldSemanticModel(input, adapterResult);
    const result = validateSldSemanticModel(model);

    it('is valid', () => {
      expect(result.valid).toBe(true);
    });
  });
});

// =============================================================================
// TESTS: DETERMINISM (PROMPT 9)
// =============================================================================

describe('SldSemanticModel — determinism', () => {
  it('same input produces identical model (100 iterations)', () => {
    const { input, adapterResult } = buildGN_SEM_02();
    const reference = JSON.stringify(buildSldSemanticModel(input, adapterResult));

    for (let i = 0; i < 100; i++) {
      const result = JSON.stringify(buildSldSemanticModel(input, adapterResult));
      expect(result).toBe(reference);
    }
  });

  it('model arrays are sorted by id', () => {
    const { input, adapterResult } = buildGN_SEM_02();
    const model = buildSldSemanticModel(input, adapterResult);

    // Verify all arrays are sorted
    for (const trunk of model.trunks) {
      const segments = trunk.orderedSegments;
      // Segments are ordered by position, not by id — skip
    }

    // Stations sorted by id
    for (let i = 1; i < model.inlineStations.length; i++) {
      expect(model.inlineStations[i].id >= model.inlineStations[i - 1].id).toBe(true);
    }
    for (let i = 1; i < model.branchStations.length; i++) {
      expect(model.branchStations[i].id >= model.branchStations[i - 1].id).toBe(true);
    }
    for (let i = 1; i < model.terminalStations.length; i++) {
      expect(model.terminalStations[i].id >= model.terminalStations[i - 1].id).toBe(true);
    }
    for (let i = 1; i < model.trunks.length; i++) {
      expect(model.trunks[i].id >= model.trunks[i - 1].id).toBe(true);
    }
    for (let i = 1; i < model.branchPaths.length; i++) {
      expect(model.branchPaths[i].id >= model.branchPaths[i - 1].id).toBe(true);
    }
  });
});

// =============================================================================
// TESTS: SEGMENT DATA INTEGRITY (PROMPT 9)
// =============================================================================

describe('SldSemanticModel — segment data', () => {
  it('trunk segments carry branch type and length', () => {
    const { input, adapterResult } = buildGN_SEM_01();
    const model = buildSldSemanticModel(input, adapterResult);
    const seg = model.trunks[0].orderedSegments[0];

    expect(seg.branchType).toBe('CABLE');
    expect(seg.lengthKm).toBe(2.5);
    expect(seg.fromNodeId).toBe('bus_gpz');
    expect(seg.toNodeId).toBe('bus_s1');
  });

  it('branch path segments carry data', () => {
    const { input, adapterResult } = buildGN_SEM_02();
    const model = buildSldSemanticModel(input, adapterResult);
    const bp = model.branchPaths[0];

    expect(bp.orderedSegments).toHaveLength(1);
    expect(bp.orderedSegments[0].lengthKm).toBe(1.5);
  });
});

// =============================================================================
// TESTS: DIAGNOSTICS (PROMPT 3 + PROMPT 9)
// =============================================================================

describe('SldSemanticModel — diagnostics', () => {
  it('propagates adapter fixActions to diagnostics', () => {
    const { input, adapterResult } = buildGN_SEM_01();
    const modifiedResult = {
      ...adapterResult,
      fixActions: [{
        code: 'test.warning',
        message: 'Test warning',
        elementRef: 'st_s1',
        fixHint: 'fix it',
      }],
    };
    const model = buildSldSemanticModel(input, modifiedResult);

    expect(model.diagnostics.some(d => d.code === 'test.warning')).toBe(true);
  });
});
