/**
 * P30b — SLD Editor Main Component
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md: Full SLD editing experience
 * - powerfactory_ui_parity.md: ≥110% PowerFactory UX
 * - P30a: Full UNDO/REDO integration
 *
 * FEATURES:
 * - Multi-select (Shift+click, Ctrl+click, lasso)
 * - Drag single/group symbols
 * - Copy/paste/duplicate
 * - Align & distribute
 * - Snap-to-grid + grid toggle
 * - Full UNDO/REDO integration
 * - Mode gating (blocked in CASE_CONFIG/RESULT_VIEW)
 * - 100% Polish UI
 */

import React, { useEffect } from 'react';
import { SldCanvas } from './SldCanvas';
import { SldToolbar } from './SldToolbar';
import { useSldEditorStore } from './SldEditorStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useIsMutationBlocked, useModeLabel } from '../selection/store';
import { UndoRedoButtons } from '../history/UndoRedoButtons';
import type { AnySldSymbol } from './types';

/**
 * SLD Editor props.
 */
export interface SldEditorProps {
  /** Initial symbols to display */
  initialSymbols?: AnySldSymbol[];

  /** Project ID (for loading symbols from backend) */
  projectId?: string;

  /** Diagram ID (for loading symbols from backend) */
  diagramId?: string;

  /** Show toolbar */
  showToolbar?: boolean;

  /** Show UNDO/REDO buttons */
  showUndoRedo?: boolean;

  /** Callback when symbols change */
  onSymbolsChange?: (symbols: AnySldSymbol[]) => void;
}

/**
 * Main SLD Editor component.
 */
export const SldEditor: React.FC<SldEditorProps> = ({
  initialSymbols = [],
  projectId,
  diagramId,
  showToolbar = true,
  showUndoRedo = true,
  onSymbolsChange,
}) => {
  const sldStore = useSldEditorStore();
  const isMutationBlocked = useIsMutationBlocked();
  const modeLabel = useModeLabel();

  // Initialize symbols
  useEffect(() => {
    if (initialSymbols.length > 0) {
      sldStore.setSymbols(initialSymbols);
    }
  }, [initialSymbols, sldStore]);

  // Load symbols from backend (if projectId/diagramId provided)
  useEffect(() => {
    if (projectId && diagramId) {
      // TODO P30c: Fetch symbols from backend API
      // const symbols = await fetchSldSymbols(projectId, diagramId);
      // sldStore.setSymbols(symbols);
    }
  }, [projectId, diagramId, sldStore]);

  // Notify parent of symbol changes
  useEffect(() => {
    if (onSymbolsChange) {
      const symbols = Array.from(sldStore.symbols.values());
      onSymbolsChange(symbols);
    }
  }, [sldStore.symbols, onSymbolsChange]);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    enableCopyPaste: true,
    enableUndoRedo: true,
    enableSelection: true,
  });

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-300">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Edytor SLD</h2>
          <p className="text-xs text-gray-500">
            Tryb: <span className="font-medium">{modeLabel}</span>
          </p>
        </div>
        {showUndoRedo && (
          <div className="flex items-center gap-2">
            <UndoRedoButtons />
          </div>
        )}
      </div>

      {/* Toolbar */}
      {showToolbar && <SldToolbar />}

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-4">
        <SldCanvas />
      </div>

      {/* Footer / Status bar */}
      <div className="px-4 py-2 bg-white border-t border-gray-300">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>
            Siatka: {sldStore.gridConfig.visible ? 'Widoczna' : 'Ukryta'} | Przyciąganie:{' '}
            {sldStore.gridConfig.snapEnabled ? 'Włączone' : 'Wyłączone'}
          </div>
          <div>
            {isMutationBlocked && (
              <span className="text-amber-600 font-medium">
                ⚠️ Edycja zablokowana (tryb tylko do odczytu)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
