/**
 * Phase 5: Edge Routing + Label Placement
 *
 * ZADANIE: Wytrasuj połączenia i rozmieść etykiety.
 *
 * EDGE ROUTING:
 * - Wszystkie edges orthogonalne (0° lub 90°)
 * - Elementy w tym samym bayu → linia pionowa (trivial)
 * - Element do busbara → linia pionowa od elementu DO busbara
 * - Tie-breaker (busbar do busbar) → linia pozioma lub L-kształtna
 * - Cross-bay connection → orthogonal router z omijaniem przeszkód
 *
 * LABEL PLACEMENT:
 * - Domyślnie: prawy-bok elementu
 * - Jeśli kolizja → próbuj: lewo, góra, dół
 * - Jeśli wszystkie kolizje → odsuwaj label dalej
 */

import type {
  BusbarGeometry,
  ElementPosition,
  LabelPosition,
  LayoutConfig,
  LayoutSymbol,
  PathSegment,
  PipelineContext,
  Point,
  Rectangle,
  RoutedEdge,
} from './types';
import { routeWithAstar } from './algorithms/astar-router';
import { placeLabelsNonOverlapping } from './algorithms/label-placer';

// =============================================================================
// AESTHETICS CONFIG — PHASE 5 LABEL PLACEMENT PARAMETERS
// =============================================================================

/** Maximum distance from label to anchor element (px) */
export const LABEL_MAX_DISTANCE_PX = 180;

// =============================================================================
// GŁÓWNA FUNKCJA FAZY 5
// =============================================================================

/**
 * Faza 5: Routing i etykiety.
 *
 * @param context - Kontekst pipeline
 * @returns Zaktualizowany kontekst z routedEdges i labelPositions
 */
export function routeEdgesAndPlaceLabels(context: PipelineContext): PipelineContext {
  const { symbols, symbolById, elementToSymbol, config, positions, busbarGeometries } = context;

  if (!positions || positions.size === 0) {
    return {
      ...context,
      routedEdges: new Map(),
      labelPositions: new Map(),
    };
  }

  // Zbuduj listę przeszkód z pozycji elementów (dla A* routingu)
  const obstacles: Rectangle[] = buildObstaclesFromPositions(positions);

  // Krok 1: Generuj trasy dla wszystkich połączeń
  const routedEdges = generateEdgeRoutes(
    symbols,
    symbolById,
    elementToSymbol,
    positions,
    busbarGeometries ?? new Map(),
    config,
    obstacles
  );

  // Krok 2: Rozmieść etykiety (smart 8-kierunkowe)
  const labelPositions = placeLabelsSmart(symbols, positions, routedEdges, config);

  return {
    ...context,
    routedEdges,
    labelPositions,
  };
}

/**
 * Zbuduj listę przeszkód z pozycji elementów.
 * Używane przez A* router do omijania elementów na schemacie.
 */
function buildObstaclesFromPositions(positions: Map<string, ElementPosition>): Rectangle[] {
  const obstacles: Rectangle[] = [];
  for (const pos of positions.values()) {
    // Dodaj margines wokół bounds dla routingu
    const margin = 8;
    obstacles.push({
      x:      pos.bounds.x      - margin,
      y:      pos.bounds.y      - margin,
      width:  pos.bounds.width  + 2 * margin,
      height: pos.bounds.height + 2 * margin,
    });
  }
  return obstacles;
}

// =============================================================================
// EDGE ROUTING
// =============================================================================

/**
 * Generuj trasy dla wszystkich połączeń.
 */
function generateEdgeRoutes(
  symbols: LayoutSymbol[],
  _symbolById: Map<string, LayoutSymbol>,
  elementToSymbol: Map<string, string>,
  positions: Map<string, ElementPosition>,
  busbarGeometries: Map<string, BusbarGeometry>,
  config: LayoutConfig,
  obstacles?: Rectangle[]
): Map<string, RoutedEdge> {
  const edges = new Map<string, RoutedEdge>();

  // Znajdź wszystkie połączenia
  for (const symbol of symbols) {
    // Branch (Line, Transformer)
    if (
      (symbol.elementType === 'LineBranch' || symbol.elementType === 'TransformerBranch') &&
      symbol.fromNodeId &&
      symbol.toNodeId
    ) {
      const fromSymbolId = elementToSymbol.get(symbol.fromNodeId);
      const toSymbolId = elementToSymbol.get(symbol.toNodeId);

      if (fromSymbolId && toSymbolId) {
        const edge = routeEdge(
          symbol.id,
          fromSymbolId,
          toSymbolId,
          'branch',
          positions,
          busbarGeometries,
          config,
          obstacles
        );
        if (edge) {
          edges.set(edge.id, edge);
        }
      }
    }

    // Switch
    if (symbol.elementType === 'Switch' && symbol.fromNodeId && symbol.toNodeId) {
      const fromSymbolId = elementToSymbol.get(symbol.fromNodeId);
      const toSymbolId = elementToSymbol.get(symbol.toNodeId);

      if (fromSymbolId && toSymbolId) {
        const edge = routeEdge(
          symbol.id,
          fromSymbolId,
          toSymbolId,
          'switch',
          positions,
          busbarGeometries,
          config,
          obstacles
        );
        if (edge) {
          edges.set(edge.id, edge);
        }
      }
    }

    // Source
    if (symbol.elementType === 'Source' && symbol.connectedToNodeId) {
      const toSymbolId = elementToSymbol.get(symbol.connectedToNodeId);

      if (toSymbolId) {
        const edge = routeEdge(
          symbol.id,
          symbol.id,
          toSymbolId,
          'source',
          positions,
          busbarGeometries,
          config,
          obstacles
        );
        if (edge) {
          edges.set(edge.id, edge);
        }
      }
    }

    // Load
    if (symbol.elementType === 'Load' && symbol.connectedToNodeId) {
      const toSymbolId = elementToSymbol.get(symbol.connectedToNodeId);

      if (toSymbolId) {
        const edge = routeEdge(
          symbol.id,
          toSymbolId,
          symbol.id,
          'load',
          positions,
          busbarGeometries,
          config,
          obstacles
        );
        if (edge) {
          edges.set(edge.id, edge);
        }
      }
    }
  }

  return edges;
}

/**
 * Wytrasuj pojedynczą krawędź.
 */
function routeEdge(
  symbolId: string,
  fromSymbolId: string,
  toSymbolId: string,
  connectionType: 'branch' | 'switch' | 'source' | 'load' | 'busbar',
  positions: Map<string, ElementPosition>,
  _busbarGeometries: Map<string, BusbarGeometry>,
  config: LayoutConfig,
  obstacles?: Rectangle[]
): RoutedEdge | null {
  const fromPos = positions.get(fromSymbolId);
  const toPos = positions.get(toSymbolId);

  if (!fromPos || !toPos) return null;

  // Określ porty
  const { fromPort, toPort } = determinePortsForConnection(fromPos, toPos);

  // Oblicz punkty startowy i końcowy
  const startPoint = getPortPosition(fromPos, fromPort);
  const endPoint = getPortPosition(toPos, toPort);

  // Wybierz strategię routingu:
  // - Cross-band (różne pasma napięciowe) z przeszkodami → A*
  // - Pozostałe → trivial L-path
  const isCrossBand = fromPos.voltageBandId !== toPos.voltageBandId;
  let path: Point[];
  let segments: ReturnType<typeof pathToSegments>;

  if (isCrossBand && obstacles && obstacles.length > 0) {
    // A* routing z omijaniem przeszkód
    const astarResult = routeWithAstar(startPoint, endPoint, {
      gridSize:     config.gridSize,
      obstacles,
      channelWidth: config.gridSize * 2,
      maxIterations: 10_000,
    });
    segments = astarResult.segments;
    path = segments.length > 0
      ? [segments[0].from, ...segments.map((s) => s.to)]
      : [startPoint, endPoint];
  } else {
    path = routeOrthogonalPath(startPoint, endPoint, fromPos, toPos, config);
    segments = pathToSegments(path);
  }

  return {
    id: `edge_${symbolId}`,
    fromSymbolId,
    fromPort,
    toSymbolId,
    toPort,
    path,
    segments,
    connectionType,
    voltageBandId: fromPos.voltageBandId,
  };
}

/**
 * Określ porty dla połączenia.
 */
function determinePortsForConnection(
  fromPos: ElementPosition,
  toPos: ElementPosition
): { fromPort: 'top' | 'bottom' | 'left' | 'right'; toPort: 'top' | 'bottom' | 'left' | 'right' } {
  const dx = toPos.position.x - fromPos.position.x;
  const dy = toPos.position.y - fromPos.position.y;

  // Preferuj połączenia pionowe (top/bottom)
  if (Math.abs(dy) > Math.abs(dx) * 0.5) {
    if (dy > 0) {
      return { fromPort: 'bottom', toPort: 'top' };
    } else {
      return { fromPort: 'top', toPort: 'bottom' };
    }
  }

  // Połączenia poziome (left/right)
  if (dx > 0) {
    return { fromPort: 'right', toPort: 'left' };
  } else {
    return { fromPort: 'left', toPort: 'right' };
  }
}

/**
 * Pobierz pozycję portu.
 */
function getPortPosition(
  elementPos: ElementPosition,
  port: 'top' | 'bottom' | 'left' | 'right'
): Point {
  const { position, size } = elementPos;

  switch (port) {
    case 'top':
      return { x: position.x, y: position.y - size.height / 2 };
    case 'bottom':
      return { x: position.x, y: position.y + size.height / 2 };
    case 'left':
      return { x: position.x - size.width / 2, y: position.y };
    case 'right':
      return { x: position.x + size.width / 2, y: position.y };
  }
}

/**
 * Wytrasuj ortogonalną ścieżkę między dwoma punktami.
 */
function routeOrthogonalPath(
  start: Point,
  end: Point,
  _fromPos: ElementPosition,
  _toPos: ElementPosition,
  config: LayoutConfig
): Point[] {
  const path: Point[] = [start];

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Jeśli punkty są na tej samej linii pionowej lub poziomej — prosta linia
  if (Math.abs(dx) < config.gridSize) {
    // Prosta pionowa
    path.push(end);
    return path;
  }

  if (Math.abs(dy) < config.gridSize) {
    // Prosta pozioma
    path.push(end);
    return path;
  }

  // Ścieżka L-kształtna lub Z-kształtna
  // Preferuj: pionowo najpierw, potem poziomo
  if (Math.abs(dy) > Math.abs(dx)) {
    // Pionowo najpierw
    const midY = start.y + dy / 2;
    path.push({ x: start.x, y: midY });
    path.push({ x: end.x, y: midY });
    path.push(end);
  } else {
    // Poziomo najpierw
    const midX = start.x + dx / 2;
    path.push({ x: midX, y: start.y });
    path.push({ x: midX, y: end.y });
    path.push(end);
  }

  return path;
}

/**
 * Konwertuj ścieżkę punktów na segmenty.
 */
function pathToSegments(path: Point[]): PathSegment[] {
  const segments: PathSegment[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];

    const isHorizontal = Math.abs(from.y - to.y) < 1;
    const kind: 'H' | 'V' = isHorizontal ? 'H' : 'V';

    segments.push({ from, to, kind });
  }

  return segments;
}

// =============================================================================
// LABEL PLACEMENT
// =============================================================================

/**
 * Rozmieść etykiety używając 8-kierunkowego smart label placer.
 * Zastępuje placeLabels() dla wywołań z routeEdgesAndPlaceLabels().
 */
function placeLabelsSmart(
  symbols:   LayoutSymbol[],
  positions: Map<string, ElementPosition>,
  edges:     Map<string, RoutedEdge>,
  config:    LayoutConfig
): Map<string, LabelPosition> {
  // Zbierz zajęte obszary (symbole)
  const occupiedAreas: Rectangle[] = [];
  for (const pos of positions.values()) {
    occupiedAreas.push(pos.bounds);
  }
  // Dodaj bounding boxy krawędzi
  for (const edge of edges.values()) {
    for (const segment of edge.segments) {
      const margin = 5;
      occupiedAreas.push({
        x:      Math.min(segment.from.x, segment.to.x) - margin,
        y:      Math.min(segment.from.y, segment.to.y) - margin,
        width:  Math.abs(segment.to.x - segment.from.x) + 2 * margin,
        height: Math.abs(segment.to.y - segment.from.y) + 2 * margin,
      });
    }
  }

  return placeLabelsNonOverlapping(symbols, positions, occupiedAreas, {
    maxDistance: LABEL_MAX_DISTANCE_PX,
    labelWidth:  config.labelMaxWidth,
    labelHeight: 24,
    margin:      config.labelOffsetX,
  });
}

// =============================================================================
// FUNKCJE EKSPORTOWANE
// =============================================================================

/**
 * Sprawdź czy wszystkie ścieżki są ortogonalne.
 */
export function validateOrthogonalPaths(edges: Map<string, RoutedEdge>): boolean {
  for (const edge of edges.values()) {
    for (const segment of edge.segments) {
      const dx = Math.abs(segment.to.x - segment.from.x);
      const dy = Math.abs(segment.to.y - segment.from.y);

      // Segment musi być poziomy (dy ≈ 0) lub pionowy (dx ≈ 0)
      const isHorizontal = dy < 1;
      const isVertical = dx < 1;

      if (!isHorizontal && !isVertical) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Policz skrzyżowania krawędzi.
 */
export function countEdgeCrossings(edges: Map<string, RoutedEdge>): number {
  const allSegments: { segment: PathSegment; edgeId: string }[] = [];

  for (const edge of edges.values()) {
    for (const segment of edge.segments) {
      allSegments.push({ segment, edgeId: edge.id });
    }
  }

  let crossings = 0;

  for (let i = 0; i < allSegments.length; i++) {
    for (let j = i + 1; j < allSegments.length; j++) {
      const a = allSegments[i];
      const b = allSegments[j];

      // Pomiń segmenty tej samej krawędzi
      if (a.edgeId === b.edgeId) continue;

      if (segmentsCross(a.segment, b.segment)) {
        crossings++;
      }
    }
  }

  return crossings;
}

/**
 * Sprawdź czy dwa segmenty się przecinają.
 */
function segmentsCross(a: PathSegment, b: PathSegment): boolean {
  // Uproszczona wersja — sprawdź tylko prostopadłe segmenty
  if (a.kind === b.kind) {
    // Równoległe segmenty nie przecinają się (w SLD)
    return false;
  }

  // Jeden poziomy, drugi pionowy
  const horizontal = a.kind === 'H' ? a : b;
  const vertical = a.kind === 'V' ? a : b;

  const hMinX = Math.min(horizontal.from.x, horizontal.to.x);
  const hMaxX = Math.max(horizontal.from.x, horizontal.to.x);
  const hY = horizontal.from.y;

  const vMinY = Math.min(vertical.from.y, vertical.to.y);
  const vMaxY = Math.max(vertical.from.y, vertical.to.y);
  const vX = vertical.from.x;

  // Sprawdź czy się przecinają
  return vX > hMinX && vX < hMaxX && hY > vMinY && hY < vMaxY;
}
