/**
 * FIX-03 — Results Browser Module Exports
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: READ-ONLY result display
 * - wizard_screens.md: RESULT_VIEW mode
 */

// Types
export * from './types';

// API
export * from './api';

// Store
export {
  useResultsBrowserStore,
  useIsAnyLoading,
  useFilteredBusVoltages,
  useFilteredBranchFlows,
  useFilteredLosses,
  useFilteredViolations,
  useCurrentViewData,
  useCanCompare,
  useViolationSummary,
} from './store';

// Components
export { ResultsBrowser } from './ResultsBrowser';
export { ResultsTable, RowCountFooter } from './ResultsTable';
export { ResultsFilters, QuickFilterButton, ViolationQuickFilters } from './ResultsFilters';
export { ResultsExport, CompactExportButtons } from './ResultsExport';
export { ResultsComparison } from './ResultsComparison';
