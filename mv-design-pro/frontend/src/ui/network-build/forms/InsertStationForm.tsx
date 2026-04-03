/**
 * InsertStationForm — formularz wstawiania stacji transformatorowej na segment.
 *
 * Wrapper inline nad TransformerStationModal z ui/topology/modals/.
 * Integruje się z snapshotStore.executeDomainOperation + networkBuildStore.
 *
 * BINDING: 100% PL etykiety.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  TransformerStationModal,
  type TransformerStationFormData,
} from '../../topology/modals/TransformerStationModal';
import { useSnapshotStore, selectBusOptions } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';
import { validateCatalogFirst } from './catalogFirstRules';
import { catalogRefFromInput, normalizeCatalogBinding, normalizeStationType } from './catalogPayload';

function buildDefaultSnFields(stationType: 'A' | 'B' | 'C' | 'D') {
  const createField = (
    fieldRole: 'LINIA_IN' | 'LINIA_OUT' | 'LINIA_ODG' | 'TRANSFORMATOROWE' | 'SPRZEGLO',
  ) => ({
    field_role: fieldRole,
    apparatus_plan: [] as string[],
    catalog_bindings: null,
  });

  switch (stationType) {
    case 'A':
      return [createField('LINIA_IN'), createField('TRANSFORMATOROWE')];
    case 'C':
      return [
        createField('LINIA_IN'),
        createField('LINIA_OUT'),
        createField('LINIA_ODG'),
        createField('TRANSFORMATOROWE'),
      ];
    case 'D':
      return [
        createField('LINIA_IN'),
        createField('LINIA_OUT'),
        createField('SPRZEGLO'),
        createField('TRANSFORMATOROWE'),
      ];
    case 'B':
    default:
      return [
        createField('LINIA_IN'),
        createField('LINIA_OUT'),
        createField('TRANSFORMATOROWE'),
      ];
  }
}

export function InsertStationForm() {
  const context = useNetworkBuildStore((s) => s.activeOperationForm?.context);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const busOptions = useMemo(() => selectBusOptions(snapshot), [snapshot]);

  const initialData = useMemo<Partial<TransformerStationFormData>>(() => {
    if (!context) return {};
    const transformerContext = context.transformer as Record<string, unknown> | undefined;
    return {
      ref_id: (context.ref_id as string) ?? '',
      name: (context.name as string) ?? '',
      hv_bus_ref: (context.hv_bus_ref as string) ?? '',
      lv_bus_ref: (context.lv_bus_ref as string) ?? '',
      catalog_ref: (
        catalogRefFromInput(transformerContext?.catalog_binding)
        ?? catalogRefFromInput(context.catalog_binding)
      ) ?? '',
    };
  }, [context]);

  const handleSubmit = useCallback(
    async (data: TransformerStationFormData) => {
      if (!activeCaseId) return;
      const stationType = normalizeStationType(
        (context?.station as Record<string, unknown> | undefined)?.station_type
        ?? context?.station_type,
      );
      const segmentId = ((context?.segment_id as string) ?? (context?.segment_ref as string) ?? '').trim();
      const hvBusVoltage = busOptions.find((option) => option.ref_id === data.hv_bus_ref)?.voltage_kv;
      const lvBusVoltage = busOptions.find((option) => option.ref_id === data.lv_bus_ref)?.voltage_kv;
      if (hvBusVoltage == null || lvBusVoltage == null) {
        setCatalogError('Nie udało się ustalić napięć szyn stacji. Wybierz poprawne szyny GN i DN.');
        return;
      }
      const transformerBinding = normalizeCatalogBinding(data.catalog_ref, 'TRAFO_SN_NN');
      const payload = {
        segment_id: segmentId || undefined,
        name: data.name,
        station_type: stationType,
        insert_at: {
          mode: 'RATIO',
          value: (context?.position_on_segment as number) ?? 0.5,
        },
        station: {
          station_type: stationType,
          station_role: 'STACJA_SN_NN',
          station_name: data.name.trim() || data.ref_id.trim() || undefined,
          sn_voltage_kv: hvBusVoltage,
          nn_voltage_kv: lvBusVoltage,
        },
        sn_fields: buildDefaultSnFields(stationType),
        transformer: {
          create: true,
          catalog_binding: transformerBinding ?? undefined,
          model_type: 'DWU_UZWOJENIOWY',
          tap_changer_present: data.tap_position !== 0,
        },
        nn_block: {
          create_nn_bus: true,
          main_breaker_nn: true,
          outgoing_feeders_nn_count: 1,
          outgoing_feeders_nn: [],
        },
        options: {
          create_transformer_field: true,
          create_default_fields: true,
          create_nn_bus: true,
        },
      };
      const validationError = validateCatalogFirst('insert_station_on_segment_sn', payload);
      if (validationError) {
        setCatalogError(validationError);
        return;
      }
      setCatalogError(null);
      await executeDomainOperation(activeCaseId, 'insert_station_on_segment_sn', payload);
      closeForm();
    },
    [activeCaseId, busOptions, executeDomainOperation, closeForm, context],
  );

  return (
    <div className="h-full overflow-y-auto" data-testid="insert-station-form">
      {catalogError && (
        <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">{catalogError}</p>
      )}
      <TransformerStationModal
        isOpen={true}
        mode="create"
        initialData={initialData}
        busOptions={busOptions}
        onSubmit={handleSubmit}
        onCancel={closeForm}
      />
    </div>
  );
}
