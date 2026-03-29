/**
 * Force-Directed Layout — algorytm Fruchtermana-Reingolda.
 *
 * Rozmieszcza węzły sieci elektrycznej stosując siły sprężyn (krawędzie)
 * i odpychania (pary węzłów). GPZ jest zakotwiczony.
 *
 * DETERMINIZM:
 * - Węzły sortowane lexicographic by ID przed każdą iteracją
 * - Brak Math.random()
 * - Wynik snapowany do GRID_BASE = 20 px
 *
 * REFERENCJE: Fruchterman & Reingold (1991), "Graph Drawing by Force-directed Placement"
 */

// =============================================================================
// TYPY
// =============================================================================

export interface FDNode {
  /** Unikalny ID węzła */
  id: string;
  /** Typ elementu (używany do identyfikacji GPZ) */
  elementType: string;
  /** Napięcie znamionowe [kV] (do identyfikacji GPZ jako najwyższe napięcie) */
  voltageKV?: number;
}

export interface FDEdge {
  fromId: string;
  toId:   string;
}

export interface ForceDirectedConfig {
  /** Liczba iteracji. Domyślnie 150. */
  iterations: number;
  /** Naturalna długość sprężyny [px]. Domyślnie 120. */
  springLength: number;
  /** Siła sprężyny. Domyślnie 0.05. */
  springStrength: number;
  /** Siła odpychania. Domyślnie 8000. */
  repulsionStrength: number;
  /** Minimalna odległość między węzłami [px]. Domyślnie 80. */
  minDistance: number;
  /** Maksymalna odległość [px]. Domyślnie 400. */
  maxDistance: number;
  /** Tłumienie drgań (0–1). Domyślnie 0.85. */
  damping: number;
  /** Próg zbieżności [px]. Domyślnie 0.5. */
  convergenceThreshold: number;
  /** Snap do siatki [px]. Domyślnie 20 (GRID_BASE). */
  snapToGrid: number;
  /** IDs węzłów o stałej pozycji (np. GPZ). */
  fixedNodes: Set<string>;
}

export const DEFAULT_FORCE_CONFIG: ForceDirectedConfig = {
  iterations:           150,
  springLength:         120,
  springStrength:       0.05,
  repulsionStrength:    8_000,
  minDistance:          80,
  maxDistance:          400,
  damping:              0.85,
  convergenceThreshold: 0.5,
  snapToGrid:           20,
  fixedNodes:           new Set(),
};

interface Point { x: number; y: number; }

// Pozycja startowa GPZ (z IndustrialAesthetics)
const GPZ_X = 40;  // X_START
const GPZ_Y = 60;  // Y_GPZ

// =============================================================================
// GŁÓWNA FUNKCJA
// =============================================================================

/**
 * Oblicza rozmieszczenie węzłów algorytmem force-directed.
 *
 * @param nodes  - węzły do rozmieszczenia
 * @param edges  - krawędzie (połączenia)
 * @param config - konfiguracja (opcjonalna)
 * @returns mapa nodeId → {x, y} snapnięta do GRID_BASE
 */
export function computeForceDirectedLayout(
  nodes:  readonly FDNode[],
  edges:  readonly FDEdge[],
  config?: Partial<ForceDirectedConfig>
): Map<string, Point> {
  if (nodes.length === 0) return new Map();

  const cfg: ForceDirectedConfig = {
    ...DEFAULT_FORCE_CONFIG,
    ...config,
    fixedNodes: config?.fixedNodes ?? new Set(),
  };

  // Identyfikuj GPZ (Source z najwyższym napięciem)
  const gpzId = findGpzId(nodes);
  if (gpzId) cfg.fixedNodes.add(gpzId);

  // Inicjalizuj pozycje (deterministycznie)
  const positions = initPositions(nodes, gpzId, cfg);
  const velocities = new Map<string, Point>(nodes.map((n) => [n.id, { x: 0, y: 0 }]));

  // Iteracje
  for (let iter = 0; iter < cfg.iterations; iter++) {
    // Sortuj węzły dla determinizmu
    const sortedIds = [...nodes.map((n) => n.id)].sort();

    const forces = new Map<string, Point>(sortedIds.map((id) => [id, { x: 0, y: 0 }]));

    // Siły odpychania (wszystkie pary)
    applyRepulsion(sortedIds, positions, forces, cfg);

    // Siły przyciągania (krawędzie)
    applyAttraction(edges, positions, forces, cfg);

    // Przesuń węzły
    let maxDisplacement = 0;
    for (const id of sortedIds) {
      if (cfg.fixedNodes.has(id)) continue;

      const pos = positions.get(id)!;
      const vel = velocities.get(id)!;
      const force = forces.get(id)!;

      // Zaktualizuj prędkość z tłumieniem
      const newVx = (vel.x + force.x) * cfg.damping;
      const newVy = (vel.y + force.y) * cfg.damping;
      velocities.set(id, { x: newVx, y: newVy });

      // Clamp do maxDistance
      const displacement = Math.sqrt(newVx * newVx + newVy * newVy);
      const scale = displacement > 0
        ? Math.min(displacement, cfg.maxDistance / cfg.iterations) / displacement
        : 0;

      const newX = pos.x + newVx * scale;
      const newY = pos.y + newVy * scale;

      positions.set(id, { x: newX, y: newY });
      maxDisplacement = Math.max(maxDisplacement, displacement);
    }

    // Warunek zbieżności
    if (maxDisplacement < cfg.convergenceThreshold) break;
  }

  // Snap do siatki
  const result = new Map<string, Point>();
  for (const [id, pos] of positions) {
    result.set(id, snapPoint(pos, cfg.snapToGrid));
  }
  return result;
}

// =============================================================================
// POMOCNICZE
// =============================================================================

function findGpzId(nodes: readonly FDNode[]): string | null {
  // GPZ = węzeł Source z najwyższym napięciem lub pierwszym w kolejności
  const sources = nodes.filter((n) => n.elementType === 'Source' || n.elementType === 'GridSource');
  if (sources.length === 0) return null;

  // Sortuj by voltageKV desc, then by id asc (determinizm)
  const sorted = [...sources].sort((a, b) => {
    const va = a.voltageKV ?? 0;
    const vb = b.voltageKV ?? 0;
    if (vb !== va) return vb - va;
    return a.id.localeCompare(b.id);
  });
  return sorted[0].id;
}

function initPositions(
  nodes:  readonly FDNode[],
  gpzId:  string | null,
  cfg:    ForceDirectedConfig
): Map<string, Point> {
  const positions = new Map<string, Point>();

  // Sortuj węzły dla determinizmu
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

  // GPZ na stałej pozycji
  if (gpzId) {
    positions.set(gpzId, { x: GPZ_X, y: GPZ_Y });
  }

  // Pozostałe: ułóż na siatce (deterministycznie, spiralnie od GPZ)
  let idx = 0;
  for (const node of sorted) {
    if (gpzId && node.id === gpzId) continue;

    // Siatka kolumna × wiersz
    const col = idx % 5;
    const row = Math.floor(idx / 5);
    const x = GPZ_X + (col + 1) * cfg.springLength;
    const y = GPZ_Y + (row + 1) * cfg.springLength;
    positions.set(node.id, { x, y });
    idx++;
  }

  return positions;
}

function applyRepulsion(
  sortedIds: string[],
  positions: Map<string, Point>,
  forces:    Map<string, Point>,
  cfg:       ForceDirectedConfig
): void {
  for (let i = 0; i < sortedIds.length; i++) {
    for (let j = i + 1; j < sortedIds.length; j++) {
      const idA = sortedIds[i];
      const idB = sortedIds[j];
      const posA = positions.get(idA)!;
      const posB = positions.get(idB)!;

      const dx = posA.x - posB.x;
      const dy = posA.y - posB.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

      // Coulomb's law: F = k / dist²
      const force = cfg.repulsionStrength / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      const fa = forces.get(idA)!;
      const fb = forces.get(idB)!;
      forces.set(idA, { x: fa.x + fx, y: fa.y + fy });
      forces.set(idB, { x: fb.x - fx, y: fb.y - fy });
    }
  }
}

function applyAttraction(
  edges:     readonly FDEdge[],
  positions: Map<string, Point>,
  forces:    Map<string, Point>,
  cfg:       ForceDirectedConfig
): void {
  // Sortuj krawędzie dla determinizmu
  const sorted = [...edges].sort((a, b) => {
    const ka = `${a.fromId}→${a.toId}`;
    const kb = `${b.fromId}→${b.toId}`;
    return ka.localeCompare(kb);
  });

  for (const edge of sorted) {
    const posA = positions.get(edge.fromId);
    const posB = positions.get(edge.toId);
    if (!posA || !posB) continue;

    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

    // Hooke's law: F = k * (dist - springLength)
    const force = cfg.springStrength * (dist - cfg.springLength);
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    const fa = forces.get(edge.fromId);
    const fb = forces.get(edge.toId);
    if (fa) forces.set(edge.fromId, { x: fa.x + fx, y: fa.y + fy });
    if (fb) forces.set(edge.toId,   { x: fb.x - fx, y: fb.y - fy });
  }
}

function snapPoint(p: Point, grid: number): Point {
  return {
    x: Math.round(p.x / grid) * grid,
    y: Math.round(p.y / grid) * grid,
  };
}
