/**
 * Protection Diagnostics Module
 *
 * Panel diagnostyki zabezpieczeń (read-only).
 * Wyświetla wyniki ProtectionSanityCheckResult.
 *
 * Exports:
 * - Types
 * - Store & Selectors
 * - Panel Component
 * - Inspector Section Component
 */

// Types
export type {
  DiagnosticSeverity,
  SanityCheckCode,
  ProtectionSanityCheckResult,
  DiagnosticsState,
  DiagnosticsStats,
} from './types';

export {
  SEVERITY_LABELS_PL,
  SEVERITY_COLORS,
  SEVERITY_ICONS,
  CODE_LABELS_PL,
  SEVERITY_SORT_ORDER,
  sortDiagnosticsResults,
  computeDiagnosticsStats,
} from './types';

// Store & Selectors
export {
  useProtectionDiagnosticsStore,
  useFilteredDiagnostics,
  useDiagnosticsForElement,
  useDiagnosticsStats,
  useHasDiagnostics,
  useHasErrors,
  useIsLoading,
  useDiagnosticsError,
  useSeverityFilter,
} from './store';

// Components
export {
  ProtectionDiagnosticsPanel,
  type ProtectionDiagnosticsPanelProps,
} from './ProtectionDiagnosticsPanel';

export {
  ProtectionDiagnosticsPanelContainer,
} from './ProtectionDiagnosticsPanelContainer';

export {
  ProtectionDiagnosticsSection,
  ProtectionDiagnosticsSectionConnected,
  type ProtectionDiagnosticsSectionProps,
  type ProtectionDiagnosticsSectionConnectedProps,
} from './ProtectionDiagnosticsSection';

// Test Fixtures (for development/testing only)
export {
  DEMO_DIAGNOSTICS_RESULTS,
  SINGLE_ELEMENT_DIAGNOSTICS,
  EMPTY_DIAGNOSTICS,
  ERRORS_ONLY,
  WARNINGS_ONLY,
} from './__fixtures__/diagnosticsFixtures';
