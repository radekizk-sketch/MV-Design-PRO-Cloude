/**
 * Sidebar Layout — PROJECT_TREE_PARITY_V1
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md § A: Project Tree jako główna nawigacja
 * - wizard_screens.md § 2.1: Main window structure
 *
 * Layout z:
 * - Project Tree (lewy sidebar, read-only)
 * - Main content area (center)
 * - Optional Inspector panel (right)
 *
 * FEATURES:
 * - Collapsible sidebar
 * - Tree navigation
 * - Selection sync with URL
 *
 * 100% POLISH UI
 */

import { useState, useCallback, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { ProjectTree } from '../project-tree/ProjectTree';
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

interface SidebarLayoutProps {
  /** Main content area */
  children: ReactNode;

  /** Project name for tree header */
  projectName?: string;

  /** Network elements for tree structure */
  elements?: {
    buses: NetworkElement[];
    lines: NetworkElement[];
    cables: NetworkElement[];
    transformers: NetworkElement[];
    switches: NetworkElement[];
    sources: NetworkElement[];
    loads: NetworkElement[];
  };

  /** Type catalog counts */
  typeCounts?: {
    lineTypes: number;
    cableTypes: number;
    transformerTypes: number;
    switchEquipmentTypes: number;
  };

  /** Study cases list */
  studyCases?: StudyCaseItem[];

  /** Run history for results */
  runHistory?: RunHistoryItem[];

  /** Callback when node is clicked */
  onNodeClick?: (node: TreeNode) => void;

  /** Callback when category is clicked */
  onCategoryClick?: (nodeType: TreeNodeType, elementType?: ElementType) => void;

  /** Callback when study case is clicked */
  onStudyCaseClick?: (caseId: string) => void;

  /** Callback when study case is activated (double-click) */
  onStudyCaseActivate?: (caseId: string) => void;

  /** Callback when run is clicked */
  onRunClick?: (runId: string) => void;

  /** Show tree sidebar (default: true) */
  showTree?: boolean;

  /** Sidebar default collapsed state */
  defaultCollapsed?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Layout z drzewem projektu jako lewym sidebarem.
 *
 * Struktura:
 * - [Tree Sidebar] | [Main Content]
 *
 * Tree jest collapsible, domyślnie widoczny.
 */
export function SidebarLayout({
  children,
  projectName = 'Nowy projekt',
  elements = {
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
  onNodeClick,
  onCategoryClick,
  onStudyCaseClick,
  onStudyCaseActivate,
  onRunClick,
  showTree = true,
  defaultCollapsed = false,
}: SidebarLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultCollapsed);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  if (!showTree) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full" data-testid="sidebar-layout">
      {/* Sidebar with ProjectTree */}
      <div
        className={clsx(
          'flex-shrink-0 border-r border-gray-200 bg-white transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'w-12' : 'w-72'
        )}
        data-testid="sidebar-container"
        data-collapsed={sidebarCollapsed}
      >
        {/* Collapse toggle */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-2">
          {!sidebarCollapsed && (
            <span className="text-xs font-medium text-gray-700">Nawigacja</span>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            className={clsx(
              'flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700',
              sidebarCollapsed && 'mx-auto'
            )}
            aria-label={sidebarCollapsed ? 'Rozwiń panel nawigacji' : 'Zwiń panel nawigacji'}
            data-testid="sidebar-toggle"
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* ProjectTree (only when not collapsed) */}
        {!sidebarCollapsed && (
          <div className="h-[calc(100%-40px)] overflow-hidden">
            <ProjectTree
              projectName={projectName}
              elements={elements}
              typeCounts={typeCounts}
              studyCases={studyCases}
              runHistory={runHistory}
              onNodeClick={onNodeClick}
              onCategoryClick={onCategoryClick}
              onStudyCaseClick={onStudyCaseClick}
              onStudyCaseActivate={onStudyCaseActivate}
              onRunClick={onRunClick}
            />
          </div>
        )}

        {/* Collapsed state icons */}
        {sidebarCollapsed && (
          <div className="flex flex-col items-center gap-2 p-2" data-testid="sidebar-collapsed-icons">
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              title="Drzewo projektu"
              aria-label="Otwórz drzewo projektu"
            >
              📁
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden" data-testid="sidebar-main-content">
        {children}
      </div>
    </div>
  );
}

export default SidebarLayout;
