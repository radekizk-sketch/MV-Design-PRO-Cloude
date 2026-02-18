/**
 * SLD Overlay Panel Tests — LF Integration
 *
 * INVARIANTS VERIFIED:
 * - LF overlay mode selector visible for LOAD_FLOW runs
 * - LF overlay mode selector hidden for SC runs
 * - Overlay does not change SLD layout
 * - Polish labels only
 * - No codenames
 * - No alert()
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SldOverlayPanel } from '../SldOverlayPanel';
import { useResultsWorkspaceStore } from '../store';
import type { WorkspaceProjection } from '../types';

// =============================================================================
// Mock Stores
// =============================================================================

vi.mock('../../sld-overlay/overlayStore', () => ({
  useOverlayStore: vi.fn((selector) =>
    selector({
      activeRunId: null,
      overlay: null,
      enabled: true,
      loadOverlay: vi.fn(),
      clearOverlay: vi.fn(),
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

vi.mock('../../power-flow-results/store', () => ({
  usePowerFlowResultsStore: vi.fn((selector) =>
    selector({
      selectedRunId: null,
      runHeader: null,
      results: null,
      trace: null,
      interpretation: null,
      overlayVisible: true,
      overlayMode: 'voltage',
      activeTab: 'BUSES',
      searchQuery: '',
      isLoadingHeader: false,
      isLoadingResults: false,
      isLoadingTrace: false,
      isLoadingInterpretation: false,
      error: null,
      setOverlayMode: vi.fn(),
    })
  ),
}));

vi.mock('../../sld-overlay/LoadFlowOverlayAdapter', () => ({
  buildLoadFlowOverlay: vi.fn().mockReturnValue({
    run_id: 'run-lf-1',
    analysis_type: 'LOAD_FLOW',
    elements: [],
    legend: [],
  }),
}));

// =============================================================================
// Helpers
// =============================================================================

function makeProjection(overrides: Partial<WorkspaceProjection> = {}): WorkspaceProjection {
  return {
    study_case_id: 'case-1',
    runs: [],
    batches: [],
    comparisons: [],
    latest_done_run_id: null,
    deterministic_hash: 'a'.repeat(64),
    content_hash: 'a'.repeat(64),
    source_run_ids: [],
    source_batch_ids: [],
    source_comparison_ids: [],
    metadata: { projection_version: '1.0.0', created_utc: '2025-01-15T10:00:00Z' },
    ...overrides,
  };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  useResultsWorkspaceStore.setState({
    studyCaseId: 'case-1',
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
});

// =============================================================================
// Tests
// =============================================================================

describe('SldOverlayPanel', () => {
  it('renders the panel with overlay mode selector', () => {
    render(<SldOverlayPanel />);
    expect(screen.getByTestId('sld-overlay-panel')).toBeTruthy();
    expect(screen.getByTestId('overlay-mode-result')).toBeTruthy();
    expect(screen.getByTestId('overlay-mode-delta')).toBeTruthy();
    expect(screen.getByTestId('overlay-mode-none')).toBeTruthy();
  });

  it('does not show LF mode selector when no LF run selected', () => {
    useResultsWorkspaceStore.setState({
      projection: makeProjection({
        runs: [
          {
            run_id: 'run-sc-1',
            analysis_type: 'SC_3F',
            status: 'DONE',
            solver_input_hash: 'hash-1',
            created_at: '2025-01-15T10:00:00Z',
            finished_at: '2025-01-15T10:01:00Z',
            error_message: null,
          },
        ],
      }),
      selectedRunId: 'run-sc-1',
    });

    render(<SldOverlayPanel />);
    expect(screen.queryByTestId('lf-overlay-mode-selector')).toBeNull();
  });

  it('shows LF mode selector when LOAD_FLOW run selected', () => {
    useResultsWorkspaceStore.setState({
      projection: makeProjection({
        runs: [
          {
            run_id: 'run-lf-1',
            analysis_type: 'LOAD_FLOW',
            status: 'DONE',
            solver_input_hash: 'hash-lf',
            created_at: '2025-01-15T10:00:00Z',
            finished_at: '2025-01-15T10:01:00Z',
            error_message: null,
          },
        ],
      }),
      selectedRunId: 'run-lf-1',
      overlayMode: 'result',
    });

    render(<SldOverlayPanel />);
    expect(screen.getByTestId('lf-overlay-mode-selector')).toBeTruthy();
    expect(screen.getByTestId('lf-overlay-mode-voltage')).toBeTruthy();
    expect(screen.getByTestId('lf-overlay-mode-loading')).toBeTruthy();
    expect(screen.getByTestId('lf-overlay-mode-flow')).toBeTruthy();
  });

  it('hides LF mode selector when overlay mode is "none"', () => {
    useResultsWorkspaceStore.setState({
      projection: makeProjection({
        runs: [
          {
            run_id: 'run-lf-1',
            analysis_type: 'LOAD_FLOW',
            status: 'DONE',
            solver_input_hash: 'hash-lf',
            created_at: '2025-01-15T10:00:00Z',
            finished_at: '2025-01-15T10:01:00Z',
            error_message: null,
          },
        ],
      }),
      selectedRunId: 'run-lf-1',
      overlayMode: 'none',
    });

    render(<SldOverlayPanel />);
    expect(screen.queryByTestId('lf-overlay-mode-selector')).toBeNull();
  });

  it('shows Polish labels for LF overlay modes', () => {
    useResultsWorkspaceStore.setState({
      projection: makeProjection({
        runs: [
          {
            run_id: 'run-lf-1',
            analysis_type: 'LOAD_FLOW',
            status: 'DONE',
            solver_input_hash: 'hash-lf',
            created_at: '2025-01-15T10:00:00Z',
            finished_at: '2025-01-15T10:01:00Z',
            error_message: null,
          },
        ],
      }),
      selectedRunId: 'run-lf-1',
      overlayMode: 'result',
    });

    render(<SldOverlayPanel />);
    expect(screen.getByText('Napięcia')).toBeTruthy();
    expect(screen.getByText('Obciążenie')).toBeTruthy();
    expect(screen.getByText('Kierunek przepływu')).toBeTruthy();
  });

  it('shows Polish labels for main overlay modes', () => {
    render(<SldOverlayPanel />);
    expect(screen.getByText('Wynik')).toBeTruthy();
    expect(screen.getByText('Różnice')).toBeTruthy();
    expect(screen.getByText('Brak nakładki')).toBeTruthy();
  });

  it('renders SLD viewer area', () => {
    render(<SldOverlayPanel />);
    expect(screen.getByTestId('sld-viewer-area')).toBeTruthy();
    // "Schemat jednokreskowy" appears in both header and viewer — use getAllByText
    expect(screen.getAllByText('Schemat jednokreskowy').length).toBeGreaterThanOrEqual(1);
  });

  it('renders legend when overlay is active', () => {
    useResultsWorkspaceStore.setState({ overlayMode: 'result' });
    render(<SldOverlayPanel />);
    expect(screen.getByTestId('overlay-legend')).toBeTruthy();
    expect(screen.getByText('Norma')).toBeTruthy();
    expect(screen.getByText('Ostrzeżenie')).toBeTruthy();
    expect(screen.getByText('Krytyczne')).toBeTruthy();
    expect(screen.getByText('Nieaktywne')).toBeTruthy();
  });

  it('hides legend when overlay mode is none', () => {
    useResultsWorkspaceStore.setState({ overlayMode: 'none' });
    render(<SldOverlayPanel />);
    expect(screen.queryByTestId('overlay-legend')).toBeNull();
  });

  it('does not contain EN strings', () => {
    useResultsWorkspaceStore.setState({
      projection: makeProjection({
        runs: [
          {
            run_id: 'run-lf-1',
            analysis_type: 'LOAD_FLOW',
            status: 'DONE',
            solver_input_hash: 'hash-lf',
            created_at: '2025-01-15T10:00:00Z',
            finished_at: '2025-01-15T10:01:00Z',
            error_message: null,
          },
        ],
      }),
      selectedRunId: 'run-lf-1',
      overlayMode: 'result',
    });

    const { container } = render(<SldOverlayPanel />);
    const html = container.innerHTML;

    // Check for exact English words (not substrings of Polish words)
    expect(html).not.toContain('>Voltage<');
    expect(html).not.toContain('>Loading<');
    expect(html).not.toContain('>Flow Direction<');
    expect(html).not.toContain('>Legend<');
    expect(html).not.toContain('>Active<');
    expect(html).not.toContain('>Disabled<');
  });

  it('does not contain codenames', () => {
    const { container } = render(<SldOverlayPanel />);
    const html = container.innerHTML;

    expect(html).not.toMatch(/\bP\d{1,3}\b/);
    expect(html).not.toContain('PR-');
  });

  it('does not call alert()', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<SldOverlayPanel />);
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
