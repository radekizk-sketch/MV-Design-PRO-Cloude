/**
 * Designer API Client
 *
 * Raw fetch calls to Designer endpoints.
 * No caching, no state management, no interpretation.
 */

import type { ActionItem, ActionRunResult, ActionType, ProjectState } from './types';

const API_BASE = '/api/designer';

export async function fetchProjectState(): Promise<ProjectState> {
  const response = await fetch(`${API_BASE}/state`);
  if (!response.ok) {
    throw new Error(`GET /designer/state failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchActions(): Promise<ActionItem[]> {
  const response = await fetch(`${API_BASE}/actions`);
  if (!response.ok) {
    throw new Error(`GET /designer/actions failed: ${response.status}`);
  }
  return response.json();
}

export async function runAction(actionType: ActionType): Promise<ActionRunResult> {
  const response = await fetch(`${API_BASE}/actions/${actionType}/run`, {
    method: 'POST',
  });
  return response.json();
}
