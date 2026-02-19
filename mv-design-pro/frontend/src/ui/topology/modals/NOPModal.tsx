/**
 * NOPModal — dialog "Ustaw punkt normalnie otwarty (NOP)".
 *
 * Mapuje się na operację domenową:
 *   set_normal_open_point
 *
 * Umożliwia wybór elementu na pierścieniu, który zostanie
 * ustawiony jako punkt normalnie otwarty (NOP).
 * Walidacja inline + komunikaty PL.
 * Brak fizyki — wyłącznie formularz prezentacyjny.
 */

import { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NOPType = 'SWITCH' | 'DISCONNECTOR';

export interface NOPFormData {
  nop_element_ref: string;
  nop_type: NOPType;
  reason: string;
}

export interface NOPCandidate {
  id: string;
  label: string;
  elementType: string;
}

interface NOPModalProps {
  isOpen: boolean;
  ringLabel: string;
  candidates: NOPCandidate[];
  currentNopId: string | null;
  onSubmit: (data: NOPFormData) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface FieldError {
  field: string;
  message: string;
}

function validateForm(data: NOPFormData): FieldError[] {
  const errors: FieldError[] = [];

  if (!data.nop_element_ref) {
    errors.push({ field: 'nop_element_ref', message: 'Wybór elementu NOP jest wymagany' });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const NOP_TYPE_LABELS: Record<NOPType, string> = {
  SWITCH: 'Rozłącznik',
  DISCONNECTOR: 'Odłącznik',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NOPModal({
  isOpen,
  ringLabel,
  candidates,
  currentNopId,
  onSubmit,
  onCancel,
}: NOPModalProps) {
  const [formData, setFormData] = useState<NOPFormData>({
    nop_element_ref: '',
    nop_type: 'SWITCH',
    reason: '',
  });
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setFormData({
        nop_element_ref: '',
        nop_type: 'SWITCH',
        reason: '',
      });
      setErrors([]);
      setTouched(new Set());
    }
  }, [isOpen]);

  const handleChange = useCallback((field: keyof NOPFormData, value: unknown) => {
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
            Ustaw punkt normalnie otwarty (NOP)
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* === SEKCJA: Pierścień === */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Pierścień
            </h3>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pierścień docelowy
              </label>
              <input
                type="text"
                value={ringLabel}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100"
              />
            </div>

            {currentNopId && (
              <p className="text-xs text-gray-500 mb-3">
                Obecny punkt NOP: <span className="font-medium">{currentNopId}</span>
              </p>
            )}

            {/* Warning badge */}
            <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-300 px-3 py-2">
              <span className="mt-0.5 text-amber-600 text-sm font-bold">!</span>
              <p className="text-xs text-amber-800">
                Zmiana punktu NOP spowoduje przeliczenie topologii i wyników.
              </p>
            </div>
          </div>

          {/* === SEKCJA: Wybór elementu NOP === */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Wybór elementu NOP
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Element
              </label>
              <select
                value={formData.nop_element_ref}
                onChange={(e) => handleChange('nop_element_ref', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  getFieldError('nop_element_ref') ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">-- Wybierz element --</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.elementType})
                  </option>
                ))}
              </select>
              {getFieldError('nop_element_ref') && (
                <p className="mt-1 text-xs text-red-600">
                  {getFieldError('nop_element_ref')}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Wybierz element pierścienia, który zostanie ustawiony jako punkt normalnie otwarty.
              </p>
            </div>
          </div>

          {/* === SEKCJA: Typ urządzenia NOP === */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Typ urządzenia NOP
            </h3>

            <div className="space-y-2">
              {Object.entries(NOP_TYPE_LABELS).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="nop_type"
                    value={val}
                    checked={formData.nop_type === val}
                    onChange={(e) => handleChange('nop_type', e.target.value)}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* === SEKCJA: Uwagi === */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Uwagi
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Uzasadnienie / notatki
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-vertical"
                placeholder="opcjonalnie"
              />
            </div>
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
            Zastosuj
          </button>
        </div>
      </div>
    </div>
  );
}
