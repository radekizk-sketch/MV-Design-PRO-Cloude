/**
 * SetNormalOpenPointForm — Form for marking a switch as the Normal Open Point.
 *
 * BINDING: No guessing. The switch is identified by the operation context
 * (element_ref).  Backend validates that the referenced element is a switch.
 *
 * 100% PL labels.
 */

import { useCallback, useMemo, useState } from 'react';

import { useAppStateStore } from '../../app-state';
import { useSnapshotStore } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { OperationFormShell } from './OperationFormShell';

export function SetNormalOpenPointForm() {
  const context = useNetworkBuildStore((s) => s.activeOperationForm?.context);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);

  const [error, setError] = useState<string | null>(null);

  const elementRef = useMemo(
    () =>
      (context?.element_ref as string | undefined) ??
      (context?.elementRef as string | undefined) ??
      null,
    [context],
  );

  const elementLabel = useMemo(
    () =>
      (context?.elementLabel as string | undefined) ??
      elementRef ??
      'brak wskazanego aparatu',
    [context, elementRef],
  );

  const handleSubmit = useCallback(async () => {
    if (!activeCaseId) {
      setError('Brak aktywnego przypadku obliczeniowego.');
      return;
    }
    if (!elementRef) {
      setError('Nie wskazano aparatu do oznaczenia jako NOP.');
      return;
    }

    setError(null);
    const response = await executeDomainOperation(activeCaseId, 'set_normal_open_point', {
      element_ref: elementRef,
    });

    if (!response || response.error) {
      setError(response?.error ?? 'Nie udało się oznaczyć aparatu jako NOP.');
      return;
    }

    closeForm();
  }, [activeCaseId, closeForm, elementRef, executeDomainOperation]);

  return (
    <div className="h-full" data-testid="set-normal-open-point-form">
      <OperationFormShell
        title="Punkt normalnie otwarty (NOP)"
        description="NOP jest topologicznym rozgraniczeniem sekcji pierścieniowych. Aparat pozostaje otwarty przy normalnej eksploatacji."
        submitLabel="Oznacz jako NOP"
        error={error}
        onCancel={closeForm}
        onSubmit={() => {
          void handleSubmit();
        }}
      >
        <div className="space-y-3">
          <div className="rounded border border-chrome-200 bg-chrome-50 p-3">
            <p className="text-xs font-medium text-chrome-700">Wskazany aparat:</p>
            <p className="mt-1 text-sm font-semibold text-chrome-900">{elementLabel}</p>
          </div>
          <p className="text-xs text-chrome-500">
            Po zatwierdzeniu aparat zostanie trwale oznaczony jako NOP w modelu sieci.
            Operacja jest odwracalna przez ponowne oznaczenie innego aparatu jako NOP.
          </p>
        </div>
      </OperationFormShell>
    </div>
  );
}

export default SetNormalOpenPointForm;
