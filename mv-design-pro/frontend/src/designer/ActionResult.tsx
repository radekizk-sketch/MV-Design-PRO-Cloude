/**
 * ActionResult
 *
 * Renders POST /designer/actions/{action_type}/run response 1:1.
 * Shows REQUESTED or REJECTED with reason.
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

  const isSuccess = result.status === 'REQUESTED';

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
          className="text-gray-500 hover:text-gray-700"
        >
          &times;
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">action_type:</span> {result.action_type}
        </div>
        <div>
          <span className="font-medium">status:</span>{' '}
          <span
            className={isSuccess ? 'text-green-700' : 'text-red-700'}
          >
            {result.status}
          </span>
        </div>

        {result.status === 'REQUESTED' && (
          <div>
            <span className="font-medium">message:</span> {result.message}
          </div>
        )}

        {result.status === 'REJECTED' && result.reason && (
          <div className="mt-2 p-2 bg-red-100 rounded">
            <div className="font-medium">reason:</div>
            <div>code: {result.reason.code}</div>
            <div>description: {result.reason.description}</div>
          </div>
        )}
      </div>
    </div>
  );
}
