/**
 * useProtectionAssignment API Tests
 *
 * Testy integracji hooka useProtectionAssignment z API backendu.
 * Testuje: fetch, 404 fallback, error handling, loading state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchProtectionAssignments } from '../useProtectionAssignment';
import type { ElementProtectionAssignment } from '../element-assignment';

// =============================================================================
// fetchProtectionAssignments — API function tests
// =============================================================================

describe('fetchProtectionAssignments', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('zwraca dane z API przy pomyslnej odpowiedzi', async () => {
    const mockData: ElementProtectionAssignment[] = [
      {
        element_id: 'switch-001',
        element_type: 'Switch',
        device_id: 'relay-oc-001',
        device_name_pl: 'Przekaznik nadpradowy (F1)',
        device_kind: 'RELAY_OVERCURRENT',
        status: 'ACTIVE',
      },
    ];

    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as Response);

    const result = await fetchProtectionAssignments('project-123');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/project-123/protection-assignments'
    );
    expect(result).toEqual(mockData);
  });

  it('zwraca pusta tablice przy odpowiedzi 404', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    const result = await fetchProtectionAssignments('project-nonexistent');

    expect(result).toEqual([]);
  });

  it('rzuca blad przy odpowiedzi 500', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(fetchProtectionAssignments('project-123')).rejects.toThrow(
      'Błąd pobierania przypisań zabezpieczeń: 500'
    );
  });

  it('rzuca blad przy odpowiedzi 403', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as Response);

    await expect(fetchProtectionAssignments('project-123')).rejects.toThrow(
      'Błąd pobierania przypisań zabezpieczeń: 403'
    );
  });

  it('zwraca pusta tablice gdy brak przypisań', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    } as Response);

    const result = await fetchProtectionAssignments('project-empty');

    expect(result).toEqual([]);
  });

  it('uzywa poprawnego endpointu z projectId', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    } as Response);

    await fetchProtectionAssignments('abc-def-123');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/abc-def-123/protection-assignments'
    );
  });

  it('zwraca wiele przypisań dla roznych elementow', async () => {
    const mockData: ElementProtectionAssignment[] = [
      {
        element_id: 'switch-001',
        element_type: 'Switch',
        device_id: 'relay-oc-001',
        device_name_pl: 'Przekaznik nadpradowy (F1)',
        device_kind: 'RELAY_OVERCURRENT',
        status: 'ACTIVE',
      },
      {
        element_id: 'trafo-001',
        element_type: 'TransformerBranch',
        device_id: 'relay-diff-001',
        device_name_pl: 'Przekaznik roznicowy (T1)',
        device_kind: 'RELAY_DIFFERENTIAL',
        status: 'ACTIVE',
      },
      {
        element_id: 'line-001',
        element_type: 'LineBranch',
        device_id: 'relay-dist-001',
        device_name_pl: 'Przekaznik odleglosciowy (L1)',
        device_kind: 'RELAY_DISTANCE',
        status: 'BLOCKED',
      },
    ];

    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as Response);

    const result = await fetchProtectionAssignments('project-123');

    expect(result).toHaveLength(3);
    expect(result[0].element_id).toBe('switch-001');
    expect(result[1].element_id).toBe('trafo-001');
    expect(result[2].element_id).toBe('line-001');
  });

  it('propaguje blad sieciowy (fetch rejection)', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchProtectionAssignments('project-123')).rejects.toThrow(
      'Failed to fetch'
    );
  });
});
