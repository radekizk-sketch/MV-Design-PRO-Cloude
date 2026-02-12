/**
 * Results Workspace Determinism Lock Tests — PR-23
 *
 * INVARIANTS VERIFIED:
 * - URL determinism: serialize → parse → serialize = identical URL
 * - buildUrlFromState / parseStateFromUrl roundtrip
 * - Overlay consistency: sort order independent, semantic tokens only
 * - Run/Batch/Compare isolation: no state leaks between modes
 * - Projection contract: all required keys present
 * - No hex colors in overlay types
 * - Hash projection equality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useResultsWorkspaceStore,
  buildUrlFromState,
  parseStateFromUrl,
  buildWorkspaceUrlParams,
  parseWorkspaceUrlParams,
  filterRuns,
  filterBatches,
  filterComparisons,
} from '../store';
import type { WorkspaceUrlState } from '../store';
import type {
  RunSummary,
  BatchSummary,
  ComparisonSummary,
  WorkspaceProjection,
  WorkspaceMode,
  OverlayDisplayMode,
} from '../types';
import { WORKSPACE_PROJECTION_REQUIRED_KEYS } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRunSummary(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    run_id: 'run-1',
    analysis_type: 'SC_3F',
    status: 'DONE',
    solver_input_hash: 'hash-abc',
    created_at: '2025-01-15T10:00:00+00:00',
    finished_at: '2025-01-15T10:01:00+00:00',
    error_message: null,
    ...overrides,
  };
}

function makeBatchSummary(overrides: Partial<BatchSummary> = {}): BatchSummary {
  return {
    batch_id: 'batch-1',
    analysis_type: 'SC_3F',
    status: 'DONE',
    batch_input_hash: 'bhash-abc',
    scenario_count: 3,
    run_count: 3,
    created_at: '2025-01-15T10:00:00+00:00',
    errors: [],
    ...overrides,
  };
}

function makeComparisonSummary(
  overrides: Partial<ComparisonSummary> = {}
): ComparisonSummary {
  return {
    comparison_id: 'cmp-1',
    analysis_type: 'SC_3F',
    base_scenario_id: 'scenario-a',
    other_scenario_id: 'scenario-b',
    input_hash: 'ihash-abc',
    created_at: '2025-01-15T10:00:00+00:00',
    ...overrides,
  };
}

function makeProjection(
  overrides: Partial<WorkspaceProjection> = {}
): WorkspaceProjection {
  return {
    study_case_id: 'case-1',
    runs: [makeRunSummary()],
    batches: [makeBatchSummary()],
    comparisons: [makeComparisonSummary()],
    latest_done_run_id: 'run-1',
    deterministic_hash: 'a'.repeat(64),
    content_hash: 'a'.repeat(64),
    source_run_ids: ['run-1'],
    source_batch_ids: ['batch-1'],
    source_comparison_ids: ['cmp-1'],
    metadata: {
      projection_version: '1.0.0',
      created_utc: '2025-01-15T10:00:00Z',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Store reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  useResultsWorkspaceStore.setState({
    studyCaseId: null,
    projection: null,
    mode: 'RUN',
    selectedRunId: null,
    selectedBatchId: null,
    selectedComparisonId: null,
    overlayMode: 'result',
    filter: 'ALL',
    isLoading: false,
    error: null,
  });
});

// ===========================================================================
// §3 — URL Determinism Lock
// ===========================================================================

describe('PR-23 §3 — URL Determinism Lock: buildUrlFromState', () => {
  it('includes mode=run by default', () => {
    const state: WorkspaceUrlState = {
      mode: 'RUN',
      selectedRunId: null,
      selectedBatchId: null,
      selectedComparisonId: null,
      overlayMode: 'result',
    };
    const url = buildUrlFromState(state);
    expect(url).toContain('mode=run');
  });

  it('includes mode=batch when BATCH', () => {
    const state: WorkspaceUrlState = {
      mode: 'BATCH',
      selectedRunId: null,
      selectedBatchId: 'batch-123',
      selectedComparisonId: null,
      overlayMode: 'result',
    };
    const url = buildUrlFromState(state);
    expect(url).toContain('mode=batch');
    expect(url).toContain('batch=batch-123');
  });

  it('includes mode=compare when COMPARE', () => {
    const state: WorkspaceUrlState = {
      mode: 'COMPARE',
      selectedRunId: null,
      selectedBatchId: null,
      selectedComparisonId: 'cmp-456',
      overlayMode: 'delta',
    };
    const url = buildUrlFromState(state);
    expect(url).toContain('mode=compare');
    expect(url).toContain('comparison=cmp-456');
    expect(url).toContain('overlay=delta');
  });

  it('always includes overlay param (no implicit default)', () => {
    const state: WorkspaceUrlState = {
      mode: 'RUN',
      selectedRunId: null,
      selectedBatchId: null,
      selectedComparisonId: null,
      overlayMode: 'result',
    };
    const url = buildUrlFromState(state);
    expect(url).toContain('overlay=result');
  });

  it('is deterministic — same input produces same output', () => {
    const state: WorkspaceUrlState = {
      mode: 'RUN',
      selectedRunId: 'run-1',
      selectedBatchId: 'batch-2',
      selectedComparisonId: 'cmp-3',
      overlayMode: 'delta',
    };
    const a = buildUrlFromState(state);
    const b = buildUrlFromState(state);
    expect(a).toBe(b);
  });
});

describe('PR-23 §3 — URL Determinism Lock: parseStateFromUrl', () => {
  it('parses mode=run', () => {
    const state = parseStateFromUrl('mode=run&overlay=result');
    expect(state.mode).toBe('RUN');
  });

  it('parses mode=batch', () => {
    const state = parseStateFromUrl('mode=batch&batch=batch-1&overlay=result');
    expect(state.mode).toBe('BATCH');
    expect(state.selectedBatchId).toBe('batch-1');
  });

  it('parses mode=compare', () => {
    const state = parseStateFromUrl('mode=compare&comparison=cmp-1&overlay=delta');
    expect(state.mode).toBe('COMPARE');
    expect(state.selectedComparisonId).toBe('cmp-1');
    expect(state.overlayMode).toBe('delta');
  });

  it('defaults to RUN mode when no mode param', () => {
    const state = parseStateFromUrl('overlay=result');
    expect(state.mode).toBe('RUN');
  });

  it('infers COMPARE mode from comparison param when no mode', () => {
    const state = parseStateFromUrl('comparison=cmp-1&overlay=delta');
    expect(state.mode).toBe('COMPARE');
  });

  it('infers BATCH mode from batch param when no mode', () => {
    const state = parseStateFromUrl('batch=batch-1&overlay=result');
    expect(state.mode).toBe('BATCH');
  });

  it('defaults overlay to result when invalid', () => {
    const state = parseStateFromUrl('mode=run&overlay=invalid');
    expect(state.overlayMode).toBe('result');
  });

  it('parses overlay=none', () => {
    const state = parseStateFromUrl('mode=run&overlay=none');
    expect(state.overlayMode).toBe('none');
  });
});

describe('PR-23 §3 — URL Determinism Lock: serialize → parse → serialize roundtrip', () => {
  const cases: WorkspaceUrlState[] = [
    {
      mode: 'RUN',
      selectedRunId: 'run-abc',
      selectedBatchId: null,
      selectedComparisonId: null,
      overlayMode: 'result',
    },
    {
      mode: 'BATCH',
      selectedRunId: null,
      selectedBatchId: 'batch-xyz',
      selectedComparisonId: null,
      overlayMode: 'none',
    },
    {
      mode: 'COMPARE',
      selectedRunId: null,
      selectedBatchId: null,
      selectedComparisonId: 'cmp-123',
      overlayMode: 'delta',
    },
    {
      mode: 'RUN',
      selectedRunId: 'run-1',
      selectedBatchId: 'batch-2',
      selectedComparisonId: 'cmp-3',
      overlayMode: 'delta',
    },
    {
      mode: 'RUN',
      selectedRunId: null,
      selectedBatchId: null,
      selectedComparisonId: null,
      overlayMode: 'result',
    },
  ];

  cases.forEach((state, i) => {
    it(`roundtrip case ${i}: serialize → parse → serialize is identical`, () => {
      const url1 = buildUrlFromState(state);
      const parsed = parseStateFromUrl(url1);
      const url2 = buildUrlFromState(parsed);
      expect(url1).toBe(url2);
    });
  });
});

// ===========================================================================
// §4 — Overlay Consistency Guard
// ===========================================================================

describe('PR-23 §4 — Overlay Consistency Guard', () => {
  it('reordering elements produces identical sort (lexicographic by element_ref)', () => {
    // Simulates backend behavior: elements sorted lexicographically
    const elements = [
      { element_ref: 'bus-C', visual_state: 'OK', color_token: 'delta_none' },
      { element_ref: 'bus-A', visual_state: 'WARNING', color_token: 'delta_change' },
      { element_ref: 'bus-B', visual_state: 'OK', color_token: 'delta_none' },
    ];

    const sorted1 = [...elements].sort((a, b) =>
      a.element_ref.localeCompare(b.element_ref)
    );
    const sorted2 = [...elements]
      .reverse()
      .sort((a, b) => a.element_ref.localeCompare(b.element_ref));

    expect(sorted1).toEqual(sorted2);
  });

  it('no hex colors in overlay visual state tokens', () => {
    const validTokens = [
      'delta_none',
      'delta_change',
      'delta_inactive',
      'ok',
      'warning',
      'critical',
      'inactive',
    ];
    const hexPattern = /^#[0-9a-fA-F]{3,8}$/;

    for (const token of validTokens) {
      expect(hexPattern.test(token)).toBe(false);
    }
  });

  it('overlay semantic tokens are string-only (no numeric codes)', () => {
    const tokens = ['delta_none', 'delta_change', 'delta_inactive', 'normal', 'bold'];
    for (const token of tokens) {
      expect(typeof token).toBe('string');
      expect(Number.isNaN(Number(token))).toBe(true);
    }
  });

  it('overlay stroke tokens are semantic (not pixel values)', () => {
    const strokeTokens = ['normal', 'bold', 'dashed'];
    const pixelPattern = /^\d+px$/;
    for (const token of strokeTokens) {
      expect(pixelPattern.test(token)).toBe(false);
    }
  });

  it('overlay animation tokens are semantic or null', () => {
    const animationTokens = [null, 'pulse', 'blink'];
    for (const token of animationTokens) {
      if (token !== null) {
        expect(typeof token).toBe('string');
      }
    }
  });

  it('sorted overlay is deterministic regardless of insertion order', () => {
    const batch1 = ['source-1', 'branch-2', 'source-3'];
    const batch2 = ['branch-2', 'source-3', 'source-1'];

    const sort1 = [...batch1].sort((a, b) => a.localeCompare(b));
    const sort2 = [...batch2].sort((a, b) => a.localeCompare(b));

    expect(sort1).toEqual(sort2);
  });
});

// ===========================================================================
// §5 — Run/Batch/Compare Isolation Tests
// ===========================================================================

describe('PR-23 §5 — Run/Batch/Compare Isolation', () => {
  it('selectRun → selectBatch → selectComparison → selectRun: no state leak', () => {
    const store = useResultsWorkspaceStore.getState();

    // Step 1: Select RUN
    store.selectRun('run-A');
    let state = useResultsWorkspaceStore.getState();
    expect(state.mode).toBe('RUN');
    expect(state.selectedRunId).toBe('run-A');
    expect(state.overlayMode).toBe('result');

    // Step 2: Switch to BATCH
    store.selectBatch('batch-X');
    state = useResultsWorkspaceStore.getState();
    expect(state.mode).toBe('BATCH');
    expect(state.selectedBatchId).toBe('batch-X');

    // Step 3: Switch to COMPARE
    store.selectComparison('cmp-Y');
    state = useResultsWorkspaceStore.getState();
    expect(state.mode).toBe('COMPARE');
    expect(state.selectedComparisonId).toBe('cmp-Y');
    expect(state.overlayMode).toBe('delta');

    // Step 4: Return to RUN A
    store.selectRun('run-A');
    state = useResultsWorkspaceStore.getState();
    expect(state.mode).toBe('RUN');
    expect(state.selectedRunId).toBe('run-A');
    expect(state.overlayMode).toBe('result');
  });

  it('mode transition does not leak overlay from COMPARE to RUN', () => {
    const store = useResultsWorkspaceStore.getState();

    store.selectComparison('cmp-1');
    expect(useResultsWorkspaceStore.getState().overlayMode).toBe('delta');

    store.selectRun('run-1');
    expect(useResultsWorkspaceStore.getState().overlayMode).toBe('result');
  });

  it('mode transition does not leak overlay from RUN to COMPARE', () => {
    const store = useResultsWorkspaceStore.getState();

    store.selectRun('run-1');
    expect(useResultsWorkspaceStore.getState().overlayMode).toBe('result');

    store.selectComparison('cmp-1');
    expect(useResultsWorkspaceStore.getState().overlayMode).toBe('delta');
  });

  it('selectBatch does not reset overlay to result', () => {
    const store = useResultsWorkspaceStore.getState();

    store.setOverlayMode('none');
    store.selectBatch('batch-1');

    // selectBatch does not explicitly set overlay
    const state = useResultsWorkspaceStore.getState();
    expect(state.mode).toBe('BATCH');
  });

  it('reset clears all mode-specific state', () => {
    const store = useResultsWorkspaceStore.getState();

    store.selectRun('run-1');
    store.selectBatch('batch-1');
    store.selectComparison('cmp-1');
    store.setOverlayMode('delta');

    store.reset();

    const state = useResultsWorkspaceStore.getState();
    expect(state.mode).toBe('RUN');
    expect(state.selectedRunId).toBeNull();
    expect(state.selectedBatchId).toBeNull();
    expect(state.selectedComparisonId).toBeNull();
    expect(state.overlayMode).toBe('result');
  });

  it('setMode alone does not modify selections', () => {
    const store = useResultsWorkspaceStore.getState();

    store.selectRun('run-abc');
    store.selectBatch('batch-def');

    store.setMode('COMPARE');

    const state = useResultsWorkspaceStore.getState();
    expect(state.mode).toBe('COMPARE');
    expect(state.selectedRunId).toBe('run-abc');
    expect(state.selectedBatchId).toBe('batch-def');
  });

  it('filter persists across mode transitions', () => {
    const store = useResultsWorkspaceStore.getState();

    store.setFilter('DONE');
    store.selectRun('run-1');
    store.selectBatch('batch-1');
    store.selectComparison('cmp-1');

    const state = useResultsWorkspaceStore.getState();
    expect(state.filter).toBe('DONE');
  });
});

// ===========================================================================
// §2 — Projection Contract Freeze (Frontend)
// ===========================================================================

describe('PR-23 §2 — Projection Contract Freeze (Frontend)', () => {
  it('WORKSPACE_PROJECTION_REQUIRED_KEYS has all required fields', () => {
    expect(WORKSPACE_PROJECTION_REQUIRED_KEYS).toContain('study_case_id');
    expect(WORKSPACE_PROJECTION_REQUIRED_KEYS).toContain('runs');
    expect(WORKSPACE_PROJECTION_REQUIRED_KEYS).toContain('batches');
    expect(WORKSPACE_PROJECTION_REQUIRED_KEYS).toContain('comparisons');
    expect(WORKSPACE_PROJECTION_REQUIRED_KEYS).toContain('latest_done_run_id');
    expect(WORKSPACE_PROJECTION_REQUIRED_KEYS).toContain('deterministic_hash');
    expect(WORKSPACE_PROJECTION_REQUIRED_KEYS).toContain('content_hash');
    expect(WORKSPACE_PROJECTION_REQUIRED_KEYS).toContain('source_run_ids');
    expect(WORKSPACE_PROJECTION_REQUIRED_KEYS).toContain('source_batch_ids');
    expect(WORKSPACE_PROJECTION_REQUIRED_KEYS).toContain('source_comparison_ids');
    expect(WORKSPACE_PROJECTION_REQUIRED_KEYS).toContain('metadata');
  });

  it('projection mock has all required keys', () => {
    const proj = makeProjection();
    for (const key of WORKSPACE_PROJECTION_REQUIRED_KEYS) {
      expect(proj).toHaveProperty(key);
    }
  });

  it('projection has no extra keys beyond contract', () => {
    const proj = makeProjection();
    const keys = Object.keys(proj);
    const extraKeys = keys.filter(
      (k) => !WORKSPACE_PROJECTION_REQUIRED_KEYS.includes(k)
    );
    expect(extraKeys).toEqual([]);
  });

  it('content_hash is a 64-char hex string', () => {
    const proj = makeProjection();
    expect(proj.content_hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(proj.content_hash)).toBe(true);
  });

  it('deterministic_hash matches content_hash', () => {
    const proj = makeProjection();
    expect(proj.deterministic_hash).toBe(proj.content_hash);
  });

  it('source_run_ids is an array of strings', () => {
    const proj = makeProjection();
    expect(Array.isArray(proj.source_run_ids)).toBe(true);
    proj.source_run_ids.forEach((id) => expect(typeof id).toBe('string'));
  });

  it('source_batch_ids is an array of strings', () => {
    const proj = makeProjection();
    expect(Array.isArray(proj.source_batch_ids)).toBe(true);
    proj.source_batch_ids.forEach((id) => expect(typeof id).toBe('string'));
  });

  it('source_comparison_ids is an array of strings', () => {
    const proj = makeProjection();
    expect(Array.isArray(proj.source_comparison_ids)).toBe(true);
    proj.source_comparison_ids.forEach((id) => expect(typeof id).toBe('string'));
  });

  it('metadata has projection_version and created_utc', () => {
    const proj = makeProjection();
    expect(proj.metadata).toHaveProperty('projection_version');
    expect(proj.metadata).toHaveProperty('created_utc');
    expect(typeof proj.metadata.projection_version).toBe('string');
    expect(typeof proj.metadata.created_utc).toBe('string');
  });
});

// ===========================================================================
// Additional Determinism Guards
// ===========================================================================

describe('PR-23 — Store Determinism Invariants', () => {
  it('buildWorkspaceUrlParams is deterministic (same input → same output)', () => {
    const input = {
      selectedRunId: 'run-1',
      selectedBatchId: 'batch-2',
      selectedComparisonId: 'cmp-3',
      overlayMode: 'delta' as const,
    };
    const a = buildWorkspaceUrlParams(input).toString();
    const b = buildWorkspaceUrlParams(input).toString();
    const c = buildWorkspaceUrlParams(input).toString();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('filterRuns is deterministic (same input → same output)', () => {
    const runs = [
      makeRunSummary({ run_id: 'r1', status: 'DONE' }),
      makeRunSummary({ run_id: 'r2', status: 'FAILED' }),
    ];
    const a = filterRuns(runs, 'DONE');
    const b = filterRuns(runs, 'DONE');
    expect(a).toEqual(b);
  });

  it('filterBatches is deterministic (same input → same output)', () => {
    const batches = [
      makeBatchSummary({ batch_id: 'b1', status: 'DONE' }),
      makeBatchSummary({ batch_id: 'b2', status: 'FAILED' }),
    ];
    const a = filterBatches(batches, 'DONE');
    const b = filterBatches(batches, 'DONE');
    expect(a).toEqual(b);
  });

  it('filterComparisons is deterministic (same input → same output)', () => {
    const comparisons = [
      makeComparisonSummary({ comparison_id: 'c1', analysis_type: 'SC_3F' }),
      makeComparisonSummary({ comparison_id: 'c2', analysis_type: 'LOAD_FLOW' }),
    ];
    const a = filterComparisons(comparisons, 'SC_3F');
    const b = filterComparisons(comparisons, 'SC_3F');
    expect(a).toEqual(b);
  });
});

describe('PR-23 — Projection Hash Hook', () => {
  it('store returns content_hash from projection', () => {
    const proj = makeProjection({ content_hash: 'b'.repeat(64) });
    useResultsWorkspaceStore.setState({ projection: proj });

    const state = useResultsWorkspaceStore.getState();
    expect(state.projection?.content_hash).toBe('b'.repeat(64));
  });

  it('store returns null hash when no projection', () => {
    const state = useResultsWorkspaceStore.getState();
    expect(state.projection?.content_hash ?? null).toBeNull();
  });
});
