/**
 * Bay Classification — Hybrid ABB+PowerFactory.
 *
 * Klasyfikacja pól (bayów) na szynie GPZ na podstawie topologii
 * i typów elementów w podgrafie każdego feedera.
 *
 * Integracja z engine/sld-layout/phase2-bay-detection:
 * - Używamy tych samych typów BayType
 * - Algorytm klasyfikacji dostosowany do VisualGraphV1
 *
 * DETERMINIZM: Klasyfikacja jest deterministyczna — ten sam graf → te same typy.
 */

import type { VisualGraphV1, VisualEdgeV1 } from './visualGraph';
import { NodeTypeV1, EdgeTypeV1 } from './visualGraph';

// =============================================================================
// BAY TYPE (zgodny z engine/sld-layout)
// =============================================================================

export type HybridBayType =
  | 'incomer'    // Zasilanie z WN (transformator WN/SN)
  | 'feeder'     // Pole liniowe (kabel/linia → stacja)
  | 'tie'        // Łącznik międzyszynowy
  | 'oze_pv'     // Farma fotowoltaiczna
  | 'oze_wind'   // Farma wiatrowa
  | 'bess'       // Magazyn energii
  | 'generator'  // Generator konwencjonalny
  | 'measurement'// Pole pomiarowe
  | 'auxiliary'   // Potrzeby własne
  | 'unknown';   // Niesklasyfikowany

/**
 * Klasyfikacja feedera na szynie GPZ.
 */
export interface FeederClassification {
  /** ID feedera (= ID pierwszego sąsiada szyny GPZ na tej ścieżce) */
  readonly feederId: string;
  /** Typ feedera */
  readonly bayType: HybridBayType;
  /** Priorytet sortowania (mniejszy = bardziej na lewo) */
  readonly sortPriority: number;
  /** IDs węzłów w podgrafie feedera */
  readonly subgraphNodeIds: readonly string[];
}

// =============================================================================
// PRIORITY MAP (zgodna z engine/sld-layout/phase3-crossing-min)
// =============================================================================

const BAY_TYPE_PRIORITY: Record<HybridBayType, number> = {
  incomer: 1,
  measurement: 2,
  generator: 3,
  feeder: 5,
  oze_pv: 6,
  oze_wind: 7,
  bess: 8,
  auxiliary: 9,
  tie: 15,
  unknown: 20,
};

// =============================================================================
// CLASSIFICATION ALGORITHM
// =============================================================================

/**
 * Klasyfikuj feedery na szynie GPZ.
 *
 * Algorytm:
 * 1. Znajdź root SN bus (szyna GPZ)
 * 2. Dla każdego sąsiada szyny GPZ — BFS do zebrania podgrafu
 * 3. Klasyfikuj typ feedera na podstawie typów węzłów w podgrafie
 *
 * @param graph VisualGraphV1
 * @param rootBusIds Zbiór ID szyn GPZ (root SN buses)
 * @returns Klasyfikacje feederów, posortowane po priorytecie
 */
export function classifyFeeders(
  graph: VisualGraphV1,
  rootBusIds: ReadonlySet<string>,
): FeederClassification[] {
  // Build adjacency
  const adj = new Map<string, Array<{ nodeId: string; edge: VisualEdgeV1 }>>();
  for (const edge of graph.edges) {
    const from = edge.fromPortRef.nodeId;
    const to = edge.toPortRef.nodeId;
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    adj.get(from)!.push({ nodeId: to, edge });
    adj.get(to)!.push({ nodeId: from, edge });
  }

  // Collect direct neighbors of root buses
  const visited = new Set<string>(rootBusIds);
  const feederStarts: Array<{ nodeId: string; fromRootBusId: string }> = [];

  for (const rootId of [...rootBusIds].sort()) {
    const neighbors = adj.get(rootId) ?? [];
    for (const n of [...neighbors].sort((a, b) => a.nodeId.localeCompare(b.nodeId))) {
      if (visited.has(n.nodeId)) continue;
      feederStarts.push({ nodeId: n.nodeId, fromRootBusId: rootId });
    }
  }

  // BFS each feeder start to collect subgraph
  const results: FeederClassification[] = [];

  for (const start of feederStarts) {
    if (visited.has(start.nodeId)) continue;

    const subgraphNodeIds: string[] = [];
    const queue = [start.nodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      subgraphNodeIds.push(nodeId);

      const neighbors = adj.get(nodeId) ?? [];
      for (const n of [...neighbors].sort((a, b) => a.nodeId.localeCompare(b.nodeId))) {
        if (!visited.has(n.nodeId)) {
          queue.push(n.nodeId);
        }
      }
    }

    // Classify based on node types in subgraph
    const bayType = classifySubgraph(graph, subgraphNodeIds);

    results.push({
      feederId: start.nodeId,
      bayType,
      sortPriority: BAY_TYPE_PRIORITY[bayType],
      subgraphNodeIds,
    });
  }

  // Sort by priority, then by feederId for determinism
  results.sort((a, b) => {
    if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
    return a.feederId.localeCompare(b.feederId);
  });

  return results;
}

/**
 * Klasyfikuj podgraf feedera na podstawie typów węzłów.
 */
function classifySubgraph(graph: VisualGraphV1, nodeIds: string[]): HybridBayType {
  const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));

  let hasPV = false;
  let hasBESS = false;
  let hasWind = false;
  let hasGenerator = false;
  let hasStation = false;
  let hasLoad = false;
  let hasTransformerWnSn = false;
  let hasBusCoupler = false;

  for (const id of nodeIds) {
    const node = nodeMap.get(id);
    if (!node) continue;

    switch (node.nodeType) {
      case NodeTypeV1.GENERATOR_PV: hasPV = true; break;
      case NodeTypeV1.GENERATOR_BESS: hasBESS = true; break;
      case NodeTypeV1.GENERATOR_WIND: hasWind = true; break;
      case NodeTypeV1.GRID_SOURCE: hasGenerator = true; break;
      case NodeTypeV1.STATION_SN_NN_A:
      case NodeTypeV1.STATION_SN_NN_B:
      case NodeTypeV1.STATION_SN_NN_C:
      case NodeTypeV1.STATION_SN_NN_D:
      case NodeTypeV1.SWITCHGEAR_BLOCK:
        hasStation = true; break;
      case NodeTypeV1.LOAD: hasLoad = true; break;
      case NodeTypeV1.TRANSFORMER_WN_SN: hasTransformerWnSn = true; break;
    }
  }

  // Check for bus coupler edges
  for (const edge of graph.edges) {
    if (edge.edgeType === EdgeTypeV1.BUS_COUPLER) {
      if (nodeIds.includes(edge.fromPortRef.nodeId) || nodeIds.includes(edge.toPortRef.nodeId)) {
        hasBusCoupler = true;
      }
    }
  }

  // Classification priority
  if (hasTransformerWnSn) return 'incomer';
  if (hasBusCoupler) return 'tie';
  if (hasPV) return 'oze_pv';
  if (hasWind) return 'oze_wind';
  if (hasBESS) return 'bess';
  if (hasGenerator) return 'generator';
  if (hasStation || hasLoad) return 'feeder';

  return 'unknown';
}

/**
 * Priorytet typu bay (do crossing minimization).
 */
export function getBayTypeSortPriority(bayType: HybridBayType): number {
  return BAY_TYPE_PRIORITY[bayType];
}
