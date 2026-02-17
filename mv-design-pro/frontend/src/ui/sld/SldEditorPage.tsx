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

  // Inspector panel state
  const [inspectorPanelVisible, setInspectorPanelVisible] = useState(true);
  const [isCreatingFirstCase, setIsCreatingFirstCase] = useState(false);

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
    notify(`Przejście do elementu: ${elementId}`, 'info');
  }, []);

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
            hasCases={false}  // TODO: Pass actual case count when available
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
      </div>

      {/* Inspector Panel (PR-SLD-07) - Only in read-only or when something selected */}
      {inspectorPanelVisible && selectedElement && activeMode !== 'MODEL_EDIT' && (
        <SldInspectorPanel
          onClose={handleInspectorClose}
        />
      )}
    </div>
  );
};

export default SldEditorPage;
