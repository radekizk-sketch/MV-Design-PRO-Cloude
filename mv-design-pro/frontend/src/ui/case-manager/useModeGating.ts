/**
 * Mode Gating Hook for Case Manager — P12a Data Manager Parity
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 1.2: Operating modes
 * - powerfactory_ui_parity.md § A: Mode-based gating
 *
 * HARD BLOCKS (Polish messages):
 * - MODEL_EDIT: Full CRUD allowed
 * - CASE_CONFIG: Only config edit allowed
 * - RESULT_VIEW: Read-only (all CRUD blocked)
 *
 * INVARIANT: Action blocked → Polish message displayed.
 */

import { useMemo, useCallback } from 'react';
import { useActiveMode } from '../app-state';
import type { OperatingMode } from '../types';

/**
 * Case Manager actions that can be gated.
 */
type CaseAction =
  | 'create'
  | 'rename'
  | 'delete'
  | 'clone'
  | 'activate'
  | 'edit_config'
  | 'calculate';

/**
 * Mode permissions for Case Manager.
 */
const MODE_PERMISSIONS: Record<OperatingMode, Record<CaseAction, boolean>> = {
  MODEL_EDIT: {
    create: true,
    rename: true,
    delete: true,
    clone: true,
    activate: true,
    edit_config: true,
    calculate: true,
  },
  CASE_CONFIG: {
    create: false,
    rename: false,
    delete: false,
    clone: false,
    activate: false,
    edit_config: true,
    calculate: false,
  },
  RESULT_VIEW: {
    create: false,
    rename: false,
    delete: false,
    clone: false,
    activate: false,
    edit_config: false,
    calculate: false,
  },
};

/**
 * Polish blocked messages by action and mode.
 */
const BLOCKED_MESSAGES: Record<CaseAction, Record<OperatingMode, string>> = {
  create: {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Tworzenie przypadków zablokowane w trybie konfiguracji',
    RESULT_VIEW: 'Tworzenie przypadków zablokowane w trybie wyników',
  },
  rename: {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Zmiana nazwy zablokowana w trybie konfiguracji',
    RESULT_VIEW: 'Zmiana nazwy zablokowana w trybie wyników',
  },
  delete: {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Usuwanie przypadków zablokowane w trybie konfiguracji',
    RESULT_VIEW: 'Usuwanie przypadków zablokowane w trybie wyników',
  },
  clone: {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Klonowanie przypadków zablokowane w trybie konfiguracji',
    RESULT_VIEW: 'Klonowanie przypadków zablokowane w trybie wyników',
  },
  activate: {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Aktywacja przypadków zablokowana w trybie konfiguracji',
    RESULT_VIEW: 'Aktywacja przypadków zablokowana w trybie wyników',
  },
  edit_config: {
    MODEL_EDIT: '',
    CASE_CONFIG: '',
    RESULT_VIEW: 'Edycja konfiguracji zablokowana w trybie wyników',
  },
  calculate: {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Obliczenia zablokowane w trybie konfiguracji',
    RESULT_VIEW: 'Obliczenia zablokowane w trybie wyników',
  },
};

/**
 * Hook for mode-based permission checking in Case Manager.
 *
 * Returns:
 * - Boolean flags for each action
 * - getBlockedReason() function for Polish messages
 */
export function useModeGating(): {
  mode: OperatingMode;
  canCreate: boolean;
  canRename: boolean;
  canDelete: boolean;
  canClone: boolean;
  canActivate: boolean;
  canEditConfig: boolean;
  canCalculate: boolean;
  isAllowed: (action: CaseAction) => boolean;
  getBlockedReason: (action: CaseAction) => string | null;
} {
  const mode = useActiveMode();

  const permissions = useMemo(() => MODE_PERMISSIONS[mode], [mode]);

  const isAllowed = useCallback(
    (action: CaseAction): boolean => {
      return permissions[action] ?? false;
    },
    [permissions]
  );

  const getBlockedReason = useCallback(
    (action: CaseAction): string | null => {
      if (permissions[action]) return null;
      return BLOCKED_MESSAGES[action]?.[mode] || `Akcja niedostępna w trybie ${mode}`;
    },
    [permissions, mode]
  );

  return {
    mode,
    canCreate: permissions.create,
    canRename: permissions.rename,
    canDelete: permissions.delete,
    canClone: permissions.clone,
    canActivate: permissions.activate,
    canEditConfig: permissions.edit_config,
    canCalculate: permissions.calculate,
    isAllowed,
    getBlockedReason,
  };
}

/**
 * Hook to check if a specific action is blocked and get the reason.
 *
 * Returns { blocked: boolean, reason: string | null }
 */
export function useActionBlocked(action: CaseAction): {
  blocked: boolean;
  reason: string | null;
} {
  const { isAllowed, getBlockedReason } = useModeGating();

  return useMemo(
    () => ({
      blocked: !isAllowed(action),
      reason: getBlockedReason(action),
    }),
    [isAllowed, getBlockedReason, action]
  );
}

/**
 * Hook to show blocked action toast/message.
 *
 * Returns a function that displays the blocked reason.
 */
export function useBlockedActionHandler(): (action: CaseAction) => void {
  const { getBlockedReason } = useModeGating();

  return useCallback(
    (action: CaseAction) => {
      const reason = getBlockedReason(action);
      if (reason) {
        // TODO: Integrate with toast/notification system
        alert(reason);
      }
    },
    [getBlockedReason]
  );
}
