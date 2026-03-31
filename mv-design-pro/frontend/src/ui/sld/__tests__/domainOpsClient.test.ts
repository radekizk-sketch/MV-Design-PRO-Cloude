import { describe, expect, it } from 'vitest';
import { buildDeterministicIdempotencyKey } from '../domainOpsClient';

describe('buildDeterministicIdempotencyKey', () => {
  it('zwraca identyczny klucz dla tego samego payloadu i hash snapshotu', () => {
    const payload = {
      from_bus_ref: 'bus_1',
      to_bus_ref: 'bus_2',
      length_m: 120,
      metadata: {
        labels: ['A', 'B'],
      },
    };

    const key1 = buildDeterministicIdempotencyKey(
      'continue_trunk_segment_sn',
      payload,
      'snap_hash_123',
    );
    const key2 = buildDeterministicIdempotencyKey(
      'continue_trunk_segment_sn',
      payload,
      'snap_hash_123',
    );

    expect(key1).toBe(key2);
    expect(key1.startsWith('op:continue_trunk_segment_sn:snap_hash_123:')).toBe(true);
  });

  it('jest odporny na kolejność kluczy w obiekcie payload', () => {
    const payloadA = {
      a: 1,
      b: {
        y: 2,
        x: 3,
      },
    };

    const payloadB = {
      b: {
        x: 3,
        y: 2,
      },
      a: 1,
    };

    const keyA = buildDeterministicIdempotencyKey('add_grid_source_sn', payloadA, 'base_1');
    const keyB = buildDeterministicIdempotencyKey('add_grid_source_sn', payloadB, 'base_1');

    expect(keyA).toBe(keyB);
  });

  it('generuje inny klucz dla innego snapshot base hash', () => {
    const payload = { station_ref: 'st_001' };

    const keyA = buildDeterministicIdempotencyKey('insert_station_on_segment_sn', payload, 'hash_A');
    const keyB = buildDeterministicIdempotencyKey('insert_station_on_segment_sn', payload, 'hash_B');

    expect(keyA).not.toBe(keyB);
  });

  it('ignoruje undefined w obiektach (zgodnie z JSON payload wysyłanym po sieci)', () => {
    const payloadWithUndefined = {
      station_ref: 'st_001',
      optional_field: undefined,
      nested: {
        keep: 1,
        drop: undefined,
      },
    };
    const payloadWithoutUndefined = {
      station_ref: 'st_001',
      nested: {
        keep: 1,
      },
    };

    const keyA = buildDeterministicIdempotencyKey('insert_station_on_segment_sn', payloadWithUndefined, 'hash_A');
    const keyB = buildDeterministicIdempotencyKey('insert_station_on_segment_sn', payloadWithoutUndefined, 'hash_A');

    expect(keyA).toBe(keyB);
  });
});
