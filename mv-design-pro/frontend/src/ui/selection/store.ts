/**
 * Selection State Store (Zustand)
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § E.1: Selection patterns (single click, ctrl+click, etc.)
 * - sld_rules.md § G.1: SLD ↔ Wizard synchronization
 * - wizard_screens.md § 2.4: Property Grid updates on selection
 * - P30c: Multi-select for Property Grid multi-edit
 *
 * Single source of truth for selection state.
 * Synchronizes SLD ↔ Tree ↔ Property Grid.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OperatingMode, ResultStatus, SelectedElement, MultiSelection } from '../types';

/**
 * Selection state interface.
 */
interface SelectionState {
  // Current selection (P30c: multi-select support)
  selectedElements: SelectedElement[]; // Always sorted by ID (determinism)
  selectedElement: SelectedElement | null; // Computed: first element (compatibility)

  // Operating mode (controls what actions are allowed)
  mode: OperatingMode;

  // Result freshness status
  resultStatus: ResultStatus;

  // Property Grid visibility
  propertyGridOpen: boolean;

  // Navigation state
  treeExpandedNodes: Set<string>;
  sldCenterOnElement: string | null;

  // Actions (P30c: multi-select)
  selectElement: (element: SelectedElement | null) => void; // Single select (compatibility)
  selectElements: (elements: SelectedElement[]) => void; // Multi-select (P30c)
  getMultiSelection: () => MultiSelection | null; // Get multi-selection state
  setMode: (mode: OperatingMode) => void;
  setResultStatus: (status: ResultStatus) => void;
  togglePropertyGrid: (open?: boolean) => void;
  expandTreeNode: (nodeId: string) => void;
  collapseTreeNode: (nodeId: string) => void;
  centerSldOnElement: (elementId: string | null) => void;
  clearSelection: () => void;
}

/**
 * Zustand store for selection state.
 *
 * Usage:
 * ```tsx
 * const { selectedElement, selectElement, mode } = useSelectionStore();
 * ```
 */
export const useSelectionStore = create<SelectionState>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedElements: [],
      selectedElement: null,
      mode: 'MODEL_EDIT',
      resultStatus: 'NONE',
      propertyGridOpen: false,
      treeExpandedNodes: new Set<string>(),
      sldCenterOnElement: null,

      // Select an element (from SLD, Tree, or List) - single select (compatibility)
      selectElement: (element) =>
        set((state) => ({
          selectedElements: element ? [element] : [],
          selectedElement: element ?? null,
          // Auto-open property grid on selection
          propertyGridOpen: element !== null || state.propertyGridOpen,
        })),

      // P30c: Multi-select (deterministic, sorted by ID)
      selectElements: (elements) =>
        set((state) => {
          const sorted = [...elements].sort((a, b) => a.id.localeCompare(b.id));
          return {
            selectedElements: sorted,
            selectedElement: sorted[0] ?? null,
            // Auto-open property grid on selection
            propertyGridOpen: sorted.length > 0 || state.propertyGridOpen,
          };
        }),

      // P30c: Get multi-selection state
      getMultiSelection: () => {
        const state = get();
        if (state.selectedElements.length === 0) return null;

        // Find common type (or null if mixed)
        const firstType = state.selectedElements[0].type;
        const allSameType = state.selectedElements.every((el) => el.type === firstType);
        const commonType = allSameType ? firstType : null;

        return {
          elements: state.selectedElements,
          commonType,
        };
      },

      // Change operating mode
      setMode: (mode) =>
        set(() => ({
          mode,
          // Clear result status when entering MODEL_EDIT (results become OUTDATED)
          resultStatus: mode === 'MODEL_EDIT' ? 'OUTDATED' : 'NONE',
        })),

      // Update result freshness status
      setResultStatus: (resultStatus) => set(() => ({ resultStatus })),

      // Toggle property grid visibility
      togglePropertyGrid: (open) =>
        set((state) => ({
          propertyGridOpen: open !== undefined ? open : !state.propertyGridOpen,
        })),

      // Expand a tree node
      expandTreeNode: (nodeId) =>
        set((state) => {
          const newExpanded = new Set(state.treeExpandedNodes);
          newExpanded.add(nodeId);
          return { treeExpandedNodes: newExpanded };
        }),

      // Collapse a tree node
      collapseTreeNode: (nodeId) =>
        set((state) => {
          const newExpanded = new Set(state.treeExpandedNodes);
          newExpanded.delete(nodeId);
          return { treeExpandedNodes: newExpanded };
        }),

      // Center SLD view on element
      centerSldOnElement: (elementId) =>
        set(() => ({
          sldCenterOnElement: elementId,
        })),

      // Clear selection
      clearSelection: () =>
        set(() => ({
          selectedElements: [],
          selectedElement: null,
          sldCenterOnElement: null,
        })),
    }),
    {
      name: 'mv-design-selection-store',
      // Only persist UI state, not runtime state
      partialize: (state) => ({
        treeExpandedNodes: state.treeExpandedNodes,
        propertyGridOpen: state.propertyGridOpen,
      }),
      // Custom serializer for Set
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          if (parsed.state?.treeExpandedNodes) {
            parsed.state.treeExpandedNodes = new Set(parsed.state.treeExpandedNodes);
          }
          return parsed;
        },
        setItem: (name, value) => {
          const toStore = {
            ...value,
            state: {
              ...value.state,
              treeExpandedNodes: value.state?.treeExpandedNodes
                ? Array.from(value.state.treeExpandedNodes)
                : [],
            },
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

/**
 * Hook to check if editing is allowed based on current mode.
 *
 * @returns true if MODEL_EDIT mode, false otherwise
 */
export function useCanEdit(): boolean {
  const mode = useSelectionStore((state) => state.mode);
  return mode === 'MODEL_EDIT';
}

/**
 * Hook to check if model mutations are blocked (RESULT_VIEW or CASE_CONFIG).
 *
 * @returns true if mutations are blocked
 */
export function useIsMutationBlocked(): boolean {
  const mode = useSelectionStore((state) => state.mode);
  return mode === 'RESULT_VIEW' || mode === 'CASE_CONFIG';
}

/**
 * Hook to get human-readable mode label in Polish.
 */
export function useModeLabel(): string {
  const mode = useSelectionStore((state) => state.mode);
  switch (mode) {
    case 'MODEL_EDIT':
      return 'Edycja modelu';
    case 'CASE_CONFIG':
      return 'Konfiguracja przypadku';
    case 'RESULT_VIEW':
      return 'Wyniki';
    default:
      return mode;
  }
}

/**
 * Hook to get result status label in Polish.
 */
export function useResultStatusLabel(): string {
  const status = useSelectionStore((state) => state.resultStatus);
  switch (status) {
    case 'NONE':
      return 'Brak wyników';
    case 'FRESH':
      return 'Wyniki aktualne';
    case 'OUTDATED':
      return 'Wyniki nieaktualne';
    default:
      return status;
  }
}

// =============================================================================
// P11b — RESULT_VIEW Mode Gating Hooks
// =============================================================================

/**
 * Hook to check if currently in RESULT_VIEW mode.
 *
 * CANONICAL: wizard_screens.md § 1.2 — RESULT_VIEW is READ-ONLY.
 */
export function useIsResultViewMode(): boolean {
  return useSelectionStore((state) => state.mode === 'RESULT_VIEW');
}

/**
 * Hook to check if results overlay should be visible.
 *
 * CANONICAL: sld_rules.md § C.2 — Overlay visible only in RESULT_VIEW mode.
 * Results must be FRESH for overlay to display correctly.
 */
export function useIsOverlayAllowed(): boolean {
  return useSelectionStore(
    (state) => state.mode === 'RESULT_VIEW' && state.resultStatus === 'FRESH'
  );
}

/**
 * Hook to check if entering RESULT_VIEW mode is allowed.
 *
 * CANONICAL: powerfactory_ui_parity.md § A.1 — RESULT_VIEW requires FRESH results.
 */
export function useCanEnterResultView(): boolean {
  return useSelectionStore((state) => state.resultStatus === 'FRESH');
}

/**
 * Hook to get blocked action message for RESULT_VIEW mode.
 *
 * Returns null if action is allowed, otherwise returns Polish message.
 */
export function useBlockedActionMessage(): string | null {
  const mode = useSelectionStore((state) => state.mode);
  if (mode === 'RESULT_VIEW') {
    return 'Edycja zablokowana w trybie wyników. Przejdź do trybu edycji modelu.';
  }
  if (mode === 'CASE_CONFIG') {
    return 'Edycja modelu zablokowana. Przejdź do trybu edycji modelu.';
  }
  return null;
}

/**
 * Hook to get context menu mode config.
 *
 * Returns object with flags for what actions are available.
 */
export function useContextMenuConfig(): {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewProperties: boolean;
  canViewResults: boolean;
} {
  const mode = useSelectionStore((state) => state.mode);

  switch (mode) {
    case 'MODEL_EDIT':
      return {
        canAdd: true,
        canEdit: true,
        canDelete: true,
        canViewProperties: true,
        canViewResults: false,
      };
    case 'CASE_CONFIG':
      return {
        canAdd: false,
        canEdit: false,
        canDelete: false,
        canViewProperties: true, // Read-only
        canViewResults: false,
      };
    case 'RESULT_VIEW':
      return {
        canAdd: false,
        canEdit: false,
        canDelete: false,
        canViewProperties: true, // Read-only
        canViewResults: true,
      };
    default:
      return {
        canAdd: false,
        canEdit: false,
        canDelete: false,
        canViewProperties: true,
        canViewResults: false,
      };
  }
}

/**
 * Hook to get property grid editability based on mode.
 *
 * CANONICAL: wizard_screens.md § 2.4 — Property Grid is read-only in RESULT_VIEW.
 */
export function usePropertyGridEditable(): boolean {
  return useSelectionStore((state) => state.mode === 'MODEL_EDIT');
}

/**
 * P30c: Hook to get multi-selection state.
 *
 * Returns null if no selection, otherwise returns MultiSelection with:
 * - elements: sorted array of selected elements
 * - commonType: element type if all same, null if mixed types
 */
export function useMultiSelection(): MultiSelection | null {
  return useSelectionStore((state) => state.getMultiSelection());
}

/**
 * P30c: Hook to get selected elements.
 */
export function useSelectedElements(): SelectedElement[] {
  return useSelectionStore((state) => state.selectedElements);
}
