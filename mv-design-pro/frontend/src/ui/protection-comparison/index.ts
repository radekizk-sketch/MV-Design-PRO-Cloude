/**
 * P15b — Protection Comparison Module
 *
 * Exports:
 * - ProtectionComparisonPage: Main comparison UI component
 * - API functions: createProtectionComparison, getProtectionComparisonTrace
 * - Types: All TypeScript interfaces
 */

export { ProtectionComparisonPage } from './ProtectionComparisonPage';
export {
  createProtectionComparison,
  getProtectionComparisonResults,
  getProtectionComparisonTrace,
  fetchProtectionRuns,
} from './api';
export type {
  ProtectionStateChange,
  IssueCode,
  IssueSeverity,
  ProtectionComparisonRow,
  RankingIssue,
  ProtectionComparisonSummary,
  ProtectionComparisonResult,
  ProtectionComparisonTraceStep,
  ProtectionComparisonTrace,
  ProtectionRunItem,
} from './types';
export {
  STATE_CHANGE_LABELS,
  STATE_CHANGE_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
} from './types';
