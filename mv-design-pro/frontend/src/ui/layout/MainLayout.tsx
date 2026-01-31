/**
 * Main Layout — P12a Data Manager Parity + PROJECT_TREE_PARITY_V1
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 2.1: Main window structure
 * - wizard_screens.md § 1.3: Active case bar (always visible)
 * - powerfactory_ui_parity.md § A: Project Tree jako główna nawigacja
 *
 * Layout with:
 * - Active Case Bar (top, always visible)
 * - Project Tree (left sidebar, optional)
 * - Main content area
 * - Issue Panel (right sidebar)
 * - Case Manager panel (slide-in)
 */

import { type ReactNode, useCallback, useState } from 'react';
import { clsx } from 'clsx';
import { ActiveCaseBar } from '../active-case-bar';
import { CaseManager } from '../case-manager';
import { IssuePanelContainer } from '../issue-panel';
import { ProjectTree } from '../project-tree/ProjectTree';
import { useAppStateStore, useCaseManagerOpen, useIssuePanelOpen, useActiveCaseId } from '../app-state';
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

interface MainLayoutProps {
  children: ReactNode;
  onCalculate?: () => void;
  onViewResults?: () => void;
  showCaseBar?: boolean;

  // PROJECT_TREE_PARITY_V1: Project Tree sidebar props
  showProjectTree?: boolean;
  projectName?: string;
  treeElements?: {
    buses: NetworkElement[];
    lines: NetworkElement[];
    cables: NetworkElement[];
    transformers: NetworkElement[];
    switches: NetworkElement[];
    sources: NetworkElement[];
    loads: NetworkElement[];
  };
  typeCounts?: {
    lineTypes: number;
    cableTypes: number;
    transformerTypes: number;
    switchEquipmentTypes: number;
  };
  studyCases?: StudyCaseItem[];
  runHistory?: RunHistoryItem[];
  onTreeNodeClick?: (node: TreeNode) => void;
  onTreeCategoryClick?: (nodeType: TreeNodeType, elementType?: ElementType) => void;
  onTreeStudyCaseClick?: (caseId: string) => void;
  onTreeStudyCaseActivate?: (caseId: string) => void;
  onTreeRunClick?: (runId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function MainLayout({
  children,
  onCalculate,
  onViewResults,
  showCaseBar = true,
  // PROJECT_TREE_PARITY_V1: Project Tree props with defaults
  showProjectTree = false,
  projectName = 'Nowy projekt',
  treeElements = {
    buses: [],
    lines: [],
    cables: [],
    transformers: [],
    switches: [],
    sources: [],
    loads: [],
  },
  typeCounts = { lineTypes: 0, cableTypes: 0, transformerTypes: 0, switchEquipmentTypes: 0 },
  studyCases = [],
  runHistory = [],
  onTreeNodeClick,
  onTreeCategoryClick,
  onTreeStudyCaseClick,
  onTreeStudyCaseActivate,
  onTreeRunClick,
}: MainLayoutProps) {
  const caseManagerOpen = useCaseManagerOpen();
  const issuePanelOpen = useIssuePanelOpen();
  const activeCaseId = useActiveCaseId();
  const toggleCaseManager = useAppStateStore((state) => state.toggleCaseManager);
  const toggleIssuePanel = useAppStateStore((state) => state.toggleIssuePanel);
  const setActiveMode = useAppStateStore((state) => state.setActiveMode);

  // PROJECT_TREE_PARITY_V1: Collapsible sidebar state
  const [treeSidebarCollapsed, setTreeSidebarCollapsed] = useState(false);

  const toggleTreeSidebar = useCallback(() => {
    setTreeSidebarCollapsed((prev) => !prev);
  }, []);

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

  // Note: toggleIssuePanel is available if needed for future Issue Panel button in UI
  void toggleIssuePanel; // Mark as intentionally available for future use

  return (
    <div className="flex flex-col h-screen bg-gray-100" data-testid="main-layout">
      {/* Active Case Bar (always visible) */}
      {showCaseBar && (
        <ActiveCaseBar
          onChangeCaseClick={handleChangeCaseClick}
          onConfigureClick={handleConfigureClick}
          onCalculateClick={handleCalculateClick}
          onResultsClick={handleResultsClick}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* PROJECT_TREE_PARITY_V1: Project Tree Sidebar (left) */}
        {showProjectTree && (
          <div
            className={clsx(
              'flex-shrink-0 border-r border-gray-200 bg-white transition-all duration-300 ease-in-out overflow-hidden',
              treeSidebarCollapsed ? 'w-12' : 'w-72'
            )}
            data-testid="project-tree-sidebar"
            data-collapsed={treeSidebarCollapsed}
          >
            {/* Sidebar header with toggle */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-2">
              {!treeSidebarCollapsed && (
                <span className="text-xs font-medium text-gray-700">Nawigacja</span>
              )}
              <button
                type="button"
                onClick={toggleTreeSidebar}
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700',
                  treeSidebarCollapsed && 'mx-auto'
                )}
                aria-label={treeSidebarCollapsed ? 'Rozwiń panel nawigacji' : 'Zwiń panel nawigacji'}
                data-testid="project-tree-sidebar-toggle"
              >
                {treeSidebarCollapsed ? '→' : '←'}
              </button>
            </div>

            {/* ProjectTree (only when not collapsed) */}
            {!treeSidebarCollapsed && (
              <div className="h-[calc(100%-40px)] overflow-hidden">
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

            {/* Collapsed state icon */}
            {treeSidebarCollapsed && (
              <div className="flex flex-col items-center gap-2 p-2" data-testid="project-tree-collapsed-icon">
                <button
                  type="button"
                  onClick={toggleTreeSidebar}
                  className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  title="Drzewo projektu"
                  aria-label="Otwórz drzewo projektu"
                >
                  📁
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto" data-testid="main-content">{children}</div>

        {/* P30d: Issue Panel (right sidebar) */}
        {issuePanelOpen && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-hidden">
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

export default MainLayout;
