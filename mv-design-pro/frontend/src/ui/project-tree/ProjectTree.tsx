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
  ELEMENT: '•',
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
  resultsCount?: number;
  onNodeClick?: (node: TreeNode) => void;
  onCategoryClick?: (nodeType: TreeNodeType, elementType?: ElementType) => void;
  // P10: Study case callbacks
  onStudyCaseClick?: (caseId: string) => void;
  onStudyCaseActivate?: (caseId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function ProjectTree({
  projectName = 'Nowy projekt',
  elements,
  typeCounts = { lineTypes: 0, cableTypes: 0, transformerTypes: 0, switchEquipmentTypes: 0 },
  studyCases = [],
  resultsCount = 0,
  onNodeClick,
  onCategoryClick,
  onStudyCaseClick,
  onStudyCaseActivate,
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
          count: resultsCount,
        },
      ],
    };
  }, [projectName, elements, typeCounts, studyCases, resultsCount]);

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
      } else if (TREE_NODE_TO_ELEMENT_TYPE[node.nodeType]) {
        // Category click - open Data Manager
        onCategoryClick?.(node.nodeType, TREE_NODE_TO_ELEMENT_TYPE[node.nodeType]);
      } else {
        // Other node click
        onNodeClick?.(node);
        onCategoryClick?.(node.nodeType);
      }
    },
    [handleTreeClick, onNodeClick, onCategoryClick, onStudyCaseClick]
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

  // P10: Get appropriate icon for study case (status-based)
  const getIcon = () => {
    if (isStudyCase && node.resultStatus) {
      return RESULT_STATUS_ICONS[node.resultStatus] || TREE_NODE_ICONS.STUDY_CASE;
    }
    return node.icon ?? TREE_NODE_ICONS[node.nodeType];
  };

  const icon = getIcon();
  const label = isElement || isStudyCase ? node.label : TREE_NODE_LABELS[node.nodeType];

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
          !isElement && !isStudyCase && 'font-medium'
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

        {/* Icon with status color for study cases */}
        <span
          className={clsx(
            'text-xs mr-2',
            isStudyCase && node.resultStatus && RESULT_STATUS_COLORS[node.resultStatus]
          )}
          title={isStudyCase ? getStatusTooltip(node.resultStatus) : undefined}
        >
          {icon}
        </span>

        {/* Label */}
        <span
          className={clsx(
            'text-xs flex-1 truncate',
            isElement ? 'text-gray-700' : 'text-gray-900',
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
