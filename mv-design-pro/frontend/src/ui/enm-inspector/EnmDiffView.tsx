/**
 * EnmDiffView — Porównanie rewizji ENM (v4.2).
 *
 * Czytelny changelog na poziomie encji i parametrów.
 * Deterministyczny wynik.
 *
 * CANONICAL: Polski komunikaty.
 */

import type { EnmDiffReport, EntityChange, FieldChange } from './types';

interface EnmDiffViewProps {
  report: EnmDiffReport | null;
  loading?: boolean;
}

const ENTITY_TYPE_LABELS_PL: Record<string, string> = {
  node: 'Szyna',
  branch: 'Gałąź',
  switch: 'Łącznik',
  inverter_source: 'Źródło falownikowe',
};

const CHANGE_TYPE_LABELS_PL: Record<string, string> = {
  ADDED: 'Dodano',
  REMOVED: 'Usunięto',
  MODIFIED: 'Zmieniono',
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  ADDED: 'bg-green-100 text-green-700',
  REMOVED: 'bg-rose-100 text-rose-700',
  MODIFIED: 'bg-amber-100 text-amber-700',
};

export function EnmDiffView({ report, loading = false }: EnmDiffViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-slate-400">
        Ładowanie porównania...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-slate-400">
        Wybierz dwie rewizje do porównania
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="enm-diff-view">
      {/* Summary header */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-700">
            {report.is_identical
              ? 'Rewizje identyczne'
              : `${report.summary.total} zmian`}
          </h3>
          {!report.is_identical && (
            <div className="flex gap-2 text-xs">
              {report.summary.added > 0 && (
                <span className="text-green-600">
                  +{report.summary.added}
                </span>
              )}
              {report.summary.removed > 0 && (
                <span className="text-rose-600">
                  -{report.summary.removed}
                </span>
              )}
              {report.summary.modified > 0 && (
                <span className="text-amber-600">
                  ~{report.summary.modified}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-1 text-xs text-slate-400 font-mono">
          <span>Od: {report.from_fingerprint.slice(0, 12)}...</span>
          <span>Do: {report.to_fingerprint.slice(0, 12)}...</span>
        </div>
      </div>

      {/* Changes list */}
      <div className="flex-1 overflow-y-auto">
        {report.is_identical ? (
          <div className="px-3 py-4 text-xs text-slate-400 text-center">
            Brak zmian między rewizjami
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {report.changes.map((change, idx) => (
              <ChangeRow key={`${change.entity_id}-${idx}`} change={change} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChangeRow({ change }: { change: EntityChange }) {
  const entityLabel =
    ENTITY_TYPE_LABELS_PL[change.entity_type] || change.entity_type;

  return (
    <div
      className="px-3 py-2"
      data-testid={`enm-diff-change-${change.entity_id}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            CHANGE_TYPE_COLORS[change.change_type] || ''
          }`}
        >
          {CHANGE_TYPE_LABELS_PL[change.change_type]}
        </span>
        <span className="text-xs text-slate-500">{entityLabel}</span>
        <span className="text-xs font-medium text-slate-700">
          {change.entity_name || change.entity_id.slice(0, 12)}
        </span>
      </div>

      {/* Field-level changes for MODIFIED entities */}
      {change.change_type === 'MODIFIED' && change.field_changes.length > 0 && (
        <div className="mt-1 ml-4">
          {change.field_changes.map((fc, idx) => (
            <FieldChangeRow key={`${fc.field_name}-${idx}`} change={fc} />
          ))}
        </div>
      )}
    </div>
  );
}

function FieldChangeRow({ change }: { change: FieldChange }) {
  return (
    <div className="flex items-center gap-2 text-xs py-0.5">
      <span className="text-slate-400 font-mono w-32 truncate">
        {change.field_name}
      </span>
      <span className="text-rose-500 line-through">
        {formatValue(change.old_value)}
      </span>
      <span className="text-slate-300">→</span>
      <span className="text-green-600">{formatValue(change.new_value)}</span>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toLocaleString('pl-PL');
  if (typeof value === 'boolean') return value ? 'tak' : 'nie';
  return String(value);
}
