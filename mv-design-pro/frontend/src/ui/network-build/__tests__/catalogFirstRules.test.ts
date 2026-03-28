import { describe, expect, it } from 'vitest';
import { validateCatalogFirst } from '../forms/catalogFirstRules';

describe('catalogFirstRules', () => {
  it('blokuje segment magistrali bez katalogu', () => {
    const error = validateCatalogFirst('continue_trunk_segment_sn', {
      length_m: 200,
      catalog_binding: null,
    });
    expect(error).toMatch(/katalogu/i);
  });

  it('pozwala na segment magistrali z katalogiem', () => {
    const error = validateCatalogFirst('continue_trunk_segment_sn', {
      length_m: 200,
      catalog_binding: 'kabel-sn-001',
    });
    expect(error).toBeNull();
  });

  it('blokuje transformator bez catalog_ref', () => {
    const error = validateCatalogFirst('add_transformer_sn_nn', {
      catalog_ref: '',
    });
    expect(error).toMatch(/transformator/i);
  });

  it('blokuje BESS bez pełnych referencji katalogowych', () => {
    const error = validateCatalogFirst('add_bess_inverter_nn', {
      inverter_catalog_id: 'inv-1',
      storage_catalog_id: '',
    });
    expect(error).toMatch(/BESS/i);
  });

  it('blokuje słup rozgałęźny bez catalog_ref', () => {
    const error = validateCatalogFirst('insert_branch_pole_on_segment_sn', {
      segment_id: 'seg-1',
      catalog_ref: '',
    });
    expect(error).toMatch(/słupa rozgałęźnego/i);
  });

  it('blokuje ZKSN bez catalog_ref', () => {
    const error = validateCatalogFirst('insert_zksn_on_segment_sn', {
      segment_id: 'seg-1',
      catalog_ref: '',
    });
    expect(error).toMatch(/ZKSN/i);
  });
});
