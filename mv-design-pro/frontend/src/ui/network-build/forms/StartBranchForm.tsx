/**
 * StartBranchForm — formularz rozpoczęcia odgałęzienia.
 *
 * Wrapper inline nad BranchModal z ui/topology/modals/.
 * Integruje się z snapshotStore.executeDomainOperation + networkBuildStore.
 *
 * BINDING: 100% PL etykiety.
 */

import { useCallback, useMemo } from 'react';
import { BranchModal, type BranchFormData } from '../../topology/modals/BranchModal';
import { useSnapshotStore, selectBusOptions } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';

export function StartBranchForm() {
  const context = useNetworkBuildStore((s) => s.activeOperationForm?.context);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);

  const busOptions = useMemo(() => selectBusOptions(snapshot), [snapshot]);

  const initialData = useMemo<Partial<BranchFormData>>(() => {
    if (!context) return {};
    return {
      from_bus_ref: (context.from_bus_ref as string) ?? '',
      to_bus_ref: (context.to_bus_ref as string) ?? '',
      type: (context.branch_type as BranchFormData['type']) ?? 'cable',
      catalog_ref: (context.catalog_ref as string) ?? '',
    };
  }, [context]);

  const handleSubmit = useCallback(
    async (data: BranchFormData) => {
      if (!activeCaseId) return;
      await executeDomainOperation(activeCaseId, 'start_branch_segment_sn', {
        ref_id: data.ref_id,
        name: data.name,
        type: data.type,
        from_bus_ref: data.from_bus_ref,
        to_bus_ref: data.to_bus_ref,
        status: data.status,
        length_km: data.length_km,
        catalog_ref: data.catalog_ref,
        parameter_source: data.parameter_source,
        overrides: data.overrides,
      });
      closeForm();
    },
    [activeCaseId, executeDomainOperation, closeForm],
  );

  return (
    <div className="h-full overflow-y-auto" data-testid="start-branch-form">
      <BranchModal
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
