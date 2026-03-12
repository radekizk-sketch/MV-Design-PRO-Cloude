import { describe, it, expect } from 'vitest';
import { buildVisualGraphFromTopology } from '../topologyAdapterV2';
import { BranchKind, StationKind, type TopologyInputV1 } from '../topologyInputReader';

function buildMainPattern(): TopologyInputV1 {
  return {
    snapshotId: 'main-pattern',
    snapshotFingerprint: 'main-pattern-hash',
    connectionNodes: [
      { id: 'bus_gpz', name: 'Szyna GPZ', voltageKv: 15, stationId: null, busIndex: null, inService: true },
      { id: 'bus_st1', name: 'Szyna ST1', voltageKv: 15, stationId: 'st1', busIndex: null, inService: true },
      { id: 'bus_st2', name: 'Szyna ST2', voltageKv: 15, stationId: 'st2', busIndex: null, inService: true },
      { id: 'bus_st3', name: 'Szyna ST3', voltageKv: 15, stationId: 'st3', busIndex: null, inService: true },
      { id: 'bus_st4', name: 'Szyna ST4', voltageKv: 15, stationId: 'st4', busIndex: null, inService: true },
      { id: 'bus_nn1', name: 'Szyna nN ST1', voltageKv: 0.4, stationId: null, busIndex: null, inService: true },
      { id: 'bus_nn2', name: 'Szyna nN ST2', voltageKv: 0.4, stationId: null, busIndex: null, inService: true },
      { id: 'bus_nn3', name: 'Szyna nN ST3', voltageKv: 0.4, stationId: null, busIndex: null, inService: true },
      { id: 'bus_st4_b', name: 'Szyna ST4-B', voltageKv: 15, stationId: 'st4', busIndex: null, inService: true },
      { id: 'bus_nn4', name: 'Szyna nN ST4', voltageKv: 0.4, stationId: null, busIndex: null, inService: true },
    ],
    branches: [
      { id: 'line_1', name: 'Tok główny 1', fromNodeId: 'bus_gpz', toNodeId: 'bus_st1', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL', lengthKm: 2, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_2', name: 'Tok główny 2', fromNodeId: 'bus_st1', toNodeId: 'bus_st2', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL', lengthKm: 2, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_3', name: 'Tok główny 3', fromNodeId: 'bus_st2', toNodeId: 'bus_st3', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL', lengthKm: 2, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_branch', name: 'Odgałęzienie', fromNodeId: 'bus_st2', toNodeId: 'bus_st4', kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL', lengthKm: 1.2, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'line_ring_nop', name: 'Ring NOP', fromNodeId: 'bus_st3', toNodeId: 'bus_st4', kind: BranchKind.LINE, isNormallyOpen: true, inService: true, catalogRef: 'AFL', lengthKm: 0.8, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'coupler_st4', name: 'Sprzęgło ST4', fromNodeId: 'bus_st4', toNodeId: 'bus_st4_b', kind: BranchKind.BUS_LINK, isNormallyOpen: false, inService: true, catalogRef: null, lengthKm: null, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: 'tr_1', name: 'TR1', fromNodeId: 'bus_st1', toNodeId: 'bus_nn1', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR', lengthKm: null, ratedPowerMva: 0.4, voltageHvKv: 15, voltageLvKv: 0.4 },
      { id: 'tr_2', name: 'TR2', fromNodeId: 'bus_st2', toNodeId: 'bus_nn2', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR', lengthKm: null, ratedPowerMva: 0.4, voltageHvKv: 15, voltageLvKv: 0.4 },
      { id: 'tr_3', name: 'TR3', fromNodeId: 'bus_st3', toNodeId: 'bus_nn3', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR', lengthKm: null, ratedPowerMva: 0.4, voltageHvKv: 15, voltageLvKv: 0.4 },
      { id: 'tr_4', name: 'TR4', fromNodeId: 'bus_st4', toNodeId: 'bus_nn4', kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR', lengthKm: null, ratedPowerMva: 0.4, voltageHvKv: 15, voltageLvKv: 0.4 },
    ],
    devices: [],
    stations: [
      { id: 'st1', name: 'Stacja przelotowa 1', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_st1'], branchIds: [], switchIds: [], transformerIds: ['tr_1'] },
      { id: 'st2', name: 'Stacja odgałęźna', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_st2'], branchIds: [], switchIds: [], transformerIds: ['tr_2'] },
      { id: 'st3', name: 'Stacja końcowa', stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: ['bus_st3'], branchIds: [], switchIds: [], transformerIds: ['tr_3'] },
      { id: 'st4', name: 'Stacja sekcyjna', stationType: StationKind.SWITCHING, voltageKv: 15, busIds: ['bus_st4', 'bus_st4_b'], branchIds: [], switchIds: [], transformerIds: ['tr_4'] },
    ],
    generators: [],
    sources: [{ id: 'src_gpz', name: 'GPZ', nodeId: 'bus_gpz', inService: true }],
    loads: [],
    protectionBindings: [],
    logicalViews: {
      trunks: [{ id: 'trunk_main', segmentIds: ['line_1', 'line_2', 'line_3'] }],
      branches: [{ id: 'branch_1', segmentIds: ['line_branch'] }],
      rings: [{ id: 'ring_1', segmentIds: ['line_ring_nop'], normallyOpenSegmentId: 'line_ring_nop' }],
    },
    fixActions: [],
  };
}

describe('VisualTopologyContract — model właściwy SLD', () => {
  it('rozdziela klasy bytów: GPZ / szyna / trunk / branch / stacja / ring / NOP', () => {
    const result = buildVisualGraphFromTopology(buildMainPattern());
    const contract = result.visualTopology;

    expect(contract.gpz.length).toBe(1);
    expect(contract.busbarsSn.length).toBeGreaterThanOrEqual(5);
    expect(contract.trunkSegments.map(s => s.domainElementId).sort()).toEqual(['line_1', 'line_2', 'line_3']);
    expect(contract.branchSegments.map(s => s.domainElementId)).toEqual(['line_branch']);
    expect(contract.ringConnectors.map(s => s.domainElementId)).toEqual(['line_ring_nop']);
    expect(contract.nops.map(s => s.segmentId)).toEqual(['line_ring_nop']);
  });

  it('rozróżnia role stacji: przelotowa / odgałęźna / końcowa / sekcyjna', () => {
    const result = buildVisualGraphFromTopology(buildMainPattern());
    const byId = new Map(result.visualTopology.stations.map(s => [s.domainElementId, s.stationRole]));

    expect(byId.get('st1')).toBe('przelotowa');
    expect(byId.get('st2')).toBe('odgalezna');
    expect(byId.get('st3')).toBe('koncowa');
    expect(byId.get('st4')).toBe('sekcyjna');
  });

  it('jest deterministyczny 100x dla tego samego snapshotu', () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      const contract = buildVisualGraphFromTopology(buildMainPattern()).visualTopology;
      hashes.add(JSON.stringify(contract));
    }
    expect(hashes.size).toBe(1);
  });
});
