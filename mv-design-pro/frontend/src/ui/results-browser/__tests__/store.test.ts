/**
 * FIX-03 — Results Browser Store Tests
 *
 * Tests for the Zustand store.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useResultsBrowserStore } from '../store';
import type { BusVoltageRow, BranchFlowRow, ViolationRow } from '../types';

// Mock API functions
vi.mock('../api', () => ({
  fetchBusVoltages: vi.fn(),
  fetchBranchFlows: vi.fn(),
  fetchLosses: vi.fn(),
  fetchViolations: vi.fn(),
  fetchConvergence: vi.fn(),
  fetchRunsForComparison: vi.fn(),
}));

describe('ResultsBrowserStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useResultsBrowserStore.getState().reset();
  });

  it('has correct initial state', () => {
    const state = useResultsBrowserStore.getState();

    expect(state.projectId).toBeNull();
    expect(state.caseId).toBeNull();
    expect(state.runId).toBeNull();
    expect(state.viewMode).toBe('bus_voltages');
    expect(state.busVoltages).toEqual([]);
    expect(state.branchFlows).toEqual([]);
    expect(state.losses).toEqual([]);
    expect(state.violations).toEqual([]);
    expect(state.convergence).toEqual([]);
    expect(state.selectedRunIds).toEqual([]);
    expect(state.filters).toEqual({});
    expect(state.sortConfig).toBeNull();
    expect(state.error).toBeNull();
  });

  it('sets view mode', () => {
    useResultsBrowserStore.getState().setViewMode('violations');

    expect(useResultsBrowserStore.getState().viewMode).toBe('violations');
  });

  it('sets filters', () => {
    useResultsBrowserStore.getState().setFilters({ searchQuery: 'test' });

    expect(useResultsBrowserStore.getState().filters).toEqual({ searchQuery: 'test' });
  });

  it('sets sort config', () => {
    const sortConfig = { key: 'name', direction: 'asc' as const };
    useResultsBrowserStore.getState().setSortConfig(sortConfig);

    expect(useResultsBrowserStore.getState().sortConfig).toEqual(sortConfig);
  });

  it('toggles run selection - adds run', () => {
    useResultsBrowserStore.getState().toggleRunSelection('run-1');

    expect(useResultsBrowserStore.getState().selectedRunIds).toContain('run-1');
  });

  it('toggles run selection - removes run', () => {
    // Add run first
    useResultsBrowserStore.getState().toggleRunSelection('run-1');
    // Toggle again to remove
    useResultsBrowserStore.getState().toggleRunSelection('run-1');

    expect(useResultsBrowserStore.getState().selectedRunIds).not.toContain('run-1');
  });

  it('clears run selection', () => {
    useResultsBrowserStore.getState().toggleRunSelection('run-1');
    useResultsBrowserStore.getState().toggleRunSelection('run-2');
    useResultsBrowserStore.getState().clearRunSelection();

    expect(useResultsBrowserStore.getState().selectedRunIds).toEqual([]);
  });

  it('resets to initial state', () => {
    // Modify state
    useResultsBrowserStore.getState().setViewMode('violations');
    useResultsBrowserStore.getState().setFilters({ searchQuery: 'test' });
    useResultsBrowserStore.getState().toggleRunSelection('run-1');

    // Reset
    useResultsBrowserStore.getState().reset();

    const state = useResultsBrowserStore.getState();
    expect(state.viewMode).toBe('bus_voltages');
    expect(state.filters).toEqual({});
    expect(state.selectedRunIds).toEqual([]);
  });
});

describe('Store Filtering', () => {
  beforeEach(() => {
    useResultsBrowserStore.getState().reset();
  });

  it('filters bus voltages by search query', () => {
    // Set up test data directly in store
    const testBuses: BusVoltageRow[] = [
      { bus_id: '1', bus_name: 'Bus A', bus_type: 'PQ', voltage_kv: 20.0, voltage_pu: 1.0, angle_deg: 0, p_mw: 10, q_mvar: 5, status: 'PASS' },
      { bus_id: '2', bus_name: 'Bus B', bus_type: 'PQ', voltage_kv: 20.0, voltage_pu: 0.95, angle_deg: -1, p_mw: 15, q_mvar: 7, status: 'WARNING' },
      { bus_id: '3', bus_name: 'Node C', bus_type: 'SLACK', voltage_kv: 20.0, voltage_pu: 1.02, angle_deg: 0, p_mw: 0, q_mvar: 0, status: 'PASS' },
    ];

    useResultsBrowserStore.setState({ busVoltages: testBuses });
    useResultsBrowserStore.getState().setFilters({ searchQuery: 'Bus' });

    const { busVoltages, filters } = useResultsBrowserStore.getState();

    // Filter manually as the selector would
    const filtered = busVoltages.filter((row) =>
      row.bus_name.toLowerCase().includes(filters.searchQuery?.toLowerCase() ?? '')
    );

    expect(filtered.length).toBe(2);
    expect(filtered.every((b) => b.bus_name.includes('Bus'))).toBe(true);
  });

  it('filters violations by severity', () => {
    const testViolations: ViolationRow[] = [
      { element_id: '1', element_name: 'Bus 1', element_type: 'bus', violation_type: 'UNDERVOLTAGE', voltage_pu: 0.90, deviation_pct: 5, severity: 'HIGH' },
      { element_id: '2', element_name: 'Bus 2', element_type: 'bus', violation_type: 'UNDERVOLTAGE', voltage_pu: 0.94, deviation_pct: 1, severity: 'WARN' },
      { element_id: '3', element_name: 'Branch 1', element_type: 'branch', violation_type: 'OVERLOAD', loading_pct: 105, deviation_pct: 5, severity: 'WARN' },
    ];

    useResultsBrowserStore.setState({ violations: testViolations });
    useResultsBrowserStore.getState().setFilters({ statusFilter: 'HIGH' });

    const { violations, filters } = useResultsBrowserStore.getState();

    // Filter manually
    const filtered = filters.statusFilter
      ? violations.filter((v) => v.severity === filters.statusFilter)
      : violations;

    expect(filtered.length).toBe(1);
    expect(filtered[0].severity).toBe('HIGH');
  });
});

describe('Store Sorting', () => {
  beforeEach(() => {
    useResultsBrowserStore.getState().reset();
  });

  it('sorts bus voltages ascending', () => {
    const testBuses: BusVoltageRow[] = [
      { bus_id: '1', bus_name: 'Bus C', bus_type: 'PQ', voltage_kv: 20.0, voltage_pu: 1.0, angle_deg: 0, p_mw: 10, q_mvar: 5, status: 'PASS' },
      { bus_id: '2', bus_name: 'Bus A', bus_type: 'PQ', voltage_kv: 20.0, voltage_pu: 0.95, angle_deg: -1, p_mw: 15, q_mvar: 7, status: 'WARNING' },
      { bus_id: '3', bus_name: 'Bus B', bus_type: 'SLACK', voltage_kv: 20.0, voltage_pu: 1.02, angle_deg: 0, p_mw: 0, q_mvar: 0, status: 'PASS' },
    ];

    useResultsBrowserStore.setState({ busVoltages: testBuses });
    useResultsBrowserStore.getState().setSortConfig({ key: 'bus_name', direction: 'asc' });

    const { busVoltages, sortConfig } = useResultsBrowserStore.getState();

    // Sort manually
    const sorted = [...busVoltages].sort((a, b) => {
      const aVal = a[sortConfig!.key as keyof BusVoltageRow];
      const bVal = b[sortConfig!.key as keyof BusVoltageRow];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig!.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return 0;
    });

    expect(sorted[0].bus_name).toBe('Bus A');
    expect(sorted[1].bus_name).toBe('Bus B');
    expect(sorted[2].bus_name).toBe('Bus C');
  });

  it('sorts by numeric value descending', () => {
    const testBuses: BusVoltageRow[] = [
      { bus_id: '1', bus_name: 'Bus A', bus_type: 'PQ', voltage_kv: 20.0, voltage_pu: 1.0, angle_deg: 0, p_mw: 10, q_mvar: 5, status: 'PASS' },
      { bus_id: '2', bus_name: 'Bus B', bus_type: 'PQ', voltage_kv: 19.0, voltage_pu: 0.95, angle_deg: -1, p_mw: 15, q_mvar: 7, status: 'WARNING' },
      { bus_id: '3', bus_name: 'Bus C', bus_type: 'SLACK', voltage_kv: 20.4, voltage_pu: 1.02, angle_deg: 0, p_mw: 0, q_mvar: 0, status: 'PASS' },
    ];

    useResultsBrowserStore.setState({ busVoltages: testBuses });
    useResultsBrowserStore.getState().setSortConfig({ key: 'voltage_pu', direction: 'desc' });

    const { busVoltages, sortConfig } = useResultsBrowserStore.getState();

    // Sort manually
    const sorted = [...busVoltages].sort((a, b) => {
      const aVal = a[sortConfig!.key as keyof BusVoltageRow] as number;
      const bVal = b[sortConfig!.key as keyof BusVoltageRow] as number;
      return sortConfig!.direction === 'desc' ? bVal - aVal : aVal - bVal;
    });

    expect(sorted[0].voltage_pu).toBe(1.02);
    expect(sorted[1].voltage_pu).toBe(1.0);
    expect(sorted[2].voltage_pu).toBe(0.95);
  });
});
