/**
 * P30b — SLD Editor Store (Zustand)
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § E.1: Selection patterns (deterministic ordering)
 * - powerfactory_ui_parity.md: ≥110% PowerFactory UX
 *
 * SINGLE SOURCE OF TRUTH for:
 * - All SLD symbols (nodes, branches, switches, sources, loads)
 * - Multi-select state (selectedIds - ALWAYS SORTED)
 * - Drag state (active drag, offsets)
 * - Clipboard (copy/paste)
 * - Grid config (visible, snap enabled, size)
 *
 * INVARIANTS:
 * - selectedIds ALWAYS sorted alphabetically (determinism)
 * - Drag operations work on groups
 * - All mutations go through actions (UNDO/REDO compatible)
 */

import { create } from 'zustand';
import type {
  AnySldSymbol,
  ClipboardData,
  DragState,
  GridConfig,
  LassoState,
  Position,
  SelectionMode,
} from './types';
import type { IssueSeverity } from '../types';

/**
 * Default grid configuration.
 */
const DEFAULT_GRID_CONFIG: GridConfig = {
  size: 20, // 20px grid
  visible: true,
  snapEnabled: true,
};

/**
 * SLD Editor state interface.
 */
interface SldEditorState {
  // ===== SYMBOLS =====
  /** All symbols on canvas (keyed by symbol id) */
  symbols: Map<string, AnySldSymbol>;

  // ===== SELECTION (MULTI-SELECT) =====
  /** Selected symbol IDs (ALWAYS SORTED for determinism) */
  selectedIds: string[];

  // ===== HIGHLIGHT (P30d: Issue Panel) =====
  /** Highlighted symbol IDs (for Issue Panel navigation) */
  highlightedIds: string[];
  /** Highlight severity (determines color: HIGH=red, WARN=yellow, INFO=blue) */
  highlightSeverity: IssueSeverity | null;

  // ===== DRAG =====
  /** Active drag state (null if no drag) */
  dragState: DragState | null;

  // ===== LASSO =====
  /** Active lasso selection state */
  lassoState: LassoState | null;

  // ===== CLIPBOARD =====
  /** Clipboard data (for copy/paste) */
  clipboard: ClipboardData | null;

  // ===== GRID =====
  /** Grid configuration */
  gridConfig: GridConfig;

  // ===== ACTIONS: SYMBOLS =====
  setSymbols: (symbols: AnySldSymbol[]) => void;
  addSymbol: (symbol: AnySldSymbol) => void;
  removeSymbol: (symbolId: string) => void;
  updateSymbolPosition: (symbolId: string, position: Position) => void;
  updateSymbolsPositions: (updates: Map<string, Position>) => void;

  // ===== ACTIONS: SELECTION =====
  selectSymbol: (symbolId: string, mode: SelectionMode) => void;
  selectMultiple: (symbolIds: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;
  getSelectedSymbols: () => AnySldSymbol[];

  // ===== ACTIONS: HIGHLIGHT (P30d) =====
  highlightSymbols: (symbolIds: string[], severity: IssueSeverity) => void;
  clearHighlight: () => void;

  // ===== ACTIONS: DRAG =====
  startDrag: (symbolIds: string[], startPosition: Position) => void;
  updateDrag: (currentPosition: Position) => void;
  endDrag: () => Map<string, { old: Position; new: Position }> | null;
  cancelDrag: () => void;

  // ===== ACTIONS: LASSO =====
  startLasso: (startPosition: Position) => void;
  updateLasso: (currentPosition: Position) => void;
  endLasso: () => void;
  getSymbolsInLasso: () => string[];

  // ===== ACTIONS: CLIPBOARD =====
  copySelection: () => void;
  pasteFromClipboard: (offset: Position) => AnySldSymbol[];
  duplicateSelection: () => AnySldSymbol[];

  // ===== ACTIONS: GRID =====
  toggleGridVisible: () => void;
  toggleSnapEnabled: () => void;
  setGridSize: (size: number) => void;
  snapToGrid: (position: Position) => Position;

  // ===== HELPERS =====
  getSymbol: (symbolId: string) => AnySldSymbol | undefined;
  hasSelection: () => boolean;
  getSelectionCount: () => number;
}

/**
 * Zustand store for SLD editor state.
 */
export const useSldEditorStore = create<SldEditorState>()((set, get) => ({
  // Initial state
  symbols: new Map(),
  selectedIds: [],
  highlightedIds: [],
  highlightSeverity: null,
  dragState: null,
  lassoState: null,
  clipboard: null,
  gridConfig: DEFAULT_GRID_CONFIG,

  // ===== SYMBOLS =====

  setSymbols: (symbols: AnySldSymbol[]) => {
    const symbolsMap = new Map(symbols.map((s) => [s.id, s]));
    set({ symbols: symbolsMap });
  },

  addSymbol: (symbol: AnySldSymbol) => {
    set((state) => {
      const newSymbols = new Map(state.symbols);
      newSymbols.set(symbol.id, symbol);
      return { symbols: newSymbols };
    });
  },

  removeSymbol: (symbolId: string) => {
    set((state) => {
      const newSymbols = new Map(state.symbols);
      newSymbols.delete(symbolId);
      // Remove from selection if selected
      const newSelectedIds = state.selectedIds.filter((id) => id !== symbolId);
      return {
        symbols: newSymbols,
        selectedIds: newSelectedIds,
      };
    });
  },

  updateSymbolPosition: (symbolId: string, position: Position) => {
    set((state) => {
      const symbol = state.symbols.get(symbolId);
      if (!symbol) return state;

      const newSymbols = new Map(state.symbols);
      newSymbols.set(symbolId, { ...symbol, position });
      return { symbols: newSymbols };
    });
  },

  updateSymbolsPositions: (updates: Map<string, Position>) => {
    set((state) => {
      const newSymbols = new Map(state.symbols);
      updates.forEach((position, symbolId) => {
        const symbol = state.symbols.get(symbolId);
        if (symbol) {
          newSymbols.set(symbolId, { ...symbol, position });
        }
      });
      return { symbols: newSymbols };
    });
  },

  // ===== SELECTION =====

  selectSymbol: (symbolId: string, mode: SelectionMode) => {
    set((state) => {
      const { selectedIds } = state;

      let newSelectedIds: string[];
      if (mode === 'single') {
        // Single select: replace selection
        newSelectedIds = [symbolId];
      } else if (mode === 'add') {
        // Add to selection (Shift+click)
        if (!selectedIds.includes(symbolId)) {
          newSelectedIds = [...selectedIds, symbolId];
        } else {
          newSelectedIds = selectedIds;
        }
      } else {
        // Toggle (Ctrl/Cmd+click)
        if (selectedIds.includes(symbolId)) {
          newSelectedIds = selectedIds.filter((id) => id !== symbolId);
        } else {
          newSelectedIds = [...selectedIds, symbolId];
        }
      }

      // DETERMINISM: Always sort selected IDs
      newSelectedIds.sort();

      return { selectedIds: newSelectedIds };
    });
  },

  selectMultiple: (symbolIds: string[]) => {
    set(() => {
      // DETERMINISM: Sort selected IDs
      const sorted = [...symbolIds].sort();
      return { selectedIds: sorted };
    });
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  selectAll: () => {
    const state = get();
    const allIds = Array.from(state.symbols.keys()).sort();
    set({ selectedIds: allIds });
  },

  getSelectedSymbols: () => {
    const state = get();
    return state.selectedIds
      .map((id) => state.symbols.get(id))
      .filter((s): s is AnySldSymbol => s !== undefined);
  },

  // ===== HIGHLIGHT (P30d) =====

  highlightSymbols: (symbolIds: string[], severity: IssueSeverity) => {
    set({ highlightedIds: [...symbolIds].sort(), highlightSeverity: severity });
  },

  clearHighlight: () => {
    set({ highlightedIds: [], highlightSeverity: null });
  },

  // ===== DRAG =====

  startDrag: (symbolIds: string[], startPosition: Position) => {
    const state = get();

    // Capture original positions
    const originalPositions = new Map<string, Position>();
    symbolIds.forEach((id) => {
      const symbol = state.symbols.get(id);
      if (symbol) {
        originalPositions.set(id, { ...symbol.position });
      }
    });

    set({
      dragState: {
        symbolIds,
        originalPositions,
        offset: { x: 0, y: 0 },
        startPosition,
      },
    });
  },

  updateDrag: (currentPosition: Position) => {
    set((state) => {
      if (!state.dragState) return state;

      const offset = {
        x: currentPosition.x - state.dragState.startPosition.x,
        y: currentPosition.y - state.dragState.startPosition.y,
      };

      // Update positions with snap-to-grid if enabled
      const newSymbols = new Map(state.symbols);
      state.dragState.symbolIds.forEach((id) => {
        const originalPos = state.dragState!.originalPositions.get(id);
        if (originalPos) {
          let newPos = {
            x: originalPos.x + offset.x,
            y: originalPos.y + offset.y,
          };

          // Apply snap-to-grid if enabled
          if (state.gridConfig.snapEnabled) {
            newPos = get().snapToGrid(newPos);
          }

          const symbol = state.symbols.get(id);
          if (symbol) {
            newSymbols.set(id, { ...symbol, position: newPos });
          }
        }
      });

      return {
        symbols: newSymbols,
        dragState: { ...state.dragState, offset },
      };
    });
  },

  endDrag: () => {
    const state = get();
    if (!state.dragState) return null;

    // Compute final position changes for UNDO/REDO
    const changes = new Map<string, { old: Position; new: Position }>();
    state.dragState.symbolIds.forEach((id) => {
      const oldPos = state.dragState!.originalPositions.get(id);
      const symbol = state.symbols.get(id);
      if (oldPos && symbol) {
        changes.set(id, { old: oldPos, new: symbol.position });
      }
    });

    set({ dragState: null });
    return changes;
  },

  cancelDrag: () => {
    const state = get();
    if (!state.dragState) return;

    // Restore original positions
    const newSymbols = new Map(state.symbols);
    state.dragState.symbolIds.forEach((id) => {
      const originalPos = state.dragState!.originalPositions.get(id);
      const symbol = state.symbols.get(id);
      if (originalPos && symbol) {
        newSymbols.set(id, { ...symbol, position: originalPos });
      }
    });

    set({ symbols: newSymbols, dragState: null });
  },

  // ===== LASSO =====

  startLasso: (startPosition: Position) => {
    set({
      lassoState: {
        startPosition,
        currentPosition: startPosition,
        active: true,
      },
    });
  },

  updateLasso: (currentPosition: Position) => {
    set((state) => {
      if (!state.lassoState) return state;
      return {
        lassoState: {
          ...state.lassoState,
          currentPosition,
        },
      };
    });
  },

  endLasso: () => {
    const symbolsInLasso = get().getSymbolsInLasso();
    get().selectMultiple(symbolsInLasso);
    set({ lassoState: null });
  },

  getSymbolsInLasso: () => {
    const state = get();
    if (!state.lassoState) return [];

    const { startPosition, currentPosition } = state.lassoState;

    // Compute lasso bounding box
    const minX = Math.min(startPosition.x, currentPosition.x);
    const maxX = Math.max(startPosition.x, currentPosition.x);
    const minY = Math.min(startPosition.y, currentPosition.y);
    const maxY = Math.max(startPosition.y, currentPosition.y);

    // Find symbols inside lasso
    const symbolsInside: string[] = [];
    state.symbols.forEach((symbol, id) => {
      const { x, y } = symbol.position;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        symbolsInside.push(id);
      }
    });

    return symbolsInside.sort();
  },

  // ===== CLIPBOARD =====

  copySelection: () => {
    const state = get();
    const selectedSymbols = state.selectedIds
      .map((id) => state.symbols.get(id))
      .filter((s): s is AnySldSymbol => s !== undefined);

    if (selectedSymbols.length === 0) return;

    set({
      clipboard: {
        symbols: selectedSymbols,
        timestamp: Date.now(),
      },
    });
  },

  pasteFromClipboard: (offset: Position) => {
    const state = get();
    if (!state.clipboard) return [];

    // Generate new symbols with offset positions
    const newSymbols: AnySldSymbol[] = state.clipboard.symbols.map((symbol) => {
      const newId = `${symbol.id}_copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        ...symbol,
        id: newId,
        position: {
          x: symbol.position.x + offset.x,
          y: symbol.position.y + offset.y,
        },
      };
    });

    // Add new symbols to canvas
    newSymbols.forEach((symbol) => {
      get().addSymbol(symbol);
    });

    // Select new symbols
    get().selectMultiple(newSymbols.map((s) => s.id));

    return newSymbols;
  },

  duplicateSelection: () => {
    // Duplicate = copy + paste with deterministic offset
    const DUPLICATE_OFFSET = { x: 20, y: 20 };
    get().copySelection();
    return get().pasteFromClipboard(DUPLICATE_OFFSET);
  },

  // ===== GRID =====

  toggleGridVisible: () => {
    set((state) => ({
      gridConfig: { ...state.gridConfig, visible: !state.gridConfig.visible },
    }));
  },

  toggleSnapEnabled: () => {
    set((state) => ({
      gridConfig: { ...state.gridConfig, snapEnabled: !state.gridConfig.snapEnabled },
    }));
  },

  setGridSize: (size: number) => {
    set((state) => ({
      gridConfig: { ...state.gridConfig, size },
    }));
  },

  snapToGrid: (position: Position) => {
    const { gridConfig } = get();
    if (!gridConfig.snapEnabled) return position;

    const { size } = gridConfig;
    return {
      x: Math.round(position.x / size) * size,
      y: Math.round(position.y / size) * size,
    };
  },

  // ===== HELPERS =====

  getSymbol: (symbolId: string) => {
    return get().symbols.get(symbolId);
  },

  hasSelection: () => {
    return get().selectedIds.length > 0;
  },

  getSelectionCount: () => {
    return get().selectedIds.length;
  },
}));

// =============================================================================
// Derived Hooks
// =============================================================================

/**
 * Hook: Get selected symbols.
 */
export function useSelectedSymbols(): AnySldSymbol[] {
  return useSldEditorStore((state) => state.getSelectedSymbols());
}

/**
 * Hook: Check if selection exists.
 */
export function useHasSelection(): boolean {
  return useSldEditorStore((state) => state.hasSelection());
}

/**
 * Hook: Get selection count.
 */
export function useSelectionCount(): number {
  return useSldEditorStore((state) => state.getSelectionCount());
}

/**
 * Hook: Get grid config.
 */
export function useGridConfig(): GridConfig {
  return useSldEditorStore((state) => state.gridConfig);
}

/**
 * Hook: Check if drag is active.
 */
export function useIsDragging(): boolean {
  return useSldEditorStore((state) => state.dragState !== null);
}
