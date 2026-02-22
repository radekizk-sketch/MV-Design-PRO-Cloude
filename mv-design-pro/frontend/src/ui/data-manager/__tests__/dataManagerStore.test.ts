import { describe, it, expect, beforeEach } from 'vitest';
import { useDataManagerUIStore } from '../store';
import type { ElementType, DataManagerSort, DataManagerFilter } from '../../types';

beforeEach(() => {
  // Reset Zustand store between tests
  useDataManagerUIStore.setState({
    selectedElementType: null,
    columnViewPreset: 'BASIC',
    sortByType: {},
    filterByType: {},
    searchQueryByType: {},
  });
});

describe('DataManagerUIStore', () => {
  it('has correct initial state', () => {
    const state = useDataManagerUIStore.getState();
    expect(state.selectedElementType).toBeNull();
    expect(state.columnViewPreset).toBe('BASIC');
    expect(state.sortByType).toEqual({});
    expect(state.filterByType).toEqual({});
    expect(state.searchQueryByType).toEqual({});
  });

  it('sets selected element type', () => {
    useDataManagerUIStore.getState().setSelectedElementType('Bus' as ElementType);
    expect(useDataManagerUIStore.getState().selectedElementType).toBe('Bus');
  });

  it('sets column view preset', () => {
    useDataManagerUIStore.getState().setColumnViewPreset('EXTENDED' as any);
    expect(useDataManagerUIStore.getState().columnViewPreset).toBe('EXTENDED');
  });

  it('sets sort per element type', () => {
    const sort: DataManagerSort = { column: 'voltage_kv', direction: 'desc' };
    useDataManagerUIStore.getState().setSort('Bus' as ElementType, sort);
    expect(useDataManagerUIStore.getState().sortByType['Bus']).toEqual(sort);
  });

  it('sets filter per element type', () => {
    const filter: DataManagerFilter = {
      inServiceOnly: true,
      withTypeOnly: false,
      withoutTypeOnly: false,
      switchStateFilter: 'ALL',
      showErrorsOnly: false,
    };
    useDataManagerUIStore.getState().setFilter('Branch' as ElementType, filter);
    expect(useDataManagerUIStore.getState().filterByType['Branch']).toEqual(filter);
  });

  it('sets search query per element type', () => {
    useDataManagerUIStore.getState().setSearchQuery('Bus' as ElementType, 'szyna');
    expect(useDataManagerUIStore.getState().searchQueryByType['Bus']).toBe('szyna');
  });

  it('resets filters for element type', () => {
    // Set some filters first
    useDataManagerUIStore.getState().setFilter('Bus' as ElementType, {
      inServiceOnly: true,
      withTypeOnly: true,
      withoutTypeOnly: false,
      switchStateFilter: 'ALL',
      showErrorsOnly: true,
    });
    useDataManagerUIStore.getState().setSearchQuery('Bus' as ElementType, 'test');

    // Reset
    useDataManagerUIStore.getState().resetFilters('Bus' as ElementType);

    const state = useDataManagerUIStore.getState();
    expect(state.filterByType['Bus'].inServiceOnly).toBe(false);
    expect(state.filterByType['Bus'].showErrorsOnly).toBe(false);
    expect(state.searchQueryByType['Bus']).toBe('');
  });

  it('keeps other element type state when updating one', () => {
    useDataManagerUIStore.getState().setSearchQuery('Bus' as ElementType, 'bus-query');
    useDataManagerUIStore.getState().setSearchQuery('Branch' as ElementType, 'branch-query');

    expect(useDataManagerUIStore.getState().searchQueryByType['Bus']).toBe('bus-query');
    expect(useDataManagerUIStore.getState().searchQueryByType['Branch']).toBe('branch-query');
  });
});
