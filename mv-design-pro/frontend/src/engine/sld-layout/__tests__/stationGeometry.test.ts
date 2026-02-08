/**
 * Station Geometry — testy PR-03.
 *
 * INVARIANTS:
 * - computeStationGeometry: determinizm, poprawne bounding boxy
 * - Trunk path: segmenty w kolejności order
 * - Entry points: markery na stacjach z entry_point_ref
 */

import { describe, it, expect } from 'vitest';
import {
  computeStationGeometry,
  STATION_COLORS,
  TRUNK_PATH_CONFIG,
  type SubstationInput,
  type BayInput,
  type TrunkSegmentInput,
} from '../station-geometry';
import type { Point } from '../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSubstations(): SubstationInput[] {
  return [
    {
      ref_id: 'sub_gpz',
      name: 'GPZ Miasto',
      station_type: 'gpz',
      bus_refs: ['bus_gpz_110', 'bus_gpz_15'],
      entry_point_ref: 'bus_gpz_110',
    },
    {
      ref_id: 'sub_s01',
      name: 'Stacja S01',
      station_type: 'mv_lv',
      bus_refs: ['bus_s01_15', 'bus_s01_04'],
      entry_point_ref: 'bus_s01_15',
    },
    {
      ref_id: 'sub_s02',
      name: 'Stacja S02',
      station_type: 'mv_lv',
      bus_refs: ['bus_s02_15'],
    },
  ];
}

function makeBays(): BayInput[] {
  return [
    { ref_id: 'bay_gpz_in', substation_ref: 'sub_gpz' },
    { ref_id: 'bay_gpz_tr', substation_ref: 'sub_gpz' },
    { ref_id: 'bay_s01_in', substation_ref: 'sub_s01' },
    { ref_id: 'bay_s01_tr', substation_ref: 'sub_s01' },
  ];
}

function makeBusPositions(): Map<string, Point> {
  return new Map([
    ['bus_gpz_110', { x: 400, y: 100 }],
    ['bus_gpz_15', { x: 400, y: 300 }],
    ['bus_s01_15', { x: 800, y: 300 }],
    ['bus_s01_04', { x: 800, y: 500 }],
    ['bus_s02_15', { x: 1200, y: 300 }],
  ]);
}

function makeTrunkSegments(): TrunkSegmentInput[] {
  return [
    {
      branch_ref: 'cab_gpz_s01',
      from_bus_ref: 'bus_gpz_15',
      to_bus_ref: 'bus_s01_15',
      order: 0,
      length_km: 2.1,
    },
    {
      branch_ref: 'cab_s01_s02',
      from_bus_ref: 'bus_s01_15',
      to_bus_ref: 'bus_s02_15',
      order: 1,
      length_km: 1.3,
    },
  ];
}

// ---------------------------------------------------------------------------
// Testy
// ---------------------------------------------------------------------------

describe('computeStationGeometry', () => {
  const substations = makeSubstations();
  const bays = makeBays();
  const busPositions = makeBusPositions();
  const trunkSegments = makeTrunkSegments();

  it('returns station boxes for substations with bus positions', () => {
    const result = computeStationGeometry(substations, bays, busPositions, trunkSegments);
    // sub_gpz has 2 buses with positions, sub_s01 has 2, sub_s02 has 1
    expect(result.stationBoxes.length).toBe(3);
  });

  it('station box has correct type and colors', () => {
    const result = computeStationGeometry(substations, bays, busPositions, trunkSegments);
    const gpzBox = result.stationBoxes.find((b) => b.substationRef === 'sub_gpz');
    expect(gpzBox).toBeDefined();
    expect(gpzBox!.stationType).toBe('gpz');
    expect(gpzBox!.borderColor).toBe(STATION_COLORS.gpz.border);
    expect(gpzBox!.fillColor).toBe(STATION_COLORS.gpz.fill);
  });

  it('station box includes bay count', () => {
    const result = computeStationGeometry(substations, bays, busPositions, trunkSegments);
    const gpzBox = result.stationBoxes.find((b) => b.substationRef === 'sub_gpz');
    expect(gpzBox!.bayCount).toBe(2); // bay_gpz_in + bay_gpz_tr

    const s01Box = result.stationBoxes.find((b) => b.substationRef === 'sub_s01');
    expect(s01Box!.bayCount).toBe(2); // bay_s01_in + bay_s01_tr
  });

  it('station box has minimum dimensions', () => {
    const result = computeStationGeometry(substations, bays, busPositions, trunkSegments, {
      stationMinWidth: 200,
      stationMinHeight: 160,
    });
    for (const box of result.stationBoxes) {
      expect(box.bounds.width).toBeGreaterThanOrEqual(200);
      expect(box.bounds.height).toBeGreaterThanOrEqual(160);
    }
  });

  it('trunk path has correct segment count', () => {
    const result = computeStationGeometry(substations, bays, busPositions, trunkSegments);
    expect(result.trunkPath.length).toBe(2);
  });

  it('trunk segments are in order', () => {
    const result = computeStationGeometry(substations, bays, busPositions, trunkSegments);
    for (let i = 1; i < result.trunkPath.length; i++) {
      expect(result.trunkPath[i].order).toBeGreaterThan(result.trunkPath[i - 1].order);
    }
  });

  it('trunk segments have correct coordinates', () => {
    const result = computeStationGeometry(substations, bays, busPositions, trunkSegments);
    const seg0 = result.trunkPath[0];
    expect(seg0.from.x).toBe(400); // bus_gpz_15
    expect(seg0.from.y).toBe(300);
    expect(seg0.to.x).toBe(800); // bus_s01_15
    expect(seg0.to.y).toBe(300);
  });

  it('entry points exist for stations with entry_point_ref', () => {
    const result = computeStationGeometry(substations, bays, busPositions, trunkSegments);
    // sub_gpz and sub_s01 have entry_point_ref, sub_s02 does not
    expect(result.entryPoints.length).toBe(2);
  });

  it('entry point is at top center of station box', () => {
    const result = computeStationGeometry(substations, bays, busPositions, trunkSegments);
    const gpzEntry = result.entryPoints.find((e) => e.substationRef === 'sub_gpz');
    const gpzBox = result.stationBoxes.find((b) => b.substationRef === 'sub_gpz');
    expect(gpzEntry).toBeDefined();
    expect(gpzBox).toBeDefined();

    // Entry at top center of box
    const expectedX = gpzBox!.bounds.x + gpzBox!.bounds.width / 2;
    expect(gpzEntry!.position.x).toBeCloseTo(expectedX, 0);
    expect(gpzEntry!.position.y).toBe(gpzBox!.bounds.y);
  });

  it('entry point label is in Polish', () => {
    const result = computeStationGeometry(substations, bays, busPositions, trunkSegments);
    for (const entry of result.entryPoints) {
      expect(entry.label).toMatch(/^Wejście:/);
    }
  });
});

describe('STATION_COLORS', () => {
  it('has colors for all station types', () => {
    expect(STATION_COLORS.gpz).toBeDefined();
    expect(STATION_COLORS.mv_lv).toBeDefined();
    expect(STATION_COLORS.switching).toBeDefined();
    expect(STATION_COLORS.customer).toBeDefined();
  });
});

describe('TRUNK_PATH_CONFIG', () => {
  it('has default stroke width', () => {
    expect(TRUNK_PATH_CONFIG.strokeWidth).toBe(4);
  });
});

describe('Determinism', () => {
  it('same input produces identical output', () => {
    const subs = makeSubstations();
    const bays = makeBays();
    const busPos = makeBusPositions();
    const trunk = makeTrunkSegments();

    const r1 = computeStationGeometry(subs, bays, busPos, trunk);
    const r2 = computeStationGeometry(subs, bays, busPos, trunk);

    expect(r1.stationBoxes.length).toBe(r2.stationBoxes.length);
    expect(r1.trunkPath.length).toBe(r2.trunkPath.length);
    expect(r1.entryPoints.length).toBe(r2.entryPoints.length);

    for (let i = 0; i < r1.stationBoxes.length; i++) {
      expect(r1.stationBoxes[i]).toEqual(r2.stationBoxes[i]);
    }
  });
});
