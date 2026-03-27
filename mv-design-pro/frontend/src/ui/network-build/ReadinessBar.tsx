/**
 * ReadinessBar — Dolny pasek gotowości do analizy.
 *
 * Persistent bar widoczny w MODEL_EDIT pokazujący stan gotowości sieci
 * z szybkim dostępem do napraw.
 *
 * BINDING: 100% PL etykiety.
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import { useNetworkBuildDerived } from './networkBuildStore';

// =============================================================================
// Category filter
// =============================================================================

type FilterCategory = 'all' | 'topologia' | 'katalogi' | 'eksploatacja' | 'analiza';

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  all: 'Wszystkie',
  topologia: 'Topologia',
  katalogi: 'Katalogi',
  eksploatacja: 'Eksploatacja',
  analiza: 'Analiza',
};

function categorizeBlocker(code: string): FilterCategory {
  const lc = code.toLowerCase();
  if (lc.includes('topology') || lc.includes('island') || lc.includes('disconnected') || lc.includes('voltage_mismatch')) {
    return 'topologia';
  }
  if (lc.includes('catalog') || lc.includes('missing_type') || lc.includes('no_catalog')) {
    return 'katalogi';
  }
  if (lc.includes('switch_state') || lc.includes('nop') || lc.includes('normal_state') || lc.includes('coupler')) {
    return 'eksploatacja';
  }
  return 'analiza';
}

// =============================================================================
// ReadinessBar
// =============================================================================

export interface ReadinessBarProps {
  className?: string;
}

export function ReadinessBar({ className }: ReadinessBarProps) {
  const { readiness, blockersByCategory, isReady } = useNetworkBuildDerived();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  const blockers = readiness?.blockers ?? [];
  const warnings = readiness?.warnings ?? [];

  const filteredBlockers = activeFilter === 'all'
    ? blockers
    : blockers.filter((b) => categorizeBlocker(b.code) === activeFilter);

  // Don't render if no readiness data
  if (!readiness) return null;

  // Compact mode when ready
  if (isReady) {
    return (
      <div
        className={clsx(
          'flex items-center gap-3 px-4 py-1.5 bg-eng-green/10 border-t border-eng-green/30',
          className,
        )}
        data-testid="readiness-bar"
        data-ready="true"
      >
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-eng-green" />
        <span className="text-[11px] font-semibold text-eng-green">
          Gotowy do analizy
        </span>
        <span className="text-[10px] text-chrome-500">
          {warnings.length > 0 ? `${warnings.length} ostrzeżeń` : 'Brak zastrzeżeń'}
        </span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'border-t border-chrome-200 bg-white',
        className,
      )}
      data-testid="readiness-bar"
      data-ready="false"
    >
      {/* Top row: summary + category filters */}
      <div className="flex items-center gap-3 px-4 py-1.5">
        {/* Counters */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {blockersByCategory.total > 0 && (
            <span className="text-[11px] font-semibold text-eng-red">
              {blockersByCategory.total} blokad
            </span>
          )}
          {warnings.length > 0 && (
            <span className="text-[11px] font-semibold text-eng-amber">
              {warnings.length} ostrzeżeń
            </span>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-chrome-200" />

        {/* Category chips */}
        <div className="flex items-center gap-1 flex-1">
          {(Object.keys(CATEGORY_LABELS) as FilterCategory[]).map((cat) => {
            const count = cat === 'all' ? blockersByCategory.total : blockersByCategory[cat as keyof typeof blockersByCategory] as number;
            if (cat !== 'all' && count === 0) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveFilter(cat)}
                className={clsx(
                  'px-2 py-0.5 text-[10px] rounded-full transition-colors',
                  activeFilter === cat
                    ? 'bg-ind-100 text-ind-800 font-medium'
                    : 'text-chrome-500 hover:bg-chrome-100',
                )}
              >
                {CATEGORY_LABELS[cat]}
                {count > 0 && ` (${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom row: top blockers */}
      {filteredBlockers.length > 0 && (
        <div className="px-4 pb-1.5 flex items-center gap-4 overflow-hidden">
          {filteredBlockers.slice(0, 3).map((b, i) => (
            <span
              key={b.code + '-' + i}
              className="text-[10px] text-eng-red truncate max-w-[250px]"
              title={b.message_pl}
            >
              {b.message_pl}
            </span>
          ))}
          {filteredBlockers.length > 3 && (
            <span className="text-[10px] text-chrome-400 flex-shrink-0">
              +{filteredBlockers.length - 3} więcej
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default ReadinessBar;
