/**
 * Mode Gating for Results Lifecycle (PowerFactory-grade)
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md § C: Mode-based UI gating
 * - SYSTEM_SPEC.md § 5: Result lifecycle transitions
 *
 * GATING RULES:
 * - MODEL_EDIT: edycja dozwolona, overlay ukryty
 * - RESULT_VIEW: read-only, overlay tylko gdy FRESH
 * - CASE_CONFIG: zmiany konfiguracji → OUTDATED, brak edycji topologii
 */

import { useCallback } from 'react';
import { useSelectionStore } from '../selection/store';
import { useResultsStore } from './resultsStore';
import type { OperatingMode } from '../types';

/**
 * Hook: Safe mode transition with result lifecycle awareness.
 *
 * RULES:
 * - MODEL_EDIT: Always allowed, marks results OUTDATED
 * - RESULT_VIEW: Only allowed when results FRESH
 * - CASE_CONFIG: Always allowed
 */
export function useSafeModeTransition(): {
  canTransitionTo: (mode: OperatingMode) => boolean;
  transitionTo: (mode: OperatingMode) => boolean;
  getBlockedReason: (mode: OperatingMode) => string | null;
} {
  const currentMode = useSelectionStore((state) => state.mode);
  const setMode = useSelectionStore((state) => state.setMode);
  const resultStatus = useResultsStore((state) => state.status);
  const markOutdated = useResultsStore((state) => state.markOutdated);

  const canTransitionTo = useCallback(
    (mode: OperatingMode): boolean => {
      // RESULT_VIEW requires FRESH results
      if (mode === 'RESULT_VIEW') {
        return resultStatus === 'FRESH';
      }
      return true;
    },
    [resultStatus]
  );

  const getBlockedReason = useCallback(
    (mode: OperatingMode): string | null => {
      if (mode === 'RESULT_VIEW' && resultStatus !== 'FRESH') {
        if (resultStatus === 'NONE') {
          return 'Brak wyników — najpierw uruchom obliczenia';
        }
        return 'Wyniki nieaktualne — wymagane ponowne obliczenie';
      }
      return null;
    },
    [resultStatus]
  );

  const transitionTo = useCallback(
    (mode: OperatingMode): boolean => {
      if (!canTransitionTo(mode)) {
        return false;
      }

      // Entering MODEL_EDIT marks results as OUTDATED
      if (mode === 'MODEL_EDIT' && currentMode !== 'MODEL_EDIT') {
        markOutdated();
      }

      setMode(mode);
      return true;
    },
    [canTransitionTo, currentMode, setMode, markOutdated]
  );

  return { canTransitionTo, transitionTo, getBlockedReason };
}

/**
 * Hook: Model mutation tracker.
 * Call this when any model/topology change occurs to mark results OUTDATED.
 *
 * Usage:
 * ```tsx
 * const { notifyMutation } = useModelMutation();
 * // After any topology/parameter change:
 * notifyMutation('parameter_change');
 * ```
 */
export function useModelMutation(): {
  notifyMutation: (reason?: string) => void;
} {
  const markOutdated = useResultsStore((state) => state.markOutdated);
  const mode = useSelectionStore((state) => state.mode);

  const notifyMutation = useCallback(
    (_reason?: string) => {
      // Only mark outdated if we have results and are in edit mode
      if (mode === 'MODEL_EDIT' || mode === 'CASE_CONFIG') {
        markOutdated();
      }
      // In RESULT_VIEW, mutations are blocked (gating prevents this call)
    },
    [markOutdated, mode]
  );

  return { notifyMutation };
}

/**
 * Hook: Is current mode allowing topology edits?
 */
export function useCanEditTopology(): boolean {
  const mode = useSelectionStore((state) => state.mode);
  return mode === 'MODEL_EDIT';
}

/**
 * Hook: Is current mode allowing parameter edits?
 */
export function useCanEditParameters(): boolean {
  const mode = useSelectionStore((state) => state.mode);
  return mode === 'MODEL_EDIT' || mode === 'CASE_CONFIG';
}

/**
 * Hook: Is current mode read-only (RESULT_VIEW)?
 */
export function useIsReadOnly(): boolean {
  const mode = useSelectionStore((state) => state.mode);
  return mode === 'RESULT_VIEW';
}

/**
 * Hook: Should show results overlay?
 * Only in RESULT_VIEW mode with FRESH results.
 */
export function useShouldShowOverlay(): boolean {
  const mode = useSelectionStore((state) => state.mode);
  const resultStatus = useResultsStore((state) => state.status);
  return mode === 'RESULT_VIEW' && resultStatus === 'FRESH';
}

/**
 * Hook: Overlay visibility state.
 * Returns visibility and reason if hidden.
 */
export function useOverlayVisibility(): {
  visible: boolean;
  hiddenReason: string | null;
} {
  const mode = useSelectionStore((state) => state.mode);
  const resultStatus = useResultsStore((state) => state.status);

  if (mode !== 'RESULT_VIEW') {
    return {
      visible: false,
      hiddenReason: 'Overlay widoczny tylko w trybie Wyniki',
    };
  }

  if (resultStatus === 'NONE') {
    return {
      visible: false,
      hiddenReason: 'Brak wyników — uruchom obliczenia',
    };
  }

  if (resultStatus === 'OUTDATED') {
    return {
      visible: false,
      hiddenReason: 'Wyniki nieaktualne — wymagane ponowne obliczenie',
    };
  }

  return { visible: true, hiddenReason: null };
}
