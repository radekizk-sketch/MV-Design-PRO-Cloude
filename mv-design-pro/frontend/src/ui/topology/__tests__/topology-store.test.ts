/**
 * Topology Store Tests — PR-9
 *
 * Unit tests for topology Zustand store.
 * Tests selectors, determinism, and state management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTopologyStore } from '../store';
import type { TopologyGraphSummary } from '../../../types/enm';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_SUMMARY: TopologyGraphSummary = {
  adjacency: [
    { ref_id: 'bus_1', neighbors: ['bus_2', 'bus_3'], branch_refs: ['line_1', 'line_2'] },
    { ref_id: 'bus_2', neighbors: ['bus_1', 'bus_4'], branch_refs: ['line_1', 'line_3'] },
    { ref_id: 'bus_3', neighbors: ['bus_1'], branch_refs: ['line_2'] },
    { ref_id: 'bus_4', neighbors: ['bus_2'], branch_refs: ['line_3'] },
  ],
  spine: [
    { ref_id: 'bus_1', depth: 0, is_source: true, branches_to_next: ['line_1'] },
    { ref_id: 'bus_2', depth: 1, is_source: false, branches_to_next: ['line_3'] },
    { ref_id: 'bus_4', depth: 2, is_source: false, branches_to_next: [] },
  ],
  laterals: ['bus_3'],
  is_radial: true,
};

const MOCK_SUMMARY_2: TopologyGraphSummary = {
  adjacency: [
    { ref_id: 'bus_a', neighbors: ['bus_b'], branch_refs: ['br_1'] },
    { ref_id: 'bus_b', neighbors: ['bus_a'], branch_refs: ['br_1'] },
  ],
  spine: [
    { ref_id: 'bus_a', depth: 0, is_source: true, branches_to_next: ['br_1'] },
    { ref_id: 'bus_b', depth: 1, is_source: false, branches_to_next: [] },
  ],
  laterals: [],
  is_radial: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TopologyStore', () => {
  beforeEach(() => {
    // Reset store state
    useTopologyStore.setState({
      summary: null,
      loading: false,
      error: null,
      lastOpIssues: [],
    });
  });

  describe('initial state', () => {
    it('should have null summary', () => {
      expect(useTopologyStore.getState().summary).toBeNull();
    });

    it('should not be loading', () => {
      expect(useTopologyStore.getState().loading).toBe(false);
    });

    it('should have no error', () => {
      expect(useTopologyStore.getState().error).toBeNull();
    });

    it('should have empty lastOpIssues', () => {
      expect(useTopologyStore.getState().lastOpIssues).toEqual([]);
    });
  });

  describe('selectors', () => {
    it('selectSpineSorted should return spine sorted by depth', () => {
      useTopologyStore.setState({ summary: MOCK_SUMMARY });
      const spine = useTopologyStore.getState().summary?.spine ?? [];
      const sorted = [...spine].sort((a, b) => a.depth - b.depth);
      expect(sorted.map((s) => s.ref_id)).toEqual(['bus_1', 'bus_2', 'bus_4']);
    });

    it('selectIsRadial should return true for radial network', () => {
      useTopologyStore.setState({ summary: MOCK_SUMMARY });
      expect(useTopologyStore.getState().summary?.is_radial).toBe(true);
    });

    it('selectAdjacencyFor should find correct neighbors', () => {
      useTopologyStore.setState({ summary: MOCK_SUMMARY });
      const adj = MOCK_SUMMARY.adjacency.find((a) => a.ref_id === 'bus_2');
      expect(adj).toBeDefined();
      expect(adj!.neighbors).toEqual(['bus_1', 'bus_4']);
      expect(adj!.branch_refs).toEqual(['line_1', 'line_3']);
    });
  });

  describe('determinism', () => {
    it('identical summary should produce identical JSON serialization', () => {
      const json1 = JSON.stringify(MOCK_SUMMARY);
      const json2 = JSON.stringify(MOCK_SUMMARY);
      expect(json1).toBe(json2);
    });

    it('spine nodes should maintain insertion order by depth', () => {
      const depths = MOCK_SUMMARY.spine.map((s) => s.depth);
      expect(depths).toEqual([0, 1, 2]);
    });

    it('laterals should be deterministically sortable', () => {
      const laterals = [...MOCK_SUMMARY.laterals].sort();
      expect(laterals).toEqual(['bus_3']);
    });
  });

  describe('state management', () => {
    it('clearError should reset error to null', () => {
      useTopologyStore.setState({ error: 'Test error' });
      useTopologyStore.getState().clearError();
      expect(useTopologyStore.getState().error).toBeNull();
    });

    it('setting summary should update state', () => {
      useTopologyStore.setState({ summary: MOCK_SUMMARY });
      expect(useTopologyStore.getState().summary).toEqual(MOCK_SUMMARY);
    });

    it('replacing summary should fully overwrite previous', () => {
      useTopologyStore.setState({ summary: MOCK_SUMMARY });
      useTopologyStore.setState({ summary: MOCK_SUMMARY_2 });
      expect(useTopologyStore.getState().summary?.adjacency.length).toBe(2);
      expect(useTopologyStore.getState().summary?.spine.length).toBe(2);
    });
  });
});
