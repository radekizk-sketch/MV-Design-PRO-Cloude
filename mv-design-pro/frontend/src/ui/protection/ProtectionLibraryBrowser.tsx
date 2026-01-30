/**
 * Protection Library Browser (Biblioteka zabezpieczeń)
 *
 * P14a: Protection Library (FOUNDATION, READ-ONLY)
 *
 * Przeglądarka biblioteki zabezpieczeń w stylu PowerFactory z 3 zakładkami:
 * - Urządzenia (Device Types)
 * - Krzywe (Curves)
 * - Szablony nastaw (Setting Templates)
 *
 * Wszystkie etykiety w języku polskim (100% PL).
 * READ-ONLY: brak create/update/delete, brak import/export w tym PR.
 */

import { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  fetchProtectionTypesByCategory,
  type ProtectionCategory,
  type ProtectionDeviceType,
  type ProtectionCurve,
  type ProtectionSettingTemplate,
  type ProtectionTypeUnion,
} from './';

interface Tab {
  id: ProtectionCategory;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'DEVICE', label: 'Urządzenia', icon: '🛡️' },
  { id: 'CURVE', label: 'Krzywe', icon: '📈' },
  { id: 'TEMPLATE', label: 'Szablony nastaw', icon: '⚙️' },
];

interface ProtectionLibraryBrowserProps {
  /** Callback when type is selected for inspection */
  onSelectType?: (typeId: string, category: ProtectionCategory) => void;
  /** Initial active tab */
  initialTab?: ProtectionCategory;
}

/**
 * Protection Library Browser Component.
 *
 * Wyświetla katalog zabezpieczeń w 3 zakładkach z listą i filtrowaniem.
 * Wszystkie typy są read-only (przeglądanie tylko).
 */
export function ProtectionLibraryBrowser({
  onSelectType,
  initialTab = 'DEVICE',
}: ProtectionLibraryBrowserProps) {
  const [activeTab, setActiveTab] = useState<ProtectionCategory>(initialTab);
  const [types, setTypes] = useState<ProtectionTypeUnion[]>([]);
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

    fetchProtectionTypesByCategory(activeTab)
      .then((fetchedTypes) => {
        setTypes(fetchedTypes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? 'Błąd pobierania typów zabezpieczeń');
        setLoading(false);
      });
  }, [activeTab]);

  // Filter types by search query (name_pl, vendor, id)
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return types;

    const query = searchQuery.toLowerCase();
    return types.filter((type) => {
      const namePl = (type as any).name_pl?.toLowerCase() || '';
      const id = type.id.toLowerCase();
      const vendor = (type as any).vendor?.toLowerCase() || '';

      return namePl.includes(query) || id.includes(query) || vendor.includes(query);
    });
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
    <div className="protection-library-browser flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-800">Biblioteka zabezpieczeń</h2>
        <p className="text-sm text-gray-500">
          Przeglądaj urządzenia, krzywe i szablony nastaw (read-only)
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex space-x-1 px-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center space-x-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Type List */}
        <div className="flex w-1/2 flex-col border-r border-gray-200 bg-white">
          {/* Search Bar */}
          <div className="border-b border-gray-200 p-3">
            <input
              type="text"
              placeholder="Szukaj po nazwie, producencie lub ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Type List */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center p-8 text-gray-500">
                Ładowanie typów zabezpieczeń...
              </div>
            )}

            {error && (
              <div className="m-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!loading && !error && filteredTypes.length === 0 && (
              <div className="flex items-center justify-center p-8 text-gray-500">
                Brak typów zabezpieczeń
              </div>
            )}

            {!loading && !error && filteredTypes.length > 0 && (
              <div className="divide-y divide-gray-100">
                {filteredTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type.id)}
                    className={clsx(
                      'w-full px-4 py-3 text-left transition-colors',
                      selectedTypeId === type.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="font-medium text-sm">
                      {(type as any).name_pl || type.id}
                    </div>
                    {(type as any).vendor && (
                      <div className="text-xs text-gray-500 mt-1">
                        {(type as any).vendor}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer: Type Count */}
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600">
            Znaleziono: {filteredTypes.length} {filteredTypes.length === 1 ? 'typ' : 'typów'}
          </div>
        </div>

        {/* Right: Type Details */}
        <div className="flex w-1/2 flex-col bg-white">
          {!selectedType && (
            <div className="flex flex-1 items-center justify-center text-gray-400">
              Wybierz typ z listy, aby zobaczyć szczegóły
            </div>
          )}

          {selectedType && (
            <div className="flex-1 overflow-y-auto p-4">
              <TypeDetailsPanel type={selectedType} category={activeTab} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Type Details Panel (Property Grid - READ-ONLY)
 */
function TypeDetailsPanel({
  type,
  category,
}: {
  type: ProtectionTypeUnion;
  category: ProtectionCategory;
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800">
          {(type as any).name_pl || type.id}
        </h3>
        <p className="text-xs text-gray-500 mt-1">ID: {type.id}</p>
      </div>

      {/* Properties Grid */}
      <div className="space-y-3">
        {category === 'DEVICE' && <DeviceTypeDetails type={type as ProtectionDeviceType} />}
        {category === 'CURVE' && <CurveDetails type={type as ProtectionCurve} />}
        {category === 'TEMPLATE' && <TemplateDetails type={type as ProtectionSettingTemplate} />}
      </div>
    </div>
  );
}

/**
 * Device Type Details
 */
function DeviceTypeDetails({ type }: { type: ProtectionDeviceType }) {
  return (
    <>
      <DetailField label="Nazwa (PL)" value={type.name_pl} />
      <DetailField label="Producent" value={type.vendor} />
      <DetailField label="Seria" value={type.series} />
      <DetailField label="Rewizja" value={type.revision} />
      <DetailField
        label="Prąd znamionowy"
        value={type.rated_current_a}
        unit="A"
      />
      <DetailField label="Notatki (PL)" value={type.notes_pl} multiline />
    </>
  );
}

/**
 * Curve Details
 */
function CurveDetails({ type }: { type: ProtectionCurve }) {
  return (
    <>
      <DetailField label="Nazwa (PL)" value={type.name_pl} />
      <DetailField label="Standard" value={type.standard} />
      <DetailField label="Typ krzywej" value={type.curve_kind} />
      {type.parameters && Object.keys(type.parameters).length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <div className="text-xs font-medium text-gray-600 mb-2">Parametry:</div>
          <div className="space-y-1">
            {Object.entries(type.parameters).map(([key, value]) => (
              <DetailField key={key} label={key} value={String(value)} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Template Details
 */
function TemplateDetails({ type }: { type: ProtectionSettingTemplate }) {
  return (
    <>
      <DetailField label="Nazwa (PL)" value={type.name_pl} />
      <DetailField label="Urządzenie (ref)" value={type.device_type_ref} />
      <DetailField label="Krzywa (ref)" value={type.curve_ref} />
      {type.setting_fields && type.setting_fields.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <div className="text-xs font-medium text-gray-600 mb-2">Pola nastaw:</div>
          <div className="space-y-2">
            {type.setting_fields.map((field, idx) => (
              <div key={idx} className="border-l-2 border-blue-300 pl-3 py-1 text-xs">
                <div className="font-medium text-gray-700">{field.name}</div>
                {field.unit && <div className="text-gray-500">Jednostka: {field.unit}</div>}
                {field.min !== undefined && field.max !== undefined && (
                  <div className="text-gray-500">
                    Zakres: {field.min} – {field.max}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Detail Field Component (Property Grid Row)
 */
function DetailField({
  label,
  value,
  unit,
  multiline = false,
}: {
  label: string;
  value?: string | number | null;
  unit?: string;
  multiline?: boolean;
}) {
  if (value === undefined || value === null || value === '') return null;

  const displayValue = unit ? `${value} ${unit}` : value;

  return (
    <div className="flex justify-between border-b border-gray-100 py-2 text-sm">
      <span className="font-medium text-gray-600">{label}:</span>
      <span className={clsx('text-gray-800', multiline && 'text-left')}>
        {displayValue}
      </span>
    </div>
  );
}
