/**
 * exportManifest.test.ts — KROK 5: ExportManifestV1 determinism tests.
 *
 * BINDING: same input → identical contentHash regardless of element/analysis order.
 */
import { describe, it, expect } from 'vitest';
import { buildExportManifest, type ExportManifestV1 } from '../exportManifest';

describe('ExportManifestV1', () => {
  it('same input → same contentHash (order invariant)', () => {
    const m1 = buildExportManifest({
      snapshotHash: 'snap_abc',
      layoutHash: 'layout_xyz',
      runHash: 'run_123',
      elementIds: ['bus_2', 'bus_1', 'tr_1'],
      analysisTypes: ['LOAD_FLOW', 'SC_3F'],
    });
    const m2 = buildExportManifest({
      snapshotHash: 'snap_abc',
      layoutHash: 'layout_xyz',
      runHash: 'run_123',
      elementIds: ['tr_1', 'bus_1', 'bus_2'],
      analysisTypes: ['SC_3F', 'LOAD_FLOW'],
    });

    expect(m1.contentHash).toBe(m2.contentHash);
  });

  it('elementIds are sorted and deduplicated', () => {
    const m = buildExportManifest({
      snapshotHash: 'snap',
      layoutHash: 'layout',
      elementIds: ['c', 'a', 'b', 'a', 'c'],
      analysisTypes: [],
    });
    expect(m.elementIds).toEqual(['a', 'b', 'c']);
  });

  it('analysisTypes are sorted', () => {
    const m = buildExportManifest({
      snapshotHash: 'snap',
      layoutHash: 'layout',
      elementIds: [],
      analysisTypes: ['SC_3F', 'LOAD_FLOW', 'PROTECTION'],
    });
    expect(m.analysisTypes).toEqual(['LOAD_FLOW', 'PROTECTION', 'SC_3F']);
  });

  it('100x stable contentHash', () => {
    const ref = buildExportManifest({
      snapshotHash: 'snap_stable',
      layoutHash: 'layout_stable',
      runHash: 'run_stable',
      elementIds: Array.from({ length: 100 }, (_, i) => `elem_${i}`),
      analysisTypes: ['SC_3F', 'LOAD_FLOW'],
    });

    for (let i = 0; i < 100; i++) {
      const m = buildExportManifest({
        snapshotHash: 'snap_stable',
        layoutHash: 'layout_stable',
        runHash: 'run_stable',
        elementIds: Array.from({ length: 100 }, (_, i) => `elem_${i}`),
        analysisTypes: ['SC_3F', 'LOAD_FLOW'],
      });
      expect(m.contentHash).toBe(ref.contentHash);
    }
  });

  it('runHash null supported', () => {
    const m = buildExportManifest({
      snapshotHash: 'snap',
      layoutHash: 'layout',
      elementIds: ['bus_1'],
      analysisTypes: [],
    });
    expect(m.runHash).toBeNull();
    expect(m.contentHash).toBeTruthy();
  });

  it('different snapshotHash → different contentHash', () => {
    const m1 = buildExportManifest({
      snapshotHash: 'snap_a',
      layoutHash: 'layout',
      elementIds: ['bus_1'],
      analysisTypes: [],
    });
    const m2 = buildExportManifest({
      snapshotHash: 'snap_b',
      layoutHash: 'layout',
      elementIds: ['bus_1'],
      analysisTypes: [],
    });
    expect(m1.contentHash).not.toBe(m2.contentHash);
  });

  it('different layoutHash → different contentHash', () => {
    const m1 = buildExportManifest({
      snapshotHash: 'snap',
      layoutHash: 'layout_a',
      elementIds: ['bus_1'],
      analysisTypes: [],
    });
    const m2 = buildExportManifest({
      snapshotHash: 'snap',
      layoutHash: 'layout_b',
      elementIds: ['bus_1'],
      analysisTypes: [],
    });
    expect(m1.contentHash).not.toBe(m2.contentHash);
  });

  it('createdAt is ISO-8601 format', () => {
    const m = buildExportManifest({
      snapshotHash: 'snap',
      layoutHash: 'layout',
      elementIds: [],
      analysisTypes: [],
    });
    // ISO-8601 pattern
    expect(m.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('contentHash is 64 hex characters', () => {
    const m = buildExportManifest({
      snapshotHash: 'snap',
      layoutHash: 'layout',
      elementIds: ['a'],
      analysisTypes: ['SC_3F'],
    });
    expect(m.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('ExportManifestV1 — E2E chain determinism', () => {
  it('full chain: snapshot → layout → results → export produces stable hash', () => {
    // Simulate the full E2E chain
    const snapshotHash = 'snap_e2e_test';
    const layoutHash = 'layout_e2e_test';
    const runHash = 'run_e2e_test';
    const elementIds = ['bus_sn', 'bus_nn', 'tr_1', 'gen_pv_1', 'gen_bess_1', 'src_gpz'];

    let referenceHash: string | null = null;

    for (let i = 0; i < 50; i++) {
      // Permute element order (simulate different input ordering)
      const shuffledIds = [...elementIds].sort(() => (i % 2 === 0 ? 1 : -1));

      const manifest = buildExportManifest({
        snapshotHash,
        layoutHash,
        runHash,
        elementIds: shuffledIds,
        analysisTypes: ['SC_3F', 'LOAD_FLOW'],
      });

      if (referenceHash === null) {
        referenceHash = manifest.contentHash;
      } else {
        expect(manifest.contentHash).toBe(referenceHash);
      }
    }
  });
});
