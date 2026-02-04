/**
 * AUTO-LAYOUT — Hierarchiczny algorytm rozmieszczania SLD (ETAP-style)
 *
 * CANONICAL ALIGNMENT:
 * - SLD_KANONICZNA_SPECYFIKACJA.md § 5: Auto-Layout
 * - Sugiyama framework (layer-based graph drawing)
 *
 * FEATURES:
 * - Deterministyczny (ten sam model → ten sam układ)
 * - Hierarchiczny (zasilanie góra→dół)
 * - Layered (szyny na poziomach)
 * - Minimalizacja skrzyżowań
 *
 * ALGORYTM:
 * 1. Budowa grafu z topologii
 * 2. Identyfikacja źródeł (roots)
 * 3. Przypisanie warstw (BFS od źródeł)
 * 4. Sortowanie w warstwach (minimalizacja skrzyżowań)
 * 5. Przypisanie współrzędnych X/Y
 */

import type { AnySldSymbol, BranchSymbol, Position, SwitchSymbol, NodeSymbol } from '../types';

// =============================================================================
// STAŁE KONFIGURACYJNE
// =============================================================================

/** Konfiguracja auto-layoutu */
export interface AutoLayoutConfig {
  /** Rozmiar siatki (px) */
  gridSize: number;
  /** Odstęp między warstwami (px) */
  layerSpacing: number;
  /** Odstęp między węzłami w warstwie (px) */
  nodeSpacing: number;
  /** Minimalna szerokość szyny (px) */
  busMinWidth: number;
  /** Szerokość symbolu (px) */
  symbolWidth: number;
  /** Wysokość symbolu (px) */
  symbolHeight: number;
  /** Kierunek layoutu */
  direction: 'top-down' | 'left-right';
  /** Padding od krawędzi (px) */
  padding: number;
}

/** Domyślna konfiguracja — PLANS STYLE SPINE LAYOUT */
export const DEFAULT_LAYOUT_CONFIG: AutoLayoutConfig = {
  gridSize: 20,
  layerSpacing: 140,      // Duży odstęp jak w Plans
  nodeSpacing: 100,
  busMinWidth: 200,       // Szeroka szyna jak w Plans
  symbolWidth: 60,
  symbolHeight: 40,
  direction: 'top-down',
  padding: 80,            // Większy padding dla czytelności
};

// =============================================================================
// TYPY WEWNĘTRZNE
// =============================================================================

/** Węzeł w grafie layoutu */
interface LayoutNode {
  id: string;
  symbolId: string;
  elementType: string;
  layer: number;
  order: number; // Pozycja w warstwie
  x: number;
  y: number;
  width: number;
  height: number;
  connections: string[]; // ID połączonych węzłów
}

/** Krawędź w grafie layoutu */
interface LayoutEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  symbolId: string; // ID symbolu Branch/Switch
}

/** Graf layoutu */
interface LayoutGraph {
  nodes: Map<string, LayoutNode>;
  edges: LayoutEdge[];
}

/** Wynik auto-layoutu */
export interface AutoLayoutResult {
  /** Nowe pozycje symboli */
  positions: Map<string, Position>;
  /** Informacje debugowe */
  debug: {
    layers: Map<number, string[]>;
    totalLayers: number;
    totalNodes: number;
  };
}

// =============================================================================
// GŁÓWNA FUNKCJA AUTO-LAYOUT
// =============================================================================

/**
 * Wygeneruj deterministyczny layout dla symboli SLD.
 *
 * DETERMINIZM: Ten sam zestaw symboli → ten sam układ
 *
 * @param symbols - Symbole SLD do rozmieszczenia
 * @param config - Konfiguracja layoutu (opcjonalna)
 * @returns Mapa ID symbolu → nowa pozycja
 */
export function generateAutoLayout(
  symbols: AnySldSymbol[],
  config: Partial<AutoLayoutConfig> = {}
): AutoLayoutResult {
  const cfg: AutoLayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };

  // 1. Buduj graf z symboli
  const graph = buildLayoutGraph(symbols);

  // 2. Znajdź źródła (węzły bez krawędzi wchodzących lub Source/Generator)
  const roots = findRoots(graph, symbols);

  // 3. Przypisz warstwy (BFS od źródeł)
  assignLayers(graph, roots);

  // 4. Sortuj węzły w warstwach (minimalizacja skrzyżowań)
  sortWithinLayers(graph);

  // 5. Oblicz współrzędne X/Y
  const positions = computeCoordinates(graph, cfg);

  // Zbierz informacje debugowe
  const layers = new Map<number, string[]>();
  graph.nodes.forEach((node) => {
    if (!layers.has(node.layer)) {
      layers.set(node.layer, []);
    }
    layers.get(node.layer)!.push(node.symbolId);
  });

  return {
    positions,
    debug: {
      layers,
      totalLayers: Math.max(...Array.from(graph.nodes.values()).map((n) => n.layer)) + 1,
      totalNodes: graph.nodes.size,
    },
  };
}

// =============================================================================
// KROK 1: BUDOWA GRAFU
// =============================================================================

/**
 * Buduj graf layoutu z symboli SLD.
 */
function buildLayoutGraph(symbols: AnySldSymbol[]): LayoutGraph {
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];

  // Mapuj element ID → symbol ID dla szybkiego lookup
  const elementToSymbol = new Map<string, string>();
  symbols.forEach((s) => elementToSymbol.set(s.elementId, s.id));

  // Dodaj węzły (Bus, Source, Load)
  symbols.forEach((symbol) => {
    if (symbol.elementType === 'Bus' || symbol.elementType === 'Source' || symbol.elementType === 'Load') {
      const nodeSymbol = symbol as NodeSymbol;
      nodes.set(symbol.id, {
        id: symbol.id,
        symbolId: symbol.id,
        elementType: symbol.elementType,
        layer: -1, // Nieprzypisana
        order: 0,
        x: 0,
        y: 0,
        width: symbol.elementType === 'Bus' && 'width' in symbol ? nodeSymbol.width : 60,
        height: symbol.elementType === 'Bus' && 'height' in symbol ? nodeSymbol.height : 40,
        connections: [],
      });
    }
  });

  // Dodaj krawędzie (Branch, Switch) i połączenia
  symbols.forEach((symbol) => {
    if (symbol.elementType === 'LineBranch' || symbol.elementType === 'TransformerBranch') {
      const branch = symbol as BranchSymbol;
      const fromSymbolId = elementToSymbol.get(branch.fromNodeId);
      const toSymbolId = elementToSymbol.get(branch.toNodeId);

      if (fromSymbolId && toSymbolId) {
        edges.push({
          id: `edge_${symbol.id}`,
          fromNodeId: fromSymbolId,
          toNodeId: toSymbolId,
          symbolId: symbol.id,
        });

        // Dodaj połączenia do węzłów
        const fromNode = nodes.get(fromSymbolId);
        const toNode = nodes.get(toSymbolId);
        if (fromNode) fromNode.connections.push(toSymbolId);
        if (toNode) toNode.connections.push(fromSymbolId);
      }
    }

    if (symbol.elementType === 'Switch') {
      const sw = symbol as SwitchSymbol;
      const fromSymbolId = elementToSymbol.get(sw.fromNodeId);
      const toSymbolId = elementToSymbol.get(sw.toNodeId);

      if (fromSymbolId && toSymbolId) {
        edges.push({
          id: `edge_${symbol.id}`,
          fromNodeId: fromSymbolId,
          toNodeId: toSymbolId,
          symbolId: symbol.id,
        });

        const fromNode = nodes.get(fromSymbolId);
        const toNode = nodes.get(toSymbolId);
        if (fromNode) fromNode.connections.push(toSymbolId);
        if (toNode) toNode.connections.push(fromSymbolId);
      }
    }

    // Source i Load mają connectedToNodeId
    if (symbol.elementType === 'Source' || symbol.elementType === 'Load') {
      const connectedNodeId = (symbol as any).connectedToNodeId;
      if (connectedNodeId) {
        const connectedSymbolId = elementToSymbol.get(connectedNodeId);
        if (connectedSymbolId) {
          edges.push({
            id: `edge_${symbol.id}`,
            fromNodeId: symbol.id,
            toNodeId: connectedSymbolId,
            symbolId: symbol.id,
          });

          const sourceNode = nodes.get(symbol.id);
          const connectedNode = nodes.get(connectedSymbolId);
          if (sourceNode) sourceNode.connections.push(connectedSymbolId);
          if (connectedNode) connectedNode.connections.push(symbol.id);
        }
      }
    }
  });

  return { nodes, edges };
}

// =============================================================================
// KROK 2: ZNAJDŹ ŹRÓDŁA (ROOTS)
// =============================================================================

/**
 * Znajdź węzły źródłowe (Source, lub węzły bez krawędzi wchodzących).
 */
function findRoots(graph: LayoutGraph, _symbols: AnySldSymbol[]): string[] {
  const roots: string[] = [];

  // Priorytet 1: Source (utility_feeder, generator, pv, fw, bess)
  graph.nodes.forEach((layoutNode, id) => {
    if (layoutNode.elementType === 'Source') {
      roots.push(id);
    }
  });

  // Jeśli brak Source, znajdź węzły bez krawędzi wchodzących
  if (roots.length === 0) {
    const hasIncoming = new Set<string>();
    graph.edges.forEach((edge) => {
      hasIncoming.add(edge.toNodeId);
    });

    graph.nodes.forEach((_layoutNode, id) => {
      if (!hasIncoming.has(id)) {
        roots.push(id);
      }
    });
  }

  // Fallback: pierwszy węzeł Bus (sortowany po ID dla determinizmu)
  if (roots.length === 0) {
    const busNodes = Array.from(graph.nodes.values())
      .filter((n) => n.elementType === 'Bus')
      .sort((a, b) => a.id.localeCompare(b.id));
    if (busNodes.length > 0) {
      roots.push(busNodes[0].id);
    }
  }

  // DETERMINIZM: Sortuj roots
  roots.sort();

  return roots;
}

// =============================================================================
// KROK 3: PRZYPISZ WARSTWY (BFS)
// =============================================================================

/**
 * Przypisz warstwy węzłom (BFS od źródeł).
 * Źródła mają layer=0, sąsiedzi layer=1, itd.
 */
function assignLayers(graph: LayoutGraph, roots: string[]): void {
  const visited = new Set<string>();
  const queue: Array<{ id: string; layer: number }> = [];

  // Inicjalizuj kolejkę źródłami
  roots.forEach((rootId) => {
    queue.push({ id: rootId, layer: 0 });
    visited.add(rootId);
  });

  // BFS
  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    const node = graph.nodes.get(id);
    if (!node) continue;

    node.layer = layer;

    // Dodaj sąsiadów do kolejki
    node.connections.forEach((neighborId) => {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({ id: neighborId, layer: layer + 1 });
      }
    });
  }

  // Przypisz nieodwiedzone węzły do ostatniej warstwy (wyspy)
  const maxLayer = Math.max(...Array.from(graph.nodes.values()).map((n) => n.layer), 0);
  graph.nodes.forEach((node) => {
    if (node.layer === -1) {
      node.layer = maxLayer + 1;
    }
  });
}

// =============================================================================
// KROK 4: SORTUJ W WARSTWACH (MINIMALIZACJA SKRZYŻOWAŃ)
// =============================================================================

/**
 * Sortuj węzły w każdej warstwie, minimalizując skrzyżowania.
 * Używa heurystyki barycentric (średnia pozycja sąsiadów).
 */
function sortWithinLayers(graph: LayoutGraph): void {
  // Grupuj węzły po warstwach
  const layers = new Map<number, LayoutNode[]>();
  graph.nodes.forEach((node) => {
    if (!layers.has(node.layer)) {
      layers.set(node.layer, []);
    }
    layers.get(node.layer)!.push(node);
  });

  // Sortuj każdą warstwę
  const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);

  sortedLayers.forEach((layerNum, layerIndex) => {
    const nodesInLayer = layers.get(layerNum)!;

    if (layerIndex === 0) {
      // Pierwsza warstwa: sortuj po ID (determinizm)
      nodesInLayer.sort((a, b) => a.id.localeCompare(b.id));
    } else {
      // Pozostałe warstwy: barycentric ordering
      const prevLayer = layers.get(sortedLayers[layerIndex - 1]) || [];
      const prevPositions = new Map<string, number>();
      prevLayer.forEach((node, idx) => prevPositions.set(node.id, idx));

      // Oblicz barycenter dla każdego węzła
      nodesInLayer.forEach((node) => {
        const neighborPositions = node.connections
          .filter((nId) => prevPositions.has(nId))
          .map((nId) => prevPositions.get(nId)!);

        if (neighborPositions.length > 0) {
          node.order = neighborPositions.reduce((a, b) => a + b, 0) / neighborPositions.length;
        } else {
          node.order = Infinity; // Węzły bez sąsiadów w poprzedniej warstwie na końcu
        }
      });

      // Sortuj po barycenter, tie-break po ID
      nodesInLayer.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.id.localeCompare(b.id);
      });
    }

    // Przypisz finalne order
    nodesInLayer.forEach((node, idx) => {
      node.order = idx;
    });
  });
}

// =============================================================================
// KROK 5: OBLICZ WSPÓŁRZĘDNE X/Y — SPINE LAYOUT (PLANS STYLE)
// =============================================================================

/**
 * Oblicz finalne współrzędne X/Y dla każdego węzła.
 *
 * SPINE LAYOUT (inspiracja Plans):
 * - Główna ścieżka (spine) na jednej osi X
 * - Elementy ułożone PIONOWO (góra → dół)
 * - Szyny poziome w wyznaczonych miejscach
 * - Odbiory i źródła jako gałęzie boczne
 */
function computeCoordinates(
  graph: LayoutGraph,
  config: AutoLayoutConfig
): Map<string, Position> {
  const positions = new Map<string, Position>();

  // Grupuj po warstwach
  const layers = new Map<number, LayoutNode[]>();
  graph.nodes.forEach((node) => {
    if (!layers.has(node.layer)) {
      layers.set(node.layer, []);
    }
    layers.get(node.layer)!.push(node);
  });

  // SPINE LAYOUT: Oblicz centralną oś X
  // Dla większości topologii sieci SN/nN używamy jednej osi pionowej
  const maxNodesInLayer = Math.max(...Array.from(layers.values()).map(l => l.length), 1);

  // Oblicz szerokość canvas potrzebną dla bocznych gałęzi
  const canvasWidth = config.padding * 2 + maxNodesInLayer * config.nodeSpacing;
  const SPINE_X = Math.round(canvasWidth / 2 / config.gridSize) * config.gridSize;

  // Oblicz pozycje
  const sortedLayerNums = Array.from(layers.keys()).sort((a, b) => a - b);

  sortedLayerNums.forEach((layerNum) => {
    const nodesInLayer = layers.get(layerNum)!;
    // Sortuj po order
    nodesInLayer.sort((a, b) => a.order - b.order);

    nodesInLayer.forEach((node, idx) => {
      let x: number;
      let y: number;

      if (config.direction === 'top-down') {
        // SPINE LAYOUT: Główna oś na środku
        if (nodesInLayer.length === 1) {
          // Pojedynczy węzeł na warstwie → na spine
          x = SPINE_X;
        } else {
          // Wiele węzłów na warstwie → rozłóż wokół spine
          const layerWidth = (nodesInLayer.length - 1) * config.nodeSpacing;
          const startX = SPINE_X - layerWidth / 2;
          x = startX + idx * config.nodeSpacing;
        }
        y = config.padding + layerNum * config.layerSpacing;
      } else {
        // left-right (rzadko używane dla SLD)
        x = config.padding + layerNum * config.layerSpacing;
        if (nodesInLayer.length === 1) {
          y = SPINE_X;
        } else {
          const layerHeight = (nodesInLayer.length - 1) * config.nodeSpacing;
          const startY = SPINE_X - layerHeight / 2;
          y = startY + idx * config.nodeSpacing;
        }
      }

      // Snap to grid
      x = Math.round(x / config.gridSize) * config.gridSize;
      y = Math.round(y / config.gridSize) * config.gridSize;

      node.x = x;
      node.y = y;

      positions.set(node.symbolId, { x, y });
    });
  });

  return positions;
}

// =============================================================================
// FUNKCJE POMOCNICZE
// =============================================================================

/**
 * Zastosuj wynik auto-layoutu do symboli.
 *
 * @param symbols - Oryginalne symbole
 * @param positions - Nowe pozycje z auto-layoutu
 * @returns Symbole z nowymi pozycjami
 */
export function applyLayoutToSymbols(
  symbols: AnySldSymbol[],
  positions: Map<string, Position>
): AnySldSymbol[] {
  return symbols.map((symbol) => {
    const newPos = positions.get(symbol.id);
    if (newPos) {
      return { ...symbol, position: newPos };
    }
    return symbol;
  });
}

/**
 * Weryfikuj czy layout jest deterministyczny.
 *
 * @param symbols - Symbole SLD
 * @returns true jeśli layout jest deterministyczny
 */
export function verifyLayoutDeterminism(symbols: AnySldSymbol[]): boolean {
  const result1 = generateAutoLayout(symbols);
  const result2 = generateAutoLayout(symbols);

  // Porównaj pozycje
  for (const [id, pos1] of result1.positions) {
    const pos2 = result2.positions.get(id);
    if (!pos2 || pos1.x !== pos2.x || pos1.y !== pos2.y) {
      return false;
    }
  }

  return true;
}
