/**
 * Workspace Sidebar — PR-22
 *
 * Left navigation panel listing runs, batches, and comparisons
 * with filter controls.
 *
 * INVARIANTS:
 * - No physics calculations
 * - No model mutations
 * - Deterministic sorting (data arrives pre-sorted from backend)
 * - Polish labels only
 */

import { useResultsWorkspaceStore, useFilteredRuns, useFilteredBatches, useFilteredComparisons } from './store';
import type { WorkspaceFilter, RunSummary, BatchSummary, ComparisonSummary } from './types';
import {
  WORKSPACE_FILTER_LABELS,
  RUN_STATUS_LABELS,
  RUN_STATUS_STYLES,
  BATCH_STATUS_LABELS,
  BATCH_STATUS_STYLES,
  getAnalysisTypeLabel,
} from './types';

const FILTERS: WorkspaceFilter[] = ['ALL', 'DONE', 'FAILED', 'SC_3F', 'SC_2F', 'SC_1F', 'LOAD_FLOW'];

export function WorkspaceSidebar() {
  const _mode = useResultsWorkspaceStore((s) => s.mode);
  void _mode;
  const filter = useResultsWorkspaceStore((s) => s.filter);
  const setFilter = useResultsWorkspaceStore((s) => s.setFilter);
  const selectRun = useResultsWorkspaceStore((s) => s.selectRun);
  const selectBatch = useResultsWorkspaceStore((s) => s.selectBatch);
  const selectComparison = useResultsWorkspaceStore((s) => s.selectComparison);
  const selectedRunId = useResultsWorkspaceStore((s) => s.selectedRunId);
  const selectedBatchId = useResultsWorkspaceStore((s) => s.selectedBatchId);
  const selectedComparisonId = useResultsWorkspaceStore((s) => s.selectedComparisonId);

  const runs = useFilteredRuns();
  const batches = useFilteredBatches();
  const comparisons = useFilteredComparisons();

  return (
    <aside
      className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden"
      data-testid="workspace-sidebar"
    >
      {/* Filter bar */}
      <div className="p-2 border-b border-slate-200">
        <select
          className="w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white"
          value={filter}
          onChange={(e) => setFilter(e.target.value as WorkspaceFilter)}
          data-testid="workspace-filter"
          aria-label="Filtr wyników"
        >
          {FILTERS.map((f) => (
            <option key={f} value={f}>
              {WORKSPACE_FILTER_LABELS[f]}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Runs section */}
        <SidebarSection title="Obliczenia" count={runs.length}>
          {runs.map((run) => (
            <RunItem
              key={run.run_id}
              run={run}
              isSelected={run.run_id === selectedRunId}
              onSelect={() => selectRun(run.run_id)}
            />
          ))}
          {runs.length === 0 && (
            <EmptyMessage text="Brak obliczeń" />
          )}
        </SidebarSection>

        {/* Batches section */}
        <SidebarSection title="Zadania wsadowe" count={batches.length}>
          {batches.map((batch) => (
            <BatchItem
              key={batch.batch_id}
              batch={batch}
              isSelected={batch.batch_id === selectedBatchId}
              onSelect={() => selectBatch(batch.batch_id)}
            />
          ))}
          {batches.length === 0 && (
            <EmptyMessage text="Brak zadań wsadowych" />
          )}
        </SidebarSection>

        {/* Comparisons section */}
        <SidebarSection title="Porównania" count={comparisons.length}>
          {comparisons.map((cmp) => (
            <ComparisonItem
              key={cmp.comparison_id}
              comparison={cmp}
              isSelected={cmp.comparison_id === selectedComparisonId}
              onSelect={() => selectComparison(cmp.comparison_id)}
            />
          ))}
          {comparisons.length === 0 && (
            <EmptyMessage text="Brak porównań" />
          )}
        </SidebarSection>
      </div>
    </aside>
  );
}

// =============================================================================
// Internal Components
// =============================================================================

function SidebarSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-200">
      <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
        <span>{title}</span>
        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-xs">
          {count}
        </span>
      </div>
      <div className="pb-1">{children}</div>
    </div>
  );
}

function RunItem({
  run,
  isSelected,
  onSelect,
}: {
  run: RunSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const styles = RUN_STATUS_STYLES[run.status] ?? RUN_STATUS_STYLES.PENDING;

  return (
    <button
      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 transition-colors ${
        isSelected ? 'bg-slate-200 border-l-2 border-slate-600' : ''
      }`}
      onClick={onSelect}
      data-testid={`sidebar-run-${run.run_id}`}
      aria-selected={isSelected}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${styles.bg.replace('bg-', 'bg-').replace('-50', '-500')}`}
        />
        <span className="font-medium text-slate-700 truncate">
          {getAnalysisTypeLabel(run.analysis_type)}
        </span>
        <span className={`ml-auto text-xs ${styles.text}`}>
          {RUN_STATUS_LABELS[run.status]}
        </span>
      </div>
      <div className="text-xs text-slate-400 mt-0.5 font-mono">
        {run.created_at.slice(0, 19).replace('T', ' ')}
      </div>
    </button>
  );
}

function BatchItem({
  batch,
  isSelected,
  onSelect,
}: {
  batch: BatchSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const styles = BATCH_STATUS_STYLES[batch.status] ?? BATCH_STATUS_STYLES.PENDING;

  return (
    <button
      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 transition-colors ${
        isSelected ? 'bg-slate-200 border-l-2 border-slate-600' : ''
      }`}
      onClick={onSelect}
      data-testid={`sidebar-batch-${batch.batch_id}`}
      aria-selected={isSelected}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-slate-700 truncate">
          {getAnalysisTypeLabel(batch.analysis_type)}
        </span>
        <span className="text-slate-400">
          ({batch.scenario_count} scenariuszy)
        </span>
        <span className={`ml-auto text-xs ${styles.text}`}>
          {BATCH_STATUS_LABELS[batch.status]}
        </span>
      </div>
      <div className="text-xs text-slate-400 mt-0.5 font-mono">
        {batch.created_at.slice(0, 19).replace('T', ' ')}
      </div>
    </button>
  );
}

function ComparisonItem({
  comparison,
  isSelected,
  onSelect,
}: {
  comparison: ComparisonSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 transition-colors ${
        isSelected ? 'bg-slate-200 border-l-2 border-slate-600' : ''
      }`}
      onClick={onSelect}
      data-testid={`sidebar-comparison-${comparison.comparison_id}`}
      aria-selected={isSelected}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-slate-700 truncate">
          {getAnalysisTypeLabel(comparison.analysis_type)}
        </span>
      </div>
      <div className="text-xs text-slate-400 mt-0.5">
        {comparison.base_scenario_id.slice(0, 8)} vs {comparison.other_scenario_id.slice(0, 8)}
      </div>
      <div className="text-xs text-slate-400 font-mono">
        {comparison.created_at.slice(0, 19).replace('T', ' ')}
      </div>
    </button>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="px-3 py-2 text-xs text-slate-400 italic">{text}</div>
  );
}
