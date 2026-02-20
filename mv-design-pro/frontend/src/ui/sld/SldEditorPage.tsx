/**
 * SLD Editor Page — PowerFactory/ETAP Style Main Editor View
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Layout narzędziowy ZAWSZE renderowany
 * - wizard_screens.md § 2.1: Główna struktura okna
 * - sld_rules.md: SLD ↔ selection synchronization
 *
 * POWERFACTORY/ETAP RULE:
 * > Layout narzędziowy ZAWSZE jest renderowany.
 * > Brak danych = komunikat w obszarze roboczym, a NIE brak UI.
 *
 * FEATURES:
 * - Full SLD editor with toolbar, canvas, grid
 * - Empty state overlay when no model (keeps tools visible)
 * - Integrates with PowerFactoryLayout
 * - Mode-aware (MODEL_EDIT, CASE_CONFIG, RESULT_VIEW)
 * - 100% Polish UI
 *
 * This is the DEFAULT view for the application.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { SLDView } from './SLDView';
import { SldEmptyOverlay, type SldEmptyState } from './SldEmptyOverlay';
import { useSldEditorStore } from '../sld-editor/SldEditorStore';
import { useSelectionStore } from '../selection/store';
import { useAppStateStore, useHasActiveCase, useActiveMode } from '../app-state';
import { SldInspectorPanel } from './inspector';
import { SldFixActionsPanel } from './SldFixActionsPanel';
import type { AnySldSymbol } from '../sld-editor/types';
import { useStudyCasesStore } from '../study-cases/store';
import { createProject } from '../projects/api';
import { notify } from '../notifications/store';
import { ReadinessLivePanel, DataGapPanel } from '../engineering-readiness';
import { useReadinessLiveStore } from '../engineering-readiness';
import { EngineeringInspector } from '../property-grid';
import { SldResultsAccess } from './SldResultsAccess';
import type { ElementResultsSummary } from './SldResultsAccess';
import { useResultsInspectorStore } from '../results-inspector/store';
import { OperationalModeToolbar } from './OperationalModeToolbar';
import { LabelModeToolbar } from './LabelModeToolbar';

/**
 * Demo symbols for development/testing.
 * In production, these come from the network model via SldEditorStore.
 */
const DEMO_SYMBOLS: AnySldSymbol[] = [
  {
    id: 'bus_main',
    elementId: 'bus_main',
    elementType: 'Bus',
    elementName: 'Szyna główna SN',
    position: { x: 400, y: 200 },
    inService: true,
    width: 100,
    height: 10,
  } as any,
  {
    id: 'bus_dist',
    elementId: 'bus_dist',
    elementType: 'Bus',
    elementName: 'Szyna dystrybucyjna',
    position: { x: 400, y: 350 },
    inService: true,
    width: 80,
    height: 8,
  } as any,
  {
    id: 'source_grid',
    elementId: 'source_grid',
    elementType: 'Source',
    elementName: 'Sieć zasilająca',
    position: { x: 400, y: 40 },
    inService: true,
    connectedToNodeId: 'bus_main',
  } as any,
  {
    id: 'trafo_1',
    elementId: 'trafo_1',
    elementType: 'TransformerBranch',
    elementName: 'TR1 110/15kV',
    position: { x: 400, y: 150 },
    inService: true,
    fromNodeId: 'bus_main',
    toNodeId: 'bus_dist',
    points: [],
  } as any,
  {
    id: 'line_1',
    elementId: 'line_1',
    elementType: 'LineBranch',
    elementName: 'Linia L1',
    position: { x: 300, y: 275 },
    inService: true,
    fromNodeId: 'bus_main',
    toNodeId: 'bus_dist',
    points: [],
  } as any,
  {
    id: 'line_2',
    elementId: 'line_2',
    elementType: 'LineBranch',
    elementName: 'Linia L2',
    position: { x: 500, y: 275 },
    inService: true,
    fromNodeId: 'bus_main',
    toNodeId: 'bus_dist',
    points: [],
  } as any,
  {
    id: 'sw_1',
    elementId: 'sw_1',
    elementType: 'Switch',
    elementName: 'Q1',
    position: { x: 300, y: 230 },
    inService: true,
    fromNodeId: 'bus_main',
    toNodeId: 'line_1',
    switchState: 'CLOSED',
    switchType: 'BREAKER',
  } as any,
  {
    id: 'sw_2',
    elementId: 'sw_2',
    elementType: 'Switch',
    elementName: 'Q2',
    position: { x: 500, y: 230 },
    inService: true,
    fromNodeId: 'bus_main',
    toNodeId: 'line_2',
    switchState: 'OPEN',
    switchType: 'BREAKER',
  } as any,
  {
    id: 'load_1',
    elementId: 'load_1',
    elementType: 'Load',
    elementName: 'Odbior O1',
    position: { x: 250, y: 420 },
    inService: true,
    connectedToNodeId: 'bus_dist',
  } as any,
  {
    id: 'load_2',
    elementId: 'load_2',
    elementType: 'Load',
    elementName: 'Odbior O2',
    position: { x: 400, y: 420 },
    inService: true,
    connectedToNodeId: 'bus_dist',
  } as any,
  {
    id: 'load_3',
    elementId: 'load_3',
    elementType: 'Load',
    elementName: 'Odbior O3',
    position: { x: 550, y: 420 },
    inService: false,
    connectedToNodeId: 'bus_dist',
  } as any,
];

/**
 * Props for SldEditorPage.
 */
export interface SldEditorPageProps {
  /** Use demo data (for development) */
  useDemo?: boolean;

  /** Force show empty overlay */
  forceEmptyState?: SldEmptyState;

  /** Open case manager callback */
  onOpenCaseManager?: () => void;
}

/**
 * SLD Editor Page component.
 * This is the main editing view for the network model.
 *
 * ALWAYS shows:
 * - Toolbar with tools
 * - Canvas with grid
 * - Zoom/pan controls
 *
 * Shows empty overlay when:
 * - No active case selected
 * - No model data loaded
 */
export const SldEditorPage: React.FC<SldEditorPageProps> = ({
  useDemo = false,
  forceEmptyState,
  onOpenCaseManager,
}) => {
  // Get symbols from store
  const storeSymbols = useSldEditorStore((state) => Array.from(state.symbols.values()));
  const setSymbols = useSldEditorStore((state) => state.setSymbols);

  // App state
  const hasActiveCase = useHasActiveCase();
  const activeMode = useActiveMode();
  const toggleCaseManager = useAppStateStore((state) => state.toggleCaseManager);
  const activeCaseId = useAppStateStore((state) => state.activeCaseId);
  const activeProjectId = useAppStateStore((state) => state.activeProjectId);
  const setActiveProject = useAppStateStore((state) => state.setActiveProject);
  const setActiveCase = useAppStateStore((state) => state.setActiveCase);
  const createCase = useStudyCasesStore((state) => state.createCase);

  // Selection state
  const selectedElement = useSelectionStore((state) => state.selectedElements[0] ?? null);

  // Selection store actions for navigation
  const selectElement = useSelectionStore((state) => state.selectElement);
  const centerSldOnElement = useSelectionStore((state) => state.centerSldOnElement);

  // Readiness live store — real data from API
  const readinessIssues = useReadinessLiveStore((state) => state.issues);
  const readinessStatus = useReadinessLiveStore((state) => state.status);
  const readinessLoading = useReadinessLiveStore((state) => state.loading);
  const readinessCollapsedGroups = useReadinessLiveStore((state) => state.collapsedGroups);
  const readinessToggleGroup = useReadinessLiveStore((state) => state.toggleGroup);
  const readinessRefresh = useReadinessLiveStore((state) => state.refresh);

  // Results inspector store — for SldResultsAccess
  const busResults = useResultsInspectorStore((state) => state.busResults);
  const branchResults = useResultsInspectorStore((state) => state.branchResults);
  const shortCircuitResults = useResultsInspectorStore((state) => state.shortCircuitResults);

  // Study cases — for hasCases wiring
  const studyCasesCount = useStudyCasesStore((state) => state.cases.length);

  // Inspector panel state
  const [inspectorPanelVisible, setInspectorPanelVisible] = useState(true);
  const [isCreatingFirstCase, setIsCreatingFirstCase] = useState(false);

  // UX 10/10: Results mode flag — true when RESULT_VIEW mode and results available
  const isResultsMode = activeMode === 'RESULT_VIEW';

  // Resolve element data from SLD editor store for EngineeringInspector
  const selectedSymbol = useSldEditorStore((state) =>
    selectedElement ? state.symbols.get(selectedElement.id) ?? null : null,
  );

  const elementData = useMemo<Record<string, unknown>>(() => {
    if (!selectedSymbol) return {};
    const data: Record<string, unknown> = {};
    // Extract all known fields from the symbol
    for (const [key, value] of Object.entries(selectedSymbol)) {
      if (key !== 'id' && key !== 'position' && value !== undefined) {
        data[key] = value;
      }
    }
    return data;
  }, [selectedSymbol]);

  // Resolve results summary for SldResultsAccess
  const resultsSummary = useMemo<ElementResultsSummary | null>(() => {
    if (!selectedElement || !isResultsMode) return null;
    const elId = selectedElement.id;
    const elType = selectedElement.type;

    // Look up bus results (BusResults.rows: BusResultRow[])
    if (busResults?.rows) {
      const busRow = busResults.rows.find((b) => b.bus_id === elId);
      if (busRow) {
        return {
          elementId: elId,
          elementType: elType,
          elementName: selectedElement.name ?? elId,
          hasLoadFlowResults: true,
          hasScResults: !!shortCircuitResults,
          voltageKv: busRow.u_kv ?? undefined,
          voltagePu: busRow.u_pu ?? undefined,
        };
      }
    }

    // Look up branch results (BranchResults.rows: BranchResultRow[])
    if (branchResults?.rows) {
      const brRow = branchResults.rows.find((b) => b.branch_id === elId);
      if (brRow) {
        return {
          elementId: elId,
          elementType: elType,
          elementName: selectedElement.name ?? elId,
          hasLoadFlowResults: true,
          hasScResults: !!shortCircuitResults,
          loadingPct: brRow.loading_pct ?? undefined,
          pKw: brRow.p_mw != null ? brRow.p_mw * 1000 : undefined,
          qKvar: brRow.q_mvar != null ? brRow.q_mvar * 1000 : undefined,
        };
      }
    }

    // Minimal summary when no results available
    return {
      elementId: elId,
      elementType: elType,
      elementName: selectedElement.name ?? elId,
      hasLoadFlowResults: false,
      hasScResults: false,
    };
  }, [selectedElement, isResultsMode, busResults, branchResults, shortCircuitResults]);

  const withTimeout = useCallback(async <T,>(promise: Promise<T>, timeoutMs = 15000): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        window.setTimeout(() => reject(new Error('TIMEOUT_API_CREATE_CASE')), timeoutMs);
      }),
    ]);
  }, []);

  // Determine symbols to display
  const symbols = useMemo(() => {
    if (storeSymbols.length > 0) {
      return storeSymbols;
    }
    // Use demo symbols if enabled and no model data
    return useDemo ? DEMO_SYMBOLS : [];
  }, [storeSymbols, useDemo]);

  // Load demo symbols into store on mount if demo mode
  useEffect(() => {
    if (useDemo && storeSymbols.length === 0) {
      setSymbols(DEMO_SYMBOLS);
    }
  }, [useDemo, storeSymbols.length, setSymbols]);

  // Refresh readiness data when active case changes
  useEffect(() => {
    if (activeCaseId) {
      readinessRefresh(activeCaseId);
    }
  }, [activeCaseId, readinessRefresh]);

  // Determine empty state
  const emptyState: SldEmptyState | null = useMemo(() => {
    if (forceEmptyState) {
      return forceEmptyState;
    }
    if (!hasActiveCase) {
      return 'NO_CASE';
    }
    if (symbols.length === 0 && !useDemo) {
      return 'NO_MODEL';
    }
    return null;
  }, [forceEmptyState, hasActiveCase, symbols.length, useDemo]);

  // Handle action from empty overlay
  const handleEmptyAction = useCallback(() => {
    if (onOpenCaseManager) {
      onOpenCaseManager();
    } else {
      toggleCaseManager(true);
    }
  }, [onOpenCaseManager, toggleCaseManager]);

  const handleCreateFirstCase = useCallback(async () => {
    if (isCreatingFirstCase) {
      return;
    }

    setIsCreatingFirstCase(true);
    try {
      let projectId = activeProjectId;
      if (!projectId) {
        const project = await withTimeout(createProject({ name: 'Projekt 1' }));
        projectId = project.id;
        setActiveProject(project.id, project.name);
      }

      if (!projectId) {
        notify('Nie można utworzyć przypadku: brak aktywnego projektu. Otwórz Menedżer przypadków i utwórz projekt.', 'warning');
        return;
      }

      const createdCase = await withTimeout(
        createCase({
          project_id: projectId,
          name: 'Przypadek 1',
          description: '',
          set_active: true,
        })
      );

      setActiveCase(createdCase.id, createdCase.name, 'ShortCircuitCase', createdCase.result_status);
      notify(`Utworzono i aktywowano przypadek: ${createdCase.name}.`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nieznany błąd';
      if (message === 'TIMEOUT_API_CREATE_CASE') {
        notify('Brak odpowiedzi API podczas tworzenia przypadku (limit 15 s). Sprawdź połączenie i spróbuj ponownie.', 'warning');
        return;
      }
      notify(`Nie udało się utworzyć przypadku. Szczegóły techniczne: ${message}`, 'error');
    } finally {
      setIsCreatingFirstCase(false);
    }
  }, [isCreatingFirstCase, activeProjectId, withTimeout, setActiveProject, createCase, setActiveCase]);

  // Handle inspector close
  const handleInspectorClose = useCallback(() => {
    setInspectorPanelVisible(false);
  }, []);

  // BLOK 8: Uruchom obliczenia — otwiera menedżer przypadków z widokiem obliczeniowym
  const handleCalculate = useCallback(() => {
    if (onOpenCaseManager) {
      onOpenCaseManager();
    } else {
      toggleCaseManager(true);
    }
    notify('Otwarto menedżer przypadków — wybierz przypadek i uruchom obliczenia.', 'info');
  }, [onOpenCaseManager, toggleCaseManager]);

  // BLOK 2: Nawigacja do elementu z panelu FixActions
  const handleGoToElement = useCallback((elementId: string) => {
    selectElement({ id: elementId, type: 'Bus', name: elementId });
    centerSldOnElement(elementId);
  }, [selectElement, centerSldOnElement]);

  // UX 10/10: ReadinessLivePanel callbacks
  const handleReadinessNavigate = useCallback((elementRef: string) => {
    selectElement({ id: elementRef, type: 'Bus', name: elementRef });
    centerSldOnElement(elementRef);
  }, [selectElement, centerSldOnElement]);

  const handleReadinessFixAction = useCallback((_fixAction: unknown, elementRef: string | null) => {
    if (elementRef) {
      selectElement({ id: elementRef, type: 'Bus', name: elementRef });
      centerSldOnElement(elementRef);
    }
    notify('Akcja naprawcza uruchomiona.', 'info');
  }, [selectElement, centerSldOnElement]);

  // UX 10/10: DataGapPanel callbacks
  const handleDataGapNavigate = useCallback((elementId: string) => {
    selectElement({ id: elementId, type: 'Bus', name: elementId });
    centerSldOnElement(elementId);
  }, [selectElement, centerSldOnElement]);

  const handleDataGapQuickFix = useCallback((elementId: string, fixAction: string) => {
    selectElement({ id: elementId, type: 'Bus', name: elementId });
    centerSldOnElement(elementId);
    notify(`Szybka naprawa: ${fixAction} dla ${elementId}`, 'info');
  }, [selectElement, centerSldOnElement]);

  // Show inspector when selection changes
  useEffect(() => {
    if (selectedElement) {
      setInspectorPanelVisible(true);
    }
  }, [selectedElement]);

  return (
    <div
      data-testid="sld-editor-page"
      className="h-full w-full flex relative"
    >
      {/* SLD View (main area) - ALWAYS rendered */}
      <div className="flex-1 min-w-0 relative">
        <SLDView
          symbols={symbols}
          selectedElement={selectedElement}
          showGrid={true}
          fitOnMount={symbols.length > 0}
          onCalculateClick={handleCalculate}
        />

        {/* Empty state overlay - rendered ON TOP of canvas */}
        {emptyState && (
          <SldEmptyOverlay
            state={emptyState}
            hasCases={studyCasesCount > 0}
            onSelectCase={handleEmptyAction}
            onCreateCase={handleCreateFirstCase}
            isCreatingCase={isCreatingFirstCase}
          />
        )}

        {/* BLOK 2: Panel naprawczy — floating bottom-left */}
        {activeCaseId && (
          <div className="absolute bottom-12 left-4 z-20">
            <SldFixActionsPanel
              caseId={activeCaseId}
              onGoToElement={handleGoToElement}
              defaultExpanded={false}
            />
          </div>
        )}

        {/* UX 10/10: ReadinessLivePanel + DataGapPanel — floating bottom-left, above FixActions */}
        {activeCaseId && (
          <div
            className="absolute bottom-28 left-4 z-20 flex flex-col gap-2"
            data-testid="sld-readiness-stack"
          >
            <ReadinessLivePanel
              issues={readinessIssues}
              status={readinessStatus}
              loading={readinessLoading}
              collapsedGroups={readinessCollapsedGroups}
              onToggleGroup={readinessToggleGroup}
              onNavigateToElement={handleReadinessNavigate}
              onFixAction={handleReadinessFixAction}
            />
            <DataGapPanel
              onNavigateToElement={handleDataGapNavigate}
              onQuickFix={handleDataGapQuickFix}
              compact
            />
          </div>
        )}

        {/* UX 10/10: OperationalModeToolbar + LabelModeToolbar — bottom-right corner */}
        <div
          className="absolute bottom-4 right-4 z-20 flex items-center gap-2"
          data-testid="sld-bottom-right-toolbars"
        >
          <LabelModeToolbar compact />
          <OperationalModeToolbar />
        </div>
      </div>

      {/* Inspector Panel (PR-SLD-07) - Only in read-only or when something selected */}
      {inspectorPanelVisible && selectedElement && activeMode !== 'MODEL_EDIT' && (
        <SldInspectorPanel
          onClose={handleInspectorClose}
        />
      )}

      {/* UX 10/10: EngineeringInspector — replaces SldInspectorPanel in MODEL_EDIT mode */}
      {inspectorPanelVisible && selectedElement && activeMode === 'MODEL_EDIT' && (
        <div data-testid="sld-engineering-inspector-wrapper" className="flex-shrink-0">
          <EngineeringInspector
            elementId={selectedElement.id}
            elementType={selectedElement.type}
            elementData={elementData}
            onFieldChange={(field, value) => {
              notify(`Zmieniono pole: ${field}`, 'info');
              console.debug('[SldEditorPage] Field change:', field, value);
            }}
            onChangeCatalogType={() => {
              notify('Otwarcie katalogu typów...', 'info');
            }}
            onRefreshFromCatalog={() => {
              notify('Odświeżanie z katalogu...', 'info');
            }}
            onNavigateToResults={() => {
              notify('Przejście do wyników elementu...', 'info');
            }}
            onEditProtection={() => {
              notify('Edycja zabezpieczeń elementu...', 'info');
            }}
          />
        </div>
      )}

      {/* UX 10/10: SldResultsAccess — floating right panel in results mode */}
      {isResultsMode && selectedElement && (
        <div data-testid="sld-results-access-wrapper" className="flex-shrink-0">
          <SldResultsAccess
            selectedElementId={selectedElement.id}
            resultsSummary={resultsSummary}
            onShowWhiteBox={(elId) => {
              notify(`Otwarcie śladu WhiteBox dla: ${elId}`, 'info');
            }}
            onShowFullResults={(elId) => {
              notify(`Pełne wyniki dla: ${elId}`, 'info');
            }}
            onExportResults={(elId, format) => {
              notify(`Eksport wyników (${format}) dla: ${elId}`, 'info');
            }}
            onShowProtectionCoverage={(elId) => {
              notify(`Pokrycie zabezpieczeniowe: ${elId}`, 'info');
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SldEditorPage;
