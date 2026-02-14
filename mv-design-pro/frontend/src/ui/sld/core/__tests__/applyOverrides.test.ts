/**
 * Tests for applyOverrides() — EffectiveLayoutV1 composition (RUN #3H §4).
 *
 * Covers:
 * - null/empty overrides → passthrough
 * - NODE MOVE_DELTA application
 * - BLOCK MOVE_DELTA application (with ports)
 * - LABEL MOVE_LABEL → labelOverrides map
 * - bounds recomputation
 * - hash composition (effectiveHash)
 * - collision detection post-apply
 * - 50× determinism
 */

import { describe, it, expect } from 'vitest';

import { applyOverrides, checkEffectiveCollisions } from '../applyOverrides';
import type { EffectiveLayoutV1 } from '../applyOverrides';
import type { LayoutResultV1 } from '../layoutResult';
import { LAYOUT_RESULT_VERSION, computeLayoutResultHash } from '../layoutResult';
import {
  OVERRIDES_VERSION,
  OverrideScopeV1,
  OverrideOperationV1,
  computeOverridesHash,
} from '../geometryOverrides';
import type { ProjectGeometryOverridesV1, GeometryOverrideItemV1 } from '../geometryOverrides';

// =============================================================================
// Fixtures
// =============================================================================

function makeLayout(overrides?: Partial<LayoutResultV1>): LayoutResultV1 {
  const base: LayoutResultV1 = {
    version: LAYOUT_RESULT_VERSION,
    nodePlacements: [
      {
        nodeId: 'node-1',
        position: { x: 100, y: 200 },
        size: { width: 60, height: 60 },
        bounds: { x: 70, y: 170, width: 60, height: 60 },
        layer: 0,
        bandIndex: 0,
        autoPositioned: true,
      },
      {
        nodeId: 'node-2',
        position: { x: 300, y: 200 },
        size: { width: 60, height: 60 },
        bounds: { x: 270, y: 170, width: 60, height: 60 },
        layer: 0,
        bandIndex: 1,
        autoPositioned: true,
      },
    ],
    edgeRoutes: [
      {
        edgeId: 'edge-1',
        edgeType: 'TRUNK',
        segments: [{ from: { x: 130, y: 200 }, to: { x: 270, y: 200 } }],
        startPoint: { x: 130, y: 200 },
        endPoint: { x: 270, y: 200 },
        laneIndex: 0,
        isNormallyOpen: false,
      },
    ],
    switchgearBlocks: [
      {
        blockId: 'station-GPZ',
        blockType: 'TYPE_A',
        bounds: { x: 0, y: 400, width: 200, height: 150 },
        ports: [
          { portId: 'port-in', role: 'IN', position: { x: 100, y: 400 } },
          { portId: 'port-out', role: 'OUT', position: { x: 100, y: 550 } },
        ],
        internalNodes: ['tr-1'],
        label: 'GPZ-1',
        detail: null,
      },
    ],
    catalogRefs: [],
    relayBindings: [],
    validationErrors: [],
    bounds: { x: 0, y: 170, width: 330, height: 380 },
    hash: '',
  };

  // Compute hash for the base
  const hash = computeLayoutResultHash(base);
  const result = { ...base, ...overrides, hash };
  return result;
}

function makeOv(items: GeometryOverrideItemV1[]): ProjectGeometryOverridesV1 {
  return {
    overridesVersion: OVERRIDES_VERSION,
    studyCaseId: 'case-001',
    snapshotHash: 'snap-abc',
    items,
  };
}

// =============================================================================
// Null/empty overrides
// =============================================================================

describe('applyOverrides — null/empty', () => {
  it('null overrides → passthrough layout', () => {
    const layout = makeLayout();
    const eff = applyOverrides(layout, null);
    expect(eff.nodePlacements).toBe(layout.nodePlacements);
    expect(eff.edgeRoutes).toBe(layout.edgeRoutes);
    expect(eff.appliedCount).toBe(0);
  });

  it('empty items → passthrough layout', () => {
    const layout = makeLayout();
    const eff = applyOverrides(layout, makeOv([]));
    expect(eff.nodePlacements).toBe(layout.nodePlacements);
    expect(eff.appliedCount).toBe(0);
  });

  it('passthrough preserves baseLayoutHash', () => {
    const layout = makeLayout();
    const eff = applyOverrides(layout, null);
    expect(eff.baseLayoutHash).toBe(layout.hash);
  });
});

// =============================================================================
// NODE MOVE_DELTA
// =============================================================================

describe('applyOverrides — NODE MOVE_DELTA', () => {
  it('shifts node position by delta', () => {
    const layout = makeLayout();
    const ov = makeOv([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 40, dy: -20 } },
    ]);

    const eff = applyOverrides(layout, ov);
    const n1 = eff.nodePlacements.find(p => p.nodeId === 'node-1')!;
    expect(n1.position.x).toBe(140); // 100 + 40
    expect(n1.position.y).toBe(180); // 200 - 20
    expect(n1.autoPositioned).toBe(false);
  });

  it('shifts node bounds by delta', () => {
    const layout = makeLayout();
    const ov = makeOv([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 40, dy: -20 } },
    ]);

    const eff = applyOverrides(layout, ov);
    const n1 = eff.nodePlacements.find(p => p.nodeId === 'node-1')!;
    expect(n1.bounds.x).toBe(110); // 70 + 40
    expect(n1.bounds.y).toBe(150); // 170 - 20
    expect(n1.bounds.width).toBe(60);
    expect(n1.bounds.height).toBe(60);
  });

  it('leaves unaffected nodes unchanged', () => {
    const layout = makeLayout();
    const ov = makeOv([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 40, dy: 0 } },
    ]);

    const eff = applyOverrides(layout, ov);
    const n2 = eff.nodePlacements.find(p => p.nodeId === 'node-2')!;
    expect(n2.position.x).toBe(300);
    expect(n2.position.y).toBe(200);
    expect(n2.autoPositioned).toBe(true);
  });

  it('increments appliedCount', () => {
    const layout = makeLayout();
    const ov = makeOv([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 10, dy: 10 } },
      { elementId: 'node-2', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 20, dy: 20 } },
    ]);

    const eff = applyOverrides(layout, ov);
    expect(eff.appliedCount).toBe(2);
  });
});

// =============================================================================
// BLOCK MOVE_DELTA
// =============================================================================

describe('applyOverrides — BLOCK MOVE_DELTA', () => {
  it('shifts block bounds and ports', () => {
    const layout = makeLayout();
    const ov = makeOv([
      { elementId: 'station-GPZ', scope: OverrideScopeV1.BLOCK, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 60, dy: -40 } },
    ]);

    const eff = applyOverrides(layout, ov);
    const block = eff.switchgearBlocks.find(b => b.blockId === 'station-GPZ')!;
    expect(block.bounds.x).toBe(60); // 0 + 60
    expect(block.bounds.y).toBe(360); // 400 - 40
    expect(block.ports[0].position.x).toBe(160); // 100 + 60
    expect(block.ports[0].position.y).toBe(360); // 400 - 40
    expect(block.ports[1].position.x).toBe(160); // 100 + 60
    expect(block.ports[1].position.y).toBe(510); // 550 - 40
  });
});

// =============================================================================
// LABEL MOVE_LABEL
// =============================================================================

describe('applyOverrides — LABEL MOVE_LABEL', () => {
  it('stores label anchor in labelOverrides map', () => {
    const layout = makeLayout();
    const ov = makeOv([
      { elementId: 'node-1', scope: OverrideScopeV1.LABEL, operation: OverrideOperationV1.MOVE_LABEL, payload: { anchorX: 120, anchorY: 80 } },
    ]);

    const eff = applyOverrides(layout, ov);
    expect(eff.labelOverrides.get('node-1')).toEqual({ anchorX: 120, anchorY: 80 });
    expect(eff.appliedCount).toBe(1);
  });
});

// =============================================================================
// Bounds recomputation
// =============================================================================

describe('applyOverrides — bounds', () => {
  it('recomputes bounds after node moves', () => {
    const layout = makeLayout();
    const ov = makeOv([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: -100, dy: -200 } },
    ]);

    const eff = applyOverrides(layout, ov);
    // node-1 bounds: x=-30, y=-30, w=60, h=60 → min is -30,-30
    expect(eff.bounds.x).toBeLessThan(layout.bounds.x);
  });
});

// =============================================================================
// Hash composition
// =============================================================================

describe('applyOverrides — hashes', () => {
  it('effectiveHash combines baseLayoutHash + overridesHash', () => {
    const layout = makeLayout();
    const ov = makeOv([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 20, dy: 0 } },
    ]);

    const eff = applyOverrides(layout, ov);
    expect(eff.baseLayoutHash).toBe(layout.hash);
    expect(eff.overridesHash).toBe(computeOverridesHash(ov));
    expect(eff.effectiveHash).toMatch(/^[0-9a-f]{8}$/);
    expect(eff.effectiveHash).not.toBe(eff.baseLayoutHash);
    expect(eff.effectiveHash).not.toBe(eff.overridesHash);
  });

  it('null overrides → effectiveHash still computed', () => {
    const layout = makeLayout();
    const eff = applyOverrides(layout, null);
    expect(eff.effectiveHash).toMatch(/^[0-9a-f]{8}$/);
  });
});

// =============================================================================
// Collision detection
// =============================================================================

describe('checkEffectiveCollisions', () => {
  it('no collisions in default layout', () => {
    const layout = makeLayout();
    const eff = applyOverrides(layout, null);
    const coll = checkEffectiveCollisions(eff);
    expect(coll.hasCollisions).toBe(false);
    expect(coll.collisions).toHaveLength(0);
  });

  it('detects collision when nodes overlap', () => {
    const layout = makeLayout();
    // Move node-1 to overlap with node-2 (at x=300)
    const ov = makeOv([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 200, dy: 0 } },
    ]);

    const eff = applyOverrides(layout, ov);
    const coll = checkEffectiveCollisions(eff);
    expect(coll.hasCollisions).toBe(true);
    expect(coll.collisions[0]).toEqual({ nodeA: 'node-1', nodeB: 'node-2' });
  });
});

// =============================================================================
// Edge routes preserved
// =============================================================================

describe('applyOverrides — edge routes', () => {
  it('edge routes are preserved (not re-routed)', () => {
    const layout = makeLayout();
    const ov = makeOv([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 100, dy: 100 } },
    ]);

    const eff = applyOverrides(layout, ov);
    expect(eff.edgeRoutes).toBe(layout.edgeRoutes);
  });
});

// =============================================================================
// 50× determinism
// =============================================================================

describe('applyOverrides — 50× determinism', () => {
  it('produces identical EffectiveLayoutV1 across 50 runs', () => {
    const layout = makeLayout();
    const ov = makeOv([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 40, dy: -20 } },
      { elementId: 'station-GPZ', scope: OverrideScopeV1.BLOCK, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 60, dy: 0 } },
      { elementId: 'node-2', scope: OverrideScopeV1.LABEL, operation: OverrideOperationV1.MOVE_LABEL, payload: { anchorX: 120, anchorY: 80 } },
    ]);

    const reference = applyOverrides(layout, ov);
    for (let i = 0; i < 50; i++) {
      const run = applyOverrides(layout, ov);
      expect(run.effectiveHash).toBe(reference.effectiveHash);
      expect(run.overridesHash).toBe(reference.overridesHash);
      expect(run.baseLayoutHash).toBe(reference.baseLayoutHash);
      expect(run.appliedCount).toBe(reference.appliedCount);
    }
  });
});
