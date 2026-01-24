/**
 * ProjectStateView
 *
 * Renders GET /designer/state response 1:1.
 * No interpretation. Shows exactly what backend returns.
 */

import type { ProjectState } from './types';

interface Props {
  state: ProjectState | null;
  loading: boolean;
  error: string | null;
}

/** Section component for consistent styling */
function StateSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function ProjectStateView({ state, loading, error }: Props) {
  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-6">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading state...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 rounded-lg bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <div className="font-medium text-red-800">Error loading state</div>
            <div className="text-sm text-red-700 mt-1">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-6">
        <div className="text-gray-500">No state loaded</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">Project State</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Available Results */}
        <StateSection title="available_results">
          {state.available_results.length === 0 ? (
            <div className="text-sm text-gray-500 italic">No results available</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {state.available_results.map((result) => (
                <span
                  key={result}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800 font-mono"
                >
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {result}
                </span>
              ))}
            </div>
          )}
        </StateSection>

        {/* Last Run Timestamps */}
        <StateSection title="last_run_timestamps">
          {Object.keys(state.last_run_timestamps).length === 0 ? (
            <div className="text-sm text-gray-500 italic">No timestamps recorded</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 font-medium text-gray-600">Action</th>
                    <th className="text-left py-2 font-medium text-gray-600">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(state.last_run_timestamps).map(([action, timestamp]) => (
                    <tr key={action}>
                      <td className="py-2 pr-4 font-mono text-gray-800">{action}</td>
                      <td className="py-2 text-gray-600 font-mono text-xs">{timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </StateSection>

        {/* Completeness Flags */}
        <StateSection title="completeness_flags">
          {Object.keys(state.completeness_flags).length === 0 ? (
            <div className="text-sm text-gray-500 italic">No flags set</div>
          ) : (
            <div className="grid gap-2">
              {Object.entries(state.completeness_flags).map(([flag, value]) => (
                <div
                  key={flag}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                >
                  <span className="font-mono text-sm text-gray-800">{flag}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${
                      value
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {value ? (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </StateSection>
      </div>
    </div>
  );
}
