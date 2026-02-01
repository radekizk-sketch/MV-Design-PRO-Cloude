/**
 * TraceToc — Spis treści śladu obliczeń (lewy panel)
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Panel nawigacji kroków
 * - wizard_screens.md: RESULT_VIEW mode, Polish labels
 *
 * FEATURES:
 * - Lista kroków z numeracją
 * - Podświetlenie aktywnego kroku
 * - Filtrowanie po fazie
 * - 100% Polish UI
 *
 * NOTE: Nazwy kodowe (P11, P14, P17) NIGDY nie są pokazywane w UI.
 */

import { useMemo } from 'react';
import type { TraceStep } from '../results-inspector/types';

// =============================================================================
// Types
// =============================================================================

interface TraceTocProps {
  steps: TraceStep[];
  selectedStepIndex: number | null;
  onSelectStep: (index: number) => void;
  searchQuery: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Pobierz tytuł kroku do wyświetlenia.
 * Priorytet: title > description > equation_id > "Krok N"
 */
function getStepTitle(step: TraceStep, index: number): string {
  if (step.title) return step.title;
  if (step.description) return step.description;
  if (step.equation_id) return step.equation_id;
  return `Krok ${index + 1}`;
}

/**
 * Pobierz fazę kroku do wyświetlenia (jeśli istnieje).
 */
function getStepPhase(step: TraceStep): string | null {
  return step.phase ?? null;
}

/**
 * Mapuj fazę na polski label.
 */
const PHASE_LABELS: Record<string, string> = {
  INITIALIZATION: 'Inicjalizacja',
  CALCULATION: 'Obliczenia',
  AGGREGATION: 'Agregacja',
  VALIDATION: 'Walidacja',
  OUTPUT: 'Wyniki',
};

function getPhaseLabel(phase: string | null): string | null {
  if (!phase) return null;
  return PHASE_LABELS[phase] ?? phase;
}

// =============================================================================
// Component
// =============================================================================

export function TraceToc({
  steps,
  selectedStepIndex,
  onSelectStep,
  searchQuery,
}: TraceTocProps) {
  // Filtruj kroki na podstawie searchQuery
  const filteredSteps = useMemo(() => {
    if (!searchQuery.trim()) {
      return steps.map((step, index) => ({ step, index }));
    }
    const query = searchQuery.toLowerCase();
    return steps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => {
        const title = getStepTitle(step, 0).toLowerCase();
        const phase = (step.phase ?? '').toLowerCase();
        const notes = (step.notes ?? '').toLowerCase();
        return title.includes(query) || phase.includes(query) || notes.includes(query);
      });
  }, [steps, searchQuery]);

  // Grupuj kroki po fazie
  const groupedSteps = useMemo(() => {
    const groups: Map<string | null, { step: TraceStep; index: number }[]> = new Map();

    for (const item of filteredSteps) {
      const phase = getStepPhase(item.step);
      if (!groups.has(phase)) {
        groups.set(phase, []);
      }
      groups.get(phase)!.push(item);
    }

    return groups;
  }, [filteredSteps]);

  if (steps.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-500">
        Brak kroków do wyświetlenia.
      </div>
    );
  }

  return (
    <nav
      className="h-full overflow-y-auto"
      aria-label="Spis treści śladu obliczeń"
      data-testid="trace-toc"
    >
      <div className="p-3 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">
          Spis kroków
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {filteredSteps.length} z {steps.length} kroków
        </p>
      </div>

      <ul className="divide-y divide-slate-100">
        {Array.from(groupedSteps.entries()).map(([phase, items]) => (
          <li key={phase ?? 'no-phase'}>
            {/* Nagłówek fazy (jeśli istnieje) */}
            {phase && (
              <div className="px-3 py-2 bg-slate-50 text-xs font-medium text-slate-600 uppercase tracking-wide">
                {getPhaseLabel(phase)}
              </div>
            )}

            {/* Lista kroków w fazie */}
            <ul>
              {items.map(({ step, index }) => {
                const isSelected = selectedStepIndex === index;
                const title = getStepTitle(step, index);

                return (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => onSelectStep(index)}
                      className={`
                        w-full text-left px-3 py-2 text-sm transition-colors
                        focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500
                        ${isSelected
                          ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600'
                          : 'text-slate-700 hover:bg-slate-50 border-l-2 border-transparent'
                        }
                      `}
                      aria-current={isSelected ? 'true' : undefined}
                      data-testid={`trace-toc-step-${index}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`
                          flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                          ${isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                          }
                        `}>
                          {index + 1}
                        </span>
                        <span className="truncate">{title}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
