/**
 * Network Build Store — testy selektorów i store.
 *
 * Weryfikuje:
 * - computeBuildPhase zwraca deterministyczne fazy
 * - selectOpenTerminals sortuje po element_id
 * - selectBlockersByCategory grupuje poprawnie
 * - Store zarządza aktywnym formularzem
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeBuildPhase,
  selectOpenTerminals,
  selectBlockersByCategory,
  buildPhaseLabel,
  useNetworkBuildStore,
} from '../networkBuildStore';
import type { EnergyNetworkModel, LogicalViewsV1, ReadinessInfo } from '../../../types/enm';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function emptyENM(): EnergyNetworkModel {
  return {
    version: '1.0',
    buses: [],
    branches: [],
    transformers: [],
    sources: [],
    loads: [],
    generators: [],
    substations: [],
    bays: [],
  } as unknown as EnergyNetworkModel;
}

function enmWithSource(): EnergyNetworkModel {
  return {
    ...emptyENM(),
    sources: [{ ref_id: 'src-1', name: 'GPZ 1', bus_ref: 'bus-1', model: 'thevenin' }],
  } as unknown as EnergyNetworkModel;
}

// ---------------------------------------------------------------------------
// Tests: computeBuildPhase
// ---------------------------------------------------------------------------

describe('computeBuildPhase', () => {
  it('returns NO_SOURCE for null snapshot', () => {
    expect(computeBuildPhase(null, null, null)).toBe('NO_SOURCE');
  });

  it('returns NO_SOURCE for empty sources', () => {
    expect(computeBuildPhase(emptyENM(), null, null)).toBe('NO_SOURCE');
  });

  it('returns HAS_SOURCE when sources exist but no trunks', () => {
    expect(computeBuildPhase(enmWithSource(), { trunks: [], terminals: [], branches: [] } as unknown as LogicalViewsV1, null)).toBe('HAS_SOURCE');
  });

  it('returns HAS_TRUNKS when trunks exist but no substations', () => {
    const lv = { trunks: [{ id: 't1' }], terminals: [], branches: [] } as unknown as LogicalViewsV1;
    expect(computeBuildPhase(enmWithSource(), lv, null)).toBe('HAS_TRUNKS');
  });

  it('returns READY when readiness.ready is true', () => {
    const enm = { ...enmWithSource(), substations: [{ id: 's1', name: 'S1', station_type: 'A', transformer_refs: [], bus_refs: [] }] } as unknown as EnergyNetworkModel;
    const lv = { trunks: [{ id: 't1' }], terminals: [], branches: [] } as unknown as LogicalViewsV1;
    const readiness = { ready: true, blockers: [] } as ReadinessInfo;
    expect(computeBuildPhase(enm, lv, readiness)).toBe('READY');
  });
});

// ---------------------------------------------------------------------------
// Tests: selectOpenTerminals
// ---------------------------------------------------------------------------

describe('selectOpenTerminals', () => {
  it('returns empty for null logicalViews', () => {
    expect(selectOpenTerminals(null)).toEqual([]);
  });

  it('filters and sorts by element_id', () => {
    const lv = {
      terminals: [
        { element_id: 'b', status: 'OTWARTY', trunk_id: 't1' },
        { element_id: 'a', status: 'OTWARTY', trunk_id: 't1' },
        { element_id: 'c', status: 'ZAJETY', trunk_id: 't1' },
      ],
    } as unknown as LogicalViewsV1;

    const result = selectOpenTerminals(lv);
    expect(result).toHaveLength(2);
    expect(result[0].element_id).toBe('a');
    expect(result[1].element_id).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// Tests: selectBlockersByCategory
// ---------------------------------------------------------------------------

describe('selectBlockersByCategory', () => {
  it('returns zeroes for null readiness', () => {
    const result = selectBlockersByCategory(null);
    expect(result.total).toBe(0);
  });

  it('categorizes blockers correctly', () => {
    const readiness = {
      ready: false,
      blockers: [
        { code: 'topology_island', element_ref: 'e1' },
        { code: 'no_catalog_ref', element_ref: 'e2' },
        { code: 'switch_state_invalid', element_ref: 'e3' },
        { code: 'unknown_issue', element_ref: 'e4' },
      ],
    } as ReadinessInfo;

    const result = selectBlockersByCategory(readiness);
    expect(result.topologia).toBe(1);
    expect(result.katalogi).toBe(1);
    expect(result.eksploatacja).toBe(1);
    expect(result.analiza).toBe(1);
    expect(result.total).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Tests: buildPhaseLabel
// ---------------------------------------------------------------------------

describe('buildPhaseLabel', () => {
  it('returns Polish labels for all phases', () => {
    expect(buildPhaseLabel('NO_SOURCE')).toContain('Brak');
    expect(buildPhaseLabel('HAS_SOURCE')).toContain('Źródło');
    expect(buildPhaseLabel('HAS_TRUNKS')).toContain('Magistrale');
    expect(buildPhaseLabel('HAS_STATIONS')).toContain('Stacje');
    expect(buildPhaseLabel('READY')).toContain('Gotowy');
  });
});

// ---------------------------------------------------------------------------
// Tests: Store
// ---------------------------------------------------------------------------

describe('useNetworkBuildStore', () => {
  beforeEach(() => {
    useNetworkBuildStore.getState().reset();
  });

  it('starts with null activeOperationForm', () => {
    expect(useNetworkBuildStore.getState().activeOperationForm).toBeNull();
  });

  it('openOperationForm sets the form', () => {
    useNetworkBuildStore.getState().openOperationForm('add_grid_source_sn', { bus_ref: 'b1' });
    const form = useNetworkBuildStore.getState().activeOperationForm;
    expect(form).not.toBeNull();
    expect(form!.op).toBe('add_grid_source_sn');
  });

  it('closeOperationForm clears the form', () => {
    useNetworkBuildStore.getState().openOperationForm('add_grid_source_sn');
    useNetworkBuildStore.getState().closeOperationForm();
    expect(useNetworkBuildStore.getState().activeOperationForm).toBeNull();
  });

  it('toggleSection adds/removes from collapsedSections', () => {
    useNetworkBuildStore.getState().toggleSection('section-1');
    expect(useNetworkBuildStore.getState().collapsedSections.has('section-1')).toBe(true);
    useNetworkBuildStore.getState().toggleSection('section-1');
    expect(useNetworkBuildStore.getState().collapsedSections.has('section-1')).toBe(false);
  });
});
