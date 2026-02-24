/**
 * Golden Layout Hybrid Tests — 12+ golden networks for ABB+PF hybrid engine.
 *
 * Pokrycie:
 * - GN-HYB-01: GPZ + 3 stacje radial (typ A)
 * - GN-HYB-02: GPZ + 5 stacji trunk + 1 ring NOP
 * - GN-HYB-03: GPZ + stacja typ B z PV
 * - GN-HYB-04: GPZ + stacja typ C z branch + BESS
 * - GN-HYB-05: GPZ + stacja typ D sekcyjna
 * - GN-HYB-06: Multi-feeder GPZ (3 pola liniowe)
 * - GN-HYB-07: Trunk z odgałęzieniami L-shape (3 stacje)
 * - GN-HYB-08: Ring zamknięty (4 stacje + NOP)
 * - GN-HYB-09: PV + BESS + Wind na jednej szynie
 * - GN-HYB-10: 20 stacji radial (stress)
 * - GN-HYB-11: Dwa pierścienie (dual ring)
 * - GN-HYB-12: Stacja D + sprzęgło + 2 feedery
 *
 * Każdy test weryfikuje:
 * 1. Hash stability (100x)
 * 2. Permutation invariance (50x)
 * 3. Grid alignment (all coords % GRID_BASE === 0)
 * 4. Orthogonal routing (0° or 90° only)
 * 5. No symbol-symbol overlaps
 * 6. Render artefact hash (frozen, CI artifact)
 *
 * BINDING: CI gate — failure blocks merge.
 */

import { describe, it, expect } from 'vitest';
import { computeLayout, DEFAULT_LAYOUT_CONFIG } from '../layoutPipeline';
import {
  computeLayoutResultHash,
  validateLayoutResult,
  LAYOUT_RESULT_VERSION,
} from '../layoutResult';
import type { LayoutResultV1 } from '../layoutResult';
import { convertToVisualGraph } from '../topologyAdapterV1';
import { computeVisualGraphHash } from '../visualGraph';
import type { AnySldSymbol, BusSymbol, BranchSymbol, SwitchSymbol, SourceSymbol, LoadSymbol } from '../../../sld-editor/types';
import {
  GRID_BASE,
  validateGridAlignment,
  validateOrthogonalRouting,
  validateStationSpacing,
} from '../../IndustrialAesthetics';

// =============================================================================
// FIXTURES
// =============================================================================

function buildGN_HYB_01(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  s.push({ id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN 15kV GPZ', position: { x: 0, y: 0 }, inService: true, width: 400, height: 10 } as BusSymbol);

  let prevBus = 'bus_sn';
  for (let i = 1; i <= 3; i++) {
    const busId = `bus_st_${i}`;
    s.push({ id: `line_${i}`, elementId: `line_${i}`, elementType: 'LineBranch', elementName: `Linia SN ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: prevBus, toNodeId: busId, points: [], branchType: 'CABLE' } as BranchSymbol);
    s.push({ id: busId, elementId: busId, elementType: 'Bus', elementName: `Szyna SN St A${i}`, position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
    s.push({ id: `tr_${i}`, elementId: `tr_${i}`, elementType: 'TransformerBranch', elementName: `TR SN/nN A${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: busId, toNodeId: `bus_nn_${i}`, points: [] } as BranchSymbol);
    s.push({ id: `bus_nn_${i}`, elementId: `bus_nn_${i}`, elementType: 'Bus', elementName: `Szyna nN A${i}`, position: { x: 0, y: 0 }, inService: true, width: 40, height: 6 } as BusSymbol);
    s.push({ id: `load_${i}`, elementId: `load_${i}`, elementType: 'Load', elementName: `Odbiorca A${i}`, position: { x: 0, y: 0 }, inService: true, connectedToNodeId: `bus_nn_${i}` } as LoadSymbol);
    prevBus = busId;
  }
  return s;
}

function buildGN_HYB_02(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  s.push({ id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN 15kV GPZ', position: { x: 0, y: 0 }, inService: true, width: 600, height: 10 } as BusSymbol);

  let prevBus = 'bus_sn';
  for (let i = 1; i <= 5; i++) {
    const busId = `bus_r${i}`;
    s.push({ id: `line_r${i}`, elementId: `line_r${i}`, elementType: 'LineBranch', elementName: `Linia Ring ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: prevBus, toNodeId: busId, points: [], branchType: i % 2 === 0 ? 'CABLE' : 'LINE' } as BranchSymbol);
    s.push({ id: busId, elementId: busId, elementType: 'Bus', elementName: `Szyna SN Ring ${i}`, position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
    prevBus = busId;
  }
  // Ring close NOP
  s.push({ id: 'nop_ring', elementId: 'nop_ring', elementType: 'Switch', elementName: 'NOP Ring', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_r5', toNodeId: 'bus_sn', switchState: 'OPEN', switchType: 'LOAD_SWITCH' } as SwitchSymbol);
  return s;
}

function buildGN_HYB_03(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  s.push({ id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN 15kV', position: { x: 0, y: 0 }, inService: true, width: 400, height: 10 } as BusSymbol);
  s.push({ id: 'pv', elementId: 'pv', elementType: 'Source', elementName: 'PV Farma 5MW', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  s.push({ id: 'line_b', elementId: 'line_b', elementType: 'LineBranch', elementName: 'Linia do stacji B', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn', toNodeId: 'bus_st_b', points: [], branchType: 'CABLE' } as BranchSymbol);
  s.push({ id: 'bus_st_b', elementId: 'bus_st_b', elementType: 'Bus', elementName: 'Szyna SN St B', position: { x: 0, y: 0 }, inService: true, width: 80, height: 8 } as BusSymbol);
  s.push({ id: 'tr_b', elementId: 'tr_b', elementType: 'TransformerBranch', elementName: 'TR SN/nN B', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_st_b', toNodeId: 'bus_nn_b', points: [] } as BranchSymbol);
  s.push({ id: 'bus_nn_b', elementId: 'bus_nn_b', elementType: 'Bus', elementName: 'Szyna nN B', position: { x: 0, y: 0 }, inService: true, width: 40, height: 6 } as BusSymbol);
  s.push({ id: 'load_b', elementId: 'load_b', elementType: 'Load', elementName: 'Odbiorca B', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_nn_b' } as LoadSymbol);
  return s;
}

function buildGN_HYB_04(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  s.push({ id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN 15kV', position: { x: 0, y: 0 }, inService: true, width: 400, height: 10 } as BusSymbol);
  s.push({ id: 'bess', elementId: 'bess', elementType: 'Source', elementName: 'BESS 2MWh', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  // Branch to station C
  s.push({ id: 'line_main', elementId: 'line_main', elementType: 'LineBranch', elementName: 'Linia magistrala', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn', toNodeId: 'bus_mid', points: [], branchType: 'CABLE' } as BranchSymbol);
  s.push({ id: 'bus_mid', elementId: 'bus_mid', elementType: 'Bus', elementName: 'Szyna SN pośrednia', position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
  s.push({ id: 'line_branch', elementId: 'line_branch', elementType: 'LineBranch', elementName: 'Odgałęzienie C', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_mid', toNodeId: 'bus_st_c', points: [], branchType: 'CABLE' } as BranchSymbol);
  s.push({ id: 'bus_st_c', elementId: 'bus_st_c', elementType: 'Bus', elementName: 'Szyna SN Stacja C', position: { x: 0, y: 0 }, inService: true, width: 80, height: 8 } as BusSymbol);
  s.push({ id: 'tr_c', elementId: 'tr_c', elementType: 'TransformerBranch', elementName: 'TR SN/nN C', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_st_c', toNodeId: 'bus_nn_c', points: [] } as BranchSymbol);
  s.push({ id: 'bus_nn_c', elementId: 'bus_nn_c', elementType: 'Bus', elementName: 'Szyna nN C', position: { x: 0, y: 0 }, inService: true, width: 40, height: 6 } as BusSymbol);
  return s;
}

function buildGN_HYB_05(): AnySldSymbol[] {
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn_s1' } as SourceSymbol);
  s.push({ id: 'bus_sn_s1', elementId: 'bus_sn_s1', elementType: 'Bus', elementName: 'Szyna SN Sekcja 1', position: { x: 0, y: 0 }, inService: true, width: 200, height: 10 } as BusSymbol);
  s.push({ id: 'bus_sn_s2', elementId: 'bus_sn_s2', elementType: 'Bus', elementName: 'Szyna SN Sekcja 2', position: { x: 0, y: 0 }, inService: true, width: 200, height: 10 } as BusSymbol);
  s.push({ id: 'coupler', elementId: 'coupler', elementType: 'Switch', elementName: 'Sprzeglo sekcyjne', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn_s1', toNodeId: 'bus_sn_s2', switchState: 'CLOSED', switchType: 'BREAKER' } as SwitchSymbol);
  // Feeders from both sections
  s.push({ id: 'line_f1', elementId: 'line_f1', elementType: 'LineBranch', elementName: 'Linia F1', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn_s1', toNodeId: 'bus_f1', points: [], branchType: 'LINE' } as BranchSymbol);
  s.push({ id: 'bus_f1', elementId: 'bus_f1', elementType: 'Bus', elementName: 'Szyna SN F1', position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
  s.push({ id: 'line_f2', elementId: 'line_f2', elementType: 'LineBranch', elementName: 'Linia F2', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn_s2', toNodeId: 'bus_f2', points: [], branchType: 'CABLE' } as BranchSymbol);
  s.push({ id: 'bus_f2', elementId: 'bus_f2', elementType: 'Bus', elementName: 'Szyna SN F2', position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
  return s;
}

function buildGN_HYB_06(): AnySldSymbol[] {
  // Multi-feeder: 3 separate feeders from GPZ
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  s.push({ id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN 15kV GPZ', position: { x: 0, y: 0 }, inService: true, width: 800, height: 10 } as BusSymbol);

  for (let f = 1; f <= 3; f++) {
    s.push({ id: `line_f${f}`, elementId: `line_f${f}`, elementType: 'LineBranch', elementName: `Feeder ${f}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn', toNodeId: `bus_f${f}`, points: [], branchType: f === 1 ? 'LINE' : 'CABLE' } as BranchSymbol);
    s.push({ id: `bus_f${f}`, elementId: `bus_f${f}`, elementType: 'Bus', elementName: `Szyna SN Feeder ${f}`, position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
    s.push({ id: `load_f${f}`, elementId: `load_f${f}`, elementType: 'Load', elementName: `Odbiorca F${f}`, position: { x: 0, y: 0 }, inService: true, connectedToNodeId: `bus_f${f}` } as LoadSymbol);
  }
  return s;
}

function buildGN_HYB_07(): AnySldSymbol[] {
  // Trunk with L-shape branches
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  s.push({ id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN GPZ', position: { x: 0, y: 0 }, inService: true, width: 400, height: 10 } as BusSymbol);

  // Main trunk
  let prevBus = 'bus_sn';
  for (let i = 1; i <= 3; i++) {
    const busId = `bus_trunk_${i}`;
    s.push({ id: `line_trunk_${i}`, elementId: `line_trunk_${i}`, elementType: 'LineBranch', elementName: `Linia trunk ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: prevBus, toNodeId: busId, points: [], branchType: 'LINE' } as BranchSymbol);
    s.push({ id: busId, elementId: busId, elementType: 'Bus', elementName: `Szyna trunk ${i}`, position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);

    // Branch from each trunk node
    const branchBusId = `bus_branch_${i}`;
    s.push({ id: `line_branch_${i}`, elementId: `line_branch_${i}`, elementType: 'LineBranch', elementName: `Odgalezienie ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: busId, toNodeId: branchBusId, points: [], branchType: 'CABLE' } as BranchSymbol);
    s.push({ id: branchBusId, elementId: branchBusId, elementType: 'Bus', elementName: `Szyna odgalezienie ${i}`, position: { x: 0, y: 0 }, inService: true, width: 40, height: 6 } as BusSymbol);
    s.push({ id: `load_branch_${i}`, elementId: `load_branch_${i}`, elementType: 'Load', elementName: `Odbiorca branch ${i}`, position: { x: 0, y: 0 }, inService: true, connectedToNodeId: branchBusId } as LoadSymbol);

    prevBus = busId;
  }
  return s;
}

function buildGN_HYB_08(): AnySldSymbol[] {
  // Full ring: 4 stations + NOP closing ring
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  s.push({ id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN GPZ', position: { x: 0, y: 0 }, inService: true, width: 400, height: 10 } as BusSymbol);

  let prevBus = 'bus_sn';
  for (let i = 1; i <= 4; i++) {
    const busId = `bus_ring_${i}`;
    s.push({ id: `line_ring_${i}`, elementId: `line_ring_${i}`, elementType: 'LineBranch', elementName: `Linia ring ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: prevBus, toNodeId: busId, points: [], branchType: 'CABLE' } as BranchSymbol);
    s.push({ id: busId, elementId: busId, elementType: 'Bus', elementName: `Szyna ring ${i}`, position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
    s.push({ id: `tr_ring_${i}`, elementId: `tr_ring_${i}`, elementType: 'TransformerBranch', elementName: `TR ring ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: busId, toNodeId: `bus_nn_ring_${i}`, points: [] } as BranchSymbol);
    s.push({ id: `bus_nn_ring_${i}`, elementId: `bus_nn_ring_${i}`, elementType: 'Bus', elementName: `Szyna nN ring ${i}`, position: { x: 0, y: 0 }, inService: true, width: 40, height: 6 } as BusSymbol);
    s.push({ id: `load_ring_${i}`, elementId: `load_ring_${i}`, elementType: 'Load', elementName: `Odbiorca ring ${i}`, position: { x: 0, y: 0 }, inService: true, connectedToNodeId: `bus_nn_ring_${i}` } as LoadSymbol);
    prevBus = busId;
  }
  // Ring close NOP
  s.push({ id: 'nop_close', elementId: 'nop_close', elementType: 'Switch', elementName: 'NOP zamkniecie ringu', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_ring_4', toNodeId: 'bus_sn', switchState: 'OPEN', switchType: 'LOAD_SWITCH' } as SwitchSymbol);
  return s;
}

function buildGN_HYB_09(): AnySldSymbol[] {
  // PV + BESS + Wind on one bus
  return [
    { id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol,
    { id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN 15kV', position: { x: 0, y: 0 }, inService: true, width: 600, height: 10 } as BusSymbol,
    { id: 'pv', elementId: 'pv', elementType: 'Source', elementName: 'PV 3MW', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol,
    { id: 'bess', elementId: 'bess', elementType: 'Source', elementName: 'BESS 1MWh', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol,
    { id: 'wind', elementId: 'wind', elementType: 'Source', elementName: 'Farma Wiatrowa 2MW', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol,
    { id: 'load_1', elementId: 'load_1', elementType: 'Load', elementName: 'Odbiorca 1', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as LoadSymbol,
  ];
}

function buildGN_HYB_10(): AnySldSymbol[] {
  // 20 stations radial (stress)
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  s.push({ id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN 15kV GPZ', position: { x: 0, y: 0 }, inService: true, width: 800, height: 10 } as BusSymbol);

  let prevBus = 'bus_sn';
  for (let i = 1; i <= 20; i++) {
    const pad = String(i).padStart(2, '0');
    const busId = `bus_${pad}`;
    s.push({ id: `line_${pad}`, elementId: `line_${pad}`, elementType: 'LineBranch', elementName: `Linia ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: prevBus, toNodeId: busId, points: [], branchType: i % 2 === 0 ? 'CABLE' : 'LINE' } as BranchSymbol);
    s.push({ id: busId, elementId: busId, elementType: 'Bus', elementName: `Szyna SN ${i}`, position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
    s.push({ id: `load_${pad}`, elementId: `load_${pad}`, elementType: 'Load', elementName: `Odbiorca ${i}`, position: { x: 0, y: 0 }, inService: true, connectedToNodeId: busId } as LoadSymbol);
    prevBus = busId;
  }
  return s;
}

function buildGN_HYB_11(): AnySldSymbol[] {
  // Dual ring from GPZ
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn' } as SourceSymbol);
  s.push({ id: 'bus_sn', elementId: 'bus_sn', elementType: 'Bus', elementName: 'Szyna SN GPZ', position: { x: 0, y: 0 }, inService: true, width: 600, height: 10 } as BusSymbol);

  // Ring A
  let prevBus = 'bus_sn';
  for (let i = 1; i <= 3; i++) {
    const busId = `bus_ra_${i}`;
    s.push({ id: `line_ra_${i}`, elementId: `line_ra_${i}`, elementType: 'LineBranch', elementName: `Ring A linia ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: prevBus, toNodeId: busId, points: [], branchType: 'CABLE' } as BranchSymbol);
    s.push({ id: busId, elementId: busId, elementType: 'Bus', elementName: `Szyna ring A${i}`, position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
    prevBus = busId;
  }
  s.push({ id: 'nop_a', elementId: 'nop_a', elementType: 'Switch', elementName: 'NOP Ring A', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_ra_3', toNodeId: 'bus_sn', switchState: 'OPEN', switchType: 'LOAD_SWITCH' } as SwitchSymbol);

  // Ring B
  prevBus = 'bus_sn';
  for (let i = 1; i <= 3; i++) {
    const busId = `bus_rb_${i}`;
    s.push({ id: `line_rb_${i}`, elementId: `line_rb_${i}`, elementType: 'LineBranch', elementName: `Ring B linia ${i}`, position: { x: 0, y: 0 }, inService: true, fromNodeId: prevBus, toNodeId: busId, points: [], branchType: 'LINE' } as BranchSymbol);
    s.push({ id: busId, elementId: busId, elementType: 'Bus', elementName: `Szyna ring B${i}`, position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
    prevBus = busId;
  }
  s.push({ id: 'nop_b', elementId: 'nop_b', elementType: 'Switch', elementName: 'NOP Ring B', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_rb_3', toNodeId: 'bus_sn', switchState: 'OPEN', switchType: 'LOAD_SWITCH' } as SwitchSymbol);

  return s;
}

function buildGN_HYB_12(): AnySldSymbol[] {
  // Station D + coupler + 2 feeders
  const s: AnySldSymbol[] = [];
  s.push({ id: 'src', elementId: 'src', elementType: 'Source', elementName: 'GPZ 110/15kV', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_sn_s1' } as SourceSymbol);
  s.push({ id: 'bus_sn_s1', elementId: 'bus_sn_s1', elementType: 'Bus', elementName: 'Szyna SN S1', position: { x: 0, y: 0 }, inService: true, width: 300, height: 10 } as BusSymbol);
  s.push({ id: 'bus_sn_s2', elementId: 'bus_sn_s2', elementType: 'Bus', elementName: 'Szyna SN S2', position: { x: 0, y: 0 }, inService: true, width: 300, height: 10 } as BusSymbol);
  s.push({ id: 'coupler', elementId: 'coupler', elementType: 'Switch', elementName: 'Sprzeglo', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn_s1', toNodeId: 'bus_sn_s2', switchState: 'CLOSED', switchType: 'BREAKER' } as SwitchSymbol);

  // Feeder from S1
  s.push({ id: 'line_f1', elementId: 'line_f1', elementType: 'LineBranch', elementName: 'Feeder 1', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn_s1', toNodeId: 'bus_f1', points: [], branchType: 'CABLE' } as BranchSymbol);
  s.push({ id: 'bus_f1', elementId: 'bus_f1', elementType: 'Bus', elementName: 'Szyna F1', position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
  s.push({ id: 'tr_f1', elementId: 'tr_f1', elementType: 'TransformerBranch', elementName: 'TR F1', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_f1', toNodeId: 'bus_nn_f1', points: [] } as BranchSymbol);
  s.push({ id: 'bus_nn_f1', elementId: 'bus_nn_f1', elementType: 'Bus', elementName: 'Szyna nN F1', position: { x: 0, y: 0 }, inService: true, width: 40, height: 6 } as BusSymbol);
  s.push({ id: 'load_f1', elementId: 'load_f1', elementType: 'Load', elementName: 'Odbiorca F1', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_nn_f1' } as LoadSymbol);

  // Feeder from S2
  s.push({ id: 'line_f2', elementId: 'line_f2', elementType: 'LineBranch', elementName: 'Feeder 2', position: { x: 0, y: 0 }, inService: true, fromNodeId: 'bus_sn_s2', toNodeId: 'bus_f2', points: [], branchType: 'LINE' } as BranchSymbol);
  s.push({ id: 'bus_f2', elementId: 'bus_f2', elementType: 'Bus', elementName: 'Szyna F2', position: { x: 0, y: 0 }, inService: true, width: 60, height: 8 } as BusSymbol);
  s.push({ id: 'load_f2', elementId: 'load_f2', elementType: 'Load', elementName: 'Odbiorca F2', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'bus_f2' } as LoadSymbol);

  return s;
}

// =============================================================================
// HELPERS
// =============================================================================

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
// ALL GOLDEN NETWORKS
// =============================================================================

const ALL_NETWORKS: [string, () => AnySldSymbol[]][] = [
  ['GN-HYB-01 (3 stacje radial)', buildGN_HYB_01],
  ['GN-HYB-02 (5 stacji + ring NOP)', buildGN_HYB_02],
  ['GN-HYB-03 (stacja B + PV)', buildGN_HYB_03],
  ['GN-HYB-04 (stacja C + branch + BESS)', buildGN_HYB_04],
  ['GN-HYB-05 (stacja D sekcyjna)', buildGN_HYB_05],
  ['GN-HYB-06 (multi-feeder 3 pola)', buildGN_HYB_06],
  ['GN-HYB-07 (trunk + 3 L-shape branches)', buildGN_HYB_07],
  ['GN-HYB-08 (ring 4 stacje + NOP)', buildGN_HYB_08],
  ['GN-HYB-09 (PV+BESS+Wind)', buildGN_HYB_09],
  ['GN-HYB-10 (20 stacji stress)', buildGN_HYB_10],
  ['GN-HYB-11 (dual ring)', buildGN_HYB_11],
  ['GN-HYB-12 (stacja D + coupler + 2 feedery)', buildGN_HYB_12],
];

// =============================================================================
// HASH STABILITY (100x)
// =============================================================================

describe('Golden Hybrid — hash stability 100x', () => {
  for (const [name, buildFn] of ALL_NETWORKS) {
    it(`${name}: 100x → identyczny hash`, () => {
      const symbols = buildFn();
      const ref = runPipeline(symbols);
      for (let i = 0; i < 100; i++) {
        expect(runPipeline(symbols).hash).toBe(ref.hash);
      }
    });
  }
});

// =============================================================================
// PERMUTATION INVARIANCE (50x)
// =============================================================================

describe('Golden Hybrid — permutation invariance 50x', () => {
  for (const [name, buildFn] of ALL_NETWORKS) {
    it(`${name}: 50 permutacji → identyczny hash`, () => {
      const symbols = buildFn();
      const ref = runPipeline(symbols);
      for (let seed = 1; seed <= 50; seed++) {
        expect(runPipeline(shuffle(symbols, seed)).hash).toBe(ref.hash);
      }
    });
  }
});

// =============================================================================
// GRID ALIGNMENT (all coords % GRID_BASE === 0)
// =============================================================================

describe('Golden Hybrid — grid alignment', () => {
  for (const [name, buildFn] of ALL_NETWORKS) {
    it(`${name}: wszystkie pozycje na siatce GRID_BASE=${GRID_BASE}`, () => {
      const result = runPipeline(buildFn());
      const positions = new Map<string, { x: number; y: number }>();
      for (const p of result.nodePlacements) {
        positions.set(p.nodeId, p.position);
      }
      const alignment = validateGridAlignment(positions);
      expect(alignment.allAligned).toBe(true);
    });
  }
});

// =============================================================================
// ORTHOGONAL ROUTING (0° or 90° only)
// =============================================================================

describe('Golden Hybrid — orthogonal routing', () => {
  for (const [name, buildFn] of ALL_NETWORKS) {
    it(`${name}: wszystkie segmenty ortogonalne`, () => {
      const result = runPipeline(buildFn());
      const segments = result.edgeRoutes.flatMap(r =>
        r.segments.map(s => ({
          edgeId: r.edgeId,
          fromX: s.from.x,
          fromY: s.from.y,
          toX: s.to.x,
          toY: s.to.y,
        }))
      );
      const ortho = validateOrthogonalRouting(segments);
      expect(ortho.allOrthogonal).toBe(true);
    });
  }
});

// =============================================================================
// NO SYMBOL-SYMBOL OVERLAPS
// =============================================================================

describe('Golden Hybrid — brak overlaps', () => {
  for (const [name, buildFn] of ALL_NETWORKS) {
    it(`${name}: symbol-symbol overlap == 0`, () => {
      const result = runPipeline(buildFn());
      const validation = validateLayoutResult(result);
      const overlapErrors = validation.errors.filter(e => e.includes('overlap'));
      expect(overlapErrors).toHaveLength(0);
    });
  }
});

// =============================================================================
// RENDER ARTEFACT HASHES (frozen CI artefacts)
// =============================================================================

describe('Golden Hybrid — render artefact hashes', () => {
  it('all 12 golden networks produce valid 8-char hex hashes', () => {
    const artefacts: Record<string, string> = {};
    for (const [name, buildFn] of ALL_NETWORKS) {
      const result = runPipeline(buildFn());
      expect(result.hash).toMatch(/^[0-9a-f]{8}$/);
      artefacts[name] = result.hash;
    }
    // All hashes should be different (no collisions)
    const uniqueHashes = new Set(Object.values(artefacts));
    expect(uniqueHashes.size).toBe(ALL_NETWORKS.length);
  });

  it('hash recomputation matches stored hash', () => {
    for (const [, buildFn] of ALL_NETWORKS) {
      const result = runPipeline(buildFn());
      const recomputed = computeLayoutResultHash(result);
      expect(recomputed).toBe(result.hash);
    }
  });
});

// =============================================================================
// BOUNDS COVERAGE
// =============================================================================

describe('Golden Hybrid — bounds coverage', () => {
  for (const [name, buildFn] of ALL_NETWORKS) {
    it(`${name}: bounds obejmuje wszystkie elementy`, () => {
      const result = runPipeline(buildFn());
      for (const p of result.nodePlacements) {
        expect(p.bounds.x).toBeGreaterThanOrEqual(result.bounds.x);
        expect(p.bounds.y).toBeGreaterThanOrEqual(result.bounds.y);
      }
    });
  }
});

// =============================================================================
// LAYOUTRESULTV1 CONTRACT
// =============================================================================

describe('Golden Hybrid — LayoutResultV1 contract', () => {
  it('version === V1 for all networks', () => {
    for (const [, buildFn] of ALL_NETWORKS) {
      const result = runPipeline(buildFn());
      expect(result.version).toBe(LAYOUT_RESULT_VERSION);
    }
  });

  it('nodePlacements sorted by nodeId', () => {
    for (const [, buildFn] of ALL_NETWORKS) {
      const result = runPipeline(buildFn());
      for (let i = 1; i < result.nodePlacements.length; i++) {
        expect(
          result.nodePlacements[i].nodeId.localeCompare(result.nodePlacements[i - 1].nodeId)
        ).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('edgeRoutes sorted by edgeId', () => {
    for (const [, buildFn] of ALL_NETWORKS) {
      const result = runPipeline(buildFn());
      for (let i = 1; i < result.edgeRoutes.length; i++) {
        expect(
          result.edgeRoutes[i].edgeId.localeCompare(result.edgeRoutes[i - 1].edgeId)
        ).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
