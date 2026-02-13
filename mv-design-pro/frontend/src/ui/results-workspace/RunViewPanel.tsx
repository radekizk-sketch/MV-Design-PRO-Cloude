/**
 * Run View Panel — PR-22
 *
 * Central panel for RUN mode: global metrics + per-element table.
 * Displays results from the selected run with navigation to SLD overlay.
 *
 * INVARIANTS:
 * - No physics calculations
 * - No model mutations
 * - Polish labels only
 * - Deterministic rendering (no Date.now, no Math.random)
 */

import { useSelectedRunDetail } from './store';
import { useResultsInspectorStore } from '../results-inspector/store';
import type { RunStatusValue } from './types';
import { RUN_STATUS_LABELS, RUN_STATUS_STYLES, getAnalysisTypeLabel } from './types';
import { LoadFlowRunSection } from './LoadFlowRunSection';

/**
 * Global metric card display.
 */
interface MetricItem {
  label: string;
  value: string;
  unit: string;
}

export function RunViewPanel() {
  const selectedRun = useSelectedRunDetail();
  const busResults = useResultsInspectorStore((s) => s.busResults);
  const branchResults = useResultsInspectorStore((s) => s.branchResults);
  const shortCircuitResults = useResultsInspectorStore((s) => s.shortCircuitResults);
  const isLoadingBuses = useResultsInspectorStore((s) => s.isLoadingBuses);
  const isLoadingBranches = useResultsInspectorStore((s) => s.isLoadingBranches);
  const isLoadingShortCircuit = useResultsInspectorStore((s) => s.isLoadingShortCircuit);

  if (!selectedRun) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-slate-400 text-sm"
        data-testid="run-view-empty"
      >
        Wybierz obliczenie z panelu bocznego
      </div>
    );
  }

  const statusStyles = RUN_STATUS_STYLES[selectedRun.status as RunStatusValue] ?? RUN_STATUS_STYLES.PENDING;

  return (
    <div className="flex-1 overflow-y-auto p-4" data-testid="run-view-panel">
      {/* Run info header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-semibold text-slate-800">
            {getAnalysisTypeLabel(selectedRun.analysis_type)}
          </h2>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}
          >
            {RUN_STATUS_LABELS[selectedRun.status as RunStatusValue] ?? selectedRun.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div>
            <span className="font-medium">Utworzono:</span>{' '}
            {selectedRun.created_at.slice(0, 19).replace('T', ' ')}
          </div>
          {selectedRun.finished_at && (
            <div>
              <span className="font-medium">Zakończono:</span>{' '}
              {selectedRun.finished_at.slice(0, 19).replace('T', ' ')}
            </div>
          )}
          <div className="font-mono">
            <span className="font-medium font-sans">Hash:</span>{' '}
            {selectedRun.solver_input_hash.slice(0, 16)}
          </div>
        </div>

        {selectedRun.error_message && (
          <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded text-sm text-rose-700">
            {selectedRun.error_message}
          </div>
        )}
      </div>

      {/* Load Flow specific section */}
      {selectedRun.analysis_type === 'LOAD_FLOW' && (
        <LoadFlowRunSection runId={selectedRun.id} />
      )}

      {/* SC/Generic section — shown only for non-LOAD_FLOW analysis types */}
      {selectedRun.analysis_type !== 'LOAD_FLOW' && (
        <>
          {/* Global Metrics (from short-circuit results if available) */}
          {shortCircuitResults && shortCircuitResults.rows.length > 0 && (
            <section className="mb-6" data-testid="run-global-metrics">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Metryki globalne
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {shortCircuitResults.rows.slice(0, 1).map((row) => {
                  const metrics: MetricItem[] = [];
                  if (row.ikss_ka != null) {
                    metrics.push({ label: "Ik''", value: row.ikss_ka.toFixed(3), unit: 'kA' });
                  }
                  if (row.ip_ka != null) {
                    metrics.push({ label: 'ip', value: row.ip_ka.toFixed(3), unit: 'kA' });
                  }
                  if (row.ith_ka != null) {
                    metrics.push({ label: 'Ith', value: row.ith_ka.toFixed(3), unit: 'kA' });
                  }
                  if (row.sk_mva != null) {
                    metrics.push({ label: "Sk''", value: row.sk_mva.toFixed(1), unit: 'MVA' });
                  }
                  return metrics.map((m) => (
                    <MetricCard key={m.label} label={m.label} value={m.value} unit={m.unit} />
                  ));
                })}
              </div>
            </section>
          )}

          {/* Bus Results Table */}
          {isLoadingBuses ? (
            <LoadingIndicator text="Ładowanie wyników węzłowych..." />
          ) : (
            busResults &&
            busResults.rows.length > 0 && (
              <ResultsTable
                title="Szyny"
                testId="run-bus-table"
                columns={['Nazwa', 'Un [kV]', 'U [kV]', 'U [j.w.]']}
                rows={busResults.rows.map((row) => [
                  row.name,
                  row.un_kv.toFixed(1),
                  row.u_kv != null ? row.u_kv.toFixed(3) : '-',
                  row.u_pu != null ? row.u_pu.toFixed(4) : '-',
                ])}
              />
            )
          )}

          {/* Branch Results Table */}
          {isLoadingBranches ? (
            <LoadingIndicator text="Ładowanie wyników gałęziowych..." />
          ) : (
            branchResults &&
            branchResults.rows.length > 0 && (
              <ResultsTable
                title="Gałęzie"
                testId="run-branch-table"
                columns={['Nazwa', 'I [A]', 'P [MW]', 'Q [Mvar]', 'Obciążenie [%]']}
                rows={branchResults.rows.map((row) => [
                  row.name,
                  row.i_a != null ? row.i_a.toFixed(1) : '-',
                  row.p_mw != null ? row.p_mw.toFixed(3) : '-',
                  row.q_mvar != null ? row.q_mvar.toFixed(3) : '-',
                  row.loading_pct != null ? row.loading_pct.toFixed(1) : '-',
                ])}
              />
            )
          )}

          {/* Short Circuit Results Table */}
          {isLoadingShortCircuit ? (
            <LoadingIndicator text="Ładowanie wyników zwarciowych..." />
          ) : (
            shortCircuitResults &&
            shortCircuitResults.rows.length > 0 && (
              <ResultsTable
                title="Zwarcia"
                testId="run-sc-table"
                columns={['Element', "Ik'' [kA]", 'ip [kA]', 'Ith [kA]', "Sk'' [MVA]"]}
                rows={shortCircuitResults.rows.map((row) => [
                  row.target_name ?? row.target_id,
                  row.ikss_ka != null ? row.ikss_ka.toFixed(3) : '-',
                  row.ip_ka != null ? row.ip_ka.toFixed(3) : '-',
                  row.ith_ka != null ? row.ith_ka.toFixed(3) : '-',
                  row.sk_mva != null ? row.sk_mva.toFixed(1) : '-',
                ])}
              />
            )
          )}

          {/* No results message */}
          {!isLoadingBuses &&
            !isLoadingBranches &&
            !isLoadingShortCircuit &&
            !busResults &&
            !branchResults &&
            !shortCircuitResults &&
            selectedRun.status === 'DONE' && (
              <div className="text-center text-slate-400 text-sm py-8">
                Brak danych wynikowych dla tego obliczenia
              </div>
            )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Internal Components
// =============================================================================

function MetricCard({
  label,
  value,
  unit,
}: MetricItem) {
  return (
    <div className="bg-white border border-slate-200 rounded p-3">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-lg font-semibold text-slate-800">
        {value}
        <span className="text-xs text-slate-400 ml-1">{unit}</span>
      </div>
    </div>
  );
}

function ResultsTable({
  title,
  testId,
  columns,
  rows,
}: {
  title: string;
  testId: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <section className="mb-6" data-testid={testId}>
      <h3 className="text-sm font-semibold text-slate-700 mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-slate-200">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left px-3 py-2 font-medium text-slate-600 border-b border-slate-200"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-slate-50 border-b border-slate-100"
              >
                {row.map((cell, cidx) => (
                  <td
                    key={cidx}
                    className="px-3 py-1.5 text-slate-700 font-mono"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LoadingIndicator({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      {text}
    </div>
  );
}
