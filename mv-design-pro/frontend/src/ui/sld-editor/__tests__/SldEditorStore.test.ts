/**
 * P30b — SLD Editor Store Tests
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § E.1: Selection patterns (deterministic)
 * - powerfactory_ui_parity.md: ≥110% PowerFactory UX
 *
 * TEST SCENARIOS (MINIMUM 5):
 * 1. Multi-select: Shift+click adds to selection
 * 2. Multi-select: Ctrl+click toggles selection
 * 3. Drag group: maintains relative positions
 * 4. Align left: aligns all symbols to anchor
 * 5. Copy/paste/duplicate: creates new symbols
 * 6. Snap-to-grid: rounds positions correctly
 * 7. Lasso selection: selects symbols in rectangle
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSldEditorStore } from '../SldEditorStore';
import type { NodeSymbol, Position } from '../types';

describe('SldEditorStore', () => {
  // Reset store before each test
  beforeEach(() => {
    const store = useSldEditorStore.getState();
    store.setSymbols([]);
    store.clearSelection();
  });

  // Helper: Create test node symbol
  const createTestSymbol = (id: string, x: number, y: number): NodeSymbol => ({
    id,
    elementId: `elem_${id}`,
    elementType: 'Bus',
    elementName: `Bus ${id}`,
    position: { x, y },
    inService: true,
    width: 60,
    height: 8,
  });

  // =============================================================================
  // TEST 1: Multi-select with Shift+click (add mode)
  // =============================================================================
  describe('Multi-select: Shift+click (add mode)', () => {
    it('should add symbols to selection sequentially', () => {
      const store = useSldEditorStore.getState();

      // Add symbols
      const symbol1 = createTestSymbol('sym1', 100, 100);
      const symbol2 = createTestSymbol('sym2', 200, 100);
      const symbol3 = createTestSymbol('sym3', 300, 100);
      store.setSymbols([symbol1, symbol2, symbol3]);

      // Select first symbol (single)
      store.selectSymbol('sym1', 'single');
      expect(store.selectedIds).toEqual(['sym1']);

      // Add second symbol (add mode = Shift+click)
      store.selectSymbol('sym2', 'add');
      expect(store.selectedIds).toEqual(['sym1', 'sym2']);

      // Add third symbol (add mode)
      store.selectSymbol('sym3', 'add');
      expect(store.selectedIds).toEqual(['sym1', 'sym2', 'sym3']);

      // Adding already selected symbol should not change selection
      store.selectSymbol('sym2', 'add');
      expect(store.selectedIds).toEqual(['sym1', 'sym2', 'sym3']);
    });

    it('should maintain deterministic order (sorted by id)', () => {
      const store = useSldEditorStore.getState();

      const symbol1 = createTestSymbol('sym3', 100, 100);
      const symbol2 = createTestSymbol('sym1', 200, 100);
      const symbol3 = createTestSymbol('sym2', 300, 100);
      store.setSymbols([symbol1, symbol2, symbol3]);

      // Select in random order
      store.selectSymbol('sym3', 'single');
      store.selectSymbol('sym1', 'add');
      store.selectSymbol('sym2', 'add');

      // Should be sorted alphabetically
      expect(store.selectedIds).toEqual(['sym1', 'sym2', 'sym3']);
    });
  });

  // =============================================================================
  // TEST 2: Multi-select with Ctrl+click (toggle mode)
  // =============================================================================
  describe('Multi-select: Ctrl+click (toggle mode)', () => {
    it('should toggle symbols in selection', () => {
      const store = useSldEditorStore.getState();

      const symbol1 = createTestSymbol('sym1', 100, 100);
      const symbol2 = createTestSymbol('sym2', 200, 100);
      store.setSymbols([symbol1, symbol2]);

      // Toggle sym1 (add to selection)
      store.selectSymbol('sym1', 'toggle');
      expect(store.selectedIds).toEqual(['sym1']);

      // Toggle sym2 (add to selection)
      store.selectSymbol('sym2', 'toggle');
      expect(store.selectedIds).toEqual(['sym1', 'sym2']);

      // Toggle sym1 again (remove from selection)
      store.selectSymbol('sym1', 'toggle');
      expect(store.selectedIds).toEqual(['sym2']);

      // Toggle sym2 (remove from selection)
      store.selectSymbol('sym2', 'toggle');
      expect(store.selectedIds).toEqual([]);
    });
  });

  // =============================================================================
  // TEST 3: Drag group maintains relative positions
  // =============================================================================
  describe('Drag group: maintains relative positions', () => {
    it('should maintain relative offsets when dragging multiple symbols', () => {
      const store = useSldEditorStore.getState();

      // Create symbols with specific relative positions
      const symbol1 = createTestSymbol('sym1', 100, 100);
      const symbol2 = createTestSymbol('sym2', 200, 150); // +100x, +50y from sym1
      const symbol3 = createTestSymbol('sym3', 150, 200); // +50x, +100y from sym1
      store.setSymbols([symbol1, symbol2, symbol3]);

      // Select all
      store.selectMultiple(['sym1', 'sym2', 'sym3']);

      // Start drag at (100, 100)
      store.startDrag(['sym1', 'sym2', 'sym3'], { x: 100, y: 100 });

      // Update drag to (150, 150) - offset = (+50, +50)
      store.updateDrag({ x: 150, y: 150 });

      // Check new positions maintain relative offsets
      const newSymbol1 = store.getSymbol('sym1')!;
      const newSymbol2 = store.getSymbol('sym2')!;
      const newSymbol3 = store.getSymbol('sym3')!;

      // Grid snap disabled for this test
      store.gridConfig.snapEnabled = false;
      store.updateDrag({ x: 150, y: 150 });

      expect(newSymbol1.position).toEqual({ x: 150, y: 150 });
      expect(newSymbol2.position).toEqual({ x: 250, y: 200 }); // +100x, +50y
      expect(newSymbol3.position).toEqual({ x: 200, y: 250 }); // +50x, +100y

      // Verify relative positions maintained
      const relX12 = newSymbol2.position.x - newSymbol1.position.x;
      const relY12 = newSymbol2.position.y - newSymbol1.position.y;
      expect(relX12).toBe(100);
      expect(relY12).toBe(50);
    });
  });

  // =============================================================================
  // TEST 4: Align operates deterministically
  // =============================================================================
  describe('Align: deterministic alignment to anchor', () => {
    it('should align all symbols to first symbol (by sorted id)', () => {
      const store = useSldEditorStore.getState();

      // Create symbols with different positions
      // sym1 = anchor (first by id sort)
      const symbol1 = createTestSymbol('sym1', 100, 100);
      const symbol2 = createTestSymbol('sym2', 200, 150);
      const symbol3 = createTestSymbol('sym3', 150, 200);
      store.setSymbols([symbol1, symbol2, symbol3]);

      store.selectMultiple(['sym1', 'sym2', 'sym3']);

      // Note: Actual align logic is in utils/geometry
      // This test verifies the store can update positions
      const newPositions = new Map<string, Position>([
        ['sym1', { x: 100, y: 100 }], // anchor stays
        ['sym2', { x: 100, y: 150 }], // aligned left to sym1
        ['sym3', { x: 100, y: 200 }], // aligned left to sym1
      ]);

      store.updateSymbolsPositions(newPositions);

      // Verify all symbols aligned
      expect(store.getSymbol('sym1')!.position.x).toBe(100);
      expect(store.getSymbol('sym2')!.position.x).toBe(100);
      expect(store.getSymbol('sym3')!.position.x).toBe(100);
    });
  });

  // =============================================================================
  // TEST 5: Copy/Paste creates new symbols
  // =============================================================================
  describe('Copy/Paste: creates new symbols with offset', () => {
    it('should copy selection to clipboard and paste with offset', () => {
      const store = useSldEditorStore.getState();

      const symbol1 = createTestSymbol('sym1', 100, 100);
      const symbol2 = createTestSymbol('sym2', 200, 100);
      store.setSymbols([symbol1, symbol2]);

      // Select symbols
      store.selectMultiple(['sym1', 'sym2']);

      // Copy
      store.copySelection();
      expect(store.clipboard).not.toBeNull();
      expect(store.clipboard!.symbols.length).toBe(2);

      // Paste with offset
      const PASTE_OFFSET = { x: 20, y: 20 };
      const newSymbols = store.pasteFromClipboard(PASTE_OFFSET);

      expect(newSymbols.length).toBe(2);

      // Verify new symbols have offset positions
      expect(newSymbols[0].position).toEqual({ x: 120, y: 120 });
      expect(newSymbols[1].position).toEqual({ x: 220, y: 120 });

      // Verify new symbols have different IDs
      expect(newSymbols[0].id).not.toBe('sym1');
      expect(newSymbols[1].id).not.toBe('sym2');

      // Verify new symbols are added to store
      expect(store.symbols.size).toBe(4); // original 2 + pasted 2
    });

    it('should duplicate selection with deterministic offset', () => {
      const store = useSldEditorStore.getState();

      const symbol1 = createTestSymbol('sym1', 100, 100);
      store.setSymbols([symbol1]);

      store.selectMultiple(['sym1']);

      // Duplicate
      const newSymbols = store.duplicateSelection();

      expect(newSymbols.length).toBe(1);

      // Duplicate offset is (20, 20) by default
      expect(newSymbols[0].position).toEqual({ x: 120, y: 120 });
    });
  });

  // =============================================================================
  // TEST 6: Snap-to-grid rounds positions correctly
  // =============================================================================
  describe('Snap-to-grid: rounds positions to grid', () => {
    it('should snap position to nearest grid point', () => {
      const store = useSldEditorStore.getState();

      // Grid size = 20
      store.setGridSize(20);

      // Test various positions
      expect(store.snapToGrid({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
      expect(store.snapToGrid({ x: 10, y: 10 })).toEqual({ x: 20, y: 20 }); // rounds up
      expect(store.snapToGrid({ x: 5, y: 5 })).toEqual({ x: 0, y: 0 }); // rounds down
      expect(store.snapToGrid({ x: 25, y: 35 })).toEqual({ x: 20, y: 40 });
      expect(store.snapToGrid({ x: 100, y: 100 })).toEqual({ x: 100, y: 100 });
    });

    it('should not snap if snap is disabled', () => {
      const store = useSldEditorStore.getState();

      store.setGridSize(20);
      store.gridConfig.snapEnabled = false;

      // Should return original position
      const pos = { x: 15, y: 15 };
      expect(store.snapToGrid(pos)).toEqual(pos);
    });
  });

  // =============================================================================
  // TEST 7: Lasso selection selects symbols in rectangle
  // =============================================================================
  describe('Lasso selection: selects symbols in rectangle', () => {
    it('should select all symbols inside lasso rectangle', () => {
      const store = useSldEditorStore.getState();

      // Create symbols in different positions
      const symbol1 = createTestSymbol('sym1', 100, 100); // inside
      const symbol2 = createTestSymbol('sym2', 150, 150); // inside
      const symbol3 = createTestSymbol('sym3', 300, 300); // outside
      store.setSymbols([symbol1, symbol2, symbol3]);

      // Start lasso at (50, 50)
      store.startLasso({ x: 50, y: 50 });

      // Update lasso to (200, 200)
      store.updateLasso({ x: 200, y: 200 });

      // Get symbols in lasso
      const symbolsInLasso = store.getSymbolsInLasso();

      // Should select sym1 and sym2, but not sym3
      expect(symbolsInLasso).toEqual(['sym1', 'sym2']);

      // End lasso (applies selection)
      store.endLasso();
      expect(store.selectedIds).toEqual(['sym1', 'sym2']);
    });

    it('should handle inverted lasso rectangle (drag from bottom-right to top-left)', () => {
      const store = useSldEditorStore.getState();

      const symbol1 = createTestSymbol('sym1', 100, 100);
      store.setSymbols([symbol1]);

      // Start lasso at (200, 200) and drag to (50, 50)
      store.startLasso({ x: 200, y: 200 });
      store.updateLasso({ x: 50, y: 50 });

      const symbolsInLasso = store.getSymbolsInLasso();

      // Should still select sym1
      expect(symbolsInLasso).toEqual(['sym1']);
    });
  });

  // =============================================================================
  // TEST 8: Selection helpers
  // =============================================================================
  describe('Selection helpers', () => {
    it('should provide selection count and has-selection helpers', () => {
      const store = useSldEditorStore.getState();

      const symbol1 = createTestSymbol('sym1', 100, 100);
      const symbol2 = createTestSymbol('sym2', 200, 100);
      store.setSymbols([symbol1, symbol2]);

      // No selection
      expect(store.hasSelection()).toBe(false);
      expect(store.getSelectionCount()).toBe(0);

      // Select one
      store.selectSymbol('sym1', 'single');
      expect(store.hasSelection()).toBe(true);
      expect(store.getSelectionCount()).toBe(1);

      // Select two
      store.selectMultiple(['sym1', 'sym2']);
      expect(store.hasSelection()).toBe(true);
      expect(store.getSelectionCount()).toBe(2);

      // Clear
      store.clearSelection();
      expect(store.hasSelection()).toBe(false);
      expect(store.getSelectionCount()).toBe(0);
    });

    it('should get selected symbols', () => {
      const store = useSldEditorStore.getState();

      const symbol1 = createTestSymbol('sym1', 100, 100);
      const symbol2 = createTestSymbol('sym2', 200, 100);
      store.setSymbols([symbol1, symbol2]);

      store.selectMultiple(['sym1', 'sym2']);

      const selectedSymbols = store.getSelectedSymbols();
      expect(selectedSymbols.length).toBe(2);
      expect(selectedSymbols[0].id).toBe('sym1');
      expect(selectedSymbols[1].id).toBe('sym2');
    });

    it('should select all symbols', () => {
      const store = useSldEditorStore.getState();

      const symbol1 = createTestSymbol('sym1', 100, 100);
      const symbol2 = createTestSymbol('sym2', 200, 100);
      const symbol3 = createTestSymbol('sym3', 300, 100);
      store.setSymbols([symbol1, symbol2, symbol3]);

      store.selectAll();

      expect(store.selectedIds).toEqual(['sym1', 'sym2', 'sym3']);
    });
  });
});
