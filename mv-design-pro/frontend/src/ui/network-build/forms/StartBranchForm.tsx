/**
 * StartBranchForm — formularz rozpoczęcia odgałęzienia.
 *
 * Wrapper inline nad BranchModal z ui/topology/modals/.
 * Integruje się z snapshotStore.executeDomainOperation + networkBuildStore.
 *
 * BINDING: 100% PL etykiety.
 */

import { useCallback, useMemo, useState } from 'react';
import { BranchModal, type BranchFormData } from '../../topology/modals/BranchModal';
import { useSnapshotStore, selectBusOptions } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';
import { validateCatalogFirst } from './catalogFirstRules';
import {
  catalogRefFromInput,
  normalizeCatalogBinding,
  normalizeSegmentKind,
  normalizeSegmentNamespace,
} from './catalogPayload';

export function StartBranchForm() {
  const context = useNetworkBuildStore((s) => s.activeOperationForm?.context);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const busOptions = useMemo(() => selectBusOptions(snapshot), [snapshot]);

  const initialData = useMemo<Partial<BranchFormData>>(() => {
    if (!context) return {};
    const segmentContext = context.segment as Record<string, unknown> | undefined;
    return {
      from_bus_ref: ((context.from_ref as string) ?? (context.from_bus_ref as string) ?? ''),
      to_bus_ref: (context.to_bus_ref as string) ?? '',
      type: (context.branch_type as BranchFormData['type']) ?? 'cable',
      catalog_ref: (
        catalogRefFromInput(segmentContext?.catalog_binding)
        ?? catalogRefFromInput(context.catalog_binding)
      ) ?? '',
    };
  }, [context]);

  const handleSubmit = useCallback(
    async (data: BranchFormData) => {
      if (!activeCaseId) return;
      if (data.type !== 'line_overhead' && data.type !== 'cable') {
        setCatalogError('Odgałęzienie SN można rozpocząć wyłącznie jako kabel albo linię napowietrzną.');
        return;
      }
      const fromRef = typeof context?.from_ref === 'string' ? context.from_ref.trim() : '';
      if (!fromRef) {
        setCatalogError('Brak jawnego miejsca odgałęzienia. Wybierz port odgałęźny w modelu technicznym.');
        return;
      }
      const catalogNamespace = normalizeSegmentNamespace(data.type);
      const catalogBinding = normalizeCatalogBinding(data.catalog_ref, catalogNamespace);
      const payload = {
        from_ref: fromRef,
        segment: {
          rodzaj: normalizeSegmentKind(data.type),
          dlugosc_m: Math.round(data.length_km * 1000),
          name: data.name.trim() || data.ref_id.trim() || undefined,
          catalog_binding: catalogBinding ?? undefined,
        },
      };
      const validationError = validateCatalogFirst('start_branch_segment_sn', payload);
      if (validationError) {
        setCatalogError(validationError);
        return;
      }
      setCatalogError(null);
      await executeDomainOperation(activeCaseId, 'start_branch_segment_sn', payload);
      closeForm();
    },
    [activeCaseId, executeDomainOperation, closeForm, context],
  );

  return (
    <div className="h-full overflow-y-auto" data-testid="start-branch-form">
      {catalogError && (
        <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">{catalogError}</p>
      )}
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
