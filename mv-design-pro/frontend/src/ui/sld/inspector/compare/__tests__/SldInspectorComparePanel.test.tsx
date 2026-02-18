/**
 * SLD Inspector Compare Panel Tests — PR-SLD-08
 *
 * Testy jednostkowe dla panelu porównania elementów.
 *
 * TEST COVERAGE:
 * - Renderowanie pustego stanu
 * - Renderowanie trybu porównania (2 elementy)
 * - Wykrywanie i wyświetlanie różnic
 * - Deterministyczna kolejność A/B
 * - Polskie etykiety
 * - Zamykanie panelu
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SldInspectorComparePanel } from '../SldInspectorComparePanel';

// =============================================================================
// MOCK DATA
// =============================================================================

const mockBusSymbol1 = {
  id: 'bus-sym-1',
  elementId: 'bus-1',
  elementType: 'Bus' as const,
  elementName: 'Szyna główna SN',
  position: { x: 100, y: 100 },
  inService: true,
  width: 80,
  height: 10,
};

const mockBusSymbol2 = {
  id: 'bus-sym-2',
  elementId: 'bus-2',
  elementType: 'Bus' as const,
  elementName: 'Szyna rezerwowa',
  position: { x: 200, y: 100 },
  inService: false,
  width: 100,
  height: 12,
};

const mockSwitchSymbol1 = {
  id: 'sw-sym-1',
  elementId: 'switch-1',
  elementType: 'Switch' as const,
  elementName: 'Q1',
  position: { x: 150, y: 150 },
  inService: true,
  fromNodeId: 'bus-1',
  toNodeId: 'bus-2',
  switchState: 'CLOSED' as const,
  switchType: 'BREAKER' as const,
};

const mockSwitchSymbol2 = {
  id: 'sw-sym-2',
  elementId: 'switch-2',
  elementType: 'Switch' as const,
  elementName: 'Q2',
  position: { x: 250, y: 150 },
  inService: true,
  fromNodeId: 'bus-2',
  toNodeId: 'bus-3',
  switchState: 'OPEN' as const,
  switchType: 'DISCONNECTOR' as const,
};

// =============================================================================
// MOCK STORES
// =============================================================================

const mockSymbolsMap = new Map<string, any>();
mockSymbolsMap.set(mockBusSymbol1.id, mockBusSymbol1);
mockSymbolsMap.set(mockBusSymbol2.id, mockBusSymbol2);
mockSymbolsMap.set(mockSwitchSymbol1.id, mockSwitchSymbol1);
mockSymbolsMap.set(mockSwitchSymbol2.id, mockSwitchSymbol2);

// Track mock state
let mockSelectedElements: Array<{ id: string; type: string; name: string }> = [];
let mockSldMode: 'EDYCJA' | 'WYNIKI' = 'EDYCJA';

vi.mock('../../../../selection/store', () => ({
  useSelectionStore: vi.fn((selector) => {
    const state = {
      selectedElements: mockSelectedElements,
      clearSelection: vi.fn(),
    };
    return selector(state);
  }),
}));

vi.mock('../../../../sld-editor/SldEditorStore', () => ({
  useSldEditorStore: vi.fn((selector) => {
    const state = {
      symbols: mockSymbolsMap,
    };
    return selector(state);
  }),
}));

vi.mock('../../../sldModeStore', () => ({
  useSldModeStore: vi.fn((selector) => {
    const state = {
      mode: mockSldMode,
    };
    return selector(state);
  }),
  SLD_MODE_LABELS_PL: {
    EDYCJA: 'Edycja',
    WYNIKI: 'Wyniki',
  },
}));

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function setMockSelection(elements: Array<{ id: string; type: string; name: string }>) {
  mockSelectedElements = elements;
}

function setMockSldMode(mode: 'EDYCJA' | 'WYNIKI') {
  mockSldMode = mode;
}

// =============================================================================
// TESTY PUSTEGO STANU
// =============================================================================

describe('SldInspectorComparePanel - Empty State', () => {
  beforeEach(() => {
    setMockSelection([]);
    setMockSldMode('EDYCJA');
  });

  it('should render empty state when no elements selected', () => {
    render(<SldInspectorComparePanel />);

    expect(screen.getByTestId('compare-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/Zaznacz 2 elementy/)).toBeInTheDocument();
  });

  it('should render empty state when only 1 element selected', () => {
    setMockSelection([{ id: 'bus-1', type: 'Bus', name: 'Test' }]);
    render(<SldInspectorComparePanel />);

    expect(screen.getByTestId('compare-empty-state')).toBeInTheDocument();
  });
});

// =============================================================================
// TESTY TRYBU PORÓWNANIA
// =============================================================================

describe('SldInspectorComparePanel - Compare Mode', () => {
  beforeEach(() => {
    setMockSldMode('EDYCJA');
  });

  it('should render compare panel when 2 elements are selected', () => {
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna główna SN' },
      { id: 'bus-2', type: 'Bus', name: 'Szyna rezerwowa' },
    ]);

    render(<SldInspectorComparePanel />);

    expect(screen.getByTestId('sld-inspector-compare-panel')).toBeInTheDocument();
    expect(screen.getByText('Porównanie elementów')).toBeInTheDocument();
  });

  it('should show same type indicator for same element types', () => {
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna 1' },
      { id: 'bus-2', type: 'Bus', name: 'Szyna 2' },
    ]);

    render(<SldInspectorComparePanel />);

    expect(screen.getByTestId('compare-subtitle')).toHaveTextContent('Ten sam typ');
    expect(screen.getByTestId('compare-subtitle')).toHaveTextContent('Szyna');
  });

  it('should show different types indicator for different element types', () => {
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna' },
      { id: 'switch-1', type: 'Switch', name: 'Łącznik' },
    ]);

    render(<SldInspectorComparePanel />);

    expect(screen.getByTestId('compare-subtitle')).toHaveTextContent('Różne typy');
  });

  it('should render sections for compared elements', () => {
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna 1' },
      { id: 'bus-2', type: 'Bus', name: 'Szyna 2' },
    ]);

    render(<SldInspectorComparePanel />);

    expect(screen.getByTestId('compare-section-basic')).toBeInTheDocument();
    expect(screen.getByTestId('compare-section-technical')).toBeInTheDocument();
  });
});

// =============================================================================
// TESTY WYKRYWANIA RÓŻNIC
// =============================================================================

describe('SldInspectorComparePanel - Difference Detection', () => {
  beforeEach(() => {
    setMockSldMode('EDYCJA');
  });

  it('should show difference count in summary', () => {
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna 1' },
      { id: 'bus-2', type: 'Bus', name: 'Szyna 2' },
    ]);

    render(<SldInspectorComparePanel />);

    const summary = screen.getByTestId('compare-diff-summary');
    // Powinno być więcej niż 0 różnic (różne nazwy, różne wymiary, różny stan)
    expect(summary.textContent).toMatch(/\d+\s+różnic/);
  });

  it('should show "Brak różnic" when elements are identical', () => {
    // Zaznaczamy dwa razy ten sam element (teoretycznie)
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna' },
      { id: 'bus-1', type: 'Bus', name: 'Szyna' },
    ]);

    render(<SldInspectorComparePanel />);

    // Gdy oba elementy są identyczne, brak różnic
    const summary = screen.getByTestId('compare-diff-summary');
    expect(summary.textContent).toBe('Brak różnic');
  });

  it('should mark different values with ≠ indicator', () => {
    setMockSelection([
      { id: 'switch-1', type: 'Switch', name: 'Q1' },
      { id: 'switch-2', type: 'Switch', name: 'Q2' },
    ]);

    render(<SldInspectorComparePanel />);

    // Szukamy znaku różnicy w DOM
    const content = screen.getByTestId('compare-content');
    expect(content.innerHTML).toContain('≠');
  });
});

// =============================================================================
// TESTY DETERMINISTYCZNOŚCI
// =============================================================================

describe('SldInspectorComparePanel - Determinism', () => {
  beforeEach(() => {
    setMockSldMode('EDYCJA');
  });

  it('should render A/B in deterministic order (sorted by elementId)', () => {
    // Kolejność zaznaczania: bus-2, bus-1
    setMockSelection([
      { id: 'bus-2', type: 'Bus', name: 'Szyna rezerwowa' },
      { id: 'bus-1', type: 'Bus', name: 'Szyna główna SN' },
    ]);

    render(<SldInspectorComparePanel />);

    // A powinno być bus-1 (alfabetycznie pierwsze)
    const content = screen.getByTestId('compare-content');
    const columnHeaders = content.querySelectorAll('[class*="uppercase"]');

    // Sprawdź czy A jest przed B
    let foundA = false;
    let foundB = false;
    let aPosition = -1;
    let bPosition = -1;

    columnHeaders.forEach((header, index) => {
      if (header.textContent?.includes('A:')) {
        foundA = true;
        aPosition = index;
      }
      if (header.textContent?.includes('B:')) {
        foundB = true;
        bPosition = index;
      }
    });

    expect(foundA).toBe(true);
    expect(foundB).toBe(true);
    expect(aPosition).toBeLessThan(bPosition);
  });

  it('should produce identical output for same input regardless of selection order', () => {
    // Pierwsza kolejność: bus-1, bus-2
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna 1' },
      { id: 'bus-2', type: 'Bus', name: 'Szyna 2' },
    ]);

    const { container: container1 } = render(<SldInspectorComparePanel />);
    const html1 = container1.innerHTML;

    // Druga kolejność: bus-2, bus-1
    setMockSelection([
      { id: 'bus-2', type: 'Bus', name: 'Szyna 2' },
      { id: 'bus-1', type: 'Bus', name: 'Szyna 1' },
    ]);

    const { container: container2 } = render(<SldInspectorComparePanel />);
    const html2 = container2.innerHTML;

    // Oba powinny być identyczne
    expect(html1).toBe(html2);
  });
});

// =============================================================================
// TESTY TRYBU WYNIKI
// =============================================================================

describe('SldInspectorComparePanel - Mode Differences', () => {
  it('should show "Edycja" mode badge in EDYCJA mode', () => {
    setMockSldMode('EDYCJA');
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna 1' },
      { id: 'bus-2', type: 'Bus', name: 'Szyna 2' },
    ]);

    render(<SldInspectorComparePanel />);

    const modeBadge = screen.getByTestId('compare-mode-badge');
    expect(modeBadge.textContent).toContain('Edycja');
  });

  it('should show "Wyniki" mode badge in WYNIKI mode', () => {
    setMockSldMode('WYNIKI');
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna 1' },
      { id: 'bus-2', type: 'Bus', name: 'Szyna 2' },
    ]);

    render(<SldInspectorComparePanel />);

    const modeBadge = screen.getByTestId('compare-mode-badge');
    expect(modeBadge.textContent).toContain('Wyniki');
  });

  it('should have data-sld-mode attribute matching current mode', () => {
    setMockSldMode('WYNIKI');
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna 1' },
      { id: 'bus-2', type: 'Bus', name: 'Szyna 2' },
    ]);

    render(<SldInspectorComparePanel />);

    const panel = screen.getByTestId('sld-inspector-compare-panel');
    expect(panel.dataset.sldMode).toBe('WYNIKI');
  });
});

// =============================================================================
// TESTY ZAMYKANIA PANELU
// =============================================================================

describe('SldInspectorComparePanel - Close Behavior', () => {
  beforeEach(() => {
    setMockSldMode('EDYCJA');
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna 1' },
      { id: 'bus-2', type: 'Bus', name: 'Szyna 2' },
    ]);
  });

  it('should call onClose when close button is clicked', () => {
    const mockOnClose = vi.fn();

    render(<SldInspectorComparePanel onClose={mockOnClose} />);

    const closeButton = screen.getByTestId('compare-close-button');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should have close button with proper aria-label', () => {
    render(<SldInspectorComparePanel />);

    const closeButton = screen.getByTestId('compare-close-button');
    expect(closeButton.getAttribute('aria-label')).toBe('Zamknij porównanie');
  });
});

// =============================================================================
// TESTY SEKCJI SKŁADANYCH
// =============================================================================

describe('SldInspectorComparePanel - Collapsible Sections', () => {
  beforeEach(() => {
    setMockSldMode('EDYCJA');
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna 1' },
      { id: 'bus-2', type: 'Bus', name: 'Szyna 2' },
    ]);
  });

  it('should render sections expanded by default', () => {
    render(<SldInspectorComparePanel />);

    const basicSection = screen.getByTestId('compare-section-fields-basic');
    const technicalSection = screen.getByTestId('compare-section-fields-technical');

    expect(basicSection).toBeInTheDocument();
    expect(technicalSection).toBeInTheDocument();
  });

  it('should collapse section when header is clicked', () => {
    render(<SldInspectorComparePanel />);

    const sectionHeader = screen.getByTestId('compare-section-header-basic');
    fireEvent.click(sectionHeader);

    expect(screen.queryByTestId('compare-section-fields-basic')).not.toBeInTheDocument();
  });

  it('should expand collapsed section when header is clicked again', () => {
    render(<SldInspectorComparePanel />);

    const sectionHeader = screen.getByTestId('compare-section-header-basic');

    // Collapse
    fireEvent.click(sectionHeader);
    expect(screen.queryByTestId('compare-section-fields-basic')).not.toBeInTheDocument();

    // Expand
    fireEvent.click(sectionHeader);
    expect(screen.getByTestId('compare-section-fields-basic')).toBeInTheDocument();
  });
});

// =============================================================================
// TESTY POLSKICH ETYKIET
// =============================================================================

describe('SldInspectorComparePanel - Polish Labels', () => {
  beforeEach(() => {
    setMockSldMode('EDYCJA');
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna 1' },
      { id: 'bus-2', type: 'Bus', name: 'Szyna 2' },
    ]);
  });

  it('should use Polish title "Porównanie elementów"', () => {
    render(<SldInspectorComparePanel />);

    expect(screen.getByText('Porównanie elementów')).toBeInTheDocument();
  });

  it('should use Polish "Tylko do odczytu" badge', () => {
    render(<SldInspectorComparePanel />);

    expect(screen.getByText('Tylko do odczytu')).toBeInTheDocument();
  });

  it('should use Polish section labels', () => {
    render(<SldInspectorComparePanel />);

    expect(screen.getByText('Informacje podstawowe')).toBeInTheDocument();
    expect(screen.getByText('Parametry techniczne')).toBeInTheDocument();
  });
});

// =============================================================================
// TESTY ATRYBUTÓW DATA
// =============================================================================

describe('SldInspectorComparePanel - Data Attributes', () => {
  beforeEach(() => {
    setMockSldMode('EDYCJA');
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna 1' },
      { id: 'bus-2', type: 'Bus', name: 'Szyna 2' },
    ]);
  });

  it('should have data-compare-mode="true" when comparing', () => {
    render(<SldInspectorComparePanel />);

    const panel = screen.getByTestId('sld-inspector-compare-panel');
    expect(panel.dataset.compareMode).toBe('true');
  });

  it('should have data-total-differences attribute', () => {
    render(<SldInspectorComparePanel />);

    const panel = screen.getByTestId('sld-inspector-compare-panel');
    expect(panel.dataset.totalDifferences).toBeDefined();
  });
});

// =============================================================================
// TESTY STYLÓW
// =============================================================================

describe('SldInspectorComparePanel - Styling', () => {
  beforeEach(() => {
    setMockSldMode('EDYCJA');
    setMockSelection([
      { id: 'bus-1', type: 'Bus', name: 'Szyna 1' },
      { id: 'bus-2', type: 'Bus', name: 'Szyna 2' },
    ]);
  });

  it('should have fixed width of 380px', () => {
    render(<SldInspectorComparePanel />);

    const panel = screen.getByTestId('sld-inspector-compare-panel');
    expect(panel.style.width).toBe('380px');
  });

  it('should have overflow-y-auto for content scrolling', () => {
    render(<SldInspectorComparePanel />);

    const content = screen.getByTestId('compare-content');
    expect(content.className).toContain('overflow-y-auto');
  });

  it('should use amber color for differences (not red/green alarm)', () => {
    render(<SldInspectorComparePanel />);

    const { container } = render(<SldInspectorComparePanel />);
    const html = container.innerHTML;

    // Powinno zawierać amber dla różnic
    expect(html).toContain('amber');
  });
});
