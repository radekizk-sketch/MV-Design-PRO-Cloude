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
 * - "#catalog" → Biblioteka typów (Type Library Browser)
 * - "#case-config" → Konfiguracja przypadku obliczeniowego
 */

import { useEffect, useState, useCallback, useMemo } from 'react';

import { ProofInspectorPage } from './proof-inspector';
import { ProtectionResultsInspectorPage } from './ui/protection-results';
import { PowerFlowResultsInspectorPage } from './ui/power-flow-results';
import { ReferencePatternsPage } from './ui/reference-patterns';
import { ResultsInspectorPage } from './ui/results-inspector';
import { ResultsWorkspacePage } from './ui/results-workspace';
import { SLDViewPage, SldEditorPage } from './ui/sld';
import { WizardPage } from './ui/wizard';
import { EnmInspectorPage } from './ui/enm-inspector';
import { FaultScenariosPanel, FaultScenarioModal } from './ui/fault-scenarios';
import { PowerFactoryLayout } from './ui/layout';
import { useAppStateStore } from './ui/app-state';
import { useSnapshotStore } from './ui/topology/snapshotStore';
import { useExecutionRunsStore } from './ui/study-cases/runStore';
import type { ExecutionAnalysisType } from './ui/study-cases/types';
import { ROUTES, useUrlSelectionSync, getCurrentHashRoute } from './ui/navigation';
import { useSelectionStore } from './ui/selection';
import { NotificationToast } from './ui/notifications/NotificationToast';
import { notify } from './ui/notifications/store';
import type { TreeNode, TreeNodeType, ElementType } from './ui/types';
import { TypeLibraryBrowser } from './ui/catalog';
import { PowerDistributionPage } from './ui/power-distribution';
import { CaseConfigPage } from './ui/study-cases/CaseConfigPage';
import { ProtectionSettingsPage } from './ui/protection-engine-v1/ProtectionSettingsPage';
import { InspectorResolver } from './ui/inspector-panel';
import { useNetworkTreeElements, useNetworkStats } from './ui/topology/useNetworkTreeElements';

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

function mapAnalysisTypeToExecutionType(
  analysisType: ReturnType<typeof useAppStateStore.getState>['activeAnalysisType'],
): ExecutionAnalysisType {
  switch (analysisType) {
    case 'LOAD_FLOW':
      return 'LOAD_FLOW';
    case 'SHORT_CIRCUIT':
    case 'PROTECTION':
    default:
      return 'SC_3F';
  }
}

function isResultsRoute(route: string): boolean {
  return (
    route === '#results' ||
    route === '#results-workspace' ||
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
  const activeCaseId = useAppStateStore((state) => state.activeCaseId);
  const activeAnalysisType = useAppStateStore((state) => state.activeAnalysisType);
  const setActiveRun = useAppStateStore((state) => state.setActiveRun);
  const readiness = useSnapshotStore((state) => state.readiness);
  const createAndExecuteRun = useExecutionRunsStore((state) => state.createAndExecuteRun);
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

  const handleCalculate = useCallback(async () => {
    if (!activeCaseId) {
      notify('Brak aktywnego przypadku obliczeniowego.', 'error');
      return;
    }

    if (readiness && !readiness.ready) {
      const firstBlocker = readiness.blockers?.[0];
      notify(firstBlocker?.message_pl ?? 'Model nie jest gotowy do analizy.', 'warning');
      return;
    }

    try {
      const analysisType = mapAnalysisTypeToExecutionType(activeAnalysisType);
      const run = await createAndExecuteRun(activeCaseId, { analysis_type: analysisType });
      setActiveRun(run.id);
      notify('Uruchomiono obliczenia. Przejdź do widoku wyników po zakończeniu.', 'success');
      window.location.hash = ROUTES.RESULTS.hash;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Błąd uruchomienia obliczeń';
      notify(message, 'error');
    }
  }, [activeAnalysisType, activeCaseId, createAndExecuteRun, readiness, setActiveRun]);

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

  // Network tree elements derived from ENM snapshot (replaces mock data)
  const treeElements = useNetworkTreeElements();
  const networkStats = useNetworkStats();

  // E2E_STABILIZATION: Wrapper with app-ready indicator
  const wrapWithReadyIndicator = (content: React.ReactNode) => (
    <div data-testid="app-root" data-ready={appReady}>
      {appReady && <div data-testid="app-ready" style={{ display: 'none' }} />}
      <NotificationToast />
      {content}
    </div>
  );

  // Derive validation status from readiness
  const validationStatus = useMemo(() => {
    if (!readiness) return undefined;
    const blockerCount = readiness.blockers?.length ?? 0;
    const warningCount = readiness.warnings?.length ?? 0;
    if (blockerCount > 0) return 'errors' as const;
    if (warningCount > 0) return 'warnings' as const;
    return 'valid' as const;
  }, [readiness]);

  // Menu action handler — routes navigation from MainMenuBar
  const handleMenuAction = useCallback((actionId: string) => {
    switch (actionId) {
      case 'sld':
        window.location.hash = '';
        break;
      case 'wizard':
        window.location.hash = '#wizard';
        break;
      case 'catalog':
        window.location.hash = '#catalog';
        break;
      case 'results':
        window.location.hash = '#results';
        break;
      case 'proof':
      case 'whitebox':
        window.location.hash = '#proof';
        break;
      case 'protection':
        window.location.hash = '#protection-settings';
        break;
      case 'case-manager':
        useAppStateStore.getState().toggleCaseManager(true);
        break;
      case 'run-sc-3f':
      case 'run-sc-1f':
      case 'run-power-flow':
        handleCalculate();
        break;
      case 'navigator':
      case 'inspector':
        // Toggle panels — handled by layout
        break;
      default:
        if (import.meta.env.DEV) {
          console.debug(`[handleMenuAction] Unhandled action: ${actionId}`);
        }
    }
  }, [handleCalculate]);

  // Common layout props for PowerFactoryLayout
  const layoutProps = {
    onCalculate: handleCalculate,
    onViewResults: handleViewResults,
    projectName: projectName ?? 'Nowy projekt',
    treeElements: treeElements,
    onTreeNodeClick: handleTreeNodeClick,
    onTreeCategoryClick: handleTreeCategoryClick,
    onTreeRunClick: handleTreeRunClick,
    inspectorContent: <InspectorResolver />,
    validationStatus: validationStatus,
    validationWarnings: readiness?.warnings?.length ?? 0,
    validationErrors: readiness?.blockers?.length ?? 0,
    onMenuAction: handleMenuAction,
    networkStats: networkStats,
  };

  // PR-22: Unified Results Workspace (Run / Batch / Compare / Overlay)
  if (route === '#results-workspace') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps} hideInspector={true}>
        <ResultsWorkspacePage />
      </PowerFactoryLayout>
    );
  }

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

  // PR-24: Scenariusze zwarciowe (Fault Scenarios)
  if (route === '#fault-scenarios') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <div className="flex flex-col h-full">
          <FaultScenariosPanel studyCaseId={null} />
          <FaultScenarioModal />
        </div>
      </PowerFactoryLayout>
    );
  }

  // Biblioteka typow (Catalog / Type Library Browser)
  if (route === '#catalog') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps} hideInspector={true}>
        <TypeLibraryBrowser />
      </PowerFactoryLayout>
    );
  }

  // Konfiguracja przypadku obliczeniowego
  if (route === '#case-config') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <CaseConfigPage />
      </PowerFactoryLayout>
    );
  }

  // Nastawy zabezpieczen
  if (route === '#protection-settings') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <ProtectionSettingsPage />
      </PowerFactoryLayout>
    );
  }

  // Architektura rozdzialu mocy (Power Distribution Architecture)
  if (route === '#power-distribution') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <PowerDistributionPage />
      </PowerFactoryLayout>
    );
  }

  // SLD_READ_ONLY_UI: Podglad schematu jednokreskowego (tylko odczyt)
  if (route === '#sld-view') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <SLDViewPage useDemo={false} />
      </PowerFactoryLayout>
    );
  }
  // POWERFACTORY_LAYOUT: Default — SLD Editor Page (ALWAYS shows tools)
  // This replaces the old DesignerPage with proper PowerFactory-style layout
  return wrapWithReadyIndicator(
    <PowerFactoryLayout {...layoutProps}>
      <SldEditorPage useDemo={false} />
    </PowerFactoryLayout>
  );
}

export default App;
