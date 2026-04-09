import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  hasSnapshotDrift,
  resolveAvailableResultsTabs,
  resolveResultsRunId,
  resolveResultsSnapshotMode,
  updateResultsSnapshotMode,
} from '../viewState';

describe('results inspector view state', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/#results?run=run-123&sel=bus-1');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  describe('resolveResultsRunId', () => {
    it('prefers run from route over active run', () => {
      expect(resolveResultsRunId('run-z-url', 'run-aktywny')).toBe('run-z-url');
    });

    it('falls back to active run when route has no run', () => {
      expect(resolveResultsRunId(null, 'run-aktywny')).toBe('run-aktywny');
    });

    it('returns null when neither route nor app state has a run', () => {
      expect(resolveResultsRunId(undefined, null)).toBeNull();
    });
  });

  describe('resolveAvailableResultsTabs', () => {
    it('forces single trace tab for trace-only view', () => {
      expect(resolveAvailableResultsTabs('TRACE', true)).toEqual(['TRACE']);
    });

    it('includes short-circuit tab when results exist', () => {
      expect(resolveAvailableResultsTabs(undefined, true)).toEqual([
        'BUSES',
        'BRANCHES',
        'SHORT_CIRCUIT',
        'TRACE',
      ]);
    });

    it('omits short-circuit tab when run has no short-circuit table', () => {
      expect(resolveAvailableResultsTabs(undefined, false)).toEqual([
        'BUSES',
        'BRANCHES',
        'TRACE',
      ]);
    });
  });

  describe('resolveResultsSnapshotMode', () => {
    it('uses current model only when it is really available', () => {
      expect(resolveResultsSnapshotMode('current', true)).toBe('CURRENT_MODEL');
      expect(resolveResultsSnapshotMode('current', false)).toBe('RUN_SNAPSHOT');
    });

    it('defaults to run snapshot for missing or unknown route value', () => {
      expect(resolveResultsSnapshotMode(null, true)).toBe('RUN_SNAPSHOT');
      expect(resolveResultsSnapshotMode('run', true)).toBe('RUN_SNAPSHOT');
      expect(resolveResultsSnapshotMode('cokolwiek', true)).toBe('RUN_SNAPSHOT');
    });
  });

  describe('hasSnapshotDrift', () => {
    it('returns true only for distinct non-empty snapshot ids', () => {
      expect(hasSnapshotDrift('snap-run', 'snap-current')).toBe(true);
      expect(hasSnapshotDrift('snap-run', 'snap-run')).toBe(false);
      expect(hasSnapshotDrift('snap-run', null)).toBe(false);
      expect(hasSnapshotDrift('', 'snap-current')).toBe(false);
    });
  });

  describe('updateResultsSnapshotMode', () => {
    it('preserves current run and selection params while switching mode', () => {
      updateResultsSnapshotMode('CURRENT_MODEL');

      const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
      expect(params.get('run')).toBe('run-123');
      expect(params.get('sel')).toBe('bus-1');
      expect(params.get('snapshot')).toBe('current');
    });
  });
});
