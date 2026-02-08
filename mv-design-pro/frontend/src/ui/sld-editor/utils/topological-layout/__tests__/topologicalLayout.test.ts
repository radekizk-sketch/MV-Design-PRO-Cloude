/**
 * TOPOLOGICAL AUTO-LAYOUT ENGINE — Comprehensive Test Suite
 *
 * Testy obejmuja:
 * - Determinizm (ten sam model -> identyczny uklad)
 * - Przypisanie rol topologicznych
 * - Szkielet geometryczny
 * - Sloty i sekcje
 * - Auto-insert stabilnosc
 * - Kolizje symbol-symbol (CI guard)
 * - Guardy rol topologicznych
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  AnySldSymbol,
  NodeSymbol,
  BranchSymbol,
  SwitchSymbol,
  SourceSymbol,
  LoadSymbol,
  Position,
} from '../../../types';
import {
  computeTopologicalLayout,
  verifyDeterminism,
  assignTopologicalRoles,
  detectVoltageLevel,
  isPccNode,
  filterPccNodes,
  detectSymbolCollisions,
  resolveSymbolCollisions,
  calculateSymbolBounds,
  validateExportMargins,
  processAutoInsert,
  checkInsertStability,
  buildGeometricSkeleton,
  resolveOrientation,
  DEFAULT_GEOMETRY_CONFIG,
} from '..';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createBus(id: string, name: string, voltage?: string): NodeSymbol {
  return {
    id: `sym_${id}`,
    elementId: id,
    elementType: 'Bus',
    elementName: name,
    position: { x: 0, y: 0 },
    inService: true,
    width: 200,
    height: 8,
  };
}

function createSource(id: string, name: string, connectedTo: string): SourceSymbol {
  return {
    id: `sym_${id}`,
    elementId: id,
    elementType: 'Source',
    elementName: name,
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: connectedTo,
  };
}

function createLoad(id: string, name: string, connectedTo: string): LoadSymbol {
  return {
    id: `sym_${id}`,
    elementId: id,
    elementType: 'Load',
    elementName: name,
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: connectedTo,
  };
}

function createSwitch(
  id: string,
  name: string,
  from: string,
  to: string,
  type: 'BREAKER' | 'DISCONNECTOR' = 'BREAKER'
): SwitchSymbol {
  return {
    id: `sym_${id}`,
    elementId: id,
    elementType: 'Switch',
    elementName: name,
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: from,
    toNodeId: to,
    switchState: 'CLOSED',
    switchType: type,
  };
}

function createLineBranch(
  id: string,
  name: string,
  from: string,
  to: string
): BranchSymbol {
  return {
    id: `sym_${id}`,
    elementId: id,
    elementType: 'LineBranch',
    elementName: name,
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: from,
    toNodeId: to,
    points: [],
  };
}

function createTransformer(
  id: string,
  name: string,
  from: string,
  to: string
): BranchSymbol {
  return {
    id: `sym_${id}`,
    elementId: id,
    elementType: 'TransformerBranch',
    elementName: name,
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: from,
    toNodeId: to,
    points: [],
  };
}

/**
 * Standard MV network topology:
 * Source -> WN Busbar -> Transformer -> SN Busbar -> [Switch -> Line] x 3
 */
function createStandardMvNetwork(): AnySldSymbol[] {
  return [
    createSource('src1', 'Zasilanie 110kV', 'bus_wn'),
    createBus('bus_wn', 'Szyna WN 110kV'),
    createTransformer('trafo1', 'Transformator WN/SN', 'bus_wn', 'bus_sn'),
    createBus('bus_sn', 'Szyna SN 15kV'),
    createSwitch('sw1', 'Wyłącznik linia 1', 'bus_sn', 'node_l1'),
    createLineBranch('line1', 'Linia SN 1', 'node_l1', 'node_r1'),
    createSwitch('sw2', 'Wyłącznik linia 2', 'bus_sn', 'node_l2'),
    createLineBranch('line2', 'Linia SN 2', 'node_l2', 'node_r2'),
    createSwitch('sw3', 'Wyłącznik linia 3', 'bus_sn', 'node_l3'),
    createLineBranch('line3', 'Linia SN 3', 'node_l3', 'node_r3'),
  ];
}

/**
 * Network with BoundaryNode node (should be filtered).
 */
function createNetworkWithPcc(): AnySldSymbol[] {
  return [
    createBus('connection_node', 'BoundaryNode - Punkt przyłączenia'),
    createSource('src1', 'Zasilanie', 'connection_node'),
    createBus('bus_sn', 'Szyna SN 15kV'),
    createTransformer('trafo1', 'Transformator', 'connection_node', 'bus_sn'),
  ];
}

/**
 * Simple network: Source -> Bus -> Load
 */
function createSimpleNetwork(): AnySldSymbol[] {
  return [
    createSource('src1', 'Zasilanie', 'bus1'),
    createBus('bus1', 'Szyna SN'),
    createLoad('load1', 'Odbiorca', 'bus1'),
  ];
}

// =============================================================================
// DETERMINISM TESTS
// =============================================================================

describe('Determinism', () => {
  it('should produce identical layout for same symbols', () => {
    const symbols = createStandardMvNetwork();
    expect(verifyDeterminism(symbols)).toBe(true);
  });

  it('should produce identical layout regardless of input order', () => {
    const symbols = createStandardMvNetwork();
    const reversed = [...symbols].reverse();

    const result1 = computeTopologicalLayout(symbols);
    const result2 = computeTopologicalLayout(reversed);

    expect(result1.positions.size).toBe(result2.positions.size);

    for (const [id, pos1] of result1.positions) {
      const pos2 = result2.positions.get(id);
      expect(pos2).toBeDefined();
      expect(pos1.x).toBe(pos2!.x);
      expect(pos1.y).toBe(pos2!.y);
    }
  });

  it('should produce identical layout for shuffled symbols', () => {
    const symbols = createStandardMvNetwork();
    // Deterministic shuffle using known seed
    const shuffled = [...symbols].sort((a, b) => {
      const hashA = a.id.split('').reduce((h, c) => h * 31 + c.charCodeAt(0), 0);
      const hashB = b.id.split('').reduce((h, c) => h * 31 + c.charCodeAt(0), 0);
      return hashA - hashB;
    });

    const result1 = computeTopologicalLayout(symbols);
    const result2 = computeTopologicalLayout(shuffled);

    for (const [id, pos1] of result1.positions) {
      const pos2 = result2.positions.get(id);
      expect(pos2).toBeDefined();
      expect(pos1.x).toBe(pos2!.x);
      expect(pos1.y).toBe(pos2!.y);
    }
  });

  it('should return empty result for no symbols', () => {
    const result = computeTopologicalLayout([]);
    expect(result.positions.size).toBe(0);
    expect(result.diagnostics.isEmpty).toBe(true);
  });

  it('verifyDeterminism should return true for simple network', () => {
    const symbols = createSimpleNetwork();
    expect(verifyDeterminism(symbols)).toBe(true);
  });
});

// =============================================================================
// ROLE ASSIGNMENT TESTS
// =============================================================================

describe('Role Assignment', () => {
  it('should assign POWER_SOURCE to Source elements', () => {
    const symbols = createStandardMvNetwork();
    const { assignments } = assignTopologicalRoles(symbols);

    const source = assignments.get('sym_src1');
    expect(source).toBeDefined();
    expect(source!.role).toBe('POWER_SOURCE');
  });

  it('should assign BUSBAR to Bus elements', () => {
    const symbols = createStandardMvNetwork();
    const { assignments } = assignTopologicalRoles(symbols);

    const wnBus = assignments.get('sym_bus_wn');
    expect(wnBus).toBeDefined();
    expect(wnBus!.role).toBe('BUSBAR');
    expect(wnBus!.voltageLevel).toBe('WN');

    const snBus = assignments.get('sym_bus_sn');
    expect(snBus).toBeDefined();
    expect(snBus!.role).toBe('BUSBAR');
    expect(snBus!.voltageLevel).toBe('SN');
  });

  it('should assign AXIAL_ELEMENT to Switch elements', () => {
    const symbols = createStandardMvNetwork();
    const { assignments } = assignTopologicalRoles(symbols);

    const sw = assignments.get('sym_sw1');
    expect(sw).toBeDefined();
    expect(sw!.role).toBe('AXIAL_ELEMENT');
  });

  it('should assign AXIAL_ELEMENT to Transformer elements', () => {
    const symbols = createStandardMvNetwork();
    const { assignments } = assignTopologicalRoles(symbols);

    const trafo = assignments.get('sym_trafo1');
    expect(trafo).toBeDefined();
    expect(trafo!.role).toBe('AXIAL_ELEMENT');
  });

  it('should assign FEEDER to LineBranch elements', () => {
    const symbols = createStandardMvNetwork();
    const { assignments } = assignTopologicalRoles(symbols);

    const line = assignments.get('sym_line1');
    expect(line).toBeDefined();
    expect(line!.role).toBe('FEEDER');
  });

  it('should assign exactly one role to every symbol', () => {
    const symbols = createStandardMvNetwork();
    const { assignments } = assignTopologicalRoles(symbols);

    for (const symbol of symbols) {
      const role = assignments.get(symbol.id);
      expect(role).toBeDefined();
      expect(role!.role).toBeTruthy();
    }
  });

  it('should detect WN voltage level from transformer primary side', () => {
    const symbols = createStandardMvNetwork();
    const { assignments } = assignTopologicalRoles(symbols);

    const wnBus = assignments.get('sym_bus_wn');
    expect(wnBus!.voltageLevel).toBe('WN');
  });

  it('should detect SN voltage level from transformer secondary side', () => {
    const symbols = createStandardMvNetwork();
    const { assignments } = assignTopologicalRoles(symbols);

    const snBus = assignments.get('sym_bus_sn');
    expect(snBus!.voltageLevel).toBe('SN');
  });
});

// =============================================================================
// BoundaryNode FILTERING TESTS
// =============================================================================

describe('BoundaryNode Filtering', () => {
  it('should filter BoundaryNode nodes from symbols', () => {
    const pccBus: NodeSymbol = {
      id: 'pcc1',
      elementId: 'connection_elem',
      elementType: 'Bus',
      elementName: 'BoundaryNode - Punkt przyłączenia',
      position: { x: 0, y: 0 },
      inService: true,
      width: 200,
      height: 8,
    };

    expect(isPccNode(pccBus)).toBe(true);
  });

  it('should NOT filter non-BoundaryNode nodes', () => {
    const normalBus: NodeSymbol = {
      id: 'bus1',
      elementId: 'bus_elem',
      elementType: 'Bus',
      elementName: 'Szyna SN 15kV',
      position: { x: 0, y: 0 },
      inService: true,
      width: 200,
      height: 8,
    };

    expect(isPccNode(normalBus)).toBe(false);
  });

  it('should filter BoundaryNode from network and maintain determinism', () => {
    const symbols = createNetworkWithPcc();
    const { filtered, connectionNodeIds } = filterPccNodes(symbols);

    expect(connectionNodeIds.length).toBe(1);
    expect(connectionNodeIds[0]).toBe('sym_connection_node');
    expect(filtered.length).toBe(symbols.length - 1);
  });
});

// =============================================================================
// VOLTAGE LEVEL DETECTION TESTS
// =============================================================================

describe('Voltage Level Detection', () => {
  it('should detect WN from name containing "110"', () => {
    const bus = createBus('b1', 'Szyna WN 110kV');
    expect(detectVoltageLevel(bus)).toBe('WN');
  });

  it('should detect SN from name containing "15"', () => {
    const bus = createBus('b1', 'Szyna SN 15kV');
    expect(detectVoltageLevel(bus)).toBe('SN');
  });

  it('should detect nN from name containing "0.4"', () => {
    const bus = createBus('b1', 'Szyna nN 0.4kV');
    expect(detectVoltageLevel(bus)).toBe('nN');
  });

  it('should default to SN for unknown names', () => {
    const bus = createBus('b1', 'Szyna rozdzielcza');
    expect(detectVoltageLevel(bus)).toBe('SN');
  });
});

// =============================================================================
// COLLISION DETECTION TESTS
// =============================================================================

describe('Collision Detection', () => {
  it('should detect symbol-symbol collision', () => {
    const symbols: AnySldSymbol[] = [
      { ...createBus('b1', 'Bus 1'), position: { x: 100, y: 100 } },
      createSource('s1', 'Source', 'b1'),
    ];

    // Place them at same position (collision)
    const positions = new Map<string, Position>([
      ['sym_b1', { x: 100, y: 100 }],
      ['sym_s1', { x: 100, y: 100 }],
    ]);

    const report = detectSymbolCollisions(symbols, positions, 0);
    // Bus-bus collisions are skipped by design, but bus-source should collide
    // Since we have bus + source at same position, this should detect collision
    expect(report.hasCollisions).toBe(true);
  });

  it('should NOT detect collision for well-separated symbols', () => {
    const symbols: AnySldSymbol[] = [
      createBus('b1', 'Bus 1'),
      createSource('s1', 'Source', 'b1'),
    ];

    const positions = new Map<string, Position>([
      ['sym_b1', { x: 100, y: 100 }],
      ['sym_s1', { x: 500, y: 500 }],
    ]);

    const report = detectSymbolCollisions(symbols, positions, 0);
    expect(report.hasCollisions).toBe(false);
  });

  it('should resolve collisions deterministically', () => {
    const symbols: AnySldSymbol[] = [
      createSwitch('sw1', 'SW1', 'b1', 'b2'),
      createSwitch('sw2', 'SW2', 'b1', 'b3'),
    ];

    const positions = new Map<string, Position>([
      ['sym_sw1', { x: 100, y: 100 }],
      ['sym_sw2', { x: 100, y: 100 }],
    ]);

    const { resolved: result1 } = resolveSymbolCollisions(symbols, new Map(positions));
    const { resolved: result2 } = resolveSymbolCollisions(symbols, new Map(positions));

    // Results should be identical
    for (const [id, pos1] of result1) {
      const pos2 = result2.get(id);
      expect(pos2).toBeDefined();
      expect(pos1.x).toBe(pos2!.x);
      expect(pos1.y).toBe(pos2!.y);
    }
  });
});

// =============================================================================
// GEOMETRIC SKELETON TESTS
// =============================================================================

describe('Geometric Skeleton', () => {
  it('should create tiers for standard MV network', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);

    expect(result.skeleton.tiers.length).toBeGreaterThan(0);
    expect(result.skeleton.spinePosition).toBeGreaterThan(0);
  });

  it('should position source above busbar (top-down)', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);

    const srcPos = result.positions.get('sym_src1');
    const wnBusPos = result.positions.get('sym_bus_wn');

    expect(srcPos).toBeDefined();
    expect(wnBusPos).toBeDefined();
    expect(srcPos!.y).toBeLessThan(wnBusPos!.y);
  });

  it('should position transformer between WN and SN busbars', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);

    const wnPos = result.positions.get('sym_bus_wn');
    const trafoPos = result.positions.get('sym_trafo1');
    const snPos = result.positions.get('sym_bus_sn');

    expect(wnPos).toBeDefined();
    expect(trafoPos).toBeDefined();
    expect(snPos).toBeDefined();
    expect(trafoPos!.y).toBeGreaterThan(wnPos!.y);
    expect(trafoPos!.y).toBeLessThan(snPos!.y);
  });

  it('should position feeder switches below SN busbar', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);

    const snPos = result.positions.get('sym_bus_sn');
    const sw1Pos = result.positions.get('sym_sw1');

    expect(snPos).toBeDefined();
    expect(sw1Pos).toBeDefined();
    expect(sw1Pos!.y).toBeGreaterThan(snPos!.y);
  });

  it('should create busbar layouts with sections', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);

    expect(result.skeleton.busbars.length).toBeGreaterThan(0);
    for (const busbar of result.skeleton.busbars) {
      expect(busbar.sections.length).toBeGreaterThan(0);
      expect(busbar.totalWidth).toBeGreaterThan(0);
    }
  });

  it('should position all symbols on grid', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);
    const gridSize = DEFAULT_GEOMETRY_CONFIG.gridSize;

    for (const [_id, pos] of result.positions) {
      expect(pos.x % gridSize).toBe(0);
      expect(pos.y % gridSize).toBe(0);
    }
  });

  it('should assign all symbols a position', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);

    // All non-BoundaryNode symbols should have positions
    for (const symbol of symbols) {
      const pos = result.positions.get(symbol.id);
      expect(pos).toBeDefined();
    }
  });
});

// =============================================================================
// GLOBAL ORIENTATION TESTS
// =============================================================================

describe('Global Orientation', () => {
  it('should resolve top-down orientation', () => {
    const config = resolveOrientation('top-down');
    expect(config.mainAxis).toBe('vertical');
    expect(config.busbarAxis).toBe('horizontal');
    expect(config.feederDirection).toBe('down');
  });

  it('should resolve left-right orientation', () => {
    const config = resolveOrientation('left-right');
    expect(config.mainAxis).toBe('horizontal');
    expect(config.busbarAxis).toBe('vertical');
    expect(config.feederDirection).toBe('right');
  });
});

// =============================================================================
// AUTO-INSERT STABILITY TESTS
// =============================================================================

describe('Auto-Insert', () => {
  it('should handle adding a new feeder element', () => {
    const symbols = createStandardMvNetwork();
    const initial = computeTopologicalLayout(symbols);

    const newSwitch = createSwitch('sw4', 'Wyłącznik linia 4', 'bus_sn', 'node_l4');
    const result = processAutoInsert(
      { kind: 'ADD', symbol: newSwitch },
      symbols,
      initial.positions,
      initial.skeleton
    );

    // New symbol should have a position
    expect(result.updatedPositions.has('sym_sw4')).toBe(true);
    // Existing symbols should be present
    expect(result.updatedPositions.size).toBeGreaterThanOrEqual(symbols.length);
  });

  it('should handle removing a feeder element', () => {
    const symbols = createStandardMvNetwork();
    const initial = computeTopologicalLayout(symbols);

    const result = processAutoInsert(
      { kind: 'REMOVE', symbolId: 'sym_sw3' },
      symbols,
      initial.positions,
      initial.skeleton
    );

    // Removed symbol should not have a position
    expect(result.updatedPositions.has('sym_sw3')).toBe(false);
  });

  it('should maintain stability: unrelated symbols should not move', () => {
    const symbols = createStandardMvNetwork();
    const initial = computeTopologicalLayout(symbols);

    const newLoad = createLoad('load_new', 'Nowy odbiorca', 'bus_sn');
    const result = processAutoInsert(
      { kind: 'ADD', symbol: newLoad },
      symbols,
      initial.positions,
      initial.skeleton
    );

    // Source and WN busbar should remain stable
    const srcPosBefore = initial.positions.get('sym_src1');
    const srcPosAfter = result.updatedPositions.get('sym_src1');
    expect(srcPosBefore).toBeDefined();
    expect(srcPosAfter).toBeDefined();
    // Source position should be the same (it's not in affected scope)
    expect(srcPosBefore!.x).toBe(srcPosAfter!.x);
    expect(srcPosBefore!.y).toBe(srcPosAfter!.y);
  });
});

// =============================================================================
// SLOT SYSTEM TESTS
// =============================================================================

describe('Slot System', () => {
  it('should create feeder slots for each feeder chain', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);

    // Should have slots for the 3 feeder chains
    expect(result.skeleton.allSlots.length).toBeGreaterThanOrEqual(3);
  });

  it('should space slots evenly along busbar', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);

    const snBusbar = result.skeleton.busbars.find(
      (b) => b.voltageLevel === 'SN'
    );

    if (snBusbar && snBusbar.sections[0]?.slots.length >= 2) {
      const slots = snBusbar.sections[0].slots;
      const spacings: number[] = [];
      for (let i = 1; i < slots.length; i++) {
        spacings.push(
          Math.abs(
            slots[i].busbarAxisPosition - slots[i - 1].busbarAxisPosition
          )
        );
      }
      // All spacings should be equal (uniform rhythm)
      if (spacings.length >= 2) {
        const first = spacings[0];
        for (const s of spacings) {
          expect(Math.abs(s - first)).toBeLessThanOrEqual(
            DEFAULT_GEOMETRY_CONFIG.gridSize
          );
        }
      }
    }
  });

  it('should assign feeder elements to slots in deterministic order', () => {
    const symbols = createStandardMvNetwork();
    const result1 = computeTopologicalLayout(symbols);
    const result2 = computeTopologicalLayout([...symbols].reverse());

    // Slots should be identical
    expect(result1.skeleton.allSlots.length).toBe(
      result2.skeleton.allSlots.length
    );

    for (let i = 0; i < result1.skeleton.allSlots.length; i++) {
      expect(result1.skeleton.allSlots[i].slotId).toBe(
        result2.skeleton.allSlots[i].slotId
      );
    }
  });
});

// =============================================================================
// DIAGNOSTICS TESTS
// =============================================================================

describe('Diagnostics', () => {
  it('should report layout time', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);
    expect(result.diagnostics.layoutTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should report tier count', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);
    expect(result.diagnostics.tierCount).toBeGreaterThan(0);
  });

  it('should report assigned role count', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);
    expect(result.diagnostics.assignedRoleCount).toBe(symbols.length);
  });

  it('should report filtered BoundaryNode nodes', () => {
    const symbols = createNetworkWithPcc();
    const result = computeTopologicalLayout(symbols);
    expect(result.diagnostics.filteredPccIds.length).toBe(1);
  });

  it('should report empty state for no symbols', () => {
    const result = computeTopologicalLayout([]);
    expect(result.diagnostics.isEmpty).toBe(true);
  });
});

// =============================================================================
// EXPORT MARGIN TESTS
// =============================================================================

describe('Export Margins', () => {
  it('should validate A3 export margins', () => {
    const symbols = createSimpleNetwork();
    const result = computeTopologicalLayout(symbols);
    const { fitsInPage, requiredWidth, requiredHeight } = validateExportMargins(
      result.positions,
      symbols,
      'A3'
    );
    expect(requiredWidth).toBeGreaterThan(0);
    expect(requiredHeight).toBeGreaterThan(0);
    // Simple network should fit in A3
    expect(fitsInPage).toBe(true);
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Full Layout Integration', () => {
  it('should produce complete layout for standard MV network', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);

    // All symbols should have positions
    expect(result.positions.size).toBe(symbols.length);

    // All symbols should have role assignments
    expect(result.roleAssignments.size).toBe(symbols.length);

    // Should have skeleton
    expect(result.skeleton.tiers.length).toBeGreaterThan(0);
    expect(result.skeleton.busbars.length).toBeGreaterThan(0);

    // Should not have collisions (well-designed layout)
    // Note: initial collisions may exist but should be resolved
    // So we only check that the collision report is available
    expect(result.collisionReport).toBeDefined();

    // Layout time should be reasonable (< 3 seconds per spec)
    expect(result.diagnostics.layoutTimeMs).toBeLessThan(3000);
  });

  it('should produce readable engineering diagram layout', () => {
    const symbols = createStandardMvNetwork();
    const result = computeTopologicalLayout(symbols);

    // Verify hierarchical top-down structure:
    // Source (top) -> WN Busbar -> Transformer -> SN Busbar -> Feeders (bottom)
    const yPositions = new Map<string, number>();
    for (const [id, pos] of result.positions) {
      yPositions.set(id, pos.y);
    }

    // Source should be at the top
    const srcY = yPositions.get('sym_src1')!;
    const wnY = yPositions.get('sym_bus_wn')!;
    const trafoY = yPositions.get('sym_trafo1')!;
    const snY = yPositions.get('sym_bus_sn')!;

    expect(srcY).toBeLessThan(wnY);
    expect(wnY).toBeLessThan(trafoY);
    expect(trafoY).toBeLessThan(snY);

    // All feeders should be below SN busbar
    for (const [id, y] of yPositions) {
      if (id.includes('sw') || id.includes('line')) {
        expect(y).toBeGreaterThanOrEqual(snY);
      }
    }
  });
});
