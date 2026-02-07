/**
 * Voltage Color Scale Tests — PR-SLD-OVR-01
 *
 * Verifies voltage classification, color mapping, and EV status badge utilities.
 * Pure deterministic functions — no React rendering needed.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyVoltage,
  getVoltageTextColor,
  getVoltageBgColor,
  getVoltageSvgColor,
  getEvStatusColor,
  getEvStatusBadgeClass,
  getEvStatusLabel,
  VOLTAGE_SCALE_ENTRIES,
} from '../voltageColorScale';

// =============================================================================
// classifyVoltage
// =============================================================================

describe('classifyVoltage', () => {
  it('returns unknown for undefined', () => {
    expect(classifyVoltage(undefined)).toBe('unknown');
  });

  it('returns unknown for null', () => {
    expect(classifyVoltage(null)).toBe('unknown');
  });

  it('returns normal for 1.0 pu', () => {
    expect(classifyVoltage(1.0)).toBe('normal');
  });

  it('returns normal for 0.95 pu (boundary)', () => {
    expect(classifyVoltage(0.95)).toBe('normal');
  });

  it('returns normal for 1.05 pu (boundary)', () => {
    expect(classifyVoltage(1.05)).toBe('normal');
  });

  it('returns warning for 0.94 pu', () => {
    expect(classifyVoltage(0.94)).toBe('warning');
  });

  it('returns warning for 1.06 pu', () => {
    expect(classifyVoltage(1.06)).toBe('warning');
  });

  it('returns warning for 0.90 pu (boundary)', () => {
    expect(classifyVoltage(0.90)).toBe('warning');
  });

  it('returns critical for 0.89 pu', () => {
    expect(classifyVoltage(0.89)).toBe('critical');
  });

  it('returns critical for 1.11 pu', () => {
    expect(classifyVoltage(1.11)).toBe('critical');
  });

  it('returns critical for 0.0 pu (zero voltage)', () => {
    expect(classifyVoltage(0.0)).toBe('critical');
  });
});

// =============================================================================
// getVoltageTextColor
// =============================================================================

describe('getVoltageTextColor', () => {
  it('returns rose class for critical', () => {
    expect(getVoltageTextColor('critical')).toContain('text-rose');
  });

  it('returns amber class for warning', () => {
    expect(getVoltageTextColor('warning')).toContain('text-amber');
  });

  it('returns emerald class for normal', () => {
    expect(getVoltageTextColor('normal')).toContain('text-emerald');
  });

  it('returns slate class for unknown', () => {
    expect(getVoltageTextColor('unknown')).toContain('text-slate');
  });
});

// =============================================================================
// getVoltageBgColor
// =============================================================================

describe('getVoltageBgColor', () => {
  it('returns rose bg for critical', () => {
    expect(getVoltageBgColor('critical')).toContain('bg-rose');
  });

  it('returns amber bg for warning', () => {
    expect(getVoltageBgColor('warning')).toContain('bg-amber');
  });

  it('returns emerald bg for normal', () => {
    expect(getVoltageBgColor('normal')).toContain('bg-emerald');
  });

  it('returns slate bg for unknown', () => {
    expect(getVoltageBgColor('unknown')).toContain('bg-slate');
  });
});

// =============================================================================
// getVoltageSvgColor
// =============================================================================

describe('getVoltageSvgColor', () => {
  it('returns hex color for normal voltage', () => {
    const color = getVoltageSvgColor(1.0);
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(color).toBe('#059669'); // emerald-600
  });

  it('returns amber for warning voltage', () => {
    expect(getVoltageSvgColor(0.93)).toBe('#d97706');
  });

  it('returns rose for critical voltage', () => {
    expect(getVoltageSvgColor(0.85)).toBe('#e11d48');
  });

  it('returns slate for undefined', () => {
    expect(getVoltageSvgColor(undefined)).toBe('#64748b');
  });
});

// =============================================================================
// EV Status utilities
// =============================================================================

describe('getEvStatusColor', () => {
  it('returns rose for FAIL', () => {
    expect(getEvStatusColor('FAIL')).toContain('text-rose');
  });

  it('returns amber for WARNING', () => {
    expect(getEvStatusColor('WARNING')).toContain('text-amber');
  });

  it('returns emerald for PASS', () => {
    expect(getEvStatusColor('PASS')).toContain('text-emerald');
  });

  it('returns slate for NOT_COMPUTED', () => {
    expect(getEvStatusColor('NOT_COMPUTED')).toContain('text-slate');
  });

  it('returns slate for null', () => {
    expect(getEvStatusColor(null)).toContain('text-slate');
  });

  it('returns slate for undefined', () => {
    expect(getEvStatusColor(undefined)).toContain('text-slate');
  });
});

describe('getEvStatusBadgeClass', () => {
  it('returns non-empty class for FAIL', () => {
    const cls = getEvStatusBadgeClass('FAIL');
    expect(cls).toContain('bg-rose');
    expect(cls).toContain('text-rose');
    expect(cls).toContain('border-rose');
  });

  it('returns amber classes for WARNING', () => {
    const cls = getEvStatusBadgeClass('WARNING');
    expect(cls).toContain('bg-amber');
  });

  it('returns emerald classes for PASS', () => {
    const cls = getEvStatusBadgeClass('PASS');
    expect(cls).toContain('bg-emerald');
  });

  it('returns empty string for null', () => {
    expect(getEvStatusBadgeClass(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(getEvStatusBadgeClass(undefined)).toBe('');
  });
});

describe('getEvStatusLabel', () => {
  it('returns Polish label for FAIL', () => {
    expect(getEvStatusLabel('FAIL')).toBe('Przekroczenie');
  });

  it('returns Polish label for WARNING', () => {
    expect(getEvStatusLabel('WARNING')).toBe('Ostrzezenie');
  });

  it('returns OK for PASS', () => {
    expect(getEvStatusLabel('PASS')).toBe('OK');
  });

  it('returns Polish label for NOT_COMPUTED', () => {
    expect(getEvStatusLabel('NOT_COMPUTED')).toBe('Brak danych');
  });

  it('returns empty string for null', () => {
    expect(getEvStatusLabel(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(getEvStatusLabel(undefined)).toBe('');
  });

  it('returns empty string for unknown status', () => {
    expect(getEvStatusLabel('UNKNOWN_STATUS')).toBe('');
  });
});

// =============================================================================
// VOLTAGE_SCALE_ENTRIES
// =============================================================================

describe('VOLTAGE_SCALE_ENTRIES', () => {
  it('has 5 entries', () => {
    expect(VOLTAGE_SCALE_ENTRIES).toHaveLength(5);
  });

  it('all entries have label, color, and level', () => {
    for (const entry of VOLTAGE_SCALE_ENTRIES) {
      expect(entry.label).toBeTruthy();
      expect(entry.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(['normal', 'warning', 'critical']).toContain(entry.level);
    }
  });

  it('covers all voltage ranges', () => {
    const labels = VOLTAGE_SCALE_ENTRIES.map((e) => e.label);
    expect(labels.some((l) => l.includes('0.90'))).toBe(true);
    expect(labels.some((l) => l.includes('0.95'))).toBe(true);
    expect(labels.some((l) => l.includes('1.05'))).toBe(true);
    expect(labels.some((l) => l.includes('1.10'))).toBe(true);
  });
});
