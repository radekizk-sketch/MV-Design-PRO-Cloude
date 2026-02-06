/**
 * App Root — POWERFACTORY_LAYOUT + UI_INTEGRATION_E2E + PROJECT_TREE_PARITY_V1
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Layout narzędziowy ZAWSZE renderowany
 * - wizard_screens.md § 1.3: Active case bar (always visible)
 * - UI_CORE_ARCHITECTURE.md § 4.1: Navigation structure
 *
 * POWERFACTORY/ETAP RULE:
 * > Layout narzędziowy ZAWSZE jest renderowany.
 * > Brak danych = komunikat w obszarze roboczym, a NIE brak UI.
 *
 * Main application entry with:
 * - PowerFactoryLayout with ALWAYS visible Project Tree, Inspector, Status Bar
 * - Hash-based routing with Polish labels
 * - Mode-aware page rendering
 * - Empty state overlays (NOT empty screens)
 *
 * Routes (Polish):
 * - "" / "#sld" → Schemat jednokreskowy (SLD Editor)
 * - "#sld-view" → Podglad schematu (SLD Read-Only Viewer)
 * - "#results" → Przegląd wyników (Results Browser)
 * - "#proof" → Ślad obliczeń (Proof)
 * - "#protection-results" → Wyniki zabezpieczeń
 * - "#power-flow-results" → Wyniki rozpływu
 * - "#wizard" → Kreator sieci (K1-K10)
 * - "#protection-settings" → Nastawy zabezpieczeń
 */

import { useEffect, useState, useCallback, useMemo } from 'react';

import { ProofInspectorPage } from './proof-inspector';
import { ProtectionResultsInspectorPage } from './ui/protection-results';
import { PowerFlowResultsInspectorPage } from './ui/power-flow-results';
import { ReferencePatternsPage } from './ui/reference-patterns';
import { ResultsInspectorPage } from './ui/results-inspector';
import { SLDViewPage, SldEditorPage } from './ui/sld';
import { WizardPage } from './ui/wizard';
import { EnmInspectorPage } from './ui/enm-inspector';
import { PowerFactoryLayout } from './ui/layout';
import { useAppStateStore } from './ui/app-state';
import { ROUTES, useUrlSelectionSync, getCurrentHashRoute } from './ui/navigation';
import { useSelectionStore } from './ui/selection';
import { NotificationToast } from './ui/notifications/NotificationToast';
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
    route === '#power-flow-results' ||
    route === '#reference-patterns' ||
    route === '#protection-settings'
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
    // TODO: Calculation requires an active case configured
    // Silent no-op until case management flow is complete
    if (import.meta.env.DEV) {
      console.debug('[handleCalculate] No active case - calculation skipped');
    }
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
    // Category navigation not yet implemented - silent no-op
    // Filter by category will be available in future version
    if (import.meta.env.DEV) {
      console.debug('[handleTreeCategoryClick] Category click - filter not yet implemented');
    }
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
      <NotificationToast />
      {content}
    </div>
  );

  // Common layout props for PowerFactoryLayout
  const layoutProps = {
    onCalculate: handleCalculate,
    onViewResults: handleViewResults,
    projectName: projectName ?? 'Nowy projekt',
    treeElements: treeElements,
    onTreeNodeClick: handleTreeNodeClick,
    onTreeCategoryClick: handleTreeCategoryClick,
    onTreeRunClick: handleTreeRunClick,
  };

  // UI_INTEGRATION_E2E + PROJECT_TREE_PARITY_V1: Przegląd wyników (Results Browser)
  if (route === '#results') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <ResultsInspectorPage />
      </PowerFactoryLayout>
    );
  }

  // Ślad obliczeń (Proof Inspector)
  if (route === '#proof') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps} hideInspector={true}>
        <ProofInspectorPage />
      </PowerFactoryLayout>
    );
  }

  // Protection Results Inspector
  if (route === '#protection-results') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <ProtectionResultsInspectorPage />
      </PowerFactoryLayout>
    );
  }

  // P20b: Power Flow Results Inspector
  if (route === '#power-flow-results') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <PowerFlowResultsInspectorPage />
      </PowerFactoryLayout>
    );
  }

  // Wzorce odniesienia (Reference Patterns)
  if (route === '#reference-patterns') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps} hideInspector={true}>
        <ReferencePatternsPage />
      </PowerFactoryLayout>
    );
  }

  // Kreator sieci (Wizard K1-K10)
  if (route === '#wizard') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <WizardPage />
      </PowerFactoryLayout>
    );
  }

  // Inspektor modelu ENM (v4.2 — diagnostyka inżynierska)
  if (route === '#enm-inspector') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <EnmInspectorPage />
      </PowerFactoryLayout>
    );
  }

  // SLD_READ_ONLY_UI: Podglad schematu jednokreskowego (tylko odczyt)
  if (route === '#sld-view') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <SLDViewPage useDemo={true} />
      </PowerFactoryLayout>
    );
  }

  // POWERFACTORY_LAYOUT: Default — SLD Editor Page (ALWAYS shows tools)
  // This replaces the old DesignerPage with proper PowerFactory-style layout
  return wrapWithReadyIndicator(
    <PowerFactoryLayout {...layoutProps}>
      <SldEditorPage useDemo={true} />
    </PowerFactoryLayout>
  );
}

export default App;
