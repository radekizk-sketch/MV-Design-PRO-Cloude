/**
 * SLD Overlay Legend Component — PR-16
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § B: Results as Overlay (never modifies model)
 * - SYSTEM_SPEC.md: Overlay = pure projection of ResultSet
 *
 * PURPOSE:
 * Renders overlay legend from OverlayPayloadV1.legend.
 * All data comes from backend — UI does NOT generate legend entries.
 *
 * LEGEND CANNOT:
 * - Compute thresholds
 * - Generate descriptions
 * - Guess ranges
 * - Interpret physics
 *
 * 100% Polish UI.
 */

import React, { useMemo } from 'react';
import type { OverlayLegendEntry, OverlayPayloadV1 } from './overlayTypes';
import { VISUAL_STATE_STYLE } from './overlayTypes';

/**
 * Single legend row — renders one legend entry.
 */
interface LegendRowProps {
  entry: OverlayLegendEntry;
}

const LegendRow: React.FC<LegendRowProps> = React.memo(({ entry }) => {
  // Map color_token to a visual indicator style
  const indicatorStyle = useMemo(() => {
    // Map known tokens to visual state styles
    const tokenToState: Record<string, keyof typeof VISUAL_STATE_STYLE> = {
      ok: 'OK',
      warning: 'WARNING',
      critical: 'CRITICAL',
      inactive: 'INACTIVE',
    };

    const state = tokenToState[entry.color_token];
    if (state) {
      const style = VISUAL_STATE_STYLE[state];
      return `${style.bg} ${style.border}`;
    }

    // Fallback for unknown tokens — neutral style
    return 'bg-slate-200 border-slate-400';
  }, [entry.color_token]);

  return (
    <div
      data-testid={`sld-overlay-legend-entry-${entry.color_token}`}
      className="flex items-center gap-2 py-0.5"
    >
      <div
        className={`w-3 h-3 rounded-sm border ${indicatorStyle} flex-shrink-0`}
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
});

LegendRow.displayName = 'LegendRow';

/**
 * Overlay Legend props.
 */
export interface OverlayLegendProps {
  /** Overlay payload (source of legend data) */
  overlay: OverlayPayloadV1 | null;

  /** Whether legend is visible */
  visible?: boolean;
}

/**
 * SLD Overlay Legend.
 *
 * Renders legend entries from OverlayPayloadV1.legend.
 * Positioned as a floating panel (bottom-right by default).
 *
 * ALL data from backend — ZERO UI-generated content.
 */
export const OverlayLegend: React.FC<OverlayLegendProps> = React.memo(
  ({ overlay, visible = true }) => {
    if (!visible || !overlay || overlay.legend.length === 0) {
      return null;
    }

    return (
      <div
        data-testid="sld-overlay-legend"
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
              d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Legenda
          </span>
          <span className="text-[10px] text-slate-400 ml-auto">
            {overlay.analysis_type}
          </span>
        </div>

        {/* Legend entries */}
        <div className="flex flex-col gap-0.5">
          {overlay.legend.map((entry) => (
            <LegendRow key={entry.color_token} entry={entry} />
          ))}
        </div>
      </div>
    );
  }
);

OverlayLegend.displayName = 'OverlayLegend';
