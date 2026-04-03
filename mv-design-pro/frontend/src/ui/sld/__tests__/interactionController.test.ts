import { describe, expect, it } from 'vitest';
import { getToolStatusTable, resolveToolAction } from '../interactionController';
import type { SelectedElement } from '../../types';

const TARGET: SelectedElement = {
  id: 'seg-001',
  type: 'LineBranch',
  name: 'Segment 001',
};

const BUS_TARGET: SelectedElement = {
  id: 'bus-001',
  type: 'Bus',
  name: 'Szyna 001',
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

  it('buduje minimalny kanoniczny kontekst dla insert_station_on_segment_sn', () => {
    const resolved = resolveToolAction('insert_station', TARGET, {
      hasSource: true,
      hasRing: false,
      activeCaseId: 'case-1',
    });

    expect(resolved.mode).toBe('DOMAIN_OP');
    expect(resolved.canonicalOp).toBe('insert_station_on_segment_sn');
    expect(resolved.payload).toMatchObject({
      source: 'sld_tool',
      segment_id: 'seg-001',
      segment_ref: 'seg-001',
    });
  });

  it('buduje payload assign_catalog bez zgadywania namespace lub typu katalogu', () => {
    const resolved = resolveToolAction('assign_catalog', TARGET, {
      hasSource: true,
      hasRing: false,
      activeCaseId: 'case-1',
    });

    expect(resolved.mode).toBe('DOMAIN_OP');
    expect(resolved.canonicalOp).toBe('assign_catalog_to_element');
    expect(resolved.payload).toEqual({
      source: 'sld_tool',
      element_ref: 'seg-001',
    });
    expect(resolved.payload).not.toHaveProperty('catalog_item_id');
    expect(resolved.payload).not.toHaveProperty('catalog_namespace');
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

  it('pozwala otworzyć formularz add_gpz po kliknięciu płótna', () => {
    const resolved = resolveToolAction('add_gpz', TARGET, {
      hasSource: false,
      hasRing: false,
      activeCaseId: 'case-1',
    }, { kind: 'canvas' });

    expect(resolved.mode).toBe('DOMAIN_OP');
    expect(resolved.canonicalOp).toBe('add_grid_source_sn');
    expect(resolved.payload).toEqual({ source: 'sld_tool' });
    expect(resolved.catalogRequired).toBe(true);
    expect(resolved.catalogNamespace).toBe('ZRODLO_SN');
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

  it('buduje payload start_branch wyłącznie z kanonicznym from_ref', () => {
    const resolved = resolveToolAction('start_branch', TARGET, {
      hasSource: true,
      hasRing: false,
      activeCaseId: 'case-1',
    }, { kind: 'port', portRole: 'BRANCH_OUT' });

    expect(resolved.mode).toBe('DOMAIN_OP');
    expect(resolved.canonicalOp).toBe('start_branch_segment_sn');
    expect(resolved.payload).toEqual({
      source: 'sld_tool',
      from_ref: 'seg-001',
    });
    expect(resolved.payload).not.toHaveProperty('from_bus_ref');
    expect(resolved.catalogRequired).toBe(true);
    expect(resolved.catalogNamespace).toBe('KABEL_SN');
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

  it('obsługuje elastyczną kolejność: edycja -> delete -> blokada trunk bez poprawnego kontekstu', () => {
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
    expect(edit.payload).toEqual({
      source: 'sld_tool',
      element_ref: 'seg-001',
      element_name: 'Segment 001',
    });
    expect(del.mode).toBe('DOMAIN_OP');
    expect(trunk.mode).toBe('BLOCKED');
    expect(trunk.reasonPl).toContain('Kontynuacja magistrali');
  });

  it('pozwala otworzyć kontynuację magistrali z poprawnego kontekstu szyny', () => {
    const resolved = resolveToolAction('continue_trunk', BUS_TARGET, {
      hasSource: true,
      hasRing: false,
      activeCaseId: 'case-1',
    }, { kind: 'element' });

    expect(resolved.mode).toBe('DOMAIN_OP');
    expect(resolved.payload).toMatchObject({
      source: 'sld_tool',
      trunk_id: 'bus-001',
      terminal_id: 'bus-001',
      from_terminal_id: 'bus-001',
    });
    expect(resolved.catalogRequired).toBe(true);
    expect(resolved.catalogNamespace).toBe('KABEL_SN');
  });
});
