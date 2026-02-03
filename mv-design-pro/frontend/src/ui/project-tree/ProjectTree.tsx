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

import { useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import type { TreeNode, TreeNodeType, ElementType, OperatingMode, ResultStatus } from '../types';
import type { RunHistoryItem } from '../comparison/types';
import { useSelectionStore } from '../selection/store';
import { useTreeSelection } from '../selection/hooks';
import { TreeEtapSymbolIcon } from './TreeEtapSymbolIcon';
import { getTreeSymbol, getResultStatusTooltip } from './treeSymbolMap';

// ============================================================================
// Tree Node Labels (Polish)
// ============================================================================

const TREE_NODE_LABELS: Record<TreeNodeType, string> = {
  PROJECT: 'Projekt',
  NETWORK: 'Sieć',
  STATION: 'Stacja',          // FIX-05: Station label (or from station name)
  VOLTAGE_LEVEL: 'Poziom napięcia',  // FIX-05: Voltage level label
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
  PROTECTION_RESULTS: 'Zabezpieczenia',  // P15c: Protection results
  PROTECTION_RUNS: 'Runy zabezpieczeń',  // P15c: Protection runs
  PROTECTION_COMPARISONS: 'Porównania A/B',  // P15c: Protection comparisons
  POWER_FLOW_RESULTS: 'Rozpływ mocy',  // P20b: Power flow results
  POWER_FLOW_RUNS: 'Rozpływy',  // P20b: Power flow runs
  ELEMENT: '',
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
  onNodeClick?: (node: TreeNode) => void;
  onCategoryClick?: (nodeType: TreeNodeType, elementType?: ElementType) => void;
  // P10: Study case callbacks
  onStudyCaseClick?: (caseId: string) => void;
  onStudyCaseActivate?: (caseId: string) => void;
  // P11c: Run click callback
  onRunClick?: (runId: string) => void;
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
  resultsCount: _resultsCount = 0,
  onNodeClick,
  onCategoryClick,
  onStudyCaseClick,
  onStudyCaseActivate,
  onRunClick,
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
          count: runHistory.length,
          children: [
            // P20b: Power flow results subcategory
            {
              id: 'power-flow-results',
              label: TREE_NODE_LABELS.POWER_FLOW_RESULTS,
              nodeType: 'POWER_FLOW_RESULTS',
              count: runHistory.filter(r => r.solver_kind === 'PF' || r.solver_kind === 'power_flow').length,
              children: buildRunNodes(runHistory.filter(r => r.solver_kind === 'PF' || r.solver_kind === 'power_flow')),
            },
            // P15c: Protection results subcategory
            {
              id: 'protection-results',
              label: TREE_NODE_LABELS.PROTECTION_RESULTS,
              nodeType: 'PROTECTION_RESULTS',
              children: [
                {
                  id: 'protection-runs',
                  label: TREE_NODE_LABELS.PROTECTION_RUNS,
                  nodeType: 'PROTECTION_RUNS',
                  count: runHistory.filter(r => r.solver_kind === 'protection' || r.solver_kind === 'protection_analysis').length,
                  children: buildRunNodes(runHistory.filter(r => r.solver_kind === 'protection' || r.solver_kind === 'protection_analysis')),
                },
                {
                  id: 'protection-comparisons',
                  label: TREE_NODE_LABELS.PROTECTION_COMPARISONS,
                  nodeType: 'PROTECTION_COMPARISONS',
                  count: 0, // TODO: Add comparison history
                  children: [],
                },
              ],
            },
            // Other runs (SC, etc.) at top level - excluding PF and protection
            ...buildRunNodes(runHistory.filter(r =>
              r.solver_kind !== 'protection' &&
              r.solver_kind !== 'protection_analysis' &&
              r.solver_kind !== 'PF' &&
              r.solver_kind !== 'power_flow'
            )),
          ],
        },
      ],
    };
  }, [projectName, elements, typeCounts, studyCases, runHistory]);

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
        // P11c/P15c/P20b: Run click - open appropriate Results Inspector
        if (node.solverKind === 'protection' || node.solverKind === 'protection_analysis') {
          // P15c: Protection run - navigate to protection results
          window.location.hash = '#protection-results';
          onRunClick?.(node.runId);
        } else if (node.solverKind === 'PF' || node.solverKind === 'power_flow') {
          // P20b: Power flow run - navigate to power flow results
          window.location.hash = '#power-flow-results';
          onRunClick?.(node.runId);
        } else {
          // P11c: Other runs - use existing handler
          onRunClick?.(node.runId);
        }
      } else if (TREE_NODE_TO_ELEMENT_TYPE[node.nodeType]) {
        // Category click - open Data Manager
        onCategoryClick?.(node.nodeType, TREE_NODE_TO_ELEMENT_TYPE[node.nodeType]);
      } else {
        // Other node click
        onNodeClick?.(node);
        onCategoryClick?.(node.nodeType);
      }
    },
    [handleTreeClick, onNodeClick, onCategoryClick, onStudyCaseClick, onRunClick]
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
    <div
      className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col"
      data-testid="project-tree"
    >
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3" data-testid="project-tree-header">
        <h2 className="text-sm font-semibold text-gray-900">DRZEWO PROJEKTU</h2>
        <p className="text-xs text-gray-500 mt-0.5" data-testid="project-tree-mode">
          {getModeLabel(mode)}
        </p>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto p-2" data-testid="project-tree-content">
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

// P10: Status colors for study cases and run items
const RESULT_STATUS_COLORS: Record<ResultStatus, string> = {
  NONE: 'text-gray-400',
  FRESH: 'text-green-600',
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
  const isStation = node.nodeType === 'STATION'; // FIX-05
  const isVoltageLevel = node.nodeType === 'VOLTAGE_LEVEL'; // FIX-05

  // Get symbol definition from map
  const symbolDef = getTreeSymbol(node.nodeType);

  // FIX-05: Station and VoltageLevel use node.label (dynamic name)
  const label = isElement || isStudyCase || isRunItem || isStation || isVoltageLevel
    ? node.label
    : TREE_NODE_LABELS[node.nodeType];

  // Get status color class for study cases and run items
  const statusColorClass = (isStudyCase || isRunItem) && node.resultStatus
    ? RESULT_STATUS_COLORS[node.resultStatus]
    : 'text-gray-600';

  // PROJECT_TREE_PARITY_V1: Deterministic data-testid for E2E testing
  const getTestId = (): string => {
    if (isElement && node.elementId) {
      return `tree-node-element-${node.elementId}`;
    }
    if (isStudyCase && node.studyCaseId) {
      return `tree-node-case-${node.studyCaseId}`;
    }
    if (isRunItem && node.runId) {
      return `tree-node-run-${node.runId}`;
    }
    // FIX-05: Station test ID
    if (isStation && node.stationId) {
      return `tree-node-station-${node.stationId}`;
    }
    return `tree-node-${node.id}`;
  };

  return (
    <div data-testid={`tree-node-container-${node.id}`}>
      {/* Node row */}
      <div
        data-testid={getTestId()}
        data-node-type={node.nodeType}
        data-node-id={node.id}
        data-expanded={isExpanded}
        data-selected={isSelected}
        className={clsx(
          'flex items-center py-1 px-2 rounded cursor-pointer',
          'hover:bg-gray-100 transition-colors',
          isSelected && 'bg-blue-100 hover:bg-blue-100',
          // P10: Active study case highlighting
          isStudyCase && node.isActive && 'bg-blue-50 hover:bg-blue-100',
          !isElement && !isStudyCase && !isRunItem && 'font-medium'
        )}
        style={{ paddingLeft: `${level * 16 + 4}px` }}
        onClick={() => onClick(node)}
        onDoubleClick={() => onDoubleClick(node)}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 mr-1 flex-shrink-0"
            data-testid={`tree-toggle-${node.id}`}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Zwiń węzeł' : 'Rozwiń węzeł'}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              {isExpanded ? (
                <path d="M2 4 L5 7 L8 4" />
              ) : (
                <path d="M4 2 L7 5 L4 8" />
              )}
            </svg>
          </button>
        ) : (
          <span className="w-4 h-4 mr-1 flex-shrink-0" aria-hidden="true" />
        )}

        {/* P10: Active case indicator */}
        {isStudyCase && node.isActive && (
          <span
            className="w-2 h-2 bg-blue-500 rounded-full mr-1 flex-shrink-0"
            title="Aktywny przypadek"
            aria-label="Aktywny przypadek"
          />
        )}

        {/* ETAP Symbol Icon */}
        <span
          className={clsx('mr-2 flex-shrink-0', statusColorClass)}
          title={(isStudyCase || isRunItem) ? getResultStatusTooltip(node.resultStatus) : symbolDef.ariaLabel}
        >
          <TreeEtapSymbolIcon
            symbolId={symbolDef.symbolId}
            size={14}
            title={symbolDef.ariaLabel}
          />
        </span>

        {/* Label */}
        <span
          className={clsx(
            'text-xs flex-1 truncate',
            (isElement || isRunItem) ? 'text-gray-700' : 'text-gray-900',
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
        <div data-testid={`tree-children-${node.id}`} role="group">
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
