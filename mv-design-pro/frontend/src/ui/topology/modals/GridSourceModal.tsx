/**
 * GridSourceModal - dialog "Dodaj / Edytuj zrodlo GPZ".
 *
 * Mapuje sie na operacje domenowa: add_grid_source_sn.
 * Tryby: create / edit.
 * Walidacja inline + komunikaty PL.
 * Parametry zwarciowe pochodza z wybranego katalogu ZRODLO_SN.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchSourceSystemTypes,
  type SourceSystemCatalogType,
} from '../../catalog';

export interface GridSourceFormData {
  source_name: string;
  sn_voltage_kv: number | null;
  sk3_mva: number | null;
  rx_ratio: number | null;
  notes: string;
  catalog_ref: string | null;
}

interface GridSourceModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<GridSourceFormData>;
  onSubmit: (data: GridSourceFormData) => void;
  onCancel: () => void;
}

interface FieldError {
  field: string;
  message: string;
}

function validateForm(data: GridSourceFormData): FieldError[] {
  const errors: FieldError[] = [];

  if (!data.source_name.trim()) {
    errors.push({ field: 'source_name', message: 'Nazwa zrodla jest wymagana' });
  }

  if (!data.catalog_ref?.trim()) {
    errors.push({ field: 'catalog_ref', message: 'Pozycja katalogowa jest wymagana' });
  }

  if (data.sn_voltage_kv === null || data.sn_voltage_kv <= 0) {
    errors.push({ field: 'sn_voltage_kv', message: 'Napiecie musi pochodzic z wybranego katalogu.' });
  }

  if (data.sk3_mva === null || data.sk3_mva <= 0) {
    errors.push({ field: 'sk3_mva', message: 'Moc zwarciowa musi pochodzic z wybranego katalogu.' });
  }

  if (data.rx_ratio === null || data.rx_ratio <= 0) {
    errors.push({ field: 'rx_ratio', message: 'Stosunek R/X musi pochodzic z wybranego katalogu.' });
  }

  return errors;
}

const DEFAULT_DATA: GridSourceFormData = {
  source_name: '',
  sn_voltage_kv: null,
  sk3_mva: null,
  rx_ratio: null,
  notes: '',
  catalog_ref: null,
};

function mergeInitialData(initialData?: Partial<GridSourceFormData>): GridSourceFormData {
  return {
    ...DEFAULT_DATA,
    ...initialData,
  };
}

function catalogToFormData(
  catalogItem: SourceSystemCatalogType,
  previous: GridSourceFormData,
): GridSourceFormData {
  return {
    ...previous,
    catalog_ref: catalogItem.id,
    sn_voltage_kv: catalogItem.voltage_rating_kv,
    sk3_mva: catalogItem.sk3_mva,
    rx_ratio: catalogItem.rx_ratio ?? null,
  };
}

export function GridSourceModal({
  isOpen,
  mode,
  initialData,
  onSubmit,
  onCancel,
}: GridSourceModalProps) {
  const [formData, setFormData] = useState<GridSourceFormData>(mergeInitialData(initialData));
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [catalogItems, setCatalogItems] = useState<SourceSystemCatalogType[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData(mergeInitialData(initialData));
    setErrors([]);
    setTouched(new Set());
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCatalogLoading(true);
    setCatalogError(null);

    fetchSourceSystemTypes()
      .then((items) => {
        setCatalogItems(items);
        setCatalogLoading(false);
      })
      .catch((error: unknown) => {
        setCatalogError(error instanceof Error ? error.message : 'Nie udalo sie pobrac katalogu zasilania systemowego.');
        setCatalogLoading(false);
      });
  }, [isOpen]);

  const selectedCatalog = useMemo(
    () => catalogItems.find((item) => item.id === formData.catalog_ref) ?? null,
    [catalogItems, formData.catalog_ref],
  );

  useEffect(() => {
    if (!selectedCatalog) {
      return;
    }

    setFormData((previous) => {
      if (
        previous.catalog_ref === selectedCatalog.id
        && previous.sn_voltage_kv === selectedCatalog.voltage_rating_kv
        && previous.sk3_mva === selectedCatalog.sk3_mva
        && previous.rx_ratio === (selectedCatalog.rx_ratio ?? null)
      ) {
        return previous;
      }

      return catalogToFormData(selectedCatalog, previous);
    });
  }, [selectedCatalog]);

  const handleChange = useCallback((field: keyof GridSourceFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value as never }));
    setTouched((prev) => new Set(prev).add(field));
  }, []);

  const handleCatalogChange = useCallback((catalogRef: string) => {
    const selected = catalogItems.find((item) => item.id === catalogRef) ?? null;
    setTouched((prev) => {
      const next = new Set(prev);
      next.add('catalog_ref');
      next.add('sn_voltage_kv');
      next.add('sk3_mva');
      next.add('rx_ratio');
      return next;
    });

    if (!selected) {
      setFormData((prev) => ({
        ...prev,
        catalog_ref: null,
        sn_voltage_kv: null,
        sk3_mva: null,
        rx_ratio: null,
      }));
      return;
    }

    setFormData((prev) => catalogToFormData(selected, prev));
  }, [catalogItems]);

  const handleSubmit = useCallback(() => {
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    if (validationErrors.length === 0) {
      onSubmit(formData);
    }
  }, [formData, onSubmit]);

  const getFieldError = (field: string): string | undefined => {
    if (!touched.has(field) && errors.length === 0) return undefined;
    return errors.find((entry) => entry.field === field)?.message;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Dodaj zrodlo GPZ' : 'Edycja zrodla GPZ'}
          </h2>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Dane wymagane
            </h3>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nazwa zrodla
              </label>
              <input
                type="text"
                value={formData.source_name}
                onChange={(e) => handleChange('source_name', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  getFieldError('source_name') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="np. GPZ Centrum"
              />
              {getFieldError('source_name') && (
                <p className="mt-1 text-xs text-red-600">{getFieldError('source_name')}</p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Katalog
            </h3>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Pozycja katalogowa
              </label>
              <select
                value={formData.catalog_ref ?? ''}
                onChange={(e) => handleCatalogChange(e.target.value)}
                disabled={catalogLoading}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  getFieldError('catalog_ref') ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Wybierz zasilanie systemowe SN</option>
                {catalogItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.voltage_rating_kv} kV, Sk3 {item.sk3_mva} MVA)
                  </option>
                ))}
              </select>
              {catalogLoading && (
                <p className="mt-1 text-xs text-gray-500">Ladowanie katalogu zasilania systemowego...</p>
              )}
              {catalogError && (
                <p className="mt-1 text-xs text-red-600">{catalogError}</p>
              )}
              {getFieldError('catalog_ref') && (
                <p className="mt-1 text-xs text-red-600">{getFieldError('catalog_ref')}</p>
              )}
            </div>

            {selectedCatalog && (
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <div>
                  <span className="font-medium text-slate-800">Wybrane zrodlo:</span> {selectedCatalog.name}
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-600">{selectedCatalog.id}</div>
                {selectedCatalog.operator_name ? (
                  <div className="mt-1">Operator: {selectedCatalog.operator_name}</div>
                ) : null}
                {selectedCatalog.short_circuit_model ? (
                  <div className="mt-1">Model zwarciowy: {selectedCatalog.short_circuit_model}</div>
                ) : null}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Parametry sieci
            </h3>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Napiecie SN [kV]
              </label>
              <input
                type="number"
                value={formData.sn_voltage_kv ?? ''}
                readOnly
                disabled
                className={`w-full rounded-md border px-3 py-2 text-sm bg-slate-50 ${
                  getFieldError('sn_voltage_kv') ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {getFieldError('sn_voltage_kv') && (
                <p className="mt-1 text-xs text-red-600">{getFieldError('sn_voltage_kv')}</p>
              )}
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Moc zwarciowa Sk3 [MVA]
              </label>
              <input
                type="number"
                value={formData.sk3_mva ?? ''}
                readOnly
                disabled
                className={`w-full rounded-md border px-3 py-2 text-sm bg-slate-50 ${
                  getFieldError('sk3_mva') ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {getFieldError('sk3_mva') && (
                <p className="mt-1 text-xs text-red-600">{getFieldError('sk3_mva')}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Stosunek R/X [-]
              </label>
              <input
                type="number"
                value={formData.rx_ratio ?? ''}
                readOnly
                disabled
                className={`w-full rounded-md border px-3 py-2 text-sm bg-slate-50 ${
                  getFieldError('rx_ratio') ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {getFieldError('rx_ratio') && (
                <p className="mt-1 text-xs text-red-600">{getFieldError('rx_ratio')}</p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Uwagi
            </h3>

            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Dodatkowe informacje..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Anuluj
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Zatwierdz
          </button>
        </div>
      </div>
    </div>
  );
}
