import type { EnergyNetworkModel } from '../../types/enm';
import type {
  AnySldSymbol,
  BranchSymbol,
  BusSymbol,
  GeneratorSymbol,
  LoadSymbol,
  SourceSymbol,
  SwitchSymbol,
} from '../sld-editor/types';
import { computeTopologicalLayout } from '../sld-editor/utils/topological-layout';

type SnapshotLike = Partial<EnergyNetworkModel> & Record<string, unknown>;
type SnapshotRecord = Record<string, unknown>;

function asRecords(value: unknown): SnapshotRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is SnapshotRecord => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .sort((left, right) => {
      const leftRef = typeof left.ref_id === 'string' ? left.ref_id : '';
      const rightRef = typeof right.ref_id === 'string' ? right.ref_id : '';
      return leftRef.localeCompare(rightRef);
    });
}

function readString(record: SnapshotRecord, key: string, fallback = ''): string {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function readNumber(record: SnapshotRecord, key: string, fallback: number): number {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isSwitchBranchType(branchType: string): boolean {
  return ['switch', 'breaker', 'bus_coupler', 'disconnector', 'fuse'].includes(branchType);
}

function toSwitchType(branchType: string): SwitchSymbol['switchType'] {
  switch (branchType) {
    case 'breaker':
    case 'bus_coupler':
      return 'BREAKER';
    case 'disconnector':
      return 'DISCONNECTOR';
    case 'fuse':
      return 'FUSE';
    default:
      return 'LOAD_SWITCH';
  }
}

function buildBaseSymbols(snapshot: SnapshotLike): AnySldSymbol[] {
  const symbols: AnySldSymbol[] = [];

  for (const bus of asRecords(snapshot.buses)) {
    const refId = readString(bus, 'ref_id');
    if (!refId) {
      continue;
    }

    symbols.push({
      id: refId,
      elementId: refId,
      elementType: 'Bus',
      elementName: readString(bus, 'name', refId),
      position: { x: 0, y: 0 },
      inService: true,
      width: 160,
      height: 8,
    } as BusSymbol);
  }

  for (const source of asRecords(snapshot.sources)) {
    const refId = readString(source, 'ref_id');
    if (!refId) {
      continue;
    }

    symbols.push({
      id: refId,
      elementId: refId,
      elementType: 'Source',
      elementName: readString(source, 'name', refId),
      position: { x: 0, y: 0 },
      inService: true,
      connectedToNodeId: readString(source, 'bus_ref'),
    } as SourceSymbol);
  }

  for (const transformer of asRecords(snapshot.transformers)) {
    const refId = readString(transformer, 'ref_id');
    if (!refId) {
      continue;
    }

    symbols.push({
      id: refId,
      elementId: refId,
      elementType: 'TransformerBranch',
      elementName: readString(transformer, 'name', refId),
      position: { x: 0, y: 0 },
      inService: true,
      fromNodeId: readString(transformer, 'hv_bus_ref'),
      toNodeId: readString(transformer, 'lv_bus_ref'),
      points: [],
    } as BranchSymbol);
  }

  for (const branch of asRecords(snapshot.branches)) {
    const refId = readString(branch, 'ref_id');
    const branchType = readString(branch, 'type');
    if (!refId || !branchType) {
      continue;
    }

    if (isSwitchBranchType(branchType)) {
      symbols.push({
        id: refId,
        elementId: refId,
        elementType: 'Switch',
        elementName: readString(branch, 'name', refId),
        position: { x: 0, y: 0 },
        inService: readString(branch, 'status', 'closed') === 'closed',
        fromNodeId: readString(branch, 'from_bus_ref'),
        toNodeId: readString(branch, 'to_bus_ref'),
        switchState: readString(branch, 'status', 'closed') === 'open' ? 'OPEN' : 'CLOSED',
        switchType: toSwitchType(branchType),
      } as SwitchSymbol);
      continue;
    }

    symbols.push({
      id: refId,
      elementId: refId,
      elementType: 'LineBranch',
      elementName: readString(branch, 'name', refId),
      position: { x: 0, y: 0 },
      inService: readString(branch, 'status', 'closed') === 'closed',
      fromNodeId: readString(branch, 'from_bus_ref'),
      toNodeId: readString(branch, 'to_bus_ref'),
      points: [],
      branchType: branchType === 'cable' ? 'CABLE' : 'LINE',
    } as BranchSymbol);
  }

  for (const load of asRecords(snapshot.loads)) {
    const refId = readString(load, 'ref_id');
    if (!refId) {
      continue;
    }

    symbols.push({
      id: refId,
      elementId: refId,
      elementType: 'Load',
      elementName: readString(load, 'name', refId),
      position: { x: 0, y: 0 },
      inService: true,
      connectedToNodeId: readString(load, 'bus_ref'),
    } as LoadSymbol);
  }

  for (const generator of asRecords(snapshot.generators)) {
    const refId = readString(generator, 'ref_id');
    if (!refId) {
      continue;
    }

    symbols.push({
      id: refId,
      elementId: refId,
      elementType: 'Generator',
      elementName: readString(generator, 'name', refId),
      position: { x: 0, y: 0 },
      inService: true,
      connectedToNodeId: readString(generator, 'bus_ref'),
    } as GeneratorSymbol);
  }

  return symbols;
}

export function enmSnapshotToSldSymbols(snapshot: SnapshotLike | null | undefined): AnySldSymbol[] {
  if (!snapshot) {
    return [];
  }

  const baseSymbols = buildBaseSymbols(snapshot);
  if (baseSymbols.length === 0) {
    return [];
  }

  try {
    const layout = computeTopologicalLayout(baseSymbols);
    return baseSymbols.map((symbol) => ({
      ...symbol,
      position: layout.positions.get(symbol.id) ?? symbol.position,
    }));
  } catch {
    return baseSymbols.map((symbol) => ({
      ...symbol,
      position: {
        x: readNumber(symbol.position as unknown as SnapshotRecord, 'x', symbol.position.x),
        y: readNumber(symbol.position as unknown as SnapshotRecord, 'y', symbol.position.y),
      },
    }));
  }
}
