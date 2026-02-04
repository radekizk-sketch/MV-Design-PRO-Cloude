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
export { SldEditorPage } from './SldEditorPage';
export type { SldEditorPageProps } from './SldEditorPage';

// Overlay components
export { ResultsOverlay } from './ResultsOverlay';
export type { ResultsOverlayProps } from './ResultsOverlay';
export { DiagnosticsOverlay } from './DiagnosticsOverlay';
export type { DiagnosticsOverlayProps } from './DiagnosticsOverlay';
export { DiagnosticsLegend } from './DiagnosticsLegend';
export type { DiagnosticsLegendProps } from './DiagnosticsLegend';

// Diagnostics store
export {
  useDiagnosticsStore,
  useDiagnosticsVisible,
  useDiagnosticsFilter,
} from './diagnosticsStore';

// PR-SLD-06: SLD Mode store
export {
  useSldModeStore,
  useSldMode,
  useIsResultsMode,
  useIsEditMode,
  useDiagnosticLayerVisible,
  useSldModeLabel,
  SLD_MODE_LABELS_PL,
} from './sldModeStore';
export type { SldMode } from './sldModeStore';

// PR-SLD-06: Diagnostic Results Layer
export { DiagnosticResultsLayer } from './DiagnosticResultsLayer';
export type {
  DiagnosticResultsLayerProps,
  BusDiagnosticData,
  BranchDiagnosticData,
} from './DiagnosticResultsLayer';

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

// Legend components
export { LegendPanel } from './LegendPanel';
export type { LegendPanelProps } from './LegendPanel';

// Empty state overlay (PowerFactory/ETAP style)
export { SldEmptyOverlay } from './SldEmptyOverlay';
export type { SldEmptyOverlayProps, SldEmptyState } from './SldEmptyOverlay';

// Scale utilities
export {
  calculateOverlayRanges,
  formatRange,
  formatVoltagePuRange,
  formatVoltageKvRange,
  formatCurrentRange,
  formatLoadingRange,
  formatPowerMwRange,
  formatPowerMvarRange,
  formatIkssRange,
} from './scale';
export type { ValueRange, OverlayRanges } from './scale';

// Voltage colors (PLANS STYLE)
export {
  VOLTAGE_COLORS,
  DEFAULT_VOLTAGE_COLOR,
  DEENERGIZED_COLOR,
  SELECTED_COLOR,
  getVoltageColor,
  getVoltageColorWithState,
  getVoltageLevel,
  getVoltageLevelLabel,
} from './voltageColors';
