/**
 * nN Source Readiness Codes — testy definicji kodow gotowosci.
 *
 * CANONICAL ALIGNMENT:
 * - nnSourceReadinessCodes.ts (FAZA 7)
 * - types.ts: ReadinessSeverity, FixActionType
 *
 * Verifies:
 * - All codes are properly formatted (dot-separated namespace).
 * - All severities are valid ReadinessSeverity values.
 * - All fix_action_type values are valid FixActionType values.
 * - No duplicate codes.
 * - Priority values are unique and ascending within severity groups.
 * - Polish messages (message_pl) are non-empty and contain no forbidden English.
 * - Lookup helpers (NN_READINESS_CODE_MAP, NN_BLOCKER_CODES, NN_WARNING_CODES) are correct.
 * - hasNNSourceBlockers function works correctly.
 */

import { describe, it, expect } from 'vitest';
import {
  NN_SOURCE_READINESS_CODES,
  NN_READINESS_CODE_MAP,
  NN_BLOCKER_CODES,
  NN_WARNING_CODES,
  hasNNSourceBlockers,
  type NNSourceReadinessCodeDef,
} from '../../engineering-readiness/nnSourceReadinessCodes';

// ---------------------------------------------------------------------------
// Valid enum values (mirroring types.ts)
// ---------------------------------------------------------------------------

const VALID_SEVERITIES = ['BLOCKER', 'IMPORTANT', 'INFO'] as const;
const VALID_FIX_ACTION_TYPES = [
  'OPEN_MODAL',
  'NAVIGATE_TO_ELEMENT',
  'SELECT_CATALOG',
  'ADD_MISSING_DEVICE',
] as const;

// ---------------------------------------------------------------------------
// Code format: must be dot-separated, lowercase with underscores
// ---------------------------------------------------------------------------

const CODE_FORMAT_REGEX = /^[a-z][a-z0-9_.]+$/;

// ---------------------------------------------------------------------------
// Forbidden English words in Polish messages
// ---------------------------------------------------------------------------

const FORBIDDEN_ENGLISH_IN_MESSAGES = [
  'missing',
  'invalid',
  'error',
  'required',
  'warning',
  'failed',
  'success',
  'source',
  'field',
  'switch',
  'catalog',
  'parameter',
  'module',
  'battery',
  'backup',
  'fuel',
  'mode',
  'control',
  'limit',
  'energy',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NN_SOURCE_READINESS_CODES — structure', () => {
  it('should have at least 10 readiness code definitions', () => {
    expect(NN_SOURCE_READINESS_CODES.length).toBeGreaterThanOrEqual(10);
  });

  it('should have no duplicate codes', () => {
    const codes = NN_SOURCE_READINESS_CODES.map((c) => c.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('every code should match the dot-separated namespace format', () => {
    for (const def of NN_SOURCE_READINESS_CODES) {
      expect(
        CODE_FORMAT_REGEX.test(def.code),
        `Code "${def.code}" does not match expected format (lowercase, dot-separated)`,
      ).toBe(true);
    }
  });
});

describe('NN_SOURCE_READINESS_CODES — severity', () => {
  it('every severity should be a valid ReadinessSeverity', () => {
    for (const def of NN_SOURCE_READINESS_CODES) {
      expect(
        (VALID_SEVERITIES as readonly string[]).includes(def.severity),
        `Code "${def.code}" has invalid severity "${def.severity}"`,
      ).toBe(true);
    }
  });

  it('should have at least one BLOCKER code', () => {
    const blockers = NN_SOURCE_READINESS_CODES.filter((c) => c.severity === 'BLOCKER');
    expect(blockers.length).toBeGreaterThanOrEqual(1);
  });

  it('should have at least one non-BLOCKER code (IMPORTANT or INFO)', () => {
    const nonBlockers = NN_SOURCE_READINESS_CODES.filter(
      (c) => c.severity === 'IMPORTANT' || c.severity === 'INFO',
    );
    expect(nonBlockers.length).toBeGreaterThanOrEqual(1);
  });
});

describe('NN_SOURCE_READINESS_CODES — fix actions', () => {
  it('every fix_action_type should be a valid FixActionType', () => {
    for (const def of NN_SOURCE_READINESS_CODES) {
      expect(
        (VALID_FIX_ACTION_TYPES as readonly string[]).includes(def.fix_action_type),
        `Code "${def.code}" has invalid fix_action_type "${def.fix_action_type}"`,
      ).toBe(true);
    }
  });

  it('codes with OPEN_MODAL fix should have a fix_panel defined', () => {
    for (const def of NN_SOURCE_READINESS_CODES) {
      if (def.fix_action_type === 'OPEN_MODAL') {
        expect(
          def.fix_panel,
          `Code "${def.code}" has OPEN_MODAL but no fix_panel`,
        ).toBeTruthy();
      }
    }
  });

  it('codes with SELECT_CATALOG fix should have a fix_panel or fix_focus defined', () => {
    for (const def of NN_SOURCE_READINESS_CODES) {
      if (def.fix_action_type === 'SELECT_CATALOG') {
        const hasTarget = def.fix_panel !== null || def.fix_focus !== null;
        expect(
          hasTarget,
          `Code "${def.code}" has SELECT_CATALOG but neither fix_panel nor fix_focus`,
        ).toBe(true);
      }
    }
  });
});

describe('NN_SOURCE_READINESS_CODES — priority', () => {
  it('every priority should be a positive integer', () => {
    for (const def of NN_SOURCE_READINESS_CODES) {
      expect(def.priority).toBeGreaterThan(0);
      expect(Number.isInteger(def.priority)).toBe(true);
    }
  });

  it('no two codes should share the same priority', () => {
    const priorities = NN_SOURCE_READINESS_CODES.map((c) => c.priority);
    const uniquePriorities = new Set(priorities);
    expect(uniquePriorities.size).toBe(priorities.length);
  });

  it('blockers should have lower (higher priority) values than warnings/info', () => {
    const blockerPriorities = NN_SOURCE_READINESS_CODES.filter(
      (c) => c.severity === 'BLOCKER',
    ).map((c) => c.priority);
    const nonBlockerPriorities = NN_SOURCE_READINESS_CODES.filter(
      (c) => c.severity !== 'BLOCKER',
    ).map((c) => c.priority);

    if (blockerPriorities.length > 0 && nonBlockerPriorities.length > 0) {
      const maxBlocker = Math.max(...blockerPriorities);
      const minNonBlocker = Math.min(...nonBlockerPriorities);
      expect(
        maxBlocker,
        'Highest blocker priority should be lower than lowest non-blocker priority',
      ).toBeLessThan(minNonBlocker);
    }
  });
});

describe('NN_SOURCE_READINESS_CODES — Polish messages', () => {
  it('every message_pl should be non-empty', () => {
    for (const def of NN_SOURCE_READINESS_CODES) {
      expect(
        def.message_pl.length,
        `Code "${def.code}" has empty message_pl`,
      ).toBeGreaterThan(0);
    }
  });

  it('every condition should be non-empty', () => {
    for (const def of NN_SOURCE_READINESS_CODES) {
      expect(
        def.condition.length,
        `Code "${def.code}" has empty condition`,
      ).toBeGreaterThan(0);
    }
  });

  it('messages should not contain standalone forbidden English words', () => {
    for (const def of NN_SOURCE_READINESS_CODES) {
      // Check that the Polish message does not consist entirely of English words
      // We allow domain terms like SOC, PV, BESS, UPS, etc.
      const words = def.message_pl.toLowerCase().split(/\s+/);
      const englishCount = words.filter((w) =>
        FORBIDDEN_ENGLISH_IN_MESSAGES.includes(w),
      ).length;
      // If more than half the words are forbidden English, flag it
      expect(
        englishCount,
        `Code "${def.code}" message_pl appears to be in English: "${def.message_pl}"`,
      ).toBeLessThan(words.length / 2);
    }
  });
});

describe('NN_SOURCE_READINESS_CODES — known codes coverage', () => {
  const EXPECTED_CODES = [
    'nn.source.field_missing',
    'nn.source.switch_missing',
    'nn.source.catalog_missing',
    'nn.source.parameters_missing',
    'nn.voltage_missing',
    'pv.control_mode_missing',
    'bess.energy_module_missing',
    'bess.soc_limits_invalid',
    'ups.backup_time_invalid',
  ];

  it.each(EXPECTED_CODES)('should contain code: %s', (code) => {
    const found = NN_SOURCE_READINESS_CODES.find((c) => c.code === code);
    expect(found, `Expected readiness code "${code}" to be defined`).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

describe('NN_READINESS_CODE_MAP', () => {
  it('should have the same number of entries as NN_SOURCE_READINESS_CODES', () => {
    expect(NN_READINESS_CODE_MAP.size).toBe(NN_SOURCE_READINESS_CODES.length);
  });

  it('should look up every code correctly', () => {
    for (const def of NN_SOURCE_READINESS_CODES) {
      const looked = NN_READINESS_CODE_MAP.get(def.code);
      expect(looked).toBeDefined();
      expect(looked!.code).toBe(def.code);
      expect(looked!.severity).toBe(def.severity);
    }
  });

  it('should return undefined for unknown codes', () => {
    expect(NN_READINESS_CODE_MAP.get('nonexistent.code')).toBeUndefined();
  });
});

describe('NN_BLOCKER_CODES', () => {
  it('should contain only BLOCKER severity codes', () => {
    for (const code of NN_BLOCKER_CODES) {
      expect(code.severity).toBe('BLOCKER');
    }
  });

  it('should match count of BLOCKER entries in NN_SOURCE_READINESS_CODES', () => {
    const expected = NN_SOURCE_READINESS_CODES.filter((c) => c.severity === 'BLOCKER');
    expect(NN_BLOCKER_CODES.length).toBe(expected.length);
  });
});

describe('NN_WARNING_CODES', () => {
  it('should contain only IMPORTANT or INFO severity codes', () => {
    for (const code of NN_WARNING_CODES) {
      expect(['IMPORTANT', 'INFO']).toContain(code.severity);
    }
  });

  it('should match count of IMPORTANT + INFO entries', () => {
    const expected = NN_SOURCE_READINESS_CODES.filter(
      (c) => c.severity === 'IMPORTANT' || c.severity === 'INFO',
    );
    expect(NN_WARNING_CODES.length).toBe(expected.length);
  });
});

// ---------------------------------------------------------------------------
// hasNNSourceBlockers function
// ---------------------------------------------------------------------------

describe('hasNNSourceBlockers', () => {
  it('should return true when blockers are present', () => {
    expect(hasNNSourceBlockers(['nn.source.field_missing'])).toBe(true);
    expect(hasNNSourceBlockers(['nn.source.catalog_missing'])).toBe(true);
    expect(hasNNSourceBlockers(['pv.control_mode_missing'])).toBe(true);
  });

  it('should return false for empty array', () => {
    expect(hasNNSourceBlockers([])).toBe(false);
  });

  it('should return false for only non-blocker codes', () => {
    const nonBlockerCodes = NN_WARNING_CODES.map((c) => c.code);
    expect(hasNNSourceBlockers(nonBlockerCodes)).toBe(false);
  });

  it('should return true for mixed codes containing at least one blocker', () => {
    const mixed = ['genset.fuel_type_missing', 'nn.source.field_missing'];
    expect(hasNNSourceBlockers(mixed)).toBe(true);
  });

  it('should return false for unknown codes (not in map)', () => {
    expect(hasNNSourceBlockers(['unknown.code.xyz'])).toBe(false);
  });
});
