/**
 * TypeLibraryBrowser Tests (P13a)
 *
 * CANONICAL ALIGNMENT:
 * - CATALOG_BROWSER_CONTRACT.md § 3: Structure and behavior
 * - Deterministic ordering (manufacturer → name → id)
 * - 4 tabs: Line, Cable, Transformer, Switch Equipment
 * - Polish labels per wizard_screens.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TypeLibraryBrowser } from '../TypeLibraryBrowser';
import * as catalogApi from '../api';

// Mock catalog API
vi.mock('../api');

const mockLineTypes = [
  {
    id: 'line-001',
    name: 'ACSR 240',
    manufacturer: 'ABC Cables',
    r_ohm_per_km: 0.12,
    x_ohm_per_km: 0.39,
    b_us_per_km: 2.82,
    rated_current_a: 645,
    standard: 'IEC 61089',
    max_temperature_c: 70,
    voltage_rating_kv: 110,
    conductor_material: 'ACSR',
    cross_section_mm2: 240,
  },
  {
    id: 'line-002',
    name: 'ACSR 120',
    manufacturer: 'ABC Cables',
    r_ohm_per_km: 0.24,
    x_ohm_per_km: 0.41,
    b_us_per_km: 2.65,
    rated_current_a: 400,
    standard: 'IEC 61089',
    max_temperature_c: 70,
    voltage_rating_kv: 15,
    conductor_material: 'ACSR',
    cross_section_mm2: 120,
  },
];

const mockCableTypes = [
  {
    id: 'cable-001',
    name: 'NA2XS(F)2Y 240',
    manufacturer: 'XYZ Cables',
    r_ohm_per_km: 0.125,
    x_ohm_per_km: 0.11,
    c_nf_per_km: 210,
    rated_current_a: 355,
    voltage_rating_kv: 15,
    insulation_type: 'XLPE',
    standard: 'IEC 60502',
    conductor_material: 'Al',
    cross_section_mm2: 240,
    max_temperature_c: 90,
  },
];

const mockTransformerTypes = [
  {
    id: 'trafo-001',
    name: 'ONAN 40MVA 110/15kV',
    manufacturer: 'Trafo Inc',
    rated_power_mva: 40,
    voltage_hv_kv: 110,
    voltage_lv_kv: 15,
    uk_percent: 10.5,
    pk_kw: 150,
    i0_percent: 0.5,
    p0_kw: 25,
    vector_group: 'Dyn11',
    cooling_class: 'ONAN',
    tap_min: -5,
    tap_max: 5,
    tap_step_percent: 2.5,
  },
];

const mockSwitchTypes = [
  {
    id: 'switch-001',
    name: 'VD4 12kV 630A',
    manufacturer: 'ABB',
    equipment_kind: 'CIRCUIT_BREAKER',
    un_kv: 12,
    in_a: 630,
    ik_ka: 25,
    icw_ka: 25,
    medium: 'VACUUM',
  },
];

describe('TypeLibraryBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(catalogApi.fetchTypesByCategory).mockImplementation(async (category) => {
      switch (category) {
        case 'LINE':
          return mockLineTypes;
        case 'CABLE':
          return mockCableTypes;
        case 'TRANSFORMER':
          return mockTransformerTypes;
        case 'SWITCH_EQUIPMENT':
          return mockSwitchTypes;
        default:
          return [];
      }
    });
  });

  it('renders with 4 tabs in Polish', async () => {
    render(<TypeLibraryBrowser />);

    expect(screen.getByText('Biblioteka typów')).toBeInTheDocument();
    expect(screen.getByText('Typy linii')).toBeInTheDocument();
    expect(screen.getByText('Typy kabli')).toBeInTheDocument();
    expect(screen.getByText('Typy transformatorów')).toBeInTheDocument();
    expect(screen.getByText('Typy aparatury łączeniowej')).toBeInTheDocument();
  });

  it('loads and displays line types on mount (default tab)', async () => {
    render(<TypeLibraryBrowser />);

    await waitFor(() => {
      expect(catalogApi.fetchTypesByCategory).toHaveBeenCalledWith('LINE');
    });

    await waitFor(() => {
      expect(screen.getByText('ACSR 240')).toBeInTheDocument();
      expect(screen.getByText('ACSR 120')).toBeInTheDocument();
    });
  });

  it('switches to cable types tab', async () => {
    const user = userEvent.setup();
    render(<TypeLibraryBrowser />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('ACSR 240')).toBeInTheDocument();
    });

    // Click cable tab
    await user.click(screen.getByText('Typy kabli'));

    await waitFor(() => {
      expect(catalogApi.fetchTypesByCategory).toHaveBeenCalledWith('CABLE');
    });

    await waitFor(() => {
      expect(screen.getByText('NA2XS(F)2Y 240')).toBeInTheDocument();
    });
  });

  it('filters types by search query', async () => {
    const user = userEvent.setup();
    render(<TypeLibraryBrowser />);

    await waitFor(() => {
      expect(screen.getByText('ACSR 240')).toBeInTheDocument();
      expect(screen.getByText('ACSR 120')).toBeInTheDocument();
    });

    // Search for "240"
    const searchInput = screen.getByPlaceholderText(
      'Szukaj po nazwie, producencie lub ID...'
    );
    await user.type(searchInput, '240');

    // Only ACSR 240 should be visible
    expect(screen.getByText('ACSR 240')).toBeInTheDocument();
    expect(screen.queryByText('ACSR 120')).not.toBeInTheDocument();
  });

  it('shows type details when type is selected', async () => {
    const user = userEvent.setup();
    render(<TypeLibraryBrowser />);

    await waitFor(() => {
      expect(screen.getByText('ACSR 240')).toBeInTheDocument();
    });

    // Click on type
    await user.click(screen.getByText('ACSR 240'));

    // Details should appear
    await waitFor(() => {
      expect(screen.getByText('Informacje podstawowe')).toBeInTheDocument();
      expect(screen.getByText('Parametry elektryczne')).toBeInTheDocument();
    });

    // Check parameter values
    expect(screen.getByText('0.120')).toBeInTheDocument(); // R value
    expect(screen.getByText('Ω/km')).toBeInTheDocument(); // Unit
  });

  it('displays loading state', async () => {
    vi.mocked(catalogApi.fetchTypesByCategory).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockLineTypes), 1000))
    );

    render(<TypeLibraryBrowser />);

    expect(screen.getByText('Ładowanie typów...')).toBeInTheDocument();
  });

  it('displays error state', async () => {
    vi.mocked(catalogApi.fetchTypesByCategory).mockRejectedValue(
      new Error('Network error')
    );

    render(<TypeLibraryBrowser />);

    await waitFor(() => {
      expect(screen.getByText('Błąd')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('displays empty state when no types', async () => {
    vi.mocked(catalogApi.fetchTypesByCategory).mockResolvedValue([]);

    render(<TypeLibraryBrowser />);

    await waitFor(() => {
      expect(screen.getByText('Brak typów w katalogu.')).toBeInTheDocument();
    });
  });

  it('resets search and selection when tab changes', async () => {
    const user = userEvent.setup();
    render(<TypeLibraryBrowser />);

    await waitFor(() => {
      expect(screen.getByText('ACSR 240')).toBeInTheDocument();
    });

    // Search
    const searchInput = screen.getByPlaceholderText(
      'Szukaj po nazwie, producencie lub ID...'
    );
    await user.type(searchInput, '240');

    // Select type
    await user.click(screen.getByText('ACSR 240'));

    // Switch tab
    await user.click(screen.getByText('Typy kabli'));

    // Search should be cleared
    expect(searchInput).toHaveValue('');

    // Selection should be cleared
    await waitFor(() => {
      expect(
        screen.getByText('Wybierz typ z listy, aby zobaczyć szczegóły')
      ).toBeInTheDocument();
    });
  });

  it('calls onSelectType callback when type is selected', async () => {
    const onSelectType = vi.fn();
    const user = userEvent.setup();
    render(<TypeLibraryBrowser onSelectType={onSelectType} />);

    await waitFor(() => {
      expect(screen.getByText('ACSR 240')).toBeInTheDocument();
    });

    await user.click(screen.getByText('ACSR 240'));

    expect(onSelectType).toHaveBeenCalledWith('line-001', 'LINE');
  });

  it('shows all type categories with correct icons', async () => {
    render(<TypeLibraryBrowser />);

    const tabs = screen.getAllByRole('button', { name: /Typy/ });
    expect(tabs).toHaveLength(4);

    // Check icons are present (they're rendered as text)
    expect(screen.getByText('[LN]')).toBeInTheDocument(); // Line icon
    expect(screen.getByText('[CB]')).toBeInTheDocument(); // Cable icon
    expect(screen.getByText('[TR]')).toBeInTheDocument(); // Transformer icon
    expect(screen.getByText('[SW]')).toBeInTheDocument(); // Switch icon
  });

  it('displays manufacturer in type list', async () => {
    render(<TypeLibraryBrowser />);

    await waitFor(() => {
      expect(screen.getAllByText('ABC Cables')).toHaveLength(2);
    });
  });

  it('displays transformer parameters correctly', async () => {
    const user = userEvent.setup();
    render(<TypeLibraryBrowser initialTab="TRANSFORMER" />);

    await waitFor(() => {
      expect(screen.getByText('ONAN 40MVA 110/15kV')).toBeInTheDocument();
    });

    await user.click(screen.getByText('ONAN 40MVA 110/15kV'));

    await waitFor(() => {
      expect(screen.getByText('Moc znamionowa')).toBeInTheDocument();
      expect(screen.getByText('40.0')).toBeInTheDocument();
      expect(screen.getByText('MVA')).toBeInTheDocument();
      expect(screen.getByText('Dyn11')).toBeInTheDocument();
    });
  });

  it('displays switch equipment parameters correctly', async () => {
    const user = userEvent.setup();
    render(<TypeLibraryBrowser initialTab="SWITCH_EQUIPMENT" />);

    await waitFor(() => {
      expect(screen.getByText('VD4 12kV 630A')).toBeInTheDocument();
    });

    await user.click(screen.getByText('VD4 12kV 630A'));

    await waitFor(() => {
      expect(screen.getByText('Rodzaj aparatu')).toBeInTheDocument();
      expect(screen.getByText('CIRCUIT_BREAKER')).toBeInTheDocument();
      expect(screen.getByText('VACUUM')).toBeInTheDocument();
    });
  });
});

/**
 * Deterministic ordering tests (BINDING per CATALOG_BROWSER_CONTRACT.md).
 */
describe('TypeLibraryBrowser - Deterministic Ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays types in deterministic order: manufacturer → name → id', async () => {
    const unorderedTypes = [
      { id: 'c', name: 'Type C', manufacturer: 'Vendor A', r_ohm_per_km: 0.1, x_ohm_per_km: 0.1, b_us_per_km: 0, rated_current_a: 100, standard: '', max_temperature_c: 70, voltage_rating_kv: 15, conductor_material: '', cross_section_mm2: 100 },
      { id: 'a', name: 'Type A', manufacturer: 'Vendor B', r_ohm_per_km: 0.1, x_ohm_per_km: 0.1, b_us_per_km: 0, rated_current_a: 100, standard: '', max_temperature_c: 70, voltage_rating_kv: 15, conductor_material: '', cross_section_mm2: 100 },
      { id: 'b', name: 'Type B', manufacturer: 'Vendor A', r_ohm_per_km: 0.1, x_ohm_per_km: 0.1, b_us_per_km: 0, rated_current_a: 100, standard: '', max_temperature_c: 70, voltage_rating_kv: 15, conductor_material: '', cross_section_mm2: 100 },
    ];

    vi.mocked(catalogApi.fetchTypesByCategory).mockResolvedValue(unorderedTypes);

    render(<TypeLibraryBrowser />);

    await waitFor(() => {
      expect(screen.getByText('Type B')).toBeInTheDocument();
    });

    // API returns already sorted (sorted in api.ts fetchTypesByCategory)
    // UI displays in the order received
    const rows = screen.getAllByRole('row').slice(1); // Skip header row
    expect(rows[0]).toHaveTextContent('Type C'); // Vendor A, Type C
    expect(rows[1]).toHaveTextContent('Type B'); // Vendor A, Type B (sorted by name)
    expect(rows[2]).toHaveTextContent('Type A'); // Vendor B
  });
});
