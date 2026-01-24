/**
 * ActionsList
 *
 * Renders GET /designer/actions response 1:1.
 * Shows ALL actions. Never hides BLOCKED actions.
 * RUN button only if status === 'ALLOWED'.
 */

import type { ActionItem, ActionType } from './types';

interface Props {
  actions: ActionItem[] | null;
  loading: boolean;
  error: string | null;
  onRunAction: (actionType: ActionType) => void;
  runningAction: ActionType | null;
}

export function ActionsList({ actions, loading, error, onRunAction, runningAction }: Props) {
  if (loading) {
    return <div className="p-4 text-gray-600">Loading actions...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (!actions) {
    return <div className="p-4 text-gray-500">No actions loaded</div>;
  }

  return (
    <div className="p-4 border rounded bg-white">
      <h2 className="text-lg font-semibold mb-4">Actions</h2>

      <div className="space-y-3">
        {actions.map((action) => (
          <div
            key={action.action_type}
            className="p-3 border rounded bg-gray-50"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{action.label}</span>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  action.status === 'ALLOWED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {action.status}
              </span>
            </div>

            <div className="text-xs text-gray-500 mb-2">
              action_type: {action.action_type}
            </div>

            {action.status === 'BLOCKED' && action.blocked_reason && (
              <div className="text-sm text-red-700 bg-red-50 p-2 rounded mb-2">
                <div className="font-medium">blocked_reason:</div>
                <div>code: {action.blocked_reason.code}</div>
                <div>description: {action.blocked_reason.description}</div>
              </div>
            )}

            {action.status === 'ALLOWED' && (
              <button
                onClick={() => onRunAction(action.action_type)}
                disabled={runningAction !== null}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {runningAction === action.action_type ? 'Running...' : 'RUN'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
