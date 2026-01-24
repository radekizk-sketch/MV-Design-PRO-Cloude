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

export function ProjectStateView({ state, loading, error }: Props) {
  if (loading) {
    return <div className="p-4 text-gray-600">Loading state...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (!state) {
    return <div className="p-4 text-gray-500">No state loaded</div>;
  }

  return (
    <div className="p-4 border rounded bg-white">
      <h2 className="text-lg font-semibold mb-4">Project State</h2>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-700">available_results</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(state.available_results, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-medium text-gray-700">last_run_timestamps</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(state.last_run_timestamps, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-medium text-gray-700">completeness_flags</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(state.completeness_flags, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
