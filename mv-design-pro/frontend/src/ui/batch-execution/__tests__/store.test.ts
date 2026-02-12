/**
 * Batch Execution Store Tests -- PR-21
 *
 * Tests for batch execution Zustand store.
 * Verifies deterministic sorting, state transitions,
 * and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBatchExecutionStore } from '../store';
import type { BatchJob, BatchListResponse } from '../types';

// Mock the API module
vi.mock('../api', () => ({
  listBatches: vi.fn(),
  createBatch: vi.fn(),
  executeBatch: vi.fn(),
  getBatch: vi.fn(),
}));

import * as api from '../api';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BATCH_A: BatchJob = {
  batch_id: 'aaaa-1111',
  study_case_id: 'case-001',
  analysis_type: 'SC_3F',
  scenario_ids: ['scen-1', 'scen-2'],
  created_at: '2025-01-15T10:00:00Z',
  status: 'DONE',
  batch_input_hash: 'aabbccdd11223344',
  run_ids: ['run-1', 'run-2'],
  result_set_ids: ['rs-1', 'rs-2'],
  errors: [],
};

const BATCH_B: BatchJob = {
  batch_id: 'bbbb-2222',
  study_case_id: 'case-001',
  analysis_type: 'SC_3F',
  scenario_ids: ['scen-3'],
  created_at: '2025-01-15T12:00:00Z',
  status: 'PENDING',
  batch_input_hash: 'eeff00112233',
  run_ids: [],
  result_set_ids: [],
  errors: [],
};

const BATCH_C: BatchJob = {
  batch_id: 'cccc-3333',
  study_case_id: 'case-001',
  analysis_type: 'SC_1F',
  scenario_ids: ['scen-4'],
  created_at: '2025-01-15T11:00:00Z',
  status: 'FAILED',
  batch_input_hash: '44556677',
  run_ids: [],
  result_set_ids: [],
  errors: ['Scenariusz scen-4: solver error'],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BatchExecutionStore', () => {
  beforeEach(() => {
    // Reset store state
    useBatchExecutionStore.setState({
      studyCaseId: null,
      batches: [],
      selectedBatchId: null,
      selectedBatch: null,
      isLoading: false,
      isCreating: false,
      isExecuting: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('starts with empty state', () => {
      const state = useBatchExecutionStore.getState();
      expect(state.studyCaseId).toBeNull();
      expect(state.batches).toEqual([]);
      expect(state.selectedBatchId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadBatches', () => {
    it('loads and sorts batches by created_at descending', async () => {
      const response: BatchListResponse = {
        batches: [BATCH_A, BATCH_C, BATCH_B],
        count: 3,
      };
      vi.mocked(api.listBatches).mockResolvedValue(response);

      await useBatchExecutionStore.getState().loadBatches('case-001');

      const state = useBatchExecutionStore.getState();
      expect(state.batches).toHaveLength(3);
      // Sorted by created_at descending: B (12:00) > C (11:00) > A (10:00)
      expect(state.batches[0].batch_id).toBe('bbbb-2222');
      expect(state.batches[1].batch_id).toBe('cccc-3333');
      expect(state.batches[2].batch_id).toBe('aaaa-1111');
      expect(state.isLoading).toBe(false);
    });

    it('deterministic sort: repeated loads produce same order', async () => {
      const response: BatchListResponse = {
        batches: [BATCH_B, BATCH_A, BATCH_C],
        count: 3,
      };
      vi.mocked(api.listBatches).mockResolvedValue(response);

      await useBatchExecutionStore.getState().loadBatches('case-001');
      const first = [...useBatchExecutionStore.getState().batches];

      await useBatchExecutionStore.getState().loadBatches('case-001');
      const second = [...useBatchExecutionStore.getState().batches];

      expect(first.map((b) => b.batch_id)).toEqual(
        second.map((b) => b.batch_id)
      );
    });

    it('handles load error with Polish message', async () => {
      vi.mocked(api.listBatches).mockRejectedValue(
        new Error('Blad sieciowy')
      );

      await useBatchExecutionStore.getState().loadBatches('case-001');

      const state = useBatchExecutionStore.getState();
      expect(state.error).toBe('Blad sieciowy');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('selectBatch', () => {
    it('sets selectedBatchId and loads detail', async () => {
      vi.mocked(api.getBatch).mockResolvedValue(BATCH_A);

      useBatchExecutionStore.getState().selectBatch('aaaa-1111');

      expect(
        useBatchExecutionStore.getState().selectedBatchId
      ).toBe('aaaa-1111');
    });

    it('clears selection when null passed', () => {
      useBatchExecutionStore.setState({ selectedBatchId: 'aaaa-1111' });
      useBatchExecutionStore.getState().selectBatch(null);

      expect(
        useBatchExecutionStore.getState().selectedBatchId
      ).toBeNull();
      expect(
        useBatchExecutionStore.getState().selectedBatch
      ).toBeNull();
    });
  });

  describe('clearError', () => {
    it('clears the error state', () => {
      useBatchExecutionStore.setState({ error: 'Some error' });
      useBatchExecutionStore.getState().clearError();
      expect(useBatchExecutionStore.getState().error).toBeNull();
    });
  });
});
