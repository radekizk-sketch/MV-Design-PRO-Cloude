/**
 * Study Cases Mode Gating — P10 FULL MAX
 *
 * CANONICAL ALIGNMENT:
 * - P10: Study Cases / Variants (PowerFactory-grade)
 * - powerfactory_ui_parity.md § C: Mode-based UI gating
 *
 * MODE RULES FOR STUDY CASES:
 *
 * MODEL_EDIT:
 * - Create, rename, delete cases: ALLOWED
 * - Clone cases: ALLOWED
 * - Activate case: ALLOWED
 * - Edit case config: ALLOWED (marks case OUTDATED)
 * - Run calculations: ALLOWED (on active case)
 * - Compare cases: ALLOWED (read-only)
 *
 * CASE_CONFIG:
 * - Create, rename, delete cases: BLOCKED
 * - Clone cases: BLOCKED
 * - Activate case: BLOCKED
 * - Edit case config: ALLOWED (marks case OUTDATED)
 * - Run calculations: BLOCKED
 * - Compare cases: ALLOWED (read-only)
 *
 * RESULT_VIEW:
 * - All case management: BLOCKED
 * - View case info: ALLOWED (read-only)
 * - Compare cases: ALLOWED (read-only)
 *
 * RESULT STATUS RULES:
 * - NetworkModel change → ALL cases OUTDATED
 * - Case config change → ONLY that case OUTDATED
 * - Successful calculation → case FRESH
 * - Case clone → new case NONE (no results)
 */

import { useCallback } from 'react';
import { useSelectionStore } from '../selection/store';
import { useStudyCasesStore } from './store';
import type { OperatingMode } from '../types';

/**
 * Study case operation type.
 */
export type StudyCaseOperation =
  | 'create'
  | 'rename'
  | 'delete'
  | 'clone'
  | 'activate'
  | 'edit_config'
  | 'calculate'
  | 'compare'
  | 'view';

/**
 * Hook: Check if a study case operation is allowed in current mode.
 */
export function useCanPerformCaseOperation(): {
  isAllowed: (operation: StudyCaseOperation) => boolean;
  getBlockedReason: (operation: StudyCaseOperation) => string | null;
} {
  const mode = useSelectionStore((state) => state.mode);

  const isAllowed = useCallback(
    (operation: StudyCaseOperation): boolean => {
      switch (operation) {
        case 'create':
        case 'rename':
        case 'delete':
        case 'clone':
        case 'activate':
          // Only allowed in MODEL_EDIT
          return mode === 'MODEL_EDIT';

        case 'edit_config':
          // Allowed in MODEL_EDIT and CASE_CONFIG
          return mode === 'MODEL_EDIT' || mode === 'CASE_CONFIG';

        case 'calculate':
          // Only allowed in MODEL_EDIT (on active case)
          return mode === 'MODEL_EDIT';

        case 'compare':
        case 'view':
          // Always allowed (read-only)
          return true;

        default:
          return false;
      }
    },
    [mode]
  );

  const getBlockedReason = useCallback(
    (operation: StudyCaseOperation): string | null => {
      if (isAllowed(operation)) return null;

      const modeLabel =
        mode === 'CASE_CONFIG'
          ? 'Konfiguracja przypadku'
          : mode === 'RESULT_VIEW'
            ? 'Wyniki'
            : mode;

      switch (operation) {
        case 'create':
          return `Tworzenie przypadków zablokowane w trybie: ${modeLabel}`;
        case 'rename':
          return `Zmiana nazwy zablokowana w trybie: ${modeLabel}`;
        case 'delete':
          return `Usuwanie przypadków zablokowane w trybie: ${modeLabel}`;
        case 'clone':
          return `Klonowanie przypadków zablokowane w trybie: ${modeLabel}`;
        case 'activate':
          return `Aktywacja przypadków zablokowana w trybie: ${modeLabel}`;
        case 'edit_config':
          return `Edycja konfiguracji zablokowana w trybie: ${modeLabel}`;
        case 'calculate':
          return `Obliczenia zablokowane w trybie: ${modeLabel}`;
        default:
          return `Operacja zablokowana w trybie: ${modeLabel}`;
      }
    },
    [mode, isAllowed]
  );

  return { isAllowed, getBlockedReason };
}

/**
 * Hook: Can create a new study case?
 */
export function useCanCreateCase(): boolean {
  const mode = useSelectionStore((state) => state.mode);
  return mode === 'MODEL_EDIT';
}

/**
 * Hook: Can manage cases (create/rename/delete/clone)?
 */
export function useCanManageCases(): boolean {
  const mode = useSelectionStore((state) => state.mode);
  return mode === 'MODEL_EDIT';
}

/**
 * Hook: Can edit case configuration?
 */
export function useCanEditCaseConfig(): boolean {
  const mode = useSelectionStore((state) => state.mode);
  return mode === 'MODEL_EDIT' || mode === 'CASE_CONFIG';
}

/**
 * Hook: Can run calculations?
 */
export function useCanCalculate(): {
  canCalculate: boolean;
  blockedReason: string | null;
} {
  const mode = useSelectionStore((state) => state.mode);
  const activeCase = useStudyCasesStore((state) => state.activeCase);

  if (mode !== 'MODEL_EDIT') {
    return {
      canCalculate: false,
      blockedReason: 'Obliczenia dozwolone tylko w trybie Edycja modelu',
    };
  }

  if (!activeCase) {
    return {
      canCalculate: false,
      blockedReason: 'Wymagany aktywny przypadek obliczeniowy',
    };
  }

  if (activeCase.result_status === 'FRESH') {
    return {
      canCalculate: false,
      blockedReason: 'Wyniki są aktualne — brak potrzeby przeliczania',
    };
  }

  return { canCalculate: true, blockedReason: null };
}

/**
 * Hook: Notify that NetworkModel has changed.
 * Marks ALL cases as OUTDATED.
 */
export function useNotifyModelChange(): () => Promise<void> {
  const invalidateAllCases = useStudyCasesStore(
    (state) => state.invalidateAllCases
  );

  return useCallback(async () => {
    await invalidateAllCases();
  }, [invalidateAllCases]);
}

/**
 * Hook: Get current mode constraints for study cases.
 */
export function useCaseModeConstraints(): {
  mode: OperatingMode;
  canManage: boolean;
  canEditConfig: boolean;
  canCalculate: boolean;
  isReadOnly: boolean;
} {
  const mode = useSelectionStore((state) => state.mode);

  return {
    mode,
    canManage: mode === 'MODEL_EDIT',
    canEditConfig: mode === 'MODEL_EDIT' || mode === 'CASE_CONFIG',
    canCalculate: mode === 'MODEL_EDIT',
    isReadOnly: mode === 'RESULT_VIEW',
  };
}

/**
 * Hook: Check if case activation is allowed.
 */
export function useCanActivateCase(): {
  canActivate: (caseId: string) => boolean;
  getBlockedReason: () => string | null;
} {
  const mode = useSelectionStore((state) => state.mode);
  const activeCase = useStudyCasesStore((state) => state.activeCase);

  const canActivate = useCallback(
    (caseId: string): boolean => {
      if (mode !== 'MODEL_EDIT') return false;
      // Don't activate if already active
      if (activeCase?.id === caseId) return false;
      return true;
    },
    [mode, activeCase]
  );

  const getBlockedReason = useCallback((): string | null => {
    if (mode !== 'MODEL_EDIT') {
      return 'Aktywacja przypadków dozwolona tylko w trybie Edycja modelu';
    }
    return null;
  }, [mode]);

  return { canActivate, getBlockedReason };
}
