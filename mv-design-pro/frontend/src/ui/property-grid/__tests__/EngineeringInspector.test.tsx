import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EngineeringInspector } from '../EngineeringInspector';

describe('EngineeringInspector delete flow', () => {
  it('renderuje akcję usuwania i wywołuje callback po kliknięciu', () => {
    const onDeleteElement = vi.fn();
    render(
      <EngineeringInspector
        elementId="seg-001"
        elementType="LineBranch"
        elementData={{ name: 'Segment 001' }}
        onDeleteElement={onDeleteElement}
      />,
    );

    fireEvent.click(screen.getByTestId('engineering-delete-button'));
    expect(onDeleteElement).toHaveBeenCalledTimes(1);
  });

  it('nie renderuje akcji usuwania bez wybranego elementu', () => {
    render(
      <EngineeringInspector
        elementId={null}
        elementType={null}
        elementData={null}
        onDeleteElement={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('engineering-delete-button')).toBeNull();
  });

  it('pokazuje akcję zmiany typu katalogowego dla elementu z katalogiem', () => {
    const onChangeCatalogType = vi.fn();
    render(
      <EngineeringInspector
        elementId="seg-001"
        elementType="LineBranch"
        elementData={{ name: 'Segment 001' }}
        catalogInfo={{
          namespace: 'KABEL_SN',
          typeId: 'cable-tfk-yakxs-3x120',
          typeName: 'cable-tfk-yakxs-3x120',
          version: '2024.1',
          isMaterialized: true,
          hasDrift: false,
        }}
        onChangeCatalogType={onChangeCatalogType}
      />,
    );

    fireEvent.click(screen.getByTestId('engineering-catalog-change-button'));
    expect(onChangeCatalogType).toHaveBeenCalledTimes(1);
  });
});
