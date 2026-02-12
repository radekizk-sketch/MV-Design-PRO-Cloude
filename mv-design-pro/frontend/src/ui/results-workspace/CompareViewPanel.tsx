/**
 * Compare View Panel — PR-22
 *
 * Central panel for COMPARE mode: global deltas + per-element delta table.
 * Displays comparison between two runs/scenarios.
 *
 * INVARIANTS:
 * - No physics calculations
 * - No model mutations
 * - Polish labels only
 * - Deterministic rendering
 */

import { useSelectedComparisonDetail, useResultsWorkspaceStore } from './store';
import { useComparisonStore } from '../comparisons/store';
import type {
  NumericDelta,
  ElementDelta,
} from '../comparisons/types';
import {
  GLOBAL_DELTA_KEY_LABELS,
  getDeltaDirection,
  DELTA_DIRECTION_ARROWS,
  DELTA_DIRECTION_STYLES,
} from '../comparisons/types';
import { getAnalysisTypeLabel } from './types';

export function CompareViewPanel() {
  const selectedComparison = useSelectedComparisonDetail();
  const comparisonDetail = useComparisonStore((s) => s.selectedComparison);
  const setOverlayMode = useResultsWorkspaceStore((s) => s.setOverlayMode);

  if (!selectedComparison) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-slate-400 text-sm"
        data-testid="compare-view-empty"
      >
        Wybierz porównanie z panelu bocznego
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4" data-testid="compare-view-panel">
      {/* Comparison info header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-semibold text-slate-800">
            Porównanie: {getAnalysisTypeLabel(selectedComparison.analysis_type)}
          </h2>
          <button
            className="ml-auto text-xs px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            onClick={() => setOverlayMode('delta')}
            data-testid="compare-show-on-sld"
          >
            Pokaż różnice na schemacie
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div>
            <span className="font-medium">Scenariusz bazowy:</span>{' '}
            <span className="font-mono">{selectedComparison.base_scenario_id.slice(0, 12)}</span>
          </div>
          <div>
            <span className="font-medium">Scenariusz porównawczy:</span>{' '}
            <span className="font-mono">{selectedComparison.other_scenario_id.slice(0, 12)}</span>
          </div>
          <div className="font-mono">
            <span className="font-medium font-sans">Hash:</span>{' '}
            {selectedComparison.input_hash.slice(0, 16)}
          </div>
          <div>
            <span className="font-medium">Utworzono:</span>{' '}
            {selectedComparison.created_at.slice(0, 19).replace('T', ' ')}
          </div>
        </div>
      </div>

      {/* Global Deltas */}
      {comparisonDetail?.deltas_global && (
        <section className="mb-6" data-testid="compare-global-deltas">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Różnice globalne
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(comparisonDetail.deltas_global)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, delta]) => (
                <DeltaCard
                  key={key}
                  label={GLOBAL_DELTA_KEY_LABELS[key] ?? key}
                  delta={delta}
                />
              ))}
          </div>
        </section>
      )}

      {/* Per-Source Delta Table */}
      {comparisonDetail?.deltas_by_source &&
        comparisonDetail.deltas_by_source.length > 0 && (
          <DeltaTable
            title="Różnice wg źródeł"
            testId="compare-source-deltas"
            elements={comparisonDetail.deltas_by_source}
          />
        )}

      {/* Per-Branch Delta Table */}
      {comparisonDetail?.deltas_by_branch &&
        comparisonDetail.deltas_by_branch.length > 0 && (
          <DeltaTable
            title="Różnice wg gałęzi"
            testId="compare-branch-deltas"
            elements={comparisonDetail.deltas_by_branch}
          />
        )}

      {/* No comparison detail loaded */}
      {!comparisonDetail && (
        <div className="text-center text-slate-400 text-sm py-8">
          Szczegóły porównania nie zostały jeszcze załadowane
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Internal Components
// =============================================================================

function DeltaCard({
  label,
  delta,
}: {
  label: string;
  delta: NumericDelta;
}) {
  const direction = getDeltaDirection(delta);
  const dirStyle = DELTA_DIRECTION_STYLES[direction];
  const arrow = DELTA_DIRECTION_ARROWS[direction];

  return (
    <div className="bg-white border border-slate-200 rounded p-3">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold text-slate-800">
          {delta.base.toFixed(3)}
        </span>
        <span className={`text-sm font-medium ${dirStyle}`}>
          {arrow} {delta.abs >= 0 ? '+' : ''}{delta.abs.toFixed(3)}
        </span>
      </div>
      {delta.rel != null && (
        <div className={`text-xs mt-0.5 ${dirStyle}`}>
          ({delta.rel >= 0 ? '+' : ''}{(delta.rel * 100).toFixed(2)}%)
        </div>
      )}
    </div>
  );
}

function DeltaTable({
  title,
  testId,
  elements,
}: {
  title: string;
  testId: string;
  elements: ElementDelta[];
}) {
  // Collect all delta keys across elements for columns
  const allKeys = new Set<string>();
  for (const el of elements) {
    for (const key of Object.keys(el.deltas)) {
      allKeys.add(key);
    }
  }
  const sortedKeys = Array.from(allKeys).sort();

  return (
    <section className="mb-6" data-testid={testId}>
      <h3 className="text-sm font-semibold text-slate-700 mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-slate-200">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-3 py-2 font-medium text-slate-600 border-b border-slate-200">
                Element
              </th>
              {sortedKeys.map((key) => (
                <th
                  key={key}
                  className="text-left px-3 py-2 font-medium text-slate-600 border-b border-slate-200"
                >
                  {GLOBAL_DELTA_KEY_LABELS[key] ?? key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {elements.map((el) => (
              <tr
                key={el.element_ref}
                className="hover:bg-slate-50 border-b border-slate-100"
              >
                <td className="px-3 py-1.5 text-slate-700 font-mono">
                  {el.element_ref.slice(0, 16)}
                </td>
                {sortedKeys.map((key) => {
                  const delta = el.deltas[key];
                  if (!delta) {
                    return (
                      <td key={key} className="px-3 py-1.5 text-slate-400">
                        -
                      </td>
                    );
                  }
                  const direction = getDeltaDirection(delta);
                  const dirStyle = DELTA_DIRECTION_STYLES[direction];
                  const arrow = DELTA_DIRECTION_ARROWS[direction];

                  return (
                    <td key={key} className="px-3 py-1.5">
                      <span className="text-slate-700 font-mono">
                        {delta.base.toFixed(3)}
                      </span>
                      <span className={`ml-1 ${dirStyle}`}>
                        {arrow}
                        {delta.abs.toFixed(3)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
