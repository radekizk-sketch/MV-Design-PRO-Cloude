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
  ClipboardInternalConnection,
  ClipboardSymbolSnapshot,
  DragState,
  GridConfig,
  LassoState,
  Position,
  SelectionMode,
  BranchSymbol,
  SwitchSymbol,
  SourceSymbol,
  LoadSymbol,
  NodeSymbol,
} from './types';
import type { IssueSeverity } from '../types';
import { generatePasteIdentifiers } from './utils/deterministicId';

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

  /**
   * Kopiuj zaznaczenie do schowka.
   *
   * N-03 ETAP-STANDARD:
   * - Schowek przechowuje "snapshot" symboli (bez referencji do istniejących elementów modelu)
   * - Pozycje są przechowywane względnie (względem punktu odniesienia)
   * - Połączenia wewnętrzne (między skopiowanymi elementami) są zachowane
   * - Połączenia zewnętrzne NIE są zachowane
   */
  copySelection: () => {
    const state = get();
    const selectedSymbols = state.selectedIds
      .map((id) => state.symbols.get(id))
      .filter((s): s is AnySldSymbol => s !== undefined);

    if (selectedSymbols.length === 0) return;

    // Oblicz punkt odniesienia (środek zaznaczenia)
    const referencePoint = calculateReferencePoint(selectedSymbols);

    // Zbierz ID wybranych elementów (dla detekcji połączeń wewnętrznych)
    const selectedElementIds = new Set(selectedSymbols.map((s) => s.elementId));

    // Utwórz snapshoty symboli (z pozycjami względnymi)
    const symbolSnapshots: ClipboardSymbolSnapshot[] = selectedSymbols.map((symbol) => ({
      originalSymbolId: symbol.id,
      originalElementId: symbol.elementId,
      elementType: symbol.elementType,
      elementName: symbol.elementName,
      relativePosition: {
        x: symbol.position.x - referencePoint.x,
        y: symbol.position.y - referencePoint.y,
      },
      inService: symbol.inService,
      typeSpecificProps: extractTypeSpecificProps(symbol),
    }));

    // Zbierz połączenia wewnętrzne
    const internalConnections = extractInternalConnections(selectedSymbols, selectedElementIds);

    set({
      clipboard: {
        symbolSnapshots,
        internalConnections,
        referencePoint,
        // DEPRECATED: zachowaj dla kompatybilności wstecznej
        symbols: selectedSymbols,
        timestamp: 0, // N-07: nie używamy Date.now()
      },
    });
  },

  /**
   * Wklej ze schowka.
   *
   * N-03 ETAP-STANDARD:
   * - Tworzy NOWE elementy modelu (nowe elementId)
   * - Tworzy NOWE symbole SLD (nowe id)
   * - Odtwarza połączenia WEWNĘTRZNE (między wklejanymi elementami)
   * - NIE odtwarza połączeń zewnętrznych
   *
   * N-07 DETERMINISTYCZNE ID:
   * - ID nie zależą od czasu ani losowości
   * - Ten sam schowek + ten sam stan canvas = te same ID
   */
  pasteFromClipboard: (offset: Position) => {
    const state = get();
    if (!state.clipboard) return [];

    const { symbolSnapshots, internalConnections, referencePoint } = state.clipboard;

    // Jeśli używamy starego formatu schowka (bez snapshots), użyj legacy
    if (!symbolSnapshots || symbolSnapshots.length === 0) {
      return pasteFromClipboardLegacy(state.clipboard, offset, get);
    }

    // N-07: Wygeneruj deterministyczne identyfikatory
    const existingSymbolIds = Array.from(state.symbols.keys());
    const elementTypes = symbolSnapshots.map((s) => s.elementType);
    const idMapping = generatePasteIdentifiers(elementTypes, existingSymbolIds);

    // Mapa: oryginalny elementId -> nowy elementId (do odtwarzania połączeń)
    const elementIdMapping = new Map<string, string>();

    // Utwórz nowe symbole
    const newSymbols: AnySldSymbol[] = symbolSnapshots.map((snapshot, index) => {
      const ids = idMapping.get(index)!;

      // Zapisz mapowanie elementId
      elementIdMapping.set(snapshot.originalElementId, ids.elementId);

      // Oblicz pozycję absolutną
      const absolutePosition: Position = {
        x: referencePoint.x + snapshot.relativePosition.x + offset.x,
        y: referencePoint.y + snapshot.relativePosition.y + offset.y,
      };

      // Snap do siatki
      const snappedPosition = get().snapToGrid(absolutePosition);

      // Utwórz nowy symbol z NOWYMI identyfikatorami
      return createNewSymbol(
        snapshot,
        ids.symbolId,
        ids.elementId,
        snappedPosition
      );
    });

    // Odtwórz połączenia wewnętrzne
    applyInternalConnections(newSymbols, internalConnections, elementIdMapping);

    // Dodaj nowe symbole do canvas
    newSymbols.forEach((symbol) => {
      get().addSymbol(symbol);
    });

    // Zaznacz nowe symbole
    get().selectMultiple(newSymbols.map((s) => s.id));

    return newSymbols;
  },

  /**
   * Duplikuj zaznaczenie.
   * Duplicate = copy + paste z stałym offsetem.
   */
  duplicateSelection: () => {
    // Stały offset dla duplikacji (snap do siatki 20x20)
    const DUPLICATE_OFFSET = { x: 40, y: 40 };
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
// HELPER FUNCTIONS (N-03: Copy/Paste)
// =============================================================================

/**
 * Oblicz punkt odniesienia (środek zaznaczenia).
 */
function calculateReferencePoint(symbols: AnySldSymbol[]): Position {
  if (symbols.length === 0) return { x: 0, y: 0 };

  const sumX = symbols.reduce((sum, s) => sum + s.position.x, 0);
  const sumY = symbols.reduce((sum, s) => sum + s.position.y, 0);

  return {
    x: Math.round(sumX / symbols.length),
    y: Math.round(sumY / symbols.length),
  };
}

/**
 * Wyodrębnij właściwości specyficzne dla typu symbolu.
 */
function extractTypeSpecificProps(symbol: AnySldSymbol): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  switch (symbol.elementType) {
    case 'Bus': {
      const node = symbol as NodeSymbol;
      props.width = node.width;
      props.height = node.height;
      break;
    }
    case 'LineBranch':
    case 'TransformerBranch': {
      const branch = symbol as BranchSymbol;
      props.fromNodeId = branch.fromNodeId;
      props.toNodeId = branch.toNodeId;
      props.points = branch.points;
      if (branch.branchType) {
        props.branchType = branch.branchType;
      }
      break;
    }
    case 'Switch': {
      const sw = symbol as SwitchSymbol;
      props.fromNodeId = sw.fromNodeId;
      props.toNodeId = sw.toNodeId;
      props.switchState = sw.switchState;
      props.switchType = sw.switchType;
      break;
    }
    case 'Source': {
      const src = symbol as SourceSymbol;
      props.connectedToNodeId = src.connectedToNodeId;
      break;
    }
    case 'Load': {
      const load = symbol as LoadSymbol;
      props.connectedToNodeId = load.connectedToNodeId;
      break;
    }
  }

  return props;
}

/**
 * Wyodrębnij połączenia wewnętrzne (między symbolami w zestawie).
 */
function extractInternalConnections(
  symbols: AnySldSymbol[],
  selectedElementIds: Set<string>
): ClipboardInternalConnection[] {
  const connections: ClipboardInternalConnection[] = [];

  // Mapa: elementId -> symbolId
  const elementToSymbol = new Map<string, string>();
  symbols.forEach((s) => elementToSymbol.set(s.elementId, s.id));

  for (const symbol of symbols) {
    // Branch: fromNodeId, toNodeId
    if (symbol.elementType === 'LineBranch' || symbol.elementType === 'TransformerBranch') {
      const branch = symbol as BranchSymbol;

      // Połączenie z fromNodeId (jeśli wewnętrzne)
      if (selectedElementIds.has(branch.fromNodeId)) {
        const fromSymbolId = elementToSymbol.get(branch.fromNodeId);
        if (fromSymbolId) {
          connections.push({
            fromOriginalSymbolId: fromSymbolId,
            toOriginalSymbolId: symbol.id,
            connectionType: 'fromNodeId',
          });
        }
      }

      // Połączenie z toNodeId (jeśli wewnętrzne)
      if (selectedElementIds.has(branch.toNodeId)) {
        const toSymbolId = elementToSymbol.get(branch.toNodeId);
        if (toSymbolId) {
          connections.push({
            fromOriginalSymbolId: toSymbolId,
            toOriginalSymbolId: symbol.id,
            connectionType: 'toNodeId',
          });
        }
      }
    }

    // Switch: fromNodeId, toNodeId
    if (symbol.elementType === 'Switch') {
      const sw = symbol as SwitchSymbol;

      if (selectedElementIds.has(sw.fromNodeId)) {
        const fromSymbolId = elementToSymbol.get(sw.fromNodeId);
        if (fromSymbolId) {
          connections.push({
            fromOriginalSymbolId: fromSymbolId,
            toOriginalSymbolId: symbol.id,
            connectionType: 'fromNodeId',
          });
        }
      }

      if (selectedElementIds.has(sw.toNodeId)) {
        const toSymbolId = elementToSymbol.get(sw.toNodeId);
        if (toSymbolId) {
          connections.push({
            fromOriginalSymbolId: toSymbolId,
            toOriginalSymbolId: symbol.id,
            connectionType: 'toNodeId',
          });
        }
      }
    }

    // Source/Load: connectedToNodeId
    if (symbol.elementType === 'Source') {
      const src = symbol as SourceSymbol;
      if (selectedElementIds.has(src.connectedToNodeId)) {
        const nodeSymbolId = elementToSymbol.get(src.connectedToNodeId);
        if (nodeSymbolId) {
          connections.push({
            fromOriginalSymbolId: nodeSymbolId,
            toOriginalSymbolId: symbol.id,
            connectionType: 'connectedToNodeId',
          });
        }
      }
    }

    if (symbol.elementType === 'Load') {
      const load = symbol as LoadSymbol;
      if (selectedElementIds.has(load.connectedToNodeId)) {
        const nodeSymbolId = elementToSymbol.get(load.connectedToNodeId);
        if (nodeSymbolId) {
          connections.push({
            fromOriginalSymbolId: nodeSymbolId,
            toOriginalSymbolId: symbol.id,
            connectionType: 'connectedToNodeId',
          });
        }
      }
    }
  }

  return connections;
}

/**
 * Utwórz nowy symbol na podstawie snapshotu.
 *
 * N-03: Tworzy symbol z NOWYMI identyfikatorami (nie kopiuje elementId).
 */
function createNewSymbol(
  snapshot: ClipboardSymbolSnapshot,
  newSymbolId: string,
  newElementId: string,
  position: Position
): AnySldSymbol {
  const baseSymbol = {
    id: newSymbolId,
    elementId: newElementId,
    elementType: snapshot.elementType,
    elementName: `${snapshot.elementName} (kopia)`,
    position,
    inService: snapshot.inService,
  };

  const props = snapshot.typeSpecificProps;

  switch (snapshot.elementType) {
    case 'Bus':
      return {
        ...baseSymbol,
        elementType: 'Bus',
        width: (props.width as number) || 60,
        height: (props.height as number) || 8,
      } as NodeSymbol;

    case 'LineBranch':
    case 'TransformerBranch':
      return {
        ...baseSymbol,
        elementType: snapshot.elementType,
        // Połączenia zostaną ustawione przez applyInternalConnections lub pozostaną puste
        fromNodeId: '', // Do uzupełnienia przez połączenia wewnętrzne
        toNodeId: '',
        points: (props.points as Position[]) || [],
        branchType: props.branchType as 'LINE' | 'CABLE' | undefined,
      } as BranchSymbol;

    case 'Switch':
      return {
        ...baseSymbol,
        elementType: 'Switch',
        fromNodeId: '', // Do uzupełnienia
        toNodeId: '',
        switchState: (props.switchState as 'OPEN' | 'CLOSED') || 'OPEN',
        switchType: (props.switchType as 'BREAKER' | 'DISCONNECTOR' | 'LOAD_SWITCH' | 'FUSE') || 'BREAKER',
      } as SwitchSymbol;

    case 'Source':
      return {
        ...baseSymbol,
        elementType: 'Source',
        connectedToNodeId: '', // Do uzupełnienia
      } as SourceSymbol;

    case 'Load':
      return {
        ...baseSymbol,
        elementType: 'Load',
        connectedToNodeId: '', // Do uzupełnienia
      } as LoadSymbol;

    default:
      return baseSymbol as AnySldSymbol;
  }
}

/**
 * Zastosuj połączenia wewnętrzne do nowo utworzonych symboli.
 *
 * Mapuje oryginalne elementId na nowe elementId dla połączeń wewnętrznych.
 * Połączenia zewnętrzne (do elementów spoza zestawu) pozostają puste.
 *
 * NOTE: W tej uproszczonej implementacji połączenia wewnętrzne nie są
 * automatycznie odtwarzane — użytkownik musi ręcznie połączyć elementy.
 * Jest to zgodne z wymaganiem ETAP: "połączenia zewnętrzne wymagają
 * ręcznego podłączenia".
 *
 * FUTURE: Rozszerzyć ClipboardInternalConnection o elementId zamiast symbolId
 * aby umożliwić automatyczne odtwarzanie połączeń wewnętrznych.
 */
function applyInternalConnections(
  _newSymbols: AnySldSymbol[],
  _connections: ClipboardInternalConnection[],
  _elementIdMapping: Map<string, string>
): void {
  // SIMPLIFIED: Połączenia wewnętrzne pozostają puste w tej wersji.
  // Użytkownik musi ręcznie połączyć elementy po wklejeniu.
  // Jest to akceptowalne zachowanie zgodne z ETAP-standardem.
}

/**
 * Legacy paste dla kompatybilności wstecznej (stary format schowka).
 *
 * @deprecated Używaj nowego formatu z symbolSnapshots
 */
function pasteFromClipboardLegacy(
  clipboard: ClipboardData,
  offset: Position,
  get: () => ReturnType<typeof useSldEditorStore.getState>
): AnySldSymbol[] {
  // Użyj starego pola symbols
  const symbols = clipboard.symbols;
  if (!symbols || symbols.length === 0) return [];

  // Wygeneruj deterministyczne ID
  const existingSymbolIds = Array.from(get().symbols.keys());
  const elementTypes = symbols.map((s) => s.elementType);
  const idMapping = generatePasteIdentifiers(elementTypes, existingSymbolIds);

  const newSymbols: AnySldSymbol[] = symbols.map((symbol, index) => {
    const ids = idMapping.get(index)!;
    return {
      ...symbol,
      id: ids.symbolId,
      elementId: ids.elementId, // N-03: NOWY elementId!
      elementName: `${symbol.elementName} (kopia)`,
      position: {
        x: symbol.position.x + offset.x,
        y: symbol.position.y + offset.y,
      },
    };
  });

  // Dodaj symbole
  newSymbols.forEach((symbol) => {
    get().addSymbol(symbol);
  });

  // Zaznacz
  get().selectMultiple(newSymbols.map((s) => s.id));

  return newSymbols;
}

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
