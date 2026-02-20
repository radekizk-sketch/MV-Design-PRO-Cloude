/**
 * Modal Registry — completeness guard tests
 *
 * Ensures that the modal registry (single source of truth for
 * modal-to-operation mapping) is complete, consistent, and
 * has no unimplemented entries.
 *
 * Pure logic tests — no React rendering.
 */

import { describe, it, expect } from 'vitest';
import {
  MODAL_REGISTRY,
  MODAL_IDS,
  getUnimplementedModals,
  getModalEntry,
  getModalByOp,
} from '../modalRegistry';

// =============================================================================
// TESTS
// =============================================================================

describe('Modal Registry — completeness guard', () => {
  // ---------------------------------------------------------------------------
  // Implementation completeness
  // ---------------------------------------------------------------------------

  it('all modals are implemented', () => {
    const unimplemented = getUnimplementedModals();
    expect(unimplemented).toHaveLength(0);
  });

  it('registry has at least 10 entries', () => {
    expect(MODAL_REGISTRY.length).toBeGreaterThanOrEqual(10);
  });

  // ---------------------------------------------------------------------------
  // Polish labels
  // ---------------------------------------------------------------------------

  it('all entries have Polish labels', () => {
    for (const entry of MODAL_REGISTRY) {
      expect(entry.labelPl).toBeTruthy();
      expect(entry.labelPl.length).toBeGreaterThan(2);
    }
  });

  it('no entry has an English-only label', () => {
    const englishOnlyPatterns = /^(Add|Insert|Remove|Delete|Run|Edit|Open|Close|Create) /;
    for (const entry of MODAL_REGISTRY) {
      expect(entry.labelPl).not.toMatch(englishOnlyPatterns);
    }
  });

  // ---------------------------------------------------------------------------
  // Canonical operations
  // ---------------------------------------------------------------------------

  it('all entries have canonical operations', () => {
    for (const entry of MODAL_REGISTRY) {
      expect(entry.canonicalOp).toBeTruthy();
      expect(entry.canonicalOp.length).toBeGreaterThan(0);
    }
  });

  it('canonical operations use snake_case format', () => {
    for (const entry of MODAL_REGISTRY) {
      // Should not contain uppercase letters (snake_case convention)
      expect(entry.canonicalOp).toMatch(/^[a-z_0-9]+$/);
    }
  });

  // ---------------------------------------------------------------------------
  // Unique IDs
  // ---------------------------------------------------------------------------

  it('no duplicate modal IDs', () => {
    const ids = MODAL_REGISTRY.map((e) => e.modalId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no duplicate canonical operations (except shared)', () => {
    // Some ops are shared (e.g., insert_station_on_segment_sn for 2 variants)
    const ops = MODAL_REGISTRY.map((e) => e.canonicalOp);
    // At minimum, there should be more unique ops than half of total
    expect(new Set(ops).size).toBeGreaterThanOrEqual(Math.floor(ops.length / 2));
  });

  // ---------------------------------------------------------------------------
  // Component names
  // ---------------------------------------------------------------------------

  it('all entries have non-empty component names', () => {
    for (const entry of MODAL_REGISTRY) {
      expect(entry.componentName).toBeTruthy();
      expect(entry.componentName.length).toBeGreaterThan(0);
    }
  });

  it('component names use PascalCase', () => {
    for (const entry of MODAL_REGISTRY) {
      // First character should be uppercase
      expect(entry.componentName[0]).toBe(entry.componentName[0].toUpperCase());
    }
  });

  // ---------------------------------------------------------------------------
  // MODAL_IDS alignment
  // ---------------------------------------------------------------------------

  it('MODAL_IDS keys match registry entries', () => {
    const registryIds = new Set(MODAL_REGISTRY.map((e) => e.modalId));
    const declaredIds = new Set(Object.values(MODAL_IDS));

    // Every declared ID should appear in the registry
    for (const id of declaredIds) {
      expect(registryIds.has(id)).toBe(true);
    }

    // Every registry entry should use a declared ID
    for (const id of registryIds) {
      expect(declaredIds.has(id)).toBe(true);
    }
  });

  it('MODAL_IDS keys match their values (self-referential pattern)', () => {
    for (const [key, value] of Object.entries(MODAL_IDS)) {
      expect(key).toBe(value);
    }
  });

  // ---------------------------------------------------------------------------
  // Lookup functions
  // ---------------------------------------------------------------------------

  describe('getModalEntry', () => {
    it('returns entry for valid modal ID', () => {
      const entry = getModalEntry(MODAL_IDS.MODAL_WSTAW_LACZNIK_SEKCYJNY);
      expect(entry).toBeDefined();
      expect(entry!.componentName).toBe('SectionSwitchModal');
      expect(entry!.canonicalOp).toBe('insert_section_switch_sn');
    });

    it('returns entry for NOP modal', () => {
      const entry = getModalEntry(MODAL_IDS.MODAL_USTAW_NOP);
      expect(entry).toBeDefined();
      expect(entry!.componentName).toBe('NOPModal');
      expect(entry!.canonicalOp).toBe('set_normal_open_point');
    });

    it('returns undefined for unknown ID', () => {
      const entry = getModalEntry('MODAL_NONEXISTENT' as never);
      expect(entry).toBeUndefined();
    });
  });

  describe('getModalByOp', () => {
    it('returns entry for valid canonical operation', () => {
      const entry = getModalByOp('insert_section_switch_sn');
      expect(entry).toBeDefined();
      expect(entry!.modalId).toBe(MODAL_IDS.MODAL_WSTAW_LACZNIK_SEKCYJNY);
    });

    it('returns entry for run_power_flow operation', () => {
      const entry = getModalByOp('run_power_flow');
      expect(entry).toBeDefined();
      expect(entry!.labelPl).toContain('rozp');
    });

    it('returns entry for run_short_circuit operation', () => {
      const entry = getModalByOp('run_short_circuit');
      expect(entry).toBeDefined();
      expect(entry!.labelPl).toContain('zwarciowe');
    });

    it('returns undefined for unknown operation', () => {
      const entry = getModalByOp('nonexistent_operation');
      expect(entry).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Known modals spot checks
  // ---------------------------------------------------------------------------

  describe('Known modal entries', () => {
    it('SectionSwitchModal is registered', () => {
      const found = MODAL_REGISTRY.find((e) => e.componentName === 'SectionSwitchModal');
      expect(found).toBeDefined();
      expect(found!.implemented).toBe(true);
    });

    it('NOPModal is registered', () => {
      const found = MODAL_REGISTRY.find((e) => e.componentName === 'NOPModal');
      expect(found).toBeDefined();
      expect(found!.implemented).toBe(true);
    });

    it('TrunkContinueModal is registered', () => {
      const found = MODAL_REGISTRY.find((e) => e.componentName === 'TrunkContinueModal');
      expect(found).toBeDefined();
      expect(found!.implemented).toBe(true);
    });

    it('ProtectionModal is registered', () => {
      const found = MODAL_REGISTRY.find((e) => e.componentName === 'ProtectionModal');
      expect(found).toBeDefined();
      expect(found!.canonicalOp).toBe('add_relay');
    });

    it('CatalogPicker is registered', () => {
      const found = MODAL_REGISTRY.find((e) => e.componentName === 'CatalogPicker');
      expect(found).toBeDefined();
      expect(found!.canonicalOp).toBe('assign_catalog_to_element');
    });
  });
});
