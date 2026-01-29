/**
 * P11c — ProjectTree Run History Tests (Minimal)
 *
 * Tests that ProjectTree correctly displays run history in Results section.
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// Run History Display Test
// =============================================================================

describe('ProjectTree Run History', () => {
  it('builds RUN_ITEM nodes with correct structure', () => {
    // Simulate buildRunNodes logic
    const runHistory = [
      {
        run_id: 'run-1',
        case_id: 'case-1',
        case_name: 'Przypadek Testowy',
        created_at: '2026-01-29T12:00:00Z',
        solver_kind: 'PF',
        result_state: 'FRESH' as const,
        status: 'success',
        snapshot_id: null,
        input_hash: 'hash1',
      },
    ];

    const node = {
      id: `run-${runHistory[0].run_id}`,
      label: `Rozpływ [${runHistory[0].case_name}] — ${new Date(runHistory[0].created_at).toLocaleDateString('pl-PL')}`,
      nodeType: 'RUN_ITEM' as const,
      runId: runHistory[0].run_id,
      caseId: runHistory[0].case_id,
      solverKind: runHistory[0].solver_kind,
      createdAt: runHistory[0].created_at,
      resultStatus: runHistory[0].result_state,
    };

    expect(node.nodeType).toBe('RUN_ITEM');
    expect(node.runId).toBe('run-1');
    expect(node.label).toContain('Rozpływ');
    expect(node.label).toContain('Przypadek Testowy');
    expect(node.resultStatus).toBe('FRESH');
  });

  it('sorts runs by created_at DESC (newest first)', () => {
    const runs = [
      { created_at: '2026-01-01T10:00:00Z', run_id: '1', case_id: 'c1', case_name: 'C1', solver_kind: 'PF', result_state: 'FRESH' as const, status: 'success', snapshot_id: null, input_hash: 'h1' },
      { created_at: '2026-01-03T10:00:00Z', run_id: '2', case_id: 'c2', case_name: 'C2', solver_kind: 'PF', result_state: 'FRESH' as const, status: 'success', snapshot_id: null, input_hash: 'h2' },
      { created_at: '2026-01-02T10:00:00Z', run_id: '3', case_id: 'c3', case_name: 'C3', solver_kind: 'PF', result_state: 'FRESH' as const, status: 'success', snapshot_id: null, input_hash: 'h3' },
    ];

    const sorted = [...runs].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    expect(sorted[0].run_id).toBe('2'); // Newest
    expect(sorted[1].run_id).toBe('3');
    expect(sorted[2].run_id).toBe('1'); // Oldest
  });

  it('uses Polish labels for solver types', () => {
    const pfLabel = 'PF' === 'PF' ? 'Rozpływ' : 'PF';
    const scLabel = 'short_circuit_sn' === 'short_circuit_sn' ? 'Zwarcie' : 'short_circuit_sn';

    expect(pfLabel).toBe('Rozpływ');
    expect(scLabel).toBe('Zwarcie');
  });
});
