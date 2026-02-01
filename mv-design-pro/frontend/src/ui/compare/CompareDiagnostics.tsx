/**
 * Compare Diagnostics — Protection Diagnostics Diff UI
 *
 * CANONICAL ALIGNMENT:
 * - P10: Study Cases comparison (Case A vs Case B)
 * - P15d: Protection Diagnostics comparison
 * - READ-ONLY: No physics calculations
 * - UI 100% po polsku
 * - Key by: element_id + code
 *
 * FEATURES:
 * - New problems in B (Nowe w B)
 * - Gone problems in B (Usunięte w B)
 * - Severity changes
 * - Deterministic sorting
 */

import type { DiagnosticCompareStatus } from './types';
import {
  DIAGNOSTIC_COMPARE_STATUS_LABELS,
  DIAGNOSTIC_COMPARE_STATUS_COLORS,
} from './types';
import { useCompareCasesStore, useFilteredDiagnostics } from './store';
import {
  SEVERITY_LABELS_PL,
  SEVERITY_COLORS,
  CODE_LABELS_PL,
} from '../protection-diagnostics/types';
import type { DiagnosticSeverity, SanityCheckCode } from '../protection-diagnostics/types';

// =============================================================================
// Helpers
// =============================================================================

function StatusBadge({ status }: { status: DiagnosticCompareStatus }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${DIAGNOSTIC_COMPARE_STATUS_COLORS[status]}`}>
      {DIAGNOSTIC_COMPARE_STATUS_LABELS[status]}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: DiagnosticSeverity | null }) {
  if (!severity) return <span className="text-slate-400">—</span>;
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${SEVERITY_COLORS[severity]}`}>
      {SEVERITY_LABELS_PL[severity]}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-500">
      <p>{message}</p>
    </div>
  );
}

function getCodeLabel(code: string): string {
  return CODE_LABELS_PL[code as SanityCheckCode] || code;
}

// =============================================================================
// Summary Cards
// =============================================================================

function DiagnosticsSummary() {
  const summary = useCompareCasesStore((s) => s.summary);
  const caseBName = useCompareCasesStore((s) => s.caseBName);

  if (!summary) return null;

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Łącznie problemów
        </p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">
          {summary.total_diagnostics}
        </p>
      </div>
      <div className="rounded border border-red-200 bg-red-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-red-600">
          Nowe w {caseBName || 'B'}
        </p>
        <p className="mt-1 text-2xl font-semibold text-red-700">
          {summary.new_diagnostics}
        </p>
      </div>
      <div className="rounded border border-green-200 bg-green-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-green-600">
          Usunięte w {caseBName || 'B'}
        </p>
        <p className="mt-1 text-2xl font-semibold text-green-700">
          {summary.gone_diagnostics}
        </p>
      </div>
      <div className="rounded border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
          Zmiana severity
        </p>
        <p className="mt-1 text-2xl font-semibold text-amber-700">
          {summary.changed_severity}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Diagnostics Table
// =============================================================================

function DiagnosticsTable() {
  const diagnostics = useFilteredDiagnostics();
  const caseAName = useCompareCasesStore((s) => s.caseAName);
  const caseBName = useCompareCasesStore((s) => s.caseBName);
  const totalDiagnostics = useCompareCasesStore((s) => s.diagnostics.length);

  if (diagnostics.length === 0) {
    return <EmptyState message="Brak różnic w diagnostyce." />;
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Element</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Typ elementu</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Kod</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">ANSI</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">
              Severity — {caseAName || 'A'}
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">
              Severity — {caseBName || 'B'}
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Komunikat</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
          </tr>
        </thead>
        <tbody>
          {diagnostics.map((row) => (
            <tr key={row.key} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-2 font-medium text-slate-800">
                {row.element_id.length > 12
                  ? row.element_id.substring(0, 12) + '...'
                  : row.element_id}
              </td>
              <td className="px-3 py-2 text-slate-600">{row.element_type}</td>
              <td className="px-3 py-2 text-slate-600">
                <span title={getCodeLabel(row.code)} className="cursor-help">
                  {row.code}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-600">{row.function_ansi || '—'}</td>
              <td className="px-3 py-2">
                <SeverityBadge severity={row.severity_a} />
              </td>
              <td className="px-3 py-2">
                <SeverityBadge severity={row.severity_b} />
              </td>
              <td className="px-3 py-2 text-slate-600 max-w-xs truncate">
                {row.message_pl_b || row.message_pl_a || '—'}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 px-3 py-2 text-xs text-slate-500">
        Wyświetlono {diagnostics.length} z {totalDiagnostics} problemów diagnostycznych
      </p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function CompareDiagnostics() {
  return (
    <div>
      <DiagnosticsSummary />
      <DiagnosticsTable />
    </div>
  );
}
