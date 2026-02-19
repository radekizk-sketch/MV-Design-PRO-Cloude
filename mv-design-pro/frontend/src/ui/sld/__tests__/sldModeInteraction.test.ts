/**
 * SLD Mode Interaction — §11 UX 10/10 Tests
 *
 * Tests the pure logic functions in SldModeInteractionHandler:
 * - resolveClickAction: mode + click context -> action resolution
 * - executeClickAction: action -> store mutation + emergency toggle result
 * - getElementModeOverlay: mode + element -> visual overlay style
 * - isElementOutOfService: element -> boolean
 *
 * Pure logic tests — no React rendering.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveClickAction,
  executeClickAction,
  getElementModeOverlay,
  isElementOutOfService,
} from '../SldModeInteractionHandler';
import type {
  SldClickContext,
  SldClickResult,
} from '../SldModeInteractionHandler';
import { useOperationalModeStore } from '../operationalModeStore';

// =============================================================================
// SETUP
// =============================================================================

describe('SLD Mode Interaction — §11 UX 10/10', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useOperationalModeStore.getState().reset();
  });

  // ---------------------------------------------------------------------------
  // Helper: create click context
  // ---------------------------------------------------------------------------

  function makeCtx(
    elementId: string,
    elementType: string,
    busId?: string,
  ): SldClickContext {
    return { elementId, elementType, busId };
  }

  // ---------------------------------------------------------------------------
  // NORMALNY mode
  // ---------------------------------------------------------------------------

  describe('NORMALNY mode', () => {
    it('click returns SELECT action', () => {
      const result = resolveClickAction('NORMALNY', makeCtx('elem-001', 'Bus'));
      expect(result.action).toBe('SELECT');
      expect(result.elementId).toBe('elem-001');
    });

    it('does not refresh overlay', () => {
      const result = resolveClickAction('NORMALNY', makeCtx('elem-001', 'Bus'));
      expect(result.shouldRefreshOverlay).toBe(false);
    });

    it('does not refresh readiness', () => {
      const result = resolveClickAction('NORMALNY', makeCtx('elem-001', 'Bus'));
      expect(result.shouldRefreshReadiness).toBe(false);
    });

    it('click on any element type returns SELECT', () => {
      const types = ['Bus', 'LineBranch', 'Switch', 'TransformerBranch', 'Load', 'Source'];
      for (const elementType of types) {
        const result = resolveClickAction('NORMALNY', makeCtx('x', elementType));
        expect(result.action).toBe('SELECT');
      }
    });

    it('feedback is empty in NORMALNY mode', () => {
      const result = resolveClickAction('NORMALNY', makeCtx('elem-001', 'Bus'));
      expect(result.feedbackPl).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // AWARYJNY mode
  // ---------------------------------------------------------------------------

  describe('AWARYJNY mode', () => {
    it('click on toggleable element returns TOGGLE_SERVICE', () => {
      const toggleableTypes = [
        'LineBranch',
        'Switch',
        'TransformerBranch',
        'Source',
        'Load',
        'Breaker',
        'Disconnector',
        'Fuse',
        'BusCoupler',
      ];
      for (const elementType of toggleableTypes) {
        const result = resolveClickAction('AWARYJNY', makeCtx('elem-001', elementType));
        expect(result.action).toBe('TOGGLE_SERVICE');
      }
    });

    it('click on bus returns SELECT (not toggleable)', () => {
      const result = resolveClickAction('AWARYJNY', makeCtx('bus-001', 'Bus'));
      expect(result.action).toBe('SELECT');
    });

    it('click on non-toggleable element returns SELECT', () => {
      const result = resolveClickAction('AWARYJNY', makeCtx('bus-001', 'BusNN'));
      expect(result.action).toBe('SELECT');
    });

    it('toggle refreshes overlay and readiness', () => {
      const result = resolveClickAction('AWARYJNY', makeCtx('sw-001', 'Switch'));
      expect(result.shouldRefreshOverlay).toBe(true);
      expect(result.shouldRefreshReadiness).toBe(true);
    });

    it('non-toggleable click does not refresh overlay', () => {
      const result = resolveClickAction('AWARYJNY', makeCtx('bus-001', 'Bus'));
      expect(result.shouldRefreshOverlay).toBe(false);
      expect(result.shouldRefreshReadiness).toBe(false);
    });

    it('feedback message is in Polish for non-toggleable element', () => {
      const result = resolveClickAction('AWARYJNY', makeCtx('bus-001', 'Bus'));
      expect(result.feedbackPl).toContain('element');
      expect(result.feedbackPl.length).toBeGreaterThan(0);
    });

    it('feedback is empty for toggleable element', () => {
      const result = resolveClickAction('AWARYJNY', makeCtx('sw-001', 'Switch'));
      expect(result.feedbackPl).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // ZWARCIE mode
  // ---------------------------------------------------------------------------

  describe('ZWARCIE mode', () => {
    it('click on bus returns SET_FAULT_BUS', () => {
      const result = resolveClickAction('ZWARCIE', makeCtx('bus-001', 'Bus'));
      expect(result.action).toBe('SET_FAULT_BUS');
    });

    it('click on BusSN returns SET_FAULT_BUS', () => {
      const result = resolveClickAction('ZWARCIE', makeCtx('bus-sn-001', 'BusSN'));
      expect(result.action).toBe('SET_FAULT_BUS');
    });

    it('click on BusNN returns SET_FAULT_BUS', () => {
      const result = resolveClickAction('ZWARCIE', makeCtx('bus-nn-001', 'BusNN'));
      expect(result.action).toBe('SET_FAULT_BUS');
    });

    it('click on non-bus returns NONE with Polish hint', () => {
      const result = resolveClickAction('ZWARCIE', makeCtx('sw-001', 'Switch'));
      expect(result.action).toBe('NONE');
      expect(result.feedbackPl.length).toBeGreaterThan(0);
      // Polish feedback contains "szyn" or "wezel"
      expect(result.feedbackPl).toContain('szyn');
    });

    it('SET_FAULT_BUS refreshes overlay', () => {
      const result = resolveClickAction('ZWARCIE', makeCtx('bus-001', 'Bus'));
      expect(result.shouldRefreshOverlay).toBe(true);
    });

    it('SET_FAULT_BUS does not refresh readiness', () => {
      const result = resolveClickAction('ZWARCIE', makeCtx('bus-001', 'Bus'));
      expect(result.shouldRefreshReadiness).toBe(false);
    });

    it('NONE action does not refresh overlay', () => {
      const result = resolveClickAction('ZWARCIE', makeCtx('sw-001', 'Switch'));
      expect(result.shouldRefreshOverlay).toBe(false);
    });

    it('uses busId when available', () => {
      const ctx = makeCtx('port-001', 'Bus', 'bus-003');
      const result = resolveClickAction('ZWARCIE', ctx);
      expect(result.elementId).toBe('bus-003');
    });

    it('falls back to elementId when busId not provided', () => {
      const ctx = makeCtx('bus-001', 'Bus');
      const result = resolveClickAction('ZWARCIE', ctx);
      expect(result.elementId).toBe('bus-001');
    });

    it('feedback includes fault bus ID', () => {
      const result = resolveClickAction('ZWARCIE', makeCtx('bus-001', 'Bus'));
      expect(result.feedbackPl).toContain('bus-001');
    });
  });

  // ---------------------------------------------------------------------------
  // executeClickAction
  // ---------------------------------------------------------------------------

  describe('executeClickAction', () => {
    it('TOGGLE_SERVICE adds element to out-of-service list', () => {
      const clickResult: SldClickResult = {
        action: 'TOGGLE_SERVICE',
        elementId: 'sw-001',
        feedbackPl: '',
        shouldRefreshOverlay: true,
        shouldRefreshReadiness: true,
      };

      const toggleResult = executeClickAction(clickResult);
      expect(toggleResult).not.toBeNull();
      expect(toggleResult!.elementId).toBe('sw-001');
      expect(toggleResult!.newState).toBe('OUT_OF_SERVICE');
      expect(toggleResult!.messagePl).toContain('sw-001');
    });

    it('TOGGLE_SERVICE returns IN_SERVICE when element was already out-of-service', () => {
      // First, add element to out-of-service
      useOperationalModeStore.getState().toggleOutOfService('sw-001');

      const clickResult: SldClickResult = {
        action: 'TOGGLE_SERVICE',
        elementId: 'sw-001',
        feedbackPl: '',
        shouldRefreshOverlay: true,
        shouldRefreshReadiness: true,
      };

      const toggleResult = executeClickAction(clickResult);
      expect(toggleResult).not.toBeNull();
      expect(toggleResult!.newState).toBe('IN_SERVICE');
      expect(toggleResult!.messagePl).toContain('sw-001');
    });

    it('SET_FAULT_BUS sets fault bus in store', () => {
      const clickResult: SldClickResult = {
        action: 'SET_FAULT_BUS',
        elementId: 'bus-001',
        feedbackPl: 'Miejsce zwarcia: bus-001',
        shouldRefreshOverlay: true,
        shouldRefreshReadiness: false,
      };

      const result = executeClickAction(clickResult);
      expect(result).toBeNull(); // SET_FAULT_BUS returns null
      expect(useOperationalModeStore.getState().selectedFaultBusId).toBe('bus-001');
    });

    it('SELECT returns null (no side effect)', () => {
      const clickResult: SldClickResult = {
        action: 'SELECT',
        elementId: 'elem-001',
        feedbackPl: '',
        shouldRefreshOverlay: false,
        shouldRefreshReadiness: false,
      };

      const result = executeClickAction(clickResult);
      expect(result).toBeNull();
    });

    it('NONE returns null (no side effect)', () => {
      const clickResult: SldClickResult = {
        action: 'NONE',
        elementId: 'sw-001',
        feedbackPl: 'Some hint',
        shouldRefreshOverlay: false,
        shouldRefreshReadiness: false,
      };

      const result = executeClickAction(clickResult);
      expect(result).toBeNull();
    });

    it('toggle message is in Polish', () => {
      const clickResult: SldClickResult = {
        action: 'TOGGLE_SERVICE',
        elementId: 'sw-001',
        feedbackPl: '',
        shouldRefreshOverlay: true,
        shouldRefreshReadiness: true,
      };

      const toggleResult = executeClickAction(clickResult);
      expect(toggleResult).not.toBeNull();
      // Polish messages use "eksploatacji"
      expect(toggleResult!.messagePl).toContain('eksploatacji');
    });
  });

  // ---------------------------------------------------------------------------
  // isElementOutOfService
  // ---------------------------------------------------------------------------

  describe('isElementOutOfService', () => {
    it('returns false for elements not in out-of-service list', () => {
      expect(isElementOutOfService('elem-001')).toBe(false);
    });

    it('returns true after toggling element out of service', () => {
      useOperationalModeStore.getState().toggleOutOfService('elem-001');
      expect(isElementOutOfService('elem-001')).toBe(true);
    });

    it('returns false after toggling element back to in-service', () => {
      useOperationalModeStore.getState().toggleOutOfService('elem-001');
      useOperationalModeStore.getState().toggleOutOfService('elem-001');
      expect(isElementOutOfService('elem-001')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Element overlay styles
  // ---------------------------------------------------------------------------

  describe('Element overlay styles', () => {
    it('out-of-service element has low opacity', () => {
      useOperationalModeStore.getState().toggleOutOfService('sw-001');
      const style = getElementModeOverlay('AWARYJNY', 'sw-001');
      expect(style).not.toBeNull();
      expect(style!.opacity).toBeLessThan(1.0);
      expect(style!.opacity).toBe(0.35);
    });

    it('out-of-service element has dashed stroke', () => {
      useOperationalModeStore.getState().toggleOutOfService('sw-001');
      const style = getElementModeOverlay('AWARYJNY', 'sw-001');
      expect(style).not.toBeNull();
      expect(style!.strokeDash).toBeDefined();
      expect(style!.strokeDash).toBe('8 4');
    });

    it('out-of-service element has red badge', () => {
      useOperationalModeStore.getState().toggleOutOfService('sw-001');
      const style = getElementModeOverlay('AWARYJNY', 'sw-001');
      expect(style).not.toBeNull();
      expect(style!.badgeColor).toBeDefined();
    });

    it('fault bus element has ZWARCIE badge', () => {
      useOperationalModeStore.getState().selectFaultBus('bus-001');
      const style = getElementModeOverlay('ZWARCIE', 'bus-001');
      expect(style).not.toBeNull();
      expect(style!.badgeText).toBe('ZWARCIE');
    });

    it('fault bus element has full opacity', () => {
      useOperationalModeStore.getState().selectFaultBus('bus-001');
      const style = getElementModeOverlay('ZWARCIE', 'bus-001');
      expect(style).not.toBeNull();
      expect(style!.opacity).toBe(1.0);
    });

    it('fault bus element has red badge color', () => {
      useOperationalModeStore.getState().selectFaultBus('bus-001');
      const style = getElementModeOverlay('ZWARCIE', 'bus-001');
      expect(style).not.toBeNull();
      expect(style!.badgeColor).toBeDefined();
    });

    it('normal elements return null overlay in NORMALNY mode', () => {
      const style = getElementModeOverlay('NORMALNY', 'elem-001');
      expect(style).toBeNull();
    });

    it('non-fault-bus elements return null overlay in ZWARCIE mode', () => {
      useOperationalModeStore.getState().selectFaultBus('bus-001');
      const style = getElementModeOverlay('ZWARCIE', 'bus-002');
      expect(style).toBeNull();
    });

    it('in-service elements return null overlay in AWARYJNY mode', () => {
      const style = getElementModeOverlay('AWARYJNY', 'sw-001');
      expect(style).toBeNull();
    });

    it('no overlay when no fault bus is selected in ZWARCIE', () => {
      const style = getElementModeOverlay('ZWARCIE', 'bus-001');
      expect(style).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Determinism
  // ---------------------------------------------------------------------------

  describe('Determinism', () => {
    it('same input produces identical click resolution', () => {
      const ctx = makeCtx('bus-001', 'Bus');
      const r1 = resolveClickAction('ZWARCIE', ctx);
      const r2 = resolveClickAction('ZWARCIE', ctx);

      expect(r1.action).toBe(r2.action);
      expect(r1.elementId).toBe(r2.elementId);
      expect(r1.feedbackPl).toBe(r2.feedbackPl);
      expect(r1.shouldRefreshOverlay).toBe(r2.shouldRefreshOverlay);
      expect(r1.shouldRefreshReadiness).toBe(r2.shouldRefreshReadiness);
    });
  });
});
