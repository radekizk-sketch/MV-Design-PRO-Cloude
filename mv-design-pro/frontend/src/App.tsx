/**
 * App Root — UI_INTEGRATION_E2E
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 1.3: Active case bar (always visible)
 * - powerfactory_ui_parity.md § A: Operating modes
 * - UI_CORE_ARCHITECTURE.md § 4.1: Navigation structure
 *
 * Main application entry with:
 * - Hash-based routing with Polish labels
 * - MainLayout with Active Case Bar
 * - Mode-aware page rendering
 *
 * Routes (Polish):
 * - "" / "#sld" → Schemat jednokreskowy (SLD)
 * - "#results" → Przegląd wyników (Results Browser)
 * - "#proof" → Ślad obliczeń (Proof)
 * - "#protection-results" → Wyniki zabezpieczeń
 * - "#power-flow-results" → Wyniki rozpływu
 */

import { useEffect, useState, useCallback } from 'react';

import { DesignerPage } from './designer/DesignerPage';
import { ProofInspectorPage } from './proof-inspector';
import { ProtectionResultsInspectorPage } from './ui/protection-results';
import { PowerFlowResultsInspectorPage } from './ui/power-flow-results';
import { ResultsInspectorPage } from './ui/results-inspector';
import { MainLayout } from './ui/layout';
import { useAppStateStore } from './ui/app-state';
import { ROUTES } from './ui/navigation';

/**
 * E2E_STABILIZATION: App ready indicator for tests.
 * Set after initial hydration and route sync.
 */
function useAppReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Mark app as ready after initial render cycle completes
    const timer = requestAnimationFrame(() => {
      setReady(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  return ready;
}

/**
 * Check if route is a results route (requires RESULT_VIEW mode).
 */
function isResultsRoute(route: string): boolean {
  return (
    route === '#results' ||
    route === '#proof' ||
    route === '#protection-results' ||
    route === '#power-flow-results'
  );
}

function App() {
  const [route, setRoute] = useState(() => window.location.hash);
  const setActiveMode = useAppStateStore((state) => state.setActiveMode);
  const appReady = useAppReady();

  useEffect(() => {
    const handler = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  // Sync mode with route
  useEffect(() => {
    if (isResultsRoute(route)) {
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

  /**
   * Navigate to Results (Przegląd wyników).
   * UI_INTEGRATION_E2E: Uses #results route.
   */
  const handleViewResults = useCallback(() => {
    window.location.hash = ROUTES.RESULTS.hash;
  }, []);

  // E2E_STABILIZATION: Wrapper with app-ready indicator
  const wrapWithReadyIndicator = (content: React.ReactNode) => (
    <div data-testid="app-root" data-ready={appReady}>
      {appReady && <div data-testid="app-ready" style={{ display: 'none' }} />}
      {content}
    </div>
  );

  // UI_INTEGRATION_E2E: Przegląd wyników (Results Browser)
  if (route === '#results') {
    return wrapWithReadyIndicator(
      <MainLayout
        onCalculate={handleCalculate}
        onViewResults={handleViewResults}
      >
        <ResultsInspectorPage />
      </MainLayout>
    );
  }

  // Ślad obliczeń (Proof Inspector)
  if (route === '#proof') {
    return wrapWithReadyIndicator(
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
    return wrapWithReadyIndicator(
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
    return wrapWithReadyIndicator(
      <MainLayout
        onCalculate={handleCalculate}
        onViewResults={handleViewResults}
      >
        <PowerFlowResultsInspectorPage />
      </MainLayout>
    );
  }

  // Default: Designer page with full layout
  return wrapWithReadyIndicator(
    <MainLayout
      onCalculate={handleCalculate}
      onViewResults={handleViewResults}
    >
      <DesignerPage />
    </MainLayout>
  );
}

export default App;
