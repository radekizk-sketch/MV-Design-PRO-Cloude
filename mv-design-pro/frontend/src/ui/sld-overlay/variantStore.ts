/**
 * Variant Store — §7 UX 10/10
 *
 * Zustand store for project variant management.
 *
 * WYMAGANIA:
 * - Dropdown wyboru wariantu
 * - Duplikacja wariantu
 * - Porównanie (delta overlay)
 * - Overlay kolorystyczny zmian
 *
 * INVARIANTS:
 * - Variant comparison is READ-ONLY (no model mutations)
 * - Delta overlay computed from backend VariantComparisonEngine
 * - Deterministic diff: same variants → same delta
 * - All labels Polish
 */

import { create } from 'zustand';

// =============================================================================
// Types
// =============================================================================

export interface ProjectVariant {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  isActive: boolean;
  enmRevision: number;
}

export type DeltaChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';

export const DELTA_CHANGE_LABELS: Record<DeltaChangeType, string> = {
  ADDED: 'Dodany',
  REMOVED: 'Usunięty',
  MODIFIED: 'Zmieniony',
  UNCHANGED: 'Bez zmian',
};

export const DELTA_CHANGE_COLORS: Record<DeltaChangeType, string> = {
  ADDED: '#22c55e',     // green-500
  REMOVED: '#ef4444',   // red-500
  MODIFIED: '#f59e0b',  // amber-500
  UNCHANGED: '#94a3b8', // slate-400
};

export interface VariantDeltaElement {
  elementId: string;
  elementType: string;
  elementName: string;
  changeType: DeltaChangeType;
  changedFields: string[];
}

export interface VariantDelta {
  baseVariantId: string;
  compareVariantId: string;
  elements: VariantDeltaElement[];
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  unchangedCount: number;
}

// =============================================================================
// Store Interface
// =============================================================================

interface VariantStoreState {
  // Variant list
  variants: ProjectVariant[];
  activeVariantId: string | null;
  loading: boolean;
  error: string | null;

  // Comparison state
  compareMode: boolean;
  compareVariantId: string | null;
  delta: VariantDelta | null;
  deltaLoading: boolean;

  // Overlay state
  deltaOverlayVisible: boolean;

  // Actions
  loadVariants: (projectId: string) => Promise<void>;
  setActiveVariant: (variantId: string) => void;
  duplicateVariant: (variantId: string, newName: string) => Promise<void>;

  // Comparison actions
  startComparison: (compareVariantId: string) => void;
  stopComparison: () => void;
  loadDelta: (baseId: string, compareId: string) => Promise<void>;
  toggleDeltaOverlay: () => void;

  // Reset
  clear: () => void;
}

// =============================================================================
// API
// =============================================================================

async function fetchVariants(projectId: string): Promise<ProjectVariant[]> {
  const res = await fetch(`/api/projects/${projectId}/variants`);
  if (!res.ok) throw new Error(`Nie udało się pobrać wariantów: ${res.statusText}`);
  return res.json();
}

async function fetchVariantDelta(baseId: string, compareId: string): Promise<VariantDelta> {
  const res = await fetch(`/api/variants/${baseId}/compare/${compareId}`);
  if (!res.ok) throw new Error(`Nie udało się porównać wariantów: ${res.statusText}`);
  return res.json();
}

async function postDuplicateVariant(
  variantId: string,
  newName: string,
): Promise<ProjectVariant> {
  const res = await fetch(`/api/variants/${variantId}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName }),
  });
  if (!res.ok) throw new Error(`Nie udało się zduplikować wariantu: ${res.statusText}`);
  return res.json();
}

// =============================================================================
// Store
// =============================================================================

export const useVariantStore = create<VariantStoreState>()((set, get) => ({
  variants: [],
  activeVariantId: null,
  loading: false,
  error: null,
  compareMode: false,
  compareVariantId: null,
  delta: null,
  deltaLoading: false,
  deltaOverlayVisible: false,

  loadVariants: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const variants = await fetchVariants(projectId);
      const active = variants.find((v) => v.isActive);
      set({
        variants,
        activeVariantId: active?.id ?? null,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Nieznany błąd',
        loading: false,
      });
    }
  },

  setActiveVariant: (variantId: string) => {
    set({ activeVariantId: variantId });
  },

  duplicateVariant: async (variantId: string, newName: string) => {
    try {
      const newVariant = await postDuplicateVariant(variantId, newName);
      set((state) => ({
        variants: [...state.variants, newVariant],
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Nie udało się zduplikować',
      });
    }
  },

  startComparison: (compareVariantId: string) => {
    const { activeVariantId } = get();
    set({
      compareMode: true,
      compareVariantId,
      deltaOverlayVisible: true,
    });
    if (activeVariantId) {
      get().loadDelta(activeVariantId, compareVariantId);
    }
  },

  stopComparison: () => {
    set({
      compareMode: false,
      compareVariantId: null,
      delta: null,
      deltaOverlayVisible: false,
    });
  },

  loadDelta: async (baseId: string, compareId: string) => {
    set({ deltaLoading: true });
    try {
      const delta = await fetchVariantDelta(baseId, compareId);
      set({ delta, deltaLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Błąd porównania',
        deltaLoading: false,
      });
    }
  },

  toggleDeltaOverlay: () => {
    set((state) => ({ deltaOverlayVisible: !state.deltaOverlayVisible }));
  },

  clear: () => {
    set({
      variants: [],
      activeVariantId: null,
      loading: false,
      error: null,
      compareMode: false,
      compareVariantId: null,
      delta: null,
      deltaLoading: false,
      deltaOverlayVisible: false,
    });
  },
}));

// =============================================================================
// Derived Selectors
// =============================================================================

export function useActiveVariant(): ProjectVariant | null {
  return useVariantStore((s) => {
    const id = s.activeVariantId;
    return s.variants.find((v) => v.id === id) ?? null;
  });
}

export function useIsCompareMode(): boolean {
  return useVariantStore((s) => s.compareMode);
}

export function useDeltaForElement(elementId: string): VariantDeltaElement | null {
  return useVariantStore((s) => {
    if (!s.delta) return null;
    return s.delta.elements.find((e) => e.elementId === elementId) ?? null;
  });
}
