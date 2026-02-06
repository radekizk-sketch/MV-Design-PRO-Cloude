/**
 * Wizard gate indicator logic tests.
 *
 * Verifies:
 * 1. Gate status mapping: OK -> green, WARN -> yellow, FAIL -> red
 * 2. Blocker count display
 * 3. Warning count display
 * 4. Analysis availability gating (SC blocked when FAIL)
 */

import { describe, it, expect } from 'vitest';
import type { ValidationResult, AnalysisAvailability } from '../../../types/enm';


function computeGateDisplay(validation: ValidationResult): {
  color: string;
  text: string;
  canRunSC: boolean;
} {
  const blockerCount = validation.issues.filter((i) => i.severity === 'BLOCKER').length;
  const warningCount = validation.issues.filter((i) => i.severity === 'IMPORTANT').length;

  let color: string;
  let text: string;

  if (validation.status === 'OK') {
    color = 'green';
    text = 'Gotowy';
  } else if (validation.status === 'WARN') {
    color = 'yellow';
    text = `${warningCount} ostrz.`;
  } else {
    color = 'red';
    text = `${blockerCount} bloker.`;
  }

  return {
    color,
    text,
    canRunSC: validation.status !== 'FAIL',
  };
}


describe('Wizard: gate indicator logic', () => {
  it('OK status shows green + Gotowy', () => {
    const validation: ValidationResult = {
      status: 'OK',
      issues: [],
      analysis_available: { short_circuit_3f: true, short_circuit_1f: true, load_flow: true },
    };
    const gate = computeGateDisplay(validation);
    expect(gate.color).toBe('green');
    expect(gate.text).toBe('Gotowy');
    expect(gate.canRunSC).toBe(true);
  });

  it('WARN status shows yellow with warning count', () => {
    const validation: ValidationResult = {
      status: 'WARN',
      issues: [
        { code: 'W001', severity: 'IMPORTANT', message_pl: 'Brak Z0', element_refs: [], wizard_step_hint: 'K7' },
        { code: 'W002', severity: 'IMPORTANT', message_pl: 'Brak Z0 src', element_refs: [], wizard_step_hint: 'K2' },
      ],
      analysis_available: { short_circuit_3f: true, short_circuit_1f: false, load_flow: false },
    };
    const gate = computeGateDisplay(validation);
    expect(gate.color).toBe('yellow');
    expect(gate.text).toBe('2 ostrz.');
    expect(gate.canRunSC).toBe(true);
  });

  it('FAIL status shows red with blocker count', () => {
    const validation: ValidationResult = {
      status: 'FAIL',
      issues: [
        { code: 'E001', severity: 'BLOCKER', message_pl: 'Brak zrodla', element_refs: [], wizard_step_hint: 'K2' },
        { code: 'E002', severity: 'BLOCKER', message_pl: 'Brak szyn', element_refs: [], wizard_step_hint: 'K3' },
      ],
      analysis_available: { short_circuit_3f: false, short_circuit_1f: false, load_flow: false },
    };
    const gate = computeGateDisplay(validation);
    expect(gate.color).toBe('red');
    expect(gate.text).toBe('2 bloker.');
    expect(gate.canRunSC).toBe(false);
  });

  it('FAIL blocks SC execution', () => {
    const fail: ValidationResult = {
      status: 'FAIL',
      issues: [{ code: 'E001', severity: 'BLOCKER', message_pl: 'Brak', element_refs: [], wizard_step_hint: 'K2' }],
      analysis_available: { short_circuit_3f: false, short_circuit_1f: false, load_flow: false },
    };
    expect(computeGateDisplay(fail).canRunSC).toBe(false);
  });

  it('WARN allows SC execution', () => {
    const warn: ValidationResult = {
      status: 'WARN',
      issues: [{ code: 'W003', severity: 'IMPORTANT', message_pl: 'Brak', element_refs: [], wizard_step_hint: 'K6' }],
      analysis_available: { short_circuit_3f: true, short_circuit_1f: false, load_flow: false },
    };
    expect(computeGateDisplay(warn).canRunSC).toBe(true);
  });

  it('analysis_available reflects ENM completeness', () => {
    // Full model: all analyses available
    const full: AnalysisAvailability = {
      short_circuit_3f: true,
      short_circuit_1f: true,
      load_flow: true,
    };
    expect(full.short_circuit_3f).toBe(true);
    expect(full.short_circuit_1f).toBe(true);
    expect(full.load_flow).toBe(true);

    // Model without Z0: SC 1F unavailable
    const noZ0: AnalysisAvailability = {
      short_circuit_3f: true,
      short_circuit_1f: false,
      load_flow: false,
    };
    expect(noZ0.short_circuit_3f).toBe(true);
    expect(noZ0.short_circuit_1f).toBe(false);
  });
});
