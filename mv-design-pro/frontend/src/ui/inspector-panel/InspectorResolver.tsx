/**
 * InspectorResolver — dynamiczny inspektor właściwości podłączony do modelu.
 *
 * Reaguje na selekcję elementu (selectionStore) i pobiera dane
 * z snapshotStore. Renderuje PropertyGrid z odpowiednimi danymi.
 *
 * CANONICAL: brak fizyki, pure read z ENM snapshot.
 * BINDING: Polish labels, brak codenames.
 */

import { useMemo, useCallback } from 'react';
import { useSelectionStore } from '../selection';
import { useSnapshotStore } from '../topology/snapshotStore';
import { PropertyGrid } from '../property-grid/PropertyGrid';
import { EmptyInspectorPanel } from './EmptyInspectorPanel';
import type { ElementType } from '../types';
import type { EnergyNetworkModel } from '../../types/enm';

/**
 * Find an element in the ENM snapshot by ref_id and return its data + type.
 */
function findElementInSnapshot(
  snapshot: EnergyNetworkModel | null,
  elementId: string,
): { data: Record<string, unknown>; elementType: ElementType; name: string } | null {
  if (!snapshot) return null;

  // Search buses
  const bus = (snapshot.buses ?? []).find((b) => b.ref_id === elementId);
  if (bus) {
    return {
      elementType: 'Bus',
      name: bus.name,
      data: {
        ref_id: bus.ref_id,
        name: bus.name,
        voltage_kv: bus.voltage_kv,
        phase_system: bus.phase_system,
        zone: bus.zone,
        frequency_hz: bus.frequency_hz ?? snapshot.header.defaults.frequency_hz,
        u_min_pu: bus.nominal_limits?.u_min_pu,
        u_max_pu: bus.nominal_limits?.u_max_pu,
        grounding_type: bus.grounding?.type,
      },
    };
  }

  // Search branches (lines)
  const branch = (snapshot.branches ?? []).find((br) => br.ref_id === elementId);
  if (branch) {
    const branchType: ElementType =
      branch.type === 'line_overhead' ? 'LineBranch' :
      branch.type === 'cable' ? 'LineBranch' : 'Switch';

    const baseData: Record<string, unknown> = {
      ref_id: branch.ref_id,
      name: branch.name,
      from_bus_ref: branch.from_bus_ref,
      to_bus_ref: branch.to_bus_ref,
      status: branch.status,
      type_ref: branch.catalog_ref,
    };

    if (branch.type === 'line_overhead' || branch.type === 'cable') {
      Object.assign(baseData, {
        length_km: branch.length_km,
        r_ohm_per_km: branch.r_ohm_per_km,
        x_ohm_per_km: branch.x_ohm_per_km,
        in_a: branch.rating?.in_a,
        ith_ka: branch.rating?.ith_ka,
        idyn_ka: branch.rating?.idyn_ka,
      });
      if (branch.type === 'cable') {
        Object.assign(baseData, {
          insulation: branch.insulation,
        });
      }
    }

    return { elementType: branchType, name: branch.name, data: baseData };
  }

  // Search transformers
  const tr = (snapshot.transformers ?? []).find((t) => t.ref_id === elementId);
  if (tr) {
    return {
      elementType: 'TransformerBranch',
      name: tr.name,
      data: {
        ref_id: tr.ref_id,
        name: tr.name,
        hv_bus_ref: tr.hv_bus_ref,
        lv_bus_ref: tr.lv_bus_ref,
        sn_mva: tr.sn_mva,
        uhv_kv: tr.uhv_kv,
        ulv_kv: tr.ulv_kv,
        uk_percent: tr.uk_percent,
        pk_kw: tr.pk_kw,
        p0_kw: tr.p0_kw,
        i0_percent: tr.i0_percent,
        vector_group: tr.vector_group,
        tap_position: tr.tap_position,
        tap_min: tr.tap_min,
        tap_max: tr.tap_max,
        type_ref: tr.catalog_ref,
      },
    };
  }

  // Search sources
  const src = (snapshot.sources ?? []).find((s) => s.ref_id === elementId);
  if (src) {
    return {
      elementType: 'Source',
      name: src.name,
      data: {
        ref_id: src.ref_id,
        name: src.name,
        bus_ref: src.bus_ref,
        model: src.model,
        sk3_mva: src.sk3_mva,
        ik3_ka: src.ik3_ka,
        r_ohm: src.r_ohm,
        x_ohm: src.x_ohm,
        rx_ratio: src.rx_ratio,
        c_max: src.c_max,
        c_min: src.c_min,
      },
    };
  }

  // Search loads
  const load = (snapshot.loads ?? []).find((l) => l.ref_id === elementId);
  if (load) {
    return {
      elementType: 'Load',
      name: load.name,
      data: {
        ref_id: load.ref_id,
        name: load.name,
        bus_ref: load.bus_ref,
        p_mw: load.p_mw,
        q_mvar: load.q_mvar,
        model: load.model,
        quantity: load.quantity,
        type_ref: load.catalog_ref,
      },
    };
  }

  // Search generators
  const gen = (snapshot.generators ?? []).find((g) => g.ref_id === elementId);
  if (gen) {
    return {
      elementType: 'Source',
      name: gen.name,
      data: {
        ref_id: gen.ref_id,
        name: gen.name,
        bus_ref: gen.bus_ref,
        gen_type: gen.gen_type,
        p_mw: gen.p_mw,
        q_mvar: gen.q_mvar,
        connection_variant: gen.connection_variant,
        type_ref: gen.catalog_ref,
      },
    };
  }

  return null;
}

/**
 * InspectorResolver — resolves the selected element and renders PropertyGrid.
 */
export function InspectorResolver() {
  const selectedElements = useSelectionStore((state) => state.selectedElements);
  const snapshot = useSnapshotStore((state) => state.snapshot);
  const activeMode = useSelectionStore((state) => state.mode);

  const selected = selectedElements[0] ?? null;

  const resolved = useMemo(() => {
    if (!selected || !snapshot) return null;
    return findElementInSnapshot(snapshot, selected.id);
  }, [selected, snapshot]);

  const handleFieldChange = useCallback(
    (_fieldKey: string, _value: unknown) => {
      // Field changes will be dispatched via domain operations
      // This is a read-only inspector for now — full edit integration
      // requires wiring to executeDomainOperation
    },
    [],
  );

  if (!selected || !resolved) {
    return (
      <EmptyInspectorPanel
        selectedElement={null}
        isReadOnly={activeMode === 'RESULT_VIEW'}
      />
    );
  }

  return (
    <PropertyGrid
      elementId={selected.id}
      elementType={resolved.elementType}
      elementName={resolved.name}
      elementData={resolved.data}
      onFieldChange={handleFieldChange}
    />
  );
}
