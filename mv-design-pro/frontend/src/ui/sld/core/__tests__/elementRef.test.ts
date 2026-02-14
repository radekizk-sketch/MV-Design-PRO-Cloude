/**
 * Tests for ElementRefV1 + ReadinessProfileV1 + ResultJoinV1 (KROK 1).
 */

import { describe, it, expect } from 'vitest';
import {
  ElementTypeV1,
  ElementScopeV1,
  buildElementRefIndex,
} from '../elementRef';
import type { ElementRefV1 } from '../elementRef';
import {
  ReadinessAreaV1,
  ReadinessPriority,
  groupIssuesByArea,
  getBlockers,
} from '../readinessProfile';
import type { ReadinessIssueV1, ReadinessProfileV1 } from '../readinessProfile';
import {
  OverlayTokenKindV1,
  InspectorFactSourceV1,
  joinResults,
} from '../resultJoin';
import type { ElementResultInput } from '../resultJoin';

// =============================================================================
// ElementRefV1
// =============================================================================

describe('ElementRefV1', () => {
  it('ElementTypeV1 has all canonical types', () => {
    expect(ElementTypeV1.NODE).toBe('NODE');
    expect(ElementTypeV1.BRANCH).toBe('BRANCH');
    expect(ElementTypeV1.TRANSFORMER).toBe('TRANSFORMER');
    expect(ElementTypeV1.STATION).toBe('STATION');
    expect(ElementTypeV1.BUS_SECTION).toBe('BUS_SECTION');
    expect(ElementTypeV1.FIELD).toBe('FIELD');
    expect(ElementTypeV1.DEVICE).toBe('DEVICE');
    expect(ElementTypeV1.GENERATOR).toBe('GENERATOR');
    expect(ElementTypeV1.SOURCE).toBe('SOURCE');
    expect(ElementTypeV1.LOAD).toBe('LOAD');
    expect(ElementTypeV1.SWITCH).toBe('SWITCH');
    expect(ElementTypeV1.PROTECTION_ASSIGNMENT).toBe('PROTECTION_ASSIGNMENT');
    expect(ElementTypeV1.MEASUREMENT).toBe('MEASUREMENT');
    expect(ElementTypeV1.CORRIDOR).toBe('CORRIDOR');
    expect(ElementTypeV1.JUNCTION).toBe('JUNCTION');
    expect(Object.keys(ElementTypeV1).length).toBe(15);
  });

  it('ElementScopeV1 has all scopes', () => {
    expect(Object.keys(ElementScopeV1).length).toBe(5);
    expect(ElementScopeV1.DOMAIN).toBe('DOMAIN');
    expect(ElementScopeV1.SNAPSHOT).toBe('SNAPSHOT');
    expect(ElementScopeV1.SLD).toBe('SLD');
    expect(ElementScopeV1.RESULT).toBe('RESULT');
    expect(ElementScopeV1.EXPORT).toBe('EXPORT');
  });

  it('buildElementRefIndex sorts by elementId', () => {
    const refs: ElementRefV1[] = [
      { elementId: 'c', elementType: ElementTypeV1.BRANCH, stationId: null, catalogRef: null },
      { elementId: 'a', elementType: ElementTypeV1.NODE, stationId: null, catalogRef: null },
      { elementId: 'b', elementType: ElementTypeV1.LOAD, stationId: null, catalogRef: null },
    ];
    const index = buildElementRefIndex(refs);
    expect([...index.keys()]).toEqual(['a', 'b', 'c']);
    expect(index.get('a')!.elementType).toBe(ElementTypeV1.NODE);
  });
});

// =============================================================================
// ReadinessProfileV1
// =============================================================================

describe('ReadinessProfileV1', () => {
  it('groupIssuesByArea groups correctly', () => {
    const issues: ReadinessIssueV1[] = [
      { code: 'a', area: ReadinessAreaV1.TOPOLOGY, priority: ReadinessPriority.INFO, messagePl: 'x', elementId: null, elementType: null, fixHintPl: null, wizardStep: null },
      { code: 'b', area: ReadinessAreaV1.CATALOGS, priority: ReadinessPriority.WARNING, messagePl: 'y', elementId: null, elementType: null, fixHintPl: null, wizardStep: null },
      { code: 'c', area: ReadinessAreaV1.TOPOLOGY, priority: ReadinessPriority.BLOCKER, messagePl: 'z', elementId: null, elementType: null, fixHintPl: null, wizardStep: null },
    ];
    const grouped = groupIssuesByArea(issues);
    expect(grouped.get(ReadinessAreaV1.TOPOLOGY)!.length).toBe(2);
    expect(grouped.get(ReadinessAreaV1.CATALOGS)!.length).toBe(1);
    expect(grouped.has(ReadinessAreaV1.SOURCES)).toBe(false);
  });

  it('getBlockers filters correctly', () => {
    const issues: ReadinessIssueV1[] = [
      { code: 'a', area: ReadinessAreaV1.TOPOLOGY, priority: ReadinessPriority.INFO, messagePl: 'x', elementId: null, elementType: null, fixHintPl: null, wizardStep: null },
      { code: 'b', area: ReadinessAreaV1.TOPOLOGY, priority: ReadinessPriority.BLOCKER, messagePl: 'y', elementId: 'bus_1', elementType: null, fixHintPl: null, wizardStep: null },
      { code: 'c', area: ReadinessAreaV1.CATALOGS, priority: ReadinessPriority.WARNING, messagePl: 'z', elementId: null, elementType: null, fixHintPl: null, wizardStep: null },
    ];
    const blockers = getBlockers(issues);
    expect(blockers.length).toBe(1);
    expect(blockers[0].code).toBe('b');
  });

  it('ReadinessAreaV1 has all 7 areas', () => {
    expect(Object.keys(ReadinessAreaV1).length).toBe(7);
  });
});

// =============================================================================
// ResultJoinV1
// =============================================================================

describe('ResultJoinV1', () => {
  function makeIndex(): ReadonlyMap<string, ElementRefV1> {
    return buildElementRefIndex([
      { elementId: 'bus_1', elementType: ElementTypeV1.NODE, stationId: null, catalogRef: null },
      { elementId: 'bus_2', elementType: ElementTypeV1.NODE, stationId: null, catalogRef: null },
      { elementId: 'branch_1', elementType: ElementTypeV1.BRANCH, stationId: null, catalogRef: null },
    ]);
  }

  it('full match produces tokens and facts', () => {
    const idx = makeIndex();
    const results: ElementResultInput[] = [
      { elementRef: 'bus_1', elementType: 'Bus', values: { v_pu: 1.02, u_kv: 15.3 } },
      { elementRef: 'branch_1', elementType: 'Branch', values: { i_a: 120.5 } },
    ];
    const join = joinResults(idx, results, 'LOAD_FLOW');
    expect(join.sldTokens.length).toBe(3);
    expect(join.inspectorFacts.length).toBe(3);
    expect(join.orphanElementIds.length).toBe(0);
    expect(join.unmatchedSnapshotIds).toContain('bus_2');
  });

  it('orphan detection', () => {
    const idx = makeIndex();
    const results: ElementResultInput[] = [
      { elementRef: 'unknown_1', elementType: 'Bus', values: { v_pu: 1.0 } },
    ];
    const join = joinResults(idx, results, 'LOAD_FLOW');
    expect(join.orphanElementIds).toContain('unknown_1');
    const orphanTokens = join.sldTokens.filter(t => t.tokenKind === OverlayTokenKindV1.ORPHAN_RESULT);
    expect(orphanTokens.length).toBe(1);
  });

  it('SC analysis classifies tokens as SHORT_CIRCUIT', () => {
    const idx = buildElementRefIndex([
      { elementId: 'bus_1', elementType: ElementTypeV1.NODE, stationId: null, catalogRef: null },
    ]);
    const results: ElementResultInput[] = [
      { elementRef: 'bus_1', elementType: 'Bus', values: { ikss_ka: 12.5, ip_ka: 31.8 } },
    ];
    const join = joinResults(idx, results, 'SC_3F');
    const scTokens = join.sldTokens.filter(t => t.tokenKind === OverlayTokenKindV1.SHORT_CIRCUIT);
    expect(scTokens.length).toBe(2);
  });

  it('determinism: order of results does not matter', () => {
    const idx = makeIndex();
    const results: ElementResultInput[] = [
      { elementRef: 'branch_1', elementType: 'Branch', values: { i_a: 100 } },
      { elementRef: 'bus_1', elementType: 'Bus', values: { v_pu: 1.0 } },
    ];
    const j1 = joinResults(idx, results, 'LOAD_FLOW');
    const j2 = joinResults(idx, [...results].reverse(), 'LOAD_FLOW');
    // Tokens should be identical regardless of input order
    expect(j1.sldTokens.length).toBe(j2.sldTokens.length);
    expect(j1.sldTokens.map(t => t.elementId)).toEqual(j2.sldTokens.map(t => t.elementId));
  });

  it('empty results', () => {
    const idx = makeIndex();
    const join = joinResults(idx, [], 'LOAD_FLOW');
    expect(join.sldTokens.length).toBe(0);
    expect(join.inspectorFacts.length).toBe(0);
    expect(join.unmatchedSnapshotIds.length).toBe(3);
  });

  it('InspectorFactSourceV1 values', () => {
    expect(InspectorFactSourceV1.DOMAIN).toBe('DOMAIN');
    expect(InspectorFactSourceV1.SOLVER).toBe('SOLVER');
    expect(InspectorFactSourceV1.READINESS).toBe('READINESS');
  });

  it('tokens do not affect geometry (descriptive only)', () => {
    const idx = buildElementRefIndex([
      { elementId: 'bus_1', elementType: ElementTypeV1.NODE, stationId: null, catalogRef: null },
    ]);
    const results: ElementResultInput[] = [
      { elementRef: 'bus_1', elementType: 'Bus', values: { v_pu: 1.02 } },
    ];
    const join = joinResults(idx, results, 'LOAD_FLOW');
    const token = join.sldTokens[0];
    // Token has no position/size/routing properties
    expect(token).not.toHaveProperty('x');
    expect(token).not.toHaveProperty('y');
    expect(token).not.toHaveProperty('width');
    expect(token).not.toHaveProperty('height');
    expect(token).toHaveProperty('elementId');
    expect(token).toHaveProperty('tokenKind');
    expect(token).toHaveProperty('labelPl');
  });
});
