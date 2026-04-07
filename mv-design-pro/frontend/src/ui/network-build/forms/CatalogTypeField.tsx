/**
 * CatalogTypeField — Inline catalog-type picker for operation forms.
 *
 * Renders a compact selector that fetches types for a given category and
 * lets the user pick one.  Uses a native <select> (no modal) to keep the
 * form surface minimal.
 *
 * BINDING: 100% PL labels. No physics. Catalog ref required.
 */

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { fetchTypesByCategory, type TypeCategory } from '../../catalog';

interface CatalogTypeEntry {
  id: string;
  name: string;
}

export interface CatalogTypeFieldProps {
  testId?: string;
  label: string;
  category: TypeCategory;
  selectedTypeId: string | null;
  selectedTypeName: string | null;
  helperText?: string;
  error?: string | null;
  onSelect: (typeId: string, typeName: string) => void;
}

export function CatalogTypeField({
  testId,
  label,
  category,
  selectedTypeId,
  selectedTypeName: _selectedTypeName,
  helperText,
  error,
  onSelect,
}: CatalogTypeFieldProps) {
  const [types, setTypes] = useState<CatalogTypeEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTypesByCategory(category)
      .then((result) => {
        if (!cancelled) {
          setTypes(result.map((t) => ({ id: t.id, name: t.name })));
        }
      })
      .catch(() => {
        if (!cancelled) setTypes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const typeId = event.target.value;
    const entry = types.find((t) => t.id === typeId);
    if (typeId && entry) {
      onSelect(typeId, entry.name);
    }
  };

  return (
    <div data-testid={testId} className="space-y-1">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-chrome-500">
          {label}
        </span>
        <select
          value={selectedTypeId ?? ''}
          onChange={handleChange}
          disabled={loading}
          className={clsx(
            'mt-2 w-full rounded border px-3 py-2 text-sm',
            error ? 'border-red-400 bg-red-50' : 'border-chrome-300',
            loading && 'opacity-60',
          )}
        >
          <option value="">
            {loading ? 'Ładowanie katalogu…' : '— wybierz z katalogu —'}
          </option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      {helperText && !error && (
        <p className="text-xs text-chrome-400">{helperText}</p>
      )}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
