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

/** Status icon - informative only, no interpretation */
function StatusIcon({ status }: { status: 'ALLOWED' | 'BLOCKED' }) {
  if (status === 'ALLOWED') {
    return (
      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  );
}

export function ActionsList({ actions, loading, error, onRunAction, runningAction }: Props) {
  if (loading) {
    return (
      <div className="p-6 border border-gray-200 rounded-lg bg-white">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading actions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 rounded-lg bg-red-50">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <div className="font-medium text-red-800">Error loading actions</div>
            <div className="text-sm text-red-700 mt-1">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!actions) {
    return (
      <div className="p-6 border border-gray-200 rounded-lg bg-white">
        <div className="text-gray-500">No actions loaded</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
      </div>

      <div className="divide-y divide-gray-100">
        {actions.map((action) => (
          <div
            key={action.action_type}
            className={`p-4 ${
              action.status === 'ALLOWED'
                ? 'bg-white'
                : 'bg-gray-50'
            }`}
          >
            {/* Header: label + status */}
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="font-medium text-gray-900">{action.label}</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                  action.status === 'ALLOWED'
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}
              >
                <StatusIcon status={action.status} />
                {action.status}
              </span>
            </div>

            {/* Action type identifier */}
            <div className="text-xs text-gray-500 font-mono mb-3">
              action_type: {action.action_type}
            </div>

            {/* Blocked reason - always fully visible, never truncated */}
            {action.status === 'BLOCKED' && action.blocked_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-red-800 mb-2">blocked_reason</div>
                    <dl className="text-sm space-y-1">
                      <div className="flex gap-2">
                        <dt className="text-red-700 font-medium flex-shrink-0">code:</dt>
                        <dd className="text-red-800 font-mono">{action.blocked_reason.code}</dd>
                      </div>
                      <div>
                        <dt className="text-red-700 font-medium mb-1">description:</dt>
                        <dd className="text-red-800 break-words">{action.blocked_reason.description}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            )}

            {/* Run button - only for ALLOWED actions */}
            {action.status === 'ALLOWED' && (
              <button
                onClick={() => onRunAction(action.action_type)}
                disabled={runningAction !== null}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  runningAction !== null
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                }`}
              >
                {runningAction === action.action_type ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running...
                  </>
                ) : (
                  'RUN'
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
