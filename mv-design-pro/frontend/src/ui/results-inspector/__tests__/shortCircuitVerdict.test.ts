/**
 * UI-03: Short Circuit Verdict Tests
 *
 * Testy logiki werdyktu porównania Ik vs Icu.
 */

import { describe, it, expect } from 'vitest';
import { calculateShortCircuitVerdict, formatMargin } from '../shortCircuitVerdict';

describe('calculateShortCircuitVerdict', () => {
  describe('PASS verdict (margin > 15%)', () => {
    it('returns PASS when margin is greater than 15%', () => {
      // Ik = 10 kA, Icu = 20 kA → margin = 50%
      const result = calculateShortCircuitVerdict(10, 20);
      expect(result.verdict).toBe('PASS');
      expect(result.margin_pct).toBeCloseTo(50);
      expect(result.notes).toContain('wystarczająca');
    });

    it('returns PASS for edge case just above 15%', () => {
      // margin = (25 - 21) / 25 * 100 = 16%
      const result = calculateShortCircuitVerdict(21, 25);
      expect(result.verdict).toBe('PASS');
      expect(result.margin_pct).toBeCloseTo(16);
    });
  });

  describe('MARGINAL verdict (0% ≤ margin ≤ 15%)', () => {
    it('returns MARGINAL when margin is between 0 and 15%', () => {
      // Ik = 18 kA, Icu = 20 kA → margin = 10%
      const result = calculateShortCircuitVerdict(18, 20);
      expect(result.verdict).toBe('MARGINAL');
      expect(result.margin_pct).toBeCloseTo(10);
      expect(result.recommendation).toContain('Rozważ');
    });

    it('returns MARGINAL for exact 15% margin', () => {
      // margin = (20 - 17) / 20 * 100 = 15%
      const result = calculateShortCircuitVerdict(17, 20);
      expect(result.verdict).toBe('MARGINAL');
      expect(result.margin_pct).toBeCloseTo(15);
    });

    it('returns MARGINAL for 0% margin', () => {
      // Ik = Icu → margin = 0%
      const result = calculateShortCircuitVerdict(20, 20);
      expect(result.verdict).toBe('MARGINAL');
      expect(result.margin_pct).toBeCloseTo(0);
    });
  });

  describe('FAIL verdict (margin < 0%)', () => {
    it('returns FAIL when Ik exceeds Icu', () => {
      // Ik = 25 kA, Icu = 20 kA → margin = -25%
      const result = calculateShortCircuitVerdict(25, 20);
      expect(result.verdict).toBe('FAIL');
      expect(result.margin_pct).toBeCloseTo(-25);
      expect(result.recommendation).toContain('WYMAGANA WYMIANA');
    });
  });

  describe('ERROR verdict (missing data)', () => {
    it('returns ERROR when Ik is null', () => {
      const result = calculateShortCircuitVerdict(null, 20);
      expect(result.verdict).toBe('ERROR');
      expect(result.margin_pct).toBeNull();
    });

    it('returns ERROR when Icu is null', () => {
      const result = calculateShortCircuitVerdict(10, null);
      expect(result.verdict).toBe('ERROR');
      expect(result.margin_pct).toBeNull();
      expect(result.notes).toContain('Brak danych');
    });

    it('returns ERROR when both are null', () => {
      const result = calculateShortCircuitVerdict(null, null);
      expect(result.verdict).toBe('ERROR');
      expect(result.margin_pct).toBeNull();
    });
  });
});

describe('formatMargin', () => {
  it('formats positive margin with percentage', () => {
    expect(formatMargin(15.5)).toBe('15.5%');
  });

  it('formats negative margin with percentage', () => {
    expect(formatMargin(-10.2)).toBe('-10.2%');
  });

  it('formats zero margin', () => {
    expect(formatMargin(0)).toBe('0.0%');
  });

  it('returns em-dash for null', () => {
    expect(formatMargin(null)).toBe('—');
  });
});
