/**
 * CDSE Selection Sync — synchronizes SLD selection with backend selection_hint.
 *
 * Bidirectional sync:
 *   Backend selection_hint → UI selection → URL state
 *   User click → UI selection → (no backend call for selection-only)
 *
 * INVARIANTS:
 * - Selection state is UI-only (not persisted to Snapshot)
 * - selection_hint from DomainOpResponse is authoritative after operations
 * - Selection IDs always sorted alphabetically for determinism
 * - No local graph lookups — only element IDs
 */

/**
 * Selection hint from backend DomainOpResponse.
 */
export interface SelectionHint {
  /** Element ID to select/focus */
  elementId: string;
  /** Action to perform */
  action: 'SELECT' | 'FOCUS' | 'EXPAND';
}

/**
 * Current UI selection state.
 */
export interface SelectionState {
  /** Currently selected element IDs (sorted for determinism) */
  selectedIds: string[];
  /** Primary (last-selected) element ID */
  primaryId: string | null;
  /** Whether multi-select is active */
  isMultiSelect: boolean;
}

/**
 * Create initial empty selection state.
 */
export function createEmptySelection(): SelectionState {
  return {
    selectedIds: [],
    primaryId: null,
    isMultiSelect: false,
  };
}

/**
 * Apply a selection hint from backend response.
 *
 * Used after domain operations to sync selection with backend's recommendation.
 *
 * @param hint - Selection hint from DomainOpResponse
 * @returns Updated SelectionState
 */
export function applySelectionHint(hint: SelectionHint): SelectionState {
  return {
    selectedIds: [hint.elementId],
    primaryId: hint.elementId,
    isMultiSelect: false,
  };
}

/**
 * Apply a user click selection (single or multi-select).
 *
 * @param current - Current selection state
 * @param elementId - Clicked element ID
 * @param shiftKey - Whether shift was held (multi-select)
 * @returns Updated SelectionState (always sorted)
 */
export function applyClickSelection(
  current: SelectionState,
  elementId: string,
  shiftKey: boolean,
): SelectionState {
  if (shiftKey) {
    // Multi-select: toggle element in selection
    const isSelected = current.selectedIds.includes(elementId);
    const newIds = isSelected
      ? current.selectedIds.filter((id) => id !== elementId)
      : [...current.selectedIds, elementId];
    // Always sort for determinism
    newIds.sort();
    return {
      selectedIds: newIds,
      primaryId: isSelected ? (newIds[newIds.length - 1] ?? null) : elementId,
      isMultiSelect: newIds.length > 1,
    };
  }

  // Single select: replace selection
  return {
    selectedIds: [elementId],
    primaryId: elementId,
    isMultiSelect: false,
  };
}

/**
 * Clear all selection.
 */
export function clearSelection(): SelectionState {
  return createEmptySelection();
}

/**
 * Serialize selection to URL query params.
 *
 * @param state - Current selection state
 * @returns URL search params string (e.g., "?sel=elem1,elem2")
 */
export function selectionToUrlParams(state: SelectionState): string {
  if (state.selectedIds.length === 0) return '';
  return `?sel=${state.selectedIds.join(',')}`;
}

/**
 * Parse selection from URL query params.
 *
 * @param params - URL search string
 * @returns SelectionState parsed from URL
 */
export function selectionFromUrlParams(params: string): SelectionState {
  const match = params.match(/[?&]sel=([^&]+)/);
  if (!match) return createEmptySelection();

  const ids = match[1].split(',').filter(Boolean).sort();
  return {
    selectedIds: ids,
    primaryId: ids[ids.length - 1] ?? null,
    isMultiSelect: ids.length > 1,
  };
}
