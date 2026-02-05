/**
 * Tests for Phase 1: Voltage Band Assignment
 *
 * KLUCZOWE TESTY:
 * - Napięcia są DYNAMICZNE (odczytywane z modelu)
 * - Napięcia NIGDY nie są hardkodowane
 * - Determinizm (ten sam input → ten sam output)
 */

import { describe, it, expect } from 'vitest';
import {
  collectUniqueVoltages,
  getSymbolMainVoltage,
  findVoltageBandForSymbol,
  getTransformersBetweenBands,
  validateSymbolVoltages,
  fillMissingVoltages,
  assignVoltageBands,
} from '../phase1-voltage-bands';
import {
  getVoltageColor,
  getVoltageCategory,
  formatVoltageLabel,
  generateVoltageBandId,
  DEFAULT_VOLTAGE_COLOR_MAP,
} from '../config/voltage-colors';
import type { LayoutSymbol, VoltageBand, PipelineContext } from '../types';
import { DEFAULT_LAYOUT_CONFIG } from '../types';

// =============================================================================
// FIXTURES
// =============================================================================

function createBusSymbol(id: string, voltageKV: number): LayoutSymbol {
  return {
    id,
    elementId: `elem_${id}`,
    elementType: 'Bus',
    elementName: `Szyna ${voltageKV} kV`,
    voltageKV,
    inService: true,
  };
}

function createTransformerSymbol(
  id: string,
  voltageHV: number,
  voltageLV: number
): LayoutSymbol {
  return {
    id,
    elementId: `elem_${id}`,
    elementType: 'TransformerBranch',
    elementName: `TR ${voltageHV}/${voltageLV}`,
    voltageHV,
    voltageLV,
    fromNodeId: `elem_bus_hv_${id}`,
    toNodeId: `elem_bus_lv_${id}`,
    inService: true,
  };
}

function createSourceSymbol(id: string, voltageKV?: number): LayoutSymbol {
  return {
    id,
    elementId: `elem_${id}`,
    elementType: 'Source',
    elementName: `SEE ${id}`,
    voltageKV,
    connectedToNodeId: `elem_bus_${id}`,
    inService: true,
  };
}

function createLoadSymbol(id: string, voltageKV?: number): LayoutSymbol {
  return {
    id,
    elementId: `elem_${id}`,
    elementType: 'Load',
    elementName: `Odbiornik ${id}`,
    voltageKV,
    connectedToNodeId: `elem_bus_${id}`,
    inService: true,
  };
}

function createPipelineContext(symbols: LayoutSymbol[]): PipelineContext {
  const elementToSymbol = new Map<string, string>();
  const symbolById = new Map<string, LayoutSymbol>();

  for (const s of symbols) {
    elementToSymbol.set(s.elementId, s.id);
    symbolById.set(s.id, s);
  }

  return {
    symbols,
    config: DEFAULT_LAYOUT_CONFIG,
    voltageColorMap: DEFAULT_VOLTAGE_COLOR_MAP,
    elementToSymbol,
    symbolById,
    userOverrides: new Map(),
    debug: {},
  };
}

// =============================================================================
// TESTY: DYNAMIC VOLTAGES
// =============================================================================

describe('Dynamic Voltage Tests', () => {
  it('should collect unique voltages from model (not hardcoded)', () => {
    // Sieć z NIESTANDARDOWYMI napięciami (20kV zamiast 15kV, 0.69kV zamiast 0.4kV)
    const symbols: LayoutSymbol[] = [
      createBusSymbol('bus_sn', 20),
      createBusSymbol('bus_nn', 0.69),
      createTransformerSymbol('tr1', 20, 0.69),
    ];

    const voltages = collectUniqueVoltages(symbols);

    expect(voltages.has(20)).toBe(true);
    expect(voltages.has(0.69)).toBe(true);
    expect(voltages.size).toBe(2);

    // NIE powinno być standardowych napięć (15, 0.4) bo ich nie ma w modelu
    expect(voltages.has(15)).toBe(false);
    expect(voltages.has(0.4)).toBe(false);
  });

  it('should create voltage bands from model data (dynamic, not hardcoded)', () => {
    const symbols: LayoutSymbol[] = [
      createBusSymbol('bus_sn', 20),
      createBusSymbol('bus_nn', 0.69),
      createTransformerSymbol('tr1', 20, 0.69),
      createSourceSymbol('see1', 20),
      createLoadSymbol('odb1', 0.69),
    ];

    const context = createPipelineContext(symbols);
    const result = assignVoltageBands(context);

    expect(result.voltageBands).toBeDefined();
    expect(result.voltageBands!.length).toBe(2);

    // Pasma muszą zawierać napięcia z MODELU
    const voltages = result.voltageBands!.map((b) => b.nominalVoltageKV);
    expect(voltages).toContain(20);
    expect(voltages).toContain(0.69);

    // Pasmo 20 kV na górze (większe napięcie = mniejsze Y)
    const band20 = result.voltageBands!.find((b) => b.nominalVoltageKV === 20);
    const band069 = result.voltageBands!.find((b) => b.nominalVoltageKV === 0.69);

    expect(band20!.yStart).toBeLessThan(band069!.yStart);
  });

  it('should handle three voltage levels (110/15/0.4)', () => {
    const symbols: LayoutSymbol[] = [
      createBusSymbol('bus_wn', 110),
      createBusSymbol('bus_sn', 15),
      createBusSymbol('bus_nn', 0.4),
      createTransformerSymbol('tr_wn_sn', 110, 15),
      createTransformerSymbol('tr_sn_nn', 15, 0.4),
    ];

    const context = createPipelineContext(symbols);
    const result = assignVoltageBands(context);

    expect(result.voltageBands!.length).toBe(3);

    // Kolejność od góry: 110 → 15 → 0.4
    const sorted = [...result.voltageBands!].sort((a, b) => a.yStart - b.yStart);
    expect(sorted[0].nominalVoltageKV).toBe(110);
    expect(sorted[1].nominalVoltageKV).toBe(15);
    expect(sorted[2].nominalVoltageKV).toBe(0.4);
  });

  it('should work with unusual voltage values (6kV, 30kV, 0.23kV)', () => {
    const symbols: LayoutSymbol[] = [
      createBusSymbol('bus_30', 30),
      createBusSymbol('bus_6', 6),
      createBusSymbol('bus_023', 0.23),
    ];

    const context = createPipelineContext(symbols);
    const result = assignVoltageBands(context);

    expect(result.voltageBands!.length).toBe(3);

    const voltages = result.voltageBands!.map((b) => b.nominalVoltageKV);
    expect(voltages).toContain(30);
    expect(voltages).toContain(6);
    expect(voltages).toContain(0.23);
  });
});

// =============================================================================
// TESTY: VOLTAGE COLOR MAP
// =============================================================================

describe('Voltage Color Map Tests', () => {
  it('should get color from configurable map (not hardcoded)', () => {
    // 15 kV → SN (1-16 kV range)
    const color15 = getVoltageColor(15, DEFAULT_VOLTAGE_COLOR_MAP);
    expect(color15).toBe('#00AACC');

    // 0.4 kV → nN (0.1-1 kV range)
    const color04 = getVoltageColor(0.4, DEFAULT_VOLTAGE_COLOR_MAP);
    expect(color04).toBe('#FF8800');

    // 110 kV → WN (60-200 kV range)
    const color110 = getVoltageColor(110, DEFAULT_VOLTAGE_COLOR_MAP);
    expect(color110).toBe('#CC3333');
  });

  it('should return fallback color for unknown voltage', () => {
    const colorUndefined = getVoltageColor(undefined, DEFAULT_VOLTAGE_COLOR_MAP);
    expect(colorUndefined).toBe('#888888');

    const colorNaN = getVoltageColor(NaN, DEFAULT_VOLTAGE_COLOR_MAP);
    expect(colorNaN).toBe('#888888');
  });

  it('should get correct voltage category', () => {
    expect(getVoltageCategory(110)).toBe('WN');
    expect(getVoltageCategory(15)).toBe('SN');
    expect(getVoltageCategory(20)).toBe('SN');
    expect(getVoltageCategory(0.4)).toBe('nN');
    expect(getVoltageCategory(0.05)).toBe('DC');
    expect(getVoltageCategory(undefined)).toBe('unknown');
  });

  it('should support custom color map', () => {
    const customMap = [
      { minKV: 0, maxKV: Infinity, color: '#FF0000', category: 'SN' as const, description: 'All' },
    ];

    const color = getVoltageColor(15, customMap);
    expect(color).toBe('#FF0000');
  });
});

// =============================================================================
// TESTY: VOLTAGE LABEL FORMATTING
// =============================================================================

describe('Voltage Label Formatting', () => {
  it('should format voltage labels correctly', () => {
    expect(formatVoltageLabel(15)).toBe('15 kV');
    expect(formatVoltageLabel(0.4)).toBe('400 V');
    expect(formatVoltageLabel(110)).toBe('110 kV');
    expect(formatVoltageLabel(0.69)).toBe('690 V');
    expect(formatVoltageLabel(20.5)).toBe('20,5 kV');
    expect(formatVoltageLabel(undefined)).toBe('? kV');
  });

  it('should generate deterministic band IDs', () => {
    const id1 = generateVoltageBandId(15);
    const id2 = generateVoltageBandId(15);
    expect(id1).toBe(id2);

    const id04 = generateVoltageBandId(0.4);
    expect(id04).toBe('band_0_4kV');
  });
});

// =============================================================================
// TESTY: TRANSFORMER BAND CONNECTIONS
// =============================================================================

describe('Transformer Band Connections', () => {
  it('should identify transformers connecting two bands', () => {
    const symbols: LayoutSymbol[] = [
      createBusSymbol('bus_sn', 15),
      createBusSymbol('bus_nn', 0.4),
      createTransformerSymbol('tr1', 15, 0.4),
    ];

    const context = createPipelineContext(symbols);
    const contextWithBands = assignVoltageBands(context);
    const bands = contextWithBands.voltageBands!;

    const connections = getTransformersBetweenBands(symbols, bands);

    expect(connections.length).toBe(1);
    expect(connections[0].transformerSymbolId).toBe('tr1');
    expect(connections[0].hvVoltageKV).toBe(15);
    expect(connections[0].lvVoltageKV).toBe(0.4);
  });
});

// =============================================================================
// TESTY: VOLTAGE VALIDATION
// =============================================================================

describe('Voltage Validation', () => {
  it('should report missing voltages on busbars', () => {
    const symbols: LayoutSymbol[] = [
      { ...createBusSymbol('bus1', 15), voltageKV: undefined },
      createBusSymbol('bus2', 0.4),
    ];

    const missing = validateSymbolVoltages(symbols);

    expect(missing.length).toBe(1);
    expect(missing[0].id).toBe('bus1');
  });

  it('should fill missing voltages from connections', () => {
    const symbols: LayoutSymbol[] = [
      createBusSymbol('bus1', 15),
      {
        id: 'load1',
        elementId: 'elem_load1',
        elementType: 'Load',
        elementName: 'Odbiornik',
        voltageKV: undefined, // Brak napięcia
        connectedToNodeId: 'elem_bus1',
        inService: true,
      },
    ];

    const filled = fillMissingVoltages(symbols);

    expect(filled).toBe(1);
    expect(symbols.find((s) => s.id === 'load1')!.voltageKV).toBe(15);
  });
});

// =============================================================================
// TESTY: DETERMINISM
// =============================================================================

describe('Voltage Band Determinism', () => {
  it('should produce identical bands for same input', () => {
    const symbols: LayoutSymbol[] = [
      createBusSymbol('bus_sn', 15),
      createBusSymbol('bus_nn', 0.4),
      createTransformerSymbol('tr1', 15, 0.4),
      createSourceSymbol('see1', 15),
      createLoadSymbol('odb1', 0.4),
    ];

    const context1 = createPipelineContext(symbols);
    const result1 = assignVoltageBands(context1);

    const context2 = createPipelineContext(symbols);
    const result2 = assignVoltageBands(context2);

    // Porównaj pasma
    expect(result1.voltageBands!.length).toBe(result2.voltageBands!.length);

    for (let i = 0; i < result1.voltageBands!.length; i++) {
      expect(result1.voltageBands![i].id).toBe(result2.voltageBands![i].id);
      expect(result1.voltageBands![i].nominalVoltageKV).toBe(result2.voltageBands![i].nominalVoltageKV);
      expect(result1.voltageBands![i].yStart).toBe(result2.voltageBands![i].yStart);
      expect(result1.voltageBands![i].yEnd).toBe(result2.voltageBands![i].yEnd);
    }
  });

  it('should produce identical bands regardless of input order', () => {
    const symbols1: LayoutSymbol[] = [
      createBusSymbol('bus_a', 15),
      createBusSymbol('bus_b', 0.4),
      createBusSymbol('bus_c', 110),
    ];

    const symbols2: LayoutSymbol[] = [
      createBusSymbol('bus_c', 110),
      createBusSymbol('bus_a', 15),
      createBusSymbol('bus_b', 0.4),
    ];

    const context1 = createPipelineContext(symbols1);
    const result1 = assignVoltageBands(context1);

    const context2 = createPipelineContext(symbols2);
    const result2 = assignVoltageBands(context2);

    // Pasma powinny mieć te same napięcia (kolejność może się różnić)
    const voltages1 = result1.voltageBands!.map((b) => b.nominalVoltageKV).sort();
    const voltages2 = result2.voltageBands!.map((b) => b.nominalVoltageKV).sort();

    expect(voltages1).toEqual(voltages2);
  });
});
