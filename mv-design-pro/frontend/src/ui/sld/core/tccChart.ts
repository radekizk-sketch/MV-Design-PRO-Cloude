/**
 * TCC Chart Types — Time-Current Characteristic chart contract (TypeScript).
 *
 * Types and utilities for rendering protection coordination TCC diagrams.
 * TCC charts display relay/fuse curves on log-log axes (current vs time).
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md: Protection layer visualization
 * - IEC 60255: Relay characteristic curves
 * - WHITE BOX: All curve computation steps are auditable
 */

// =============================================================================
// CURVE TYPES
// =============================================================================

/**
 * IEC standard curve types for overcurrent protection.
 * DT = Definite Time, IEC_SI/VI/EI/LI = Inverse time per IEC 60255.
 */
export type TCCCurveType = 'DT' | 'IEC_SI' | 'IEC_VI' | 'IEC_EI' | 'IEC_LI';

/**
 * Single point on a TCC curve (current [A] vs time [s]).
 */
export interface TCCCurvePointV1 {
  /** Current in amperes. */
  readonly current_a: number;
  /** Operating time in seconds. */
  readonly time_s: number;
}

/**
 * TCC curve data — represents one protection device characteristic.
 */
export interface TCCCurveDataV1 {
  /** IEC curve type. */
  readonly curve_type: TCCCurveType;
  /** Pickup (threshold) current in amperes. */
  readonly pickup_a: number;
  /** Time Multiplier Setting (TMS) — scaling factor for inverse curves. */
  readonly tms: number;
  /** Computed curve points (sorted by ascending current_a). */
  readonly points: readonly TCCCurvePointV1[];
  /** Device/relay label for the legend. */
  readonly label: string;
  /** Optional device element reference ID. */
  readonly device_ref: string | null;
}

// =============================================================================
// CHART CONFIGURATION
// =============================================================================

/**
 * Axis configuration for TCC chart (log-log scale).
 */
export interface TCCAxisConfigV1 {
  /** Axis label (Polish). */
  readonly label: string;
  /** Minimum value (log-scale boundary). */
  readonly min: number;
  /** Maximum value (log-scale boundary). */
  readonly max: number;
  /** Unit string. */
  readonly unit: string;
}

/**
 * TCC chart configuration — defines axes and display parameters.
 */
export interface TCCChartConfigV1 {
  /** X-axis: current [A] — log scale. */
  readonly x_axis: TCCAxisConfigV1;
  /** Y-axis: time [s] — log scale. */
  readonly y_axis: TCCAxisConfigV1;
  /** Log-log scale flag (always true for TCC). */
  readonly log_log_scale: true;
  /** Chart title (Polish). */
  readonly title: string;
}

// =============================================================================
// FAULT MARKERS
// =============================================================================

/**
 * Short-circuit fault type for TCC markers.
 */
export type TCCFaultType = 'Ik3' | 'Ik1' | 'Imin';

/**
 * Fault marker on TCC chart — vertical line at fault current level.
 */
export interface TCCFaultMarkerV1 {
  /** Fault current in amperes. */
  readonly fault_current_a: number;
  /** Fault type. */
  readonly type: TCCFaultType;
  /** Label for the marker (Polish). */
  readonly label: string;
  /** Optional bus/element reference ID. */
  readonly element_ref: string | null;
}

// =============================================================================
// SELECTIVITY RESULT
// =============================================================================

/**
 * Selectivity verdict between upstream and downstream protection.
 */
export type SelectivityVerdict = 'SELECTIVE' | 'NON_SELECTIVE' | 'MARGINAL';

/**
 * Selectivity analysis result between two protection devices.
 */
export interface TCCSelectivityResultV1 {
  /** Upstream device reference ID. */
  readonly upstream: string;
  /** Downstream device reference ID. */
  readonly downstream: string;
  /** Time margin in seconds (upstream_time - downstream_time at Ik3). */
  readonly margin_s: number;
  /** Selectivity verdict. */
  readonly verdict: SelectivityVerdict;
  /** Upstream device label. */
  readonly upstream_label: string;
  /** Downstream device label. */
  readonly downstream_label: string;
}

// =============================================================================
// IEC 60255 CURVE CONSTANTS
// =============================================================================

/**
 * IEC 60255 inverse-time curve constants.
 * Formula: t = TMS * k / ((I/Ip)^alpha - 1)
 * where I = fault current, Ip = pickup current.
 */
interface IECCurveConstants {
  readonly k: number;
  readonly alpha: number;
}

const IEC_CURVE_CONSTANTS: Record<Exclude<TCCCurveType, 'DT'>, IECCurveConstants> = {
  IEC_SI: { k: 0.14, alpha: 0.02 },
  IEC_VI: { k: 13.5, alpha: 1.0 },
  IEC_EI: { k: 80.0, alpha: 2.0 },
  IEC_LI: { k: 120.0, alpha: 1.0 },
};

// =============================================================================
// BUILDER
// =============================================================================

/**
 * Settings for building TCC curve points.
 */
export interface TCCCurveSettings {
  /** IEC curve type. */
  readonly curve_type: TCCCurveType;
  /** Pickup current in amperes. */
  readonly pickup_a: number;
  /** Time Multiplier Setting. */
  readonly tms: number;
  /** Device/relay label. */
  readonly label: string;
  /** Optional device element reference ID. */
  readonly device_ref?: string | null;
  /** Number of points to generate (default: 50). */
  readonly num_points?: number;
  /** Current multiplier range: [min_mult, max_mult] of pickup (default: [1.1, 40]). */
  readonly multiplier_range?: readonly [number, number];
}

/**
 * Compute operating time for IEC 60255 inverse-time curves.
 *
 * WHITE BOX: t = TMS * k / ((I/Ip)^alpha - 1)
 *
 * @param current_a - Fault current [A]
 * @param pickup_a - Pickup current [A]
 * @param tms - Time Multiplier Setting
 * @param constants - IEC curve constants (k, alpha)
 * @returns Operating time [s], or null if current <= pickup
 */
function computeIECTime(
  current_a: number,
  pickup_a: number,
  tms: number,
  constants: IECCurveConstants,
): number | null {
  if (current_a <= pickup_a || pickup_a <= 0) {
    return null;
  }
  const ratio = current_a / pickup_a;
  const denominator = Math.pow(ratio, constants.alpha) - 1;
  if (denominator <= 0) {
    return null;
  }
  return tms * constants.k / denominator;
}

/**
 * Build TCC curve points from protection settings.
 *
 * WHITE BOX: All intermediate values (ratio, denominator) are computable
 * from the returned points and input settings.
 *
 * @param settings - Curve generation settings
 * @returns TCCCurveDataV1 with computed points
 */
export function buildTCCCurvePoints(settings: TCCCurveSettings): TCCCurveDataV1 {
  const {
    curve_type,
    pickup_a,
    tms,
    label,
    device_ref = null,
    num_points = 50,
    multiplier_range = [1.1, 40],
  } = settings;

  const [minMult, maxMult] = multiplier_range;
  const points: TCCCurvePointV1[] = [];

  if (curve_type === 'DT') {
    // Definite Time: constant time above pickup
    // Two points define the horizontal line
    points.push(
      { current_a: pickup_a * minMult, time_s: tms },
      { current_a: pickup_a * maxMult, time_s: tms },
    );
  } else {
    // IEC inverse-time curves
    const constants = IEC_CURVE_CONSTANTS[curve_type];

    // Generate logarithmically-spaced multiplier values
    const logMin = Math.log10(minMult);
    const logMax = Math.log10(maxMult);

    for (let i = 0; i < num_points; i++) {
      const logMult = logMin + (logMax - logMin) * i / (num_points - 1);
      const mult = Math.pow(10, logMult);
      const current_a = pickup_a * mult;

      const time_s = computeIECTime(current_a, pickup_a, tms, constants);
      if (time_s !== null && time_s > 0 && isFinite(time_s)) {
        points.push({ current_a, time_s });
      }
    }
  }

  return {
    curve_type,
    pickup_a,
    tms,
    points,
    label,
    device_ref,
  };
}

// =============================================================================
// DEFAULT CHART CONFIG
// =============================================================================

/**
 * Default TCC chart configuration.
 * X-axis: 1 A to 100 kA, Y-axis: 0.01 s to 1000 s.
 */
export const DEFAULT_TCC_CHART_CONFIG: TCCChartConfigV1 = {
  x_axis: {
    label: 'Prad [A]',
    min: 1,
    max: 100_000,
    unit: 'A',
  },
  y_axis: {
    label: 'Czas [s]',
    min: 0.01,
    max: 1000,
    unit: 's',
  },
  log_log_scale: true,
  title: 'Charakterystyka czasowo-pradowa (TCC)',
};

// =============================================================================
// LOG-SCALE MAPPING UTILITIES
// =============================================================================

/**
 * Map a value to log-scale pixel position within a given pixel range.
 *
 * @param value - The value to map (must be > 0)
 * @param minValue - Axis minimum (must be > 0)
 * @param maxValue - Axis maximum (must be > minValue)
 * @param pixelRange - Total pixel range [px]
 * @returns Pixel position (0 = minValue, pixelRange = maxValue)
 */
export function mapToLogScale(
  value: number,
  minValue: number,
  maxValue: number,
  pixelRange: number,
): number {
  if (value <= 0 || minValue <= 0 || maxValue <= minValue) {
    return 0;
  }
  const logMin = Math.log10(minValue);
  const logMax = Math.log10(maxValue);
  const logValue = Math.log10(value);
  return ((logValue - logMin) / (logMax - logMin)) * pixelRange;
}

/**
 * Inverse mapping: pixel position back to value on log scale.
 *
 * @param pixel - Pixel position
 * @param minValue - Axis minimum
 * @param maxValue - Axis maximum
 * @param pixelRange - Total pixel range [px]
 * @returns Value corresponding to the pixel position
 */
export function mapFromLogScale(
  pixel: number,
  minValue: number,
  maxValue: number,
  pixelRange: number,
): number {
  if (minValue <= 0 || maxValue <= minValue || pixelRange <= 0) {
    return minValue;
  }
  const logMin = Math.log10(minValue);
  const logMax = Math.log10(maxValue);
  const logValue = logMin + (pixel / pixelRange) * (logMax - logMin);
  return Math.pow(10, logValue);
}
