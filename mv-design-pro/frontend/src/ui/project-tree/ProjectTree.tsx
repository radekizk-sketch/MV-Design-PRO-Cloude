/**
 * Project Tree Component (PF-style Drzewo Projektu)
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md § A: Project Tree structure
 * - wizard_screens.md § 1: Navigation paradigm
 * - sld_rules.md § G.1: SLD ↔ Wizard synchronization
 *
 * Structure:
 * - Projekt
 *   - Sieć
 *     - Szyny
 *     - Linie
 *     - Kable
 *     - Transformatory
 *     - Łączniki
 *     - Źródła
 *     - Odbiory
 *   - Katalog typów (read-only)
 *     - Typy linii
 *     - Typy kabli
 *     - Typy transformatorów
 *     - Typy aparatury
 *   - Przypadki obliczeniowe
 *   - Wyniki
 */

import { useState, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import type { TreeNode, TreeNodeType, ElementType, OperatingMode } from '../types';
import type { RunHistoryItem } from '../comparison/types';
import { useSelectionStore } from '../selection/store';
import { useTreeSelection } from '../selection/hooks';

// ============================================================================
// Tree Node Icons (Polish labels)
// ============================================================================

const TREE_NODE_ICONS: Record<TreeNodeType, string> = {
  PROJECT: '📁',
  NETWORK: '🔌',
  BUSES: '═══',
  LINES: '───',
  CABLES: '━━━',
  TRANSFORMERS: '⊕',
  SWITCHES: '⬡',
  SOURCES: '⚡',
  LOADS: '▼',
  TYPE_CATALOG: '📚',
  LINE_TYPES: '📏',
  CABLE_TYPES: '📐',
  TRANSFORMER_TYPES: '🔄',
  SWITCH_EQUIPMENT_TYPES: '⚙️',
  CASES: '📋',
  STUDY_CASE: '◉',  // P10: Study case icon
  RESULTS: '📊',
  RUN_ITEM: '▸',  // P11c: Analysis run icon
  ELEMENT: '•',
  POWER_FLOW_RESULTS: '⚡',  // P20b: Power Flow results category
  POWER_FLOW_RUN: '●',  // P20b: Power Flow run item
};

const TREE_NODE_LABELS: Record<TreeNodeType, string> = {
  PROJECT: 'Projekt',
  NETWORK: 'Sieć',
  BUSES: 'Szyny',
  LINES: 'Linie',
  CABLES: 'Kable',
  TRANSFORMERS: 'Transformatory',
  SWITCHES: 'Łączniki',
  SOURCES: 'Źródła',
  LOADS: 'Odbiory',
  TYPE_CATALOG: 'Katalog typów',
  LINE_TYPES: 'Typy linii',
  CABLE_TYPES: 'Typy kabli',
  TRANSFORMER_TYPES: 'Typy transformatorów',
  SWITCH_EQUIPMENT_TYPES: 'Typy aparatury',
  CASES: 'Przypadki obliczeniowe',
  STUDY_CASE: '',  // P10: Label from case name
  RESULTS: 'Wyniki',
  RUN_ITEM: '',  // P11c: Label from run metadata
  ELEMENT: '',
  POWER_FLOW_RESULTS: 'Rozpływ mocy',  // P20b: Power Flow category
  POWER_FLOW_RUN: '',  // P20b: Label from run metadata
};

// ============================================================================
// Element Type Mapping
// ============================================================================

const TREE_NODE_TO_ELEMENT_TYPE: Partial<Record<TreeNodeType, ElementType>> = {
  BUSES: 'Bus',
  LINES: 'LineBranch',
  CABLES: 'LineBranch',
  TRANSFORMERS: 'TransformerBranch',
  SWITCHES: 'Switch',
  SOURCES: 'Source',
  LOADS: 'Load',
};

// ============================================================================
// Props
// ============================================================================

interface NetworkElement {
  id: string;
  name: string;
  element_type: string;
  in_service?: boolean;
  branch_type?: 'LINE' | 'CABLE';
}

// P10: Study case item for tree
interface StudyCaseItem {
  id: string;
  name: string;
  result_status: 'NONE' | 'FRESH' | 'OUTDATED';
  is_active: boolean;
}

// P20b: Power Flow run item for tree
interface PowerFlowRunItem {
  id: string;
  case_name: string | null;
  created_at: string;
  converged: boolean | null;
  iterations: number | null;
  result_status: string;
}

interface ProjectTreeProps {
  projectName?: string;
  elements: {
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
  // P10: Study cases list
  studyCases?: StudyCaseItem[];
  // P11c: Run history list (for Results Browser)
  runHistory?: RunHistoryItem[];
  resultsCount?: number;
  // P20b: Power Flow runs history
  powerFlowRuns?: PowerFlowRunItem[];
  onNodeClick?: (node: TreeNode) => void;
  onCategoryClick?: (nodeType: TreeNodeType, elementType?: ElementType) => void;
  // P10: Study case callbacks
  onStudyCaseClick?: (caseId: string) => void;
  onStudyCaseActivate?: (caseId: string) => void;
  // P11c: Run click callback
  onRunClick?: (runId: string) => void;
  // P20b: Power Flow run click callback
  onPowerFlowRunClick?: (runId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function ProjectTree({
  projectName = 'Nowy projekt',
  elements,
  typeCounts = { lineTypes: 0, cableTypes: 0, transformerTypes: 0, switchEquipmentTypes: 0 },
  studyCases = [],
  runHistory = [],
  resultsCount = 0,
  powerFlowRuns = [],
  onNodeClick,
  onCategoryClick,
  onStudyCaseClick,
  onStudyCaseActivate,
  onRunClick,
  onPowerFlowRunClick,
}: ProjectTreeProps) {
  const { treeExpandedNodes, expandTreeNode, collapseTreeNode } = useSelectionStore();
  const { selectedElement, handleTreeClick } = useTreeSelection();
  const mode = useSelectionStore((state) => state.mode);

  // Build tree structure
  const tree = useMemo((): TreeNode => {
    const buildElementNodes = (
      items: NetworkElement[],
      elementType: ElementType
    ): TreeNode[] => {
      // Sort by name, then by id for deterministic ordering
      const sorted = [...items].sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name, 'pl');
        return nameCompare !== 0 ? nameCompare : a.id.localeCompare(b.id);
      });

      return sorted.map((item) => ({
        id: `element-${item.id}`,
        label: item.name,
        nodeType: 'ELEMENT' as TreeNodeType,
        elementType,
        elementId: item.id,
      }));
    };

    // P10: Build study case nodes
    const buildStudyCaseNodes = (cases: StudyCaseItem[]): TreeNode[] => {
      // Sort by name, active case first
      const sorted = [...cases].sort((a, b) => {
        if (a.is_active !== b.is_active) {
          return a.is_active ? -1 : 1;
        }
        return a.name.localeCompare(b.name, 'pl');
      });

      return sorted.map((caseItem) => ({
        id: `study-case-${caseItem.id}`,
        label: caseItem.name,
        nodeType: 'STUDY_CASE' as TreeNodeType,
        studyCaseId: caseItem.id,
        isActive: caseItem.is_active,
        resultStatus: caseItem.result_status,
      }));
    };

    // P11c: Build run history nodes
    const buildRunNodes = (runs: RunHistoryItem[]): TreeNode[] => {
      // Sort by created_at DESC (newest first) - deterministic
      const sorted = [...runs].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return sorted.map((run) => {
        // Format label: "Solver [Case] - Date"
        const date = new Date(run.created_at).toLocaleDateString('pl-PL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        const solverLabel = run.solver_kind === 'PF' ? 'Rozpływ' : run.solver_kind === 'short_circuit_sn' ? 'Zwarcie' : run.solver_kind;
        const label = `${solverLabel} [${run.case_name}] — ${date}`;

        return {
          id: `run-${run.run_id}`,
          label,
          nodeType: 'RUN_ITEM' as TreeNodeType,
          runId: run.run_id,
          caseId: run.case_id,
          solverKind: run.solver_kind,
          createdAt: run.created_at,
          resultStatus: run.result_state,
        };
      });
    };

    // P20b: Build Power Flow run nodes
    const buildPowerFlowRunNodes = (runs: PowerFlowRunItem[]): TreeNode[] => {
      // Sort by created_at DESC (newest first) - deterministic
      const sorted = [...runs].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return sorted.map((run) => {
        const date = new Date(run.created_at).toLocaleDateString('pl-PL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        const caseName = run.case_name || 'Przypadek';
        const statusLabel = run.converged === true ? 'OK' : run.converged === false ? 'Błąd' : '—';
        const label = `${caseName} — ${date} [${statusLabel}]`;

        return {
          id: `pf-run-${run.id}`,
          label,
          nodeType: 'POWER_FLOW_RUN' as TreeNodeType,
          powerFlowRunId: run.id,
          createdAt: run.created_at,
          resultStatus: run.result_status,
          converged: run.converged,
          iterations: run.iterations,
        };
      });
    };

    return {
      id: 'project',
      label: projectName,
      nodeType: 'PROJECT',
      expanded: true,
      children: [
        {
          id: 'network',
          label: TREE_NODE_LABELS.NETWORK,
          nodeType: 'NETWORK',
          children: [
            {
              id: 'buses',
              label: TREE_NODE_LABELS.BUSES,
              nodeType: 'BUSES',
              count: elements.buses.length,
              children: buildElementNodes(elements.buses, 'Bus'),
            },
            {
              id: 'lines',
              label: TREE_NODE_LABELS.LINES,
              nodeType: 'LINES',
              count: elements.lines.length,
              children: buildElementNodes(elements.lines, 'LineBranch'),
            },
            {
              id: 'cables',
              label: TREE_NODE_LABELS.CABLES,
              nodeType: 'CABLES',
              count: elements.cables.length,
              children: buildElementNodes(elements.cables, 'LineBranch'),
            },
            {
              id: 'transformers',
              label: TREE_NODE_LABELS.TRANSFORMERS,
              nodeType: 'TRANSFORMERS',
              count: elements.transformers.length,
              children: buildElementNodes(elements.transformers, 'TransformerBranch'),
            },
            {
              id: 'switches',
              label: TREE_NODE_LABELS.SWITCHES,
              nodeType: 'SWITCHES',
              count: elements.switches.length,
              children: buildElementNodes(elements.switches, 'Switch'),
            },
            {
              id: 'sources',
              label: TREE_NODE_LABELS.SOURCES,
              nodeType: 'SOURCES',
              count: elements.sources.length,
              children: buildElementNodes(elements.sources, 'Source'),
            },
            {
              id: 'loads',
              label: TREE_NODE_LABELS.LOADS,
              nodeType: 'LOADS',
              count: elements.loads.length,
              children: buildElementNodes(elements.loads, 'Load'),
            },
          ],
        },
        {
          id: 'type-catalog',
          label: TREE_NODE_LABELS.TYPE_CATALOG,
          nodeType: 'TYPE_CATALOG',
          children: [
            {
              id: 'line-types',
              label: TREE_NODE_LABELS.LINE_TYPES,
              nodeType: 'LINE_TYPES',
              count: typeCounts.lineTypes,
            },
            {
              id: 'cable-types',
              label: TREE_NODE_LABELS.CABLE_TYPES,
              nodeType: 'CABLE_TYPES',
              count: typeCounts.cableTypes,
            },
            {
              id: 'transformer-types',
              label: TREE_NODE_LABELS.TRANSFORMER_TYPES,
              nodeType: 'TRANSFORMER_TYPES',
              count: typeCounts.transformerTypes,
            },
            {
              id: 'switch-equipment-types',
              label: TREE_NODE_LABELS.SWITCH_EQUIPMENT_TYPES,
              nodeType: 'SWITCH_EQUIPMENT_TYPES',
              count: typeCounts.switchEquipmentTypes,
            },
          ],
        },
        {
          id: 'cases',
          label: TREE_NODE_LABELS.CASES,
          nodeType: 'CASES',
          count: studyCases.length,
          children: buildStudyCaseNodes(studyCases),
        },
        {
          id: 'results',
          label: TREE_NODE_LABELS.RESULTS,
          nodeType: 'RESULTS',
          count: runHistory.length + powerFlowRuns.length,
          children: [
            // P20b: Power Flow results category
            {
              id: 'power-flow-results',
              label: TREE_NODE_LABELS.POWER_FLOW_RESULTS,
              nodeType: 'POWER_FLOW_RESULTS' as TreeNodeType,
              count: powerFlowRuns.length,
              children: buildPowerFlowRunNodes(powerFlowRuns),
            },
            // Legacy run history (short-circuit, etc.)
            ...buildRunNodes(runHistory),
          ],
        },
      ],
    };
  }, [projectName, elements, typeCounts, studyCases, runHistory, powerFlowRuns]);

  // Handle node toggle
  const handleToggle = useCallback(
    (nodeId: string) => {
      if (treeExpandedNodes.has(nodeId)) {
        collapseTreeNode(nodeId);
      } else {
        expandTreeNode(nodeId);
      }
    },
    [treeExpandedNodes, expandTreeNode, collapseTreeNode]
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (node: TreeNode) => {
      if (node.nodeType === 'ELEMENT' && node.elementId && node.elementType) {
        // Select element
        handleTreeClick(node.elementId, node.elementType, node.label);
      } else if (node.nodeType === 'STUDY_CASE' && node.studyCaseId) {
        // P10: Study case click
        onStudyCaseClick?.(node.studyCaseId);
      } else if (node.nodeType === 'RUN_ITEM' && node.runId) {
        // P11c: Run click - open Results Inspector
        onRunClick?.(node.runId);
      } else if (node.nodeType === 'POWER_FLOW_RUN' && node.powerFlowRunId) {
        // P20b: Power Flow run click - open Power Flow Results Inspector
        onPowerFlowRunClick?.(node.powerFlowRunId);
      } else if (TREE_NODE_TO_ELEMENT_TYPE[node.nodeType]) {
        // Category click - open Data Manager
        onCategoryClick?.(node.nodeType, TREE_NODE_TO_ELEMENT_TYPE[node.nodeType]);
      } else {
        // Other node click
        onNodeClick?.(node);
        onCategoryClick?.(node.nodeType);
      }
    },
    [handleTreeClick, onNodeClick, onCategoryClick, onStudyCaseClick, onRunClick, onPowerFlowRunClick]
  );

  // P10: Handle study case double-click (activate)
  const handleNodeDoubleClick = useCallback(
    (node: TreeNode) => {
      if (node.nodeType === 'STUDY_CASE' && node.studyCaseId && !node.isActive) {
        onStudyCaseActivate?.(node.studyCaseId);
      }
    },
    [onStudyCaseActivate]
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">DRZEWO PROJEKTU</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {getModeLabel(mode)}
        </p>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto p-2">
        <TreeNodeComponent
          node={tree}
          level={0}
          expandedNodes={treeExpandedNodes}
          selectedElementId={selectedElement?.id ?? null}
          onToggle={handleToggle}
          onClick={handleNodeClick}
          onDoubleClick={handleNodeDoubleClick}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Tree Node Component
// ============================================================================

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  expandedNodes: Set<string>;
  selectedElementId: string | null;
  onToggle: (nodeId: string) => void;
  onClick: (node: TreeNode) => void;
  onDoubleClick: (node: TreeNode) => void;
}

// P10: Status icons and colors for study cases
const RESULT_STATUS_ICONS: Record<string, string> = {
  NONE: '○',
  FRESH: '●',
  OUTDATED: '◐',
};

const RESULT_STATUS_COLORS: Record<string, string> = {
  NONE: 'text-gray-400',
  FRESH: 'text-green-500',
  OUTDATED: 'text-amber-500',
};

function TreeNodeComponent({
  node,
  level,
  expandedNodes,
  selectedElementId,
  onToggle,
  onClick,
  onDoubleClick,
}: TreeNodeComponentProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id) || node.expanded;
  const isSelected = node.elementId === selectedElementId;
  const isElement = node.nodeType === 'ELEMENT';
  const isStudyCase = node.nodeType === 'STUDY_CASE';
  const isRunItem = node.nodeType === 'RUN_ITEM'; // P11c
  const isPowerFlowRun = node.nodeType === 'POWER_FLOW_RUN'; // P20b

  // P10/P11c/P20b: Get appropriate icon for study case, run item, or power flow run (status-based)
  const getIcon = () => {
    if (isPowerFlowRun && node.converged !== undefined) {
      // P20b: Use convergence status for Power Flow runs
      return node.converged === true ? '●' : node.converged === false ? '○' : '◐';
    }
    if ((isStudyCase || isRunItem) && node.resultStatus) {
      return RESULT_STATUS_ICONS[node.resultStatus] || TREE_NODE_ICONS[node.nodeType];
    }
    return node.icon ?? TREE_NODE_ICONS[node.nodeType];
  };

  // P20b: Get convergence color for Power Flow runs
  const getIconColor = () => {
    if (isPowerFlowRun && node.converged !== undefined) {
      return node.converged === true
        ? 'text-emerald-500'
        : node.converged === false
          ? 'text-rose-500'
          : 'text-amber-500';
    }
    if ((isStudyCase || isRunItem) && node.resultStatus) {
      return RESULT_STATUS_COLORS[node.resultStatus] || '';
    }
    return '';
  };

  const icon = getIcon();
  const iconColor = getIconColor();
  const label = isElement || isStudyCase || isRunItem || isPowerFlowRun ? node.label : TREE_NODE_LABELS[node.nodeType];

  return (
    <div>
      {/* Node row */}
      <div
        className={clsx(
          'flex items-center py-1 px-2 rounded cursor-pointer',
          'hover:bg-gray-100 transition-colors',
          isSelected && 'bg-blue-100 hover:bg-blue-100',
          // P10: Active study case highlighting
          isStudyCase && node.isActive && 'bg-blue-50 hover:bg-blue-100',
          !isElement && !isStudyCase && !isRunItem && !isPowerFlowRun && 'font-medium'
        )}
        style={{ paddingLeft: `${level * 16 + 4}px` }}
        onClick={() => onClick(node)}
        onDoubleClick={() => onDoubleClick(node)}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 mr-1"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="w-4 h-4 mr-1" />
        )}

        {/* P10: Active case indicator */}
        {isStudyCase && node.isActive && (
          <span className="text-blue-600 mr-1" title="Aktywny przypadek">▸</span>
        )}

        {/* Icon with status color for study cases, run items, and power flow runs */}
        <span
          className={clsx('text-xs mr-2', iconColor)}
          title={
            isPowerFlowRun
              ? getPowerFlowTooltip(node.converged, node.iterations)
              : (isStudyCase || isRunItem)
                ? getStatusTooltip(node.resultStatus)
                : undefined
          }
        >
          {icon}
        </span>

        {/* Label */}
        <span
          className={clsx(
            'text-xs flex-1 truncate',
            (isElement || isRunItem || isPowerFlowRun) ? 'text-gray-700' : 'text-gray-900',
            isStudyCase && node.isActive && 'font-medium'
          )}
        >
          {label}
        </span>

        {/* P10: Active badge for study case */}
        {isStudyCase && node.isActive && (
          <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded">
            aktywny
          </span>
        )}

        {/* Count badge */}
        {node.count !== undefined && (
          <span className="text-xs text-gray-400 ml-2">({node.count})</span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              selectedElementId={selectedElementId}
              onToggle={onToggle}
              onClick={onClick}
              onDoubleClick={onDoubleClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// P10: Get tooltip for result status
function getStatusTooltip(status: string | undefined): string {
  switch (status) {
    case 'FRESH':
      return 'Wyniki aktualne';
    case 'OUTDATED':
      return 'Wyniki nieaktualne — wymagane przeliczenie';
    case 'NONE':
    default:
      return 'Brak wyników';
  }
}

// P20b: Get tooltip for Power Flow convergence status
function getPowerFlowTooltip(converged: boolean | null | undefined, iterations: number | null | undefined): string {
  if (converged === true) {
    return `Zbieżność osiągnięta${iterations !== null ? ` (${iterations} iteracji)` : ''}`;
  }
  if (converged === false) {
    return `Brak zbieżności${iterations !== null ? ` po ${iterations} iteracjach` : ''}`;
  }
  return 'Status nieznany';
}

// ============================================================================
// Helper Functions
// ============================================================================

function getModeLabel(mode: OperatingMode): string {
  switch (mode) {
    case 'MODEL_EDIT':
      return 'Tryb: Edycja modelu';
    case 'CASE_CONFIG':
      return 'Tryb: Konfiguracja przypadku';
    case 'RESULT_VIEW':
      return 'Tryb: Wyniki (tylko odczyt)';
    default:
      return mode;
  }
}

export default ProjectTree;
