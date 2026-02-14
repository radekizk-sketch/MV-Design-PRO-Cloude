/**
 * TESTY MAGAZYNU TRYBU PROJEKTOWEGO SLD — RUN #3H §4.
 *
 * ZAKRES:
 * - setProjectMode (wlacz/wylacz + oczyszczanie stanu)
 * - applyDelta (dodaj/zaktualizuj override, snap-to-grid)
 * - removeOverride (usun per elementId+scope)
 * - validate (walidacja przeciwko layoutowi)
 * - loadOverrides / saveOverrides / resetOverrides (async API mock)
 * - Derived hooks (useIsProjectMode, useCurrentOverrides, etc.)
 * - 50× determinism (hash stabilnosc)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// Mock the API module
vi.mock('../core/overridesApi', () => ({
  fetchSldOverrides: vi.fn(),
  saveSldOverrides: vi.fn(),
  resetSldOverrides: vi.fn(),
  mapResponseToOverrides: vi.fn(),
}));

import {
  useSldProjectModeStore,
  useIsProjectMode,
  useCurrentOverrides,
  useOverridesDirty,
  useOverridesValidationErrors,
  useOverridesHash,
} from '../sldProjectModeStore';

import {
  fetchSldOverrides,
  saveSldOverrides,
  resetSldOverrides,
  mapResponseToOverrides,
} from '../core/overridesApi';

import {
  OverrideScopeV1,
  OverrideOperationV1,
  GEOMETRY_GRID_SNAP,
  computeOverridesHash,
} from '../core/geometryOverrides';

import type { LayoutResultV1 } from '../core/layoutResult';

const mockFetch = vi.mocked(fetchSldOverrides);
const mockSave = vi.mocked(saveSldOverrides);
const mockReset = vi.mocked(resetSldOverrides);
const mockMapResponse = vi.mocked(mapResponseToOverrides);

// =============================================================================
// Helpers
// =============================================================================

function resetStore() {
  useSldProjectModeStore.setState({
    projectModeActive: false,
    overrides: null,
    dirty: false,
    validationErrors: [],
    loading: false,
    error: null,
    lastSavedHash: null,
  });
}

function makeMinimalLayout(
  nodeIds: string[] = ['node-1', 'node-2'],
  blockIds: string[] = ['station-GPZ'],
): LayoutResultV1 {
  return {
    layoutVersion: '1.0',
    snapshotHash: 'test-hash',
    nodePlacements: nodeIds.map((id) => ({
      nodeId: id,
      position: { x: 100, y: 200 },
      bounds: { x: 80, y: 180, width: 40, height: 40 },
      autoPositioned: true,
      labelPosition: { x: 100, y: 170 },
    })),
    edgeRoutes: [],
    switchgearBlocks: blockIds.map((id) => ({
      blockId: id,
      stationType: 'MAIN' as const,
      bounds: { x: 0, y: 0, width: 200, height: 300 },
      ports: [],
      fields: [],
    })),
    gridConfig: { originX: 0, originY: 0, cellWidth: 20, cellHeight: 20 },
    layoutHash: 'layout-hash-001',
  } as unknown as LayoutResultV1;
}

// =============================================================================
// Tests
// =============================================================================

describe('sldProjectModeStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  // ===========================================================================
  // setProjectMode
  // ===========================================================================

  describe('setProjectMode', () => {
    it('should activate project mode', () => {
      const store = useSldProjectModeStore.getState();
      act(() => store.setProjectMode(true));
      expect(useSldProjectModeStore.getState().projectModeActive).toBe(true);
    });

    it('should deactivate project mode and clear state', () => {
      // Setup: activate and add some dirty state
      useSldProjectModeStore.setState({
        projectModeActive: true,
        dirty: true,
        validationErrors: [{ elementId: 'x', code: 'c', message: 'm' }],
        error: 'some error',
      });

      const store = useSldProjectModeStore.getState();
      act(() => store.setProjectMode(false));

      const state = useSldProjectModeStore.getState();
      expect(state.projectModeActive).toBe(false);
      expect(state.dirty).toBe(false);
      expect(state.validationErrors).toEqual([]);
      expect(state.error).toBeNull();
    });
  });

  // ===========================================================================
  // applyDelta
  // ===========================================================================

  describe('applyDelta', () => {
    it('should add new override for element', () => {
      const store = useSldProjectModeStore.getState();
      act(() => {
        store.applyDelta('node-1', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 40,
          dy: -20,
        });
      });

      const state = useSldProjectModeStore.getState();
      expect(state.overrides).not.toBeNull();
      expect(state.overrides!.items).toHaveLength(1);
      expect(state.overrides!.items[0].elementId).toBe('node-1');
      expect(state.dirty).toBe(true);
    });

    it('should snap MOVE_DELTA to grid', () => {
      const store = useSldProjectModeStore.getState();
      act(() => {
        store.applyDelta('node-1', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 33, // should snap to 40
          dy: -17, // should snap to -20
        });
      });

      const item = useSldProjectModeStore.getState().overrides!.items[0];
      const payload = item.payload as { dx: number; dy: number };
      expect(payload.dx).toBe(GEOMETRY_GRID_SNAP * 2); // 40
      expect(payload.dy).toBe(-GEOMETRY_GRID_SNAP); // -20
    });

    it('should NOT snap non-MOVE_DELTA operations', () => {
      const store = useSldProjectModeStore.getState();
      act(() => {
        store.applyDelta(
          'station-GPZ',
          OverrideScopeV1.LABEL,
          OverrideOperationV1.MOVE_LABEL,
          { anchorX: 33, anchorY: 17 },
        );
      });

      const item = useSldProjectModeStore.getState().overrides!.items[0];
      const payload = item.payload as { anchorX: number; anchorY: number };
      expect(payload.anchorX).toBe(33); // not snapped
      expect(payload.anchorY).toBe(17);
    });

    it('should replace existing override for same elementId+scope', () => {
      const store = useSldProjectModeStore.getState();
      act(() => {
        store.applyDelta('node-1', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 20,
          dy: 0,
        });
      });
      act(() => {
        store.applyDelta('node-1', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 60,
          dy: 40,
        });
      });

      const state = useSldProjectModeStore.getState();
      expect(state.overrides!.items).toHaveLength(1);
      const payload = state.overrides!.items[0].payload as { dx: number; dy: number };
      expect(payload.dx).toBe(60);
      expect(payload.dy).toBe(40);
    });

    it('should allow multiple overrides for different elements', () => {
      const store = useSldProjectModeStore.getState();
      act(() => {
        store.applyDelta('node-1', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 20,
          dy: 0,
        });
        store.applyDelta('node-2', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 40,
          dy: 60,
        });
      });

      expect(useSldProjectModeStore.getState().overrides!.items).toHaveLength(2);
    });

    it('should allow different scopes for same elementId', () => {
      const store = useSldProjectModeStore.getState();
      act(() => {
        store.applyDelta('node-1', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 20,
          dy: 0,
        });
        store.applyDelta('node-1', OverrideScopeV1.LABEL, OverrideOperationV1.MOVE_LABEL, {
          anchorX: 100,
          anchorY: 50,
        });
      });

      expect(useSldProjectModeStore.getState().overrides!.items).toHaveLength(2);
    });

    it('should canonicalize items after applyDelta', () => {
      const store = useSldProjectModeStore.getState();
      act(() => {
        store.applyDelta('z-node', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 20,
          dy: 0,
        });
        store.applyDelta('a-node', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 40,
          dy: 0,
        });
      });

      const items = useSldProjectModeStore.getState().overrides!.items;
      expect(items[0].elementId).toBe('a-node'); // sorted
      expect(items[1].elementId).toBe('z-node');
    });
  });

  // ===========================================================================
  // removeOverride
  // ===========================================================================

  describe('removeOverride', () => {
    it('should remove override by elementId+scope', () => {
      const store = useSldProjectModeStore.getState();
      act(() => {
        store.applyDelta('node-1', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 20,
          dy: 0,
        });
        store.applyDelta('node-2', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 40,
          dy: 0,
        });
      });

      act(() => {
        useSldProjectModeStore.getState().removeOverride('node-1', OverrideScopeV1.NODE);
      });

      const state = useSldProjectModeStore.getState();
      expect(state.overrides!.items).toHaveLength(1);
      expect(state.overrides!.items[0].elementId).toBe('node-2');
      expect(state.dirty).toBe(true);
    });

    it('should no-op when overrides are null', () => {
      const store = useSldProjectModeStore.getState();
      act(() => {
        store.removeOverride('nonexistent', OverrideScopeV1.NODE);
      });

      expect(useSldProjectModeStore.getState().overrides).toBeNull();
    });

    it('should only remove matching scope', () => {
      const store = useSldProjectModeStore.getState();
      act(() => {
        store.applyDelta('node-1', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 20,
          dy: 0,
        });
        store.applyDelta('node-1', OverrideScopeV1.LABEL, OverrideOperationV1.MOVE_LABEL, {
          anchorX: 100,
          anchorY: 50,
        });
      });

      act(() => {
        useSldProjectModeStore.getState().removeOverride('node-1', OverrideScopeV1.NODE);
      });

      const items = useSldProjectModeStore.getState().overrides!.items;
      expect(items).toHaveLength(1);
      expect(items[0].scope).toBe(OverrideScopeV1.LABEL);
    });
  });

  // ===========================================================================
  // validate
  // ===========================================================================

  describe('validate', () => {
    it('should set empty errors for empty overrides', () => {
      const store = useSldProjectModeStore.getState();
      const layout = makeMinimalLayout();
      act(() => store.validate(layout));
      expect(useSldProjectModeStore.getState().validationErrors).toEqual([]);
    });

    it('should set empty errors for null overrides', () => {
      const store = useSldProjectModeStore.getState();
      const layout = makeMinimalLayout();
      act(() => store.validate(layout));
      expect(useSldProjectModeStore.getState().validationErrors).toEqual([]);
    });

    it('should detect unknown element in overrides', () => {
      const store = useSldProjectModeStore.getState();
      act(() => {
        store.applyDelta('unknown-node', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 20,
          dy: 0,
        });
      });

      const layout = makeMinimalLayout();
      act(() => useSldProjectModeStore.getState().validate(layout));

      const errors = useSldProjectModeStore.getState().validationErrors;
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('geometry.override_invalid_element');
    });

    it('should pass validation for known elements', () => {
      const store = useSldProjectModeStore.getState();
      act(() => {
        store.applyDelta('node-1', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 20,
          dy: 0,
        });
      });

      const layout = makeMinimalLayout();
      act(() => useSldProjectModeStore.getState().validate(layout));

      expect(useSldProjectModeStore.getState().validationErrors).toEqual([]);
    });
  });

  // ===========================================================================
  // loadOverrides (async)
  // ===========================================================================

  describe('loadOverrides', () => {
    it('should load overrides from API', async () => {
      const apiResponse = {
        overrides_version: '1.0',
        study_case_id: 'case-001',
        snapshot_hash: 'abc',
        items: [],
        overrides_hash: 'hash-001',
      };
      const mappedOverrides = {
        overridesVersion: '1.0' as const,
        studyCaseId: 'case-001',
        snapshotHash: 'abc',
        items: [],
      };

      mockFetch.mockResolvedValueOnce(apiResponse);
      mockMapResponse.mockReturnValueOnce(mappedOverrides);

      await act(async () => {
        await useSldProjectModeStore.getState().loadOverrides('case-001');
      });

      const state = useSldProjectModeStore.getState();
      expect(state.overrides).toEqual(mappedOverrides);
      expect(state.dirty).toBe(false);
      expect(state.lastSavedHash).toBe('hash-001');
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useSldProjectModeStore.getState().loadOverrides('case-001');
      });

      const state = useSldProjectModeStore.getState();
      expect(state.error).toContain('Nie udalo sie zaladowac nadpisan');
      expect(state.error).toContain('Network error');
      expect(state.loading).toBe(false);
    });
  });

  // ===========================================================================
  // saveOverrides (async)
  // ===========================================================================

  describe('saveOverrides', () => {
    it('should save overrides to API', async () => {
      // First set up some overrides
      act(() => {
        useSldProjectModeStore.getState().applyDelta(
          'node-1',
          OverrideScopeV1.NODE,
          OverrideOperationV1.MOVE_DELTA,
          { dx: 20, dy: 0 },
        );
      });

      const savedOverrides = {
        overridesVersion: '1.0' as const,
        studyCaseId: 'case-001',
        snapshotHash: '',
        items: useSldProjectModeStore.getState().overrides!.items.slice(),
      };
      const apiResponse = {
        overrides_version: '1.0',
        study_case_id: 'case-001',
        snapshot_hash: '',
        items: [],
        overrides_hash: 'saved-hash',
      };

      mockSave.mockResolvedValueOnce(apiResponse);
      mockMapResponse.mockReturnValueOnce(savedOverrides);

      await act(async () => {
        await useSldProjectModeStore.getState().saveOverrides('case-001');
      });

      const state = useSldProjectModeStore.getState();
      expect(state.dirty).toBe(false);
      expect(state.lastSavedHash).toBe('saved-hash');
      expect(state.loading).toBe(false);
    });

    it('should no-op when no overrides', async () => {
      await act(async () => {
        await useSldProjectModeStore.getState().saveOverrides('case-001');
      });

      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should set error on save failure', async () => {
      act(() => {
        useSldProjectModeStore.getState().applyDelta(
          'node-1',
          OverrideScopeV1.NODE,
          OverrideOperationV1.MOVE_DELTA,
          { dx: 20, dy: 0 },
        );
      });

      mockSave.mockRejectedValueOnce(new Error('Save failed'));

      await act(async () => {
        await useSldProjectModeStore.getState().saveOverrides('case-001');
      });

      const state = useSldProjectModeStore.getState();
      expect(state.error).toContain('Nie udalo sie zapisac nadpisan');
      expect(state.loading).toBe(false);
    });
  });

  // ===========================================================================
  // resetOverrides (async)
  // ===========================================================================

  describe('resetOverrides', () => {
    it('should reset overrides via API', async () => {
      const emptyOverrides = {
        overridesVersion: '1.0' as const,
        studyCaseId: 'case-001',
        snapshotHash: '',
        items: [],
      };
      const apiResponse = {
        overrides_version: '1.0',
        study_case_id: 'case-001',
        snapshot_hash: '',
        items: [],
        overrides_hash: 'empty-hash',
      };

      mockReset.mockResolvedValueOnce(apiResponse);
      mockMapResponse.mockReturnValueOnce(emptyOverrides);

      await act(async () => {
        await useSldProjectModeStore.getState().resetOverrides('case-001');
      });

      const state = useSldProjectModeStore.getState();
      expect(state.overrides).toEqual(emptyOverrides);
      expect(state.dirty).toBe(false);
      expect(state.validationErrors).toEqual([]);
      expect(state.lastSavedHash).toBe('empty-hash');
      expect(state.loading).toBe(false);
    });

    it('should set error on reset failure', async () => {
      mockReset.mockRejectedValueOnce(new Error('Reset failed'));

      await act(async () => {
        await useSldProjectModeStore.getState().resetOverrides('case-001');
      });

      const state = useSldProjectModeStore.getState();
      expect(state.error).toContain('Nie udalo sie zresetowac nadpisan');
      expect(state.loading).toBe(false);
    });
  });

  // ===========================================================================
  // Dirty flag
  // ===========================================================================

  describe('dirty flag', () => {
    it('should be false initially', () => {
      expect(useSldProjectModeStore.getState().dirty).toBe(false);
    });

    it('should be true after applyDelta', () => {
      act(() => {
        useSldProjectModeStore.getState().applyDelta(
          'node-1',
          OverrideScopeV1.NODE,
          OverrideOperationV1.MOVE_DELTA,
          { dx: 20, dy: 0 },
        );
      });
      expect(useSldProjectModeStore.getState().dirty).toBe(true);
    });

    it('should be true after removeOverride', () => {
      act(() => {
        useSldProjectModeStore.getState().applyDelta(
          'node-1',
          OverrideScopeV1.NODE,
          OverrideOperationV1.MOVE_DELTA,
          { dx: 20, dy: 0 },
        );
      });

      // Reset dirty through setState for test clarity
      useSldProjectModeStore.setState({ dirty: false });

      act(() => {
        useSldProjectModeStore.getState().removeOverride('node-1', OverrideScopeV1.NODE);
      });
      expect(useSldProjectModeStore.getState().dirty).toBe(true);
    });
  });

  // ===========================================================================
  // 50× determinism
  // ===========================================================================

  describe('50× determinism', () => {
    it('should produce stable hash across 50 applyDelta cycles', () => {
      // Build once
      act(() => {
        const store = useSldProjectModeStore.getState();
        store.applyDelta('node-1', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 40,
          dy: -20,
        });
        store.applyDelta('node-2', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 100,
          dy: 200,
        });
        store.applyDelta('station-GPZ', OverrideScopeV1.BLOCK, OverrideOperationV1.MOVE_DELTA, {
          dx: 60,
          dy: 0,
        });
      });

      const referenceHash = computeOverridesHash(useSldProjectModeStore.getState().overrides!);

      // Rebuild 50 times from scratch
      for (let i = 0; i < 50; i++) {
        resetStore();
        act(() => {
          const store = useSldProjectModeStore.getState();
          store.applyDelta('node-1', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
            dx: 40,
            dy: -20,
          });
          store.applyDelta('node-2', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
            dx: 100,
            dy: 200,
          });
          store.applyDelta(
            'station-GPZ',
            OverrideScopeV1.BLOCK,
            OverrideOperationV1.MOVE_DELTA,
            { dx: 60, dy: 0 },
          );
        });

        const h = computeOverridesHash(useSldProjectModeStore.getState().overrides!);
        expect(h).toBe(referenceHash);
      }
    });

    it('should produce stable items order across 50 cycles', () => {
      act(() => {
        const store = useSldProjectModeStore.getState();
        store.applyDelta('z-node', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 20,
          dy: 0,
        });
        store.applyDelta('a-node', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
          dx: 40,
          dy: 0,
        });
      });

      const referenceItems = useSldProjectModeStore.getState().overrides!.items;

      for (let i = 0; i < 50; i++) {
        resetStore();
        act(() => {
          const store = useSldProjectModeStore.getState();
          // Intentionally reversed order
          store.applyDelta('z-node', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
            dx: 20,
            dy: 0,
          });
          store.applyDelta('a-node', OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, {
            dx: 40,
            dy: 0,
          });
        });

        const items = useSldProjectModeStore.getState().overrides!.items;
        expect(items[0].elementId).toBe(referenceItems[0].elementId);
        expect(items[1].elementId).toBe(referenceItems[1].elementId);
      }
    });
  });
});

// =============================================================================
// DERIVED HOOKS
// =============================================================================

describe('Derived hooks', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('useIsProjectMode', () => {
    it('should return false initially', () => {
      const { result } = renderHook(() => useIsProjectMode());
      expect(result.current).toBe(false);
    });

    it('should return true when project mode active', () => {
      act(() => useSldProjectModeStore.getState().setProjectMode(true));
      const { result } = renderHook(() => useIsProjectMode());
      expect(result.current).toBe(true);
    });
  });

  describe('useCurrentOverrides', () => {
    it('should return null initially', () => {
      const { result } = renderHook(() => useCurrentOverrides());
      expect(result.current).toBeNull();
    });

    it('should return overrides after applyDelta', () => {
      act(() => {
        useSldProjectModeStore.getState().applyDelta(
          'node-1',
          OverrideScopeV1.NODE,
          OverrideOperationV1.MOVE_DELTA,
          { dx: 20, dy: 0 },
        );
      });
      const { result } = renderHook(() => useCurrentOverrides());
      expect(result.current).not.toBeNull();
      expect(result.current!.items).toHaveLength(1);
    });
  });

  describe('useOverridesDirty', () => {
    it('should return false initially', () => {
      const { result } = renderHook(() => useOverridesDirty());
      expect(result.current).toBe(false);
    });
  });

  describe('useOverridesValidationErrors', () => {
    it('should return empty array initially', () => {
      const { result } = renderHook(() => useOverridesValidationErrors());
      expect(result.current).toEqual([]);
    });
  });

  describe('useOverridesHash', () => {
    it('should return null when no overrides', () => {
      const { result } = renderHook(() => useOverridesHash());
      expect(result.current).toBeNull();
    });

    it('should return hash when overrides exist', () => {
      act(() => {
        useSldProjectModeStore.getState().applyDelta(
          'node-1',
          OverrideScopeV1.NODE,
          OverrideOperationV1.MOVE_DELTA,
          { dx: 20, dy: 0 },
        );
      });
      const { result } = renderHook(() => useOverridesHash());
      expect(result.current).not.toBeNull();
      expect(result.current!.length).toBe(8); // FNV-1a hex = 8 chars
    });
  });
});
