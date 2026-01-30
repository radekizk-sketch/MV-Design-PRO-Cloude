/**
 * App State Module — P12a Data Manager Parity
 *
 * Global application state for active project, case, mode, and run.
 */

export {
  useAppStateStore,
  useActiveProjectId,
  useActiveCaseId,
  useActiveCaseName,
  useActiveCaseKind,
  useActiveMode,
  useActiveModeLabel,
  useCaseKindLabel,
  useResultStatusLabel,
  useHasActiveCase,
  useCanCalculate,
  useCaseManagerOpen,
  useIssuePanelOpen, // P30d
} from './store';

export type { CaseKind } from './store';
