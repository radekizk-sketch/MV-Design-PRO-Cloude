/**
 * Results Workspace Store — PR-22 + PR-23 (Determinism Lock)
 *
 * State management for Unified Results Workspace.
 * Supports RUN / BATCH / COMPARE modes with deep-linking.
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: Read-only result display, no physics
 * - UI_CORE_ARCHITECTURE.md: Deterministic URL synchronization
 *
 * INVARIANTS:
 * - No physics calculations
 * - No model mutations
 * - Deterministic sorting (lexicographic, no Date.now, no Math.random)
 * - URL ↔ state synchronization (deep-linking)
 * - Mode determines which panel is active (RUN/BATCH/COMPARE)
 *
 * PR-23 URL DETERMINISM LOCK:
 * - URL is the SOLE source of truth for mode/selection/overlay
 * - buildUrlFromState() and parseStateFromUrl() are pure functions
 * - serialize → parse → serialize must produce identical URL
 * - No internal defaults override URL state
 */

import { create } from 'zustand';
import type {
  WorkspaceProjection,
  WorkspaceMode,
  OverlayDisplayMode,
  WorkspaceFilter,
  RunSummary,
  BatchSummary,
  ComparisonSummary,
} from './types';
import { WORKSPACE_URL_PARAMS } from './types';
import * as api from './api';

// =============================================================================
// State Interface
// =============================================================================

interface ResultsWorkspaceState {
  // Study case context
  studyCaseId: string | null;

  // Projection data (from backend)
  projection: WorkspaceProjection | null;

  // Mode selection
  mode: WorkspaceMode;

  // Item selection (one per mode)
  selectedRunId: string | null;
  selectedBatchId: string | null;
  selectedComparisonId: string | null;

  // SLD overlay mode
  overlayMode: OverlayDisplayMode;

  // Filter
  filter: WorkspaceFilter;

  // Loading / error states
  isLoading: boolean;
  error: string | null;

  // Actions
  setStudyCaseId: (id: string | null) => void;
  loadProjection: (studyCaseId: string) => Promise<void>;
  setMode: (mode: WorkspaceMode) => void;
  selectRun: (runId: string | null) => void;
  selectBatch: (batchId: string | null) => void;
  selectComparison: (comparisonId: string | null) => void;
  setOverlayMode: (mode: OverlayDisplayMode) => void;
  setFilter: (filter: WorkspaceFilter) => void;
  syncFromUrl: () => void;
  syncToUrl: () => void;
  clearError: () => void;
  reset: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  studyCaseId: null as string | null,
  projection: null as WorkspaceProjection | null,
  mode: 'RUN' as WorkspaceMode,
  selectedRunId: null as string | null,
  selectedBatchId: null as string | null,
  selectedComparisonId: null as string | null,
  overlayMode: 'result' as OverlayDisplayMode,
  filter: 'ALL' as WorkspaceFilter,
  isLoading: false,
  error: null as string | null,
};

// =============================================================================
// URL Helpers (deterministic, no side effects)
// =============================================================================

/**
 * Parse workspace params from URL hash.
 * Works with hash-based routing: #results-workspace?run=...&overlay=result
 */
export function parseWorkspaceUrlParams(): {
  runId: string | null;
  batchId: string | null;
  comparisonId: string | null;
  overlayMode: OverlayDisplayMode | null;
} {
  if (typeof window === 'undefined') {
    return { runId: null, batchId: null, comparisonId: null, overlayMode: null };
  }

  const hash = window.location.hash;
  const queryIndex = hash.indexOf('?');
  if (queryIndex === -1) {
    return { runId: null, batchId: null, comparisonId: null, overlayMode: null };
  }

  const params = new URLSearchParams(hash.slice(queryIndex + 1));

  const overlayRaw = params.get(WORKSPACE_URL_PARAMS.OVERLAY);
  let overlayMode: OverlayDisplayMode | null = null;
  if (overlayRaw === 'result' || overlayRaw === 'delta' || overlayRaw === 'none') {
    overlayMode = overlayRaw;
  }

  return {
    runId: params.get(WORKSPACE_URL_PARAMS.RUN),
    batchId: params.get(WORKSPACE_URL_PARAMS.BATCH),
    comparisonId: params.get(WORKSPACE_URL_PARAMS.COMPARISON),
    overlayMode,
  };
}

/**
 * Build URL search params from workspace state.
 * Deterministic output — no random values.
 */
export function buildWorkspaceUrlParams(state: {
  selectedRunId: string | null;
  selectedBatchId: string | null;
  selectedComparisonId: string | null;
  overlayMode: OverlayDisplayMode;
}): URLSearchParams {
  const params = new URLSearchParams();

  if (state.selectedRunId) {
    params.set(WORKSPACE_URL_PARAMS.RUN, state.selectedRunId);
  }
  if (state.selectedBatchId) {
    params.set(WORKSPACE_URL_PARAMS.BATCH, state.selectedBatchId);
  }
  if (state.selectedComparisonId) {
    params.set(WORKSPACE_URL_PARAMS.COMPARISON, state.selectedComparisonId);
  }
  if (state.overlayMode !== 'result') {
    params.set(WORKSPACE_URL_PARAMS.OVERLAY, state.overlayMode);
  }

  return params;
}

// =============================================================================
// PR-23: URL Determinism Lock — buildUrlFromState / parseStateFromUrl
// =============================================================================

/**
 * Workspace URL state — the minimal set of fields persisted in URL.
 * This is the SOLE source of truth for view state after hard refresh.
 */
export interface WorkspaceUrlState {
  mode: WorkspaceMode;
  selectedRunId: string | null;
  selectedBatchId: string | null;
  selectedComparisonId: string | null;
  overlayMode: OverlayDisplayMode;
}

/**
 * PR-23: Build a deterministic URL search string from workspace state.
 *
 * Pure function. No side effects. Deterministic output.
 * serialize(state) → parse(url) → serialize(state') must yield identical URL.
 */
export function buildUrlFromState(state: WorkspaceUrlState): string {
  const params = new URLSearchParams();

  // Mode is always explicit in URL (no implicit defaults)
  params.set('mode', state.mode.toLowerCase());

  if (state.selectedRunId) {
    params.set(WORKSPACE_URL_PARAMS.RUN, state.selectedRunId);
  }
  if (state.selectedBatchId) {
    params.set(WORKSPACE_URL_PARAMS.BATCH, state.selectedBatchId);
  }
  if (state.selectedComparisonId) {
    params.set(WORKSPACE_URL_PARAMS.COMPARISON, state.selectedComparisonId);
  }

  // Overlay always explicit — no implicit 'result' default
  params.set(WORKSPACE_URL_PARAMS.OVERLAY, state.overlayMode);

  return params.toString();
}

/**
 * PR-23: Parse workspace state from a URL search string.
 *
 * Pure function. No side effects. Deterministic output.
 * Returns fully populated WorkspaceUrlState with explicit defaults.
 */
export function parseStateFromUrl(search: string): WorkspaceUrlState {
  const params = new URLSearchParams(search);

  const modeRaw = params.get('mode');
  let mode: WorkspaceMode = 'RUN';
  if (modeRaw === 'batch') mode = 'BATCH';
  else if (modeRaw === 'compare') mode = 'COMPARE';
  else if (modeRaw === 'run') mode = 'RUN';

  const overlayRaw = params.get(WORKSPACE_URL_PARAMS.OVERLAY);
  let overlayMode: OverlayDisplayMode = 'result';
  if (overlayRaw === 'result' || overlayRaw === 'delta' || overlayRaw === 'none') {
    overlayMode = overlayRaw;
  }

  // Infer mode from selection if mode param is absent
  const runId = params.get(WORKSPACE_URL_PARAMS.RUN);
  const batchId = params.get(WORKSPACE_URL_PARAMS.BATCH);
  const comparisonId = params.get(WORKSPACE_URL_PARAMS.COMPARISON);

  if (!modeRaw) {
    if (comparisonId) mode = 'COMPARE';
    else if (batchId) mode = 'BATCH';
    else if (runId) mode = 'RUN';
  }

  return {
    mode,
    selectedRunId: runId,
    selectedBatchId: batchId,
    selectedComparisonId: comparisonId,
    overlayMode,
  };
}

// =============================================================================
// Filtering Helpers (deterministic)
// =============================================================================

export function filterRuns(
  runs: RunSummary[],
  filter: WorkspaceFilter
): RunSummary[] {
  if (filter === 'ALL') return runs;
  if (filter === 'DONE') return runs.filter((r) => r.status === 'DONE');
  if (filter === 'FAILED') return runs.filter((r) => r.status === 'FAILED');
  // Analysis type filters
  return runs.filter((r) => r.analysis_type === filter);
}

export function filterBatches(
  batches: BatchSummary[],
  filter: WorkspaceFilter
): BatchSummary[] {
  if (filter === 'ALL') return batches;
  if (filter === 'DONE') return batches.filter((b) => b.status === 'DONE');
  if (filter === 'FAILED') return batches.filter((b) => b.status === 'FAILED');
  return batches.filter((b) => b.analysis_type === filter);
}

export function filterComparisons(
  comparisons: ComparisonSummary[],
  filter: WorkspaceFilter
): ComparisonSummary[] {
  if (filter === 'ALL') return comparisons;
  if (filter === 'DONE' || filter === 'FAILED') return comparisons;
  return comparisons.filter((c) => c.analysis_type === filter);
}

// =============================================================================
// Store
// =============================================================================

export const useResultsWorkspaceStore = create<ResultsWorkspaceState>(
  (set, get) => ({
    ...initialState,

    setStudyCaseId: (id) => {
      const current = get().studyCaseId;
      if (current !== id) {
        set({ studyCaseId: id, projection: null, error: null });
        if (id) {
          get().loadProjection(id);
        }
      }
    },

    loadProjection: async (studyCaseId) => {
      set({ isLoading: true, error: null });
      try {
        const projection = await api.fetchWorkspaceProjection(studyCaseId);
        set({ projection, isLoading: false });

        // Auto-select latest done run if none selected
        const { selectedRunId } = get();
        if (!selectedRunId && projection.latest_done_run_id) {
          set({ selectedRunId: projection.latest_done_run_id });
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Błąd ładowania przestrzeni roboczej wyników';
        set({ error: message, isLoading: false });
      }
    },

    setMode: (mode) => {
      set({ mode });
      get().syncToUrl();
    },

    selectRun: (runId) => {
      set({
        selectedRunId: runId,
        mode: 'RUN',
        overlayMode: 'result',
      });
      get().syncToUrl();
    },

    selectBatch: (batchId) => {
      set({
        selectedBatchId: batchId,
        mode: 'BATCH',
      });
      get().syncToUrl();
    },

    selectComparison: (comparisonId) => {
      set({
        selectedComparisonId: comparisonId,
        mode: 'COMPARE',
        overlayMode: 'delta',
      });
      get().syncToUrl();
    },

    setOverlayMode: (overlayMode) => {
      set({ overlayMode });
      get().syncToUrl();
    },

    setFilter: (filter) => {
      set({ filter });
    },

    syncFromUrl: () => {
      const urlState = parseWorkspaceUrlParams();

      const updates: Partial<ResultsWorkspaceState> = {};

      if (urlState.runId) {
        updates.selectedRunId = urlState.runId;
        updates.mode = 'RUN';
      }
      if (urlState.batchId) {
        updates.selectedBatchId = urlState.batchId;
        updates.mode = 'BATCH';
      }
      if (urlState.comparisonId) {
        updates.selectedComparisonId = urlState.comparisonId;
        updates.mode = 'COMPARE';
      }
      if (urlState.overlayMode) {
        updates.overlayMode = urlState.overlayMode;
      }

      if (Object.keys(updates).length > 0) {
        set(updates);
      }
    },

    syncToUrl: () => {
      if (typeof window === 'undefined') return;

      const state = get();
      const params = buildWorkspaceUrlParams({
        selectedRunId: state.selectedRunId,
        selectedBatchId: state.selectedBatchId,
        selectedComparisonId: state.selectedComparisonId,
        overlayMode: state.overlayMode,
      });

      const hash = window.location.hash;
      const queryIndex = hash.indexOf('?');
      const baseHash = queryIndex !== -1 ? hash.slice(0, queryIndex) : hash;

      const queryString = params.toString();
      const newHash = queryString ? `${baseHash}?${queryString}` : baseHash;

      const newUrl = `${window.location.pathname}${newHash}`;
      window.history.replaceState(null, '', newUrl);
    },

    clearError: () => set({ error: null }),

    reset: () => set(initialState),
  })
);

// =============================================================================
// Derived Hooks
// =============================================================================

/**
 * Hook: Get filtered runs from projection.
 */
export function useFilteredRuns(): RunSummary[] {
  return useResultsWorkspaceStore((state) => {
    const runs = state.projection?.runs ?? [];
    return filterRuns(runs, state.filter);
  });
}

/**
 * Hook: Get filtered batches from projection.
 */
export function useFilteredBatches(): BatchSummary[] {
  return useResultsWorkspaceStore((state) => {
    const batches = state.projection?.batches ?? [];
    return filterBatches(batches, state.filter);
  });
}

/**
 * Hook: Get filtered comparisons from projection.
 */
export function useFilteredComparisons(): ComparisonSummary[] {
  return useResultsWorkspaceStore((state) => {
    const comparisons = state.projection?.comparisons ?? [];
    return filterComparisons(comparisons, state.filter);
  });
}

/**
 * Hook: Get currently selected run details.
 */
export function useSelectedRunDetail(): RunSummary | null {
  return useResultsWorkspaceStore((state) => {
    if (!state.selectedRunId || !state.projection) return null;
    return (
      state.projection.runs.find((r) => r.run_id === state.selectedRunId) ??
      null
    );
  });
}

/**
 * Hook: Get currently selected batch details.
 */
export function useSelectedBatchDetail(): BatchSummary | null {
  return useResultsWorkspaceStore((state) => {
    if (!state.selectedBatchId || !state.projection) return null;
    return (
      state.projection.batches.find(
        (b) => b.batch_id === state.selectedBatchId
      ) ?? null
    );
  });
}

/**
 * Hook: Get currently selected comparison details.
 */
export function useSelectedComparisonDetail(): ComparisonSummary | null {
  return useResultsWorkspaceStore((state) => {
    if (!state.selectedComparisonId || !state.projection) return null;
    return (
      state.projection.comparisons.find(
        (c) => c.comparison_id === state.selectedComparisonId
      ) ?? null
    );
  });
}

/**
 * Hook: Get workspace projection hash.
 */
export function useProjectionHash(): string | null {
  return useResultsWorkspaceStore(
    (state) => state.projection?.deterministic_hash ?? null
  );
}
