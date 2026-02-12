/**
 * Results Workspace Module — PR-22
 *
 * Unified results workspace: Run / Batch / Compare / Overlay.
 * Public exports for integration with App.tsx and navigation.
 */

export { ResultsWorkspacePage } from './ResultsWorkspacePage';
export { useResultsWorkspaceStore } from './store';
export type {
  WorkspaceMode,
  OverlayDisplayMode,
  WorkspaceProjection,
  RunSummary,
  BatchSummary,
  ComparisonSummary,
} from './types';
