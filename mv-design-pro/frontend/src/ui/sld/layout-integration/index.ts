/**
 * SLD AUTO-LAYOUT INTEGRATION — Public API
 *
 * Integracja modułu auto-layout z pipeline renderingu SLD.
 *
 * FEATURE FLAG: SLD_AUTO_LAYOUT_V1 (domyślnie OFF)
 *
 * JAK WŁĄCZYĆ LOKALNIE:
 * 1. Ustaw VITE_SLD_AUTO_LAYOUT_V1=true w pliku .env.local
 * 2. LUB wywołaj enableAutoLayoutV1() w konsoli dev tools
 *
 * PUNKT INTEGRACJI:
 * - connectionRouting.ts wywołuje generateBusbarFeederPaths()
 * - Gdy flag ON, ścieżki busbar feeders używają algorytmu auto-layout
 * - Gdy flag OFF, zachowanie bez zmian
 *
 * CANONICAL ALIGNMENT:
 * - layout/index.ts: algorytm auto-layout
 * - connectionRouting.ts: generowanie połączeń
 * - sldEtapStyle.ts: ETAP_GEOMETRY tokens
 */

// Re-export feature flag controls from layout module
export { isAutoLayoutV1Enabled, enableAutoLayoutV1, disableAutoLayoutV1 } from '../layout';

// Export adapter types
export type {
  BusbarAutoLayoutInput,
  FeederPathResult,
  BusbarAutoLayoutRenderResult,
} from './busbarFeedersAdapter';

// Export adapter functions
export {
  // Adapter helpers (for testing/debugging)
  determineBusbarAxis,
  calculateBusbarEndpoints,
  determineFeederSide,
  generateFeederOrderKey,
  getBusbarThickness,

  // Main adapter functions
  buildBusbarInput,
  buildFeederInput,
  findBusbarFeeders,
  buildBusbarAutoLayoutInputs,

  // Layout execution
  pathSegmentsToPositions,
  executeBusbarAutoLayout,

  // Integration API
  generateBusbarFeederPaths,
  isBusbarFeederConnection,
  getBusbarFeederPath,
} from './busbarFeedersAdapter';
