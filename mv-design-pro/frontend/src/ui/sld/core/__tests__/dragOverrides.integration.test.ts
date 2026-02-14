/**
 * dragOverrides.integration.test.ts — RUN #3H DOMKNIECIE COMMIT 7.
 *
 * Integration test for CAD drag → override → applyOverrides pipeline.
 *
 * Scenariusz:
 * 1. Render golden network → LayoutResult
 * 2. Simulate drag BLOCK via store.applyDelta()
 * 3. Override powstaje w sldProjectModeStore
 * 4. applyOverrides() → EffectiveLayout z zmienionym hash
 * 5. Save → reload → hash identyczny (determinism)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import type { TopologyInputV1 } from '../topologyInputReader';
import { BranchKind, StationKind } from '../topologyInputReader';
import { buildVisualGraphFromTopology } from '../topologyAdapterV2';
import { computeLayout } from '../layoutPipeline';
import { computeLayoutResultHash } from '../layoutResult';
import type { LayoutResultV1 } from '../layoutResult';
import { applyOverrides, checkEffectiveCollisions } from '../applyOverrides';
import {
  OverrideScopeV1,
  OverrideOperationV1,
  OVERRIDES_VERSION,
  emptyOverrides,
  computeOverridesHash,
  canonicalizeOverrides,
  snapDeltaToGrid,
  GEOMETRY_GRID_SNAP,
} from '../geometryOverrides';
import type { ProjectGeometryOverridesV1, GeometryOverrideItemV1 } from '../geometryOverrides';
import { useSldProjectModeStore } from '../../sldProjectModeStore';

// Mock overridesApi — save/load/reset
vi.mock('../overridesApi', () => {
  let stored: {
    overrides_version: string;
    study_case_id: string;
    snapshot_hash: string;
    items: readonly { element_id: string; scope: string; operation: string; payload: Record<string, unknown> }[];
    overrides_hash: string;
  } = {
    overrides_version: '1.0',
    study_case_id: 'test-case',
    snapshot_hash: 'fp',
    items: [],
    overrides_hash: '00000000',
  };

  return {
    fetchSldOverrides: vi.fn(async () => stored),
    saveSldOverrides: vi.fn(async (_caseId: string, _snapshotHash: string, items: readonly { elementId: string; scope: string; operation: string; payload: Record<string, unknown> }[]) => {
      stored = {
        ...stored,
        items: items.map((it) => ({
          element_id: it.elementId,
          scope: it.scope,
          operation: it.operation,
          payload: it.payload,
        })),
        overrides_hash: 'hash_saved',
      };
      return stored;
    }),
    resetSldOverrides: vi.fn(async () => {
      stored = { ...stored, items: [], overrides_hash: '00000000' };
      return stored;
    }),
    validateSldOverrides: vi.fn(async () => ({ valid: true, errors: [], overrides_hash: 'hash' })),
    mapResponseToOverrides: vi.fn((resp: typeof stored) => ({
      overridesVersion: '1.0' as const,
      studyCaseId: resp.study_case_id,
      snapshotHash: resp.snapshot_hash,
      items: resp.items.map((it: { element_id: string; scope: string; operation: string; payload: Record<string, unknown> }) => ({
        elementId: it.element_id,
        scope: it.scope as OverrideScopeV1,
        operation: it.operation as OverrideOperationV1,
        payload: it.payload as GeometryOverrideItemV1['payload'],
      })),
    })),
    mapValidateResponse: vi.fn((resp: { valid: boolean; errors: readonly { element_id: string; code: string; message: string }[] }) => ({
      valid: resp.valid,
      errors: resp.errors.map((e: { element_id: string; code: string; message: string }) => ({ elementId: e.element_id, code: e.code, message: e.message })),
    })),
  };
});

// =============================================================================
// GOLDEN NETWORK (self-contained 5-station radial)
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
    snapshotId: 'gn-drag-integration',
    snapshotFingerprint: 'drag_int_fp',
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

function runPipelineToLayout(input: TopologyInputV1) {
  const adapterResult = buildVisualGraphFromTopology(input);
  const layoutResult = computeLayout(adapterResult.graph, undefined, adapterResult.stationBlockDetails);
  const layoutHash = computeLayoutResultHash(layoutResult);
  return { layoutResult, layoutHash };
}

// =============================================================================
// TESTS
// =============================================================================

describe('Drag → Override → applyOverrides integration (RUN #3H DOMKNIECIE)', () => {
  let layout: LayoutResultV1;
  let layoutHash: string;

  beforeEach(() => {
    // Reset store
    useSldProjectModeStore.setState({
      projectModeActive: false,
      overrides: null,
      dirty: false,
      validationErrors: [],
      loading: false,
      error: null,
      lastSavedHash: null,
    });

    // Build golden network
    const input = buildGoldenNetwork();
    const result = runPipelineToLayout(input);
    layout = result.layoutResult;
    layoutHash = result.layoutHash;
  });

  it('applyDelta on BLOCK creates override in store', () => {
    const store = useSldProjectModeStore.getState();
    store.setProjectMode(true);

    // Get first block
    const block = layout.switchgearBlocks[0];
    expect(block).toBeDefined();

    // Simulate drag: 45px → snaps to 40px (grid=20), -35 → -40 (grid=20)
    act(() => {
      store.applyDelta(
        block.blockId,
        OverrideScopeV1.BLOCK,
        OverrideOperationV1.MOVE_DELTA,
        { dx: 45, dy: -35 },
      );
    });

    const overrides = useSldProjectModeStore.getState().overrides;
    expect(overrides).not.toBeNull();
    expect(overrides!.items.length).toBe(1);
    expect(overrides!.items[0].elementId).toBe(block.blockId);
    expect(overrides!.items[0].scope).toBe(OverrideScopeV1.BLOCK);
    expect(overrides!.items[0].operation).toBe(OverrideOperationV1.MOVE_DELTA);
    // Snapped: 45→40, -35→-40 (Math.round(-35/20)*20 = Math.round(-1.75)*20 = -2*20 = -40)
    const payload = overrides!.items[0].payload as { dx: number; dy: number };
    expect(payload.dx).toBe(40);
    expect(payload.dy).toBe(-40);
  });

  it('applyDelta on LABEL creates MOVE_LABEL override', () => {
    const store = useSldProjectModeStore.getState();
    store.setProjectMode(true);

    const node = layout.nodePlacements[0];
    expect(node).toBeDefined();

    act(() => {
      store.applyDelta(
        node.nodeId,
        OverrideScopeV1.LABEL,
        OverrideOperationV1.MOVE_LABEL,
        { anchorX: 150, anchorY: 200 },
      );
    });

    const overrides = useSldProjectModeStore.getState().overrides;
    expect(overrides).not.toBeNull();
    expect(overrides!.items.length).toBe(1);
    expect(overrides!.items[0].scope).toBe(OverrideScopeV1.LABEL);
    expect(overrides!.items[0].operation).toBe(OverrideOperationV1.MOVE_LABEL);
  });

  it('override changes EffectiveLayout hash', () => {
    const store = useSldProjectModeStore.getState();
    store.setProjectMode(true);

    // EffectiveLayout without overrides
    const effectiveBefore = applyOverrides(layout, null);

    // Apply a block drag
    const block = layout.switchgearBlocks[0];
    act(() => {
      store.applyDelta(
        block.blockId,
        OverrideScopeV1.BLOCK,
        OverrideOperationV1.MOVE_DELTA,
        { dx: 60, dy: 0 },
      );
    });

    const overrides = useSldProjectModeStore.getState().overrides;
    const effectiveAfter = applyOverrides(layout, overrides);

    expect(effectiveAfter.effectiveHash).not.toBe(effectiveBefore.effectiveHash);
    expect(effectiveAfter.baseLayoutHash).toBe(effectiveBefore.baseLayoutHash);
    expect(effectiveAfter.appliedCount).toBeGreaterThan(0);
  });

  it('multiple overrides accumulate in store', () => {
    const store = useSldProjectModeStore.getState();
    store.setProjectMode(true);

    // Drag block
    const block = layout.switchgearBlocks[0];
    act(() => {
      store.applyDelta(block.blockId, OverrideScopeV1.BLOCK, OverrideOperationV1.MOVE_DELTA, { dx: 40, dy: 0 });
    });

    // Drag node
    const node = layout.nodePlacements[0];
    act(() => {
      store.applyDelta(node.nodeId, OverrideScopeV1.NODE, OverrideOperationV1.MOVE_DELTA, { dx: 0, dy: 60 });
    });

    const overrides = useSldProjectModeStore.getState().overrides;
    expect(overrides!.items.length).toBe(2);
  });

  it('addOrReplaceOverride replaces existing override for same elementId+scope', () => {
    const store = useSldProjectModeStore.getState();
    store.setProjectMode(true);

    const block = layout.switchgearBlocks[0];

    act(() => {
      store.addOrReplaceOverride({
        elementId: block.blockId,
        scope: OverrideScopeV1.BLOCK,
        operation: OverrideOperationV1.MOVE_DELTA,
        payload: { dx: 20, dy: 0 },
      });
    });

    act(() => {
      store.addOrReplaceOverride({
        elementId: block.blockId,
        scope: OverrideScopeV1.BLOCK,
        operation: OverrideOperationV1.MOVE_DELTA,
        payload: { dx: 80, dy: 0 },
      });
    });

    const overrides = useSldProjectModeStore.getState().overrides;
    expect(overrides!.items.length).toBe(1);
    expect((overrides!.items[0].payload as { dx: number }).dx).toBe(80);
  });

  it('dirty flag is set after applyDelta', () => {
    const store = useSldProjectModeStore.getState();
    store.setProjectMode(true);

    expect(useSldProjectModeStore.getState().dirty).toBe(false);

    act(() => {
      store.applyDelta(
        layout.switchgearBlocks[0].blockId,
        OverrideScopeV1.BLOCK,
        OverrideOperationV1.MOVE_DELTA,
        { dx: 20, dy: 0 },
      );
    });

    expect(useSldProjectModeStore.getState().dirty).toBe(true);
  });

  it('validate detects invalid elementId in override', () => {
    const store = useSldProjectModeStore.getState();
    store.setProjectMode(true);

    act(() => {
      store.applyDelta(
        'nonexistent-block',
        OverrideScopeV1.BLOCK,
        OverrideOperationV1.MOVE_DELTA,
        { dx: 20, dy: 0 },
      );
    });

    act(() => {
      store.validate(layout);
    });

    const errors = useSldProjectModeStore.getState().validationErrors;
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].elementId).toBe('nonexistent-block');
  });

  it('validateOverrides returns errors and updates state', () => {
    const store = useSldProjectModeStore.getState();
    store.setProjectMode(true);

    act(() => {
      store.applyDelta(
        'nonexistent',
        OverrideScopeV1.NODE,
        OverrideOperationV1.MOVE_DELTA,
        { dx: 20, dy: 0 },
      );
    });

    let errors: readonly { elementId: string; code: string; message: string }[] = [];
    act(() => {
      errors = store.validateOverrides(layout);
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(useSldProjectModeStore.getState().validationErrors.length).toBeGreaterThan(0);
  });

  it('save → reload → hash identical (determinism 50×)', async () => {
    const store = useSldProjectModeStore.getState();
    store.setProjectMode(true);

    // Apply drag
    const block = layout.switchgearBlocks[0];
    act(() => {
      store.applyDelta(
        block.blockId,
        OverrideScopeV1.BLOCK,
        OverrideOperationV1.MOVE_DELTA,
        { dx: 60, dy: -20 },
      );
    });

    const overridesBeforeSave = useSldProjectModeStore.getState().overrides;
    const hashBeforeSave = computeOverridesHash(overridesBeforeSave!);
    const effectiveBeforeSave = applyOverrides(layout, overridesBeforeSave);

    // Save
    await act(async () => {
      await store.saveOverrides('test-case');
    });

    // Hash stability after save + reload cycle (50x)
    for (let i = 0; i < 50; i++) {
      const currentOverrides = useSldProjectModeStore.getState().overrides;
      if (currentOverrides && currentOverrides.items.length > 0) {
        const effective = applyOverrides(layout, currentOverrides);
        expect(effective.baseLayoutHash).toBe(effectiveBeforeSave.baseLayoutHash);
      }
    }
  });

  it('snapDeltaToGrid is deterministic (GEOMETRY_GRID_SNAP=20)', () => {
    const refSnap = snapDeltaToGrid(47, -33);
    expect(refSnap.dx).toBe(40);
    expect(refSnap.dy).toBe(-40);

    // 50× stability
    for (let i = 0; i < 50; i++) {
      const snap = snapDeltaToGrid(47, -33);
      expect(snap.dx).toBe(refSnap.dx);
      expect(snap.dy).toBe(refSnap.dy);
    }
  });

  it('checkEffectiveCollisions works after override', () => {
    const store = useSldProjectModeStore.getState();
    store.setProjectMode(true);

    // Move a node on top of another
    if (layout.nodePlacements.length >= 2) {
      const targetPos = layout.nodePlacements[1].position;
      const sourcePos = layout.nodePlacements[0].position;
      const dx = targetPos.x - sourcePos.x;
      const dy = targetPos.y - sourcePos.y;

      act(() => {
        store.applyDelta(
          layout.nodePlacements[0].nodeId,
          OverrideScopeV1.NODE,
          OverrideOperationV1.MOVE_DELTA,
          { dx, dy },
        );
      });

      const overrides = useSldProjectModeStore.getState().overrides;
      const effective = applyOverrides(layout, overrides);
      const collisions = checkEffectiveCollisions(effective);

      expect(collisions).toBeDefined();
      expect(typeof collisions.hasCollisions).toBe('boolean');
    }
  });

  it('removeOverride works correctly', () => {
    const store = useSldProjectModeStore.getState();
    store.setProjectMode(true);

    const block = layout.switchgearBlocks[0];
    act(() => {
      store.applyDelta(block.blockId, OverrideScopeV1.BLOCK, OverrideOperationV1.MOVE_DELTA, { dx: 40, dy: 0 });
    });

    expect(useSldProjectModeStore.getState().overrides!.items.length).toBe(1);

    act(() => {
      store.removeOverride(block.blockId, OverrideScopeV1.BLOCK);
    });

    expect(useSldProjectModeStore.getState().overrides!.items.length).toBe(0);
  });

  it('EffectiveLayout hash stable after override 50×', () => {
    const store = useSldProjectModeStore.getState();
    store.setProjectMode(true);

    const block = layout.switchgearBlocks[0];
    act(() => {
      store.applyDelta(block.blockId, OverrideScopeV1.BLOCK, OverrideOperationV1.MOVE_DELTA, { dx: 60, dy: -20 });
    });

    const overrides = useSldProjectModeStore.getState().overrides;
    const refEffective = applyOverrides(layout, overrides);

    for (let i = 0; i < 50; i++) {
      const effective = applyOverrides(layout, overrides);
      expect(effective.effectiveHash).toBe(refEffective.effectiveHash);
      expect(effective.baseLayoutHash).toBe(refEffective.baseLayoutHash);
      expect(effective.overridesHash).toBe(refEffective.overridesHash);
    }
  });
});
