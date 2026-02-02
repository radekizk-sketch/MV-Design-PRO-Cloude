/**
 * PORT UTILITIES — Funkcje do wyznaczania punktow portow symboli SLD
 *
 * CANONICAL ALIGNMENT:
 * - SLD_KANONICZNA_SPECYFIKACJA.md § 3: Porty elektryczne
 * - etap_symbols/ports.json: Definicje portow
 *
 * FEATURES:
 * - Wyznaczanie punktow portow dla symboli
 * - Transformacja portow przy rotacji
 * - Deterministyczne mapowanie port -> punkt
 */

import type { AnySldSymbol, BranchSymbol, Position, SwitchSymbol } from '../types';

// =============================================================================
// STALE KONFIGURACYJNE
// =============================================================================

/** ViewBox symboli ETAP (100x100) */
const VIEWBOX_SIZE = 100;

/** Rozmiary symboli (px) */
export const SYMBOL_SIZES: Record<string, { width: number; height: number }> = {
  Bus: { width: 80, height: 40 },
  LineBranch: { width: 60, height: 40 },
  TransformerBranch: { width: 40, height: 50 },
  Switch: { width: 40, height: 50 },
  Source: { width: 50, height: 60 },
  Load: { width: 30, height: 30 },
};

/** Nazwy portow */
export type PortName = 'top' | 'bottom' | 'left' | 'right';

/** Port w viewBox (0-100) */
export interface PortDefinition {
  x: number;
  y: number;
}

/** Definicje portow dla symboli (z ports.json) */
export const PORT_DEFINITIONS: Record<string, Record<PortName, PortDefinition>> = {
  busbar: {
    left: { x: 0, y: 50 },
    right: { x: 100, y: 50 },
    top: { x: 50, y: 50 },     // Bus: porty na srodku dla polaczen pionowych
    bottom: { x: 50, y: 50 },
  },
  circuit_breaker: {
    top: { x: 50, y: 0 },
    bottom: { x: 50, y: 100 },
    left: { x: 50, y: 50 },
    right: { x: 50, y: 50 },
  },
  disconnector: {
    top: { x: 50, y: 0 },
    bottom: { x: 50, y: 100 },
    left: { x: 50, y: 50 },
    right: { x: 50, y: 50 },
  },
  line_overhead: {
    left: { x: 0, y: 50 },
    right: { x: 100, y: 50 },
    top: { x: 50, y: 50 },
    bottom: { x: 50, y: 50 },
  },
  line_cable: {
    left: { x: 0, y: 50 },
    right: { x: 100, y: 50 },
    top: { x: 50, y: 50 },
    bottom: { x: 50, y: 50 },
  },
  transformer_2w: {
    top: { x: 50, y: 0 },
    bottom: { x: 50, y: 100 },
    left: { x: 50, y: 50 },
    right: { x: 50, y: 50 },
  },
  utility_feeder: {
    bottom: { x: 50, y: 100 },
    top: { x: 50, y: 0 },
    left: { x: 50, y: 50 },
    right: { x: 50, y: 50 },
  },
  generator: {
    bottom: { x: 50, y: 100 },
    top: { x: 50, y: 0 },
    left: { x: 50, y: 50 },
    right: { x: 50, y: 50 },
  },
  pv: {
    bottom: { x: 50, y: 100 },
    top: { x: 50, y: 0 },
    left: { x: 50, y: 50 },
    right: { x: 50, y: 50 },
  },
  fw: {
    bottom: { x: 50, y: 100 },
    top: { x: 50, y: 0 },
    left: { x: 50, y: 50 },
    right: { x: 50, y: 50 },
  },
  bess: {
    bottom: { x: 50, y: 100 },
    top: { x: 50, y: 0 },
    left: { x: 50, y: 50 },
    right: { x: 50, y: 50 },
  },
  load: {
    top: { x: 50, y: 0 },
    bottom: { x: 50, y: 100 },
    left: { x: 50, y: 50 },
    right: { x: 50, y: 50 },
  },
};

/** Mapowanie ElementType -> symbolId dla portow */
const ELEMENT_TO_SYMBOL: Record<string, string> = {
  Bus: 'busbar',
  LineBranch: 'line_cable',
  TransformerBranch: 'transformer_2w',
  Switch: 'circuit_breaker',
  Source: 'utility_feeder',
  Load: 'load',
};

// =============================================================================
// FUNKCJE POMOCNICZE
// =============================================================================

/**
 * Pobierz symbolId dla typu elementu.
 */
export function getSymbolId(elementType: string, switchType?: string, branchType?: string): string {
  if (elementType === 'Switch') {
    return switchType === 'DISCONNECTOR' || switchType === 'FUSE'
      ? 'disconnector'
      : 'circuit_breaker';
  }
  if (elementType === 'LineBranch') {
    return branchType === 'LINE' ? 'line_overhead' : 'line_cable';
  }
  return ELEMENT_TO_SYMBOL[elementType] ?? 'busbar';
}

/**
 * Pobierz rozmiar symbolu (px).
 */
export function getSymbolSize(elementType: string): { width: number; height: number } {
  return SYMBOL_SIZES[elementType] ?? { width: 40, height: 40 };
}

/**
 * Pobierz definicje portow dla symbolu.
 */
export function getPortDefinitions(symbolId: string): Record<PortName, PortDefinition> {
  return PORT_DEFINITIONS[symbolId] ?? PORT_DEFINITIONS.busbar;
}

// =============================================================================
// GLOWNA FUNKCJA: WYZNACZ PUNKT PORTU
// =============================================================================

/**
 * Wyznacz punkt portu w ukladzie wspolrzednych plotna.
 *
 * DETERMINIZM: Ten sam symbol + port -> ten sam punkt
 *
 * @param symbol - Symbol SLD
 * @param portName - Nazwa portu (top/bottom/left/right)
 * @param rotation - Rotacja symbolu (0/90/180/270), domyslnie 0
 * @returns Punkt portu w ukladzie wspolrzednych plotna
 */
export function getPortPoint(
  symbol: AnySldSymbol,
  portName: PortName,
  rotation: number = 0
): Position {
  const { position, elementType } = symbol;

  // Pobierz symbolId i rozmiar
  let symbolId: string;
  if (elementType === 'Switch') {
    symbolId = getSymbolId(elementType, (symbol as SwitchSymbol).switchType);
  } else if (elementType === 'LineBranch') {
    symbolId = getSymbolId(elementType, undefined, (symbol as BranchSymbol).branchType);
  } else {
    symbolId = getSymbolId(elementType);
  }

  const size = getSymbolSize(elementType);
  const ports = getPortDefinitions(symbolId);

  // Pobierz port (z transformacja rotacji jesli potrzebna)
  const transformedPortName = transformPortName(portName, rotation);
  const portDef = ports[transformedPortName] ?? ports[portName] ?? { x: 50, y: 50 };

  // Transformuj wspolrzedne portu przy rotacji
  const { x: portX, y: portY } = transformPortCoordinates(portDef, rotation);

  // Skaluj z viewBox (100x100) do rozmiaru symbolu
  const scaleX = size.width / VIEWBOX_SIZE;
  const scaleY = size.height / VIEWBOX_SIZE;

  // Oblicz punkt w ukladzie plotna
  // Symbol jest wycentrowany na position, wiec offset = -size/2
  const canvasX = position.x - size.width / 2 + portX * scaleX;
  const canvasY = position.y - size.height / 2 + portY * scaleY;

  return { x: canvasX, y: canvasY };
}

/**
 * Transformuj nazwe portu przy rotacji.
 */
function transformPortName(portName: PortName, rotation: number): PortName {
  if (rotation === 0) return portName;

  const portMapping: Record<number, Record<PortName, PortName>> = {
    90: { top: 'right', right: 'bottom', bottom: 'left', left: 'top' },
    180: { top: 'bottom', right: 'left', bottom: 'top', left: 'right' },
    270: { top: 'left', right: 'top', bottom: 'right', left: 'bottom' },
  };

  return portMapping[rotation]?.[portName] ?? portName;
}

/**
 * Transformuj wspolrzedne portu przy rotacji.
 */
function transformPortCoordinates(port: PortDefinition, rotation: number): PortDefinition {
  const { x, y } = port;

  switch (rotation) {
    case 90:
      return { x: VIEWBOX_SIZE - y, y: x };
    case 180:
      return { x: VIEWBOX_SIZE - x, y: VIEWBOX_SIZE - y };
    case 270:
      return { x: y, y: VIEWBOX_SIZE - x };
    default:
      return { x, y };
  }
}

// =============================================================================
// FUNKCJE DLA POLACZEN
// =============================================================================

/**
 * Wybierz najlepszy port do polaczenia miedzy dwoma symbolami.
 *
 * Heurystyka:
 * - Jesli symbole sa w pionie (dy > dx): top/bottom
 * - Jesli symbole sa w poziomie (dx > dy): left/right
 * - Wybierz port blizszy drugiemu symbolowi
 *
 * @param fromSymbol - Symbol zrodlowy
 * @param toSymbol - Symbol docelowy
 * @returns Para portow (fromPort, toPort)
 */
export function selectBestPorts(
  fromSymbol: AnySldSymbol,
  toSymbol: AnySldSymbol
): { fromPort: PortName; toPort: PortName } {
  const dx = toSymbol.position.x - fromSymbol.position.x;
  const dy = toSymbol.position.y - fromSymbol.position.y;

  // Dla Bus: preferuj top/bottom dla polaczen pionowych
  const fromIsBus = fromSymbol.elementType === 'Bus';
  const toIsBus = toSymbol.elementType === 'Bus';

  // Dla Source/Load: preferuj odpowiednie porty
  const fromIsSource = fromSymbol.elementType === 'Source';
  const toIsLoad = toSymbol.elementType === 'Load';

  // Okresl kierunek
  const isVertical = Math.abs(dy) > Math.abs(dx);

  let fromPort: PortName;
  let toPort: PortName;

  if (isVertical) {
    // Polaczenie pionowe
    if (dy > 0) {
      // toSymbol jest ponizej fromSymbol
      fromPort = fromIsBus ? 'bottom' : (fromIsSource ? 'bottom' : 'bottom');
      toPort = toIsBus ? 'top' : (toIsLoad ? 'top' : 'top');
    } else {
      // toSymbol jest powyzej fromSymbol
      fromPort = fromIsBus ? 'top' : 'top';
      toPort = toIsBus ? 'bottom' : 'bottom';
    }
  } else {
    // Polaczenie poziome
    if (dx > 0) {
      // toSymbol jest na prawo od fromSymbol
      fromPort = fromIsBus ? 'right' : 'right';
      toPort = toIsBus ? 'left' : 'left';
    } else {
      // toSymbol jest na lewo od fromSymbol
      fromPort = fromIsBus ? 'left' : 'left';
      toPort = toIsBus ? 'right' : 'right';
    }
  }

  return { fromPort, toPort };
}

/**
 * Oblicz bounding box symbolu (dla detekcji kolizji).
 */
export function getSymbolBoundingBox(symbol: AnySldSymbol): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const size = getSymbolSize(symbol.elementType);
  return {
    x: symbol.position.x - size.width / 2,
    y: symbol.position.y - size.height / 2,
    width: size.width,
    height: size.height,
  };
}

/**
 * Sprawdz czy punkt jest wewnatrz bounding box.
 */
export function pointInBoundingBox(
  point: Position,
  bbox: { x: number; y: number; width: number; height: number },
  margin: number = 0
): boolean {
  return (
    point.x >= bbox.x - margin &&
    point.x <= bbox.x + bbox.width + margin &&
    point.y >= bbox.y - margin &&
    point.y <= bbox.y + bbox.height + margin
  );
}

/**
 * Sprawdz czy odcinek liniowy przecina bounding box.
 */
export function lineIntersectsBoundingBox(
  p1: Position,
  p2: Position,
  bbox: { x: number; y: number; width: number; height: number },
  margin: number = 5
): boolean {
  const expandedBbox = {
    x: bbox.x - margin,
    y: bbox.y - margin,
    width: bbox.width + 2 * margin,
    height: bbox.height + 2 * margin,
  };

  // Sprawdz czy ktorykolwiek punkt jest w bbox
  if (pointInBoundingBox(p1, expandedBbox) || pointInBoundingBox(p2, expandedBbox)) {
    return true;
  }

  // Sprawdz przeciecie z kazdym bokiem bbox
  const left = expandedBbox.x;
  const right = expandedBbox.x + expandedBbox.width;
  const top = expandedBbox.y;
  const bottom = expandedBbox.y + expandedBbox.height;

  // Linia pozioma przecinajaca bbox
  if (p1.y === p2.y) {
    const y = p1.y;
    if (y >= top && y <= bottom) {
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      if (minX <= right && maxX >= left) {
        return true;
      }
    }
  }

  // Linia pionowa przecinajaca bbox
  if (p1.x === p2.x) {
    const x = p1.x;
    if (x >= left && x <= right) {
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      if (minY <= bottom && maxY >= top) {
        return true;
      }
    }
  }

  return false;
}
