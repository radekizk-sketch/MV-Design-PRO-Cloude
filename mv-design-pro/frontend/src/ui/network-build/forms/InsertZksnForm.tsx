import { FormEvent, useCallback, useMemo, useState } from 'react';
import { useSnapshotStore } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';
import { validateCatalogFirst } from './catalogFirstRules';

export function InsertZksnForm() {
  const context = useNetworkBuildStore((s) => s.activeOperationForm?.context);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);

  const [name, setName] = useState('ZKSN SN');
  const [catalogRef, setCatalogRef] = useState('');
  const [ratio, setRatio] = useState(0.5);
  const [branchPortsCount, setBranchPortsCount] = useState(2);
  const [switchState, setSwitchState] = useState<'open' | 'closed'>('closed');
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
      branch_ports_count: branchPortsCount,
      switch_state: switchState,
      insert_at: { mode: 'RATIO', value: ratio },
    };
    const validationError = validateCatalogFirst('insert_zksn_on_segment_sn', payload);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    await executeDomainOperation(activeCaseId, 'insert_zksn_on_segment_sn', payload);
    closeForm();
  }, [activeCaseId, branchPortsCount, catalogRef, closeForm, executeDomainOperation, name, ratio, segmentId, switchState]);

  return (
    <form className="p-4 space-y-3" data-testid="insert-zksn-form" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold text-gray-800">Wstaw ZKSN</h3>
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
      <label className="block text-xs text-gray-600">Porty BRANCH
        <input type="number" min={1} max={2} step={1} className="mt-1 w-full rounded border px-2 py-1 text-xs" value={branchPortsCount} onChange={(e) => setBranchPortsCount(Number(e.target.value))} />
      </label>
      <label className="block text-xs text-gray-600">Stan łącznika
        <select className="mt-1 w-full rounded border px-2 py-1 text-xs" value={switchState} onChange={(e) => setSwitchState(e.target.value as 'open' | 'closed')}>
          <option value="closed">Zamknięty</option>
          <option value="open">Otwarty</option>
        </select>
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
