/**
 * Type Picker Component (PowerFactory-style)
 *
 * CANONICAL ALIGNMENT:
 * - P8.2: UI Assign/Clear Type
 * - Deterministic type list ordering (manufacturer → name → id)
 * - Search by name and id
 * - Category filtering
 *
 * All labels in Polish per wizard_screens.md.
 */

import { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  fetchTypesByCategory,
  type LineType,
  type CableType,
  type TransformerType,
  type SwitchEquipmentType,
  type TypeCategory,
} from './';

type CatalogTypeUnion = LineType | CableType | TransformerType | SwitchEquipmentType;

interface TypePickerProps {
  /** Category to display */
  category: TypeCategory;
  /** Current selected type ID (for highlighting) */
  currentTypeId?: string | null;
  /** Callback when type is selected */
  onSelectType: (typeId: string, typeName: string) => void;
  /** Callback when picker is closed */
  onClose: () => void;
  /** Is picker open? */
  isOpen: boolean;
}

/**
 * Type Picker Modal.
 *
 * Displays catalog types in deterministic order with search and selection.
 */
export function TypePicker({
  category,
  currentTypeId,
  onSelectType,
  onClose,
  isOpen,
}: TypePickerProps) {
  const [types, setTypes] = useState<CatalogTypeUnion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch types when picker opens
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    fetchTypesByCategory(category)
      .then((fetchedTypes) => {
        setTypes(fetchedTypes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? 'Błąd pobierania typów');
        setLoading(false);
      });
  }, [isOpen, category]);

  // Filter types by search query (name or id)
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return types;

    const query = searchQuery.toLowerCase();
    return types.filter(
      (type) =>
        type.name.toLowerCase().includes(query) || type.id.toLowerCase().includes(query)
    );
  }, [types, searchQuery]);

  // Get category label in Polish
  const getCategoryLabel = () => {
    switch (category) {
      case 'LINE':
        return 'Linie napowietrzne';
      case 'CABLE':
        return 'Kable';
      case 'TRANSFORMER':
        return 'Transformatory';
      case 'SWITCH_EQUIPMENT':
        return 'Aparatura łączeniowa';
      default:
        return category;
    }
  };

  // Handle type selection
  const handleSelect = (type: CatalogTypeUnion) => {
    onSelectType(type.id, type.name);
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              Wybierz typ: {getCategoryLabel()}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Zamknij"
            >
              ×
            </button>
          </div>

          {/* Search bar */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Szukaj po nazwie lub ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="text-center py-8 text-gray-500">Ładowanie typów...</div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600">
              <p className="font-semibold">Błąd</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && filteredTypes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'Brak wyników dla zapytania.' : 'Brak typów w katalogu.'}
            </div>
          )}

          {!loading && !error && filteredTypes.length > 0 && (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nazwa
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producent
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parametry
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTypes.map((type) => {
                  const isSelected = type.id === currentTypeId;
                  return (
                    <tr
                      key={type.id}
                      onClick={() => handleSelect(type)}
                      className={clsx(
                        'cursor-pointer hover:bg-blue-50 transition-colors',
                        isSelected && 'bg-blue-100'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{type.name}</div>
                        <div className="text-xs text-gray-500">{type.id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {type.manufacturer ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {renderTypeParams(type, category)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Render type-specific parameters for display.
 */
function renderTypeParams(type: CatalogTypeUnion, category: TypeCategory): string {
  switch (category) {
    case 'LINE':
    case 'CABLE': {
      const t = type as LineType | CableType;
      return `R=${t.r_ohm_per_km.toFixed(3)} Ω/km, X=${t.x_ohm_per_km.toFixed(3)} Ω/km, I=${t.rated_current_a} A`;
    }
    case 'TRANSFORMER': {
      const t = type as TransformerType;
      return `${t.rated_power_mva} MVA, ${t.voltage_hv_kv}/${t.voltage_lv_kv} kV, uk=${t.uk_percent}%`;
    }
    case 'SWITCH_EQUIPMENT': {
      const t = type as SwitchEquipmentType;
      return `${t.un_kv} kV, ${t.in_a} A, ${t.ik_ka} kA`;
    }
    default:
      return '—';
  }
}
