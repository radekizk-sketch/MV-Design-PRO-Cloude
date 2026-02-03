/**
 * PowerFactory Layout — DIgSILENT PowerFactory/ETAP Style Persistent Layout
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Layout narzędziowy ZAWSZE renderowany
 * - wizard_screens.md § 2.1: Struktura głównego okna
 *
 * POWERFACTORY/ETAP RULE:
 * > Layout narzędziowy ZAWSZE jest renderowany.
 * > Brak danych = komunikat w obszarze roboczym, a NIE brak UI.
 *
 * STRUCTURE (ALWAYS VISIBLE):
 * ┌──────────────────────────────────────────────────────────────────┐
 * │                    Active Case Bar (top)                         │
 * ├──────────┬───────────────────────────────────┬──────────────────┤
 * │          │                                   │                  │
 * │ Project  │       SLD Canvas / Content        │    Inspector     │
 * │  Tree    │       (with empty overlay         │    Panel         │
 * │ (left)   │        if no model)               │    (right)       │
 * │          │                                   │                  │
 * ├──────────┴───────────────────────────────────┴──────────────────┤
 * │                    Status Bar (bottom)                           │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * INVARIANTS:
 * - Project Tree: ZAWSZE widoczny (może być zwinięty, ale NIE ukryty)
 * - SLD Canvas: ZAWSZE widoczny (z overlayem jeśli brak modelu)
 * - Inspector: ZAWSZE widoczny (pokazuje "Brak zaznaczenia" jeśli nic nie wybrano)
 * - Status Bar: ZAWSZE widoczny na dole
 * - Brak "pustych ekranów" — UI ZAWSZE wygląda jak pełnoprawne narzędzie
 *
 * 100% POLISH UI
 */

import { type ReactNode, useCallback, useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { ActiveCaseBar } from '../active-case-bar';
import { StatusBar } from '../status-bar';
import { CaseManager } from '../case-manager';
import { IssuePanelContainer } from '../issue-panel';
import { ProjectTree } from '../project-tree/ProjectTree';
import { EmptyInspectorPanel } from '../inspector-panel/EmptyInspectorPanel';
import {
  useAppStateStore,
  useCaseManagerOpen,
  useIssuePanelOpen,
  useActiveCaseId,
  useActiveMode,
} from '../app-state';
import { useSelectionStore } from '../selection';
import type { TreeNode, TreeNodeType, ElementType } from '../types';

// =============================================================================
// Types
// =============================================================================

interface NetworkElement {
  id: string;
  name: string;
  element_type: string;
  in_service?: boolean;
  branch_type?: 'LINE' | 'CABLE';
}

interface StudyCaseItem {
  id: string;
  name: string;
  result_status: 'NONE' | 'FRESH' | 'OUTDATED';
  is_active: boolean;
}

interface RunHistoryItem {
  run_id: string;
  case_id: string;
  case_name: string;
  snapshot_id: string | null;
  created_at: string;
  status: string;
  result_state: 'NONE' | 'FRESH' | 'OUTDATED';
  solver_kind: string;
  input_hash: string;
}

export interface PowerFactoryLayoutProps {
  /**
   * Main content to render (typically SLD or results page).
   */
  children: ReactNode;

  /**
   * Callback for calculate action.
   */
  onCalculate?: () => void;

  /**
   * Callback for view results action.
   */
  onViewResults?: () => void;

  /**
   * Project name to display in tree.
   */
  projectName?: string;

  /**
   * Network elements for the project tree.
   */
  treeElements?: {
    buses: NetworkElement[];
    lines: NetworkElement[];
    cables: NetworkElement[];
    transformers: NetworkElement[];
    switches: NetworkElement[];
    sources: NetworkElement[];
    loads: NetworkElement[];
  };

  /**
   * Type counts for catalog section.
   */
  typeCounts?: {
    lineTypes: number;
    cableTypes: number;
    transformerTypes: number;
    switchEquipmentTypes: number;
  };

  /**
   * Study cases list.
   */
  studyCases?: StudyCaseItem[];

  /**
   * Run history items.
   */
  runHistory?: RunHistoryItem[];

  /**
   * Callback when tree node is clicked.
   */
  onTreeNodeClick?: (node: TreeNode) => void;

  /**
   * Callback when tree category is clicked.
   */
  onTreeCategoryClick?: (nodeType: TreeNodeType, elementType?: ElementType) => void;

  /**
   * Callback when study case is clicked.
   */
  onTreeStudyCaseClick?: (caseId: string) => void;

  /**
   * Callback when study case is activated.
   */
  onTreeStudyCaseActivate?: (caseId: string) => void;

  /**
   * Callback when run is clicked.
   */
  onTreeRunClick?: (runId: string) => void;

  /**
   * Custom inspector content (optional).
   * If not provided, shows EmptyInspectorPanel.
   */
  inspectorContent?: ReactNode;

  /**
   * Validation status for status bar.
   */
  validationStatus?: 'valid' | 'warnings' | 'errors' | null;

  /**
   * Number of validation warnings.
   */
  validationWarnings?: number;

  /**
   * Number of validation errors.
   */
  validationErrors?: number;

  /**
   * Hide inspector panel (only in specific scenarios).
   */
  hideInspector?: boolean;
}

// =============================================================================
// Default Props
// =============================================================================

const DEFAULT_TREE_ELEMENTS = {
  buses: [],
  lines: [],
  cables: [],
  transformers: [],
  switches: [],
  sources: [],
  loads: [],
};

const DEFAULT_TYPE_COUNTS = {
  lineTypes: 0,
  cableTypes: 0,
  transformerTypes: 0,
  switchEquipmentTypes: 0,
};

// =============================================================================
// Component
// =============================================================================

export function PowerFactoryLayout({
  children,
  onCalculate,
  onViewResults,
  projectName = 'Nowy projekt',
  treeElements = DEFAULT_TREE_ELEMENTS,
  typeCounts = DEFAULT_TYPE_COUNTS,
  studyCases = [],
  runHistory = [],
  onTreeNodeClick,
  onTreeCategoryClick,
  onTreeStudyCaseClick,
  onTreeStudyCaseActivate,
  onTreeRunClick,
  inspectorContent,
  validationStatus,
  validationWarnings = 0,
  validationErrors = 0,
  hideInspector = false,
}: PowerFactoryLayoutProps) {
  // App state
  const caseManagerOpen = useCaseManagerOpen();
  const issuePanelOpen = useIssuePanelOpen();
  const activeCaseId = useActiveCaseId();
  const activeMode = useActiveMode();
  const toggleCaseManager = useAppStateStore((state) => state.toggleCaseManager);
  const setActiveMode = useAppStateStore((state) => state.setActiveMode);

  // Selection state
  const selectedElement = useSelectionStore((state) => state.selectedElements[0] ?? null);

  // Panel states
  const [treeSidebarCollapsed, setTreeSidebarCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  // Derived state
  const isReadOnly = activeMode === 'RESULT_VIEW';

  // Toggle handlers
  const toggleTreeSidebar = useCallback(() => {
    setTreeSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleInspector = useCallback(() => {
    setInspectorCollapsed((prev) => !prev);
  }, []);

  // Action handlers
  const handleChangeCaseClick = useCallback(() => {
    toggleCaseManager(true);
  }, [toggleCaseManager]);

  const handleConfigureClick = useCallback(() => {
    setActiveMode('CASE_CONFIG');
    toggleCaseManager(true);
  }, [setActiveMode, toggleCaseManager]);

  const handleCalculateClick = useCallback(() => {
    if (onCalculate) {
      onCalculate();
    }
  }, [onCalculate]);

  const handleResultsClick = useCallback(() => {
    setActiveMode('RESULT_VIEW');
    if (onViewResults) {
      onViewResults();
    }
  }, [setActiveMode, onViewResults]);

  const handleCaseManagerClose = useCallback(() => {
    toggleCaseManager(false);
  }, [toggleCaseManager]);

  // Inspector content - show custom content, selection-based, or empty state
  const resolvedInspectorContent = useMemo(() => {
    if (inspectorContent) {
      return inspectorContent;
    }
    return (
      <EmptyInspectorPanel
        selectedElement={selectedElement}
        isReadOnly={isReadOnly}
      />
    );
  }, [inspectorContent, selectedElement, isReadOnly]);

  return (
    <div
      className="flex flex-col h-screen bg-gray-100"
      data-testid="powerfactory-layout"
    >
      {/* Active Case Bar (ALWAYS visible at top) */}
      <ActiveCaseBar
        onChangeCaseClick={handleChangeCaseClick}
        onConfigureClick={handleConfigureClick}
        onCalculateClick={handleCalculateClick}
        onResultsClick={handleResultsClick}
      />

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* Project Tree Sidebar (ALWAYS visible, collapsible) */}
        <div
          className={clsx(
            'flex-shrink-0 border-r border-gray-200 bg-white transition-all duration-300 ease-in-out overflow-hidden flex flex-col',
            treeSidebarCollapsed ? 'w-12' : 'w-72'
          )}
          data-testid="project-tree-sidebar"
          data-collapsed={treeSidebarCollapsed}
        >
          {/* Sidebar header with toggle */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-2 flex-shrink-0">
            {!treeSidebarCollapsed && (
              <span className="text-xs font-medium text-gray-700">Nawigator projektu</span>
            )}
            <button
              type="button"
              onClick={toggleTreeSidebar}
              className={clsx(
                'flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700',
                treeSidebarCollapsed && 'mx-auto'
              )}
              aria-label={treeSidebarCollapsed ? 'Rozwiń panel nawigacji' : 'Zwiń panel nawigacji'}
              title={treeSidebarCollapsed ? 'Rozwiń panel nawigacji' : 'Zwiń panel nawigacji'}
              data-testid="project-tree-sidebar-toggle"
            >
              {treeSidebarCollapsed ? '→' : '←'}
            </button>
          </div>

          {/* ProjectTree (only when not collapsed) */}
          {!treeSidebarCollapsed && (
            <div className="flex-1 overflow-hidden">
              <ProjectTree
                projectName={projectName}
                elements={treeElements}
                typeCounts={typeCounts}
                studyCases={studyCases}
                runHistory={runHistory}
                onNodeClick={onTreeNodeClick}
                onCategoryClick={onTreeCategoryClick}
                onStudyCaseClick={onTreeStudyCaseClick}
                onStudyCaseActivate={onTreeStudyCaseActivate}
                onRunClick={onTreeRunClick}
              />
            </div>
          )}

          {/* Collapsed state icons */}
          {treeSidebarCollapsed && (
            <div className="flex flex-col items-center gap-2 p-2" data-testid="project-tree-collapsed-icons">
              <button
                type="button"
                onClick={toggleTreeSidebar}
                className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                title="Drzewo projektu"
                aria-label="Otwórz drzewo projektu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Main Content (SLD Canvas / Page Content) */}
        <div className="flex-1 overflow-auto" data-testid="main-content">
          {children}
        </div>

        {/* Inspector Panel (ALWAYS visible, collapsible) */}
        {!hideInspector && (
          <div
            className={clsx(
              'flex-shrink-0 border-l border-gray-200 bg-white transition-all duration-300 ease-in-out overflow-hidden flex flex-col',
              inspectorCollapsed ? 'w-10' : 'w-80'
            )}
            data-testid="inspector-panel-sidebar"
            data-collapsed={inspectorCollapsed}
          >
            {/* Inspector header with toggle */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-2 flex-shrink-0">
              {!inspectorCollapsed && (
                <span className="text-xs font-medium text-gray-700">Właściwości</span>
              )}
              <button
                type="button"
                onClick={toggleInspector}
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700',
                  inspectorCollapsed && 'mx-auto'
                )}
                aria-label={inspectorCollapsed ? 'Rozwiń panel właściwości' : 'Zwiń panel właściwości'}
                title={inspectorCollapsed ? 'Rozwiń panel właściwości' : 'Zwiń panel właściwości'}
                data-testid="inspector-panel-toggle"
              >
                {inspectorCollapsed ? '←' : '→'}
              </button>
            </div>

            {/* Inspector content (only when not collapsed) */}
            {!inspectorCollapsed && (
              <div className="flex-1 overflow-auto">
                {resolvedInspectorContent}
              </div>
            )}

            {/* Collapsed state icon */}
            {inspectorCollapsed && (
              <div className="flex flex-col items-center gap-2 p-2" data-testid="inspector-collapsed-icon">
                <button
                  type="button"
                  onClick={toggleInspector}
                  className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  title="Panel właściwości"
                  aria-label="Otwórz panel właściwości"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Issue Panel (right sidebar, conditional) */}
        {issuePanelOpen && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-hidden flex-shrink-0">
            <IssuePanelContainer caseId={activeCaseId} />
          </div>
        )}

        {/* Case Manager Panel (slide-in from right) */}
        <CaseManagerPanel
          open={caseManagerOpen}
          onClose={handleCaseManagerClose}
          onCalculate={onCalculate}
          onViewResults={onViewResults}
        />
      </div>

      {/* Status Bar (ALWAYS visible at bottom) */}
      <StatusBar
        validationStatus={validationStatus}
        validationWarnings={validationWarnings}
        validationErrors={validationErrors}
      />
    </div>
  );
}

// =============================================================================
// Case Manager Panel Sub-component
// =============================================================================

interface CaseManagerPanelProps {
  open: boolean;
  onClose: () => void;
  onCalculate?: () => void;
  onViewResults?: () => void;
}

function CaseManagerPanel({
  open,
  onClose,
  onCalculate,
  onViewResults,
}: CaseManagerPanelProps) {
  const handleCaseSelected = useCallback(
    (_caseId: string) => {
      // Case selection is handled in CaseManager
    },
    []
  );

  const handleCalculate = useCallback(
    (_caseId: string) => {
      onClose();
      if (onCalculate) {
        onCalculate();
      }
    },
    [onClose, onCalculate]
  );

  const handleViewResults = useCallback(
    (_caseId: string) => {
      onClose();
      if (onViewResults) {
        onViewResults();
      }
    },
    [onClose, onViewResults]
  );

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          data-testid="case-manager-backdrop"
          className="absolute inset-0 bg-black/20 z-20"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        data-testid="case-manager-panel"
        data-open={open}
        className={clsx(
          'absolute top-0 right-0 h-full w-[480px] bg-white shadow-xl z-30',
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {open && (
          <CaseManager
            onClose={onClose}
            onCaseSelected={handleCaseSelected}
            onCalculate={handleCalculate}
            onViewResults={handleViewResults}
          />
        )}
      </div>
    </>
  );
}

export default PowerFactoryLayout;
