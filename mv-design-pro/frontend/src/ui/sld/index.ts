/**
 * SLD Read-Only Viewer Module
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md: SLD ↔ selection synchronization
 * - powerfactory_ui_parity.md: PowerFactory-like presentation
 *
 * Exports read-only SLD viewer components.
 * For editing, use sld-editor module instead.
 */

// Main components
export { SLDView } from './SLDView';
export { SLDViewCanvas } from './SLDViewCanvas';
export { SLDViewPage } from './SLDViewPage';

// Overlay components
export { ResultsOverlay } from './ResultsOverlay';
export type { ResultsOverlayProps } from './ResultsOverlay';

// Types
export type { SLDViewProps, SLDViewCanvasProps, ViewportState } from './types';
export type { SLDViewPageProps } from './SLDViewPage';

// Utilities
export {
  DEFAULT_VIEWPORT,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
  fitToContent,
  calculateSymbolsBounds,
} from './types';

// Overlay utilities
export {
  mapPositionToScreen,
  buildOverlayPositionMaps,
  formatVoltageKv,
  formatVoltagePu,
  formatCurrentA,
  formatCurrentKa,
  formatPowerMw,
  formatPowerMvar,
  formatLoadingPct,
  getLoadingColorClass,
  getLoadingBgClass,
} from './overlayUtils';
