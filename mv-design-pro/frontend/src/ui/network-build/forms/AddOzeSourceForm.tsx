/**
 * AddOzeSourceForm — formularz dodawania źródeł OZE (PV) i magazynów BESS.
 *
 * Przełącznik PV/BESS → renderuje odpowiedni modal z ui/topology/modals/.
 * Integruje się z snapshotStore.executeDomainOperation + networkBuildStore.
 *
 * BINDING: 100% PL etykiety.
 */

import { useCallback, useMemo, useState } from 'react';
import { PVInverterModal, type PVInverterFormData } from '../../topology/modals/PVInverterModal';
import {
  BESSInverterModal,
  type BESSInverterFormData,
} from '../../topology/modals/BESSInverterModal';
import { useSnapshotStore } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';
import { validateCatalogFirst } from './catalogFirstRules';

type OzeKind = 'PV' | 'BESS';

export function AddOzeSourceForm() {
  const activeForm = useNetworkBuildStore((s) => s.activeOperationForm);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);
  const context = activeForm?.context;

  const defaultKind: OzeKind =
    activeForm?.op === 'add_bess_inverter_nn' ? 'BESS' : 'PV';
  const [ozeKind, setOzeKind] = useState<OzeKind>(defaultKind);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const fieldOptions = useMemo<Array<{ ref_id: string; name: string; kind: string }>>(() => {
    const raw = context?.fieldOptions;
    if (Array.isArray(raw)) return raw as Array<{ ref_id: string; name: string; kind: string }>;
    return [];
  }, [context]);

  const handlePVSubmit = useCallback(
    async (data: PVInverterFormData) => {
      if (!activeCaseId) return;
      const payload = {
        placement: data.placement,
        existing_field_ref: data.existing_field_ref,
        new_field_switch_kind: data.new_field_switch_kind,
        new_field_switch_state: data.new_field_switch_state,
        new_field_switch_catalog_ref: data.new_field_switch_catalog_ref,
        new_field_voltage_nn_kv: data.new_field_voltage_nn_kv,
        new_field_name: data.new_field_name,
        catalog_item_id: data.catalog_item_id,
        rated_power_ac_kw: data.rated_power_ac_kw,
        max_power_kw: data.max_power_kw,
        control_mode: data.control_mode,
        cos_phi: data.cos_phi,
        generation_limit_pmax_kw: data.generation_limit_pmax_kw,
        generation_limit_q_kvar: data.generation_limit_q_kvar,
        disconnect_required: data.disconnect_required,
        measurement_point: data.measurement_point,
        existing_measurement_ref: data.existing_measurement_ref,
        source_name: data.source_name,
        work_profile_ref: data.work_profile_ref,
      };
      const validationError = validateCatalogFirst('add_pv_inverter_nn', payload);
      if (validationError) {
        setCatalogError(validationError);
        return;
      }
      setCatalogError(null);
      await executeDomainOperation(activeCaseId, 'add_pv_inverter_nn', payload);
      closeForm();
    },
    [activeCaseId, executeDomainOperation, closeForm],
  );

  const handleBESSSubmit = useCallback(
    async (data: BESSInverterFormData) => {
      if (!activeCaseId) return;
      const payload = {
        placement: data.placement,
        existing_field_ref: data.existing_field_ref,
        new_field_switch_kind: data.new_field_switch_kind,
        new_field_switch_state: data.new_field_switch_state,
        new_field_switch_catalog_ref: data.new_field_switch_catalog_ref,
        new_field_voltage_nn_kv: data.new_field_voltage_nn_kv,
        new_field_name: data.new_field_name,
        inverter_catalog_id: data.inverter_catalog_id,
        storage_catalog_id: data.storage_catalog_id,
        usable_capacity_kwh: data.usable_capacity_kwh,
        charge_power_kw: data.charge_power_kw,
        discharge_power_kw: data.discharge_power_kw,
        operation_mode: data.operation_mode,
        control_strategy: data.control_strategy,
        soc_min_percent: data.soc_min_percent,
        soc_max_percent: data.soc_max_percent,
        source_name: data.source_name,
        time_profile_ref: data.time_profile_ref,
      };
      const validationError = validateCatalogFirst('add_bess_inverter_nn', payload);
      if (validationError) {
        setCatalogError(validationError);
        return;
      }
      setCatalogError(null);
      await executeDomainOperation(activeCaseId, 'add_bess_inverter_nn', payload);
      closeForm();
    },
    [activeCaseId, executeDomainOperation, closeForm],
  );

  return (
    <div className="h-full flex flex-col" data-testid="add-oze-source-form">
      {/* Przełącznik PV / BESS */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-4 py-2 gap-2">
        <button
          type="button"
          onClick={() => setOzeKind('PV')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            ozeKind === 'PV'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
          }`}
        >
          Fotowoltaika (PV)
        </button>
        <button
          type="button"
          onClick={() => setOzeKind('BESS')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            ozeKind === 'BESS'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
          }`}
        >
          Magazyn energii (BESS)
        </button>
      </div>

      {/* Formularz */}
      <div className="flex-1 overflow-y-auto">
        {catalogError && (
          <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">{catalogError}</p>
        )}
        {ozeKind === 'PV' ? (
          <PVInverterModal
            isOpen={true}
            mode="create"
            fieldOptions={fieldOptions}
            onSubmit={handlePVSubmit}
            onCancel={closeForm}
          />
        ) : (
          <BESSInverterModal
            isOpen={true}
            mode="create"
            fieldOptions={fieldOptions}
            onSubmit={handleBESSSubmit}
            onCancel={closeForm}
          />
        )}
      </div>
    </div>
  );
}
