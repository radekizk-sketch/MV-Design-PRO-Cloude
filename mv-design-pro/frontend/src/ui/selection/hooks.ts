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
import type { ElementType } from '../types';

/**
 * Hook for handling SLD element click.
 *
 * Per sld_rules.md § E.1:
 * - Single click: Select single element
 * - Updates Property Grid
 * - Syncs with Tree/List
 */
export function useSldSelection() {
  const { selectElement, selectedElement } = useSelectionStore();

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

// =============================================================================
// UI_INTEGRATION_E2E: Global Selection Synchronization
// =============================================================================

/**
 * Hook for global selection synchronization across all UI layers.
 *
 * CANONICAL ALIGNMENT:
 * - UI_CORE_ARCHITECTURE.md § 10.3: Selection synchronization
 * - SLD_UI_ARCHITECTURE.md § 7.1: Single source of truth for selection
 *
 * Synchronizes selection between:
 * - SLD (Schemat jednokreskowy)
 * - Results Browser (Przegląd wyników)
 * - Inspector Panel (Inspektor elementu)
 * - Proof Panel (Ślad obliczeń)
 *
 * BINDING: Change in one place = change in all places.
 */
export function useGlobalSelectionSync() {
  const {
    selectElement,
    selectedElement,
    selectedElements,
    centerSldOnElement,
    propertyGridOpen,
    togglePropertyGrid,
  } = useSelectionStore();

  /**
   * Select element from any source (SLD, Results, Tree, Proof).
   * Updates all synchronized views.
   */
  const selectFromAnySource = useCallback(
    (
      elementId: string,
      elementType: ElementType,
      elementName: string,
      options?: {
        centerSld?: boolean;
        openInspector?: boolean;
      }
    ) => {
      selectElement({ id: elementId, type: elementType, name: elementName });

      if (options?.centerSld) {
        centerSldOnElement(elementId);
      }

      if (options?.openInspector && !propertyGridOpen) {
        togglePropertyGrid(true);
      }
    },
    [selectElement, centerSldOnElement, propertyGridOpen, togglePropertyGrid]
  );

  /**
   * Select element from Results Browser.
   * Per RESULTS_UI_ARCHITECTURE.md § 9.2: Click in Results → SLD highlight + Inspector open
   */
  const selectFromResults = useCallback(
    (elementId: string, elementType: ElementType, elementName: string) => {
      selectFromAnySource(elementId, elementType, elementName, {
        centerSld: true,
        openInspector: true,
      });
    },
    [selectFromAnySource]
  );

  /**
   * Select element from SLD.
   * Per SLD_UI_ARCHITECTURE.md § 7.2: Click on SLD → Inspector open
   */
  const selectFromSld = useCallback(
    (elementId: string, elementType: ElementType, elementName: string) => {
      selectFromAnySource(elementId, elementType, elementName, {
        centerSld: false,
        openInspector: true,
      });
    },
    [selectFromAnySource]
  );

  /**
   * Select element from Proof/Ślad obliczeń.
   * Per PROOF_UI_ARCHITECTURE.md § 6.4: Navigation to element from Proof
   */
  const selectFromProof = useCallback(
    (elementId: string, elementType: ElementType, elementName: string) => {
      selectFromAnySource(elementId, elementType, elementName, {
        centerSld: true,
        openInspector: true,
      });
    },
    [selectFromAnySource]
  );

  /**
   * Clear selection.
   */
  const clearSelection = useCallback(() => {
    selectElement(null);
  }, [selectElement]);

  return {
    // State
    selectedElement,
    selectedElements,
    hasSelection: selectedElement !== null,

    // Actions
    selectFromSld,
    selectFromResults,
    selectFromProof,
    selectFromAnySource,
    clearSelection,
    centerSldOnElement,
  };
}
