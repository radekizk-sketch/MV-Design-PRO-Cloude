/**
 * MeasurementModal — edytor przekładnika prądowego (CT) lub napięciowego (VT).
 *
 * Pola: typ, przekładnia, klasa dokładności, obciążenie, połączenie, przeznaczenie.
 * BINDING: PL labels, no codenames.
 */

import React, { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MeasurementType = 'CT' | 'VT';
export type ConnectionType = 'star' | 'delta' | 'single_phase';
export type PurposeType = 'protection' | 'metering' | 'combined';

export interface MeasurementFormData {
  ref_id: string;
  name: string;
  measurement_type: MeasurementType;
  bus_ref: string;
  ratio_primary: number;
  ratio_secondary: number;
  accuracy_class: string;
  burden_va: number;
  connection: ConnectionType;
  purpose: PurposeType;
}

interface MeasurementModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<MeasurementFormData>;
  busOptions: Array<{ ref_id: string; name: string; voltage_kv: number }>;
  onSubmit: (data: MeasurementFormData) => void;
  onCancel: () => void;
}

interface FieldError {
  field: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Labels & Defaults
// ---------------------------------------------------------------------------

const MEASUREMENT_TYPE_LABELS: Record<MeasurementType, string> = {
  CT: 'Przekładnik prądowy (CT)',
  VT: 'Przekładnik napięciowy (VT)',
};

const CONNECTION_LABELS: Record<ConnectionType, string> = {
  star: 'Gwiazda',
  delta: 'Trójkąt',
  single_phase: 'Jednofazowe',
};

const PURPOSE_LABELS: Record<PurposeType, string> = {
  protection: 'Zabezpieczeniowy',
  metering: 'Pomiarowy',
  combined: 'Kombinowany',
};

const CT_DEFAULTS: Partial<MeasurementFormData> = {
  measurement_type: 'CT',
  ratio_primary: 200,
  ratio_secondary: 5,
  accuracy_class: '5P20',
  burden_va: 15,
  connection: 'star',
  purpose: 'protection',
};

const VT_DEFAULTS: Partial<MeasurementFormData> = {
  measurement_type: 'VT',
  ratio_primary: 15000,
  ratio_secondary: 100,
  accuracy_class: '0.5',
  burden_va: 30,
  connection: 'star',
  purpose: 'protection',
};

const DEFAULT_DATA: MeasurementFormData = {
  ref_id: '',
  name: '',
  measurement_type: 'CT',
  bus_ref: '',
  ratio_primary: 200,
  ratio_secondary: 5,
  accuracy_class: '5P20',
  burden_va: 15,
  connection: 'star',
  purpose: 'protection',
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateForm(data: MeasurementFormData): FieldError[] {
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
  if (data.ratio_primary <= 0) {
    errors.push({ field: 'ratio_primary', message: 'Strona pierwotna musi być > 0' });
  }
  if (data.ratio_secondary <= 0) {
    errors.push({ field: 'ratio_secondary', message: 'Strona wtórna musi być > 0' });
  }
  if (data.burden_va < 0) {
    errors.push({ field: 'burden_va', message: 'Obciążenie nie może być ujemne' });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MeasurementModal({
  isOpen,
  mode,
  initialData,
  busOptions,
  onSubmit,
  onCancel,
}: MeasurementModalProps) {
  const [formData, setFormData] = useState<MeasurementFormData>({ ...DEFAULT_DATA, ...initialData });
  const [errors, setErrors] = useState<FieldError[]>([]);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...DEFAULT_DATA, ...initialData });
      setErrors([]);
    }
  }, [isOpen, initialData]);

  const handleChange = useCallback((field: keyof MeasurementFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleTypeChange = useCallback((newType: MeasurementType) => {
    const defaults = newType === 'CT' ? CT_DEFAULTS : VT_DEFAULTS;
    setFormData((prev) => ({
      ...prev,
      ...defaults,
      ref_id: prev.ref_id,
      name: prev.name,
      bus_ref: prev.bus_ref,
    }));
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

  const ratioDisplay = formData.measurement_type === 'CT'
    ? `${formData.ratio_primary}/${formData.ratio_secondary} A`
    : `${formData.ratio_primary}/${formData.ratio_secondary} V`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Nowy przekładnik' : 'Edycja przekładnika'}
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

          {/* Typ przekładnika */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ przekładnika</label>
            <select
              value={formData.measurement_type}
              onChange={(e) => handleTypeChange(e.target.value as MeasurementType)}
              disabled={mode === 'edit'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {Object.entries(MEASUREMENT_TYPE_LABELS).map(([val, label]) => (
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

          {/* Przekładnia */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Przekładnia: {ratioDisplay}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Strona pierwotna [{formData.measurement_type === 'CT' ? 'A' : 'V'}]
                </label>
                <input
                  type="number"
                  value={formData.ratio_primary}
                  onChange={(e) => handleChange('ratio_primary', parseFloat(e.target.value) || 0)}
                  className={`w-full px-2 py-1.5 border rounded text-sm ${
                    getError('ratio_primary') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getError('ratio_primary') && (
                  <p className="mt-0.5 text-xs text-red-600">{getError('ratio_primary')}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Strona wtórna [{formData.measurement_type === 'CT' ? 'A' : 'V'}]
                </label>
                <input
                  type="number"
                  value={formData.ratio_secondary}
                  onChange={(e) => handleChange('ratio_secondary', parseFloat(e.target.value) || 0)}
                  className={`w-full px-2 py-1.5 border rounded text-sm ${
                    getError('ratio_secondary') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getError('ratio_secondary') && (
                  <p className="mt-0.5 text-xs text-red-600">{getError('ratio_secondary')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Parametry */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Klasa dokładności</label>
              <input
                type="text"
                value={formData.accuracy_class}
                onChange={(e) => handleChange('accuracy_class', e.target.value)}
                placeholder={formData.measurement_type === 'CT' ? '5P20' : '0.5'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Obciążenie [VA]</label>
              <input
                type="number"
                value={formData.burden_va}
                onChange={(e) => handleChange('burden_va', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  getError('burden_va') ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {getError('burden_va') && (
                <p className="mt-1 text-xs text-red-600">{getError('burden_va')}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Połączenie</label>
              <select
                value={formData.connection}
                onChange={(e) => handleChange('connection', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {Object.entries(CONNECTION_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Przeznaczenie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Przeznaczenie</label>
            <select
              value={formData.purpose}
              onChange={(e) => handleChange('purpose', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {Object.entries(PURPOSE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
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
