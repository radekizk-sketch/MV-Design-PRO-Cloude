/**
 * App Root — UI V3 FULL SYSTEM INTEGRATION
 *
 * CANONICAL ALIGNMENT:
 * - UI_V3_MASTER_AGENT_PROMPT.md: Full end-to-end system wiring
 * - powerfactory_ui_parity.md: Layout narzędziowy ZAWSZE renderowany
 * - wizard_screens.md § 1.3: Active case bar (always visible)
 * - UI_CORE_ARCHITECTURE.md § 4.1: Navigation structure
 *
 * POWERFACTORY/ETAP RULE:
 * > Layout narzędziowy ZAWSZE jest renderowany.
 * > Brak danych = komunikat w obszarze roboczym, a NIE brak UI.
 *
 * UI V3 WIRING:
 * - Project + Case auto-initialization on startup
 * - Snapshot loading from backend (single source of truth)
 * - Tree elements derived from ENM snapshot (not hardcoded)
 * - SLD symbols synced from snapshot (not demo)
 * - Calculate button triggers real solver execution
 * - Results navigation on completion
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

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

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
import { ROUTES, useUrlSelectionSync, getCurrentHashRoute } from './ui/navigation';
import { useSelectionStore } from './ui/selection';
import { NotificationToast } from './ui/notifications/NotificationToast';
import { useSnapshotStore } from './ui/topology/snapshotStore';
import { useSnapshotSldSync } from './ui/sld/useSnapshotSldSync';
import { listProjects, createProject } from './ui/projects/api';
import {
  listStudyCases,
  createStudyCase,
  setActiveStudyCase,
  createRun,
  executeRun,
  getRun,
} from './ui/study-cases/api';
import { notify } from './ui/notifications/store';
import type { TreeNode, TreeNodeType, ElementType } from './ui/types';
import type { EnergyNetworkModel } from './types/enm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get active project name from store. */
function useActiveProjectName(): string | null {
  const store = useAppStateStore();
  return (store as { activeProjectName?: string | null }).activeProjectName ?? null;
}

/** E2E_STABILIZATION: App ready indicator for tests. */
function useAppReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setReady(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  return ready;
}

/** Check if route is a results route (requires RESULT_VIEW mode). */
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

// ---------------------------------------------------------------------------
// UI V3: Derive tree elements from ENM snapshot (deterministic)
// ---------------------------------------------------------------------------

interface TreeElementSummary {
  id: string;
  name: string;
  element_type: string;
  voltage_kv?: number;
  in_service?: boolean;
  branch_type?: 'LINE' | 'CABLE';
}

interface TreeElements {
  buses: TreeElementSummary[];
  lines: TreeElementSummary[];
  cables: TreeElementSummary[];
  transformers: TreeElementSummary[];
  switches: TreeElementSummary[];
  sources: TreeElementSummary[];
  loads: TreeElementSummary[];
}

function snapshotToTreeElements(snapshot: EnergyNetworkModel | null): TreeElements {
  if (!snapshot) {
    return { buses: [], lines: [], cables: [], transformers: [], switches: [], sources: [], loads: [] };
  }

  const buses = (snapshot.buses ?? [])
    .map((b) => ({ id: b.ref_id, name: b.name, element_type: 'Bus', voltage_kv: b.voltage_kv }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const lines: TreeElementSummary[] = [];
  const cables: TreeElementSummary[] = [];
  const switches: TreeElementSummary[] = [];

  for (const br of (snapshot.branches ?? []).sort((a, b) => a.ref_id.localeCompare(b.ref_id))) {
    if (br.type === 'line_overhead') {
      lines.push({ id: br.ref_id, name: br.name, element_type: 'Line', branch_type: 'LINE' });
    } else if (br.type === 'cable') {
      cables.push({ id: br.ref_id, name: br.name, element_type: 'Cable', branch_type: 'CABLE' });
    } else if (br.type === 'switch' || br.type === 'breaker' || br.type === 'disconnector' || br.type === 'fuse' || br.type === 'bus_coupler') {
      switches.push({ id: br.ref_id, name: br.name, element_type: 'Switch' });
    }
  }

  const transformers = (snapshot.transformers ?? [])
    .map((t) => ({ id: t.ref_id, name: t.name, element_type: 'Transformer2W' }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const sources = (snapshot.sources ?? [])
    .map((s) => ({ id: s.ref_id, name: s.name, element_type: 'Source' }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const loads = (snapshot.loads ?? [])
    .map((l) => ({ id: l.ref_id, name: l.name, element_type: 'Load' }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return { buses, lines, cables, transformers, switches, sources, loads };
}

// ---------------------------------------------------------------------------
// UI V3: Project + Case initialization hook
// ---------------------------------------------------------------------------

function useProjectInit() {
  const setActiveProject = useAppStateStore((state) => state.setActiveProject);
  const setActiveCase = useAppStateStore((state) => state.setActiveCase);
  const activeProjectId = useAppStateStore((state) => state.activeProjectId);
  const activeCaseId = useAppStateStore((state) => state.activeCaseId);
  const refreshFromBackend = useSnapshotStore((state) => state.refreshFromBackend);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    (async () => {
      try {
        // 1. Ensure project exists
        let projectId = activeProjectId;
        if (!projectId) {
          const projects = await listProjects();
          if (projects.length > 0) {
            projectId = projects[0].id;
            setActiveProject(projects[0].id, projects[0].name);
          } else {
            const newProject = await createProject({ name: 'Nowy projekt' });
            projectId = newProject.id;
            setActiveProject(newProject.id, newProject.name);
          }
        }

        if (!projectId) return;

        // 2. Ensure study case exists
        let caseId = activeCaseId;
        if (!caseId) {
          const cases = await listStudyCases(projectId);
          if (cases.length > 0) {
            caseId = cases[0].id;
            setActiveCase(cases[0].id, cases[0].name, 'ShortCircuitCase', cases[0].result_status);
          } else {
            const newCase = await createStudyCase({
              project_id: projectId,
              name: 'Przypadek domyślny',
              set_active: true,
            });
            caseId = newCase.id;
            setActiveCase(newCase.id, newCase.name, 'ShortCircuitCase', newCase.result_status);
          }
        }

        if (!caseId) return;

        // 3. Activate case
        await setActiveStudyCase(projectId, caseId).catch(() => {
          // Already active or activation not supported — ignore
        });

        // 4. Load ENM snapshot
        await refreshFromBackend(caseId);
      } catch (err) {
        // Backend not available — graceful degradation
        if (import.meta.env.DEV) {
          console.debug('[useProjectInit] Backend unavailable:', err);
        }
      }
    })();
  }, [activeProjectId, activeCaseId, setActiveProject, setActiveCase, refreshFromBackend]);
}

// ---------------------------------------------------------------------------
// UI V3: Analysis execution (Calculate button)
// ---------------------------------------------------------------------------

function useCalculateHandler() {
  const activeCaseId = useAppStateStore((state) => state.activeCaseId);
  const setActiveRun = useAppStateStore((state) => state.setActiveRun);
  const setActiveCaseResultStatus = useAppStateStore((state) => state.setActiveCaseResultStatus);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = useCallback(async () => {
    if (!activeCaseId || isCalculating) {
      if (!activeCaseId) {
        notify('Brak aktywnego przypadku obliczeniowego. Utwórz przypadek w kreatorze.', 'warning');
      }
      return;
    }

    setIsCalculating(true);
    try {
      // 1. Check eligibility
      notify('Sprawdzanie gotowości do obliczeń...', 'info');
      const eligibilityRes = await fetch(`/api/cases/${activeCaseId}/analysis-eligibility`);
      if (eligibilityRes.ok) {
        const eligibility = await eligibilityRes.json();
        const scEntry = eligibility?.entries?.find(
          (e: { analysis_type: string }) => e.analysis_type === 'short_circuit_3f',
        );
        if (scEntry && !scEntry.eligible) {
          const blockerMsgs = (scEntry.blockers ?? [])
            .map((b: { message: string }) => b.message)
            .join('; ');
          notify(`Sieć nie jest gotowa do obliczeń: ${blockerMsgs || 'brak szczegółów'}`, 'warning');
          return;
        }
      }

      // 2. Create run
      notify('Tworzenie przebiegu obliczeniowego...', 'info');
      const run = await createRun(activeCaseId, {
        analysis_type: 'SC_3F',
      });

      // 3. Execute
      notify('Wykonywanie obliczeń zwarciowych (IEC 60909)...', 'info');
      await executeRun(run.id);

      // 4. Poll until complete (max 60s)
      let attempts = 0;
      let currentRun = await getRun(run.id);
      while (currentRun.status !== 'DONE' && currentRun.status !== 'FAILED' && attempts < 60) {
        await new Promise((r) => setTimeout(r, 1000));
        currentRun = await getRun(run.id);
        attempts++;
      }

      if (currentRun.status === 'DONE') {
        setActiveRun(run.id);
        setActiveCaseResultStatus('FRESH');
        notify('Obliczenia zakończone pomyślnie. Przejdź do wyników.', 'success');
        window.location.hash = '#results';
      } else if (currentRun.status === 'FAILED') {
        notify('Obliczenia zakończyły się błędem. Sprawdź model sieci.', 'error');
      } else {
        notify('Przekroczono limit czasu oczekiwania na wyniki.', 'warning');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (import.meta.env.DEV) {
        console.debug('[handleCalculate] Error:', message);
      }
      notify(`Błąd obliczeń: ${message}`, 'error');
    } finally {
      setIsCalculating(false);
    }
  }, [activeCaseId, isCalculating, setActiveRun, setActiveCaseResultStatus]);

  return { handleCalculate, isCalculating };
}

// ---------------------------------------------------------------------------
// App Component
// ---------------------------------------------------------------------------

function App() {
  // NAVIGATION_SELECTOR_UI: Use getCurrentHashRoute to strip query params from hash
  const [route, setRoute] = useState(() => getCurrentHashRoute());
  const setActiveMode = useAppStateStore((state) => state.setActiveMode);
  const appReady = useAppReady();
  const projectName = useActiveProjectName();
  const selectElement = useSelectionStore((state) => state.selectElement);
  const centerSldOnElement = useSelectionStore((state) => state.centerSldOnElement);
  const activeCaseId = useAppStateStore((state) => state.activeCaseId);

  // UI V3: Initialize project + case + load snapshot on startup
  useProjectInit();

  // UI V3: Sync snapshot → SLD symbols (replaces demo mode)
  useSnapshotSldSync();

  // UI V3: Derive tree elements from ENM snapshot
  const snapshot = useSnapshotStore((state) => state.snapshot);
  const treeElements = useMemo(() => snapshotToTreeElements(snapshot), [snapshot]);

  // UI V3: Calculate handler (real solver execution)
  const { handleCalculate } = useCalculateHandler();

  // NAVIGATION_SELECTOR_UI: Sync selection with URL (refresh preserves selection)
  useUrlSelectionSync();

  useEffect(() => {
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

  /** Navigate to Results (Przegląd wyników). */
  const handleViewResults = useCallback(() => {
    window.location.hash = ROUTES.RESULTS.hash;
  }, []);

  // Tree node click handler
  const handleTreeNodeClick = useCallback((node: TreeNode) => {
    if (node.nodeType === 'ELEMENT' && node.elementId && node.elementType) {
      selectElement({
        id: node.elementId,
        type: node.elementType as ElementType,
        name: node.label,
      });
      centerSldOnElement(node.elementId);
    }
  }, [selectElement, centerSldOnElement]);

  // Tree category click handler
  const handleTreeCategoryClick = useCallback((_nodeType: TreeNodeType, _elementType?: ElementType) => {
    if (import.meta.env.DEV) {
      console.debug('[handleTreeCategoryClick] Category click - filter not yet implemented');
    }
  }, []);

  // Tree run click handler
  const handleTreeRunClick = useCallback((runId: string) => {
    window.location.hash = `#results?run=${runId}`;
  }, []);

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

  // PR-22: Unified Results Workspace (Run / Batch / Compare / Overlay)
  if (route === '#results-workspace') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps} hideInspector={true}>
        <ResultsWorkspacePage />
      </PowerFactoryLayout>
    );
  }

  // Przegląd wyników (Results Browser)
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

  // Power Flow Results Inspector
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

  // Inspektor modelu ENM
  if (route === '#enm-inspector') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <EnmInspectorPage />
      </PowerFactoryLayout>
    );
  }

  // Scenariusze zwarciowe (Fault Scenarios)
  if (route === '#fault-scenarios') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <div className="flex flex-col h-full">
          <FaultScenariosPanel studyCaseId={activeCaseId} />
          <FaultScenarioModal />
        </div>
      </PowerFactoryLayout>
    );
  }

  // Podglad schematu jednokreskowego (tylko odczyt)
  if (route === '#sld-view') {
    return wrapWithReadyIndicator(
      <PowerFactoryLayout {...layoutProps}>
        <SLDViewPage />
      </PowerFactoryLayout>
    );
  }

  // Default — SLD Editor Page (ALWAYS shows tools)
  // UI V3: useDemo removed — SLD fed from snapshot via useSnapshotSldSync
  return wrapWithReadyIndicator(
    <PowerFactoryLayout {...layoutProps}>
      <SldEditorPage />
    </PowerFactoryLayout>
  );
}

export default App;
