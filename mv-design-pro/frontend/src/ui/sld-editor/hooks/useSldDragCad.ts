/**
 * useSldDragCad — Hook for CAD drag in project mode (RUN #3H DOMKNIECIE).
 *
 * CANONICAL CONTRACT:
 * - Dziala TYLKO gdy sldProjectModeStore.projectModeActive === true.
 * - World delta liczony po Camera matrix (startPos → currentPos).
 * - Snap przez snapDeltaToGrid() z geometryOverrides.ts (GEOMETRY_GRID_SNAP=20px).
 * - Override tworzony WYLACZNIE przez sldProjectModeStore.applyDelta().
 * - NIE modyfikuje LayoutResultV1.
 *
 * SCOPE:
 * - BLOCK → MOVE_DELTA
 * - LABEL → MOVE_LABEL (SET_LABEL_ANCHOR)
 *
 * PIPELINE:
 *   mouseDown → track startPos
 *   mouseMove → compute worldDelta (nie snap w trakcie — preview only)
 *   mouseUp → snapDelta → store.applyDelta() → override w sldProjectModeStore
 */

import { useCallback, useRef } from 'react';

import { useSldProjectModeStore } from '../../sld/sldProjectModeStore';
import { OverrideScopeV1, OverrideOperationV1, snapDeltaToGrid } from '../../sld/core/geometryOverrides';

// =============================================================================
// TYPES
// =============================================================================

export type CadDragTarget = 'BLOCK' | 'LABEL';

export interface CadDragState {
  /** ID elementu (nodeId / blockId). */
  readonly elementId: string;
  /** Typ celu (BLOCK / LABEL). */
  readonly target: CadDragTarget;
  /** Pozycja poczatkowa (world coords). */
  readonly startX: number;
  readonly startY: number;
  /** Aktualna pozycja (world coords). */
  readonly currentX: number;
  readonly currentY: number;
}

export interface UseSldDragCadResult {
  /** Rozpocznij drag elementu. */
  startCadDrag: (elementId: string, target: CadDragTarget, worldX: number, worldY: number) => void;
  /** Aktualizuj pozycje drag (preview). */
  updateCadDrag: (worldX: number, worldY: number) => void;
  /** Zakoncz drag — tworzy override w store. */
  endCadDrag: () => void;
  /** Anuluj drag (bez tworzenia override). */
  cancelCadDrag: () => void;
  /** Czy trwa drag CAD. */
  isCadDragging: boolean;
  /** Aktualny stan drag (do preview overlay). */
  cadDragState: CadDragState | null;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for CAD drag in project mode.
 *
 * Generuje overrides w sldProjectModeStore na zakonczenie drag.
 * Snap-to-grid aplikowany automatycznie (GEOMETRY_GRID_SNAP=20px).
 */
export function useSldDragCad(): UseSldDragCadResult {
  const dragRef = useRef<CadDragState | null>(null);
  const projectModeActive = useSldProjectModeStore((s) => s.projectModeActive);
  const applyDelta = useSldProjectModeStore((s) => s.applyDelta);

  const startCadDrag = useCallback(
    (elementId: string, target: CadDragTarget, worldX: number, worldY: number) => {
      if (!projectModeActive) return;

      dragRef.current = {
        elementId,
        target,
        startX: worldX,
        startY: worldY,
        currentX: worldX,
        currentY: worldY,
      };
    },
    [projectModeActive],
  );

  const updateCadDrag = useCallback(
    (worldX: number, worldY: number) => {
      if (!dragRef.current) return;

      dragRef.current = {
        ...dragRef.current,
        currentX: worldX,
        currentY: worldY,
      };
    },
    [],
  );

  const endCadDrag = useCallback(() => {
    const state = dragRef.current;
    if (!state) return;

    const rawDx = state.currentX - state.startX;
    const rawDy = state.currentY - state.startY;

    // Ignore tiny drags (less than 2px in any direction)
    if (Math.abs(rawDx) < 2 && Math.abs(rawDy) < 2) {
      dragRef.current = null;
      return;
    }

    if (state.target === 'BLOCK') {
      // BLOCK → MOVE_DELTA (snap applied by store.applyDelta automatically)
      const snapped = snapDeltaToGrid(rawDx, rawDy);
      if (snapped.dx === 0 && snapped.dy === 0) {
        dragRef.current = null;
        return;
      }
      applyDelta(
        state.elementId,
        OverrideScopeV1.BLOCK,
        OverrideOperationV1.MOVE_DELTA,
        snapped,
      );
    } else if (state.target === 'LABEL') {
      // LABEL → MOVE_LABEL (anchor = absolute position after drag)
      const snapped = snapDeltaToGrid(rawDx, rawDy);
      applyDelta(
        state.elementId,
        OverrideScopeV1.LABEL,
        OverrideOperationV1.MOVE_LABEL,
        { anchorX: state.startX + snapped.dx, anchorY: state.startY + snapped.dy },
      );
    }

    dragRef.current = null;
  }, [applyDelta]);

  const cancelCadDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  return {
    startCadDrag,
    updateCadDrag,
    endCadDrag,
    cancelCadDrag,
    isCadDragging: dragRef.current !== null,
    cadDragState: dragRef.current,
  };
}
