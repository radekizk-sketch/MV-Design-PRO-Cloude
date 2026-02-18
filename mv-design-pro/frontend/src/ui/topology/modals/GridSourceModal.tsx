/**
 * GridSourceModal — dialog "Dodaj / Edytuj źródło GPZ".
 *
 * Mapuje się na operację domenową: add_grid_source_sn.
 * Tryby: create / edit.
 * Walidacja inline + komunikaty PL.
 * Brak fizyki — wyłącznie formularz prezentacyjny.
 */

import { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GridSourceFormData {
  source_name: string;
  sn_voltage_kv: number;
  sk3_mva: number;
  rx_ratio: number;
  notes: string;
  catalog_binding: string | null;
}

interface GridSourceModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<GridSourceFormData>;
  onSubmit: (data: GridSourceFormData) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface FieldError {
  field: string;
  message: string;
}

function validateForm(data: GridSourceFormData): FieldError[] {
  const errors: FieldError[] = [];

  if (!data.source_name.trim()) {
    errors.push({ field: 'source_name', message: 'Nazwa źródła jest wymagana' });
  }

  if (data.sn_voltage_kv <= 0) {
    errors.push({ field: 'sn_voltage_kv', message: 'Napięcie musi być > 0 kV' });
  }

  if (data.sk3_mva <= 0) {
    errors.push({ field: 'sk3_mva', message: 'Moc zwarciowa musi być > 0 MVA' });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_DATA: GridSourceFormData = {
  source_name: '',
  sn_voltage_kv: 15.0,
  sk3_mva: 0,
  rx_ratio: 0.1,
  notes: '',
  catalog_binding: null,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GridSourceModal({
  isOpen,
  mode,
  initialData,
  onSubmit,
  onCancel,
}: GridSourceModalProps) {
  const [formData, setFormData] = useState<GridSourceFormData>({ ...DEFAULT_DATA, ...initialData });
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...DEFAULT_DATA, ...initialData });
      setErrors([]);
      setTouched(new Set());
    }
  }, [isOpen, initialData]);

  const handleChange = useCallback((field: keyof GridSourceFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => new Set(prev).add(field));
  }, []);

  const handleSubmit = useCallback(() => {
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    if (validationErrors.length === 0) {
      onSubmit(formData);
    }
  }, [formData, onSubmit]);

  const getFieldError = (field: string): string | undefined => {
    if (!touched.has(field) && errors.length === 0) return undefined;
    return errors.find((e) => e.field === field)?.message;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Dodaj źródło GPZ' : 'Edycja źródła GPZ'}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* === SEKCJA: Dane wymagane === */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Dane wymagane
            </h3>

            {/* Nazwa źródła */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nazwa źródła
              </label>
              <input
                type="text"
                value={formData.source_name}
                onChange={(e) => handleChange('source_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  getFieldError('source_name') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="np. GPZ Centrum"
              />
              {getFieldError('source_name') && (
                <p className="mt-1 text-xs text-red-600">{getFieldError('source_name')}</p>
              )}
            </div>

            {/* Napięcie SN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Napięcie SN [kV]
              </label>
              <input
                type="number"
                value={formData.sn_voltage_kv}
                onChange={(e) => handleChange('sn_voltage_kv', parseFloat(e.target.value) || 0)}
                step="0.1"
                min="0"
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  getFieldError('sn_voltage_kv') ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {getFieldError('sn_voltage_kv') && (
                <p className="mt-1 text-xs text-red-600">{getFieldError('sn_voltage_kv')}</p>
              )}
            </div>
          </div>

          {/* === SEKCJA: Parametry sieci === */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Parametry sieci
            </h3>

            {/* Moc zwarciowa */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Moc zwarciowa Sk&#x2083; [MVA]
              </label>
              <input
                type="number"
                value={formData.sk3_mva}
                onChange={(e) => handleChange('sk3_mva', parseFloat(e.target.value) || 0)}
                step="0.1"
                min="0"
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  getFieldError('sk3_mva') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="np. 250"
              />
              {getFieldError('sk3_mva') && (
                <p className="mt-1 text-xs text-red-600">{getFieldError('sk3_mva')}</p>
              )}
            </div>

            {/* Stosunek R/X */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stosunek R/X [-]
              </label>
              <input
                type="number"
                value={formData.rx_ratio}
                onChange={(e) => handleChange('rx_ratio', parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="0.1"
              />
              <p className="mt-1 text-xs text-gray-500">
                Wartość domyślna: 0.1 (typowa dla sieci WN/SN)
              </p>
            </div>
          </div>

          {/* === SEKCJA: Katalog (opcjonalnie) === */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Katalog
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pozycja katalogowa
              </label>
              <input
                type="text"
                value={formData.catalog_binding ?? ''}
                onChange={(e) =>
                  handleChange('catalog_binding', e.target.value.trim() || null)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="opcjonalnie"
              />
            </div>
          </div>

          {/* === SEKCJA: Uwagi === */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Uwagi
            </h3>

            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
              placeholder="Dodatkowe informacje..."
            />
          </div>
        </div>

        {/* Footer */}
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
            Zatwierdź
          </button>
        </div>
      </div>
    </div>
  );
}
