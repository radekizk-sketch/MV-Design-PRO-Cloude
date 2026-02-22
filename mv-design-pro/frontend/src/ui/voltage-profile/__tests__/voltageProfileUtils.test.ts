import { describe, it, expect } from 'vitest';
import {
  checkVoltageViolation,
  calculateDeviation,
  extractFeeders,
  calculateProfileData,
  getProfileStats,
  formatVoltage,
  formatDistance,
} from '../utils';
import type { NetworkSnapshot, PowerFlowResultForProfile, Feeder } from '../types';
import { DEFAULT_PROFILE_CONFIG } from '../types';

// =============================================================================
// checkVoltageViolation
// =============================================================================

describe('checkVoltageViolation', () => {
  it('returns null for voltage within limits', () => {
    expect(checkVoltageViolation(1.0)).toBeNull();
    expect(checkVoltageViolation(0.95)).toBeNull();
    expect(checkVoltageViolation(1.05)).toBeNull();
  });

  it('returns OVERVOLTAGE for voltage above umax', () => {
    expect(checkVoltageViolation(1.06)).toBe('OVERVOLTAGE');
    expect(checkVoltageViolation(1.10)).toBe('OVERVOLTAGE');
  });

  it('returns UNDERVOLTAGE for voltage below umin', () => {
    expect(checkVoltageViolation(0.94)).toBe('UNDERVOLTAGE');
    expect(checkVoltageViolation(0.80)).toBe('UNDERVOLTAGE');
  });

  it('respects custom limits', () => {
    expect(checkVoltageViolation(0.96, 0.97, 1.03)).toBe('UNDERVOLTAGE');
    expect(checkVoltageViolation(1.04, 0.97, 1.03)).toBe('OVERVOLTAGE');
    expect(checkVoltageViolation(1.0, 0.97, 1.03)).toBeNull();
  });
});

// =============================================================================
// calculateDeviation
// =============================================================================

describe('calculateDeviation', () => {
  it('returns 0 for nominal voltage', () => {
    expect(calculateDeviation(1.0)).toBe(0);
  });

  it('returns positive deviation for overvoltage', () => {
    expect(calculateDeviation(1.05)).toBeCloseTo(5.0);
  });

  it('returns negative deviation for undervoltage', () => {
    expect(calculateDeviation(0.95)).toBeCloseTo(-5.0);
  });
});

// =============================================================================
// extractFeeders
// =============================================================================

describe('extractFeeders', () => {
  it('returns empty array for empty snapshot', () => {
    const snapshot: NetworkSnapshot = { buses: [], branches: [] };
    expect(extractFeeders(snapshot)).toEqual([]);
  });

  it('returns empty array for no branches', () => {
    const snapshot: NetworkSnapshot = {
      buses: [{ id: 'b1', name: 'Bus 1', voltage_kv: 15 }],
      branches: [],
    };
    expect(extractFeeders(snapshot)).toEqual([]);
  });

  it('extracts feeder from simple radial network', () => {
    const snapshot: NetworkSnapshot = {
      buses: [
        { id: 'b1', name: 'Source', voltage_kv: 15 },
        { id: 'b2', name: 'Mid', voltage_kv: 15 },
        { id: 'b3', name: 'End', voltage_kv: 15 },
      ],
      branches: [
        { id: 'br1', name: 'L1', from_bus_id: 'b1', to_bus_id: 'b2', length_km: 5, branch_type: 'LINE' },
        { id: 'br2', name: 'L2', from_bus_id: 'b2', to_bus_id: 'b3', length_km: 3, branch_type: 'CABLE' },
      ],
    };
    const feeders = extractFeeders(snapshot, 'b1');
    expect(feeders.length).toBe(1);
    expect(feeders[0].busIds).toEqual(['b1', 'b2', 'b3']);
    expect(feeders[0].branchIds).toEqual(['br1', 'br2']);
    expect(feeders[0].totalLengthKm).toBe(8);
  });

  it('skips transformer branches', () => {
    const snapshot: NetworkSnapshot = {
      buses: [
        { id: 'b1', name: 'HV', voltage_kv: 110 },
        { id: 'b2', name: 'MV', voltage_kv: 15 },
      ],
      branches: [
        { id: 'tr1', name: 'TR1', from_bus_id: 'b1', to_bus_id: 'b2', length_km: 0, branch_type: 'TRANSFORMER' },
      ],
    };
    const feeders = extractFeeders(snapshot, 'b1');
    expect(feeders).toEqual([]);
  });
});

// =============================================================================
// calculateProfileData
// =============================================================================

describe('calculateProfileData', () => {
  const feeder: Feeder = {
    id: 'f1',
    name: 'Feeder 1',
    startBusId: 'b1',
    busIds: ['b1', 'b2', 'b3'],
    branchIds: ['br1', 'br2'],
    totalLengthKm: 8,
  };

  const snapshot: NetworkSnapshot = {
    buses: [
      { id: 'b1', name: 'Source', voltage_kv: 15 },
      { id: 'b2', name: 'Mid', voltage_kv: 15 },
      { id: 'b3', name: 'End', voltage_kv: 15 },
    ],
    branches: [
      { id: 'br1', name: 'L1', from_bus_id: 'b1', to_bus_id: 'b2', length_km: 5, branch_type: 'LINE' },
      { id: 'br2', name: 'L2', from_bus_id: 'b2', to_bus_id: 'b3', length_km: 3, branch_type: 'CABLE' },
    ],
  };

  const pfResult: PowerFlowResultForProfile = {
    converged: true,
    bus_results: [
      { bus_id: 'b1', v_pu: 1.0 },
      { bus_id: 'b2', v_pu: 0.98 },
      { bus_id: 'b3', v_pu: 0.94 },
    ],
  };

  it('generates correct number of data points', () => {
    const data = calculateProfileData(feeder, pfResult, snapshot);
    expect(data.length).toBe(3);
  });

  it('calculates cumulative distance', () => {
    const data = calculateProfileData(feeder, pfResult, snapshot);
    expect(data[0].distance_km).toBe(0);
    expect(data[1].distance_km).toBe(5);
    expect(data[2].distance_km).toBe(8);
  });

  it('detects violations', () => {
    const data = calculateProfileData(feeder, pfResult, snapshot);
    expect(data[0].violation).toBeNull();
    expect(data[1].violation).toBeNull();
    expect(data[2].violation).toBe('UNDERVOLTAGE');
  });

  it('calculates deviation percentage', () => {
    const data = calculateProfileData(feeder, pfResult, snapshot);
    expect(data[0].deviation_pct).toBe(0);
    expect(data[1].deviation_pct).toBe(-2);
    expect(data[2].deviation_pct).toBe(-6);
  });
});

// =============================================================================
// getProfileStats
// =============================================================================

describe('getProfileStats', () => {
  it('returns zero stats for empty data', () => {
    const stats = getProfileStats([]);
    expect(stats.minVoltage).toBe(0);
    expect(stats.violationCount).toBe(0);
  });

  it('calculates min/max/avg correctly', () => {
    const data = [
      { bus_id: 'b1', bus_name: 'B1', distance_km: 0, voltage_pu: 1.0, voltage_kv: 15, violation: null as const, deviation_pct: 0 },
      { bus_id: 'b2', bus_name: 'B2', distance_km: 5, voltage_pu: 0.96, voltage_kv: 14.4, violation: null as const, deviation_pct: -4 },
      { bus_id: 'b3', bus_name: 'B3', distance_km: 10, voltage_pu: 0.94, voltage_kv: 14.1, violation: 'UNDERVOLTAGE' as const, deviation_pct: -6 },
    ];
    const stats = getProfileStats(data);
    expect(stats.minVoltage).toBe(0.94);
    expect(stats.maxVoltage).toBe(1.0);
    expect(stats.avgVoltage).toBeCloseTo(0.9667, 3);
    expect(stats.violationCount).toBe(1);
    expect(stats.undervoltageCount).toBe(1);
    expect(stats.overvoltageCount).toBe(0);
  });
});

// =============================================================================
// Formatting
// =============================================================================

describe('formatVoltage', () => {
  it('formats to 4 decimals by default', () => {
    expect(formatVoltage(1.0)).toBe('1.0000');
    expect(formatVoltage(0.9876)).toBe('0.9876');
  });
});

describe('formatDistance', () => {
  it('formats to 3 decimals by default', () => {
    expect(formatDistance(5.5)).toBe('5.500');
    expect(formatDistance(10.123)).toBe('10.123');
  });
});

// =============================================================================
// Default config
// =============================================================================

describe('DEFAULT_PROFILE_CONFIG', () => {
  it('has correct default values', () => {
    expect(DEFAULT_PROFILE_CONFIG.umin).toBe(0.95);
    expect(DEFAULT_PROFILE_CONFIG.umax).toBe(1.05);
    expect(DEFAULT_PROFILE_CONFIG.showLimits).toBe(true);
  });
});
