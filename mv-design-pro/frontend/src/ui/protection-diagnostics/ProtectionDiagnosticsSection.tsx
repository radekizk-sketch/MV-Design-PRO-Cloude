/**
 * Protection Diagnostics Section — Sekcja diagnostyki w Inspector
 *
 * CANONICAL ALIGNMENT:
 * - Inspector: sekcja „Diagnostyka"
 * - gdy selected element_id → filtruje i pokazuje tylko wpisy dla tego elementu
 * - brak akcji, brak edycji
 * - UI 100% po polsku
 *
 * Używana w InspectorPanel gdy element jest wybrany.
 */

import React, { useMemo } from 'react';
import { clsx } from 'clsx';
import type { ProtectionSanityCheckResult, DiagnosticSeverity } from './types';
import {
  SEVERITY_LABELS_PL,
  SEVERITY_COLORS,
  SEVERITY_ICONS,
  sortDiagnosticsResults,
} from './types';
import { useDiagnosticsForElement } from './store';

// =============================================================================
// Severity Badge (Compact)
// =============================================================================

interface CompactSeverityBadgeProps {
  severity: DiagnosticSeverity;
}

const CompactSeverityBadge: React.FC<CompactSeverityBadgeProps> = ({ severity }) => (
  <span
    className={clsx(
      'inline-flex items-center justify-center w-5 h-5 text-xs rounded',
      SEVERITY_COLORS[severity]
    )}
    title={SEVERITY_LABELS_PL[severity]}
    data-testid={`protection-diagnostics-severity-${severity}`}
  >
    {SEVERITY_ICONS[severity]}
  </span>
);

// =============================================================================
// Diagnostic Item
// =============================================================================

interface DiagnosticItemProps {
  result: ProtectionSanityCheckResult;
}

const DiagnosticItem: React.FC<DiagnosticItemProps> = ({ result }) => {
  const testId = `protection-diagnostics-row-${result.element_id}-${result.code}`;

  return (
    <div
      className="py-2 px-3 border-b border-gray-100 last:border-b-0"
      data-testid={testId}
    >
      <div className="flex items-start gap-2">
        <CompactSeverityBadge severity={result.severity} />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-800">{result.message_pl}</div>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span className="font-mono">{result.code}</span>
            {result.function_ansi && (
              <>
                <span className="text-gray-300">|</span>
                <span>ANSI {result.function_ansi}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Section Component (Standalone)
// =============================================================================

export interface ProtectionDiagnosticsSectionProps {
  /** Wyniki diagnostyki do wyświetlenia */
  results: ProtectionSanityCheckResult[];
  /** Tytuł sekcji (domyślnie "Diagnostyka") */
  title?: string;
  /** Czy sekcja jest zwinięta */
  collapsed?: boolean;
  /** Callback przy zmianie stanu zwinięcia */
  onToggleCollapsed?: () => void;
}

export const ProtectionDiagnosticsSection: React.FC<ProtectionDiagnosticsSectionProps> = ({
  results,
  title = 'Diagnostyka',
  collapsed = false,
  onToggleCollapsed,
}) => {
  // Sortowanie deterministyczne
  const sortedResults = useMemo(() => sortDiagnosticsResults(results), [results]);

  // Zliczanie severity
  const errorCount = sortedResults.filter((r) => r.severity === 'ERROR').length;
  const warnCount = sortedResults.filter((r) => r.severity === 'WARN').length;
  const infoCount = sortedResults.filter((r) => r.severity === 'INFO').length;

  // Nie renderuj sekcji jeśli brak wyników
  if (sortedResults.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-gray-200">
      {/* Section Header */}
      <button
        className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
      >
        <span className="font-semibold text-sm text-gray-700">{title}</span>
        <div className="flex items-center gap-2">
          {/* Severity counts */}
          {errorCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">
              {errorCount}
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">
              {warnCount}
            </span>
          )}
          {infoCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
              {infoCount}
            </span>
          )}
          {/* Collapse indicator */}
          <span className="text-gray-400 text-xs">{collapsed ? '▸' : '▾'}</span>
        </div>
      </button>

      {/* Section Content */}
      {!collapsed && (
        <div className="bg-white">
          {sortedResults.map((result, index) => (
            <DiagnosticItem
              key={`${result.element_id}-${result.code}-${index}`}
              result={result}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Connected Section (uses store)
// =============================================================================

export interface ProtectionDiagnosticsSectionConnectedProps {
  /** Element ID do filtrowania */
  elementId: string | null;
  /** Tytuł sekcji */
  title?: string;
  /** Czy sekcja jest zwinięta */
  collapsed?: boolean;
  /** Callback przy zmianie stanu zwinięcia */
  onToggleCollapsed?: () => void;
}

export const ProtectionDiagnosticsSectionConnected: React.FC<
  ProtectionDiagnosticsSectionConnectedProps
> = ({ elementId, ...props }) => {
  const results = useDiagnosticsForElement(elementId);

  return <ProtectionDiagnosticsSection results={results} {...props} />;
};

export default ProtectionDiagnosticsSection;
