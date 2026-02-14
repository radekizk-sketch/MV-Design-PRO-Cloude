/**
 * readinessGates.test.ts — RUN #3E §3: Readiness gate tests.
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
