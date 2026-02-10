/**
 * TransformerStationModal — edytor stacji transformatorowej SN/nn.
 *
 * Parametry transformatora, węzły stron HV/LV, grupa wektorowa, zaczepy.
 * BINDING: PL labels, no codenames.
 */

import React, { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransformerStationFormData {
  ref_id: string;
  name: string;
  hv_bus_ref: string;
  lv_bus_ref: string;
  sn_mva: number;
  uhv_kv: number;
  ulv_kv: number;
  uk_percent: number;
  pk_kw: number;
  p0_kw: number;
  i0_percent: number;
  vector_group: string;
  tap_position: number;
  tap_min: number;
  tap_max: number;
  tap_step_percent: number;
}

interface TransformerStationModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<TransformerStationFormData>;
  busOptions: Array<{ ref_id: string; name: string; voltage_kv: number }>;
  onSubmit: (data: TransformerStationFormData) => void;
  onCancel: () => void;
}

interface FieldError {
  field: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Labels & Defaults
// ---------------------------------------------------------------------------

const VECTOR_GROUPS = [
  'Dyn11', 'Dyn5', 'Dyn1', 'Yyn0', 'Yzn5', 'Dd0', 'Dy11', 'Dy5',
];

const DEFAULT_DATA: TransformerStationFormData = {
  ref_id: '',
  name: '',
  hv_bus_ref: '',
  lv_bus_ref: '',
  sn_mva: 0.63,
  uhv_kv: 15,
  ulv_kv: 0.4,
  uk_percent: 6.0,
  pk_kw: 7.0,
  p0_kw: 1.2,
  i0_percent: 2.5,
  vector_group: 'Dyn11',
  tap_position: 0,
  tap_min: -2,
  tap_max: 2,
  tap_step_percent: 2.5,
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateForm(data: TransformerStationFormData): FieldError[] {
  const errors: FieldError[] = [];

  if (!data.ref_id.trim()) {
    errors.push({ field: 'ref_id', message: 'Identyfikator jest wymagany' });
  }
  if (!data.name.trim()) {
    errors.push({ field: 'name', message: 'Nazwa jest wymagana' });
  }
  if (!data.hv_bus_ref) {
    errors.push({ field: 'hv_bus_ref', message: 'Szyna strony GN jest wymagana' });
  }
  if (!data.lv_bus_ref) {
    errors.push({ field: 'lv_bus_ref', message: 'Szyna strony DN jest wymagana' });
  }
  if (data.hv_bus_ref && data.lv_bus_ref && data.hv_bus_ref === data.lv_bus_ref) {
    errors.push({ field: 'lv_bus_ref', message: 'Szyny GN i DN muszą być różne' });
  }
  if (data.sn_mva <= 0) {
    errors.push({ field: 'sn_mva', message: 'Moc znamionowa musi być > 0' });
  }
  if (data.uhv_kv <= 0) {
    errors.push({ field: 'uhv_kv', message: 'Napięcie GN musi być > 0' });
  }
  if (data.ulv_kv <= 0) {
    errors.push({ field: 'ulv_kv', message: 'Napięcie DN musi być > 0' });
  }
  if (data.uk_percent <= 0 || data.uk_percent > 100) {
    errors.push({ field: 'uk_percent', message: 'Napięcie zwarcia musi być w zakresie (0, 100]%' });
  }
  if (data.pk_kw < 0) {
    errors.push({ field: 'pk_kw', message: 'Straty obciążeniowe nie mogą być ujemne' });
  }
  if (data.tap_min > data.tap_max) {
    errors.push({ field: 'tap_min', message: 'Zaczep min musi być ≤ zaczep max' });
  }
  if (data.tap_position < data.tap_min || data.tap_position > data.tap_max) {
    errors.push({ field: 'tap_position', message: `Pozycja zaczepu musi być w zakresie [${data.tap_min}, ${data.tap_max}]` });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransformerStationModal({
  isOpen,
  mode,
  initialData,
  busOptions,
  onSubmit,
  onCancel,
}: TransformerStationModalProps) {
  const [formData, setFormData] = useState<TransformerStationFormData>({ ...DEFAULT_DATA, ...initialData });
  const [errors, setErrors] = useState<FieldError[]>([]);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...DEFAULT_DATA, ...initialData });
      setErrors([]);
    }
  }, [isOpen, initialData]);

  const handleChange = useCallback((field: keyof TransformerStationFormData, value: unknown) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Nowa stacja transformatorowa' : 'Edycja stacji transformatorowej'}
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

          {/* Szyny HV / LV */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Szyna strony górnej (GN)
              </label>
              <select
                value={formData.hv_bus_ref}
                onChange={(e) => handleChange('hv_bus_ref', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  getError('hv_bus_ref') ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">— wybierz —</option>
                {busOptions.map((b) => (
                  <option key={b.ref_id} value={b.ref_id}>
                    {b.name} ({b.voltage_kv} kV)
                  </option>
                ))}
              </select>
              {getError('hv_bus_ref') && <p className="mt-1 text-xs text-red-600">{getError('hv_bus_ref')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Szyna strony dolnej (DN)
              </label>
              <select
                value={formData.lv_bus_ref}
                onChange={(e) => handleChange('lv_bus_ref', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  getError('lv_bus_ref') ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">— wybierz —</option>
                {busOptions.map((b) => (
                  <option key={b.ref_id} value={b.ref_id}>
                    {b.name} ({b.voltage_kv} kV)
                  </option>
                ))}
              </select>
              {getError('lv_bus_ref') && <p className="mt-1 text-xs text-red-600">{getError('lv_bus_ref')}</p>}
            </div>
          </div>

          {/* Parametry znamionowe */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Parametry znamionowe</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Moc znamionowa [MVA]</label>
                <input
                  type="number"
                  value={formData.sn_mva}
                  onChange={(e) => handleChange('sn_mva', parseFloat(e.target.value) || 0)}
                  step="0.01"
                  className={`w-full px-2 py-1.5 border rounded text-sm ${
                    getError('sn_mva') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getError('sn_mva') && (
                  <p className="mt-0.5 text-xs text-red-600">{getError('sn_mva')}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Napięcie GN [kV]</label>
                <input
                  type="number"
                  value={formData.uhv_kv}
                  onChange={(e) => handleChange('uhv_kv', parseFloat(e.target.value) || 0)}
                  step="0.1"
                  className={`w-full px-2 py-1.5 border rounded text-sm ${
                    getError('uhv_kv') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getError('uhv_kv') && (
                  <p className="mt-0.5 text-xs text-red-600">{getError('uhv_kv')}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Napięcie DN [kV]</label>
                <input
                  type="number"
                  value={formData.ulv_kv}
                  onChange={(e) => handleChange('ulv_kv', parseFloat(e.target.value) || 0)}
                  step="0.01"
                  className={`w-full px-2 py-1.5 border rounded text-sm ${
                    getError('ulv_kv') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getError('ulv_kv') && (
                  <p className="mt-0.5 text-xs text-red-600">{getError('ulv_kv')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Parametry zwarciowe i straty */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">uk [%]</label>
              <input
                type="number"
                value={formData.uk_percent}
                onChange={(e) => handleChange('uk_percent', parseFloat(e.target.value) || 0)}
                step="0.1"
                className={`w-full px-2 py-1.5 border rounded text-sm ${
                  getError('uk_percent') ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {getError('uk_percent') && (
                <p className="mt-0.5 text-xs text-red-600">{getError('uk_percent')}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Pk [kW]</label>
              <input
                type="number"
                value={formData.pk_kw}
                onChange={(e) => handleChange('pk_kw', parseFloat(e.target.value) || 0)}
                step="0.1"
                className={`w-full px-2 py-1.5 border rounded text-sm ${
                  getError('pk_kw') ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {getError('pk_kw') && (
                <p className="mt-0.5 text-xs text-red-600">{getError('pk_kw')}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">P0 [kW]</label>
              <input
                type="number"
                value={formData.p0_kw}
                onChange={(e) => handleChange('p0_kw', parseFloat(e.target.value) || 0)}
                step="0.01"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">I0 [%]</label>
              <input
                type="number"
                value={formData.i0_percent}
                onChange={(e) => handleChange('i0_percent', parseFloat(e.target.value) || 0)}
                step="0.1"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          {/* Grupa wektorowa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grupa wektorowa</label>
            <select
              value={formData.vector_group}
              onChange={(e) => handleChange('vector_group', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {VECTOR_GROUPS.map((vg) => (
                <option key={vg} value={vg}>{vg}</option>
              ))}
            </select>
          </div>

          {/* Zaczepy */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Regulacja zaczepowa</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Pozycja zaczepu</label>
                <input
                  type="number"
                  value={formData.tap_position}
                  onChange={(e) => handleChange('tap_position', parseInt(e.target.value, 10) || 0)}
                  className={`w-full px-2 py-1.5 border rounded text-sm ${
                    getError('tap_position') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getError('tap_position') && (
                  <p className="mt-0.5 text-xs text-red-600">{getError('tap_position')}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Zaczep min</label>
                <input
                  type="number"
                  value={formData.tap_min}
                  onChange={(e) => handleChange('tap_min', parseInt(e.target.value, 10) || 0)}
                  className={`w-full px-2 py-1.5 border rounded text-sm ${
                    getError('tap_min') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getError('tap_min') && (
                  <p className="mt-0.5 text-xs text-red-600">{getError('tap_min')}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Zaczep max</label>
                <input
                  type="number"
                  value={formData.tap_max}
                  onChange={(e) => handleChange('tap_max', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Krok zaczepu [%]</label>
                <input
                  type="number"
                  value={formData.tap_step_percent}
                  onChange={(e) => handleChange('tap_step_percent', parseFloat(e.target.value) || 0)}
                  step="0.1"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
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
