/**
 * Fault Scenario Edit Modal — PR-24
 * All labels in Polish. No project codenames.
 */

import { useState, useCallback, useEffect } from 'react';
import { useFaultScenariosStore } from './store';
import { FAULT_TYPE_LABELS, type FaultTypeValue, type CreateFaultScenarioRequest, type UpdateFaultScenarioRequest } from './types';

const FAULT_TYPES: FaultTypeValue[] = ['SC_3F', 'SC_2F', 'SC_1F'];

export function FaultScenarioModal() {
  const {
    studyCaseId, scenarios, isModalOpen, editingScenarioId, error,
    createScenario, updateScenario, closeModal,
  } = useFaultScenariosStore();

  const editingScenario = editingScenarioId
    ? scenarios.find((s) => s.scenario_id === editingScenarioId) ?? null
    : null;

  const [name, setName] = useState('');
  const [faultType, setFaultType] = useState<FaultTypeValue>('SC_3F');
  const [elementRef, setElementRef] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (editingScenario) {
      setName(editingScenario.name);
      setFaultType(editingScenario.fault_type);
      setElementRef(editingScenario.location.element_ref);
    } else {
      setName('');
      setFaultType('SC_3F');
      setElementRef('');
    }
    setValidationError(null);
  }, [editingScenario, isModalOpen]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { setValidationError('Nazwa scenariusza jest wymagana'); return; }
    if (!elementRef.trim()) { setValidationError('Węzeł zwarcia jest wymagany'); return; }
    setValidationError(null);

    try {
      if (editingScenarioId) {
        const updateData: UpdateFaultScenarioRequest = {
          name: name.trim(), fault_type: faultType,
          location: { element_ref: elementRef.trim(), location_type: 'BUS', position: null },
        };
        await updateScenario(editingScenarioId, updateData);
      } else if (studyCaseId) {
        const createData: CreateFaultScenarioRequest = {
          name: name.trim(), fault_type: faultType,
          location: { element_ref: elementRef.trim(), location_type: 'BUS', position: null },
        };
        await createScenario(studyCaseId, createData);
      }
    } catch { /* Error handled in store */ }
  }, [name, faultType, elementRef, editingScenarioId, studyCaseId, createScenario, updateScenario]);

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="fault-scenario-modal">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-800">
            {editingScenarioId ? 'Edytuj scenariusz zwarcia' : 'Nowy scenariusz zwarcia'}
          </h3>
          <button onClick={closeModal} className="text-slate-400 hover:text-slate-600" data-testid="fault-scenario-modal-close">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nazwa</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="np. Zwarcie na szynie głównej"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-400"
              data-testid="fault-scenario-name-input" autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Typ analizy</label>
            <select
              value={faultType} onChange={(e) => setFaultType(e.target.value as FaultTypeValue)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-400"
              data-testid="fault-scenario-type-select"
            >
              {FAULT_TYPES.map((ft) => (<option key={ft} value={ft}>{FAULT_TYPE_LABELS[ft]}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Węzeł zwarcia</label>
            <input
              type="text" value={elementRef} onChange={(e) => setElementRef(e.target.value)}
              placeholder="np. bus-1"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-400"
              data-testid="fault-scenario-node-input"
            />
            <p className="mt-1 text-xs text-slate-400">Identyfikator węzła sieci, w którym ma nastąpić zwarcie</p>
          </div>

          {validationError && (
            <div className="p-2 text-xs rounded bg-rose-50 text-rose-700 border border-rose-200" data-testid="fault-scenario-validation-error">
              {validationError}
            </div>
          )}
          {error && (
            <div className="p-2 text-xs rounded bg-rose-50 text-rose-700 border border-rose-200" data-testid="fault-scenario-api-error">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
          <button onClick={closeModal} className="px-4 py-2 text-sm border border-slate-300 rounded text-slate-600 hover:bg-slate-50" data-testid="fault-scenario-cancel-btn">
            Anuluj
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700" data-testid="fault-scenario-save-btn">
            {editingScenarioId ? 'Zapisz zmiany' : 'Utwórz scenariusz'}
          </button>
        </div>
      </div>
    </div>
  );
}
