/**
 * Station Block Builder — buduje StationBlockDetailV1 z TopologyInput + segmentacji.
 *
 * RUN #3D: Formalny trunk↔station embedding binding.
 *
 * DETERMINIZM:
 * - EmbeddingRole wynika deterministycznie z trunk segmentacji.
 * - Pola i urzadzenia sortowane po id.
 * - Brak auto-uzupelnien: brak danych → FixAction.
 * - Brak fabrykowania urzadzen/funkcji ochronnych.
 *
 * ALGORYTM EMBEDDING ROLE:
 *   Dla kazdej stacji S:
 *   1. incidentActiveEdges = edges touching any ConnectionNode in S
 *   2. incidentTrunkEdges = incidentActiveEdges ∩ TrunkEdges
 *   3. incidentBranchEdges = incidentActiveEdges ∩ BranchEdges
 *   4. Reguły:
 *      - LOCAL_SECTIONAL: busSections >= 2 OR coupler present
 *      - TRUNK_INLINE: trunkEdges == 2, branchEdges == 0
 *      - TRUNK_LEAF: trunkEdges == 1, branchEdges == 0
 *      - TRUNK_BRANCH: trunkEdges >= 1, branchEdges >= 1
 *      - else: FixAction "station.embedding_role_undetermined"
 */

import {
  type FieldV1,
  type DeviceV1,
  type BusSectionV1,
  type StationBlockDetailV1,
  type StationBlockPortsV1,
  type DeviceAnchorV1,
  type FieldDeviceFixActionV1,
  type CatalogRefDetailV1,
  type FieldTerminalsV1,
  FieldRoleV1,
  EmbeddingRoleV1,
  DeviceTypeV1,
  DeviceElectricalRoleV1,
  DevicePowerPathPositionV1,
  CatalogCategoryV1,
  FieldDeviceFixCodes,
  DEVICE_REQUIREMENT_SETS,
  validateFieldDevices,
  validateStationBlock,
} from './fieldDeviceContracts';

import type {
  TopologyInputV1,
  TopologyBranchV1,
  TopologyDeviceV1,
  TopologyStationV1,
  TopologyProtectionV1,
} from './topologyInputReader';
import { BranchKind, DeviceKind, GeneratorKind } from './topologyInputReader';

// =============================================================================
// SEGMENTATION EDGE SETS (from topologyAdapterV2)
// =============================================================================

export interface SegmentationEdgeSets {
  readonly trunkEdgeIds: ReadonlySet<string>;
  readonly branchEdgeIds: ReadonlySet<string>;
  readonly secondaryEdgeIds: ReadonlySet<string>;
}

// =============================================================================
// BUILDER RESULT
// =============================================================================

export interface StationBlockBuildResult {
  readonly stationBlocks: readonly StationBlockDetailV1[];
  readonly allFields: readonly FieldV1[];
  readonly allDevices: readonly DeviceV1[];
  readonly fixActions: readonly FieldDeviceFixActionV1[];
}

// =============================================================================
// EMBEDDING ROLE DERIVATION
// =============================================================================

/**
 * Wyznacza EmbeddingRole deterministycznie z trunk segmentacji.
 *
 * §5 spec: formalna relacja trunk segmentation ↔ station embedding.
 */
export function deriveEmbeddingRole(
  station: TopologyStationV1,
  stationBusIds: ReadonlySet<string>,
  branches: readonly TopologyBranchV1[],
  segmentation: SegmentationEdgeSets,
  fixActions: FieldDeviceFixActionV1[],
): EmbeddingRoleV1 {
  // Oblicz incident edges (krawedzie dotykajace szyn stacji)
  // Wyklucz TR_LINK i BUS_LINK — to polaczenia wewnetrzne stacji, nie trunk/branch.
  const incidentBranches = branches.filter(b =>
    (stationBusIds.has(b.fromNodeId) || stationBusIds.has(b.toNodeId)) &&
    b.fromNodeId !== b.toNodeId &&
    b.inService &&
    b.kind !== BranchKind.TR_LINK &&
    b.kind !== BranchKind.BUS_LINK,
  );

  const incidentTrunkEdges = incidentBranches.filter(b => segmentation.trunkEdgeIds.has(b.id));
  const incidentBranchEdges = incidentBranches.filter(b => segmentation.branchEdgeIds.has(b.id));
  const trunkCount = incidentTrunkEdges.length;
  const branchCount = incidentBranchEdges.length;

  // Reguła 1: LOCAL_SECTIONAL — 2+ busSections lub jawny coupler
  if (station.busIds.length >= 2) {
    return EmbeddingRoleV1.LOCAL_SECTIONAL;
  }

  // Szukaj coupler device
  const hasCouplerDevice = branches.some(b =>
    b.kind === BranchKind.BUS_LINK &&
    stationBusIds.has(b.fromNodeId) &&
    stationBusIds.has(b.toNodeId),
  );
  if (hasCouplerDevice) {
    return EmbeddingRoleV1.LOCAL_SECTIONAL;
  }

  // Reguła 2: TRUNK_INLINE — 2 trunk edges, 0 branch edges
  if (trunkCount === 2 && branchCount === 0) {
    return EmbeddingRoleV1.TRUNK_INLINE;
  }

  // Reguła 3: TRUNK_LEAF — 1 trunk edge, 0 branch edges
  if (trunkCount === 1 && branchCount === 0) {
    return EmbeddingRoleV1.TRUNK_LEAF;
  }

  // Reguła 4: TRUNK_BRANCH — trunk >= 1, branch >= 1
  if (trunkCount >= 1 && branchCount >= 1) {
    return EmbeddingRoleV1.TRUNK_BRANCH;
  }

  // Fallback: brak trunk = TRUNK_LEAF z FixAction
  if (trunkCount === 0 && branchCount === 0) {
    fixActions.push({
      code: FieldDeviceFixCodes.STATION_EMBEDDING_UNDETERMINED,
      message: `Stacja ${station.id} (${station.name}): brak krawedzi trunk i branch — nie mozna wyznaczyc roli`,
      elementId: station.id,
      fixHint: 'Sprawdz polaczenia stacji z magistrala.',
    });
    return EmbeddingRoleV1.TRUNK_LEAF;
  }

  // Fallback: 0 trunk edges but has branch edges = TRUNK_BRANCH
  if (trunkCount === 0 && branchCount >= 1) {
    return EmbeddingRoleV1.TRUNK_BRANCH;
  }

  // Safety fallback
  fixActions.push({
    code: FieldDeviceFixCodes.STATION_EMBEDDING_UNDETERMINED,
    message: `Stacja ${station.id}: nieoczekiwana kombinacja trunk=${trunkCount}, branch=${branchCount}`,
    elementId: station.id,
    fixHint: 'Sprawdz topologie stacji.',
  });
  return EmbeddingRoleV1.TRUNK_LEAF;
}

// =============================================================================
// FIELD BUILDER
// =============================================================================

/**
 * Buduje pola dla stacji na podstawie topologii i urzadzen z domeny.
 *
 * ZAKAZ: adapter nie generuje urzadzen i nie generuje funkcji ochronnych.
 * Pole jest tworzone TYLKO jesli domena wskazuje jego istnienie.
 */
function buildFieldsForStation(
  station: TopologyStationV1,
  stationBusIds: ReadonlySet<string>,
  embeddingRole: EmbeddingRoleV1,
  input: TopologyInputV1,
  fixActions: FieldDeviceFixActionV1[],
): { fields: FieldV1[]; devices: DeviceV1[] } {
  const fields: FieldV1[] = [];
  const devices: DeviceV1[] = [];

  // Pierwsza sekcja szyny jako domyslna
  const primaryBusSectionId = station.busIds.length > 0 ? station.busIds[0] : station.id;

  // Zbierz galezi przyłączone do stacji (wejściowe/wyjściowe)
  const incidentBranches = input.branches.filter(b =>
    (stationBusIds.has(b.fromNodeId) || stationBusIds.has(b.toNodeId)) &&
    b.fromNodeId !== b.toNodeId &&
    b.inService,
  );

  // Zbierz urzadzenia nalezace do stacji (nodeId w stationBusIds)
  const stationDevices = input.devices.filter(d => stationBusIds.has(d.nodeId));

  // Zbierz generatory przylaczone do stacji
  const stationGenerators = input.generators.filter(g => stationBusIds.has(g.nodeId));

  // Zbierz protection bindings — mapuj breakerRef → binding
  const protectionByBreaker = new Map<string, TopologyProtectionV1>();
  for (const pb of input.protectionBindings) {
    protectionByBreaker.set(pb.breakerRef, pb);
  }

  let fieldIndex = 0;

  // --- Pola liniowe z galezi ---
  const lineBranches = incidentBranches
    .filter(b => b.kind === BranchKind.LINE || b.kind === BranchKind.CABLE)
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const branch of lineBranches) {
    const isIncoming = stationBusIds.has(branch.toNodeId);
    const externalNodeId = stationBusIds.has(branch.fromNodeId) ? branch.toNodeId : branch.fromNodeId;

    // Wyznacz role pola na podstawie embeddingRole i pozycji galezi
    let fieldRole: FieldRoleV1;
    if (embeddingRole === EmbeddingRoleV1.TRUNK_LEAF) {
      fieldRole = FieldRoleV1.LINE_IN;
    } else if (embeddingRole === EmbeddingRoleV1.TRUNK_INLINE) {
      fieldRole = isIncoming ? FieldRoleV1.LINE_IN : FieldRoleV1.LINE_OUT;
    } else if (embeddingRole === EmbeddingRoleV1.TRUNK_BRANCH) {
      fieldRole = fieldIndex === 0 ? FieldRoleV1.LINE_IN : FieldRoleV1.LINE_BRANCH;
    } else {
      fieldRole = fieldIndex === 0 ? FieldRoleV1.LINE_IN : FieldRoleV1.LINE_OUT;
    }

    const fieldId = `field_${station.id}_${fieldRole}_${fieldIndex}`;

    const terminals: FieldTerminalsV1 = {
      incomingNodeId: isIncoming ? externalNodeId : null,
      outgoingNodeId: !isIncoming ? externalNodeId : null,
      branchNodeId: fieldRole === FieldRoleV1.LINE_BRANCH ? externalNodeId : null,
      generatorNodeId: null,
    };

    // Zbierz urzadzenia dla tego pola na podstawie galezi
    const fieldDeviceIds: string[] = [];
    const branchDevices = stationDevices
      .filter(d => d.nodeId === branch.fromNodeId || d.nodeId === branch.toNodeId)
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const dev of branchDevices) {
      const device = buildDeviceFromDomain(dev, fieldId, protectionByBreaker, fixActions);
      devices.push(device);
      fieldDeviceIds.push(device.id);
    }

    // Jesli brak CB — nie dodawaj, emituj FixAction w walidacji
    const requirements = DEVICE_REQUIREMENT_SETS[fieldRole];

    fields.push({
      id: fieldId,
      stationId: station.id,
      busSectionId: primaryBusSectionId,
      fieldRole,
      terminals,
      requiredDevices: requirements,
      deviceIds: fieldDeviceIds.sort(),
      catalogRef: null,
    });

    fieldIndex++;
  }

  // --- Pola transformatorowe ---
  const trBranches = incidentBranches
    .filter(b => b.kind === BranchKind.TR_LINK)
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const trBranch of trBranches) {
    const fieldId = `field_${station.id}_tr_${fieldIndex}`;
    const fieldRole = FieldRoleV1.TRANSFORMER_SN_NN;

    const externalNodeId = stationBusIds.has(trBranch.fromNodeId)
      ? trBranch.toNodeId : trBranch.fromNodeId;

    const terminals: FieldTerminalsV1 = {
      incomingNodeId: null,
      outgoingNodeId: externalNodeId,
      branchNodeId: null,
      generatorNodeId: null,
    };

    const fieldDeviceIds: string[] = [];
    const requirements = DEVICE_REQUIREMENT_SETS[fieldRole];

    fields.push({
      id: fieldId,
      stationId: station.id,
      busSectionId: primaryBusSectionId,
      fieldRole,
      terminals,
      requiredDevices: requirements,
      deviceIds: fieldDeviceIds.sort(),
      catalogRef: null,
    });

    fieldIndex++;
  }

  // --- Pola OZE (PV/BESS) ---
  for (const gen of stationGenerators.sort((a, b) => a.id.localeCompare(b.id))) {
    let fieldRole: FieldRoleV1;
    let deviceType: DeviceTypeV1;

    if (gen.kind === GeneratorKind.PV) {
      fieldRole = FieldRoleV1.PV_SN;
      deviceType = DeviceTypeV1.GENERATOR_PV;
    } else if (gen.kind === GeneratorKind.BESS) {
      fieldRole = FieldRoleV1.BESS_SN;
      deviceType = DeviceTypeV1.GENERATOR_BESS;
    } else {
      continue; // WIND/SYNCHRONOUS handled differently
    }

    const fieldId = `field_${station.id}_oze_${fieldIndex}`;

    const terminals: FieldTerminalsV1 = {
      incomingNodeId: null,
      outgoingNodeId: null,
      branchNodeId: null,
      generatorNodeId: gen.nodeId,
    };

    const fieldDeviceIds: string[] = [];
    const genDeviceId = `device_${gen.id}_gen`;

    // Dodaj device generatora (ze snapshot, nie fabrykowane)
    devices.push({
      id: genDeviceId,
      fieldId,
      deviceType,
      electricalRole: DeviceElectricalRoleV1.POWER_PATH,
      powerPathPosition: DevicePowerPathPositionV1.DOWNSTREAM,
      catalogRef: gen.catalogRef ? {
        elementId: gen.id,
        category: CatalogCategoryV1.GENERATOR,
        catalogId: gen.catalogRef,
        catalogVersion: null,
        manufacturer: null,
        name: gen.name,
        ratings: { breakingCapacityKa: null, ratedCurrentA: null, ratedPowerMva: gen.ratedPowerMw ? gen.ratedPowerMw / 1000 : null, ratedVoltageKv: null, ctRatio: null },
      } : null,
      logicalBindings: { boundCbId: null, ctInputIds: [] },
      parameters: { ctRatio: null, breakingCapacityKa: null, ratedCurrentA: null, relaySettings: null, ratedPowerMva: gen.ratedPowerMw ? gen.ratedPowerMw / 1000 : null, ukPercent: null, vectorGroup: null },
    });
    fieldDeviceIds.push(genDeviceId);

    // Sprawdz TR blokowy
    if (gen.blockingTransformerId) {
      // TR blokowy istnieje w domenie — NIE fabrykuj, ale zarejestruj
    } else {
      // Brak TR blokowego — FixAction jesli wymagany
      fixActions.push({
        code: FieldDeviceFixCodes.GENERATOR_BLOCK_TR_MISSING,
        message: `Generator ${gen.id} (${gen.name}): brak transformatora blokowego`,
        elementId: gen.id,
        fixHint: `Dodaj transformator blokowy dla generatora ${gen.name}`,
      });
    }

    const requirements = DEVICE_REQUIREMENT_SETS[fieldRole];

    fields.push({
      id: fieldId,
      stationId: station.id,
      busSectionId: primaryBusSectionId,
      fieldRole,
      terminals,
      requiredDevices: requirements,
      deviceIds: fieldDeviceIds.sort(),
      catalogRef: null,
    });

    fieldIndex++;
  }

  // --- Pole sprzegla (COUPLER_SN) ---
  if (embeddingRole === EmbeddingRoleV1.LOCAL_SECTIONAL && station.busIds.length >= 2) {
    const couplerBranches = incidentBranches.filter(b =>
      b.kind === BranchKind.BUS_LINK &&
      stationBusIds.has(b.fromNodeId) &&
      stationBusIds.has(b.toNodeId),
    ).sort((a, b) => a.id.localeCompare(b.id));

    for (const cb of couplerBranches) {
      const fieldId = `field_${station.id}_coupler_${fieldIndex}`;
      const requirements = DEVICE_REQUIREMENT_SETS[FieldRoleV1.COUPLER_SN];

      fields.push({
        id: fieldId,
        stationId: station.id,
        busSectionId: station.busIds[0],
        fieldRole: FieldRoleV1.COUPLER_SN,
        terminals: {
          incomingNodeId: cb.fromNodeId,
          outgoingNodeId: cb.toNodeId,
          branchNodeId: null,
          generatorNodeId: null,
        },
        requiredDevices: requirements,
        deviceIds: [],
        catalogRef: null,
      });

      fieldIndex++;
    }
  }

  return { fields, devices };
}

// =============================================================================
// DEVICE BUILDER (from domain — NEVER fabricated)
// =============================================================================

function buildDeviceFromDomain(
  domainDevice: TopologyDeviceV1,
  fieldId: string,
  protectionByBreaker: ReadonlyMap<string, TopologyProtectionV1>,
  fixActions: FieldDeviceFixActionV1[],
): DeviceV1 {
  const deviceType = mapDeviceKindToType(domainDevice.kind);
  const electricalRole = mapDeviceToElectricalRole(deviceType);
  const powerPathPosition = mapDeviceToPowerPathPosition(deviceType);

  // Relay binding — lookup by breaker ref
  let boundCbId: string | null = null;
  let ctInputIds: string[] = [];

  if (deviceType === DeviceTypeV1.CB) {
    // CB: check if there is a protection binding for this breaker
    const binding = protectionByBreaker.get(domainDevice.id);
    if (binding) {
      boundCbId = domainDevice.id;
      ctInputIds = binding.ctRef ? [binding.ctRef] : [];
    }
  } else if (deviceType === DeviceTypeV1.RELAY) {
    // Relay: find the protection binding that references this relay
    // Protection bindings are keyed by breaker — find binding where relay is assigned
    let foundBinding = false;
    for (const [breakerId, binding] of [...protectionByBreaker.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      // The relay device maps to the protection binding via its breaker
      if (binding.breakerRef === domainDevice.nodeId || breakerId === domainDevice.nodeId) {
        boundCbId = breakerId;
        ctInputIds = binding.ctRef ? [binding.ctRef] : [];
        foundBinding = true;
        break;
      }
    }
    if (!foundBinding) {
      fixActions.push({
        code: FieldDeviceFixCodes.PROTECTION_RELAY_BINDING_MISSING,
        message: `Relay ${domainDevice.id} (${domainDevice.name}): brak powiazania z protection`,
        elementId: domainDevice.id,
        fixHint: `Przypisz relay ${domainDevice.name} do ProtectionBinding`,
      });
    }
  }

  // Catalog ref
  const catalogRef: CatalogRefDetailV1 | null = domainDevice.catalogRef ? {
    elementId: domainDevice.id,
    category: CatalogCategoryV1.DEVICE,
    catalogId: domainDevice.catalogRef,
    catalogVersion: null,
    manufacturer: null,
    name: domainDevice.name,
    ratings: null,
  } : null;

  if (!catalogRef) {
    fixActions.push({
      code: FieldDeviceFixCodes.CATALOG_REF_MISSING,
      message: `Urzadzenie ${domainDevice.id} (${domainDevice.name}): brak referencji katalogowej`,
      elementId: domainDevice.id,
      fixHint: `Przypisz typ z katalogu do urzadzenia ${domainDevice.name}`,
    });
  }

  return {
    id: domainDevice.id,
    fieldId,
    deviceType,
    electricalRole,
    powerPathPosition,
    catalogRef,
    logicalBindings: { boundCbId, ctInputIds: ctInputIds.sort() },
    parameters: {
      ctRatio: null,
      breakingCapacityKa: null,
      ratedCurrentA: null,
      relaySettings: null,
      ratedPowerMva: null,
      ukPercent: null,
      vectorGroup: null,
    },
  };
}

function mapDeviceKindToType(kind: DeviceKind): DeviceTypeV1 {
  switch (kind) {
    case DeviceKind.CB: return DeviceTypeV1.CB;
    case DeviceKind.DS: return DeviceTypeV1.DS;
    case DeviceKind.ES: return DeviceTypeV1.ES;
    case DeviceKind.CT: return DeviceTypeV1.CT;
    case DeviceKind.VT: return DeviceTypeV1.VT;
    case DeviceKind.RELAY: return DeviceTypeV1.RELAY;
    case DeviceKind.LOAD_SWITCH: return DeviceTypeV1.LOAD_SWITCH;
    case DeviceKind.FUSE: return DeviceTypeV1.FUSE;
    default: return DeviceTypeV1.CB;
  }
}

function mapDeviceToElectricalRole(deviceType: DeviceTypeV1): DeviceElectricalRoleV1 {
  switch (deviceType) {
    case DeviceTypeV1.CB:
    case DeviceTypeV1.DS:
    case DeviceTypeV1.ES:
    case DeviceTypeV1.LOAD_SWITCH:
    case DeviceTypeV1.FUSE:
    case DeviceTypeV1.ACB:
    case DeviceTypeV1.CABLE_HEAD:
    case DeviceTypeV1.TRANSFORMER_DEVICE:
    case DeviceTypeV1.GENERATOR_PV:
    case DeviceTypeV1.GENERATOR_BESS:
    case DeviceTypeV1.PCS:
    case DeviceTypeV1.BATTERY:
      return DeviceElectricalRoleV1.POWER_PATH;
    case DeviceTypeV1.CT:
      return DeviceElectricalRoleV1.MEASUREMENT;
    case DeviceTypeV1.VT:
      return DeviceElectricalRoleV1.MEASUREMENT;
    case DeviceTypeV1.RELAY:
      return DeviceElectricalRoleV1.PROTECTION;
    default:
      return DeviceElectricalRoleV1.POWER_PATH;
  }
}

function mapDeviceToPowerPathPosition(deviceType: DeviceTypeV1): DevicePowerPathPositionV1 {
  switch (deviceType) {
    case DeviceTypeV1.DS:
    case DeviceTypeV1.ES:
      return DevicePowerPathPositionV1.UPSTREAM;
    case DeviceTypeV1.CB:
    case DeviceTypeV1.CT:
    case DeviceTypeV1.TRANSFORMER_DEVICE:
    case DeviceTypeV1.LOAD_SWITCH:
    case DeviceTypeV1.FUSE:
      return DevicePowerPathPositionV1.MIDSTREAM;
    case DeviceTypeV1.CABLE_HEAD:
    case DeviceTypeV1.ACB:
    case DeviceTypeV1.GENERATOR_PV:
    case DeviceTypeV1.GENERATOR_BESS:
    case DeviceTypeV1.PCS:
    case DeviceTypeV1.BATTERY:
      return DevicePowerPathPositionV1.DOWNSTREAM;
    case DeviceTypeV1.RELAY:
    case DeviceTypeV1.VT:
      return DevicePowerPathPositionV1.OFF_PATH;
    default:
      return DevicePowerPathPositionV1.MIDSTREAM;
  }
}

// =============================================================================
// MAIN BUILDER
// =============================================================================

/**
 * Buduje StationBlockDetailV1 dla wszystkich stacji z TopologyInput.
 *
 * GWARANCJE:
 * - EmbeddingRole deterministycznie z trunk segmentacji.
 * - Pola z domeny (nie fabrykowane).
 * - Urzadzenia z domeny (nie fabrykowane).
 * - Brak auto-uzupelnien — FixAction per brakujacy element.
 * - Deterministyczne sortowanie (id) na kazdym etapie.
 */
export function buildStationBlocks(
  input: TopologyInputV1,
  segmentation: SegmentationEdgeSets,
): StationBlockBuildResult {
  const fixActions: FieldDeviceFixActionV1[] = [];
  const stationBlocks: StationBlockDetailV1[] = [];
  const allFields: FieldV1[] = [];
  const allDevices: DeviceV1[] = [];

  for (const station of [...input.stations].sort((a, b) => a.id.localeCompare(b.id))) {
    const stationBusIds = new Set(station.busIds);

    // 1. Derive embedding role
    const embeddingRole = deriveEmbeddingRole(
      station, stationBusIds, input.branches, segmentation, fixActions,
    );

    // 2. Build bus sections
    const busSections: BusSectionV1[] = [...station.busIds]
      .sort()
      .map((busId: string, index: number) => ({
        id: busId,
        stationId: station.id,
        orderIndex: index,
        catalogRef: null,
      }));

    // 3. Build fields and devices
    const { fields, devices } = buildFieldsForStation(
      station, stationBusIds, embeddingRole, input, fixActions,
    );

    // 4. Validate fields/devices (per-field)
    for (const field of fields) {
      const hasRelay = devices.some(d => d.fieldId === field.id && d.deviceType === DeviceTypeV1.RELAY);
      const domainProtection = input.protectionBindings.length > 0;
      const fieldFixActions = validateFieldDevices(field, devices, hasRelay, domainProtection);
      fixActions.push(...fieldFixActions);
    }

    // 5. Build ports
    const ports: StationBlockPortsV1 = derivePortsFromEmbeddingRole(embeddingRole);

    // 6. Find coupler field
    const couplerField = fields.find(f => f.fieldRole === FieldRoleV1.COUPLER_SN);
    const couplerFieldId = couplerField?.id ?? null;

    // 7. Build device anchors (relative positions in block)
    const deviceAnchors = buildDeviceAnchors(fields, devices);

    // 8. Build station block detail
    const block: StationBlockDetailV1 = {
      blockId: station.id,
      embeddingRole,
      busSections,
      fields: fields.sort((a, b) => a.id.localeCompare(b.id)),
      devices: devices.sort((a, b) => a.id.localeCompare(b.id)),
      ports,
      couplerFieldId,
      deviceAnchors: deviceAnchors.sort((a, b) => a.deviceId.localeCompare(b.deviceId)),
      fixActions: [],
    };

    // 9. Validate station block
    const blockFixActions = validateStationBlock(block);
    fixActions.push(...blockFixActions);

    stationBlocks.push({
      ...block,
      fixActions: blockFixActions,
    });

    allFields.push(...fields);
    allDevices.push(...devices);
  }

  return {
    stationBlocks: stationBlocks.sort((a, b) => a.blockId.localeCompare(b.blockId)),
    allFields: allFields.sort((a, b) => a.id.localeCompare(b.id)),
    allDevices: allDevices.sort((a, b) => a.id.localeCompare(b.id)),
    fixActions: fixActions.sort((a, b) => (a.elementId ?? '').localeCompare(b.elementId ?? '')),
  };
}

// =============================================================================
// PORT DERIVATION
// =============================================================================

function derivePortsFromEmbeddingRole(embeddingRole: EmbeddingRoleV1): StationBlockPortsV1 {
  switch (embeddingRole) {
    case EmbeddingRoleV1.TRUNK_LEAF:
      return { trunkInPort: 'in', trunkOutPort: null, branchPort: null };
    case EmbeddingRoleV1.TRUNK_INLINE:
      return { trunkInPort: 'in', trunkOutPort: 'out', branchPort: null };
    case EmbeddingRoleV1.TRUNK_BRANCH:
      return { trunkInPort: 'in', trunkOutPort: null, branchPort: 'branch' };
    case EmbeddingRoleV1.LOCAL_SECTIONAL:
      return { trunkInPort: 'in', trunkOutPort: 'out', branchPort: null };
    default:
      return { trunkInPort: 'in', trunkOutPort: null, branchPort: null };
  }
}

// =============================================================================
// DEVICE ANCHOR BUILDER
// =============================================================================

/**
 * Buduje kotwice urzadzen (pozycje wzgledne w bloku).
 *
 * Siatka pola:
 * - Kolumny: pola (sort by id, then by fieldRole)
 * - Wiersze: urzadzenia (sort by powerPathPosition)
 */
function buildDeviceAnchors(
  fields: readonly FieldV1[],
  devices: readonly DeviceV1[],
): DeviceAnchorV1[] {
  const anchors: DeviceAnchorV1[] = [];
  const sortedFields = [...fields].sort((a, b) => a.id.localeCompare(b.id));

  const fieldCount = sortedFields.length || 1;
  const fieldWidth = 1 / fieldCount;

  for (let fi = 0; fi < sortedFields.length; fi++) {
    const field = sortedFields[fi];
    const fieldDevices = devices
      .filter(d => d.fieldId === field.id)
      .sort((a, b) => {
        // Sort by power path position first (UPSTREAM first, then MIDSTREAM, DOWNSTREAM, OFF_PATH)
        const posOrder: Record<string, number> = {
          [DevicePowerPathPositionV1.UPSTREAM]: 0,
          [DevicePowerPathPositionV1.MIDSTREAM]: 1,
          [DevicePowerPathPositionV1.DOWNSTREAM]: 2,
          [DevicePowerPathPositionV1.OFF_PATH]: 3,
        };
        const pa = posOrder[a.powerPathPosition] ?? 4;
        const pb = posOrder[b.powerPathPosition] ?? 4;
        if (pa !== pb) return pa - pb;
        return a.id.localeCompare(b.id);
      });

    const deviceCount = fieldDevices.length || 1;
    const deviceHeight = 1 / (deviceCount + 1); // +1 for header row (bus)

    for (let di = 0; di < fieldDevices.length; di++) {
      const device = fieldDevices[di];
      anchors.push({
        deviceId: device.id,
        fieldId: field.id,
        deviceType: device.deviceType,
        electricalRole: device.electricalRole,
        relativeX: fi * fieldWidth + fieldWidth / 2,
        relativeY: (di + 1) * deviceHeight,
        width: 30,
        height: 30,
      });
    }
  }

  return anchors;
}
