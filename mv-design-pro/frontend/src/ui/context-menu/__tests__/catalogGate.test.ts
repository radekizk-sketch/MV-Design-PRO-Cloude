/**
 * Testy bramki katalogowej UI — catalogGate.ts
 *
 * Faza 5: Weryfikacja mapy operacja → namespace i logiki bramy.
 *
 * INVARIANTS:
 * - Operacje tworzące segmenty → namespace KABEL_SN
 * - Operacje tworzące transformatory → namespace TRAFO_SN_NN
 * - Operacje NIE tworzące elementów → brak wymagania
 * - Etykiety PL — brak anglicyzmów
 */

import { describe, it, expect } from 'vitest';
import {
  requiresCatalog,
  catalogNamespace,
  catalogNamespaceLabel,
  checkCatalogGate,
  resolveCanonicalOperation,
} from '../catalogGate';

// ===========================================================================
// TEST 1: requiresCatalog — operacje wymagające katalogu
// ===========================================================================

describe('requiresCatalog', () => {
  it('returns true for segment operations', () => {
    expect(requiresCatalog('continue_trunk_segment_sn')).toBe(true);
    expect(requiresCatalog('start_branch_segment_sn')).toBe(true);
    expect(requiresCatalog('connect_secondary_ring_sn')).toBe(true);
  });

  it('returns true for transformer operations', () => {
    expect(requiresCatalog('insert_station_on_segment_sn')).toBe(true);
    expect(requiresCatalog('add_transformer_sn_nn')).toBe(true);
  });

  it('returns true for action IDs mapped to canonical ops', () => {
    expect(requiresCatalog('add_trunk_segment')).toBe(true);
    expect(requiresCatalog('insert_station_a')).toBe(true);
    expect(requiresCatalog('add_branch')).toBe(true);
  });

  it('returns false for non-catalog operations', () => {
    expect(requiresCatalog('properties')).toBe(false);
    expect(requiresCatalog('delete')).toBe(false);
    expect(requiresCatalog('toggle_switch')).toBe(false);
    expect(requiresCatalog('show_tree')).toBe(false);
    expect(requiresCatalog('add_grid_source_sn')).toBe(false);
  });
});

// ===========================================================================
// TEST 2: catalogNamespace — mapowanie na namespace katalogu
// ===========================================================================

describe('catalogNamespace', () => {
  it('maps segment ops to KABEL_SN', () => {
    expect(catalogNamespace('continue_trunk_segment_sn')).toBe('KABEL_SN');
    expect(catalogNamespace('start_branch_segment_sn')).toBe('KABEL_SN');
    expect(catalogNamespace('connect_secondary_ring_sn')).toBe('KABEL_SN');
    expect(catalogNamespace('add_trunk_segment')).toBe('KABEL_SN');
  });

  it('maps transformer ops to TRAFO_SN_NN', () => {
    expect(catalogNamespace('insert_station_on_segment_sn')).toBe('TRAFO_SN_NN');
    expect(catalogNamespace('add_transformer_sn_nn')).toBe('TRAFO_SN_NN');
  });

  it('maps protection ops to correct namespaces', () => {
    expect(catalogNamespace('add_relay')).toBe('ZABEZPIECZENIE');
    expect(catalogNamespace('add_ct')).toBe('CT');
    expect(catalogNamespace('add_vt')).toBe('VT');
  });

  it('returns undefined for non-catalog ops', () => {
    expect(catalogNamespace('properties')).toBeUndefined();
    expect(catalogNamespace('delete')).toBeUndefined();
    expect(catalogNamespace('add_grid_source_sn')).toBeUndefined();
  });
});

// ===========================================================================
// TEST 3: checkCatalogGate — kompletna logika bramy
// ===========================================================================

describe('checkCatalogGate', () => {
  it('returns required=true with namespace for gated operations', () => {
    const gate = checkCatalogGate('add_trunk_segment');
    expect(gate.required).toBe(true);
    expect(gate.namespace).toBe('KABEL_SN');
    expect(gate.label).toBeDefined();
    expect(gate.canonicalOperation).toBe('continue_trunk_segment_sn');
  });

  it('returns required=false for ungated operations', () => {
    const gate = checkCatalogGate('properties');
    expect(gate.required).toBe(false);
    expect(gate.namespace).toBeUndefined();
    expect(gate.label).toBeUndefined();
  });

  it('resolves action IDs to canonical operations', () => {
    expect(checkCatalogGate('insert_station_a').canonicalOperation).toBe(
      'insert_station_on_segment_sn',
    );
    expect(checkCatalogGate('insert_station_b').canonicalOperation).toBe(
      'insert_station_on_segment_sn',
    );
    expect(checkCatalogGate('add_branch').canonicalOperation).toBe(
      'start_branch_segment_sn',
    );
  });

  it('provides Polish labels for all namespaces', () => {
    const gatedOps = [
      'add_trunk_segment',
      'insert_station_a',
      'add_branch',
      'add_relay',
      'add_ct',
      'add_vt',
    ];
    for (const opId of gatedOps) {
      const gate = checkCatalogGate(opId);
      if (gate.required && gate.label) {
        // Label nie powinien byc pusty
        expect(gate.label.length).toBeGreaterThan(0);
      }
    }
  });
});

// ===========================================================================
// TEST 4: catalogNamespaceLabel — etykiety PL
// ===========================================================================

describe('catalogNamespaceLabel', () => {
  it('returns Polish labels without English', () => {
    expect(catalogNamespaceLabel('KABEL_SN')).toContain('SN');
    expect(catalogNamespaceLabel('TRAFO_SN_NN')).toContain('Transformator');
    expect(catalogNamespaceLabel('ZABEZPIECZENIE')).toContain('Zabezpieczenie');
    expect(catalogNamespaceLabel('CT')).toContain('adowy');
    expect(catalogNamespaceLabel('VT')).toContain('owy');
  });
});

// ===========================================================================
// TEST 5: resolveCanonicalOperation — mapowanie action ID → canonical
// ===========================================================================

describe('resolveCanonicalOperation', () => {
  it('maps known action IDs to canonical operations', () => {
    expect(resolveCanonicalOperation('add_trunk_segment')).toBe('continue_trunk_segment_sn');
    expect(resolveCanonicalOperation('insert_station_a')).toBe('insert_station_on_segment_sn');
    expect(resolveCanonicalOperation('add_branch')).toBe('start_branch_segment_sn');
    expect(resolveCanonicalOperation('start_secondary_link')).toBe('connect_secondary_ring_sn');
  });

  it('passes through unknown IDs as-is', () => {
    expect(resolveCanonicalOperation('some_custom_op')).toBe('some_custom_op');
    expect(resolveCanonicalOperation('properties')).toBe('properties');
  });
});
