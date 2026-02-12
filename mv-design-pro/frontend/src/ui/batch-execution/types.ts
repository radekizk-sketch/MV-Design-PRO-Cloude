/**
 * Batch Execution Types -- PR-21
 *
 * TypeScript types for batch job management.
 * Aligned with backend domain/batch_job.py and api/batch_execution.py.
 * All labels in Polish. No project codenames.
 */

/**
 * Batch job status.
 */
export type BatchJobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';

/**
 * Batch job response from API.
 */
export interface BatchJob {
  batch_id: string;
  study_case_id: string;
  analysis_type: string;
  scenario_ids: string[];
  created_at: string;
  status: BatchJobStatus;
  batch_input_hash: string;
  run_ids: string[];
  result_set_ids: string[];
  errors: string[];
}

/**
 * Batch list response from API.
 */
export interface BatchListResponse {
  batches: BatchJob[];
  count: number;
}

/**
 * Scenario input for batch creation.
 */
export interface ScenarioInput {
  scenario_id: string;
  content_hash: string;
  solver_input: Record<string, unknown>;
}

/**
 * Request to create a batch job.
 */
export interface CreateBatchRequest {
  analysis_type: string;
  scenarios: ScenarioInput[];
  readiness?: Record<string, unknown> | null;
  eligibility?: Record<string, unknown> | null;
}

/**
 * Polish labels for batch statuses.
 */
export const BATCH_STATUS_LABELS: Record<BatchJobStatus, string> = {
  PENDING: 'Oczekuje',
  RUNNING: 'W trakcie',
  DONE: 'Zakonczone',
  FAILED: 'Niepowodzenie',
};

/**
 * CSS styles for batch status badges (Tailwind semantic classes).
 */
export const BATCH_STATUS_STYLES: Record<
  BatchJobStatus,
  { bg: string; text: string; border: string }
> = {
  PENDING: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-300',
  },
  RUNNING: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-300',
  },
  DONE: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
  },
  FAILED: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-300',
  },
};
