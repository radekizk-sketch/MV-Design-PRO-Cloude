/**
 * Protection Diagnostics Panel — Unit Tests
 *
 * CANONICAL ALIGNMENT:
 * - Deterministyczne sortowanie: element_id, severity (ERROR>WARN>INFO), code
 * - TestIDs zgodne ze specyfikacją:
 *   - protection-diagnostics-panel
 *   - protection-diagnostics-row-<element_id>-<code>
 *   - protection-diagnostics-severity-<ERROR|WARN|INFO>
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtectionDiagnosticsPanel } from '../ProtectionDiagnosticsPanel';
import type { ProtectionSanityCheckResult } from '../types';
import { sortDiagnosticsResults, computeDiagnosticsStats } from '../types';

// =============================================================================
// Test Fixtures
// =============================================================================

const FIXTURE_RESULTS: ProtectionSanityCheckResult[] = [
  {
    severity: 'WARN',
    code: 'OC_OVERLAP',
    message_pl: 'Nakładanie się progów I> i I>> (I> >= I>>)',
    element_id: 'LINE_001',
    element_type: 'LineBranch',
    function_ansi: '50/51',
  },
  {
    severity: 'ERROR',
    code: 'VOLT_MISSING_UN',
    message_pl: 'Brak wartości Un dla nastawy napięciowej',
    element_id: 'BUS_001',
    element_type: 'Bus',
    function_ansi: '27',
  },
  {
    severity: 'INFO',
    code: 'GEN_PARTIAL_ANALYSIS',
    message_pl: 'Brak danych bazowych — analiza częściowa',
    element_id: 'LINE_001',
    element_type: 'LineBranch',
    function_ansi: null,
  },
  {
    severity: 'ERROR',
    code: 'OC_MISSING_IN',
    message_pl: 'Brak wartości In dla nastawy prądowej',
    element_id: 'LINE_001',
    element_type: 'LineBranch',
    function_ansi: '50',
  },
];

// =============================================================================
// Deterministic Sort Tests
// =============================================================================

describe('sortDiagnosticsResults', () => {
  it('sorts by element_id ASC, then severity DESC (ERROR>WARN>INFO), then code ASC', () => {
    const sorted = sortDiagnosticsResults(FIXTURE_RESULTS);

    // Expected order:
    // 1. BUS_001 - ERROR - VOLT_MISSING_UN
    // 2. LINE_001 - ERROR - OC_MISSING_IN
    // 3. LINE_001 - WARN - OC_OVERLAP
    // 4. LINE_001 - INFO - GEN_PARTIAL_ANALYSIS

    expect(sorted).toHaveLength(4);
    expect(sorted[0]).toMatchObject({
      element_id: 'BUS_001',
      severity: 'ERROR',
      code: 'VOLT_MISSING_UN',
    });
    expect(sorted[1]).toMatchObject({
      element_id: 'LINE_001',
      severity: 'ERROR',
      code: 'OC_MISSING_IN',
    });
    expect(sorted[2]).toMatchObject({
      element_id: 'LINE_001',
      severity: 'WARN',
      code: 'OC_OVERLAP',
    });
    expect(sorted[3]).toMatchObject({
      element_id: 'LINE_001',
      severity: 'INFO',
      code: 'GEN_PARTIAL_ANALYSIS',
    });
  });

  it('is deterministic (same input always produces same output)', () => {
    const sorted1 = sortDiagnosticsResults(FIXTURE_RESULTS);
    const sorted2 = sortDiagnosticsResults(FIXTURE_RESULTS);

    expect(sorted1).toEqual(sorted2);
  });

  it('handles empty array', () => {
    const sorted = sortDiagnosticsResults([]);
    expect(sorted).toEqual([]);
  });
});

// =============================================================================
// Stats Computation Tests
// =============================================================================

describe('computeDiagnosticsStats', () => {
  it('computes correct statistics', () => {
    const stats = computeDiagnosticsStats(FIXTURE_RESULTS);

    expect(stats).toEqual({
      total: 4,
      byError: 2,
      byWarn: 1,
      byInfo: 1,
    });
  });

  it('handles empty array', () => {
    const stats = computeDiagnosticsStats([]);

    expect(stats).toEqual({
      total: 0,
      byError: 0,
      byWarn: 0,
      byInfo: 0,
    });
  });
});

// =============================================================================
// Panel Rendering Tests
// =============================================================================

describe('ProtectionDiagnosticsPanel', () => {
  it('renders panel with correct testid', () => {
    render(<ProtectionDiagnosticsPanel results={FIXTURE_RESULTS} />);

    expect(screen.getByTestId('protection-diagnostics-panel')).toBeInTheDocument();
  });

  it('renders all rows with correct testids', () => {
    render(<ProtectionDiagnosticsPanel results={FIXTURE_RESULTS} />);

    // Check for specific row testids
    expect(screen.getByTestId('protection-diagnostics-row-BUS_001-VOLT_MISSING_UN')).toBeInTheDocument();
    expect(screen.getByTestId('protection-diagnostics-row-LINE_001-OC_MISSING_IN')).toBeInTheDocument();
    expect(screen.getByTestId('protection-diagnostics-row-LINE_001-OC_OVERLAP')).toBeInTheDocument();
    expect(screen.getByTestId('protection-diagnostics-row-LINE_001-GEN_PARTIAL_ANALYSIS')).toBeInTheDocument();
  });

  it('renders severity badges with correct testids', () => {
    render(<ProtectionDiagnosticsPanel results={FIXTURE_RESULTS} />);

    // Check for severity badge testids
    expect(screen.getAllByTestId('protection-diagnostics-severity-ERROR')).toHaveLength(2);
    expect(screen.getAllByTestId('protection-diagnostics-severity-WARN')).toHaveLength(1);
    expect(screen.getAllByTestId('protection-diagnostics-severity-INFO')).toHaveLength(1);
  });

  it('displays Polish labels', () => {
    render(<ProtectionDiagnosticsPanel results={FIXTURE_RESULTS} />);

    // Check for Polish text
    expect(screen.getByText('Diagnostyka zabezpieczeń')).toBeInTheDocument();
    expect(screen.getByText('Błąd')).toBeInTheDocument();
    expect(screen.getByText('Ostrzeżenie')).toBeInTheDocument();
    expect(screen.getByText('Informacja')).toBeInTheDocument();
  });

  it('displays messages in Polish', () => {
    render(<ProtectionDiagnosticsPanel results={FIXTURE_RESULTS} />);

    expect(screen.getByText('Brak wartości Un dla nastawy napięciowej')).toBeInTheDocument();
    expect(screen.getByText('Nakładanie się progów I> i I>> (I> >= I>>)')).toBeInTheDocument();
  });

  it('displays ANSI codes when present', () => {
    render(<ProtectionDiagnosticsPanel results={FIXTURE_RESULTS} />);

    expect(screen.getByText('27')).toBeInTheDocument();
    expect(screen.getByText('50/51')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('displays empty state when no results', () => {
    render(<ProtectionDiagnosticsPanel results={[]} />);

    expect(screen.getByText('Brak wyników diagnostyki — konfiguracja poprawna')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<ProtectionDiagnosticsPanel results={[]} isLoading />);

    expect(screen.getByText('Ładowanie diagnostyki...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    render(<ProtectionDiagnosticsPanel results={[]} error="Test error message" />);

    expect(screen.getByText('Błąd: Test error message')).toBeInTheDocument();
  });

  it('renders rows in deterministic order', () => {
    const { container } = render(<ProtectionDiagnosticsPanel results={FIXTURE_RESULTS} />);

    const rows = container.querySelectorAll('[data-testid^="protection-diagnostics-row-"]');
    const testIds = Array.from(rows).map((row) => row.getAttribute('data-testid'));

    // Verify deterministic order
    expect(testIds).toEqual([
      'protection-diagnostics-row-BUS_001-VOLT_MISSING_UN',
      'protection-diagnostics-row-LINE_001-OC_MISSING_IN',
      'protection-diagnostics-row-LINE_001-OC_OVERLAP',
      'protection-diagnostics-row-LINE_001-GEN_PARTIAL_ANALYSIS',
    ]);
  });
});

// =============================================================================
// Filter Tests
// =============================================================================

describe('ProtectionDiagnosticsPanel filters', () => {
  it('filters by severity when activeSeverities is provided', () => {
    render(
      <ProtectionDiagnosticsPanel
        results={FIXTURE_RESULTS}
        activeSeverities={['ERROR']}
      />
    );

    // Should only show ERROR rows
    expect(screen.getByTestId('protection-diagnostics-row-BUS_001-VOLT_MISSING_UN')).toBeInTheDocument();
    expect(screen.getByTestId('protection-diagnostics-row-LINE_001-OC_MISSING_IN')).toBeInTheDocument();

    // Should not show WARN/INFO rows
    expect(screen.queryByTestId('protection-diagnostics-row-LINE_001-OC_OVERLAP')).not.toBeInTheDocument();
    expect(screen.queryByTestId('protection-diagnostics-row-LINE_001-GEN_PARTIAL_ANALYSIS')).not.toBeInTheDocument();
  });

  it('shows all results when activeSeverities is empty', () => {
    render(
      <ProtectionDiagnosticsPanel
        results={FIXTURE_RESULTS}
        activeSeverities={[]}
      />
    );

    // Should show all 4 rows
    const rows = screen.getAllByTestId(/^protection-diagnostics-row-/);
    expect(rows).toHaveLength(4);
  });
});
