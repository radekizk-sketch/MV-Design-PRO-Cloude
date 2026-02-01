/**
 * Test: TraceViewer components
 *
 * Tests for the "Ślad obliczeń" (Calculation Trace) viewer.
 * Verifies 3-panel layout, step navigation, search, Polish UI,
 * deep linking, selection mapping, and export functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TraceViewer, TraceViewerContainer } from '../TraceViewer';
import type { SelectionToTraceMap } from '../TraceViewer';
import { TraceToc } from '../TraceToc';
import { TraceStepView, TraceStepViewEmpty } from '../TraceStepView';
import { generateTraceJsonl, generateJsonlFilename } from '../export/exportTraceJsonl';
import { generateTracePdfHtml, generatePdfFilename } from '../export/exportTracePdf';
import type { ExtendedTrace, TraceStep } from '../../results-inspector/types';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockTraceStep: TraceStep = {
  step: 1,
  key: 'calc_z',
  title: 'Obliczenie impedancji Thevenina',
  phase: 'CALCULATION',
  formula_latex: 'Z_{th} = \\sqrt{R^2 + X^2}',
  inputs: {
    r_ohm: { value: 0.5, unit: 'Ω', label: 'Rezystancja' },
    x_ohm: { value: 2.5, unit: 'Ω', label: 'Reaktancja' },
  },
  substitution: 'Z_{th} = √(0.5² + 2.5²)',
  result: {
    z_thevenin_ohm: { value: 2.55, unit: 'Ω', label: 'Impedancja Thevenina' },
  },
  notes: 'Impedancja wyznaczona metodą składowych symetrycznych',
};

const mockExtendedTrace: ExtendedTrace = {
  run_id: 'test-run-001',
  snapshot_id: 'test-snapshot-001',
  input_hash: 'abc123def456789012345678901234567890',
  white_box_trace: [
    mockTraceStep,
    {
      step: 2,
      key: 'calc_ikss',
      title: 'Obliczenie prądu zwarciowego Ik"',
      phase: 'CALCULATION',
      formula_latex: "I_k'' = c \\cdot U_n / (\\sqrt{3} \\cdot Z_{th})",
      inputs: {
        c_un_kv: { value: 121, unit: 'kV', label: 'Napięcie źródłowe' },
        z_thevenin_ohm: { value: 2.55, unit: 'Ω', label: 'Impedancja Thevenina' },
      },
      result: {
        ikss_ka: { value: 27.38, unit: 'kA', label: 'Prąd zwarciowy początkowy' },
      },
    },
    {
      step: 3,
      key: 'calc_ip',
      title: 'Obliczenie prądu udarowego ip',
      phase: 'OUTPUT',
    },
  ],
};

// =============================================================================
// TraceViewer Tests
// =============================================================================

describe('TraceViewer', () => {
  it('renders 3-panel layout with correct structure', () => {
    render(<TraceViewer trace={mockExtendedTrace} />);

    // Check main container
    expect(screen.getByTestId('trace-viewer')).toBeInTheDocument();

    // Check TOC panel
    expect(screen.getByTestId('trace-toc')).toBeInTheDocument();

    // Check metadata panel
    expect(screen.getByTestId('trace-metadata-panel')).toBeInTheDocument();

    // Check empty state initially (no step selected)
    expect(screen.getByTestId('trace-step-view-empty')).toBeInTheDocument();
  });

  it('displays Polish header "Ślad obliczeń"', () => {
    render(<TraceViewer trace={mockExtendedTrace} />);

    expect(screen.getByText('Ślad obliczeń')).toBeInTheDocument();
  });

  it('shows step count in Polish', () => {
    render(<TraceViewer trace={mockExtendedTrace} />);

    // With no filters/search, shows "X z Y kroków" pattern
    // Use regex since the text may be split across nodes
    const stepCountElements = screen.getAllByText(/3.*z.*3.*krok/);
    expect(stepCountElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders search input with Polish placeholder', () => {
    render(<TraceViewer trace={mockExtendedTrace} />);

    const searchInput = screen.getByTestId('trace-search-input');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Szukaj w śladzie obliczeń...');
  });

  it('shows "Tylko do odczytu" badge', () => {
    render(<TraceViewer trace={mockExtendedTrace} />);

    expect(screen.getByText('Tylko do odczytu')).toBeInTheDocument();
  });
});

// =============================================================================
// TraceViewerContainer Tests
// =============================================================================

describe('TraceViewerContainer', () => {
  it('shows loading state when isLoading is true', () => {
    render(<TraceViewerContainer trace={null} isLoading={true} />);

    expect(screen.getByTestId('trace-loading')).toBeInTheDocument();
    expect(screen.getByText('Ładowanie śladu obliczeń...')).toBeInTheDocument();
  });

  it('shows empty state when trace is null', () => {
    render(<TraceViewerContainer trace={null} isLoading={false} />);

    expect(screen.getByTestId('trace-empty')).toBeInTheDocument();
    expect(screen.getByText('Brak śladu obliczeń')).toBeInTheDocument();
  });

  it('shows empty state when trace has no steps', () => {
    const emptyTrace: ExtendedTrace = {
      run_id: 'test-run-001',
      snapshot_id: 'test-snapshot-001',
      input_hash: 'abc123',
      white_box_trace: [],
    };

    render(<TraceViewerContainer trace={emptyTrace} isLoading={false} />);

    expect(screen.getByTestId('trace-empty')).toBeInTheDocument();
  });

  it('renders TraceViewer when trace is available', () => {
    render(<TraceViewerContainer trace={mockExtendedTrace} isLoading={false} />);

    expect(screen.getByTestId('trace-viewer')).toBeInTheDocument();
  });
});

// =============================================================================
// TraceToc Tests
// =============================================================================

describe('TraceToc', () => {
  const defaultProps = {
    steps: mockExtendedTrace.white_box_trace,
    selectedStepIndex: null,
    onSelectStep: () => {},
    searchQuery: '',
    filters: { phase: null, onlyProblems: false },
    searchResults: [],
    activeResultIndex: 0,
  };

  it('renders all steps in TOC', () => {
    render(<TraceToc {...defaultProps} />);

    expect(screen.getByText('Obliczenie impedancji Thevenina')).toBeInTheDocument();
    expect(screen.getByText('Obliczenie prądu zwarciowego Ik"')).toBeInTheDocument();
    expect(screen.getByText('Obliczenie prądu udarowego ip')).toBeInTheDocument();
  });

  it('shows step count in Polish', () => {
    render(<TraceToc {...defaultProps} />);

    expect(screen.getByText('3 z 3 kroków')).toBeInTheDocument();
  });

  it('highlights selected step', () => {
    render(<TraceToc {...defaultProps} selectedStepIndex={0} />);

    const selectedButton = screen.getByTestId('trace-step-0');
    expect(selectedButton).toHaveAttribute('aria-current', 'true');
  });

  it('calls onSelectStep when step is clicked', () => {
    const onSelectStep = vi.fn();
    render(<TraceToc {...defaultProps} onSelectStep={onSelectStep} />);

    fireEvent.click(screen.getByTestId('trace-step-1'));

    expect(onSelectStep).toHaveBeenCalledWith(1);
  });

  it('filters steps by search query', () => {
    render(<TraceToc {...defaultProps} searchQuery="impedancji" />);

    expect(screen.getByText('Obliczenie impedancji Thevenina')).toBeInTheDocument();
    expect(screen.queryByText('Obliczenie prądu zwarciowego Ik"')).not.toBeInTheDocument();
  });
});

// =============================================================================
// TraceStepView Tests
// =============================================================================

describe('TraceStepView', () => {
  it('renders step title and number', () => {
    render(<TraceStepView step={mockTraceStep} stepIndex={0} />);

    expect(screen.getByText('Obliczenie impedancji Thevenina')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Step number
  });

  it('renders formula section', () => {
    render(<TraceStepView step={mockTraceStep} stepIndex={0} />);

    expect(screen.getByText('Wzór')).toBeInTheDocument();
    // Formula is now rendered by KaTeX, so check for data-testid instead of raw text
    const formulaBlock = screen.getByTestId('formula-block-wzór');
    expect(formulaBlock).toBeInTheDocument();
  });

  it('renders inputs table with Polish labels', () => {
    render(<TraceStepView step={mockTraceStep} stepIndex={0} />);

    expect(screen.getByText('Dane wejściowe')).toBeInTheDocument();
    expect(screen.getByText('Rezystancja')).toBeInTheDocument();
    expect(screen.getByText('Reaktancja')).toBeInTheDocument();
  });

  it('renders result table', () => {
    render(<TraceStepView step={mockTraceStep} stepIndex={0} />);

    expect(screen.getByText('Wynik')).toBeInTheDocument();
    expect(screen.getByText('Impedancja Thevenina')).toBeInTheDocument();
  });

  it('renders notes section', () => {
    render(<TraceStepView step={mockTraceStep} stepIndex={0} />);

    expect(screen.getByText('Uwagi')).toBeInTheDocument();
    expect(screen.getByText(/składowych symetrycznych/)).toBeInTheDocument();
  });

  it('renders phase badge', () => {
    render(<TraceStepView step={mockTraceStep} stepIndex={0} />);

    expect(screen.getByText('CALCULATION')).toBeInTheDocument();
  });
});

describe('TraceStepViewEmpty', () => {
  it('renders empty state with Polish message', () => {
    render(<TraceStepViewEmpty />);

    expect(screen.getByTestId('trace-step-view-empty')).toBeInTheDocument();
    expect(screen.getByText('Wybierz krok z listy')).toBeInTheDocument();
  });
});

// =============================================================================
// Export Buttons Tests
// =============================================================================

describe('TraceViewer Export Buttons', () => {
  it('renders export JSONL button with correct data-testid', () => {
    render(<TraceViewer trace={mockExtendedTrace} />);

    const jsonlButton = screen.getByTestId('trace-export-jsonl');
    expect(jsonlButton).toBeInTheDocument();
    expect(jsonlButton).toHaveTextContent('JSONL');
  });

  it('renders export PDF button with correct data-testid', () => {
    render(<TraceViewer trace={mockExtendedTrace} />);

    const pdfButton = screen.getByTestId('trace-export-pdf');
    expect(pdfButton).toBeInTheDocument();
    expect(pdfButton).toHaveTextContent('PDF');
  });

  it('shows deep link button when step is selected', () => {
    render(<TraceViewer trace={mockExtendedTrace} />);

    // Initially no deep link button (no step selected)
    expect(screen.queryByTestId('trace-deeplink')).not.toBeInTheDocument();

    // Select a step
    fireEvent.click(screen.getByTestId('trace-step-0'));

    // Now deep link button should appear
    expect(screen.getByTestId('trace-deeplink')).toBeInTheDocument();
  });
});

// =============================================================================
// Export JSONL Tests
// =============================================================================

describe('Export JSONL', () => {
  it('generates valid JSONL content', () => {
    const jsonl = generateTraceJsonl(mockExtendedTrace);
    const lines = jsonl.split('\n');

    // Should have header + 3 steps = 4 lines
    expect(lines).toHaveLength(4);

    // Each line should be valid JSON
    lines.forEach((line) => {
      expect(() => JSON.parse(line)).not.toThrow();
    });

    // First line should be header
    const header = JSON.parse(lines[0]);
    expect(header.type).toBe('header');
    expect(header.data.run_id).toBe('test-run-001');
    expect(header.data.total_steps).toBe(3);
  });

  it('generates deterministic filename', () => {
    const filename = generateJsonlFilename(mockExtendedTrace);

    expect(filename).toMatch(/^slad_obliczen_test-run.*\.jsonl$/);
  });
});

// =============================================================================
// Export PDF Tests
// =============================================================================

describe('Export PDF', () => {
  it('generates valid HTML content', () => {
    const html = generateTracePdfHtml(mockExtendedTrace);

    // Should contain Polish labels
    expect(html).toContain('Ślad obliczeń');
    expect(html).toContain('ID wykonania');
    expect(html).toContain('Krok');
    expect(html).toContain('Wzór');
    expect(html).toContain('Wynik');

    // Should contain trace data
    expect(html).toContain('test-run-001');
    expect(html).toContain('Obliczenie impedancji Thevenina');
  });

  it('generates deterministic filename', () => {
    const filename = generatePdfFilename(mockExtendedTrace);

    expect(filename).toMatch(/^slad_obliczen_test-run.*\.pdf$/);
  });

  it('does not contain codenames in PDF output', () => {
    const html = generateTracePdfHtml(mockExtendedTrace);

    expect(html).not.toContain('P11'); // no-codenames-ignore
    expect(html).not.toContain('P14'); // no-codenames-ignore
    expect(html).not.toContain('P17'); // no-codenames-ignore
    expect(html).not.toContain('Proof Engine');
  });
});

// =============================================================================
// Selection → Trace Navigation Tests
// =============================================================================

describe('Selection → Trace Navigation', () => {
  it('navigates to mapped step when selectionId matches', () => {
    const selectionToTraceMap: SelectionToTraceMap = new Map([
      ['bus_123', 1], // Maps to second step
    ]);

    render(
      <TraceViewer
        trace={mockExtendedTrace}
        selectionId="bus_123"
        selectionToTraceMap={selectionToTraceMap}
      />
    );

    // Should show the mapped step view
    const stepView = screen.getByTestId('trace-step-view-1');
    expect(stepView).toBeInTheDocument();
  });

  it('does not break when selectionId has no mapping', () => {
    const selectionToTraceMap: SelectionToTraceMap = new Map([
      ['bus_123', 1],
    ]);

    // Should render without errors when selectionId has no mapping
    expect(() => {
      render(
        <TraceViewer
          trace={mockExtendedTrace}
          selectionId="unknown_id"
          selectionToTraceMap={selectionToTraceMap}
        />
      );
    }).not.toThrow();

    // Should show empty state (no step selected)
    expect(screen.getByTestId('trace-step-view-empty')).toBeInTheDocument();
  });

  it('does not break when selectionToTraceMap is undefined', () => {
    expect(() => {
      render(
        <TraceViewer
          trace={mockExtendedTrace}
          selectionId="bus_123"
          selectionToTraceMap={undefined}
        />
      );
    }).not.toThrow();
  });
});

// =============================================================================
// Codenames Check (No P11/P14/P17 in rendered output)
// =============================================================================

describe('No Codenames in Rendered UI', () => {
  it('does not render codenames in UI', () => { // no-codenames-ignore
    render(<TraceViewer trace={mockExtendedTrace} />);

    // Get all text content
    const textContent = document.body.textContent || '';

    // Check that codenames are not present (except in comments which aren't rendered)
    expect(textContent).not.toContain('P11'); // no-codenames-ignore
    expect(textContent).not.toContain('P14'); // no-codenames-ignore
    expect(textContent).not.toContain('P17'); // no-codenames-ignore
    expect(textContent).not.toContain('Proof Engine');
  });
});
