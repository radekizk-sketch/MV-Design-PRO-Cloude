/**
 * wizardOverridesE2e.test.ts — RUN #3I §I5: Wizard ↔ Overrides ↔ SLD E2E.
 *
 * BINDING: Full pipeline — Wizard save → Overrides save → ExportManifest determinism.
 * Tests the data flow from wizard state through overrides to manifest.
 *
 * INVARIANTS:
 * - Wizard mutation invalidates case results (model-updated event)
 * - Overrides layer is SEPARATE from layout — wizard does NOT touch overrides
 * - ExportManifest includes overridesHash when overrides exist
 * - Navigation: FixAction(geometry.override_*) → SLD project mode
 * - URL sync: projectMode=true in hash
 */
import { describe, it, expect } from 'vitest';
import { buildExportManifest } from '../exportManifest';
import {
  emptyOverrides,
  canonicalizeOverrides,
  computeOverridesHash,
  OverrideScopeV1,
  OverrideOperationV1,
  validateOverridesAgainstLayout,
} from '../geometryOverrides';
import type { ProjectGeometryOverridesV1, GeometryOverrideItemV1 } from '../geometryOverrides';
import {
  requireOverridesValid,
  overridesIssuesToReadiness,
  ReadinessAreaV1,
  ReadinessPriority,
} from '../readinessProfile';
import type { ReadinessProfileV1 } from '../readinessProfile';
import {
  isOverrideFixAction,
  buildOverrideFixAction,
} from '../../../wizard/switchgear/types';
import {
  ROUTES,
  getRouteByHash,
  isProjectModeFromUrl,
} from '../../../navigation/routes';

// =============================================================================
// Helpers
// =============================================================================

function makeOverrides(items: GeometryOverrideItemV1[]): ProjectGeometryOverridesV1 {
  return canonicalizeOverrides({
    overridesVersion: '1.0',
    studyCaseId: 'case-e2e',
    snapshotHash: 'snap-e2e',
    items,
  });
}

function makeProfile(overrides: Partial<ReadinessProfileV1> = {}): ReadinessProfileV1 {
  return {
    snapshotId: 'snap-e2e',
    snapshotFingerprint: 'fp-e2e',
    sldReady: true,
    shortCircuitReady: true,
    loadFlowReady: true,
    protectionReady: true,
    issues: [],
    contentHash: 'abc',
    ...overrides,
  };
}

// =============================================================================
// E2E: Wizard → Overrides → Manifest chain
// =============================================================================

describe('Wizard ↔ Overrides ↔ Manifest E2E (RUN #3I §I5)', () => {
  it('overrides layer is independent from wizard layout', () => {
    // Wizard produces layout hash (from topology)
    const layoutHash = 'layout-from-wizard-k9';
    const snapshotHash = 'snap-after-wizard-save';

    // Overrides are separate
    const overrides = makeOverrides([
      {
        elementId: 'station-GPZ',
        scope: OverrideScopeV1.BLOCK,
        operation: OverrideOperationV1.MOVE_DELTA,
        payload: { dx: 40, dy: -20 },
      },
    ]);
    const overridesHash = computeOverridesHash(overrides);

    // Manifest includes both
    const manifest = buildExportManifest({
      snapshotHash,
      layoutHash,
      elementIds: ['bus_sn', 'bus_nn', 'tr_1'],
      analysisTypes: ['SC_3F', 'LOAD_FLOW'],
      overridesHash,
      overridesVersion: '1.0',
    });

    expect(manifest.overridesHash).toBe(overridesHash);
    expect(manifest.overridesVersion).toBe('1.0');
    expect(manifest.contentHash).toBeTruthy();
  });

  it('wizard save does NOT affect overrides hash', () => {
    const overrides = makeOverrides([
      {
        elementId: 'node-1',
        scope: OverrideScopeV1.NODE,
        operation: OverrideOperationV1.MOVE_DELTA,
        payload: { dx: 60, dy: 0 },
      },
    ]);
    const hashBefore = computeOverridesHash(overrides);

    // Simulate wizard save → new snapshot hash
    const m1 = buildExportManifest({
      snapshotHash: 'snap-before-wizard',
      layoutHash: 'layout-1',
      elementIds: ['bus_1'],
      analysisTypes: [],
      overridesHash: hashBefore,
    });

    const m2 = buildExportManifest({
      snapshotHash: 'snap-after-wizard',
      layoutHash: 'layout-2',
      elementIds: ['bus_1'],
      analysisTypes: [],
      overridesHash: hashBefore,
    });

    // Overrides hash stays the same (layout change doesn't affect overrides)
    expect(m1.overridesHash).toBe(m2.overridesHash);
    // But content hash changes (different snapshot/layout)
    expect(m1.contentHash).not.toBe(m2.contentHash);
  });

  it('50× determinism: wizard → overrides → manifest chain', () => {
    const overrides = makeOverrides([
      {
        elementId: 'station-GPZ',
        scope: OverrideScopeV1.BLOCK,
        operation: OverrideOperationV1.MOVE_DELTA,
        payload: { dx: 40, dy: -20 },
      },
      {
        elementId: 'bus_sn',
        scope: OverrideScopeV1.NODE,
        operation: OverrideOperationV1.MOVE_DELTA,
        payload: { dx: 20, dy: 0 },
      },
    ]);
    const overridesHash = computeOverridesHash(overrides);

    let refHash: string | null = null;
    for (let i = 0; i < 50; i++) {
      const manifest = buildExportManifest({
        snapshotHash: 'snap-e2e-stable',
        layoutHash: 'layout-e2e-stable',
        elementIds: ['bus_sn', 'bus_nn', 'tr_1', 'station-GPZ'],
        analysisTypes: ['SC_3F'],
        overridesHash,
        overridesVersion: '1.0',
        readinessStatus: 'READY',
      });
      if (refHash === null) {
        refHash = manifest.contentHash;
      } else {
        expect(manifest.contentHash).toBe(refHash);
      }
    }
  });
});

// =============================================================================
// E2E: Overrides validation → Readiness → Gate
// =============================================================================

describe('Overrides validation → Readiness gate E2E (RUN #3I §I5)', () => {
  it('valid overrides pass gate', () => {
    const overrides = makeOverrides([
      {
        elementId: 'node-1',
        scope: OverrideScopeV1.NODE,
        operation: OverrideOperationV1.MOVE_DELTA,
        payload: { dx: 20, dy: 0 },
      },
    ]);

    const nodeIds = new Set(['node-1', 'node-2']);
    const blockIds = new Set(['station-GPZ']);
    const result = validateOverridesAgainstLayout(overrides, nodeIds, blockIds);
    expect(result.valid).toBe(true);

    // No issues → gate passes
    const profile = makeProfile({ issues: [] });
    requireOverridesValid(profile); // should not throw
  });

  it('invalid overrides produce issues that block gate', () => {
    const overrides = makeOverrides([
      {
        elementId: 'unknown-node',
        scope: OverrideScopeV1.NODE,
        operation: OverrideOperationV1.MOVE_DELTA,
        payload: { dx: 20, dy: 0 },
      },
    ]);

    const nodeIds = new Set(['node-1']);
    const blockIds = new Set<string>();
    const result = validateOverridesAgainstLayout(overrides, nodeIds, blockIds);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Convert to readiness issues
    const readinessIssues = overridesIssuesToReadiness(result.errors);
    expect(readinessIssues.length).toBeGreaterThan(0);
    expect(readinessIssues[0].priority).toBe(ReadinessPriority.BLOCKER);

    // Gate blocks
    const profile = makeProfile({ issues: readinessIssues });
    expect(() => requireOverridesValid(profile)).toThrow();
  });

  it('empty overrides pass gate', () => {
    const overrides = emptyOverrides('case-1', 'snap-1');
    const nodeIds = new Set(['node-1']);
    const blockIds = new Set<string>();
    const result = validateOverridesAgainstLayout(overrides, nodeIds, blockIds);
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// E2E: FixAction navigation — override → SLD project mode
// =============================================================================

describe('FixAction navigation: override → SLD project mode (RUN #3I §I5)', () => {
  it('isOverrideFixAction detects override codes', () => {
    expect(isOverrideFixAction('geometry.override_invalid_element')).toBe(true);
    expect(isOverrideFixAction('geometry.override_causes_collision')).toBe(true);
    expect(isOverrideFixAction('geometry.override_forbidden_for_station_type')).toBe(true);
    expect(isOverrideFixAction('topology.missing_bus')).toBe(false);
    expect(isOverrideFixAction('field.device_missing.cb')).toBe(false);
  });

  it('buildOverrideFixAction creates proper structure', () => {
    const fix = buildOverrideFixAction(
      'node-1',
      'geometry.override_invalid_element',
      'Element nie istnieje w layoucie',
    );
    expect(fix.code).toBe('geometry.override_invalid_element');
    expect(fix.elementId).toBe('node-1');
    expect(fix.severity).toBe('BLOCKER');
    expect(fix.actionType).toBe('OPEN_PROJECT_MODE');
  });

  it('SLD route exists', () => {
    expect(ROUTES.SLD).toBeDefined();
    expect(ROUTES.SLD.hash).toBe('');
  });

  it('WIZARD route exists for step navigation', () => {
    expect(ROUTES.WIZARD).toBeDefined();
    expect(ROUTES.WIZARD.hash).toBe('#wizard');
  });
});

// =============================================================================
// E2E: Full pipeline save → load → validate → manifest
// =============================================================================

describe('Full save → load → validate → manifest pipeline (RUN #3I §I5)', () => {
  it('simulates complete E2E flow', () => {
    // Step 1: Wizard produces topology
    const snapshotHash = 'snap-from-wizard-k10';
    const layoutHash = 'layout-from-sld-engine';
    const elementIds = ['bus_gpz', 'bus_sn_st01', 'bus_nn_st01', 'tr_1', 'load_01'];

    // Step 2: User edits geometry in project mode
    const overrides = makeOverrides([
      {
        elementId: 'bus_gpz',
        scope: OverrideScopeV1.NODE,
        operation: OverrideOperationV1.MOVE_DELTA,
        payload: { dx: 60, dy: -40 },
      },
      {
        elementId: 'bus_sn_st01',
        scope: OverrideScopeV1.LABEL,
        operation: OverrideOperationV1.MOVE_LABEL,
        payload: { anchorX: 120, anchorY: 80 },
      },
    ]);

    // Step 3: Validate overrides
    const nodeIds = new Set(elementIds);
    const blockIds = new Set<string>();
    const validation = validateOverridesAgainstLayout(overrides, nodeIds, blockIds);
    expect(validation.valid).toBe(true);

    // Step 4: Compute hashes
    const overridesHash = computeOverridesHash(overrides);
    expect(overridesHash).toMatch(/^[0-9a-f]{8}$/); // FNV-1a = 8 hex chars

    // Step 5: Build export manifest
    const manifest = buildExportManifest({
      snapshotHash,
      layoutHash,
      elementIds,
      analysisTypes: ['SC_3F', 'LOAD_FLOW'],
      overridesHash,
      overridesVersion: '1.0',
      readinessStatus: 'READY',
    });

    // Step 6: Verify manifest integrity
    expect(manifest.snapshotHash).toBe(snapshotHash);
    expect(manifest.layoutHash).toBe(layoutHash);
    expect(manifest.overridesHash).toBe(overridesHash);
    expect(manifest.overridesVersion).toBe('1.0');
    expect(manifest.readinessStatus).toBe('READY');
    expect(manifest.specVersion).toBe('1.2');
    expect(manifest.contentHash).toMatch(/^[0-9a-f]{64}$/);

    // Step 7: 50× stability of the full chain
    for (let i = 0; i < 50; i++) {
      const m = buildExportManifest({
        snapshotHash,
        layoutHash,
        elementIds,
        analysisTypes: ['SC_3F', 'LOAD_FLOW'],
        overridesHash,
        overridesVersion: '1.0',
        readinessStatus: 'READY',
      });
      expect(m.contentHash).toBe(manifest.contentHash);
    }
  });
});
