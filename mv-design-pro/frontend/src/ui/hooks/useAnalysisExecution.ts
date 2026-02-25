/**
 * Analysis Execution Hook — Full Calculation Flow
 *
 * Implements the complete execution pipeline:
 *   eligibility check → run creation → execution → polling → results
 *
 * INVARIANTS:
 * - No physics, no solver calls (Application Layer only)
 * - Polish labels for all user-facing progress messages
 * - Deterministic polling: fixed interval, bounded iterations
 * - Uses raw fetch() for eligibility (matches analysis-eligibility pattern)
 * - Imports createRun, executeRun, getRun from study-cases/api
 */

import { create } from 'zustand';
import { createRun, executeRun, getRun } from '../study-cases/api';

// =============================================================================
// Types
// =============================================================================

type ExecutionStatus =
  | 'IDLE'
  | 'CHECKING_ELIGIBILITY'
  | 'CREATING_RUN'
  | 'EXECUTING'
  | 'POLLING'
  | 'COMPLETED'
  | 'FAILED';

export interface AnalysisExecutionState {
  isRunning: boolean;
  runId: string | null;
  status: ExecutionStatus;
  error: string | null;
  progress: string; // Polish status text for UI

  // Actions
  executeShortCircuit: (caseId: string) => Promise<string | null>;
  executePowerFlow: (caseId: string) => Promise<string | null>;
  reset: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ITERATIONS = 60;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Eligibility response shape (matches /api/cases/:id/analysis-eligibility).
 */
interface EligibilityResponse {
  case_id: string;
  enm_revision: number;
  matrix: Array<{
    analysis_type: string;
    status: 'ELIGIBLE' | 'INELIGIBLE';
    blockers: Array<{ code: string; message: string }>;
  }>;
  overall: {
    eligible_any: boolean;
    eligible_all: boolean;
    blockers_total: number;
  };
  content_hash: string;
}

/**
 * Fetch analysis eligibility matrix from the backend.
 * Uses raw fetch() following the same pattern as other api.ts files.
 */
async function fetchEligibility(caseId: string): Promise<EligibilityResponse> {
  const response = await fetch(`/api/cases/${caseId}/analysis-eligibility`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as Record<string, string>).detail ||
        `Nie udało się sprawdzić gotowości: ${response.statusText}`,
    );
  }
  return response.json();
}

/**
 * Wait for the specified number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  isRunning: false,
  runId: null as string | null,
  status: 'IDLE' as ExecutionStatus,
  error: null as string | null,
  progress: '',
};

// =============================================================================
// Store
// =============================================================================

export const useAnalysisExecution = create<AnalysisExecutionState>()(
  (set, get) => ({
    ...initialState,

    /**
     * Execute a 3-phase short circuit analysis.
     * Full pipeline: eligibility → create run → execute → poll → complete.
     * Returns the run ID on success, or null on failure.
     */
    executeShortCircuit: async (caseId: string): Promise<string | null> => {
      return executeAnalysis(set, get, caseId, 'SC_3F', 'Zwarcie 3F');
    },

    /**
     * Execute a power flow (load flow) analysis.
     * Full pipeline: eligibility → create run → execute → poll → complete.
     * Returns the run ID on success, or null on failure.
     */
    executePowerFlow: async (caseId: string): Promise<string | null> => {
      return executeAnalysis(set, get, caseId, 'LOAD_FLOW', 'Rozpływ mocy');
    },

    /**
     * Reset state to idle.
     */
    reset: () => {
      set(initialState);
    },
  }),
);

// =============================================================================
// Core Execution Pipeline
// =============================================================================

type SetFn = (
  partial:
    | Partial<AnalysisExecutionState>
    | ((state: AnalysisExecutionState) => Partial<AnalysisExecutionState>),
) => void;

type GetFn = () => AnalysisExecutionState;

/**
 * Shared execution pipeline for all analysis types.
 *
 * Steps:
 *  1. Check eligibility (GET /api/cases/:id/analysis-eligibility)
 *  2. Create run (POST via study-cases/api)
 *  3. Execute run (POST via study-cases/api)
 *  4. Poll until DONE or FAILED (max 60 iterations, 1s interval)
 *  5. Return runId or null
 */
async function executeAnalysis(
  set: SetFn,
  _get: GetFn,
  caseId: string,
  analysisType: 'SC_3F' | 'LOAD_FLOW',
  runName: string,
): Promise<string | null> {
  // Guard: prevent concurrent execution
  if (_get().isRunning) {
    return null;
  }

  set({
    isRunning: true,
    runId: null,
    error: null,
    status: 'CHECKING_ELIGIBILITY',
    progress: 'Sprawdzanie gotowości...',
  });

  try {
    // -----------------------------------------------------------------
    // Step 1: Check eligibility
    // -----------------------------------------------------------------
    const eligibility = await fetchEligibility(caseId);

    const targetEntry = eligibility.matrix.find(
      (entry) => entry.analysis_type === analysisType,
    );

    if (targetEntry && targetEntry.status !== 'ELIGIBLE') {
      const blockerMessages = targetEntry.blockers
        .map((b) => b.message)
        .join('; ');
      set({
        isRunning: false,
        status: 'FAILED',
        error: `Analiza zablokowana: ${blockerMessages || 'Niespełnione wymagania'}`,
        progress: 'Analiza zablokowana',
      });
      return null;
    }

    if (!targetEntry && !eligibility.overall.eligible_any) {
      set({
        isRunning: false,
        status: 'FAILED',
        error: 'Brak gotowości do wykonania analizy',
        progress: 'Analiza zablokowana',
      });
      return null;
    }

    // -----------------------------------------------------------------
    // Step 2: Create run
    // -----------------------------------------------------------------
    set({
      status: 'CREATING_RUN',
      progress: 'Tworzenie przebiegu...',
    });

    const run = await createRun(caseId, {
      analysis_type: analysisType,
    });

    const runId = run.id;
    set({ runId });

    // -----------------------------------------------------------------
    // Step 3: Execute run
    // -----------------------------------------------------------------
    set({
      status: 'EXECUTING',
      progress: 'Wykonywanie obliczeń...',
    });

    await executeRun(runId);

    // -----------------------------------------------------------------
    // Step 4: Poll for completion
    // -----------------------------------------------------------------
    set({
      status: 'POLLING',
      progress: 'Oczekiwanie na wyniki...',
    });

    for (let i = 0; i < MAX_POLL_ITERATIONS; i++) {
      await delay(POLL_INTERVAL_MS);

      const polledRun = await getRun(runId);

      if (polledRun.status === 'DONE') {
        set({
          isRunning: false,
          status: 'COMPLETED',
          progress: 'Obliczenia zakończone',
        });
        return runId;
      }

      if (polledRun.status === 'FAILED') {
        set({
          isRunning: false,
          status: 'FAILED',
          error: polledRun.error_message || `${runName}: obliczenia zakończone błędem`,
          progress: 'Obliczenia zakończone błędem',
        });
        return null;
      }

      // Still PENDING or RUNNING — continue polling
    }

    // Timeout: exceeded max poll iterations
    set({
      isRunning: false,
      status: 'FAILED',
      error: `Przekroczono limit oczekiwania (${MAX_POLL_ITERATIONS}s)`,
      progress: 'Przekroczono limit oczekiwania',
    });
    return null;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Nieznany błąd podczas wykonywania analizy';
    set({
      isRunning: false,
      status: 'FAILED',
      error: message,
      progress: 'Błąd wykonywania',
    });
    return null;
  }
}
