/**
 * Global Application State Store — P12a Data Manager Parity
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 1.2: Operating modes (MODEL_EDIT, CASE_CONFIG, RESULT_VIEW)
 * - wizard_screens.md § 1.3: Active case awareness
 * - powerfactory_ui_parity.md § A: Mode-based gating
 *
 * SINGLE SOURCE OF TRUTH for:
 * - Active project ID
 * - Active case ID and kind
 * - Operating mode (MODEL_EDIT / CASE_CONFIG / RESULT_VIEW)
 * - Active run ID (for RESULT_VIEW)
 *
 * INVARIANTS:
 * - Exactly ONE active case per project
 * - No activeCaseId → [Oblicz] button DISABLED
 * - MODEL_EDIT: model mutable, results invalidated on change
 * - CASE_CONFIG: model read-only, case config mutable
 * - RESULT_VIEW: everything read-only
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OperatingMode, ResultStatus } from '../types';

/**
 * Case kind (type of calculation case).
 */
export type CaseKind = 'ShortCircuitCase' | 'PowerFlowCase';

/**
 * Global application state interface.
 */
interface AppState {
  // Project context
  activeProjectId: string | null;
  activeProjectName: string | null;

  // Active case context
  activeCaseId: string | null;
  activeCaseName: string | null;
  activeCaseKind: CaseKind | null;
  activeCaseResultStatus: ResultStatus;

  // Operating mode (controls UI gating)
  activeMode: OperatingMode;

  // Results context (only in RESULT_VIEW)
  activeRunId: string | null;

  // UI state
  caseManagerOpen: boolean;

  // Actions
  setActiveProject: (projectId: string | null, projectName?: string | null) => void;
  setActiveCase: (
    caseId: string | null,
    caseName?: string | null,
    caseKind?: CaseKind | null,
    resultStatus?: ResultStatus
  ) => void;
  setActiveCaseResultStatus: (status: ResultStatus) => void;
  setActiveMode: (mode: OperatingMode) => void;
  setActiveRun: (runId: string | null) => void;
  toggleCaseManager: (open?: boolean) => void;

  // Computed helpers
  hasActiveCase: () => boolean;
  canCalculate: () => boolean;
  isModelEditable: () => boolean;
  isCaseConfigEditable: () => boolean;
  isReadOnly: () => boolean;

  // Reset
  reset: () => void;
}

/**
 * Initial state values.
 */
const initialState = {
  activeProjectId: null,
  activeProjectName: null,
  activeCaseId: null,
  activeCaseName: null,
  activeCaseKind: null,
  activeCaseResultStatus: 'NONE' as ResultStatus,
  activeMode: 'MODEL_EDIT' as OperatingMode,
  activeRunId: null,
  caseManagerOpen: false,
};

/**
 * Zustand store for global application state.
 */
export const useAppStateStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Set active project.
       * Clears active case when project changes.
       */
      setActiveProject: (projectId, projectName = null) => {
        const current = get();
        // If project changed, clear case context
        if (current.activeProjectId !== projectId) {
          set({
            activeProjectId: projectId,
            activeProjectName: projectName,
            activeCaseId: null,
            activeCaseName: null,
            activeCaseKind: null,
            activeCaseResultStatus: 'NONE',
            activeRunId: null,
          });
        } else {
          set({
            activeProjectId: projectId,
            activeProjectName: projectName,
          });
        }
      },

      /**
       * Set active case.
       */
      setActiveCase: (caseId, caseName = null, caseKind = null, resultStatus = 'NONE') => {
        set({
          activeCaseId: caseId,
          activeCaseName: caseName,
          activeCaseKind: caseKind,
          activeCaseResultStatus: resultStatus,
          // Clear run when case changes
          activeRunId: null,
        });
      },

      /**
       * Update result status for active case.
       */
      setActiveCaseResultStatus: (status) => {
        set({ activeCaseResultStatus: status });
      },

      /**
       * Set operating mode.
       */
      setActiveMode: (mode) => {
        set({ activeMode: mode });
        // Clear run if exiting RESULT_VIEW
        if (mode !== 'RESULT_VIEW') {
          set({ activeRunId: null });
        }
      },

      /**
       * Set active run (for RESULT_VIEW mode).
       */
      setActiveRun: (runId) => {
        set({ activeRunId: runId });
      },

      /**
       * Toggle Case Manager panel visibility.
       */
      toggleCaseManager: (open) => {
        set((state) => ({
          caseManagerOpen: open !== undefined ? open : !state.caseManagerOpen,
        }));
      },

      /**
       * Check if there's an active case.
       */
      hasActiveCase: () => {
        return get().activeCaseId !== null;
      },

      /**
       * Check if calculation can be started.
       * Requires: active case + MODEL_EDIT mode + results not FRESH
       */
      canCalculate: () => {
        const state = get();
        return (
          state.activeCaseId !== null &&
          state.activeMode === 'MODEL_EDIT' &&
          state.activeCaseResultStatus !== 'FRESH'
        );
      },

      /**
       * Check if model is editable (MODEL_EDIT mode).
       */
      isModelEditable: () => {
        return get().activeMode === 'MODEL_EDIT';
      },

      /**
       * Check if case config is editable (MODEL_EDIT or CASE_CONFIG).
       */
      isCaseConfigEditable: () => {
        const mode = get().activeMode;
        return mode === 'MODEL_EDIT' || mode === 'CASE_CONFIG';
      },

      /**
       * Check if in read-only mode (RESULT_VIEW).
       */
      isReadOnly: () => {
        return get().activeMode === 'RESULT_VIEW';
      },

      /**
       * Reset to initial state.
       */
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'mv-design-app-state',
      // Only persist project and case IDs, not transient state
      partialize: (state) => ({
        activeProjectId: state.activeProjectId,
        activeProjectName: state.activeProjectName,
        activeCaseId: state.activeCaseId,
        activeCaseName: state.activeCaseName,
        activeCaseKind: state.activeCaseKind,
      }),
    }
  )
);

// =============================================================================
// Derived Hooks
// =============================================================================

/**
 * Hook: Get active project ID.
 */
export function useActiveProjectId(): string | null {
  return useAppStateStore((state) => state.activeProjectId);
}

/**
 * Hook: Get active case ID.
 */
export function useActiveCaseId(): string | null {
  return useAppStateStore((state) => state.activeCaseId);
}

/**
 * Hook: Get active case name.
 */
export function useActiveCaseName(): string | null {
  return useAppStateStore((state) => state.activeCaseName);
}

/**
 * Hook: Get active case kind.
 */
export function useActiveCaseKind(): CaseKind | null {
  return useAppStateStore((state) => state.activeCaseKind);
}

/**
 * Hook: Get active mode.
 */
export function useActiveMode(): OperatingMode {
  return useAppStateStore((state) => state.activeMode);
}

/**
 * Hook: Get active mode label in Polish.
 */
export function useActiveModeLabel(): string {
  const mode = useAppStateStore((state) => state.activeMode);
  switch (mode) {
    case 'MODEL_EDIT':
      return 'Edycja modelu';
    case 'CASE_CONFIG':
      return 'Konfiguracja przypadku';
    case 'RESULT_VIEW':
      return 'Przeglądanie wyników';
    default:
      return mode;
  }
}

/**
 * Hook: Get case kind label in Polish.
 */
export function useCaseKindLabel(): string | null {
  const kind = useAppStateStore((state) => state.activeCaseKind);
  if (!kind) return null;
  switch (kind) {
    case 'ShortCircuitCase':
      return 'Przypadek zwarciowy';
    case 'PowerFlowCase':
      return 'Przypadek rozpływowy';
    default:
      return kind;
  }
}

/**
 * Hook: Get result status label in Polish.
 */
export function useResultStatusLabel(): string {
  const status = useAppStateStore((state) => state.activeCaseResultStatus);
  switch (status) {
    case 'NONE':
      return 'Brak wyników';
    case 'FRESH':
      return 'Wyniki aktualne';
    case 'OUTDATED':
      return 'Wyniki nieaktualne';
    default:
      return status;
  }
}

/**
 * Hook: Check if there's an active case.
 */
export function useHasActiveCase(): boolean {
  return useAppStateStore((state) => state.activeCaseId !== null);
}

/**
 * Hook: Check if calculation is allowed.
 */
export function useCanCalculate(): { allowed: boolean; reason: string | null } {
  const activeCaseId = useAppStateStore((state) => state.activeCaseId);
  const activeMode = useAppStateStore((state) => state.activeMode);
  const resultStatus = useAppStateStore((state) => state.activeCaseResultStatus);

  if (!activeCaseId) {
    return { allowed: false, reason: 'Wybierz aktywny przypadek obliczeniowy' };
  }

  if (activeMode !== 'MODEL_EDIT') {
    return {
      allowed: false,
      reason: 'Obliczenia dozwolone tylko w trybie Edycja modelu',
    };
  }

  if (resultStatus === 'FRESH') {
    return {
      allowed: false,
      reason: 'Wyniki są aktualne — brak potrzeby przeliczania',
    };
  }

  return { allowed: true, reason: null };
}

/**
 * Hook: Check if Case Manager panel is open.
 */
export function useCaseManagerOpen(): boolean {
  return useAppStateStore((state) => state.caseManagerOpen);
}
