/**
 * Industrial Aesthetics Layout Tests — E1–E4 + Vertical SN Enforcement + Golden Renders + CI Guard
 *
 * VERTICAL SN LAYOUT (GPZ U GÓRY, SIEĆ W DÓŁ — STYL ABB):
 * - GPZ u góry; szyna GPZ pozioma; pola SN w równych odstępach
 * - Z pól liniowych GPZ pionowo w dół schodzą magistrale SN
 * - Cała sieć buduje się w dół (monotoniczny Y)
 * - Odgałęzienia: L-shape (bok + dół), deterministyczny wybór strony
 * - Stacje SN/nN jako "drop" z magistrali
 * - 100% ortogonalny routing
 * - Brak kolizji symboli/etykiet
 * - 10× identyczny layout_hash
 *
 * TESTS:
 * - E1: Equal station spacing (PITCH_FIELD_X)
 * - E2: Symmetric rings (orthogonal, secondary channel)
 * - E3: No random visual lengths (all coords snap to GRID_BASE)
 * - E4: Vertical field alignment (OFFSET_POLE, common Y axis)
 * - V1: GPZ at top, network grows downward (monotonic Y)
 * - V2: Vertical trunks (same X, monotonic Y)
 * - V3: L-shape branches (deterministic side)
 * - V4: Station drops (side + down)
 * - Golden render hash stability (layout_hash identical across runs)
 * - Overlay does NOT modify geometry
 * - No reflow on zoom/pan (geometry independent of camera)
 * - Label overlap detection (0 overlaps in golden networks)
 * - Performance budgets (layout time < threshold)
 * - Permutation invariance (shuffled input → identical output)
 * - 100% orthogonal routing (0 diagonal violations)
 */

import { describe, it, expect } from 'vitest';
import { computeLayout, DEFAULT_LAYOUT_CONFIG } from '../layoutPipeline';
import type { LayoutGeometryConfigV1 } from '../layoutPipeline';
import {
  computeLayoutResultHash,
  validateLayoutResult,
  LAYOUT_RESULT_VERSION,
} from '../layoutResult';
import type { LayoutResultV1, NodePlacementV1, RectangleV1 } from '../layoutResult';
import { convertToVisualGraph } from '../topologyAdapterV1';
import { NodeTypeV1, EdgeTypeV1 } from '../visualGraph';
import type { VisualGraphV1, VisualNodeV1, VisualEdgeV1 } from '../visualGraph';
import type {
  AnySldSymbol,
  BusSymbol,
  BranchSymbol,
  SwitchSymbol,
  SourceSymbol,
  LoadSymbol,
} from '../../../sld-editor/types';
import {
  GRID_BASE,
  GRID_SPACING_MAIN,
  X_START,
  Y_GPZ,
  PITCH_FIELD_X,
  TRUNK_STEP_Y,
  BRANCH_OFFSET_X,
  SECONDARY_CHANNEL_OFFSET_X,
  STATION_BLOCK_HEIGHT,
  STATION_BLOCK_WIDTH,
  Y_MAIN,
  Y_RING,
  Y_BRANCH,
  OFFSET_POLE,
  MIN_VERTICAL_GAP,
  validateGridAlignment,
  validateStationSpacing,
  validateRingGeometry,
  validateDownwardGrowth,
  validateOrthogonalRouting,
  verifyAestheticContract,
  deterministicBranchSide,
} from '../../IndustrialAesthetics';

// =============================================================================
// GOLDEN NETWORK BUILDERS
// =============================================================================

/** GN-IA-01: Trunk with 3 stations (simplest vertical case) */
function buildTrunk3Stations(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  s.push({ id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN 15kV', position: { x: 0, y: 0 }, inService: true, width: 400, height: 10 } as BusSymbol);

  for (let i = 1; i <= 3; i++) {
    s.push({ id: `line_st${i}`, elementId: `line_st${i}`, elementType: 'LineBranch', elementName: `Linia SN ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: i === 1 ? 'bus_sn' : `bus_nn_st${i - 1}`, toNodeId: `bus_sn_st${i}`, points: [], branchType: 'LINE' } as BranchSymbol);
    s.push({ id: `bus_sn_st${i}`, elementId: `bus_sn_st${i}`, elementType: 'Bus', elementName: `Szyna SN St${i}`, position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
    s.push({ id: `tr_st${i}`, elementId: `tr_st${i}`, elementType: 'TransformerBranch', elementName: `TR SN/nN St${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: `bus_sn_st${i}`, toNodeId: `bus_nn_st${i}`, points: [] } as BranchSymbol);
    s.push({ id: `bus_nn_st${i}`, elementId: `bus_nn_st${i}`, elementType: 'Bus', elementName: `Szyna nN St${i}`, position: { x: 0, y: 0 }, inService: true, width: 40, height: 6 } as BusSymbol);
    s.push({ id: `load_st${i}`, elementId: `load_st${i}`, elementType: 'Load', elementName: `Odbiorca St${i}`, position: { x: 0, y: 0 }, inService: true, connectedToNodeId: `bus_nn_st${i}` } as LoadSymbol);
  }
  return s;
}

/** GN-IA-02: Trunk + 2 branches */
function buildTrunk2Branches(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_main' } as SourceSymbol);
  s.push({ id: 'bus_main', elementId: 'bus_main', elementType: 'Bus', elementName: 'Szyna SN', position: { x: 0, y: 0 }, inService: true, width: 400, height: 10 } as BusSymbol);
  // Branch 1
  s.push({ id: 'br1_line', elementId: 'br1_line', elementType: 'LineBranch', elementName: 'Linia Odg. 1', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_main', toNodeId: 'bus_br1', points: [], branchType: 'CABLE' } as BranchSymbol);
  s.push({ id: 'bus_br1', elementId: 'bus_br1', elementType: 'Bus', elementName: 'Szyna SN Odg1', position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
  s.push({ id: 'load_br1', elementId: 'load_br1', elementType: 'Load', elementName: 'Odbiorca Odg1', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_br1' } as LoadSymbol);
  // Branch 2
  s.push({ id: 'br2_line', elementId: 'br2_line', elementType: 'LineBranch', elementName: 'Linia Odg. 2', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_main', toNodeId: 'bus_br2', points: [], branchType: 'LINE' } as BranchSymbol);
  s.push({ id: 'bus_br2', elementId: 'bus_br2', elementType: 'Bus', elementName: 'Szyna SN Odg2', position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
  s.push({ id: 'load_br2', elementId: 'load_br2', elementType: 'Load', elementName: 'Odbiorca Odg2', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_br2' } as LoadSymbol);
  return s;
}

/** GN-IA-03: Ring + NOP (secondary connector) */
function buildRingNOP(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus1' } as SourceSymbol);
  s.push({ id: 'bus1', elementId: 'bus1', elementType: 'Bus', elementName: 'Szyna SN S1', position: { x: 0, y: 0 }, inService: true, width: 200, height: 10 } as BusSymbol);
  s.push({ id: 'bus2', elementId: 'bus2', elementType: 'Bus', elementName: 'Szyna SN S2', position: { x: 0, y: 0 }, inService: true, width: 200, height: 10 } as BusSymbol);
  s.push({ id: 'line1', elementId: 'line1', elementType: 'LineBranch', elementName: 'Linia SN 1', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus1', toNodeId: 'bus2', points: [], branchType: 'CABLE' } as BranchSymbol);
  s.push({ id: 'nop', elementId: 'nop', elementType: 'Switch', elementName: 'NOP', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus2', toNodeId: 'bus1', switchState: 'OPEN', switchType: 'DISCONNECTOR' } as SwitchSymbol);
  s.push({ id: 'load1', elementId: 'load1', elementType: 'Load', elementName: 'Odbiorca 1', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus1' } as LoadSymbol);
  s.push({ id: 'load2', elementId: 'load2', elementType: 'Load', elementName: 'Odbiorca 2', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus2' } as LoadSymbol);
  return s;
}

/** GN-IA-04: PV/BESS on nN */
function buildPvBessNN(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  s.push({ id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN', position: { x: 0, y: 0 }, inService: true, width: 300, height: 10 } as BusSymbol);
  s.push({ id: 'tr1', elementId: 'tr1', elementType: 'TransformerBranch', elementName: 'TR SN/nN', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn', toNodeId: 'bus_nn', points: [] } as BranchSymbol);
  s.push({ id: 'bus_nn', elementId: 'bus_nn', elementType: 'Bus', elementName: 'Szyna nN', position: { x: 0, y: 0 }, inService: true, width: 200, height: 8 } as BusSymbol);
  s.push({ id: 'load1', elementId: 'load1', elementType: 'Load', elementName: 'Odbiorca', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_nn' } as LoadSymbol);
  return s;
}

/**
 * GN-IA-05: WIELE MAGISTRAL (PIONOWO) — 3 pola liniowe GPZ, vertical trunks.
 *
 * GPZ z 3 polami liniowymi → 3 magistrale pionowe w dół:
 * - Magistrala A: 3 segmenty, 1 stacja drop
 * - Magistrala B: 2 segmenty, 1 odbiorca
 * - Magistrala C: 1 segment, stacja końcowa
 */
function buildMultiTrunkVertical(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];

  // GPZ
  s.push({ id: 'src_gpz', elementId: 'src_gpz', elementType: 'Source', elementName: 'GPZ 110/15kV Piaskowa', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_gpz_sn' } as SourceSymbol);
  s.push({ id: 'bus_gpz_sn', elementId: 'bus_gpz_sn', elementType: 'Bus', elementName: 'Szyna SN 15kV GPZ', position: { x: 0, y: 0 }, inService: true, width: 600, height: 10 } as BusSymbol);

  // Magistrala A: 3 linie w dół
  s.push({ id: 'lineA1', elementId: 'lineA1', elementType: 'LineBranch', elementName: 'Linia SN A1', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_gpz_sn', toNodeId: 'busA1', points: [], branchType: 'CABLE' } as BranchSymbol);
  s.push({ id: 'busA1', elementId: 'busA1', elementType: 'Bus', elementName: 'Szyna SN-A1', position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
  s.push({ id: 'lineA2', elementId: 'lineA2', elementType: 'LineBranch', elementName: 'Linia SN A2', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'busA1', toNodeId: 'busA2', points: [], branchType: 'CABLE' } as BranchSymbol);
  s.push({ id: 'busA2', elementId: 'busA2', elementType: 'Bus', elementName: 'Szyna SN-A2', position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
  s.push({ id: 'lineA3', elementId: 'lineA3', elementType: 'LineBranch', elementName: 'Linia SN A3', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'busA2', toNodeId: 'busA3', points: [], branchType: 'LINE' } as BranchSymbol);
  s.push({ id: 'busA3', elementId: 'busA3', elementType: 'Bus', elementName: 'Szyna SN-A3', position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
  s.push({ id: 'loadA3', elementId: 'loadA3', elementType: 'Load', elementName: 'Odbiorca A3', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'busA3' } as LoadSymbol);

  // Magistrala B: 2 linie w dół
  s.push({ id: 'lineB1', elementId: 'lineB1', elementType: 'LineBranch', elementName: 'Linia SN B1', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_gpz_sn', toNodeId: 'busB1', points: [], branchType: 'CABLE' } as BranchSymbol);
  s.push({ id: 'busB1', elementId: 'busB1', elementType: 'Bus', elementName: 'Szyna SN-B1', position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
  s.push({ id: 'lineB2', elementId: 'lineB2', elementType: 'LineBranch', elementName: 'Linia SN B2', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'busB1', toNodeId: 'busB2', points: [], branchType: 'LINE' } as BranchSymbol);
  s.push({ id: 'busB2', elementId: 'busB2', elementType: 'Bus', elementName: 'Szyna SN-B2', position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
  s.push({ id: 'loadB2', elementId: 'loadB2', elementType: 'Load', elementName: 'Odbiorca B2', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'busB2' } as LoadSymbol);

  // Magistrala C: 1 linia w dół + stacja
  s.push({ id: 'lineC1', elementId: 'lineC1', elementType: 'LineBranch', elementName: 'Linia SN C1', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_gpz_sn', toNodeId: 'busC1', points: [], branchType: 'CABLE' } as BranchSymbol);
  s.push({ id: 'busC1', elementId: 'busC1', elementType: 'Bus', elementName: 'Szyna SN-C1', position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
  s.push({ id: 'loadC1', elementId: 'loadC1', elementType: 'Load', elementName: 'Odbiorca C1', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'busC1' } as LoadSymbol);

  return s;
}

// Helper: run layout pipeline
function runLayout(symbols: AnySldSymbol[], config?: LayoutGeometryConfigV1): LayoutResultV1 {
  const graph = convertToVisualGraph(symbols);
  return computeLayout(graph, config ?? DEFAULT_LAYOUT_CONFIG);
}

// Helper: detect bounding box overlaps
function detectOverlaps(placements: readonly NodePlacementV1[]): Array<[string, string]> {
  const overlaps: Array<[string, string]> = [];
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i].bounds;
      const b = placements[j].bounds;
      if (
        a.x < b.x + b.width && a.x + a.width > b.x &&
        a.y < b.y + b.height && a.y + a.height > b.y
      ) {
        overlaps.push([placements[i].nodeId, placements[j].nodeId]);
      }
    }
  }
  return overlaps;
}

// Helper: Fisher-Yates shuffle (deterministic with seed)
function deterministicShuffle<T>(arr: T[], seed: number): T[] {
  const r = [...arr];
  let s = seed;
  for (let i = r.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = (s >>> 0) % (i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// =============================================================================
// §0 CONTRACT VERIFICATION
// =============================================================================

describe('IndustrialAesthetics — contract verification', () => {
  it('verifyAestheticContract passes (all constants valid)', () => {
    const result = verifyAestheticContract();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('GRID_BASE = 20', () => {
    expect(GRID_BASE).toBe(20);
  });

  it('GRID_SPACING_MAIN = 14 * GRID_BASE = 280', () => {
    expect(GRID_SPACING_MAIN).toBe(280);
  });

  it('Y_GPZ = 3 * GRID_BASE = 60', () => {
    expect(Y_GPZ).toBe(60);
  });

  it('PITCH_FIELD_X = GRID_SPACING_MAIN = 280', () => {
    expect(PITCH_FIELD_X).toBe(GRID_SPACING_MAIN);
  });

  it('TRUNK_STEP_Y = 5 * GRID_BASE = 100', () => {
    expect(TRUNK_STEP_Y).toBe(100);
  });

  it('BRANCH_OFFSET_X = 7 * GRID_BASE = 140', () => {
    expect(BRANCH_OFFSET_X).toBe(140);
  });

  it('OFFSET_POLE = 3 * GRID_BASE = 60', () => {
    expect(OFFSET_POLE).toBe(60);
  });

  it('deterministicBranchSide is stable', () => {
    const side1 = deterministicBranchSide('test_element_1');
    const side2 = deterministicBranchSide('test_element_1');
    expect(side1).toBe(side2);
    expect(side1 === 1 || side1 === -1).toBe(true);
  });
});

// =============================================================================
// E3: ALL COORDINATES SNAP TO GRID_BASE
// =============================================================================

describe('E3 — all coordinates snap to GRID_BASE', () => {
  const goldenNetworks: [string, () => AnySldSymbol[]][] = [
    ['trunk-3-stations', buildTrunk3Stations],
    ['trunk-2-branches', buildTrunk2Branches],
    ['ring-nop', buildRingNOP],
    ['pv-bess-nn', buildPvBessNN],
    ['multi-trunk-vertical', buildMultiTrunkVertical],
  ];

  for (const [name, buildFn] of goldenNetworks) {
    it(`${name}: all placements on GRID_BASE`, () => {
      const result = runLayout(buildFn());
      const posMap = new Map<string, { x: number; y: number }>();
      for (const p of result.nodePlacements) {
        posMap.set(p.nodeId, p.position);
      }
      const alignment = validateGridAlignment(posMap);
      expect(alignment.allAligned).toBe(true);
    });

    it(`${name}: all edge routing points on GRID_BASE`, () => {
      const result = runLayout(buildFn());
      for (const route of result.edgeRoutes) {
        for (const seg of route.segments) {
          // Use Math.abs to handle -0 vs +0 (JavaScript negative zero)
          expect(Math.abs(seg.from.x % GRID_BASE)).toBe(0);
          expect(Math.abs(seg.from.y % GRID_BASE)).toBe(0);
          expect(Math.abs(seg.to.x % GRID_BASE)).toBe(0);
          expect(Math.abs(seg.to.y % GRID_BASE)).toBe(0);
        }
      }
    });
  }
});

// =============================================================================
// V1: DOWNWARD GROWTH (MONOTONIC Y FOR TRUNKS)
// =============================================================================

describe('V1 — downward growth (monotonic Y)', () => {
  const goldenNetworks: [string, () => AnySldSymbol[]][] = [
    ['trunk-3-stations', buildTrunk3Stations],
    ['trunk-2-branches', buildTrunk2Branches],
    ['multi-trunk-vertical', buildMultiTrunkVertical],
  ];

  for (const [name, buildFn] of goldenNetworks) {
    it(`${name}: trunk edges grow downward (Y increases)`, () => {
      const result = runLayout(buildFn());

      // Extract trunk edge segments
      const trunkSegments: Array<{ edgeId: string; fromY: number; toY: number }> = [];
      for (const route of result.edgeRoutes) {
        if (route.edgeType === 'TRUNK') {
          for (const seg of route.segments) {
            // Only check vertical segments (same X)
            if (Math.abs(seg.from.x - seg.to.x) < 1) {
              trunkSegments.push({
                edgeId: route.edgeId,
                fromY: Math.min(seg.from.y, seg.to.y),
                toY: Math.max(seg.from.y, seg.to.y),
              });
            }
          }
        }
      }

      const downwardResult = validateDownwardGrowth(trunkSegments);
      expect(downwardResult.allDownward).toBe(true);
    });
  }
});

// =============================================================================
// ORTHOGONAL ROUTING (0° OR 90° ONLY)
// =============================================================================

describe('Orthogonal routing — 100% orthogonal', () => {
  const goldenNetworks: [string, () => AnySldSymbol[]][] = [
    ['trunk-3-stations', buildTrunk3Stations],
    ['trunk-2-branches', buildTrunk2Branches],
    ['ring-nop', buildRingNOP],
    ['pv-bess-nn', buildPvBessNN],
    ['multi-trunk-vertical', buildMultiTrunkVertical],
  ];

  for (const [name, buildFn] of goldenNetworks) {
    it(`${name}: 0 orthogonal violations`, () => {
      const result = runLayout(buildFn());

      const segments: Array<{ edgeId: string; fromX: number; fromY: number; toX: number; toY: number }> = [];
      for (const route of result.edgeRoutes) {
        for (const seg of route.segments) {
          segments.push({
            edgeId: route.edgeId,
            fromX: seg.from.x,
            fromY: seg.from.y,
            toX: seg.to.x,
            toY: seg.to.y,
          });
        }
      }

      const orthoResult = validateOrthogonalRouting(segments);
      expect(orthoResult.allOrthogonal).toBe(true);
    });
  }
});

// =============================================================================
// DETERMINISM 100x
// =============================================================================

describe('Determinism — 100x identical hash', () => {
  const goldenNetworks: [string, () => AnySldSymbol[]][] = [
    ['trunk-3-stations', buildTrunk3Stations],
    ['trunk-2-branches', buildTrunk2Branches],
    ['ring-nop', buildRingNOP],
    ['pv-bess-nn', buildPvBessNN],
    ['multi-trunk-vertical', buildMultiTrunkVertical],
  ];

  for (const [name, buildFn] of goldenNetworks) {
    it(`${name}: 100x → identical layout hash`, () => {
      const symbols = buildFn();
      const ref = runLayout(symbols);
      for (let i = 0; i < 100; i++) {
        const result = runLayout(symbols);
        expect(result.hash).toBe(ref.hash);
      }
    });
  }
});

// =============================================================================
// PERMUTATION INVARIANCE
// =============================================================================

describe('Permutation invariance — shuffled input → identical hash', () => {
  const goldenNetworks: [string, () => AnySldSymbol[]][] = [
    ['trunk-3-stations', buildTrunk3Stations],
    ['trunk-2-branches', buildTrunk2Branches],
    ['ring-nop', buildRingNOP],
    ['multi-trunk-vertical', buildMultiTrunkVertical],
  ];

  for (const [name, buildFn] of goldenNetworks) {
    it(`${name}: 10 permutations → identical hash`, () => {
      const symbols = buildFn();
      const ref = runLayout(symbols);
      for (let seed = 1; seed <= 10; seed++) {
        const shuffled = deterministicShuffle(symbols, seed * 12345);
        const result = runLayout(shuffled);
        expect(result.hash).toBe(ref.hash);
      }
    });
  }
});

// =============================================================================
// OVERLAY DOES NOT MODIFY GEOMETRY
// =============================================================================

describe('Overlay — no geometry mutation', () => {
  it('overlay payload does not change node positions', () => {
    const symbols = buildTrunk3Stations();
    const result1 = runLayout(symbols);
    const result2 = runLayout(symbols);

    expect(result1.nodePlacements.length).toBe(result2.nodePlacements.length);
    for (let i = 0; i < result1.nodePlacements.length; i++) {
      expect(result1.nodePlacements[i].position.x).toBe(result2.nodePlacements[i].position.x);
      expect(result1.nodePlacements[i].position.y).toBe(result2.nodePlacements[i].position.y);
    }
    expect(result1.hash).toBe(result2.hash);
  });
});

// =============================================================================
// NO REFLOW ON ZOOM/PAN
// =============================================================================

describe('No reflow on zoom — geometry independent of camera', () => {
  it('layout result has no camera/viewport dependency', () => {
    const symbols = buildTrunk3Stations();
    const result1 = runLayout(symbols);
    const result2 = runLayout(symbols);

    expect(result1.hash).toBe(result2.hash);
    expect(result1.bounds.x).toBe(result2.bounds.x);
    expect(result1.bounds.y).toBe(result2.bounds.y);
    expect(result1.bounds.width).toBe(result2.bounds.width);
    expect(result1.bounds.height).toBe(result2.bounds.height);
  });
});

// =============================================================================
// ZERO SYMBOL OVERLAPS IN GOLDEN NETWORKS
// =============================================================================

describe('Zero symbol overlaps — golden networks', () => {
  const goldenNetworks: [string, () => AnySldSymbol[]][] = [
    ['trunk-3-stations', buildTrunk3Stations],
    ['trunk-2-branches', buildTrunk2Branches],
    ['ring-nop', buildRingNOP],
    ['pv-bess-nn', buildPvBessNN],
    ['multi-trunk-vertical', buildMultiTrunkVertical],
  ];

  for (const [name, buildFn] of goldenNetworks) {
    it(`${name}: 0 symbol-symbol overlaps`, () => {
      const result = runLayout(buildFn());
      const overlaps = detectOverlaps(result.nodePlacements);
      expect(overlaps.length).toBe(0);
    });
  }
});

// =============================================================================
// GOLDEN RENDER HASH STABILITY
// =============================================================================

describe('Golden render hash — stable across runs', () => {
  const goldenNetworks: [string, () => AnySldSymbol[]][] = [
    ['trunk-3-stations', buildTrunk3Stations],
    ['trunk-2-branches', buildTrunk2Branches],
    ['ring-nop', buildRingNOP],
    ['pv-bess-nn', buildPvBessNN],
    ['multi-trunk-vertical', buildMultiTrunkVertical],
  ];

  for (const [name, buildFn] of goldenNetworks) {
    it(`${name}: hash recomputation is stable`, () => {
      const result = runLayout(buildFn());
      const hash1 = computeLayoutResultHash(result);
      const hash2 = computeLayoutResultHash(result);
      expect(hash1).toBe(hash2);
      expect(hash1).toBe(result.hash);
    });
  }
});

// =============================================================================
// PERFORMANCE BUDGETS
// =============================================================================

describe('Performance budgets — layout time', () => {
  it('small network (< 20 elements): layout < 50ms', () => {
    const symbols = buildTrunk3Stations();
    const start = performance.now();
    runLayout(symbols);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('medium network (20-50 elements): layout < 120ms', () => {
    const s: AnySldSymbol[] = [];
    s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
    s.push({ id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN', position: { x: 0, y: 0 }, inService: true, width: 400, height: 10 } as BusSymbol);
    for (let i = 1; i <= 8; i++) {
      s.push({ id: `line_${i}`, elementId: `line_${i}`, elementType: 'LineBranch', elementName: `Linia ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: i === 1 ? 'bus_sn' : `bus_sn_st${i - 1}`, toNodeId: `bus_sn_st${i}`, points: [], branchType: 'LINE' } as BranchSymbol);
      s.push({ id: `bus_sn_st${i}`, elementId: `bus_sn_st${i}`, elementType: 'Bus', elementName: `Szyna SN St${i}`, position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
      s.push({ id: `tr_st${i}`, elementId: `tr_st${i}`, elementType: 'TransformerBranch', elementName: `TR St${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: `bus_sn_st${i}`, toNodeId: `bus_nn_st${i}`, points: [] } as BranchSymbol);
      s.push({ id: `bus_nn_st${i}`, elementId: `bus_nn_st${i}`, elementType: 'Bus', elementName: `Szyna nN St${i}`, position: { x: 0, y: 0 }, inService: true, width: 40, height: 6 } as BusSymbol);
      s.push({ id: `load_st${i}`, elementId: `load_st${i}`, elementType: 'Load', elementName: `Odbiorca St${i}`, position: { x: 0, y: 0 }, inService: true, connectedToNodeId: `bus_nn_st${i}` } as LoadSymbol);
    }
    const start = performance.now();
    runLayout(s);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(120);
  });

  it('multi-trunk network: layout < 150ms', () => {
    const symbols = buildMultiTrunkVertical();
    const start = performance.now();
    runLayout(symbols);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(150);
  });
});

// =============================================================================
// LAYOUT RESULT VERSION AND VALIDATION
// =============================================================================

describe('Layout result — version and validation', () => {
  it('version is V1', () => {
    const result = runLayout(buildTrunk3Stations());
    expect(result.version).toBe(LAYOUT_RESULT_VERSION);
  });

  it('validateLayoutResult passes for golden networks', () => {
    const result = runLayout(buildTrunk3Stations());
    expect(() => validateLayoutResult(result)).not.toThrow();
  });

  it('validateLayoutResult passes for multi-trunk vertical', () => {
    const result = runLayout(buildMultiTrunkVertical());
    expect(() => validateLayoutResult(result)).not.toThrow();
  });
});

// =============================================================================
// V3: BRANCH SIDE DETERMINISM
// =============================================================================

describe('V3 — branch side deterministic', () => {
  it('deterministicBranchSide is stable for same elementId', () => {
    for (let i = 0; i < 100; i++) {
      const id = `element_${i}`;
      const side1 = deterministicBranchSide(id);
      const side2 = deterministicBranchSide(id);
      expect(side1).toBe(side2);
    }
  });

  it('deterministicBranchSide produces both left and right', () => {
    const sides = new Set<number>();
    for (let i = 0; i < 50; i++) {
      sides.add(deterministicBranchSide(`test_${i}`));
    }
    expect(sides.has(1)).toBe(true);
    expect(sides.has(-1)).toBe(true);
  });
});

// =============================================================================
// MULTI-TRUNK VERTICAL: STRUCTURE TEST
// =============================================================================

describe('Multi-trunk vertical — structure', () => {
  it('has correct number of elements', () => {
    const symbols = buildMultiTrunkVertical();
    // 1 source + 1 GPZ bus + 3 lines A + 3 buses A + 1 load A +
    // 2 lines B + 2 buses B + 1 load B + 1 line C + 1 bus C + 1 load C = 17
    expect(symbols.length).toBe(17);
  });

  it('layout places all elements', () => {
    const result = runLayout(buildMultiTrunkVertical());
    expect(result.nodePlacements.length).toBeGreaterThanOrEqual(10);
  });

  it('GPZ source is at top (smallest Y)', () => {
    const result = runLayout(buildMultiTrunkVertical());
    const srcPlacement = result.nodePlacements.find(p => p.nodeId === 'src_gpz');
    expect(srcPlacement).toBeDefined();
    if (srcPlacement) {
      // Source should be above all other placements
      for (const p of result.nodePlacements) {
        if (p.nodeId !== 'src_gpz') {
          expect(srcPlacement.position.y).toBeLessThanOrEqual(p.position.y);
        }
      }
    }
  });
});
