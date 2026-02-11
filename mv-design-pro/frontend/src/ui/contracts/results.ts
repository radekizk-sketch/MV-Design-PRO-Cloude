/**
 * Result Contract v1 — TypeScript canonical types (PR-15)
 *
 * Mirror of backend Pydantic v2 models:
 *   domain.result_contract_v1.ResultSetV1
 *
 * INVARIANTS:
 * - contract_version = "1.0"
 * - overlay_payload is the SOLE source for SLD overlay
 * - UI interprets overlay_payload only — never raw solver output
 * - All labels in Polish (no project codenames)
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type OverlaySeverity = 'INFO' | 'WARNING' | 'IMPORTANT' | 'BLOCKER';

export type OverlayMetricSource = 'solver' | 'validation' | 'readiness';

export type OverlayElementKind =
  | 'bus'
  | 'branch'
  | 'device'
  | 'substation'
  | 'bay'
  | 'junction'
  | 'corridor'
  | 'transformer'
  | 'load'
  | 'generator'
  | 'measurement'
  | 'protection_assignment';

// ---------------------------------------------------------------------------
// Overlay Metric
// ---------------------------------------------------------------------------

export interface OverlayMetricV1 {
  /** Metric code: U_kV, I_A, S_MVA, IK_3F_A, IK_1F_A, P_MW, Q_Mvar, etc. */
  code: string;
  /** Metric value */
  value: number | string;
  /** Physical unit string (kV, A, MVA, MW, Mvar, %, p.u.) */
  unit: string;
  /** UI format hint: fixed0, fixed2, fixed4, kilo, percent */
  format_hint: string;
  /** Data source */
  source: OverlayMetricSource;
}

// ---------------------------------------------------------------------------
// Overlay Badge
// ---------------------------------------------------------------------------

export interface OverlayBadgeV1 {
  /** Badge label (Polish) */
  label: string;
  /** Badge severity */
  severity: OverlaySeverity;
  /** Machine-stable badge code */
  code: string;
}

// ---------------------------------------------------------------------------
// Overlay Warning (UI-level, NOT solver)
// ---------------------------------------------------------------------------

export interface OverlayWarningV1 {
  /** Warning code */
  code: string;
  /** Warning message (Polish) */
  message: string;
  /** Severity */
  severity: OverlaySeverity;
  /** Affected element ref_id (optional) */
  element_ref: string | null;
}

// ---------------------------------------------------------------------------
// Overlay Legend
// ---------------------------------------------------------------------------

export interface OverlayLegendEntryV1 {
  severity: OverlaySeverity;
  /** Legend label (Polish) */
  label: string;
  /** Legend description (Polish) */
  description: string;
}

export interface OverlayLegendV1 {
  /** Legend title (Polish) */
  title: string;
  entries: OverlayLegendEntryV1[];
}

// ---------------------------------------------------------------------------
// Overlay Element
// ---------------------------------------------------------------------------

export interface OverlayElementV1 {
  /** Element ref_id (matches ENM) */
  ref_id: string;
  /** Element kind for rendering */
  kind: OverlayElementKind;
  /** Badges from readiness/validation */
  badges: OverlayBadgeV1[];
  /** Typed metrics keyed by metric code */
  metrics: Record<string, OverlayMetricV1>;
  /** Aggregate severity for UI rendering */
  severity: OverlaySeverity;
}

// ---------------------------------------------------------------------------
// Overlay Payload (bridge to SLD — PR-16)
// ---------------------------------------------------------------------------

export interface OverlayPayloadV1 {
  /** Element overlays keyed by element ref_id */
  elements: Record<string, OverlayElementV1>;
  /** Overlay legend */
  legend: OverlayLegendV1;
  /** UI-level warnings (not solver) */
  warnings: OverlayWarningV1[];
}

// ---------------------------------------------------------------------------
// Element Result
// ---------------------------------------------------------------------------

export interface ElementResultV1 {
  /** Element ref_id */
  element_ref: string;
  /** Element type (Bus, Branch, Transformer, etc.) */
  element_type: string;
  /** Analysis-specific result values */
  values: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// ResultSetV1 (top-level canonical result set)
// ---------------------------------------------------------------------------

export interface ResultSetV1 {
  /** Contract version (frozen: "1.0") */
  contract_version: string;
  /** Run UUID */
  run_id: string;
  /** Analysis type: SC_3F, SC_1F, LOAD_FLOW */
  analysis_type: string;
  /** SHA-256 of canonical solver input */
  solver_input_hash: string;
  /** UTC ISO timestamp (NOT in deterministic signature) */
  created_at: string;
  /** SHA-256 of canonical JSON (excludes transient fields) */
  deterministic_signature: string;
  /** Analysis-wide summary values */
  global_results: Record<string, unknown>;
  /** Per-element results (sorted by element_ref) */
  element_results: ElementResultV1[];
  /** Overlay payload for SLD (bridge to PR-16) */
  overlay_payload: OverlayPayloadV1;
}

// ---------------------------------------------------------------------------
// Overlay Map (adapter output for SLD)
// ---------------------------------------------------------------------------

/**
 * OverlayMapEntry — flattened entry for SLD overlay rendering.
 * Produced by toOverlayMap() adapter.
 */
export interface OverlayMapEntry {
  ref_id: string;
  kind: OverlayElementKind;
  severity: OverlaySeverity;
  badges: OverlayBadgeV1[];
  metrics: OverlayMetricV1[];
}

/**
 * OverlayMap — keyed by element ref_id.
 * This is what SLD consumes in PR-16.
 */
export type OverlayMap = Map<string, OverlayMapEntry>;

// ---------------------------------------------------------------------------
// Adapter: toOverlayMap
// ---------------------------------------------------------------------------

/**
 * Convert ResultSetV1 to OverlayMap for SLD overlay rendering.
 *
 * INVARIANT: UI interprets overlay_payload only — never raw solver output.
 * The adapter is deterministic: same input → same output.
 *
 * @param resultset - ResultSetV1 from API
 * @returns OverlayMap keyed by element ref_id
 */
export function toOverlayMap(resultset: ResultSetV1): OverlayMap {
  const map: OverlayMap = new Map();
  const elements = resultset.overlay_payload.elements;

  // Sort by ref_id for deterministic iteration
  const sortedRefs = Object.keys(elements).sort();

  for (const refId of sortedRefs) {
    const elem = elements[refId];
    if (!elem) continue;

    // Convert metrics dict to sorted array
    const metricKeys = Object.keys(elem.metrics).sort();
    const metrics: OverlayMetricV1[] = metricKeys.map((k) => elem.metrics[k]);

    map.set(refId, {
      ref_id: elem.ref_id,
      kind: elem.kind,
      severity: elem.severity,
      badges: [...elem.badges],
      metrics,
    });
  }

  return map;
}
