/**
 * Load Flow Overlay Adapter — Token-Only Mapping
 *
 * Pure function adapter: PowerFlowResultV1 + Interpretation → OverlayPayloadV1.
 *
 * RULES:
 * - NO physics calculations
 * - NO hex colors — only semantic tokens
 * - NO dynamic thresholds — severity from backend interpretation only
 * - Sort element_id before render (deterministic)
 * - Stable React keys
 * - Zero geometry modifications
 * - Zero zoom dependencies
 * - Zero dynamic thickness
 *
 * Overlay modes:
 * - voltage: Bus voltage overlay (v_pu as badge, severity from interpretation)
 * - loading: Branch loading overlay (losses as badge, severity from interpretation)
 * - flow: Power flow direction (P_from/P_to as badges, direction as animation)
 */

import type {
  PowerFlowResultV1,
  PowerFlowInterpretation,
  VoltageFinding,
  BranchLoadingFinding,
  LoadFlowOverlayMode,
  FindingSeverity,
} from '../power-flow-results/types';
import type {
  OverlayPayloadV1,
  OverlayElement,
  OverlayLegendEntry,
  OverlayVisualState,
} from './overlayTypes';

// =============================================================================
// Severity → Token Mapping (deterministic, no physics)
// =============================================================================

const SEVERITY_TO_VISUAL_STATE: Readonly<Record<FindingSeverity, OverlayVisualState>> = {
  INFO: 'OK',
  WARN: 'WARNING',
  HIGH: 'CRITICAL',
};

const SEVERITY_TO_COLOR_TOKEN: Readonly<Record<FindingSeverity, string>> = {
  INFO: 'ok',
  WARN: 'warning',
  HIGH: 'critical',
};

/**
 * Default visual state for elements without interpretation findings.
 * Elements without findings are assumed OK (no issues detected by backend).
 */
const DEFAULT_VISUAL_STATE: OverlayVisualState = 'OK';
const DEFAULT_COLOR_TOKEN = 'ok';
const DEFAULT_STROKE_TOKEN = 'normal';

// =============================================================================
// Voltage Overlay
// =============================================================================

/**
 * Build voltage overlay from bus results + interpretation.
 *
 * DETERMINISTIC: Sort by bus_id (lexicographic).
 * PURE: No side effects, no physics.
 */
function buildVoltageOverlay(
  results: PowerFlowResultV1,
  interpretation: PowerFlowInterpretation | null,
  runId: string
): OverlayPayloadV1 {
  // Index findings by bus_id for O(1) lookup
  const findingsByBus = new Map<string, VoltageFinding>();
  if (interpretation) {
    for (const finding of interpretation.voltage_findings) {
      findingsByBus.set(finding.bus_id, finding);
    }
  }

  // Sort buses by bus_id (deterministic)
  const sortedBuses = [...results.bus_results].sort((a, b) =>
    a.bus_id.localeCompare(b.bus_id)
  );

  const elements: OverlayElement[] = sortedBuses.map((bus) => {
    const finding = findingsByBus.get(bus.bus_id);
    const severity = finding?.severity;

    return {
      element_ref: bus.bus_id,
      element_type: 'Bus',
      visual_state: severity ? SEVERITY_TO_VISUAL_STATE[severity] : DEFAULT_VISUAL_STATE,
      numeric_badges: {
        v_pu: bus.v_pu,
        angle_deg: bus.angle_deg,
      },
      color_token: severity ? SEVERITY_TO_COLOR_TOKEN[severity] : DEFAULT_COLOR_TOKEN,
      stroke_token: DEFAULT_STROKE_TOKEN,
      animation_token: null,
    };
  });

  return {
    run_id: runId,
    analysis_type: 'LOAD_FLOW',
    elements,
    legend: VOLTAGE_LEGEND,
  };
}

// =============================================================================
// Loading Overlay
// =============================================================================

/**
 * Build loading overlay from branch results + interpretation.
 *
 * DETERMINISTIC: Sort by branch_id (lexicographic).
 * PURE: No side effects, no physics.
 */
function buildLoadingOverlay(
  results: PowerFlowResultV1,
  interpretation: PowerFlowInterpretation | null,
  runId: string
): OverlayPayloadV1 {
  // Index findings by branch_id for O(1) lookup
  const findingsByBranch = new Map<string, BranchLoadingFinding>();
  if (interpretation) {
    for (const finding of interpretation.branch_findings) {
      findingsByBranch.set(finding.branch_id, finding);
    }
  }

  // Sort branches by branch_id (deterministic)
  const sortedBranches = [...results.branch_results].sort((a, b) =>
    a.branch_id.localeCompare(b.branch_id)
  );

  const elements: OverlayElement[] = sortedBranches.map((branch) => {
    const finding = findingsByBranch.get(branch.branch_id);
    const severity = finding?.severity;

    return {
      element_ref: branch.branch_id,
      element_type: 'LineBranch',
      visual_state: severity ? SEVERITY_TO_VISUAL_STATE[severity] : DEFAULT_VISUAL_STATE,
      numeric_badges: {
        losses_p_mw: branch.losses_p_mw,
        losses_q_mvar: branch.losses_q_mvar,
        loading_pct: finding?.loading_pct ?? null,
      },
      color_token: severity ? SEVERITY_TO_COLOR_TOKEN[severity] : DEFAULT_COLOR_TOKEN,
      stroke_token: DEFAULT_STROKE_TOKEN,
      animation_token: null,
    };
  });

  return {
    run_id: runId,
    analysis_type: 'LOAD_FLOW',
    elements,
    legend: LOADING_LEGEND,
  };
}

// =============================================================================
// Flow Direction Overlay
// =============================================================================

/**
 * Build flow direction overlay from branch results.
 *
 * DETERMINISTIC: Sort by branch_id (lexicographic).
 * PURE: No side effects, no physics.
 *
 * Flow direction is determined by sign of P_from:
 * - P_from > 0: power flows from → to (normal)
 * - P_from < 0: power flows to → from (reverse)
 * - P_from = 0: no flow
 *
 * This is NOT a physics calculation — it's reading the sign of an
 * existing backend result value for visual indication only.
 */
function buildFlowOverlay(
  results: PowerFlowResultV1,
  _interpretation: PowerFlowInterpretation | null,
  runId: string
): OverlayPayloadV1 {
  // Sort branches by branch_id (deterministic)
  const sortedBranches = [...results.branch_results].sort((a, b) =>
    a.branch_id.localeCompare(b.branch_id)
  );

  const elements: OverlayElement[] = sortedBranches.map((branch) => {
    // Flow direction from sign of P_from (pure value reading, not physics)
    const hasFlow = branch.p_from_mw !== 0;

    return {
      element_ref: branch.branch_id,
      element_type: 'LineBranch',
      visual_state: hasFlow ? 'OK' as OverlayVisualState : 'INACTIVE' as OverlayVisualState,
      numeric_badges: {
        p_from_mw: branch.p_from_mw,
        q_from_mvar: branch.q_from_mvar,
        p_to_mw: branch.p_to_mw,
        q_to_mvar: branch.q_to_mvar,
      },
      color_token: hasFlow ? 'ok' : 'inactive',
      stroke_token: DEFAULT_STROKE_TOKEN,
      animation_token: hasFlow ? 'pulse' : null,
    };
  });

  return {
    run_id: runId,
    analysis_type: 'LOAD_FLOW',
    elements,
    legend: FLOW_LEGEND,
  };
}

// =============================================================================
// Legend Definitions (static, deterministic)
// =============================================================================

const VOLTAGE_LEGEND: OverlayLegendEntry[] = [
  { color_token: 'ok', label: 'Norma', description: null },
  { color_token: 'warning', label: 'Ostrzeżenie', description: null },
  { color_token: 'critical', label: 'Krytyczne', description: null },
];

const LOADING_LEGEND: OverlayLegendEntry[] = [
  { color_token: 'ok', label: 'Norma', description: null },
  { color_token: 'warning', label: 'Ostrzeżenie', description: null },
  { color_token: 'critical', label: 'Krytyczne', description: null },
];

const FLOW_LEGEND: OverlayLegendEntry[] = [
  { color_token: 'ok', label: 'Przepływ aktywny', description: null },
  { color_token: 'inactive', label: 'Brak przepływu', description: null },
];

// =============================================================================
// Public API
// =============================================================================

/**
 * Build Load Flow overlay payload for SLD.
 *
 * PURE FUNCTION: Same inputs → identical output. No side effects.
 * DETERMINISTIC: Elements sorted by element_id.
 * TOKEN-ONLY: No hex colors, no physics thresholds.
 *
 * Severity mapping uses backend interpretation findings.
 * If no interpretation is available, all elements default to OK state.
 *
 * @param results - PowerFlowResultV1 from backend
 * @param interpretation - PowerFlowInterpretation from backend (nullable)
 * @param mode - Overlay display mode (voltage/loading/flow)
 * @param runId - Binding run ID for overlay
 * @returns OverlayPayloadV1 ready for OverlayEngine
 */
export function buildLoadFlowOverlay(
  results: PowerFlowResultV1,
  interpretation: PowerFlowInterpretation | null,
  mode: LoadFlowOverlayMode,
  runId: string
): OverlayPayloadV1 {
  switch (mode) {
    case 'voltage':
      return buildVoltageOverlay(results, interpretation, runId);
    case 'loading':
      return buildLoadingOverlay(results, interpretation, runId);
    case 'flow':
      return buildFlowOverlay(results, interpretation, runId);
  }
}
