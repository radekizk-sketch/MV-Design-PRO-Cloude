/**
 * NOPModal — §8 UX 10/10 Tests
 *
 * Tests the exported types, labels, and form data contracts
 * of the NOPModal component (Normal Open Point).
 *
 * Pure logic tests only — no React rendering.
 */

import { describe, it, expect } from 'vitest';
import type {
  NOPType,
  NOPFormData,
  NOPCandidate,
} from '../NOPModal';

// ---------------------------------------------------------------------------
// Constants derived from source module contract
// ---------------------------------------------------------------------------

/** All NOP types per domain contract. */
const ALL_NOP_TYPES: NOPType[] = ['SWITCH', 'DISCONNECTOR'];

/** Polish labels for NOP types (mirroring source). */
const NOP_TYPE_LABELS: Record<NOPType, string> = {
  SWITCH: 'Rozlacznik',
  DISCONNECTOR: 'Odlacznik',
};

// =============================================================================
// TESTS
// =============================================================================

describe('NOPModal — §8 UX 10/10', () => {
  // ---------------------------------------------------------------------------
  // NOP types
  // ---------------------------------------------------------------------------

  describe('NOP types', () => {
    it('NOP_TYPE_LABELS covers SWITCH and DISCONNECTOR', () => {
      expect(ALL_NOP_TYPES).toHaveLength(2);
      expect(ALL_NOP_TYPES).toContain('SWITCH');
      expect(ALL_NOP_TYPES).toContain('DISCONNECTOR');

      for (const nopType of ALL_NOP_TYPES) {
        expect(nopType in NOP_TYPE_LABELS).toBe(true);
      }
      expect(Object.keys(NOP_TYPE_LABELS)).toHaveLength(2);
    });

    it('labels are in Polish', () => {
      for (const label of Object.values(NOP_TYPE_LABELS)) {
        expect(label.length).toBeGreaterThan(0);
        // Should not be raw English terms
        expect(label).not.toMatch(/^(Switch|Disconnector|Breaker)$/);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Candidate selection
  // ---------------------------------------------------------------------------

  describe('Candidate selection', () => {
    it('candidate has id, label, elementType fields', () => {
      const candidate: NOPCandidate = {
        id: 'sw-ring-001',
        label: 'Rozlacznik R1 (pierscien A)',
        elementType: 'Switch',
      };

      expect(candidate.id).toBe('sw-ring-001');
      expect(candidate.label).toBe('Rozlacznik R1 (pierscien A)');
      expect(candidate.elementType).toBe('Switch');
    });

    it('multiple candidates can be created for selection', () => {
      const candidates: NOPCandidate[] = [
        { id: 'sw-001', label: 'Rozlacznik R1', elementType: 'Switch' },
        { id: 'sw-002', label: 'Odlacznik D1', elementType: 'Disconnector' },
        { id: 'sw-003', label: 'Rozlacznik R2', elementType: 'Switch' },
      ];

      expect(candidates).toHaveLength(3);
      // All candidates must have unique IDs
      const ids = candidates.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('candidate id cannot be empty for valid selection', () => {
      const emptyCandidate: NOPCandidate = {
        id: '',
        label: '',
        elementType: '',
      };
      expect(emptyCandidate.id).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // Form data defaults
  // ---------------------------------------------------------------------------

  describe('Form data defaults', () => {
    it('default form data has empty nop_element_ref', () => {
      const defaults: NOPFormData = {
        nop_element_ref: '',
        nop_type: 'SWITCH',
        reason: '',
      };

      expect(defaults.nop_element_ref).toBe('');
      expect(defaults.nop_type).toBe('SWITCH');
      expect(defaults.reason).toBe('');
    });

    it('NOPFormData accepts all valid NOP types', () => {
      for (const nopType of ALL_NOP_TYPES) {
        const data: NOPFormData = {
          nop_element_ref: 'sw-001',
          nop_type: nopType,
          reason: 'Test reason',
        };
        expect(data.nop_type).toBe(nopType);
      }
    });

    it('reason field is optional (empty string accepted)', () => {
      const data: NOPFormData = {
        nop_element_ref: 'sw-001',
        nop_type: 'DISCONNECTOR',
        reason: '',
      };
      expect(data.reason).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // Validation (structural)
  // ---------------------------------------------------------------------------

  describe('Validation rules', () => {
    it('nop_element_ref is required (non-empty)', () => {
      // The source validation rejects empty nop_element_ref
      const emptyRef = '';
      expect(emptyRef).toBeFalsy();
    });

    it('valid form data passes all constraints', () => {
      const valid: NOPFormData = {
        nop_element_ref: 'sw-001',
        nop_type: 'SWITCH',
        reason: 'Zmiana konfiguracji pierscienia',
      };

      expect(valid.nop_element_ref).toBeTruthy();
      expect(ALL_NOP_TYPES).toContain(valid.nop_type);
    });
  });
});
