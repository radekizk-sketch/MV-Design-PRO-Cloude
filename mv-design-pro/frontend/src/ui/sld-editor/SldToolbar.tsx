/**
 * P30b — SLD Toolbar Component
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: ≥110% PowerFactory toolbar UX
 * - 100% Polish labels
 *
 * FEATURES:
 * - Align buttons (left, right, top, bottom, center-h, center-v)
 * - Distribute buttons (horizontal, vertical)
 * - Copy/Paste/Duplicate buttons
 * - Grid toggle buttons
 * - Selection count display
 * - Mode gating (disabled in CASE_CONFIG/RESULT_VIEW)
 */

import React, { useCallback } from 'react';
import { useHistoryStore } from '../history/HistoryStore';
import { useIsMutationBlocked } from '../selection/store';
import { useSldEditorStore, useSelectionCount, useGridConfig } from './SldEditorStore';
import { AlignDistributeCommand } from './commands/AlignDistributeCommand';
import { CopyPasteCommand } from './commands/CopyPasteCommand';
import { alignSymbols, distributeSymbols } from './utils/geometry';
import type { AlignDirection, DistributeDirection } from './types';

/**
 * Toolbar button component.
 */
interface ToolbarButtonProps {
  label: string;
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  icon?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  label,
  title,
  onClick,
  disabled = false,
  active = false,
  icon,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
        active
          ? 'bg-blue-100 border-blue-400 text-blue-800'
          : disabled
          ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </button>
  );
};

/**
 * Toolbar section divider.
 */
const ToolbarDivider: React.FC = () => {
  return <div className="w-px h-6 bg-gray-300 mx-2" />;
};

/**
 * Main SLD Toolbar component.
 */
export const SldToolbar: React.FC = () => {
  const sldStore = useSldEditorStore();
  const historyStore = useHistoryStore();
  const isMutationBlocked = useIsMutationBlocked();
  const selectionCount = useSelectionCount();
  const gridConfig = useGridConfig();

  const hasSelection = selectionCount > 0;
  const canAlign = selectionCount > 1 && !isMutationBlocked;
  const canDistribute = selectionCount > 2 && !isMutationBlocked;
  const canCopy = hasSelection;
  const canPaste = sldStore.clipboard !== null && !isMutationBlocked;
  const canDuplicate = hasSelection && !isMutationBlocked;

  // ===== ALIGN HANDLERS =====

  const handleAlign = useCallback(
    (direction: AlignDirection) => {
      const selectedSymbols = sldStore.getSelectedSymbols();
      if (selectedSymbols.length < 2) return;

      const newPositions = alignSymbols(selectedSymbols, direction);

      // Create changes map for command
      const changes = new Map();
      newPositions.forEach((newPos, symbolId) => {
        const symbol = sldStore.getSymbol(symbolId);
        if (symbol) {
          changes.set(symbolId, {
            old: symbol.position,
            new: newPos,
          });
        }
      });

      if (changes.size === 0) return;

      // Create command
      const command = AlignDistributeCommand.create({
        operation: 'align',
        direction,
        changes,
        applyFn: (positions) => {
          sldStore.updateSymbolsPositions(positions);
        },
      });

      historyStore.push(command);
    },
    [sldStore, historyStore]
  );

  // ===== DISTRIBUTE HANDLERS =====

  const handleDistribute = useCallback(
    (direction: DistributeDirection) => {
      const selectedSymbols = sldStore.getSelectedSymbols();
      if (selectedSymbols.length < 3) return;

      const newPositions = distributeSymbols(selectedSymbols, direction);

      // Create changes map for command
      const changes = new Map();
      newPositions.forEach((newPos, symbolId) => {
        const symbol = sldStore.getSymbol(symbolId);
        if (symbol) {
          changes.set(symbolId, {
            old: symbol.position,
            new: newPos,
          });
        }
      });

      if (changes.size === 0) return;

      // Create command
      const command = AlignDistributeCommand.create({
        operation: 'distribute',
        direction,
        changes,
        applyFn: (positions) => {
          sldStore.updateSymbolsPositions(positions);
        },
      });

      historyStore.push(command);
    },
    [sldStore, historyStore]
  );

  // ===== COPY/PASTE HANDLERS =====

  const handleCopy = useCallback(() => {
    sldStore.copySelection();
  }, [sldStore]);

  const handlePaste = useCallback(() => {
    const PASTE_OFFSET = { x: 10, y: 10 };
    const newSymbols = sldStore.pasteFromClipboard(PASTE_OFFSET);

    if (newSymbols.length === 0) return;

    const command = CopyPasteCommand.create({
      newSymbols,
      addFn: (symbols) => {
        symbols.forEach((s) => sldStore.addSymbol(s));
      },
      removeFn: (symbolIds) => {
        symbolIds.forEach((id) => sldStore.removeSymbol(id));
      },
    });

    historyStore.push(command);
  }, [sldStore, historyStore]);

  const handleDuplicate = useCallback(() => {
    const newSymbols = sldStore.duplicateSelection();

    if (newSymbols.length === 0) return;

    const command = CopyPasteCommand.create({
      newSymbols,
      addFn: (symbols) => {
        symbols.forEach((s) => sldStore.addSymbol(s));
      },
      removeFn: (symbolIds) => {
        symbolIds.forEach((id) => sldStore.removeSymbol(id));
      },
    });

    historyStore.push(command);
  }, [sldStore, historyStore]);

  // ===== GRID HANDLERS =====

  const handleToggleGrid = useCallback(() => {
    sldStore.toggleGridVisible();
  }, [sldStore]);

  const handleToggleSnap = useCallback(() => {
    sldStore.toggleSnapEnabled();
  }, [sldStore]);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-300">
      {/* Selection count */}
      <div className="text-xs font-medium text-gray-600 min-w-[120px]">
        {selectionCount === 0 ? (
          <span>Brak zaznaczenia</span>
        ) : (
          <span>
            Zaznaczono: <span className="font-semibold text-blue-600">{selectionCount}</span>
          </span>
        )}
      </div>

      <ToolbarDivider />

      {/* Copy/Paste/Duplicate */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          label="Kopiuj"
          title="Kopiuj (Ctrl+C)"
          onClick={handleCopy}
          disabled={!canCopy}
        />
        <ToolbarButton
          label="Wklej"
          title="Wklej (Ctrl+V)"
          onClick={handlePaste}
          disabled={!canPaste}
        />
        <ToolbarButton
          label="Duplikuj"
          title="Duplikuj (Ctrl+D)"
          onClick={handleDuplicate}
          disabled={!canDuplicate}
        />
      </div>

      <ToolbarDivider />

      {/* Align */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1">Wyrównaj:</span>
        <ToolbarButton
          label="L"
          title="Wyrównaj do lewej"
          onClick={() => handleAlign('left')}
          disabled={!canAlign}
        />
        <ToolbarButton
          label="P"
          title="Wyrównaj do prawej"
          onClick={() => handleAlign('right')}
          disabled={!canAlign}
        />
        <ToolbarButton
          label="G"
          title="Wyrównaj do góry"
          onClick={() => handleAlign('top')}
          disabled={!canAlign}
        />
        <ToolbarButton
          label="D"
          title="Wyrównaj do dołu"
          onClick={() => handleAlign('bottom')}
          disabled={!canAlign}
        />
        <ToolbarButton
          label="H"
          title="Wyśrodkuj poziomo"
          onClick={() => handleAlign('center-horizontal')}
          disabled={!canAlign}
        />
        <ToolbarButton
          label="V"
          title="Wyśrodkuj pionowo"
          onClick={() => handleAlign('center-vertical')}
          disabled={!canAlign}
        />
      </div>

      <ToolbarDivider />

      {/* Distribute */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1">Rozmieść:</span>
        <ToolbarButton
          label="Poziomo"
          title="Rozmieść równomiernie poziomo"
          onClick={() => handleDistribute('horizontal')}
          disabled={!canDistribute}
        />
        <ToolbarButton
          label="Pionowo"
          title="Rozmieść równomiernie pionowo"
          onClick={() => handleDistribute('vertical')}
          disabled={!canDistribute}
        />
      </div>

      <ToolbarDivider />

      {/* Grid */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          label="Siatka"
          title="Przełącz widoczność siatki"
          onClick={handleToggleGrid}
          active={gridConfig.visible}
        />
        <ToolbarButton
          label="Przyciąganie"
          title="Przełącz przyciąganie do siatki"
          onClick={handleToggleSnap}
          active={gridConfig.snapEnabled}
        />
      </div>

      {/* Mode warning */}
      {isMutationBlocked && (
        <>
          <ToolbarDivider />
          <div className="text-xs text-amber-600 font-medium">
            Edycja niedostepna w trybie wynikow
          </div>
        </>
      )}
    </div>
  );
};
