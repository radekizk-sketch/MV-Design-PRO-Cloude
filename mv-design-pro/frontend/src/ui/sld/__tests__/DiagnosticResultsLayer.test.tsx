/**
 * DIAGNOSTIC RESULTS LAYER TESTS — Testy warstwy diagnostycznej PR-SLD-06
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § B: Results as Overlay (never modifies model)
 * - sld_rules.md § C.2: RESULT_VIEW mode
 *
 * TEST COVERAGE:
 * - Deterministycznosc renderowania etykiet
 * - Mapowanie wynikow do elementId
 * - Brak zmiany geometrii po przelaczeniu trybu
 * - Pelna blokada edycji w trybie WYNIKI
 * - Poprawne wyswietlanie danych diagnostycznych
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiagnosticResultsLayer } from '../DiagnosticResultsLayer';
import type { NodeSymbol, BranchSymbol } from '../../sld-editor/types';
import type { ViewportState } from '../types';

// Mock stores
vi.mock('../sldModeStore', () => ({
  useSldModeStore: vi.fn((selector) => {
    const state = {
      mode: 'WYNIKI',
      diagnosticLayerVisible: true,
    };
    return selector(state);
  }),
}));

vi.mock('../../results-inspector/store', () => ({
  useResultsInspectorStore: vi.fn(() => ({
    sldOverlay: {
      run_id: 'test-run-1',
      result_status: 'FRESH',
      nodes: [
        { node_id: 'bus1', u_kv: 20.5, u_pu: 1.025 },
        { node_id: 'bus2', u_kv: 19.8, u_pu: 0.99 },
      ],
      branches: [
        { branch_id: 'line1', i_a: 150.5, loading_pct: 75.3 },
        { branch_id: 'trafo1', i_a: 250.0, loading_pct: 110.0 },
      ],
    },
    overlayVisible: true,
  })),
}));

// =============================================================================
// TEST DATA
// =============================================================================

const createBusSymbol = (id: string, elementId: string, x: number, y: number): NodeSymbol => ({
  id,
  elementId,
  elementType: 'Bus',
  elementName: `Szyna ${id}`,
  position: { x, y },
  inService: true,
  width: 80,
  height: 40,
});

const createLineBranchSymbol = (id: string, elementId: string, x: number, y: number): BranchSymbol => ({
  id,
  elementId,
  elementType: 'LineBranch',
  elementName: `Linia ${id}`,
  position: { x, y },
  inService: true,
  fromNodeId: 'bus1',
  toNodeId: 'bus2',
  points: [],
  branchType: 'LINE',
});

const createTransformerSymbol = (id: string, elementId: string, x: number, y: number): BranchSymbol => ({
  id,
  elementId,
  elementType: 'TransformerBranch',
  elementName: `Transformator ${id}`,
  position: { x, y },
  inService: true,
  fromNodeId: 'bus1',
  toNodeId: 'bus2',
  points: [],
});

const testSymbols = [
  createBusSymbol('bus-sym-1', 'bus1', 100, 100),
  createBusSymbol('bus-sym-2', 'bus2', 300, 100),
  createLineBranchSymbol('line-sym-1', 'line1', 200, 150),
  createTransformerSymbol('trafo-sym-1', 'trafo1', 200, 250),
];

const testViewport: ViewportState = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
};

// =============================================================================
// TESTY DETERMINISTYCZNOŚCI RENDEROWANIA
// =============================================================================

describe('DiagnosticResultsLayer - Determinism', () => {
  it('should render identical output for the same input', () => {
    const { container: container1 } = render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );
    const html1 = container1.innerHTML;

    const { container: container2 } = render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );
    const html2 = container2.innerHTML;

    expect(html1).toBe(html2);
  });

  it('should render labels at consistent positions', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    // Check bus labels exist at expected positions
    const busLabel1 = screen.getByTestId('sld-diag-bus-bus1');
    const busLabel2 = screen.getByTestId('sld-diag-bus-bus2');

    expect(busLabel1).toBeInTheDocument();
    expect(busLabel2).toBeInTheDocument();

    // Positions should be deterministic (check style attributes)
    expect(busLabel1.style.left).toBe('100px');
    expect(busLabel2.style.left).toBe('300px');
  });

  it('should render branch labels at center positions', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    const branchLabel = screen.getByTestId('sld-diag-branch-line1');
    expect(branchLabel).toBeInTheDocument();
    expect(branchLabel.style.left).toBe('200px');
    expect(branchLabel.style.top).toBe('150px');
  });
});

// =============================================================================
// TESTY MAPOWANIA WYNIKÓW DO ELEMENTID
// =============================================================================

describe('DiagnosticResultsLayer - Result Mapping', () => {
  it('should correctly map node results to bus symbols by elementId', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    // bus1 should show voltage 20.5 kV
    const busLabel1 = screen.getByTestId('sld-diag-bus-bus1');
    expect(busLabel1.textContent).toContain('20.50 kV');

    // bus2 should show voltage 19.8 kV
    const busLabel2 = screen.getByTestId('sld-diag-bus-bus2');
    expect(busLabel2.textContent).toContain('19.80 kV');
  });

  it('should correctly map branch results to branch symbols by elementId', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    // line1 should show current 150.5 A and loading 75.3%
    const lineLabel = screen.getByTestId('sld-diag-branch-line1');
    expect(lineLabel.textContent).toContain('150.5 A');
    expect(lineLabel.textContent).toContain('75.3 %');

    // trafo1 should show current 250.0 A and loading 110.0%
    const trafoLabel = screen.getByTestId('sld-diag-branch-trafo1');
    expect(trafoLabel.textContent).toContain('250.0 A');
    expect(trafoLabel.textContent).toContain('110.0 %');
  });

  it('should not render labels for elements without results', () => {
    render(
      <DiagnosticResultsLayer
        symbols={[
          createBusSymbol('bus-sym-3', 'bus3', 500, 100), // No results for bus3
        ]}
        viewport={testViewport}
        visible={true}
      />
    );

    // bus3 should not have a label (no results data)
    expect(screen.queryByTestId('sld-diag-bus-bus3')).not.toBeInTheDocument();
  });
});

// =============================================================================
// TESTY BRAKU ZMIANY GEOMETRII
// =============================================================================

describe('DiagnosticResultsLayer - Geometry Preservation', () => {
  it('should not modify symbol positions (overlay is pointer-events-none)', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    // Main container should be pointer-events-none
    const overlayContainer = screen.getByTestId('sld-diagnostic-results-layer');
    expect(overlayContainer.className).toContain('pointer-events-none');
  });

  it('should apply viewport transformation to label positions', () => {
    const zoomedViewport: ViewportState = {
      offsetX: 50,
      offsetY: 25,
      zoom: 2,
    };

    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={zoomedViewport}
        visible={true}
      />
    );

    // bus1 at (100, 100) with viewport (50, 25, zoom=2)
    // Expected: x = 100 * 2 + 50 = 250, y = 100 * 2 + 25 - 32 (offset) = 193
    const busLabel = screen.getByTestId('sld-diag-bus-bus1');
    expect(busLabel.style.left).toBe('250px');
  });

  it('should not add elements to the DOM that would affect layout', () => {
    const { container } = render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    // All labels should be absolutely positioned
    const allLabels = container.querySelectorAll('[data-testid^="sld-diag-"]');
    allLabels.forEach((label) => {
      const style = (label as HTMLElement).className;
      expect(style).toContain('absolute');
    });
  });
});

// =============================================================================
// TESTY WIDOCZNOŚCI I TRYBU
// =============================================================================

describe('DiagnosticResultsLayer - Visibility', () => {
  it('should render when visible=true', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    expect(screen.getByTestId('sld-diagnostic-results-layer')).toBeInTheDocument();
  });

  it('should not render when visible=false', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={false}
      />
    );

    expect(screen.queryByTestId('sld-diagnostic-results-layer')).not.toBeInTheDocument();
  });

  it('should show mode indicator when visible', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    const modeIndicator = screen.getByTestId('sld-diag-mode-indicator');
    expect(modeIndicator).toBeInTheDocument();
    expect(modeIndicator.textContent).toContain('WYNIKI');
  });
});

// =============================================================================
// TESTY STATUSÓW SPRAWDZEŃ
// =============================================================================

describe('DiagnosticResultsLayer - Status Checks', () => {
  it('should show OK status for elements within limits', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    // bus1 with 20.5 kV (2.5% deviation from 20 kV) should be OK
    const busLabel1 = screen.getByTestId('sld-diag-bus-bus1');
    expect(busLabel1.textContent).toContain('OK');

    // line1 with 75.3% loading should be OK
    const lineLabel = screen.getByTestId('sld-diag-branch-line1');
    expect(lineLabel.textContent).toContain('OK');
  });

  it('should show "Wymaga korekty" status for elements exceeding limits', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    // trafo1 with 110% loading should require correction
    const trafoLabel = screen.getByTestId('sld-diag-branch-trafo1');
    expect(trafoLabel.textContent).toContain('Wymaga korekty');
  });

  it('should calculate voltage delta percentage correctly', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    // bus1: 20.5 kV vs 20 kV nominal = +2.5%
    const busLabel1 = screen.getByTestId('sld-diag-bus-bus1');
    expect(busLabel1.textContent).toContain('+2.50 %');

    // bus2: 19.8 kV vs 20 kV nominal = -1.0%
    const busLabel2 = screen.getByTestId('sld-diag-bus-bus2');
    expect(busLabel2.textContent).toContain('-1.00 %');
  });
});

// =============================================================================
// TESTY FORMATOWANIA
// =============================================================================

describe('DiagnosticResultsLayer - Formatting', () => {
  it('should format voltage with 2 decimal places', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    const busLabel = screen.getByTestId('sld-diag-bus-bus1');
    expect(busLabel.textContent).toMatch(/U = \d+\.\d{2} kV/);
  });

  it('should format current with 1 decimal place', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    const branchLabel = screen.getByTestId('sld-diag-branch-line1');
    expect(branchLabel.textContent).toMatch(/I = \d+\.\d A/);
  });

  it('should format loading with 1 decimal place', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    const branchLabel = screen.getByTestId('sld-diag-branch-line1');
    expect(branchLabel.textContent).toMatch(/Obciazenie = \d+\.\d %/);
  });

  it('should use delta symbol for voltage deviation', () => {
    render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    const busLabel = screen.getByTestId('sld-diag-bus-bus1');
    expect(busLabel.textContent).toContain('ΔU');
  });
});

// =============================================================================
// TESTY BRAKU DANYCH
// =============================================================================

describe('DiagnosticResultsLayer - Empty State', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should show "Brak danych wynikow" message when no results', async () => {
    // Re-mock with empty results
    vi.doMock('../../results-inspector/store', () => ({
      useResultsInspectorStore: vi.fn(() => ({
        sldOverlay: {
          run_id: 'empty-run',
          result_status: 'FRESH',
          nodes: [],
          branches: [],
        },
        overlayVisible: true,
      })),
    }));

    // Re-import component with new mock
    const { DiagnosticResultsLayer: FreshLayer } = await import('../DiagnosticResultsLayer');

    render(
      <FreshLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    const noDataMessage = screen.getByTestId('sld-diag-no-data');
    expect(noDataMessage).toBeInTheDocument();
    expect(noDataMessage.textContent).toContain('Brak danych wynikow');
  });
});

// =============================================================================
// TESTY STYLU (BRAK KOLORÓW ALARMOWYCH)
// =============================================================================

describe('DiagnosticResultsLayer - Styling', () => {
  it('should use gray/graphite colors (no red/green alarm colors)', () => {
    const { container } = render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    // Should NOT contain alarm red/green classes
    const html = container.innerHTML;
    expect(html).not.toContain('text-red-');
    expect(html).not.toContain('text-green-');
    expect(html).not.toContain('bg-red-');
    expect(html).not.toContain('bg-green-');

    // Should contain gray colors
    expect(html).toContain('text-gray-');
    expect(html).toContain('border-gray-');
  });

  it('should use monospace font for values', () => {
    const { container } = render(
      <DiagnosticResultsLayer
        symbols={testSymbols}
        viewport={testViewport}
        visible={true}
      />
    );

    const html = container.innerHTML;
    expect(html).toContain('font-mono');
  });
});
