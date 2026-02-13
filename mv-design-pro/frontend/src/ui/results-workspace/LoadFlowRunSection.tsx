/**
 * Load Flow Run Section — PR-LF-03
 *
 * LF-specific metrics and results for RunViewPanel.
 * Renders when analysis_type === 'LOAD_FLOW'.
 *
 * INVARIANTS:
 * - No physics calculations
 * - No model mutations
 * - Polish labels only
 * - Deterministic rendering (sort by node_id / branch_id)
 * - No hardcoded thresholds for coloring
 * - No alert()
 */

import { useEffect, useMemo } from 'react';
import { usePowerFlowResultsStore } from '../power-flow-results/store';
import type { PowerFlowResultV1 } from '../power-flow-results/types';

// =============================================================================
// Types
// =============================================================================

interface LoadFlowRunSectionProps {
  runId: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function LoadFlowRunSection({ runId }: LoadFlowRunSectionProps) {
  const results = usePowerFlowResultsStore((s) => s.results);
  const runHeader = usePowerFlowResultsStore((s) => s.runHeader);
  const isLoading = usePowerFlowResultsStore((s) => s.isLoadingResults);
  const selectRun = usePowerFlowResultsStore((s) => s.selectRun);

  // Load results when runId changes
  useEffect(() => {
    if (runId) {
      selectRun(runId);
    }
  }, [runId, selectRun]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
        Ładowanie wyników rozpływu mocy...
      </div>
    );
  }

  if (!results) {
    return null;
  }

  return (
    <div data-testid="load-flow-run-section">
      {/* Sekcja A — Status analizy */}
      <ConvergenceSection results={results} />

      {/* Sekcja B — Napięcia węzłów */}
      <BusVoltagesTable results={results} />

      {/* Sekcja C — Przepływy gałęzi */}
      <BranchFlowsTable results={results} />

      {/* Sekcja D — Straty */}
      <LossesSection results={results} />
    </div>
  );
}

// =============================================================================
// Sekcja A — Status analizy
// =============================================================================

function ConvergenceSection({ results }: { results: PowerFlowResultV1 }) {
  return (
    <section className="mb-6" data-testid="lf-convergence-section">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">
        Status analizy
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricCard
          label="Zbieżność"
          value={results.converged ? 'Zbieżny' : 'Niezbieżny'}
          unit=""
        />
        <MetricCard
          label="Iteracje"
          value={String(results.iterations_count)}
          unit=""
        />
        <MetricCard
          label="Tolerancja"
          value={results.tolerance_used.toExponential(1)}
          unit=""
        />
        <MetricCard
          label="Moc bazowa"
          value={results.base_mva.toFixed(1)}
          unit="MVA"
        />
      </div>
    </section>
  );
}

// =============================================================================
// Sekcja B — Napięcia węzłów
// =============================================================================

function BusVoltagesTable({ results }: { results: PowerFlowResultV1 }) {
  // Deterministic sort by bus_id (lexicographic)
  const sortedBuses = useMemo(
    () => [...results.bus_results].sort((a, b) => a.bus_id.localeCompare(b.bus_id)),
    [results.bus_results]
  );

  if (sortedBuses.length === 0) return null;

  return (
    <section className="mb-6" data-testid="lf-bus-voltages-table">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">
        Napięcia węzłów ({sortedBuses.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-slate-200">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                Węzeł
              </th>
              <th className="text-right px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                U [p.u.]
              </th>
              <th className="text-right px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                Kąt [°]
              </th>
              <th className="text-right px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                P [MW]
              </th>
              <th className="text-right px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                Q [Mvar]
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedBuses.map((bus) => (
              <tr
                key={bus.bus_id}
                className="hover:bg-slate-50 border-b border-slate-100"
              >
                <td className="px-3 py-1.5 text-slate-700 font-medium">
                  {bus.bus_id}
                </td>
                <td className="px-3 py-1.5 text-slate-700 font-mono text-right">
                  {bus.v_pu.toFixed(4)}
                </td>
                <td className="px-3 py-1.5 text-slate-700 font-mono text-right">
                  {bus.angle_deg.toFixed(2)}
                </td>
                <td className="px-3 py-1.5 text-slate-700 font-mono text-right">
                  {bus.p_injected_mw.toFixed(3)}
                </td>
                <td className="px-3 py-1.5 text-slate-700 font-mono text-right">
                  {bus.q_injected_mvar.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// =============================================================================
// Sekcja C — Przepływy gałęzi
// =============================================================================

function BranchFlowsTable({ results }: { results: PowerFlowResultV1 }) {
  // Deterministic sort by branch_id (lexicographic)
  const sortedBranches = useMemo(
    () =>
      [...results.branch_results].sort((a, b) =>
        a.branch_id.localeCompare(b.branch_id)
      ),
    [results.branch_results]
  );

  if (sortedBranches.length === 0) return null;

  return (
    <section className="mb-6" data-testid="lf-branch-flows-table">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">
        Przepływy gałęzi ({sortedBranches.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-slate-200">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                Gałąź
              </th>
              <th className="text-right px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                P_from [MW]
              </th>
              <th className="text-right px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                Q_from [Mvar]
              </th>
              <th className="text-right px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                P_to [MW]
              </th>
              <th className="text-right px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                Q_to [Mvar]
              </th>
              <th className="text-right px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                Straty P [MW]
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedBranches.map((branch) => (
              <tr
                key={branch.branch_id}
                className="hover:bg-slate-50 border-b border-slate-100"
              >
                <td className="px-3 py-1.5 text-slate-700 font-medium">
                  {branch.branch_id}
                </td>
                <td className="px-3 py-1.5 text-slate-700 font-mono text-right">
                  {branch.p_from_mw.toFixed(3)}
                </td>
                <td className="px-3 py-1.5 text-slate-700 font-mono text-right">
                  {branch.q_from_mvar.toFixed(3)}
                </td>
                <td className="px-3 py-1.5 text-slate-700 font-mono text-right">
                  {branch.p_to_mw.toFixed(3)}
                </td>
                <td className="px-3 py-1.5 text-slate-700 font-mono text-right">
                  {branch.q_to_mvar.toFixed(3)}
                </td>
                <td className="px-3 py-1.5 text-slate-700 font-mono text-right">
                  {branch.losses_p_mw.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// =============================================================================
// Sekcja D — Straty
// =============================================================================

function LossesSection({ results }: { results: PowerFlowResultV1 }) {
  const { summary } = results;

  return (
    <section className="mb-6" data-testid="lf-losses-section">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">
        Straty i bilans
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <MetricCard
          label="Straty P"
          value={summary.total_losses_p_mw.toFixed(4)}
          unit="MW"
        />
        <MetricCard
          label="Straty Q"
          value={summary.total_losses_q_mvar.toFixed(4)}
          unit="Mvar"
        />
        <MetricCard
          label="P bilansujący"
          value={summary.slack_p_mw.toFixed(3)}
          unit="MW"
        />
        <MetricCard
          label="Q bilansujący"
          value={summary.slack_q_mvar.toFixed(3)}
          unit="Mvar"
        />
        <MetricCard
          label="U min"
          value={summary.min_v_pu.toFixed(4)}
          unit="p.u."
        />
        <MetricCard
          label="U max"
          value={summary.max_v_pu.toFixed(4)}
          unit="p.u."
        />
      </div>
    </section>
  );
}

// =============================================================================
// Shared Components
// =============================================================================

function MetricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded p-3">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-lg font-semibold text-slate-800 font-mono">
        {value}
        {unit && <span className="text-xs text-slate-400 ml-1 font-sans">{unit}</span>}
      </div>
    </div>
  );
}
