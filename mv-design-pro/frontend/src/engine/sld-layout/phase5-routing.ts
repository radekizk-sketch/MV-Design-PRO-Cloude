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

  // Krok 1: Generuj trasy dla wszystkich połączeń
  const routedEdges = generateEdgeRoutes(
    symbols,
    symbolById,
    elementToSymbol,
    positions,
    busbarGeometries ?? new Map(),
    config
  );

  // Krok 2: Rozmieść etykiety
  const labelPositions = placeLabels(symbols, positions, routedEdges, config);

  return {
    ...context,
    routedEdges,
    labelPositions,
  };
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
  config: LayoutConfig
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
          config
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
          config
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
          config
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
          config
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
  config: LayoutConfig
): RoutedEdge | null {
  const fromPos = positions.get(fromSymbolId);
  const toPos = positions.get(toSymbolId);

  if (!fromPos || !toPos) return null;

  // Określ porty
  const { fromPort, toPort } = determinePortsForConnection(fromPos, toPos);

  // Oblicz punkty startowy i końcowy
  const startPoint = getPortPosition(fromPos, fromPort);
  const endPoint = getPortPosition(toPos, toPort);

  // Wytrasuj ścieżkę
  const path = routeOrthogonalPath(startPoint, endPoint, fromPos, toPos, config);
  const segments = pathToSegments(path);

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
 * Rozmieść etykiety.
 */
function placeLabels(
  symbols: LayoutSymbol[],
  positions: Map<string, ElementPosition>,
  edges: Map<string, RoutedEdge>,
  config: LayoutConfig
): Map<string, LabelPosition> {
  const labelPositions = new Map<string, LabelPosition>();
  const occupiedAreas: Rectangle[] = [];

  // Zbierz zajęte obszary (symbole)
  for (const pos of positions.values()) {
    occupiedAreas.push(pos.bounds);
  }

  // Zbierz zajęte obszary (krawędzie) — uproszczony bounding box
  for (const edge of edges.values()) {
    for (const segment of edge.segments) {
      const minX = Math.min(segment.from.x, segment.to.x) - 5;
      const minY = Math.min(segment.from.y, segment.to.y) - 5;
      const maxX = Math.max(segment.from.x, segment.to.x) + 5;
      const maxY = Math.max(segment.from.y, segment.to.y) + 5;

      occupiedAreas.push({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });
    }
  }

  // Umieść etykietę dla każdego symbolu
  for (const symbol of symbols) {
    const pos = positions.get(symbol.id);
    if (!pos) continue;

    // Pomiń symbole bez nazwy
    if (!symbol.elementName || symbol.elementName.trim() === '') continue;

    const labelPos = findBestLabelPosition(symbol, pos, occupiedAreas, config);
    labelPositions.set(symbol.id, labelPos);

    // Dodaj obszar etykiety do zajętych
    const labelWidth = Math.max(30, symbol.elementName.length * 7);
    const labelHeight = 14;
    occupiedAreas.push({
      x: labelPos.position.x - (labelPos.anchor === 'start' ? 0 : labelPos.anchor === 'middle' ? labelWidth / 2 : labelWidth),
      y: labelPos.position.y - labelHeight / 2,
      width: labelWidth,
      height: labelHeight,
    });
  }

  return labelPositions;
}

/**
 * Znajdź najlepszą pozycję dla etykiety.
 *
 * ESTETYKA PRZEMYSLOWA — LABEL PLACEMENT:
 * - Kolejnosc deterministyczna: right → left → top → bottom
 * - Unikaj kolizji label-symbol (twarde)
 * - Clamp dystansu do LABEL_MAX_DISTANCE_PX
 * - Deterministic tiebreak (sort kandydatów po placement order + id)
 * - Jesli konflikt: etykieta schodzi na drugi poziom (stack) w osi Y
 *   w ramach kanalu, NIGDY losowo
 */
function findBestLabelPosition(
  symbol: LayoutSymbol,
  elementPos: ElementPosition,
  occupiedAreas: Rectangle[],
  config: LayoutConfig
): LabelPosition {
  // Kolejność prób: prawo, lewo, góra, dół (deterministic order)
  const placements: Array<'right' | 'left' | 'top' | 'bottom'> = ['right', 'left', 'top', 'bottom'];

  for (const placement of placements) {
    const labelPos = calculateLabelPosition(elementPos, placement, config);
    const labelBounds = estimateLabelBounds(symbol.elementName, labelPos);

    // Sprawdź kolizje z symbolami (twarde)
    const hasCollision = occupiedAreas.some((area) => rectanglesOverlap(labelBounds, area));

    if (!hasCollision) {
      // Verify distance is within LABEL_MAX_DISTANCE_PX
      const distance = Math.sqrt(
        Math.pow(labelPos.position.x - elementPos.position.x, 2) +
          Math.pow(labelPos.position.y - elementPos.position.y, 2)
      );

      if (distance <= LABEL_MAX_DISTANCE_PX) {
        return {
          symbolId: symbol.id,
          position: labelPos.position,
          anchor: labelPos.anchor,
          placement,
          offset: labelPos.offset,
          adjusted: false,
        };
      }
    }
  }

  // Y-stack fallback: try stacking label below in Y-axis (deterministic)
  // Grid step = 14px (label height), try up to 3 stack levels
  const LABEL_STACK_STEP_Y = 16;
  for (let stackLevel = 1; stackLevel <= 3; stackLevel++) {
    for (const placement of placements) {
      const labelPos = calculateLabelPosition(elementPos, placement, config);
      const stackedPos = {
        ...labelPos,
        position: {
          x: labelPos.position.x,
          y: labelPos.position.y + stackLevel * LABEL_STACK_STEP_Y,
        },
      };
      const labelBounds = estimateLabelBounds(symbol.elementName, stackedPos);

      const distance = Math.sqrt(
        Math.pow(stackedPos.position.x - elementPos.position.x, 2) +
          Math.pow(stackedPos.position.y - elementPos.position.y, 2)
      );

      if (distance > LABEL_MAX_DISTANCE_PX) continue;

      const hasCollision = occupiedAreas.some((area) => rectanglesOverlap(labelBounds, area));

      if (!hasCollision) {
        return {
          symbolId: symbol.id,
          position: stackedPos.position,
          anchor: stackedPos.anchor,
          placement,
          offset: { x: labelPos.offset.x, y: labelPos.offset.y + stackLevel * LABEL_STACK_STEP_Y },
          adjusted: true,
        };
      }
    }
  }

  // Ultimate fallback: right with clamped distance
  const clampedOffset = Math.min(config.labelOffsetX, LABEL_MAX_DISTANCE_PX - elementPos.size.width / 2);
  const fallbackX = elementPos.position.x + elementPos.size.width / 2 + Math.max(10, clampedOffset);

  return {
    symbolId: symbol.id,
    position: { x: fallbackX, y: elementPos.position.y },
    anchor: 'start',
    placement: 'right',
    offset: { x: Math.max(10, clampedOffset), y: 0 },
    adjusted: true,
  };
}

/**
 * Oblicz pozycję etykiety dla danego placement.
 */
function calculateLabelPosition(
  elementPos: ElementPosition,
  placement: 'right' | 'left' | 'top' | 'bottom',
  config: LayoutConfig,
  multiplier: number = 1
): { position: Point; anchor: 'start' | 'middle' | 'end'; offset: Point } {
  const { position, size } = elementPos;

  switch (placement) {
    case 'right':
      return {
        position: {
          x: position.x + size.width / 2 + config.labelOffsetX * multiplier,
          y: position.y,
        },
        anchor: 'start',
        offset: { x: config.labelOffsetX * multiplier, y: 0 },
      };
    case 'left':
      return {
        position: {
          x: position.x - size.width / 2 - config.labelOffsetX * multiplier,
          y: position.y,
        },
        anchor: 'end',
        offset: { x: -config.labelOffsetX * multiplier, y: 0 },
      };
    case 'top':
      return {
        position: {
          x: position.x,
          y: position.y - size.height / 2 + config.labelOffsetY * multiplier,
        },
        anchor: 'middle',
        offset: { x: 0, y: config.labelOffsetY * multiplier },
      };
    case 'bottom':
      return {
        position: {
          x: position.x,
          y: position.y + size.height / 2 - config.labelOffsetY * multiplier + 15,
        },
        anchor: 'middle',
        offset: { x: 0, y: -config.labelOffsetY * multiplier + 15 },
      };
  }
}

/**
 * Oszacuj bounding box etykiety.
 */
function estimateLabelBounds(text: string, labelPos: { position: Point; anchor: 'start' | 'middle' | 'end' }): Rectangle {
  const charWidth = 7;
  const lineHeight = 14;
  const width = Math.max(30, text.length * charWidth);
  const height = lineHeight;

  let x: number;
  switch (labelPos.anchor) {
    case 'start':
      x = labelPos.position.x;
      break;
    case 'middle':
      x = labelPos.position.x - width / 2;
      break;
    case 'end':
      x = labelPos.position.x - width;
      break;
  }

  return {
    x,
    y: labelPos.position.y - height / 2,
    width,
    height,
  };
}

/**
 * Sprawdź czy dwa prostokąty się nakładają.
 */
function rectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
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
