/**
 * Designer API Types
 *
 * These types mirror the backend snapshot API contract.
 * UI renders these 1:1 - no interpretation.
 *
 * CANONICAL FLOW:
 * project → case → snapshot → actions → run
 */

/**
 * Action status from API.
 * BLOCKED actions are shown with disabled RUN button.
 */
export type ActionStatus = 'ALLOWED' | 'BLOCKED';

/**
 * Reason why an action is blocked.
 * UI displays this 1:1 from API response.
 */
export interface BlockedReason {
  code: string;
  description: string;
}

/**
 * Action item from POST /snapshots/{id}/actions.
 * UI renders all actions - never hides BLOCKED.
 */
export interface ActionItem {
  action_id: string;
  action_type: string;
  label: string;
  status: ActionStatus;
  blocked_reason: BlockedReason | null;
}

/**
 * Snapshot metadata from GET /snapshots/{id}.
 * UI renders this 1:1 - entire response as received.
 */
export interface SnapshotMeta {
  snapshot_id: string;
  parent_snapshot_id: string | null;
  schema_version: string;
  created_at: string;
}

/**
 * Full snapshot from GET /snapshots/{id}.
 * UI renders meta and shows graph as JSON.
 */
export interface Snapshot {
  meta: SnapshotMeta;
  graph: Record<string, unknown>;
}

/**
 * Successful action run result.
 */
export interface ActionRunResultSuccess {
  action_id: string;
  status: 'REQUESTED' | 'accepted';
  message?: string;
  new_snapshot_id?: string;
}

/**
 * Rejected action run result.
 */
export interface ActionRunResultRejected {
  action_id: string;
  status: 'REJECTED' | 'rejected';
  reason?: BlockedReason;
  errors?: Array<{ code: string; message: string; path?: string }>;
}

export type ActionRunResult = ActionRunResultSuccess | ActionRunResultRejected;
