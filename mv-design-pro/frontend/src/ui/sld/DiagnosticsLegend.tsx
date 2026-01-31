/**
 * SLD Diagnostics Legend Component
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: PowerFactory-like legend
 * - 100% POLISH UI
 *
 * FEATURES:
 * - Shows severity color legend
 * - Displays counts for each severity level
 * - Shows active filter
 *
 * READ-ONLY: No model mutations.
 */

import type { DiagnosticsSeverityFilter } from '../protection';
import {
  SEVERITY_COLORS,
  SEVERITY_LABELS_PL,
  SEVERITY_FILTER_LABELS_PL,
} from '../protection';

// =============================================================================
// DiagnosticsLegend Component
// =============================================================================

export interface DiagnosticsLegendProps {
  /** Number of errors */
  errorCount: number;

  /** Number of warnings */
  warnCount: number;

  /** Number of info messages */
  infoCount: number;

  /** Active filter */
  filter: DiagnosticsSeverityFilter;
}

/**
 * Diagnostics legend panel.
 * Shows severity markers explanation and counts.
 */
export function DiagnosticsLegend({
  errorCount,
  warnCount,
  infoCount,
  filter,
}: DiagnosticsLegendProps) {
  // Calculate filtered counts based on filter
  const filteredErrorCount = errorCount;
  const filteredWarnCount = filter === 'ERRORS_ONLY' ? 0 : warnCount;
  const filteredInfoCount = filter === 'ALL' ? infoCount : 0;
  const totalVisible = filteredErrorCount + filteredWarnCount + filteredInfoCount;

  // Don't show if nothing visible
  if (totalVisible === 0) return null;

  return (
    <div
      data-testid="sld-diagnostics-legend"
      className="absolute bottom-3 left-3 z-20 rounded-lg border border-slate-300 bg-white/95 p-3 shadow-lg backdrop-blur-sm"
      style={{ minWidth: '180px', maxWidth: '240px' }}
    >
      {/* Header */}
      <div className="mb-2">
        <h4
          data-testid="sld-diagnostics-legend-title"
          className="text-sm font-semibold text-slate-800"
        >
          Diagnostyka zabezpieczen
        </h4>
        <div className="text-xs text-slate-500">
          {SEVERITY_FILTER_LABELS_PL[filter]}
        </div>
      </div>

      {/* Severity legend */}
      <div className="space-y-1.5">
        {/* ERROR */}
        <div
          data-testid="sld-diagnostics-legend-error"
          className={`flex items-center gap-2 ${filter !== 'ALL' && errorCount === 0 ? 'opacity-40' : ''}`}
        >
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold ${SEVERITY_COLORS.ERROR.marker}`}
          >
            !
          </div>
          <span className="text-xs text-slate-700">{SEVERITY_LABELS_PL.ERROR}</span>
          <span className="text-xs text-slate-500 ml-auto font-mono">
            {errorCount}
          </span>
        </div>

        {/* WARN */}
        <div
          data-testid="sld-diagnostics-legend-warn"
          className={`flex items-center gap-2 ${filter === 'ERRORS_ONLY' || warnCount === 0 ? 'opacity-40' : ''}`}
        >
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold ${SEVERITY_COLORS.WARN.marker}`}
          >
            ?
          </div>
          <span className="text-xs text-slate-700">{SEVERITY_LABELS_PL.WARN}</span>
          <span className="text-xs text-slate-500 ml-auto font-mono">
            {warnCount}
          </span>
        </div>

        {/* INFO */}
        <div
          data-testid="sld-diagnostics-legend-info"
          className={`flex items-center gap-2 ${filter !== 'ALL' || infoCount === 0 ? 'opacity-40' : ''}`}
        >
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold ${SEVERITY_COLORS.INFO.marker}`}
          >
            i
          </div>
          <span className="text-xs text-slate-700">{SEVERITY_LABELS_PL.INFO}</span>
          <span className="text-xs text-slate-500 ml-auto font-mono">
            {infoCount}
          </span>
        </div>
      </div>

      {/* Total visible */}
      <div className="mt-2 pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">Widoczne markery:</span>
          <span className="font-semibold text-slate-700">{totalVisible}</span>
        </div>
      </div>

      {/* Fixture notice */}
      <div className="mt-2 pt-2 border-t border-slate-200">
        <div className="text-xs text-slate-500 italic flex items-center gap-1">
          <span>*</span>
          <span>Dane demonstracyjne</span>
        </div>
      </div>
    </div>
  );
}

export default DiagnosticsLegend;
