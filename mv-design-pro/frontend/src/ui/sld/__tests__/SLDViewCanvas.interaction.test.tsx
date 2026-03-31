import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SLDViewCanvas } from '../SLDViewCanvas';
import type { ViewportState } from '../types';

vi.mock('../symbols', () => ({
  UnifiedSymbolRenderer: ({ symbol, handlers }: any) => (
    <g data-testid={`mock-symbol-${symbol.id}`} onClick={() => handlers?.onClick?.(symbol.id)}>
      <circle cx={symbol.position.x} cy={symbol.position.y} r={6} />
    </g>
  ),
}));

vi.mock('../../sld-editor/utils/connectionRouting', () => ({
  generateConnections: () => [
    {
      id: 'conn-1',
      fromSymbolId: 'bus-1',
      toSymbolId: 'bus-2',
      fromPortName: 'right',
      toPortName: 'left',
      path: [{ x: 100, y: 100 }, { x: 200, y: 100 }],
      elementId: 'br-001',
      connectionType: 'branch',
      connectionStyle: 'default',
    },
  ],
}));

const VIEWPORT: ViewportState = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
};

describe('SLDViewCanvas interaction surface', () => {
  it('renderuje porty dla zaznaczonego elementu i przekazuje klik do interaction layer', () => {
    const onPortClick = vi.fn();
    render(
      <SLDViewCanvas
        symbols={[{
          id: 'bus-1',
          elementId: 'bus-1',
          elementType: 'Bus',
          elementName: 'Szyna 1',
          position: { x: 100, y: 100 },
          inService: true,
        } as any]}
        selectedId="bus-1"
        onSymbolClick={vi.fn()}
        onPortClick={onPortClick}
        viewport={VIEWPORT}
        showGrid={false}
        width={800}
        height={500}
      />,
    );

    fireEvent.click(screen.getByTestId('sld-port-bus-1-BRANCH_OUT').querySelector('circle')!);
    expect(onPortClick).toHaveBeenCalledWith('bus-1', 'Bus', 'Szyna 1', 'BRANCH_OUT');
  });

  it('klik tła wywołuje callback resetu interakcji', () => {
    const onCanvasClick = vi.fn();
    render(
      <SLDViewCanvas
        symbols={[]}
        selectedId={null}
        onSymbolClick={vi.fn()}
        onCanvasClick={onCanvasClick}
        viewport={VIEWPORT}
        showGrid={false}
        width={800}
        height={500}
      />,
    );

    fireEvent.click(screen.getByTestId('sld-canvas-background'));
    expect(onCanvasClick).toHaveBeenCalledTimes(1);
  });

  it('klik segmentu przekazuje semantyczny target segmentu', () => {
    const onSegmentClick = vi.fn();
    render(
      <SLDViewCanvas
        symbols={[
          { id: 'bus-1', elementId: 'bus-1', elementType: 'Bus', elementName: 'Szyna 1', position: { x: 100, y: 100 }, inService: true } as any,
          { id: 'bus-2', elementId: 'bus-2', elementType: 'Bus', elementName: 'Szyna 2', position: { x: 200, y: 100 }, inService: true } as any,
        ]}
        selectedId={null}
        onSymbolClick={vi.fn()}
        onSegmentClick={onSegmentClick}
        viewport={VIEWPORT}
        showGrid={false}
        width={800}
        height={500}
      />,
    );

    fireEvent.click(screen.getByTestId('sld-connection-conn-1').querySelector('polyline')!);
    expect(onSegmentClick).toHaveBeenCalledWith(expect.objectContaining({
      segment_ref: 'br-001',
      edge_id: 'conn-1',
      from_ref: 'bus-1',
      to_ref: 'bus-2',
      segment_kind: 'BRANCH',
    }));
  });

  it('renderuje preview walidacyjny dla targetu niepoprawnego', () => {
    render(
      <SLDViewCanvas
        symbols={[]}
        selectedId={null}
        onSymbolClick={vi.fn()}
        viewport={VIEWPORT}
        showGrid={false}
        width={800}
        height={500}
        interactionPreview={{
          target_kind: 'segment',
          target_id: 'seg-x',
          valid: false,
          message_pl: 'To narzędzie wymaga segmentu magistrali',
        }}
      />,
    );

    expect(screen.getByTestId('sld-preview-status-overlay')).toBeDefined();
    expect(screen.getByText('To narzędzie wymaga segmentu magistrali')).toBeDefined();
  });
});
