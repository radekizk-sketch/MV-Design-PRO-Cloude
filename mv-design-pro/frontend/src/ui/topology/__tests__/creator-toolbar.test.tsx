import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CreatorToolbar } from '../CreatorToolbar';
import { CREATOR_TOOLS, EDITOR_OBJECT_TYPES } from '../editorPalette';

describe('CreatorToolbar V2', () => {
  it('render snapshot — evidence UI toolbar/palette', () => {
    const onToolChange = vi.fn();
    const { container } = render(
      <CreatorToolbar
        activeTool={'continue_trunk'}
        onToolChange={onToolChange}
        hasSource={true}
        hasRing={true}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it('renderuje wymagane narzędzia kanoniczne', () => {
    const onToolChange = vi.fn();
    render(
      <CreatorToolbar
        activeTool={null}
        onToolChange={onToolChange}
        hasSource={true}
        hasRing={true}
      />,
    );

    expect(screen.getByTestId('creator-tool-select')).toBeDefined();
    expect(screen.getByTestId('creator-tool-move')).toBeDefined();
    expect(screen.getByTestId('creator-tool-continue_trunk')).toBeDefined();
    expect(screen.getByTestId('creator-tool-insert_station')).toBeDefined();
    expect(screen.getByTestId('creator-tool-start_branch')).toBeDefined();
    expect(screen.getByTestId('creator-tool-connect_ring')).toBeDefined();
    expect(screen.getByTestId('creator-tool-set_nop')).toBeDefined();
    expect(screen.getByTestId('creator-tool-add_pv')).toBeDefined();
    expect(screen.getByTestId('creator-tool-add_bess')).toBeDefined();
    expect(screen.getByTestId('creator-tool-edit_properties')).toBeDefined();
    expect(screen.getByTestId('creator-tool-assign_catalog')).toBeDefined();
    expect(screen.getByTestId('creator-tool-delete_element')).toBeDefined();
  });

  it('pokazuje przycisk Dodaj GPZ tylko bez źródła', () => {
    const onToolChange = vi.fn();

    const { rerender } = render(
      <CreatorToolbar
        activeTool={null}
        onToolChange={onToolChange}
        hasSource={false}
        hasRing={false}
      />,
    );

    expect(screen.getByTestId('creator-tool-add_gpz')).toBeDefined();

    rerender(
      <CreatorToolbar
        activeTool={null}
        onToolChange={onToolChange}
        hasSource={true}
        hasRing={false}
      />,
    );

    expect(screen.queryByTestId('creator-tool-add_gpz')).toBeNull();
  });

  it('wywołuje zmianę aktywnego narzędzia po kliknięciu', () => {
    const onToolChange = vi.fn();

    render(
      <CreatorToolbar
        activeTool={null}
        onToolChange={onToolChange}
        hasSource={true}
        hasRing={false}
      />,
    );

    fireEvent.click(screen.getByTestId('creator-tool-connect_ring'));
    expect(onToolChange).toHaveBeenCalledWith('connect_ring');
  });

  it('kliknięcie "Usuń z modelu" aktywuje narzędzie delete_element', () => {
    const onToolChange = vi.fn();

    render(
      <CreatorToolbar
        activeTool={null}
        onToolChange={onToolChange}
        hasSource={true}
        hasRing={false}
      />,
    );

    fireEvent.click(screen.getByTestId('creator-tool-delete_element'));
    expect(onToolChange).toHaveBeenCalledWith('delete_element');
  });
});

describe('editorPalette', () => {
  it('nie zawiera stringów PCC', () => {
    const blob = JSON.stringify({ tools: CREATOR_TOOLS, objects: EDITOR_OBJECT_TYPES }).toUpperCase();
    expect(blob.includes('PCC')).toBe(false);
  });

  it('definiuje wszystkie minimalne typy obiektów', () => {
    const ids = EDITOR_OBJECT_TYPES.map((item) => item.id).sort();
    expect(ids).toEqual([
      'BESS',
      'GPZ',
      'PUNKT_ROZGALEZNY',
      'PV',
      'STACJA_KONCOWA',
      'STACJA_ODGALEZNA',
      'STACJA_PRZELOTOWA',
      'STACJA_SEKCYJNA',
      'ZKSN',
    ]);
  });

  it('mapuje delete_element na kanoniczną operację delete_element', () => {
    const deleteTool = CREATOR_TOOLS.find((tool) => tool.id === 'delete_element');
    expect(deleteTool?.canonicalOp).toBe('delete_element');
  });
});
