/**
 * Wizard autosave debounce logic tests.
 *
 * Verifies:
 * 1. Debounce timer (500ms) prevents rapid saves
 * 2. Final value is saved after debounce period
 * 3. Multiple rapid changes result in single save
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test the debounce pattern in isolation (not the full React component)
// This mirrors the autosave logic from WizardPage.

const AUTOSAVE_DEBOUNCE_MS = 500;

describe('Wizard: autosave debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounce delays save by 500ms', () => {
    const saveFn = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function handleChange(value: string) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => saveFn(value), AUTOSAVE_DEBOUNCE_MS);
    }

    handleChange('a');
    expect(saveFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(499);
    expect(saveFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(saveFn).toHaveBeenCalledOnce();
    expect(saveFn).toHaveBeenCalledWith('a');
  });

  it('rapid changes only trigger one save with final value', () => {
    const saveFn = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function handleChange(value: string) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => saveFn(value), AUTOSAVE_DEBOUNCE_MS);
    }

    handleChange('a');
    vi.advanceTimersByTime(100);
    handleChange('ab');
    vi.advanceTimersByTime(100);
    handleChange('abc');
    vi.advanceTimersByTime(100);
    handleChange('abcd');

    // Not yet saved
    expect(saveFn).not.toHaveBeenCalled();

    // Wait for debounce
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);

    expect(saveFn).toHaveBeenCalledOnce();
    expect(saveFn).toHaveBeenCalledWith('abcd');
  });

  it('changes after debounce period trigger separate saves', () => {
    const saveFn = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function handleChange(value: string) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => saveFn(value), AUTOSAVE_DEBOUNCE_MS);
    }

    handleChange('first');
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith('first');

    handleChange('second');
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    expect(saveFn).toHaveBeenCalledTimes(2);
    expect(saveFn).toHaveBeenCalledWith('second');
  });
});
