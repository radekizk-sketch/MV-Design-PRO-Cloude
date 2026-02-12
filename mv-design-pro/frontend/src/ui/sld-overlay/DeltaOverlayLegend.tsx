/**
 * Delta Overlay Legend -- PR-21
 *
 * Legend component for delta overlay on SLD.
 * Uses data from backend delta overlay payload.
 * All labels from backend (Polish), NO UI-generated content.
 *
 * Extends the existing OverlayLegend pattern from PR-16.
 */

import React, { useMemo } from 'react';
import { useSldDeltaOverlayStore } from './sldDeltaOverlayStore';

/**
 * Token-to-visual-state mapping for delta overlay.
 * Deterministic, no physics.
 */
const DELTA_TOKEN_STYLE: Record<
  string,
  { bg: string; border: string }
> = {
  delta_none: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
  },
  delta_change: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
  },
  delta_inactive: {
    bg: 'bg-slate-100',
    border: 'border-slate-300',
  },
};

export interface DeltaOverlayLegendProps {
  /** Whether legend is visible (defaults to true) */
  visible?: boolean;
}

export const DeltaOverlayLegend: React.FC<DeltaOverlayLegendProps> =
  React.memo(({ visible = true }) => {
    const { deltaPayload, enabled, activeComparisonId } =
      useSldDeltaOverlayStore();

    const legendEntries = useMemo(() => {
      if (!deltaPayload) return [];
      return deltaPayload.legend;
    }, [deltaPayload]);

    if (
      !visible ||
      !enabled ||
      !activeComparisonId ||
      !deltaPayload ||
      legendEntries.length === 0
    ) {
      return null;
    }

    return (
      <div
        data-testid="delta-overlay-legend"
        className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200 shadow-lg px-3 py-2 max-w-[220px]"
      >
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-100">
          <svg
            className="w-3.5 h-3.5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Legenda roznic
          </span>
          <span className="text-[10px] text-slate-400 ml-auto">
            {deltaPayload.analysis_type}
          </span>
        </div>

        {/* Legend entries */}
        <div className="flex flex-col gap-0.5">
          {legendEntries.map((entry) => {
            const style = DELTA_TOKEN_STYLE[entry.color_token] || {
              bg: 'bg-slate-200',
              border: 'border-slate-400',
            };

            return (
              <div
                key={entry.color_token}
                data-testid={`delta-legend-entry-${entry.color_token}`}
                className="flex items-center gap-2 py-0.5"
              >
                <div
                  className={`w-3 h-3 rounded-sm border ${style.bg} ${style.border} flex-shrink-0`}
                  aria-hidden="true"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-slate-700 font-medium truncate">
                    {entry.label}
                  </span>
                  {entry.description && (
                    <span className="text-[10px] text-slate-500 truncate">
                      {entry.description}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Content hash (for debugging/determinism verification) */}
        <div className="mt-1.5 pt-1 border-t border-slate-100">
          <span className="text-[9px] text-slate-300 font-mono">
            {deltaPayload.content_hash.slice(0, 16)}...
          </span>
        </div>
      </div>
    );
  });

DeltaOverlayLegend.displayName = 'DeltaOverlayLegend';
