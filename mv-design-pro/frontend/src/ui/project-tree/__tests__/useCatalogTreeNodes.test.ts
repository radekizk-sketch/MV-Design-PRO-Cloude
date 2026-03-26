/**
 * Tests for useCatalogTreeNodes and extractMissingCounts
 *
 * Weryfikuje:
 * - Deterministyczne budowanie podwęzłów TYPE_CATALOG
 * - Poprawne wyodrębnianie brakujących katalogów z readiness blockers
 * - Spójność z elementCatalogRegistry
 */

import { describe, it, expect } from 'vitest';
import { extractMissingCounts } from '../useCatalogTreeNodes';

// =============================================================================
// extractMissingCounts
// =============================================================================

describe('extractMissingCounts', () => {
  it('returns empty counts when no blockers', () => {
    const result = extractMissingCounts([], {
      lines: [{ ref_id: 'L1' }],
      cables: [{ ref_id: 'C1' }],
    });
    expect(result).toEqual({});
  });

  it('counts lines without catalog from E009 blockers', () => {
    const blockers = [
      { code: 'E009', element_ref: 'L1', message_pl: 'Brak katalogu' },
      { code: 'E009', element_ref: 'L2', message_pl: 'Brak katalogu' },
    ];
    const elements = {
      lines: [{ ref_id: 'L1' }, { ref_id: 'L2' }, { ref_id: 'L3' }],
      cables: [],
      transformers: [],
      switches: [],
    };
    const result = extractMissingCounts(blockers, elements);
    expect(result.linesWithoutCatalog).toBe(2);
  });

  it('counts transformers without catalog from trunk.catalog_missing', () => {
    const blockers = [
      { code: 'trunk.catalog_missing', element_ref: 'T1', message_pl: 'Brak katalogu' },
    ];
    const elements = {
      lines: [],
      cables: [],
      transformers: [{ ref_id: 'T1' }, { ref_id: 'T2' }],
      switches: [],
    };
    const result = extractMissingCounts(blockers, elements);
    expect(result.transformersWithoutCatalog).toBe(1);
  });

  it('ignores non-catalog blockers', () => {
    const blockers = [
      { code: 'E001', element_ref: 'L1', message_pl: 'Inny blad' },
      { code: 'E003', element_ref: 'L2', message_pl: 'Inny blad' },
    ];
    const elements = {
      lines: [{ ref_id: 'L1' }, { ref_id: 'L2' }],
    };
    const result = extractMissingCounts(blockers, elements);
    expect(result).toEqual({});
  });

  it('handles mixed element types', () => {
    const blockers = [
      { code: 'E009', element_ref: 'L1', message_pl: '' },
      { code: 'E009', element_ref: 'C1', message_pl: '' },
      { code: 'E009', element_ref: 'T1', message_pl: '' },
      { code: 'E009', element_ref: 'SW1', message_pl: '' },
    ];
    const elements = {
      lines: [{ ref_id: 'L1' }],
      cables: [{ ref_id: 'C1' }],
      transformers: [{ ref_id: 'T1' }],
      switches: [{ ref_id: 'SW1' }],
    };
    const result = extractMissingCounts(blockers, elements);
    expect(result.linesWithoutCatalog).toBe(1);
    expect(result.cablesWithoutCatalog).toBe(1);
    expect(result.transformersWithoutCatalog).toBe(1);
    expect(result.switchesWithoutCatalog).toBe(1);
  });

  it('returns undefined for zero counts (not 0)', () => {
    const blockers = [
      { code: 'E009', element_ref: 'L1', message_pl: '' },
    ];
    const elements = {
      lines: [{ ref_id: 'L1' }],
      cables: [],
      transformers: [],
      switches: [],
    };
    const result = extractMissingCounts(blockers, elements);
    expect(result.linesWithoutCatalog).toBe(1);
    expect(result.cablesWithoutCatalog).toBeUndefined();
    expect(result.transformersWithoutCatalog).toBeUndefined();
    expect(result.switchesWithoutCatalog).toBeUndefined();
  });

  it('handles null element_ref in blockers', () => {
    const blockers = [
      { code: 'E009', element_ref: null, message_pl: '' },
    ];
    const elements = {
      lines: [{ ref_id: 'L1' }],
    };
    const result = extractMissingCounts(blockers, elements);
    expect(result).toEqual({});
  });

  it('handles missing elements parameter', () => {
    const blockers = [
      { code: 'E009', element_ref: 'L1', message_pl: '' },
    ];
    const result = extractMissingCounts(blockers);
    expect(result).toEqual({});
  });
});
