/**
 * Designer API Tests
 *
 * Tests for the Designer API client module.
 * Validates:
 * - ApiError class construction and properties
 * - fetchSnapshot: success and error handling
 * - fetchActions: success and error handling
 * - runAction: success and error handling
 * - HTTP status handling
 * - Response parsing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApiError, fetchSnapshot, fetchActions, runAction } from '../api';
import type { Snapshot, ActionItem, ActionRunResult } from '../types';

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const MOCK_SNAPSHOT: Snapshot = {
  meta: {
    snapshot_id: 'snap-001',
    parent_snapshot_id: null,
    schema_version: '1.0.0',
    created_at: '2025-01-15T10:00:00Z',
  },
  graph: {
    buses: [],
    branches: [],
  },
};

const MOCK_ACTIONS: ActionItem[] = [
  {
    action_id: 'act-1',
    action_type: 'ADD_BUS',
    label: 'Dodaj szyne',
    status: 'ALLOWED',
    blocked_reason: null,
  },
  {
    action_id: 'act-2',
    action_type: 'DELETE_BUS',
    label: 'Usun szyne',
    status: 'BLOCKED',
    blocked_reason: {
      code: 'BUS_IN_USE',
      description: 'Szyna jest podlaczona do galezi',
    },
  },
];

const MOCK_RUN_SUCCESS: ActionRunResult = {
  action_id: 'act-1',
  status: 'REQUESTED',
  message: 'Szyna dodana',
  new_snapshot_id: 'snap-002',
};

describe('ApiError', () => {
  it('should construct with all properties', () => {
    const error = new ApiError(404, 'Not Found', 'Element not found', '/snapshots/123');

    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.detail).toBe('Element not found');
    expect(error.endpoint).toBe('/snapshots/123');
    expect(error.name).toBe('ApiError');
    expect(error.message).toContain('404');
    expect(error.message).toContain('Not Found');
    expect(error.message).toContain('Element not found');
  });

  it('should handle null detail', () => {
    const error = new ApiError(500, 'Internal Server Error', null, '/snapshots/456');

    expect(error.detail).toBeNull();
    expect(error.message).toContain('No detail');
  });

  it('should be an instance of Error', () => {
    const error = new ApiError(400, 'Bad Request', 'Invalid input', '/test');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });
});

describe('fetchSnapshot', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch snapshot and return parsed response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_SNAPSHOT),
    });

    const result = await fetchSnapshot('snap-001');

    expect(result).toEqual(MOCK_SNAPSHOT);
    expect(mockFetch).toHaveBeenCalledWith('/snapshots/snap-001');
  });

  it('should throw ApiError on HTTP error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ detail: 'Snapshot not found' }),
    });

    await expect(fetchSnapshot('snap-999')).rejects.toThrow(ApiError);
    try {
      await fetchSnapshot('snap-999');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.detail).toBe('Snapshot not found');
    }
  });

  it('should handle non-JSON error response gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('Not JSON')),
    });

    await expect(fetchSnapshot('snap-bad')).rejects.toThrow(ApiError);
  });

  it('should construct correct endpoint from snapshot ID', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_SNAPSHOT),
    });

    await fetchSnapshot('my-snapshot-uuid');
    expect(mockFetch).toHaveBeenCalledWith('/snapshots/my-snapshot-uuid');
  });
});

describe('fetchActions', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should fetch actions with POST and empty body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_ACTIONS),
    });

    const result = await fetchActions('snap-001');

    expect(result).toEqual(MOCK_ACTIONS);
    expect(mockFetch).toHaveBeenCalledWith('/snapshots/snap-001/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  });

  it('should return both ALLOWED and BLOCKED actions', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_ACTIONS),
    });

    const actions = await fetchActions('snap-001');
    expect(actions).toHaveLength(2);

    const allowed = actions.filter(a => a.status === 'ALLOWED');
    const blocked = actions.filter(a => a.status === 'BLOCKED');
    expect(allowed).toHaveLength(1);
    expect(blocked).toHaveLength(1);
  });

  it('should throw ApiError on failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({ detail: 'Access denied' }),
    });

    await expect(fetchActions('snap-001')).rejects.toThrow(ApiError);
  });
});

describe('runAction', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should execute action with POST to correct endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_RUN_SUCCESS),
    });

    const result = await runAction('snap-001', 'act-1');

    expect(result).toEqual(MOCK_RUN_SUCCESS);
    expect(mockFetch).toHaveBeenCalledWith('/snapshots/snap-001/actions/act-1/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('should handle REJECTED action result', async () => {
    const rejectedResult: ActionRunResult = {
      action_id: 'act-2',
      status: 'REJECTED',
      reason: { code: 'BUS_IN_USE', description: 'Cannot delete' },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(rejectedResult),
    });

    const result = await runAction('snap-001', 'act-2');
    expect(result.status).toBe('REJECTED');
  });

  it('should throw ApiError on server error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ detail: 'Server error' }),
    });

    await expect(runAction('snap-001', 'act-1')).rejects.toThrow(ApiError);
  });

  it('should use correct URL structure for action run', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_RUN_SUCCESS),
    });

    await runAction('snap-abc', 'action-xyz');
    expect(mockFetch).toHaveBeenCalledWith(
      '/snapshots/snap-abc/actions/action-xyz/run',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
