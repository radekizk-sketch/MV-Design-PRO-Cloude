/**
 * TESTY TCC CHART — Time-Current Characteristic
 *
 * Testy generowania krzywych TCC, mapowania log-scale i markerow zwarciowych.
 *
 * CANONICAL ALIGNMENT:
 * - IEC 60255: Krzywe czasowo-pradowe
 * - WHITE BOX: Wszystkie kroki obliczen sa audytowalne
 *
 * ZAKRES TESTOW:
 * - Generowanie punktow krzywej TCC (DT, IEC_SI, IEC_VI, IEC_EI, IEC_LI)
 * - Mapowanie log-scale (pixel <-> wartosc)
 * - Markery zwarciowe (Ik3, Ik1, Imin)
 * - Deterministycznosc
 */

import { describe, it, expect } from 'vitest';

import {
  buildTCCCurvePoints,
  mapToLogScale,
  mapFromLogScale,
  DEFAULT_TCC_CHART_CONFIG,
} from '../core/tccChart';

import type {
  TCCCurveSettings,
  TCCCurveDataV1,
  TCCFaultMarkerV1,
  TCCCurveType,
  TCCChartConfigV1,
} from '../core/tccChart';

// =============================================================================
// TEST: TCC CURVE POINTS GENERATION
// =============================================================================

describe('TCC Curve Points Generation', () => {
  it('should generate DT curve with constant time', () => {
    const settings: TCCCurveSettings = {
      curve_type: 'DT',
      pickup_a: 100,
      tms: 0.5,
      label: 'Relay R1 (DT)',
    };

    const result = buildTCCCurvePoints(settings);

    expect(result.curve_type).toBe('DT');
    expect(result.pickup_a).toBe(100);
    expect(result.tms).toBe(0.5);
    expect(result.label).toBe('Relay R1 (DT)');
    expect(result.device_ref).toBeNull();

    // DT curve: 2 points with constant time = TMS
    expect(result.points.length).toBe(2);
    for (const point of result.points) {
      expect(point.time_s).toBe(0.5);
      expect(point.current_a).toBeGreaterThan(100);
    }
  });

  it('should generate IEC_SI (Standard Inverse) curve', () => {
    const settings: TCCCurveSettings = {
      curve_type: 'IEC_SI',
      pickup_a: 200,
      tms: 0.3,
      label: 'Relay R2 (SI)',
      num_points: 20,
    };

    const result = buildTCCCurvePoints(settings);

    expect(result.curve_type).toBe('IEC_SI');
    expect(result.points.length).toBeGreaterThan(0);
    expect(result.points.length).toBeLessThanOrEqual(20);

    // All currents must be above pickup
    for (const point of result.points) {
      expect(point.current_a).toBeGreaterThan(200);
      expect(point.time_s).toBeGreaterThan(0);
    }

    // Inverse curve: higher current → shorter time (monotonically decreasing)
    for (let i = 1; i < result.points.length; i++) {
      expect(result.points[i].current_a).toBeGreaterThan(result.points[i - 1].current_a);
      expect(result.points[i].time_s).toBeLessThanOrEqual(result.points[i - 1].time_s);
    }
  });

  it('should generate IEC_VI (Very Inverse) curve', () => {
    const result = buildTCCCurvePoints({
      curve_type: 'IEC_VI',
      pickup_a: 100,
      tms: 1.0,
      label: 'Relay R3 (VI)',
    });

    expect(result.curve_type).toBe('IEC_VI');
    expect(result.points.length).toBeGreaterThan(0);

    // Very Inverse: steeper drop than Standard Inverse
    // Verify monotonically decreasing time
    for (let i = 1; i < result.points.length; i++) {
      expect(result.points[i].time_s).toBeLessThanOrEqual(result.points[i - 1].time_s);
    }
  });

  it('should generate IEC_EI (Extremely Inverse) curve', () => {
    const result = buildTCCCurvePoints({
      curve_type: 'IEC_EI',
      pickup_a: 150,
      tms: 0.5,
      label: 'Relay R4 (EI)',
    });

    expect(result.curve_type).toBe('IEC_EI');
    expect(result.points.length).toBeGreaterThan(0);
  });

  it('should generate IEC_LI (Long Inverse) curve', () => {
    const result = buildTCCCurvePoints({
      curve_type: 'IEC_LI',
      pickup_a: 300,
      tms: 0.8,
      label: 'Relay R5 (LI)',
    });

    expect(result.curve_type).toBe('IEC_LI');
    expect(result.points.length).toBeGreaterThan(0);
  });

  it('should use default num_points = 50 for inverse curves', () => {
    const result = buildTCCCurvePoints({
      curve_type: 'IEC_SI',
      pickup_a: 100,
      tms: 1.0,
      label: 'Default points',
    });

    // Should generate close to 50 points (some may be filtered if invalid)
    expect(result.points.length).toBeGreaterThanOrEqual(40);
    expect(result.points.length).toBeLessThanOrEqual(50);
  });

  it('should respect custom multiplier_range', () => {
    const result = buildTCCCurvePoints({
      curve_type: 'IEC_SI',
      pickup_a: 100,
      tms: 1.0,
      label: 'Custom range',
      multiplier_range: [2, 20],
    });

    // Min current should be around 2 * 100 = 200
    expect(result.points[0].current_a).toBeGreaterThanOrEqual(190);
    // Max current should be around 20 * 100 = 2000
    const lastPoint = result.points[result.points.length - 1];
    expect(lastPoint.current_a).toBeLessThanOrEqual(2100);
  });

  it('should include device_ref when provided', () => {
    const result = buildTCCCurvePoints({
      curve_type: 'DT',
      pickup_a: 100,
      tms: 0.3,
      label: 'With ref',
      device_ref: 'relay-001',
    });

    expect(result.device_ref).toBe('relay-001');
  });

  it('should produce deterministic results for same input', () => {
    const settings: TCCCurveSettings = {
      curve_type: 'IEC_SI',
      pickup_a: 250,
      tms: 0.4,
      label: 'Deterministic test',
      num_points: 10,
    };

    const result1 = buildTCCCurvePoints(settings);
    const result2 = buildTCCCurvePoints(settings);

    expect(result1.points).toEqual(result2.points);
  });

  it('should verify IEC_SI formula: t = TMS * 0.14 / ((I/Ip)^0.02 - 1)', () => {
    // WHITE BOX: Verify a known computation
    const pickup_a = 100;
    const tms = 1.0;
    const test_current = 500; // 5x pickup

    const result = buildTCCCurvePoints({
      curve_type: 'IEC_SI',
      pickup_a,
      tms,
      label: 'Formula check',
      num_points: 50,
      multiplier_range: [4.9, 5.1], // narrow range around 5x
    });

    // Find point closest to 500A
    const closest = result.points.reduce((prev, curr) =>
      Math.abs(curr.current_a - test_current) < Math.abs(prev.current_a - test_current) ? curr : prev,
    );

    // Expected: t = 1.0 * 0.14 / ((500/100)^0.02 - 1)
    const ratio = test_current / pickup_a;
    const expected_time = tms * 0.14 / (Math.pow(ratio, 0.02) - 1);

    expect(closest.time_s).toBeCloseTo(expected_time, 1);
  });
});

// =============================================================================
// TEST: TCC LOG SCALE MAPPING
// =============================================================================

describe('TCC Log Scale Mapping', () => {
  it('should map minimum value to 0 pixels', () => {
    const pixel = mapToLogScale(1, 1, 100_000, 1000);
    expect(pixel).toBeCloseTo(0, 5);
  });

  it('should map maximum value to pixelRange pixels', () => {
    const pixel = mapToLogScale(100_000, 1, 100_000, 1000);
    expect(pixel).toBeCloseTo(1000, 5);
  });

  it('should map mid-log value correctly', () => {
    // log10(1) = 0, log10(10000) = 4, log10(100) = 2
    // Expected: (2 - 0) / (4 - 0) * 800 = 400
    const pixel = mapToLogScale(100, 1, 10_000, 800);
    expect(pixel).toBeCloseTo(400, 5);
  });

  it('should return 0 for invalid inputs (value <= 0)', () => {
    expect(mapToLogScale(0, 1, 100, 500)).toBe(0);
    expect(mapToLogScale(-10, 1, 100, 500)).toBe(0);
  });

  it('should return 0 for invalid min (minValue <= 0)', () => {
    expect(mapToLogScale(50, 0, 100, 500)).toBe(0);
    expect(mapToLogScale(50, -1, 100, 500)).toBe(0);
  });

  it('should return 0 for invalid range (maxValue <= minValue)', () => {
    expect(mapToLogScale(50, 100, 100, 500)).toBe(0);
    expect(mapToLogScale(50, 100, 50, 500)).toBe(0);
  });

  it('should round-trip via mapFromLogScale', () => {
    const minVal = 1;
    const maxVal = 100_000;
    const pixelRange = 1000;
    const originalValue = 500;

    const pixel = mapToLogScale(originalValue, minVal, maxVal, pixelRange);
    const recovered = mapFromLogScale(pixel, minVal, maxVal, pixelRange);

    expect(recovered).toBeCloseTo(originalValue, 3);
  });

  it('should round-trip for multiple values', () => {
    const minVal = 0.01;
    const maxVal = 1000;
    const pixelRange = 600;
    const testValues = [0.01, 0.1, 1, 10, 100, 1000];

    for (const val of testValues) {
      const pixel = mapToLogScale(val, minVal, maxVal, pixelRange);
      const recovered = mapFromLogScale(pixel, minVal, maxVal, pixelRange);
      expect(recovered).toBeCloseTo(val, 3);
    }
  });

  it('mapFromLogScale should return minValue for invalid pixelRange', () => {
    expect(mapFromLogScale(100, 1, 1000, 0)).toBe(1);
  });

  it('mapFromLogScale should return minValue for invalid range', () => {
    expect(mapFromLogScale(100, 0, 1000, 500)).toBe(0);
    expect(mapFromLogScale(100, 100, 50, 500)).toBe(100);
  });
});

// =============================================================================
// TEST: TCC FAULT MARKERS
// =============================================================================

describe('TCC Fault Markers', () => {
  it('should define Ik3 fault marker structure', () => {
    const marker: TCCFaultMarkerV1 = {
      fault_current_a: 12500,
      type: 'Ik3',
      label: 'Ik3 = 12.5 kA (szyna GPZ)',
      element_ref: 'bus-001',
    };

    expect(marker.fault_current_a).toBe(12500);
    expect(marker.type).toBe('Ik3');
    expect(marker.label).toContain('Ik3');
    expect(marker.element_ref).toBe('bus-001');
  });

  it('should define Ik1 fault marker structure', () => {
    const marker: TCCFaultMarkerV1 = {
      fault_current_a: 8000,
      type: 'Ik1',
      label: 'Ik1 = 8.0 kA',
      element_ref: null,
    };

    expect(marker.fault_current_a).toBe(8000);
    expect(marker.type).toBe('Ik1');
    expect(marker.element_ref).toBeNull();
  });

  it('should define Imin fault marker structure', () => {
    const marker: TCCFaultMarkerV1 = {
      fault_current_a: 500,
      type: 'Imin',
      label: 'Imin = 0.5 kA',
      element_ref: 'bus-far-end',
    };

    expect(marker.fault_current_a).toBe(500);
    expect(marker.type).toBe('Imin');
  });

  it('should correctly position fault marker on log-scale', () => {
    const marker: TCCFaultMarkerV1 = {
      fault_current_a: 1000,
      type: 'Ik3',
      label: 'Ik3 = 1.0 kA',
      element_ref: null,
    };

    // Fault marker is a vertical line at fault_current_a
    const config = DEFAULT_TCC_CHART_CONFIG;
    const pixelX = mapToLogScale(
      marker.fault_current_a,
      config.x_axis.min,
      config.x_axis.max,
      1000,
    );

    // log10(1000) = 3, range log10(1)=0 to log10(100000)=5
    // Expected: (3 - 0) / (5 - 0) * 1000 = 600
    expect(pixelX).toBeCloseTo(600, 1);
  });
});

// =============================================================================
// TEST: DEFAULT CHART CONFIG
// =============================================================================

describe('Default TCC Chart Config', () => {
  it('should have log-log scale enabled', () => {
    expect(DEFAULT_TCC_CHART_CONFIG.log_log_scale).toBe(true);
  });

  it('should have x-axis in amperes', () => {
    expect(DEFAULT_TCC_CHART_CONFIG.x_axis.unit).toBe('A');
    expect(DEFAULT_TCC_CHART_CONFIG.x_axis.min).toBe(1);
    expect(DEFAULT_TCC_CHART_CONFIG.x_axis.max).toBe(100_000);
  });

  it('should have y-axis in seconds', () => {
    expect(DEFAULT_TCC_CHART_CONFIG.y_axis.unit).toBe('s');
    expect(DEFAULT_TCC_CHART_CONFIG.y_axis.min).toBe(0.01);
    expect(DEFAULT_TCC_CHART_CONFIG.y_axis.max).toBe(1000);
  });

  it('should have Polish title', () => {
    expect(DEFAULT_TCC_CHART_CONFIG.title).toContain('TCC');
  });

  it('should satisfy TCCChartConfigV1 type', () => {
    const config: TCCChartConfigV1 = DEFAULT_TCC_CHART_CONFIG;
    expect(config.log_log_scale).toBe(true);
  });
});

// =============================================================================
// TEST: SELECTIVITY TYPES (compile-time type checks)
// =============================================================================

describe('TCC Selectivity Types', () => {
  it('should define selectivity result with SELECTIVE verdict', () => {
    const result: import('../core/tccChart').TCCSelectivityResultV1 = {
      upstream: 'relay-upstream-001',
      downstream: 'relay-downstream-002',
      margin_s: 0.35,
      verdict: 'SELECTIVE',
      upstream_label: 'R1 (GPZ)',
      downstream_label: 'R2 (stacja)',
    };

    expect(result.verdict).toBe('SELECTIVE');
    expect(result.margin_s).toBeGreaterThan(0.3);
  });

  it('should define selectivity result with NON_SELECTIVE verdict', () => {
    const result: import('../core/tccChart').TCCSelectivityResultV1 = {
      upstream: 'relay-001',
      downstream: 'relay-002',
      margin_s: 0.05,
      verdict: 'NON_SELECTIVE',
      upstream_label: 'R1',
      downstream_label: 'R2',
    };

    expect(result.verdict).toBe('NON_SELECTIVE');
    expect(result.margin_s).toBeLessThan(0.3);
  });

  it('should define selectivity result with MARGINAL verdict', () => {
    const result: import('../core/tccChart').TCCSelectivityResultV1 = {
      upstream: 'relay-001',
      downstream: 'relay-002',
      margin_s: 0.25,
      verdict: 'MARGINAL',
      upstream_label: 'R1',
      downstream_label: 'R2',
    };

    expect(result.verdict).toBe('MARGINAL');
  });
});

// =============================================================================
// TEST: CURVE TYPE EXHAUSTIVENESS
// =============================================================================

describe('TCC Curve Type Coverage', () => {
  const curveTypes: TCCCurveType[] = ['DT', 'IEC_SI', 'IEC_VI', 'IEC_EI', 'IEC_LI'];

  for (const curveType of curveTypes) {
    it(`should generate valid curve for ${curveType}`, () => {
      const result: TCCCurveDataV1 = buildTCCCurvePoints({
        curve_type: curveType,
        pickup_a: 100,
        tms: 1.0,
        label: `Test ${curveType}`,
      });

      expect(result.curve_type).toBe(curveType);
      expect(result.points.length).toBeGreaterThan(0);

      // All points must have positive values
      for (const point of result.points) {
        expect(point.current_a).toBeGreaterThan(0);
        expect(point.time_s).toBeGreaterThan(0);
        expect(isFinite(point.current_a)).toBe(true);
        expect(isFinite(point.time_s)).toBe(true);
      }
    });
  }
});
