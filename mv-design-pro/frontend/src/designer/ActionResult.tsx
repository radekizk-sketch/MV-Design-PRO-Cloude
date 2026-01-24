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

/** Status icon - matches the result status visually */
function ResultStatusIcon({ status }: { status: 'REQUESTED' | 'REJECTED' }) {
  if (status === 'REQUESTED') {
    return (
      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  );
}

export function ActionResult({ result, onDismiss }: Props) {
  if (!result) {
    return null;
  }

  const isSuccess = result.status === 'REQUESTED';
  const isNetworkError = result.status === 'REJECTED' && result.reason?.code === 'network_error';

  return (
    <div
      className={`rounded-lg border-2 overflow-hidden shadow-sm ${
        isSuccess
          ? 'bg-green-50 border-green-300'
          : isNetworkError
            ? 'bg-amber-50 border-amber-300'
            : 'bg-red-50 border-red-300'
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between ${
          isSuccess
            ? 'bg-green-100 border-b border-green-200'
            : isNetworkError
              ? 'bg-amber-100 border-b border-amber-200'
              : 'bg-red-100 border-b border-red-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <ResultStatusIcon status={result.status} />
          <h2 className="font-semibold text-gray-900">Action Result</h2>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-black/10 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Action type */}
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-medium text-gray-700">action_type:</span>
          <span className="font-mono text-gray-900">{result.action_type}</span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">status:</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
              isSuccess
                ? 'bg-green-200 text-green-800'
                : 'bg-red-200 text-red-800'
            }`}
          >
            {result.status}
          </span>
        </div>

        {/* Success message */}
        {result.status === 'REQUESTED' && result.message && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">message:</span>{' '}
            <span className="text-gray-900">{result.message}</span>
          </div>
        )}

        {/* Rejection/Error reason - always fully visible */}
        {result.status === 'REJECTED' && result.reason && (
          <div
            className={`rounded-lg p-4 ${
              isNetworkError
                ? 'bg-amber-100 border border-amber-200'
                : 'bg-red-100 border border-red-200'
            }`}
          >
            <div className="flex items-start gap-2">
              <svg
                className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  isNetworkError ? 'text-amber-600' : 'text-red-600'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-semibold mb-2 ${
                    isNetworkError ? 'text-amber-800' : 'text-red-800'
                  }`}
                >
                  reason
                </div>
                <dl className="text-sm space-y-1">
                  <div className="flex gap-2">
                    <dt
                      className={`font-medium flex-shrink-0 ${
                        isNetworkError ? 'text-amber-700' : 'text-red-700'
                      }`}
                    >
                      code:
                    </dt>
                    <dd
                      className={`font-mono ${
                        isNetworkError ? 'text-amber-900' : 'text-red-900'
                      }`}
                    >
                      {result.reason.code}
                    </dd>
                  </div>
                  <div>
                    <dt
                      className={`font-medium mb-1 ${
                        isNetworkError ? 'text-amber-700' : 'text-red-700'
                      }`}
                    >
                      description:
                    </dt>
                    <dd
                      className={`break-words ${
                        isNetworkError ? 'text-amber-900' : 'text-red-900'
                      }`}
                    >
                      {result.reason.description}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
