/**
 * Operational Modes — §4 UX 10/10 Tests
 *
 * Tests:
 * - Mode transitions (Normalny → Awaryjny → Zwarcie)
 * - State reset on mode switch
 * - Fault type selection
 * - Out-of-service toggle
 * - SC overlay field selection
 * - Polish labels completeness
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useOperationalModeStore } from '../operationalModeStore';
import {
  OPERATIONAL_MODE_LABELS,
  FAULT_TYPE_LABELS,
  SC_OVERLAY_LABELS,
} from '../operationalModeStore';

describe('Operational Mode Store — §4 UX 10/10', () => {
  beforeEach(() => {
    // Reset store to initial state
    useOperationalModeStore.getState().reset();
  });

  describe('Initial state', () => {
    it('starts in NORMALNY mode', () => {
      expect(useOperationalModeStore.getState().mode).toBe('NORMALNY');
    });

    it('has no pending out-of-service IDs', () => {
      expect(useOperationalModeStore.getState().pendingOutOfServiceIds).toEqual([]);
    });

    it('has no selected fault bus', () => {
      expect(useOperationalModeStore.getState().selectedFaultBusId).toBeNull();
    });

    it('defaults to SC_3F fault type', () => {
      expect(useOperationalModeStore.getState().selectedFaultType).toBe('SC_3F');
    });

    it('defaults to IK_PP overlay field', () => {
      expect(useOperationalModeStore.getState().scOverlayField).toBe('IK_PP');
    });
  });

  describe('Mode transitions', () => {
    it('switches to AWARYJNY mode', () => {
      useOperationalModeStore.getState().setMode('AWARYJNY');
      expect(useOperationalModeStore.getState().mode).toBe('AWARYJNY');
    });

    it('switches to ZWARCIE mode', () => {
      useOperationalModeStore.getState().setMode('ZWARCIE');
      expect(useOperationalModeStore.getState().mode).toBe('ZWARCIE');
    });

    it('switches back to NORMALNY', () => {
      useOperationalModeStore.getState().setMode('AWARYJNY');
      useOperationalModeStore.getState().setMode('NORMALNY');
      expect(useOperationalModeStore.getState().mode).toBe('NORMALNY');
    });

    it('resets fault bus on mode switch', () => {
      useOperationalModeStore.getState().setMode('ZWARCIE');
      useOperationalModeStore.getState().selectFaultBus('bus-001');
      expect(useOperationalModeStore.getState().selectedFaultBusId).toBe('bus-001');

      useOperationalModeStore.getState().setMode('NORMALNY');
      expect(useOperationalModeStore.getState().selectedFaultBusId).toBeNull();
    });

    it('resets out-of-service IDs on mode switch', () => {
      useOperationalModeStore.getState().setMode('AWARYJNY');
      useOperationalModeStore.getState().toggleOutOfService('elem-001');
      useOperationalModeStore.getState().toggleOutOfService('elem-002');
      expect(useOperationalModeStore.getState().pendingOutOfServiceIds).toHaveLength(2);

      useOperationalModeStore.getState().setMode('NORMALNY');
      expect(useOperationalModeStore.getState().pendingOutOfServiceIds).toEqual([]);
    });
  });

  describe('Fault mode (ZWARCIE)', () => {
    beforeEach(() => {
      useOperationalModeStore.getState().setMode('ZWARCIE');
    });

    it('selects fault bus', () => {
      useOperationalModeStore.getState().selectFaultBus('bus-003');
      expect(useOperationalModeStore.getState().selectedFaultBusId).toBe('bus-003');
    });

    it('changes fault type', () => {
      useOperationalModeStore.getState().setFaultType('SC_1F');
      expect(useOperationalModeStore.getState().selectedFaultType).toBe('SC_1F');
    });

    it('changes SC overlay field', () => {
      useOperationalModeStore.getState().setScOverlayField('IP');
      expect(useOperationalModeStore.getState().scOverlayField).toBe('IP');
    });

    it('clears fault bus', () => {
      useOperationalModeStore.getState().selectFaultBus('bus-001');
      useOperationalModeStore.getState().selectFaultBus(null);
      expect(useOperationalModeStore.getState().selectedFaultBusId).toBeNull();
    });
  });

  describe('Emergency mode (AWARYJNY)', () => {
    beforeEach(() => {
      useOperationalModeStore.getState().setMode('AWARYJNY');
    });

    it('toggles element out of service (add)', () => {
      useOperationalModeStore.getState().toggleOutOfService('elem-001');
      expect(useOperationalModeStore.getState().pendingOutOfServiceIds).toEqual(['elem-001']);
      expect(useOperationalModeStore.getState().emergencyRecalcPending).toBe(true);
    });

    it('toggles element out of service (remove)', () => {
      useOperationalModeStore.getState().toggleOutOfService('elem-001');
      useOperationalModeStore.getState().toggleOutOfService('elem-001');
      expect(useOperationalModeStore.getState().pendingOutOfServiceIds).toEqual([]);
    });

    it('accumulates multiple out-of-service elements', () => {
      useOperationalModeStore.getState().toggleOutOfService('elem-001');
      useOperationalModeStore.getState().toggleOutOfService('elem-002');
      useOperationalModeStore.getState().toggleOutOfService('elem-003');
      expect(useOperationalModeStore.getState().pendingOutOfServiceIds).toEqual([
        'elem-001', 'elem-002', 'elem-003',
      ]);
    });

    it('clears pending out-of-service', () => {
      useOperationalModeStore.getState().toggleOutOfService('elem-001');
      useOperationalModeStore.getState().clearOutOfServicePending();
      expect(useOperationalModeStore.getState().pendingOutOfServiceIds).toEqual([]);
      expect(useOperationalModeStore.getState().emergencyRecalcPending).toBe(false);
    });
  });

  describe('Polish labels completeness', () => {
    it('all operational modes have Polish labels', () => {
      expect(Object.keys(OPERATIONAL_MODE_LABELS)).toEqual(['NORMALNY', 'AWARYJNY', 'ZWARCIE']);
      for (const label of Object.values(OPERATIONAL_MODE_LABELS)) {
        expect(label.length).toBeGreaterThan(0);
      }
    });

    it('all fault types have Polish labels', () => {
      expect(Object.keys(FAULT_TYPE_LABELS)).toEqual(['SC_3F', 'SC_2F', 'SC_1F', 'SC_2F_RF']);
      for (const label of Object.values(FAULT_TYPE_LABELS)) {
        expect(label.length).toBeGreaterThan(0);
      }
    });

    it('all SC overlay fields have Polish labels', () => {
      expect(Object.keys(SC_OVERLAY_LABELS)).toEqual(['IK_PP', 'IP', 'ITH', 'IDYN']);
      for (const label of Object.values(SC_OVERLAY_LABELS)) {
        expect(label.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Reset', () => {
    it('resets all state to initial', () => {
      useOperationalModeStore.getState().setMode('ZWARCIE');
      useOperationalModeStore.getState().selectFaultBus('bus-001');
      useOperationalModeStore.getState().setFaultType('SC_2F');
      useOperationalModeStore.getState().setScOverlayField('ITH');

      useOperationalModeStore.getState().reset();

      const state = useOperationalModeStore.getState();
      expect(state.mode).toBe('NORMALNY');
      expect(state.selectedFaultBusId).toBeNull();
      expect(state.selectedFaultType).toBe('SC_3F');
      expect(state.scOverlayField).toBe('IK_PP');
      expect(state.pendingOutOfServiceIds).toEqual([]);
    });
  });
});
