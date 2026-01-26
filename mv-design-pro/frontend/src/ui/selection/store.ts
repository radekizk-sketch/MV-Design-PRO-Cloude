/**
 * Selection State Store (Zustand)
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § E.1: Selection patterns (single click, ctrl+click, etc.)
 * - sld_rules.md § G.1: SLD ↔ Wizard synchronization
 * - wizard_screens.md § 2.4: Property Grid updates on selection
 *
 * Single source of truth for selection state.
 * Synchronizes SLD ↔ Tree ↔ Property Grid.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ElementType, OperatingMode, ResultStatus, SelectedElement } from '../types';

/**
 * Selection state interface.
 */
interface SelectionState {
  // Current selection
  selectedElement: SelectedElement | null;

  // Operating mode (controls what actions are allowed)
  mode: OperatingMode;

  // Result freshness status
  resultStatus: ResultStatus;

  // Property Grid visibility
  propertyGridOpen: boolean;

  // Navigation state
  treeExpandedNodes: Set<string>;
  sldCenterOnElement: string | null;

  // Actions
  selectElement: (element: SelectedElement | null) => void;
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
    (set) => ({
      // Initial state
      selectedElement: null,
      mode: 'MODEL_EDIT',
      resultStatus: 'NONE',
      propertyGridOpen: false,
      treeExpandedNodes: new Set<string>(),
      sldCenterOnElement: null,

      // Select an element (from SLD, Tree, or List)
      selectElement: (element) =>
        set((state) => ({
          selectedElement: element,
          // Auto-open property grid on selection
          propertyGridOpen: element !== null || state.propertyGridOpen,
        })),

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
          selectedElement: null,
          sldCenterOnElement: null,
        })),
    }),
    {
      name: 'mv-design-selection-store',
      partialState: true,
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
