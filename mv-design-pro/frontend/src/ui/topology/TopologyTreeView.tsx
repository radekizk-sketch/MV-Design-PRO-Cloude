/**
 * TopologyTreeView — drzewo topologii z podziałem na magistralę (spine)
 * i odgałęzienia (laterals).
 *
 * Konsumuje dane z TopologyGraphSummary (topology store) i renderuje
 * hierarchiczny widok sieci deterministycznie posortowany.
 *
 * Integruje się z selection store — kliknięcie węzła = selekcja w SLD.
 * BINDING: PL labels, no codenames.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import type { SpineNode, AdjacencyEntry, TopologyGraphSummary } from '../../types/enm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TopologyTreeViewProps {
  summary: TopologyGraphSummary | null;
  loading?: boolean;
  error?: string | null;
  selectedNodeRef?: string | null;
  onNodeSelect?: (busRef: string) => void;
  onBranchSelect?: (branchRef: string) => void;
}

interface SpineTreeNode {
  ref_id: string;
  name: string;
  depth: number;
  is_source: boolean;
  branches_to_next: string[];
  laterals: LateralNode[];
  children: SpineTreeNode[];
}

interface LateralNode {
  ref_id: string;
  name: string;
  connected_branches: string[];
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const SECTION_LABELS = {
  spine: 'Magistrala (spine)',
  laterals: 'Odgałęzienia (laterals)',
  isolated: 'Węzły izolowane',
} as const;

// ---------------------------------------------------------------------------
// Build tree from summary
// ---------------------------------------------------------------------------

function buildSpineTree(summary: TopologyGraphSummary): SpineTreeNode[] {
  const { spine, laterals, adjacency } = summary;
  if (spine.length === 0) return [];

  // Build lookup maps
  const spineSet = new Set(spine.map((s) => s.ref_id));
  const lateralMap = new Map<string, LateralNode[]>();

  // Map laterals to their nearest spine neighbor
  for (const lat of laterals) {
    // Find which spine node connects to this lateral
    const adj = adjacency.find((a) => a.ref_id === lat);
    if (!adj) continue;

    for (const neighbor of adj.neighbors) {
      if (spineSet.has(neighbor)) {
        if (!lateralMap.has(neighbor)) {
          lateralMap.set(neighbor, []);
        }
        lateralMap.get(neighbor)!.push({
          ref_id: lat,
          name: lat,
          connected_branches: adj.branch_refs,
        });
        break;
      }
    }
  }

  // Build spine chain sorted by depth
  const sorted = [...spine].sort((a, b) => a.depth - b.depth);

  return sorted.map((node) => ({
    ref_id: node.ref_id,
    name: node.ref_id,
    depth: node.depth,
    is_source: node.is_source,
    branches_to_next: node.branches_to_next,
    laterals: lateralMap.get(node.ref_id) ?? [],
    children: [],
  }));
}

function getIsolatedNodes(summary: TopologyGraphSummary): string[] {
  const spineSet = new Set(summary.spine.map((s) => s.ref_id));
  const lateralSet = new Set(summary.laterals);
  const allNodes = summary.adjacency.map((a) => a.ref_id);

  return allNodes
    .filter((n) => !spineSet.has(n) && !lateralSet.has(n))
    .sort();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TopologyTreeView({
  summary,
  loading = false,
  error = null,
  selectedNodeRef = null,
  onNodeSelect,
  onBranchSelect,
}: TopologyTreeViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['spine', 'laterals'])
  );

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const spineTree = useMemo(
    () => (summary ? buildSpineTree(summary) : []),
    [summary]
  );

  const isolatedNodes = useMemo(
    () => (summary ? getIsolatedNodes(summary) : []),
    [summary]
  );

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500" data-testid="topology-tree-loading">
        Wczytywanie topologii...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600" data-testid="topology-tree-error">
        {error}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-4 text-sm text-gray-400" data-testid="topology-tree-empty">
        Brak danych topologii
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col"
      data-testid="topology-tree"
    >
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">TOPOLOGIA SIECI</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {summary.is_radial ? 'Sieć promieniowa' : 'Sieć pierścieniowa / mieszana'}
          {' — '}
          {summary.adjacency.length} węzłów
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {/* Spine section */}
        <SectionHeader
          label={SECTION_LABELS.spine}
          count={spineTree.length}
          isExpanded={expandedSections.has('spine')}
          onToggle={() => toggleSection('spine')}
        />
        {expandedSections.has('spine') && (
          <div className="ml-2" data-testid="topology-tree-spine">
            {spineTree.map((node) => (
              <SpineNodeItem
                key={node.ref_id}
                node={node}
                isSelected={selectedNodeRef === node.ref_id}
                onSelect={onNodeSelect}
                onBranchSelect={onBranchSelect}
              />
            ))}
          </div>
        )}

        {/* Laterals section */}
        {summary.laterals.length > 0 && (
          <>
            <SectionHeader
              label={SECTION_LABELS.laterals}
              count={summary.laterals.length}
              isExpanded={expandedSections.has('laterals')}
              onToggle={() => toggleSection('laterals')}
            />
            {expandedSections.has('laterals') && (
              <div className="ml-2" data-testid="topology-tree-laterals">
                {[...summary.laterals].sort().map((lat) => (
                  <NodeItem
                    key={lat}
                    refId={lat}
                    isSelected={selectedNodeRef === lat}
                    onSelect={onNodeSelect}
                    badge="odgałęzienie"
                    badgeColor="bg-amber-100 text-amber-700"
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Isolated nodes */}
        {isolatedNodes.length > 0 && (
          <>
            <SectionHeader
              label={SECTION_LABELS.isolated}
              count={isolatedNodes.length}
              isExpanded={expandedSections.has('isolated')}
              onToggle={() => toggleSection('isolated')}
            />
            {expandedSections.has('isolated') && (
              <div className="ml-2" data-testid="topology-tree-isolated">
                {isolatedNodes.map((n) => (
                  <NodeItem
                    key={n}
                    refId={n}
                    isSelected={selectedNodeRef === n}
                    onSelect={onNodeSelect}
                    badge="izolowany"
                    badgeColor="bg-red-100 text-red-700"
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({
  label,
  count,
  isExpanded,
  onToggle,
}: {
  label: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="flex items-center w-full py-1.5 px-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded"
      onClick={onToggle}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="mr-1.5 text-gray-400 flex-shrink-0"
      >
        {isExpanded ? (
          <path d="M2 4 L5 7 L8 4" />
        ) : (
          <path d="M4 2 L7 5 L4 8" />
        )}
      </svg>
      <span>{label}</span>
      <span className="ml-auto text-gray-400">({count})</span>
    </button>
  );
}

function SpineNodeItem({
  node,
  isSelected,
  onSelect,
  onBranchSelect,
}: {
  node: SpineTreeNode;
  isSelected: boolean;
  onSelect?: (ref: string) => void;
  onBranchSelect?: (ref: string) => void;
}) {
  return (
    <div>
      <div
        className={clsx(
          'flex items-center py-1 px-2 rounded cursor-pointer text-xs',
          'hover:bg-gray-100 transition-colors',
          isSelected && 'bg-blue-100 hover:bg-blue-100'
        )}
        style={{ paddingLeft: `${node.depth * 12 + 4}px` }}
        onClick={() => onSelect?.(node.ref_id)}
        data-testid={`topology-spine-node-${node.ref_id}`}
      >
        {/* Depth indicator */}
        <span className="w-4 text-gray-400 text-[10px] mr-1">{node.depth}</span>

        {/* Source badge */}
        {node.is_source && (
          <span className="px-1 py-0.5 bg-green-100 text-green-700 text-[9px] rounded mr-1.5 flex-shrink-0">
            GPZ
          </span>
        )}

        {/* Name */}
        <span className="flex-1 truncate text-gray-800">{node.ref_id}</span>

        {/* Branch count indicator */}
        {node.branches_to_next.length > 0 && (
          <span className="text-gray-400 text-[10px] ml-1">
            {node.branches_to_next.length} gał.
          </span>
        )}

        {/* Laterals count */}
        {node.laterals.length > 0 && (
          <span className="text-amber-500 text-[10px] ml-1">
            +{node.laterals.length} odg.
          </span>
        )}
      </div>

      {/* Inline laterals */}
      {node.laterals.map((lat) => (
        <div
          key={lat.ref_id}
          className="flex items-center py-0.5 px-2 text-xs text-gray-500 hover:bg-gray-50 rounded cursor-pointer"
          style={{ paddingLeft: `${(node.depth + 1) * 12 + 4}px` }}
          onClick={() => onSelect?.(lat.ref_id)}
        >
          <span className="w-2 h-2 border border-amber-400 rounded-full mr-1.5 flex-shrink-0" />
          <span className="truncate">{lat.ref_id}</span>
        </div>
      ))}
    </div>
  );
}

function NodeItem({
  refId,
  isSelected,
  onSelect,
  badge,
  badgeColor,
}: {
  refId: string;
  isSelected: boolean;
  onSelect?: (ref: string) => void;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div
      className={clsx(
        'flex items-center py-1 px-2 rounded cursor-pointer text-xs',
        'hover:bg-gray-100 transition-colors',
        isSelected && 'bg-blue-100 hover:bg-blue-100'
      )}
      onClick={() => onSelect?.(refId)}
      data-testid={`topology-node-${refId}`}
    >
      <span className="flex-1 truncate text-gray-700">{refId}</span>
      {badge && (
        <span className={clsx('px-1 py-0.5 text-[9px] rounded ml-1', badgeColor)}>
          {badge}
        </span>
      )}
    </div>
  );
}
