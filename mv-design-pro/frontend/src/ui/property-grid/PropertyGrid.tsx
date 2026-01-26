/**
 * Property Grid Component (PF-style)
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 2.4, § 3: Siatka Właściwości specification
 * - powerfactory_ui_parity.md § D: Property Grid rules
 *
 * Features:
 * - Deterministic section and field ordering
 * - type_ref and Type params are READ-ONLY
 * - Mode gating: RESULT_VIEW = all read-only, MODEL_EDIT = instance fields editable
 * - Units displayed with values
 * - Inline validation messages
 */

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import type { ElementType, OperatingMode, PropertyField, PropertySection, ValidationMessage } from '../types';
import { getFieldDefinitions, SECTION_LABELS } from './field-definitions';
import { useSelectionStore, useCanEdit } from '../selection';

interface PropertyGridProps {
  elementId: string;
  elementType: ElementType;
  elementName: string;
  elementData?: Record<string, unknown>;
  validationMessages?: ValidationMessage[];
  onFieldChange?: (fieldKey: string, value: unknown) => void;
  // P8.2 HOTFIX: Type Library callbacks
  onAssignType?: () => void;
  onClearType?: () => void;
}

/**
 * Property Grid Component.
 *
 * Displays element properties in deterministic, grouped sections.
 * Respects operating mode for edit/read-only state.
 */
export function PropertyGrid({
  elementId,
  elementType,
  elementName,
  elementData = {},
  validationMessages = [],
  onFieldChange,
  onAssignType,
  onClearType,
}: PropertyGridProps) {
  const mode = useSelectionStore((state) => state.mode);
  const canEdit = useCanEdit();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Get field definitions for this element type
  const sections = getFieldDefinitions(elementType);

  // Merge element data into field definitions
  // P8.2 HOTFIX: Wire type_ref_with_actions callbacks
  const populatedSections = sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => {
      const baseField = {
        ...field,
        value: elementData[field.key] ?? field.value,
        validation: validationMessages.find((v) => v.field === field.key),
      };

      // Wire type library callbacks for type_ref_with_actions fields
      if (field.type === 'type_ref_with_actions') {
        return {
          ...baseField,
          onAssignType,
          onClearType,
          typeRefName: elementData[`${field.key}_name`] as string | null | undefined,
        };
      }

      return baseField;
    }),
  }));

  // Toggle section collapse
  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Handle field value change
  const handleFieldChange = useCallback(
    (fieldKey: string, value: unknown) => {
      if (onFieldChange && canEdit) {
        onFieldChange(fieldKey, value);
      }
    },
    [onFieldChange, canEdit]
  );

  // Get mode label for header
  const getModeLabel = () => {
    switch (mode) {
      case 'MODEL_EDIT':
        return 'Edycja';
      case 'CASE_CONFIG':
        return 'Konfiguracja';
      case 'RESULT_VIEW':
        return 'Wyniki';
      default:
        return mode;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              SIATKA WŁAŚCIWOŚCI
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Obiekt: <span className="font-medium">{elementName}</span> ({elementType})
            </p>
          </div>
          <span
            className={clsx(
              'text-xs px-2 py-1 rounded',
              mode === 'MODEL_EDIT' && 'bg-blue-100 text-blue-800',
              mode === 'CASE_CONFIG' && 'bg-yellow-100 text-yellow-800',
              mode === 'RESULT_VIEW' && 'bg-green-100 text-green-800'
            )}
          >
            {getModeLabel()}
          </span>
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-gray-100">
        {populatedSections.map((section) => (
          <PropertySection
            key={section.id}
            section={section}
            collapsed={collapsedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            onFieldChange={handleFieldChange}
            mode={mode}
            canEdit={canEdit}
          />
        ))}
      </div>

      {/* Validation Summary */}
      {validationMessages.length > 0 && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-3">
          <h3 className="text-xs font-semibold text-red-800 mb-2">
            Błędy walidacji
          </h3>
          <ul className="space-y-1">
            {validationMessages.map((msg, i) => (
              <li
                key={i}
                className={clsx(
                  'text-xs',
                  msg.severity === 'ERROR' ? 'text-red-700' : 'text-yellow-700'
                )}
              >
                [{msg.code}] {msg.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Property Section Component.
 */
interface PropertySectionProps {
  section: PropertySection;
  collapsed: boolean;
  onToggle: () => void;
  onFieldChange: (fieldKey: string, value: unknown) => void;
  mode: OperatingMode;
  canEdit: boolean;
}

function PropertySection({
  section,
  collapsed,
  onToggle,
  onFieldChange,
  mode,
  canEdit,
}: PropertySectionProps) {
  return (
    <div>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-xs font-medium text-gray-700">
          {collapsed ? '▶' : '▼'} {section.label}
        </span>
        <span className="text-xs text-gray-500">
          {section.fields.length} {section.fields.length === 1 ? 'pole' : 'pól'}
        </span>
      </button>

      {/* Section Fields */}
      {!collapsed && (
        <div className="px-4 py-2 space-y-2">
          {section.fields.map((field) => (
            <PropertyFieldRow
              key={field.key}
              field={field}
              onFieldChange={onFieldChange}
              mode={mode}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Property Field Row Component.
 */
interface PropertyFieldRowProps {
  field: PropertyField;
  onFieldChange: (fieldKey: string, value: unknown) => void;
  mode: OperatingMode;
  canEdit: boolean;
}

function PropertyFieldRow({
  field,
  onFieldChange,
  mode,
  canEdit,
}: PropertyFieldRowProps) {
  // Determine if field is editable
  // - type and calculated sources are always read-only
  // - in RESULT_VIEW, everything is read-only
  // - in CASE_CONFIG, only case config fields are editable (not implemented here)
  const isReadOnly =
    !field.editable ||
    field.source === 'type' ||
    field.source === 'calculated' ||
    field.source === 'audit' ||
    mode === 'RESULT_VIEW' ||
    !canEdit;

  // Get source indicator
  const getSourceIndicator = () => {
    switch (field.source) {
      case 'type':
        return '(z katalogu)';
      case 'calculated':
        return '(obliczone)';
      case 'audit':
        return '(system)';
      default:
        return null;
    }
  };

  // Format value for display
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'boolean') {
      return value ? 'Tak' : 'Nie';
    }
    if (typeof value === 'number') {
      return value.toLocaleString('pl-PL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      });
    }
    return String(value);
  };

  // Special rendering for type_ref_with_actions (P8.2)
  if (field.type === 'type_ref_with_actions') {
    const hasTypeRef = field.value !== null && field.value !== undefined && field.value !== '';
    const canModifyType = canEdit && mode === 'MODEL_EDIT';

    return (
      <div
        className={clsx(
          'py-2',
          field.validation?.severity === 'ERROR' && 'bg-red-50 -mx-2 px-2 rounded',
          field.validation?.severity === 'WARNING' && 'bg-yellow-50 -mx-2 px-2 rounded'
        )}
      >
        {/* Label */}
        <div className="mb-1">
          <span className="text-xs text-gray-600">{field.label}</span>
        </div>

        {/* Type Display */}
        <div className="text-xs mb-2">
          {hasTypeRef ? (
            <>
              <div className="font-medium text-gray-900">
                {field.typeRefName ?? String(field.value)}
              </div>
              <div className="text-xs text-gray-500 font-mono mt-0.5">
                ID: {String(field.value)}
              </div>
            </>
          ) : (
            <span className="text-gray-400 italic">Nie przypisano typu z katalogu</span>
          )}
        </div>

        {/* Action Buttons */}
        {canModifyType && (
          <div className="flex gap-2">
            <button
              onClick={field.onAssignType}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {hasTypeRef ? 'Zmień typ...' : 'Przypisz typ...'}
            </button>
            {hasTypeRef && (
              <button
                onClick={field.onClearType}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Wyczyść
              </button>
            )}
          </div>
        )}

        {/* Validation Message */}
        {field.validation && (
          <div
            className={clsx(
              'text-xs mt-1',
              field.validation.severity === 'ERROR' ? 'text-red-600' : 'text-yellow-600'
            )}
          >
            {field.validation.message}
          </div>
        )}
      </div>
    );
  }

  // Standard field rendering
  return (
    <div
      className={clsx(
        'flex items-center py-1',
        field.validation?.severity === 'ERROR' && 'bg-red-50 -mx-2 px-2 rounded',
        field.validation?.severity === 'WARNING' && 'bg-yellow-50 -mx-2 px-2 rounded'
      )}
    >
      {/* Label */}
      <div className="flex-1 min-w-0">
        <span className="text-xs text-gray-600">
          {field.label}
          {getSourceIndicator() && (
            <span className="text-gray-400 ml-1">{getSourceIndicator()}</span>
          )}
        </span>
      </div>

      {/* Value */}
      <div className="flex items-center gap-1">
        {isReadOnly ? (
          <span
            className={clsx(
              'text-xs font-mono',
              field.source === 'calculated' ? 'text-blue-700' : 'text-gray-900'
            )}
          >
            {formatValue(field.value)}
          </span>
        ) : (
          <FieldInput
            field={field}
            onChange={(value) => onFieldChange(field.key, value)}
          />
        )}

        {/* Unit */}
        {field.unit && (
          <span className="text-xs text-gray-500 ml-1">{field.unit}</span>
        )}

        {/* Read-only indicator */}
        {isReadOnly && field.editable && (
          <span className="text-xs text-gray-400 ml-1" title="Tylko do odczytu w tym trybie">
            🔒
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Field Input Component.
 */
interface FieldInputProps {
  field: PropertyField;
  onChange: (value: unknown) => void;
}

function FieldInput({ field, onChange }: FieldInputProps) {
  switch (field.type) {
    case 'boolean':
      return (
        <input
          type="checkbox"
          checked={Boolean(field.value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      );

    case 'enum':
      return (
        <select
          value={String(field.value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
        >
          {field.enumOptions?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case 'number':
      return (
        <input
          type="number"
          value={field.value !== null ? String(field.value) : ''}
          onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
          className="text-xs font-mono w-24 border border-gray-300 rounded px-2 py-1 text-right focus:ring-blue-500 focus:border-blue-500"
          step="any"
        />
      );

    case 'string':
    case 'ref':
    default:
      return (
        <input
          type="text"
          value={String(field.value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs w-32 border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
        />
      );
  }
}

export default PropertyGrid;
