/**
 * Designer API Client
 *
 * Raw fetch calls to snapshot-based endpoints.
 * No caching, no state management, no interpretation.
 *
 * CANONICAL FLOW:
 * project → case → snapshot → actions → run
 *
 * ENDPOINTS:
 * - GET  /snapshots/{snapshot_id}                    → fetch snapshot
 * - POST /snapshots/{snapshot_id}/actions (body: {}) → fetch available actions
 * - POST /snapshots/{snapshot_id}/actions/{action_id}/run → run action
 */

import type { ActionItem, ActionRunResult, Snapshot } from './types';

/**
 * API Error with HTTP status and detail from response.
 * UI must display this information to the user.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly detail: string | null,
    public readonly endpoint: string
  ) {
    super(`${status} ${statusText}: ${detail ?? 'No detail'}`);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response, endpoint: string): Promise<T> {
  if (!response.ok) {
    let detail: string | null = null;
    try {
      const body = await response.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      // Response body not JSON or empty
    }
    throw new ApiError(response.status, response.statusText, detail, endpoint);
  }
  return response.json();
}

/**
 * GET /snapshots/{snapshot_id}
 * Fetches the current snapshot. UI renders this 1:1.
 */
export async function fetchSnapshot(snapshotId: string): Promise<Snapshot> {
  const endpoint = `/snapshots/${snapshotId}`;
  const response = await fetch(endpoint);
  return handleResponse<Snapshot>(response, endpoint);
}

/**
 * POST /snapshots/{snapshot_id}/actions
 * With empty body {} to fetch available actions.
 *
 * Actions are ONLY available when snapshot is active.
 * BLOCKED actions must be shown with disabled RUN and reason from API.
 */
export async function fetchActions(snapshotId: string): Promise<ActionItem[]> {
  const endpoint = `/snapshots/${snapshotId}/actions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return handleResponse<ActionItem[]>(response, endpoint);
}

/**
 * POST /snapshots/{snapshot_id}/actions/{action_id}/run
 * Executes the specified action. UI shows result 1:1.
 */
export async function runAction(
  snapshotId: string,
  actionId: string
): Promise<ActionRunResult> {
  const endpoint = `/snapshots/${snapshotId}/actions/${actionId}/run`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<ActionRunResult>(response, endpoint);
}
