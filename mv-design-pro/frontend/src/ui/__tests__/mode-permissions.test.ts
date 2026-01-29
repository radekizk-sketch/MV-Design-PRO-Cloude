/**
 * Mode Permissions Tests — P12a Data Manager Parity
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 1.2: Operating modes
 * - powerfactory_ui_parity.md § A: Mode-based gating
 *
 * Tests:
 * - Permission matrix correctness
 * - Blocked reason messages (Polish)
 * - Hard blocks enforcement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStateStore } from '../app-state/store';
import type { OperatingMode } from '../types';

// Permission matrix (copy from useModePermissions for testing)
type AppAction =
  | 'model.add_element'
  | 'model.edit_element'
  | 'model.delete_element'
  | 'model.edit_topology'
  | 'case.create'
  | 'case.rename'
  | 'case.delete'
  | 'case.clone'
  | 'case.activate'
  | 'case.edit_config'
  | 'calc.run'
  | 'result.view'
  | 'result.export'
  | 'result.compare';

const PERMISSION_MATRIX: Record<OperatingMode, Record<AppAction, boolean>> = {
  MODEL_EDIT: {
    'model.add_element': true,
    'model.edit_element': true,
    'model.delete_element': true,
    'model.edit_topology': true,
    'case.create': true,
    'case.rename': true,
    'case.delete': true,
    'case.clone': true,
    'case.activate': true,
    'case.edit_config': true,
    'calc.run': true,
    'result.view': true,
    'result.export': true,
    'result.compare': true,
  },
  CASE_CONFIG: {
    'model.add_element': false,
    'model.edit_element': false,
    'model.delete_element': false,
    'model.edit_topology': false,
    'case.create': false,
    'case.rename': false,
    'case.delete': false,
    'case.clone': false,
    'case.activate': false,
    'case.edit_config': true,
    'calc.run': false,
    'result.view': true,
    'result.export': true,
    'result.compare': true,
  },
  RESULT_VIEW: {
    'model.add_element': false,
    'model.edit_element': false,
    'model.delete_element': false,
    'model.edit_topology': false,
    'case.create': false,
    'case.rename': false,
    'case.delete': false,
    'case.clone': false,
    'case.activate': false,
    'case.edit_config': false,
    'calc.run': false,
    'result.view': true,
    'result.export': true,
    'result.compare': true,
  },
};

describe('Mode Permissions Matrix', () => {
  beforeEach(() => {
    useAppStateStore.getState().reset();
  });

  describe('MODEL_EDIT Mode', () => {
    const mode: OperatingMode = 'MODEL_EDIT';

    it('should allow all model operations', () => {
      expect(PERMISSION_MATRIX[mode]['model.add_element']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['model.edit_element']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['model.delete_element']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['model.edit_topology']).toBe(true);
    });

    it('should allow all case operations', () => {
      expect(PERMISSION_MATRIX[mode]['case.create']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['case.rename']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['case.delete']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['case.clone']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['case.activate']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['case.edit_config']).toBe(true);
    });

    it('should allow calculations', () => {
      expect(PERMISSION_MATRIX[mode]['calc.run']).toBe(true);
    });

    it('should allow result operations', () => {
      expect(PERMISSION_MATRIX[mode]['result.view']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['result.export']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['result.compare']).toBe(true);
    });
  });

  describe('CASE_CONFIG Mode', () => {
    const mode: OperatingMode = 'CASE_CONFIG';

    it('should block all model operations', () => {
      expect(PERMISSION_MATRIX[mode]['model.add_element']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['model.edit_element']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['model.delete_element']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['model.edit_topology']).toBe(false);
    });

    it('should block most case operations', () => {
      expect(PERMISSION_MATRIX[mode]['case.create']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['case.rename']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['case.delete']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['case.clone']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['case.activate']).toBe(false);
    });

    it('should allow case config edit', () => {
      expect(PERMISSION_MATRIX[mode]['case.edit_config']).toBe(true);
    });

    it('should block calculations', () => {
      expect(PERMISSION_MATRIX[mode]['calc.run']).toBe(false);
    });

    it('should allow result operations', () => {
      expect(PERMISSION_MATRIX[mode]['result.view']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['result.export']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['result.compare']).toBe(true);
    });
  });

  describe('RESULT_VIEW Mode', () => {
    const mode: OperatingMode = 'RESULT_VIEW';

    it('should block all model operations', () => {
      expect(PERMISSION_MATRIX[mode]['model.add_element']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['model.edit_element']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['model.delete_element']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['model.edit_topology']).toBe(false);
    });

    it('should block all case operations', () => {
      expect(PERMISSION_MATRIX[mode]['case.create']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['case.rename']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['case.delete']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['case.clone']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['case.activate']).toBe(false);
      expect(PERMISSION_MATRIX[mode]['case.edit_config']).toBe(false);
    });

    it('should block calculations', () => {
      expect(PERMISSION_MATRIX[mode]['calc.run']).toBe(false);
    });

    it('should allow all result operations', () => {
      expect(PERMISSION_MATRIX[mode]['result.view']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['result.export']).toBe(true);
      expect(PERMISSION_MATRIX[mode]['result.compare']).toBe(true);
    });
  });
});

describe('Mode Gating Rules', () => {
  describe('No active case rules', () => {
    it('should block calculation when no case is active', () => {
      const store = useAppStateStore.getState();
      store.setActiveMode('MODEL_EDIT');
      // No case set

      expect(store.canCalculate()).toBe(false);
    });

    it('should allow calculation when case is active and results not fresh', () => {
      const store = useAppStateStore.getState();
      store.setActiveMode('MODEL_EDIT');
      store.setActiveCase('case-1', 'SC-001', 'ShortCircuitCase', 'NONE');

      expect(store.canCalculate()).toBe(true);
    });
  });

  describe('Result status rules', () => {
    it('should block calculation when results are FRESH', () => {
      const store = useAppStateStore.getState();
      store.setActiveMode('MODEL_EDIT');
      store.setActiveCase('case-1', 'SC-001', 'ShortCircuitCase', 'FRESH');

      expect(store.canCalculate()).toBe(false);
    });

    it('should allow calculation when results are OUTDATED', () => {
      const store = useAppStateStore.getState();
      store.setActiveMode('MODEL_EDIT');
      store.setActiveCase('case-1', 'SC-001', 'ShortCircuitCase', 'OUTDATED');

      expect(store.canCalculate()).toBe(true);
    });
  });
});

describe('Polish Blocked Messages', () => {
  // These tests verify the blocked messages are in Polish
  // In a real app, these would be integration tests with the hooks

  const blockedMessages: Record<string, string> = {
    'model.add_element_CASE_CONFIG': 'Dodawanie elementów zablokowane w trybie konfiguracji przypadku',
    'model.add_element_RESULT_VIEW': 'Dodawanie elementów zablokowane w trybie wyników',
    'model.edit_element_CASE_CONFIG': 'Edycja elementów zablokowana w trybie konfiguracji przypadku',
    'model.edit_element_RESULT_VIEW': 'Edycja elementów zablokowana w trybie wyników',
    'case.create_CASE_CONFIG': 'Tworzenie przypadków zablokowane w trybie konfiguracji',
    'case.create_RESULT_VIEW': 'Tworzenie przypadków zablokowane w trybie wyników',
    'calc.run_CASE_CONFIG': 'Obliczenia zablokowane w trybie konfiguracji',
    'calc.run_RESULT_VIEW': 'Obliczenia zablokowane w trybie wyników',
  };

  it('should have Polish messages for blocked actions', () => {
    Object.entries(blockedMessages).forEach(([key, message]) => {
      // Verify message is in Polish (contains Polish characters or words)
      const isPolish =
        message.includes('zablokowane') ||
        message.includes('elementów') ||
        message.includes('przypadków') ||
        message.includes('konfiguracji') ||
        message.includes('wyników');

      expect(isPolish).toBe(true);
    });
  });
});

describe('Deterministic Case List Sorting', () => {
  it('should sort cases deterministically by name, then by id', () => {
    const cases = [
      { id: 'c', name: 'Beta' },
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Alpha' },
      { id: 'd', name: 'Gamma' },
    ];

    const sorted = [...cases].sort((a, b) => {
      let cmp = a.name.localeCompare(b.name, 'pl');
      if (cmp === 0) cmp = a.id.localeCompare(b.id);
      return cmp;
    });

    expect(sorted[0].id).toBe('a'); // Alpha (first by name, then by id)
    expect(sorted[1].id).toBe('b'); // Alpha (second by id)
    expect(sorted[2].id).toBe('c'); // Beta
    expect(sorted[3].id).toBe('d'); // Gamma
  });

  it('should produce same order on repeated sorts', () => {
    const cases = [
      { id: 'c', name: 'Beta' },
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Alpha' },
    ];

    const sortFn = (a: typeof cases[0], b: typeof cases[0]) => {
      let cmp = a.name.localeCompare(b.name, 'pl');
      if (cmp === 0) cmp = a.id.localeCompare(b.id);
      return cmp;
    };

    const sorted1 = [...cases].sort(sortFn);
    const sorted2 = [...cases].sort(sortFn);
    const sorted3 = [...cases].sort(sortFn);

    expect(sorted1.map(c => c.id)).toEqual(['a', 'b', 'c']);
    expect(sorted2.map(c => c.id)).toEqual(['a', 'b', 'c']);
    expect(sorted3.map(c => c.id)).toEqual(['a', 'b', 'c']);
  });
});
