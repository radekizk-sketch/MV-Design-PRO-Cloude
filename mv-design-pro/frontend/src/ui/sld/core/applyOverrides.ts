/**
 * applyOverrides — sklada LayoutResultV1 + ProjectGeometryOverridesV1 → EffectiveLayoutV1.
 *
 * CANONICAL CONTRACT (BINDING — RUN #3H):
 * - applyOverrides() jest JEDYNA sciezka skladania overrides z layoutem.
 * - Nie modyfikuje wejsciowego LayoutResultV1.
 * - Deterministyczne: ten sam input → identyczny output (hash).
 * - Kolizje sprawdzane post-hoc (po nalozeniu deltas).
 *
 * PIPELINE:
 *   LayoutResultV1 + OverridesV1 → applyOverrides() → EffectiveLayoutV1
 */

import type {
  LayoutResultV1,
  NodePlacementV1,
  SwitchgearBlockV1,
  RectangleV1,
  PointV1,
} from './layoutResult';
import { computeLayoutResultHash } from './layoutResult';

import type {
  ProjectGeometryOverridesV1,
  MoveDeltaPayloadV1,
  MoveLabelPayloadV1,
} from './geometryOverrides';
import {
  OverrideScopeV1,
  OverrideOperationV1,
  computeOverridesHash,
} from './geometryOverrides';

// =============================================================================
// EFFECTIVE LAYOUT
// =============================================================================

/**
 * EffectiveLayoutV1 — wynik zlozenia LayoutResult + Overrides.
 *
 * Zawiera bazowy hash, overrides hash i zlozony effective hash.
 * Renderer uzywa EffectiveLayoutV1 (nie LayoutResultV1 bezposrednio).
 */
export interface EffectiveLayoutV1 {
  /** Hash bazowego LayoutResultV1. */
  readonly baseLayoutHash: string;
  /** Hash nadpisan (canonical). */
  readonly overridesHash: string;
  /** Zlozony hash: FNV-1a(baseLayoutHash + ':' + overridesHash). */
  readonly effectiveHash: string;
  /** Pozycje wezlow z nalozonymi deltami. */
  readonly nodePlacements: readonly NodePlacementV1[];
  /** Trasy krawedzi (bez zmian — routing z bazy). */
  readonly edgeRoutes: LayoutResultV1['edgeRoutes'];
  /** Bloki stacji z nalozonymi deltami. */
  readonly switchgearBlocks: readonly SwitchgearBlockV1[];
  /** Referencje katalogowe (bez zmian). */
  readonly catalogRefs: LayoutResultV1['catalogRefs'];
  /** Powiazania relay (bez zmian). */
  readonly relayBindings: LayoutResultV1['relayBindings'];
  /** Bledy walidacji (wlacznie z overrides). */
  readonly validationErrors: LayoutResultV1['validationErrors'];
  /** Bounding box (przeliczony). */
  readonly bounds: RectangleV1;
  /** Nadpisania etykiet (anchorX, anchorY per elementId). */
  readonly labelOverrides: ReadonlyMap<string, Readonly<{ anchorX: number; anchorY: number }>>;
  /** Ile overrides zostalo nalozonych. */
  readonly appliedCount: number;
}

// =============================================================================
// EFFECTIVE HASH
// =============================================================================

/**
 * Oblicza FNV-1a hash ze zlozenia dwoch hashow.
 */
function computeEffectiveHash(baseLayoutHash: string, overridesHash: string): string {
  const input = `${baseLayoutHash}:${overridesHash}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// =============================================================================
// APPLY OVERRIDES
// =============================================================================

/**
 * Sklada LayoutResultV1 + ProjectGeometryOverridesV1 → EffectiveLayoutV1.
 *
 * Algorytm:
 * 1. Skopiuj tablice z LayoutResultV1.
 * 2. Dla MOVE_DELTA: dodaj (dx, dy) do pozycji bazowej, przelicz bounds.
 * 3. Dla MOVE_LABEL: zapisz anchor do mapy labelOverrides.
 * 4. Przelicz bounds calego layoutu.
 * 5. Oblicz overridesHash i effectiveHash.
 * 6. NIE reroutuj krawedzi (zachowaj routing z LayoutResult).
 */
export function applyOverrides(
  layout: LayoutResultV1,
  overrides: ProjectGeometryOverridesV1 | null,
): EffectiveLayoutV1 {
  const baseLayoutHash = layout.hash || computeLayoutResultHash(layout);

  // Brak overrides — zwroc layout 1:1
  if (!overrides || overrides.items.length === 0) {
    const emptyHash = computeOverridesHash({
      overridesVersion: '1.0',
      studyCaseId: '',
      snapshotHash: '',
      items: [],
    });
    return {
      baseLayoutHash,
      overridesHash: emptyHash,
      effectiveHash: computeEffectiveHash(baseLayoutHash, emptyHash),
      nodePlacements: layout.nodePlacements,
      edgeRoutes: layout.edgeRoutes,
      switchgearBlocks: layout.switchgearBlocks,
      catalogRefs: layout.catalogRefs,
      relayBindings: layout.relayBindings,
      validationErrors: layout.validationErrors,
      bounds: layout.bounds,
      labelOverrides: new Map(),
      appliedCount: 0,
    };
  }

  // Indeksuj overrides po elementId+scope
  const nodeMoves = new Map<string, MoveDeltaPayloadV1>();
  const blockMoves = new Map<string, MoveDeltaPayloadV1>();
  const labelMoves = new Map<string, MoveLabelPayloadV1>();
  let appliedCount = 0;

  for (const item of overrides.items) {
    if (item.scope === OverrideScopeV1.NODE && item.operation === OverrideOperationV1.MOVE_DELTA) {
      nodeMoves.set(item.elementId, item.payload as MoveDeltaPayloadV1);
      appliedCount++;
    } else if (item.scope === OverrideScopeV1.BLOCK && item.operation === OverrideOperationV1.MOVE_DELTA) {
      blockMoves.set(item.elementId, item.payload as MoveDeltaPayloadV1);
      appliedCount++;
    } else if (item.scope === OverrideScopeV1.LABEL && item.operation === OverrideOperationV1.MOVE_LABEL) {
      labelMoves.set(item.elementId, item.payload as MoveLabelPayloadV1);
      appliedCount++;
    }
  }

  // Apply node MOVE_DELTA
  const newPlacements = layout.nodePlacements.map((placement): NodePlacementV1 => {
    const delta = nodeMoves.get(placement.nodeId);
    if (!delta) return placement;

    const newPos: PointV1 = {
      x: placement.position.x + delta.dx,
      y: placement.position.y + delta.dy,
    };
    const newBounds: RectangleV1 = {
      x: placement.bounds.x + delta.dx,
      y: placement.bounds.y + delta.dy,
      width: placement.bounds.width,
      height: placement.bounds.height,
    };

    return {
      nodeId: placement.nodeId,
      position: newPos,
      size: placement.size,
      bounds: newBounds,
      layer: placement.layer,
      bandIndex: placement.bandIndex,
      autoPositioned: false, // User override
    };
  });

  // Apply block MOVE_DELTA
  const newBlocks = layout.switchgearBlocks.map((block): SwitchgearBlockV1 => {
    const delta = blockMoves.get(block.blockId);
    if (!delta) return block;

    const newBounds: RectangleV1 = {
      x: block.bounds.x + delta.dx,
      y: block.bounds.y + delta.dy,
      width: block.bounds.width,
      height: block.bounds.height,
    };

    // Przesuniecie portow
    const newPorts = block.ports.map((port) => ({
      portId: port.portId,
      role: port.role,
      position: {
        x: port.position.x + delta.dx,
        y: port.position.y + delta.dy,
      },
    }));

    return {
      blockId: block.blockId,
      blockType: block.blockType,
      bounds: newBounds,
      ports: newPorts,
      internalNodes: block.internalNodes,
      label: block.label,
      detail: block.detail,
    };
  });

  // Przelicz bounds
  const allBounds = [
    ...newPlacements.map((p) => p.bounds),
    ...newBlocks.map((b) => b.bounds),
  ];
  const effectiveBounds = computeBounds(allBounds, layout.bounds);

  // Compute hashes
  const overridesHash = computeOverridesHash(overrides);
  const effectiveHash = computeEffectiveHash(baseLayoutHash, overridesHash);

  return {
    baseLayoutHash,
    overridesHash,
    effectiveHash,
    nodePlacements: newPlacements,
    edgeRoutes: layout.edgeRoutes,
    switchgearBlocks: newBlocks,
    catalogRefs: layout.catalogRefs,
    relayBindings: layout.relayBindings,
    validationErrors: layout.validationErrors,
    bounds: effectiveBounds,
    labelOverrides: labelMoves,
    appliedCount,
  };
}

// =============================================================================
// BOUNDS HELPERS
// =============================================================================

function computeBounds(
  allBounds: readonly RectangleV1[],
  fallback: RectangleV1,
): RectangleV1 {
  if (allBounds.length === 0) return fallback;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of allBounds) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// =============================================================================
// COLLISION CHECK (post-apply)
// =============================================================================

export interface CollisionCheckResultV1 {
  readonly hasCollisions: boolean;
  readonly collisions: readonly { readonly nodeA: string; readonly nodeB: string }[];
}

/**
 * Sprawdza kolizje symbol-symbol po nalozeniu overrides.
 *
 * Uzywany po applyOverrides() jako walidacja post-hoc.
 */
export function checkEffectiveCollisions(
  effective: EffectiveLayoutV1,
): CollisionCheckResultV1 {
  const collisions: { nodeA: string; nodeB: string }[] = [];

  for (let i = 0; i < effective.nodePlacements.length; i++) {
    for (let j = i + 1; j < effective.nodePlacements.length; j++) {
      const a = effective.nodePlacements[i].bounds;
      const b = effective.nodePlacements[j].bounds;

      if (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      ) {
        collisions.push({
          nodeA: effective.nodePlacements[i].nodeId,
          nodeB: effective.nodePlacements[j].nodeId,
        });
      }
    }
  }

  return {
    hasCollisions: collisions.length > 0,
    collisions,
  };
}
