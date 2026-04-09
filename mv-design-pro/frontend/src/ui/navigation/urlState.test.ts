import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { updateUrlWithSelection } from './urlState';

describe('urlState', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/#results?run=run-123&snapshot=run');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('preserves run and snapshot params while updating selection', () => {
    updateUrlWithSelection({
      id: 'bus-1',
      type: 'Bus',
      name: 'Szyna 1',
    });

    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    expect(params.get('run')).toBe('run-123');
    expect(params.get('snapshot')).toBe('run');
    expect(params.get('sel')).toBe('bus-1');
    expect(params.get('type')).toBe('Bus');
    expect(params.get('name')).toBe('Szyna 1');
  });
});
