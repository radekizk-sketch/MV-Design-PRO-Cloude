/**
 * Snapshot Store V1 — Zustand store for V1 domain operation state.
 *
 * Holds the full canonical response envelope from POST /enm/ops:
 * - snapshot (EnergyNetworkModel)
 * - logical_views (trunks, branches, secondary_connectors, terminals)
 * - readiness + fix_actions
 * - materialized_params (frozen catalog copies)
 * - layout (deterministic hash)
 * - selection_hint
 * - domain_events
 *
 * SLD = pure function(snapshot, logical_views, overlay)
 * No local topology graph state — everything derived from backend snapshot.
 *
 * DETERMINISTIC: same operation → same snapshot → same SLD.
 * BINDING: PL labels, no codenames.
 */

import { create } from 'zustand';
import type {
  DomainOpResponseV1,
  EnergyNetworkModel,
  LogicalViewsV1,
  MaterializedParams,
  LayoutInfo,
  ReadinessInfo,
  FixAction,
  SelectionHint,
  ChangesInfo,
  DomainEvent,
  TerminalRef,
} from '../../types/enm';
import { executeDomainOp } from './domainApi';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface SnapshotState {
  /** ENM snapshot — single source of truth. */
  snapshot: EnergyNetworkModel | null;
  /** Deterministic logical views (trunks, branches, terminals). */
  logicalViews: LogicalViewsV1 | null;
  /** Analysis readiness (blockers + warnings). */
  readiness: ReadinessInfo | null;
  /** Navigation fix actions for blockers. */
  fixActions: FixAction[];
  /** Frozen catalog parameter copies. */
  materializedParams: MaterializedParams | null;
  /** Deterministic topology layout hash. */
  layout: LayoutInfo | null;
  /** Last selection hint from operation. */
  selectionHint: SelectionHint | null;
  /** Last operation changes (created/updated/deleted). */
  lastChanges: ChangesInfo | null;
  /** Last domain events. */
  lastEvents: DomainEvent[];
  /** Loading state. */
  loading: boolean;
  /** Last error message (null = no error). */
  error: string | null;
  /** Last error code from domain operation. */
  errorCode: string | null;

  // Actions
  executeDomainOperation: (
    caseId: string,
    opName: string,
    payload: Record<string, unknown>,
  ) => Promise<DomainOpResponseV1 | null>;
  setSnapshot: (response: DomainOpResponseV1) => void;
  clearError: () => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Selectors (pure, derived from snapshot)
// ---------------------------------------------------------------------------

/** Get all bus refs from snapshot, sorted. */
export function selectBusRefs(snapshot: EnergyNetworkModel | null): string[] {
  if (!snapshot) return [];
  return (snapshot.buses ?? [])
    .map((b) => b.ref_id)
    .sort();
}

/** Get bus options for dropdowns (ref_id + name + voltage). */
export function selectBusOptions(
  snapshot: EnergyNetworkModel | null,
): Array<{ ref_id: string; name: string; voltage_kv: number }> {
  if (!snapshot) return [];
  return (snapshot.buses ?? [])
    .map((b) => ({ ref_id: b.ref_id, name: b.name, voltage_kv: b.voltage_kv }))
    .sort((a, b) => a.ref_id.localeCompare(b.ref_id));
}

/** Get trunk views from logical views. */
export function selectTrunks(logicalViews: LogicalViewsV1 | null) {
  return logicalViews?.trunks ?? [];
}

/** Get branch views from logical views. */
export function selectBranches(logicalViews: LogicalViewsV1 | null) {
  return logicalViews?.branches ?? [];
}

/** Get all terminals from logical views. */
export function selectTerminals(logicalViews: LogicalViewsV1 | null): TerminalRef[] {
  return logicalViews?.terminals ?? [];
}

/** Get open terminals (available for click-to-extend). */
export function selectOpenTerminals(logicalViews: LogicalViewsV1 | null): TerminalRef[] {
  return (logicalViews?.terminals ?? []).filter((t) => t.status === 'OTWARTY');
}

/** Is the network analysis-ready? */
export function selectIsReady(readiness: ReadinessInfo | null): boolean {
  return readiness?.ready ?? false;
}

/** Get blocker count. */
export function selectBlockerCount(readiness: ReadinessInfo | null): number {
  return readiness?.blockers?.length ?? 0;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSnapshotStore = create<SnapshotState>((set) => ({
  snapshot: null,
  logicalViews: null,
  readiness: null,
  fixActions: [],
  materializedParams: null,
  layout: null,
  selectionHint: null,
  lastChanges: null,
  lastEvents: [],
  loading: false,
  error: null,
  errorCode: null,

  executeDomainOperation: async (
    caseId: string,
    opName: string,
    payload: Record<string, unknown>,
  ) => {
    set({ loading: true, error: null, errorCode: null });
    try {
      const response = await executeDomainOp(caseId, opName, payload);

      if (response.error) {
        set({
          loading: false,
          error: response.error,
          errorCode: response.error_code ?? null,
        });
        return response;
      }

      set({
        snapshot: response.snapshot,
        logicalViews: response.logical_views,
        readiness: response.readiness,
        fixActions: response.fix_actions,
        materializedParams: response.materialized_params,
        layout: response.layout,
        selectionHint: response.selection_hint,
        lastChanges: response.changes,
        lastEvents: response.domain_events,
        loading: false,
        error: null,
        errorCode: null,
      });

      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: errorMsg, errorCode: 'NETWORK_ERROR' });
      return null;
    }
  },

  setSnapshot: (response: DomainOpResponseV1) => {
    set({
      snapshot: response.snapshot,
      logicalViews: response.logical_views,
      readiness: response.readiness,
      fixActions: response.fix_actions,
      materializedParams: response.materialized_params,
      layout: response.layout,
      selectionHint: response.selection_hint,
      lastChanges: response.changes,
      lastEvents: response.domain_events,
    });
  },

  clearError: () => set({ error: null, errorCode: null }),

  reset: () =>
    set({
      snapshot: null,
      logicalViews: null,
      readiness: null,
      fixActions: [],
      materializedParams: null,
      layout: null,
      selectionHint: null,
      lastChanges: null,
      lastEvents: [],
      loading: false,
      error: null,
      errorCode: null,
    }),
}));
