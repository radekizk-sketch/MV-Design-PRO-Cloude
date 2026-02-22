/**
 * Batch Execution Store -- PR-21 (Zustand)
 *
 * State management for batch job operations.
 * Deterministic sorting by created_at (descending).
 * Polish error messages. No heuristics.
 */

import { create } from 'zustand';
import type {
  BatchJob,
  CreateBatchRequest,
} from './types';
import * as api from './api';

interface BatchExecutionState {
  // Data
  studyCaseId: string | null;
  batches: BatchJob[];
  selectedBatchId: string | null;
  selectedBatch: BatchJob | null;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isExecuting: boolean;

  // Error
  error: string | null;

  // Actions
  setStudyCaseId: (studyCaseId: string) => void;
  loadBatches: (studyCaseId: string) => Promise<void>;
  createBatch: (
    studyCaseId: string,
    request: CreateBatchRequest
  ) => Promise<BatchJob>;
  executeBatch: (batchId: string) => Promise<BatchJob>;
  selectBatch: (batchId: string | null) => void;
  loadBatchDetail: (batchId: string) => Promise<void>;
  clearError: () => void;
}

export const useBatchExecutionStore = create<BatchExecutionState>(
  (set, get) => ({
    // Initial state
    studyCaseId: null,
    batches: [],
    selectedBatchId: null,
    selectedBatch: null,
    isLoading: false,
    isCreating: false,
    isExecuting: false,
    error: null,

    setStudyCaseId: (studyCaseId) => {
      set({ studyCaseId });
      get().loadBatches(studyCaseId);
    },

    loadBatches: async (studyCaseId) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.listBatches(studyCaseId);
        // Sort by created_at descending (newest first) -- deterministic
        const sorted = [...response.batches].sort(
          (a, b) => b.created_at.localeCompare(a.created_at)
        );
        set({ batches: sorted, isLoading: false });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Blad ladowania zadan wsadowych';
        set({ error: message, isLoading: false });
      }
    },

    createBatch: async (studyCaseId, request) => {
      set({ isCreating: true, error: null });
      try {
        const batch = await api.createBatch(studyCaseId, request);
        // Reload list
        const { studyCaseId: currentCaseId } = get();
        if (currentCaseId) {
          await get().loadBatches(currentCaseId);
        }
        set({ isCreating: false });
        return batch;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Blad tworzenia zadania wsadowego';
        set({ error: message, isCreating: false });
        throw err;
      }
    },

    executeBatch: async (batchId) => {
      set({ isExecuting: true, error: null });
      try {
        // Dispatch async execution — returns immediately with RUNNING status
        const batch = await api.executeBatchAsync(batchId);
        set({ selectedBatch: batch });

        // Poll for completion
        const pollInterval = 2000; // 2 seconds
        const maxPolls = 150; // 5 minutes max
        let polls = 0;

        while (polls < maxPolls) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          polls++;

          const updated = await api.getBatch(batchId);
          set({ selectedBatch: updated });

          if (updated.status === 'DONE' || updated.status === 'FAILED') {
            // Reload list on completion
            const { studyCaseId } = get();
            if (studyCaseId) {
              await get().loadBatches(studyCaseId);
            }
            set({ isExecuting: false });
            return updated;
          }
        }

        // Timeout — still executing
        set({ isExecuting: false });
        return batch;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Blad wykonywania zadania wsadowego';
        set({ error: message, isExecuting: false });
        throw err;
      }
    },

    selectBatch: (batchId) => {
      set({ selectedBatchId: batchId });
      if (batchId) {
        get().loadBatchDetail(batchId);
      } else {
        set({ selectedBatch: null });
      }
    },

    loadBatchDetail: async (batchId) => {
      try {
        const batch = await api.getBatch(batchId);
        set({ selectedBatch: batch });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Blad ladowania szczegolow batcha';
        set({ error: message });
      }
    },

    clearError: () => set({ error: null }),
  })
);
