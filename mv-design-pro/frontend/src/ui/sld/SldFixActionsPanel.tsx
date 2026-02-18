/**
 * SLD Fix Actions Panel — BLOK 2 (UX PRO++)
 *
 * Panel naprawczy grupujący problemy walidacji według priorytetu.
 * Wyświetla BLOCKER/IMPORTANT/INFO z sugestiami naprawy i nawigacją.
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 4: Fix Actions Panel
 * - powerfactory_ui_parity.md: Engineering Readiness (ETAP-grade)
 *
 * FEATURES:
 * - Grupowanie po ważności: BLOCKER > WAŻNE > INFO
 * - Przycisk "Przejdź" do nawigacji do elementu
 * - Sugestia naprawy dla każdego problemu
 * - Zwijany nagłówek z licznikiem błędów
 * - Zawsze widoczny (nie blokuje SLD)
 *
 * RULES:
 * - READ-ONLY: tylko wyświetlanie, bez mutacji modelu
 * - Deterministyczne sortowanie: BLOCKER → IMPORTANT → INFO, potem code
 * - 100% Polish UI
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useEngineeringReadinessStore } from '../engineering-readiness/store';
import { useSelectionStore } from '../selection/store';
import type { ReadinessSeverity } from '../types';

// =============================================================================
// Stałe stylistyczne
// =============================================================================

const SEVERITY_ORDER: Record<ReadinessSeverity, number> = {
  BLOCKER: 0,
  IMPORTANT: 1,
  INFO: 2,
};

const SEVERITY_LABELS_PL: Record<ReadinessSeverity, string> = {
  BLOCKER: 'Blokujące',
  IMPORTANT: 'Ważne',
  INFO: 'Informacje',
};

const SEVERITY_STYLES: Record<ReadinessSeverity, { badge: string; row: string; dot: string }> = {
  BLOCKER: {
    badge: 'bg-red-600 text-white',
    row: 'border-l-2 border-red-500 bg-red-50',
    dot: 'bg-red-500',
  },
  IMPORTANT: {
    badge: 'bg-amber-500 text-white',
    row: 'border-l-2 border-amber-400 bg-amber-50',
    dot: 'bg-amber-400',
  },
  INFO: {
    badge: 'bg-blue-500 text-white',
    row: 'border-l-2 border-blue-400 bg-blue-50',
    dot: 'bg-blue-400',
  },
};

// =============================================================================
// Props
// =============================================================================

export interface SldFixActionsPanelProps {
  /** ID aktywnego przypadku obliczeniowego */
  caseId: string | null;
  /** Callback po kliknięciu "Przejdź" — nawigacja do elementu */
  onGoToElement?: (elementId: string) => void;
  /** Czy panel jest rozwinięty */
  defaultExpanded?: boolean;
}

// =============================================================================
// Główny komponent
// =============================================================================

/**
 * Panel naprawczy z grupowaniem problemów walidacji.
 * Pobiera dane z EngineeringReadiness API dla aktywnego przypadku.
 */
export function SldFixActionsPanel({
  caseId,
  onGoToElement,
  defaultExpanded = true,
}: SldFixActionsPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [expandedGroups, setExpandedGroups] = useState<Set<ReadinessSeverity>>(
    new Set(['BLOCKER', 'IMPORTANT'])
  );

  const { data, loading, error, load } = useEngineeringReadinessStore();
  const selectElement = useSelectionStore((state) => state.selectElement);

  // Załaduj dane przy zmianie caseId
  useEffect(() => {
    if (caseId && !data && !loading) {
      load(caseId);
    }
  }, [caseId]); // intentional: tylko caseId jako trigger — load jest stabilna referencja

  // Sortuj i grupuj problemy
  const groupedIssues = useMemo(() => {
    type IssueList = NonNullable<typeof data>['issues'];
    if (!data?.issues) return new Map<ReadinessSeverity, IssueList>();

    const sorted = [...data.issues].sort((a, b) => {
      const orderDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (orderDiff !== 0) return orderDiff;
      return a.code.localeCompare(b.code);
    });

    const groups = new Map<ReadinessSeverity, typeof sorted>();
    for (const issue of sorted) {
      const existing = groups.get(issue.severity) ?? [];
      existing.push(issue);
      groups.set(issue.severity, existing);
    }
    return groups;
  }, [data]);

  const totalCount = data?.total_count ?? 0;
  const blockerCount = data?.by_severity.BLOCKER ?? 0;

  const handleGoToElement = useCallback(
    (elementId: string | null) => {
      if (!elementId) return;
      // Nawiguj przez selection store
      selectElement({ id: elementId, type: 'Bus', name: '' });
      onGoToElement?.(elementId);
    },
    [selectElement, onGoToElement]
  );

  const toggleGroup = useCallback((severity: ReadinessSeverity) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      return next;
    });
  }, []);

  // Nie renderuj jeśli brak przypadku
  if (!caseId) return null;

  return (
    <div
      data-testid="sld-fix-actions-panel"
      className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
      style={{ width: 320 }}
    >
      {/* Nagłówek panelu */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors ${
          blockerCount > 0
            ? 'bg-red-50 hover:bg-red-100 text-red-800'
            : totalCount > 0
            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800'
            : 'bg-green-50 hover:bg-green-100 text-green-800'
        }`}
        data-testid="sld-fix-panel-header"
      >
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              blockerCount > 0 ? 'bg-red-500' : totalCount > 0 ? 'bg-amber-400' : 'bg-green-500'
            }`}
          />
          <span>Gotowość modelu</span>
          {totalCount > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                blockerCount > 0 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
              }`}
            >
              {totalCount}
            </span>
          )}
        </div>
        <span className="text-slate-400 text-[10px]">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Treść panelu */}
      {expanded && (
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="px-3 py-4 text-xs text-slate-500 text-center">
              Ładowanie...
            </div>
          )}

          {error && (
            <div className="px-3 py-2 text-xs text-red-600 bg-red-50">
              Błąd: {error}
            </div>
          )}

          {!loading && !error && totalCount === 0 && (
            <div className="px-3 py-4 text-xs text-green-700 text-center flex items-center justify-center gap-2">
              <span className="text-green-500">✓</span>
              Model gotowy do obliczeń
            </div>
          )}

          {!loading && !error && (
            <div>
              {(['BLOCKER', 'IMPORTANT', 'INFO'] as ReadinessSeverity[]).map((severity) => {
                const issues = groupedIssues.get(severity);
                if (!issues || issues.length === 0) return null;

                const styles = SEVERITY_STYLES[severity];
                const isGroupExpanded = expandedGroups.has(severity);

                return (
                  <div key={severity} data-testid={`sld-fix-group-${severity.toLowerCase()}`}>
                    {/* Nagłówek grupy */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(severity)}
                      className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border-t border-slate-200 text-[11px] font-semibold text-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                        <span>{SEVERITY_LABELS_PL[severity]}</span>
                        <span className={`px-1 py-0.5 rounded text-[10px] ${styles.badge}`}>
                          {issues.length}
                        </span>
                      </div>
                      <span className="text-slate-400">{isGroupExpanded ? '▲' : '▼'}</span>
                    </button>

                    {/* Lista problemów */}
                    {isGroupExpanded && (
                      <div>
                        {issues.map((issue) => (
                          <div
                            key={issue.code}
                            className={`px-3 py-2 text-xs ${styles.row}`}
                            data-testid={`sld-fix-issue-${issue.code}`}
                          >
                            {/* Kod i opis */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-mono text-[10px] text-slate-500 mb-0.5">
                                  {issue.code}
                                </div>
                                <div className="text-slate-700 leading-tight">
                                  {issue.message_pl}
                                </div>
                                {issue.suggested_fix && (
                                  <div className="text-slate-500 mt-1 italic text-[11px]">
                                    → {issue.suggested_fix}
                                  </div>
                                )}
                              </div>
                              {/* Przycisk nawigacji */}
                              {(issue.element_ref || issue.element_refs[0]) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleGoToElement(
                                      issue.element_ref ?? issue.element_refs[0] ?? null
                                    )
                                  }
                                  className="flex-shrink-0 px-2 py-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                                  title="Przejdź do elementu"
                                  data-testid={`sld-fix-goto-${issue.code}`}
                                >
                                  Przejdź
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Odśwież */}
          {caseId && !loading && (
            <div className="px-3 py-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => load(caseId)}
                className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                data-testid="sld-fix-panel-refresh"
              >
                ↻ Odśwież
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SldFixActionsPanel;
