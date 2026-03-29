/**
 * Greedy Placement — BFS-based deterministyczne rozmieszczanie węzłów.
 *
 * Zaczyna od GPZ na (X_START, Y_GPZ), kolejno rozmieszcza sąsiadów
 * w stałych odstępach (preferredStepX, preferredStepY).
 *
 * DETERMINIZM:
 * - BFS w kolejności rosnących ID (lexicographic)
 * - Snap do GRID_BASE = 20 px
 * - Brak Math.random()
 */

import type { FDNode, FDEdge } from './force-directed';

// =============================================================================
// TYPY
// =============================================================================

export interface GreedyConfig {
  /** Minimalna odległość między elementami [px]. Domyślnie 80. */
  minDistance: number;
  /** Maksymalna odległość [px]. Domyślnie 400. */
  maxDistance: number;
  /** Preferowany krok poziomy [px] = PITCH_FIELD_X. Domyślnie 280. */
  preferredStepX: number;
  /** Preferowany krok pionowy [px] = TRUNK_STEP_Y. Domyślnie 100. */
  preferredStepY: number;
  /** Snap do siatki [px]. Domyślnie 20 (GRID_BASE). */
  snapToGrid: number;
}

export const DEFAULT_GREEDY_CONFIG: GreedyConfig = {
  minDistance:    80,
  maxDistance:    400,
  preferredStepX: 280,   // PITCH_FIELD_X / GRID_SPACING_MAIN
  preferredStepY: 100,   // TRUNK_STEP_Y
  snapToGrid:     20,    // GRID_BASE
};

interface Point { x: number; y: number; }

// Stałe z IndustrialAesthetics
const GPZ_X = 40;   // X_START
const GPZ_Y = 60;   // Y_GPZ

// =============================================================================
// GŁÓWNA FUNKCJA
// =============================================================================

/**
 * BFS-based greedy placement.
 *
 * @param nodes  - węzły do rozmieszczenia
 * @param edges  - krawędzie (połączenia)
 * @param config - konfiguracja (opcjonalna)
 * @returns mapa nodeId → {x,y} snapnięta do GRID_BASE
 */
export function computeGreedyPlacement(
  nodes:   readonly FDNode[],
  edges:   readonly FDEdge[],
  config?: Partial<GreedyConfig>
): Map<string, Point> {
  if (nodes.length === 0) return new Map();

  const cfg: GreedyConfig = { ...DEFAULT_GREEDY_CONFIG, ...config };

  // Zbuduj graf sąsiedztwa
  const adjacency = buildAdjacency(nodes, edges);

  // Identyfikuj GPZ
  const gpzId = findGpzNode(nodes);

  const positions = new Map<string, Point>();
  const visited   = new Set<string>();

  // Zacznij od GPZ
  const startId = gpzId ?? [...nodes].sort((a, b) => a.id.localeCompare(b.id))[0].id;
  positions.set(startId, { x: GPZ_X, y: GPZ_Y });
  visited.add(startId);

  // BFS queue: [nodeId, parentId | null]
  const queue: Array<[string, string | null]> = [[startId, null]];

  while (queue.length > 0) {
    const [currentId, parentId] = queue.shift()!;
    const currentPos = positions.get(currentId)!;

    // Pobierz sąsiadów — sortuj lexicographic dla determinizmu
    const neighbors = (adjacency.get(currentId) ?? []).sort();

    let childIndex = 0;
    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);

      const pos = computeChildPosition(
        currentPos,
        parentId ? positions.get(parentId) ?? null : null,
        childIndex,
        cfg
      );
      positions.set(neighborId, pos);
      queue.push([neighborId, currentId]);
      childIndex++;
    }
  }

  // Rozmieść węzły bez połączeń (izolowane) w rzędzie na dole
  const isolated = [...nodes]
    .filter((n) => !positions.has(n.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  for (let i = 0; i < isolated.length; i++) {
    positions.set(isolated[i].id, {
      x: snap(GPZ_X + i * cfg.preferredStepX, cfg.snapToGrid),
      y: snap(GPZ_Y + 5 * cfg.preferredStepY, cfg.snapToGrid),
    });
  }

  // Snap do siatki
  const result = new Map<string, Point>();
  for (const [id, pos] of positions) {
    result.set(id, { x: snap(pos.x, cfg.snapToGrid), y: snap(pos.y, cfg.snapToGrid) });
  }
  return result;
}

// =============================================================================
// POMOCNICZE
// =============================================================================

function buildAdjacency(nodes: readonly FDNode[], edges: readonly FDEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const edge of edges) {
    adj.get(edge.fromId)?.push(edge.toId);
    adj.get(edge.toId)?.push(edge.fromId);
  }
  return adj;
}

function findGpzNode(nodes: readonly FDNode[]): string | null {
  const sources = nodes.filter((n) => n.elementType === 'Source' || n.elementType === 'GridSource');
  if (sources.length === 0) return null;
  return [...sources].sort((a, b) => {
    const va = a.voltageKV ?? 0;
    const vb = b.voltageKV ?? 0;
    if (vb !== va) return vb - va;
    return a.id.localeCompare(b.id);
  })[0].id;
}

function computeChildPosition(
  parentPos:     Point,
  grandParentPos: Point | null,
  childIndex:    number,
  cfg:           GreedyConfig
): Point {
  // Określ kierunek główny (od dziadka do rodzica)
  const mainDirY = grandParentPos
    ? Math.sign(parentPos.y - grandParentPos.y) || 1
    : 1;

  // Pierwsze dziecko: kontynuuje kierunek główny (in-line)
  // Kolejne dzieci: rozchodzą się na boki
  if (childIndex === 0) {
    // Kontynuacja trunk
    if (mainDirY !== 0) {
      return { x: parentPos.x, y: parentPos.y + mainDirY * cfg.preferredStepY };
    }
    return { x: parentPos.x + cfg.preferredStepX, y: parentPos.y + cfg.preferredStepY };
  }

  // Branch: bocznie od pozycji rodzica
  const side = childIndex % 2 === 0 ? 1 : -1;
  const level = Math.ceil(childIndex / 2);
  return {
    x: parentPos.x + side * level * cfg.preferredStepX,
    y: parentPos.y + cfg.preferredStepY,
  };
}

function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}
