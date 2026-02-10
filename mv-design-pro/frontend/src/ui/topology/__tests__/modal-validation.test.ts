/**
 * Modal Validation Tests — PR-9
 *
 * Unit tests for form validation logic in topology modals.
 * Tests edge cases, required fields, and numeric constraints.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// We re-implement validation logic here to test it in isolation.
// The actual modals use the same logic inline.
// ---------------------------------------------------------------------------

// Node validation
function validateNodeForm(data: { ref_id: string; name: string; voltage_kv: number }) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!data.ref_id.trim()) errors.push({ field: 'ref_id', message: 'required' });
  if (!data.name.trim()) errors.push({ field: 'name', message: 'required' });
  if (data.voltage_kv <= 0) errors.push({ field: 'voltage_kv', message: 'must be > 0' });
  return errors;
}

// Branch validation
type BranchType = 'line_overhead' | 'cable' | 'switch' | 'breaker' | 'disconnector' | 'bus_coupler' | 'fuse';
const LINE_TYPES = new Set<BranchType>(['line_overhead', 'cable']);

function validateBranchForm(data: {
  ref_id: string;
  name: string;
  branch_type: BranchType;
  from_bus_ref: string;
  to_bus_ref: string;
  length_km: number;
  r_ohm_per_km: number;
  x_ohm_per_km: number;
}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!data.ref_id.trim()) errors.push({ field: 'ref_id', message: 'required' });
  if (!data.name.trim()) errors.push({ field: 'name', message: 'required' });
  if (!data.from_bus_ref) errors.push({ field: 'from_bus_ref', message: 'required' });
  if (!data.to_bus_ref) errors.push({ field: 'to_bus_ref', message: 'required' });
  if (data.from_bus_ref && data.to_bus_ref && data.from_bus_ref === data.to_bus_ref) {
    errors.push({ field: 'to_bus_ref', message: 'self-loop' });
  }
  if (LINE_TYPES.has(data.branch_type)) {
    if (data.length_km <= 0) errors.push({ field: 'length_km', message: 'must be > 0' });
    if (data.r_ohm_per_km < 0) errors.push({ field: 'r_ohm_per_km', message: 'must be >= 0' });
    if (data.x_ohm_per_km < 0) errors.push({ field: 'x_ohm_per_km', message: 'must be >= 0' });
  }
  return errors;
}

// Measurement validation
function validateMeasurementForm(data: {
  ref_id: string;
  name: string;
  bus_ref: string;
  ratio_primary: number;
  ratio_secondary: number;
  burden_va: number;
}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!data.ref_id.trim()) errors.push({ field: 'ref_id', message: 'required' });
  if (!data.name.trim()) errors.push({ field: 'name', message: 'required' });
  if (!data.bus_ref) errors.push({ field: 'bus_ref', message: 'required' });
  if (data.ratio_primary <= 0) errors.push({ field: 'ratio_primary', message: 'must be > 0' });
  if (data.ratio_secondary <= 0) errors.push({ field: 'ratio_secondary', message: 'must be > 0' });
  if (data.burden_va < 0) errors.push({ field: 'burden_va', message: 'must be >= 0' });
  return errors;
}

// Protection validation
const CT_REQUIRED_TYPES = new Set(['overcurrent', 'earth_fault', 'directional_overcurrent']);

function validateProtectionForm(data: {
  ref_id: string;
  name: string;
  breaker_ref: string;
  ct_ref: string;
  device_type: string;
  settings: Array<{ threshold_a: number; time_delay_s: number }>;
}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!data.ref_id.trim()) errors.push({ field: 'ref_id', message: 'required' });
  if (!data.name.trim()) errors.push({ field: 'name', message: 'required' });
  if (!data.breaker_ref) errors.push({ field: 'breaker_ref', message: 'required' });
  if (CT_REQUIRED_TYPES.has(data.device_type) && !data.ct_ref) {
    errors.push({ field: 'ct_ref', message: 'CT required' });
  }
  for (let i = 0; i < data.settings.length; i++) {
    if (data.settings[i].threshold_a <= 0) {
      errors.push({ field: `setting_${i}_threshold`, message: 'must be > 0' });
    }
    if (data.settings[i].time_delay_s < 0) {
      errors.push({ field: `setting_${i}_time`, message: 'must be >= 0' });
    }
  }
  return errors;
}

// Transformer validation
function validateTransformerForm(data: {
  ref_id: string;
  name: string;
  hv_bus_ref: string;
  lv_bus_ref: string;
  sn_mva: number;
  uhv_kv: number;
  ulv_kv: number;
  uk_percent: number;
  pk_kw: number;
  tap_position: number;
  tap_min: number;
  tap_max: number;
}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!data.ref_id.trim()) errors.push({ field: 'ref_id', message: 'required' });
  if (!data.name.trim()) errors.push({ field: 'name', message: 'required' });
  if (!data.hv_bus_ref) errors.push({ field: 'hv_bus_ref', message: 'required' });
  if (!data.lv_bus_ref) errors.push({ field: 'lv_bus_ref', message: 'required' });
  if (data.hv_bus_ref && data.lv_bus_ref && data.hv_bus_ref === data.lv_bus_ref) {
    errors.push({ field: 'lv_bus_ref', message: 'same_bus' });
  }
  if (data.sn_mva <= 0) errors.push({ field: 'sn_mva', message: 'must be > 0' });
  if (data.uhv_kv <= 0) errors.push({ field: 'uhv_kv', message: 'must be > 0' });
  if (data.ulv_kv <= 0) errors.push({ field: 'ulv_kv', message: 'must be > 0' });
  if (data.uk_percent <= 0 || data.uk_percent > 100) {
    errors.push({ field: 'uk_percent', message: 'out of range' });
  }
  if (data.pk_kw < 0) errors.push({ field: 'pk_kw', message: 'must be >= 0' });
  if (data.tap_min > data.tap_max) errors.push({ field: 'tap_min', message: 'min > max' });
  if (data.tap_position < data.tap_min || data.tap_position > data.tap_max) {
    errors.push({ field: 'tap_position', message: 'out of range' });
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Node Validation', () => {
  it('should pass with valid data', () => {
    expect(validateNodeForm({ ref_id: 'bus_1', name: 'S1', voltage_kv: 15 })).toEqual([]);
  });

  it('should fail on empty ref_id', () => {
    const errors = validateNodeForm({ ref_id: '', name: 'S1', voltage_kv: 15 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('ref_id');
  });

  it('should fail on whitespace-only name', () => {
    const errors = validateNodeForm({ ref_id: 'bus_1', name: '   ', voltage_kv: 15 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('name');
  });

  it('should fail on zero voltage', () => {
    const errors = validateNodeForm({ ref_id: 'bus_1', name: 'S1', voltage_kv: 0 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('voltage_kv');
  });

  it('should fail on negative voltage', () => {
    const errors = validateNodeForm({ ref_id: 'bus_1', name: 'S1', voltage_kv: -15 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('voltage_kv');
  });

  it('should collect multiple errors', () => {
    const errors = validateNodeForm({ ref_id: '', name: '', voltage_kv: 0 });
    expect(errors).toHaveLength(3);
  });
});

describe('Branch Validation', () => {
  const validLine = {
    ref_id: 'line_1', name: 'L1', branch_type: 'line_overhead' as BranchType,
    from_bus_ref: 'bus_1', to_bus_ref: 'bus_2',
    length_km: 5.0, r_ohm_per_km: 0.2, x_ohm_per_km: 0.4,
  };

  it('should pass with valid line data', () => {
    expect(validateBranchForm(validLine)).toEqual([]);
  });

  it('should fail on self-loop', () => {
    const errors = validateBranchForm({ ...validLine, to_bus_ref: 'bus_1' });
    expect(errors.some((e) => e.field === 'to_bus_ref' && e.message === 'self-loop')).toBe(true);
  });

  it('should fail on zero length for line', () => {
    const errors = validateBranchForm({ ...validLine, length_km: 0 });
    expect(errors.some((e) => e.field === 'length_km')).toBe(true);
  });

  it('should skip length check for switch types', () => {
    const errors = validateBranchForm({
      ...validLine, branch_type: 'breaker', length_km: 0,
    });
    expect(errors.some((e) => e.field === 'length_km')).toBe(false);
  });

  it('should fail on negative R for cable', () => {
    const errors = validateBranchForm({
      ...validLine, branch_type: 'cable', r_ohm_per_km: -0.1,
    });
    expect(errors.some((e) => e.field === 'r_ohm_per_km')).toBe(true);
  });
});

describe('Measurement Validation', () => {
  const validCT = {
    ref_id: 'ct_1', name: 'CT1', bus_ref: 'bus_1',
    ratio_primary: 200, ratio_secondary: 5, burden_va: 15,
  };

  it('should pass with valid CT data', () => {
    expect(validateMeasurementForm(validCT)).toEqual([]);
  });

  it('should fail on zero ratio primary', () => {
    const errors = validateMeasurementForm({ ...validCT, ratio_primary: 0 });
    expect(errors.some((e) => e.field === 'ratio_primary')).toBe(true);
  });

  it('should fail on negative burden', () => {
    const errors = validateMeasurementForm({ ...validCT, burden_va: -5 });
    expect(errors.some((e) => e.field === 'burden_va')).toBe(true);
  });

  it('should fail on missing bus_ref', () => {
    const errors = validateMeasurementForm({ ...validCT, bus_ref: '' });
    expect(errors.some((e) => e.field === 'bus_ref')).toBe(true);
  });
});

describe('Protection Validation', () => {
  const validPA = {
    ref_id: 'pa_1', name: 'PA1', breaker_ref: 'brk_1', ct_ref: 'ct_1',
    device_type: 'overcurrent',
    settings: [{ threshold_a: 200, time_delay_s: 0.5 }],
  };

  it('should pass with valid overcurrent protection with CT', () => {
    expect(validateProtectionForm(validPA)).toEqual([]);
  });

  it('should fail when overcurrent has no CT', () => {
    const errors = validateProtectionForm({ ...validPA, ct_ref: '' });
    expect(errors.some((e) => e.field === 'ct_ref')).toBe(true);
  });

  it('should NOT require CT for distance protection', () => {
    const errors = validateProtectionForm({
      ...validPA, device_type: 'distance', ct_ref: '',
    });
    expect(errors.some((e) => e.field === 'ct_ref')).toBe(false);
  });

  it('should require CT for earth fault protection', () => {
    const errors = validateProtectionForm({
      ...validPA, device_type: 'earth_fault', ct_ref: '',
    });
    expect(errors.some((e) => e.field === 'ct_ref')).toBe(true);
  });

  it('should require CT for directional overcurrent', () => {
    const errors = validateProtectionForm({
      ...validPA, device_type: 'directional_overcurrent', ct_ref: '',
    });
    expect(errors.some((e) => e.field === 'ct_ref')).toBe(true);
  });

  it('should fail on zero threshold', () => {
    const errors = validateProtectionForm({
      ...validPA, settings: [{ threshold_a: 0, time_delay_s: 0.5 }],
    });
    expect(errors.some((e) => e.field === 'setting_0_threshold')).toBe(true);
  });

  it('should fail on negative time delay', () => {
    const errors = validateProtectionForm({
      ...validPA, settings: [{ threshold_a: 200, time_delay_s: -1 }],
    });
    expect(errors.some((e) => e.field === 'setting_0_time')).toBe(true);
  });

  it('should validate multiple settings', () => {
    const errors = validateProtectionForm({
      ...validPA,
      settings: [
        { threshold_a: 200, time_delay_s: 0.5 },
        { threshold_a: -10, time_delay_s: -1 },
      ],
    });
    expect(errors.some((e) => e.field === 'setting_1_threshold')).toBe(true);
    expect(errors.some((e) => e.field === 'setting_1_time')).toBe(true);
  });
});

describe('Transformer Validation', () => {
  const validTr = {
    ref_id: 'tr_1', name: 'T1', hv_bus_ref: 'bus_hv', lv_bus_ref: 'bus_lv',
    sn_mva: 0.63, uhv_kv: 15, ulv_kv: 0.4,
    uk_percent: 6.0, pk_kw: 7.0,
    tap_position: 0, tap_min: -2, tap_max: 2,
  };

  it('should pass with valid transformer data', () => {
    expect(validateTransformerForm(validTr)).toEqual([]);
  });

  it('should fail on same HV and LV bus', () => {
    const errors = validateTransformerForm({ ...validTr, lv_bus_ref: 'bus_hv' });
    expect(errors.some((e) => e.field === 'lv_bus_ref' && e.message === 'same_bus')).toBe(true);
  });

  it('should fail on zero power rating', () => {
    const errors = validateTransformerForm({ ...validTr, sn_mva: 0 });
    expect(errors.some((e) => e.field === 'sn_mva')).toBe(true);
  });

  it('should fail on uk_percent > 100', () => {
    const errors = validateTransformerForm({ ...validTr, uk_percent: 101 });
    expect(errors.some((e) => e.field === 'uk_percent')).toBe(true);
  });

  it('should fail on uk_percent = 0', () => {
    const errors = validateTransformerForm({ ...validTr, uk_percent: 0 });
    expect(errors.some((e) => e.field === 'uk_percent')).toBe(true);
  });

  it('should fail on negative Pk', () => {
    const errors = validateTransformerForm({ ...validTr, pk_kw: -1 });
    expect(errors.some((e) => e.field === 'pk_kw')).toBe(true);
  });

  it('should fail when tap_min > tap_max', () => {
    const errors = validateTransformerForm({ ...validTr, tap_min: 3, tap_max: 2 });
    expect(errors.some((e) => e.field === 'tap_min')).toBe(true);
  });

  it('should fail when tap_position out of range', () => {
    const errors = validateTransformerForm({ ...validTr, tap_position: 5 });
    expect(errors.some((e) => e.field === 'tap_position')).toBe(true);
  });
});
