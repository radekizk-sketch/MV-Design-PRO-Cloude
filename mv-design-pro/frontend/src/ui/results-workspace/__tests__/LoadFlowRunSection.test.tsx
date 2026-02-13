/**
 * Load Flow Run Section Tests
 *
 * INVARIANTS VERIFIED:
 * - Panel renders all 4 sections (Status, Napięcia, Przepływy, Straty)
 * - Deterministic table sort (lex bus_id / branch_id)
 * - No EN strings in rendered output
 * - No alert() calls
 * - No codenames (P11, P14, etc.)
 * - No physics calculations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { LoadFlowRunSection } from '../LoadFlowRunSection';
import { usePowerFlowResultsStore } from '../../power-flow-results/store';
import type { PowerFlowResultV1 } from '../../power-flow-results/types';

// =============================================================================
// Mock API to prevent real network calls
// =============================================================================

vi.mock('../../power-flow-results/api', () => ({
  fetchPowerFlowRunHeader: vi.fn().mockResolvedValue({
    id: 'run-lf-1',
    project_id: 'proj-1',
    operating_case_id: 'case-1',
    status: 'DONE',
    result_status: 'FRESH',
    created_at: '2025-01-15T10:00:00+00:00',
    finished_at: '2025-01-15T10:01:00+00:00',
    input_hash: 'hash-abc',
    converged: true,
    iterations: 5,
  }),
  fetchPowerFlowResults: vi.fn().mockResolvedValue(null),
  fetchPowerFlowTrace: vi.fn().mockResolvedValue(null),
  fetchPowerFlowInterpretation: vi.fn().mockResolvedValue(null),
}));

// =============================================================================
// Test Data
// =============================================================================

function makeResults(overrides: Partial<PowerFlowResultV1> = {}): PowerFlowResultV1 {
  return {
    result_version: '1.0',
    converged: true,
    iterations_count: 5,
    tolerance_used: 1e-6,
    base_mva: 100.0,
    slack_bus_id: 'bus-slack',
    bus_results: [
      {
        bus_id: 'bus-c',
        v_pu: 0.9800,
        angle_deg: -2.50,
        p_injected_mw: 10.000,
        q_injected_mvar: 5.000,
      },
      {
        bus_id: 'bus-a',
        v_pu: 1.0000,
        angle_deg: 0.00,
        p_injected_mw: -15.000,
        q_injected_mvar: -8.000,
      },
      {
        bus_id: 'bus-b',
        v_pu: 0.9950,
        angle_deg: -1.20,
        p_injected_mw: 5.000,
        q_injected_mvar: 3.000,
      },
    ],
    branch_results: [
      {
        branch_id: 'branch-b',
        p_from_mw: 7.500,
        q_from_mvar: 3.200,
        p_to_mw: -7.400,
        q_to_mvar: -3.100,
        losses_p_mw: 0.1000,
        losses_q_mvar: 0.1000,
      },
      {
        branch_id: 'branch-a',
        p_from_mw: 15.000,
        q_from_mvar: 8.000,
        p_to_mw: -14.800,
        q_to_mvar: -7.800,
        losses_p_mw: 0.2000,
        losses_q_mvar: 0.2000,
      },
    ],
    summary: {
      total_losses_p_mw: 0.3000,
      total_losses_q_mvar: 0.3000,
      min_v_pu: 0.9800,
      max_v_pu: 1.0000,
      slack_p_mw: -15.000,
      slack_q_mvar: -8.000,
    },
    ...overrides,
  };
}

// =============================================================================
// Setup
// =============================================================================

// No-op actions to prevent useEffect from resetting state
const noopSelectRun = vi.fn(async () => {});
const noopLoadResults = vi.fn(async () => {});
const noopLoadInterpretation = vi.fn(async () => {});

beforeEach(() => {
  usePowerFlowResultsStore.setState({
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
    // Override actions to prevent useEffect from clearing test state
    selectRun: noopSelectRun,
    loadResults: noopLoadResults,
    loadInterpretation: noopLoadInterpretation,
  });
  noopSelectRun.mockClear();
  noopLoadResults.mockClear();
  noopLoadInterpretation.mockClear();
});

// =============================================================================
// Tests
// =============================================================================

describe('LoadFlowRunSection', () => {
  it('renders null when no results loaded', () => {
    const { container } = render(<LoadFlowRunSection runId="run-lf-1" />);
    expect(container.querySelector('[data-testid="load-flow-run-section"]')).toBeNull();
  });

  it('renders loading state', () => {
    usePowerFlowResultsStore.setState({ isLoadingResults: true });
    render(<LoadFlowRunSection runId="run-lf-1" />);
    expect(screen.getByText(/Ładowanie wyników rozpływu mocy/)).toBeTruthy();
  });

  it('renders all 4 sections when results are loaded', () => {
    usePowerFlowResultsStore.setState({ results: makeResults() });
    render(<LoadFlowRunSection runId="run-lf-1" />);

    expect(screen.getByTestId('lf-convergence-section')).toBeTruthy();
    expect(screen.getByTestId('lf-bus-voltages-table')).toBeTruthy();
    expect(screen.getByTestId('lf-branch-flows-table')).toBeTruthy();
    expect(screen.getByTestId('lf-losses-section')).toBeTruthy();
  });

  it('renders convergence status correctly', () => {
    usePowerFlowResultsStore.setState({ results: makeResults() });
    render(<LoadFlowRunSection runId="run-lf-1" />);

    expect(screen.getByText('Zbieżny')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('renders "Niezbieżny" for non-converged results', () => {
    usePowerFlowResultsStore.setState({
      results: makeResults({ converged: false }),
    });
    render(<LoadFlowRunSection runId="run-lf-1" />);

    expect(screen.getByText('Niezbieżny')).toBeTruthy();
  });

  it('sorts bus table by bus_id lexicographically', () => {
    usePowerFlowResultsStore.setState({ results: makeResults() });
    render(<LoadFlowRunSection runId="run-lf-1" />);

    const busTable = screen.getByTestId('lf-bus-voltages-table');
    const rows = within(busTable).getAllByRole('row');
    // Row 0 is header, rows 1-3 are data
    const busIds = rows.slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent);
    expect(busIds).toEqual(['bus-a', 'bus-b', 'bus-c']);
  });

  it('sorts branch table by branch_id lexicographically', () => {
    usePowerFlowResultsStore.setState({ results: makeResults() });
    render(<LoadFlowRunSection runId="run-lf-1" />);

    const branchTable = screen.getByTestId('lf-branch-flows-table');
    const rows = within(branchTable).getAllByRole('row');
    const branchIds = rows.slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent);
    expect(branchIds).toEqual(['branch-a', 'branch-b']);
  });

  it('displays losses summary correctly', () => {
    usePowerFlowResultsStore.setState({ results: makeResults() });
    render(<LoadFlowRunSection runId="run-lf-1" />);

    const lossesSection = screen.getByTestId('lf-losses-section');
    expect(within(lossesSection).getByText('Straty P')).toBeTruthy();
    expect(within(lossesSection).getByText('Straty Q')).toBeTruthy();
    // 0.3000 appears for both P and Q losses
    expect(within(lossesSection).getAllByText('0.3000').length).toBe(2);
  });

  it('does not contain EN strings', () => {
    usePowerFlowResultsStore.setState({ results: makeResults() });
    const { container } = render(<LoadFlowRunSection runId="run-lf-1" />);
    const html = container.innerHTML;

    // Common EN patterns that should NOT appear
    expect(html).not.toContain('Loading');
    expect(html).not.toContain('Convergence');
    expect(html).not.toContain('Bus Voltages');
    expect(html).not.toContain('Branch Flows');
    expect(html).not.toContain('Losses');
    expect(html).not.toContain('Summary');
  });

  it('does not contain codenames', () => {
    usePowerFlowResultsStore.setState({ results: makeResults() });
    const { container } = render(<LoadFlowRunSection runId="run-lf-1" />);
    const html = container.innerHTML;

    expect(html).not.toContain('P11');
    expect(html).not.toContain('P14');
    expect(html).not.toContain('P17');
    expect(html).not.toContain('P20');
    expect(html).not.toContain('P22');
    expect(html).not.toContain('PR-');
  });

  it('does not use alert()', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    usePowerFlowResultsStore.setState({ results: makeResults() });
    render(<LoadFlowRunSection runId="run-lf-1" />);

    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('renders empty when bus_results is empty', () => {
    usePowerFlowResultsStore.setState({
      results: makeResults({ bus_results: [] }),
    });
    render(<LoadFlowRunSection runId="run-lf-1" />);

    expect(screen.queryByTestId('lf-bus-voltages-table')).toBeNull();
  });

  it('renders empty when branch_results is empty', () => {
    usePowerFlowResultsStore.setState({
      results: makeResults({ branch_results: [] }),
    });
    render(<LoadFlowRunSection runId="run-lf-1" />);

    expect(screen.queryByTestId('lf-branch-flows-table')).toBeNull();
  });
});
