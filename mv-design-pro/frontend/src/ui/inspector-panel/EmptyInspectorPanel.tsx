/**
 * Empty Inspector Panel — "Brak zaznaczenia" State
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Inspector ZAWSZE widoczny
 * - wizard_screens.md § 2.4: Stan domyślny inspektora
 *
 * POWERFACTORY/ETAP RULE:
 * > Inspector Panel jest ZAWSZE renderowany
 * > Stan domyślny: "Brak zaznaczenia"
 *
 * FEATURES:
 * - Shows selection info when element selected
 * - Shows "Brak zaznaczenia" when nothing selected
 * - Shows read-only indicator in RESULT_VIEW mode
 * - 100% Polish UI
 */

import { clsx } from 'clsx';
import type { SelectedElement, ElementType } from '../types';

// =============================================================================
// Element Type Labels (Polish)
// =============================================================================

const ELEMENT_TYPE_LABELS_PL: Record<ElementType, string> = {
  Bus: 'Szyna',
  LineBranch: 'Linia',
  TransformerBranch: 'Transformator',
  Switch: 'Łącznik',
  Source: 'Źródło',
  Load: 'Odbiór',
};

// =============================================================================
// Component Props
// =============================================================================

export interface EmptyInspectorPanelProps {
  /**
   * Currently selected element (from selection store).
   */
  selectedElement?: SelectedElement | null;

  /**
   * Whether the app is in read-only mode.
   */
  isReadOnly?: boolean;

  /**
   * Additional CSS classes.
   */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function EmptyInspectorPanel({
  selectedElement,
  isReadOnly = false,
  className,
}: EmptyInspectorPanelProps) {
  // No selection state
  if (!selectedElement) {
    return (
      <div
        className={clsx(
          'h-full flex flex-col',
          className
        )}
        data-testid="inspector-panel-empty"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Właściwości
          </p>
        </div>

        {/* Empty state content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
          </div>

          {/* Message */}
          <p className="text-sm font-medium text-gray-600 mb-2">
            Brak zaznaczenia
          </p>
          <p className="text-xs text-gray-400 max-w-[200px]">
            Kliknij element na schemacie lub w drzewie projektu, aby zobaczyć jego właściwości.
          </p>
        </div>

        {/* Mode indicator */}
        {isReadOnly && (
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Tryb wyników — tylko do odczytu</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Selection preview (minimal info before full inspector loads)
  const typeLabel = ELEMENT_TYPE_LABELS_PL[selectedElement.type] || selectedElement.type;

  return (
    <div
      className={clsx(
        'h-full flex flex-col',
        className
      )}
      data-testid="inspector-panel-preview"
      data-selection-id={selectedElement.id}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Właściwości
        </p>
        <h3 className="text-sm font-semibold text-gray-800 mt-1" data-testid="inspector-title">
          {selectedElement.name || selectedElement.id}
        </h3>
      </div>

      {/* Element type badge */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Typ:</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            {typeLabel}
          </span>
        </div>
      </div>

      {/* Basic info */}
      <div className="flex-1 p-4">
        <div className="space-y-3">
          {/* ID */}
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500">ID</span>
            <span className="text-xs font-mono text-gray-700 text-right max-w-[180px] truncate" title={selectedElement.id}>
              {selectedElement.id}
            </span>
          </div>

          {/* Name */}
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500">Nazwa</span>
            <span className="text-xs text-gray-700 text-right max-w-[180px] truncate" title={selectedElement.name}>
              {selectedElement.name || '—'}
            </span>
          </div>

          {/* Type */}
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500">Typ elementu</span>
            <span className="text-xs text-gray-700">{typeLabel}</span>
          </div>
        </div>

        {/* Loading indicator for full properties */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Szczegółowe właściwości ładują się...
          </p>
        </div>
      </div>

      {/* Mode indicator */}
      {isReadOnly && (
        <div className="px-4 py-2 border-t border-gray-200 bg-green-50">
          <div className="flex items-center gap-2 text-xs text-green-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Tryb wyników — tylko do odczytu</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmptyInspectorPanel;
