/**
 * Study Cases Module — P10 FULL MAX
 *
 * Public API for study case management.
 */

// Types
export * from './types';

// Store
export {
  useStudyCasesStore,
  useActiveCase,
  useHasActiveCase,
  useActiveCaseResultStatus,
  useCanCalculate,
  useCasesCount,
  useIsLoading,
  useActiveCaseStatusLabel,
  useSortedCases,
} from './store';

// Mode Gating
export {
  useCanPerformCaseOperation,
  useCanCreateCase,
  useCanManageCases,
  useCanEditCaseConfig,
  useCanCalculate as useCanCalculateCase,
  useNotifyModelChange,
  useCaseModeConstraints,
  useCanActivateCase,
} from './modeGating';
export type { StudyCaseOperation } from './modeGating';

// API
export * as studyCasesApi from './api';

// Components
export { StudyCaseList } from './StudyCaseList';
export { CaseCompareView } from './CaseCompareView';
export { CreateCaseDialog } from './CreateCaseDialog';
