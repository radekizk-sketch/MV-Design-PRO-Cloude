import type { TopologyInputV1 } from './topologyInputReader';
import type { StationBlockBuildResult } from './stationBlockBuilder';
import { type FieldRoleV1, EmbeddingRoleV1 } from './fieldDeviceContracts';

export type VisualPortSide = 'gora' | 'dol' | 'lewo' | 'prawo';
export interface VisualPortContract { readonly id: string; readonly side: VisualPortSide }

export type VisualTopologyClass = 'rozdzielczy' | 'sieciowy_glowny' | 'sieciowy_odgalezny' | 'sieciowy_wtorny' | 'stacyjny' | 'aparatowy';

export interface VisualBaseContract {
  readonly id: string;
  readonly kind: string;
  readonly role: string;
  readonly domainElementId: string;
  readonly topologyClass: VisualTopologyClass;
  readonly ports: readonly VisualPortContract[];
  readonly selectionElementId: string;
  readonly inspectorElementId: string;
}

export interface GpzVisual extends VisualBaseContract { readonly kind: 'gpz' }
export interface BusbarSnVisual extends VisualBaseContract { readonly kind: 'szyna_sn' }
export interface FieldSnVisual extends VisualBaseContract { readonly kind: 'pole_sn'; readonly stationId: string; readonly fieldRole: FieldRoleV1 }
export interface TrunkSegmentVisual extends VisualBaseContract { readonly kind: 'segment_magistrali' }
export interface BranchSegmentVisual extends VisualBaseContract { readonly kind: 'segment_odgalezienia' }
export interface BranchJunctionVisual extends VisualBaseContract { readonly kind: 'punkt_rozgalezienia'; readonly nodeId: string }
export interface StationVisual extends VisualBaseContract { readonly kind: 'stacja_sn_nn'; readonly stationRole: 'koncowa' | 'przelotowa' | 'odgalezna' | 'sekcyjna' }
export interface RingConnectorVisual extends VisualBaseContract { readonly kind: 'lacze_pierscieniowe' }
export interface NopVisual extends VisualBaseContract { readonly kind: 'punkt_normalnie_otwarty'; readonly segmentId: string }

export interface VisualTopologyContractV1 {
  readonly gpz: readonly GpzVisual[];
  readonly busbarsSn: readonly BusbarSnVisual[];
  readonly fieldsSn: readonly FieldSnVisual[];
  readonly trunkSegments: readonly TrunkSegmentVisual[];
  readonly branchSegments: readonly BranchSegmentVisual[];
  readonly branchJunctions: readonly BranchJunctionVisual[];
  readonly stations: readonly StationVisual[];
  readonly ringConnectors: readonly RingConnectorVisual[];
  readonly nops: readonly NopVisual[];
}

interface SegmentationEdgeSets {
  readonly trunkEdgeIds: ReadonlySet<string>;
  readonly branchEdgeIds: ReadonlySet<string>;
  readonly secondaryEdgeIds: ReadonlySet<string>;
}

const p = (id: string, side: VisualPortSide): VisualPortContract => ({ id, side });
const portsLinearVertical = (): readonly VisualPortContract[] => [p('in', 'gora'), p('out', 'dol')];


function isNetworkSegmentKind(kind: TopologyInputV1['branches'][number]['kind']): boolean {
  return kind === 'LINE' || kind === 'CABLE';
}

function mapStationRole(role: EmbeddingRoleV1): StationVisual['stationRole'] {
  if (role === EmbeddingRoleV1.TRUNK_INLINE) return 'przelotowa';
  if (role === EmbeddingRoleV1.TRUNK_BRANCH) return 'odgalezna';
  if (role === EmbeddingRoleV1.LOCAL_SECTIONAL) return 'sekcyjna';
  return 'koncowa';
}

export function buildVisualTopologyContract(
  input: TopologyInputV1,
  segmentation: SegmentationEdgeSets,
  stationBlockDetails: StationBlockBuildResult,
): VisualTopologyContractV1 {
  const gpz: GpzVisual[] = input.sources.map((source): GpzVisual => ({
    id: `gpz_${source.id}`,
    kind: 'gpz',
    role: 'zrodlo_systemowe',
    domainElementId: source.id,
    topologyClass: 'rozdzielczy',
    ports: [p('wyjscie_sn', 'dol')],
    selectionElementId: source.id,
    inspectorElementId: source.id,
  })).sort((a, b) => a.id.localeCompare(b.id));

  const busbarsSn: BusbarSnVisual[] = input.connectionNodes
    .filter((node) => node.voltageKv !== null && node.voltageKv >= 6)
    .map((node): BusbarSnVisual => ({
      id: `szyna_sn_${node.id}`,
      kind: 'szyna_sn',
      role: 'szyna_rozdzielcza_sn',
      domainElementId: node.id,
      topologyClass: 'rozdzielczy',
      ports: [p('lewo', 'lewo'), p('prawo', 'prawo')],
      selectionElementId: node.id,
      inspectorElementId: node.id,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const fieldsSn: FieldSnVisual[] = stationBlockDetails.allFields
    .filter((field) => !field.fieldRole.includes('_NN'))
    .map((field): FieldSnVisual => ({
      id: `pole_sn_${field.id}`,
      kind: 'pole_sn',
      role: `pole_${field.fieldRole.toLowerCase()}`,
      domainElementId: field.id,
      stationId: field.stationId,
      fieldRole: field.fieldRole,
      topologyClass: 'rozdzielczy',
      ports: portsLinearVertical(),
      selectionElementId: field.stationId,
      inspectorElementId: field.stationId,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const trunkSegments: TrunkSegmentVisual[] = input.branches
    .filter((branch) => segmentation.trunkEdgeIds.has(branch.id) && isNetworkSegmentKind(branch.kind))
    .map((branch): TrunkSegmentVisual => ({
      id: `trunk_${branch.id}`,
      kind: 'segment_magistrali',
      role: 'tok_glowny_sn',
      domainElementId: branch.id,
      topologyClass: 'sieciowy_glowny',
      ports: portsLinearVertical(),
      selectionElementId: branch.id,
      inspectorElementId: branch.id,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const branchSegments: BranchSegmentVisual[] = input.branches
    .filter((branch) => segmentation.branchEdgeIds.has(branch.id) && isNetworkSegmentKind(branch.kind))
    .map((branch): BranchSegmentVisual => ({
      id: `branch_${branch.id}`,
      kind: 'segment_odgalezienia',
      role: 'odgalezienie_sn',
      domainElementId: branch.id,
      topologyClass: 'sieciowy_odgalezny',
      ports: [p('start', 'lewo'), p('end', 'dol')],
      selectionElementId: branch.id,
      inspectorElementId: branch.id,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const stationById = new Map(stationBlockDetails.stationBlocks.map((block) => [block.blockId, block] as const));
  const stations: StationVisual[] = input.stations
    .map((station): StationVisual => {
      const block = stationById.get(station.id);
      const embedding = block?.embeddingRole ?? EmbeddingRoleV1.TRUNK_LEAF;
      return {
        id: `stacja_${station.id}`,
        kind: 'stacja_sn_nn',
        role: `stacja_${mapStationRole(embedding)}`,
        stationRole: mapStationRole(embedding),
        domainElementId: station.id,
        topologyClass: 'stacyjny',
        ports: [
          p('wejscie_sn', 'gora'),
          ...(embedding === EmbeddingRoleV1.TRUNK_LEAF ? [] : [p('wyjscie_sn', 'dol')]),
          ...(embedding === EmbeddingRoleV1.TRUNK_BRANCH ? [p('port_odgalezienia', 'prawo')] : []),
        ],
        selectionElementId: station.id,
        inspectorElementId: station.id,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const ringIds = new Set((input.logicalViews?.rings ?? []).flatMap((ring) => ring.segmentIds));
  const secondaryBranches = input.branches
    .filter((branch) => segmentation.secondaryEdgeIds.has(branch.id) && isNetworkSegmentKind(branch.kind));
  const ringConnectors: RingConnectorVisual[] = secondaryBranches
    .map((branch): RingConnectorVisual => ({
      id: `ring_${branch.id}`,
      kind: 'lacze_pierscieniowe',
      role: ringIds.has(branch.id) ? 'lacze_wtorne_ring' : 'lacze_wtorne_rezerwowe',
      domainElementId: branch.id,
      topologyClass: 'sieciowy_wtorny',
      ports: [p('a', 'lewo'), p('b', 'prawo')],
      selectionElementId: branch.id,
      inspectorElementId: branch.id,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const nops: NopVisual[] = input.branches
    .filter((branch) => branch.isNormallyOpen && isNetworkSegmentKind(branch.kind))
    .map((branch): NopVisual => ({
      id: `nop_${branch.id}`,
      kind: 'punkt_normalnie_otwarty',
      role: 'nop_eksploatacyjny',
      segmentId: branch.id,
      domainElementId: branch.id,
      topologyClass: 'sieciowy_wtorny',
      ports: [p('a', 'lewo'), p('b', 'prawo')],
      selectionElementId: branch.id,
      inspectorElementId: branch.id,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const adjacency = new Map<string, { trunk: number; branch: number }>();
  for (const branch of input.branches) {
    if (!isNetworkSegmentKind(branch.kind)) continue;
    const entryFrom = adjacency.get(branch.fromNodeId) ?? { trunk: 0, branch: 0 };
    const entryTo = adjacency.get(branch.toNodeId) ?? { trunk: 0, branch: 0 };
    if (segmentation.trunkEdgeIds.has(branch.id)) {
      entryFrom.trunk += 1;
      entryTo.trunk += 1;
    }
    if (segmentation.branchEdgeIds.has(branch.id)) {
      entryFrom.branch += 1;
      entryTo.branch += 1;
    }
    adjacency.set(branch.fromNodeId, entryFrom);
    adjacency.set(branch.toNodeId, entryTo);
  }

  const branchJunctions: BranchJunctionVisual[] = [...adjacency.entries()]
    .filter(([, count]) => count.trunk >= 1 && count.branch >= 1)
    .map(([nodeId]): BranchJunctionVisual => ({
      id: `rozdziel_${nodeId}`,
      kind: 'punkt_rozgalezienia',
      role: 'wezlowy_rozdzial_sn',
      nodeId,
      domainElementId: nodeId,
      topologyClass: 'sieciowy_odgalezny',
      ports: [p('in', 'gora'), p('trunk_out', 'dol'), p('branch_out', 'prawo')],
      selectionElementId: nodeId,
      inspectorElementId: nodeId,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return { gpz, busbarsSn, fieldsSn, trunkSegments, branchSegments, branchJunctions, stations, ringConnectors, nops };
}
