/**
 * ModalController — zarządza otwieraniem/zamykaniem modali z menu kontekstowego SLD.
 *
 * Pipeline:
 *   contextMenu → onOperation → ModalController.dispatch(canonicalOp, elementId) → open modal
 *
 * INVARIANTS:
 * - Jeden modal otwarty w danym momencie
 * - Po zatwierdzeniu: executeDomainOp → nowy Snapshot → odświeżenie SLD
 * - Po anulowaniu: zamknięcie bez efektu
 * - 100% etykiety PL
 */

import React, { useState, useCallback } from 'react';
import { getModalByOp } from '../topology/modals/modalRegistry';
import { notify } from '../notifications/store';
import type { ElementType } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModalControllerState {
  isOpen: boolean;
  canonicalOp: string | null;
  elementId: string | null;
  elementType: ElementType | null;
  modalComponentName: string | null;
  labelPl: string | null;
}

const CLOSED_STATE: ModalControllerState = {
  isOpen: false,
  canonicalOp: null,
  elementId: null,
  elementType: null,
  modalComponentName: null,
  labelPl: null,
};

/**
 * Polish labels for domain operation results.
 */
const OP_RESULT_LABELS: Record<string, string> = {
  update_element_parameters: 'Parametry elementu zaktualizowane',
  assign_catalog_to_element: 'Typ z katalogu przypisany',
  continue_trunk_segment_sn: 'Odcinek magistrali SN dodany',
  insert_station_on_segment_sn: 'Stacja SN/nN wstawiona',
  start_branch_segment_sn: 'Odgałęzienie SN dodane',
  insert_section_switch_sn: 'Łącznik sekcyjny wstawiony',
  connect_secondary_ring_sn: 'Pierścień wtórny połączony',
  set_normal_open_point: 'Punkt normalnie otwarty ustawiony',
  add_nn_outgoing_field: 'Odpływ nN dodany',
  add_nn_load: 'Odbiór nN dodany',
  add_pv_inverter_nn: 'Źródło PV dodane',
  add_bess_inverter_nn: 'Źródło BESS dodane',
  add_genset_nn: 'Agregat dodany',
  add_ups_nn: 'UPS dodany',
  add_relay: 'Zabezpieczenie dodane',
  add_grid_source_sn: 'Źródło SN dodane',
  add_measurement: 'Przekładnik dodany',
  add_transformer_sn_nn: 'Transformator SN/nN dodany',
  add_sn_bay: 'Pole SN dodane',
  add_nn_segment: 'Segment nN dodany',
  run_power_flow: 'Rozpływ mocy uruchomiony',
  run_short_circuit: 'Obliczenia zwarciowe uruchomione',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ModalControllerProps {
  onDomainOpComplete?: (canonicalOp: string, elementId: string) => void;
}

/**
 * useModalController — hook managing modal lifecycle for SLD context menu.
 */
export function useModalController(
  onDomainOpComplete?: (canonicalOp: string, elementId: string) => void,
) {
  const [state, setState] = useState<ModalControllerState>(CLOSED_STATE);

  /**
   * Dispatch a modal open request from context menu.
   * Looks up the canonical operation in the modal registry.
   * If found, opens the modal. If not, shows a notification.
   */
  const dispatch = useCallback(
    (canonicalOp: string, elementId: string, elementType: ElementType) => {
      const entry = getModalByOp(canonicalOp);
      if (entry) {
        setState({
          isOpen: true,
          canonicalOp,
          elementId,
          elementType,
          modalComponentName: entry.componentName,
          labelPl: entry.labelPl,
        });
      } else {
        // Operation recognized but no modal — show notification
        const label = OP_RESULT_LABELS[canonicalOp] ?? canonicalOp;
        notify(`${label} — ${elementType} (${elementId})`, 'info');
      }
    },
    [],
  );

  /**
   * Close the modal without applying changes.
   */
  const close = useCallback(() => {
    setState(CLOSED_STATE);
  }, []);

  /**
   * Handle modal submit — domain operation completed.
   */
  const handleSubmit = useCallback(
    (_formData: Record<string, unknown>) => {
      if (state.canonicalOp && state.elementId) {
        const label =
          OP_RESULT_LABELS[state.canonicalOp] ?? state.canonicalOp;
        notify(label, 'success');
        if (onDomainOpComplete) {
          onDomainOpComplete(state.canonicalOp, state.elementId);
        }
      }
      setState(CLOSED_STATE);
    },
    [state.canonicalOp, state.elementId, onDomainOpComplete],
  );

  return { state, dispatch, close, handleSubmit };
}

/**
 * ModalOverlay — renders the currently active modal.
 *
 * The actual form content is rendered by the parent based on state.modalComponentName.
 * This component handles only the overlay wrapper and dispatch lifecycle.
 */
export const ModalOverlay: React.FC<{
  state: ModalControllerState;
  onClose: () => void;
}> = ({ state, onClose }) => {
  if (!state.isOpen || !state.labelPl) return null;

  return (
    <div
      data-testid="modal-controller-overlay"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4 p-6"
        data-testid="modal-controller-content"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {state.labelPl}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            title="Zamknij"
          >
            &times;
          </button>
        </div>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <span className="font-medium">Operacja:</span>{' '}
            {state.canonicalOp}
          </p>
          <p>
            <span className="font-medium">Element:</span>{' '}
            {state.elementType} ({state.elementId})
          </p>
          <p>
            <span className="font-medium">Komponent:</span>{' '}
            {state.modalComponentName}
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Zastosuj
          </button>
        </div>
      </div>
    </div>
  );
};
