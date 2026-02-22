/**
 * Batch Execution API Client -- PR-21
 *
 * API functions for batch job operations.
 * Uses fetch API. Polish error messages from backend.
 */

import type {
  BatchJob,
  BatchListResponse,
  CreateBatchRequest,
} from './types';

const API_BASE = '/api/execution';

/**
 * Handle API response errors.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Blad HTTP: ${response.status}`
    );
  }
  return response.json();
}

/**
 * Create a new batch job for a study case.
 */
export async function createBatch(
  studyCaseId: string,
  request: CreateBatchRequest
): Promise<BatchJob> {
  const response = await fetch(
    `${API_BASE}/study-cases/${studyCaseId}/batches`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );
  return handleResponse<BatchJob>(response);
}

/**
 * Execute a pending batch job.
 */
export async function executeBatch(
  batchId: string
): Promise<BatchJob> {
  const response = await fetch(
    `${API_BASE}/batches/${batchId}/execute`,
    { method: 'POST' }
  );
  return handleResponse<BatchJob>(response);
}

/**
 * Execute a pending batch job asynchronously.
 * Returns immediately with RUNNING status.
 * Poll GET /api/execution/batches/{batchId} for final status.
 */
export async function executeBatchAsync(
  batchId: string
): Promise<BatchJob> {
  const response = await fetch(
    `${API_BASE}/batches/${batchId}/execute-async`,
    { method: 'POST' }
  );
  return handleResponse<BatchJob>(response);
}

/**
 * List all batch jobs for a study case.
 */
export async function listBatches(
  studyCaseId: string
): Promise<BatchListResponse> {
  const response = await fetch(
    `${API_BASE}/study-cases/${studyCaseId}/batches`
  );
  return handleResponse<BatchListResponse>(response);
}

/**
 * Get batch job details by ID.
 */
export async function getBatch(
  batchId: string
): Promise<BatchJob> {
  const response = await fetch(
    `${API_BASE}/batches/${batchId}`
  );
  return handleResponse<BatchJob>(response);
}
