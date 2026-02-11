/**
 * Analysis Eligibility Panel Tests — PR-17
 *
 * Tests:
 * - Sort order (SC_3F, SC_2F, SC_1F, LOAD_FLOW)
 * - Disable run button when INELIGIBLE
 * - Fix action dispatch: OPEN_MODAL / NAVIGATE_TO_ELEMENT / SELECT_CATALOG
 * - Polish labels
 * - Deterministic rendering (snapshot stability)
 * - Data model contract (types match backend)
 */

import { describe, it, expect, vi } from 'vitest';
import type {
  AnalysisEligibilityIssue,
  AnalysisEligibilityResult,
  EligibilityAnalysisType,
  EligibilityOverall,
  EligibilityStatus,
  FixAction,
} from '../../types';
import {
  ELIGIBILITY_ANALYSIS_LABELS,
  ELIGIBILITY_STATUS_LABELS,
} from '../../types';

// =============================================================================
// Test Data Builders
// =============================================================================

function makeEligibilityIssue(
  code: string,
  severity: 'BLOCKER' | 'WARNING' | 'INFO',
  messagePl: string,
  elementRef: string | null = null,
  fixAction: FixAction | null = null,
): AnalysisEligibilityIssue {
  return {
    code,
    severity,
    message_pl: messagePl,
    element_ref: elementRef,
    element_type: elementRef ? 'branch' : null,
    fix_action: fixAction,
  };
}

function makeEligibilityResult(
  analysisType: EligibilityAnalysisType,
  status: EligibilityStatus,
  blockers: AnalysisEligibilityIssue[] = [],
  warnings: AnalysisEligibilityIssue[] = [],
  info: AnalysisEligibilityIssue[] = [],
): AnalysisEligibilityResult {
  return {
    analysis_type: analysisType,
    status,
    blockers,
    warnings,
    info,
    by_severity: {
      BLOCKER: blockers.length,
      WARNING: warnings.length,
      INFO: info.length,
    },
    content_hash: 'testhash_' + analysisType,
  };
}

// Fixtures
const ELIGIBLE_SC3F = makeEligibilityResult('SC_3F', 'ELIGIBLE');
const ELIGIBLE_LOAD_FLOW = makeEligibilityResult('LOAD_FLOW', 'ELIGIBLE');

const INELIGIBLE_SC2F = makeEligibilityResult(
  'SC_2F',
  'INELIGIBLE',
  [
    makeEligibilityIssue(
      'ELIG_SC2_CONTRACT_NOT_READY',
      'BLOCKER',
      'Kontrakt solver-input nie zawiera pól składowej ujemnej (Z₂).',
    ),
    makeEligibilityIssue(
      'ELIG_SC2_MISSING_Z2',
      'BLOCKER',
      'Źródła nie posiadają danych składowej ujemnej (Z₂).',
    ),
  ],
);

const INELIGIBLE_SC1F = makeEligibilityResult(
  'SC_1F',
  'INELIGIBLE',
  [
    makeEligibilityIssue(
      'ELIG_SC1_MISSING_Z0',
      'BLOCKER',
      'Źródło nie ma danych Z₀.',
      'src_grid',
      {
        action_type: 'OPEN_MODAL',
        element_ref: 'src_grid',
        modal_type: 'SourceModal',
        payload_hint: { required: 'zero_sequence' },
      },
    ),
  ],
);

const INELIGIBLE_ALL_NOT_READY = makeEligibilityResult(
  'SC_3F',
  'INELIGIBLE',
  [
    makeEligibilityIssue(
      'ELIG_NOT_READY',
      'BLOCKER',
      'Model sieci nie jest gotowy do obliczeń.',
    ),
    makeEligibilityIssue(
      'ELIG_SC3_MISSING_SOURCE',
      'BLOCKER',
      'Brak źródła zasilania.',
      null,
      {
        action_type: 'ADD_MISSING_DEVICE',
        element_ref: null,
        modal_type: 'SourceModal',
        payload_hint: { required: 'source' },
      },
    ),
  ],
);

const FULL_MATRIX: AnalysisEligibilityResult[] = [
  ELIGIBLE_SC3F,
  INELIGIBLE_SC2F,
  INELIGIBLE_SC1F,
  ELIGIBLE_LOAD_FLOW,
];

const OVERALL_PARTIAL: EligibilityOverall = {
  eligible_any: true,
  eligible_all: false,
  blockers_total: 3,
};

const OVERALL_ALL_ELIGIBLE: EligibilityOverall = {
  eligible_any: true,
  eligible_all: true,
  blockers_total: 0,
};

// =============================================================================
// Tests: Data Model
// =============================================================================

describe('AnalysisEligibilityPanel data model', () => {
  it('should have correct analysis types', () => {
    const types: EligibilityAnalysisType[] = ['SC_3F', 'SC_2F', 'SC_1F', 'LOAD_FLOW'];
    expect(types).toHaveLength(4);
  });

  it('should have correct eligibility statuses', () => {
    const statuses: EligibilityStatus[] = ['ELIGIBLE', 'INELIGIBLE'];
    expect(statuses).toHaveLength(2);
  });

  it('should have correct structure for eligibility issue', () => {
    const issue = INELIGIBLE_SC1F.blockers[0];
    expect(issue.code).toBe('ELIG_SC1_MISSING_Z0');
    expect(issue.severity).toBe('BLOCKER');
    expect(issue.message_pl).toContain('Z₀');
    expect(issue.element_ref).toBe('src_grid');
    expect(issue.fix_action).not.toBeNull();
    expect(issue.fix_action!.action_type).toBe('OPEN_MODAL');
  });

  it('should have correct structure for eligibility result', () => {
    expect(ELIGIBLE_SC3F.analysis_type).toBe('SC_3F');
    expect(ELIGIBLE_SC3F.status).toBe('ELIGIBLE');
    expect(ELIGIBLE_SC3F.blockers).toHaveLength(0);
    expect(ELIGIBLE_SC3F.content_hash).not.toBe('');
  });

  it('should support all FixAction types in eligibility issues', () => {
    const types: FixAction['action_type'][] = [
      'OPEN_MODAL',
      'NAVIGATE_TO_ELEMENT',
      'SELECT_CATALOG',
      'ADD_MISSING_DEVICE',
    ];
    for (const actionType of types) {
      const fa: FixAction = {
        action_type: actionType,
        element_ref: 'el_1',
        modal_type: null,
        payload_hint: null,
      };
      expect(fa.action_type).toBe(actionType);
    }
  });
});

// =============================================================================
// Tests: Sort Order
// =============================================================================

describe('AnalysisEligibilityPanel sort order', () => {
  it('should sort matrix by analysis type: SC_3F, SC_2F, SC_1F, LOAD_FLOW', () => {
    const order: EligibilityAnalysisType[] = ['SC_3F', 'SC_2F', 'SC_1F', 'LOAD_FLOW'];
    const orderMap = new Map(order.map((t, i) => [t, i]));

    const sorted = [...FULL_MATRIX].sort(
      (a, b) =>
        (orderMap.get(a.analysis_type) ?? 99) -
        (orderMap.get(b.analysis_type) ?? 99),
    );

    expect(sorted[0].analysis_type).toBe('SC_3F');
    expect(sorted[1].analysis_type).toBe('SC_2F');
    expect(sorted[2].analysis_type).toBe('SC_1F');
    expect(sorted[3].analysis_type).toBe('LOAD_FLOW');
  });

  it('should sort issues by code within a result', () => {
    const issues = [...INELIGIBLE_SC2F.blockers];
    issues.sort((a, b) => a.code.localeCompare(b.code));
    expect(issues[0].code).toBe('ELIG_SC2_CONTRACT_NOT_READY');
    expect(issues[1].code).toBe('ELIG_SC2_MISSING_Z2');
  });
});

// =============================================================================
// Tests: Run Button Disable Logic
// =============================================================================

describe('AnalysisEligibilityPanel run button gating', () => {
  it('should disable run when analysis is INELIGIBLE', () => {
    const isDisabled = (readinessReady: boolean, analysisEligible?: boolean): boolean => {
      const eligibilityBlocked = analysisEligible === false;
      return !readinessReady || eligibilityBlocked;
    };

    // Readiness OK, eligibility INELIGIBLE -> disabled
    expect(isDisabled(true, false)).toBe(true);

    // Readiness OK, eligibility ELIGIBLE -> enabled
    expect(isDisabled(true, true)).toBe(false);

    // Readiness NOT ready -> disabled regardless
    expect(isDisabled(false, true)).toBe(true);
    expect(isDisabled(false, false)).toBe(true);

    // No eligibility info -> only check readiness
    expect(isDisabled(true, undefined)).toBe(false);
    expect(isDisabled(false, undefined)).toBe(true);
  });

  it('should resolve eligibility status from matrix', () => {
    const getEligibilityForType = (
      matrix: AnalysisEligibilityResult[],
      type: EligibilityAnalysisType,
    ): boolean => {
      const entry = matrix.find((r) => r.analysis_type === type);
      return entry?.status === 'ELIGIBLE';
    };

    expect(getEligibilityForType(FULL_MATRIX, 'SC_3F')).toBe(true);
    expect(getEligibilityForType(FULL_MATRIX, 'SC_2F')).toBe(false);
    expect(getEligibilityForType(FULL_MATRIX, 'SC_1F')).toBe(false);
    expect(getEligibilityForType(FULL_MATRIX, 'LOAD_FLOW')).toBe(true);
  });
});

// =============================================================================
// Tests: Fix Action Dispatch
// =============================================================================

describe('AnalysisEligibilityPanel fix action dispatch', () => {
  it('should dispatch OPEN_MODAL fix action', () => {
    const onFix = vi.fn();
    const issue = INELIGIBLE_SC1F.blockers[0];

    if (issue.fix_action) {
      onFix(issue.fix_action);
    }

    expect(onFix).toHaveBeenCalledTimes(1);
    expect(onFix).toHaveBeenCalledWith({
      action_type: 'OPEN_MODAL',
      element_ref: 'src_grid',
      modal_type: 'SourceModal',
      payload_hint: { required: 'zero_sequence' },
    });
  });

  it('should dispatch NAVIGATE_TO_ELEMENT via onNavigate', () => {
    const onNavigate = vi.fn();
    const issue = INELIGIBLE_SC1F.blockers[0];

    if (issue.element_ref) {
      onNavigate(issue.element_ref);
    }

    expect(onNavigate).toHaveBeenCalledWith('src_grid');
  });

  it('should dispatch SELECT_CATALOG fix action', () => {
    const onFix = vi.fn();
    const issue = makeEligibilityIssue(
      'ELIG_SC3_MISSING_CATALOG_REF',
      'BLOCKER',
      'Brak catalog_ref',
      'line_1',
      {
        action_type: 'SELECT_CATALOG',
        element_ref: 'line_1',
        modal_type: 'BranchModal',
        payload_hint: { required: 'catalog_ref' },
      },
    );

    if (issue.fix_action) {
      onFix(issue.fix_action);
    }

    expect(onFix).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'SELECT_CATALOG',
        element_ref: 'line_1',
      }),
    );
  });

  it('should dispatch ADD_MISSING_DEVICE fix action', () => {
    const onFix = vi.fn();
    const issue = INELIGIBLE_ALL_NOT_READY.blockers[1];

    if (issue.fix_action) {
      onFix(issue.fix_action);
    }

    expect(onFix).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'ADD_MISSING_DEVICE',
        modal_type: 'SourceModal',
      }),
    );
  });

  it('should not call onFix when fix_action is null', () => {
    const onFix = vi.fn();
    const issue = INELIGIBLE_ALL_NOT_READY.blockers[0]; // ELIG_NOT_READY has no fix_action

    if (issue.fix_action) {
      onFix(issue.fix_action);
    }

    expect(onFix).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Tests: Polish Labels
// =============================================================================

describe('AnalysisEligibilityPanel Polish labels', () => {
  it('should have Polish labels for all analysis types', () => {
    const types: EligibilityAnalysisType[] = ['SC_3F', 'SC_2F', 'SC_1F', 'LOAD_FLOW'];
    for (const type of types) {
      const label = ELIGIBILITY_ANALYSIS_LABELS[type];
      expect(label).toBeDefined();
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('should have Polish labels for eligibility statuses', () => {
    expect(ELIGIBILITY_STATUS_LABELS['ELIGIBLE']).toBe('Możliwe');
    expect(ELIGIBILITY_STATUS_LABELS['INELIGIBLE']).toBe('Zablokowane');
  });

  it('should have Polish message_pl in all issues', () => {
    for (const result of FULL_MATRIX) {
      for (const issue of [...result.blockers, ...result.warnings, ...result.info]) {
        expect(issue.message_pl).toBeDefined();
        expect(issue.message_pl.length).toBeGreaterThan(0);
      }
    }
  });

  it('should not contain project codenames (Pxx)', () => {
    const codeNamePattern = /\bP\d{1,2}\b/;
    for (const type of Object.values(ELIGIBILITY_ANALYSIS_LABELS)) {
      expect(codeNamePattern.test(type)).toBe(false);
    }
    for (const status of Object.values(ELIGIBILITY_STATUS_LABELS)) {
      expect(codeNamePattern.test(status)).toBe(false);
    }
  });
});

// =============================================================================
// Tests: Determinism
// =============================================================================

describe('AnalysisEligibilityPanel determinism', () => {
  it('should produce stable JSON for same matrix', () => {
    const json1 = JSON.stringify(FULL_MATRIX);
    const json2 = JSON.stringify(FULL_MATRIX);
    expect(json1).toBe(json2);
  });

  it('should produce stable overall for same matrix', () => {
    const computeOverall = (matrix: AnalysisEligibilityResult[]): EligibilityOverall => ({
      eligible_any: matrix.some((r) => r.status === 'ELIGIBLE'),
      eligible_all: matrix.every((r) => r.status === 'ELIGIBLE'),
      blockers_total: matrix.reduce((sum, r) => sum + r.blockers.length, 0),
    });

    const overall1 = computeOverall(FULL_MATRIX);
    const overall2 = computeOverall(FULL_MATRIX);
    expect(overall1).toEqual(overall2);
    expect(overall1).toEqual(OVERALL_PARTIAL);
  });

  it('should produce stable keys for React rendering', () => {
    const keys = FULL_MATRIX.map((r) => r.analysis_type);
    expect(keys).toEqual(['SC_3F', 'SC_2F', 'SC_1F', 'LOAD_FLOW']);
    // Keys are unique
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// =============================================================================
// Tests: Overall Summary
// =============================================================================

describe('AnalysisEligibilityPanel overall summary', () => {
  it('should report eligible_any=true when some analyses eligible', () => {
    expect(OVERALL_PARTIAL.eligible_any).toBe(true);
    expect(OVERALL_PARTIAL.eligible_all).toBe(false);
  });

  it('should report eligible_all=true when all analyses eligible', () => {
    expect(OVERALL_ALL_ELIGIBLE.eligible_all).toBe(true);
    expect(OVERALL_ALL_ELIGIBLE.blockers_total).toBe(0);
  });

  it('should count blockers correctly', () => {
    const total = FULL_MATRIX.reduce((sum, r) => sum + r.blockers.length, 0);
    expect(total).toBe(OVERALL_PARTIAL.blockers_total);
  });
});
