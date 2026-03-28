/**
 * AddGridSourceForm — formularz dodawania źródła zasilania GPZ.
 *
 * Wrapper inline nad GridSourceModal z ui/topology/modals/.
 * Integruje się z snapshotStore.executeDomainOperation + networkBuildStore.
 *
 * BINDING: 100% PL etykiety.
 */

import { useCallback, useMemo } from 'react';
import { GridSourceModal, type GridSourceFormData } from '../../topology/modals/GridSourceModal';
import { useSnapshotStore } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';

export function AddGridSourceForm() {
  const context = useNetworkBuildStore((s) => s.activeOperationForm?.context);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);

  const initialData = useMemo<Partial<GridSourceFormData>>(() => {
    if (!context) return {};
    return {
      source_name: (context.source_name as string) ?? '',
      sn_voltage_kv: (context.sn_voltage_kv as number) ?? 15.0,
      sk3_mva: (context.sk3_mva as number) ?? undefined,
      rx_ratio: (context.rx_ratio as number) ?? 0.1,
      catalog_binding: (context.catalog_binding as string) ?? null,
    };
  }, [context]);

  const handleSubmit = useCallback(
    async (data: GridSourceFormData) => {
      if (!activeCaseId) return;
      await executeDomainOperation(activeCaseId, 'add_grid_source_sn', {
        source_name: data.source_name,
        sn_voltage_kv: data.sn_voltage_kv,
        sk3_mva: data.sk3_mva,
        rx_ratio: data.rx_ratio,
        notes: data.notes,
        catalog_binding: data.catalog_binding,
      });
      closeForm();
    },
    [activeCaseId, executeDomainOperation, closeForm],
  );

  return (
    <div className="h-full overflow-y-auto" data-testid="add-grid-source-form">
      <GridSourceModal
        isOpen={true}
        mode="create"
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={closeForm}
      />
    </div>
  );
}
