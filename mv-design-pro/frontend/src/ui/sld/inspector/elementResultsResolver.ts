/**
 * Element Results Resolver — RUN #3G §4 (COMMIT C).
 *
 * Pure function: elementId → InspectorResultData from cached solver results.
 *
 * Lookup chain:
 *   1. busResults.rows → match bus_id
 *   2. branchResults.rows → match branch_id
 *   3. shortCircuitResults.rows → match target_id
 *
 * DETERMINISTIC: same elementId + same cached results → same InspectorResultData.
 * BINDING: No physics. No mutations. Polish labels in consumer, not here.
 * READ-ONLY: Pure lookup, no side effects.
 */

import type { InspectorResultData } from './types';
import type {
  BusResults,
  BranchResults,
  ShortCircuitResults,
  BusResultRow,
  BranchResultRow,
  ShortCircuitRow,
} from '../../results-inspector/types';
import type { FieldDeviceResultDataV1 } from './fieldDeviceInspector';

// ---------------------------------------------------------------------------
// Core resolver: elementId → InspectorResultData
// ---------------------------------------------------------------------------

/**
 * Resolve solver results for a given elementId.
 *
 * Searches in order: buses → branches → short-circuit.
 * Returns null if no match found in any table, or if all tables are null.
 *
 * @param elementId - The element's stable ID (bus_id, branch_id, or target_id)
 * @param busResults - Cached bus results (may be null if not loaded)
 * @param branchResults - Cached branch results (may be null if not loaded)
 * @param shortCircuitResults - Cached SC results (may be null if not loaded)
 */
export function resolveElementResults(
  elementId: string,
  busResults: BusResults | null,
  branchResults: BranchResults | null,
  shortCircuitResults: ShortCircuitResults | null,
): InspectorResultData | null {
  if (!elementId) return null;

  // 1. Try bus match
  const busRow = busResults?.rows.find(
    (r: BusResultRow) => r.bus_id === elementId,
  );
  if (busRow) {
    return {
      voltage_kv: busRow.u_kv,
      voltage_pu: busRow.u_pu,
      current_a: null,
      loading_pct: null,
      voltage_drop_pct: null,
      p_mw: null,
      q_mvar: null,
      s_mva: null,
    };
  }

  // 2. Try branch match
  const branchRow = branchResults?.rows.find(
    (r: BranchResultRow) => r.branch_id === elementId,
  );
  if (branchRow) {
    return {
      voltage_kv: null,
      voltage_pu: null,
      current_a: branchRow.i_a,
      loading_pct: branchRow.loading_pct,
      voltage_drop_pct: null,
      p_mw: branchRow.p_mw,
      q_mvar: branchRow.q_mvar,
      s_mva: branchRow.s_mva,
    };
  }

  // 3. No direct match — return null (explicit "brak wynikow")
  return null;
}

// ---------------------------------------------------------------------------
// Field/Device result resolver: elementId → FieldDeviceResultDataV1
// ---------------------------------------------------------------------------

/**
 * Resolve SC results for a field/device element (apparatus-level).
 *
 * Maps elementId to short-circuit data from the SC results table.
 * Used by the field/device inspector (buildResultsSection).
 *
 * @returns FieldDeviceResultDataV1 with SC data, or "brak wynikow" object.
 */
export function resolveFieldDeviceResults(
  elementId: string,
  elementType: 'field' | 'device',
  shortCircuitResults: ShortCircuitResults | null,
  branchResults: BranchResults | null,
): FieldDeviceResultDataV1 {
  const base: FieldDeviceResultDataV1 = {
    elementId,
    elementType,
    ikss_ka: null,
    ip_ka: null,
    loading_pct: null,
    current_a: null,
    rated_current_a: null,
    breaking_capacity_ok: null,
  };

  // SC data by target_id
  const scRow = shortCircuitResults?.rows.find(
    (r: ShortCircuitRow) => r.target_id === elementId,
  );
  if (scRow) {
    base.ikss_ka = scRow.ikss_ka;
    base.ip_ka = scRow.ip_ka;
  }

  // Branch/loading data
  const branchRow = branchResults?.rows.find(
    (r: BranchResultRow) => r.branch_id === elementId,
  );
  if (branchRow) {
    base.loading_pct = branchRow.loading_pct;
    base.current_a = branchRow.i_a;
  }

  return base;
}

// ---------------------------------------------------------------------------
// "Brak wynikow" sentinel
// ---------------------------------------------------------------------------

/** Explicit empty result object (no solver data available). */
export const NO_RESULTS_DATA: InspectorResultData = {
  voltage_kv: null,
  voltage_pu: null,
  current_a: null,
  loading_pct: null,
  voltage_drop_pct: null,
  p_mw: null,
  q_mvar: null,
  s_mva: null,
};
