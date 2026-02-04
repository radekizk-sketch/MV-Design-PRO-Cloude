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
import {
  getPortPoint,
  selectBestPorts,
  getSymbolBoundingBox,
  lineIntersectsBoundingBox,
  type PortName,
} from './portUtils';
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
  /** Rozmiar siatki (px) */
  gridSize: number;
  /** Margines od symboli (px) */
  symbolMargin: number;
  /** Preferencja kierunku: najpierw pion ('vertical') lub poziom ('horizontal') */
  preferDirection: 'vertical' | 'horizontal';
  /** Offset dla kanalu przewodow (px) */
  channelOffset: number;
}

/** Domyslna konfiguracja routingu */
export const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
  gridSize: DEFAULT_LAYOUT_CONFIG.gridSize,
  symbolMargin: 10,
  preferDirection: 'vertical',
  channelOffset: 20,
};

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
  config: Partial<RoutingConfig> = {}
): Connection[] {
  const cfg: RoutingConfig = { ...DEFAULT_ROUTING_CONFIG, ...config };
  const connections: Connection[] = [];

  // Mapa ID elementu -> symbol
  const elementToSymbol = new Map<string, AnySldSymbol>();
  symbols.forEach((s) => elementToSymbol.set(s.elementId, s));

  // Mapa ID symbolu -> symbol
  const symbolById = new Map<string, AnySldSymbol>();
  symbols.forEach((s) => symbolById.set(s.id, s));

  // Zbierz wszystkie bounding boxy symboli (dla detekcji kolizji)
  const allBoundingBoxes = symbols.map((s) => ({
    symbolId: s.id,
    bbox: getSymbolBoundingBox(s),
  }));

  // Przetworz Branch i Switch (maja fromNodeId/toNodeId)
  symbols.forEach((symbol) => {
    if (symbol.elementType === 'LineBranch' || symbol.elementType === 'TransformerBranch') {
      const branch = symbol as BranchSymbol;
      const fromSymbol = elementToSymbol.get(branch.fromNodeId);
      const toSymbol = elementToSymbol.get(branch.toNodeId);

      if (fromSymbol && toSymbol) {
        const connection = createConnection(
          symbol.id,
          fromSymbol,
          toSymbol,
          allBoundingBoxes,
          cfg,
          branch.elementId,
          'branch'
        );
        connections.push(connection);
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
          const conn1 = createConnection(
            `${symbol.id}_in`,
            fromSymbol,
            switchSymbol,
            allBoundingBoxes.filter((b) => b.symbolId !== symbol.id),
            cfg,
            sw.elementId,
            'switch'
          );
          connections.push(conn1);

          // Polaczenie 2: switch -> to
          const conn2 = createConnection(
            `${symbol.id}_out`,
            switchSymbol,
            toSymbol,
            allBoundingBoxes.filter((b) => b.symbolId !== symbol.id),
            cfg,
            sw.elementId,
            'switch'
          );
          connections.push(conn2);
        }
      }
    }

    if (symbol.elementType === 'Source') {
      const source = symbol as SourceSymbol;
      const connectedSymbol = elementToSymbol.get(source.connectedToNodeId);

      if (connectedSymbol) {
        const connection = createConnection(
          `${symbol.id}_conn`,
          symbol,
          connectedSymbol,
          allBoundingBoxes,
          cfg,
          source.elementId,
          'source'
        );
        connections.push(connection);
      }
    }

    if (symbol.elementType === 'Load') {
      const load = symbol as LoadSymbol;
      const connectedSymbol = elementToSymbol.get(load.connectedToNodeId);

      if (connectedSymbol) {
        const connection = createConnection(
          `${symbol.id}_conn`,
          connectedSymbol, // Od szyny do obciazenia
          symbol,
          allBoundingBoxes,
          cfg,
          load.elementId,
          'load'
        );
        connections.push(connection);
      }
    }
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
  obstacles: Array<{ symbolId: string; bbox: { x: number; y: number; width: number; height: number } }>,
  config: RoutingConfig,
  elementId?: string,
  connectionType?: 'branch' | 'switch' | 'source' | 'load'
): Connection {
  // Wybierz najlepsze porty
  const { fromPort, toPort } = selectBestPorts(fromSymbol, toSymbol);

  // Pobierz punkty portow
  const startPoint = getPortPoint(fromSymbol, fromPort);
  const endPoint = getPortPoint(toSymbol, toPort);

  // Wygeneruj sciezke
  const path = routeOrthogonal(
    startPoint,
    endPoint,
    fromPort,
    toPort,
    obstacles.filter(
      (o) => o.symbolId !== fromSymbol.id && o.symbolId !== toSymbol.id
    ),
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
  fromPort: PortName,
  toPort: PortName,
  obstacles: Array<{ symbolId: string; bbox: { x: number; y: number; width: number; height: number } }>,
  config: RoutingConfig
): Position[] {
  // Snap do siatki
  const snapStart = snapToGrid(start, config.gridSize);
  const snapEnd = snapToGrid(end, config.gridSize);

  // Jesli punkty sa takie same, zwroc pojedynczy punkt
  if (snapStart.x === snapEnd.x && snapStart.y === snapEnd.y) {
    return [snapStart];
  }

  // PLANS STYLE: Preferuj PROSTE linie
  // Jesli punkty sa na tej samej linii pionowej lub poziomej, zwroc prosta linie
  if (snapStart.x === snapEnd.x || snapStart.y === snapEnd.y) {
    return [snapStart, snapEnd];
  }

  // PLANS STYLE: Dla elementow na roznych osiach uzyj prostego L-route
  // Najpierw pion (preferowany dla spine layout), potem poziom
  const lPath = tryLRoute(snapStart, snapEnd, 'vertical', config.gridSize);

  // Sprawdz kolizje tylko jesli sa przeszkody
  if (obstacles.length === 0 || !pathHasCollision(lPath, obstacles, config.symbolMargin)) {
    return lPath;
  }

  // Alternatywny L-route (najpierw poziom, potem pion)
  const lPathAlt = tryLRoute(snapStart, snapEnd, 'horizontal', config.gridSize);
  if (!pathHasCollision(lPathAlt, obstacles, config.symbolMargin)) {
    return lPathAlt;
  }

  // Fallback: prosty Z-route
  const zPath = tryZRoute(snapStart, snapEnd, fromPort, toPort, config);
  if (!pathHasCollision(zPath, obstacles, config.symbolMargin)) {
    return zPath;
  }

  // Ostateczny fallback: prosta linia (ignoruj kolizje dla czytelnosci)
  return [snapStart, snapEnd];
}

/**
 * Wariant L: dwa odcinki (najpierw jeden kierunek, potem drugi).
 */
function tryLRoute(
  start: Position,
  end: Position,
  preferDirection: 'vertical' | 'horizontal',
  gridSize: number
): Position[] {
  let midPoint: Position;

  if (preferDirection === 'vertical') {
    // Najpierw pion, potem poziom
    midPoint = snapToGrid({ x: start.x, y: end.y }, gridSize);
  } else {
    // Najpierw poziom, potem pion
    midPoint = snapToGrid({ x: end.x, y: start.y }, gridSize);
  }

  return [start, midPoint, end];
}

/**
 * Wariant Z: trzy odcinki z punktem posrednim.
 */
function tryZRoute(
  start: Position,
  end: Position,
  fromPort: PortName,
  toPort: PortName,
  config: RoutingConfig
): Position[] {
  const { gridSize } = config;
  const midY = snapToGrid({ x: 0, y: (start.y + end.y) / 2 }, gridSize).y;

  // Dla polaczen pionowych (top/bottom ports)
  if (
    (fromPort === 'top' || fromPort === 'bottom') &&
    (toPort === 'top' || toPort === 'bottom')
  ) {
    const mid1: Position = { x: start.x, y: midY };
    const mid2: Position = { x: end.x, y: midY };
    return [start, mid1, mid2, end];
  }

  // Dla polaczen poziomych (left/right ports)
  if (
    (fromPort === 'left' || fromPort === 'right') &&
    (toPort === 'left' || toPort === 'right')
  ) {
    const midX = snapToGrid({ x: (start.x + end.x) / 2, y: 0 }, gridSize).x;
    const mid1: Position = { x: midX, y: start.y };
    const mid2: Position = { x: midX, y: end.y };
    return [start, mid1, mid2, end];
  }

  // Mieszane: L-shape
  const mid1: Position = snapToGrid({ x: start.x, y: midY }, gridSize);
  const mid2: Position = snapToGrid({ x: end.x, y: midY }, gridSize);
  return [start, mid1, mid2, end];
}

/**
 * Wariant Z alternatywny z innym kierunkiem.
 */
function tryZRouteAlternative(
  start: Position,
  end: Position,
  _fromPort: PortName,
  _toPort: PortName,
  config: RoutingConfig
): Position[] {
  const { gridSize } = config;

  // Uzyj srodka X zamiast Y
  const midX = snapToGrid({ x: (start.x + end.x) / 2, y: 0 }, gridSize).x;

  const mid1: Position = { x: midX, y: start.y };
  const mid2: Position = { x: midX, y: end.y };

  return [start, mid1, mid2, end];
}

/**
 * Routing przez kanal przewodow (fallback).
 * Zawsze deterministyczny, unika kolizji poprzez offset.
 */
function routeViaChannel(
  start: Position,
  end: Position,
  fromPort: PortName,
  toPort: PortName,
  config: RoutingConfig
): Position[] {
  const { gridSize, channelOffset } = config;

  // Kanal: wyjdz z portu, skrecaj do kanalu, idz do celu
  let exit1: Position;
  let channelEntry: Position;
  let channelExit: Position;
  let entry2: Position;

  // Wyznacz offset wyjscia z portu
  const exitOffset = channelOffset * 2;

  switch (fromPort) {
    case 'top':
      exit1 = snapToGrid({ x: start.x, y: start.y - exitOffset }, gridSize);
      break;
    case 'bottom':
      exit1 = snapToGrid({ x: start.x, y: start.y + exitOffset }, gridSize);
      break;
    case 'left':
      exit1 = snapToGrid({ x: start.x - exitOffset, y: start.y }, gridSize);
      break;
    case 'right':
      exit1 = snapToGrid({ x: start.x + exitOffset, y: start.y }, gridSize);
      break;
    default:
      exit1 = start;
  }

  switch (toPort) {
    case 'top':
      entry2 = snapToGrid({ x: end.x, y: end.y - exitOffset }, gridSize);
      break;
    case 'bottom':
      entry2 = snapToGrid({ x: end.x, y: end.y + exitOffset }, gridSize);
      break;
    case 'left':
      entry2 = snapToGrid({ x: end.x - exitOffset, y: end.y }, gridSize);
      break;
    case 'right':
      entry2 = snapToGrid({ x: end.x + exitOffset, y: end.y }, gridSize);
      break;
    default:
      entry2 = end;
  }

  // Polacz exit1 z entry2 poprzez kanal
  // Uzyj deterministycznego punktu posredniego
  const channelY = snapToGrid(
    { x: 0, y: Math.min(exit1.y, entry2.y) - channelOffset },
    gridSize
  ).y;

  channelEntry = snapToGrid({ x: exit1.x, y: channelY }, gridSize);
  channelExit = snapToGrid({ x: entry2.x, y: channelY }, gridSize);

  // Zbuduj sciezke
  const path: Position[] = [start];

  if (exit1.x !== start.x || exit1.y !== start.y) {
    path.push(exit1);
  }

  if (channelEntry.x !== exit1.x || channelEntry.y !== exit1.y) {
    path.push(channelEntry);
  }

  if (channelExit.x !== channelEntry.x || channelExit.y !== channelEntry.y) {
    path.push(channelExit);
  }

  if (entry2.x !== channelExit.x || entry2.y !== channelExit.y) {
    path.push(entry2);
  }

  if (end.x !== entry2.x || end.y !== entry2.y) {
    path.push(end);
  }

  // Usun duplikaty
  return removeDuplicatePoints(path);
}

// =============================================================================
// FUNKCJE POMOCNICZE
// =============================================================================

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
 * Sprawdz czy sciezka koliduje z przeszkodami.
 */
function pathHasCollision(
  path: Position[],
  obstacles: Array<{ symbolId: string; bbox: { x: number; y: number; width: number; height: number } }>,
  margin: number
): boolean {
  if (path.length < 2) return false;

  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];

    for (const obstacle of obstacles) {
      if (lineIntersectsBoundingBox(p1, p2, obstacle.bbox, margin)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Usun kolejne duplikaty punktow.
 */
function removeDuplicatePoints(path: Position[]): Position[] {
  if (path.length === 0) return [];

  const result: Position[] = [path[0]];

  for (let i = 1; i < path.length; i++) {
    const prev = result[result.length - 1];
    const curr = path[i];

    if (curr.x !== prev.x || curr.y !== prev.y) {
      result.push(curr);
    }
  }

  return result;
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
