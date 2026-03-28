/**
 * ContinueTrunkForm — formularz kontynuacji magistrali SN.
 *
 * Wrapper inline nad TrunkContinueModal z ui/topology/modals/.
 * Integruje się z snapshotStore.executeDomainOperation + networkBuildStore.
 *
 * BINDING: 100% PL etykiety.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  TrunkContinueModal,
  type TrunkContinueFormData,
} from '../../topology/modals/TrunkContinueModal';
import { useSnapshotStore } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';
import { validateCatalogFirst } from './catalogFirstRules';

export function ContinueTrunkForm() {
  const context = useNetworkBuildStore((s) => s.activeOperationForm?.context);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);

  const trunkId = (context?.trunkId as string) ?? '';
  const terminalId = (context?.terminalId as string) ?? '';
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const initialData = useMemo<Partial<TrunkContinueFormData>>(() => {
    if (!context) return {};
    return {
      segment_kind: (context.segment_kind as TrunkContinueFormData['segment_kind']) ?? undefined,
      length_m: (context.length_m as number) ?? undefined,
      catalog_binding: (context.catalog_binding as string) ?? null,
    };
  }, [context]);

  const handleSubmit = useCallback(
    async (data: TrunkContinueFormData) => {
      if (!activeCaseId) return;
      const payload = {
        trunk_id: trunkId,
        terminal_id: terminalId,
        segment_kind: data.segment_kind,
        length_m: data.length_m,
        geometry_mode: data.geometry_mode,
        direction: data.direction,
        catalog_binding: data.catalog_binding,
        notes: data.notes,
      };
      const validationError = validateCatalogFirst('continue_trunk_segment_sn', payload);
      if (validationError) {
        setCatalogError(validationError);
        return;
      }
      setCatalogError(null);
      await executeDomainOperation(activeCaseId, 'continue_trunk_segment_sn', payload);
      closeForm();
    },
    [activeCaseId, executeDomainOperation, closeForm, trunkId, terminalId],
  );

  return (
    <div className="h-full overflow-y-auto" data-testid="continue-trunk-form">
      {catalogError && (
        <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">{catalogError}</p>
      )}
      <TrunkContinueModal
        isOpen={true}
        mode="create"
        trunkId={trunkId}
        terminalId={terminalId}
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={closeForm}
      />
    </div>
  );
}
