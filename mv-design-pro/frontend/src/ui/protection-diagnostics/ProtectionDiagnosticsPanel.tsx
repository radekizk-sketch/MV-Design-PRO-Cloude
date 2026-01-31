/**
 * Protection Diagnostics Panel — Panel diagnostyki zabezpieczeń
 *
 * CANONICAL ALIGNMENT:
 * - Case → Wyniki → Diagnostyka zabezpieczeń
 * - READ-ONLY: brak akcji, brak edycji
 * - UI 100% po polsku
 * - Deterministyczne sortowanie: element_id, severity (ERROR>WARN>INFO), code
 *
 * Kolumny:
 * - Severity (ikona + etykieta)
 * - Kod (stabilny kod reguły)
 * - Komunikat (message_pl)
 * - Element (element_id)
 * - ANSI (function_ansi, jeśli jest)
 */

import React, { useMemo } from 'react';
import { clsx } from 'clsx';
import type {
  ProtectionSanityCheckResult,
  DiagnosticSeverity,
  DiagnosticsStats,
} from './types';
import {
  SEVERITY_LABELS_PL,
  SEVERITY_COLORS,
  SEVERITY_ICONS,
  sortDiagnosticsResults,
  computeDiagnosticsStats,
} from './types';

// =============================================================================
// Severity Badge Component
// =============================================================================

interface SeverityBadgeProps {
  severity: DiagnosticSeverity;
}

const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border',
      SEVERITY_COLORS[severity]
    )}
    data-testid={`protection-diagnostics-severity-${severity}`}
  >
    <span aria-hidden="true">{SEVERITY_ICONS[severity]}</span>
    {SEVERITY_LABELS_PL[severity]}
  </span>
);

// =============================================================================
// Filter Controls Component
// =============================================================================

interface FilterControlsProps {
  stats: DiagnosticsStats;
  activeSeverities: DiagnosticSeverity[];
  onToggleSeverity: (severity: DiagnosticSeverity) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  stats,
  activeSeverities,
  onToggleSeverity,
}) => {
  const severities: DiagnosticSeverity[] = ['ERROR', 'WARN', 'INFO'];
  const counts: Record<DiagnosticSeverity, number> = {
    ERROR: stats.byError,
    WARN: stats.byWarn,
    INFO: stats.byInfo,
  };

  return (
    <div className="flex flex-wrap gap-2">
      {severities.map((severity) => {
        const isActive = activeSeverities.length === 0 || activeSeverities.includes(severity);
        const count = counts[severity];

        return (
          <button
            key={severity}
            onClick={() => onToggleSeverity(severity)}
            className={clsx(
              'px-2 py-1 text-xs rounded border transition-colors',
              isActive
                ? SEVERITY_COLORS[severity]
                : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100'
            )}
            aria-pressed={isActive}
          >
            {SEVERITY_ICONS[severity]} {SEVERITY_LABELS_PL[severity]} ({count})
          </button>
        );
      })}
    </div>
  );
};

// =============================================================================
// Diagnostics Row Component
// =============================================================================

interface DiagnosticsRowProps {
  result: ProtectionSanityCheckResult;
}

const DiagnosticsRow: React.FC<DiagnosticsRowProps> = ({ result }) => {
  const testId = `protection-diagnostics-row-${result.element_id}-${result.code}`;

  return (
    <tr
      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
      data-testid={testId}
    >
      {/* Severity */}
      <td className="px-3 py-2">
        <SeverityBadge severity={result.severity} />
      </td>

      {/* Kod */}
      <td className="px-3 py-2 text-xs font-mono text-gray-600">
        {result.code}
      </td>

      {/* Komunikat */}
      <td className="px-3 py-2 text-sm text-gray-800">
        {result.message_pl}
      </td>

      {/* Element */}
      <td className="px-3 py-2 text-xs font-mono text-gray-600">
        <span title={`Typ: ${result.element_type}`}>
          {result.element_id}
        </span>
      </td>

      {/* ANSI */}
      <td className="px-3 py-2 text-xs font-medium text-gray-500">
        {result.function_ansi ?? '—'}
      </td>
    </tr>
  );
};

// =============================================================================
// Main Panel Component
// =============================================================================

export interface ProtectionDiagnosticsPanelProps {
  /** Lista wyników diagnostyki (będzie posortowana deterministycznie) */
  results: ProtectionSanityCheckResult[];
  /** Aktywne filtry severity (puste = wszystkie) */
  activeSeverities?: DiagnosticSeverity[];
  /** Callback przy zmianie filtra severity */
  onToggleSeverity?: (severity: DiagnosticSeverity) => void;
  /** Czy panel jest w stanie ładowania */
  isLoading?: boolean;
  /** Komunikat błędu */
  error?: string | null;
}

export const ProtectionDiagnosticsPanel: React.FC<ProtectionDiagnosticsPanelProps> = ({
  results,
  activeSeverities = [],
  onToggleSeverity,
  isLoading = false,
  error = null,
}) => {
  // Sortowanie deterministyczne
  const sortedResults = useMemo(() => sortDiagnosticsResults(results), [results]);

  // Filtrowanie po severity
  const filteredResults = useMemo(() => {
    if (activeSeverities.length === 0) return sortedResults;
    return sortedResults.filter((r) => activeSeverities.includes(r.severity));
  }, [sortedResults, activeSeverities]);

  // Statystyki (na pełnej liście, nie filtrowanej)
  const stats = useMemo(() => computeDiagnosticsStats(sortedResults), [sortedResults]);

  // Handler dla toggle severity
  const handleToggleSeverity = (severity: DiagnosticSeverity) => {
    onToggleSeverity?.(severity);
  };

  // --- Loading State ---
  if (isLoading) {
    return (
      <div
        className="h-full flex items-center justify-center bg-white"
        data-testid="protection-diagnostics-panel"
      >
        <div className="text-gray-500 text-sm">Ładowanie diagnostyki...</div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div
        className="h-full flex items-center justify-center bg-white"
        data-testid="protection-diagnostics-panel"
      >
        <div className="text-red-600 text-sm">Błąd: {error}</div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-white"
      data-testid="protection-diagnostics-panel"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">
          Diagnostyka zabezpieczeń
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Wyniki walidacji nastaw i konfiguracji funkcji ochronnych
        </p>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Wyniki: {filteredResults.length} / {stats.total}
          </span>
        </div>
        <FilterControls
          stats={stats}
          activeSeverities={activeSeverities}
          onToggleSeverity={handleToggleSeverity}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filteredResults.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            {stats.total === 0
              ? 'Brak wyników diagnostyki — konfiguracja poprawna'
              : 'Brak wyników spełniających kryteria filtrowania'}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                  Poziom
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">
                  Kod
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Komunikat
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">
                  Element
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                  ANSI
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result, index) => (
                <DiagnosticsRow
                  key={`${result.element_id}-${result.code}-${index}`}
                  result={result}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ProtectionDiagnosticsPanel;
