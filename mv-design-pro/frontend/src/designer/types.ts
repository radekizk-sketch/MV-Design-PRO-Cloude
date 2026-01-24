/**
 * Designer API Types
 *
 * These types mirror the backend Designer module contract.
 * UI renders these 1:1 - no interpretation.
 */

export type ActionType = 'run_short_circuit' | 'run_power_flow' | 'run_analysis';

export type ActionStatus = 'ALLOWED' | 'BLOCKED';

export interface BlockedReason {
  code: string;
  description: string;
}

export interface ActionItem {
  action_type: ActionType;
  label: string;
  status: ActionStatus;
  blocked_reason: BlockedReason | null;
}

export interface ProjectState {
  available_results: ActionType[];
  last_run_timestamps: Record<ActionType, string>;
  completeness_flags: Record<string, boolean>;
}

export interface ActionRunResultSuccess {
  action_type: ActionType;
  status: 'REQUESTED';
  message: string;
}

export interface ActionRunResultRejected {
  action_type: ActionType;
  status: 'REJECTED';
  reason: BlockedReason;
}

export type ActionRunResult = ActionRunResultSuccess | ActionRunResultRejected;
