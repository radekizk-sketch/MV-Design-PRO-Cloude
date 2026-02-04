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
// ETAP GEOMETRY — SLD Layout Configuration (CANONICAL)
// =============================================================================

/**
 * ETAP-grade SLD geometry configuration.
 * Defines spacing, sizing, and positioning rules for professional SLD rendering.
 *
 * PR-SLD-ETAP-GEOMETRY-01: ETAP-grade geometria SLD
 *
 * RULES:
 * - WN (HV) busbar at top
 * - Transformer between WN and SN
 * - SN (MV) busbar below transformer
 * - Feeders exit VERTICALLY from SN busbar with constant spacing
 * - No diagonal connections from busbars
 * - All values in pixels, snap to grid
 */
export const ETAP_GEOMETRY = {
  // ---------------------------------------------------------------------------
  // BUSBAR CONFIGURATION
  // ---------------------------------------------------------------------------

  /** Busbar vertical layer configuration (top to bottom) */
  busbarLayers: {
    /** WN (110kV) busbar layer offset from top */
    WN: 100,
    /** SN (15/20kV) busbar layer offset from WN */
    SN: 280,
    /** nN (0.4kV) busbar layer offset from SN (if present) */
    nN: 200,
  },

  /** Busbar dimensions */
  busbar: {
    /** Minimum busbar width (px) */
    minWidth: 200,
    /** Busbar height/thickness (px) */
    height: 8,
    /** Padding on each side for bay connections (px) */
    sidePadding: 40,
    /** Per-bay width increment (px) — busbar expands by this for each bay */
    bayWidthIncrement: 100,
  },

  // ---------------------------------------------------------------------------
  // BAY/FEEDER CONFIGURATION (SN FEEDERS)
  // ---------------------------------------------------------------------------

  /** Bay (pola SN) spacing and layout */
  bay: {
    /** Horizontal spacing between bay center lines (px) */
    spacing: 100,
    /** Minimum horizontal spacing (px) */
    minSpacing: 80,
    /** Vertical offset from SN busbar to first bay element (px) */
    verticalOffset: 60,
    /** Vertical spacing between bay elements (switch → line/load) (px) */
    elementSpacing: 80,
  },

  // ---------------------------------------------------------------------------
  // TRANSFORMER CONFIGURATION
  // ---------------------------------------------------------------------------

  /** Transformer positioning */
  transformer: {
    /** Vertical offset below WN busbar to transformer top (px) */
    offsetFromWN: 80,
    /** Vertical offset from transformer bottom to SN busbar (px) */
    offsetToSN: 80,
    /** Transformer symbol height (px) — for calculating connections */
    symbolHeight: 56,
  },

  // ---------------------------------------------------------------------------
  // SOURCE CONFIGURATION (INFEED)
  // ---------------------------------------------------------------------------

  /** Source (utility feeder / generator) positioning */
  source: {
    /** Vertical offset above WN busbar (px) */
    offsetAboveBusbar: 80,
    /** Source symbol height (px) */
    symbolHeight: 60,
  },

  // ---------------------------------------------------------------------------
  // LOAD CONFIGURATION
  // ---------------------------------------------------------------------------

  /** Load positioning */
  load: {
    /** Vertical offset below feeder/switch (px) */
    offsetBelowFeeder: 60,
    /** Load symbol height (px) */
    symbolHeight: 44,
  },

  // ---------------------------------------------------------------------------
  // CONNECTION ROUTING
  // ---------------------------------------------------------------------------

  /** Connection routing rules */
  routing: {
    /** Connections from busbar must be orthogonal (vertical/horizontal) */
    busbarOrthogonal: true,
    /** Minimum vertical segment length from busbar (px) */
    minBusbarExitLength: 40,
    /** Corridor offset from spine for L/Z routes (px) */
    corridorOffset: 40,
    /** Prefer vertical-first routing */
    preferVertical: true,
  },

  // ---------------------------------------------------------------------------
  // LABEL COLLISION HANDLING
  // ---------------------------------------------------------------------------

  /** Label collision detection and resolution */
  labelCollision: {
    /** Minimum clearance between labels (px) */
    labelLabelClearance: 12,
    /** Minimum clearance between label and symbol (px) */
    labelSymbolClearance: 8,
    /** Maximum nudge distance for collision resolution (px) */
    maxNudgeDistance: 40,
    /** Nudge step size (px) */
    nudgeStep: 8,
    /** Prefer horizontal nudge for label collisions */
    preferHorizontalNudge: true,
  },

  // ---------------------------------------------------------------------------
  // GLOBAL LAYOUT
  // ---------------------------------------------------------------------------

  /** Global layout parameters */
  layout: {
    /** Grid snap size (px) — all positions snap to this */
    gridSize: 20,
    /** Canvas padding from edges (px) */
    padding: 80,
    /** Vertical layer spacing for hierarchical layout (px) */
    layerSpacing: 140,
    /** Horizontal node spacing within a layer (px) */
    nodeSpacing: 100,
  },
} as const;

/**
 * Calculate busbar width based on number of bays.
 * DETERMINISTIC: Same bay count → same width.
 *
 * @param bayCount - Number of bays/feeders connected to the busbar
 * @returns Busbar width in pixels
 */
export function calculateBusbarWidth(bayCount: number): number {
  const { minWidth, sidePadding, bayWidthIncrement } = ETAP_GEOMETRY.busbar;

  // Minimum width + padding on each side + increment per bay
  const calculatedWidth = sidePadding * 2 + Math.max(1, bayCount) * bayWidthIncrement;

  // Return max of calculated and minimum
  return Math.max(minWidth, calculatedWidth);
}

/**
 * Calculate bay positions along a busbar.
 * DETERMINISTIC: Same bay count → same positions.
 *
 * @param bayCount - Number of bays
 * @param busbarCenterX - X coordinate of busbar center
 * @param busbarWidth - Width of the busbar
 * @returns Array of X positions for each bay
 */
export function calculateBayPositions(
  bayCount: number,
  busbarCenterX: number,
  busbarWidth: number
): number[] {
  if (bayCount === 0) return [];

  const { sidePadding } = ETAP_GEOMETRY.busbar;
  const usableWidth = busbarWidth - 2 * sidePadding;

  if (bayCount === 1) {
    // Single bay centered
    return [busbarCenterX];
  }

  // Multiple bays: evenly distributed
  const positions: number[] = [];
  const startX = busbarCenterX - usableWidth / 2;
  const spacing = usableWidth / (bayCount - 1);

  for (let i = 0; i < bayCount; i++) {
    const x = startX + i * spacing;
    // Snap to grid
    const snapped = Math.round(x / ETAP_GEOMETRY.layout.gridSize) * ETAP_GEOMETRY.layout.gridSize;
    positions.push(snapped);
  }

  return positions;
}

/**
 * Label bounding box for collision detection.
 */
export interface LabelBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  ownerId: string;
}

/**
 * Check if two bounding boxes collide with given clearance.
 */
export function checkBoundingBoxCollision(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  clearance: number
): boolean {
  const aLeft = a.x - a.width / 2 - clearance;
  const aRight = a.x + a.width / 2 + clearance;
  const aTop = a.y - a.height / 2 - clearance;
  const aBottom = a.y + a.height / 2 + clearance;

  const bLeft = b.x - b.width / 2;
  const bRight = b.x + b.width / 2;
  const bTop = b.y - b.height / 2;
  const bBottom = b.y + b.height / 2;

  return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
}

/**
 * Resolve label-label collisions deterministically.
 * Returns adjusted positions for labels that collide.
 *
 * DETERMINISTIC: Labels sorted by owner ID, then nudged in consistent direction.
 *
 * @param labels - Array of label bounding boxes
 * @returns Map of ownerId → adjusted position
 */
export function resolveLabelCollisions(
  labels: LabelBoundingBox[]
): Map<string, { x: number; y: number }> {
  const adjustments = new Map<string, { x: number; y: number }>();
  const { labelLabelClearance, maxNudgeDistance, nudgeStep, preferHorizontalNudge } =
    ETAP_GEOMETRY.labelCollision;

  // Sort by owner ID for determinism
  const sortedLabels = [...labels].sort((a, b) => a.ownerId.localeCompare(b.ownerId));

  // Track adjusted positions
  const adjusted: LabelBoundingBox[] = [];

  for (const label of sortedLabels) {
    let currentPos = { x: label.x, y: label.y };
    let hasCollision = true;
    let nudgeCount = 0;

    while (hasCollision && nudgeCount * nudgeStep < maxNudgeDistance) {
      hasCollision = false;

      for (const existing of adjusted) {
        if (
          checkBoundingBoxCollision(
            { ...label, x: currentPos.x, y: currentPos.y },
            existing,
            labelLabelClearance
          )
        ) {
          hasCollision = true;
          // Nudge away from collision
          nudgeCount++;
          if (preferHorizontalNudge) {
            // Alternate left/right based on nudge count
            currentPos.x = label.x + (nudgeCount % 2 === 0 ? -1 : 1) * Math.ceil(nudgeCount / 2) * nudgeStep;
          } else {
            // Nudge down
            currentPos.y = label.y + nudgeCount * nudgeStep;
          }
          break;
        }
      }
    }

    // Store adjustment if position changed
    if (currentPos.x !== label.x || currentPos.y !== label.y) {
      adjustments.set(label.ownerId, currentPos);
    }

    // Add to adjusted list with current position
    adjusted.push({ ...label, x: currentPos.x, y: currentPos.y });
  }

  return adjustments;
}

// =============================================================================
// LINE LABEL PLACEMENT (ETAP 1:1 — ON-LINE LABELS)
// =============================================================================

/**
 * Segment of a connection polyline.
 * Used for deterministic label placement selection.
 */
export interface LineSegment {
  /** Start point */
  start: { x: number; y: number };
  /** End point */
  end: { x: number; y: number };
  /** Segment index in original path */
  index: number;
  /** Segment length (pixels) */
  length: number;
  /** Orientation: 'horizontal' | 'vertical' | 'diagonal' */
  orientation: 'horizontal' | 'vertical' | 'diagonal';
  /** Midpoint of segment */
  midpoint: { x: number; y: number };
  /** Perpendicular direction for label offset (normalized) */
  perpendicular: { x: number; y: number };
}

/**
 * Label position result from placement calculation.
 */
export interface LineLabelPosition {
  /** Label anchor point (on or near the line) */
  position: { x: number; y: number };
  /** Text anchor for SVG text element */
  textAnchor: 'start' | 'middle' | 'end';
  /** Rotation angle (degrees) — 0 for horizontal, 90 for vertical */
  rotation: number;
  /** Selected segment index */
  segmentIndex: number;
  /** Offset direction applied */
  offsetDirection: 'above' | 'below' | 'left' | 'right';
}

/**
 * Calculate length of a segment.
 */
function segmentLength(
  start: { x: number; y: number },
  end: { x: number; y: number }
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Determine segment orientation.
 * DETERMINISTIC: Uses exact threshold (1px tolerance).
 */
function getSegmentOrientation(
  start: { x: number; y: number },
  end: { x: number; y: number }
): 'horizontal' | 'vertical' | 'diagonal' {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const tolerance = 1; // 1px tolerance for orthogonal detection

  if (dy <= tolerance && dx > tolerance) {
    return 'horizontal';
  }
  if (dx <= tolerance && dy > tolerance) {
    return 'vertical';
  }
  return 'diagonal';
}

/**
 * Calculate midpoint of a segment.
 */
function segmentMidpoint(
  start: { x: number; y: number },
  end: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}

/**
 * Calculate perpendicular direction for label offset.
 * DETERMINISTIC: Always returns consistent direction (normalized).
 *
 * For horizontal segments: perpendicular is (0, -1) or (0, 1) — prefer above
 * For vertical segments: perpendicular is (-1, 0) or (1, 0) — prefer left
 * For diagonal: perpendicular is computed, prefer upper-left quadrant
 */
function getPerpendicularDirection(
  start: { x: number; y: number },
  end: { x: number; y: number },
  orientation: 'horizontal' | 'vertical' | 'diagonal'
): { x: number; y: number } {
  if (orientation === 'horizontal') {
    // Perpendicular to horizontal is vertical — prefer ABOVE (negative Y)
    return { x: 0, y: -1 };
  }

  if (orientation === 'vertical') {
    // Perpendicular to vertical is horizontal — prefer LEFT (negative X)
    return { x: -1, y: 0 };
  }

  // Diagonal: compute actual perpendicular
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) {
    return { x: 0, y: -1 }; // Fallback for zero-length
  }

  // Perpendicular: rotate 90° counterclockwise
  let perpX = -dy / len;
  let perpY = dx / len;

  // DETERMINISTIC: Always prefer the direction that is more "up" or "left"
  // (upper-left quadrant preference)
  if (perpY > 0 || (perpY === 0 && perpX > 0)) {
    perpX = -perpX;
    perpY = -perpY;
  }

  return { x: perpX, y: perpY };
}

/**
 * Parse path into segments with computed properties.
 */
export function parsePathSegments(
  path: { x: number; y: number }[]
): LineSegment[] {
  if (!path || path.length < 2) {
    return [];
  }

  const segments: LineSegment[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const start = path[i];
    const end = path[i + 1];
    const length = segmentLength(start, end);
    const orientation = getSegmentOrientation(start, end);
    const midpoint = segmentMidpoint(start, end);
    const perpendicular = getPerpendicularDirection(start, end, orientation);

    segments.push({
      start,
      end,
      index: i,
      length,
      orientation,
      midpoint,
      perpendicular,
    });
  }

  return segments;
}

/**
 * Select best segment for label placement.
 * DETERMINISTIC: Longest segment wins, with tie-breaks.
 *
 * Tie-break rules (in order):
 * 1. Longest segment
 * 2. Prefer horizontal over vertical over diagonal
 * 3. Lower segment index
 */
export function selectLabelSegment(segments: LineSegment[]): LineSegment | null {
  if (!segments || segments.length === 0) {
    return null;
  }

  // Sort with deterministic tie-breaking
  const sorted = [...segments].sort((a, b) => {
    // Primary: longest segment first
    const lengthDiff = b.length - a.length;
    if (Math.abs(lengthDiff) > 0.1) {
      return lengthDiff;
    }

    // Tie-break 1: orientation priority (horizontal > vertical > diagonal)
    const orientationPriority = {
      horizontal: 0,
      vertical: 1,
      diagonal: 2,
    };
    const orientDiff =
      orientationPriority[a.orientation] - orientationPriority[b.orientation];
    if (orientDiff !== 0) {
      return orientDiff;
    }

    // Tie-break 2: lower index
    return a.index - b.index;
  });

  return sorted[0];
}

/**
 * Calculate label position for a line/cable connection.
 * Uses ETAP_LINE_LABEL tokens for offset and placement.
 *
 * @param path - Connection path (polyline points)
 * @param connectionId - Connection ID (for determinism in edge cases)
 * @returns Label position or null if path is too short
 */
export function calculateLineLabelPosition(
  path: { x: number; y: number }[],
  _connectionId?: string
): LineLabelPosition | null {
  const segments = parsePathSegments(path);

  if (segments.length === 0) {
    return null;
  }

  const selectedSegment = selectLabelSegment(segments);

  if (!selectedSegment) {
    return null;
  }

  // Apply offset perpendicular to the line
  const offset = ETAP_LINE_LABEL.offset;
  const labelX = selectedSegment.midpoint.x + selectedSegment.perpendicular.x * offset;
  const labelY = selectedSegment.midpoint.y + selectedSegment.perpendicular.y * offset;

  // Determine offset direction for debugging/testing
  let offsetDirection: 'above' | 'below' | 'left' | 'right';
  if (selectedSegment.orientation === 'horizontal') {
    offsetDirection = selectedSegment.perpendicular.y < 0 ? 'above' : 'below';
  } else if (selectedSegment.orientation === 'vertical') {
    offsetDirection = selectedSegment.perpendicular.x < 0 ? 'left' : 'right';
  } else {
    // Diagonal: use primary direction
    offsetDirection =
      Math.abs(selectedSegment.perpendicular.y) > Math.abs(selectedSegment.perpendicular.x)
        ? selectedSegment.perpendicular.y < 0
          ? 'above'
          : 'below'
        : selectedSegment.perpendicular.x < 0
          ? 'left'
          : 'right';
  }

  // Calculate rotation (0 for horizontal labels, may extend for rotated labels later)
  // ETAP standard: labels are always horizontal for readability
  const rotation = 0;

  return {
    position: { x: labelX, y: labelY },
    textAnchor: 'middle',
    rotation,
    segmentIndex: selectedSegment.index,
    offsetDirection,
  };
}

/**
 * Check if a label position would collide with a symbol bounding box.
 * Used for collision detection in auto-layout.
 *
 * @param labelPosition - Label anchor position
 * @param labelWidth - Estimated label width
 * @param labelHeight - Estimated label height
 * @param symbolBounds - Symbol bounding box { x, y, width, height }
 * @param clearance - Minimum clearance (pixels)
 */
export function checkLabelSymbolCollision(
  labelPosition: { x: number; y: number },
  labelWidth: number,
  labelHeight: number,
  symbolBounds: { x: number; y: number; width: number; height: number },
  clearance: number = ETAP_LINE_LABEL.haloPadding * 2
): boolean {
  // Label bounding box (centered at position)
  const labelLeft = labelPosition.x - labelWidth / 2 - clearance;
  const labelRight = labelPosition.x + labelWidth / 2 + clearance;
  const labelTop = labelPosition.y - labelHeight / 2 - clearance;
  const labelBottom = labelPosition.y + labelHeight / 2 + clearance;

  // Symbol bounding box
  const symbolLeft = symbolBounds.x;
  const symbolRight = symbolBounds.x + symbolBounds.width;
  const symbolTop = symbolBounds.y;
  const symbolBottom = symbolBounds.y + symbolBounds.height;

  // Check AABB intersection
  const overlapsX = labelLeft < symbolRight && labelRight > symbolLeft;
  const overlapsY = labelTop < symbolBottom && labelBottom > symbolTop;

  return overlapsX && overlapsY;
}

/**
 * Apply minimal nudge to avoid collision.
 * DETERMINISTIC: Uses fixed direction preference.
 *
 * @param labelPosition - Original label position
 * @param segment - Selected segment (for direction preference)
 * @param nudgeDistance - Distance to nudge (default: 2x offset)
 * @returns Nudged position
 */
export function nudgeLabelPosition(
  labelPosition: { x: number; y: number },
  segment: LineSegment,
  nudgeDistance: number = ETAP_LINE_LABEL.offset * 2
): { x: number; y: number } {
  // Nudge further in the perpendicular direction
  return {
    x: labelPosition.x + segment.perpendicular.x * nudgeDistance,
    y: labelPosition.y + segment.perpendicular.y * nudgeDistance,
  };
}

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
  // Geometry (PR-SLD-ETAP-GEOMETRY-01)
  GEOMETRY: ETAP_GEOMETRY,
  // Helpers
  getVoltageColor: getEtapVoltageColor,
  getStrokeColor: getEtapStrokeColor,
  getFillColor: getEtapFillColor,
  getOpacity: getEtapOpacity,
  getLabelAnchor: getEtapLabelAnchor,
  getSymbolSize: getEtapSymbolSize,
  getStrokeWidth: getEtapStrokeWidth,
  // Line label placement (ETAP 1:1)
  parsePathSegments,
  selectLabelSegment,
  calculateLineLabelPosition,
  checkLabelSymbolCollision,
  nudgeLabelPosition,
  // Geometry helpers (PR-SLD-ETAP-GEOMETRY-01)
  calculateBusbarWidth,
  calculateBayPositions,
  checkBoundingBoxCollision,
  resolveLabelCollisions,
};
