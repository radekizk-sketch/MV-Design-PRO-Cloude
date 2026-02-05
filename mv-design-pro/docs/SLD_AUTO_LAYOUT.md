# SLD Auto-Layout Engine

## Overview

The SLD (Single Line Diagram) Auto-Layout Engine provides automatic positioning and routing for electrical network schematics. It generates professional-grade diagrams similar to ETAP and PowerFactory output.

## Key Features

- **Dynamic Voltage Bands**: Voltages are read from the model, never hardcoded
- **100% Determinism**: Same input always produces identical pixel output
- **Automatic Bay Detection**: Detects feeder bays from busbar connections
- **Crossing Minimization**: Uses barycenter heuristic from Sugiyama algorithm
- **Orthogonal Routing**: Professional-grade edge routing
- **Grid Alignment**: All positions snapped to configurable grid
- **Incremental Layout**: Small changes don't reset entire schema

## Installation

The engine is part of the frontend package:

```typescript
import { computeLayout } from '@/engine/sld-layout';
```

## Basic Usage

```typescript
import { computeLayout } from '@/engine/sld-layout';
import type { LayoutSymbol, LayoutResult } from '@/engine/sld-layout';

// Define network symbols
const symbols: LayoutSymbol[] = [
  {
    id: 'see1',
    elementId: 'elem_see1',
    elementType: 'Source',
    elementName: 'Zasilanie',
    voltageKV: 15,
    connectedToNodeId: 'elem_bus_sn',
    inService: true,
  },
  {
    id: 'bus_sn',
    elementId: 'elem_bus_sn',
    elementType: 'Bus',
    elementName: 'Szyna SN 15kV',
    voltageKV: 15,
    inService: true,
  },
  // ... more symbols
];

// Compute layout
const result: LayoutResult = computeLayout({ symbols });

// Use results
result.positions;      // Map<symbolId, ElementPosition>
result.voltageBands;   // VoltageBand[] (dynamic voltage bands)
result.bays;           // Bay[] (detected bays)
result.routedEdges;    // Map<edgeId, RoutedEdge>
result.labelPositions; // Map<symbolId, LabelPosition>
```

## Pipeline Architecture

The layout engine uses a 5-phase pipeline inspired by the Sugiyama framework:

### Phase 1: Voltage Band Assignment

Collects unique voltages from the model and creates voltage bands:

- Reads `voltageKV`, `voltageHV`, `voltageLV` from symbols
- Sorts voltages descending (highest = top of diagram)
- Assigns colors from configurable color map
- Categories: NN (>200kV), WN (60-200kV), SN (1-60kV), nN (0.1-1kV), DC (<0.1kV)

```typescript
import { collectUniqueVoltages, assignVoltageBands } from '@/engine/sld-layout';
```

### Phase 2: Bay Detection

Detects feeder bays from busbar connections using BFS:

- Identifies bay types: incomer, feeder, tie, generator, oze_pv, oze_wind, bess, etc.
- Creates hierarchy for nested busbars
- Groups elements belonging to each bay

```typescript
import { detectBays, findBayContainingSymbol } from '@/engine/sld-layout';
```

### Phase 3: Crossing Minimization

Optimizes bay order to minimize edge crossings:

- Uses barycenter heuristic
- Respects type constraints (incomer left, tie right)
- Max 20 iterations for convergence

```typescript
import { minimizeCrossings, sortBaysByType } from '@/engine/sld-layout';
```

### Phase 4: Coordinate Assignment

Assigns precise X,Y coordinates:

- Sources positioned above busbars
- Transformers between voltage bands
- Loads/Generators at bottom
- All positions snapped to grid

```typescript
import { assignCoordinates, calculateSchemaBounds } from '@/engine/sld-layout';
```

### Phase 5: Edge Routing + Label Placement

Creates orthogonal paths and places labels:

- L-shaped and Z-shaped routing
- Collision-aware label placement
- Port-to-port connections (top, bottom, left, right)

```typescript
import { routeEdgesAndPlaceLabels, validateOrthogonalPaths } from '@/engine/sld-layout';
```

## Configuration

```typescript
import { DEFAULT_LAYOUT_CONFIG } from '@/engine/sld-layout';

const customConfig = {
  ...DEFAULT_LAYOUT_CONFIG,
  gridSize: 20,           // Grid snap size
  busbarMinWidth: 400,    // Minimum busbar width
  bayGap: 160,            // Gap between bays
  elementGapY: 100,       // Vertical gap between elements
};

const result = computeLayout({
  symbols,
  config: customConfig,
});
```

## Voltage Color Customization

```typescript
import {
  DEFAULT_VOLTAGE_COLOR_MAP,
  ETAP_STYLE_COLORS,
  POWERFACTORY_STYLE_COLORS,
  getVoltageColor,
} from '@/engine/sld-layout';

// Use ETAP-style colors
const result = computeLayout({
  symbols,
  voltageColorMap: ETAP_STYLE_COLORS,
});

// Custom color map
const customColorMap = [
  { minKV: 60, maxKV: 200, color: '#CC3333', category: 'WN', description: 'High Voltage' },
  { minKV: 1, maxKV: 60, color: '#00AACC', category: 'SN', description: 'Medium Voltage' },
  { minKV: 0, maxKV: 1, color: '#FF8800', category: 'nN', description: 'Low Voltage' },
];
```

## Symbol Types

Supported element types:

| Type | Description | Connections |
|------|-------------|-------------|
| `Bus` | Busbar/electrical node | - |
| `Source` | External grid source | `connectedToNodeId` |
| `Load` | Load/consumer | `connectedToNodeId` |
| `Generator` | Power generator (PV, Wind, BESS) | `connectedToNodeId` |
| `TransformerBranch` | Transformer | `fromNodeId`, `toNodeId`, `voltageHV`, `voltageLV` |
| `LineBranch` | Line/cable | `fromNodeId`, `toNodeId` |
| `Switch` | Circuit breaker/switch | `fromNodeId`, `toNodeId` |

## Determinism Rules

The engine guarantees deterministic output:

1. **D1**: No `Math.random()`
2. **D2**: No `Date.now()` as seed
3. **D3**: No iteration order from Set/Map - always sorted
4. **D4**: No DOM layout dependencies
5. **D5**: Tiebreaker = `element.id` (string sort)
6. **D6**: Floating point: `Math.round(x * 100) / 100`
7. **D7**: Test: `computeLayout(model) === computeLayout(model)` BIT-FOR-BIT

```typescript
import { verifyDeterminism } from '@/engine/sld-layout';

const isDeterministic = verifyDeterminism({ symbols });
// true if 5 consecutive runs produce identical output
```

## Supported Network Topologies

The engine supports these common topologies:

- **Pattern A**: Radial (SEE → TR → Loads)
- **Pattern B**: Multi-feeder (busbar with multiple feeders)
- **Pattern C**: Przyłącze SN/nN (most common - substation connection)
- **Pattern D**: OZE/BESS (renewable energy integration)
- **Pattern E**: Ring network
- **Pattern F**: Dual-transformer SZR
- **Pattern G**: Magistrala (backbone)
- **Pattern H**: Composite networks

## API Reference

### Main Functions

```typescript
// Main layout function
function computeLayout(input: LayoutInput): LayoutResult;

// Verify determinism
function verifyDeterminism(input: LayoutInput, runs?: number): boolean;

// Incremental layout (for user overrides)
function computeIncrementalLayout(
  input: LayoutInput,
  previousResult: LayoutResult,
  changes: LayoutChange[]
): LayoutResult;
```

### Types

```typescript
interface LayoutInput {
  symbols: LayoutSymbol[];
  config?: Partial<LayoutConfig>;
  voltageColorMap?: VoltageColorRule[];
  userOverrides?: Map<string, UserPositionOverride>;
}

interface LayoutResult {
  positions: Map<string, ElementPosition>;
  voltageBands: VoltageBand[];
  bays: Bay[];
  routedEdges: Map<string, RoutedEdge>;
  labelPositions: Map<string, LabelPosition>;
  busbarGeometries: Map<string, BusbarGeometry>;
  schemaBounds: Rectangle;
  debug: LayoutDebugInfo;
}
```

## Testing

Run tests:

```bash
cd mv-design-pro/frontend
npm test -- src/engine/sld-layout
```

Test coverage includes:
- Voltage band assignment (dynamic voltages)
- Bay detection for all topology patterns
- Determinism verification
- Grid alignment
- Overlap detection
- Edge routing orthogonality

## Architecture Principles

1. **DYNAMIC VOLTAGES**: Read from model, never hardcode 15kV/0.4kV
2. **NO AUTO-LAYOUT BUTTON**: Layout runs automatically on model changes
3. **DETERMINISM**: Same model = identical pixel output
4. **INCREMENTAL**: Small changes don't reset entire schema
5. **PROFESSIONAL OUTPUT**: ETAP/PowerFactory-grade diagrams
