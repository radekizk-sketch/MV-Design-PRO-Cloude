/**
 * ProtectionModal — edytor zabezpieczenia powiązanego z wyłącznikiem.
 *
 * Wybór typu zabezpieczenia, nastawy, przypięcie CT, walidacje.
 * BINDING: PL labels, no codenames.
 */

import React, { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProtectionDeviceType =
  | 'overcurrent'
  | 'earth_fault'
  | 'directional_overcurrent'
  | 'distance'
  | 'differential'
  | 'custom';

export type FunctionType =
  | 'overcurrent_50'
  | 'overcurrent_51'
  | 'earth_fault_50N'
  | 'earth_fault_51N'
  | 'directional_67'
  | 'directional_67N';

export type CurveType = 'DT' | 'IEC_SI' | 'IEC_VI' | 'IEC_EI' | 'IEC_LI';

export interface ProtectionSettingForm {
  function_type: FunctionType;
  threshold_a: number;
  time_delay_s: number;
  curve_type: CurveType | '';
  is_directional: boolean;
}

export interface ProtectionFormData {
  ref_id: string;
  name: string;
  breaker_ref: string;
  ct_ref: string;
  vt_ref: string;
  device_type: ProtectionDeviceType;
  settings: ProtectionSettingForm[];
  is_enabled: boolean;
}

interface ProtectionModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<ProtectionFormData>;
  breakerOptions: Array<{ ref_id: string; name: string }>;
  ctOptions: Array<{ ref_id: string; name: string; ratio: string }>;
  vtOptions: Array<{ ref_id: string; name: string }>;
  onSubmit: (data: ProtectionFormData) => void;
  onCancel: () => void;
}

interface FieldError {
  field: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const CT_REQUIRED_TYPES = new Set<ProtectionDeviceType>([
  'overcurrent', 'earth_fault', 'directional_overcurrent',
]);

function validateForm(data: ProtectionFormData): FieldError[] {
  const errors: FieldError[] = [];

  if (!data.ref_id.trim()) {
    errors.push({ field: 'ref_id', message: 'Identyfikator jest wymagany' });
  }
  if (!data.name.trim()) {
    errors.push({ field: 'name', message: 'Nazwa jest wymagana' });
  }
  if (!data.breaker_ref) {
    errors.push({ field: 'breaker_ref', message: 'Wyłącznik jest wymagany' });
  }
  if (CT_REQUIRED_TYPES.has(data.device_type) && !data.ct_ref) {
    errors.push({ field: 'ct_ref', message: `Zabezpieczenie typu '${DEVICE_TYPE_LABELS[data.device_type]}' wymaga przekładnika CT` });
  }

  for (let i = 0; i < data.settings.length; i++) {
    const s = data.settings[i];
    if (s.threshold_a <= 0) {
      errors.push({ field: `setting_${i}_threshold`, message: `Nastawa ${i + 1}: próg musi być > 0 A` });
    }
    if (s.time_delay_s < 0) {
      errors.push({ field: `setting_${i}_time`, message: `Nastawa ${i + 1}: czas nie może być ujemny` });
    }
  }

  return errors;
}

const DEVICE_TYPE_LABELS: Record<ProtectionDeviceType, string> = {
  overcurrent: 'Nadprądowe',
  earth_fault: 'Ziemnozwarciowe',
  directional_overcurrent: 'Kierunkowe nadprądowe',
  distance: 'Odległościowe',
  differential: 'Różnicowe',
  custom: 'Niestandardowe',
};

const FUNCTION_TYPE_LABELS: Record<FunctionType, string> = {
  overcurrent_50: '50 — zwarciowe bezzwłoczne',
  overcurrent_51: '51 — zwarciowe czasowe',
  earth_fault_50N: '50N — ziemnozwarciowe bezzwłoczne',
  earth_fault_51N: '51N — ziemnozwarciowe czasowe',
  directional_67: '67 — kierunkowe nadprądowe',
  directional_67N: '67N — kierunkowe ziemnozwarciowe',
};

const CURVE_TYPE_LABELS: Record<CurveType, string> = {
  DT: 'Czas zależny (DT)',
  IEC_SI: 'IEC — Standard Inverse',
  IEC_VI: 'IEC — Very Inverse',
  IEC_EI: 'IEC — Extremely Inverse',
  IEC_LI: 'IEC — Long Inverse',
};

const DEFAULT_SETTING: ProtectionSettingForm = {
  function_type: 'overcurrent_51',
  threshold_a: 200,
  time_delay_s: 0.5,
  curve_type: 'IEC_SI',
  is_directional: false,
};

const DEFAULT_DATA: ProtectionFormData = {
  ref_id: '',
  name: '',
  breaker_ref: '',
  ct_ref: '',
  vt_ref: '',
  device_type: 'overcurrent',
  settings: [{ ...DEFAULT_SETTING }],
  is_enabled: true,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProtectionModal({
  isOpen,
  mode,
  initialData,
  breakerOptions,
  ctOptions,
  vtOptions,
  onSubmit,
  onCancel,
}: ProtectionModalProps) {
  const [formData, setFormData] = useState<ProtectionFormData>({ ...DEFAULT_DATA, ...initialData });
  const [errors, setErrors] = useState<FieldError[]>([]);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...DEFAULT_DATA, ...initialData });
      setErrors([]);
    }
  }, [isOpen, initialData]);

  const handleChange = useCallback((field: keyof ProtectionFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSettingChange = useCallback(
    (index: number, field: keyof ProtectionSettingForm, value: unknown) => {
      setFormData((prev) => {
        const settings = [...prev.settings];
        settings[index] = { ...settings[index], [field]: value };
        return { ...prev, settings };
      });
    },
    [],
  );

  const addSetting = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      settings: [...prev.settings, { ...DEFAULT_SETTING }],
    }));
  }, []);

  const removeSetting = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      settings: prev.settings.filter((_, i) => i !== index),
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Nowe zabezpieczenie' : 'Edycja zabezpieczenia'}
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
            </div>
          </div>

          {/* Typ zabezpieczenia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ zabezpieczenia</label>
            <select
              value={formData.device_type}
              onChange={(e) => handleChange('device_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {Object.entries(DEVICE_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Powiązania */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wyłącznik</label>
              <select
                value={formData.breaker_ref}
                onChange={(e) => handleChange('breaker_ref', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  getError('breaker_ref') ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">— wybierz —</option>
                {breakerOptions.map((b) => (
                  <option key={b.ref_id} value={b.ref_id}>{b.name}</option>
                ))}
              </select>
              {getError('breaker_ref') && <p className="mt-1 text-xs text-red-600">{getError('breaker_ref')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Przekładnik CT
                {CT_REQUIRED_TYPES.has(formData.device_type) && <span className="text-red-500"> *</span>}
              </label>
              <select
                value={formData.ct_ref}
                onChange={(e) => handleChange('ct_ref', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  getError('ct_ref') ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">— brak —</option>
                {ctOptions.map((ct) => (
                  <option key={ct.ref_id} value={ct.ref_id}>
                    {ct.name} ({ct.ratio})
                  </option>
                ))}
              </select>
              {getError('ct_ref') && <p className="mt-1 text-xs text-red-600">{getError('ct_ref')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Przekładnik VT</label>
              <select
                value={formData.vt_ref}
                onChange={(e) => handleChange('vt_ref', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">— brak —</option>
                {vtOptions.map((vt) => (
                  <option key={vt.ref_id} value={vt.ref_id}>{vt.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Nastawy */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Nastawy zabezpieczenia</h3>
              <button
                onClick={addSetting}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Dodaj nastawę
              </button>
            </div>

            {formData.settings.map((setting, idx) => (
              <div key={idx} className="mb-4 p-3 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Nastawa {idx + 1}</span>
                  {formData.settings.length > 1 && (
                    <button
                      onClick={() => removeSetting(idx)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Usuń
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Funkcja</label>
                    <select
                      value={setting.function_type}
                      onChange={(e) => handleSettingChange(idx, 'function_type', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      {Object.entries(FUNCTION_TYPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Krzywa</label>
                    <select
                      value={setting.curve_type}
                      onChange={(e) => handleSettingChange(idx, 'curve_type', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="">— brak —</option>
                      {Object.entries(CURVE_TYPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Próg [A]</label>
                    <input
                      type="number"
                      value={setting.threshold_a}
                      onChange={(e) => handleSettingChange(idx, 'threshold_a', parseFloat(e.target.value) || 0)}
                      className={`w-full px-2 py-1.5 border rounded text-sm ${
                        getError(`setting_${idx}_threshold`) ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {getError(`setting_${idx}_threshold`) && (
                      <p className="mt-0.5 text-xs text-red-600">{getError(`setting_${idx}_threshold`)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Opóźnienie [s]</label>
                    <input
                      type="number"
                      value={setting.time_delay_s}
                      onChange={(e) => handleSettingChange(idx, 'time_delay_s', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Aktywne */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_enabled}
              onChange={(e) => handleChange('is_enabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="text-sm text-gray-700">Zabezpieczenie aktywne</label>
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
            {mode === 'create' ? 'Przypisz' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}
