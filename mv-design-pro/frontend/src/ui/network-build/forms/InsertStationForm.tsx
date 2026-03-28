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
    return {
      ref_id: (context.ref_id as string) ?? '',
      name: (context.name as string) ?? '',
      hv_bus_ref: (context.hv_bus_ref as string) ?? '',
      lv_bus_ref: (context.lv_bus_ref as string) ?? '',
      catalog_ref: (context.catalog_ref as string) ?? '',
    };
  }, [context]);

  const handleSubmit = useCallback(
    async (data: TransformerStationFormData) => {
      if (!activeCaseId) return;
      const payload = {
        ref_id: data.ref_id,
        name: data.name,
        hv_bus_ref: data.hv_bus_ref,
        lv_bus_ref: data.lv_bus_ref,
        tap_position: data.tap_position,
        catalog_ref: data.catalog_ref,
        parameter_source: data.parameter_source,
        overrides: data.overrides,
        segment_ref: (context?.segment_ref as string) ?? undefined,
        position_on_segment: (context?.position_on_segment as number) ?? 0.5,
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
    [activeCaseId, executeDomainOperation, closeForm, context],
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
