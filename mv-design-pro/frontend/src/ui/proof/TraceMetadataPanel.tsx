/**
 * TraceMetadataPanel — Panel metadanych śladu obliczeń (prawy panel)
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Metadane run/case/snapshot
 * - wizard_screens.md: RESULT_VIEW mode, Polish labels
 *
 * FEATURES:
 * - Informacje o przypadku/run
 * - Data obliczeń
 * - Hash danych wejściowych (dla audytu)
 * - Źródło normy (jeśli dostępne)
 * - 100% Polish UI
 *
 * NOTE: Nazwy kodowe NIGDY nie są pokazywane w UI.
 */

import { useMemo } from 'react';
import type { ExtendedTrace, TraceStep } from '../results-inspector/types';

// =============================================================================
// Types
// =============================================================================

interface TraceMetadataPanelProps {
  trace: ExtendedTrace;
  selectedStep: TraceStep | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Formatuj datę ISO na czytelny format polski.
 */
function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate).toLocaleString('pl-PL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return isoDate;
  }
}

/**
 * Skróć hash do czytelnej długości.
 */
function shortenHash(hash: string, length = 16): string {
  if (hash.length <= length) return hash;
  return `${hash.substring(0, length)}...`;
}

/**
 * Policz statystyki kroków.
 */
function computeStepStats(steps: TraceStep[]): {
  total: number;
  byPhase: Record<string, number>;
} {
  const byPhase: Record<string, number> = {};

  for (const step of steps) {
    const phase = step.phase ?? 'Inne';
    byPhase[phase] = (byPhase[phase] ?? 0) + 1;
  }

  return {
    total: steps.length,
    byPhase,
  };
}

// =============================================================================
// Sub-Components
// =============================================================================

interface MetadataRowProps {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}

function MetadataRow({ label, value, mono = false }: MetadataRowProps) {
  return (
    <div className="py-2 border-b border-slate-100 last:border-b-0">
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </dt>
      <dd className={`text-sm text-slate-800 ${mono ? 'font-mono text-xs' : ''}`}>
        {value ?? '—'}
      </dd>
    </div>
  );
}

interface MetadataSectionProps {
  title: string;
  children: React.ReactNode;
}

function MetadataSection({ title, children }: MetadataSectionProps) {
  return (
    <section className="mb-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-2 pb-2 border-b border-slate-200">
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TraceMetadataPanel({ trace, selectedStep }: TraceMetadataPanelProps) {
  const stats = useMemo(() => computeStepStats(trace.white_box_trace), [trace.white_box_trace]);

  // Mapuj fazy na polskie etykiety
  const phaseLabels: Record<string, string> = {
    INITIALIZATION: 'Inicjalizacja',
    CALCULATION: 'Obliczenia',
    AGGREGATION: 'Agregacja',
    VALIDATION: 'Walidacja',
    OUTPUT: 'Wyniki',
    Inne: 'Inne',
  };

  return (
    <aside
      className="h-full overflow-y-auto bg-white border-l border-slate-200"
      data-testid="trace-metadata-panel"
    >
      <div className="p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Metadane śladu
        </h2>

        {/* Sekcja: Kontekst obliczeń */}
        <MetadataSection title="Kontekst obliczeń">
          <MetadataRow label="ID migawki" value={trace.snapshot_id} mono />
          <MetadataRow label="ID wykonania" value={trace.run_id} mono />
          <MetadataRow
            label="Hash danych wejściowych"
            value={shortenHash(trace.input_hash)}
            mono
          />
        </MetadataSection>

        {/* Sekcja: Statystyki kroków */}
        <MetadataSection title="Statystyki">
          <MetadataRow label="Liczba kroków" value={String(stats.total)} />
          <div className="py-2">
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Podział według faz
            </dt>
            <dd>
              <ul className="space-y-1">
                {Object.entries(stats.byPhase).map(([phase, count]) => (
                  <li
                    key={phase}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-600">
                      {phaseLabels[phase] ?? phase}
                    </span>
                    <span className="font-medium text-slate-800">{count}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </MetadataSection>

        {/* Sekcja: Wybrany krok (jeśli jest) */}
        {selectedStep && (
          <MetadataSection title="Wybrany krok">
            <MetadataRow
              label="Identyfikator"
              value={selectedStep.key ?? selectedStep.step_id ?? selectedStep.equation_id}
              mono
            />
            {selectedStep.phase && (
              <MetadataRow
                label="Faza"
                value={phaseLabels[selectedStep.phase] ?? selectedStep.phase}
              />
            )}
            {selectedStep.timestamp && (
              <MetadataRow
                label="Znacznik czasu"
                value={formatDate(selectedStep.timestamp)}
              />
            )}
          </MetadataSection>
        )}

        {/* Sekcja: Informacje o normie (jeśli dostępne) */}
        <MetadataSection title="Źródło obliczeń">
          <div className="py-2">
            <p className="text-sm text-slate-600">
              Obliczenia zgodne z normą IEC 60909
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Szczegóły metodyki dostępne w dokumentacji
            </p>
          </div>
        </MetadataSection>

        {/* Legenda statusu */}
        <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">
            <strong>Uwaga:</strong> Ślad obliczeń jest dokumentem audytowym.
            Wszystkie wartości są tylko do odczytu.
          </p>
        </div>
      </div>
    </aside>
  );
}

/**
 * Placeholder dla pustego stanu.
 */
export function TraceMetadataPanelEmpty() {
  return (
    <aside
      className="h-full overflow-y-auto bg-white border-l border-slate-200 p-4"
      data-testid="trace-metadata-panel-empty"
    >
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">
          Brak danych metadanych
        </p>
      </div>
    </aside>
  );
}
