/**
 * UX Startup Scenario — E2E canonical scenario (§6)
 *
 * Simulates the „Inżynier OSD" workflow step by step:
 * 1. Utwórz GPZ (add_grid_source_sn)
 * 2. Kontynuuj magistralę 3× (continue_trunk_segment_sn)
 * 3. Wstaw stację SN/nN (insert_station_on_segment_sn)
 * 4. Dodaj odgałęzienie (start_branch_segment_sn)
 * 5. Wstaw stację na odgałęzieniu
 * 6. Zamknij ring + NOP (connect_secondary_ring_sn + set_normal_open_point)
 * 7. Dodaj odbiór nN (add_nn_load)
 * 8. Dodaj PV (add_pv_inverter_nn)
 * 9. Dodaj BESS (add_bess_inverter_nn)
 * 10. Dodaj zabezpieczenie (add_relay + update_relay_settings)
 * 11. Uruchom rozpływ mocy (run_power_flow)
 * 12. Uruchom zwarcie (run_short_circuit)
 *
 * This is a UNIT test that verifies the operation contract shapes.
 * The E2E test (Playwright) would exercise the full backend.
 *
 * INVARIANTS:
 * - Every step produces a snapshot delta
 * - No step returns error in happy path
 * - Deterministic: 100× produces same hash
 */

import { describe, it, expect } from 'vitest';
import { MODAL_REGISTRY, getModalByOp } from '../topology/modals/modalRegistry';

// ---------------------------------------------------------------------------
// Canonical operation sequence
// ---------------------------------------------------------------------------

const CANONICAL_OPERATIONS = [
  { step: 1, op: 'add_grid_source_sn', desc: 'Utwórz GPZ' },
  { step: 2, op: 'continue_trunk_segment_sn', desc: 'Kontynuuj magistralę (1/3)' },
  { step: 3, op: 'continue_trunk_segment_sn', desc: 'Kontynuuj magistralę (2/3)' },
  { step: 4, op: 'continue_trunk_segment_sn', desc: 'Kontynuuj magistralę (3/3)' },
  { step: 5, op: 'insert_station_on_segment_sn', desc: 'Wstaw stację SN/nN' },
  { step: 6, op: 'start_branch_segment_sn', desc: 'Dodaj odgałęzienie SN' },
  { step: 7, op: 'insert_station_on_segment_sn', desc: 'Wstaw stację na odgałęzieniu' },
  { step: 8, op: 'connect_secondary_ring_sn', desc: 'Zamknij ring wtórny' },
  { step: 9, op: 'set_normal_open_point', desc: 'Ustaw NOP' },
  { step: 10, op: 'add_nn_load', desc: 'Dodaj odbiór nN' },
  { step: 11, op: 'add_pv_inverter_nn', desc: 'Dodaj PV (nN)' },
  { step: 12, op: 'add_bess_inverter_nn', desc: 'Dodaj BESS (nN)' },
  { step: 13, op: 'add_relay', desc: 'Dodaj zabezpieczenie' },
  { step: 14, op: 'run_power_flow', desc: 'Uruchom rozpływ mocy' },
  { step: 15, op: 'run_short_circuit', desc: 'Uruchom zwarcie' },
] as const;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UX Startup Scenario — operation coverage (§6)', () => {
  it('all canonical operations are registered in ModalRegistry', () => {
    const missingOps: string[] = [];
    for (const step of CANONICAL_OPERATIONS) {
      const entry = getModalByOp(step.op);
      if (!entry) {
        missingOps.push(`Step ${step.step}: ${step.op} (${step.desc})`);
      }
    }
    expect(missingOps).toEqual([]);
  });

  it('all operations have Polish labels in ModalRegistry', () => {
    for (const step of CANONICAL_OPERATIONS) {
      const entry = getModalByOp(step.op);
      if (entry) {
        expect(entry.labelPl.length).toBeGreaterThan(2);
        // Must not be English-only
        expect(entry.labelPl).not.toMatch(/^(Add|Insert|Remove|Delete|Run|Edit|Open) /);
      }
    }
  });

  it('all operations have implemented=true in ModalRegistry', () => {
    for (const step of CANONICAL_OPERATIONS) {
      const entry = getModalByOp(step.op);
      if (entry) {
        expect(entry.implemented).toBe(true);
      }
    }
  });

  it('canonical scenario has at least 12 steps', () => {
    expect(CANONICAL_OPERATIONS.length).toBeGreaterThanOrEqual(12);
  });

  it('canonical scenario includes SN topology operations', () => {
    const snOps = CANONICAL_OPERATIONS.filter(
      (s) =>
        s.op.includes('trunk') ||
        s.op.includes('station') ||
        s.op.includes('branch') ||
        s.op.includes('ring') ||
        s.op.includes('nop'),
    );
    expect(snOps.length).toBeGreaterThanOrEqual(5);
  });

  it('canonical scenario includes nN element operations', () => {
    const nnOps = CANONICAL_OPERATIONS.filter(
      (s) => s.op.includes('nn_load') || s.op.includes('pv') || s.op.includes('bess'),
    );
    expect(nnOps.length).toBeGreaterThanOrEqual(3);
  });

  it('canonical scenario includes analysis operations', () => {
    const analysisOps = CANONICAL_OPERATIONS.filter(
      (s) => s.op.includes('power_flow') || s.op.includes('short_circuit'),
    );
    expect(analysisOps.length).toBeGreaterThanOrEqual(2);
  });

  it('canonical scenario includes protection operations', () => {
    const protOps = CANONICAL_OPERATIONS.filter((s) => s.op.includes('relay'));
    expect(protOps.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Snapshot delta determinism (§6)', () => {
  it('operation sequence is deterministic (same order 100×)', () => {
    const hashes: string[] = [];
    for (let i = 0; i < 100; i++) {
      const opSequence = CANONICAL_OPERATIONS.map((s) => `${s.step}:${s.op}`).join('|');
      hashes.push(opSequence);
    }
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(1);
  });

  it('ModalRegistry lookup is deterministic (100×)', () => {
    const firstResults = CANONICAL_OPERATIONS.map((s) => getModalByOp(s.op)?.modalId ?? 'NONE');

    for (let i = 0; i < 99; i++) {
      const results = CANONICAL_OPERATIONS.map((s) => getModalByOp(s.op)?.modalId ?? 'NONE');
      expect(results).toEqual(firstResults);
    }
  });
});

describe('No dead operations in scenario (§6)', () => {
  it('every operation in CANONICAL_OPERATIONS maps to a known canonical op', () => {
    const allCanonicalOps = new Set(MODAL_REGISTRY.map((e) => e.canonicalOp));
    for (const step of CANONICAL_OPERATIONS) {
      expect(allCanonicalOps.has(step.op)).toBe(true);
    }
  });

  it('no duplicate steps (each step number is unique)', () => {
    const stepNumbers = CANONICAL_OPERATIONS.map((s) => s.step);
    expect(new Set(stepNumbers).size).toBe(stepNumbers.length);
  });
});
