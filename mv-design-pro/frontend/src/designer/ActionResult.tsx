/**
 * ActionResult
 *
 * Renders POST /snapshots/{id}/actions/{action_id}/run response 1:1.
 * Shows success (REQUESTED/accepted) or rejection with reason/errors.
 *
 * CANONICAL RULES:
 * - Display HTTP status and detail for API errors
 * - Show all data from API response without interpretation
 */

import type { ActionRunResult } from './types';

interface Props {
  result: ActionRunResult | null;
  onDismiss: () => void;
}

export function ActionResult({ result, onDismiss }: Props) {
  if (!result) {
    return null;
  }

  const isSuccess = result.status === 'REQUESTED' || result.status === 'accepted';

  return (
    <div
      className={`p-4 border rounded ${
        isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-lg font-semibold">Action Result</h2>
        <button
          onClick={onDismiss}
          className="text-gray-500 hover:text-gray-700 text-xl"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">action_id:</span> {result.action_id}
        </div>
        <div>
          <span className="font-medium">status:</span>{' '}
          <span className={isSuccess ? 'text-green-700' : 'text-red-700'}>
            {result.status}
          </span>
        </div>

        {/* Success response */}
        {isSuccess && 'message' in result && result.message && (
          <div>
            <span className="font-medium">message:</span> {result.message}
          </div>
        )}
        {isSuccess && 'new_snapshot_id' in result && result.new_snapshot_id && (
          <div>
            <span className="font-medium">new_snapshot_id:</span>{' '}
            <span className="font-mono text-xs">{result.new_snapshot_id}</span>
          </div>
        )}

        {/* Rejection with reason */}
        {!isSuccess && 'reason' in result && result.reason && (
          <div className="mt-2 p-2 bg-red-100 rounded">
            <div className="font-medium">reason:</div>
            <div>code: {result.reason.code}</div>
            <div className="break-words">description: {result.reason.description}</div>
          </div>
        )}

        {/* Rejection with errors array */}
        {!isSuccess && 'errors' in result && result.errors && result.errors.length > 0 && (
          <div className="mt-2 p-2 bg-red-100 rounded">
            <div className="font-medium">errors:</div>
            {result.errors.map((err, idx) => (
              <div key={idx} className="ml-2 mt-1">
                <div>code: {err.code}</div>
                <div className="break-words">message: {err.message}</div>
                {err.path && <div>path: {err.path}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
