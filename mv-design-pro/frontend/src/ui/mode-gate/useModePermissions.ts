/**
 * Mode Permissions Hooks — P12a Data Manager Parity
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 1.2: Operating modes
 * - powerfactory_ui_parity.md § A: Mode-based gating
 *
 * Hooks for checking mode-based permissions across the app.
 * All blocked reasons are in Polish.
 */

import { useMemo, useCallback } from 'react';
import { useActiveMode } from '../app-state';
import type { OperatingMode } from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * General app actions that can be gated by mode.
 */
export type AppAction =
  // Model actions
  | 'model.add_element'
  | 'model.edit_element'
  | 'model.delete_element'
  | 'model.edit_topology'
  // Case actions
  | 'case.create'
  | 'case.rename'
  | 'case.delete'
  | 'case.clone'
  | 'case.activate'
  | 'case.edit_config'
  // Calculation actions
  | 'calc.run'
  // Result actions
  | 'result.view'
  | 'result.export'
  | 'result.compare';

/**
 * Permission check result.
 */
export interface PermissionResult {
  allowed: boolean;
  blockedReason: string | null;
}

// =============================================================================
// Permission Matrix
// =============================================================================

const PERMISSION_MATRIX: Record<OperatingMode, Record<AppAction, boolean>> = {
  MODEL_EDIT: {
    // Model actions - all allowed
    'model.add_element': true,
    'model.edit_element': true,
    'model.delete_element': true,
    'model.edit_topology': true,
    // Case actions - all allowed
    'case.create': true,
    'case.rename': true,
    'case.delete': true,
    'case.clone': true,
    'case.activate': true,
    'case.edit_config': true,
    // Calculation - allowed
    'calc.run': true,
    // Results - view only
    'result.view': true,
    'result.export': true,
    'result.compare': true,
  },
  CASE_CONFIG: {
    // Model actions - blocked
    'model.add_element': false,
    'model.edit_element': false,
    'model.delete_element': false,
    'model.edit_topology': false,
    // Case actions - only config edit
    'case.create': false,
    'case.rename': false,
    'case.delete': false,
    'case.clone': false,
    'case.activate': false,
    'case.edit_config': true,
    // Calculation - blocked
    'calc.run': false,
    // Results - view only
    'result.view': true,
    'result.export': true,
    'result.compare': true,
  },
  RESULT_VIEW: {
    // Model actions - blocked
    'model.add_element': false,
    'model.edit_element': false,
    'model.delete_element': false,
    'model.edit_topology': false,
    // Case actions - blocked
    'case.create': false,
    'case.rename': false,
    'case.delete': false,
    'case.clone': false,
    'case.activate': false,
    'case.edit_config': false,
    // Calculation - blocked
    'calc.run': false,
    // Results - full access
    'result.view': true,
    'result.export': true,
    'result.compare': true,
  },
};

// =============================================================================
// Blocked Reason Messages (Polish)
// =============================================================================

const BLOCKED_REASONS: Record<AppAction, Record<OperatingMode, string>> = {
  // Model actions
  'model.add_element': {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Dodawanie elementów zablokowane w trybie konfiguracji przypadku',
    RESULT_VIEW: 'Dodawanie elementów zablokowane w trybie wyników',
  },
  'model.edit_element': {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Edycja elementów zablokowana w trybie konfiguracji przypadku',
    RESULT_VIEW: 'Edycja elementów zablokowana w trybie wyników',
  },
  'model.delete_element': {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Usuwanie elementów zablokowane w trybie konfiguracji przypadku',
    RESULT_VIEW: 'Usuwanie elementów zablokowane w trybie wyników',
  },
  'model.edit_topology': {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Edycja topologii zablokowana w trybie konfiguracji przypadku',
    RESULT_VIEW: 'Edycja topologii zablokowana w trybie wyników',
  },
  // Case actions
  'case.create': {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Tworzenie przypadków zablokowane w trybie konfiguracji',
    RESULT_VIEW: 'Tworzenie przypadków zablokowane w trybie wyników',
  },
  'case.rename': {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Zmiana nazwy zablokowana w trybie konfiguracji',
    RESULT_VIEW: 'Zmiana nazwy zablokowana w trybie wyników',
  },
  'case.delete': {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Usuwanie przypadków zablokowane w trybie konfiguracji',
    RESULT_VIEW: 'Usuwanie przypadków zablokowane w trybie wyników',
  },
  'case.clone': {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Klonowanie przypadków zablokowane w trybie konfiguracji',
    RESULT_VIEW: 'Klonowanie przypadków zablokowane w trybie wyników',
  },
  'case.activate': {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Aktywacja przypadków zablokowana w trybie konfiguracji',
    RESULT_VIEW: 'Aktywacja przypadków zablokowana w trybie wyników',
  },
  'case.edit_config': {
    MODEL_EDIT: '',
    CASE_CONFIG: '',
    RESULT_VIEW: 'Edycja konfiguracji zablokowana w trybie wyników',
  },
  // Calculation
  'calc.run': {
    MODEL_EDIT: '',
    CASE_CONFIG: 'Obliczenia zablokowane w trybie konfiguracji',
    RESULT_VIEW: 'Obliczenia zablokowane w trybie wyników',
  },
  // Results
  'result.view': {
    MODEL_EDIT: '',
    CASE_CONFIG: '',
    RESULT_VIEW: '',
  },
  'result.export': {
    MODEL_EDIT: '',
    CASE_CONFIG: '',
    RESULT_VIEW: '',
  },
  'result.compare': {
    MODEL_EDIT: '',
    CASE_CONFIG: '',
    RESULT_VIEW: '',
  },
};

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to check permission for a specific action.
 *
 * @param action The action to check
 * @returns PermissionResult with allowed flag and blocked reason
 */
export function useActionPermission(action: AppAction): PermissionResult {
  const mode = useActiveMode();

  return useMemo(() => {
    const allowed = PERMISSION_MATRIX[mode]?.[action] ?? false;
    const blockedReason = allowed ? null : BLOCKED_REASONS[action]?.[mode] || null;
    return { allowed, blockedReason };
  }, [mode, action]);
}

/**
 * Hook to get all mode permissions.
 *
 * Returns permission checking functions.
 */
export function useModePermissions(): {
  mode: OperatingMode;
  isAllowed: (action: AppAction) => boolean;
  getBlockedReason: (action: AppAction) => string | null;
  checkPermission: (action: AppAction) => PermissionResult;
} {
  const mode = useActiveMode();

  const isAllowed = useCallback(
    (action: AppAction): boolean => {
      return PERMISSION_MATRIX[mode]?.[action] ?? false;
    },
    [mode]
  );

  const getBlockedReason = useCallback(
    (action: AppAction): string | null => {
      if (isAllowed(action)) return null;
      return BLOCKED_REASONS[action]?.[mode] || `Akcja niedostępna w trybie ${mode}`;
    },
    [mode, isAllowed]
  );

  const checkPermission = useCallback(
    (action: AppAction): PermissionResult => {
      const allowed = isAllowed(action);
      const blockedReason = allowed ? null : getBlockedReason(action);
      return { allowed, blockedReason };
    },
    [isAllowed, getBlockedReason]
  );

  return { mode, isAllowed, getBlockedReason, checkPermission };
}

/**
 * Hook to check if model editing is allowed.
 */
export function useCanEditModel(): PermissionResult {
  return useActionPermission('model.edit_element');
}

/**
 * Hook to check if case configuration is allowed.
 */
export function useCanEditCaseConfig(): PermissionResult {
  return useActionPermission('case.edit_config');
}

/**
 * Hook to check if calculations can be run.
 */
export function useCanRunCalculations(): PermissionResult {
  return useActionPermission('calc.run');
}

/**
 * Hook that throws error on blocked action attempt.
 * Use for programmatic enforcement.
 */
export function useEnforcePermission(): (action: AppAction) => void {
  const { isAllowed, getBlockedReason } = useModePermissions();

  return useCallback(
    (action: AppAction) => {
      if (!isAllowed(action)) {
        const reason = getBlockedReason(action);
        throw new Error(reason || 'Akcja niedostępna');
      }
    },
    [isAllowed, getBlockedReason]
  );
}
