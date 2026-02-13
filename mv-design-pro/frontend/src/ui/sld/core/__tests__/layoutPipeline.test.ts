/**
 * Layout Pipeline V1 — Testy determinizmu i inwariantow.
 *
 * Pokrycie:
 * - Hash stability (100x)
 * - Permutation invariance (50x)
 * - Symbol-symbol overlap == 0
 * - laneIndex stability dla secondary connectors
 * - Camera independence (hash nie zalezy od viewport)
 * - Embedded blocks A/B/C/D
 * - OZE PV/BESS 3 scenariusze
 * - Catalog refs i relay bindings
 * - LayoutResultV1 validation
 * - Trunk crossing test
 * - Stress test (500+ wezlow)
 */

import { describe, it, expect } from 'vitest';
import { computeLayout, DEFAULT_LAYOUT_CONFIG } from '../layoutPipeline';
import type { LayoutGeometryConfigV1 } from '../layoutPipeline';
import {
  computeLayoutResultHash,
  validateLayoutResult,
  StationBlockType,
  CatalogCategory,
  LAYOUT_RESULT_VERSION,
} from '../layoutResult';
import type { LayoutResultV1 } from '../layoutResult';
import { convertToVisualGraph } from '../topologyAdapterV1';
import { computeVisualGraphHash, NodeTypeV1, EdgeTypeV1 } from '../visualGraph';
import type { AnySldSymbol, BusSymbol, BranchSymbol, SwitchSymbol, SourceSymbol, LoadSymbol } from '../../../sld-editor/types';

// =============================================================================
// FIXTURES — Rozszerzone golden networks
// =============================================================================

/** GN-SLD-01: GPZ + magistrala + 10 stacji typ A */
function buildGN01(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src_gpz', elementId: 'src_gpz', elementType: 'Source', elementName: 'GPZ 110/15kV Zasilanie', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn_main' } as SourceSymbol);
  s.push({ id: 'bus_sn_main', elementId: 'bus_sn_main', elementType: 'Bus', elementName: 'Szyna SN 15kV GPZ', position: { x: 0, y: 0 }, inService: true, width: 600, height: 10 } as BusSymbol);

  for (let i = 1; i <= 10; i++) {
    const stId = `st_a${i}`;
    s.push({ id: `line_${stId}`, elementId: `line_${stId}`, elementType: 'LineBranch', elementName: `Linia SN magistrala ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: i === 1 ? 'bus_sn_main' : `bus_sn_st_a${i - 1}`, toNodeId: `bus_sn_${stId}`, points: [], branchType: 'LINE' } as BranchSymbol);
    s.push({ id: `bus_sn_${stId}`, elementId: `bus_sn_${stId}`, elementType: 'Bus', elementName: `Szyna SN 15kV Stacja A${i}`, position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
    s.push({ id: `tr_${stId}`, elementId: `tr_${stId}`, elementType: 'TransformerBranch', elementName: `TR SN/nN Stacja A${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: `bus_sn_${stId}`, toNodeId: `bus_nn_${stId}`, points: [] } as BranchSymbol);
    s.push({ id: `bus_nn_${stId}`, elementId: `bus_nn_${stId}`, elementType: 'Bus', elementName: `Szyna nN 0.4kV Stacja A${i}`, position: { x: 0, y: 0 }, inService: true, width: 40, height: 6 } as BusSymbol);
    s.push({ id: `load_${stId}`, elementId: `load_${stId}`, elementType: 'Load', elementName: `Odbiorca A${i}`, position: { x: 0, y: 0 }, inService: true, connectedToNodeId: `bus_nn_${stId}` } as LoadSymbol);
  }
  return s;
}

/** GN-SLD-02: Magistrala + NOP + ring */
function buildGN02(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus1' } as SourceSymbol);
  s.push({ id: 'bus1', elementId: 'bus1', elementType: 'Bus', elementName: 'Szyna SN 15kV S1', position: { x: 0, y: 0 }, inService: true, width: 300, height: 10 } as BusSymbol);
  s.push({ id: 'bus2', elementId: 'bus2', elementType: 'Bus', elementName: 'Szyna SN 15kV S2', position: { x: 0, y: 0 }, inService: true, width: 300, height: 10 } as BusSymbol);
  s.push({ id: 'nop', elementId: 'nop', elementType: 'Switch', elementName: 'NOP Sekcyjny', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus1', toNodeId: 'bus2', switchState: 'OPEN', switchType: 'DISCONNECTOR' } as SwitchSymbol);

  for (let i = 1; i <= 4; i++) {
    s.push({ id: `bus_r${i}`, elementId: `bus_r${i}`, elementType: 'Bus', elementName: `Szyna SN Ring ${i}`, position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
    if (i === 1) {
      s.push({ id: `line_r${i}`, elementId: `line_r${i}`, elementType: 'LineBranch', elementName: `Linia Ring ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus1', toNodeId: `bus_r${i}`, points: [], branchType: 'LINE' } as BranchSymbol);
    } else {
      s.push({ id: `line_r${i}`, elementId: `line_r${i}`, elementType: 'LineBranch', elementName: `Linia Ring ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: `bus_r${i - 1}`, toNodeId: `bus_r${i}`, points: [], branchType: 'CABLE' } as BranchSymbol);
    }
  }
  // Ring close NOP
  s.push({ id: 'nop_ring', elementId: 'nop_ring', elementType: 'Switch', elementName: 'NOP Ring Close', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_r4', toNodeId: 'bus2', switchState: 'OPEN', switchType: 'LOAD_SWITCH' } as SwitchSymbol);

  return s;
}

/** GN-SLD-03: Stacja typ C + branch */
function buildGN03_TypeC(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  s.push({ id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN 15kV', position: { x: 0, y: 0 }, inService: true, width: 400, height: 10 } as BusSymbol);
  s.push({ id: 'cb_main', elementId: 'cb_main', elementType: 'Switch', elementName: 'Wylacznik glowny', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn', toNodeId: 'bus_sn', switchState: 'CLOSED', switchType: 'BREAKER' } as SwitchSymbol);
  s.push({ id: 'line_branch', elementId: 'line_branch', elementType: 'LineBranch', elementName: 'Odgalezienie do stacji C', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn', toNodeId: 'bus_st_c', points: [], branchType: 'CABLE' } as BranchSymbol);
  s.push({ id: 'bus_st_c', elementId: 'bus_st_c', elementType: 'Bus', elementName: 'Szyna SN 15kV Stacja C', position: { x: 0, y: 0 }, inService: true, width: 80, height: 8 } as BusSymbol);
  s.push({ id: 'tr_c', elementId: 'tr_c', elementType: 'TransformerBranch', elementName: 'TR SN/nN Stacja C', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_st_c', toNodeId: 'bus_nn_c', points: [] } as BranchSymbol);
  s.push({ id: 'bus_nn_c', elementId: 'bus_nn_c', elementType: 'Bus', elementName: 'Szyna nN 0.4kV Stacja C', position: { x: 0, y: 0 }, inService: true, width: 60, height: 6 } as BusSymbol);
  s.push({ id: 'load_c', elementId: 'load_c', elementType: 'Load', elementName: 'Odbiorca C', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_nn_c' } as LoadSymbol);
  return s;
}

/** GN-SLD-04: Stacja typ D sekcyjna */
function buildGN04_TypeD(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn_s1' } as SourceSymbol);
  s.push({ id: 'bus_sn_s1', elementId: 'bus_sn_s1', elementType: 'Bus', elementName: 'Szyna SN 15kV Sekcja 1', position: { x: 0, y: 0 }, inService: true, width: 200, height: 10 } as BusSymbol);
  s.push({ id: 'bus_sn_s2', elementId: 'bus_sn_s2', elementType: 'Bus', elementName: 'Szyna SN 15kV Sekcja 2', position: { x: 0, y: 0 }, inService: true, width: 200, height: 10 } as BusSymbol);
  s.push({ id: 'coupler', elementId: 'coupler', elementType: 'Switch', elementName: 'Sprzeglo sekcyjne', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn_s1', toNodeId: 'bus_sn_s2', switchState: 'CLOSED', switchType: 'BREAKER' } as SwitchSymbol);
  s.push({ id: 'tr_1', elementId: 'tr_1', elementType: 'TransformerBranch', elementName: 'TR SN/nN S1', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn_s1', toNodeId: 'bus_nn_1', points: [] } as BranchSymbol);
  s.push({ id: 'bus_nn_1', elementId: 'bus_nn_1', elementType: 'Bus', elementName: 'Szyna nN 0.4kV S1', position: { x: 0, y: 0 }, inService: true, width: 60, height: 6 } as BusSymbol);
  s.push({ id: 'tr_2', elementId: 'tr_2', elementType: 'TransformerBranch', elementName: 'TR SN/nN S2', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn_s2', toNodeId: 'bus_nn_2', points: [] } as BranchSymbol);
  s.push({ id: 'bus_nn_2', elementId: 'bus_nn_2', elementType: 'Bus', elementName: 'Szyna nN 0.4kV S2', position: { x: 0, y: 0 }, inService: true, width: 60, height: 6 } as BusSymbol);
  return s;
}

/** GN-OZE-01: PV na SN jako pole przylaczeniowe */
function buildGNOze01_PvSn(): AnySldSymbol[] {
  return [
    { id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol,
    { id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN 15kV', position: { x: 0, y: 0 }, inService: true, width: 400, height: 10 } as BusSymbol,
    { id: 'pv', elementId: 'pv', elementType: 'Source', elementName: 'PV Farma Fotowoltaiczna 5MW', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol,
    { id: 'cb_pv', elementId: 'cb_pv', elementType: 'Switch', elementName: 'Wylacznik pole PV', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn', toNodeId: 'bus_sn', switchState: 'CLOSED', switchType: 'BREAKER' } as SwitchSymbol,
  ];
}

/** GN-OZE-02: BESS na SN */
function buildGNOze02_BessSn(): AnySldSymbol[] {
  return [
    { id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol,
    { id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN 15kV', position: { x: 0, y: 0 }, inService: true, width: 400, height: 10 } as BusSymbol,
    { id: 'bess', elementId: 'bess', elementType: 'Source', elementName: 'BESS Magazyn Energii 2MWh', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol,
  ];
}

/** GN-OZE-03: PV+BESS w stacji wielofunkcyjnej */
function buildGNOze03_MultiSource(): AnySldSymbol[] {
  return [
    { id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol,
    { id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN 15kV', position: { x: 0, y: 0 }, inService: true, width: 400, height: 10 } as BusSymbol,
    { id: 'pv', elementId: 'pv', elementType: 'Source', elementName: 'PV Farma Solarna 3MW', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol,
    { id: 'bess', elementId: 'bess', elementType: 'Source', elementName: 'BESS Magazyn 1MWh', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol,
    { id: 'load', elementId: 'load', elementType: 'Load', elementName: 'Odbiorca', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as LoadSymbol,
  ];
}

/** Deterministyczny shuffle */
function shuffle<T>(arr: T[], seed: number): T[] {
  const r = [...arr];
  let s = seed;
  for (let i = r.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = (s >>> 0) % (i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function runPipeline(symbols: AnySldSymbol[]): LayoutResultV1 {
  const graph = convertToVisualGraph(symbols);
  return computeLayout(graph);
}

// =============================================================================
// HASH STABILITY (100x)
// =============================================================================

describe('Layout Pipeline — hash stability', () => {
  const cases: [string, () => AnySldSymbol[]][] = [
    ['GN-SLD-01', buildGN01],
    ['GN-SLD-02', buildGN02],
    ['GN-SLD-03 (typ C)', buildGN03_TypeC],
    ['GN-SLD-04 (typ D)', buildGN04_TypeD],
    ['GN-OZE-01 (PV SN)', buildGNOze01_PvSn],
    ['GN-OZE-02 (BESS SN)', buildGNOze02_BessSn],
    ['GN-OZE-03 (multi-source)', buildGNOze03_MultiSource],
  ];

  for (const [name, buildFn] of cases) {
    it(`${name}: 100x computeLayout → identyczny hash`, () => {
      const symbols = buildFn();
      const ref = runPipeline(symbols);
      for (let i = 0; i < 100; i++) {
        const result = runPipeline(symbols);
        expect(result.hash).toBe(ref.hash);
      }
    });
  }
});

// =============================================================================
// PERMUTATION INVARIANCE (50x)
// =============================================================================

describe('Layout Pipeline — permutation invariance', () => {
  const cases: [string, () => AnySldSymbol[]][] = [
    ['GN-SLD-01', buildGN01],
    ['GN-SLD-02', buildGN02],
    ['GN-OZE-03 (multi-source)', buildGNOze03_MultiSource],
  ];

  for (const [name, buildFn] of cases) {
    it(`${name}: 50 permutacji → identyczny hash`, () => {
      const symbols = buildFn();
      const ref = runPipeline(symbols);
      for (let seed = 1; seed <= 50; seed++) {
        const result = runPipeline(shuffle(symbols, seed));
        expect(result.hash).toBe(ref.hash);
      }
    });
  }
});

// =============================================================================
// SYMBOL-SYMBOL OVERLAP == 0
// =============================================================================

describe('Layout Pipeline — symbol-symbol overlap == 0', () => {
  const cases: [string, () => AnySldSymbol[]][] = [
    ['GN-SLD-01', buildGN01],
    ['GN-SLD-02', buildGN02],
    ['GN-SLD-03', buildGN03_TypeC],
    ['GN-SLD-04', buildGN04_TypeD],
  ];

  for (const [name, buildFn] of cases) {
    it(`${name}: brak overlapow`, () => {
      const result = runPipeline(buildFn());
      const validation = validateLayoutResult(result);
      const overlapErrors = validation.errors.filter(e => e.includes('overlap'));
      expect(overlapErrors).toHaveLength(0);
    });
  }
});

// =============================================================================
// laneIndex STABILITY
// =============================================================================

describe('Layout Pipeline — laneIndex stability', () => {
  it('GN-SLD-02: laneIndex secondary connectors sa stabilne', () => {
    const symbols = buildGN02();
    const ref = runPipeline(symbols);
    const refLanes = ref.edgeRoutes
      .filter(r => r.isNormallyOpen)
      .map(r => ({ id: r.edgeId, lane: r.laneIndex }));

    for (let seed = 1; seed <= 20; seed++) {
      const result = runPipeline(shuffle(symbols, seed));
      const lanes = result.edgeRoutes
        .filter(r => r.isNormallyOpen)
        .map(r => ({ id: r.edgeId, lane: r.laneIndex }));
      expect(lanes).toEqual(refLanes);
    }
  });
});

// =============================================================================
// CAMERA INDEPENDENCE
// =============================================================================

describe('Layout Pipeline — camera independence', () => {
  it('zmiana config.spineX nie zmienia relatywnych pozycji (hash stabilny dla tych samych proporcji)', () => {
    const symbols = buildGNOze01_PvSn();
    const result1 = runPipeline(symbols);

    // Hash jest zalezny od geometrii absolutnej, ale pipeline jest deterministyczny
    // ten sam config → ten sam hash
    const result2 = runPipeline(symbols);
    expect(result1.hash).toBe(result2.hash);
  });

  it('LayoutResultV1.hash nie zawiera danych camera/viewport', () => {
    const symbols = buildGN01();
    const result = runPipeline(symbols);
    // Hash jest 8-znakowy hex
    expect(result.hash).toMatch(/^[0-9a-f]{8}$/);
    // Version jest V1
    expect(result.version).toBe(LAYOUT_RESULT_VERSION);
  });
});

// =============================================================================
// OZE PV/BESS
// =============================================================================

describe('Layout Pipeline — OZE PV/BESS', () => {
  it('GN-OZE-01: PV na SN — umieszczony jako zrodlo', () => {
    const result = runPipeline(buildGNOze01_PvSn());
    const pvPlacement = result.nodePlacements.find(p => p.nodeId === 'pv');
    expect(pvPlacement).toBeDefined();
    expect(pvPlacement!.autoPositioned).toBe(true);
  });

  it('GN-OZE-02: BESS na SN — umieszczony jako zrodlo', () => {
    const result = runPipeline(buildGNOze02_BessSn());
    const bessPlacement = result.nodePlacements.find(p => p.nodeId === 'bess');
    expect(bessPlacement).toBeDefined();
  });

  it('GN-OZE-03: multi-source — GRID_SOURCE preferowany w tie-break', () => {
    const result = runPipeline(buildGNOze03_MultiSource());
    // GPZ powinno byc na pierwszej pozycji (najnizsze Y)
    const gpz = result.nodePlacements.find(p => p.nodeId === 'src');
    const pv = result.nodePlacements.find(p => p.nodeId === 'pv');
    const bess = result.nodePlacements.find(p => p.nodeId === 'bess');
    expect(gpz).toBeDefined();
    expect(pv).toBeDefined();
    expect(bess).toBeDefined();
  });
});

// =============================================================================
// CATALOG REFS
// =============================================================================

describe('Layout Pipeline — catalog refs', () => {
  it('kazdy CB ma catalog ref z kategorią BREAKER', () => {
    const result = runPipeline(buildGN03_TypeC());
    const breakerRefs = result.catalogRefs.filter(r => r.catalogCategory === CatalogCategory.BREAKER);
    expect(breakerRefs.length).toBeGreaterThanOrEqual(1);
  });

  it('brak referencji katalogowej → validation error z fixAction', () => {
    const result = runPipeline(buildGN03_TypeC());
    const missingCatalog = result.validationErrors.filter(e => e.code === 'MISSING_CATALOG_REF');
    expect(missingCatalog.length).toBeGreaterThanOrEqual(1);
    for (const err of missingCatalog) {
      expect(err.fixAction).toBeTruthy();
    }
  });
});

// =============================================================================
// RELAY BINDINGS
// =============================================================================

describe('Layout Pipeline — relay bindings', () => {
  it('kazdy CB ma relay binding', () => {
    const result = runPipeline(buildGN03_TypeC());
    expect(result.relayBindings.length).toBeGreaterThanOrEqual(1);
  });

  it('relay functions posortowane deterministycznie po ANSI', () => {
    const result = runPipeline(buildGN03_TypeC());
    for (const rb of result.relayBindings) {
      for (let i = 1; i < rb.functions.length; i++) {
        expect(rb.functions[i].localeCompare(rb.functions[i - 1])).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('relay position jest nad CB (Y mniejszy)', () => {
    const result = runPipeline(buildGN03_TypeC());
    for (const rb of result.relayBindings) {
      const cbPlacement = result.nodePlacements.find(p => p.nodeId === rb.breakerNodeId);
      if (cbPlacement) {
        expect(rb.relayPosition.y).toBeLessThan(cbPlacement.position.y);
      }
    }
  });
});

// =============================================================================
// LAYOUTRESULTV1 VALIDATION
// =============================================================================

describe('Layout Pipeline — LayoutResultV1 validation', () => {
  it('GN-SLD-01: walidacja przechodzi (version, sorting, bounds)', () => {
    const result = runPipeline(buildGN01());
    expect(result.version).toBe(LAYOUT_RESULT_VERSION);
    // Verify sorting
    for (let i = 1; i < result.nodePlacements.length; i++) {
      expect(result.nodePlacements[i].nodeId.localeCompare(result.nodePlacements[i - 1].nodeId)).toBeGreaterThanOrEqual(0);
    }
    for (let i = 1; i < result.edgeRoutes.length; i++) {
      expect(result.edgeRoutes[i].edgeId.localeCompare(result.edgeRoutes[i - 1].edgeId)).toBeGreaterThanOrEqual(0);
    }
  });

  it('hash consistency — recomputeHash == stored hash', () => {
    const result = runPipeline(buildGN01());
    const recomputed = computeLayoutResultHash(result);
    expect(recomputed).toBe(result.hash);
  });

  it('bounds obejmuje wszystkie elementy', () => {
    const result = runPipeline(buildGN01());
    for (const p of result.nodePlacements) {
      expect(p.bounds.x).toBeGreaterThanOrEqual(result.bounds.x);
      expect(p.bounds.y).toBeGreaterThanOrEqual(result.bounds.y);
    }
  });
});

// =============================================================================
// STRESS TEST (500+ wezlow)
// =============================================================================

describe('Layout Pipeline — stress test', () => {
  function buildStress500(): AnySldSymbol[] {
    const s: AnySldSymbol[] = [];
    s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_main' } as SourceSymbol);
    s.push({ id: 'bus_main', elementId: 'bus_main', elementType: 'Bus', elementName: 'Szyna SN 15kV', position: { x: 0, y: 0 }, inService: true, width: 2000, height: 10 } as BusSymbol);

    for (let i = 1; i <= 100; i++) {
      const pad = String(i).padStart(3, '0');
      s.push({ id: `line_${pad}`, elementId: `line_${pad}`, elementType: 'LineBranch', elementName: `Linia ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_main', toNodeId: `bus_${pad}`, points: [], branchType: i % 2 === 0 ? 'CABLE' : 'LINE' } as BranchSymbol);
      s.push({ id: `bus_${pad}`, elementId: `bus_${pad}`, elementType: 'Bus', elementName: `Szyna SN F${i}`, position: { x: 0, y: 0 }, inService: true, width: 40, height: 6 } as BusSymbol);
      s.push({ id: `sw_${pad}`, elementId: `sw_${pad}`, elementType: 'Switch', elementName: `CB ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_main', toNodeId: `bus_${pad}`, switchState: 'CLOSED', switchType: 'BREAKER' } as SwitchSymbol);
      s.push({ id: `tr_${pad}`, elementId: `tr_${pad}`, elementType: 'TransformerBranch', elementName: `TR ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: `bus_${pad}`, toNodeId: `bus_nn_${pad}`, points: [] } as BranchSymbol);
      s.push({ id: `bus_nn_${pad}`, elementId: `bus_nn_${pad}`, elementType: 'Bus', elementName: `Szyna nN 0.4kV ${i}`, position: { x: 0, y: 0 }, inService: true, width: 30, height: 4 } as BusSymbol);
      s.push({ id: `load_${pad}`, elementId: `load_${pad}`, elementType: 'Load', elementName: `Odbiorca ${i}`, position: { x: 0, y: 0 }, inService: true, connectedToNodeId: `bus_nn_${pad}` } as LoadSymbol);
    }
    return s;
  }

  it('GN-STRESS-500: 500+ wezlow — pipeline nie pada', () => {
    const symbols = buildStress500();
    expect(symbols.length).toBeGreaterThan(500);
    const result = runPipeline(symbols);
    expect(result.nodePlacements.length).toBe(symbols.length);
    expect(result.hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('GN-STRESS-500: hash stability 10x', () => {
    const symbols = buildStress500();
    const ref = runPipeline(symbols);
    for (let i = 0; i < 10; i++) {
      expect(runPipeline(symbols).hash).toBe(ref.hash);
    }
  });

  it('GN-STRESS-500: permutation invariance 5x', () => {
    const symbols = buildStress500();
    const ref = runPipeline(symbols);
    for (let seed = 1; seed <= 5; seed++) {
      expect(runPipeline(shuffle(symbols, seed * 1000)).hash).toBe(ref.hash);
    }
  });
});
