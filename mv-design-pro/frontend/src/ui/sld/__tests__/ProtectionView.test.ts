/**
 * TESTY WIDOKU ZABEZPIECZENIOWEGO — PR-SLD-09
 *
 * Testy widoku zabezpieczeniowego SLD.
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § B: Warstwa nakladkowa tylko do odczytu
 * - 100% POLISH UI
 *
 * ZAKRES TESTOW:
 * - Tryb ZABEZPIECZENIA (przelaczanie, read-only)
 * - Warstwa zabezpieczen (widocznosc)
 * - Utrwalanie stanu w adresie URL
 * - Dane zabezpieczen (funkcje wyboru)
 * - Deterministycznosc
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// Mock URL state functions before importing
vi.mock('../../navigation/urlState', () => ({
  readSldModeFromUrl: () => ({
    mode: 'EDYCJA' as const,
    diagnosticLayerVisible: false,
    protectionLayerVisible: false,
  }),
  updateUrlWithSldMode: vi.fn(),
}));

// Import after mocking
import {
  useSldModeStore,
  useIsProtectionMode,
  useProtectionLayerVisible,
  useIsReadOnlyMode,
  SLD_MODE_LABELS_PL,
} from '../sldModeStore';
import { updateUrlWithSldMode } from '../../navigation/urlState';
import {
  useProtectionSummary,
  useAllProtectionSummaries,
  useHasProtectionData,
  useProtectionStatistics,
  selectProtectionSummaryByElementId,
} from '../protection';

const mockUpdateUrlWithSldMode = vi.mocked(updateUrlWithSldMode);

// =============================================================================
// SETUP
// =============================================================================

describe('Protection View (PR-SLD-09)', () => {
  beforeEach(() => {
    const store = useSldModeStore.getState();
    store.resetMode();
    vi.clearAllMocks();
  });

  // =============================================================================
  // MODE: ZABEZPIECZENIA
  // =============================================================================

  describe('ZABEZPIECZENIA Mode', () => {
    it('should switch to ZABEZPIECZENIA mode', () => {
      const { result } = renderHook(() => useSldModeStore());

      act(() => {
        result.current.setMode('ZABEZPIECZENIA');
      });

      expect(result.current.mode).toBe('ZABEZPIECZENIA');
    });

    it('should provide switchToProtectionMode helper', () => {
      const { result } = renderHook(() => useSldModeStore());

      act(() => {
        result.current.switchToProtectionMode();
      });

      expect(result.current.mode).toBe('ZABEZPIECZENIA');
    });

    it('should return true for isProtectionMode when in ZABEZPIECZENIA', () => {
      const { result } = renderHook(() => useSldModeStore());

      act(() => {
        result.current.setMode('ZABEZPIECZENIA');
      });

      expect(result.current.isProtectionMode()).toBe(true);
    });

    it('should return false for isProtectionMode when in EDYCJA', () => {
      const { result } = renderHook(() => useSldModeStore());

      expect(result.current.isProtectionMode()).toBe(false);
    });

    it('should return true for isReadOnlyMode in ZABEZPIECZENIA', () => {
      const { result } = renderHook(() => useSldModeStore());

      act(() => {
        result.current.setMode('ZABEZPIECZENIA');
      });

      expect(result.current.isReadOnlyMode()).toBe(true);
    });

    it('should return true for isReadOnlyMode in WYNIKI', () => {
      const { result } = renderHook(() => useSldModeStore());

      act(() => {
        result.current.setMode('WYNIKI');
      });

      expect(result.current.isReadOnlyMode()).toBe(true);
    });

    it('should return false for isReadOnlyMode in EDYCJA', () => {
      const { result } = renderHook(() => useSldModeStore());

      expect(result.current.isReadOnlyMode()).toBe(false);
    });

    it('should have Polish label for ZABEZPIECZENIA', () => {
      expect(SLD_MODE_LABELS_PL.ZABEZPIECZENIA).toBe('Zabezpieczenia');
    });
  });

  // =============================================================================
  // PROTECTION LAYER VISIBILITY
  // =============================================================================

  describe('Protection Layer Visibility', () => {
    it('should start with protection layer hidden', () => {
      const { result } = renderHook(() => useSldModeStore((state) => state.protectionLayerVisible));
      expect(result.current).toBe(false);
    });

    it('should auto-enable protection layer when switching to ZABEZPIECZENIA mode', () => {
      const { result } = renderHook(() => useSldModeStore());

      act(() => {
        result.current.setMode('ZABEZPIECZENIA');
      });

      expect(result.current.protectionLayerVisible).toBe(true);
    });

    it('should toggle protection layer visibility', () => {
      const { result } = renderHook(() => useSldModeStore());

      act(() => {
        result.current.setMode('ZABEZPIECZENIA');
        result.current.toggleProtectionLayer(false);
      });

      expect(result.current.protectionLayerVisible).toBe(false);

      act(() => {
        result.current.toggleProtectionLayer(true);
      });

      expect(result.current.protectionLayerVisible).toBe(true);
    });

    it('should toggle without argument to flip value', () => {
      const { result } = renderHook(() => useSldModeStore());

      act(() => {
        result.current.setMode('ZABEZPIECZENIA'); // enables layer
        result.current.toggleProtectionLayer(); // should disable
      });

      expect(result.current.protectionLayerVisible).toBe(false);

      act(() => {
        result.current.toggleProtectionLayer(); // should enable
      });

      expect(result.current.protectionLayerVisible).toBe(true);
    });
  });

  // =============================================================================
  // URL SYNCHRONIZATION
  // =============================================================================

  describe('URL Synchronization', () => {
    it('should call updateUrlWithSldMode when switching to ZABEZPIECZENIA', () => {
      const { result } = renderHook(() => useSldModeStore());

      act(() => {
        result.current.setMode('ZABEZPIECZENIA');
      });

      expect(mockUpdateUrlWithSldMode).toHaveBeenCalledWith({
        mode: 'ZABEZPIECZENIA',
        diagnosticLayerVisible: false,
        protectionLayerVisible: true,
      });
    });

    it('should call updateUrlWithSldMode when protection layer toggles', () => {
      const { result } = renderHook(() => useSldModeStore());

      act(() => {
        result.current.setMode('ZABEZPIECZENIA');
      });

      mockUpdateUrlWithSldMode.mockClear();

      act(() => {
        result.current.toggleProtectionLayer(false);
      });

      expect(mockUpdateUrlWithSldMode).toHaveBeenCalledWith({
        mode: 'ZABEZPIECZENIA',
        diagnosticLayerVisible: false,
        protectionLayerVisible: false,
      });
    });

    it('should reset protection layer on resetMode', () => {
      const { result } = renderHook(() => useSldModeStore());

      act(() => {
        result.current.setMode('ZABEZPIECZENIA');
        result.current.resetMode();
      });

      expect(result.current.mode).toBe('EDYCJA');
      expect(result.current.protectionLayerVisible).toBe(false);
    });
  });

  // =============================================================================
  // POCHODNE FUNKCJE POMOCNICZE
  // =============================================================================

  describe('Pochodne funkcje pomocnicze', () => {
    describe('useIsProtectionMode', () => {
      it('should return true when in ZABEZPIECZENIA mode', () => {
        const store = useSldModeStore.getState();

        act(() => {
          store.setMode('ZABEZPIECZENIA');
        });

        const { result } = renderHook(() => useIsProtectionMode());
        expect(result.current).toBe(true);
      });

      it('should return false when in EDYCJA mode', () => {
        const { result } = renderHook(() => useIsProtectionMode());
        expect(result.current).toBe(false);
      });
    });

    describe('useProtectionLayerVisible', () => {
      it('should return protection layer visibility', () => {
        const store = useSldModeStore.getState();

        act(() => {
          store.setMode('ZABEZPIECZENIA');
        });

        const { result } = renderHook(() => useProtectionLayerVisible());
        expect(result.current).toBe(true);
      });
    });

    describe('useIsReadOnlyMode', () => {
      it('should return true for ZABEZPIECZENIA', () => {
        const store = useSldModeStore.getState();

        act(() => {
          store.setMode('ZABEZPIECZENIA');
        });

        const { result } = renderHook(() => useIsReadOnlyMode());
        expect(result.current).toBe(true);
      });

      it('should return true for WYNIKI', () => {
        const store = useSldModeStore.getState();

        act(() => {
          store.setMode('WYNIKI');
        });

        const { result } = renderHook(() => useIsReadOnlyMode());
        expect(result.current).toBe(true);
      });

      it('should return false for EDYCJA', () => {
        const { result } = renderHook(() => useIsReadOnlyMode());
        expect(result.current).toBe(false);
      });
    });
  });
});

// =============================================================================
// FUNKCJE WYBORU DANYCH ZABEZPIECZEN
// =============================================================================

describe('Funkcje wyboru danych zabezpieczen', () => {
  describe('useProtectionSummary', () => {
    it('should return null for null elementId', () => {
      const { result } = renderHook(() => useProtectionSummary(null));
      expect(result.current).toBeNull();
    });

    it('should return null for unknown elementId', () => {
      const { result } = renderHook(() => useProtectionSummary('unknown-element'));
      expect(result.current).toBeNull();
    });

    it('should return data for known elementId', () => {
      const { result } = renderHook(() => useProtectionSummary('line-001'));
      expect(result.current).not.toBeNull();
      expect(result.current?.element_id).toBe('line-001');
      expect(result.current?.element_type).toBe('LineBranch');
    });

    it('should return overcurrent settings', () => {
      const { result } = renderHook(() => useProtectionSummary('line-001'));
      expect(result.current?.overcurrent).toBeDefined();
      expect(result.current?.overcurrent?.time_overcurrent).toBeDefined();
      expect(result.current?.overcurrent?.instant_overcurrent).toBeDefined();
    });

    it('should return verification status', () => {
      const { result } = renderHook(() => useProtectionSummary('line-001'));
      expect(result.current?.verification_status).toBe('SPELNIONE');
    });
  });

  describe('useAllProtectionSummaries', () => {
    it('should return map of all protection data', () => {
      const { result } = renderHook(() => useAllProtectionSummaries());
      expect(result.current).toBeInstanceOf(Map);
      expect(result.current.size).toBeGreaterThan(0);
    });

    it('should contain fixture elements', () => {
      const { result } = renderHook(() => useAllProtectionSummaries());
      expect(result.current.has('line-001')).toBe(true);
      expect(result.current.has('trafo-001')).toBe(true);
    });
  });

  describe('useHasProtectionData', () => {
    it('should return false for null elementId', () => {
      const { result } = renderHook(() => useHasProtectionData(null));
      expect(result.current).toBe(false);
    });

    it('should return true for element with complete data', () => {
      const { result } = renderHook(() => useHasProtectionData('line-001'));
      expect(result.current).toBe(true);
    });

    it('should return false for element with incomplete data', () => {
      const { result } = renderHook(() => useHasProtectionData('trafo-002'));
      expect(result.current).toBe(false);
    });
  });

  describe('useProtectionStatistics', () => {
    it('should return statistics object', () => {
      const { result } = renderHook(() => useProtectionStatistics());
      expect(result.current).toHaveProperty('total');
      expect(result.current).toHaveProperty('complete');
      expect(result.current).toHaveProperty('incomplete');
      expect(result.current).toHaveProperty('verified');
      expect(result.current).toHaveProperty('failed');
      expect(result.current).toHaveProperty('noData');
    });

    it('should have total > 0', () => {
      const { result } = renderHook(() => useProtectionStatistics());
      expect(result.current.total).toBeGreaterThan(0);
    });
  });

  describe('selectProtectionSummaryByElementId', () => {
    it('should return null for null elementId', () => {
      expect(selectProtectionSummaryByElementId(null)).toBeNull();
    });

    it('should return data for known elementId', () => {
      const summary = selectProtectionSummaryByElementId('line-001');
      expect(summary).not.toBeNull();
      expect(summary?.element_id).toBe('line-001');
    });

    it('should return same result for same input (deterministic)', () => {
      const summary1 = selectProtectionSummaryByElementId('line-001');
      const summary2 = selectProtectionSummaryByElementId('line-001');
      expect(summary1).toEqual(summary2);
    });
  });
});

// =============================================================================
// TESTY DETERMINISTYCZNOSCI
// =============================================================================

describe('Deterministycznosc', () => {
  it('should return same protection data for same elementId', () => {
    const { result: result1 } = renderHook(() => useProtectionSummary('line-001'));
    const { result: result2 } = renderHook(() => useProtectionSummary('line-001'));

    expect(result1.current).toEqual(result2.current);
  });

  it('should return same statistics for multiple calls', () => {
    const { result: result1 } = renderHook(() => useProtectionStatistics());
    const { result: result2 } = renderHook(() => useProtectionStatistics());

    expect(result1.current).toEqual(result2.current);
  });

  it('should have stable sorting of protection summaries', () => {
    const { result: result1 } = renderHook(() => useAllProtectionSummaries());
    const { result: result2 } = renderHook(() => useAllProtectionSummaries());

    const keys1 = Array.from(result1.current.keys());
    const keys2 = Array.from(result2.current.keys());

    expect(keys1).toEqual(keys2);
  });
});

// =============================================================================
// WYMUSZENIE TRYBU TYLKO DO ODCZYTU
// =============================================================================

describe('Wymuszenie trybu tylko do odczytu', () => {
  it('should not provide mutation methods in protection summary', () => {
    const { result } = renderHook(() => useProtectionSummary('line-001'));

    // Protection summary should be a plain object without setters
    expect(typeof result.current).toBe('object');
    expect(result.current).not.toHaveProperty('setOvercurrent');
    expect(result.current).not.toHaveProperty('updateSettings');
  });

  it('should block edits in ZABEZPIECZENIA mode (store level)', () => {
    const { result } = renderHook(() => useSldModeStore());

    act(() => {
      result.current.setMode('ZABEZPIECZENIA');
    });

    // Store should indicate read-only mode
    expect(result.current.isReadOnlyMode()).toBe(true);
    expect(result.current.isEditMode()).toBe(false);
  });
});
