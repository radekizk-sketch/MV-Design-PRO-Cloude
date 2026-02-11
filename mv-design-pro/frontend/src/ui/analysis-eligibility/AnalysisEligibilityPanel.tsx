/**
 * Analysis Eligibility Panel — PR-17
 *
 * Panel macierzy zdolności uruchomienia analiz.
 * Wyświetla status ELIGIBLE/INELIGIBLE dla każdego typu analizy
 * z listą blockerów, ostrzeżeń i fix_actions.
 *
 * INVARIANTS:
 * - No auto-mutations
 * - No physics
 * - No solver calls
 * - 100% Polish labels
 * - Deterministic rendering (sorted by AnalysisType, issues by code)
 */

import React, { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import type {
  AnalysisEligibilityIssue,
  AnalysisEligibilityResult,
  EligibilityAnalysisType,
  EligibilityOverall,
  EligibilityStatus,
  FixAction,
} from '../types';
import {
  ELIGIBILITY_ANALYSIS_LABELS,
  ELIGIBILITY_STATUS_LABELS,
} from '../types';

// =============================================================================
// Constants (Polish labels)
// =============================================================================

const STATUS_BADGE: Record<EligibilityStatus, string> = {
  ELIGIBLE: 'bg-green-600 text-white',
  INELIGIBLE: 'bg-red-600 text-white',
};

const STATUS_BORDER: Record<EligibilityStatus, string> = {
  ELIGIBLE: 'border-green-300 bg-green-50',
  INELIGIBLE: 'border-red-300 bg-red-50',
};

const ISSUE_SEVERITY_COLORS: Record<string, string> = {
  BLOCKER: 'text-red-700 bg-red-50 border-red-300',
  WARNING: 'text-amber-700 bg-amber-50 border-amber-300',
  INFO: 'text-blue-700 bg-blue-50 border-blue-300',
};

const ISSUE_SEVERITY_LABELS: Record<string, string> = {
  BLOCKER: 'Blokada',
  WARNING: 'Ostrzeżenie',
  INFO: 'Informacja',
};

// Deterministic sort order for analysis types
const ANALYSIS_TYPE_ORDER: EligibilityAnalysisType[] = [
  'SC_3F',
  'SC_2F',
  'SC_1F',
  'LOAD_FLOW',
];

// =============================================================================
// Issue Item Component
// =============================================================================

interface EligibilityIssueItemProps {
  issue: AnalysisEligibilityIssue;
  onNavigate: (elementRef: string) => void;
  onFix: (fixAction: FixAction) => void;
}

const EligibilityIssueItem: React.FC<EligibilityIssueItemProps> = ({
  issue,
  onNavigate,
  onFix,
}) => {
  const handleNavigate = () => {
    if (issue.element_ref) {
      onNavigate(issue.element_ref);
    }
  };

  const handleFix = () => {
    if (issue.fix_action) {
      onFix(issue.fix_action);
    }
  };

  return (
    <div
      className={clsx(
        'p-2 border-l-4 mb-1 rounded-r text-sm',
        ISSUE_SEVERITY_COLORS[issue.severity],
      )}
      data-testid={`eligibility-issue-${issue.code}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold">
          {ISSUE_SEVERITY_LABELS[issue.severity] ?? issue.severity}
        </span>
        <span className="text-xs font-mono text-gray-600">{issue.code}</span>
      </div>
      <div className="text-sm">{issue.message_pl}</div>
      {issue.element_ref && (
        <div className="text-xs text-gray-600 mt-1">
          Element: <span className="font-mono font-semibold">{issue.element_ref}</span>
        </div>
      )}
      <div className="flex gap-2 mt-1">
        {issue.element_ref && (
          <button
            onClick={handleNavigate}
            className="px-2 py-0.5 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50"
            data-testid={`eligibility-navigate-${issue.code}`}
          >
            Przejdź
          </button>
        )}
        {issue.fix_action && (
          <button
            onClick={handleFix}
            className="px-2 py-0.5 text-xs font-medium rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
            data-testid={`eligibility-fix-${issue.code}`}
          >
            Napraw
          </button>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Analysis Entry Component
// =============================================================================

interface AnalysisEntryProps {
  result: AnalysisEligibilityResult;
  onNavigate: (elementRef: string) => void;
  onFix: (fixAction: FixAction) => void;
}

const AnalysisEntry: React.FC<AnalysisEntryProps> = ({
  result,
  onNavigate,
  onFix,
}) => {
  const [expanded, setExpanded] = useState(false);

  const allIssues = useMemo(
    () => [...result.blockers, ...result.warnings, ...result.info],
    [result],
  );

  const blockerCount = result.blockers.length;
  const label = ELIGIBILITY_ANALYSIS_LABELS[result.analysis_type] ?? result.analysis_type;
  const statusLabel = ELIGIBILITY_STATUS_LABELS[result.status] ?? result.status;

  return (
    <div
      className={clsx('border rounded mb-3', STATUS_BORDER[result.status])}
      data-testid={`eligibility-entry-${result.analysis_type}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              'px-2 py-0.5 text-xs font-bold rounded',
              STATUS_BADGE[result.status],
            )}
            data-testid={`eligibility-status-${result.analysis_type}`}
          >
            {statusLabel}
          </span>
          <span className="text-sm font-semibold text-gray-800">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {blockerCount > 0 && (
            <span className="text-xs text-red-600 font-medium">
              {blockerCount} {blockerCount === 1 ? 'blokada' : 'blokad'}
            </span>
          )}
          {allIssues.length > 0 && (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="px-2 py-1 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50"
              data-testid={`eligibility-toggle-${result.analysis_type}`}
            >
              {expanded ? 'Zwiń' : 'Pokaż wymagania'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded issue list */}
      {expanded && allIssues.length > 0 && (
        <div className="px-3 pb-3">
          {allIssues.map((issue) => (
            <EligibilityIssueItem
              key={`${issue.code}-${issue.element_ref ?? ''}`}
              issue={issue}
              onNavigate={onNavigate}
              onFix={onFix}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Main Panel Component
// =============================================================================

export interface AnalysisEligibilityPanelProps {
  matrix: AnalysisEligibilityResult[];
  overall: EligibilityOverall;
  onNavigate: (elementRef: string) => void;
  onFix: (fixAction: FixAction) => void;
}

export const AnalysisEligibilityPanel: React.FC<AnalysisEligibilityPanelProps> = ({
  matrix,
  overall,
  onNavigate,
  onFix,
}) => {
  // Sort matrix by deterministic order
  const sortedMatrix = useMemo(() => {
    const orderMap = new Map(ANALYSIS_TYPE_ORDER.map((t, i) => [t, i]));
    return [...matrix].sort(
      (a, b) =>
        (orderMap.get(a.analysis_type) ?? 99) -
        (orderMap.get(b.analysis_type) ?? 99),
    );
  }, [matrix]);

  return (
    <div className="bg-white" data-testid="analysis-eligibility-panel">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">
          Zdolność analiz
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Macierz dostępności typów analiz obliczeniowych
        </p>
      </div>

      {/* Summary */}
      <div
        className={clsx(
          'px-4 py-2 border-b text-xs',
          overall.eligible_all
            ? 'text-green-700 bg-green-50'
            : 'text-amber-700 bg-amber-50',
        )}
        data-testid="eligibility-summary"
      >
        {overall.eligible_all
          ? 'Wszystkie analizy dostępne'
          : overall.eligible_any
            ? `Część analiz zablokowana (${overall.blockers_total} blokad)`
            : `Wszystkie analizy zablokowane (${overall.blockers_total} blokad)`}
      </div>

      {/* Matrix entries */}
      <div className="p-4">
        {sortedMatrix.map((result) => (
          <AnalysisEntry
            key={result.analysis_type}
            result={result}
            onNavigate={onNavigate}
            onFix={onFix}
          />
        ))}
      </div>
    </div>
  );
};
