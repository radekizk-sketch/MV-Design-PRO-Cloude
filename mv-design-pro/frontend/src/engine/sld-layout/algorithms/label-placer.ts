/**
 * Smart Label Placer — 8-kierunkowe inteligentne rozmieszczanie etykiet.
 *
 * Rozszerza istniejące 4-kierunkowe rozmieszczanie z phase5-routing.ts
 * o dodatkowe 4 kierunki diagonalne (top-right, top-left, bottom-right, bottom-left).
 *
 * ALGORYTM:
 * 1. Próbuje 8 kierunków w kolejności (right → top-right → top → top-left → left → ...)
 * 2. Wybiera pierwsze miejsce bez kolizji z occupiedAreas
 * 3. Fallback: Y-stack (jak phase5-routing.ts)
 * 4. Ultimate fallback: right z clamped distance
 *
 * DETERMINIZM: sortowanie symbolów by ID, kolejność prób stała.
 */

import type { ElementPosition, LabelPosition, LayoutSymbol, Rectangle } from '../types';

// =============================================================================
// TYPY
// =============================================================================

export type LabelAnchor =
  | 'right'
  | 'top-right'
  | 'top'
  | 'top-left'
  | 'left'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';

export interface SmartLabelConfig {
  /** Preferowany kierunek (próbowany jako pierwszy). Domyślnie 'right'. */
  preferredAnchor: LabelAnchor;
  /** Maksymalna odległość etykiety od elementu [px]. Domyślnie 180. */
  maxDistance: number;
  /** Szacowana szerokość etykiety [px]. Domyślnie 120. */
  labelWidth: number;
  /** Szacowana wysokość etykiety [px]. Domyślnie 24. */
  labelHeight: number;
  /** Margines od krawędzi elementu [px]. Domyślnie 8. */
  margin: number;
}

export const DEFAULT_SMART_LABEL_CONFIG: SmartLabelConfig = {
  preferredAnchor: 'right',
  maxDistance:     180,
  labelWidth:      120,
  labelHeight:     24,
  margin:          8,
};

// Kolejność kierunków — zoptymalizowana dla schematów SN (prawo preferowane)
const ANCHOR_ORDER: LabelAnchor[] = [
  'right', 'top-right', 'top', 'top-left',
  'left', 'bottom-left', 'bottom', 'bottom-right',
];

// =============================================================================
// GŁÓWNA FUNKCJA
// =============================================================================

/**
 * Rozmieszcza etykiety bez kolizji z symbolami i innymi etykietami.
 *
 * @param symbols       - symbole do oetykietowania
 * @param positions     - pozycje elementów
 * @param occupiedAreas - prostokąty zajętych obszarów (symbole + poprzednie etykiety)
 * @param config        - konfiguracja (opcjonalna)
 * @returns mapa symbolId → LabelPosition
 */
export function placeLabelsNonOverlapping(
  symbols:       LayoutSymbol[],
  positions:     Map<string, ElementPosition>,
  occupiedAreas: Rectangle[],
  config?:       Partial<SmartLabelConfig>
): Map<string, LabelPosition> {
  const cfg: SmartLabelConfig = { ...DEFAULT_SMART_LABEL_CONFIG, ...config };

  // Sortuj symbole by ID dla determinizmu
  const sorted = [...symbols].sort((a, b) => a.id.localeCompare(b.id));

  const labelPositions = new Map<string, LabelPosition>();
  // Kopia mutable obszarów zajętych (dodajemy etykiety na bieżąco)
  const occupied: Rectangle[] = [...occupiedAreas];

  for (const symbol of sorted) {
    const pos = positions.get(symbol.id);
    if (!pos) continue;

    const name = symbol.elementName?.trim() ?? '';
    if (name === '') continue;

    const labelW = estimateLabelWidth(name, cfg);
    const labelH = cfg.labelHeight;

    // Ustaw kolejność prób z preferencją
    const tryOrder = buildTryOrder(cfg.preferredAnchor);

    let placed: LabelPosition | null = null;

    // Próba 1: 8 kierunków
    for (const anchor of tryOrder) {
      const candidate = computeCandidatePosition(pos, anchor, cfg);
      const bounds     = candidateBounds(candidate.position, anchor, labelW, labelH);

      const dist = distance(candidate.position, pos.position);
      if (dist > cfg.maxDistance) continue;

      if (!hasCollision(bounds, occupied)) {
        placed = {
          symbolId: symbol.id,
          position: candidate.position,
          anchor:   candidate.textAnchor,
          placement: toPlacement(anchor),
          offset:   candidate.offset,
          adjusted: false,
        };
        occupied.push(bounds);
        break;
      }
    }

    // Próba 2: Y-stack (3 poziomy)
    if (!placed) {
      placed = tryYStack(symbol, pos, occupied, cfg, labelW, labelH);
    }

    // Fallback: right z clamped distance
    if (!placed) {
      placed = fallbackRight(symbol, pos, cfg);
    }

    labelPositions.set(symbol.id, placed);
  }

  return labelPositions;
}

// =============================================================================
// POMOCNICZE
// =============================================================================

interface CandidateResult {
  position:   { x: number; y: number };
  textAnchor: 'start' | 'middle' | 'end';
  offset:     { x: number; y: number };
}

function computeCandidatePosition(
  elementPos: ElementPosition,
  anchor:     LabelAnchor,
  cfg:        SmartLabelConfig
): CandidateResult {
  const { position, size } = elementPos;
  const m = cfg.margin;
  const hw = size.width  / 2;
  const hh = size.height / 2;

  switch (anchor) {
    case 'right':
      return {
        position:   { x: position.x + hw + m, y: position.y },
        textAnchor: 'start',
        offset:     { x: hw + m, y: 0 },
      };
    case 'left':
      return {
        position:   { x: position.x - hw - m, y: position.y },
        textAnchor: 'end',
        offset:     { x: -(hw + m), y: 0 },
      };
    case 'top':
      return {
        position:   { x: position.x, y: position.y - hh - m },
        textAnchor: 'middle',
        offset:     { x: 0, y: -(hh + m) },
      };
    case 'bottom':
      return {
        position:   { x: position.x, y: position.y + hh + m },
        textAnchor: 'middle',
        offset:     { x: 0, y: hh + m },
      };
    case 'top-right':
      return {
        position:   { x: position.x + hw + m, y: position.y - hh - m },
        textAnchor: 'start',
        offset:     { x: hw + m, y: -(hh + m) },
      };
    case 'top-left':
      return {
        position:   { x: position.x - hw - m, y: position.y - hh - m },
        textAnchor: 'end',
        offset:     { x: -(hw + m), y: -(hh + m) },
      };
    case 'bottom-right':
      return {
        position:   { x: position.x + hw + m, y: position.y + hh + m },
        textAnchor: 'start',
        offset:     { x: hw + m, y: hh + m },
      };
    case 'bottom-left':
      return {
        position:   { x: position.x - hw - m, y: position.y + hh + m },
        textAnchor: 'end',
        offset:     { x: -(hw + m), y: hh + m },
      };
  }
}

function candidateBounds(
  pos:    { x: number; y: number },
  anchor: LabelAnchor,
  w:      number,
  h:      number
): Rectangle {
  // Oblicz lewy-górny narożnik etykiety na podstawie text-anchor
  let x: number;
  if (anchor === 'right' || anchor === 'top-right' || anchor === 'bottom-right') {
    x = pos.x;
  } else if (anchor === 'left' || anchor === 'top-left' || anchor === 'bottom-left') {
    x = pos.x - w;
  } else {
    x = pos.x - w / 2;
  }
  return { x, y: pos.y - h / 2, width: w, height: h };
}

function hasCollision(bounds: Rectangle, occupied: Rectangle[]): boolean {
  return occupied.some((r) => rectanglesOverlap(bounds, r));
}

function rectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
  return !(
    a.x + a.width  <= b.x ||
    b.x + b.width  <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function buildTryOrder(preferred: LabelAnchor): LabelAnchor[] {
  const idx = ANCHOR_ORDER.indexOf(preferred);
  if (idx === -1) return ANCHOR_ORDER;
  // Zacznij od preferred, potem reszta w kolejności
  return [...ANCHOR_ORDER.slice(idx), ...ANCHOR_ORDER.slice(0, idx)];
}

function toPlacement(anchor: LabelAnchor): 'top' | 'bottom' | 'left' | 'right' {
  if (anchor.includes('top'))    return 'top';
  if (anchor.includes('bottom')) return 'bottom';
  if (anchor.includes('left'))   return 'left';
  return 'right';
}

function estimateLabelWidth(text: string, cfg: SmartLabelConfig): number {
  return Math.min(cfg.labelWidth, Math.max(30, text.length * 7));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

const STACK_STEP_Y = 16;
const STACK_LEVELS = 4;

function tryYStack(
  symbol:    LayoutSymbol,
  pos:       ElementPosition,
  occupied:  Rectangle[],
  cfg:       SmartLabelConfig,
  labelW:    number,
  labelH:    number
): LabelPosition | null {
  for (let level = 1; level <= STACK_LEVELS; level++) {
    for (const anchor of ANCHOR_ORDER) {
      const candidate = computeCandidatePosition(pos, anchor, cfg);
      const stackedPos = {
        x: candidate.position.x,
        y: candidate.position.y + level * STACK_STEP_Y,
      };
      const bounds = candidateBounds(stackedPos, anchor, labelW, labelH);
      const dist   = distance(stackedPos, pos.position);

      if (dist > cfg.maxDistance) continue;
      if (!hasCollision(bounds, occupied)) {
        occupied.push(bounds);
        return {
          symbolId: symbol.id,
          position: stackedPos,
          anchor:   candidate.textAnchor,
          placement: toPlacement(anchor),
          offset:   {
            x: candidate.offset.x,
            y: candidate.offset.y + level * STACK_STEP_Y,
          },
          adjusted: true,
        };
      }
    }
  }
  return null;
}

function fallbackRight(
  symbol: LayoutSymbol,
  pos:    ElementPosition,
  cfg:    SmartLabelConfig
): LabelPosition {
  const x = pos.position.x + pos.size.width / 2 + cfg.margin;
  return {
    symbolId: symbol.id,
    position: { x, y: pos.position.y },
    anchor:   'start',
    placement: 'right',
    offset:   { x: pos.size.width / 2 + cfg.margin, y: 0 },
    adjusted: true,
  };
}
