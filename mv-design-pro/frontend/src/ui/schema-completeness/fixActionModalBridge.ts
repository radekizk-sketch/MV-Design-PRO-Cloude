/**
 * FixAction Modal Bridge — maps backend modal_type names to frontend MODAL_IDs.
 *
 * The backend sends FixAction.modal_type as generic names (e.g., "SourceModal",
 * "NodeModal"). The frontend ModalRegistry uses Polish MODAL_IDs
 * (e.g., "MODAL_DODAJ_ZRODLO_SN").
 *
 * This bridge is the SINGLE SOURCE OF TRUTH for the mapping.
 *
 * INVARIANTS:
 * - Every backend modal_type MUST map to an existing MODAL_ID
 * - No unresolved modal_type should silently fail
 * - Deterministic: same input → same output
 */

import { MODAL_IDS, type ModalId } from '../topology/modals/modalRegistry';
import type { FixAction, FixActionType } from '../types';

// ---------------------------------------------------------------------------
// Backend → Frontend modal_type mapping
// ---------------------------------------------------------------------------

/**
 * Maps backend modal_type values to frontend MODAL_IDs.
 *
 * Keys: backend FixAction.modal_type values
 * Values: frontend ModalId from MODAL_REGISTRY
 */
export const BACKEND_MODAL_TYPE_MAP: Record<string, ModalId> = {
  // ENMValidator modal types (existing)
  SourceModal: MODAL_IDS.MODAL_DODAJ_ZRODLO_SN,
  NodeModal: MODAL_IDS.MODAL_ZMIEN_PARAMETRY,
  BranchModal: MODAL_IDS.MODAL_DODAJ_ODGALEZIENIE_SN,
  TransformerModal: MODAL_IDS.MODAL_DODAJ_TRANSFORMATOR,
  LoadModal: MODAL_IDS.MODAL_DODAJ_ODBIOR,

  // Generator validation modal types
  GeneratorModal: MODAL_IDS.MODAL_ZMIEN_PARAMETRY,
  CatalogPicker: MODAL_IDS.MODAL_ZMIEN_TYP_Z_KATALOGU,

  // Station field validation modal types
  FieldDeviceModal: MODAL_IDS.MODAL_DODAJ_POLE_SN,
  ProtectionBindingModal: MODAL_IDS.MODAL_DODAJ_ZABEZPIECZENIE,

  // Study case modal types
  StudyCaseSettings: MODAL_IDS.MODAL_ZMIEN_PARAMETRY,

  // Non-standard Polish labels from fault_scenario_service
  'Uzupełnij Z0': MODAL_IDS.MODAL_ZMIEN_PARAMETRY,
  'Uzupełnij Z2': MODAL_IDS.MODAL_ZMIEN_PARAMETRY,
  'Zmień tryb zwarcia': MODAL_IDS.MODAL_ZMIEN_PARAMETRY,
};

/**
 * Resolve a backend modal_type to a frontend ModalId.
 *
 * Returns the mapped ModalId or null if no mapping exists.
 * Logs a warning for unmapped types in development.
 */
export function resolveModalType(backendModalType: string | null): ModalId | null {
  if (!backendModalType) return null;
  const mapped = BACKEND_MODAL_TYPE_MAP[backendModalType];
  if (!mapped && import.meta.env.DEV) {
    console.warn(
      `[FixActionModalBridge] Unmapped backend modal_type: "${backendModalType}". ` +
        'Add entry to BACKEND_MODAL_TYPE_MAP.',
    );
  }
  return mapped ?? null;
}

/**
 * Determine the canonical operation to dispatch for a given FixAction.
 *
 * This resolves the FixAction to a modal and then maps it to the canonical
 * operation via the ModalRegistry.
 */
export function resolveFixActionToOperation(fixAction: FixAction): {
  actionType: FixActionType;
  modalId: ModalId | null;
  elementRef: string | null;
} {
  return {
    actionType: fixAction.action_type,
    modalId: resolveModalType(fixAction.modal_type),
    elementRef: fixAction.element_ref,
  };
}

/**
 * Check if all known backend modal_type values are mapped.
 * Returns list of unmapped types (should be empty for CI pass).
 */
export function getUnmappedModalTypes(backendTypes: string[]): string[] {
  return backendTypes.filter((t) => !(t in BACKEND_MODAL_TYPE_MAP));
}
