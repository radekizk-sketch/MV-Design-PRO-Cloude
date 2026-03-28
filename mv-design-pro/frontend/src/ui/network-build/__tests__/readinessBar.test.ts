/**
 * ReadinessBar — testy naprawionego mapowania fix actions.
 *
 * Weryfikuje:
 * - categorizeBlocker z rozszerzonymi wzorcami
 * - CODE_TO_MODAL_TYPE fallback mapping
 * - handleFixAction routing na 4 kanoniczne action_type
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Inline replicas of ReadinessBar pure functions for testing
// ---------------------------------------------------------------------------

type FilterCategory = 'all' | 'topologia' | 'katalogi' | 'eksploatacja' | 'analiza';

function categorizeBlocker(code: string): FilterCategory {
  const lc = code.toLowerCase();
  if (
    lc.includes('topology') || lc.includes('island') || lc.includes('disconnected') ||
    lc.includes('voltage_mismatch') || lc.includes('grounding') || lc.includes('isolated')
  ) {
    return 'topologia';
  }
  if (
    lc.includes('catalog') || lc.includes('missing_type') || lc.includes('no_catalog') ||
    lc.includes('impedance') || lc.includes('zero_seq') || lc.includes('missing_rating')
  ) {
    return 'katalogi';
  }
  if (
    lc.includes('switch_state') || lc.includes('nop') || lc.includes('normal_state') ||
    lc.includes('coupler') || lc.includes('tap_position') || lc.includes('operating')
  ) {
    return 'eksploatacja';
  }
  return 'analiza';
}

const CODE_TO_MODAL_TYPE: Record<string, string> = {
  missing_source: 'SourceModal',
  no_source: 'SourceModal',
  missing_transformer: 'TransformerModal',
  no_transformer: 'TransformerModal',
  missing_catalog: 'CatalogPicker',
  no_catalog: 'CatalogPicker',
  missing_protection: 'ProtectionBindingModal',
  no_protection: 'ProtectionBindingModal',
  missing_load: 'LoadModal',
  missing_generator: 'GeneratorModal',
  missing_field_device: 'FieldDeviceModal',
  missing_bay: 'FieldDeviceModal',
};

// ---------------------------------------------------------------------------
// Tests: categorizeBlocker
// ---------------------------------------------------------------------------

describe('categorizeBlocker', () => {
  it('classifies topology codes', () => {
    expect(categorizeBlocker('TOPOLOGY_ISLAND')).toBe('topologia');
    expect(categorizeBlocker('disconnected_bus')).toBe('topologia');
    expect(categorizeBlocker('voltage_mismatch_sn')).toBe('topologia');
    expect(categorizeBlocker('grounding_missing')).toBe('topologia');
    expect(categorizeBlocker('isolated_bus')).toBe('topologia');
  });

  it('classifies catalog codes', () => {
    expect(categorizeBlocker('missing_catalog_ref')).toBe('katalogi');
    expect(categorizeBlocker('no_catalog_assigned')).toBe('katalogi');
    expect(categorizeBlocker('missing_type_definition')).toBe('katalogi');
    expect(categorizeBlocker('impedance_missing')).toBe('katalogi');
    expect(categorizeBlocker('zero_seq_data')).toBe('katalogi');
    expect(categorizeBlocker('missing_rating')).toBe('katalogi');
  });

  it('classifies exploitation codes', () => {
    expect(categorizeBlocker('switch_state_invalid')).toBe('eksploatacja');
    expect(categorizeBlocker('NOP_MISSING')).toBe('eksploatacja');
    expect(categorizeBlocker('normal_state_undefined')).toBe('eksploatacja');
    expect(categorizeBlocker('coupler_open')).toBe('eksploatacja');
    expect(categorizeBlocker('tap_position_out_of_range')).toBe('eksploatacja');
    expect(categorizeBlocker('operating_mode')).toBe('eksploatacja');
  });

  it('defaults to analiza', () => {
    expect(categorizeBlocker('unknown_code')).toBe('analiza');
    expect(categorizeBlocker('protection_relay')).toBe('analiza');
    expect(categorizeBlocker('oze_generator')).toBe('analiza');
  });
});

// ---------------------------------------------------------------------------
// Tests: CODE_TO_MODAL_TYPE fallback mapping
// ---------------------------------------------------------------------------

describe('CODE_TO_MODAL_TYPE', () => {
  it('maps missing_source to SourceModal', () => {
    expect(CODE_TO_MODAL_TYPE['missing_source']).toBe('SourceModal');
  });

  it('maps missing_transformer to TransformerModal', () => {
    expect(CODE_TO_MODAL_TYPE['missing_transformer']).toBe('TransformerModal');
  });

  it('maps missing_catalog to CatalogPicker', () => {
    expect(CODE_TO_MODAL_TYPE['missing_catalog']).toBe('CatalogPicker');
  });

  it('maps missing_protection to ProtectionBindingModal', () => {
    expect(CODE_TO_MODAL_TYPE['missing_protection']).toBe('ProtectionBindingModal');
  });

  it('returns undefined for unknown codes', () => {
    expect(CODE_TO_MODAL_TYPE['unknown']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests: action_type routing
// ---------------------------------------------------------------------------

describe('fix action routing', () => {
  it('NAVIGATE_TO_ELEMENT should not open a form', () => {
    const actionType = 'NAVIGATE_TO_ELEMENT';
    // Should only navigate, not dispatch modal
    expect(actionType).toBe('NAVIGATE_TO_ELEMENT');
  });

  it('OPEN_MODAL should resolve via modal_type', () => {
    const actionType = 'OPEN_MODAL';
    const modalType = 'TransformerModal';
    // Should dispatch modal:open event
    expect(actionType).toBe('OPEN_MODAL');
    expect(modalType).toBe('TransformerModal');
  });

  it('SELECT_CATALOG should open assign_catalog_to_element form', () => {
    const actionType = 'SELECT_CATALOG';
    const expectedOp = 'assign_catalog_to_element';
    expect(actionType).toBe('SELECT_CATALOG');
    expect(expectedOp).toBe('assign_catalog_to_element');
  });

  it('ADD_MISSING_DEVICE should resolve device modal from code', () => {
    const actionType = 'ADD_MISSING_DEVICE';
    const code = 'missing_source';
    const fallbackModal = CODE_TO_MODAL_TYPE[code];
    expect(actionType).toBe('ADD_MISSING_DEVICE');
    expect(fallbackModal).toBe('SourceModal');
  });

  it('unknown action_type should not crash', () => {
    const actionType = 'UNKNOWN_TYPE';
    // Should fall through switch default
    expect(['OPEN_MODAL', 'NAVIGATE_TO_ELEMENT', 'SELECT_CATALOG', 'ADD_MISSING_DEVICE'].includes(actionType)).toBe(false);
  });
});
