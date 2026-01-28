import { describe, expect, it } from 'vitest';

import type { StepView } from '../types';
import {
  buildExportFilename,
  filterSteps,
  getViewConfig,
  groupStepsByCategory,
} from '../utils';

const steps: StepView[] = [
  {
    step_number: 1,
    step_id: 'SC3F_STEP_001',
    title: 'Napięcie z współczynnikiem c',
    equation_id: 'EQ_SC3F_001',
    formula_latex: '$$U = c \cdot U_n$$',
    input_values: [],
    substitution_latex: '$$U = 1.1 \cdot 15$$',
    result: {
      symbol: 'U',
      value: '16.5',
      unit: 'kV',
      mapping_key: 'u_prefault_kv',
    },
    unit_check: {
      passed: true,
      derivation: 'kV',
      expected_unit: 'kV',
      computed_unit: 'kV',
    },
  },
  {
    step_number: 2,
    step_id: 'VDROP_STEP_001',
    title: 'Rezystancja odcinka',
    equation_id: 'EQ_VDROP_001',
    formula_latex: '$$R = r \cdot l$$',
    input_values: [],
    substitution_latex: '$$R = 0.12 \cdot 2$$',
    result: {
      symbol: 'R',
      value: '0.24',
      unit: 'Ω',
      mapping_key: 'r_ohm',
    },
    unit_check: {
      passed: true,
      derivation: 'Ω',
      expected_unit: 'Ω',
      computed_unit: 'Ω',
    },
  },
  {
    step_number: 3,
    step_id: 'QU_STEP_001',
    title: 'Wartość Q zadana',
    equation_id: 'EQ_QU_001',
    formula_latex: '$$Q_{cmd} = Q_{raw}$$',
    input_values: [],
    substitution_latex: '$$Q_{cmd} = 2.5$$',
    result: {
      symbol: 'Q_{cmd}',
      value: '2.5',
      unit: 'Mvar',
      mapping_key: 'q_cmd_mvar',
    },
    unit_check: {
      passed: true,
      derivation: 'Mvar',
      expected_unit: 'Mvar',
      computed_unit: 'Mvar',
    },
  },
];

describe('proof inspector utils', () => {
  it('filters steps by title or equation id', () => {
    expect(filterSteps(steps, 'rezystancja')).toHaveLength(1);
    expect(filterSteps(steps, 'EQ_QU')).toHaveLength(1);
    expect(filterSteps(steps, 'brak')).toHaveLength(0);
  });

  it('groups steps by category in deterministic order', () => {
    const groups = groupStepsByCategory(steps);
    expect(groups).toHaveLength(4);
    expect(groups[0].label).toBe('SC3F');
    expect(groups[0].steps).toHaveLength(1);
    expect(groups[1].label).toBe('VDROP');
    expect(groups[1].steps).toHaveLength(1);
    expect(groups[2].label).toBe('Q(U)');
    expect(groups[2].steps).toHaveLength(1);
  });

  it('builds deterministic export filenames', () => {
    expect(buildExportFilename('Proof-123', 'RUN-99', 'json')).toBe(
      'proof_proof-123_run-99.json'
    );
  });

  it('returns view config per mode', () => {
    expect(getViewConfig('EXECUTIVE').showSteps).toBe(false);
    expect(getViewConfig('ENGINEERING').showMappingKeys).toBe(true);
    expect(getViewConfig('ACADEMIC').showAcademicDetails).toBe(true);
  });
});
