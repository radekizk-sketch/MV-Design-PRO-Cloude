/**
 * StationCard — karta obiektu stacji elektroenergetycznej (SN/nN).
 *
 * Wyświetla identyfikację, strukturę logiczną stacji (pola SN, transformatory, szyny),
 * listę pól z rolami oraz listę transformatorów.
 *
 * BINDING: 100% PL etykiety.
 */

import { useMemo, useCallback } from 'react';
import { ObjectCard, type CardSection, type CardAction } from './ObjectCard';
import { useSnapshotStore } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';

// =============================================================================
// Helpers
// =============================================================================

function stationTypeLabel(stationType: string): string {
  switch (stationType) {
    case 'gpz':
      return 'GPZ (Główny Punkt Zasilania)';
    case 'mv_lv':
      return 'Stacja SN/nN';
    case 'switching':
      return 'Stacja rozdzielcza SN';
    case 'customer':
      return 'Stacja odbiorcy';
    default:
      return stationType;
  }
}

function bayRoleLabel(role: string): string {
  switch (role) {
    case 'IN':
      return 'Zasilające (wejście)';
    case 'OUT':
      return 'Odgałęźne (wyjście)';
    case 'TR':
      return 'Transformatorowe';
    case 'COUPLER':
      return 'Sprzęgło sekcji';
    case 'FEEDER':
      return 'Zasilające odgałęźne';
    case 'MEASUREMENT':
      return 'Pomiarowe';
    case 'OZE':
      return 'OZE / źródło';
    default:
      return role;
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

export function StationCard({ elementId }: { elementId: string }) {
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const readiness = useSnapshotStore((s) => s.readiness);
  const openOperationForm = useNetworkBuildStore((s) => s.openOperationForm);
  const closeObjectCard = useNetworkBuildStore((s) => s.closeObjectCard);
  const activeMode = useAppStateStore((s) => s.activeMode);

  const station = useMemo(
    () => snapshot?.substations?.find((s) => s.id === elementId),
    [snapshot, elementId],
  );

  const stationBays = useMemo(
    () => (snapshot?.bays ?? []).filter((b) => b.substation_ref === elementId),
    [snapshot, elementId],
  );

  const stationTransformers = useMemo(
    () =>
      (snapshot?.transformers ?? []).filter((t) =>
        station?.transformer_refs?.includes(t.ref_id),
      ),
    [snapshot, station],
  );

  const stationBuses = useMemo(
    () =>
      (snapshot?.buses ?? []).filter((b) => station?.bus_refs?.includes(b.ref_id)),
    [snapshot, station],
  );

  const nnBuses = useMemo(
    () => stationBuses.filter((b) => b.voltage_kv < 1),
    [stationBuses],
  );

  const snBuses = useMemo(
    () => stationBuses.filter((b) => b.voltage_kv >= 1),
    [stationBuses],
  );

  const sections = useMemo((): CardSection[] => {
    if (!station) return [];

    const identSection: CardSection = {
      id: 'ident',
      label: 'Identyfikacja',
      fields: [
        { key: 'id', label: 'ID', value: station.id },
        { key: 'name', label: 'Nazwa', value: station.name },
        {
          key: 'station_type',
          label: 'Typ stacji',
          value: stationTypeLabel(station.station_type),
        },
        {
          key: 'entry_point',
          label: 'Punkt wejścia',
          value: station.entry_point_ref ?? '—',
        },
      ],
    };

    const strukturaSection: CardSection = {
      id: 'struktura',
      label: 'Struktura',
      fields: [
        {
          key: 'bays_count',
          label: 'Pola SN',
          value: stationBays.length,
          unit: 'szt.',
          severity: stationBays.length === 0 ? 'warning' : 'ok',
        },
        {
          key: 'transformers_count',
          label: 'Transformatory',
          value: stationTransformers.length,
          unit: 'szt.',
          severity: stationTransformers.length === 0 ? 'warning' : 'ok',
        },
        {
          key: 'sn_buses_count',
          label: 'Szyny SN',
          value: snBuses.length,
          unit: 'szt.',
        },
        {
          key: 'nn_buses_count',
          label: 'Szyny nN',
          value: nnBuses.length,
          unit: 'szt.',
        },
      ],
    };

    // Pola SN — każde pole jako wiersz
    const bayFields = stationBays.map((bay) => ({
      key: `bay_${bay.id}`,
      label: bay.name,
      value: bayRoleLabel(bay.bay_role),
    }));

    const baysSection: CardSection = {
      id: 'bays',
      label: 'Pola SN',
      fields:
        bayFields.length > 0
          ? bayFields
          : [{ key: 'no_bays', label: 'Brak pól', value: 'Nie zdefiniowano pól SN', severity: 'warning' as const }],
    };

    // Transformer-to-bay assignment enrichment (via equipment_refs)
    const enrichedTrFields = stationTransformers.map((tr) => {
      const trBay = stationBays.find((bay) =>
        bay.bay_role === 'TR' && bay.equipment_refs?.includes(tr.ref_id),
      );
      const bayInfo = trBay ? ` → Pole: ${trBay.name}` : '';
      return {
        key: `tr_${tr.ref_id}`,
        label: tr.name,
        value: `${tr.sn_mva * 1000} kVA / uk=${tr.uk_percent}%${bayInfo}`,
        source: tr.catalog_ref ? ('catalog' as const) : ('instance' as const),
      };
    });

    const transformersSection: CardSection = {
      id: 'transformers',
      label: 'Transformatory',
      fields:
        enrichedTrFields.length > 0
          ? enrichedTrFields
          : [{ key: 'no_tr', label: 'Brak transformatora', value: 'Brak przypisanego transformatora', severity: 'warning' as const }],
    };

    const result: CardSection[] = [identSection, strukturaSection, baysSection, transformersSection];

    if (activeMode === 'RESULT_VIEW') {
      result.push({
        id: 'analysis',
        label: 'Wyniki analizy',
        fields: [
          { key: 'u_bus_pu', label: 'Napięcie U szyny', value: null, unit: 'pu', source: 'calculated' },
          { key: 'ik3', label: 'Prąd zwarciowy Ik₃', value: null, unit: 'kA', source: 'calculated' },
          { key: 'ik1', label: 'Prąd zwarciowy Ik₁', value: null, unit: 'kA', source: 'calculated' },
          { key: 'max_tr_loading', label: 'Maks. obciążenie trafo', value: null, unit: '%', source: 'calculated' },
          { key: 'no_results', label: 'Status', value: 'Brak wyników — uruchom analizę', severity: 'warning' },
        ],
      });
    }

    return result;
  }, [station, stationBays, stationTransformers, snBuses, nnBuses, activeMode]);

  const handleAddTransformer = useCallback(() => {
    openOperationForm('add_transformer_sn_nn', { station_ref: elementId });
  }, [openOperationForm, elementId]);

  const handleAddPV = useCallback(() => {
    openOperationForm('add_pv_inverter_nn', { station_ref: elementId });
  }, [openOperationForm, elementId]);

  const handleAddBESS = useCallback(() => {
    openOperationForm('add_bess_inverter_nn', { station_ref: elementId });
  }, [openOperationForm, elementId]);

  const actions = useMemo((): CardAction[] => {
    const acts: CardAction[] = [
      {
        id: 'add_transformer',
        label: 'Dodaj transformator',
        variant: 'primary',
        onClick: handleAddTransformer,
      },
    ];

    if (stationTransformers.length > 0) {
      acts.push({
        id: 'add_pv',
        label: 'Dodaj PV',
        variant: 'secondary',
        onClick: handleAddPV,
      });
      acts.push({
        id: 'add_bess',
        label: 'Dodaj BESS',
        variant: 'secondary',
        onClick: handleAddBESS,
      });
    }

    return acts;
  }, [handleAddTransformer, handleAddPV, handleAddBESS, stationTransformers.length]);

  if (!station) return null;

  const dot = statusDotFromReadiness(elementId, readiness);

  return (
    <ObjectCard
      elementName={station.name}
      elementType={stationTypeLabel(station.station_type)}
      elementId={elementId}
      statusDot={dot}
      sections={sections}
      actions={actions}
      onClose={closeObjectCard}
    />
  );
}
