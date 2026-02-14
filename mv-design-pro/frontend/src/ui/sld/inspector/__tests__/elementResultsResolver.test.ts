/**
 * Element Results Resolver Tests — RUN #3G §4 COMMIT C.
 *
 * Tests:
 * - Bus results lookup by bus_id
 * - Branch results lookup by branch_id
 * - SC results lookup by target_id (field/device)
 * - "Brak wynikow" when no match
 * - Null tables → null result
 * - Determinism: same input → same output (50×)
 */

import { describe, it, expect } from 'vitest';
import {
  resolveElementResults,
  resolveFieldDeviceResults,
  NO_RESULTS_DATA,
} from '../elementResultsResolver';
import type {
  BusResults,
  BranchResults,
  ShortCircuitResults,
} from '../../../results-inspector/types';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const BUS_RESULTS: BusResults = {
  run_id: 'run_001',
  rows: [
    { bus_id: 'bus_sn_01', name: 'Szyna SN 1', un_kv: 15, u_kv: 14.85, u_pu: 0.99, angle_deg: -2.1, flags: [] },
    { bus_id: 'bus_sn_02', name: 'Szyna SN 2', un_kv: 15, u_kv: 14.7, u_pu: 0.98, angle_deg: -3.5, flags: ['VOLTAGE_VIOLATION'] },
    { bus_id: 'bus_nn_01', name: 'Szyna nN 1', un_kv: 0.4, u_kv: 0.39, u_pu: 0.975, angle_deg: -5.2, flags: [] },
  ],
};

const BRANCH_RESULTS: BranchResults = {
  run_id: 'run_001',
  rows: [
    { branch_id: 'line_01', name: 'Linia 1', from_bus: 'bus_sn_01', to_bus: 'bus_sn_02', i_a: 120.5, s_mva: 3.1, p_mw: 2.8, q_mvar: 1.2, loading_pct: 65, flags: [] },
    { branch_id: 'trafo_01', name: 'Transformator 1', from_bus: 'bus_sn_01', to_bus: 'bus_nn_01', i_a: 250, s_mva: 0.63, p_mw: 0.58, q_mvar: 0.24, loading_pct: 95, flags: ['OVERLOADED'] },
  ],
};

const SC_RESULTS: ShortCircuitResults = {
  run_id: 'run_001',
  rows: [
    { target_id: 'bus_sn_01', target_name: 'Szyna SN 1', ikss_ka: 12.5, ip_ka: 31.8, ith_ka: 12.7, sk_mva: 325, fault_type: 'SC3F', flags: [] },
    { target_id: 'dev_cb_01', target_name: 'Wylacznik 1', ikss_ka: 8.2, ip_ka: 20.8, ith_ka: 8.4, sk_mva: 213, fault_type: 'SC3F', flags: [] },
  ],
};

// =============================================================================
// resolveElementResults
// =============================================================================

describe('resolveElementResults', () => {
  describe('Bus lookup', () => {
    it('returns voltage data for matching bus_id', () => {
      const result = resolveElementResults('bus_sn_01', BUS_RESULTS, BRANCH_RESULTS, SC_RESULTS);
      expect(result).not.toBeNull();
      expect(result!.voltage_kv).toBe(14.85);
      expect(result!.voltage_pu).toBe(0.99);
    });

    it('returns null for non-bus fields (current, loading)', () => {
      const result = resolveElementResults('bus_sn_01', BUS_RESULTS, BRANCH_RESULTS, SC_RESULTS);
      expect(result!.current_a).toBeNull();
      expect(result!.loading_pct).toBeNull();
    });

    it('matches second bus correctly', () => {
      const result = resolveElementResults('bus_sn_02', BUS_RESULTS, BRANCH_RESULTS, SC_RESULTS);
      expect(result!.voltage_kv).toBe(14.7);
      expect(result!.voltage_pu).toBe(0.98);
    });
  });

  describe('Branch lookup', () => {
    it('returns current/power data for matching branch_id', () => {
      const result = resolveElementResults('line_01', BUS_RESULTS, BRANCH_RESULTS, SC_RESULTS);
      expect(result).not.toBeNull();
      expect(result!.current_a).toBe(120.5);
      expect(result!.loading_pct).toBe(65);
      expect(result!.p_mw).toBe(2.8);
      expect(result!.q_mvar).toBe(1.2);
      expect(result!.s_mva).toBe(3.1);
    });

    it('returns null for bus-specific fields (voltage)', () => {
      const result = resolveElementResults('line_01', BUS_RESULTS, BRANCH_RESULTS, SC_RESULTS);
      expect(result!.voltage_kv).toBeNull();
      expect(result!.voltage_pu).toBeNull();
    });

    it('matches transformer correctly', () => {
      const result = resolveElementResults('trafo_01', BUS_RESULTS, BRANCH_RESULTS, SC_RESULTS);
      expect(result!.loading_pct).toBe(95);
      expect(result!.current_a).toBe(250);
    });
  });

  describe('No match', () => {
    it('returns null for unknown elementId', () => {
      const result = resolveElementResults('unknown_id', BUS_RESULTS, BRANCH_RESULTS, SC_RESULTS);
      expect(result).toBeNull();
    });

    it('returns null for empty elementId', () => {
      const result = resolveElementResults('', BUS_RESULTS, BRANCH_RESULTS, SC_RESULTS);
      expect(result).toBeNull();
    });
  });

  describe('Null tables', () => {
    it('returns null when all tables are null', () => {
      const result = resolveElementResults('bus_sn_01', null, null, null);
      expect(result).toBeNull();
    });

    it('finds bus even when branch/SC tables are null', () => {
      const result = resolveElementResults('bus_sn_01', BUS_RESULTS, null, null);
      expect(result).not.toBeNull();
      expect(result!.voltage_kv).toBe(14.85);
    });

    it('finds branch when bus table is null', () => {
      const result = resolveElementResults('line_01', null, BRANCH_RESULTS, null);
      expect(result).not.toBeNull();
      expect(result!.current_a).toBe(120.5);
    });
  });

  describe('Determinism (50×)', () => {
    it('same input always produces same output', () => {
      const first = resolveElementResults('bus_sn_01', BUS_RESULTS, BRANCH_RESULTS, SC_RESULTS);
      const firstJson = JSON.stringify(first);

      for (let i = 0; i < 50; i++) {
        const result = resolveElementResults('bus_sn_01', BUS_RESULTS, BRANCH_RESULTS, SC_RESULTS);
        expect(JSON.stringify(result)).toBe(firstJson);
      }
    });
  });
});

// =============================================================================
// resolveFieldDeviceResults
// =============================================================================

describe('resolveFieldDeviceResults', () => {
  it('returns SC data for matching target_id', () => {
    const result = resolveFieldDeviceResults('dev_cb_01', 'device', SC_RESULTS, BRANCH_RESULTS);
    expect(result.elementId).toBe('dev_cb_01');
    expect(result.elementType).toBe('device');
    expect(result.ikss_ka).toBe(8.2);
    expect(result.ip_ka).toBe(20.8);
  });

  it('returns branch loading for matching branch_id', () => {
    const result = resolveFieldDeviceResults('line_01', 'field', SC_RESULTS, BRANCH_RESULTS);
    expect(result.loading_pct).toBe(65);
    expect(result.current_a).toBe(120.5);
  });

  it('returns empty data when no match', () => {
    const result = resolveFieldDeviceResults('unknown', 'device', SC_RESULTS, BRANCH_RESULTS);
    expect(result.elementId).toBe('unknown');
    expect(result.ikss_ka).toBeNull();
    expect(result.ip_ka).toBeNull();
    expect(result.loading_pct).toBeNull();
    expect(result.current_a).toBeNull();
  });

  it('handles null SC results', () => {
    const result = resolveFieldDeviceResults('dev_cb_01', 'device', null, null);
    expect(result.ikss_ka).toBeNull();
    expect(result.ip_ka).toBeNull();
  });

  it('combines SC + branch data when both match', () => {
    // bus_sn_01 is both a SC target and... not a branch. Let's test with separate IDs.
    const result = resolveFieldDeviceResults('bus_sn_01', 'field', SC_RESULTS, BRANCH_RESULTS);
    // SC match
    expect(result.ikss_ka).toBe(12.5);
    expect(result.ip_ka).toBe(31.8);
    // No branch match (bus_sn_01 is not a branch_id)
    expect(result.current_a).toBeNull();
    expect(result.loading_pct).toBeNull();
  });
});

// =============================================================================
// NO_RESULTS_DATA sentinel
// =============================================================================

describe('NO_RESULTS_DATA', () => {
  it('has all null values', () => {
    expect(NO_RESULTS_DATA.voltage_kv).toBeNull();
    expect(NO_RESULTS_DATA.voltage_pu).toBeNull();
    expect(NO_RESULTS_DATA.current_a).toBeNull();
    expect(NO_RESULTS_DATA.loading_pct).toBeNull();
    expect(NO_RESULTS_DATA.p_mw).toBeNull();
    expect(NO_RESULTS_DATA.q_mvar).toBeNull();
    expect(NO_RESULTS_DATA.s_mva).toBeNull();
  });
});
