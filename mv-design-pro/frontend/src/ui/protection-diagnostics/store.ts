/**
 * Protection Diagnostics Store — Zustand adapter
 *
 * CANONICAL ALIGNMENT:
 * - Contract-first: UI gotowe zanim backend dostarczy dane
 * - READ-ONLY: brak obliczeń, tylko renderowanie
 * - Minimalny adapter: przyjmuje gotową listę wyników
 *
 * BINDING:
 * - UI nie generuje wyników, tylko renderuje
 * - Dane mogą być dostarczone przez:
 *   1. Props (ProtectionDiagnosticsPanel)
 *   2. Context/Hook (useProtectionDiagnostics)
 *   3. Przyszłe API endpoint
 */

import { create } from 'zustand';
import type {
  ProtectionSanityCheckResult,
  DiagnosticSeverity,
  DiagnosticsStats,
} from './types';
import { sortDiagnosticsResults, computeDiagnosticsStats } from './types';

// =============================================================================
// Store State Interface
// =============================================================================

interface ProtectionDiagnosticsState {
  // --- DATA ---
  /** Lista wyników diagnostyki (posortowana deterministycznie) */
  results: ProtectionSanityCheckResult[];

  // --- LOADING STATE ---
  /** Czy dane są ładowane */
  isLoading: boolean;
  /** Komunikat błędu (jeśli wystąpił) */
  error: string | null;

  // --- FILTERS ---
  /** Filtr severity (puste = wszystkie) */
  severityFilter: DiagnosticSeverity[];
  /** Filtr po element_id (dla Inspector sekcji) */
  elementIdFilter: string | null;

  // --- ACTIONS ---
  /** Ustaw wyniki diagnostyki (z deterministycznym sortowaniem) */
  setResults: (results: ProtectionSanityCheckResult[]) => void;
  /** Wyczyść wyniki */
  clearResults: () => void;
  /** Ustaw stan ładowania */
  setLoading: (loading: boolean) => void;
  /** Ustaw błąd */
  setError: (error: string | null) => void;
  /** Toggle filtr severity */
  toggleSeverityFilter: (severity: DiagnosticSeverity) => void;
  /** Ustaw filtr element_id */
  setElementIdFilter: (elementId: string | null) => void;
  /** Reset wszystkich filtrów */
  resetFilters: () => void;
}

// =============================================================================
// Store Creation
// =============================================================================

export const useProtectionDiagnosticsStore = create<ProtectionDiagnosticsState>((set) => ({
  // --- Initial State ---
  results: [],
  isLoading: false,
  error: null,
  severityFilter: [],
  elementIdFilter: null,

  // --- Actions ---
  setResults: (results) =>
    set({
      results: sortDiagnosticsResults(results),
      error: null,
    }),

  clearResults: () =>
    set({
      results: [],
      error: null,
    }),

  setLoading: (loading) =>
    set({
      isLoading: loading,
    }),

  setError: (error) =>
    set({
      error,
      isLoading: false,
    }),

  toggleSeverityFilter: (severity) =>
    set((state) => {
      const current = state.severityFilter;
      const hasFilter = current.includes(severity);
      return {
        severityFilter: hasFilter
          ? current.filter((s) => s !== severity)
          : [...current, severity],
      };
    }),

  setElementIdFilter: (elementId) =>
    set({
      elementIdFilter: elementId,
    }),

  resetFilters: () =>
    set({
      severityFilter: [],
      elementIdFilter: null,
    }),
}));

// =============================================================================
// Derived Selectors (Hooks)
// =============================================================================

/**
 * Hook: pobierz przefiltrowane wyniki.
 * Stosuje filtry severity i element_id.
 */
export function useFilteredDiagnostics(): ProtectionSanityCheckResult[] {
  return useProtectionDiagnosticsStore((state) => {
    let filtered = state.results;

    // Filtr severity (puste = wszystkie)
    if (state.severityFilter.length > 0) {
      filtered = filtered.filter((r) => state.severityFilter.includes(r.severity));
    }

    // Filtr element_id
    if (state.elementIdFilter) {
      filtered = filtered.filter((r) => r.element_id === state.elementIdFilter);
    }

    return filtered;
  });
}

/**
 * Hook: pobierz wyniki dla konkretnego elementu.
 * Używane w Inspector sekcji.
 */
export function useDiagnosticsForElement(elementId: string | null): ProtectionSanityCheckResult[] {
  return useProtectionDiagnosticsStore((state) => {
    if (!elementId) return [];
    return state.results.filter((r) => r.element_id === elementId);
  });
}

/**
 * Hook: pobierz statystyki diagnostyki.
 */
export function useDiagnosticsStats(): DiagnosticsStats {
  return useProtectionDiagnosticsStore((state) => computeDiagnosticsStats(state.results));
}

/**
 * Hook: sprawdź czy są jakiekolwiek wyniki.
 */
export function useHasDiagnostics(): boolean {
  return useProtectionDiagnosticsStore((state) => state.results.length > 0);
}

/**
 * Hook: sprawdź czy są błędy (ERROR).
 */
export function useHasErrors(): boolean {
  return useProtectionDiagnosticsStore((state) =>
    state.results.some((r) => r.severity === 'ERROR')
  );
}

/**
 * Hook: pobierz stan ładowania.
 */
export function useIsLoading(): boolean {
  return useProtectionDiagnosticsStore((state) => state.isLoading);
}

/**
 * Hook: pobierz błąd.
 */
export function useDiagnosticsError(): string | null {
  return useProtectionDiagnosticsStore((state) => state.error);
}

/**
 * Hook: pobierz aktywne filtry severity.
 */
export function useSeverityFilter(): DiagnosticSeverity[] {
  return useProtectionDiagnosticsStore((state) => state.severityFilter);
}
