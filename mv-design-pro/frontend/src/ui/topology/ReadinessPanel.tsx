/**
 * ReadinessPanel — panel gotowości sieci do analizy.
 *
 * Konsumuje readiness + fix_actions ze SnapshotStore.
 * Wyświetla blokery, ostrzeżenia, i nawiguje do elementu wymagającego naprawy.
 *
 * BINDING: PL labels, no codenames.
 * DETERMINISTIC: sorted outputs, stable rendering.
 */

import { useCallback } from 'react';
import type { ReadinessInfo, FixAction } from '../../types/enm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReadinessPanelProps {
  readiness: ReadinessInfo | null;
  fixActions: FixAction[];
  onFixAction?: (action: FixAction) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReadinessPanel({
  readiness,
  fixActions,
  onFixAction,
}: ReadinessPanelProps) {
  const handleFixClick = useCallback(
    (action: FixAction) => {
      onFixAction?.(action);
    },
    [onFixAction],
  );

  if (!readiness) {
    return (
      <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-400">
        Brak danych gotowości
      </div>
    );
  }

  const blockerCount = readiness.blockers?.length ?? 0;
  const warningCount = readiness.warnings?.length ?? 0;

  if (readiness.ready && blockerCount === 0 && warningCount === 0) {
    return (
      <div className="px-3 py-2 bg-green-50 border-b border-green-200 text-xs text-green-800">
        <span className="font-semibold">GOTOWA DO ANALIZY</span>
        <span className="ml-2 text-green-600">Brak blokerów i ostrzeżeń</span>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200">
      {/* Status bar */}
      <div
        className={`px-3 py-2 text-xs font-medium ${
          blockerCount > 0
            ? 'bg-red-50 text-red-800 border-b border-red-200'
            : 'bg-amber-50 text-amber-800 border-b border-amber-200'
        }`}
      >
        {blockerCount > 0 ? (
          <>
            <span className="font-bold">NIE GOTOWA</span>
            <span className="ml-2">
              {blockerCount} bloker{blockerCount === 1 ? '' : blockerCount < 5 ? 'y' : 'ów'}
              {warningCount > 0 && `, ${warningCount} ostrzeż.`}
            </span>
          </>
        ) : (
          <>
            <span className="font-bold">OSTRZEŻENIA</span>
            <span className="ml-2">
              {warningCount} ostrzeżeni{warningCount === 1 ? 'e' : warningCount < 5 ? 'a' : ''}
            </span>
          </>
        )}
      </div>

      {/* Blockers list */}
      {blockerCount > 0 && (
        <div className="px-3 py-1.5 bg-red-50/50 max-h-32 overflow-y-auto">
          {readiness.blockers.map((blocker, idx) => {
            const fixAction = fixActions.find((fa) => fa.code === blocker.code);
            return (
              <div
                key={`${blocker.code}-${idx}`}
                className="flex items-start gap-2 py-1 text-xs"
              >
                <span className="text-red-500 flex-shrink-0 mt-0.5">&#x2718;</span>
                <span className="flex-1 text-red-700">{blocker.message_pl}</span>
                {fixAction && (
                  <button
                    className="text-blue-600 hover:underline flex-shrink-0"
                    onClick={() => handleFixClick(fixAction)}
                    title={fixAction.message_pl}
                  >
                    Napraw
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Warnings list */}
      {warningCount > 0 && (
        <div className="px-3 py-1.5 bg-amber-50/50 max-h-24 overflow-y-auto">
          {readiness.warnings.map((warning, idx) => (
            <div
              key={`${warning.code}-${idx}`}
              className="flex items-start gap-2 py-0.5 text-xs"
            >
              <span className="text-amber-500 flex-shrink-0 mt-0.5">&#x26A0;</span>
              <span className="flex-1 text-amber-700">{warning.message_pl}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
