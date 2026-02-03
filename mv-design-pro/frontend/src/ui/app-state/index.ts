/**
 * App State Module — P12a Data Manager Parity + POWERFACTORY_LAYOUT
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
  // UI_INTEGRATION_E2E + POWERFACTORY_LAYOUT:
  useActiveSnapshotId,
  useActiveAnalysisType,
  useActiveAnalysisTypeLabel,
  useActiveRunId,
  useUIContext,
} from './store';

export type { CaseKind, AnalysisType } from './store';
