/**
 * Type Library Browser (Biblioteka Typów)
 *
 * CANONICAL ALIGNMENT:
 * - CATALOG_BROWSER_CONTRACT.md § 3: Structure of Catalog Browser
 * - P13a: Catalog UI: Type Library Browser + type_ref w instancjach
 *
 * Przeglądarka biblioteki typów w stylu PowerFactory z 4 zakładkami:
 * - Typy linii (Line Types)
 * - Typy kabli (Cable Types)
 * - Typy transformatorów (Transformer Types)
 * - Typy aparatury łączeniowej (Switch Equipment Types)
 *
 * Wszystkie etykiety w języku polskim zgodnie z wizard_screens.md.
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

interface Tab {
  id: TypeCategory;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'LINE', label: 'Typy linii', icon: '─' },
  { id: 'CABLE', label: 'Typy kabli', icon: '═' },
  { id: 'TRANSFORMER', label: 'Typy transformatorów', icon: '⚡' },
  { id: 'SWITCH_EQUIPMENT', label: 'Typy aparatury łączeniowej', icon: '⚙️' },
];

interface TypeLibraryBrowserProps {
  /** Callback when type is selected for inspection */
  onSelectType?: (typeId: string, category: TypeCategory) => void;
  /** Initial active tab */
  initialTab?: TypeCategory;
}

/**
 * Type Library Browser Component.
 *
 * Wyświetla katalog typów w 4 zakładkach z listą i filtrowaniem.
 * Wszystkie typy są read-only (przeglądanie tylko).
 */
export function TypeLibraryBrowser({
  onSelectType,
  initialTab = 'LINE',
}: TypeLibraryBrowserProps) {
  const [activeTab, setActiveTab] = useState<TypeCategory>(initialTab);
  const [types, setTypes] = useState<CatalogTypeUnion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  // Fetch types when active tab changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSearchQuery(''); // Reset search on tab change
    setSelectedTypeId(null); // Reset selection on tab change

    fetchTypesByCategory(activeTab)
      .then((fetchedTypes) => {
        setTypes(fetchedTypes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? 'Błąd pobierania typów');
        setLoading(false);
      });
  }, [activeTab]);

  // Filter types by search query (name, manufacturer, or id)
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return types;

    const query = searchQuery.toLowerCase();
    return types.filter(
      (type) =>
        type.name.toLowerCase().includes(query) ||
        type.id.toLowerCase().includes(query) ||
        (type.manufacturer && type.manufacturer.toLowerCase().includes(query))
    );
  }, [types, searchQuery]);

  // Handle type selection
  const handleSelectType = (typeId: string) => {
    setSelectedTypeId(typeId);
    if (onSelectType) {
      onSelectType(typeId, activeTab);
    }
  };

  // Get selected type object
  const selectedType = useMemo(() => {
    return types.find((t) => t.id === selectedTypeId);
  }, [types, selectedTypeId]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          Biblioteka typów
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Przeglądanie katalogów typów elementów sieci (read-only)
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex px-6">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                )}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <input
          type="text"
          placeholder="Szukaj po nazwie, producencie lub ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Content: List + Details */}
      <div className="flex-1 flex overflow-hidden">
        {/* Type List (left panel) */}
        <div className="w-1/2 bg-white border-r border-gray-200 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Ładowanie typów...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-32 text-red-600">
              <p className="font-semibold">Błąd</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && filteredTypes.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">
                {searchQuery ? 'Brak wyników dla zapytania.' : 'Brak typów w katalogu.'}
              </p>
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
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Liczba użyć
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTypes.map((type) => {
                  const isSelected = type.id === selectedTypeId;
                  return (
                    <tr
                      key={type.id}
                      onClick={() => handleSelectType(type.id)}
                      className={clsx(
                        'cursor-pointer hover:bg-blue-50 transition-colors',
                        isSelected && 'bg-blue-100'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{type.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{type.id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {type.manufacturer ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">
                        {/* Instances count - placeholder for now */}
                        —
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Type Details (right panel) */}
        <div className="w-1/2 bg-white overflow-y-auto p-6">
          {!selectedType && (
            <div className="flex items-center justify-center h-full text-gray-500">
              Wybierz typ z listy, aby zobaczyć szczegóły
            </div>
          )}

          {selectedType && (
            <TypeDetailsPanel type={selectedType} category={activeTab} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Type Details Panel Component.
 *
 * Wyświetla szczegóły wybranego typu (read-only).
 */
function TypeDetailsPanel({
  type,
  category,
}: {
  type: CatalogTypeUnion;
  category: TypeCategory;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">{type.name}</h2>
        <p className="text-sm text-gray-500 font-mono mt-1">{type.id}</p>
      </div>

      {/* Basic Info */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Informacje podstawowe
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="Producent" value={type.manufacturer ?? '—'} />
        </div>
      </div>

      {/* Electrical Parameters */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Parametry elektryczne
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {category === 'LINE' && renderLineParams(type as LineType)}
          {category === 'CABLE' && renderCableParams(type as CableType)}
          {category === 'TRANSFORMER' && renderTransformerParams(type as TransformerType)}
          {category === 'SWITCH_EQUIPMENT' &&
            renderSwitchParams(type as SwitchEquipmentType)}
        </div>
      </div>

      {/* Instances Section (placeholder) */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Instancje używające tego typu
        </h3>
        <p className="text-sm text-gray-500">
          Brak instancji (funkcja w przyszłej wersji)
        </p>
      </div>
    </div>
  );
}

/**
 * Detail Field Component.
 */
function DetailField({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">
        {value}
        {unit && <span className="text-gray-500 ml-1">{unit}</span>}
      </dd>
    </div>
  );
}

/**
 * Render LineType parameters.
 */
function renderLineParams(type: LineType) {
  return (
    <>
      <DetailField label="Rezystancja R" value={type.r_ohm_per_km.toFixed(3)} unit="Ω/km" />
      <DetailField label="Reaktancja X" value={type.x_ohm_per_km.toFixed(3)} unit="Ω/km" />
      <DetailField label="Susceptancja B" value={type.b_us_per_km.toFixed(3)} unit="µS/km" />
      <DetailField label="Prąd znamionowy" value={type.rated_current_a.toFixed(0)} unit="A" />
      <DetailField
        label="Napięcie znamionowe"
        value={type.voltage_rating_kv.toFixed(1)}
        unit="kV"
      />
      <DetailField label="Materiał" value={type.conductor_material ?? '—'} />
      <DetailField
        label="Przekrój"
        value={type.cross_section_mm2.toFixed(0)}
        unit="mm²"
      />
      <DetailField
        label="Max temperatura"
        value={type.max_temperature_c.toFixed(0)}
        unit="°C"
      />
    </>
  );
}

/**
 * Render CableType parameters.
 */
function renderCableParams(type: CableType) {
  return (
    <>
      <DetailField label="Rezystancja R" value={type.r_ohm_per_km.toFixed(3)} unit="Ω/km" />
      <DetailField label="Reaktancja X" value={type.x_ohm_per_km.toFixed(3)} unit="Ω/km" />
      <DetailField label="Pojemność C" value={type.c_nf_per_km.toFixed(0)} unit="nF/km" />
      <DetailField label="Prąd znamionowy" value={type.rated_current_a.toFixed(0)} unit="A" />
      <DetailField
        label="Napięcie znamionowe"
        value={type.voltage_rating_kv.toFixed(1)}
        unit="kV"
      />
      <DetailField label="Izolacja" value={type.insulation_type ?? '—'} />
      <DetailField label="Materiał" value={type.conductor_material ?? '—'} />
      <DetailField
        label="Przekrój"
        value={type.cross_section_mm2.toFixed(0)}
        unit="mm²"
      />
    </>
  );
}

/**
 * Render TransformerType parameters.
 */
function renderTransformerParams(type: TransformerType) {
  return (
    <>
      <DetailField label="Moc znamionowa" value={type.rated_power_mva.toFixed(1)} unit="MVA" />
      <DetailField label="Napięcie HV" value={type.voltage_hv_kv.toFixed(1)} unit="kV" />
      <DetailField label="Napięcie LV" value={type.voltage_lv_kv.toFixed(1)} unit="kV" />
      <DetailField label="uk" value={type.uk_percent.toFixed(2)} unit="%" />
      <DetailField label="Straty zwarcia Pk" value={type.pk_kw.toFixed(1)} unit="kW" />
      <DetailField label="Prąd jałowy i0" value={type.i0_percent.toFixed(2)} unit="%" />
      <DetailField label="Straty jałowe P0" value={type.p0_kw.toFixed(1)} unit="kW" />
      <DetailField label="Grupa połączeń" value={type.vector_group} />
      <DetailField label="Chłodzenie" value={type.cooling_class ?? '—'} />
      <DetailField label="Zakres zaczepów" value={`${type.tap_min} ... ${type.tap_max}`} />
    </>
  );
}

/**
 * Render SwitchEquipmentType parameters.
 */
function renderSwitchParams(type: SwitchEquipmentType) {
  return (
    <>
      <DetailField label="Rodzaj aparatu" value={type.equipment_kind} />
      <DetailField label="Napięcie znamionowe" value={type.un_kv.toFixed(1)} unit="kV" />
      <DetailField label="Prąd znamionowy" value={type.in_a.toFixed(0)} unit="A" />
      <DetailField label="Prąd wyłączalny Ik" value={type.ik_ka.toFixed(1)} unit="kA" />
      <DetailField label="Prąd wytrzymałości Icw" value={type.icw_ka.toFixed(1)} unit="kA" />
      <DetailField label="Ośrodek gaszący" value={type.medium ?? '—'} />
    </>
  );
}
