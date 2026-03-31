import { describe, expect, it } from 'vitest';
import { getToolStatusTable, resolveToolAction } from '../interactionController';
import type { SelectedElement } from '../../types';

const TARGET: SelectedElement = {
  id: 'seg-001',
  type: 'LineBranch',
  name: 'Segment 001',
};

describe('interactionController', () => {
  it('zwraca tabelę statusów z delete_element ustawionym jako DZIALA', () => {
    const table = getToolStatusTable();
    const deleteRow = table.find((row) => row.tool === 'delete_element');

    expect(deleteRow).toBeDefined();
    expect(deleteRow?.status).toBe('DZIALA');
    expect(deleteRow?.canonicalOp).toBe('delete_element');
  });

  it('blokuje akcję, gdy brak aktywnego case', () => {
    const resolved = resolveToolAction('continue_trunk', TARGET, {
      hasSource: true,
      hasRing: false,
      activeCaseId: null,
    });

    expect(resolved.mode).toBe('BLOCKED');
    expect(resolved.reasonPl).toContain('Brak aktywnego przypadku');
  });

  it('buduje payload dla insert_station_on_segment_sn', () => {
    const resolved = resolveToolAction('insert_station', TARGET, {
      hasSource: true,
      hasRing: false,
      activeCaseId: 'case-1',
    });

    expect(resolved.mode).toBe('DOMAIN_OP');
    expect(resolved.canonicalOp).toBe('insert_station_on_segment_sn');
    expect(resolved.payload.segment_ref).toBe('seg-001');
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    expect(resolved.payload.catalog_binding).toMatchObject({
      catalog_namespace: 'TRAFO_SN_NN',
      catalog_item_id: 'tr-sn-nn-15-04-630kva-dyn11',
    });
  });

  it('buduje payload assign_catalog z kanonicznym bindingiem katalogowym', () => {
=======
  });

  it('buduje payload assign_catalog z automatycznym catalog_item_id', () => {
>>>>>>> theirs
=======
  });

  it('buduje payload assign_catalog z automatycznym catalog_item_id', () => {
>>>>>>> theirs
=======
  });

  it('buduje payload assign_catalog z automatycznym catalog_item_id', () => {
>>>>>>> theirs
=======
  });

  it('buduje payload assign_catalog z automatycznym catalog_item_id', () => {
>>>>>>> theirs
=======
  });

  it('buduje payload assign_catalog z automatycznym catalog_item_id', () => {
>>>>>>> theirs
    const resolved = resolveToolAction('assign_catalog', TARGET, {
      hasSource: true,
      hasRing: false,
      activeCaseId: 'case-1',
    });

    expect(resolved.mode).toBe('DOMAIN_OP');
    expect(resolved.canonicalOp).toBe('assign_catalog_to_element');
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    expect(resolved.payload).toMatchObject({
      element_ref: 'seg-001',
      catalog_namespace: 'KABEL_SN',
      catalog_item_id: 'cable-tfk-yakxs-3x120',
      catalog_item_version: '2024.1',
      source_mode: 'KATALOG',
    });
=======
    expect(resolved.payload.catalog_item_id).toBe('AUTO/seg-001');
>>>>>>> theirs
=======
    expect(resolved.payload.catalog_item_id).toBe('AUTO/seg-001');
>>>>>>> theirs
=======
    expect(resolved.payload.catalog_item_id).toBe('AUTO/seg-001');
>>>>>>> theirs
=======
    expect(resolved.payload.catalog_item_id).toBe('AUTO/seg-001');
>>>>>>> theirs
=======
    expect(resolved.payload.catalog_item_id).toBe('AUTO/seg-001');
>>>>>>> theirs
  });

  it('mapuje delete_element na canonical delete_element i payload element_ref', () => {
    const resolved = resolveToolAction('delete_element', TARGET, {
      hasSource: true,
      hasRing: false,
      activeCaseId: 'case-1',
    });

    expect(resolved.mode).toBe('DOMAIN_OP');
    expect(resolved.canonicalOp).toBe('delete_element');
    expect(resolved.payload).toEqual({ element_ref: 'seg-001' });
  });

  it('pozwala wykonać add_gpz po kliknięciu płótna (canvas)', () => {
    const resolved = resolveToolAction('add_gpz', TARGET, {
      hasSource: false,
      hasRing: false,
      activeCaseId: 'case-1',
    }, { kind: 'canvas' });

    expect(resolved.mode).toBe('DOMAIN_OP');
    expect(resolved.canonicalOp).toBe('add_grid_source_sn');
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    expect(resolved.payload).toEqual({ voltage_kv: 15, sk3_mva: 250, rx_ratio: 0.1 });
=======
    expect(resolved.payload).toEqual({ voltage_kv: 15, sn_mva: 250 });
>>>>>>> theirs
=======
    expect(resolved.payload).toEqual({ voltage_kv: 15, sn_mva: 250 });
>>>>>>> theirs
=======
    expect(resolved.payload).toEqual({ voltage_kv: 15, sn_mva: 250 });
>>>>>>> theirs
=======
    expect(resolved.payload).toEqual({ voltage_kv: 15, sn_mva: 250 });
>>>>>>> theirs
=======
    expect(resolved.payload).toEqual({ voltage_kv: 15, sn_mva: 250 });
>>>>>>> theirs
  });

  it('blokuje start_branch na porcie innym niż BRANCH_OUT', () => {
    const resolved = resolveToolAction('start_branch', TARGET, {
      hasSource: true,
      hasRing: false,
      activeCaseId: 'case-1',
    }, { kind: 'port', portRole: 'TRUNK_OUT' });

    expect(resolved.mode).toBe('BLOCKED');
    expect(resolved.reasonPl).toContain('BRANCH_OUT');
  });

  it('blokuje narzędzie wymagające elementu, gdy kliknięto płótno', () => {
    const resolved = resolveToolAction('insert_station', TARGET, {
      hasSource: true,
      hasRing: false,
      activeCaseId: 'case-1',
    }, { kind: 'canvas' });

    expect(resolved.mode).toBe('BLOCKED');
    expect(resolved.reasonPl).toContain('elementu');
  });

  it('obsługuje elastyczną kolejność: edycja -> delete -> dalsza rozbudowa trunk', () => {
    const edit = resolveToolAction('edit_properties', TARGET, {
      hasSource: true,
      hasRing: false,
      activeCaseId: 'case-1',
    }, { kind: 'element' });
    const del = resolveToolAction('delete_element', TARGET, {
      hasSource: true,
      hasRing: false,
      activeCaseId: 'case-1',
    }, { kind: 'element' });
    const trunk = resolveToolAction('continue_trunk', TARGET, {
      hasSource: true,
      hasRing: false,
      activeCaseId: 'case-1',
    }, { kind: 'element' });

    expect(edit.mode).toBe('DOMAIN_OP');
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    expect(edit.payload).toEqual({
      element_ref: 'seg-001',
      parameters: {
        name: 'Segment 001',
      },
    });
    expect(del.mode).toBe('DOMAIN_OP');
    expect(trunk.mode).toBe('DOMAIN_OP');
    expect(trunk.payload).toMatchObject({
      catalog_binding: {
        catalog_namespace: 'KABEL_SN',
        catalog_item_id: 'cable-tfk-yakxs-3x120',
      },
    });
=======
    expect(del.mode).toBe('DOMAIN_OP');
    expect(trunk.mode).toBe('DOMAIN_OP');
>>>>>>> theirs
=======
    expect(del.mode).toBe('DOMAIN_OP');
    expect(trunk.mode).toBe('DOMAIN_OP');
>>>>>>> theirs
=======
    expect(del.mode).toBe('DOMAIN_OP');
    expect(trunk.mode).toBe('DOMAIN_OP');
>>>>>>> theirs
=======
    expect(del.mode).toBe('DOMAIN_OP');
    expect(trunk.mode).toBe('DOMAIN_OP');
>>>>>>> theirs
=======
    expect(del.mode).toBe('DOMAIN_OP');
    expect(trunk.mode).toBe('DOMAIN_OP');
>>>>>>> theirs
  });
});
