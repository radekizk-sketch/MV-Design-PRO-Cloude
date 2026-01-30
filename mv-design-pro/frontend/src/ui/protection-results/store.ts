/**
 * P15c — Protection Results Inspector Store
 *
 * Zustand store for managing protection results state.
 * READ-ONLY: No mutations of backend data, only UI state management.
 */

import { create } from 'zustand';
import type {
  ProtectionRunHeader,
  ProtectionResult,
  ProtectionTrace,
  ProtectionComparisonResult,
  ProtectionSldOverlay,
  ProtectionResultsTab,
  ProtectionComparisonTab,
  ProtectionViewMode,
} from './types';
import {
  fetchProtectionRunHeader,
  fetchProtectionResults,
  fetchProtectionTrace,
  compareProtectionRuns,
  fetchProtectionSldOverlay,
} from './api';

// =============================================================================
// Store State Interface
// =============================================================================

interface ProtectionResultsInspectorState {
  // View mode
  viewMode: ProtectionViewMode;
  setViewMode: (mode: ProtectionViewMode) => void;

  // Selected run(s)
  selectedRunId: string | null;
  selectedRunAId: string | null;
  selectedRunBId: string | null;
  selectRun: (runId: string) => void;
  selectComparison: (runAId: string, runBId: string) => void;

  // Run data
  runHeader: ProtectionRunHeader | null;
  results: ProtectionResult | null;
  trace: ProtectionTrace | null;

  // Comparison data
  comparison: ProtectionComparisonResult | null;

  // SLD overlay
  sldOverlay: ProtectionSldOverlay | null;
  showSldOverlay: boolean;
  toggleSldOverlay: () => void;

  // Active tabs
  activeTab: ProtectionResultsTab;
  setActiveTab: (tab: ProtectionResultsTab) => void;
  activeComparisonTab: ProtectionComparisonTab;
  setActiveComparisonTab: (tab: ProtectionComparisonTab) => void;

  // Search/filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Loading states
  isLoadingHeader: boolean;
  isLoadingResults: boolean;
  isLoadingTrace: boolean;
  isLoadingComparison: boolean;
  isLoadingSldOverlay: boolean;

  // Actions
  loadRunData: () => Promise<void>;
  loadResults: () => Promise<void>;
  loadTrace: () => Promise<void>;
  loadComparison: () => Promise<void>;
  loadSldOverlay: (projectId: string, diagramId: string) => Promise<void>;

  // Reset
  reset: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  viewMode: 'RUN' as ProtectionViewMode,
  selectedRunId: null,
  selectedRunAId: null,
  selectedRunBId: null,
  runHeader: null,
  results: null,
  trace: null,
  comparison: null,
  sldOverlay: null,
  showSldOverlay: false,
  activeTab: 'EVALUATIONS' as ProtectionResultsTab,
  activeComparisonTab: 'DIFFERENCES' as ProtectionComparisonTab,
  searchQuery: '',
  isLoadingHeader: false,
  isLoadingResults: false,
  isLoadingTrace: false,
  isLoadingComparison: false,
  isLoadingSldOverlay: false,
};

// =============================================================================
// Store Implementation
// =============================================================================

export const useProtectionResultsStore = create<ProtectionResultsInspectorState>((set, get) => ({
  ...initialState,

  setViewMode: (mode) => set({ viewMode: mode }),

  selectRun: (runId) => {
    set({
      viewMode: 'RUN',
      selectedRunId: runId,
      selectedRunAId: null,
      selectedRunBId: null,
      runHeader: null,
      results: null,
      trace: null,
      comparison: null,
      sldOverlay: null,
    });
    // Auto-load run data
    get().loadRunData();
  },

  selectComparison: (runAId, runBId) => {
    set({
      viewMode: 'COMPARISON',
      selectedRunId: null,
      selectedRunAId: runAId,
      selectedRunBId: runBId,
      runHeader: null,
      results: null,
      trace: null,
      comparison: null,
      sldOverlay: null,
    });
    // Auto-load comparison data
    get().loadComparison();
  },

  loadRunData: async () => {
    const { selectedRunId } = get();
    if (!selectedRunId) return;

    set({ isLoadingHeader: true });
    try {
      const header = await fetchProtectionRunHeader(selectedRunId);
      set({ runHeader: header });
    } catch (error) {
      console.error('Failed to load protection run header:', error);
    } finally {
      set({ isLoadingHeader: false });
    }
  },

  loadResults: async () => {
    const { selectedRunId } = get();
    if (!selectedRunId) return;

    set({ isLoadingResults: true });
    try {
      const results = await fetchProtectionResults(selectedRunId);
      set({ results });
    } catch (error) {
      console.error('Failed to load protection results:', error);
    } finally {
      set({ isLoadingResults: false });
    }
  },

  loadTrace: async () => {
    const { selectedRunId } = get();
    if (!selectedRunId) return;

    set({ isLoadingTrace: true });
    try {
      const trace = await fetchProtectionTrace(selectedRunId);
      set({ trace });
    } catch (error) {
      console.error('Failed to load protection trace:', error);
    } finally {
      set({ isLoadingTrace: false });
    }
  },

  loadComparison: async () => {
    const { selectedRunAId, selectedRunBId } = get();
    if (!selectedRunAId || !selectedRunBId) return;

    set({ isLoadingComparison: true });
    try {
      const comparison = await compareProtectionRuns(selectedRunAId, selectedRunBId);
      set({ comparison });
    } catch (error) {
      console.error('Failed to load protection comparison:', error);
    } finally {
      set({ isLoadingComparison: false });
    }
  },

  loadSldOverlay: async (projectId, diagramId) => {
    const { selectedRunId } = get();
    if (!selectedRunId) return;

    set({ isLoadingSldOverlay: true });
    try {
      const overlay = await fetchProtectionSldOverlay(projectId, diagramId, selectedRunId);
      set({ sldOverlay: overlay });
    } catch (error) {
      console.error('Failed to load protection SLD overlay:', error);
    } finally {
      set({ isLoadingSldOverlay: false });
    }
  },

  toggleSldOverlay: () => set((state) => ({ showSldOverlay: !state.showSldOverlay })),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setActiveComparisonTab: (tab) => set({ activeComparisonTab: tab }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  reset: () => set(initialState),
}));

// =============================================================================
// Selector Hooks (for derived/filtered state)
// =============================================================================

export function useIsAnyLoading() {
  return useProtectionResultsStore(
    (state) =>
      state.isLoadingHeader ||
      state.isLoadingResults ||
      state.isLoadingTrace ||
      state.isLoadingComparison ||
      state.isLoadingSldOverlay
  );
}

export function useFilteredEvaluations() {
  return useProtectionResultsStore((state) => {
    if (!state.results) return [];
    const { evaluations } = state.results;
    const { searchQuery } = state;

    if (!searchQuery) return evaluations;

    const lowerQuery = searchQuery.toLowerCase();
    return evaluations.filter(
      (ev) =>
        ev.protected_element_ref.toLowerCase().includes(lowerQuery) ||
        ev.device_id.toLowerCase().includes(lowerQuery) ||
        ev.trip_state.toLowerCase().includes(lowerQuery)
    );
  });
}

export function useFilteredComparisonEvaluations() {
  return useProtectionResultsStore((state) => {
    if (!state.comparison?.protection) return [];
    const { evaluations } = state.comparison.protection;
    const { searchQuery } = state;

    if (!searchQuery) return evaluations;

    const lowerQuery = searchQuery.toLowerCase();
    return evaluations.filter(
      (ev) =>
        ev.element_id.toLowerCase().includes(lowerQuery) ||
        ev.state_change.toLowerCase().includes(lowerQuery)
    );
  });
}
