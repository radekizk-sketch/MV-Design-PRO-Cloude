/**
 * Sekcja "Geometria" inspektora SLD — RUN #3H §4.
 *
 * Wyswietla informacje o nadpisaniach geometrii (overrides)
 * dla wybranego elementu w trybie projektowym.
 *
 * FEATURES:
 * - Pozycja elementu (base + override delta)
 * - Status nadpisania (aktywne / brak)
 * - Scope i operacja
 * - Bledy walidacji per element (FixActions)
 * - 100% POLISH UI
 */

import type { InspectorPropertySection, InspectorPropertyField } from './types';
import type {
  ProjectGeometryOverridesV1,
  GeometryOverrideItemV1,
  OverrideValidationErrorV1,
  MoveDeltaPayloadV1,
  MoveLabelPayloadV1,
  ReorderFieldPayloadV1,
} from '../core/geometryOverrides';
import { OverrideScopeV1, OverrideOperationV1 } from '../core/geometryOverrides';

// =============================================================================
// ETYKIETY POLSKIE
// =============================================================================

const SCOPE_LABELS_PL: Record<string, string> = {
  [OverrideScopeV1.NODE]: 'Wezel',
  [OverrideScopeV1.BLOCK]: 'Blok stacji',
  [OverrideScopeV1.FIELD]: 'Pole',
  [OverrideScopeV1.LABEL]: 'Etykieta',
  [OverrideScopeV1.EDGE_CHANNEL]: 'Kanal krawedzi',
};

const OPERATION_LABELS_PL: Record<string, string> = {
  [OverrideOperationV1.MOVE_DELTA]: 'Przesuniecie',
  [OverrideOperationV1.REORDER_FIELD]: 'Zmiana kolejnosci pol',
  [OverrideOperationV1.MOVE_LABEL]: 'Pozycja etykiety',
};

export const GEOMETRY_SECTION_LABEL_PL = 'Geometria';

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Buduje sekcje "Geometria" inspektora dla danego elementu.
 *
 * Zwraca null jesli:
 * - Brak overrides
 * - Element nie ma nadpisan
 */
export function buildGeometrySection(
  elementId: string,
  overrides: ProjectGeometryOverridesV1 | null,
  validationErrors: readonly OverrideValidationErrorV1[],
): InspectorPropertySection | null {
  if (!overrides) {
    return null;
  }

  // Find all overrides for this element
  const elementOverrides = overrides.items.filter(
    (item) => item.elementId === elementId,
  );

  // Find validation errors for this element
  const elementErrors = validationErrors.filter(
    (err) => err.elementId === elementId,
  );

  // No overrides and no errors — skip section
  if (elementOverrides.length === 0 && elementErrors.length === 0) {
    return null;
  }

  const fields: InspectorPropertyField[] = [];

  // Status
  fields.push({
    key: 'geometry-status',
    label: 'Status nadpisania',
    value: elementOverrides.length > 0 ? 'Aktywne' : 'Brak',
    highlight: elementOverrides.length > 0 ? 'primary' : undefined,
  });

  // Override count
  if (elementOverrides.length > 0) {
    fields.push({
      key: 'geometry-count',
      label: 'Liczba nadpisan',
      value: elementOverrides.length,
    });
  }

  // Details per override
  for (let i = 0; i < elementOverrides.length; i++) {
    const item = elementOverrides[i];
    const prefix = elementOverrides.length > 1 ? `[${i + 1}] ` : '';

    fields.push({
      key: `geometry-scope-${i}`,
      label: `${prefix}Zakres`,
      value: SCOPE_LABELS_PL[item.scope] ?? item.scope,
    });

    fields.push({
      key: `geometry-operation-${i}`,
      label: `${prefix}Operacja`,
      value: OPERATION_LABELS_PL[item.operation] ?? item.operation,
    });

    // Payload details per operation
    const payloadFields = buildPayloadFields(item, i, prefix);
    fields.push(...payloadFields);
  }

  // Validation errors (FixActions)
  if (elementErrors.length > 0) {
    fields.push({
      key: 'geometry-errors-count',
      label: 'Bledy walidacji',
      value: elementErrors.length,
      highlight: 'error',
    });

    for (let i = 0; i < elementErrors.length; i++) {
      const err = elementErrors[i];
      fields.push({
        key: `geometry-error-${i}`,
        label: `Blad [${err.code}]`,
        value: err.message,
        highlight: 'error',
      });
    }
  }

  return {
    id: 'geometry',
    label: GEOMETRY_SECTION_LABEL_PL,
    fields,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function buildPayloadFields(
  item: GeometryOverrideItemV1,
  index: number,
  prefix: string,
): InspectorPropertyField[] {
  const fields: InspectorPropertyField[] = [];

  if (item.operation === OverrideOperationV1.MOVE_DELTA) {
    const p = item.payload as MoveDeltaPayloadV1;
    fields.push({
      key: `geometry-dx-${index}`,
      label: `${prefix}Delta X`,
      value: p.dx,
      unit: 'px',
    });
    fields.push({
      key: `geometry-dy-${index}`,
      label: `${prefix}Delta Y`,
      value: p.dy,
      unit: 'px',
    });
  }

  if (item.operation === OverrideOperationV1.MOVE_LABEL) {
    const p = item.payload as MoveLabelPayloadV1;
    fields.push({
      key: `geometry-anchor-x-${index}`,
      label: `${prefix}Kotwica X`,
      value: p.anchorX,
      unit: 'px',
    });
    fields.push({
      key: `geometry-anchor-y-${index}`,
      label: `${prefix}Kotwica Y`,
      value: p.anchorY,
      unit: 'px',
    });
  }

  if (item.operation === OverrideOperationV1.REORDER_FIELD) {
    const p = item.payload as ReorderFieldPayloadV1;
    fields.push({
      key: `geometry-field-order-${index}`,
      label: `${prefix}Kolejnosc pol`,
      value: p.fieldOrder.join(', '),
    });
  }

  return fields;
}
