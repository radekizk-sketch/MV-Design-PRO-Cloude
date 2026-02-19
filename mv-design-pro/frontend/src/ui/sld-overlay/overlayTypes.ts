/**
 * SLD Overlay Runtime Types — PR-16
 *
 * CANONICAL ALIGNMENT:
 * - Backend: domain/result_set.py OverlayPayloadV1
 * - sld_rules.md § B: Results as Overlay (never modifies model)
 *
 * INVARIANTS:
 * - Types mirror backend OverlayPayloadV1 contract 1:1
 * - NO physics types (no impedance, no power factor, etc.)
 * - NO hex colors — only semantic tokens
 * - All visual decisions made by backend analysis layer
 */

/**
 * Visual state of an overlay element.
 * Determined by backend analysis layer, NOT by UI.
 */
export type OverlayVisualState = 'OK' | 'WARNING' | 'CRITICAL' | 'INACTIVE';

/**
 * Single overlay element — visual state for one SLD symbol.
 *
 * INVARIANTS:
 * - element_ref matches NetworkModel element ID (bijection with SLD symbol)
 * - visual_state is pre-computed by analysis layer
 * - color_token is semantic, NOT hex
 * - numeric_badges are display-only values
 */
export interface OverlayElement {
  /** Element ID in NetworkModel (bijection with SLD symbol elementId) */
  element_ref: string;

  /** Element type (Bus, LineBranch, etc.) */
  element_type: string;

  /** Visual state token (determined by analysis, NOT by UI) */
  visual_state: OverlayVisualState;

  /** Pre-computed numeric display values */
  numeric_badges: Record<string, number | null>;

  /** Semantic color token */
  color_token: string;

  /** Semantic stroke token */
  stroke_token: string;

  /** Optional animation token (null = no animation) */
  animation_token: string | null;
}

/**
 * Legend entry for overlay display.
 *
 * INVARIANTS:
 * - label is Polish text from backend
 * - color_token matches tokens used in OverlayElement
 * - UI does NOT generate legend entries
 */
export interface OverlayLegendEntry {
  /** Semantic color token matching overlay elements */
  color_token: string;

  /** Polish label */
  label: string;

  /** Optional description */
  description: string | null;
}

/**
 * Complete overlay payload from backend — V1 contract.
 *
 * INVARIANTS:
 * - run_id is BINDING — overlay tied to specific calculation run
 * - analysis_type identifies the source analysis
 * - 100% deterministic (same run_id → same payload)
 * - NO hex colors, NO physics calculations
 */
export interface OverlayPayloadV1 {
  /** Binding reference to calculation run */
  run_id: string;

  /** Analysis type (SC_3F, SC_1F, LOAD_FLOW, PROTECTION) */
  analysis_type: string;

  /** Overlay data for affected elements */
  elements: OverlayElement[];

  /** Legend entries for this overlay */
  legend: OverlayLegendEntry[];
}

/**
 * Analysis overlay type identifiers.
 * Used by backend to tag overlay payloads with their source analysis.
 */
export type OverlayAnalysisType =
  | 'SC_3F'
  | 'SC_1F'
  | 'LOAD_FLOW'
  | 'PROTECTION_COVERAGE'
  | 'VOLTAGE_PROFILE'
  | 'OVERLOAD'
  | 'VARIANT_DELTA';

/**
 * Power flow overlay numeric badges (pre-computed by backend).
 * NO physics in frontend — all values are backend-provided.
 */
export interface PowerFlowOverlayBadges {
  /** Active power [kW] */
  p_kw: number | null;
  /** Reactive power [kvar] */
  q_kvar: number | null;
  /** Current [A] */
  i_a: number | null;
  /** Loading [%] */
  loading_percent: number | null;
  /** Voltage [pu] */
  v_pu: number | null;
}

/**
 * Short circuit overlay numeric badges.
 */
export interface ShortCircuitOverlayBadges {
  /** Initial symmetrical SC current [kA] */
  ik_3f_ka: number | null;
  /** Peak SC current [kA] */
  ip_ka: number | null;
  /** Thermal SC current [kA] */
  ith_ka: number | null;
}

/**
 * Protection coverage overlay badges.
 */
export interface ProtectionCoverageOverlayBadges {
  /** Whether the element is protected by a relay */
  is_protected: boolean;
  /** Relay name (Polish) or null if unprotected */
  relay_name_pl: string | null;
  /** Sensitivity ratio (Ik_min / I_pickup) */
  sensitivity_ratio: number | null;
  /** Coordination verdict */
  coordination_verdict: 'OK' | 'NA_GRANICY' | 'NIE_OK' | null;
}

/**
 * Variant delta overlay badges for A/B comparison.
 */
export interface VariantDeltaOverlayBadges {
  /** Delta token: ADDED, REMOVED, MODIFIED, UNCHANGED */
  delta_token: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
  /** Change description (Polish) */
  change_description_pl: string | null;
}

/**
 * Color token → CSS class mapping.
 * Deterministic, no physics, no heuristics.
 * Includes delta overlay tokens (PR-21) and industrial overlay tokens.
 */
export const COLOR_TOKEN_MAP: Readonly<Record<string, string>> = {
  ok: 'sld-overlay-ok',
  warning: 'sld-overlay-warning',
  critical: 'sld-overlay-critical',
  inactive: 'sld-overlay-inactive',
  // Delta overlay tokens (PR-21)
  delta_none: 'sld-overlay-ok',
  delta_change: 'sld-overlay-warning',
  delta_inactive: 'sld-overlay-inactive',
  // Protection coverage tokens
  protected: 'sld-overlay-ok',
  unprotected: 'sld-overlay-critical',
  marginal: 'sld-overlay-warning',
  // Variant comparison tokens
  variant_added: 'sld-overlay-variant-added',
  variant_removed: 'sld-overlay-variant-removed',
  variant_modified: 'sld-overlay-variant-modified',
  variant_unchanged: 'sld-overlay-inactive',
  // Overload tokens
  overload_none: 'sld-overlay-ok',
  overload_warning: 'sld-overlay-warning',
  overload_critical: 'sld-overlay-critical',
} as const;

/**
 * Stroke token → CSS class mapping.
 * Deterministic, no physics.
 */
export const STROKE_TOKEN_MAP: Readonly<Record<string, string>> = {
  normal: 'sld-overlay-stroke-normal',
  bold: 'sld-overlay-stroke-bold',
  dashed: 'sld-overlay-stroke-dashed',
} as const;

/**
 * Animation token → CSS class mapping.
 * Deterministic, no physics.
 */
export const ANIMATION_TOKEN_MAP: Readonly<Record<string, string>> = {
  pulse: 'sld-overlay-anim-pulse',
  blink: 'sld-overlay-anim-blink',
} as const;

/**
 * Visual state → tailwind bg class mapping (for legend/badges).
 * Deterministic, derived from token semantics only.
 */
export const VISUAL_STATE_STYLE: Readonly<
  Record<OverlayVisualState, { bg: string; text: string; border: string }>
> = {
  OK: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  WARNING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  CRITICAL: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
  INACTIVE: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-300' },
} as const;

/**
 * Resolved style for a single overlay element.
 * Pre-computed by OverlayEngine, consumed by rendering layer.
 */
export interface ResolvedOverlayStyle {
  /** Element reference (for matching to SLD symbol) */
  elementRef: string;

  /** CSS class for color (from color_token) */
  colorClass: string;

  /** CSS class for stroke (from stroke_token) */
  strokeClass: string;

  /** CSS class for animation (from animation_token, empty if none) */
  animationClass: string;

  /** Visual state badge style */
  stateBg: string;
  stateText: string;
  stateBorder: string;

  /** Visual state label */
  visualState: OverlayVisualState;

  /** Numeric badges (display-only) */
  numericBadges: Record<string, number | null>;
}
