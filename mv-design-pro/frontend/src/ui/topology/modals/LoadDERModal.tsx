/**
 * LoadDERModal — edytor odbiorów (Load) i źródeł rozproszonych (DER/OZE).
 *
 * Tryby: load (P/Q/model), pv_inverter, wind_inverter, bess, synchronous.
 * BINDING: PL labels, no codenames.
 */

import React, { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ElementKind = 'load' | 'generator';
export type LoadModel = 'pq' | 'zip';
export type GenType = 'synchronous' | 'pv_inverter' | 'wind_inverter' | 'bess';

export interface LoadDERFormData {
  ref_id: string;
  name: string;
  element_kind: ElementKind;
  bus_ref: string;
  p_mw: number;
  q_mvar: number;
  // Load-specific
  load_model: LoadModel;
  // Generator-specific
  gen_type: GenType;
  p_min_mw: number;
  p_max_mw: number;
  q_min_mvar: number;
  q_max_mvar: number;
  cos_phi: number;
}

interface LoadDERModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<LoadDERFormData>;
  busOptions: Array<{ ref_id: string; name: string; voltage_kv: number }>;
  onSubmit: (data: LoadDERFormData) => void;
  onCancel: () => void;
}

interface FieldError {
  field: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Labels & Defaults
// ---------------------------------------------------------------------------

const ELEMENT_KIND_LABELS: Record<ElementKind, string> = {
  load: 'Odbiór',
  generator: 'Generator / OZE',
};

const LOAD_MODEL_LABELS: Record<LoadModel, string> = {
  pq: 'PQ (stała moc)',
  zip: 'ZIP (wielomianowy)',
};

const GEN_TYPE_LABELS: Record<GenType, string> = {
  synchronous: 'Synchroniczny',
  pv_inverter: 'Falownik PV',
  wind_inverter: 'Falownik wiatrowy',
  bess: 'Magazyn energii (BESS)',
};

const DEFAULT_DATA: LoadDERFormData = {
  ref_id: '',
  name: '',
  element_kind: 'load',
  bus_ref: '',
  p_mw: 0.5,
  q_mvar: 0.15,
  load_model: 'pq',
  gen_type: 'pv_inverter',
  p_min_mw: 0,
  p_max_mw: 1.0,
  q_min_mvar: -0.5,
  q_max_mvar: 0.5,
  cos_phi: 0.95,
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateForm(data: LoadDERFormData): FieldError[] {
  const errors: FieldError[] = [];

  if (!data.ref_id.trim()) {
    errors.push({ field: 'ref_id', message: 'Identyfikator jest wymagany' });
  }
  if (!data.name.trim()) {
    errors.push({ field: 'name', message: 'Nazwa jest wymagana' });
  }
  if (!data.bus_ref) {
    errors.push({ field: 'bus_ref', message: 'Szyna jest wymagana' });
  }

  if (data.element_kind === 'load') {
    if (data.p_mw < 0) {
      errors.push({ field: 'p_mw', message: 'Moc czynna odbioru nie może być ujemna' });
    }
  }

  if (data.element_kind === 'generator') {
    if (data.p_max_mw < data.p_min_mw) {
      errors.push({ field: 'p_max_mw', message: 'Pmax musi być ≥ Pmin' });
    }
    if (data.q_max_mvar < data.q_min_mvar) {
      errors.push({ field: 'q_max_mvar', message: 'Qmax musi być ≥ Qmin' });
    }
    if (data.cos_phi < 0 || data.cos_phi > 1) {
      errors.push({ field: 'cos_phi', message: 'cos\u03C6 musi być w zakresie [0, 1]' });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LoadDERModal({
  isOpen,
  mode,
  initialData,
  busOptions,
  onSubmit,
  onCancel,
}: LoadDERModalProps) {
  const [formData, setFormData] = useState<LoadDERFormData>({ ...DEFAULT_DATA, ...initialData });
  const [errors, setErrors] = useState<FieldError[]>([]);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...DEFAULT_DATA, ...initialData });
      setErrors([]);
    }
  }, [isOpen, initialData]);

  const handleChange = useCallback((field: keyof LoadDERFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    if (validationErrors.length === 0) {
      onSubmit(formData);
    }
  }, [formData, onSubmit]);

  const getError = (field: string): string | undefined =>
    errors.find((e) => e.field === field)?.message;

  const isLoad = formData.element_kind === 'load';
  const isGen = formData.element_kind === 'generator';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create'
              ? (isLoad ? 'Nowy odbiór' : 'Nowy generator / OZE')
              : (isLoad ? 'Edycja odbioru' : 'Edycja generatora / OZE')}
          </h2>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Identyfikacja */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Identyfikator</label>
              <input
                type="text"
                value={formData.ref_id}
                onChange={(e) => handleChange('ref_id', e.target.value)}
                disabled={mode === 'edit'}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  getError('ref_id') ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {getError('ref_id') && <p className="mt-1 text-xs text-red-600">{getError('ref_id')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  getError('name') ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {getError('name') && <p className="mt-1 text-xs text-red-600">{getError('name')}</p>}
            </div>
          </div>

          {/* Rodzaj elementu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rodzaj</label>
            <select
              value={formData.element_kind}
              onChange={(e) => handleChange('element_kind', e.target.value)}
              disabled={mode === 'edit'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {Object.entries(ELEMENT_KIND_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Szyna */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Szyna</label>
            <select
              value={formData.bus_ref}
              onChange={(e) => handleChange('bus_ref', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                getError('bus_ref') ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">— wybierz —</option>
              {busOptions.map((b) => (
                <option key={b.ref_id} value={b.ref_id}>
                  {b.name} ({b.voltage_kv} kV)
                </option>
              ))}
            </select>
            {getError('bus_ref') && <p className="mt-1 text-xs text-red-600">{getError('bus_ref')}</p>}
          </div>

          {/* Moc czynna i bierna */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Parametry mocy</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Moc czynna P [MW]</label>
                <input
                  type="number"
                  value={formData.p_mw}
                  onChange={(e) => handleChange('p_mw', parseFloat(e.target.value) || 0)}
                  step="0.01"
                  className={`w-full px-2 py-1.5 border rounded text-sm ${
                    getError('p_mw') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getError('p_mw') && (
                  <p className="mt-0.5 text-xs text-red-600">{getError('p_mw')}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Moc bierna Q [Mvar]</label>
                <input
                  type="number"
                  value={formData.q_mvar}
                  onChange={(e) => handleChange('q_mvar', parseFloat(e.target.value) || 0)}
                  step="0.01"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Load-specific */}
          {isLoad && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model odbioru</label>
              <select
                value={formData.load_model}
                onChange={(e) => handleChange('load_model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {Object.entries(LOAD_MODEL_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Generator-specific */}
          {isGen && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typ generatora</label>
                <select
                  value={formData.gen_type}
                  onChange={(e) => handleChange('gen_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {Object.entries(GEN_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Ograniczenia mocy</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Pmin [MW]</label>
                    <input
                      type="number"
                      value={formData.p_min_mw}
                      onChange={(e) => handleChange('p_min_mw', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Pmax [MW]</label>
                    <input
                      type="number"
                      value={formData.p_max_mw}
                      onChange={(e) => handleChange('p_max_mw', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className={`w-full px-2 py-1.5 border rounded text-sm ${
                        getError('p_max_mw') ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {getError('p_max_mw') && (
                      <p className="mt-0.5 text-xs text-red-600">{getError('p_max_mw')}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Qmin [Mvar]</label>
                    <input
                      type="number"
                      value={formData.q_min_mvar}
                      onChange={(e) => handleChange('q_min_mvar', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Qmax [Mvar]</label>
                    <input
                      type="number"
                      value={formData.q_max_mvar}
                      onChange={(e) => handleChange('q_max_mvar', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className={`w-full px-2 py-1.5 border rounded text-sm ${
                        getError('q_max_mvar') ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {getError('q_max_mvar') && (
                      <p className="mt-0.5 text-xs text-red-600">{getError('q_max_mvar')}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">cos&phi;</label>
                <input
                  type="number"
                  value={formData.cos_phi}
                  onChange={(e) => handleChange('cos_phi', parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                  max="1"
                  className={`w-full px-3 py-2 border rounded-md text-sm ${
                    getError('cos_phi') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getError('cos_phi') && (
                  <p className="mt-1 text-xs text-red-600">{getError('cos_phi')}</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Anuluj
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            {mode === 'create' ? 'Dodaj' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}
