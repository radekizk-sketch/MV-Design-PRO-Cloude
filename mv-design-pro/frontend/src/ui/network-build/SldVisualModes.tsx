/**
 * SldVisualModes — Toolbar trybów wizualnych SLD.
 *
 * Przełączanie filtrów wizualnych: Wszystko / Gotowość / Źródła / nN / Zabezpieczenia.
 * Integracja z SLD overlay: elementy poza filtrem → opacity 0.2.
 * Emituje CustomEvent 'sld:visual-filter-change' nasłuchiwany przez renderer SLD.
 *
 * BINDING: 100% PL etykiety. Reużywa VISUAL_FILTERS z keyboardShortcuts.ts.
 */

import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  type VisualFilterMode,
  VISUAL_FILTERS,
} from '../sld/core/keyboardShortcuts';

// =============================================================================
// Icons per mode
// =============================================================================

const MODE_ICONS: Record<VisualFilterMode, JSX.Element> = {
  ALL: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  READINESS_ONLY: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  SOURCES_ONLY: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  NN_ONLY: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  PROTECTION_ONLY: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
};

// =============================================================================
// Component
// =============================================================================

export interface SldVisualModesProps {
  className?: string;
}

export function SldVisualModes({ className }: SldVisualModesProps) {
  const [activeMode, setActiveMode] = useState<VisualFilterMode>('ALL');

  const handleModeChange = useCallback((mode: VisualFilterMode) => {
    setActiveMode(mode);
    window.dispatchEvent(
      new CustomEvent('sld:visual-filter-change', { detail: { mode } }),
    );
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+G → READINESS_ONLY
      if (e.ctrlKey && !e.shiftKey && e.key === 'g') {
        e.preventDefault();
        handleModeChange(activeMode === 'READINESS_ONLY' ? 'ALL' : 'READINESS_ONLY');
        return;
      }
      // Ctrl+Shift+S → SOURCES_ONLY
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handleModeChange(activeMode === 'SOURCES_ONLY' ? 'ALL' : 'SOURCES_ONLY');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMode, handleModeChange]);

  return (
    <div
      className={clsx(
        'flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-md p-0.5',
        className,
      )}
      data-testid="sld-visual-modes"
      role="toolbar"
      aria-label="Tryby wizualne SLD"
    >
      {VISUAL_FILTERS.map((filter) => {
        const isActive = activeMode === filter.mode;
        return (
          <button
            key={filter.mode}
            type="button"
            onClick={() => handleModeChange(filter.mode)}
            title={`${filter.label_pl}${filter.shortcut ? ` (${filter.shortcut})` : ''}\n${filter.description_pl}`}
            className={clsx(
              'flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors',
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100',
            )}
            aria-pressed={isActive}
          >
            {MODE_ICONS[filter.mode]}
            <span className="hidden lg:inline">{filter.label_pl}</span>
          </button>
        );
      })}

      {/* Active mode indicator */}
      {activeMode !== 'ALL' && (
        <div className="ml-1 flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Filtr aktywny
        </div>
      )}
    </div>
  );
}
