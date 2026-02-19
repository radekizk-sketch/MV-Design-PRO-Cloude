/**
 * CDSE Catalog Preview Engine — shows catalog data before committing operations.
 *
 * After selecting a catalog type:
 * 1. Display solver_fields (read-only) — what will be materialized
 * 2. Display ui_fields with units — human-readable parameters
 * 3. Show catalog version
 * 4. Show diff vs current Snapshot (if editing existing element)
 *
 * INVARIANTS:
 * - Read-only preview — no model mutation
 * - All data from MaterializationContract + catalog item
 * - Polish labels only
 * - No manual R/X/Ik/Sn entry (catalog-only)
 */

/**
 * Single preview field — one materialized parameter.
 */
export interface CatalogPreviewField {
  /** Field name (e.g., "r_ohm_per_km") */
  fieldName: string;
  /** Polish display label (e.g., "R [Ω/km] @20°C") */
  label_pl: string;
  /** Unit string (e.g., "Ω/km") */
  unit: string;
  /** Value from catalog item */
  value: number | string | boolean | null;
  /** Whether this is a solver field (used in calculations) */
  isSolverField: boolean;
  /** Current value in Snapshot (for diff, null if new element) */
  currentValue?: number | string | boolean | null;
  /** Whether value changed vs current (for highlighting) */
  hasChanged?: boolean;
}

/**
 * Complete catalog preview for a selected catalog item.
 */
export interface CatalogPreview {
  /** Catalog namespace */
  namespace: string;
  /** Catalog item ID */
  itemId: string;
  /** Catalog item version */
  itemVersion: string;
  /** Display name (Polish) */
  itemName_pl: string;
  /** Solver fields that will be materialized into Snapshot */
  solverFields: CatalogPreviewField[];
  /** UI-only fields for display */
  uiFields: CatalogPreviewField[];
  /** Total number of solver fields being materialized */
  materializationCount: number;
  /** Whether this is an update (vs. new assignment) */
  isUpdate: boolean;
  /** Number of fields that changed (if update) */
  changedFieldCount: number;
}

/**
 * Materialization contract definition (mirrors backend).
 */
export interface MaterializationContractDef {
  namespace: string;
  solverFields: string[];
  uiFields: Array<{ fieldName: string; label_pl: string; unit: string }>;
}

/**
 * Build a catalog preview from a selected catalog item.
 *
 * @param namespace - Catalog namespace
 * @param item - Catalog item data (from API)
 * @param contract - MaterializationContract for this namespace
 * @param currentValues - Current materialized values in Snapshot (empty for new elements)
 * @returns Complete CatalogPreview
 */
export function buildCatalogPreview(
  namespace: string,
  item: Record<string, unknown>,
  contract: MaterializationContractDef,
  currentValues: Record<string, unknown> = {},
): CatalogPreview {
  const isUpdate = Object.keys(currentValues).length > 0;
  let changedFieldCount = 0;

  // Build solver field previews
  const solverFields: CatalogPreviewField[] = contract.solverFields.map((fieldName) => {
    const value = item[fieldName] ?? null;
    const currentValue = currentValues[fieldName] ?? null;
    const hasChanged = isUpdate && value !== currentValue;
    if (hasChanged) changedFieldCount++;

    // Find label from ui_fields (solver fields may also be ui fields)
    const uiDef = contract.uiFields.find((f) => f.fieldName === fieldName);

    return {
      fieldName,
      label_pl: uiDef?.label_pl ?? fieldName,
      unit: uiDef?.unit ?? '',
      value: value as CatalogPreviewField['value'],
      isSolverField: true,
      currentValue: isUpdate ? (currentValue as CatalogPreviewField['currentValue']) : undefined,
      hasChanged,
    };
  });

  // Build UI-only field previews (fields not in solver_fields)
  const solverFieldNames = new Set(contract.solverFields);
  const uiFields: CatalogPreviewField[] = contract.uiFields
    .filter((f) => !solverFieldNames.has(f.fieldName))
    .map((f) => {
      const value = item[f.fieldName] ?? null;
      const currentValue = currentValues[f.fieldName] ?? null;
      const hasChanged = isUpdate && value !== currentValue;
      if (hasChanged) changedFieldCount++;

      return {
        fieldName: f.fieldName,
        label_pl: f.label_pl,
        unit: f.unit,
        value: value as CatalogPreviewField['value'],
        isSolverField: false,
        currentValue: isUpdate ? (currentValue as CatalogPreviewField['currentValue']) : undefined,
        hasChanged,
      };
    });

  return {
    namespace,
    itemId: String(item['id'] ?? ''),
    itemVersion: String(item['version'] ?? ''),
    itemName_pl: String(item['name'] ?? item['name_pl'] ?? ''),
    solverFields,
    uiFields,
    materializationCount: solverFields.length,
    isUpdate,
    changedFieldCount,
  };
}

/**
 * Format a preview field value for display.
 *
 * @param field - Preview field
 * @returns Formatted string (e.g., "0.125 Ω/km")
 */
export function formatPreviewValue(field: CatalogPreviewField): string {
  if (field.value === null || field.value === undefined) {
    return '—';
  }
  if (typeof field.value === 'boolean') {
    return field.value ? 'Tak' : 'Nie';
  }
  if (typeof field.value === 'number') {
    const formatted = Number.isInteger(field.value)
      ? String(field.value)
      : field.value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    return field.unit ? `${formatted} ${field.unit}` : formatted;
  }
  return String(field.value);
}
