/**
 * CONNECTION ROUTING — Algorytm prowadzenia polaczen (PLANS STYLE)
 *
 * CANONICAL ALIGNMENT:
 * - SLD_KANONICZNA_SPECYFIKACJA.md § 4: Polaczenia
 * - AUDYT_SLD_ETAP.md: N-01, N-05
 * - Plans: proste linie pionowe na spine
 *
 * FEATURES:
 * - Deterministyczny routing (ten sam input -> ta sama sciezka)
 * - PLANS STYLE: proste linie pionowe (spine layout)
 * - L-route dla galezi bocznych
 * - Snap do siatki
 *
 * ALGORYTM (PLANS STYLE):
 * 1. Prosta linia: dla elementow na tej samej osi
 * 2. L-route: dla galezi bocznych
 * 3. Z-route: fallback dla kolizji
 */

import type { AnySldSymbol, BranchSymbol, Position, SwitchSymbol, SourceSymbol, LoadSymbol } from '../types';
import { getPortPoint, selectBestPorts, getSymbolBoundingBox, type PortName } from './portUtils';
import { DEFAULT_LAYOUT_CONFIG } from './autoLayout';

// =============================================================================
// TYPY
// =============================================================================

/** Polaczenie port-to-port */
export interface Connection {
  /** Unikalny ID polaczenia */
  id: string;
  /** ID symbolu zrodlowego */
  fromSymbolId: string;
  /** Nazwa portu zrodlowego */
  fromPortName: PortName;
  /** ID symbolu docelowego */
  toSymbolId: string;
  /** Nazwa portu docelowego */
  toPortName: PortName;
  /** Sciezka polaczenia (lista punktow lamanej) */
  path: Position[];
  /** ID elementu Branch/Switch (dla podswietlenia) */
  elementId?: string;
  /** Typ polaczenia (dla stylizacji) */
  connectionType?: 'branch' | 'switch' | 'source' | 'load';
}

/** Konfiguracja routingu */
export interface RoutingConfig {
  /** Offset korytarza od spine (px) */
  corridorOffsetFromSpine: number;
  /** Offset korytarza od busbar (px) */
  corridorOffsetFromBusbar: number;
  /** Margines przeszkod (px) */
  obstacleMargin: number;
  /** Minimalna dlugosc odcinka (px) */
  minBendLength: number;
  /** Maksymalna liczba prob step-out */
  maxStepOutAttempts: number;
  /** Snap do siatki (px) */
  gridSnap: number;
}

/** Centralna konfiguracja routingu (PL) */
export const ROUTING_GEOMETRY_CONFIG: RoutingConfig = {
  corridorOffsetFromSpine: 40,
  corridorOffsetFromBusbar: 24,
  obstacleMargin: 8,
  minBendLength: 18,
  maxStepOutAttempts: 6,
  gridSnap: DEFAULT_LAYOUT_CONFIG.gridSize,
};

/** Domyslna konfiguracja routingu */
export const DEFAULT_ROUTING_CONFIG: RoutingConfig = ROUTING_GEOMETRY_CONFIG;

// =============================================================================
// OBSTACLES (AABB)
// =============================================================================

type Aabb = { x: number; y: number; width: number; height: number };

type Obstacle = {
  id: string;
  type: 'busbar' | 'symbol';
  typePriority: number;
  bbox: Aabb;
};

export function buildRoutingObstacles(symbols: AnySldSymbol[], config: RoutingConfig): Obstacle[] {
  const obstacles = symbols.map((symbol) => {
    const bbox = expandAabb(getSymbolBoundingBox(symbol), config.obstacleMargin);
    const isBusbar = symbol.elementType === 'Bus';
    return {
      id: symbol.id,
      type: isBusbar ? 'busbar' : 'symbol',
      typePriority: isBusbar ? 0 : 1,
      bbox,
    };
  });

  return obstacles.sort((a, b) => {
    if (a.typePriority !== b.typePriority) {
      return a.typePriority - b.typePriority;
    }
    return a.id.localeCompare(b.id);
  });
}

// =============================================================================
// GLOWNA FUNKCJA: GENERUJ POLACZENIA
// =============================================================================

/**
 * Wygeneruj wszystkie polaczenia dla symboli SLD.
 *
 * DETERMINIZM: Ten sam zestaw symboli -> te same polaczenia
 *
 * @param symbols - Lista symboli SLD
 * @param config - Konfiguracja routingu (opcjonalna)
 * @returns Lista polaczen z trasami
 */
export function generateConnections(
  symbols: AnySldSymbol[],
  config: Partial<RoutingConfig> = {},
  edgeBendOverrides?: Record<string, Position[] | undefined>
): Connection[] {
  const cfg: RoutingConfig = { ...DEFAULT_ROUTING_CONFIG, ...config };
  const connections: Connection[] = [];
  const obstacles = buildRoutingObstacles(symbols, cfg);
  const spineX = computeSpineX(symbols, cfg.gridSnap);

  // Mapa ID elementu -> symbol
  const elementToSymbol = new Map<string, AnySldSymbol>();
  symbols.forEach((s) => elementToSymbol.set(s.elementId, s));

  // Mapa ID symbolu -> symbol
  const symbolById = new Map<string, AnySldSymbol>();
  symbols.forEach((s) => symbolById.set(s.id, s));

  const connectionRequests: Array<{
    id: string;
    fromSymbol: AnySldSymbol;
    toSymbol: AnySldSymbol;
    elementId?: string;
    connectionType?: 'branch' | 'switch' | 'source' | 'load';
  }> = [];

  // Przetworz Branch i Switch (maja fromNodeId/toNodeId)
  symbols.forEach((symbol) => {
    if (symbol.elementType === 'LineBranch' || symbol.elementType === 'TransformerBranch') {
      const branch = symbol as BranchSymbol;
      const fromSymbol = elementToSymbol.get(branch.fromNodeId);
      const toSymbol = elementToSymbol.get(branch.toNodeId);

      if (fromSymbol && toSymbol) {
        connectionRequests.push({
          id: symbol.id,
          fromSymbol,
          toSymbol,
          elementId: branch.elementId,
          connectionType: 'branch',
        });
      }
    }

    if (symbol.elementType === 'Switch') {
      const sw = symbol as SwitchSymbol;
      const fromSymbol = elementToSymbol.get(sw.fromNodeId);
      const toSymbol = elementToSymbol.get(sw.toNodeId);

      if (fromSymbol && toSymbol) {
        // Switch: polaczenie from -> switch -> to
        // Tworzymy dwa polaczenia: from->switch i switch->to
        const switchSymbol = symbolById.get(symbol.id);

        if (switchSymbol) {
          // Polaczenie 1: from -> switch
          connectionRequests.push({
            id: `${symbol.id}_in`,
            fromSymbol,
            toSymbol: switchSymbol,
            elementId: sw.elementId,
            connectionType: 'switch',
          });

          // Polaczenie 2: switch -> to
          connectionRequests.push({
            id: `${symbol.id}_out`,
            fromSymbol: switchSymbol,
            toSymbol,
            elementId: sw.elementId,
            connectionType: 'switch',
          });
        }
      }
    }

    if (symbol.elementType === 'Source') {
      const source = symbol as SourceSymbol;
      const connectedSymbol = elementToSymbol.get(source.connectedToNodeId);

      if (connectedSymbol) {
        connectionRequests.push({
          id: `${symbol.id}_conn`,
          fromSymbol: symbol,
          toSymbol: connectedSymbol,
          elementId: source.elementId,
          connectionType: 'source',
        });
      }
    }

    if (symbol.elementType === 'Load') {
      const load = symbol as LoadSymbol;
      const connectedSymbol = elementToSymbol.get(load.connectedToNodeId);

      if (connectedSymbol) {
        connectionRequests.push({
          id: `${symbol.id}_conn`,
          fromSymbol: connectedSymbol,
          toSymbol: symbol,
          elementId: load.elementId,
          connectionType: 'load',
        });
      }
    }
  });

  connectionRequests.sort((a, b) => a.id.localeCompare(b.id));

  connectionRequests.forEach((request) => {
    const connection = createConnection(
      request.id,
      request.fromSymbol,
      request.toSymbol,
      obstacles,
      spineX,
      cfg,
      edgeBendOverrides?.[request.id],
      request.elementId,
      request.connectionType
    );
    connections.push(connection);
  });

  // DETERMINIZM: Sortuj polaczenia po ID
  connections.sort((a, b) => a.id.localeCompare(b.id));

  return connections;
}

// =============================================================================
// TWORZENIE POJEDYNCZEGO POLACZENIA
// =============================================================================

/**
 * Utworz polaczenie miedzy dwoma symbolami.
 */
function createConnection(
  connectionId: string,
  fromSymbol: AnySldSymbol,
  toSymbol: AnySldSymbol,
  obstacles: Obstacle[],
  spineX: number,
  config: RoutingConfig,
  edgeBends?: Position[],
  elementId?: string,
  connectionType?: 'branch' | 'switch' | 'source' | 'load'
): Connection {
  // Wybierz najlepsze porty
  const { fromPort, toPort } = selectBestPorts(fromSymbol, toSymbol);

  // Pobierz punkty portow
  const startPoint = getPortPoint(fromSymbol, fromPort);
  const endPoint = getPortPoint(toSymbol, toPort);

  // Wygeneruj sciezke (CAD bends mają pierwszeństwo)
  const overridePath =
    edgeBends && edgeBends.length > 0
      ? normalizePath([startPoint, ...edgeBends, endPoint], config.gridSnap)
      : null;

  const path = overridePath && overridePath.length >= 2
    ? overridePath
    : routeOrthogonal(
      startPoint,
      endPoint,
      fromSymbol,
      toSymbol,
      obstacles.filter((o) => o.id !== fromSymbol.id && o.id !== toSymbol.id),
      spineX,
      config
    );

  return {
    id: connectionId,
    fromSymbolId: fromSymbol.id,
    fromPortName: fromPort,
    toSymbolId: toSymbol.id,
    toPortName: toPort,
    path,
    elementId,
    connectionType,
  };
}

// =============================================================================
// ROUTING — PLANS STYLE (PROSTE LINIE)
// =============================================================================

/**
 * Wygeneruj sciezke miedzy dwoma punktami.
 *
 * PLANS STYLE SPINE LAYOUT:
 * - Preferuj PROSTE linie pionowe (spine)
 * - Dla elementow na tej samej osi X: prosta linia
 * - Dla elementow na roznych osiach: prosty L-route
 *
 * DETERMINIZM: Te same punkty -> ta sama sciezka
 */
function routeOrthogonal(
  start: Position,
  end: Position,
  fromSymbol: AnySldSymbol,
  toSymbol: AnySldSymbol,
  obstacles: Obstacle[],
  spineX: number,
  config: RoutingConfig
): Position[] {
  // Snap do siatki
  const snapStart = snapToGrid(start, config.gridSnap);
  const snapEnd = snapToGrid(end, config.gridSnap);

  // Jesli punkty sa takie same, zwroc pojedynczy punkt
  if (snapStart.x === snapEnd.x && snapStart.y === snapEnd.y) {
    return [snapStart];
  }

  const corridor = resolveCorridor(fromSymbol, toSymbol, snapStart, snapEnd, spineX, config);

  // PLANS STYLE: Preferuj PROSTE linie
  // Jesli punkty sa na tej samej linii pionowej lub poziomej, zwroc prosta linie
  if (snapStart.x === snapEnd.x || snapStart.y === snapEnd.y) {
    const iPath = normalizePath([snapStart, snapEnd], config.gridSnap);
    if (isPathClear(iPath, obstacles) && pathMeetsMinBendLength(iPath, config.minBendLength)) {
      return iPath;
    }
  }

  // PLANS STYLE: Dla elementow na roznych osiach uzyj prostego L-route
  // Najpierw pion (preferowany dla spine layout), potem poziom
  const lPath = normalizePath(tryLRoute(snapStart, snapEnd, 'vertical', config.gridSnap), config.gridSnap);
  const lPathAlt = normalizePath(
    tryLRoute(snapStart, snapEnd, 'horizontal', config.gridSnap),
    config.gridSnap
  );

  const lCandidates = [lPath, lPathAlt].filter((path) =>
    isPathClear(path, obstacles) && pathMeetsMinBendLength(path, config.minBendLength)
  );

  if (lCandidates.length > 0) {
    return selectBestLRoute(lCandidates, corridor);
  }

  // Fallback: Z-route w korytarzu + step-out
  const zPath = findZRouteWithStepOut(snapStart, snapEnd, corridor, obstacles, config);
  if (zPath) {
    return zPath;
  }

  // Ostateczny fallback: prosta linia (ignoruj kolizje dla czytelnosci)
  return normalizePath([snapStart, snapEnd], config.gridSnap);
}

/**
 * Wariant L: dwa odcinki (najpierw jeden kierunek, potem drugi).
 */
function tryLRoute(
  start: Position,
  end: Position,
  preferDirection: 'vertical' | 'horizontal',
  gridSnap: number
): Position[] {
  let midPoint: Position;

  if (preferDirection === 'vertical') {
    // Najpierw pion, potem poziom
    midPoint = snapToGrid({ x: start.x, y: end.y }, gridSnap);
  } else {
    // Najpierw poziom, potem pion
    midPoint = snapToGrid({ x: end.x, y: start.y }, gridSnap);
  }

  return [start, midPoint, end];
}

type Corridor =
  | { kind: 'vertical'; baseCoordinate: number; direction: 1 | -1 }
  | { kind: 'horizontal'; baseCoordinate: number; direction: 1 | -1 };

function resolveCorridor(
  fromSymbol: AnySldSymbol,
  toSymbol: AnySldSymbol,
  start: Position,
  end: Position,
  spineX: number,
  config: RoutingConfig
): Corridor {
  const fromIsBus = fromSymbol.elementType === 'Bus';
  const toIsBus = toSymbol.elementType === 'Bus';

  if (fromIsBus !== toIsBus) {
    const busSymbol = fromIsBus ? fromSymbol : toSymbol;
    const otherSymbol = fromIsBus ? toSymbol : fromSymbol;
    const direction = chooseSignedDirection(
      otherSymbol.position.y,
      busSymbol.position.y,
      fromSymbol.id,
      toSymbol.id
    );
    const base = snapToGrid(
      { x: 0, y: busSymbol.position.y + direction * config.corridorOffsetFromBusbar },
      config.gridSnap
    ).y;
    return { kind: 'horizontal', baseCoordinate: base, direction };
  }

  const avgX = (start.x + end.x) / 2;
  const direction = chooseSignedDirection(avgX, spineX, fromSymbol.id, toSymbol.id);
  const base = snapToGrid(
    { x: spineX + direction * config.corridorOffsetFromSpine, y: 0 },
    config.gridSnap
  ).x;
  return { kind: 'vertical', baseCoordinate: base, direction };
}

function chooseSignedDirection(
  primaryValue: number,
  referenceValue: number,
  fromId: string,
  toId: string
): 1 | -1 {
  if (primaryValue > referenceValue) return 1;
  if (primaryValue < referenceValue) return -1;
  return fromId <= toId ? 1 : -1;
}

function findZRouteWithStepOut(
  start: Position,
  end: Position,
  corridor: Corridor,
  obstacles: Obstacle[],
  config: RoutingConfig
): Position[] | null {
  for (let attempt = 0; attempt < config.maxStepOutAttempts; attempt += 1) {
    const corridorCoordinate =
      corridor.baseCoordinate + corridor.direction * attempt * config.gridSnap;
    const candidate =
      corridor.kind === 'vertical'
        ? normalizePath(
            [
              start,
              { x: corridorCoordinate, y: start.y },
              { x: corridorCoordinate, y: end.y },
              end,
            ],
            config.gridSnap
          )
        : normalizePath(
            [
              start,
              { x: start.x, y: corridorCoordinate },
              { x: end.x, y: corridorCoordinate },
              end,
            ],
            config.gridSnap
          );

    if (isPathClear(candidate, obstacles) && pathMeetsMinBendLength(candidate, config.minBendLength)) {
      return candidate;
    }
  }

  return null;
}

function selectBestLRoute(paths: Position[][], corridor: Corridor): Position[] {
  const scored = paths.map((path) => ({
    path,
    corridorHit: pathHasCorridorSegment(path, corridor),
    length: totalPathLength(path),
    key: pathKey(path),
  }));

  scored.sort((a, b) => {
    if (a.corridorHit !== b.corridorHit) {
      return a.corridorHit ? -1 : 1;
    }
    if (a.length !== b.length) {
      return a.length - b.length;
    }
    return a.key.localeCompare(b.key);
  });

  return scored[0].path;
}

// =============================================================================
// FUNKCJE POMOCNICZE
// =============================================================================

function expandAabb(bbox: Aabb, margin: number): Aabb {
  return {
    x: bbox.x - margin,
    y: bbox.y - margin,
    width: bbox.width + 2 * margin,
    height: bbox.height + 2 * margin,
  };
}

function computeSpineX(symbols: AnySldSymbol[], gridSnap: number): number {
  const busbars = symbols.filter((symbol) => symbol.elementType === 'Bus');
  const candidates = (busbars.length > 0 ? busbars : symbols)
    .map((symbol) => symbol.position.x)
    .sort((a, b) => a - b);

  if (candidates.length === 0) {
    return 0;
  }

  const median = candidates[Math.floor((candidates.length - 1) / 2)];
  return snapToGrid({ x: median, y: 0 }, gridSnap).x;
}

/**
 * Snap punkt do siatki.
 */
function snapToGrid(point: Position, gridSize: number): Position {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Sprawdz czy odcinek osiowo wyrównany przecina AABB.
 */
export function segmentIntersectsAabb(
  segment: { start: Position; end: Position },
  bbox: Aabb
): boolean {
  const { start, end } = segment;
  const left = bbox.x;
  const right = bbox.x + bbox.width;
  const top = bbox.y;
  const bottom = bbox.y + bbox.height;

  if (start.x === end.x && start.y === end.y) {
    return start.x >= left && start.x <= right && start.y >= top && start.y <= bottom;
  }

  if (start.y === end.y) {
    const y = start.y;
    if (y < top || y > bottom) {
      return false;
    }
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    return minX <= right && maxX >= left;
  }

  if (start.x === end.x) {
    const x = start.x;
    if (x < left || x > right) {
      return false;
    }
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    return minY <= bottom && maxY >= top;
  }

  return false;
}

function isPathClear(path: Position[], obstacles: Obstacle[]): boolean {
  if (path.length < 2) return true;

  for (let i = 0; i < path.length - 1; i += 1) {
    const start = path[i];
    const end = path[i + 1];

    for (const obstacle of obstacles) {
      if (segmentIntersectsAabb({ start, end }, obstacle.bbox)) {
        return false;
      }
    }
  }

  return true;
}

function pathMeetsMinBendLength(path: Position[], minBendLength: number): boolean {
  if (path.length <= 2) {
    return true;
  }

  for (let i = 0; i < path.length - 1; i += 1) {
    const segmentLength = Math.abs(path[i + 1].x - path[i].x) + Math.abs(path[i + 1].y - path[i].y);
    if (segmentLength > 0 && segmentLength < minBendLength) {
      return false;
    }
  }

  return true;
}

/**
 * Normalizacja trasy: snap + redukcja współliniowych punktów.
 */
function normalizePath(path: Position[], gridSnap: number): Position[] {
  if (path.length === 0) return [];

  const snapped = path.map((point) => snapToGrid(point, gridSnap));
  const deduped: Position[] = [snapped[0]];

  for (let i = 1; i < snapped.length; i += 1) {
    const prev = deduped[deduped.length - 1];
    const curr = snapped[i];
    if (curr.x !== prev.x || curr.y !== prev.y) {
      deduped.push(curr);
    }
  }

  const reduced: Position[] = [];
  for (const point of deduped) {
    reduced.push(point);
    while (reduced.length >= 3) {
      const c = reduced[reduced.length - 1];
      const b = reduced[reduced.length - 2];
      const a = reduced[reduced.length - 3];
      const collinear = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
      if (collinear) {
        reduced.splice(reduced.length - 2, 1);
      } else {
        break;
      }
    }
  }

  return reduced;
}

function totalPathLength(path: Position[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    total += Math.abs(path[i + 1].x - path[i].x) + Math.abs(path[i + 1].y - path[i].y);
  }
  return total;
}

function pathHasCorridorSegment(path: Position[], corridor: Corridor): boolean {
  for (let i = 0; i < path.length - 1; i += 1) {
    const start = path[i];
    const end = path[i + 1];
    if (corridor.kind === 'vertical' && start.x === end.x && start.x === corridor.baseCoordinate) {
      return true;
    }
    if (corridor.kind === 'horizontal' && start.y === end.y && start.y === corridor.baseCoordinate) {
      return true;
    }
  }
  return false;
}

function pathKey(path: Position[]): string {
  return path.map((point) => `${point.x},${point.y}`).join('|');
}

// =============================================================================
// WERYFIKACJA DETERMINISTYCZNOSCI
// =============================================================================

/**
 * Weryfikuj deterministycznosc routingu.
 *
 * @param symbols - Symbole SLD
 * @returns true jesli routing jest deterministyczny
 */
export function verifyRoutingDeterminism(symbols: AnySldSymbol[]): boolean {
  const conn1 = generateConnections(symbols);
  const conn2 = generateConnections(symbols);

  if (conn1.length !== conn2.length) return false;

  for (let i = 0; i < conn1.length; i++) {
    const c1 = conn1[i];
    const c2 = conn2[i];

    if (c1.id !== c2.id) return false;
    if (c1.path.length !== c2.path.length) return false;

    for (let j = 0; j < c1.path.length; j++) {
      if (c1.path[j].x !== c2.path[j].x || c1.path[j].y !== c2.path[j].y) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Konwertuj sciezke na string dla SVG polyline.
 */
export function pathToSvgPoints(path: Position[]): string {
  return path.map((p) => `${p.x},${p.y}`).join(' ');
}
