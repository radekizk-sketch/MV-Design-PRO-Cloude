/**
 * Tests for ProjectGeometryOverridesV1 contract (RUN #3H §2).
 *
 * Covers:
 * - canonicalization (sort determinism)
 * - hashing (FNV-1a, permutation invariance)
 * - validation (elementId existence, scope-operation compat, payload checks)
 * - snap-to-grid
 * - FixAction codes stability
 * - 50× determinism runs
 */

import { describe, it, expect } from 'vitest';

import {
  OVERRIDES_VERSION,
  OverrideScopeV1,
  OverrideOperationV1,
  GeometryFixCodes,
  GEOMETRY_GRID_SNAP,
  emptyOverrides,
  canonicalizeOverrides,
  computeOverridesHash,
  snapToGrid,
  snapDeltaToGrid,
  validateOverridesAgainstLayout,
} from '../geometryOverrides';

import type {
  ProjectGeometryOverridesV1,
  GeometryOverrideItemV1,
} from '../geometryOverrides';

// =============================================================================
// Fixtures
// =============================================================================

function makeOverrides(
  items: GeometryOverrideItemV1[],
): ProjectGeometryOverridesV1 {
  return {
    overridesVersion: OVERRIDES_VERSION,
    studyCaseId: 'case-001',
    snapshotHash: 'abc123',
    items,
  };
}

const NODE_IDS = new Set(['node-1', 'node-2', 'node-3', 'station-GPZ']);
const BLOCK_IDS = new Set(['station-GPZ', 'station-TR1']);

// =============================================================================
// OVERRIDES_VERSION
// =============================================================================

describe('OVERRIDES_VERSION', () => {
  it('is 1.0', () => {
    expect(OVERRIDES_VERSION).toBe('1.0');
  });
});

// =============================================================================
// emptyOverrides
// =============================================================================

describe('emptyOverrides', () => {
  it('creates empty overrides with version and ids', () => {
    const ov = emptyOverrides('case-1', 'hash-abc');
    expect(ov.overridesVersion).toBe('1.0');
    expect(ov.studyCaseId).toBe('case-1');
    expect(ov.snapshotHash).toBe('hash-abc');
    expect(ov.items).toEqual([]);
  });
});

// =============================================================================
// canonicalizeOverrides
// =============================================================================

describe('canonicalizeOverrides', () => {
  it('sorts items by elementId → scope → operation', () => {
    const ov = makeOverrides([
      { elementId: 'z-node', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 0, dy: 0 } },
      { elementId: 'a-block', scope: OverrideScopeV1.BLOCK, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 0, dy: 0 } },
      { elementId: 'a-block', scope: OverrideScopeV1.LABEL, operation: OverrideOperationV1.MOVE_LABEL, payload: { anchorX: 0, anchorY: 0 } },
    ]);

    const canonical = canonicalizeOverrides(ov);
    expect(canonical.items[0].elementId).toBe('a-block');
    expect(canonical.items[0].scope).toBe('BLOCK');
    expect(canonical.items[1].elementId).toBe('a-block');
    expect(canonical.items[1].scope).toBe('LABEL');
    expect(canonical.items[2].elementId).toBe('z-node');
  });

  it('preserves metadata fields', () => {
    const ov = makeOverrides([]);
    const canonical = canonicalizeOverrides(ov);
    expect(canonical.overridesVersion).toBe(OVERRIDES_VERSION);
    expect(canonical.studyCaseId).toBe('case-001');
    expect(canonical.snapshotHash).toBe('abc123');
  });
});

// =============================================================================
// computeOverridesHash
// =============================================================================

describe('computeOverridesHash', () => {
  it('returns 8-char hex string', () => {
    const hash = computeOverridesHash(makeOverrides([]));
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('is deterministic', () => {
    const ov = makeOverrides([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 40, dy: -20 } },
    ]);
    const h1 = computeOverridesHash(ov);
    const h2 = computeOverridesHash(ov);
    expect(h1).toBe(h2);
  });

  it('is permutation invariant', () => {
    const items: GeometryOverrideItemV1[] = [
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 10, dy: 20 } },
      { elementId: 'node-2', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 30, dy: 40 } },
    ];

    const h1 = computeOverridesHash(makeOverrides(items));
    const h2 = computeOverridesHash(makeOverrides([...items].reverse()));
    expect(h1).toBe(h2);
  });

  it('differs for different payloads', () => {
    const h1 = computeOverridesHash(
      makeOverrides([
        { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 10, dy: 20 } },
      ]),
    );
    const h2 = computeOverridesHash(
      makeOverrides([
        { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 10, dy: 21 } },
      ]),
    );
    expect(h1).not.toBe(h2);
  });

  it('empty overrides have stable hash', () => {
    const h = computeOverridesHash(makeOverrides([]));
    expect(h).toMatch(/^[0-9a-f]{8}$/);
    // Verify consistency across 50 runs
    for (let i = 0; i < 50; i++) {
      expect(computeOverridesHash(makeOverrides([]))).toBe(h);
    }
  });
});

// =============================================================================
// snapToGrid
// =============================================================================

describe('snapToGrid', () => {
  it('snaps to default grid (20px)', () => {
    expect(snapToGrid(25)).toBe(20);
    expect(snapToGrid(30)).toBe(40);
    expect(snapToGrid(10)).toBe(20);
    expect(snapToGrid(0)).toBe(0);
    expect(snapToGrid(-15)).toBe(-20);
  });

  it('snaps to custom grid', () => {
    expect(snapToGrid(7, 5)).toBe(5);
    expect(snapToGrid(13, 5)).toBe(15);
  });

  it('GEOMETRY_GRID_SNAP is 20', () => {
    expect(GEOMETRY_GRID_SNAP).toBe(20);
  });
});

describe('snapDeltaToGrid', () => {
  it('snaps both dx and dy', () => {
    const result = snapDeltaToGrid(25, -35);
    expect(result.dx).toBe(20);
    expect(result.dy).toBe(-40);
  });
});

// =============================================================================
// validateOverridesAgainstLayout
// =============================================================================

describe('validateOverridesAgainstLayout', () => {
  it('valid NODE MOVE_DELTA passes', () => {
    const ov = makeOverrides([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 20, dy: -40 } },
    ]);
    const result = validateOverridesAgainstLayout(ov, NODE_IDS, BLOCK_IDS);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('valid BLOCK MOVE_DELTA passes', () => {
    const ov = makeOverrides([
      { elementId: 'station-GPZ', scope: OverrideScopeV1.BLOCK, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 40, dy: 0 } },
    ]);
    const result = validateOverridesAgainstLayout(ov, NODE_IDS, BLOCK_IDS);
    expect(result.valid).toBe(true);
  });

  it('valid LABEL MOVE_LABEL passes (node-based)', () => {
    const ov = makeOverrides([
      { elementId: 'node-1', scope: OverrideScopeV1.LABEL, operation: OverrideOperationV1.MOVE_LABEL, payload: { anchorX: 100, anchorY: 50 } },
    ]);
    const result = validateOverridesAgainstLayout(ov, NODE_IDS, BLOCK_IDS);
    expect(result.valid).toBe(true);
  });

  it('rejects NODE with unknown elementId', () => {
    const ov = makeOverrides([
      { elementId: 'does-not-exist', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 0, dy: 0 } },
    ]);
    const result = validateOverridesAgainstLayout(ov, NODE_IDS, BLOCK_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('geometry.override_invalid_element');
  });

  it('rejects BLOCK with unknown blockId', () => {
    const ov = makeOverrides([
      { elementId: 'unknown-block', scope: OverrideScopeV1.BLOCK, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 0, dy: 0 } },
    ]);
    const result = validateOverridesAgainstLayout(ov, NODE_IDS, BLOCK_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('geometry.override_invalid_element');
  });

  it('rejects NODE + REORDER_FIELD (wrong scope-op combo)', () => {
    const ov = makeOverrides([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.REORDER_FIELD, payload: { fieldOrder: [] } },
    ]);
    const result = validateOverridesAgainstLayout(ov, NODE_IDS, BLOCK_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('geometry.override_forbidden_for_station_type');
  });

  it('rejects MOVE_DELTA with non-finite dx', () => {
    const ov = makeOverrides([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: Infinity, dy: 0 } },
    ]);
    const result = validateOverridesAgainstLayout(ov, NODE_IDS, BLOCK_IDS);
    expect(result.valid).toBe(false);
  });

  it('rejects LABEL + MOVE_DELTA (wrong operation for scope)', () => {
    const ov = makeOverrides([
      { elementId: 'node-1', scope: OverrideScopeV1.LABEL, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 0, dy: 0 } },
    ]);
    const result = validateOverridesAgainstLayout(ov, NODE_IDS, BLOCK_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('geometry.override_forbidden_for_station_type');
  });

  it('empty overrides are valid', () => {
    const ov = makeOverrides([]);
    const result = validateOverridesAgainstLayout(ov, NODE_IDS, BLOCK_IDS);
    expect(result.valid).toBe(true);
  });

  it('multiple errors reported for multiple violations', () => {
    const ov = makeOverrides([
      { elementId: 'unknown-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 0, dy: 0 } },
      { elementId: 'unknown-2', scope: OverrideScopeV1.BLOCK, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 0, dy: 0 } },
    ]);
    const result = validateOverridesAgainstLayout(ov, NODE_IDS, BLOCK_IDS);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(2);
  });
});

// =============================================================================
// GeometryFixCodes stability
// =============================================================================

describe('GeometryFixCodes', () => {
  it('all codes are stable strings', () => {
    expect(GeometryFixCodes.OVERRIDE_INVALID_ELEMENT).toBe('geometry.override_invalid_element');
    expect(GeometryFixCodes.OVERRIDE_CAUSES_COLLISION).toBe('geometry.override_causes_collision');
    expect(GeometryFixCodes.OVERRIDE_BREAKS_PORT_CONSTRAINTS).toBe('geometry.override_breaks_port_constraints');
    expect(GeometryFixCodes.OVERRIDE_FORBIDDEN_FOR_STATION_TYPE).toBe('geometry.override_forbidden_for_station_type');
    expect(GeometryFixCodes.OVERRIDE_REQUIRES_UNLOCK).toBe('geometry.override_requires_unlock');
  });

  it('has exactly 5 codes', () => {
    expect(Object.keys(GeometryFixCodes)).toHaveLength(5);
  });
});

// =============================================================================
// Scope/Operation enums
// =============================================================================

describe('OverrideScopeV1', () => {
  it('has 5 values', () => {
    expect(Object.keys(OverrideScopeV1)).toHaveLength(5);
    expect(OverrideScopeV1.NODE).toBe('NODE');
    expect(OverrideScopeV1.BLOCK).toBe('BLOCK');
    expect(OverrideScopeV1.FIELD).toBe('FIELD');
    expect(OverrideScopeV1.LABEL).toBe('LABEL');
    expect(OverrideScopeV1.EDGE_CHANNEL).toBe('EDGE_CHANNEL');
  });
});

describe('OverrideOperationV1', () => {
  it('has 3 values', () => {
    expect(Object.keys(OverrideOperationV1)).toHaveLength(3);
    expect(OverrideOperationV1.MOVE_DELTA).toBe('MOVE_DELTA');
    expect(OverrideOperationV1.REORDER_FIELD).toBe('REORDER_FIELD');
    expect(OverrideOperationV1.MOVE_LABEL).toBe('MOVE_LABEL');
  });
});

// =============================================================================
// 50× determinism
// =============================================================================

describe('determinism (50×)', () => {
  it('computeOverridesHash produces identical hash 50 times', () => {
    const ov = makeOverrides([
      { elementId: 'node-1', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 40, dy: -20 } },
      { elementId: 'station-GPZ', scope: OverrideScopeV1.BLOCK, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 60, dy: 0 } },
      { elementId: 'node-2', scope: OverrideScopeV1.LABEL, operation: OverrideOperationV1.MOVE_LABEL, payload: { anchorX: 100, anchorY: 50 } },
    ]);
    const reference = computeOverridesHash(ov);
    for (let i = 0; i < 50; i++) {
      expect(computeOverridesHash(ov)).toBe(reference);
    }
  });

  it('canonicalizeOverrides is idempotent 50 times', () => {
    const ov = makeOverrides([
      { elementId: 'z', scope: OverrideScopeV1.NODE, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 1, dy: 2 } },
      { elementId: 'a', scope: OverrideScopeV1.BLOCK, operation: OverrideOperationV1.MOVE_DELTA, payload: { dx: 3, dy: 4 } },
    ]);
    const reference = JSON.stringify(canonicalizeOverrides(ov));
    for (let i = 0; i < 50; i++) {
      expect(JSON.stringify(canonicalizeOverrides(ov))).toBe(reference);
    }
  });
});
