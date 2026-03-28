import { FormEvent, useCallback, useMemo, useState } from 'react';
import { useSnapshotStore } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';
import { validateCatalogFirst } from './catalogFirstRules';

export function InsertBranchPoleForm() {
  const context = useNetworkBuildStore((s) => s.activeOperationForm?.context);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);

  const [name, setName] = useState('Słup rozgałęźny SN');
  const [catalogRef, setCatalogRef] = useState('');
  const [ratio, setRatio] = useState(0.5);
  const [error, setError] = useState<string | null>(null);

  const segmentId = useMemo(
    () => (context?.segment_id as string) ?? (context?.segment_ref as string) ?? '',
    [context],
  );

  const onSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!activeCaseId) return;
    const payload = {
      segment_id: segmentId,
      name,
      catalog_ref: catalogRef,
      insert_at: { mode: 'RATIO', value: ratio },
    };
    const validationError = validateCatalogFirst('insert_branch_pole_on_segment_sn', payload);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    await executeDomainOperation(activeCaseId, 'insert_branch_pole_on_segment_sn', payload);
    closeForm();
  }, [activeCaseId, catalogRef, closeForm, executeDomainOperation, name, ratio, segmentId]);

  return (
    <form className="p-4 space-y-3" data-testid="insert-branch-pole-form" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold text-gray-800">Wstaw słup rozgałęźny</h3>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <label className="block text-xs text-gray-600">Odcinek SN
        <input className="mt-1 w-full rounded border px-2 py-1 text-xs" value={segmentId} readOnly />
      </label>
      <label className="block text-xs text-gray-600">Nazwa
        <input className="mt-1 w-full rounded border px-2 py-1 text-xs" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block text-xs text-gray-600">Catalog ref
        <input className="mt-1 w-full rounded border px-2 py-1 text-xs" value={catalogRef} onChange={(e) => setCatalogRef(e.target.value)} />
      </label>
      <label className="block text-xs text-gray-600">Pozycja (0-1)
        <input type="number" min={0} max={1} step={0.01} className="mt-1 w-full rounded border px-2 py-1 text-xs" value={ratio} onChange={(e) => setRatio(Number(e.target.value))} />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="px-3 py-1 text-xs rounded bg-blue-600 text-white">Wstaw</button>
        <button type="button" onClick={closeForm} className="px-3 py-1 text-xs rounded border">Anuluj</button>
      </div>
    </form>
  );
}
