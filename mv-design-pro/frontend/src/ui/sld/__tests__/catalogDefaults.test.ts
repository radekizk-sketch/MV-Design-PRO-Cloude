import { describe, expect, it } from 'vitest';

import {
  inferCatalogNamespaceFromElement,
  inferCatalogVersionFromElement,
} from '../catalogDefaults';

describe('catalogDefaults', () => {
  it('infers transformer namespace from backend snapshot shape', () => {
    expect(
      inferCatalogNamespaceFromElement({
        ref_id: 'stn/test/transformer',
        hv_bus_ref: 'bus/hv',
        lv_bus_ref: 'bus/lv',
        catalog_ref: 'tr-sn-nn-15-04-630kva-dyn11',
      }),
    ).toBe('TRAFO_SN_NN');
  });

  it('keeps canonical catalog version from snapshot meta', () => {
    expect(
      inferCatalogVersionFromElement({
        meta: { catalog_item_version: '2024.1' },
      }),
    ).toBe('2024.1');
  });
});
