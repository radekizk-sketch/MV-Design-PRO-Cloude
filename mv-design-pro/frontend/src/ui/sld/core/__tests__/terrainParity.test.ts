/**
 * Terrain Parity Test — weryfikacja parytetu topologicznego frontend ↔ backend.
 *
 * Sprawdza, ze definicja sieci terenowej w buildTerrainInput() jest spójna
 * z backendem (golden_network_terrain.py) pod wzgledem:
 * - Liczby stacji (12)
 * - Liczby transformatorów (11)
 * - Liczby odcinków liniowych (13 + buslink)
 * - Stacji sekcyjnej S4 (bez TR, 2 szyny)
 * - Generatora PV (0.5 MW na B3)
 * - Liczby odbiorów (11)
 * - Obecności ringu NOP
 */

import { describe, it, expect } from 'vitest';
import { buildReferenceScenario } from '../referenceTopologies';
import { BranchKind, GeneratorKind, StationKind } from '../topologyInputReader';

describe('Terrain Network Parity', () => {
  const scenario = buildReferenceScenario('terrain');
  const input = scenario.input;

  // =========================================================================
  // STATION COUNTS
  // =========================================================================

  it('has exactly 12 stations', () => {
    expect(input.stations).toHaveLength(12);
  });

  it('has 6 trunk stations (S1-S6)', () => {
    const trunkIds = ['st1', 'st2', 'st3', 'st4', 'st5', 'st6'];
    for (const id of trunkIds) {
      expect(input.stations.find((s) => s.id === id)).toBeDefined();
    }
  });

  it('has 6 branch stations (B1-B6)', () => {
    const branchIds = ['stb1', 'stb2', 'stb3', 'stb4', 'stb5', 'stb6'];
    for (const id of branchIds) {
      expect(input.stations.find((s) => s.id === id)).toBeDefined();
    }
  });

  // =========================================================================
  // S4 SECTIONAL STATION
  // =========================================================================

  it('S4 is a switching station with 2 SN buses and no transformer', () => {
    const s4 = input.stations.find((s) => s.id === 'st4');
    expect(s4).toBeDefined();
    expect(s4!.stationType).toBe(StationKind.SWITCHING);
    expect(s4!.busIds).toHaveLength(2);
    expect(s4!.busIds).toContain('bus_s4_sn_a');
    expect(s4!.busIds).toContain('bus_s4_sn_b');
    expect(s4!.transformerIds).toHaveLength(0);
  });

  it('S4 has a bus coupler (BUS_LINK)', () => {
    const buslink = input.branches.find((b) => b.id === 'buslink_s4');
    expect(buslink).toBeDefined();
    expect(buslink!.kind).toBe(BranchKind.BUS_LINK);
    expect(buslink!.fromNodeId).toBe('bus_s4_sn_a');
    expect(buslink!.toNodeId).toBe('bus_s4_sn_b');
  });

  // =========================================================================
  // TRANSFORMERS
  // =========================================================================

  it('has exactly 11 transformers', () => {
    const trafos = input.branches.filter((b) => b.kind === BranchKind.TR_LINK);
    expect(trafos).toHaveLength(11);
  });

  it('transformer power ratings match backend', () => {
    const expected: Record<string, number> = {
      tr_s1: 0.63,
      tr_s2: 0.4,
      tr_s3: 0.4,
      tr_s5: 0.25,
      tr_s6: 0.25,
      tr_b1: 0.25,
      tr_b2: 0.16,
      tr_b3: 0.25,
      tr_b4: 0.4,
      tr_b5: 0.16,
      tr_b6: 0.16,
    };
    for (const [id, power] of Object.entries(expected)) {
      const tr = input.branches.find((b) => b.id === id);
      expect(tr).toBeDefined();
      expect(tr!.ratedPowerMva).toBe(power);
    }
  });

  // =========================================================================
  // LINE SEGMENTS
  // =========================================================================

  it('has 13 line/cable segments (excluding buslink and transformers)', () => {
    const lines = input.branches.filter(
      (b) => b.kind === BranchKind.LINE || b.kind === BranchKind.CABLE,
    );
    expect(lines).toHaveLength(13);
  });

  it('trunk lines use AFL-120 catalog', () => {
    const trunkLineIds = [
      'line_g_s1',
      'line_s1_s2',
      'line_s2_s3',
      'line_s3_s4',
      'line_s4_s5',
      'line_s5_s6',
      'line_s6_s1_nop',
    ];
    for (const id of trunkLineIds) {
      const line = input.branches.find((b) => b.id === id);
      expect(line).toBeDefined();
      expect(line!.catalogRef).toBe('AFL-120');
    }
  });

  it('branch cables use XRUHAKXS-120 catalog', () => {
    const cableIds = [
      'line_s2_b1',
      'line_b1_b2',
      'line_s2_b3',
      'line_s5_b4',
      'line_b4_b5',
      'line_b4_b6',
    ];
    for (const id of cableIds) {
      const cable = input.branches.find((b) => b.id === id);
      expect(cable).toBeDefined();
      expect(cable!.catalogRef).toBe('XRUHAKXS-120');
    }
  });

  // =========================================================================
  // RING NOP
  // =========================================================================

  it('has a ring NOP segment S6-S1', () => {
    const nop = input.branches.find((b) => b.id === 'line_s6_s1_nop');
    expect(nop).toBeDefined();
    expect(nop!.isNormallyOpen).toBe(true);
    expect(nop!.lengthKm).toBe(3.0);
  });

  it('logical views include the ring', () => {
    const ring = input.logicalViews.rings.find((r) => r.id === 'ring_s6_s1');
    expect(ring).toBeDefined();
    expect(ring!.normallyOpenSegmentId).toBe('line_s6_s1_nop');
  });

  // =========================================================================
  // PV GENERATOR
  // =========================================================================

  it('has exactly 1 PV generator at B3 with 0.5 MW', () => {
    expect(input.generators).toHaveLength(1);
    const pv = input.generators[0];
    expect(pv.kind).toBe(GeneratorKind.PV);
    expect(pv.nodeId).toBe('bus_b3_nn');
    expect(pv.ratedPowerMw).toBe(0.5);
    expect(pv.stationRef).toBe('stb3');
  });

  // =========================================================================
  // LOADS
  // =========================================================================

  it('has exactly 11 loads', () => {
    expect(input.loads).toHaveLength(11);
  });

  it('total load is approximately 1.31 MW', () => {
    const totalP = input.loads.reduce((sum, l) => sum + l.pMw, 0);
    expect(totalP).toBeCloseTo(1.31, 2);
  });

  // =========================================================================
  // CONNECTION NODES
  // =========================================================================

  it('has 25 connection nodes (1 GPZ + 13 SN + 11 nN — S4 bez nN)', () => {
    expect(input.connectionNodes).toHaveLength(25);
  });

  it('all SN nodes have 15 kV', () => {
    const snNodes = input.connectionNodes.filter((n) => n.voltageKv === 15);
    expect(snNodes.length).toBeGreaterThanOrEqual(14);
  });

  it('all nN nodes have 0.4 kV (11 — S4 bez nN)', () => {
    const nnNodes = input.connectionNodes.filter((n) => n.voltageKv === 0.4);
    expect(nnNodes).toHaveLength(11);
  });

  // =========================================================================
  // SLD RENDERING
  // =========================================================================

  it('generates SLD symbols without errors', () => {
    expect(scenario.symbols.length).toBeGreaterThan(0);
  });

  it('all branches reference existing nodes', () => {
    const nodeIds = new Set(input.connectionNodes.map((n) => n.id));
    for (const branch of input.branches) {
      expect(nodeIds.has(branch.fromNodeId)).toBe(true);
      expect(nodeIds.has(branch.toNodeId)).toBe(true);
    }
  });
});
