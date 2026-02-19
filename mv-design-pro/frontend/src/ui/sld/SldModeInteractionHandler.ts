/**
 * SLD Mode Interaction Handler — §11 UX 10/10
 *
 * Mode-aware element click handling on the SLD diagram:
 * - NORMALNY: standard click -> select + inspect
 * - AWARYJNY: click -> toggle out-of-service + immediate overlay update
 * - ZWARCIE: click bus -> set fault bus + show SC overlay
 *
 * INVARIANTS:
 * - No direct model mutations (delegates to CDSE pipeline)
 * - Deterministic mode transitions
 * - All feedback in Polish
 */

import { useOperationalModeStore } from './operationalModeStore';
import type { OperationalMode } from './operationalModeStore';

// =============================================================================
// Types
// =============================================================================

/** Click context passed from the SLD rendering layer. */
export interface SldClickContext {
  elementId: string;
  elementType: string;
  portId?: string;
  busId?: string;
  isShift?: boolean;
  isCtrl?: boolean;
}

/** Result of handling a click — describes what action was resolved. */
export interface SldClickResult {
  action: 'SELECT' | 'TOGGLE_SERVICE' | 'SET_FAULT_BUS' | 'NONE';
  elementId: string;
  feedbackPl: string;
  shouldRefreshOverlay: boolean;
  shouldRefreshReadiness: boolean;
}

/** Emergency mode toggle result for UI notification. */
export interface EmergencyToggleResult {
  elementId: string;
  newState: 'IN_SERVICE' | 'OUT_OF_SERVICE';
  messagePl: string;
}

/** Visual style modifier applied per-element based on operational mode. */
export interface ModeOverlayStyle {
  opacity: number;
  strokeDash?: string;
  badgeText?: string;
  badgeColor?: string;
}

// =============================================================================
// Element type sets (deterministic, no heuristics)
// =============================================================================

/** Element types that can be toggled out-of-service in AWARYJNY mode. */
const TOGGLEABLE_TYPES = new Set([
  'LineBranch',
  'Switch',
  'TransformerBranch',
  'Source',
  'Load',
  'Breaker',
  'Disconnector',
  'Fuse',
  'BusCoupler',
]);

/** Element types that represent buses — valid fault locations in ZWARCIE mode. */
const BUS_TYPES = new Set(['Bus', 'BusSN', 'BusNN']);

// =============================================================================
// Click Resolution
// =============================================================================

/**
 * Determine click action based on current operational mode.
 *
 * Pure function — no side effects. The caller is responsible for executing
 * the resolved action via {@link executeClickAction}.
 */
export function resolveClickAction(
  mode: OperationalMode,
  ctx: SldClickContext,
): SldClickResult {
  switch (mode) {
    case 'NORMALNY':
      return {
        action: 'SELECT',
        elementId: ctx.elementId,
        feedbackPl: '',
        shouldRefreshOverlay: false,
        shouldRefreshReadiness: false,
      };

    case 'AWARYJNY': {
      if (!TOGGLEABLE_TYPES.has(ctx.elementType)) {
        return {
          action: 'SELECT',
          elementId: ctx.elementId,
          feedbackPl: 'Ten element nie może być wyłączony z eksploatacji',
          shouldRefreshOverlay: false,
          shouldRefreshReadiness: false,
        };
      }
      return {
        action: 'TOGGLE_SERVICE',
        elementId: ctx.elementId,
        feedbackPl: '',
        shouldRefreshOverlay: true,
        shouldRefreshReadiness: true,
      };
    }

    case 'ZWARCIE': {
      if (!BUS_TYPES.has(ctx.elementType)) {
        return {
          action: 'NONE',
          elementId: ctx.elementId,
          feedbackPl: 'Wybierz węzeł (szynę) jako miejsce zwarcia',
          shouldRefreshOverlay: false,
          shouldRefreshReadiness: false,
        };
      }
      return {
        action: 'SET_FAULT_BUS',
        elementId: ctx.busId ?? ctx.elementId,
        feedbackPl: `Miejsce zwarcia: ${ctx.busId ?? ctx.elementId}`,
        shouldRefreshOverlay: true,
        shouldRefreshReadiness: false,
      };
    }
  }
}

// =============================================================================
// Click Execution
// =============================================================================

/**
 * Execute the resolved click action against the operational mode store.
 *
 * Returns an {@link EmergencyToggleResult} when TOGGLE_SERVICE was performed
 * (useful for toast/notification display), or null otherwise.
 */
export function executeClickAction(result: SldClickResult): EmergencyToggleResult | null {
  const store = useOperationalModeStore.getState();

  switch (result.action) {
    case 'TOGGLE_SERVICE': {
      const wasOutOfService = store.pendingOutOfServiceIds.includes(result.elementId);
      store.toggleOutOfService(result.elementId);
      return {
        elementId: result.elementId,
        newState: wasOutOfService ? 'IN_SERVICE' : 'OUT_OF_SERVICE',
        messagePl: wasOutOfService
          ? `Element ${result.elementId} przywrócony do eksploatacji`
          : `Element ${result.elementId} wyłączony z eksploatacji`,
      };
    }

    case 'SET_FAULT_BUS': {
      store.selectFaultBus(result.elementId);
      return null;
    }

    default:
      return null;
  }
}

// =============================================================================
// Query Helpers
// =============================================================================

/**
 * Check if an element is currently marked as out-of-service in emergency mode.
 */
export function isElementOutOfService(elementId: string): boolean {
  return useOperationalModeStore.getState().pendingOutOfServiceIds.includes(elementId);
}

// =============================================================================
// Overlay Style
// =============================================================================

/**
 * Get overlay style modifier based on operational mode.
 *
 * Used by the SLD renderer to apply visual changes per-element:
 * - AWARYJNY: out-of-service elements shown with reduced opacity, dashed stroke, red badge "WYŁ."
 * - ZWARCIE: selected fault bus highlighted with red "ZWARCIE" badge
 *
 * Returns null when no mode-specific overlay applies to the element.
 */
export function getElementModeOverlay(
  mode: OperationalMode,
  elementId: string,
): ModeOverlayStyle | null {
  if (mode === 'AWARYJNY') {
    const isOOS = isElementOutOfService(elementId);
    if (isOOS) {
      return {
        opacity: 0.35,
        strokeDash: '8 4',
        badgeText: 'WYŁ.',
        badgeColor: '#dc2626',
      };
    }
  }

  if (mode === 'ZWARCIE') {
    const store = useOperationalModeStore.getState();
    if (store.selectedFaultBusId === elementId) {
      return {
        opacity: 1.0,
        badgeText: 'ZWARCIE',
        badgeColor: '#ef4444',
      };
    }
  }

  return null;
}
