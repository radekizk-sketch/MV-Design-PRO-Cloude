/**
 * SLD Diagnostics Store (Zustand)
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § B: Results/diagnostics as overlay
 * - 100% POLISH UI
 *
 * Simple store for diagnostics overlay state:
 * - Visibility toggle
 * - Severity filter
 *
 * READ-ONLY: No model mutations.
 */

import { create } from 'zustand';
import type { DiagnosticsSeverityFilter } from '../protection';

// =============================================================================
// Store State Interface
// =============================================================================

interface DiagnosticsStoreState {
  /** Diagnostics overlay visibility */
  diagnosticsVisible: boolean;

  /** Severity filter */
  diagnosticsFilter: DiagnosticsSeverityFilter;

  /** Toggle visibility */
  toggleDiagnostics: (visible?: boolean) => void;

  /** Set filter */
  setDiagnosticsFilter: (filter: DiagnosticsSeverityFilter) => void;

  /** Reset to defaults */
  resetDiagnostics: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  diagnosticsVisible: false,
  diagnosticsFilter: 'ALL' as DiagnosticsSeverityFilter,
};

// =============================================================================
// Store
// =============================================================================

/**
 * Zustand store for SLD diagnostics overlay state.
 *
 * @example
 * ```tsx
 * const { diagnosticsVisible, toggleDiagnostics } = useDiagnosticsStore();
 * ```
 */
export const useDiagnosticsStore = create<DiagnosticsStoreState>((set) => ({
  ...initialState,

  /**
   * Toggle diagnostics overlay visibility.
   * If `visible` is provided, sets to that value.
   * Otherwise, toggles current state.
   */
  toggleDiagnostics: (visible) =>
    set((state) => ({
      diagnosticsVisible: visible !== undefined ? visible : !state.diagnosticsVisible,
    })),

  /**
   * Set severity filter.
   */
  setDiagnosticsFilter: (filter) =>
    set(() => ({
      diagnosticsFilter: filter,
    })),

  /**
   * Reset to initial state.
   */
  resetDiagnostics: () => set(initialState),
}));

// =============================================================================
// Derived Hooks
// =============================================================================

/**
 * Hook: Check if diagnostics overlay is visible.
 */
export function useDiagnosticsVisible(): boolean {
  return useDiagnosticsStore((state) => state.diagnosticsVisible);
}

/**
 * Hook: Get current filter.
 */
export function useDiagnosticsFilter(): DiagnosticsSeverityFilter {
  return useDiagnosticsStore((state) => state.diagnosticsFilter);
}
