/**
 * P30b — SLD Editor Types
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § A: Bijection: Symbol ↔ Model Object
 * - sld_rules.md § E: Interaction Patterns (selection, drag, etc.)
 * - powerfactory_ui_parity.md: ≥110% PowerFactory editing experience
 *
 * FEATURES:
 * - Multi-select (Shift+klik, Ctrl+klik, lasso)
 * - Drag single/group
 * - Copy/paste/duplicate
 * - Align & distribute
 * - Snap-to-grid
 * - Full UNDO/REDO integration (P30a)
 */

import type { ElementType } from '../types';

/**
 * SLD Symbol position (x, y coordinates in pixels).
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Bounding box for symbols (used for align/distribute/lasso).
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * SLD Symbol base interface.
 * Maps 1:1 to NetworkModel element (bijection per sld_rules.md § A.1).
 */
export interface SldSymbol {
  /** Unique symbol ID */
  id: string;

  /** Element ID in NetworkModel (bijection) */
  elementId: string;

  /** Element type (Bus, LineBranch, etc.) */
  elementType: ElementType;

  /** Element name (for display) */
  elementName: string;

  /** Position on canvas (pixels) */
  position: Position;

  /** Visual state (grayed if false) */
  inService: boolean;

  /** Selected state (UI only) */
  selected?: boolean;
}

/**
 * Node/Bus symbol (horizontal bar).
 */
export interface NodeSymbol extends SldSymbol {
  elementType: 'Bus';
  width: number; // busbar width
  height: number; // busbar height
}

/**
 * Branch symbol (line/cable/transformer).
 */
export interface BranchSymbol extends SldSymbol {
  elementType: 'LineBranch' | 'TransformerBranch';
  fromNodeId: string;
  toNodeId: string;
  points: Position[]; // polyline points
}

/**
 * Switch symbol.
 */
export interface SwitchSymbol extends SldSymbol {
  elementType: 'Switch';
  fromNodeId: string;
  toNodeId: string;
  switchState: 'OPEN' | 'CLOSED';
  switchType: 'BREAKER' | 'DISCONNECTOR' | 'LOAD_SWITCH' | 'FUSE';
}

/**
 * Source symbol (grid connection, PV, wind, BESS).
 */
export interface SourceSymbol extends SldSymbol {
  elementType: 'Source';
  connectedToNodeId: string;
}

/**
 * Load symbol.
 */
export interface LoadSymbol extends SldSymbol {
  elementType: 'Load';
  connectedToNodeId: string;
}

/**
 * Union of all symbol types.
 */
export type AnySldSymbol =
  | NodeSymbol
  | BranchSymbol
  | SwitchSymbol
  | SourceSymbol
  | LoadSymbol;

/**
 * Selection mode.
 */
export type SelectionMode = 'single' | 'add' | 'toggle';

/**
 * Drag state (tracks active drag operation).
 */
export interface DragState {
  /** Symbols being dragged */
  symbolIds: string[];

  /** Original positions before drag (for undo) */
  originalPositions: Map<string, Position>;

  /** Current drag offset */
  offset: Position;

  /** Drag start position (canvas coords) */
  startPosition: Position;
}

/**
 * Lasso selection state (drag-rectangle).
 */
export interface LassoState {
  /** Lasso start position (canvas coords) */
  startPosition: Position;

  /** Lasso current position (canvas coords) */
  currentPosition: Position;

  /** Active lasso selection */
  active: boolean;
}

/**
 * Grid configuration.
 */
export interface GridConfig {
  /** Grid size in pixels */
  size: number;

  /** Grid visible */
  visible: boolean;

  /** Snap to grid enabled */
  snapEnabled: boolean;
}

/**
 * Align direction.
 */
export type AlignDirection = 'left' | 'right' | 'top' | 'bottom' | 'center-horizontal' | 'center-vertical';

/**
 * Distribute direction.
 */
export type DistributeDirection = 'horizontal' | 'vertical';

/**
 * Clipboard data (for copy/paste).
 */
export interface ClipboardData {
  /** Symbols in clipboard */
  symbols: AnySldSymbol[];

  /** Timestamp when copied */
  timestamp: number;
}

/**
 * Toolbar action type.
 */
export type ToolbarAction =
  | 'copy'
  | 'paste'
  | 'duplicate'
  | 'delete'
  | 'align-left'
  | 'align-right'
  | 'align-top'
  | 'align-bottom'
  | 'align-center-h'
  | 'align-center-v'
  | 'distribute-h'
  | 'distribute-v'
  | 'toggle-grid'
  | 'toggle-snap';
