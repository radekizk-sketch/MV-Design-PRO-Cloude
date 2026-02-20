/**
 * FixAction Modal Bridge — tests
 *
 * Ensures:
 * - All known backend modal_type values are mapped
 * - resolveModalType returns valid MODAL_IDs
 * - resolveFixActionToOperation works correctly
 * - No unmapped modal types in production code
 */

import { describe, it, expect } from 'vitest';
import {
  BACKEND_MODAL_TYPE_MAP,
  resolveModalType,
  resolveFixActionToOperation,
  getUnmappedModalTypes,
} from '../fixActionModalBridge';
import { MODAL_IDS, MODAL_REGISTRY } from '../../topology/modals/modalRegistry';
import type { FixAction } from '../../types';

// ---------------------------------------------------------------------------
// Known backend modal_type values (from backend validator.py + fix_actions)
// ---------------------------------------------------------------------------

const KNOWN_BACKEND_MODAL_TYPES = [
  'SourceModal',
  'NodeModal',
  'BranchModal',
  'TransformerModal',
  'LoadModal',
  'GeneratorModal',
  'CatalogPicker',
  'FieldDeviceModal',
  'ProtectionBindingModal',
  'StudyCaseSettings',
  'Uzupełnij Z0',
  'Uzupełnij Z2',
  'Zmień tryb zwarcia',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FixAction Modal Bridge — mapping completeness', () => {
  it('all known backend modal_type values are mapped', () => {
    const unmapped = getUnmappedModalTypes(KNOWN_BACKEND_MODAL_TYPES);
    expect(unmapped).toEqual([]);
  });

  it('BACKEND_MODAL_TYPE_MAP has at least 10 entries', () => {
    expect(Object.keys(BACKEND_MODAL_TYPE_MAP).length).toBeGreaterThanOrEqual(10);
  });

  it('all mapped values are valid MODAL_IDs', () => {
    const validIds = new Set(Object.values(MODAL_IDS));
    for (const [backendType, modalId] of Object.entries(BACKEND_MODAL_TYPE_MAP)) {
      expect(validIds.has(modalId)).toBe(true);
    }
  });

  it('all mapped MODAL_IDs exist in MODAL_REGISTRY', () => {
    const registryIds = new Set(MODAL_REGISTRY.map((e) => e.modalId));
    for (const [, modalId] of Object.entries(BACKEND_MODAL_TYPE_MAP)) {
      expect(registryIds.has(modalId)).toBe(true);
    }
  });
});

describe('resolveModalType', () => {
  it('resolves SourceModal to MODAL_DODAJ_ZRODLO_SN', () => {
    expect(resolveModalType('SourceModal')).toBe(MODAL_IDS.MODAL_DODAJ_ZRODLO_SN);
  });

  it('resolves NodeModal to MODAL_ZMIEN_PARAMETRY', () => {
    expect(resolveModalType('NodeModal')).toBe(MODAL_IDS.MODAL_ZMIEN_PARAMETRY);
  });

  it('resolves TransformerModal to MODAL_DODAJ_TRANSFORMATOR', () => {
    expect(resolveModalType('TransformerModal')).toBe(MODAL_IDS.MODAL_DODAJ_TRANSFORMATOR);
  });

  it('resolves CatalogPicker to MODAL_ZMIEN_TYP_Z_KATALOGU', () => {
    expect(resolveModalType('CatalogPicker')).toBe(MODAL_IDS.MODAL_ZMIEN_TYP_Z_KATALOGU);
  });

  it('resolves Polish label modal types', () => {
    expect(resolveModalType('Uzupełnij Z0')).toBe(MODAL_IDS.MODAL_ZMIEN_PARAMETRY);
    expect(resolveModalType('Uzupełnij Z2')).toBe(MODAL_IDS.MODAL_ZMIEN_PARAMETRY);
    expect(resolveModalType('Zmień tryb zwarcia')).toBe(MODAL_IDS.MODAL_ZMIEN_PARAMETRY);
  });

  it('returns null for null input', () => {
    expect(resolveModalType(null)).toBeNull();
  });

  it('returns null for unknown modal type', () => {
    expect(resolveModalType('NonExistentModal')).toBeNull();
  });
});

describe('resolveFixActionToOperation', () => {
  it('resolves OPEN_MODAL fix action', () => {
    const fixAction: FixAction = {
      action_type: 'OPEN_MODAL',
      element_ref: 'source-1',
      modal_type: 'SourceModal',
      payload_hint: null,
    };
    const result = resolveFixActionToOperation(fixAction);
    expect(result.actionType).toBe('OPEN_MODAL');
    expect(result.modalId).toBe(MODAL_IDS.MODAL_DODAJ_ZRODLO_SN);
    expect(result.elementRef).toBe('source-1');
  });

  it('resolves SELECT_CATALOG fix action', () => {
    const fixAction: FixAction = {
      action_type: 'SELECT_CATALOG',
      element_ref: 'gen-1',
      modal_type: 'CatalogPicker',
      payload_hint: null,
    };
    const result = resolveFixActionToOperation(fixAction);
    expect(result.actionType).toBe('SELECT_CATALOG');
    expect(result.modalId).toBe(MODAL_IDS.MODAL_ZMIEN_TYP_Z_KATALOGU);
  });

  it('resolves NAVIGATE_TO_ELEMENT fix action (no modal)', () => {
    const fixAction: FixAction = {
      action_type: 'NAVIGATE_TO_ELEMENT',
      element_ref: 'bus-1',
      modal_type: null,
      payload_hint: null,
    };
    const result = resolveFixActionToOperation(fixAction);
    expect(result.actionType).toBe('NAVIGATE_TO_ELEMENT');
    expect(result.modalId).toBeNull();
    expect(result.elementRef).toBe('bus-1');
  });
});
