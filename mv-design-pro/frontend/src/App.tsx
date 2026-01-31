/**
 * App Root — UI_INTEGRATION_E2E + PROJECT_TREE_PARITY_V1 + SLD_READ_ONLY_UI
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 1.3: Active case bar (always visible)
 * - powerfactory_ui_parity.md § A: Operating modes, Project Tree
 * - UI_CORE_ARCHITECTURE.md § 4.1: Navigation structure
 *
 * Main application entry with:
 * - Hash-based routing with Polish labels
 * - MainLayout with Active Case Bar
 * - Project Tree (left sidebar) for navigation
 * - Mode-aware page rendering
 *
 * Routes (Polish):
 * - "" / "#sld" → Schemat jednokreskowy (SLD Editor)
 * - "#sld-view" → Podglad schematu (SLD Read-Only Viewer)
 * - "#results" → Przegląd wyników (Results Browser)
 * - "#proof" → Ślad obliczeń (Proof)
 * - "#protection-results" → Wyniki zabezpieczeń
 * - "#power-flow-results" → Wyniki rozpływu
 */

import { useEffect, useState, useCallback, useMemo } from 'react';

import { DesignerPage } from './designer/DesignerPage';
import { ProofInspectorPage } from './proof-inspector';
import { ProtectionResultsInspectorPage } from './ui/protection-results';
import { PowerFlowResultsInspectorPage } from './ui/power-flow-results';
import { ResultsInspectorPage } from './ui/results-inspector';
import { SLDViewPage } from './ui/sld';
import { MainLayout } from './ui/layout';
import { useAppStateStore } from './ui/app-state';
import { ROUTES, useUrlSelectionSync, getCurrentHashRoute } from './ui/navigation';
import { useSelectionStore } from './ui/selection';
import type { TreeNode, TreeNodeType, ElementType } from './ui/types';

// PROJECT_TREE_PARITY_V1: Get active project name from store
function useActiveProjectName(): string | null {
  const store = useAppStateStore();
  return (store as { activeProjectName?: string | null }).activeProjectName ?? null;
}

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
  // NAVIGATION_SELECTOR_UI: Use getCurrentHashRoute to strip query params from hash
  const [route, setRoute] = useState(() => getCurrentHashRoute());
  const setActiveMode = useAppStateStore((state) => state.setActiveMode);
  const appReady = useAppReady();
  const projectName = useActiveProjectName();
  const selectElement = useSelectionStore((state) => state.selectElement);
  const centerSldOnElement = useSelectionStore((state) => state.centerSldOnElement);

  // NAVIGATION_SELECTOR_UI: Sync selection with URL (refresh preserves selection)
  useUrlSelectionSync();

  useEffect(() => {
    // NAVIGATION_SELECTOR_UI: Strip query params when handling hash changes
    const handler = () => setRoute(getCurrentHashRoute());
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

  // PROJECT_TREE_PARITY_V1: Tree node click handler
  // Updates selection → syncs URL → triggers Results Table / Inspector update
  const handleTreeNodeClick = useCallback((node: TreeNode) => {
    // Only handle element nodes (not categories)
    if (node.nodeType === 'ELEMENT' && node.elementId && node.elementType) {
      selectElement({
        id: node.elementId,
        type: node.elementType as ElementType,
        name: node.label,
      });
      centerSldOnElement(node.elementId);
    }
  }, [selectElement, centerSldOnElement]);

  // PROJECT_TREE_PARITY_V1: Tree category click handler
  const handleTreeCategoryClick = useCallback((_nodeType: TreeNodeType, _elementType?: ElementType) => {
    // Category clicks could navigate to Data Manager or filter views
    // For now, this is a no-op placeholder
  }, []);

  // PROJECT_TREE_PARITY_V1: Tree run click handler
  const handleTreeRunClick = useCallback((runId: string) => {
    // Navigate to results with run context
    window.location.hash = `#results?run=${runId}`;
  }, []);

  // PROJECT_TREE_PARITY_V1: Mock tree elements for demonstration
  // In production, this would come from network model store
  const treeElements = useMemo(() => ({
    buses: [],
    lines: [],
    cables: [],
    transformers: [],
    switches: [],
    sources: [],
    loads: [],
  }), []);

  // E2E_STABILIZATION: Wrapper with app-ready indicator
  const wrapWithReadyIndicator = (content: React.ReactNode) => (
    <div data-testid="app-root" data-ready={appReady}>
      {appReady && <div data-testid="app-ready" style={{ display: 'none' }} />}
      {content}
    </div>
  );

  // UI_INTEGRATION_E2E + PROJECT_TREE_PARITY_V1: Przegląd wyników (Results Browser)
  if (route === '#results') {
    return wrapWithReadyIndicator(
      <MainLayout
        onCalculate={handleCalculate}
        onViewResults={handleViewResults}
        showProjectTree={true}
        projectName={projectName ?? 'Nowy projekt'}
        treeElements={treeElements}
        onTreeNodeClick={handleTreeNodeClick}
        onTreeCategoryClick={handleTreeCategoryClick}
        onTreeRunClick={handleTreeRunClick}
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

  // SLD_READ_ONLY_UI: Podglad schematu jednokreskowego (tylko odczyt)
  if (route === '#sld-view') {
    return wrapWithReadyIndicator(
      <MainLayout
        onCalculate={handleCalculate}
        onViewResults={handleViewResults}
        showProjectTree={true}
        projectName={projectName ?? 'Nowy projekt'}
        treeElements={treeElements}
        onTreeNodeClick={handleTreeNodeClick}
        onTreeCategoryClick={handleTreeCategoryClick}
        onTreeRunClick={handleTreeRunClick}
      >
        <SLDViewPage useDemo={true} />
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
