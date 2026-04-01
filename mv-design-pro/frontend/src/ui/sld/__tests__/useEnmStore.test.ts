import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEnmStore } from '../useEnmStore';
import type { DomainOpResponse } from '../../../types/domainOps';

vi.mock('../domainOpsClient', () => ({
  executeDomainOp: vi.fn(),
}));

import { executeDomainOp } from '../domainOpsClient';

const mockExecuteDomainOp = vi.mocked(executeDomainOp);

const MOCK_RESPONSE: DomainOpResponse = {
  snapshot: { header: { hash_sha256: 'hash_2' } },
  logical_views: {},
  materialized_params: {
    lines_sn: {
      'seg-001': {
        catalog_item_id: 'cable-tfk-yakxs-3x120',
        catalog_item_version: '2024.1',
      },
    },
    transformers_sn_nn: {},
  },
  layout: {
    layout_hash: 'sha256:test-layout',
    layout_version: '1.0',
  },
  readiness: {
    ready: true,
    blockers: [],
    warnings: [],
  },
  fix_actions: [],
  changes: {
    created_element_ids: ['el-1'],
    updated_element_ids: [],
    deleted_element_ids: [],
  },
  selection_hint: {
    element_id: 'el-1',
    element_type: 'station',
    zoom_to: true,
  },
  audit_trail: [],
  domain_events: [],
};

describe('useEnmStore.executeOperation', () => {
  beforeEach(() => {
    useEnmStore.getState().reset();
    mockExecuteDomainOp.mockReset();
  });

  it('używa kanonicznego domainOpsClient i aktualizuje store odpowiedzią', async () => {
    mockExecuteDomainOp.mockResolvedValue(MOCK_RESPONSE);
    useEnmStore.setState({ snapshotHash: 'hash_1' });

    const result = await useEnmStore
      .getState()
      .executeOperation('case-1', 'continue_trunk_segment_sn', { terminal_ref: 't-01' });

    expect(mockExecuteDomainOp).toHaveBeenCalledWith(
      'case-1',
      'continue_trunk_segment_sn',
      { terminal_ref: 't-01' },
      'hash_1',
    );
    expect(result).toEqual(MOCK_RESPONSE);

    const state = useEnmStore.getState();
    expect(state.snapshotHash).toBe('hash_2');
    expect(state.selectedElementId).toBe('el-1');
    expect(state.readiness?.ready).toBe(true);
    expect(state.materializedParams?.lines_sn['seg-001']?.catalog_item_id).toBe('cable-tfk-yakxs-3x120');
    expect(state.layout?.layout_hash).toBe('sha256:test-layout');
    expect(state.lastError).toBeNull();
  });

  it('dla delete_element wywołuje kanoniczną operację i czyści selekcję usuniętego elementu', async () => {
    const deleteResponse: DomainOpResponse = {
      ...MOCK_RESPONSE,
      changes: {
        created_element_ids: [],
        updated_element_ids: [],
        deleted_element_ids: ['seg-001'],
      },
      selection_hint: null,
    };
    mockExecuteDomainOp.mockResolvedValue(deleteResponse);
    useEnmStore.setState({ snapshotHash: 'hash_1', selectedElementId: 'seg-001' });

    const result = await useEnmStore
      .getState()
      .executeOperation('case-1', 'delete_element', { element_ref: 'seg-001' });

    expect(mockExecuteDomainOp).toHaveBeenCalledWith(
      'case-1',
      'delete_element',
      { element_ref: 'seg-001' },
      'hash_1',
    );
    expect(result).toEqual(deleteResponse);
    expect(useEnmStore.getState().selectedElementId).toBeNull();
  });
});
