import type { TopologyInputV1 } from '../topologyInputReader';
import { BranchKind, GeneratorKind, StationKind } from '../topologyInputReader';

export function buildFixtureRadial(): TopologyInputV1 {
  return {
    snapshotId: 'sld-step7-radial',
    snapshotFingerprint: 'step7_radial_fp',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ 15kV', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_st1_sn', name: 'Szyna SN ST1', voltageKv: 15, stationId: 'st1', busIndex: null, inService: true },
      { id: 'bus_st1_nn', name: 'Szyna nN ST1', voltageKv: 0.4, stationId: 'st1', busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_gpz_st1', name: 'Linia GPZ-ST1', fromNodeId: 'bus_gpz', toNodeId: 'bus_st1_sn', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 2, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'tr_st1', name: 'TR ST1', fromNodeId: 'bus_st1_sn', toNodeId: 'bus_st1_nn', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-400', lengthKm: null, ratedPowerMva: 0.4, voltageHvKv: 15, voltageLvKv: 0.4 },
    ],
    devices: [],
    stations: [
      { id: 'st1', name: 'Stacja 1', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_st1_sn', 'bus_st1_nn'], branchIds: [], switchIds: [], transformerIds: ['tr_st1'] },
    ],
    generators: [],
    sources: [{ id: 'src_gpz', name: 'Zasilanie GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [{ id: 'load_st1', name: 'Odbiorca ST1', nodeId: 'bus_st1_nn', inService: true, pMw: 0.2, qMvar: 0.05 }],
    protectionBindings: [],
    fixActions: [],
  };
}

export function buildFixtureRingNop(): TopologyInputV1 {
  return {
    snapshotId: 'sld-step7-ring-nop',
    snapshotFingerprint: 'step7_ring_fp',
    connectionNodes: [
      { id: 'bus_gpz', name: 'GPZ', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_r1', name: 'R1', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_r2', name: 'R2', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_r3', name: 'R3', voltageKv: 15, stationId: null, busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_g_r1', name: 'GPZ-R1', fromNodeId: 'bus_gpz', toNodeId: 'bus_r1', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 1.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_r1_r2', name: 'R1-R2', fromNodeId: 'bus_r1', toNodeId: 'bus_r2', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 1.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_r2_r3', name: 'R2-R3', fromNodeId: 'bus_r2', toNodeId: 'bus_r3', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 1.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'nop_r3_g', name: 'NOP', fromNodeId: 'bus_r3', toNodeId: 'bus_gpz', kind: BranchKind.LINE, isNormallyOpen: true, inService: true, catalogRef: 'AFL-120', lengthKm: 1.2, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
    ],
    devices: [],
    stations: [],
    generators: [],
    sources: [{ id: 'src_gpz', name: 'Zasilanie GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [
      { id: 'load_r2', name: 'Odbiorca R2', nodeId: 'bus_r2', inService: true, pMw: 0.1, qMvar: 0.03 },
      { id: 'load_r3', name: 'Odbiorca R3', nodeId: 'bus_r3', inService: true, pMw: 0.12, qMvar: 0.03 },
    ],
    protectionBindings: [],
    fixActions: [],
  };
}

export function buildFixturePvBess(): TopologyInputV1 {
  return {
    snapshotId: 'sld-step7-pv-bess',
    snapshotFingerprint: 'step7_pvbess_fp',
    connectionNodes: [
      { id: 'bus_gpz', name: 'GPZ', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_sn', name: 'SN', voltageKv: 15, stationId: 'st_oze', busIndex: null, inService: true },
      { id: 'bus_nn', name: 'nN', voltageKv: 0.4, stationId: 'st_oze', busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_g_sn', name: 'GPZ-SN', fromNodeId: 'bus_gpz', toNodeId: 'bus_sn', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-120', lengthKm: 1.5, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'tr_oze', name: 'TR OZE', fromNodeId: 'bus_sn', toNodeId: 'bus_nn', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-630', lengthKm: null, ratedPowerMva: 0.63, voltageHvKv: 15, voltageLvKv: 0.4 },
    ],
    devices: [],
    stations: [
      { id: 'st_oze', name: 'Stacja OZE', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_sn', 'bus_nn'], branchIds: [], switchIds: [], transformerIds: ['tr_oze'] },
    ],
    generators: [
      { id: 'gen_pv', name: 'PV', nodeId: 'bus_nn', kind: GeneratorKind.PV, catalogRef: 'INV-50', inService: true, ratedPowerMw: 0.05, blockingTransformerId: null, connectionVariant: 'nn_side', stationRef: 'st_oze' },
      { id: 'gen_bess', name: 'BESS', nodeId: 'bus_nn', kind: GeneratorKind.BESS, catalogRef: 'PCS-50', inService: true, ratedPowerMw: 0.05, blockingTransformerId: null, connectionVariant: 'nn_side', stationRef: 'st_oze' },
    ],
    sources: [{ id: 'src_gpz', name: 'Zasilanie GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [{ id: 'load_nn', name: 'Odbiorca nN', nodeId: 'bus_nn', inService: true, pMw: 0.16, qMvar: 0.04 }],
    protectionBindings: [],
    fixActions: [],
  };
}
