/**
 * TOPOLOGICAL AUTO-LAYOUT ENGINE — Phase 6: Collision Guard
 *
 * Walidacja kolizji symbol-symbol na poziomie CI.
 * Kolizja symbol-symbol = FAIL CI.
 *
 * ZASADY:
 * - Symbol-symbol: zakaz absolutny (FAIL CI)
 * - Label/halo: dopuszczalne stykanie
 * - Marginesy eksportowe: PDF A3/A4, PNG 100%/67%
 *
 * DETERMINIZM: Ten sam layout -> identyczny raport kolizji.
 */

import type { AnySldSymbol, NodeSymbol, Position } from '../../types';
import type {
  SymbolBounds,
  CollisionPair,
  CollisionReport,
  LayoutGeometryConfig,
} from './types';
import { DEFAULT_GEOMETRY_CONFIG } from './geometricSkeleton';

// =============================================================================
// SYMBOL BOUNDS CALCULATION
// =============================================================================

/**
 * Calculate AABB bounds for a symbol.
 * DETERMINISTIC: Pure function.
 */
export function calculateSymbolBounds(
  symbol: AnySldSymbol,
  position: Position,
  config: LayoutGeometryConfig = DEFAULT_GEOMETRY_CONFIG
): SymbolBounds {
  let halfWidth: number;
  let halfHeight: number;

  switch (symbol.elementType) {
    case 'Bus': {
      const bus = symbol as NodeSymbol;
      halfWidth = (bus.width || config.minBusbarWidth) / 2;
      halfHeight = (bus.height || config.busbarHeight) / 2;
      break;
    }
    case 'TransformerBranch':
      halfWidth = 20;
      halfHeight = config.transformerHeight / 2;
      break;
    case 'Switch':
      halfWidth = config.switchWidth / 2;
      halfHeight = config.switchHeight / 2;
      break;
    case 'LineBranch':
      halfWidth = config.branchWidth / 2;
      halfHeight = config.branchHeight / 2;
      break;
    case 'Source':
      halfWidth = 25;
      halfHeight = config.sourceHeight / 2;
      break;
    case 'Load':
      halfWidth = config.loadWidth / 2;
      halfHeight = config.loadHeight / 2;
      break;
    default:
      halfWidth = 30;
      halfHeight = 20;
  }

  return {
    symbolId: symbol.id,
    cx: position.x,
    cy: position.y,
    halfWidth,
    halfHeight,
  };
}

// =============================================================================
// COLLISION DETECTION
// =============================================================================

/**
 * Check if two AABB bounds overlap (with clearance).
 */
function boundsOverlap(
  a: SymbolBounds,
  b: SymbolBounds,
  clearance: number
): { overlap: boolean; overlapX: number; overlapY: number } {
  const dx = Math.abs(a.cx - b.cx);
  const dy = Math.abs(a.cy - b.cy);
  const minDistX = a.halfWidth + b.halfWidth + clearance;
  const minDistY = a.halfHeight + b.halfHeight + clearance;

  const overlapX = minDistX - dx;
  const overlapY = minDistY - dy;

  return {
    overlap: overlapX > 0 && overlapY > 0,
    overlapX: Math.max(0, overlapX),
    overlapY: Math.max(0, overlapY),
  };
}

/**
 * Detect all symbol-symbol collisions.
 *
 * DETERMINISTIC: Sorted by symbol ID pairs.
 *
 * @param symbols - SLD symbols
 * @param positions - Symbol positions
 * @param clearance - Minimum clearance between symbols (px). Default: symbolClearance
 * @param config - Geometry config
 * @returns Collision report
 */
export function detectSymbolCollisions(
  symbols: AnySldSymbol[],
  positions: ReadonlyMap<string, Position>,
  clearance?: number,
  config: LayoutGeometryConfig = DEFAULT_GEOMETRY_CONFIG
): CollisionReport {
  const effectiveClearance = clearance ?? config.symbolClearance;
  const pairs: CollisionPair[] = [];
  const affectedIds = new Set<string>();

  // Build bounds for all positioned symbols
  const boundsList: SymbolBounds[] = [];
  const sorted = [...symbols].sort((a, b) => a.id.localeCompare(b.id));

  for (const symbol of sorted) {
    const pos = positions.get(symbol.id);
    if (!pos) continue;
    boundsList.push(calculateSymbolBounds(symbol, pos, config));
  }

  // Pairwise collision check (O(n^2) — acceptable for SLD scale)
  for (let i = 0; i < boundsList.length; i++) {
    for (let j = i + 1; j < boundsList.length; j++) {
      const a = boundsList[i];
      const b = boundsList[j];

      // Skip busbar-busbar collision when one is a section of the other
      // (sectioned busbars can be adjacent)
      if (
        symbols.find((s) => s.id === a.symbolId)?.elementType === 'Bus' &&
        symbols.find((s) => s.id === b.symbolId)?.elementType === 'Bus'
      ) {
        continue;
      }

      const { overlap, overlapX, overlapY } = boundsOverlap(a, b, effectiveClearance);
      if (overlap) {
        pairs.push({
          symbolA: a.symbolId,
          symbolB: b.symbolId,
          overlapX,
          overlapY,
        });
        affectedIds.add(a.symbolId);
        affectedIds.add(b.symbolId);
      }
    }
  }

  // Sort pairs deterministically
  pairs.sort((a, b) => {
    const cmp = a.symbolA.localeCompare(b.symbolA);
    if (cmp !== 0) return cmp;
    return a.symbolB.localeCompare(b.symbolB);
  });

  return {
    hasCollisions: pairs.length > 0,
    pairs,
    affectedSymbolCount: affectedIds.size,
  };
}

// =============================================================================
// COLLISION RESOLUTION (DETERMINISTIC)
// =============================================================================

/**
 * Resolve symbol-symbol collisions by shifting the lower-priority symbol.
 *
 * PRIORITY (immovable first):
 * 1. Busbars (highest - never move)
 * 2. Transformers
 * 3. Sources
 * 4. Switches
 * 5. Branches
 * 6. Loads (lowest - move first)
 *
 * TIE-BREAK: Symbol with lexically smaller ID stays.
 *
 * @param symbols - SLD symbols
 * @param positions - Current positions (mutable copy)
 * @param maxIterations - Maximum resolution iterations
 * @param config - Geometry config
 * @returns Resolved positions and count
 */
export function resolveSymbolCollisions(
  symbols: AnySldSymbol[],
  positions: Map<string, Position>,
  maxIterations: number = 20,
  config: LayoutGeometryConfig = DEFAULT_GEOMETRY_CONFIG
): { resolved: Map<string, Position>; resolvedCount: number } {
  const resolved = new Map(positions);
  let totalResolved = 0;

  const typePriority: Record<string, number> = {
    Bus: 0,
    TransformerBranch: 1,
    Source: 2,
    Switch: 3,
    LineBranch: 4,
    Load: 5,
  };

  for (let iter = 0; iter < maxIterations; iter++) {
    const report = detectSymbolCollisions(symbols, resolved, config.symbolClearance, config);
    if (!report.hasCollisions) break;

    let resolvedThisIteration = 0;

    for (const pair of report.pairs) {
      const symA = symbols.find((s) => s.id === pair.symbolA);
      const symB = symbols.find((s) => s.id === pair.symbolB);
      if (!symA || !symB) continue;

      const posA = resolved.get(pair.symbolA);
      const posB = resolved.get(pair.symbolB);
      if (!posA || !posB) continue;

      // Determine which symbol to move
      const prioA = typePriority[symA.elementType] ?? 5;
      const prioB = typePriority[symB.elementType] ?? 5;

      let mover: string;
      let anchor: Position;

      if (prioA !== prioB) {
        mover = prioA > prioB ? pair.symbolA : pair.symbolB;
      } else {
        mover = pair.symbolA.localeCompare(pair.symbolB) > 0 ? pair.symbolA : pair.symbolB;
      }

      const moverPos = resolved.get(mover)!;
      anchor = mover === pair.symbolA ? posB : posA;

      // Calculate shift direction
      const dx = moverPos.x - anchor.x;
      const dy = moverPos.y - anchor.y;

      // Shift horizontally if overlap is mostly in Y, otherwise vertically
      let shiftX = 0;
      let shiftY = 0;

      if (pair.overlapX < pair.overlapY) {
        // Shift horizontally
        shiftX = pair.overlapX * (dx >= 0 ? 1 : -1);
      } else {
        // Shift vertically (prefer downward for MV SLD)
        shiftY = pair.overlapY * (dy >= 0 ? 1 : 1);
      }

      const newX = Math.round((moverPos.x + shiftX) / config.gridSize) * config.gridSize;
      const newY = Math.round((moverPos.y + shiftY) / config.gridSize) * config.gridSize;

      if (newX !== moverPos.x || newY !== moverPos.y) {
        resolved.set(mover, { x: newX, y: newY });
        resolvedThisIteration++;
        totalResolved++;
      }
    }

    if (resolvedThisIteration === 0) break;
  }

  return { resolved, resolvedCount: totalResolved };
}

// =============================================================================
// EXPORT MARGIN VALIDATION
// =============================================================================

/**
 * Validate that all symbols fit within export margins.
 *
 * @param positions - Symbol positions
 * @param symbols - SLD symbols
 * @param format - Export format
 * @param config - Geometry config
 */
export function validateExportMargins(
  positions: ReadonlyMap<string, Position>,
  symbols: AnySldSymbol[],
  format: 'A3' | 'A4' | 'PNG_100' | 'PNG_67' = 'A3',
  config: LayoutGeometryConfig = DEFAULT_GEOMETRY_CONFIG
): { fitsInPage: boolean; requiredWidth: number; requiredHeight: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const symbol of symbols) {
    const pos = positions.get(symbol.id);
    if (!pos) continue;
    const bounds = calculateSymbolBounds(symbol, pos, config);
    minX = Math.min(minX, bounds.cx - bounds.halfWidth);
    maxX = Math.max(maxX, bounds.cx + bounds.halfWidth);
    minY = Math.min(minY, bounds.cy - bounds.halfHeight);
    maxY = Math.max(maxY, bounds.cy + bounds.halfHeight);
  }

  const margin = config.padding;
  const requiredWidth = maxX - minX + margin * 2;
  const requiredHeight = maxY - minY + margin * 2;

  // Page sizes in px (at 96 DPI)
  const pageSizes: Record<string, { w: number; h: number }> = {
    A3: { w: 1587, h: 1123 },
    A4: { w: 1123, h: 794 },
    PNG_100: { w: 3840, h: 2160 },
    PNG_67: { w: 2573, h: 1447 },
  };

  const page = pageSizes[format] ?? pageSizes.A3;

  return {
    fitsInPage: requiredWidth <= page.w && requiredHeight <= page.h,
    requiredWidth,
    requiredHeight,
  };
}
