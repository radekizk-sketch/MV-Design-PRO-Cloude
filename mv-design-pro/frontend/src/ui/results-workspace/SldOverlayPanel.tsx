/**
 * SLD Overlay Panel — PR-22 + LF Overlay
 *
 * Right panel embedding SLD viewer with overlay controls.
 * Integrates with PR-16 overlay store, PR-21 delta overlay store,
 * and Load Flow overlay adapter.
 *
 * INVARIANTS:
 * - No physics calculations
 * - No model mutations
 * - Overlay data from stores (PR-16 / PR-21)
 * - LF overlay from adapter (token-only)
 * - Polish labels only
 * - Sort element_id before render
 * - Stable React keys
 */

import { useEffect } from 'react';
import { useResultsWorkspaceStore, useSelectedRunDetail } from './store';
import { useOverlayStore } from '../sld-overlay/overlayStore';
import { useSldDeltaOverlayStore } from '../sld-overlay/sldDeltaOverlayStore';
import { usePowerFlowResultsStore } from '../power-flow-results/store';
import { buildLoadFlowOverlay } from '../sld-overlay/LoadFlowOverlayAdapter';
import type { OverlayDisplayMode } from './types';
import { OVERLAY_MODE_LABELS } from './types';
import type { LoadFlowOverlayMode } from '../power-flow-results/types';
import { LOAD_FLOW_OVERLAY_MODE_LABELS } from '../power-flow-results/types';

const OVERLAY_MODES: OverlayDisplayMode[] = ['result', 'delta', 'none'];
const LF_OVERLAY_MODES: LoadFlowOverlayMode[] = ['voltage', 'loading', 'flow'];

export function SldOverlayPanel() {
  const overlayMode = useResultsWorkspaceStore((s) => s.overlayMode);
  const setOverlayMode = useResultsWorkspaceStore((s) => s.setOverlayMode);
  const mode = useResultsWorkspaceStore((s) => s.mode);

  const selectedRun = useSelectedRunDetail();

  const overlayEnabled = useOverlayStore((s) => s.enabled);
  const overlayRunId = useOverlayStore((s) => s.activeRunId);
  const loadOverlay = useOverlayStore((s) => s.loadOverlay);

  const deltaEnabled = useSldDeltaOverlayStore((s) => s.enabled);
  const deltaComparisonId = useSldDeltaOverlayStore((s) => s.activeComparisonId);

  // LF overlay state
  const lfOverlayMode = usePowerFlowResultsStore((s) => s.overlayMode);
  const setLfOverlayMode = usePowerFlowResultsStore((s) => s.setOverlayMode);
  const lfResults = usePowerFlowResultsStore((s) => s.results);
  const lfInterpretation = usePowerFlowResultsStore((s) => s.interpretation);
  const lfRunId = usePowerFlowResultsStore((s) => s.selectedRunId);

  const isLoadFlowRun = selectedRun?.analysis_type === 'LOAD_FLOW';

  // Build and apply LF overlay when mode/results change
  useEffect(() => {
    if (
      isLoadFlowRun &&
      overlayMode === 'result' &&
      lfResults &&
      lfRunId
    ) {
      const payload = buildLoadFlowOverlay(
        lfResults,
        lfInterpretation,
        lfOverlayMode,
        lfRunId
      );
      loadOverlay(payload);
    }
  }, [isLoadFlowRun, overlayMode, lfResults, lfInterpretation, lfOverlayMode, lfRunId, loadOverlay]);

  return (
    <div
      className="w-80 border-l border-slate-200 bg-white flex flex-col"
      data-testid="sld-overlay-panel"
    >
      {/* Overlay controls */}
      <div className="p-3 border-b border-slate-200">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Schemat jednokreskowy
        </h3>

        {/* Overlay mode selector */}
        <div className="flex gap-1 mb-2" role="radiogroup" aria-label="Tryb nakładki">
          {OVERLAY_MODES.map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={overlayMode === m}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                overlayMode === m
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setOverlayMode(m)}
              data-testid={`overlay-mode-${m}`}
            >
              {OVERLAY_MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* LF overlay mode selector (only for LOAD_FLOW runs in result mode) */}
        {isLoadFlowRun && overlayMode === 'result' && (
          <div className="mt-2" data-testid="lf-overlay-mode-selector">
            <div className="text-xs text-slate-500 mb-1">Tryb rozpływu mocy</div>
            <div className="flex gap-1" role="radiogroup" aria-label="Tryb nakładki rozpływu mocy">
              {LF_OVERLAY_MODES.map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={lfOverlayMode === m}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                    lfOverlayMode === m
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                  onClick={() => setLfOverlayMode(m)}
                  data-testid={`lf-overlay-mode-${m}`}
                >
                  {LOAD_FLOW_OVERLAY_MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Overlay status */}
        <div className="text-xs text-slate-500 space-y-1 mt-2">
          {overlayMode === 'result' && (
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  overlayEnabled && overlayRunId
                    ? 'bg-emerald-400'
                    : 'bg-slate-300'
                }`}
              />
              <span>
                {overlayRunId
                  ? `Nakładka aktywna (${overlayRunId.slice(0, 8)})`
                  : 'Brak nakładki wynikowej'}
              </span>
            </div>
          )}

          {overlayMode === 'delta' && (
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  deltaEnabled && deltaComparisonId
                    ? 'bg-amber-400'
                    : 'bg-slate-300'
                }`}
              />
              <span>
                {deltaComparisonId
                  ? `Nakładka delta (${deltaComparisonId.slice(0, 8)})`
                  : 'Brak nakładki porównawczej'}
              </span>
            </div>
          )}

          {overlayMode === 'none' && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span>Nakładka wyłączona</span>
            </div>
          )}
        </div>
      </div>

      {/* SLD Viewer placeholder */}
      <div className="flex-1 bg-slate-50 flex items-center justify-center">
        <div
          className="text-center text-slate-400"
          data-testid="sld-viewer-area"
        >
          <div className="text-4xl mb-2">
            {/* SLD icon */}
            <svg
              className="w-16 h-16 mx-auto text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
          </div>
          <div className="text-xs">Schemat jednokreskowy</div>
          <div className="text-xs mt-1">
            {mode === 'COMPARE'
              ? 'Widok porównania'
              : mode === 'RUN'
                ? 'Widok wyników'
                : 'Widok scenariuszy'}
          </div>
        </div>
      </div>

      {/* Legend (when overlay active) */}
      {overlayMode !== 'none' && (
        <div className="p-3 border-t border-slate-200" data-testid="overlay-legend">
          <h4 className="text-xs font-medium text-slate-600 mb-1">
            Legenda
          </h4>
          <div className="space-y-1">
            <LegendItem color="bg-emerald-400" label="Norma" />
            <LegendItem color="bg-amber-400" label="Ostrzeżenie" />
            <LegendItem color="bg-rose-400" label="Krytyczne" />
            <LegendItem color="bg-slate-300" label="Nieaktywne" />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Internal Components
// =============================================================================

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span className={`w-3 h-3 rounded-sm ${color}`} />
      <span>{label}</span>
    </div>
  );
}
