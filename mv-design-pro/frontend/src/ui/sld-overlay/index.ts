/**
 * SLD Overlay Runtime Module — PR-16
 *
 * Public API for the SLD Overlay Runtime Engine.
 *
 * EXPORTS:
 * - Types: OverlayPayloadV1, OverlayElement, etc.
 * - Store: useOverlayStore
 * - Engine: applyOverlayToSymbols, resolveElementStyle
 * - Hook: useOverlayRuntime
 * - Components: OverlayLegend
 */

// Types
export type {
  OverlayVisualState,
  OverlayElement,
  OverlayLegendEntry,
  OverlayPayloadV1,
  ResolvedOverlayStyle,
} from './overlayTypes';

export {
  COLOR_TOKEN_MAP,
  STROKE_TOKEN_MAP,
  ANIMATION_TOKEN_MAP,
  VISUAL_STATE_STYLE,
} from './overlayTypes';

// Store
export { useOverlayStore } from './overlayStore';

// Engine
export {
  resolveElementStyle,
  applyOverlayToSymbols,
  getElementOverlayStyle,
  formatBadgeValue,
} from './OverlayEngine';

// Hook
export { useOverlayRuntime } from './useOverlayRuntime';
export type { OverlayRuntimeResult } from './useOverlayRuntime';

// Components
export { OverlayLegend } from './OverlayLegend';
