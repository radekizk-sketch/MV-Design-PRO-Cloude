/**
 * useEnmStore — Zustand store dla stanu ENM z aktualizacją SLD na żywo.
 *
 * Jedno źródło prawdy: Snapshot domenowy.
 * Kreator NIE przechowuje niezależnego modelu.
 */
import { create } from 'zustand';
import type {
  DomainOpResponse,
  ReadinessInfo,
  FixActionItem,
  ChangeSet,
  SelectionHint,
  MaterializedParamsEnvelope,
} from '../../types/domainOps';
import { executeDomainOp } from './domainOpsClient';

interface EnmStoreState {
  // Snapshot (jedyna prawda)
  snapshot: Record<string, unknown> | null;
  logicalViews: Record<string, unknown> | null;
  materializedParams: MaterializedParamsEnvelope | null;
  layout: {
    layout_hash: string;
    layout_version: string;
  } | null;
  snapshotHash: string | null;
  revision: number;

  // Readiness
  readiness: ReadinessInfo | null;
  fixActions: FixActionItem[];

  // Selection
  selectedElementId: string | null;
  selectionHint: SelectionHint | null;

  // UI state
  isLoading: boolean;
  lastError: string | null;
  lastChanges: ChangeSet | null;

  // Actions
  executeOperation: (
    caseId: string,
    opName: string,
    payload: Record<string, unknown>,
  ) => Promise<DomainOpResponse | null>;

  setSelection: (elementId: string | null) => void;
  applyFixAction: (fixAction: FixActionItem) => void;
  reset: () => void;
}

export const useEnmStore = create<EnmStoreState>((set, get) => ({
  // Initial state
  snapshot: null,
  logicalViews: null,
  materializedParams: null,
  layout: null,
  snapshotHash: null,
  revision: 0,
  readiness: null,
  fixActions: [],
  selectedElementId: null,
  selectionHint: null,
  isLoading: false,
  lastError: null,
  lastChanges: null,

  executeOperation: async (caseId, opName, payload) => {
    const { snapshotHash } = get();
    set({ isLoading: true, lastError: null });

    try {
      const result = await executeDomainOp(caseId, opName, payload, snapshotHash ?? '');

      set({
        selectedElementId: (() => {
          const currentSelectedId = get().selectedElementId;
          const deletedIds = result.changes?.deleted_element_ids ?? [];
          if (result.selection_hint?.element_id) {
            return result.selection_hint.element_id;
          }
          if (currentSelectedId && deletedIds.includes(currentSelectedId)) {
            return null;
          }
          return currentSelectedId;
        })(),
        snapshot: result.snapshot,
        logicalViews: result.logical_views,
        materializedParams: result.materialized_params ?? null,
        layout: result.layout ?? null,
        snapshotHash: (result.snapshot as Record<string, unknown>)?.header
          ? ((result.snapshot as Record<string, Record<string, string>>).header?.hash_sha256 ?? null)
          : null,
        readiness: result.readiness,
        fixActions: result.fix_actions,
        lastChanges: result.changes,
        selectionHint: result.selection_hint,
        isLoading: false,
        lastError: null,
        revision: get().revision + 1,
      });

      return result;
    } catch (err) {
      set({
        isLoading: false,
        lastError: err instanceof Error ? err.message : 'Nieznany błąd',
      });
      return null;
    }
  },

  setSelection: (elementId) => set({ selectedElementId: elementId }),

  applyFixAction: (fixAction) => {
    // Navigate to element and open panel
    if (fixAction.element_ref) {
      set({ selectedElementId: fixAction.element_ref });
    }
  },

  reset: () =>
    set({
      snapshot: null,
      logicalViews: null,
      materializedParams: null,
      layout: null,
      snapshotHash: null,
      revision: 0,
      readiness: null,
      fixActions: [],
      selectedElementId: null,
      selectionHint: null,
      isLoading: false,
      lastError: null,
      lastChanges: null,
    }),
}));
