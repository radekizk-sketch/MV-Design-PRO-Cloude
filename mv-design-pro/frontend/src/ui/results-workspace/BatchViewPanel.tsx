/**
 * Batch View Panel — PR-22
 *
 * Central panel for BATCH mode: scenario table + status.
 * Shows batch job details with scenario list and ability to compare.
 *
 * INVARIANTS:
 * - No physics calculations
 * - No model mutations
 * - Polish labels only
 * - Deterministic rendering
 */

import { useSelectedBatchDetail, useResultsWorkspaceStore } from './store';
import type { BatchStatusValue } from './types';
import { BATCH_STATUS_LABELS, BATCH_STATUS_STYLES, getAnalysisTypeLabel } from './types';

export function BatchViewPanel() {
  const selectedBatch = useSelectedBatchDetail();
  const _selectComparison = useResultsWorkspaceStore((s) => s.selectComparison);
  void _selectComparison;

  if (!selectedBatch) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-slate-400 text-sm"
        data-testid="batch-view-empty"
      >
        Wybierz zadanie wsadowe z panelu bocznego
      </div>
    );
  }

  const statusStyles =
    BATCH_STATUS_STYLES[selectedBatch.status as BatchStatusValue] ??
    BATCH_STATUS_STYLES.PENDING;

  return (
    <div className="flex-1 overflow-y-auto p-4" data-testid="batch-view-panel">
      {/* Batch info header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-semibold text-slate-800">
            Zadanie wsadowe: {getAnalysisTypeLabel(selectedBatch.analysis_type)}
          </h2>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}
          >
            {BATCH_STATUS_LABELS[selectedBatch.status as BatchStatusValue] ??
              selectedBatch.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div>
            <span className="font-medium">Utworzono:</span>{' '}
            {selectedBatch.created_at.slice(0, 19).replace('T', ' ')}
          </div>
          <div>
            <span className="font-medium">Scenariusze:</span>{' '}
            {selectedBatch.scenario_count}
          </div>
          <div>
            <span className="font-medium">Obliczenia:</span>{' '}
            {selectedBatch.run_count}
          </div>
          <div className="font-mono">
            <span className="font-medium font-sans">Hash:</span>{' '}
            {selectedBatch.batch_input_hash.slice(0, 16)}
          </div>
        </div>

        {/* Errors */}
        {selectedBatch.errors.length > 0 && (
          <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded">
            <div className="text-sm font-medium text-rose-700 mb-1">
              Błędy wykonania:
            </div>
            {selectedBatch.errors.map((err, idx) => (
              <div key={idx} className="text-xs text-rose-600">
                {err}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scenarios table */}
      <section className="mb-6" data-testid="batch-scenarios-table">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Scenariusze ({selectedBatch.scenario_count})
        </h3>

        {selectedBatch.scenario_count > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                    #
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                    Typ analizy
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: selectedBatch.scenario_count }, (_, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 border-b border-slate-100"
                  >
                    <td className="px-3 py-1.5 text-slate-700">{idx + 1}</td>
                    <td className="px-3 py-1.5 text-slate-700">
                      {getAnalysisTypeLabel(selectedBatch.analysis_type)}
                    </td>
                    <td className="px-3 py-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}
                      >
                        {BATCH_STATUS_LABELS[selectedBatch.status as BatchStatusValue]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic py-2">
            Brak scenariuszy
          </div>
        )}
      </section>

      {/* Summary stats */}
      <section data-testid="batch-summary">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Podsumowanie
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Scenariusze"
            value={String(selectedBatch.scenario_count)}
          />
          <SummaryCard
            label="Obliczenia"
            value={String(selectedBatch.run_count)}
          />
          <SummaryCard
            label="Status"
            value={
              BATCH_STATUS_LABELS[selectedBatch.status as BatchStatusValue] ??
              selectedBatch.status
            }
          />
          <SummaryCard
            label="Błędy"
            value={String(selectedBatch.errors.length)}
          />
        </div>
      </section>
    </div>
  );
}

// =============================================================================
// Internal Components
// =============================================================================

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded p-3">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}
