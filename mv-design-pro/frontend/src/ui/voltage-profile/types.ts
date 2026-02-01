/**
 * FIX-04 — Voltage Profile Chart Types
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: READ-ONLY result display
 * - wizard_screens.md: RESULT_VIEW mode
 * - 100% Polish UI labels
 *
 * RULES (BINDING):
 * - These types are READ-ONLY views of backend data
 * - No physics calculations in frontend
 * - Polish labels for UI display
 */

// =============================================================================
// Feeder Types
// =============================================================================

/**
 * Feeder definition for voltage profile.
 * Represents a path through the network from source to end.
 */
export interface Feeder {
  /** Unique feeder identifier */
  id: string;
  /** Display name (Polish) */
  name: string;
  /** Starting bus ID (typically source/slack bus) */
  startBusId: string;
  /** Ordered list of branch IDs in the feeder path */
  branchIds: string[];
  /** Ordered list of bus IDs in the feeder path */
  busIds: string[];
  /** Total length in km */
  totalLengthKm: number;
}

// =============================================================================
// Profile Data Types
// =============================================================================

/**
 * Violation type for voltage profile.
 */
export type VoltageViolationType = 'OVERVOLTAGE' | 'UNDERVOLTAGE' | null;

/**
 * Single data point in the voltage profile chart.
 */
export interface ProfileDataPoint {
  /** Bus ID */
  bus_id: string;
  /** Bus display name */
  bus_name: string;
  /** Cumulative distance from feeder start [km] */
  distance_km: number;
  /** Voltage magnitude [p.u.] */
  voltage_pu: number;
  /** Voltage magnitude [kV] */
  voltage_kv: number;
  /** Violation type (if any) */
  violation: VoltageViolationType;
  /** Deviation from nominal [%] */
  deviation_pct: number;
}

// =============================================================================
// Network Snapshot Types (Frontend)
// =============================================================================

/**
 * Bus information from network snapshot.
 */
export interface NetworkBus {
  id: string;
  name: string;
  voltage_kv: number;
}

/**
 * Branch information from network snapshot.
 */
export interface NetworkBranch {
  id: string;
  name: string;
  from_bus_id: string;
  to_bus_id: string;
  length_km: number;
  branch_type: 'LINE' | 'CABLE' | 'TRANSFORMER';
}

/**
 * Simplified network snapshot for voltage profile.
 */
export interface NetworkSnapshot {
  buses: NetworkBus[];
  branches: NetworkBranch[];
}

// =============================================================================
// Power Flow Result Types (Subset for profile)
// =============================================================================

/**
 * Bus result for voltage profile.
 */
export interface BusVoltageResult {
  bus_id: string;
  v_pu: number;
  voltage_kv?: number;
}

/**
 * Power flow result subset for voltage profile.
 */
export interface PowerFlowResultForProfile {
  converged: boolean;
  bus_results: BusVoltageResult[];
  base_mva?: number;
}

// =============================================================================
// Chart Configuration
// =============================================================================

/**
 * Voltage profile chart configuration.
 */
export interface VoltageProfileConfig {
  /** Minimum voltage limit [p.u.] */
  umin: number;
  /** Maximum voltage limit [p.u.] */
  umax: number;
  /** Show voltage limits on chart */
  showLimits: boolean;
  /** Show allowed region shading */
  showAllowedRegion: boolean;
  /** Y-axis domain min */
  yAxisMin: number;
  /** Y-axis domain max */
  yAxisMax: number;
}

/**
 * Default chart configuration.
 */
export const DEFAULT_PROFILE_CONFIG: VoltageProfileConfig = {
  umin: 0.95,
  umax: 1.05,
  showLimits: true,
  showAllowedRegion: true,
  yAxisMin: 0.9,
  yAxisMax: 1.1,
};

// =============================================================================
// UI Labels (100% Polish)
// =============================================================================

export const VOLTAGE_PROFILE_LABELS = {
  title: 'Profil napiec',
  subtitle: 'Rozklad napiec wzdluz feedera',

  chart: {
    xAxisLabel: 'Odleglosc [km]',
    yAxisLabel: 'U [p.u.]',
    voltageLine: 'Napiecie',
    umaxLabel: 'Umax',
    uminLabel: 'Umin',
    allowedRegion: 'Zakres dopuszczalny',
  },

  feeder: {
    selectLabel: 'Wybierz feeder',
    selectPlaceholder: 'Wybierz feeder...',
    noFeeders: 'Brak dostepnych feederow',
    totalLength: 'Dlugosc calkowita',
    busCount: 'Liczba wezlow',
  },

  options: {
    showLimits: 'Pokaz limity',
    showAllowedRegion: 'Pokaz zakres dopuszczalny',
    umin: 'Umin [p.u.]',
    umax: 'Umax [p.u.]',
  },

  tooltip: {
    bus: 'Wezel',
    distance: 'Odleglosc',
    voltage_pu: 'Napiecie',
    voltage_kv: 'Napiecie',
    deviation: 'Odchylenie',
    violation: 'Naruszenie',
  },

  violations: {
    OVERVOLTAGE: 'Przekroczenie Umax',
    UNDERVOLTAGE: 'Ponizej Umin',
    none: 'W normie',
  },

  table: {
    title: 'Dane profilu',
    bus_name: 'Wezel',
    distance_km: 'Odleglosc [km]',
    voltage_pu: 'U [p.u.]',
    voltage_kv: 'U [kV]',
    deviation_pct: 'Odch. [%]',
    status: 'Status',
  },

  status: {
    pass: 'ZGODNY',
    fail: 'NIEZGODNY',
    warning: 'OSTRZEZENIE',
  },

  actions: {
    export: 'Eksportuj',
    refresh: 'Odswiez',
    close: 'Zamknij',
  },

  messages: {
    noData: 'Brak danych profilu napiec',
    noFeederSelected: 'Wybierz feeder, aby wyswietlic profil napiec',
    loading: 'Ladowanie...',
    error: 'Blad wczytywania danych',
    notConverged: 'Wyniki rozpływu niezbiezne',
  },
} as const;

// =============================================================================
// Status Colors (Tailwind)
// =============================================================================

export const VOLTAGE_STATUS_COLORS = {
  pass: 'bg-emerald-100 text-emerald-700',
  fail: 'bg-rose-100 text-rose-700',
  warning: 'bg-amber-100 text-amber-700',
} as const;

export const VIOLATION_COLORS = {
  OVERVOLTAGE: 'text-rose-600',
  UNDERVOLTAGE: 'text-rose-600',
  none: 'text-emerald-600',
} as const;
