/**
 * CreateScenarioModal — PR-19
 *
 * Modal form for creating a new fault scenario.
 * All labels in Polish. No heuristics. No default physical guessing.
 *
 * INVARIANTS:
 * - SC_1F requires z0_bus_data (validated by backend)
 * - BRANCH location requires position
 * - No auto-completion of missing data
 */

import React, { useState, useCallback } from 'react';
import type {
  FaultType,
  FaultLocation,
  CreateFaultScenarioRequest,
} from './types';
import { FAULT_TYPE_LABELS } from './types';
import { FaultLocationSelector } from './FaultLocationSelector';

interface CreateScenarioModalProps {
  onSubmit: (request: CreateFaultScenarioRequest) => Promise<void>;
  onClose: () => void;
  isCreating: boolean;
}

const FAULT_TYPES: FaultType[] = ['SC_3F', 'SC_2F', 'SC_1F'];

export function CreateScenarioModal({
  onSubmit,
  onClose,
  isCreating,
}: CreateScenarioModalProps) {
  const [faultType, setFaultType] = useState<FaultType>('SC_3F');
  const [location, setLocation] = useState<FaultLocation | null>(null);
  const [cFactor, setCFactor] = useState('1.10');
  const [thermalTime, setThermalTime] = useState('1.0');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!location) {
      setError('Lokalizacja zwarcia jest wymagana');
      return;
    }

    const parsedCFactor = parseFloat(cFactor);
    const parsedThermalTime = parseFloat(thermalTime);

    if (isNaN(parsedCFactor) || parsedCFactor <= 0) {
      setError('Współczynnik c musi być liczbą > 0');
      return;
    }

    if (isNaN(parsedThermalTime) || parsedThermalTime <= 0) {
      setError('Czas cieplny musi być liczbą > 0');
      return;
    }

    const request: CreateFaultScenarioRequest = {
      fault_type: faultType,
      location,
      config: {
        c_factor: parsedCFactor,
        thermal_time_seconds: parsedThermalTime,
      },
    };

    try {
      await onSubmit(request);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Błąd tworzenia scenariusza';
      setError(message);
    }
  }, [faultType, location, cFactor, thermalTime, onSubmit, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Nowy scenariusz zwarcia</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4">
          {/* Fault type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ zwarcia
            </label>
            <div className="flex gap-2">
              {FAULT_TYPES.map((ft) => (
                <button
                  key={ft}
                  className={`flex-1 px-3 py-2 text-sm border rounded ${
                    faultType === ft
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => setFaultType(ft)}
                >
                  {FAULT_TYPE_LABELS[ft]}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="border border-gray-200 rounded p-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lokalizacja zwarcia
            </label>
            <FaultLocationSelector
              value={location}
              onChange={setLocation}
            />
          </div>

          {/* Config */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Współczynnik c
              </label>
              <input
                type="number"
                value={cFactor}
                onChange={(e) => setCFactor(e.target.value)}
                step={0.01}
                min={0.01}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Czas cieplny [s]
              </label>
              <input
                type="number"
                value={thermalTime}
                onChange={(e) => setThermalTime(e.target.value)}
                step={0.1}
                min={0.1}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          {/* SC_1F warning */}
          {faultType === 'SC_1F' && (
            <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 p-2 rounded">
              Zwarcie jednofazowe wymaga danych impedancji zerowej (Z0).
              Upewnij się, że dane Z0 są dostępne w modelu sieci.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={isCreating}
              className="flex-1 bg-blue-500 text-white py-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {isCreating ? 'Tworzenie...' : 'Utwórz scenariusz'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Anuluj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
