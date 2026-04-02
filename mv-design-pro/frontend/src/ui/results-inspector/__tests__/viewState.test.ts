import { describe, expect, it } from 'vitest';

import { resolveAvailableResultsTabs, resolveResultsRunId } from '../viewState';

describe('results inspector view state', () => {
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
});
