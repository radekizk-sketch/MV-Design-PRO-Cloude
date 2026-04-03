import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useModalController } from '../ModalController';

describe('ModalController write-flow', () => {
  it('submits operation and closes modal on success', async () => {
    const onDomainOpComplete = vi.fn(async () => true);
    const { result } = renderHook(() => useModalController(onDomainOpComplete));

    act(() => {
      result.current.dispatch('add_grid_source_sn', 'src-1', 'Source', {
        catalog_binding: {
          namespace: 'ZRODLO_SN',
          name: 'GPZ 15 kV',
        },
      });
    });

    expect(result.current.state.isOpen).toBe(true);

    await act(async () => {
      await result.current.handleSubmit({ voltage_kv: 15 });
    });

    expect(onDomainOpComplete).toHaveBeenCalledWith(
      'add_grid_source_sn',
      'src-1',
      {
        catalog_binding: {
          namespace: 'ZRODLO_SN',
          name: 'GPZ 15 kV',
        },
        voltage_kv: 15,
      },
    );
    expect(result.current.state.isOpen).toBe(false);
  });

  it('keeps modal open on failed write operation', async () => {
    const onDomainOpComplete = vi.fn(async () => false);
    const { result } = renderHook(() => useModalController(onDomainOpComplete));

    act(() => {
      result.current.dispatch('add_grid_source_sn', 'src-1', 'Source', {
        catalog_binding: {
          namespace: 'ZRODLO_SN',
          name: 'GPZ 15 kV',
        },
      });
    });

    await act(async () => {
      await result.current.handleSubmit({ voltage_kv: 15 });
    });

    expect(onDomainOpComplete).toHaveBeenCalledTimes(1);
    expect(result.current.state.isOpen).toBe(true);
    expect(result.current.state.canonicalOp).toBe('add_grid_source_sn');
  });

  it('blokuje zapis operacji katalog-required bez jawnego catalog_binding', async () => {
    const onDomainOpComplete = vi.fn(async () => true);
    const { result } = renderHook(() => useModalController(onDomainOpComplete));

    act(() => {
      result.current.dispatch('add_grid_source_sn', 'src-1', 'Source');
    });

    await act(async () => {
      await result.current.handleSubmit({ voltage_kv: 15 });
    });

    expect(onDomainOpComplete).not.toHaveBeenCalled();
    expect(result.current.state.isOpen).toBe(true);
    expect(result.current.state.canonicalOp).toBe('add_grid_source_sn');
  });
});
