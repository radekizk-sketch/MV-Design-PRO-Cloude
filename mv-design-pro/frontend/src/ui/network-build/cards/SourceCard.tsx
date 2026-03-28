/**
 * SourceCard — karta obiektu źródła zasilania GPZ.
 *
 * Wyświetla parametry sieciowe źródła zewnętrznego (model Thevénina / moc zwarciowa),
 * szyny zasilającej oraz referencję katalogową.
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

function modelLabel(model: string): string {
  switch (model) {
    case 'thevenin':
      return 'Model Thevénina';
    case 'short_circuit_power':
      return 'Moc zwarciowa';
    case 'external_grid':
      return 'Sieć zewnętrzna';
    default:
      return model;
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

export function SourceCard({ elementId }: { elementId: string }) {
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const readiness = useSnapshotStore((s) => s.readiness);
  const openOperationForm = useNetworkBuildStore((s) => s.openOperationForm);
  const closeObjectCard = useNetworkBuildStore((s) => s.closeObjectCard);

  const source = useMemo(
    () => snapshot?.sources?.find((src) => src.ref_id === elementId),
    [snapshot, elementId],
  );

  const bus = useMemo(
    () => snapshot?.buses?.find((b) => b.ref_id === source?.bus_ref),
    [snapshot, source],
  );

  const sections = useMemo((): CardSection[] => {
    if (!source) return [];

    const identSection: CardSection = {
      id: 'ident',
      label: 'Identyfikacja',
      fields: [
        { key: 'name', label: 'Nazwa', value: source.name },
        { key: 'ref_id', label: 'ID elementu', value: source.ref_id },
        { key: 'model', label: 'Model', value: modelLabel(source.model) },
      ],
    };

    const paramSection: CardSection = {
      id: 'params',
      label: 'Parametry sieci',
      fields: [
        {
          key: 'sk3',
          label: 'Sk₃',
          value: source.sk3_mva ?? null,
          unit: 'MVA',
          source: 'instance',
          severity: source.sk3_mva == null ? 'warning' : undefined,
        },
        {
          key: 'rx_ratio',
          label: 'R/X',
          value: source.rx_ratio ?? null,
          source: 'instance',
          severity: source.rx_ratio == null ? 'warning' : undefined,
        },
        {
          key: 'r_ohm',
          label: 'R',
          value: source.r_ohm ?? null,
          unit: 'Ω',
          source: source.rx_ratio != null ? 'calculated' : 'instance',
        },
        {
          key: 'x_ohm',
          label: 'X',
          value: source.x_ohm ?? null,
          unit: 'Ω',
          source: source.rx_ratio != null ? 'calculated' : 'instance',
        },
        {
          key: 'ik3',
          label: 'Ik₃',
          value: source.ik3_ka ?? null,
          unit: 'kA',
          source: 'calculated',
        },
        {
          key: 'c_max',
          label: 'c_max',
          value: source.c_max ?? null,
          source: 'instance',
        },
        {
          key: 'c_min',
          label: 'c_min',
          value: source.c_min ?? null,
          source: 'instance',
        },
      ],
    };

    const busSection: CardSection = {
      id: 'bus',
      label: 'Szyna zasilania',
      fields: [
        {
          key: 'bus_ref',
          label: 'ID szyny',
          value: source.bus_ref,
        },
        {
          key: 'bus_name',
          label: 'Nazwa szyny',
          value: bus?.name ?? '—',
        },
        {
          key: 'bus_voltage',
          label: 'Napięcie nominalne',
          value: bus?.voltage_kv ?? null,
          unit: 'kV',
        },
        {
          key: 'bus_grounding',
          label: 'Uziemienie',
          value: bus?.grounding?.type ?? null,
        },
      ],
    };

    const catalogSection: CardSection = {
      id: 'catalog',
      label: 'Katalog',
      fields: [
        {
          key: 'no_catalog',
          label: 'Typ katalogowy',
          value: 'Brak — źródło GPZ definiuje parametry bezpośrednio',
        },
      ],
    };

    return [identSection, paramSection, busSection, catalogSection];
  }, [source, bus]);

  const handleEditParams = useCallback(() => {
    openOperationForm('update_element_parameters', { element_ref: elementId, element_type: 'source' });
  }, [openOperationForm, elementId]);

  const actions = useMemo((): CardAction[] => [
    {
      id: 'edit_params',
      label: 'Edytuj parametry',
      variant: 'primary',
      onClick: handleEditParams,
    },
  ], [handleEditParams]);

  if (!source) return null;

  const dot = statusDotFromReadiness(elementId, readiness);

  return (
    <ObjectCard
      elementName={source.name}
      elementType="Źródło zasilania GPZ"
      elementId={elementId}
      statusDot={dot}
      sections={sections}
      actions={actions}
      onClose={closeObjectCard}
    />
  );
}
