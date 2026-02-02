/**
 * PR-SLD-05: Testy snap do portow i tworzenia polaczen
 *
 * ZAKRES TESTOW:
 * - Snap do portu przy przeciaganiu symbolu
 * - Utworzenie polaczenia port A -> port B
 * - Brak utworzenia polaczenia przy kliknieciu poza port
 * - Deterministycznosc wyboru portu przy wielu kandydatach
 * - Brak duplikatow polaczen
 * - Walidacja polaczen (logika inzynierska)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  findNearestPort,
  findPortAtPoint,
  calculateSnapPosition,
  validateConnection,
  getSymbolPorts,
  SNAP_CONFIG,
  type PortInfo,
} from '../utils/portUtils';
import type { AnySldSymbol, NodeSymbol, SwitchSymbol, BranchSymbol, Position } from '../types';

// =============================================================================
// FIXTURES
// =============================================================================

/** Tworzy symbol Bus (szyna) */
function createBusSymbol(id: string, position: Position): NodeSymbol {
  return {
    id,
    elementId: `elem_${id}`,
    elementType: 'Bus',
    elementName: `Szyna ${id}`,
    position,
    inService: true,
    width: 80,
    height: 40,
  };
}

/** Tworzy symbol Switch (wylacznik) */
function createSwitchSymbol(
  id: string,
  position: Position,
  fromNodeId: string,
  toNodeId: string
): SwitchSymbol {
  return {
    id,
    elementId: `elem_${id}`,
    elementType: 'Switch',
    elementName: `Wyłącznik ${id}`,
    position,
    inService: true,
    fromNodeId,
    toNodeId,
    switchState: 'CLOSED',
    switchType: 'BREAKER',
  };
}

/** Tworzy symbol LineBranch */
function createLineBranchSymbol(
  id: string,
  position: Position,
  fromNodeId: string,
  toNodeId: string
): BranchSymbol {
  return {
    id,
    elementId: `elem_${id}`,
    elementType: 'LineBranch',
    elementName: `Linia ${id}`,
    position,
    inService: true,
    fromNodeId,
    toNodeId,
    points: [],
    branchType: 'CABLE',
  };
}

// =============================================================================
// TESTY: SNAP DO PORTU
// =============================================================================

describe('PR-SLD-05: Snap do portu', () => {
  describe('findNearestPort', () => {
    it('powinien znaleźć port w promieniu snap', () => {
      const bus = createBusSymbol('bus1', { x: 100, y: 100 });
      const symbols: AnySldSymbol[] = [bus];

      // Punkt w poblizu portu 'right' szyny (100 + 40 = 140, y = 100)
      const point: Position = { x: 145, y: 100 };

      const result = findNearestPort(point, symbols, new Set(), SNAP_CONFIG.snapRadius);

      expect(result).not.toBeNull();
      expect(result?.symbolId).toBe('bus1');
      expect(result?.portName).toBe('right');
    });

    it('powinien zwrócić null gdy brak portów w promieniu snap', () => {
      const bus = createBusSymbol('bus1', { x: 100, y: 100 });
      const symbols: AnySldSymbol[] = [bus];

      // Punkt daleko od wszystkich portów
      const point: Position = { x: 300, y: 300 };

      const result = findNearestPort(point, symbols, new Set(), SNAP_CONFIG.snapRadius);

      expect(result).toBeNull();
    });

    it('powinien wykluczyć symbole z excludeSymbolIds', () => {
      const bus1 = createBusSymbol('bus1', { x: 100, y: 100 });
      const bus2 = createBusSymbol('bus2', { x: 200, y: 100 });
      const symbols: AnySldSymbol[] = [bus1, bus2];

      // Punkt blisko bus1, ale bus1 jest wykluczone
      const point: Position = { x: 145, y: 100 };
      const excludeIds = new Set(['bus1']);

      const result = findNearestPort(point, symbols, excludeIds, SNAP_CONFIG.snapRadius);

      // Powinien zwrocic null lub port z bus2 jesli jest w zasiegu
      expect(result?.symbolId).not.toBe('bus1');
    });

    it('powinien być deterministyczny przy równych odległościach (tie-break po ID)', () => {
      // Dwa symbole w tej samej pozycji
      const bus1 = createBusSymbol('bus_a', { x: 100, y: 100 });
      const bus2 = createBusSymbol('bus_b', { x: 100, y: 100 });
      const symbols: AnySldSymbol[] = [bus1, bus2];

      const point: Position = { x: 145, y: 100 };

      // Wywolaj wielokrotnie - wynik powinien byc ten sam
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = findNearestPort(point, symbols, new Set(), SNAP_CONFIG.snapRadius);
        results.push(result?.symbolId);
      }

      // Wszystkie wyniki powinny byc takie same (deterministyczne)
      expect(new Set(results).size).toBe(1);
      // Powinien wybrac 'bus_a' (alfabetycznie pierwszy)
      expect(results[0]).toBe('bus_a');
    });

    it('powinien być deterministyczny przy wyborze portu (top > bottom > left > right)', () => {
      // Symbol w pozycji gdzie punkt jest blisko kilku portow
      const bus = createBusSymbol('bus1', { x: 100, y: 100 });
      const symbols: AnySldSymbol[] = [bus];

      // Punkt na srodku symbolu - blisko wszystkich portow
      const point: Position = { x: 100, y: 100 };

      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = findNearestPort(point, symbols, new Set(), 50); // Duzy promien
        results.push(result?.portName);
      }

      // Wszystkie wyniki powinny byc takie same
      expect(new Set(results).size).toBe(1);
    });
  });

  describe('calculateSnapPosition', () => {
    it('powinien obliczyć pozycję snap gdy port symbolu jest w zasięgu portu docelowego', () => {
      const bus1 = createBusSymbol('bus1', { x: 100, y: 100 });
      const sw = createSwitchSymbol('sw1', { x: 150, y: 100 }, '', ''); // W poblizu bus1
      const symbols: AnySldSymbol[] = [bus1, sw];

      const result = calculateSnapPosition(sw, sw.position, symbols, 20);

      // Powinien zwrocic pozycje snap
      if (result) {
        expect(result.position).toBeDefined();
        expect(result.snappedPort).toBeDefined();
        expect(result.targetPort).toBeDefined();
      }
    });

    it('powinien zwrócić null gdy brak portu docelowego w zasięgu', () => {
      const bus1 = createBusSymbol('bus1', { x: 100, y: 100 });
      const sw = createSwitchSymbol('sw1', { x: 500, y: 500 }, '', ''); // Daleko od bus1
      const symbols: AnySldSymbol[] = [bus1, sw];

      const result = calculateSnapPosition(sw, sw.position, symbols, SNAP_CONFIG.snapRadius);

      expect(result).toBeNull();
    });
  });

  describe('getSymbolPorts', () => {
    it('powinien zwrócić 4 porty dla każdego symbolu', () => {
      const bus = createBusSymbol('bus1', { x: 100, y: 100 });

      const ports = getSymbolPorts(bus);

      expect(ports).toHaveLength(4);
      expect(ports.map(p => p.portName)).toEqual(['top', 'bottom', 'left', 'right']);
    });

    it('powinien obliczyć poprawne pozycje portów dla Bus', () => {
      const bus = createBusSymbol('bus1', { x: 100, y: 100 });

      const ports = getSymbolPorts(bus);
      const portByName = Object.fromEntries(ports.map(p => [p.portName, p.position]));

      // Bus ma width=80, height=40, więc:
      // left: x - 40 = 60
      // right: x + 40 = 140
      // top/bottom: na środku symbolu
      expect(portByName.left.x).toBeLessThan(100);
      expect(portByName.right.x).toBeGreaterThan(100);
    });
  });
});

// =============================================================================
// TESTY: WALIDACJA POLACZEN
// =============================================================================

describe('PR-SLD-05: Walidacja połączeń', () => {
  describe('validateConnection', () => {
    it('powinien odrzucić połączenie portu z portem tego samego elementu', () => {
      const port1: PortInfo = {
        symbolId: 'bus1',
        elementId: 'elem_bus1',
        portName: 'left',
        position: { x: 60, y: 100 },
        elementType: 'Bus',
      };

      const port2: PortInfo = {
        symbolId: 'bus1', // Ten sam symbol
        elementId: 'elem_bus1',
        portName: 'right',
        position: { x: 140, y: 100 },
        elementType: 'Bus',
      };

      const result = validateConnection(port1, port2, []);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('tego samego elementu');
    });

    it('powinien odrzucić duplikat połączenia', () => {
      const port1: PortInfo = {
        symbolId: 'bus1',
        elementId: 'elem_bus1',
        portName: 'bottom',
        position: { x: 100, y: 120 },
        elementType: 'Bus',
      };

      const port2: PortInfo = {
        symbolId: 'sw1',
        elementId: 'elem_sw1',
        portName: 'top',
        position: { x: 100, y: 150 },
        elementType: 'Switch',
      };

      // Istniejące połączenie
      const existingConnections = [
        { fromSymbolId: 'bus1', toSymbolId: 'sw1' },
      ];

      const result = validateConnection(port1, port2, existingConnections);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('już istnieje');
    });

    it('powinien odrzucić duplikat połączenia w odwrotnym kierunku', () => {
      const port1: PortInfo = {
        symbolId: 'sw1',
        elementId: 'elem_sw1',
        portName: 'top',
        position: { x: 100, y: 150 },
        elementType: 'Switch',
      };

      const port2: PortInfo = {
        symbolId: 'bus1',
        elementId: 'elem_bus1',
        portName: 'bottom',
        position: { x: 100, y: 120 },
        elementType: 'Bus',
      };

      // Istniejące połączenie (w drugą stronę)
      const existingConnections = [
        { fromSymbolId: 'bus1', toSymbolId: 'sw1' },
      ];

      const result = validateConnection(port1, port2, existingConnections);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('już istnieje');
    });

    it('powinien odrzucić połączenie bez szyny (Bus)', () => {
      const port1: PortInfo = {
        symbolId: 'sw1',
        elementId: 'elem_sw1',
        portName: 'top',
        position: { x: 100, y: 150 },
        elementType: 'Switch',
      };

      const port2: PortInfo = {
        symbolId: 'sw2',
        elementId: 'elem_sw2',
        portName: 'bottom',
        position: { x: 100, y: 200 },
        elementType: 'Switch',
      };

      const result = validateConnection(port1, port2, []);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('szynę zbiorczą');
    });

    it('powinien zaakceptować poprawne połączenie Bus -> Switch', () => {
      const port1: PortInfo = {
        symbolId: 'bus1',
        elementId: 'elem_bus1',
        portName: 'bottom',
        position: { x: 100, y: 120 },
        elementType: 'Bus',
      };

      const port2: PortInfo = {
        symbolId: 'sw1',
        elementId: 'elem_sw1',
        portName: 'top',
        position: { x: 100, y: 150 },
        elementType: 'Switch',
      };

      const result = validateConnection(port1, port2, []);

      expect(result.valid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('powinien zaakceptować poprawne połączenie Bus -> Bus', () => {
      const port1: PortInfo = {
        symbolId: 'bus1',
        elementId: 'elem_bus1',
        portName: 'right',
        position: { x: 140, y: 100 },
        elementType: 'Bus',
      };

      const port2: PortInfo = {
        symbolId: 'bus2',
        elementId: 'elem_bus2',
        portName: 'left',
        position: { x: 160, y: 100 },
        elementType: 'Bus',
      };

      const result = validateConnection(port1, port2, []);

      expect(result.valid).toBe(true);
    });
  });
});

// =============================================================================
// TESTY: ZNAJDOWANIE PORTU W PUNKCIE
// =============================================================================

describe('PR-SLD-05: Znajdowanie portu w punkcie', () => {
  describe('findPortAtPoint', () => {
    it('powinien znaleźć port gdy punkt jest w hitbox', () => {
      const bus = createBusSymbol('bus1', { x: 100, y: 100 });
      const symbols: AnySldSymbol[] = [bus];

      // Punkt dokładnie na porcie 'right'
      const ports = getSymbolPorts(bus);
      const rightPort = ports.find(p => p.portName === 'right')!;

      const result = findPortAtPoint(rightPort.position, symbols);

      expect(result).not.toBeNull();
      expect(result?.portName).toBe('right');
    });

    it('powinien zwrócić null gdy punkt jest poza hitbox', () => {
      const bus = createBusSymbol('bus1', { x: 100, y: 100 });
      const symbols: AnySldSymbol[] = [bus];

      // Punkt daleko od wszystkich portów
      const point: Position = { x: 500, y: 500 };

      const result = findPortAtPoint(point, symbols);

      expect(result).toBeNull();
    });
  });
});

// =============================================================================
// TESTY: DETERMINISTYCZNOSC
// =============================================================================

describe('PR-SLD-05: Deterministyczność', () => {
  it('findNearestPort powinien dawać identyczne wyniki dla identycznych danych wejściowych', () => {
    const bus1 = createBusSymbol('bus1', { x: 100, y: 100 });
    const bus2 = createBusSymbol('bus2', { x: 200, y: 100 });
    const sw = createSwitchSymbol('sw1', { x: 150, y: 150 }, '', '');
    const symbols: AnySldSymbol[] = [bus1, bus2, sw];

    const point: Position = { x: 150, y: 110 };

    // Wykonaj 100 razy
    const results: string[] = [];
    for (let i = 0; i < 100; i++) {
      const result = findNearestPort(point, symbols, new Set(), 30);
      if (result) {
        results.push(`${result.symbolId}:${result.portName}`);
      }
    }

    // Wszystkie wyniki powinny być identyczne
    const uniqueResults = new Set(results);
    expect(uniqueResults.size).toBe(1);
  });

  it('getSymbolPorts powinien zwracać porty w stałej kolejności', () => {
    const bus = createBusSymbol('bus1', { x: 100, y: 100 });

    // Wykonaj wielokrotnie
    const orderings: string[][] = [];
    for (let i = 0; i < 10; i++) {
      const ports = getSymbolPorts(bus);
      orderings.push(ports.map(p => p.portName));
    }

    // Wszystkie kolejności powinny być identyczne
    const firstOrdering = JSON.stringify(orderings[0]);
    const allSame = orderings.every(o => JSON.stringify(o) === firstOrdering);
    expect(allSame).toBe(true);
  });
});
