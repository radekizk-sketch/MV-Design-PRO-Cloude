/**
 * AddOzeSourceForm - formularz dodawania źródeł OZE (PV) i magazynów BESS.
 *
 * Kanoniczny kontrakt:
 * - add_pv_inverter_nn: bus_nn_ref, station_ref, placement, existing_field_ref/source_field, pv_spec
 * - add_bess_inverter_nn: bus_nn_ref, station_ref, placement, existing_field_ref/source_field, bess_spec
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PVInverterModal, type PVInverterFormData } from '../../topology/modals/PVInverterModal';
import {
  BESSInverterModal,
  type BESSInverterFormData,
} from '../../topology/modals/BESSInverterModal';
import type { CatalogEntry } from '../../topology/modals/CatalogPicker';
import { useSnapshotStore } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';
import { validateCatalogFirst } from './catalogFirstRules';
import {
  fetchBessInverterTypes,
  fetchMvApparatusTypes,
  fetchPvInverterTypes,
} from '../../catalog/api';
import type {
  BESSInverterCatalogType,
  MVApparatusCatalogType,
  PVInverterCatalogType,
} from '../../catalog/types';

type OzeKind = 'PV' | 'BESS';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function resolveBusNnRef(
  context: Record<string, unknown> | undefined,
  snapshot: Record<string, unknown> | null,
): string | null {
  const directRef = context?.bus_nn_ref;
  if (isNonEmptyString(directRef)) {
    return directRef.trim();
  }

  const stationRef = context?.station_ref;
  if (!isNonEmptyString(stationRef) || !snapshot) {
    return null;
  }

  const substations = Array.isArray(snapshot.substations)
    ? (snapshot.substations as Array<Record<string, unknown>>)
    : [];
  const buses = Array.isArray(snapshot.buses)
    ? (snapshot.buses as Array<Record<string, unknown>>)
    : [];

  const station = substations.find((item) => item.ref_id === stationRef);
  const busRefs = Array.isArray(station?.bus_refs)
    ? (station?.bus_refs as string[])
    : [];
  for (const busRef of busRefs) {
    const bus = buses.find((item) => item.ref_id === busRef);
    const voltage = bus?.voltage_kv;
    if (typeof voltage === 'number' && voltage > 0 && voltage < 1.0) {
      return busRef;
    }
  }

  return null;
}

function buildSourceField(
  kind: 'PV' | 'BESS',
  data: PVInverterFormData | BESSInverterFormData,
): Record<string, unknown> | null {
  if (data.placement !== 'NEW_FIELD') {
    return null;
  }

  return {
    source_field_kind: kind,
    switch_spec: {
      switch_kind: data.new_field_switch_kind,
      normal_state: data.new_field_switch_state,
      catalog_binding: data.new_field_switch_catalog_ref
        ? {
            catalog_namespace: 'APARAT_NN',
            catalog_item_id: data.new_field_switch_catalog_ref,
            catalog_item_version: '2024.1',
          }
        : null,
    },
    voltage_nn_kv: data.new_field_voltage_nn_kv,
    field_name: data.new_field_name,
    field_label: data.new_field_name,
  };
}

function toCatalogEntry(
  item: PVInverterCatalogType | BESSInverterCatalogType | MVApparatusCatalogType,
  summary: string,
): CatalogEntry {
  return {
    id: item.id,
    name: item.name,
    manufacturer: item.manufacturer,
    summary,
  };
}

export function AddOzeSourceForm() {
  const activeForm = useNetworkBuildStore((s) => s.activeOperationForm);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const snapshot = useSnapshotStore((s) => s.snapshot as Record<string, unknown> | null);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);
  const context = activeForm?.context as Record<string, unknown> | undefined;

  const defaultKind: OzeKind =
    activeForm?.op === 'add_bess_inverter_nn' ? 'BESS' : 'PV';
  const [ozeKind, setOzeKind] = useState<OzeKind>(defaultKind);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [pvCatalogEntries, setPvCatalogEntries] = useState<CatalogEntry[]>([]);
  const [bessCatalogEntries, setBessCatalogEntries] = useState<CatalogEntry[]>([]);
  const [switchCatalogEntries, setSwitchCatalogEntries] = useState<CatalogEntry[]>([]);

  const fieldOptions = useMemo<Array<{ ref_id: string; name: string; kind: string }>>(() => {
    const raw = context?.fieldOptions;
    if (Array.isArray(raw)) return raw as Array<{ ref_id: string; name: string; kind: string }>;
    return [];
  }, [context]);

  const stationRef = useMemo(
    () => (isNonEmptyString(context?.station_ref) ? context?.station_ref.trim() : null),
    [context],
  );
  const busNnRef = useMemo(() => resolveBusNnRef(context, snapshot), [context, snapshot]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchPvInverterTypes(),
      fetchBessInverterTypes(),
      fetchMvApparatusTypes(),
    ])
      .then(([pvTypes, bessTypes, switchTypes]) => {
        if (!active) {
          return;
        }
        setPvCatalogEntries(
          pvTypes.map((item) =>
            toCatalogEntry(item, `Sn ${item.s_n_kva} kVA, Pmax ${item.p_max_kw} kW`),
          ),
        );
        setBessCatalogEntries(
          bessTypes.map((item) =>
            toCatalogEntry(
              item,
              `Pł/Pr ${item.p_charge_kw}/${item.p_discharge_kw} kW, E ${item.e_kwh} kWh`,
            ),
          ),
        );
        setSwitchCatalogEntries(
          switchTypes.map((item) =>
            toCatalogEntry(item, `Un ${item.u_n_kv} kV, In ${item.i_n_a} A`),
          ),
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setCatalogError('Nie udało się pobrać katalogów PV/BESS i aparatury pola.');
      });
    return () => {
      active = false;
    };
  }, []);

  const handlePVSubmit = useCallback(
    async (data: PVInverterFormData) => {
      if (!activeCaseId) return;
      if (!busNnRef) {
        setCatalogError('Wybierz lub wskaż szynę nN przed dodaniem falownika PV.');
        return;
      }
      const payload = {
        bus_nn_ref: busNnRef,
        station_ref: stationRef,
        placement: data.placement,
        existing_field_ref: data.placement === 'EXISTING_FIELD' ? data.existing_field_ref : null,
        source_field: buildSourceField('PV', data),
        pv_spec: {
          catalog_item_id: data.catalog_item_id,
          rated_power_ac_kw: data.rated_power_ac_kw,
          max_power_kw: data.max_power_kw,
          control_mode: data.control_mode,
          cos_phi: data.cos_phi,
          generation_limit_pmax_kw: data.generation_limit_pmax_kw,
          generation_limit_q_kvar: data.generation_limit_q_kvar,
          disconnect_required: data.disconnect_required,
          measurement_point: data.measurement_point,
          existing_measurement_ref: data.existing_measurement_ref,
          source_name: data.source_name,
          work_profile_ref: data.work_profile_ref,
        },
      };
      const validationError = validateCatalogFirst('add_pv_inverter_nn', payload);
      if (validationError) {
        setCatalogError(validationError);
        return;
      }
      setCatalogError(null);
      await executeDomainOperation(activeCaseId, 'add_pv_inverter_nn', payload);
      closeForm();
    },
    [activeCaseId, busNnRef, closeForm, executeDomainOperation, stationRef],
  );

  const handleBESSSubmit = useCallback(
    async (data: BESSInverterFormData) => {
      if (!activeCaseId) return;
      if (!busNnRef) {
        setCatalogError('Wybierz lub wskaż szynę nN przed dodaniem magazynu BESS.');
        return;
      }
      const payload = {
        bus_nn_ref: busNnRef,
        station_ref: stationRef,
        placement: data.placement,
        existing_field_ref: data.placement === 'EXISTING_FIELD' ? data.existing_field_ref : null,
        source_field: buildSourceField('BESS', data),
        bess_spec: {
          inverter_catalog_id: data.inverter_catalog_id,
          storage_catalog_id: data.storage_catalog_id,
          usable_capacity_kwh: data.usable_capacity_kwh,
          charge_power_kw: data.charge_power_kw,
          discharge_power_kw: data.discharge_power_kw,
          operation_mode: data.operation_mode,
          control_strategy: data.control_strategy,
          soc_min_percent: data.soc_min_percent,
          soc_max_percent: data.soc_max_percent,
          source_name: data.source_name,
          time_profile_ref: data.time_profile_ref,
        },
      };
      const validationError = validateCatalogFirst('add_bess_inverter_nn', payload);
      if (validationError) {
        setCatalogError(validationError);
        return;
      }
      setCatalogError(null);
      await executeDomainOperation(activeCaseId, 'add_bess_inverter_nn', payload);
      closeForm();
    },
    [activeCaseId, busNnRef, closeForm, executeDomainOperation, stationRef],
  );

  return (
    <div className="h-full flex flex-col" data-testid="add-oze-source-form">
      <div className="flex border-b border-gray-200 bg-gray-50 px-4 py-2 gap-2">
        <button
          type="button"
          onClick={() => setOzeKind('PV')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            ozeKind === 'PV'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
          }`}
        >
          Fotowoltaika (PV)
        </button>
        <button
          type="button"
          onClick={() => setOzeKind('BESS')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            ozeKind === 'BESS'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
          }`}
        >
          Magazyn energii (BESS)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {catalogError && (
          <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">{catalogError}</p>
        )}
        {ozeKind === 'PV' ? (
          <PVInverterModal
            isOpen={true}
            mode="create"
            fieldOptions={fieldOptions}
            catalogEntries={pvCatalogEntries}
            switchCatalogEntries={switchCatalogEntries}
            onSubmit={handlePVSubmit}
            onCancel={closeForm}
          />
        ) : (
          <BESSInverterModal
            isOpen={true}
            mode="create"
            fieldOptions={fieldOptions}
            inverterCatalogEntries={bessCatalogEntries}
            storageCatalogEntries={bessCatalogEntries}
            switchCatalogEntries={switchCatalogEntries}
            onSubmit={handleBESSSubmit}
            onCancel={closeForm}
          />
        )}
      </div>
    </div>
  );
}
