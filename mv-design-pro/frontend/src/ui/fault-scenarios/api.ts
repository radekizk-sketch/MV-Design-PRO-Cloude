/**
 * Fault Scenario API Client — PR-19
 *
 * API functions for fault scenario CRUD operations.
 * Uses fetch API with Polish error messages from backend.
 */

import type {
  FaultScenario,
  FaultScenarioListResponse,
  CreateFaultScenarioRequest,
} from './types';

const API_BASE = '/api/study-cases';
const API_DELETE_BASE = '/api/fault-scenarios';

/**
 * Handle API response errors.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Błąd HTTP: ${response.status}`
    );
  }
  return response.json();
}

/**
 * Create a new fault scenario for a study case.
 */
export async function createFaultScenario(
  studyCaseId: string,
  request: CreateFaultScenarioRequest
): Promise<FaultScenario> {
  const response = await fetch(
    `${API_BASE}/${studyCaseId}/fault-scenarios`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );
  return handleResponse<FaultScenario>(response);
}

/**
 * List all fault scenarios for a study case.
 */
export async function listFaultScenarios(
  studyCaseId: string
): Promise<FaultScenarioListResponse> {
  const response = await fetch(
    `${API_BASE}/${studyCaseId}/fault-scenarios`
  );
  return handleResponse<FaultScenarioListResponse>(response);
}

/**
 * Delete a fault scenario by ID.
 */
export async function deleteFaultScenario(
  scenarioId: string
): Promise<void> {
  const response = await fetch(
    `${API_DELETE_BASE}/${scenarioId}`,
    { method: 'DELETE' }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Błąd HTTP: ${response.status}`
    );
  }
}
