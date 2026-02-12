/**
 * Protection Engine v1 — Results Panel (PR-26)
 *
 * Displays protection analysis results in tabular form.
 * 100% Polish labels. No selectivity verdict (only numbers).
 *
 * INVARIANTS:
 * - Read-only (no model mutations)
 * - Token-only rendering (no hex colors)
 * - All labels in Polish
 */

import React from 'react';
import type { ProtectionResultSetV1, RelayResultV1, TestPointResult } from './types';
import { LABELS } from './types';

interface ProtectionResultsPanelProps {
  result: ProtectionResultSetV1 | null;
  inputHash: string | null;
}

export const ProtectionResultsPanel: React.FC<ProtectionResultsPanelProps> = ({
  result,
  inputHash,
}) => {
  if (!result) {
    return (
      <div className="p-4 text-center text-slate-500">
        {LABELS.results.noData}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{LABELS.results.title}</h3>
        {inputHash && (
          <span className="text-xs font-mono text-slate-400">
            hash: {inputHash.slice(0, 12)}...
          </span>
        )}
      </div>

      {result.relay_results.map((relayResult) => (
        <RelayResultTable key={relayResult.relay_id} relayResult={relayResult} />
      ))}

      <div className="text-xs text-slate-400">
        Sygnatura: {result.deterministic_signature.slice(0, 16)}...
      </div>
    </div>
  );
};

// =============================================================================
// Relay Result Table
// =============================================================================

interface RelayResultTableProps {
  relayResult: RelayResultV1;
}

const RelayResultTable: React.FC<RelayResultTableProps> = ({ relayResult }) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b">
        <span className="font-medium">
          {LABELS.results.relay}: {relayResult.relay_id}
        </span>
        <span className="ml-4 text-sm text-slate-500">
          CB: {relayResult.attached_cb_id}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-3 py-2 text-left">{LABELS.results.testPoint}</th>
            <th className="px-3 py-2 text-right">{LABELS.results.iSecondary}</th>
            <th className="px-3 py-2 text-right">{LABELS.results.f51Time}</th>
            <th className="px-3 py-2 text-center">{LABELS.results.f50Status}</th>
          </tr>
        </thead>
        <tbody>
          {relayResult.per_test_point.map((tp) => (
            <TestPointRow key={tp.point_id} tp={tp} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

// =============================================================================
// Test Point Row
// =============================================================================

interface TestPointRowProps {
  tp: TestPointResult;
}

const TestPointRow: React.FC<TestPointRowProps> = ({ tp }) => {
  const f51 = tp.function_results['51'];
  const f50 = tp.function_results['50'];

  return (
    <tr className="border-t hover:bg-slate-50">
      <td className="px-3 py-2 font-mono">{tp.point_id}</td>
      <td className="px-3 py-2 text-right font-mono">
        {tp.i_a_secondary.toFixed(3)}
      </td>
      <td className="px-3 py-2 text-right font-mono">
        {f51 ? f51.t_trip_s.toFixed(3) : '—'}
      </td>
      <td className="px-3 py-2 text-center">
        {f50 ? (
          f50.picked_up ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
              {LABELS.results.picked}
              {f50.t_trip_s != null && ` (${f50.t_trip_s.toFixed(3)} s)`}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
              {LABELS.results.notPicked}
            </span>
          )
        ) : (
          '—'
        )}
      </td>
    </tr>
  );
};
