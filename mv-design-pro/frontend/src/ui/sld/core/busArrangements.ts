/**
 * Bus Arrangement Configurations V1 — Canonical MV bus layouts.
 *
 * Defines standard bus arrangements for MV distribution stations
 * per Polish/IEC standards (PN-EN, IEC 62271).
 *
 * INVARIANTS:
 * - NO physics calculations
 * - Deterministic (no randomness)
 * - Immutable interfaces (readonly)
 * - Polish labels with English translations
 */

import type { EmbeddingRoleV1 } from './fieldDeviceContracts';

// =============================================================================
// BUS ARRANGEMENT TYPE
// =============================================================================

export const BusArrangementTypeV1 = {
  /** Pojedyncza szyna zbiorcza / Single busbar */
  SINGLE_BUS: 'SINGLE_BUS',
  /** Szyna z sekcjonowaniem / Single busbar with sectional coupler */
  SINGLE_BUS_SECTIONAL: 'SINGLE_BUS_SECTIONAL',
  /** Podwojna szyna zbiorcza / Double busbar */
  DOUBLE_BUS: 'DOUBLE_BUS',
  /** Uklad H / H-arrangement */
  H_SCHEME: 'H_SCHEME',
  /** Szyna pierscieniowa / Ring bus */
  RING_BUS: 'RING_BUS',
} as const;

export type BusArrangementTypeV1 =
  (typeof BusArrangementTypeV1)[keyof typeof BusArrangementTypeV1];

// =============================================================================
// BUS ARRANGEMENT CONFIG
// =============================================================================

export interface BusArrangementConfigV1 {
  readonly arrangementType: BusArrangementTypeV1;
  readonly labelPl: string;
  readonly labelEn: string;
  readonly busSectionCount: number;
  readonly requiresCoupler: boolean;
  readonly requiresBusTie: boolean;
  readonly minFields: number;
  readonly maxFieldsPerSection: number;
  readonly applicableEmbeddingRoles: readonly string[];
  readonly description: string;
}

// =============================================================================
// BUS ARRANGEMENT GEOMETRY
// =============================================================================

export interface BusSectionGeometryV1 {
  readonly sectionIndex: number;
  readonly relativeY: number;
  readonly relativeWidth: number;
}

export interface CouplerPositionV1 {
  readonly relativeCenterX: number;
  readonly relativeTopY: number;
  readonly relativeBottomY: number;
}

export interface FieldSlotV1 {
  readonly sectionIndex: number;
  readonly slotIndex: number;
  readonly relativeX: number;
}

export interface BusArrangementGeometryV1 {
  readonly arrangementType: BusArrangementTypeV1;
  readonly busSections: readonly BusSectionGeometryV1[];
  readonly couplerPosition: CouplerPositionV1 | null;
  readonly fieldSlots: readonly FieldSlotV1[];
  readonly feedDirection: 'TOP_TO_BOTTOM' | 'LEFT_TO_RIGHT';
}

// =============================================================================
// CANONICAL CONFIGS
// =============================================================================

export const BUS_ARRANGEMENT_CONFIGS: Record<BusArrangementTypeV1, BusArrangementConfigV1> = {
  [BusArrangementTypeV1.SINGLE_BUS]: {
    arrangementType: BusArrangementTypeV1.SINGLE_BUS,
    labelPl: 'Pojedyncza szyna zbiorcza',
    labelEn: 'Single Busbar',
    busSectionCount: 1,
    requiresCoupler: false,
    requiresBusTie: false,
    minFields: 1,
    maxFieldsPerSection: 8,
    applicableEmbeddingRoles: ['TRUNK_LEAF', 'TRUNK_INLINE', 'TRUNK_BRANCH'],
    description:
      'Najprostsza konfiguracja. Jedna szyna zbiorcza bez sekcjonowania. ' +
      'Stosowana w stacjach typu A i B (koncowe i przelotowe).',
  },
  [BusArrangementTypeV1.SINGLE_BUS_SECTIONAL]: {
    arrangementType: BusArrangementTypeV1.SINGLE_BUS_SECTIONAL,
    labelPl: 'Szyna z sekcjonowaniem',
    labelEn: 'Single Busbar Sectional',
    busSectionCount: 2,
    requiresCoupler: true,
    requiresBusTie: false,
    minFields: 2,
    maxFieldsPerSection: 6,
    applicableEmbeddingRoles: ['LOCAL_SECTIONAL'],
    description:
      'Szyna zbiorcza podzielona na 2 sekcje polaczone sprzeglem sekcyjnym. ' +
      'Stosowana w stacjach typu D z wymaganiem ciaglosci zasilania.',
  },
  [BusArrangementTypeV1.DOUBLE_BUS]: {
    arrangementType: BusArrangementTypeV1.DOUBLE_BUS,
    labelPl: 'Podwojna szyna zbiorcza',
    labelEn: 'Double Busbar',
    busSectionCount: 2,
    requiresCoupler: false,
    requiresBusTie: true,
    minFields: 4,
    maxFieldsPerSection: 8,
    applicableEmbeddingRoles: ['LOCAL_SECTIONAL'],
    description:
      'Dwie niezalezne szyny zbiorcze z lacznikiem szyn. ' +
      'Stosowana w duzych stacjach rozdzielczych (GPZ) z mozliwoscia ' +
      'pracy na jednej szynie przy rewizji drugiej.',
  },
  [BusArrangementTypeV1.H_SCHEME]: {
    arrangementType: BusArrangementTypeV1.H_SCHEME,
    labelPl: 'Uklad H',
    labelEn: 'H-Scheme',
    busSectionCount: 2,
    requiresCoupler: true,
    requiresBusTie: true,
    minFields: 4,
    maxFieldsPerSection: 6,
    applicableEmbeddingRoles: ['LOCAL_SECTIONAL'],
    description:
      'Dwie szyny z dwoma sprzeglami tworzacymi uklad H. ' +
      'Najwyzsza niezawodnosc — stosowana w stacjach glownych (GPZ) ' +
      'z wymaganiem nieprzerwanej pracy.',
  },
  [BusArrangementTypeV1.RING_BUS]: {
    arrangementType: BusArrangementTypeV1.RING_BUS,
    labelPl: 'Szyna pierscieniowa',
    labelEn: 'Ring Bus',
    busSectionCount: 4,
    requiresCoupler: false,
    requiresBusTie: false,
    minFields: 4,
    maxFieldsPerSection: 2,
    applicableEmbeddingRoles: ['LOCAL_SECTIONAL'],
    description:
      'Szyna zbiorcza zamknieta w pierscien z 4+ polami. ' +
      'Rzadko stosowana w sieciach SN — typowa dla stacji przesylowych WN/NN.',
  },
} as const;

// =============================================================================
// POLISH LABELS
// =============================================================================

export const BUS_ARRANGEMENT_LABELS_PL: Record<BusArrangementTypeV1, string> = {
  [BusArrangementTypeV1.SINGLE_BUS]: 'Pojedyncza szyna zbiorcza',
  [BusArrangementTypeV1.SINGLE_BUS_SECTIONAL]: 'Szyna z sekcjonowaniem',
  [BusArrangementTypeV1.DOUBLE_BUS]: 'Podwojna szyna zbiorcza',
  [BusArrangementTypeV1.H_SCHEME]: 'Uklad H',
  [BusArrangementTypeV1.RING_BUS]: 'Szyna pierscieniowa',
};

// =============================================================================
// ACCESSOR
// =============================================================================

/**
 * Get bus arrangement config by type.
 */
export function getBusArrangementConfig(
  arrangementType: BusArrangementTypeV1,
): BusArrangementConfigV1 {
  return BUS_ARRANGEMENT_CONFIGS[arrangementType];
}

// =============================================================================
// GEOMETRY COMPUTATION
// =============================================================================

/**
 * Compute deterministic geometry template for a bus arrangement.
 *
 * @param arrangementType - Bus arrangement type
 * @param fieldCount - Number of fields to allocate
 * @returns Geometry template with relative positions
 */
export function getBusArrangementGeometry(
  arrangementType: BusArrangementTypeV1,
  fieldCount: number,
): BusArrangementGeometryV1 {
  const config = BUS_ARRANGEMENT_CONFIGS[arrangementType];
  const effectiveFieldCount = Math.max(fieldCount, config.minFields);

  switch (arrangementType) {
    case BusArrangementTypeV1.SINGLE_BUS: {
      const slots: FieldSlotV1[] = [];
      for (let i = 0; i < effectiveFieldCount; i++) {
        slots.push({
          sectionIndex: 0,
          slotIndex: i,
          relativeX: (i + 0.5) / effectiveFieldCount,
        });
      }
      return {
        arrangementType,
        busSections: [{ sectionIndex: 0, relativeY: 0, relativeWidth: 1.0 }],
        couplerPosition: null,
        fieldSlots: slots,
        feedDirection: 'TOP_TO_BOTTOM',
      };
    }

    case BusArrangementTypeV1.SINGLE_BUS_SECTIONAL: {
      const fieldsPerSection = Math.ceil(effectiveFieldCount / 2);
      const slots: FieldSlotV1[] = [];
      for (let s = 0; s < 2; s++) {
        for (let i = 0; i < fieldsPerSection; i++) {
          slots.push({
            sectionIndex: s,
            slotIndex: i,
            relativeX: (s * 0.5) + (i + 0.5) / (fieldsPerSection * 2),
          });
        }
      }
      return {
        arrangementType,
        busSections: [
          { sectionIndex: 0, relativeY: 0, relativeWidth: 0.48 },
          { sectionIndex: 1, relativeY: 0, relativeWidth: 0.48 },
        ],
        couplerPosition: { relativeCenterX: 0.5, relativeTopY: -0.05, relativeBottomY: 0.05 },
        fieldSlots: slots,
        feedDirection: 'TOP_TO_BOTTOM',
      };
    }

    case BusArrangementTypeV1.DOUBLE_BUS: {
      const slots: FieldSlotV1[] = [];
      for (let i = 0; i < effectiveFieldCount; i++) {
        slots.push({
          sectionIndex: i % 2,
          slotIndex: Math.floor(i / 2),
          relativeX: (i + 0.5) / effectiveFieldCount,
        });
      }
      return {
        arrangementType,
        busSections: [
          { sectionIndex: 0, relativeY: 0, relativeWidth: 1.0 },
          { sectionIndex: 1, relativeY: 0.3, relativeWidth: 1.0 },
        ],
        couplerPosition: { relativeCenterX: 0.95, relativeTopY: 0, relativeBottomY: 0.3 },
        fieldSlots: slots,
        feedDirection: 'TOP_TO_BOTTOM',
      };
    }

    case BusArrangementTypeV1.H_SCHEME: {
      const slots: FieldSlotV1[] = [];
      for (let i = 0; i < effectiveFieldCount; i++) {
        slots.push({
          sectionIndex: i % 2,
          slotIndex: Math.floor(i / 2),
          relativeX: (i + 0.5) / effectiveFieldCount,
        });
      }
      return {
        arrangementType,
        busSections: [
          { sectionIndex: 0, relativeY: 0, relativeWidth: 1.0 },
          { sectionIndex: 1, relativeY: 0.3, relativeWidth: 1.0 },
        ],
        couplerPosition: { relativeCenterX: 0.33, relativeTopY: 0, relativeBottomY: 0.3 },
        fieldSlots: slots,
        feedDirection: 'TOP_TO_BOTTOM',
      };
    }

    case BusArrangementTypeV1.RING_BUS: {
      const segmentCount = Math.max(effectiveFieldCount, 4);
      const busSections: BusSectionGeometryV1[] = [];
      const slots: FieldSlotV1[] = [];

      for (let i = 0; i < segmentCount; i++) {
        busSections.push({
          sectionIndex: i,
          relativeY: i < segmentCount / 2 ? 0 : 0.4,
          relativeWidth: 1.0 / (segmentCount / 2),
        });
        slots.push({
          sectionIndex: i,
          slotIndex: 0,
          relativeX: (i % (segmentCount / 2) + 0.5) / (segmentCount / 2),
        });
      }

      return {
        arrangementType,
        busSections,
        couplerPosition: null,
        fieldSlots: slots,
        feedDirection: 'TOP_TO_BOTTOM',
      };
    }
  }
}

// =============================================================================
// AUTOMATIC SELECTION
// =============================================================================

/**
 * Deterministically select bus arrangement based on station topology.
 *
 * @param embeddingRole - Station embedding role from trunk segmentation
 * @param fieldCount - Number of fields in station
 * @param hasCoupler - Whether station has a sectional coupler
 * @returns Selected bus arrangement type
 */
export function selectBusArrangement(
  embeddingRole: EmbeddingRoleV1,
  fieldCount: number,
  hasCoupler: boolean,
): BusArrangementTypeV1 {
  switch (embeddingRole) {
    case 'TRUNK_LEAF':
    case 'TRUNK_INLINE':
      return BusArrangementTypeV1.SINGLE_BUS;

    case 'TRUNK_BRANCH':
      return BusArrangementTypeV1.SINGLE_BUS;

    case 'LOCAL_SECTIONAL':
      if (hasCoupler && fieldCount >= 4) {
        return BusArrangementTypeV1.H_SCHEME;
      }
      if (hasCoupler) {
        return BusArrangementTypeV1.SINGLE_BUS_SECTIONAL;
      }
      if (fieldCount >= 4) {
        return BusArrangementTypeV1.DOUBLE_BUS;
      }
      return BusArrangementTypeV1.SINGLE_BUS_SECTIONAL;

    default:
      return BusArrangementTypeV1.SINGLE_BUS;
  }
}
