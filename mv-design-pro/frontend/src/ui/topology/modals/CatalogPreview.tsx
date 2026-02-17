/**
 * CatalogPreview — READ-ONLY podgląd parametrów wybranego typu katalogowego.
 *
 * Wyświetla pełną specyfikację elementu z katalogu.
 * Użytkownik NIE MOŻE edytować tych wartości w trybie STANDARDOWYM.
 * BINDING: PL labels, no codenames.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogPreviewParam {
  label: string;
  value: string | number;
  unit?: string;
}

export interface CatalogPreviewSection {
  title: string;
  params: CatalogPreviewParam[];
}

interface CatalogPreviewProps {
  typeName: string;
  manufacturer?: string;
  sections: CatalogPreviewSection[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CatalogPreview({ typeName, manufacturer, sections }: CatalogPreviewProps) {
  if (sections.length === 0) return null;

  return (
    <div
      className="border border-gray-200 rounded-md bg-gray-50 p-4"
      data-testid="catalog-preview"
    >
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-medium text-gray-900">Dane katalogowe</h4>
        <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
          TYLKO ODCZYT
        </span>
      </div>

      <div className="text-sm text-gray-700 mb-2">
        <span className="font-medium">{typeName}</span>
        {manufacturer && <span className="text-gray-500 ml-1">({manufacturer})</span>}
      </div>

      {sections.map((section, sIdx) => (
        <div key={sIdx} className="mt-2">
          <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
            {section.title}
          </h5>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {section.params.map((param, pIdx) => (
              <div key={pIdx} className="flex justify-between text-xs">
                <span className="text-gray-500">{param.label}</span>
                <span className="text-gray-900 font-mono" data-testid={`preview-${param.label}`}>
                  {param.value}
                  {param.unit && <span className="text-gray-400 ml-0.5">{param.unit}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
