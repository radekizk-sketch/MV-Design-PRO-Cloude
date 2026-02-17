/**
 * CatalogPicker — komponent wyboru elementu z katalogu typów.
 *
 * Wymagany w trybie STANDARDOWYM.
 * Wyszukiwanie + filtr + wybór catalog_ref.
 * BINDING: PL labels, no codenames.
 */

import { useCallback, useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogEntry {
  id: string;
  name: string;
  manufacturer?: string;
  summary?: string;
}

interface CatalogPickerProps {
  label: string;
  entries: CatalogEntry[];
  selectedId: string;
  onChange: (id: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CatalogPicker({
  label,
  entries,
  selectedId,
  onChange,
  required = false,
  error,
  placeholder = 'Wyszukaj typ w katalogu\u2026',
  disabled = false,
}: CatalogPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return entries;
    const lower = searchTerm.toLowerCase();
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(lower) ||
        (e.manufacturer && e.manufacturer.toLowerCase().includes(lower)),
    );
  }, [entries, searchTerm]);

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  );

  const handleSelect = useCallback(
    (id: string) => {
      onChange(id);
      setIsDropdownOpen(false);
      setSearchTerm('');
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange('');
    setSearchTerm('');
  }, [onChange]);

  return (
    <div data-testid="catalog-picker">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {selectedEntry ? (
        <div className="flex items-center gap-2 px-3 py-2 border border-blue-300 bg-blue-50 rounded-md text-sm">
          <div className="flex-1">
            <span className="font-medium">{selectedEntry.name}</span>
            {selectedEntry.manufacturer && (
              <span className="text-gray-500 ml-1">({selectedEntry.manufacturer})</span>
            )}
          </div>
          {!disabled && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 text-xs"
              title="Usuń wybór"
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md text-sm ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={placeholder}
            data-testid="catalog-picker-search"
          />
          {isDropdownOpen && filteredEntries.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleSelect(entry.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                  data-testid={`catalog-entry-${entry.id}`}
                >
                  <span className="font-medium">{entry.name}</span>
                  {entry.manufacturer && (
                    <span className="text-gray-500 ml-1">({entry.manufacturer})</span>
                  )}
                  {entry.summary && (
                    <span className="block text-xs text-gray-400">{entry.summary}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {isDropdownOpen && filteredEntries.length === 0 && searchTerm && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-sm text-gray-500">
              Brak wyników dla &ldquo;{searchTerm}&rdquo;
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
