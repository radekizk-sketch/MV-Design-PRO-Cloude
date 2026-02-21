/**
 * SLD Read-Only Viewer Types
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § A: Symbol ↔ Model bijection
 * - powerfactory_ui_parity.md: PowerFactory-like presentation
 *
 * READ-ONLY viewer types — no editing, no drag/drop.
 * Reuses core types from sld-editor for symbol definitions.
 */

import type { ElementType, SelectedElement } from '../types';
import type { AnySldSymbol, Position } from '../sld-editor/types';
import type { CanonicalAnnotationsV1 } from './core/layoutResult';
import { ETAP_GEOMETRY } from './sldEtapStyle';

/**
 * Viewport state for pan/zoom.
 */
export interface ViewportState {
  /** Pan offset X (pixels) */
  offsetX: number;
  /** Pan offset Y (pixels) */
  offsetY: number;
  /** Zoom level (1.0 = 100%) */
  zoom: number;
}

/**
 * SLD View props.
 */
export interface SLDViewProps {
  /** Symbols to render */
  symbols: AnySldSymbol[];

  /** Currently selected element (from URL/store) */
  selectedElement?: SelectedElement | null;

  /** Callback when element is clicked */
  onElementClick?: (element: SelectedElement) => void;

  /** Show grid background */
  showGrid?: boolean;

  /** Canvas width (px) */
  width?: number;

  /** Canvas height (px) */
  height?: number;

  /** Initial zoom level */
  initialZoom?: number;

  /** Fit to content on mount */
  fitOnMount?: boolean;

  /** Callback uruchamiający obliczenia (BLOK 8 — przycisk Oblicz) */
  onCalculateClick?: () => void;
}

/**
 * SLD View Canvas props (internal).
 */
export interface SLDViewCanvasProps {
  /** Symbols to render */
  symbols: AnySldSymbol[];

  /** Selected symbol ID */
  selectedId: string | null;

  /** Callback when symbol is clicked */
  onSymbolClick: (symbolId: string, elementType: ElementType, elementName: string) => void;

  /** Viewport state */
  viewport: ViewportState;

  /** Show grid */
  showGrid: boolean;

  /** Canvas width */
  width: number;

  /** Canvas height */
  height: number;

  /** Canonical SLD annotations (Phase 7 output, optional) */
  canonicalAnnotations?: CanonicalAnnotationsV1 | null;
}

/**
 * Zoom constraints.
 */
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 3.0;
export const ZOOM_STEP = 0.1;

/**
 * Default viewport state.
 */
export const DEFAULT_VIEWPORT: ViewportState = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1.0,
};

/**
 * Calculate bounding box of all symbols.
 */
export function calculateSymbolsBounds(symbols: AnySldSymbol[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} | null {
  if (symbols.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const includePoint = (point: Position, paddingX: number, paddingY: number) => {
    minX = Math.min(minX, point.x - paddingX);
    minY = Math.min(minY, point.y - paddingY);
    maxX = Math.max(maxX, point.x + paddingX);
    maxY = Math.max(maxY, point.y + paddingY);
  };

  for (const symbol of symbols) {
    const { x, y } = symbol.position;
    // Account for symbol size (approximate)
    const halfWidth = symbol.elementType === 'Bus' ? 40 : 20;
    const halfHeight = symbol.elementType === 'Bus' ? 10 : 20;

    includePoint({ x, y }, halfWidth, halfHeight);

    if ('points' in symbol && Array.isArray(symbol.points)) {
      for (const point of symbol.points) {
        includePoint(point, 0, 0);
      }
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate viewport to fit all symbols with padding.
 */
export function fitToContent(
  symbols: AnySldSymbol[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number = ETAP_GEOMETRY.view.fitPaddingPx
): ViewportState {
  const bounds = calculateSymbolsBounds(symbols);
  if (!bounds) return DEFAULT_VIEWPORT;

  const { minX, minY } = bounds;
  const width = Math.max(bounds.width, 1);
  const height = Math.max(bounds.height, 1);

  // Calculate zoom to fit content
  const scaleX = (canvasWidth - 2 * padding) / width;
  const scaleY = (canvasHeight - 2 * padding) / height;
  const zoom = Math.min(scaleX, scaleY, ZOOM_MAX);
  const clampedZoom = Math.max(zoom, ZOOM_MIN);
  const roundedZoom = Math.round(clampedZoom * 100) / 100;

  // Calculate offset to center content
  const offsetX = padding - minX * roundedZoom + (canvasWidth - width * roundedZoom - 2 * padding) / 2;
  const offsetY = padding - minY * roundedZoom + (canvasHeight - height * roundedZoom - 2 * padding) / 2;

  return {
    offsetX: Math.round(offsetX),
    offsetY: Math.round(offsetY),
    zoom: roundedZoom,
  };
}
