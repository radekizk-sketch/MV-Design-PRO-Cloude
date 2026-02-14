/**
 * overridesCiRender.test.ts — RUN #3H §6: CI render artifacts test.
 *
 * Exercises golden networks through the full pipeline WITH overrides:
 *   TopologyInput → VisualGraph → LayoutResult → applyOverrides → EffectiveLayout → ExportManifest
 *
 * Verifies:
 * 1. EffectiveLayout hash stability (50×)
 * 2. EffectiveLayout permutation invariance for overrides (50×)
 * 3. ExportManifest includes overridesHash/overridesVersion
 * 4. Collision detection on EffectiveLayout
 * 5. applyOverrides preserves baseLayoutHash
 *
 * Uses GN-E2E-01 (GPZ + 10 stations) as reference network.
 */

import { describe, it, expect } from 'vitest';
import type { TopologyInputV1 } from '../topologyInputReader';
import { BranchKind, StationKind } from '../topologyInputReader';
import { buildVisualGraphFromTopology } from '../topologyAdapterV2';
import { computeLayout } from '../layoutPipeline';
import { computeLayoutResultHash } from '../layoutResult';
import type { LayoutResultV1 } from '../layoutResult';
import { buildExportManifest } from '../exportManifest';
import { applyOverrides, checkEffectiveCollisions } from '../applyOverrides';
import {
  OverrideScopeV1,
  OverrideOperationV1,
  OVERRIDES_VERSION,
  emptyOverrides,
  computeOverridesHash,
  canonicalizeOverrides,
} from '../geometryOverrides';
import type { ProjectGeometryOverridesV1, GeometryOverrideItemV1 } from '../geometryOverrides';

// =============================================================================
// GOLDEN NETWORK BUILDER (GN-E2E-01 clone — self-contained)
// =============================================================================

function buildGoldenNetwork(): TopologyInputV1 {
  const nodes = [
    { id: 'bus_gpz', name: 'Szyna GPZ 15kV', voltageKv: 15, stationId: null, busIndex: null, inService: true },
  ];
  const branches: TopologyInputV1['branches'] = [];
  const stations: TopologyInputV1['stations'] = [];
  const loads: TopologyInputV1['loads'] = [];

  for (let i = 1; i <= 5; i++) {
    const pad = String(i).padStart(2, '0');
    const snBusId = `bus_sn_st${pad}`;
    const nnBusId = `bus_nn_st${pad}`;
    const stId = `st${pad}`;
    const fromId = i === 1 ? 'bus_gpz' : `bus_sn_st${String(i - 1).padStart(2, '0')}`;

    nodes.push(
      { id: snBusId, name: `Szyna SN St${pad}`, voltageKv: 15, stationId: stId, busIndex: null, inService: true },
      { id: nnBusId, name: `Szyna nN St${pad}`, voltageKv: 0.4, stationId: stId, busIndex: null, inService: true },
    );
    branches.push(
      { id: `line_${pad}`, name: `Linia SN ${pad}`, fromNodeId: fromId, toNodeId: snBusId, kind: BranchKind.LINE, isNormallyOpen: false, inService: true, catalogRef: 'AFL-6 120', lengthKm: 2.0, ratedPowerMva: null, voltageHvKv: null, voltageLvKv: null },
      { id: `tr_${pad}`, name: `TR St${pad}`, fromNodeId: snBusId, toNodeId: nnBusId, kind: BranchKind.TR_LINK, isNormallyOpen: false, inService: true, catalogRef: 'TR-250', lengthKm: null, ratedPowerMva: 0.25, voltageHvKv: 15, voltageLvKv: 0.4 },
    );
    stations.push(
      { id: stId, name: `Stacja ${pad}`, stationType: StationKind.DISTRIBUTION, voltageKv: 15, busIds: [snBusId, nnBusId], branchIds: [], switchIds: [], transformerIds: [`tr_${pad}`] },
    );
    loads.push(
      { id: `load_${pad}`, name: `Odbiorca ${pad}`, nodeId: nnBusId, inService: true, pMw: 0.1, qMvar: 0.03 },
    );
  }

  return {
    snapshotId: 'gn-ci-render',
    snapshotFingerprint: 'ci_render_fp',
    connectionNodes: nodes,
    branches,
    devices: [],
    stations,
    generators: [],
    sources: [{ id: 'src_gpz', name: 'Zasilanie GPZ', nodeId: 'bus_gpz', inService: true }],
    loads,
    protectionBindings: [],
    fixActions: [],
  };
}

// =============================================================================
// PIPELINE HELPER
// =============================================================================

function runPipelineToLayout(input: TopologyInputV1) {
  const adapterResult = buildVisualGraphFromTopology(input);
  const layoutResult = computeLayout(adapterResult.graph, undefined, adapterResult.stationBlockDetails);
  const layoutHash = computeLayoutResultHash(layoutResult);

  const elementIds = adapterResult.graph.nodes
    .map(n => n.attributes.elementId)
    .filter((id): id is string => id != null);

  return { layoutResult, layoutHash, elementIds };
}

function makeOverridesForLayout(
  layoutResult: LayoutResultV1,
): ProjectGeometryOverridesV1 {
  const items: GeometryOverrideItemV1[] = [];

  // Apply MOVE_DELTA to first 2 nodes (if available)
  for (let i = 0; i < Math.min(2, layoutResult.nodePlacements.length); i++) {
    const node = layoutResult.nodePlacements[i];
    items.push({
      elementId: node.nodeId,
      scope: OverrideScopeV1.NODE,
      operation: OverrideOperationV1.MOVE_DELTA,
      payload: { dx: 20 * (i + 1), dy: -20 },
    });
  }

  // Apply MOVE_DELTA to first block (if available)
  if (layoutResult.switchgearBlocks.length > 0) {
    const block = layoutResult.switchgearBlocks[0];
    items.push({
      elementId: block.blockId,
      scope: OverrideScopeV1.BLOCK,
      operation: OverrideOperationV1.MOVE_DELTA,
      payload: { dx: 40, dy: 0 },
    });
  }

  return canonicalizeOverrides({
    overridesVersion: OVERRIDES_VERSION,
    studyCaseId: 'ci-render-case',
    snapshotHash: 'ci_render_fp',
    items,
  });
}

// =============================================================================
// TESTS: §6.1 — EFFECTIVE LAYOUT DETERMINISM
// =============================================================================

describe('CI Render Artifacts — EffectiveLayout determinism', () => {
  it('applyOverrides produces valid EffectiveLayout', () => {
    const input = buildGoldenNetwork();
    const { layoutResult } = runPipelineToLayout(input);
    const overrides = makeOverridesForLayout(layoutResult);

    const effective = applyOverrides(layoutResult, overrides);

    expect(effective.baseLayoutHash).toBeTruthy();
    expect(effective.overridesHash).toBeTruthy();
    expect(effective.effectiveHash).toBeTruthy();
    expect(effective.appliedCount).toBeGreaterThan(0);
    expect(effective.nodePlacements.length).toBe(layoutResult.nodePlacements.length);
    expect(effective.switchgearBlocks.length).toBe(layoutResult.switchgearBlocks.length);
  });

  it('EffectiveLayout hash stable 50×', () => {
    const input = buildGoldenNetwork();
    const { layoutResult } = runPipelineToLayout(input);
    const overrides = makeOverridesForLayout(layoutResult);

    const refEffective = applyOverrides(layoutResult, overrides);

    for (let i = 0; i < 50; i++) {
      const effective = applyOverrides(layoutResult, overrides);
      expect(effective.effectiveHash).toBe(refEffective.effectiveHash);
      expect(effective.baseLayoutHash).toBe(refEffective.baseLayoutHash);
      expect(effective.overridesHash).toBe(refEffective.overridesHash);
    }
  });

  it('overrides hash permutation invariant 50×', () => {
    const input = buildGoldenNetwork();
    const { layoutResult } = runPipelineToLayout(input);
    const overrides = makeOverridesForLayout(layoutResult);

    const refHash = computeOverridesHash(overrides);

    // Reverse items and recompute — should be same hash
    for (let i = 0; i < 50; i++) {
      const reversed: ProjectGeometryOverridesV1 = {
        ...overrides,
        items: [...overrides.items].reverse(),
      };
      const h = computeOverridesHash(reversed);
      expect(h).toBe(refHash);
    }
  });

  it('empty overrides produce identity EffectiveLayout', () => {
    const input = buildGoldenNetwork();
    const { layoutResult, layoutHash } = runPipelineToLayout(input);
    const empty = emptyOverrides('case-1', 'fp');

    const effective = applyOverrides(layoutResult, empty);

    expect(effective.appliedCount).toBe(0);
    expect(effective.baseLayoutHash).toBe(layoutHash);
    // Node positions unchanged
    for (let i = 0; i < layoutResult.nodePlacements.length; i++) {
      expect(effective.nodePlacements[i].position).toEqual(
        layoutResult.nodePlacements[i].position,
      );
    }
  });

  it('baseLayoutHash preserved after overrides', () => {
    const input = buildGoldenNetwork();
    const { layoutResult, layoutHash } = runPipelineToLayout(input);
    const overrides = makeOverridesForLayout(layoutResult);

    const effective = applyOverrides(layoutResult, overrides);
    expect(effective.baseLayoutHash).toBe(layoutHash);
  });
});

// =============================================================================
// TESTS: §6.2 — COLLISION DETECTION
// =============================================================================

describe('CI Render Artifacts — collision detection', () => {
  it('checkEffectiveCollisions returns result', () => {
    const input = buildGoldenNetwork();
    const { layoutResult } = runPipelineToLayout(input);
    const overrides = makeOverridesForLayout(layoutResult);
    const effective = applyOverrides(layoutResult, overrides);

    const collisionResult = checkEffectiveCollisions(effective);
    expect(collisionResult).toBeDefined();
    expect(typeof collisionResult.hasCollisions).toBe('boolean');
  });
});

// =============================================================================
// TESTS: §6.3 — EXPORT MANIFEST WITH OVERRIDES
// =============================================================================

describe('CI Render Artifacts — ExportManifest with overrides', () => {
  it('ExportManifest includes overridesHash and overridesVersion', () => {
    const input = buildGoldenNetwork();
    const { layoutResult, layoutHash, elementIds } = runPipelineToLayout(input);
    const overrides = makeOverridesForLayout(layoutResult);
    const overridesHash = computeOverridesHash(overrides);

    const manifest = buildExportManifest({
      snapshotHash: input.snapshotFingerprint,
      layoutHash,
      elementIds,
      analysisTypes: [],
      readinessStatus: 'READY',
      overridesHash,
      overridesVersion: OVERRIDES_VERSION,
    });

    expect(manifest.overridesHash).toBe(overridesHash);
    expect(manifest.overridesVersion).toBe('1.0');
    expect(manifest.specVersion).toBe('1.2');
    expect(manifest.contentHash).toBeTruthy();
  });

  it('overridesHash changes contentHash', () => {
    const base = {
      snapshotHash: 'snap',
      layoutHash: 'layout',
      elementIds: ['bus_gpz'],
      analysisTypes: [] as string[],
      readinessStatus: 'READY',
    };

    const m1 = buildExportManifest({ ...base, overridesHash: null });
    const m2 = buildExportManifest({ ...base, overridesHash: 'abc123' });

    expect(m1.contentHash).not.toBe(m2.contentHash);
  });

  it('ExportManifest contentHash stable 50× with overrides', () => {
    const input = buildGoldenNetwork();
    const { layoutResult, layoutHash, elementIds } = runPipelineToLayout(input);
    const overrides = makeOverridesForLayout(layoutResult);
    const overridesHash = computeOverridesHash(overrides);

    const refManifest = buildExportManifest({
      snapshotHash: input.snapshotFingerprint,
      layoutHash,
      elementIds,
      analysisTypes: [],
      readinessStatus: 'READY',
      overridesHash,
      overridesVersion: OVERRIDES_VERSION,
    });

    for (let i = 0; i < 50; i++) {
      const manifest = buildExportManifest({
        snapshotHash: input.snapshotFingerprint,
        layoutHash,
        elementIds,
        analysisTypes: [],
        readinessStatus: 'READY',
        overridesHash,
        overridesVersion: OVERRIDES_VERSION,
      });
      expect(manifest.contentHash).toBe(refManifest.contentHash);
    }
  });
});

// =============================================================================
// TESTS: §6.4 — FULL CI RENDER PIPELINE
// =============================================================================

describe('CI Render Artifacts — full pipeline with overrides', () => {
  it('full pipeline: golden network + overrides → stable EffectiveLayout + manifest', () => {
    const input = buildGoldenNetwork();
    const { layoutResult, layoutHash, elementIds } = runPipelineToLayout(input);
    const overrides = makeOverridesForLayout(layoutResult);
    const overridesHash = computeOverridesHash(overrides);

    // Apply overrides
    const effective = applyOverrides(layoutResult, overrides);

    // Build manifest with overrides
    const manifest = buildExportManifest({
      snapshotHash: input.snapshotFingerprint,
      layoutHash,
      elementIds,
      analysisTypes: [],
      readinessStatus: 'READY',
      overridesHash,
      overridesVersion: OVERRIDES_VERSION,
    });

    // Verify complete pipeline
    expect(effective.baseLayoutHash).toBe(layoutHash);
    expect(effective.overridesHash).toBe(overridesHash);
    expect(effective.appliedCount).toBeGreaterThan(0);
    expect(manifest.overridesHash).toBe(overridesHash);
    expect(manifest.contentHash).toBeTruthy();
    expect(manifest.specVersion).toBe('1.2');
  });

  it('full pipeline stable across 50 iterations', () => {
    let refEffectiveHash: string | null = null;
    let refManifestHash: string | null = null;

    for (let i = 0; i < 50; i++) {
      const input = buildGoldenNetwork();
      const { layoutResult, layoutHash, elementIds } = runPipelineToLayout(input);
      const overrides = makeOverridesForLayout(layoutResult);
      const overridesHash = computeOverridesHash(overrides);

      const effective = applyOverrides(layoutResult, overrides);
      const manifest = buildExportManifest({
        snapshotHash: input.snapshotFingerprint,
        layoutHash,
        elementIds,
        analysisTypes: [],
        readinessStatus: 'READY',
        overridesHash,
        overridesVersion: OVERRIDES_VERSION,
      });

      if (refEffectiveHash === null) {
        refEffectiveHash = effective.effectiveHash;
        refManifestHash = manifest.contentHash;
      } else {
        expect(effective.effectiveHash).toBe(refEffectiveHash);
        expect(manifest.contentHash).toBe(refManifestHash);
      }
    }
  });
});
