/**
 * AddGridSourceForm — formularz dodawania źródła zasilania GPZ.
 *
 * Wrapper inline nad GridSourceModal z ui/topology/modals/.
 * Integruje się z snapshotStore.executeDomainOperation + networkBuildStore.
 *
 * BINDING: 100% PL etykiety.
 */

import { useCallback, useMemo, useState } from 'react';
import { GridSourceModal, type GridSourceFormData } from '../../topology/modals/GridSourceModal';
import { useSnapshotStore } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';
import { validateCatalogFirst } from './catalogFirstRules';
import { catalogRefFromInput, normalizeCatalogBinding } from './catalogPayload';

export function AddGridSourceForm() {
  const context = useNetworkBuildStore((s) => s.activeOperationForm?.context);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const initialData = useMemo<Partial<GridSourceFormData>>(() => {
    if (!context) return {};
    return {
      source_name: (context.source_name as string) ?? '',
      sn_voltage_kv: (context.sn_voltage_kv as number) ?? undefined,
      sk3_mva: (context.sk3_mva as number) ?? undefined,
      rx_ratio: (context.rx_ratio as number) ?? undefined,
      catalog_ref: catalogRefFromInput(context.catalog_ref) ?? catalogRefFromInput(context.catalog_binding),
    };
  }, [context]);

  const handleSubmit = useCallback(
    async (data: GridSourceFormData) => {
      if (!activeCaseId) return;
      if (
        data.sn_voltage_kv === null
        || data.sk3_mva === null
        || data.rx_ratio === null
      ) {
        setCatalogError('Uzupelnij wszystkie parametry zrodla przed zapisaniem.');
        return;
      }
      const catalogBinding = normalizeCatalogBinding(data.catalog_ref, 'ZRODLO_SN');
      const payload = {
        source_name: data.source_name,
        voltage_kv: data.sn_voltage_kv,
        sk3_mva: data.sk3_mva,
        rx_ratio: data.rx_ratio,
        catalog_binding: catalogBinding ?? undefined,
      };
      const validationError = validateCatalogFirst('add_grid_source_sn', payload);
      if (validationError) {
        setCatalogError(validationError);
        return;
      }
      setCatalogError(null);
      await executeDomainOperation(activeCaseId, 'add_grid_source_sn', payload);
      closeForm();
    },
    [activeCaseId, executeDomainOperation, closeForm],
  );

  return (
    <div className="h-full overflow-y-auto" data-testid="add-grid-source-form">
      {catalogError && (
        <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">{catalogError}</p>
      )}
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
