/**
 * App Root — P12a Data Manager Parity
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 1.3: Active case bar (always visible)
 * - powerfactory_ui_parity.md § A: Operating modes
 *
 * Main application entry with:
 * - Hash-based routing
 * - MainLayout with Active Case Bar
 * - Mode-aware page rendering
 */

import { useEffect, useState, useCallback } from 'react';

import { DesignerPage } from './designer/DesignerPage';
import { ProofInspectorPage } from './proof-inspector';
import { ProtectionResultsInspectorPage } from './ui/protection-results';
import { PowerFlowResultsInspectorPage } from './ui/power-flow-results';
import { MainLayout } from './ui/layout';
import { useAppStateStore } from './ui/app-state';

function App() {
  const [route, setRoute] = useState(() => window.location.hash);
  const setActiveMode = useAppStateStore((state) => state.setActiveMode);

  useEffect(() => {
    const handler = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  // Sync mode with route
  useEffect(() => {
    if (route === '#proof' || route === '#protection-results' || route === '#power-flow-results') {
      setActiveMode('RESULT_VIEW');
    } else if (route === '#case-config') {
      setActiveMode('CASE_CONFIG');
    } else {
      setActiveMode('MODEL_EDIT');
    }
  }, [route, setActiveMode]);

  const handleCalculate = useCallback(() => {
    // TODO: Integrate with calculation service
    console.log('Calculate triggered');
  }, []);

  const handleViewResults = useCallback(() => {
    window.location.hash = '#proof';
  }, []);

  // ProofInspectorPage has its own layout for results view
  if (route === '#proof') {
    return (
      <MainLayout
        onCalculate={handleCalculate}
        onViewResults={handleViewResults}
      >
        <ProofInspectorPage />
      </MainLayout>
    );
  }

  // Protection Results Inspector
  if (route === '#protection-results') {
    return (
      <MainLayout
        onCalculate={handleCalculate}
        onViewResults={handleViewResults}
      >
        <ProtectionResultsInspectorPage />
      </MainLayout>
    );
  }

  // P20b: Power Flow Results Inspector
  if (route === '#power-flow-results') {
    return (
      <MainLayout
        onCalculate={handleCalculate}
        onViewResults={handleViewResults}
      >
        <PowerFlowResultsInspectorPage />
      </MainLayout>
    );
  }

  // Default: Designer page with full layout
  return (
    <MainLayout
      onCalculate={handleCalculate}
      onViewResults={handleViewResults}
    >
      <DesignerPage />
    </MainLayout>
  );
}

export default App;
