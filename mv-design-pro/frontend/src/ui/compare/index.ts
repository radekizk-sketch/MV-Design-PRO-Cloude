/**
 * Compare Cases Module — Public Exports
 *
 * CANONICAL ALIGNMENT:
 * - P10: Study Cases comparison (Case A vs Case B)
 * - READ-ONLY: No physics calculations
 * - UI 100% po polsku
 */

// Types
export * from './types';

// Store
export {
  useCompareCasesStore,
  useFilteredBuses,
  useFilteredBranches,
  useFilteredShortCircuit,
  useFilteredDiagnostics,
  useHasComparison,
  useIsComparing,
} from './store';

// Components
export { CompareView } from './CompareView';
export { CompareResultsTable } from './CompareResultsTable';
export { CompareDiagnostics } from './CompareDiagnostics';
