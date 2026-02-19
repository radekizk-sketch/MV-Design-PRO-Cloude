/**
 * Label Mode Toolbar — §8 UX 10/10
 *
 * Przełącznik trybu etykiet technicznych na SLD:
 *   [ Minimalny ] [ Techniczny ] [ Analityczny ]
 *
 * INVARIANTS:
 * - No model mutations
 * - All labels Polish
 */

import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import { useLabelModeStore } from './labelModeStore';
import { LABEL_MODE_LABELS, LABEL_MODE_DESCRIPTIONS } from './sldLabelLayer';
import type { LabelMode } from './sldLabelLayer';

export interface LabelModeToolbarProps {
  compact?: boolean;
}

export const LabelModeToolbar: React.FC<LabelModeToolbarProps> = ({
  compact = false,
}) => {
  const { mode, setMode, visible, toggleVisible } = useLabelModeStore();

  const handleModeChange = useCallback(
    (m: LabelMode) => {
      setMode(m);
    },
    [setMode],
  );

  return (
    <div
      className="flex items-center gap-2"
      data-testid="label-mode-toolbar"
    >
      {/* Visibility toggle */}
      <button
        onClick={toggleVisible}
        className={clsx(
          'text-xs px-2 py-1 rounded border transition-colors',
          visible
            ? 'bg-gray-100 border-gray-300 text-gray-700'
            : 'bg-white border-gray-200 text-gray-400',
        )}
        title={visible ? 'Ukryj etykiety' : 'Pokaż etykiety'}
        data-testid="label-visibility-toggle"
      >
        {visible ? 'Etykiety: wł.' : 'Etykiety: wył.'}
      </button>

      {/* Mode selector */}
      {visible && (
        <div className="flex rounded-md border border-gray-300 overflow-hidden">
          {(Object.keys(LABEL_MODE_LABELS) as LabelMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={clsx(
                'px-2 py-1 text-xs transition-colors border-r last:border-r-0 border-gray-300',
                mode === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-blue-50',
              )}
              title={LABEL_MODE_DESCRIPTIONS[m]}
              data-testid={`label-mode-${m}`}
            >
              {compact ? LABEL_MODE_LABELS[m].charAt(0) : LABEL_MODE_LABELS[m]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LabelModeToolbar;
