/**
 * P30b — SLD Drag Hook
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § E.1: Drag single/group symbols
 * - powerfactory_ui_parity.md: Drag = 1 undo operation (mouseDown → mouseUp)
 * - P30a: UNDO/REDO integration via commands
 *
 * Hook for drag operations:
 * - Single symbol drag
 * - Group drag (maintains relative positions)
 * - Snap-to-grid support
 * - Full UNDO/REDO integration
 */

import { useCallback } from 'react';
import { useHistoryStore } from '../../history/HistoryStore';
import { useIsMutationBlocked } from '../../selection/store';
import { useSldEditorStore } from '../SldEditorStore';
import { MultiSymbolMoveCommand, type SymbolPositionChange } from '../commands/MultiSymbolMoveCommand';

export interface UseSldDragOptions {
  /** Callback when drag starts */
  onDragStart?: (symbolIds: string[]) => void;

  /** Callback when drag updates */
  onDragUpdate?: () => void;

  /** Callback when drag ends */
  onDragEnd?: () => void;
}

/**
 * Hook for SLD drag operations.
 */
export function useSldDrag(options: UseSldDragOptions = {}) {
  const { onDragStart, onDragUpdate, onDragEnd } = options;

  const sldStore = useSldEditorStore();
  const historyStore = useHistoryStore();
  const isMutationBlocked = useIsMutationBlocked();

  /**
   * Start drag operation.
   * If symbolId is not in selection, select it first (single mode).
   * If symbolId is in selection, drag all selected symbols.
   */
  const startDrag = useCallback(
    (symbolId: string, startPosition: { x: number; y: number }) => {
      if (isMutationBlocked) return;

      const { selectedIds } = sldStore;

      // Determine symbols to drag
      let symbolsToDrag: string[];
      if (selectedIds.includes(symbolId)) {
        // Drag all selected symbols
        symbolsToDrag = selectedIds;
      } else {
        // Select this symbol and drag only it
        sldStore.selectSymbol(symbolId, 'single');
        symbolsToDrag = [symbolId];
      }

      sldStore.startDrag(symbolsToDrag, startPosition);

      if (onDragStart) {
        onDragStart(symbolsToDrag);
      }
    },
    [sldStore, isMutationBlocked, onDragStart]
  );

  /**
   * Update drag position.
   */
  const updateDrag = useCallback(
    (currentPosition: { x: number; y: number }) => {
      if (!sldStore.dragState) return;

      sldStore.updateDrag(currentPosition);

      if (onDragUpdate) {
        onDragUpdate();
      }
    },
    [sldStore, onDragUpdate]
  );

  /**
   * End drag operation and create UNDO/REDO command.
   */
  const endDrag = useCallback(() => {
    const changes = sldStore.endDrag();

    if (!changes || changes.size === 0) {
      if (onDragEnd) {
        onDragEnd();
      }
      return;
    }

    // Create command for UNDO/REDO
    const symbolChanges: SymbolPositionChange[] = [];
    changes.forEach((change, symbolId) => {
      symbolChanges.push({
        symbolId,
        oldPosition: change.old,
        newPosition: change.new,
      });
    });

    const command = MultiSymbolMoveCommand.create({
      changes: symbolChanges,
      applyFn: (positions) => {
        sldStore.updateSymbolsPositions(positions);
      },
    });

    historyStore.push(command);

    if (onDragEnd) {
      onDragEnd();
    }
  }, [sldStore, historyStore, onDragEnd]);

  /**
   * Cancel drag operation (revert to original positions).
   */
  const cancelDrag = useCallback(() => {
    sldStore.cancelDrag();
  }, [sldStore]);

  return {
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    isDragging: sldStore.dragState !== null,
  };
}
