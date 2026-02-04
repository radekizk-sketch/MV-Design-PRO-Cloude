/**
 * ETAP STYLE SYSTEM — Single Source of Truth for SLD Visual Styling
 *
 * PR-SLD-ETAP-STYLE-02: ETAP 1:1 Visual Parity
 *
 * CANONICAL ALIGNMENT:
 * - ETAP software visual standards
 * - IEC 60617 symbol conventions
 * - Industrial CAD rendering principles
 *
 * RULES:
 * - All style values defined HERE ONLY
 * - No magic numbers in renderers
 * - Deterministic (same input = same output)
 * - No "improvements" over ETAP
 *
 * HIERARCHY (BINDING):
 * 1. busbarStroke — dominant, heaviest
 * 2. feederStroke — clearly thinner
 * 3. auxStroke — auxiliary connections
 * 4. leaderStroke — callout leader lines
 */

// =============================================================================
// STROKE HIERARCHY (CANONICAL)
// =============================================================================

/**
 * Canonical stroke widths for ETAP visual hierarchy.
 * Busbar must visually dominate; feeders clearly subordinate.
 */
export const ETAP_STROKE = {
  /** Busbar — dominant, heaviest line (szyny zbiorcze) */
  busbar: 5,
  /** Feeder/branch — primary connections (linie zasilające) */
  feeder: 2.5,
  /** Symbol outline — equipment symbols */
  symbol: 2,
  /** Auxiliary — secondary/measurement connections */
  aux: 1.5,
  /** Leader — callout/annotation lines */
  leader: 1,
  /** Detail — fine symbol details */
  detail: 1,
} as const;

/**
 * Stroke widths when element is selected.
 */
export const ETAP_STROKE_SELECTED = {
  busbar: 6,
  feeder: 3.5,
  symbol: 3,
  aux: 2,
  leader: 1.5,
  detail: 1.5,
} as const;

// =============================================================================
// COLOR SYSTEM (ETAP INDUSTRIAL PALETTE)
// =============================================================================

/**
 * Voltage-based colors (ETAP standard).
 * Industrial palette — calm, professional, readable.
 */
export const ETAP_VOLTAGE_COLORS = {
  /** WN — High Voltage (110kV+): deep red */
  WN: '#B91C1C', // red-700 (industrial, not alarm-bright)
  /** SN — Medium Voltage (6-30kV): deep blue */
  SN: '#1D4ED8', // blue-700 (ETAP standard for MV)
  /** nN — Low Voltage (0.4kV): dark amber */
  nN: '#B45309', // amber-700 (warm but professional)
  /** Unknown/default: neutral gray */
  default: '#374151', // gray-700
} as const;

/**
 * Voltage level lookup table (kV -> color key).
 */
export const ETAP_VOLTAGE_MAP: Record<string, keyof typeof ETAP_VOLTAGE_COLORS> = {
  // WN (High Voltage)
  '400': 'WN',
  '220': 'WN',
  '110': 'WN',
  // SN (Medium Voltage)
  '30': 'SN',
  '20': 'SN',
  '15': 'SN',
  '10': 'SN',
  '6': 'SN',
  // nN (Low Voltage)
  '0.4': 'nN',
  '0.23': 'nN',
} as const;

/**
 * State-based color modifiers.
 */
export const ETAP_STATE_COLORS = {
  /** Energized — full color (uses voltage color) */
  energized: null, // use voltage color
  /** De-energized — muted gray (not washed out) */
  deenergized: '#6B7280', // gray-500
  /** Selected — accent blue (consistent highlight) */
  selected: '#2563EB', // blue-600
  /** Out of service — faded */
  outOfService: '#9CA3AF', // gray-400
  /** Error/warning highlight */
  error: '#DC2626', // red-600
  warning: '#D97706', // amber-600
  info: '#2563EB', // blue-600
} as const;

/**
 * Fill colors for symbols.
 */
export const ETAP_FILL_COLORS = {
  /** Normal fill — white background */
  normal: '#FFFFFF',
  /** Selected fill — light blue tint */
  selected: '#DBEAFE', // blue-100
  /** De-energized fill — light gray */
  deenergized: '#F3F4F6', // gray-100
  /** Transparent (for open symbols) */
  none: 'none',
} as const;

// =============================================================================
// TYPOGRAPHY (ETAP INDUSTRIAL)
// =============================================================================

/**
 * Font settings for ETAP-style labels.
 * Single font family, clear hierarchy of sizes.
 */
export const ETAP_TYPOGRAPHY = {
  /** Font family — industrial, readable */
  fontFamily: "'Inter', 'Segoe UI', 'Arial', sans-serif",
  /** Font sizes (px) — clear hierarchy */
  fontSize: {
    /** Large — busbar names, main titles */
    large: 12,
    /** Medium — element names, primary labels */
    medium: 10,
    /** Small — secondary labels, annotations */
    small: 9,
    /** XSmall — callout details */
    xsmall: 8,
  },
  /** Font weights */
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  /** Line heights (relative) */
  lineHeight: {
    tight: 1.1,
    normal: 1.3,
    relaxed: 1.5,
  },
  /** Label text color */
  labelColor: '#1F2937', // gray-800
  /** Secondary text color */
  secondaryColor: '#4B5563', // gray-600
} as const;

// =============================================================================
// LABEL PLACEMENT (ETAP RULES)
// =============================================================================

/**
 * Label anchor positions relative to symbol center.
 * ETAP rule: consistent placement by element type.
 */
export const ETAP_LABEL_ANCHORS = {
  /** Busbar — label above, centered */
  Bus: {
    position: 'top' as const,
    offsetX: 0,
    offsetY: -12,
    textAnchor: 'middle' as const,
  },
  /** Switch — label above */
  Switch: {
    position: 'top' as const,
    offsetX: 0,
    offsetY: -8,
    textAnchor: 'middle' as const,
  },
  /** Transformer — label to the right */
  TransformerBranch: {
    position: 'right' as const,
    offsetX: 30,
    offsetY: 0,
    textAnchor: 'start' as const,
  },
  /** Line/Cable — label above the midpoint */
  LineBranch: {
    position: 'top' as const,
    offsetX: 0,
    offsetY: -6,
    textAnchor: 'middle' as const,
  },
  /** Source — label above */
  Source: {
    position: 'top' as const,
    offsetX: 0,
    offsetY: -10,
    textAnchor: 'middle' as const,
  },
  /** Load — label below */
  Load: {
    position: 'bottom' as const,
    offsetX: 0,
    offsetY: 8,
    textAnchor: 'middle' as const,
  },
  /** Default fallback */
  default: {
    position: 'top' as const,
    offsetX: 0,
    offsetY: -8,
    textAnchor: 'middle' as const,
  },
} as const;

/**
 * Line label placement (labels ON the line segment).
 * ETAP rule: offset from line, white-box/halo for readability.
 */
export const ETAP_LINE_LABEL = {
  /** Offset perpendicular to line (px) */
  offset: 8,
  /** Halo/white-box padding (px) */
  haloPadding: 2,
  /** Halo color */
  haloColor: '#FFFFFF',
  /** Halo opacity */
  haloOpacity: 0.9,
} as const;

// =============================================================================
// CALLOUT BLOCKS (ETAP RESULTS)
// =============================================================================

/**
 * ETAP callout block configuration.
 * Standard order: Un, Ik", Sk", ip, Ith/Ithr
 */
export const ETAP_CALLOUT = {
  /** Block dimensions */
  block: {
    minWidth: 80,
    maxWidth: 140,
    padding: 6,
    borderRadius: 2,
    borderWidth: 1,
  },
  /** Leader line */
  leader: {
    strokeWidth: ETAP_STROKE.leader,
    strokeColor: '#6B7280', // gray-500
    dashArray: '4,2',
    /** Offset from node center to leader start */
    nodeOffset: 20,
    /** Leader line length (horizontal portion) */
    length: 30,
  },
  /** Block colors */
  colors: {
    background: '#FFFFFF',
    border: '#D1D5DB', // gray-300
    text: '#1F2937', // gray-800
    value: '#111827', // gray-900
    unit: '#6B7280', // gray-500
  },
  /** Standard result fields (ETAP order) */
  fields: [
    { key: 'Un', label: 'Un', unit: 'kV' },
    { key: 'Ikss', label: "Ik''", unit: 'kA' },
    { key: 'Skss', label: "Sk''", unit: 'MVA' },
    { key: 'ip', label: 'ip', unit: 'kA' },
    { key: 'Ith', label: 'Ith', unit: 'kA' },
  ] as const,
  /** Row height in callout */
  rowHeight: 16,
  /** Spacing between label and value */
  labelValueGap: 8,
} as const;

/**
 * Callout anchor positions (relative to node).
 */
export const ETAP_CALLOUT_ANCHORS = {
  /** Default: top-right of node */
  default: {
    direction: 'topRight' as const,
    offsetX: 40,
    offsetY: -30,
  },
  /** Alternative positions for collision avoidance */
  alternatives: [
    { direction: 'topLeft' as const, offsetX: -40, offsetY: -30 },
    { direction: 'bottomRight' as const, offsetX: 40, offsetY: 30 },
    { direction: 'bottomLeft' as const, offsetX: -40, offsetY: 30 },
  ],
} as const;

// =============================================================================
// SYMBOL SIZES (ETAP PROPORTIONS)
// =============================================================================

/**
 * Symbol sizes in pixels (ETAP proportions).
 * All symbols designed for viewBox 0 0 100 100, scaled to these sizes.
 */
export const ETAP_SYMBOL_SIZES = {
  /** Busbar — wide, low profile */
  Bus: { width: 100, height: 20 },
  /** Switch — square-ish, clear visibility */
  Switch: { width: 36, height: 48 },
  /** Transformer — tall, overlapping circles */
  TransformerBranch: { width: 40, height: 56 },
  /** Line/Cable — compact inline symbol */
  LineBranch: { width: 50, height: 30 },
  /** Source — prominent, clear hierarchy */
  Source: { width: 50, height: 60 },
  /** Load — clear termination symbol */
  Load: { width: 36, height: 44 },
  /** Default fallback */
  default: { width: 40, height: 40 },
} as const;

// =============================================================================
// GRID SETTINGS (SUBDUED)
// =============================================================================

/**
 * Grid configuration (ETAP: subdued, not dominant).
 */
export const ETAP_GRID = {
  /** Grid cell size (px) */
  size: 20,
  /** Major grid every N cells */
  majorEvery: 5,
  /** Minor grid color — very subtle */
  minorColor: '#F3F4F6', // gray-100
  /** Major grid color — slightly visible */
  majorColor: '#E5E7EB', // gray-200
  /** Minor stroke width */
  minorStrokeWidth: 0.5,
  /** Major stroke width */
  majorStrokeWidth: 0.75,
  /** Default visibility */
  defaultVisible: true,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get voltage color from kV value.
 */
export function getEtapVoltageColor(voltageKV: number | string | undefined): string {
  if (voltageKV === undefined || voltageKV === null) {
    return ETAP_VOLTAGE_COLORS.default;
  }
  const key = String(voltageKV);
  const level = ETAP_VOLTAGE_MAP[key];
  return level ? ETAP_VOLTAGE_COLORS[level] : ETAP_VOLTAGE_COLORS.default;
}

/**
 * Get stroke color based on state.
 */
export function getEtapStrokeColor(options: {
  voltageKV?: number | string;
  energized?: boolean;
  selected?: boolean;
  inService?: boolean;
}): string {
  const { voltageKV, energized = true, selected = false, inService = true } = options;

  // Selection takes priority
  if (selected) {
    return ETAP_STATE_COLORS.selected;
  }

  // Out of service
  if (!inService) {
    return ETAP_STATE_COLORS.outOfService;
  }

  // De-energized
  if (!energized) {
    return ETAP_STATE_COLORS.deenergized;
  }

  // Energized — use voltage color
  return getEtapVoltageColor(voltageKV);
}

/**
 * Get fill color based on state.
 */
export function getEtapFillColor(options: {
  selected?: boolean;
  energized?: boolean;
  inService?: boolean;
}): string {
  const { selected = false, energized = true, inService = true } = options;

  if (selected) {
    return ETAP_FILL_COLORS.selected;
  }

  if (!energized || !inService) {
    return ETAP_FILL_COLORS.deenergized;
  }

  return ETAP_FILL_COLORS.normal;
}

/**
 * Get opacity based on state.
 */
export function getEtapOpacity(options: {
  inService?: boolean;
  energized?: boolean;
}): number {
  const { inService = true, energized = true } = options;

  if (!inService) {
    return 0.5;
  }

  if (!energized) {
    return 0.7;
  }

  return 1;
}

/**
 * Label anchor type for consistency.
 */
export type EtapLabelAnchor = {
  position: 'top' | 'bottom' | 'left' | 'right';
  offsetX: number;
  offsetY: number;
  textAnchor: 'start' | 'middle' | 'end';
};

/**
 * Get label anchor for element type.
 */
export function getEtapLabelAnchor(
  elementType: keyof typeof ETAP_LABEL_ANCHORS | string
): EtapLabelAnchor {
  const anchor = ETAP_LABEL_ANCHORS[elementType as keyof typeof ETAP_LABEL_ANCHORS];
  if (anchor) {
    return anchor as EtapLabelAnchor;
  }
  return ETAP_LABEL_ANCHORS.default as EtapLabelAnchor;
}

/**
 * Get symbol size for element type.
 */
export function getEtapSymbolSize(
  elementType: keyof typeof ETAP_SYMBOL_SIZES | string
): { width: number; height: number } {
  return (
    ETAP_SYMBOL_SIZES[elementType as keyof typeof ETAP_SYMBOL_SIZES] ??
    ETAP_SYMBOL_SIZES.default
  );
}

/**
 * Get stroke width by layer type.
 */
export function getEtapStrokeWidth(
  layer: keyof typeof ETAP_STROKE,
  selected: boolean = false
): number {
  return selected ? ETAP_STROKE_SELECTED[layer] : ETAP_STROKE[layer];
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  // Stroke hierarchy
  STROKE: ETAP_STROKE,
  STROKE_SELECTED: ETAP_STROKE_SELECTED,
  // Colors
  VOLTAGE_COLORS: ETAP_VOLTAGE_COLORS,
  VOLTAGE_MAP: ETAP_VOLTAGE_MAP,
  STATE_COLORS: ETAP_STATE_COLORS,
  FILL_COLORS: ETAP_FILL_COLORS,
  // Typography
  TYPOGRAPHY: ETAP_TYPOGRAPHY,
  // Labels
  LABEL_ANCHORS: ETAP_LABEL_ANCHORS,
  LINE_LABEL: ETAP_LINE_LABEL,
  // Callouts
  CALLOUT: ETAP_CALLOUT,
  CALLOUT_ANCHORS: ETAP_CALLOUT_ANCHORS,
  // Symbols
  SYMBOL_SIZES: ETAP_SYMBOL_SIZES,
  // Grid
  GRID: ETAP_GRID,
  // Helpers
  getVoltageColor: getEtapVoltageColor,
  getStrokeColor: getEtapStrokeColor,
  getFillColor: getEtapFillColor,
  getOpacity: getEtapOpacity,
  getLabelAnchor: getEtapLabelAnchor,
  getSymbolSize: getEtapSymbolSize,
  getStrokeWidth: getEtapStrokeWidth,
};
