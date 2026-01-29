/**
 * Property Grid Container (with Type Picker integration)
 *
 * CANONICAL ALIGNMENT:
 * - P13a: Type Library Browser + type_ref integration
 * - SYSTEM_SPEC.md § 4: Type Catalog (Library)
 *
 * This container wires up PropertyGrid with TypePicker modal and catalog API.
 * Handles:
 * - Type assignment (assign type_ref)
 * - Type clearing (set type_ref to null)
 * - Element data refresh after type changes
 */

import { useState, useCallback } from 'react';
import { PropertyGrid } from './PropertyGrid';
import { TypePicker } from '../catalog/TypePicker';
import {
  assignTypeToBranch,
  assignTypeToTransformer,
  assignEquipmentTypeToSwitch,
  clearTypeFromBranch,
  clearTypeFromTransformer,
  clearEquipmentTypeFromSwitch,
} from '../catalog/api';
import type { ElementType, ValidationMessage } from '../types';
import type { TypeCategory } from '../catalog/types';

interface PropertyGridContainerProps {
  projectId: string;
  elementId: string;
  elementType: ElementType;
  elementName: string;
  elementData?: Record<string, unknown>;
  validationMessages?: ValidationMessage[];
  onFieldChange?: (fieldKey: string, value: unknown) => void;
  onDataRefresh?: () => void; // Callback to refresh element data after type assignment
}

/**
 * Property Grid Container Component.
 *
 * Integrates PropertyGrid with TypePicker and catalog API.
 */
export function PropertyGridContainer({
  projectId,
  elementId,
  elementType,
  elementName,
  elementData = {},
  validationMessages = [],
  onFieldChange,
  onDataRefresh,
}: PropertyGridContainerProps) {
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [typePickerCategory, setTypePickerCategory] = useState<TypeCategory | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine type category and current type_ref based on element type
  const getTypeCategoryAndRef = (): { category: TypeCategory | null; currentTypeRef: string | null } => {
    switch (elementType) {
      case 'LineBranch': {
        const branchType = elementData.branch_type as string;
        const category = branchType === 'CABLE' ? 'CABLE' : 'LINE';
        const currentTypeRef = elementData.type_ref as string | null;
        return { category, currentTypeRef };
      }
      case 'TransformerBranch': {
        const currentTypeRef = elementData.type_ref as string | null;
        return { category: 'TRANSFORMER', currentTypeRef };
      }
      case 'Switch': {
        const currentTypeRef = elementData.equipment_type_ref as string | null;
        return { category: 'SWITCH_EQUIPMENT', currentTypeRef };
      }
      default:
        return { category: null, currentTypeRef: null };
    }
  };

  // Handle "Assign Type" button click
  const handleAssignType = useCallback(() => {
    const { category } = getTypeCategoryAndRef();
    if (!category) {
      console.error('Cannot assign type: unknown element type or category');
      return;
    }
    setTypePickerCategory(category);
    setIsTypePickerOpen(true);
    setError(null);
  }, [elementType, elementData]);

  // Handle "Clear Type" button click
  const handleClearType = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      switch (elementType) {
        case 'LineBranch':
          await clearTypeFromBranch(projectId, elementId);
          break;
        case 'TransformerBranch':
          await clearTypeFromTransformer(projectId, elementId);
          break;
        case 'Switch':
          await clearEquipmentTypeFromSwitch(projectId, elementId);
          break;
        default:
          throw new Error(`Unsupported element type: ${elementType}`);
      }

      // Refresh element data
      if (onDataRefresh) {
        onDataRefresh();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Błąd czyszczenia typu: ${errorMsg}`);
      console.error('Error clearing type:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, elementId, elementType, onDataRefresh]);

  // Handle type selection from TypePicker
  const handleSelectType = useCallback(
    async (typeId: string, typeName: string) => {
      setIsProcessing(true);
      setError(null);

      try {
        switch (elementType) {
          case 'LineBranch':
            await assignTypeToBranch(projectId, elementId, typeId);
            break;
          case 'TransformerBranch':
            await assignTypeToTransformer(projectId, elementId, typeId);
            break;
          case 'Switch':
            await assignEquipmentTypeToSwitch(projectId, elementId, typeId);
            break;
          default:
            throw new Error(`Unsupported element type: ${elementType}`);
        }

        // Refresh element data
        if (onDataRefresh) {
          onDataRefresh();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(`Błąd przypisywania typu: ${errorMsg}`);
        console.error('Error assigning type:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [projectId, elementId, elementType, onDataRefresh]
  );

  const { currentTypeRef } = getTypeCategoryAndRef();

  return (
    <>
      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          Przetwarzanie...
        </div>
      )}

      {/* Property Grid */}
      <PropertyGrid
        elementId={elementId}
        elementType={elementType}
        elementName={elementName}
        elementData={elementData}
        validationMessages={validationMessages}
        onFieldChange={onFieldChange}
        onAssignType={handleAssignType}
        onClearType={handleClearType}
      />

      {/* Type Picker Modal */}
      {typePickerCategory && (
        <TypePicker
          category={typePickerCategory}
          currentTypeId={currentTypeRef}
          onSelectType={handleSelectType}
          onClose={() => setIsTypePickerOpen(false)}
          isOpen={isTypePickerOpen}
        />
      )}
    </>
  );
}
