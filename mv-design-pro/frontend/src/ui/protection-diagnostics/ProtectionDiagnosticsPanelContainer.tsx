/**
 * Protection Diagnostics Panel Container
 *
 * Container wiring panel z store.
 * Używany w widoku Results.
 *
 * BINDING:
 * - Pobiera dane ze store (useProtectionDiagnosticsStore)
 * - READ-ONLY: brak mutacji
 */

import React from 'react';
import { ProtectionDiagnosticsPanel } from './ProtectionDiagnosticsPanel';
import {
  useProtectionDiagnosticsStore,
  useFilteredDiagnostics,
  useIsLoading,
  useDiagnosticsError,
  useSeverityFilter,
} from './store';

export const ProtectionDiagnosticsPanelContainer: React.FC = () => {
  const results = useFilteredDiagnostics();
  const isLoading = useIsLoading();
  const error = useDiagnosticsError();
  const activeSeverities = useSeverityFilter();
  const toggleSeverityFilter = useProtectionDiagnosticsStore(
    (state) => state.toggleSeverityFilter
  );

  return (
    <ProtectionDiagnosticsPanel
      results={results}
      activeSeverities={activeSeverities}
      onToggleSeverity={toggleSeverityFilter}
      isLoading={isLoading}
      error={error}
    />
  );
};

export default ProtectionDiagnosticsPanelContainer;
