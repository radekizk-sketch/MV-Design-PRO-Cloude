/**
 * Testy sekcji "Geometria" inspektora SLD — RUN #3H §4.
 *
 * ZAKRES:
 * - buildGeometrySection z overrides MOVE_DELTA
 * - buildGeometrySection z overrides MOVE_LABEL
 * - buildGeometrySection z overrides REORDER_FIELD
 * - buildGeometrySection — brak nadpisan → null
 * - buildGeometrySection — bledy walidacji (FixActions)
 * - buildGeometrySection — wielokrotne overrides per element
 * - 100% POLISH UI labels
 */

import { describe, it, expect } from 'vitest';
import { buildGeometrySection, GEOMETRY_SECTION_LABEL_PL } from '../geometrySection';
import {
  OverrideScopeV1,
  OverrideOperationV1,
  OVERRIDES_VERSION,
} from '../../core/geometryOverrides';
import type {
  ProjectGeometryOverridesV1,
  OverrideValidationErrorV1,
} from '../../core/geometryOverrides';

// =============================================================================
// Helpers
// =============================================================================

function makeOverrides(
  items: ProjectGeometryOverridesV1['items'] = [],
): ProjectGeometryOverridesV1 {
  return {
    overridesVersion: OVERRIDES_VERSION,
    studyCaseId: 'case-001',
    snapshotHash: 'abc',
    items,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('buildGeometrySection', () => {
  it('should return null when overrides is null', () => {
    const result = buildGeometrySection('node-1', null, []);
    expect(result).toBeNull();
  });

  it('should return null when element has no overrides and no errors', () => {
    const overrides = makeOverrides([
      {
        elementId: 'node-2',
        scope: OverrideScopeV1.NODE,
        operation: OverrideOperationV1.MOVE_DELTA,
        payload: { dx: 20, dy: 0 },
      },
    ]);
    const result = buildGeometrySection('node-1', overrides, []);
    expect(result).toBeNull();
  });

  it('should build section for MOVE_DELTA override', () => {
    const overrides = makeOverrides([
      {
        elementId: 'node-1',
        scope: OverrideScopeV1.NODE,
        operation: OverrideOperationV1.MOVE_DELTA,
        payload: { dx: 40, dy: -20 },
      },
    ]);
    const result = buildGeometrySection('node-1', overrides, []);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('geometry');
    expect(result!.label).toBe(GEOMETRY_SECTION_LABEL_PL);

    // Status field
    const statusField = result!.fields.find((f) => f.key === 'geometry-status');
    expect(statusField?.value).toBe('Aktywne');

    // Scope field
    const scopeField = result!.fields.find((f) => f.key === 'geometry-scope-0');
    expect(scopeField?.value).toBe('Wezel');

    // Operation field
    const opField = result!.fields.find((f) => f.key === 'geometry-operation-0');
    expect(opField?.value).toBe('Przesuniecie');

    // Delta fields
    const dxField = result!.fields.find((f) => f.key === 'geometry-dx-0');
    expect(dxField?.value).toBe(40);
    expect(dxField?.unit).toBe('px');

    const dyField = result!.fields.find((f) => f.key === 'geometry-dy-0');
    expect(dyField?.value).toBe(-20);
  });

  it('should build section for MOVE_LABEL override', () => {
    const overrides = makeOverrides([
      {
        elementId: 'node-1',
        scope: OverrideScopeV1.LABEL,
        operation: OverrideOperationV1.MOVE_LABEL,
        payload: { anchorX: 100, anchorY: 50 },
      },
    ]);
    const result = buildGeometrySection('node-1', overrides, []);
    expect(result).not.toBeNull();

    const scopeField = result!.fields.find((f) => f.key === 'geometry-scope-0');
    expect(scopeField?.value).toBe('Etykieta');

    const opField = result!.fields.find((f) => f.key === 'geometry-operation-0');
    expect(opField?.value).toBe('Pozycja etykiety');

    const axField = result!.fields.find((f) => f.key === 'geometry-anchor-x-0');
    expect(axField?.value).toBe(100);

    const ayField = result!.fields.find((f) => f.key === 'geometry-anchor-y-0');
    expect(ayField?.value).toBe(50);
  });

  it('should build section for REORDER_FIELD override', () => {
    const overrides = makeOverrides([
      {
        elementId: 'station-GPZ',
        scope: OverrideScopeV1.FIELD,
        operation: OverrideOperationV1.REORDER_FIELD,
        payload: { fieldOrder: ['field-A', 'field-B', 'field-C'] },
      },
    ]);
    const result = buildGeometrySection('station-GPZ', overrides, []);
    expect(result).not.toBeNull();

    const orderField = result!.fields.find((f) => f.key === 'geometry-field-order-0');
    expect(orderField?.value).toBe('field-A, field-B, field-C');
  });

  it('should show validation errors as FixActions', () => {
    const overrides = makeOverrides([
      {
        elementId: 'node-1',
        scope: OverrideScopeV1.NODE,
        operation: OverrideOperationV1.MOVE_DELTA,
        payload: { dx: 40, dy: -20 },
      },
    ]);
    const errors: OverrideValidationErrorV1[] = [
      {
        elementId: 'node-1',
        code: 'geometry.override_causes_collision',
        message: 'Nadpisanie powoduje kolizje z innym elementem',
      },
    ];
    const result = buildGeometrySection('node-1', overrides, errors);
    expect(result).not.toBeNull();

    const errCountField = result!.fields.find((f) => f.key === 'geometry-errors-count');
    expect(errCountField?.value).toBe(1);
    expect(errCountField?.highlight).toBe('error');

    const errField = result!.fields.find((f) => f.key === 'geometry-error-0');
    expect(errField?.highlight).toBe('error');
    expect(errField?.value).toContain('kolizje');
  });

  it('should show section even with only errors (no override items)', () => {
    const overrides = makeOverrides([]);
    const errors: OverrideValidationErrorV1[] = [
      {
        elementId: 'node-1',
        code: 'geometry.override_invalid_element',
        message: 'Element nie istnieje',
      },
    ];
    const result = buildGeometrySection('node-1', overrides, errors);
    expect(result).not.toBeNull();
    expect(result!.fields.find((f) => f.key === 'geometry-status')?.value).toBe('Brak');
  });

  it('should handle multiple overrides for same element', () => {
    const overrides = makeOverrides([
      {
        elementId: 'node-1',
        scope: OverrideScopeV1.NODE,
        operation: OverrideOperationV1.MOVE_DELTA,
        payload: { dx: 20, dy: 0 },
      },
      {
        elementId: 'node-1',
        scope: OverrideScopeV1.LABEL,
        operation: OverrideOperationV1.MOVE_LABEL,
        payload: { anchorX: 50, anchorY: 30 },
      },
    ]);
    const result = buildGeometrySection('node-1', overrides, []);
    expect(result).not.toBeNull();

    const countField = result!.fields.find((f) => f.key === 'geometry-count');
    expect(countField?.value).toBe(2);

    // Prefixed labels for multiple overrides
    const scope0 = result!.fields.find((f) => f.key === 'geometry-scope-0');
    expect(scope0?.label).toContain('[1]');

    const scope1 = result!.fields.find((f) => f.key === 'geometry-scope-1');
    expect(scope1?.label).toContain('[2]');
  });

  it('should use Polish label for section', () => {
    expect(GEOMETRY_SECTION_LABEL_PL).toBe('Geometria');
  });
});
