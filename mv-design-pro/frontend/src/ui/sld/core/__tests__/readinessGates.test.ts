/**
 * readinessGates.test.ts — RUN #3E §3 + RUN #3I §I4: Readiness gate tests.
 *
 * BINDING: gates MUST throw ReadinessGateError when blockers exist.
 */
import { describe, it, expect } from 'vitest';
import {
  ReadinessAreaV1,
  ReadinessPriority,
  ReadinessGateError,
  requireSldReady,
  requireShortCircuitReady,
  requireLoadFlowReady,
  requireExportReady,
  requireOverridesValid,
  overridesIssuesToReadiness,
} from '../readinessProfile';
import type { ReadinessProfileV1, ReadinessIssueV1 } from '../readinessProfile';

function makeProfile(overrides: Partial<ReadinessProfileV1> = {}): ReadinessProfileV1 {
  return {
    snapshotId: 'snap_1',
    snapshotFingerprint: 'fp_1',
    sldReady: true,
    shortCircuitReady: true,
    loadFlowReady: true,
    protectionReady: true,
    issues: [],
    contentHash: 'abc',
    ...overrides,
  };
}

function makeIssue(
  code: string,
  area: ReadinessAreaV1,
  priority: ReadinessPriority = ReadinessPriority.BLOCKER,
): ReadinessIssueV1 {
  return {
    code,
    area,
    priority,
    messagePl: `Test: ${code}`,
    elementId: 'elem_001',
    elementType: null,
    fixHintPl: null,
    wizardStep: null,
  };
}

describe('ReadinessGateError', () => {
  it('contains gate name and blocker codes', () => {
    const blockers = [makeIssue('test.code', ReadinessAreaV1.TOPOLOGY)];
    const error = new ReadinessGateError('sld_ready', blockers);
    expect(error.gate).toBe('sld_ready');
    expect(error.blockers).toHaveLength(1);
    expect(error.message).toContain('sld_ready');
    expect(error.message).toContain('test.code');
    expect(error.name).toBe('ReadinessGateError');
  });
});

describe('requireSldReady', () => {
  it('passes when sldReady=true', () => {
    expect(() => requireSldReady(makeProfile())).not.toThrow();
  });

  it('throws when sldReady=false (topology blocker)', () => {
    const profile = makeProfile({
      sldReady: false,
      issues: [makeIssue('topo.missing', ReadinessAreaV1.TOPOLOGY)],
    });
    expect(() => requireSldReady(profile)).toThrow(ReadinessGateError);
  });

  it('throws when sldReady=false (generator blocker)', () => {
    const profile = makeProfile({
      sldReady: false,
      issues: [makeIssue('gen.missing', ReadinessAreaV1.GENERATORS)],
    });
    expect(() => requireSldReady(profile)).toThrow(ReadinessGateError);
  });

  it('throws when sldReady=false (station blocker)', () => {
    const profile = makeProfile({
      sldReady: false,
      issues: [makeIssue('sta.missing', ReadinessAreaV1.STATIONS)],
    });
    expect(() => requireSldReady(profile)).toThrow(ReadinessGateError);
  });
});

describe('requireShortCircuitReady', () => {
  it('passes when shortCircuitReady=true', () => {
    expect(() => requireShortCircuitReady(makeProfile())).not.toThrow();
  });

  it('throws when shortCircuitReady=false', () => {
    const profile = makeProfile({
      shortCircuitReady: false,
      issues: [makeIssue('src.missing', ReadinessAreaV1.SOURCES)],
    });
    expect(() => requireShortCircuitReady(profile)).toThrow(ReadinessGateError);
  });
});

describe('requireLoadFlowReady', () => {
  it('passes when loadFlowReady=true', () => {
    expect(() => requireLoadFlowReady(makeProfile())).not.toThrow();
  });

  it('throws when loadFlowReady=false', () => {
    const profile = makeProfile({
      loadFlowReady: false,
      issues: [makeIssue('cat.missing', ReadinessAreaV1.CATALOGS)],
    });
    expect(() => requireLoadFlowReady(profile)).toThrow(ReadinessGateError);
  });
});

describe('requireExportReady', () => {
  it('passes when no blockers', () => {
    expect(() => requireExportReady(makeProfile())).not.toThrow();
  });

  it('throws when any blocker exists', () => {
    const profile = makeProfile({
      issues: [makeIssue('prot.missing', ReadinessAreaV1.PROTECTION)],
    });
    expect(() => requireExportReady(profile)).toThrow(ReadinessGateError);
  });

  it('does not throw for warnings only', () => {
    const profile = makeProfile({
      issues: [
        makeIssue('warn.1', ReadinessAreaV1.ANALYSIS, ReadinessPriority.WARNING),
        makeIssue('info.1', ReadinessAreaV1.ANALYSIS, ReadinessPriority.INFO),
      ],
    });
    expect(() => requireExportReady(profile)).not.toThrow();
  });

  it('reports all blockers', () => {
    const profile = makeProfile({
      issues: [
        makeIssue('a.1', ReadinessAreaV1.TOPOLOGY),
        makeIssue('b.1', ReadinessAreaV1.CATALOGS),
        makeIssue('c.1', ReadinessAreaV1.GENERATORS),
      ],
    });
    try {
      requireExportReady(profile);
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ReadinessGateError);
      expect((e as ReadinessGateError).blockers).toHaveLength(3);
    }
  });
});

// =============================================================================
// RUN #3I §I4: Overrides validation gate
// =============================================================================

describe('requireOverridesValid (RUN #3I §I4)', () => {
  it('passes when no override issues', () => {
    const profile = makeProfile({ issues: [] });
    requireOverridesValid(profile); // should not throw
  });

  it('passes with non-override blockers', () => {
    const profile = makeProfile({
      issues: [makeIssue('topology.missing_bus', ReadinessAreaV1.TOPOLOGY)],
    });
    requireOverridesValid(profile); // should not throw
  });

  it('blocks on geometry.override_invalid_element', () => {
    const profile = makeProfile({
      issues: [
        makeIssue('geometry.override_invalid_element', ReadinessAreaV1.STATIONS),
      ],
    });
    try {
      requireOverridesValid(profile);
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ReadinessGateError);
      expect((e as ReadinessGateError).gate).toBe('overrides_valid');
      expect((e as ReadinessGateError).blockers).toHaveLength(1);
    }
  });

  it('blocks on geometry.override_causes_collision', () => {
    const profile = makeProfile({
      issues: [
        makeIssue('geometry.override_causes_collision', ReadinessAreaV1.STATIONS),
      ],
    });
    expect(() => requireOverridesValid(profile)).toThrow(ReadinessGateError);
  });

  it('ignores override warnings', () => {
    const profile = makeProfile({
      issues: [{
        code: 'geometry.override_invalid_element',
        area: ReadinessAreaV1.STATIONS,
        priority: ReadinessPriority.WARNING,
        messagePl: 'test',
        elementId: null,
        elementType: null,
        fixHintPl: null,
        wizardStep: null,
      }],
    });
    requireOverridesValid(profile); // should not throw
  });
});

describe('overridesIssuesToReadiness (RUN #3I §I4)', () => {
  it('converts single error', () => {
    const errors = [
      { elementId: 'node-1', code: 'geometry.override_invalid_element', message: 'Nie istnieje' },
    ];
    const issues = overridesIssuesToReadiness(errors);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('geometry.override_invalid_element');
    expect(issues[0].area).toBe(ReadinessAreaV1.STATIONS);
    expect(issues[0].priority).toBe(ReadinessPriority.BLOCKER);
    expect(issues[0].elementId).toBe('node-1');
    expect(issues[0].elementType).toBe('override');
  });

  it('converts multiple errors', () => {
    const errors = [
      { elementId: 'n1', code: 'geometry.override_invalid_element', message: 'm1' },
      { elementId: 'n2', code: 'geometry.override_causes_collision', message: 'm2' },
    ];
    const issues = overridesIssuesToReadiness(errors);
    expect(issues).toHaveLength(2);
  });

  it('returns empty for no errors', () => {
    expect(overridesIssuesToReadiness([])).toEqual([]);
  });

  it('integrates with readiness profile and gate', () => {
    const errors = [
      { elementId: 'n1', code: 'geometry.override_invalid_element', message: 'Blad' },
    ];
    const readinessIssues = overridesIssuesToReadiness(errors);
    const profile = makeProfile({
      issues: readinessIssues,
    });
    expect(() => requireOverridesValid(profile)).toThrow(ReadinessGateError);
  });
});
