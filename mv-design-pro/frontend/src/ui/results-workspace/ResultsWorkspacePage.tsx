/**
 * Results Workspace Page — PR-22
 *
 * Unified results workspace: one screen for Run / Batch / Compare / Overlay.
 * PowerFactory/ETAP-grade industrial UX.
 *
 * LAYOUT:
 * ┌──────────────────────────────────────────────────────────────┐
 * │                    HEADER (context bar)                       │
 * ├────────┬───────────────────────────────────┬─────────────────┤
 * │ SIDEBAR│         CENTRAL PANEL             │   SLD OVERLAY   │
 * │ (nav)  │  (RUN / BATCH / COMPARE view)     │   (right)       │
 * │        │                                   │                 │
 * └────────┴───────────────────────────────────┴─────────────────┘
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: Read-only workspace, no physics
 * - powerfactory_ui_parity.md: Industrial-grade layout
 * - UI_CORE_ARCHITECTURE.md: Deterministic rendering
 *
 * INVARIANTS:
 * - No physics calculations
 * - No model mutations
 * - URL fully reproducible (deep-linking)
 * - Deterministic rendering
 * - Polish labels only
 */

import { useEffect } from 'react';
import { useResultsWorkspaceStore } from './store';
import { useAppStateStore } from '../app-state/store';
import { WorkspaceHeader } from './WorkspaceHeader';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { RunViewPanel } from './RunViewPanel';
import { BatchViewPanel } from './BatchViewPanel';
import { CompareViewPanel } from './CompareViewPanel';
import { SldOverlayPanel } from './SldOverlayPanel';
import { useResultsInspectorStore } from '../results-inspector/store';
import { useComparisonStore } from '../comparisons/store';

export function ResultsWorkspacePage() {
  const mode = useResultsWorkspaceStore((s) => s.mode);
  const studyCaseId = useResultsWorkspaceStore((s) => s.studyCaseId);
  const setStudyCaseId = useResultsWorkspaceStore((s) => s.setStudyCaseId);
  const syncFromUrl = useResultsWorkspaceStore((s) => s.syncFromUrl);
  const selectedRunId = useResultsWorkspaceStore((s) => s.selectedRunId);
  const selectedComparisonId = useResultsWorkspaceStore((s) => s.selectedComparisonId);
  const isLoading = useResultsWorkspaceStore((s) => s.isLoading);
  const error = useResultsWorkspaceStore((s) => s.error);

  const activeCaseId = useAppStateStore((s) => s.activeCaseId);

  // Results inspector for run data loading
  const selectInspectorRun = useResultsInspectorStore((s) => s.selectRun);

  // Comparison detail loading
  const selectComparisonDetail = useComparisonStore((s) => s.selectComparison);

  // Sync study case from app state
  useEffect(() => {
    if (activeCaseId && activeCaseId !== studyCaseId) {
      setStudyCaseId(activeCaseId);
    }
  }, [activeCaseId, studyCaseId, setStudyCaseId]);

  // Sync from URL on mount
  useEffect(() => {
    syncFromUrl();
  }, [syncFromUrl]);

  // Load run details when selected
  useEffect(() => {
    if (selectedRunId) {
      selectInspectorRun(selectedRunId);
    }
  }, [selectedRunId, selectInspectorRun]);

  // Load comparison details when selected
  useEffect(() => {
    if (selectedComparisonId) {
      selectComparisonDetail(selectedComparisonId);
    }
  }, [selectedComparisonId, selectComparisonDetail]);

  // No active case
  if (!activeCaseId) {
    return (
      <div
        className="flex-1 flex items-center justify-center bg-slate-50"
        data-testid="workspace-no-case"
      >
        <div className="text-center text-slate-400">
          <div className="text-lg mb-2">Przestrzeń robocza wyników</div>
          <div className="text-sm">
            Wybierz aktywny przypadek obliczeniowy, aby zobaczyć wyniki
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-white"
      data-testid="results-workspace"
    >
      {/* Header */}
      <WorkspaceHeader />

      {/* Error banner */}
      {error && (
        <div
          className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-sm text-rose-700 flex items-center justify-between"
          data-testid="workspace-error"
        >
          <span>{error}</span>
          <button
            className="text-xs text-rose-500 hover:text-rose-700"
            onClick={() => useResultsWorkspaceStore.getState().clearError()}
          >
            Zamknij
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="px-4 py-1 bg-blue-50 border-b border-blue-200 text-xs text-blue-600 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          Ładowanie danych...
        </div>
      )}

      {/* Main content area: sidebar + central + SLD */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Sidebar navigation */}
        <WorkspaceSidebar />

        {/* Center: Dynamic view panel */}
        {mode === 'RUN' && <RunViewPanel />}
        {mode === 'BATCH' && <BatchViewPanel />}
        {mode === 'COMPARE' && <CompareViewPanel />}

        {/* Right: SLD Overlay */}
        <SldOverlayPanel />
      </div>
    </div>
  );
}
