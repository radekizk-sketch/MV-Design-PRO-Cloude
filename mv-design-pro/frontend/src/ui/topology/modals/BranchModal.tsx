/**
 * BranchModal — edytor gałęzi (linia/kabel/łącznik).
 *
 * Tryby: create / edit.
 * Dynamiczne pola zależne od typu gałęzi.
 * Walidacja inline + komunikaty PL.
 */

import React, { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BranchType = 'line_overhead' | 'cable' | 'breaker' | 'disconnector' | 'switch' | 'bus_coupler' | 'fuse';

export interface BranchFormData {
  ref_id: string;
  name: string;
  type: BranchType;
  from_bus_ref: string;
  to_bus_ref: string;
  status: 'closed' | 'open';
  // Line/Cable specific
  length_km: number;
  r_ohm_per_km: number;
  x_ohm_per_km: number;
  b_siemens_per_km: number;
  insulation: 'XLPE' | 'PVC' | 'PAPER' | '';
  catalog_ref: string;
}

interface BranchModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<BranchFormData>;
  busOptions: Array<{ ref_id: string; name: string; voltage_kv: number }>;
  onSubmit: (data: BranchFormData) => void;
  onCancel: () => void;
}

interface FieldError {
  field: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateForm(data: BranchFormData, busOptions: Array<{ ref_id: string }>): FieldError[] {
  const errors: FieldError[] = [];
  const busRefs = new Set(busOptions.map((b) => b.ref_id));

  if (!data.ref_id.trim()) {
    errors.push({ field: 'ref_id', message: 'Identyfikator jest wymagany' });
  }
  if (!data.name.trim()) {
    errors.push({ field: 'name', message: 'Nazwa jest wymagana' });
  }
  if (!data.from_bus_ref) {
    errors.push({ field: 'from_bus_ref', message: 'Szyna początkowa jest wymagana' });
  } else if (!busRefs.has(data.from_bus_ref)) {
    errors.push({ field: 'from_bus_ref', message: 'Szyna nie istnieje' });
  }
  if (!data.to_bus_ref) {
    errors.push({ field: 'to_bus_ref', message: 'Szyna końcowa jest wymagana' });
  } else if (!busRefs.has(data.to_bus_ref)) {
    errors.push({ field: 'to_bus_ref', message: 'Szyna nie istnieje' });
  }
  if (data.from_bus_ref && data.to_bus_ref && data.from_bus_ref === data.to_bus_ref) {
    errors.push({ field: 'to_bus_ref', message: 'Szyna początkowa i końcowa nie mogą być identyczne' });
  }

  const isLineCable = data.type === 'line_overhead' || data.type === 'cable';
  if (isLineCable) {
    if (data.length_km <= 0) {
      errors.push({ field: 'length_km', message: 'Długość musi być > 0 km' });
    }
    if (data.r_ohm_per_km < 0) {
      errors.push({ field: 'r_ohm_per_km', message: 'Rezystancja nie może być ujemna' });
    }
    if (data.x_ohm_per_km < 0) {
      errors.push({ field: 'x_ohm_per_km', message: 'Reaktancja nie może być ujemna' });
    }
  }

  return errors;
}

const DEFAULT_DATA: BranchFormData = {
  ref_id: '',
  name: '',
  type: 'line_overhead',
  from_bus_ref: '',
  to_bus_ref: '',
  status: 'closed',
  length_km: 1.0,
  r_ohm_per_km: 0.3,
  x_ohm_per_km: 0.35,
  b_siemens_per_km: 0,
  insulation: '',
  catalog_ref: '',
};

const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
  line_overhead: 'Linia napowietrzna',
  cable: 'Kabel',
  breaker: 'Wyłącznik',
  disconnector: 'Rozłącznik',
  switch: 'Łącznik',
  bus_coupler: 'Sprzęgło szyn',
  fuse: 'Bezpiecznik',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BranchModal({
  isOpen,
  mode,
  initialData,
  busOptions,
  onSubmit,
  onCancel,
}: BranchModalProps) {
  const [formData, setFormData] = useState<BranchFormData>({ ...DEFAULT_DATA, ...initialData });
  const [errors, setErrors] = useState<FieldError[]>([]);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...DEFAULT_DATA, ...initialData });
      setErrors([]);
    }
  }, [isOpen, initialData]);

  const handleChange = useCallback((field: keyof BranchFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const validationErrors = validateForm(formData, busOptions);
    setErrors(validationErrors);
    if (validationErrors.length === 0) {
      onSubmit(formData);
    }
  }, [formData, busOptions, onSubmit]);

  const getError = (field: string): string | undefined =>
    errors.find((e) => e.field === field)?.message;

  const isLineCable = formData.type === 'line_overhead' || formData.type === 'cable';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Nowa gałąź' : 'Edycja gałęzi'}
          </h2>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Typ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              disabled={mode === 'edit'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {Object.entries(BRANCH_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* ref_id */}
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

            {/* Nazwa */}
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

          {/* Szyny */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Szyna początkowa</label>
              <select
                value={formData.from_bus_ref}
                onChange={(e) => handleChange('from_bus_ref', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  getError('from_bus_ref') ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">— wybierz —</option>
                {busOptions.map((b) => (
                  <option key={b.ref_id} value={b.ref_id}>
                    {b.name} ({b.voltage_kv} kV)
                  </option>
                ))}
              </select>
              {getError('from_bus_ref') && <p className="mt-1 text-xs text-red-600">{getError('from_bus_ref')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Szyna końcowa</label>
              <select
                value={formData.to_bus_ref}
                onChange={(e) => handleChange('to_bus_ref', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  getError('to_bus_ref') ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">— wybierz —</option>
                {busOptions.map((b) => (
                  <option key={b.ref_id} value={b.ref_id}>
                    {b.name} ({b.voltage_kv} kV)
                  </option>
                ))}
              </select>
              {getError('to_bus_ref') && <p className="mt-1 text-xs text-red-600">{getError('to_bus_ref')}</p>}
            </div>
          </div>

          {/* Stan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stan</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="closed">Zamknięty</option>
              <option value="open">Otwarty</option>
            </select>
          </div>

          {/* Parametry linii/kabla */}
          {isLineCable && (
            <>
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Parametry elektryczne</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Długość [km]
                    </label>
                    <input
                      type="number"
                      value={formData.length_km}
                      onChange={(e) => handleChange('length_km', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                      className={`w-full px-3 py-2 border rounded-md text-sm ${
                        getError('length_km') ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {getError('length_km') && <p className="mt-1 text-xs text-red-600">{getError('length_km')}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      R&apos; [Ω/km]
                    </label>
                    <input
                      type="number"
                      value={formData.r_ohm_per_km}
                      onChange={(e) => handleChange('r_ohm_per_km', parseFloat(e.target.value) || 0)}
                      step="0.001"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      X&apos; [Ω/km]
                    </label>
                    <input
                      type="number"
                      value={formData.x_ohm_per_km}
                      onChange={(e) => handleChange('x_ohm_per_km', parseFloat(e.target.value) || 0)}
                      step="0.001"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      B&apos; [S/km]
                    </label>
                    <input
                      type="number"
                      value={formData.b_siemens_per_km}
                      onChange={(e) => handleChange('b_siemens_per_km', parseFloat(e.target.value) || 0)}
                      step="0.000001"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>

              {formData.type === 'cable' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Izolacja</label>
                  <select
                    value={formData.insulation}
                    onChange={(e) => handleChange('insulation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">— nie wybrano —</option>
                    <option value="XLPE">XLPE</option>
                    <option value="PVC">PVC</option>
                    <option value="PAPER">Papier</option>
                  </select>
                </div>
              )}
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
            {mode === 'create' ? 'Utwórz' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}
