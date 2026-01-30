/**
 * P11b — Results Inspector Store (Zustand)
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: READ-ONLY result display, no physics
 * - wizard_screens.md: RESULT_VIEW mode
 * - powerfactory_ui_parity.md: Deterministic result tables
 * - sld_rules.md: Overlay as separate layer
 *
 * STATE MANAGEMENT:
 * - Tracks selected run for inspection
 * - Caches fetched results (buses, branches, SC, trace)
 * - Manages active tab state
 * - Controls SLD overlay visibility
 *
 * INVARIANTS:
 * - No physics calculations
 * - No model mutations
 * - All data from backend via P11a endpoints
 */

import { create } from 'zustand';
import type {
  BranchResults,
  BusResults,
  ExtendedTrace,
  ResultsIndex,
  ResultsInspectorTab,
  ShortCircuitResults,
  SldResultOverlay,
  PowerFlowRunItem,
  PowerFlowResultV1,
  PowerFlowTrace,
  PowerFlowResultsTab,
} from './types';
import * as api from './api';

/**
 * Results Inspector store state.
 */
interface ResultsInspectorState {
  // Selected run ID
  selectedRunId: string | null;

  // Results index (available tables)
  resultsIndex: ResultsIndex | null;

  // Cached results
  busResults: BusResults | null;
  branchResults: BranchResults | null;
  shortCircuitResults: ShortCircuitResults | null;
  extendedTrace: ExtendedTrace | null;

  // SLD overlay
  sldOverlay: SldResultOverlay | null;
  overlayVisible: boolean;

  // Active tab
  activeTab: ResultsInspectorTab;

  // Search/filter state
  searchQuery: string;

  // Loading states
  isLoadingIndex: boolean;
  isLoadingBuses: boolean;
  isLoadingBranches: boolean;
  isLoadingShortCircuit: boolean;
  isLoadingTrace: boolean;
  isLoadingOverlay: boolean;

  // Error state
  error: string | null;

  // P20b: Power Flow state
  powerFlowRuns: PowerFlowRunItem[];
  selectedPowerFlowRunId: string | null;
  powerFlowResults: PowerFlowResultV1 | null;
  powerFlowTrace: PowerFlowTrace | null;
  activePowerFlowTab: PowerFlowResultsTab;
  isLoadingPowerFlowRuns: boolean;
  isLoadingPowerFlowResults: boolean;
  isLoadingPowerFlowTrace: boolean;
  powerFlowSearchQuery: string;

  // Actions
  selectRun: (runId: string) => Promise<void>;
  clearRun: () => void;
  setActiveTab: (tab: ResultsInspectorTab) => void;
  setSearchQuery: (query: string) => void;
  toggleOverlay: (visible?: boolean) => void;
  loadBusResults: () => Promise<void>;
  loadBranchResults: () => Promise<void>;
  loadShortCircuitResults: () => Promise<void>;
  loadExtendedTrace: () => Promise<void>;
  loadSldOverlay: (projectId: string, diagramId: string) => Promise<void>;
  reset: () => void;

  // P20b: Power Flow actions
  loadPowerFlowRuns: (projectId: string) => Promise<void>;
  selectPowerFlowRun: (runId: string) => Promise<void>;
  clearPowerFlowRun: () => void;
  setActivePowerFlowTab: (tab: PowerFlowResultsTab) => void;
  setPowerFlowSearchQuery: (query: string) => void;
  loadPowerFlowResults: () => Promise<void>;
  loadPowerFlowTrace: () => Promise<void>;
}

/**
 * Initial state values.
 */
const initialState = {
  selectedRunId: null,
  resultsIndex: null,
  busResults: null,
  branchResults: null,
  shortCircuitResults: null,
  extendedTrace: null,
  sldOverlay: null,
  overlayVisible: true,
  activeTab: 'BUSES' as ResultsInspectorTab,
  searchQuery: '',
  isLoadingIndex: false,
  isLoadingBuses: false,
  isLoadingBranches: false,
  isLoadingShortCircuit: false,
  isLoadingTrace: false,
  isLoadingOverlay: false,
  error: null,
  // P20b: Power Flow initial state
  powerFlowRuns: [] as PowerFlowRunItem[],
  selectedPowerFlowRunId: null,
  powerFlowResults: null,
  powerFlowTrace: null,
  activePowerFlowTab: 'PF_BUSES' as PowerFlowResultsTab,
  isLoadingPowerFlowRuns: false,
  isLoadingPowerFlowResults: false,
  isLoadingPowerFlowTrace: false,
  powerFlowSearchQuery: '',
};

/**
 * Zustand store for Results Inspector.
 */
export const useResultsInspectorStore = create<ResultsInspectorState>((set, get) => ({
  ...initialState,

  /**
   * Select a run and load its results index.
   */
  selectRun: async (runId) => {
    set({
      selectedRunId: runId,
      isLoadingIndex: true,
      error: null,
      // Clear cached results when switching runs
      busResults: null,
      branchResults: null,
      shortCircuitResults: null,
      extendedTrace: null,
      sldOverlay: null,
    });

    try {
      const resultsIndex = await api.fetchResultsIndex(runId);
      set({
        resultsIndex,
        isLoadingIndex: false,
      });

      // Auto-select appropriate tab based on available tables
      const { tables } = resultsIndex;
      const hasShortCircuit = tables.some((t) => t.table_id === 'short-circuit');
      if (hasShortCircuit) {
        set({ activeTab: 'SHORT_CIRCUIT' });
      } else if (tables.some((t) => t.table_id === 'buses')) {
        set({ activeTab: 'BUSES' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd ładowania wyników';
      set({ error: message, isLoadingIndex: false });
    }
  },

  /**
   * Clear selected run.
   */
  clearRun: () => {
    set(initialState);
  },

  /**
   * Set active tab.
   */
  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  /**
   * Set search query for filtering.
   */
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  /**
   * Toggle SLD overlay visibility.
   */
  toggleOverlay: (visible) => {
    set((state) => ({
      overlayVisible: visible !== undefined ? visible : !state.overlayVisible,
    }));
  },

  /**
   * Load bus results for selected run.
   */
  loadBusResults: async () => {
    const { selectedRunId } = get();
    if (!selectedRunId) return;

    set({ isLoadingBuses: true, error: null });
    try {
      const busResults = await api.fetchBusResults(selectedRunId);
      set({ busResults, isLoadingBuses: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd ładowania wyników węzłowych';
      set({ error: message, isLoadingBuses: false });
    }
  },

  /**
   * Load branch results for selected run.
   */
  loadBranchResults: async () => {
    const { selectedRunId } = get();
    if (!selectedRunId) return;

    set({ isLoadingBranches: true, error: null });
    try {
      const branchResults = await api.fetchBranchResults(selectedRunId);
      set({ branchResults, isLoadingBranches: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd ładowania wyników gałęziowych';
      set({ error: message, isLoadingBranches: false });
    }
  },

  /**
   * Load short-circuit results for selected run.
   */
  loadShortCircuitResults: async () => {
    const { selectedRunId } = get();
    if (!selectedRunId) return;

    set({ isLoadingShortCircuit: true, error: null });
    try {
      const shortCircuitResults = await api.fetchShortCircuitResults(selectedRunId);
      set({ shortCircuitResults, isLoadingShortCircuit: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd ładowania wyników zwarciowych';
      set({ error: message, isLoadingShortCircuit: false });
    }
  },

  /**
   * Load extended trace for selected run.
   */
  loadExtendedTrace: async () => {
    const { selectedRunId } = get();
    if (!selectedRunId) return;

    set({ isLoadingTrace: true, error: null });
    try {
      const extendedTrace = await api.fetchExtendedTrace(selectedRunId);
      set({ extendedTrace, isLoadingTrace: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd ładowania śladu obliczeń';
      set({ error: message, isLoadingTrace: false });
    }
  },

  /**
   * Load SLD overlay for selected run.
   */
  loadSldOverlay: async (projectId, diagramId) => {
    const { selectedRunId } = get();
    if (!selectedRunId) return;

    set({ isLoadingOverlay: true, error: null });
    try {
      const sldOverlay = await api.fetchSldOverlay(projectId, diagramId, selectedRunId);
      set({ sldOverlay, isLoadingOverlay: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd ładowania nakładki SLD';
      set({ error: message, isLoadingOverlay: false });
    }
  },

  // ==========================================================================
  // P20b: Power Flow Actions
  // ==========================================================================

  /**
   * P20b: Load Power Flow runs list for project.
   */
  loadPowerFlowRuns: async (projectId) => {
    set({ isLoadingPowerFlowRuns: true, error: null });
    try {
      const response = await api.fetchPowerFlowRuns(projectId);
      set({ powerFlowRuns: response.items, isLoadingPowerFlowRuns: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd ładowania historii rozpływów mocy';
      set({ error: message, isLoadingPowerFlowRuns: false });
    }
  },

  /**
   * P20b: Select a Power Flow run and load its results.
   */
  selectPowerFlowRun: async (runId) => {
    set({
      selectedPowerFlowRunId: runId,
      isLoadingPowerFlowResults: true,
      error: null,
      // Clear previous results
      powerFlowResults: null,
      powerFlowTrace: null,
    });

    try {
      const results = await api.fetchPowerFlowResults(runId);
      set({
        powerFlowResults: results,
        isLoadingPowerFlowResults: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd ładowania wyników rozpływu mocy';
      set({ error: message, isLoadingPowerFlowResults: false });
    }
  },

  /**
   * P20b: Clear selected Power Flow run.
   */
  clearPowerFlowRun: () => {
    set({
      selectedPowerFlowRunId: null,
      powerFlowResults: null,
      powerFlowTrace: null,
      activePowerFlowTab: 'PF_BUSES',
      powerFlowSearchQuery: '',
    });
  },

  /**
   * P20b: Set active Power Flow tab.
   */
  setActivePowerFlowTab: (tab) => {
    set({ activePowerFlowTab: tab });
  },

  /**
   * P20b: Set Power Flow search query.
   */
  setPowerFlowSearchQuery: (query) => {
    set({ powerFlowSearchQuery: query });
  },

  /**
   * P20b: Load Power Flow results (if not already loaded).
   */
  loadPowerFlowResults: async () => {
    const { selectedPowerFlowRunId, powerFlowResults } = get();
    if (!selectedPowerFlowRunId || powerFlowResults) return;

    set({ isLoadingPowerFlowResults: true, error: null });
    try {
      const results = await api.fetchPowerFlowResults(selectedPowerFlowRunId);
      set({ powerFlowResults: results, isLoadingPowerFlowResults: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd ładowania wyników rozpływu mocy';
      set({ error: message, isLoadingPowerFlowResults: false });
    }
  },

  /**
   * P20b: Load Power Flow trace (Newton-Raphson iterations).
   */
  loadPowerFlowTrace: async () => {
    const { selectedPowerFlowRunId, powerFlowTrace } = get();
    if (!selectedPowerFlowRunId || powerFlowTrace) return;

    set({ isLoadingPowerFlowTrace: true, error: null });
    try {
      const trace = await api.fetchPowerFlowTrace(selectedPowerFlowRunId);
      set({ powerFlowTrace: trace, isLoadingPowerFlowTrace: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd ładowania śladu obliczeń';
      set({ error: message, isLoadingPowerFlowTrace: false });
    }
  },

  /**
   * Reset store to initial state.
   */
  reset: () => {
    set(initialState);
  },
}));

// =============================================================================
// Derived Hooks
// =============================================================================

/**
 * Hook: Check if a run is selected.
 */
export function useHasSelectedRun(): boolean {
  return useResultsInspectorStore((state) => state.selectedRunId !== null);
}

/**
 * Hook: Get available table IDs for current run.
 */
export function useAvailableTables(): string[] {
  return useResultsInspectorStore((state) =>
    state.resultsIndex?.tables.map((t) => t.table_id) ?? []
  );
}

/**
 * Hook: Check if short-circuit tab should be visible.
 */
export function useHasShortCircuitResults(): boolean {
  return useResultsInspectorStore((state) =>
    state.resultsIndex?.tables.some((t) => t.table_id === 'short-circuit') ?? false
  );
}

/**
 * Hook: Get filtered bus results based on search query.
 */
export function useFilteredBusResults(): BusResults['rows'] {
  return useResultsInspectorStore((state) => {
    const rows = state.busResults?.rows ?? [];
    const query = state.searchQuery.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.bus_id.toLowerCase().includes(query)
    );
  });
}

/**
 * Hook: Get filtered branch results based on search query.
 */
export function useFilteredBranchResults(): BranchResults['rows'] {
  return useResultsInspectorStore((state) => {
    const rows = state.branchResults?.rows ?? [];
    const query = state.searchQuery.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.branch_id.toLowerCase().includes(query) ||
        row.from_bus.toLowerCase().includes(query) ||
        row.to_bus.toLowerCase().includes(query)
    );
  });
}

/**
 * Hook: Get run result status label.
 */
export function useRunResultStatusLabel(): string {
  return useResultsInspectorStore((state) => {
    const resultState = state.resultsIndex?.run_header.result_state;
    if (!resultState) return 'Brak wyników';
    switch (resultState) {
      case 'VALID':
      case 'FRESH':
        return 'Wyniki aktualne';
      case 'OUTDATED':
        return 'Wyniki nieaktualne';
      default:
        return 'Brak wyników';
    }
  });
}

/**
 * Hook: Check if any data is loading.
 */
export function useIsAnyLoading(): boolean {
  return useResultsInspectorStore(
    (state) =>
      state.isLoadingIndex ||
      state.isLoadingBuses ||
      state.isLoadingBranches ||
      state.isLoadingShortCircuit ||
      state.isLoadingTrace ||
      state.isLoadingOverlay ||
      state.isLoadingPowerFlowRuns ||
      state.isLoadingPowerFlowResults ||
      state.isLoadingPowerFlowTrace
  );
}

// =============================================================================
// P20b: Power Flow Derived Hooks
// =============================================================================

/**
 * P20b: Hook: Get filtered Power Flow bus results.
 */
export function useFilteredPowerFlowBusResults(): import('./types').PowerFlowBusResult[] {
  return useResultsInspectorStore((state) => {
    const results = state.powerFlowResults?.bus_results ?? [];
    const query = state.powerFlowSearchQuery.toLowerCase().trim();
    if (!query) return results;
    return results.filter((row) => row.bus_id.toLowerCase().includes(query));
  });
}

/**
 * P20b: Hook: Get filtered Power Flow branch results.
 */
export function useFilteredPowerFlowBranchResults(): import('./types').PowerFlowBranchResult[] {
  return useResultsInspectorStore((state) => {
    const results = state.powerFlowResults?.branch_results ?? [];
    const query = state.powerFlowSearchQuery.toLowerCase().trim();
    if (!query) return results;
    return results.filter((row) => row.branch_id.toLowerCase().includes(query));
  });
}

/**
 * P20b: Hook: Check if Power Flow run is selected.
 */
export function useHasPowerFlowRun(): boolean {
  return useResultsInspectorStore((state) => state.selectedPowerFlowRunId !== null);
}

/**
 * P20b: Hook: Get Power Flow convergence status label.
 */
export function usePowerFlowConvergenceLabel(): string {
  return useResultsInspectorStore((state) => {
    const results = state.powerFlowResults;
    if (!results) return 'Brak wyników';
    return results.converged ? 'Zbieżność osiągnięta' : 'Brak zbieżności';
  });
}
