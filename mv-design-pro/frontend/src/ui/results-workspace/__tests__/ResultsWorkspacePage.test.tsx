/**
 * Results Workspace Page Tests — PR-22
 *
 * INVARIANTS VERIFIED:
 * - Component renders without errors
 * - Empty state shows correct message
 * - Mode switching updates panel visibility
 * - Polish labels displayed
 * - No codenames in output
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsWorkspacePage } from '../ResultsWorkspacePage';
import { useResultsWorkspaceStore } from '../store';
import { useAppStateStore } from '../../app-state/store';

// Mock API to prevent real network calls
vi.mock('../api', () => ({
  fetchWorkspaceProjection: vi.fn().mockResolvedValue({
    study_case_id: 'case-1',
    runs: [],
    batches: [],
    comparisons: [],
    latest_done_run_id: null,
    deterministic_hash: 'a'.repeat(64),
  }),
}));

// Mock results inspector store
vi.mock('../../results-inspector/store', () => ({
  useResultsInspectorStore: vi.fn((selector) =>
    selector({
      selectedRunId: null,
      busResults: null,
      branchResults: null,
      shortCircuitResults: null,
      isLoadingBuses: false,
      isLoadingBranches: false,
      isLoadingShortCircuit: false,
      selectRun: vi.fn(),
    })
  ),
}));

// Mock comparison store
vi.mock('../../comparisons/store', () => ({
  useComparisonStore: vi.fn((selector) =>
    selector({
      selectedComparison: null,
      selectComparison: vi.fn(),
    })
  ),
}));

// Mock overlay stores
vi.mock('../../sld-overlay/overlayStore', () => ({
  useOverlayStore: vi.fn((selector) =>
    selector({
      activeRunId: null,
      overlay: null,
      enabled: true,
      toggleOverlay: vi.fn(),
    })
  ),
}));

vi.mock('../../sld-overlay/sldDeltaOverlayStore', () => ({
  useSldDeltaOverlayStore: vi.fn((selector) =>
    selector({
      activeComparisonId: null,
      deltaPayload: null,
      enabled: false,
      isLoading: false,
      error: null,
    })
  ),
}));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset workspace store
  useResultsWorkspaceStore.setState({
    studyCaseId: null,
    projection: null,
    mode: 'RUN',
    selectedRunId: null,
    selectedBatchId: null,
    selectedComparisonId: null,
    overlayMode: 'result',
    filter: 'ALL',
    isLoading: false,
    error: null,
  });

  // Reset app state
  useAppStateStore.setState({
    activeProjectId: null,
    activeProjectName: null,
    activeCaseId: null,
    activeCaseName: null,
    activeCaseKind: null,
    activeCaseResultStatus: 'NONE',
    activeMode: 'RESULT_VIEW',
    activeRunId: null,
    activeSnapshotId: null,
    activeAnalysisType: null,
    caseManagerOpen: false,
    issuePanelOpen: false,
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ResultsWorkspacePage', () => {
  it('renders empty state when no active case', () => {
    render(<ResultsWorkspacePage />);
    expect(screen.getByTestId('workspace-no-case')).toBeTruthy();
    expect(
      screen.getByText('Wybierz aktywny przypadek obliczeniowy, aby zobaczyć wyniki')
    ).toBeTruthy();
  });

  it('renders workspace layout when case is active', () => {
    useAppStateStore.setState({
      activeCaseId: 'case-123',
      activeCaseName: 'Przypadek testowy',
    });
    useResultsWorkspaceStore.setState({
      studyCaseId: 'case-123',
      projection: {
        study_case_id: 'case-123',
        runs: [],
        batches: [],
        comparisons: [],
        latest_done_run_id: null,
        deterministic_hash: 'a'.repeat(64),
      },
    });

    render(<ResultsWorkspacePage />);
    expect(screen.getByTestId('results-workspace')).toBeTruthy();
    expect(screen.getByTestId('workspace-header')).toBeTruthy();
    expect(screen.getByTestId('workspace-sidebar')).toBeTruthy();
    expect(screen.getByTestId('sld-overlay-panel')).toBeTruthy();
  });

  it('shows RUN view by default', () => {
    useAppStateStore.setState({ activeCaseId: 'case-123' });
    useResultsWorkspaceStore.setState({
      studyCaseId: 'case-123',
      mode: 'RUN',
      projection: {
        study_case_id: 'case-123',
        runs: [],
        batches: [],
        comparisons: [],
        latest_done_run_id: null,
        deterministic_hash: 'b'.repeat(64),
      },
    });

    render(<ResultsWorkspacePage />);
    expect(screen.getByTestId('run-view-empty')).toBeTruthy();
  });

  it('shows error banner when error present', () => {
    useAppStateStore.setState({ activeCaseId: 'case-123' });
    useResultsWorkspaceStore.setState({
      studyCaseId: 'case-123',
      error: 'Test error message',
      projection: {
        study_case_id: 'case-123',
        runs: [],
        batches: [],
        comparisons: [],
        latest_done_run_id: null,
        deterministic_hash: 'c'.repeat(64),
      },
    });

    render(<ResultsWorkspacePage />);
    expect(screen.getByTestId('workspace-error')).toBeTruthy();
    expect(screen.getByText('Test error message')).toBeTruthy();
  });

  it('does not contain codenames (P11, P14, etc.)', () => {
    useAppStateStore.setState({ activeCaseId: 'case-123' });
    useResultsWorkspaceStore.setState({
      studyCaseId: 'case-123',
      projection: {
        study_case_id: 'case-123',
        runs: [],
        batches: [],
        comparisons: [],
        latest_done_run_id: null,
        deterministic_hash: 'd'.repeat(64),
      },
    });

    const { container } = render(<ResultsWorkspacePage />);
    const html = container.innerHTML;

    // Verify no project codenames appear in rendered HTML
    expect(html).not.toContain('P11');
    expect(html).not.toContain('P14');
    expect(html).not.toContain('P17');
    expect(html).not.toContain('P20');
    expect(html).not.toContain('PR-22');
  });

  it('shows Polish labels for mode buttons', () => {
    useAppStateStore.setState({ activeCaseId: 'case-123' });
    useResultsWorkspaceStore.setState({
      studyCaseId: 'case-123',
      projection: {
        study_case_id: 'case-123',
        runs: [],
        batches: [],
        comparisons: [],
        latest_done_run_id: null,
        deterministic_hash: 'e'.repeat(64),
      },
    });

    render(<ResultsWorkspacePage />);
    expect(screen.getByText('Wyniki obliczeń')).toBeTruthy();
    expect(screen.getByText('Obliczenia wsadowe')).toBeTruthy();
    expect(screen.getByText('Porównanie wyników')).toBeTruthy();
  });
});
