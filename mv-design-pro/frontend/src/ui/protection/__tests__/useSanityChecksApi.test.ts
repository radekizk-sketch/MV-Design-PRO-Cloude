/**
 * useSanityChecks API Tests
 *
 * Testy integracji hooka useSanityChecks z API backendu.
 * Testuje: fetch, 404 fallback, error handling, loading state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchSanityChecks } from '../useSanityChecks';
import type { ProtectionSanityCheckResult } from '../sanity-types';

// =============================================================================
// fetchSanityChecks — API function tests
// =============================================================================

describe('fetchSanityChecks', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('zwraca dane z API przy pomyslnej odpowiedzi', async () => {
    const mockData: ProtectionSanityCheckResult[] = [
      {
        severity: 'ERROR',
        code: 'OC_OVERLAP',
        message_pl: 'Nakladanie sie progow I> i I>>',
        element_id: 'switch-001',
        element_type: 'Switch',
        function_ansi: '50/51',
        function_code: 'OVERCURRENT',
      },
    ];

    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as Response);

    const result = await fetchSanityChecks('project-123');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/project-123/protection-sanity-checks'
    );
    expect(result).toEqual(mockData);
  });

  it('zwraca pusta tablice przy odpowiedzi 404', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    const result = await fetchSanityChecks('project-nonexistent');

    expect(result).toEqual([]);
  });

  it('rzuca blad przy odpowiedzi 500', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(fetchSanityChecks('project-123')).rejects.toThrow(
      'Błąd pobierania wyników kontroli: 500'
    );
  });

  it('rzuca blad przy odpowiedzi 403', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as Response);

    await expect(fetchSanityChecks('project-123')).rejects.toThrow(
      'Błąd pobierania wyników kontroli: 403'
    );
  });

  it('zwraca pusta tablice gdy brak wynikow', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    } as Response);

    const result = await fetchSanityChecks('project-clean');

    expect(result).toEqual([]);
  });

  it('uzywa poprawnego endpointu z projectId', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    } as Response);

    await fetchSanityChecks('abc-def-456');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/abc-def-456/protection-sanity-checks'
    );
  });

  it('zwraca wyniki z roznymi severity', async () => {
    const mockData: ProtectionSanityCheckResult[] = [
      {
        severity: 'ERROR',
        code: 'OC_OVERLAP',
        message_pl: 'Nakladanie sie progow I> i I>>',
        element_id: 'switch-001',
        element_type: 'Switch',
      },
      {
        severity: 'WARN',
        code: 'OC_I_GT_TOO_LOW',
        message_pl: 'Prog I> zbyt niski',
        element_id: 'switch-002',
        element_type: 'Switch',
      },
      {
        severity: 'INFO',
        code: 'GEN_PARTIAL_ANALYSIS',
        message_pl: 'Brak danych bazowych',
        element_id: 'trafo-001',
        element_type: 'TransformerBranch',
      },
    ];

    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as Response);

    const result = await fetchSanityChecks('project-123');

    expect(result).toHaveLength(3);
    expect(result[0].severity).toBe('ERROR');
    expect(result[1].severity).toBe('WARN');
    expect(result[2].severity).toBe('INFO');
  });

  it('zwraca wyniki z evidence data', async () => {
    const mockData: ProtectionSanityCheckResult[] = [
      {
        severity: 'ERROR',
        code: 'OC_OVERLAP',
        message_pl: 'Nakladanie sie progow',
        element_id: 'switch-001',
        element_type: 'Switch',
        evidence: {
          i_gt_a: 600,
          i_inst_a: 500,
        },
      },
    ];

    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as Response);

    const result = await fetchSanityChecks('project-123');

    expect(result[0].evidence).toEqual({ i_gt_a: 600, i_inst_a: 500 });
  });

  it('propaguje blad sieciowy (fetch rejection)', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchSanityChecks('project-123')).rejects.toThrow(
      'Failed to fetch'
    );
  });
});
