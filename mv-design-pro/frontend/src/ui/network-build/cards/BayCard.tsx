/**
 * BayCard — karta obiektu pola rozdzielczego SN.
 *
 * Wyświetla identyfikację pola, stację nadrzędną, rolę pola (IN/OUT/TR/COUPLER/FEEDER/OZE),
 * powiązaną szynę oraz urządzenia w polu (przez equipment_refs).
 * Akcje są kontekstowe względem roli pola.
 *
 * BINDING: 100% PL etykiety.
 */

import { useMemo, useCallback } from 'react';
import { ObjectCard, type CardSection, type CardAction } from './ObjectCard';
import { useSnapshotStore } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';

// =============================================================================
// Helpers
// =============================================================================

function bayRoleLabel(role: string): string {
  switch (role) {
    case 'IN':
      return 'Zasilające — wejście główne';
    case 'OUT':
      return 'Odgałęźne — wyjście linii';
    case 'TR':
      return 'Transformatorowe';
    case 'COUPLER':
      return 'Sprzęgło sekcji szyn';
    case 'FEEDER':
      return 'Zasilające odgałęźne';
    case 'MEASUREMENT':
      return 'Pomiarowe';
    case 'OZE':
      return 'OZE / źródło energii';
    default:
      return role;
  }
}

function equipmentTypeLabel(type: string): string {
  switch (type) {
    case 'switch':
      return 'Łącznik';
    case 'breaker':
      return 'Wyłącznik';
    case 'bus_coupler':
      return 'Sprzęgło';
    case 'disconnector':
      return 'Odłącznik';
    case 'fuse':
      return 'Bezpiecznik';
    case 'line_overhead':
      return 'Linia napowietrzna';
    case 'cable':
      return 'Kabel SN';
    default:
      return type;
  }
}

function statusDotFromReadiness(
  elementId: string,
  readiness: { blockers: Array<{ element_ref: string | null }> } | null,
): 'ok' | 'warning' | 'error' | 'none' {
  if (!readiness) return 'none';
  const hasBlocker = readiness.blockers.some((b) => b.element_ref === elementId);
  return hasBlocker ? 'error' : 'ok';
}

// =============================================================================
// Component
// =============================================================================

export function BayCard({ elementId }: { elementId: string }) {
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const readiness = useSnapshotStore((s) => s.readiness);
  const openOperationForm = useNetworkBuildStore((s) => s.openOperationForm);
  const closeObjectCard = useNetworkBuildStore((s) => s.closeObjectCard);

  const bay = useMemo(
    () => snapshot?.bays?.find((b) => b.id === elementId),
    [snapshot, elementId],
  );

  const parentStation = useMemo(
    () => snapshot?.substations?.find((s) => s.id === bay?.substation_ref),
    [snapshot, bay],
  );

  const bus = useMemo(
    () => snapshot?.buses?.find((b) => b.ref_id === bay?.bus_ref),
    [snapshot, bay],
  );

  // Resolve equipment refs to actual branches/elements
  const equipmentItems = useMemo(() => {
    if (!bay?.equipment_refs?.length || !snapshot) return [];
    return bay.equipment_refs.map((ref) => {
      const branch = snapshot.branches?.find((b) => b.ref_id === ref);
      if (branch) {
        return {
          ref,
          name: branch.name,
          type: equipmentTypeLabel(branch.type),
          status: branch.status,
        };
      }
      return { ref, name: ref, type: 'Nieznany', status: null };
    });
  }, [bay, snapshot]);

  // Protection assignment for this bay
  const protectionAssignment = useMemo(
    () =>
      bay?.protection_ref
        ? snapshot?.protection_assignments?.find((p) => p.id === bay.protection_ref)
        : null,
    [snapshot, bay],
  );

  const sections = useMemo((): CardSection[] => {
    if (!bay) return [];

    const identSection: CardSection = {
      id: 'ident',
      label: 'Identyfikacja',
      fields: [
        { key: 'id', label: 'ID', value: bay.id },
        { key: 'name', label: 'Nazwa', value: bay.name },
        { key: 'role', label: 'Rola pola', value: bayRoleLabel(bay.bay_role) },
      ],
    };

    const stationSection: CardSection = {
      id: 'station',
      label: 'Stacja nadrzędna',
      fields: [
        {
          key: 'station_id',
          label: 'ID stacji',
          value: bay.substation_ref,
        },
        {
          key: 'station_name',
          label: 'Nazwa stacji',
          value: parentStation?.name ?? '—',
          severity: !parentStation ? 'error' : undefined,
        },
        {
          key: 'station_type',
          label: 'Typ stacji',
          value: parentStation?.station_type ?? '—',
        },
      ],
    };

    const busSection: CardSection = {
      id: 'bus',
      label: 'Szyna',
      fields: [
        {
          key: 'bus_ref',
          label: 'ID szyny',
          value: bay.bus_ref,
        },
        {
          key: 'bus_name',
          label: 'Nazwa szyny',
          value: bus?.name ?? '—',
          severity: !bus ? 'error' : undefined,
        },
        {
          key: 'bus_voltage',
          label: 'Napięcie nominalne',
          value: bus?.voltage_kv ?? null,
          unit: 'kV',
        },
        {
          key: 'bus_grounding',
          label: 'Uziemienie szyny',
          value: bus?.grounding?.type ?? '—',
        },
      ],
    };

    const equipmentFields = equipmentItems.map((item) => ({
      key: `eq_${item.ref}`,
      label: item.name,
      value: item.status
        ? `${item.type} — ${item.status === 'closed' ? 'zamknięty' : 'otwarty'}`
        : item.type,
      severity: item.status === 'open' ? ('warning' as const) : undefined,
    }));

    const equipmentSection: CardSection = {
      id: 'equipment',
      label: 'Urządzenia w polu',
      fields:
        equipmentFields.length > 0
          ? equipmentFields
          : [
              {
                key: 'no_eq',
                label: 'Brak urządzeń',
                value: 'Pole bez przypisanych urządzeń',
                severity: 'warning' as const,
              },
            ],
    };

    const sections: CardSection[] = [identSection, stationSection, busSection, equipmentSection];

    // Protection — only if protection_ref is set
    if (bay.protection_ref) {
      const protSection: CardSection = {
        id: 'protection',
        label: 'Zabezpieczenie',
        fields: [
          {
            key: 'prot_ref',
            label: 'ID zabezpieczenia',
            value: bay.protection_ref,
          },
          {
            key: 'prot_device',
            label: 'Typ urządzenia',
            value: protectionAssignment?.device_type ?? '—',
          },
          {
            key: 'prot_enabled',
            label: 'Status',
            value: protectionAssignment?.is_enabled ? 'Aktywne' : 'Nieaktywne',
            severity: protectionAssignment?.is_enabled ? 'ok' : 'warning',
          },
        ],
      };
      sections.push(protSection);
    }

    return sections;
  }, [bay, parentStation, bus, equipmentItems, protectionAssignment]);

  const handleAssignCatalog = useCallback(() => {
    openOperationForm('assign_catalog_to_element', {
      element_ref: elementId,
      element_type: 'bay',
    });
  }, [openOperationForm, elementId]);

  const handleContinueTrunk = useCallback(() => {
    openOperationForm('continue_trunk_segment_sn', {
      from_bus_ref: bay?.bus_ref,
    });
  }, [openOperationForm, bay]);

  const handleStartBranch = useCallback(() => {
    openOperationForm('start_branch_segment_sn', {
      from_bus_ref: bay?.bus_ref,
    });
  }, [openOperationForm, bay]);

  const handleAddTransformer = useCallback(() => {
    openOperationForm('add_transformer_sn_nn', {
      station_ref: bay?.substation_ref,
      bay_ref: elementId,
    });
  }, [openOperationForm, bay, elementId]);

  const handleAddPV = useCallback(() => {
    openOperationForm('add_pv_inverter_nn', {
      station_ref: bay?.substation_ref,
    });
  }, [openOperationForm, bay]);

  const handleAddBESS = useCallback(() => {
    openOperationForm('add_bess_inverter_nn', {
      station_ref: bay?.substation_ref,
    });
  }, [openOperationForm, bay]);

  const actions = useMemo((): CardAction[] => {
    if (!bay) return [];

    switch (bay.bay_role) {
      case 'IN':
        return [
          {
            id: 'continue_trunk',
            label: 'Kontynuuj magistralę',
            variant: 'primary',
            onClick: handleContinueTrunk,
          },
        ];
      case 'OUT':
      case 'FEEDER':
        return [
          {
            id: 'start_branch',
            label: 'Rozpocznij odgałęzienie',
            variant: 'primary',
            onClick: handleStartBranch,
          },
        ];
      case 'TR':
        return [
          {
            id: 'add_transformer',
            label: 'Przypisz transformator',
            variant: 'primary',
            onClick: handleAddTransformer,
          },
        ];
      case 'OZE':
        return [
          {
            id: 'add_pv',
            label: 'Dodaj PV',
            variant: 'primary',
            onClick: handleAddPV,
          },
          {
            id: 'add_bess',
            label: 'Dodaj BESS',
            variant: 'secondary',
            onClick: handleAddBESS,
          },
        ];
      case 'COUPLER':
      case 'MEASUREMENT':
      default:
        return [
          {
            id: 'assign_catalog',
            label: 'Przypisz katalog',
            variant: 'secondary',
            onClick: handleAssignCatalog,
          },
        ];
    }
  }, [
    bay,
    handleContinueTrunk,
    handleStartBranch,
    handleAddTransformer,
    handleAddPV,
    handleAddBESS,
    handleAssignCatalog,
  ]);

  if (!bay) return null;

  const dot = statusDotFromReadiness(elementId, readiness);

  return (
    <ObjectCard
      elementName={bay.name}
      elementType={`Pole SN — ${bayRoleLabel(bay.bay_role)}`}
      elementId={elementId}
      statusDot={dot}
      sections={sections}
      actions={actions}
      onClose={closeObjectCard}
    />
  );
}
