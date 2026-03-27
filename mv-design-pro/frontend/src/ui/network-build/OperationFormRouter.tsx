/**
 * OperationFormRouter — Router formularzy operacji domenowych.
 *
 * Renderuje aktywny formularz na podstawie networkBuildStore.activeOperationForm.
 * Montowany w prawym panelu PowerFactoryLayout jako alternatywa do inspektora
 * gdy użytkownik inicjuje operację budowy sieci.
 *
 * BINDING: 100% PL etykiety.
 */

import { clsx } from 'clsx';
import { useNetworkBuildStore } from './networkBuildStore';

// =============================================================================
// Placeholder form components (będą zastąpione pełnymi formularzami w Fazie 2)
// =============================================================================

interface PlaceholderFormProps {
  title: string;
  description: string;
  onClose: () => void;
  context?: Record<string, unknown>;
}

function PlaceholderForm({ title, description, onClose, context }: PlaceholderFormProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-chrome-200 bg-chrome-50">
        <div>
          <h3 className="text-sm font-semibold text-chrome-800">{title}</h3>
          <p className="text-[10px] text-chrome-500 mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-ind text-chrome-400 hover:bg-chrome-200 hover:text-chrome-700"
          aria-label="Zamknij formularz"
          data-testid="operation-form-close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body placeholder */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="rounded-lg border-2 border-dashed border-chrome-200 p-6 text-center">
          <p className="text-xs text-chrome-500">
            Formularz w trakcie implementacji.
          </p>
          {context && Object.keys(context).length > 0 && (
            <div className="mt-3 text-[10px] text-chrome-400 text-left bg-chrome-50 rounded p-2">
              <p className="font-semibold mb-1">Kontekst:</p>
              {Object.entries(context).map(([key, value]) => (
                <div key={key}>
                  <span className="text-chrome-500">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-chrome-200 bg-chrome-50">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-chrome-600 hover:text-chrome-800 rounded-ind hover:bg-chrome-100"
        >
          Anuluj
        </button>
        <button
          type="button"
          disabled
          className="px-3 py-1.5 text-xs bg-ind-600 text-white rounded-ind opacity-50 cursor-not-allowed"
        >
          Zatwierdź
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Form metadata (PL labels per operation)
// =============================================================================

const FORM_META: Record<string, { title: string; description: string }> = {
  add_grid_source_sn: {
    title: 'Źródło zasilania GPZ',
    description: 'Definiuj źródło zasilania sieci SN — parametry zwarciowe, napięcie, rozdzielnia',
  },
  continue_trunk_segment_sn: {
    title: 'Kontynuacja magistrali',
    description: 'Dodaj kolejny segment kablowy lub napowietrzny do magistrali',
  },
  insert_station_on_segment_sn: {
    title: 'Wstawienie stacji w segment',
    description: 'Osadź stację SN/nN w wybranym punkcie segmentu magistrali',
  },
  start_branch_segment_sn: {
    title: 'Rozpoczęcie odgałęzienia',
    description: 'Utwórz nowe odgałęzienie z wolnego portu stacji lub węzła T',
  },
  insert_section_switch_sn: {
    title: 'Wstawienie łącznika sekcyjnego',
    description: 'Wstaw łącznik sekcyjny w wybranym punkcie segmentu',
  },
  connect_secondary_ring_sn: {
    title: 'Domknięcie pierścienia',
    description: 'Połącz dwa otwarte terminale tworząc pierścień wtórny',
  },
  set_normal_open_point: {
    title: 'Punkt normalnie otwarty (NOP)',
    description: 'Ustaw łącznik jako punkt normalnie otwarty pierścienia',
  },
  add_transformer_sn_nn: {
    title: 'Dodanie transformatora SN/nN',
    description: 'Dodaj transformator dwuuzwojeniowy do stacji',
  },
  add_pv_inverter_nn: {
    title: 'Źródło PV (fotowoltaika)',
    description: 'Dodaj falownik fotowoltaiczny po stronie nN stacji',
  },
  add_bess_inverter_nn: {
    title: 'Magazyn energii (BESS)',
    description: 'Dodaj bateryjny magazyn energii po stronie nN stacji',
  },
  assign_catalog_to_element: {
    title: 'Przypisanie katalogu',
    description: 'Przypisz pozycję katalogową do elementu sieci',
  },
  update_element_parameters: {
    title: 'Edycja parametrów',
    description: 'Modyfikuj parametry techniczne wybranego elementu',
  },
};

// =============================================================================
// OperationFormRouter
// =============================================================================

export interface OperationFormRouterProps {
  className?: string;
}

export function OperationFormRouter({ className }: OperationFormRouterProps) {
  const activeForm = useNetworkBuildStore((s) => s.activeOperationForm);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);

  if (!activeForm) return null;

  const meta = FORM_META[activeForm.op] ?? {
    title: activeForm.op,
    description: 'Operacja domenowa',
  };

  // In Phase 2, this will route to dedicated form components
  // For now, render placeholder with metadata
  return (
    <div className={clsx('h-full', className)} data-testid="operation-form-router">
      <PlaceholderForm
        title={meta.title}
        description={meta.description}
        onClose={closeForm}
        context={activeForm.context}
      />
    </div>
  );
}

export default OperationFormRouter;
