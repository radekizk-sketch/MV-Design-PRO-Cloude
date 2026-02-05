/**
 * SLD Full Auto-Layout Engine — Public API
 *
 * GŁÓWNA FUNKCJA: computeLayout() — wykonuje pełny pipeline layoutu
 *
 * ZASADY:
 * - ZERO przycisków "auto layout" w UI — layout działa AUTOMATYCZNIE
 * - NAPIĘCIA DYNAMICZNE — odczytywane z MODELU, nie hardkodowane
 * - DETERMINIZM 100% — ten sam model → identyczny pixel output
 * - INCREMENTAL — małe zmiany nie resetują całego schematu
 *
 * PIPELINE (5 faz, inspiracja Sugiyama + ETAP + PowerFactory):
 * 1. Voltage Band Assignment — pasma napięciowe z MODELU
 * 2. Bay Detection — wykrywanie feeder bays od busbarów
 * 3. Crossing Minimization — porządek bayów (barycenter heuristic)
 * 4. Coordinate Assignment — dokładne współrzędne X,Y
 * 5. Edge Routing + Label Placement — orthogonal routing
 */

// =============================================================================
// TYPES (RE-EXPORT)
// =============================================================================

export type {
  // Core types
  Point,
  Rectangle,
  PathSegment,

  // Voltage types
  VoltageBand,
  VoltageCategory,
  VoltageColorRule,

  // Bay types
  Bay,
  BayType,
  BayElement,

  // Config
  LayoutConfig,

  // Input/Output
  LayoutSymbol,
  LayoutInput,
  LayoutResult,
  ElementPosition,
  BusbarGeometry,
  RoutedEdge,
  LabelPosition,

  // Debug
  LayoutDebugInfo,

  // Incremental
  ChangeType,
  LayoutChange,
  UserPositionOverride,

  // Pipeline
  PipelineContext,
} from './types';

export { DEFAULT_LAYOUT_CONFIG } from './types';

// =============================================================================
// VOLTAGE COLORS (RE-EXPORT)
// =============================================================================

export {
  DEFAULT_VOLTAGE_COLOR_MAP,
  ETAP_STYLE_COLORS,
  POWERFACTORY_STYLE_COLORS,
  MONOCHROME_COLORS,
  getVoltageColor,
  getVoltageCategory,
  getVoltageColorRule,
  formatVoltageLabel,
  generateVoltageBandId,
  validateVoltageColorMap,
} from './config/voltage-colors';

// =============================================================================
// PHASE 1: VOLTAGE BANDS (RE-EXPORT)
// =============================================================================

export {
  assignVoltageBands,
  collectUniqueVoltages,
  getSymbolMainVoltage,
  findVoltageBandForSymbol,
  findVoltageBandByVoltage,
  getTransformersBetweenBands,
  validateSymbolVoltages,
  inferVoltageFromConnections,
  fillMissingVoltages,
} from './phase1-voltage-bands';

export type { TransformerBandConnection } from './phase1-voltage-bands';

// =============================================================================
// PHASE 2: BAY DETECTION (RE-EXPORT)
// =============================================================================

export {
  detectBays,
  findBayContainingSymbol,
  findBaysForBusbar,
  countTotalBays,
  findTieBays,
  findSZRBays,
} from './phase2-bay-detection';

// =============================================================================
// PHASE 3: CROSSING MINIMIZATION (RE-EXPORT)
// =============================================================================

export {
  minimizeCrossings,
  getBayTypePriority,
  sortBaysByType,
} from './phase3-crossing-min';

// =============================================================================
// PHASE 4: COORDINATE ASSIGNMENT (RE-EXPORT)
// =============================================================================

export {
  assignCoordinates,
  calculateSchemaBounds,
} from './phase4-coordinates';

// =============================================================================
// PHASE 5: ROUTING (RE-EXPORT)
// =============================================================================

export {
  routeEdgesAndPlaceLabels,
  validateOrthogonalPaths,
  countEdgeCrossings,
} from './phase5-routing';

// =============================================================================
// PIPELINE (RE-EXPORT)
// =============================================================================

export {
  computeFullLayout,
  verifyDeterminism,
  computeIncrementalLayout,
} from './pipeline';

// =============================================================================
// MAIN API FUNCTION
// =============================================================================

import { computeFullLayout as _computeFullLayout } from './pipeline';
import type { LayoutInput, LayoutResult } from './types';

/**
 * Główna funkcja layoutu SLD.
 *
 * UŻYCIE:
 * ```typescript
 * import { computeLayout } from '@/engine/sld-layout';
 *
 * const result = computeLayout({
 *   symbols: [...],          // Symbole z modelu (MUSZĄ mieć voltageKV!)
 *   config: { ... },         // Opcjonalna nadpisana konfiguracja
 *   voltageColorMap: [...],  // Opcjonalna mapa kolorów
 * });
 *
 * // Wynik:
 * result.positions          // Map<symbolId, ElementPosition>
 * result.voltageBands       // VoltageBand[] (dynamiczne pasma)
 * result.bays               // Bay[] (wykryte baye)
 * result.routedEdges        // Map<edgeId, RoutedEdge>
 * result.labelPositions     // Map<symbolId, LabelPosition>
 * ```
 *
 * @param input - Dane wejściowe
 * @returns Wynik layoutu
 */
export function computeLayout(input: LayoutInput): LayoutResult {
  return _computeFullLayout(input);
}

// Alias dla kompatybilności
export const generateLayout = computeLayout;
