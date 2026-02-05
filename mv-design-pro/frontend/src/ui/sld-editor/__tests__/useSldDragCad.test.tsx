import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSldEditorStore } from '../SldEditorStore';
import { useSldDrag } from '../hooks/useSldDrag';
import type { NodeSymbol } from '../types';

vi.mock('../../config/featureFlags', () => ({
  featureFlags: Object.freeze({
    ENABLE_MATH_RENDERING: true,
    sldCadEditingEnabled: true,
  }),
  useFeatureFlags: () => ({
    ENABLE_MATH_RENDERING: true,
    sldCadEditingEnabled: true,
  }),
  isFeatureEnabled: () => true,
}));

vi.mock('../../selection/store', () => ({
  useIsMutationBlocked: () => false,
}));

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

describe('useSldDrag (CAD)', () => {
  beforeEach(() => {
    useSldEditorStore.setState({
      symbols: new Map(),
      selectedIds: [],
      highlightedIds: [],
      highlightSeverity: null,
      dragState: null,
      lassoState: null,
      clipboard: null,
      gridConfig: {
        size: 20,
        visible: true,
        snapEnabled: false,
      },
      connectionCreationState: null,
      portSnapState: null,
      statusMessage: null,
      hoveredPortId: null,
      selectedConnectionId: null,
      lastConnectionClickPosition: null,
      selectedConnectionPath: null,
      selectedBendIndex: null,
      geometryMode: 'AUTO',
      cadOverridesDocument: null,
      cadOverridesStatus: null,
    });
  });

  it('should persist snapped node overrides after drag end', () => {
    const store = useSldEditorStore.getState();
    const symbol = createTestSymbol('sym1', 100, 100);
    store.setSymbols([symbol]);
    store.setGeometryMode('CAD');

    const { result } = renderHook(() => useSldDrag());

    act(() => {
      result.current.startDrag('sym1', { x: 100, y: 100 });
    });

    act(() => {
      result.current.updateDrag({ x: 144, y: 144 });
    });

    act(() => {
      result.current.endDrag();
    });

    const doc = useSldEditorStore.getState().cadOverridesDocument!;
    expect(doc.nodes.sym1.pos).toEqual({ x: 140, y: 140 });
  });
});
