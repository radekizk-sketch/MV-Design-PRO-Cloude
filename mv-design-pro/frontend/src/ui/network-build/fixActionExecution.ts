/**
 * fixActionExecution — Declarative handler for FixAction dispatched by
 * the readiness system.
 *
 * BINDING: No auto-mutations. Each action type maps to exactly one
 * deterministic side-effect (navigation OR modal open).
 */

import type { FixAction } from '../../types/enm';
import type { CanonicalOpName } from '../../types/domainOps';

export interface FixActionHandlers {
  action: FixAction;
  navigateToElement: (elementRef: string) => void;
  openOperationForm: (op: CanonicalOpName, context?: Record<string, unknown>) => void;
}

/**
 * Execute a FixAction declaratively.
 *
 * - NAVIGATE_TO_ELEMENT: highlight element on SLD, do not open forms.
 * - OPEN_MODAL: dispatch custom event so the modal system can handle it.
 * - SELECT_CATALOG: open assign-catalog form for the referenced element.
 * - ADD_MISSING_DEVICE: open update-parameters form for the referenced element.
 */
export function executeFixAction({ action, navigateToElement, openOperationForm }: FixActionHandlers): void {
  switch (action.action_type) {
    case 'NAVIGATE_TO_ELEMENT': {
      if (action.element_ref) {
        navigateToElement(action.element_ref);
      }
      break;
    }

    case 'OPEN_MODAL': {
      // Dispatch custom event — handled by the modal registration system.
      window.dispatchEvent(
        new CustomEvent('open-fix-modal', {
          detail: {
            modalType: action.modal_type,
            elementRef: action.element_ref,
            payloadHint: null,
          },
        }),
      );
      break;
    }

    case 'SELECT_CATALOG': {
      if (action.element_ref) {
        navigateToElement(action.element_ref);
      }
      openOperationForm('assign_catalog_to_element' as CanonicalOpName, {
        element_ref: action.element_ref ?? undefined,
        focus: action.focus ?? undefined,
      });
      break;
    }

    case 'ADD_MISSING_DEVICE': {
      if (action.element_ref) {
        navigateToElement(action.element_ref);
      }
      openOperationForm('update_element_parameters' as CanonicalOpName, {
        element_ref: action.element_ref ?? undefined,
        step: action.step ?? undefined,
        focus: action.focus ?? undefined,
      });
      break;
    }

    default: {
      // Unknown action type — navigate if possible, otherwise no-op.
      if (action.element_ref) {
        navigateToElement(action.element_ref);
      }
    }
  }
}
