/**
 * Compare Utils Tests — PR-SLD-08
 *
 * Testy jednostkowe dla narzędzi porównania.
 *
 * TEST COVERAGE:
 * - Porównanie wartości (compareValues)
 * - Porównanie sekcji (compareSections)
 * - Sortowanie deterministyczne (sortElementsForCompare)
 * - Zliczanie różnic (countTotalDifferences)
 * - Formatowanie wartości
 */

import { describe, it, expect } from 'vitest';
import {
  compareValues,
  compareSections,
  compareAllSections,
  sortElementsForCompare,
  countTotalDifferences,
  areAllFieldsEqual,
  isDifferent,
  formatNumber,
  formatBoolean,
  formatValue,
  getDifferenceLabel,
} from '../compareUtils';
import type { InspectorPropertySection } from '../../types';
import type { CompareElement, ComparePropertySection } from '../types';

// =============================================================================
// TESTY compareValues
// =============================================================================

describe('compareValues', () => {
  it('should return "equal" for identical strings', () => {
    expect(compareValues('test', 'test')).toBe('equal');
  });

  it('should return "equal" for identical numbers', () => {
    expect(compareValues(42, 42)).toBe('equal');
  });

  it('should return "equal" for identical booleans', () => {
    expect(compareValues(true, true)).toBe('equal');
    expect(compareValues(false, false)).toBe('equal');
  });

  it('should return "equal" for both null', () => {
    expect(compareValues(null, null)).toBe('equal');
  });

  it('should return "equal" for both undefined', () => {
    expect(compareValues(undefined, undefined)).toBe('equal');
  });

  it('should return "different" for different strings', () => {
    expect(compareValues('foo', 'bar')).toBe('different');
  });

  it('should return "different" for different numbers', () => {
    expect(compareValues(1, 2)).toBe('different');
  });

  it('should return "different" for different booleans', () => {
    expect(compareValues(true, false)).toBe('different');
  });

  it('should return "different" for different types', () => {
    expect(compareValues('42', 42)).toBe('different');
    expect(compareValues(true, 'true')).toBe('different');
  });

  it('should return "missing_a" when only A is null', () => {
    expect(compareValues(null, 'value')).toBe('missing_a');
    expect(compareValues(undefined, 'value')).toBe('missing_a');
  });

  it('should return "missing_b" when only B is null', () => {
    expect(compareValues('value', null)).toBe('missing_b');
    expect(compareValues('value', undefined)).toBe('missing_b');
  });

  it('should handle floating point comparison with tolerance', () => {
    expect(compareValues(0.1 + 0.2, 0.3)).toBe('equal'); // Famous floating point issue
    expect(compareValues(1.0000000001, 1.0000000002)).toBe('equal');
    expect(compareValues(1.0, 1.1)).toBe('different');
  });
});

// =============================================================================
// TESTY isDifferent
// =============================================================================

describe('isDifferent', () => {
  it('should return false for "equal"', () => {
    expect(isDifferent('equal')).toBe(false);
  });

  it('should return true for "different"', () => {
    expect(isDifferent('different')).toBe(true);
  });

  it('should return true for "missing_a"', () => {
    expect(isDifferent('missing_a')).toBe(true);
  });

  it('should return true for "missing_b"', () => {
    expect(isDifferent('missing_b')).toBe(true);
  });
});

// =============================================================================
// TESTY compareSections
// =============================================================================

describe('compareSections', () => {
  it('should compare sections with identical fields', () => {
    const sectionA: InspectorPropertySection = {
      id: 'basic',
      label: 'Informacje podstawowe',
      fields: [
        { key: 'name', label: 'Nazwa', value: 'Element 1' },
        { key: 'type', label: 'Typ', value: 'Bus' },
      ],
    };

    const sectionB: InspectorPropertySection = {
      id: 'basic',
      label: 'Informacje podstawowe',
      fields: [
        { key: 'name', label: 'Nazwa', value: 'Element 1' },
        { key: 'type', label: 'Typ', value: 'Bus' },
      ],
    };

    const result = compareSections(sectionA, sectionB);

    expect(result.id).toBe('basic');
    expect(result.hasDifferences).toBe(false);
    expect(result.fields).toHaveLength(2);
    expect(result.fields[0].diffStatus).toBe('equal');
    expect(result.fields[1].diffStatus).toBe('equal');
  });

  it('should detect differences between sections', () => {
    const sectionA: InspectorPropertySection = {
      id: 'basic',
      label: 'Informacje podstawowe',
      fields: [
        { key: 'name', label: 'Nazwa', value: 'Element 1' },
        { key: 'status', label: 'Status', value: 'active' },
      ],
    };

    const sectionB: InspectorPropertySection = {
      id: 'basic',
      label: 'Informacje podstawowe',
      fields: [
        { key: 'name', label: 'Nazwa', value: 'Element 2' },
        { key: 'status', label: 'Status', value: 'inactive' },
      ],
    };

    const result = compareSections(sectionA, sectionB);

    expect(result.hasDifferences).toBe(true);
    expect(result.fields[0].diffStatus).toBe('different');
    expect(result.fields[0].valueA).toBe('Element 1');
    expect(result.fields[0].valueB).toBe('Element 2');
  });

  it('should handle fields missing in section B', () => {
    const sectionA: InspectorPropertySection = {
      id: 'basic',
      label: 'Informacje podstawowe',
      fields: [
        { key: 'name', label: 'Nazwa', value: 'Element 1' },
        { key: 'extra', label: 'Dodatkowe', value: 'data' },
      ],
    };

    const sectionB: InspectorPropertySection = {
      id: 'basic',
      label: 'Informacje podstawowe',
      fields: [
        { key: 'name', label: 'Nazwa', value: 'Element 1' },
      ],
    };

    const result = compareSections(sectionA, sectionB);

    expect(result.hasDifferences).toBe(true);
    const extraField = result.fields.find((f) => f.key === 'extra');
    expect(extraField?.diffStatus).toBe('missing_b');
  });

  it('should handle fields missing in section A', () => {
    const sectionA: InspectorPropertySection = {
      id: 'basic',
      label: 'Informacje podstawowe',
      fields: [
        { key: 'name', label: 'Nazwa', value: 'Element 1' },
      ],
    };

    const sectionB: InspectorPropertySection = {
      id: 'basic',
      label: 'Informacje podstawowe',
      fields: [
        { key: 'name', label: 'Nazwa', value: 'Element 1' },
        { key: 'extra', label: 'Dodatkowe', value: 'data' },
      ],
    };

    const result = compareSections(sectionA, sectionB);

    expect(result.hasDifferences).toBe(true);
    const extraField = result.fields.find((f) => f.key === 'extra');
    expect(extraField?.diffStatus).toBe('missing_a');
  });

  it('should handle null section B', () => {
    const sectionA: InspectorPropertySection = {
      id: 'basic',
      label: 'Informacje podstawowe',
      fields: [
        { key: 'name', label: 'Nazwa', value: 'Element 1' },
      ],
    };

    const result = compareSections(sectionA, null);

    expect(result.hasDifferences).toBe(true);
    expect(result.fields[0].diffStatus).toBe('missing_b');
  });

  it('should preserve field order from section A', () => {
    const sectionA: InspectorPropertySection = {
      id: 'basic',
      label: 'Informacje podstawowe',
      fields: [
        { key: 'z_field', label: 'Z', value: '1' },
        { key: 'a_field', label: 'A', value: '2' },
        { key: 'm_field', label: 'M', value: '3' },
      ],
    };

    const sectionB: InspectorPropertySection = {
      id: 'basic',
      label: 'Informacje podstawowe',
      fields: [
        { key: 'z_field', label: 'Z', value: '1' },
        { key: 'a_field', label: 'A', value: '2' },
        { key: 'm_field', label: 'M', value: '3' },
      ],
    };

    const result = compareSections(sectionA, sectionB);

    expect(result.fields[0].key).toBe('z_field');
    expect(result.fields[1].key).toBe('a_field');
    expect(result.fields[2].key).toBe('m_field');
  });
});

// =============================================================================
// TESTY compareAllSections
// =============================================================================

describe('compareAllSections', () => {
  it('should compare multiple sections', () => {
    const sectionsA: InspectorPropertySection[] = [
      {
        id: 'basic',
        label: 'Podstawowe',
        fields: [{ key: 'name', label: 'Nazwa', value: 'A' }],
      },
      {
        id: 'technical',
        label: 'Techniczne',
        fields: [{ key: 'power', label: 'Moc', value: 100 }],
      },
    ];

    const sectionsB: InspectorPropertySection[] = [
      {
        id: 'basic',
        label: 'Podstawowe',
        fields: [{ key: 'name', label: 'Nazwa', value: 'B' }],
      },
      {
        id: 'technical',
        label: 'Techniczne',
        fields: [{ key: 'power', label: 'Moc', value: 100 }],
      },
    ];

    const result = compareAllSections(sectionsA, sectionsB);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('basic');
    expect(result[0].hasDifferences).toBe(true);
    expect(result[1].id).toBe('technical');
    expect(result[1].hasDifferences).toBe(false);
  });

  it('should handle sections missing in B', () => {
    const sectionsA: InspectorPropertySection[] = [
      { id: 'basic', label: 'Podstawowe', fields: [] },
      { id: 'extra', label: 'Dodatkowe', fields: [{ key: 'x', label: 'X', value: 1 }] },
    ];

    const sectionsB: InspectorPropertySection[] = [
      { id: 'basic', label: 'Podstawowe', fields: [] },
    ];

    const result = compareAllSections(sectionsA, sectionsB);

    expect(result).toHaveLength(2);
    const extraSection = result.find((s) => s.id === 'extra');
    expect(extraSection?.hasDifferences).toBe(true);
  });
});

// =============================================================================
// TESTY sortElementsForCompare
// =============================================================================

describe('sortElementsForCompare', () => {
  const createElement = (id: string): CompareElement => ({
    elementId: id,
    symbolId: `sym-${id}`,
    elementType: 'Bus',
    elementName: `Element ${id}`,
    symbol: {} as any,
  });

  it('should sort elements by elementId (A before B)', () => {
    const elem1 = createElement('aaa');
    const elem2 = createElement('bbb');

    const [a, b] = sortElementsForCompare(elem1, elem2);

    expect(a.elementId).toBe('aaa');
    expect(b.elementId).toBe('bbb');
  });

  it('should sort elements by elementId (B before A)', () => {
    const elem1 = createElement('zzz');
    const elem2 = createElement('aaa');

    const [a, b] = sortElementsForCompare(elem1, elem2);

    expect(a.elementId).toBe('aaa');
    expect(b.elementId).toBe('zzz');
  });

  it('should be deterministic - same input always gives same output', () => {
    const elem1 = createElement('xyz');
    const elem2 = createElement('abc');

    const [a1, b1] = sortElementsForCompare(elem1, elem2);
    const [a2, b2] = sortElementsForCompare(elem1, elem2);
    const [a3, b3] = sortElementsForCompare(elem2, elem1);

    expect(a1.elementId).toBe(a2.elementId);
    expect(b1.elementId).toBe(b2.elementId);
    expect(a1.elementId).toBe(a3.elementId);
    expect(b1.elementId).toBe(b3.elementId);
  });

  it('should handle equal elementIds', () => {
    const elem1 = createElement('same');
    const elem2 = createElement('same');

    const [a, b] = sortElementsForCompare(elem1, elem2);

    expect(a.elementId).toBe('same');
    expect(b.elementId).toBe('same');
  });
});

// =============================================================================
// TESTY countTotalDifferences
// =============================================================================

describe('countTotalDifferences', () => {
  it('should return 0 for no differences', () => {
    const sections: ComparePropertySection[] = [
      {
        id: 'basic',
        label: 'Basic',
        fields: [
          { key: 'a', label: 'A', valueA: '1', valueB: '1', diffStatus: 'equal' },
          { key: 'b', label: 'B', valueA: '2', valueB: '2', diffStatus: 'equal' },
        ],
        hasDifferences: false,
      },
    ];

    expect(countTotalDifferences(sections)).toBe(0);
  });

  it('should count differences correctly', () => {
    const sections: ComparePropertySection[] = [
      {
        id: 'basic',
        label: 'Basic',
        fields: [
          { key: 'a', label: 'A', valueA: '1', valueB: '2', diffStatus: 'different' },
          { key: 'b', label: 'B', valueA: '2', valueB: '2', diffStatus: 'equal' },
          { key: 'c', label: 'C', valueA: null, valueB: '3', diffStatus: 'missing_a' },
        ],
        hasDifferences: true,
      },
      {
        id: 'tech',
        label: 'Technical',
        fields: [
          { key: 'd', label: 'D', valueA: '4', valueB: null, diffStatus: 'missing_b' },
        ],
        hasDifferences: true,
      },
    ];

    expect(countTotalDifferences(sections)).toBe(3);
  });
});

// =============================================================================
// TESTY areAllFieldsEqual
// =============================================================================

describe('areAllFieldsEqual', () => {
  it('should return true when all fields are equal', () => {
    const sections: ComparePropertySection[] = [
      {
        id: 'basic',
        label: 'Basic',
        fields: [
          { key: 'a', label: 'A', valueA: '1', valueB: '1', diffStatus: 'equal' },
        ],
        hasDifferences: false,
      },
    ];

    expect(areAllFieldsEqual(sections)).toBe(true);
  });

  it('should return false when any field is different', () => {
    const sections: ComparePropertySection[] = [
      {
        id: 'basic',
        label: 'Basic',
        fields: [
          { key: 'a', label: 'A', valueA: '1', valueB: '2', diffStatus: 'different' },
        ],
        hasDifferences: true,
      },
    ];

    expect(areAllFieldsEqual(sections)).toBe(false);
  });
});

// =============================================================================
// TESTY formatNumber
// =============================================================================

describe('formatNumber', () => {
  it('should format number with Polish locale', () => {
    const result = formatNumber(1234.567, 2);
    // Polish uses comma as decimal separator and space as thousands separator
    expect(result).toContain('1');
    expect(result).toContain('234');
  });

  it('should return "—" for null', () => {
    expect(formatNumber(null)).toBe('—');
  });

  it('should return "—" for undefined', () => {
    expect(formatNumber(undefined)).toBe('—');
  });

  it('should respect decimal places', () => {
    const result = formatNumber(1.23456, 2);
    expect(result).toContain('23');
  });
});

// =============================================================================
// TESTY formatBoolean
// =============================================================================

describe('formatBoolean', () => {
  it('should return "Tak" for true', () => {
    expect(formatBoolean(true)).toBe('Tak');
  });

  it('should return "Nie" for false', () => {
    expect(formatBoolean(false)).toBe('Nie');
  });

  it('should return "—" for null', () => {
    expect(formatBoolean(null)).toBe('—');
  });

  it('should return "—" for undefined', () => {
    expect(formatBoolean(undefined)).toBe('—');
  });
});

// =============================================================================
// TESTY formatValue
// =============================================================================

describe('formatValue', () => {
  it('should format string values', () => {
    expect(formatValue('test')).toBe('test');
  });

  it('should format boolean values', () => {
    expect(formatValue(true)).toBe('Tak');
    expect(formatValue(false)).toBe('Nie');
  });

  it('should format number values', () => {
    const result = formatValue(42);
    expect(result).toContain('42');
  });

  it('should return "—" for null', () => {
    expect(formatValue(null)).toBe('—');
  });
});

// =============================================================================
// TESTY getDifferenceLabel
// =============================================================================

describe('getDifferenceLabel', () => {
  it('should return "różnica" for 1', () => {
    expect(getDifferenceLabel(1)).toBe('różnica');
  });

  it('should return "różnice" for 2-4', () => {
    expect(getDifferenceLabel(2)).toBe('różnice');
    expect(getDifferenceLabel(3)).toBe('różnice');
    expect(getDifferenceLabel(4)).toBe('różnice');
  });

  it('should return "różnic" for 5+', () => {
    expect(getDifferenceLabel(5)).toBe('różnic');
    expect(getDifferenceLabel(10)).toBe('różnic');
    expect(getDifferenceLabel(100)).toBe('różnic');
  });

  it('should return "różnic" for 0', () => {
    expect(getDifferenceLabel(0)).toBe('różnic');
  });
});
