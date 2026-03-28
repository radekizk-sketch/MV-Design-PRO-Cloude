import { useCallback, useMemo, useState } from 'react';
import { useSnapshotStore } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';

function parseValue(raw: string): string | number | boolean | null {
  const trimmed = raw.trim();
  if (trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  return raw;
}

export function UpdateElementParametersForm() {
  const context = useNetworkBuildStore((s) => s.activeOperationForm?.context);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);

  const elementRef = (context?.element_ref as string) ?? '';
  const field = (context?.field as string) ?? '';

  const [parameterName, setParameterName] = useState(field || '');
  const [parameterValue, setParameterValue] = useState((context?.value as string) ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(activeCaseId && elementRef && parameterName.trim()),
    [activeCaseId, elementRef, parameterName],
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !activeCaseId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await executeDomainOperation(activeCaseId, 'update_element_parameters', {
        element_ref: elementRef,
        updates: {
          [parameterName.trim()]: parseValue(parameterValue),
        },
      });
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zaktualizować parametrów');
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, activeCaseId, executeDomainOperation, elementRef, parameterName, parameterValue, closeForm]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3" data-testid="update-element-parameters-form">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">Edycja parametrów elementu</h3>
        <p className="text-[11px] text-gray-500 mt-1">Element: <span className="font-medium text-gray-700">{elementRef || '—'}</span></p>
      </div>

      <label className="block">
        <span className="text-[11px] font-medium text-gray-700">Parametr</span>
        <input
          value={parameterName}
          onChange={(e) => setParameterName(e.target.value)}
          placeholder="np. tap_position"
          className="mt-1 w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs"
        />
      </label>

      <label className="block">
        <span className="text-[11px] font-medium text-gray-700">Wartość</span>
        <input
          value={parameterValue}
          onChange={(e) => setParameterValue(e.target.value)}
          placeholder="np. 2, true, null"
          className="mt-1 w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs"
        />
      </label>

      <p className="text-[10px] text-gray-500">Konwersja: liczby/bool/null wykrywane automatycznie.</p>

      {error && <p className="text-[11px] text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Zapisywanie…' : 'Zapisz parametry'}
        </button>
        <button type="button" onClick={closeForm} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-600">
          Anuluj
        </button>
      </div>
    </div>
  );
}

export default UpdateElementParametersForm;
