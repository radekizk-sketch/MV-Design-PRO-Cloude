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
  CanonicalOpName,
} from '../../types/domainOps';
import { ALIAS_MAP } from '../../types/domainOps';

interface EnmStoreState {
  // Snapshot (jedyna prawda)
  snapshot: Record<string, unknown> | null;
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

const API_BASE = '/api/cases';

export const useEnmStore = create<EnmStoreState>((set, get) => ({
  // Initial state
  snapshot: null,
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
    // Resolve alias to canonical name
    const canonicalName = (ALIAS_MAP[opName] ?? opName) as CanonicalOpName;

    const { snapshotHash } = get();
    set({ isLoading: true, lastError: null });

    try {
      const response = await fetch(`${API_BASE}/${caseId}/enm/domain-ops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: caseId,
          snapshot_base_hash: snapshotHash ?? '',
          operation: {
            name: canonicalName,
            idempotency_key: `op:${canonicalName}:${Date.now()}`,
            payload,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        set({ isLoading: false, lastError: error });
        return null;
      }

      const result: DomainOpResponse = await response.json();

      set({
        snapshot: result.snapshot,
        snapshotHash: (result.snapshot as Record<string, unknown>)?.header
          ? ((result.snapshot as Record<string, Record<string, string>>).header?.hash_sha256 ?? null)
          : null,
        readiness: result.readiness,
        fixActions: result.fix_actions,
        lastChanges: result.changes,
        selectionHint: result.selection_hint,
        selectedElementId: result.selection_hint?.element_id ?? get().selectedElementId,
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
