/**
 * useWizardDomainOps — Bridge wizard steps (K1-K10) to domain operations.
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md: K2 (GPZ), K3 (Bus), K4 (Branch), K5 (Transformer), K6 (Load/Generator)
 * - canonical_ops.md: add_grid_source_sn, continue_trunk_segment_sn,
 *   insert_station_on_segment_sn, create_node, create_branch, update_branch, delete_branch
 * - ARCHITECTURE.md § Application Layer: NO physics calculations
 *
 * LAYER: Application (presentation bridge)
 * - Maps wizard form data to canonical domain operations
 * - Delegates execution to snapshotStore.executeDomainOperation
 * - No physics, no direct ENM mutation, no direct API calls
 *
 * BINDING: Polish error messages, no project codenames.
 */

import { useCallback, useState } from 'react';
import { useSnapshotStore } from '../topology/snapshotStore';
import { useAppStateStore } from '../app-state';
import type { DomainOpResponseV1 } from '../../types/enm';

// ---------------------------------------------------------------------------
// Payload types for each wizard domain operation
// ---------------------------------------------------------------------------

/** K2: Grid supply point (GPZ) payload. */
export interface AddGridSourcePayload {
  bus_name: string;
  voltage_kv: number;
  sk3_mva: number;
  rx_ratio: number;
}

/** K3: Bus creation payload. */
export interface AddBusPayload {
  name: string;
  voltage_kv: number;
}

/** K4: Branch (line or cable) creation payload. */
export interface AddBranchPayload {
  from_bus_ref: string;
  to_bus_ref: string;
  type: 'line_overhead' | 'cable';
  length_km: number;
  r_ohm_per_km: number;
  x_ohm_per_km: number;
  catalog_ref?: string | null;
}

/** K5: Transformer creation payload. */
export interface AddTransformerPayload {
  hv_bus_ref: string;
  lv_bus_ref: string;
  sn_mva: number;
  uk_percent: number;
  pk_kw?: number;
  vector_group?: string;
  catalog_ref?: string | null;
}

/** K6: Load creation payload. */
export interface AddLoadPayload {
  bus_ref: string;
  p_mw: number;
  q_mvar: number;
  model?: 'pq' | 'zip';
  catalog_ref?: string | null;
}

/** K6: Generator creation payload. */
export interface AddGeneratorPayload {
  bus_ref: string;
  p_mw: number;
  q_mvar?: number;
  gen_type?: 'synchronous' | 'pv_inverter' | 'wind_inverter' | 'bess';
  catalog_ref?: string | null;
}

/** General: Element deletion payload. */
export interface DeleteElementPayload {
  ref_id: string;
  element_type: 'bus' | 'branch' | 'transformer' | 'source' | 'load' | 'generator';
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface WizardDomainOps {
  /** K2: Add grid supply point (GPZ) — creates bus + source. */
  addGridSource: (data: AddGridSourcePayload) => Promise<DomainOpResponseV1 | null>;
  /** K3: Add bus to the network. */
  addBus: (data: AddBusPayload) => Promise<DomainOpResponseV1 | null>;
  /** K4: Add branch (overhead line or cable). */
  addBranch: (data: AddBranchPayload) => Promise<DomainOpResponseV1 | null>;
  /** K5: Add two-winding transformer. */
  addTransformer: (data: AddTransformerPayload) => Promise<DomainOpResponseV1 | null>;
  /** K6: Add electrical load. */
  addLoad: (data: AddLoadPayload) => Promise<DomainOpResponseV1 | null>;
  /** K6: Add generator (OZE / synchronous). */
  addGenerator: (data: AddGeneratorPayload) => Promise<DomainOpResponseV1 | null>;
  /** General: Delete any network element by ref_id and type. */
  deleteElement: (data: DeleteElementPayload) => Promise<DomainOpResponseV1 | null>;
  /** Whether any domain operation is currently executing. */
  isExecuting: boolean;
  /** Last error message (Polish), or null if no error. */
  lastError: string | null;
  /** Clear the last error. */
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Error messages (Polish labels — no codenames)
// ---------------------------------------------------------------------------

const ERROR_NO_ACTIVE_CASE = 'Nie wybrano aktywnego przypadku obliczeniowego.';
const ERROR_OPERATION_PREFIX = 'Operacja nie powiodła się';

/**
 * Format a domain operation error into a Polish user-facing message.
 */
function formatError(opLabel: string, detail: string | undefined): string {
  if (detail) {
    return `${ERROR_OPERATION_PREFIX}: ${opLabel} — ${detail}`;
  }
  return `${ERROR_OPERATION_PREFIX}: ${opLabel}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useWizardDomainOps — bridges wizard step forms to canonical domain operations.
 *
 * Each returned function maps wizard form data to `snapshotStore.executeDomainOperation`,
 * which calls POST /enm/ops with the canonical operation name and payload.
 *
 * Usage:
 * ```tsx
 * const { addGridSource, addBranch, isExecuting, lastError } = useWizardDomainOps();
 * await addGridSource({ bus_name: 'GPZ-1', voltage_kv: 110, sk3_mva: 2500, rx_ratio: 0.1 });
 * ```
 *
 * @returns {WizardDomainOps} Operation functions, execution state, and error.
 */
export function useWizardDomainOps(): WizardDomainOps {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  /**
   * Resolve the active case ID or throw a user-facing error.
   */
  const resolveActiveCaseId = useCallback((): string => {
    const caseId = useAppStateStore.getState().activeCaseId;
    if (!caseId) {
      throw new Error(ERROR_NO_ACTIVE_CASE);
    }
    return caseId;
  }, []);

  /**
   * Execute a domain operation with standard error handling and state tracking.
   */
  const execute = useCallback(
    async (
      opName: string,
      payload: Record<string, unknown>,
      opLabel: string,
    ): Promise<DomainOpResponseV1 | null> => {
      setIsExecuting(true);
      setLastError(null);

      try {
        const caseId = resolveActiveCaseId();
        const response = await useSnapshotStore
          .getState()
          .executeDomainOperation(caseId, opName, payload);

        if (!response) {
          setLastError(formatError(opLabel, undefined));
          return null;
        }

        if (response.error) {
          setLastError(formatError(opLabel, response.error));
          return response;
        }

        return response;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setLastError(msg);
        return null;
      } finally {
        setIsExecuting(false);
      }
    },
    [resolveActiveCaseId],
  );

  // -------------------------------------------------------------------------
  // K2: Add Grid Source (GPZ)
  // -------------------------------------------------------------------------

  const addGridSource = useCallback(
    async (data: AddGridSourcePayload): Promise<DomainOpResponseV1 | null> => {
      return execute(
        'add_grid_source_sn',
        {
          bus_name: data.bus_name,
          voltage_kv: data.voltage_kv,
          sk3_mva: data.sk3_mva,
          rx_ratio: data.rx_ratio,
        },
        'Dodawanie punktu zasilania',
      );
    },
    [execute],
  );

  // -------------------------------------------------------------------------
  // K3: Add Bus
  // -------------------------------------------------------------------------

  const addBus = useCallback(
    async (data: AddBusPayload): Promise<DomainOpResponseV1 | null> => {
      return execute(
        'create_node',
        {
          name: data.name,
          voltage_kv: data.voltage_kv,
        },
        'Tworzenie szyny',
      );
    },
    [execute],
  );

  // -------------------------------------------------------------------------
  // K4: Add Branch (Line / Cable)
  // -------------------------------------------------------------------------

  const addBranch = useCallback(
    async (data: AddBranchPayload): Promise<DomainOpResponseV1 | null> => {
      const payload: Record<string, unknown> = {
        from_bus_ref: data.from_bus_ref,
        to_bus_ref: data.to_bus_ref,
        type: data.type,
        length_km: data.length_km,
        r_ohm_per_km: data.r_ohm_per_km,
        x_ohm_per_km: data.x_ohm_per_km,
      };
      if (data.catalog_ref) {
        payload.catalog_ref = data.catalog_ref;
      }
      return execute(
        'create_branch',
        payload,
        'Dodawanie odcinka',
      );
    },
    [execute],
  );

  // -------------------------------------------------------------------------
  // K5: Add Transformer
  // -------------------------------------------------------------------------

  const addTransformer = useCallback(
    async (data: AddTransformerPayload): Promise<DomainOpResponseV1 | null> => {
      const payload: Record<string, unknown> = {
        hv_bus_ref: data.hv_bus_ref,
        lv_bus_ref: data.lv_bus_ref,
        sn_mva: data.sn_mva,
        uk_percent: data.uk_percent,
      };
      if (data.pk_kw !== undefined) {
        payload.pk_kw = data.pk_kw;
      }
      if (data.vector_group !== undefined) {
        payload.vector_group = data.vector_group;
      }
      if (data.catalog_ref) {
        payload.catalog_ref = data.catalog_ref;
      }
      return execute(
        'create_branch',
        { ...payload, type: 'transformer_2w' },
        'Dodawanie transformatora',
      );
    },
    [execute],
  );

  // -------------------------------------------------------------------------
  // K6: Add Load
  // -------------------------------------------------------------------------

  const addLoad = useCallback(
    async (data: AddLoadPayload): Promise<DomainOpResponseV1 | null> => {
      const payload: Record<string, unknown> = {
        bus_ref: data.bus_ref,
        p_mw: data.p_mw,
        q_mvar: data.q_mvar,
        model: data.model ?? 'pq',
      };
      if (data.catalog_ref) {
        payload.catalog_ref = data.catalog_ref;
      }
      return execute(
        'create_load',
        payload,
        'Dodawanie obciążenia',
      );
    },
    [execute],
  );

  // -------------------------------------------------------------------------
  // K6: Add Generator
  // -------------------------------------------------------------------------

  const addGenerator = useCallback(
    async (data: AddGeneratorPayload): Promise<DomainOpResponseV1 | null> => {
      const payload: Record<string, unknown> = {
        bus_ref: data.bus_ref,
        p_mw: data.p_mw,
      };
      if (data.q_mvar !== undefined) {
        payload.q_mvar = data.q_mvar;
      }
      if (data.gen_type) {
        payload.gen_type = data.gen_type;
      }
      if (data.catalog_ref) {
        payload.catalog_ref = data.catalog_ref;
      }
      return execute(
        'create_generator',
        payload,
        'Dodawanie generatora',
      );
    },
    [execute],
  );

  // -------------------------------------------------------------------------
  // General: Delete Element
  // -------------------------------------------------------------------------

  const deleteElement = useCallback(
    async (data: DeleteElementPayload): Promise<DomainOpResponseV1 | null> => {
      return execute(
        'delete_element',
        {
          ref_id: data.ref_id,
          element_type: data.element_type,
        },
        'Usuwanie elementu',
      );
    },
    [execute],
  );

  // -------------------------------------------------------------------------
  // Clear error
  // -------------------------------------------------------------------------

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    addGridSource,
    addBus,
    addBranch,
    addTransformer,
    addLoad,
    addGenerator,
    deleteElement,
    isExecuting,
    lastError,
    clearError,
  };
}
