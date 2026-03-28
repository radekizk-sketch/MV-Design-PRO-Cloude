/**
 * AddTransformerForm — formularz dodawania transformatora SN/nN.
 *
 * Wrapper inline nad TransformerStationModal z ui/topology/modals/
 * w trybie add_transformer_sn_nn.
 * Integruje się z snapshotStore.executeDomainOperation + networkBuildStore.
 *
 * BINDING: 100% PL etykiety.
 */

import { useCallback, useMemo } from 'react';
import {
  TransformerStationModal,
  type TransformerStationFormData,
} from '../../topology/modals/TransformerStationModal';
import { useSnapshotStore, selectBusOptions } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';

export function AddTransformerForm() {
  const context = useNetworkBuildStore((s) => s.activeOperationForm?.context);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);

  const busOptions = useMemo(() => selectBusOptions(snapshot), [snapshot]);

  const initialData = useMemo<Partial<TransformerStationFormData>>(() => {
    if (!context) return {};
    return {
      hv_bus_ref: (context.hv_bus_ref as string) ?? '',
      lv_bus_ref: (context.lv_bus_ref as string) ?? '',
      catalog_ref: (context.catalog_ref as string) ?? '',
    };
  }, [context]);

  const handleSubmit = useCallback(
    async (data: TransformerStationFormData) => {
      if (!activeCaseId) return;
      await executeDomainOperation(activeCaseId, 'add_transformer_sn_nn', {
        ref_id: data.ref_id,
        name: data.name,
        hv_bus_ref: data.hv_bus_ref,
        lv_bus_ref: data.lv_bus_ref,
        tap_position: data.tap_position,
        catalog_ref: data.catalog_ref,
        parameter_source: data.parameter_source,
        overrides: data.overrides,
        station_ref: (context?.station_ref as string) ?? undefined,
      });
      closeForm();
    },
    [activeCaseId, executeDomainOperation, closeForm, context],
  );

  return (
    <div className="h-full overflow-y-auto" data-testid="add-transformer-form">
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
