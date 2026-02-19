/**
 * Variant Store — §7 UX 10/10 Tests
 *
 * Tests:
 * - Variant state management
 * - Comparison mode transitions
 * - Delta overlay toggle
 * - Polish labels
 * - State reset
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useVariantStore,
  DELTA_CHANGE_LABELS,
  DELTA_CHANGE_COLORS,
} from '../variantStore';
import type { ProjectVariant, VariantDelta, DeltaChangeType } from '../variantStore';

describe('Variant Store — §7 UX 10/10', () => {
  beforeEach(() => {
    useVariantStore.getState().clear();
  });

  describe('Initial state', () => {
    it('starts with empty variants', () => {
      expect(useVariantStore.getState().variants).toEqual([]);
    });

    it('starts with no comparison', () => {
      expect(useVariantStore.getState().compareMode).toBe(false);
      expect(useVariantStore.getState().compareVariantId).toBeNull();
      expect(useVariantStore.getState().delta).toBeNull();
    });

    it('starts with delta overlay hidden', () => {
      expect(useVariantStore.getState().deltaOverlayVisible).toBe(false);
    });
  });

  describe('Active variant', () => {
    it('sets active variant', () => {
      useVariantStore.getState().setActiveVariant('v1');
      expect(useVariantStore.getState().activeVariantId).toBe('v1');
    });
  });

  describe('Comparison mode', () => {
    it('starts comparison', () => {
      useVariantStore.getState().setActiveVariant('v1');
      useVariantStore.getState().startComparison('v2');
      expect(useVariantStore.getState().compareMode).toBe(true);
      expect(useVariantStore.getState().compareVariantId).toBe('v2');
      expect(useVariantStore.getState().deltaOverlayVisible).toBe(true);
    });

    it('stops comparison', () => {
      useVariantStore.getState().startComparison('v2');
      useVariantStore.getState().stopComparison();
      expect(useVariantStore.getState().compareMode).toBe(false);
      expect(useVariantStore.getState().compareVariantId).toBeNull();
      expect(useVariantStore.getState().delta).toBeNull();
      expect(useVariantStore.getState().deltaOverlayVisible).toBe(false);
    });
  });

  describe('Delta overlay', () => {
    it('toggles delta overlay visibility', () => {
      expect(useVariantStore.getState().deltaOverlayVisible).toBe(false);
      useVariantStore.getState().toggleDeltaOverlay();
      expect(useVariantStore.getState().deltaOverlayVisible).toBe(true);
      useVariantStore.getState().toggleDeltaOverlay();
      expect(useVariantStore.getState().deltaOverlayVisible).toBe(false);
    });
  });

  describe('Polish labels', () => {
    it('all delta change types have Polish labels', () => {
      const types: DeltaChangeType[] = ['ADDED', 'REMOVED', 'MODIFIED', 'UNCHANGED'];
      for (const type of types) {
        expect(DELTA_CHANGE_LABELS[type]).toBeDefined();
        expect(DELTA_CHANGE_LABELS[type].length).toBeGreaterThan(0);
      }
    });

    it('all delta change types have colors', () => {
      const types: DeltaChangeType[] = ['ADDED', 'REMOVED', 'MODIFIED', 'UNCHANGED'];
      for (const type of types) {
        expect(DELTA_CHANGE_COLORS[type]).toBeDefined();
        expect(DELTA_CHANGE_COLORS[type]).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });

  describe('Clear/Reset', () => {
    it('clears all state', () => {
      useVariantStore.getState().setActiveVariant('v1');
      useVariantStore.getState().startComparison('v2');

      useVariantStore.getState().clear();

      const state = useVariantStore.getState();
      expect(state.variants).toEqual([]);
      expect(state.activeVariantId).toBeNull();
      expect(state.compareMode).toBe(false);
      expect(state.delta).toBeNull();
      expect(state.deltaOverlayVisible).toBe(false);
    });
  });
});
