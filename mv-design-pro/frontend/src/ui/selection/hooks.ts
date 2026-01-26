/**
 * Selection Hooks
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § E.1: Selection patterns
 * - sld_rules.md § G.1: SLD ↔ Wizard synchronization
 * - wizard_screens.md § 2.4: Property Grid updates on selection
 *
 * These hooks provide selection/navigation behavior for:
 * - SLD click → select element → update Property Grid
 * - Tree click → highlight in SLD → update Property Grid
 * - List click → highlight in SLD → update Property Grid
 */

import { useCallback, useEffect } from 'react';
import { useSelectionStore } from './store';
import type { ElementType, SelectedElement } from '../types';

/**
 * Hook for handling SLD element click.
 *
 * Per sld_rules.md § E.1:
 * - Single click: Select single element
 * - Updates Property Grid
 * - Syncs with Tree/List
 */
export function useSldSelection() {
  const { selectElement, centerSldOnElement, selectedElement } = useSelectionStore();

  /**
   * Handle click on SLD symbol.
   * Selects the element and triggers Property Grid update.
   */
  const handleSldClick = useCallback(
    (elementId: string, elementType: ElementType, elementName: string) => {
      selectElement({ id: elementId, type: elementType, name: elementName });
    },
    [selectElement]
  );

  /**
   * Handle click on empty area.
   * Clears selection.
   */
  const handleSldEmptyClick = useCallback(() => {
    selectElement(null);
  }, [selectElement]);

  /**
   * Handle double-click on SLD symbol.
   * Opens Property Grid with focus.
   */
  const handleSldDoubleClick = useCallback(
    (elementId: string, elementType: ElementType, elementName: string) => {
      selectElement({ id: elementId, type: elementType, name: elementName });
      // Property Grid auto-opens on selection, double-click could focus first editable field
    },
    [selectElement]
  );

  return {
    selectedElement,
    handleSldClick,
    handleSldEmptyClick,
    handleSldDoubleClick,
  };
}

/**
 * Hook for handling Tree/List element selection.
 *
 * Per sld_rules.md § G.1:
 * - Click in Tree → highlight in SLD + center view
 * - Updates Property Grid
 */
export function useTreeSelection() {
  const { selectElement, centerSldOnElement, expandTreeNode, selectedElement } =
    useSelectionStore();

  /**
   * Handle click on Tree/List item.
   * Selects element and centers SLD view.
   */
  const handleTreeClick = useCallback(
    (elementId: string, elementType: ElementType, elementName: string) => {
      selectElement({ id: elementId, type: elementType, name: elementName });
      centerSldOnElement(elementId);
    },
    [selectElement, centerSldOnElement]
  );

  /**
   * Expand tree path to element.
   */
  const expandToElement = useCallback(
    (path: string[]) => {
      path.forEach((nodeId) => expandTreeNode(nodeId));
    },
    [expandTreeNode]
  );

  return {
    selectedElement,
    handleTreeClick,
    expandToElement,
  };
}

/**
 * Hook for bidirectional sync between SLD and Tree.
 *
 * When selection changes from SLD, expand tree to show the element.
 * When selection changes from Tree, center SLD on the element.
 */
export function useSelectionSync(options: {
  onSldCenterRequest?: (elementId: string) => void;
  onTreeExpandRequest?: (elementId: string) => void;
}) {
  const { selectedElement, sldCenterOnElement } = useSelectionStore();

  // Handle SLD center requests
  useEffect(() => {
    if (sldCenterOnElement && options.onSldCenterRequest) {
      options.onSldCenterRequest(sldCenterOnElement);
    }
  }, [sldCenterOnElement, options.onSldCenterRequest]);

  // When selection changes, notify tree to expand
  useEffect(() => {
    if (selectedElement && options.onTreeExpandRequest) {
      options.onTreeExpandRequest(selectedElement.id);
    }
  }, [selectedElement, options.onTreeExpandRequest]);

  return { selectedElement };
}

/**
 * Hook for Property Grid integration.
 *
 * Returns current selection and mode information for Property Grid.
 */
export function usePropertyGridSelection() {
  const { selectedElement, mode, resultStatus, propertyGridOpen, togglePropertyGrid } =
    useSelectionStore();

  return {
    selectedElement,
    mode,
    resultStatus,
    propertyGridOpen,
    togglePropertyGrid,
    isReadOnly: mode === 'RESULT_VIEW' || mode === 'CASE_CONFIG',
  };
}

/**
 * Hook for Context Menu triggering.
 *
 * Returns selection state and mode for context menu building.
 */
export function useContextMenuState() {
  const { selectedElement, mode } = useSelectionStore();

  return {
    selectedElement,
    mode,
    isEditMode: mode === 'MODEL_EDIT',
    isCaseConfigMode: mode === 'CASE_CONFIG',
    isResultMode: mode === 'RESULT_VIEW',
  };
}
