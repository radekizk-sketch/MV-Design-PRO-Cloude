/**
 * P30b — Geometry Utils Tests
 *
 * TEST SCENARIOS:
 * - Align left/right/top/bottom/center
 * - Distribute horizontal/vertical
 * - Snap to grid
 * - Bounding box calculations
 */

import { describe, it, expect } from 'vitest';
import {
  alignSymbols,
  distributeSymbols,
  snapPositionToGrid,
  getSymbolBoundingBox,
  getCombinedBoundingBox,
} from '../utils/geometry';
import type { NodeSymbol } from '../types';

describe('Geometry Utils', () => {
  // Helper: Create test node symbol
  const createTestSymbol = (id: string, x: number, y: number, width = 60, height = 8): NodeSymbol => ({
    id,
    elementId: `elem_${id}`,
    elementType: 'Bus',
    elementName: `Bus ${id}`,
    position: { x, y },
    inService: true,
    width,
    height,
  });

  // =============================================================================
  // Align Tests
  // =============================================================================
  describe('alignSymbols', () => {
    it('should align left to anchor (first by id)', () => {
      const symbols = [
        createTestSymbol('sym1', 100, 100),
        createTestSymbol('sym2', 200, 150),
        createTestSymbol('sym3', 150, 200),
      ];

      const result = alignSymbols(symbols, 'left');

      // Anchor = sym1 (first by id sort)
      expect(result.get('sym1')?.x).toBe(100);
      expect(result.get('sym2')?.x).toBe(100);
      expect(result.get('sym3')?.x).toBe(100);

      // Y positions unchanged
      expect(result.get('sym1')?.y).toBe(100);
      expect(result.get('sym2')?.y).toBe(150);
      expect(result.get('sym3')?.y).toBe(200);
    });

    it('should align right to anchor', () => {
      const symbols = [
        createTestSymbol('sym1', 100, 100, 60, 8),
        createTestSymbol('sym2', 200, 150, 80, 8),
      ];

      const result = alignSymbols(symbols, 'right');

      // Anchor = sym1 (x=100, width=60, right edge = 160)
      // sym2 should align right edge to 160: x = 160 - 80 = 80
      expect(result.get('sym1')?.x).toBe(100);
      expect(result.get('sym2')?.x).toBe(80);
    });

    it('should align top to anchor', () => {
      const symbols = [
        createTestSymbol('sym1', 100, 100),
        createTestSymbol('sym2', 200, 150),
        createTestSymbol('sym3', 150, 200),
      ];

      const result = alignSymbols(symbols, 'top');

      // All aligned to y=100
      expect(result.get('sym1')?.y).toBe(100);
      expect(result.get('sym2')?.y).toBe(100);
      expect(result.get('sym3')?.y).toBe(100);

      // X positions unchanged
      expect(result.get('sym1')?.x).toBe(100);
      expect(result.get('sym2')?.x).toBe(200);
      expect(result.get('sym3')?.x).toBe(150);
    });

    it('should align bottom to anchor', () => {
      const symbols = [
        createTestSymbol('sym1', 100, 100, 60, 8),
        createTestSymbol('sym2', 200, 150, 60, 10),
      ];

      const result = alignSymbols(symbols, 'bottom');

      // Anchor = sym1 (y=100, height=8, bottom edge = 108)
      // sym2 should align bottom edge to 108: y = 108 - 10 = 98
      expect(result.get('sym1')?.y).toBe(100);
      expect(result.get('sym2')?.y).toBe(98);
    });

    it('should align center horizontally', () => {
      const symbols = [
        createTestSymbol('sym1', 100, 100, 60, 8),
        createTestSymbol('sym2', 200, 150, 80, 8),
      ];

      const result = alignSymbols(symbols, 'center-horizontal');

      // Anchor center-x = 100 + 60/2 = 130
      // sym1: x = 130 - 60/2 = 100 (unchanged)
      // sym2: x = 130 - 80/2 = 90
      expect(result.get('sym1')?.x).toBe(100);
      expect(result.get('sym2')?.x).toBe(90);
    });

    it('should align center vertically', () => {
      const symbols = [
        createTestSymbol('sym1', 100, 100, 60, 8),
        createTestSymbol('sym2', 200, 150, 60, 10),
      ];

      const result = alignSymbols(symbols, 'center-vertical');

      // Anchor center-y = 100 + 8/2 = 104
      // sym1: y = 104 - 8/2 = 100 (unchanged)
      // sym2: y = 104 - 10/2 = 99
      expect(result.get('sym1')?.y).toBe(100);
      expect(result.get('sym2')?.y).toBe(99);
    });
  });

  // =============================================================================
  // Distribute Tests
  // =============================================================================
  describe('distributeSymbols', () => {
    it('should distribute horizontally with equal spacing', () => {
      const symbols = [
        createTestSymbol('sym1', 100, 100, 40, 8), // left
        createTestSymbol('sym2', 200, 100, 40, 8), // middle
        createTestSymbol('sym3', 400, 100, 40, 8), // right
      ];

      const result = distributeSymbols(symbols, 'horizontal');

      // First and last stay in place
      expect(result.get('sym1')?.x).toBe(100);
      expect(result.get('sym3')?.x).toBe(400);

      // Middle symbol distributed evenly
      // Total space = 400 - (100 + 40) = 260
      // Middle size = 40
      // Spacing = (260 - 40) / 2 = 110
      // Middle x = 100 + 40 + 110 = 250
      expect(result.get('sym2')?.x).toBe(250);
    });

    it('should distribute vertically with equal spacing', () => {
      const symbols = [
        createTestSymbol('sym1', 100, 100, 40, 20), // top
        createTestSymbol('sym2', 100, 200, 40, 20), // middle
        createTestSymbol('sym3', 100, 400, 40, 20), // bottom
      ];

      const result = distributeSymbols(symbols, 'vertical');

      // First and last stay in place
      expect(result.get('sym1')?.y).toBe(100);
      expect(result.get('sym3')?.y).toBe(400);

      // Middle symbol distributed evenly
      // Total space = 400 - (100 + 20) = 280
      // Middle size = 20
      // Spacing = (280 - 20) / 2 = 130
      // Middle y = 100 + 20 + 130 = 250
      expect(result.get('sym2')?.y).toBe(250);
    });

    it('should return empty map if less than 3 symbols', () => {
      const symbols = [
        createTestSymbol('sym1', 100, 100),
        createTestSymbol('sym2', 200, 100),
      ];

      const result = distributeSymbols(symbols, 'horizontal');

      expect(result.size).toBe(0);
    });
  });

  // =============================================================================
  // Snap to Grid Tests
  // =============================================================================
  describe('snapPositionToGrid', () => {
    it('should snap to nearest grid point', () => {
      expect(snapPositionToGrid({ x: 0, y: 0 }, 20)).toEqual({ x: 0, y: 0 });
      expect(snapPositionToGrid({ x: 10, y: 10 }, 20)).toEqual({ x: 20, y: 20 });
      expect(snapPositionToGrid({ x: 5, y: 5 }, 20)).toEqual({ x: 0, y: 0 });
      expect(snapPositionToGrid({ x: 25, y: 35 }, 20)).toEqual({ x: 20, y: 40 });
      expect(snapPositionToGrid({ x: 100, y: 100 }, 20)).toEqual({ x: 100, y: 100 });
    });

    it('should handle different grid sizes', () => {
      expect(snapPositionToGrid({ x: 15, y: 15 }, 10)).toEqual({ x: 20, y: 20 });
      expect(snapPositionToGrid({ x: 15, y: 15 }, 5)).toEqual({ x: 15, y: 15 });
      expect(snapPositionToGrid({ x: 15, y: 15 }, 50)).toEqual({ x: 0, y: 0 });
    });
  });

  // =============================================================================
  // Bounding Box Tests
  // =============================================================================
  describe('Bounding Box', () => {
    it('should compute symbol bounding box', () => {
      const symbol = createTestSymbol('sym1', 100, 100, 60, 8);

      const bbox = getSymbolBoundingBox(symbol);

      expect(bbox).toEqual({
        x: 100,
        y: 100,
        width: 60,
        height: 8,
      });
    });

    it('should compute combined bounding box for multiple symbols', () => {
      const symbols = [
        createTestSymbol('sym1', 100, 100, 60, 8), // x: 100-160, y: 100-108
        createTestSymbol('sym2', 200, 150, 40, 10), // x: 200-240, y: 150-160
      ];

      const bbox = getCombinedBoundingBox(symbols);

      expect(bbox).toEqual({
        x: 100, // min x
        y: 100, // min y
        width: 140, // 240 - 100
        height: 60, // 160 - 100
      });
    });

    it('should return null for empty array', () => {
      const bbox = getCombinedBoundingBox([]);
      expect(bbox).toBeNull();
    });
  });
});
