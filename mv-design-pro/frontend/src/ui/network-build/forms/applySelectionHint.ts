/**
 * applySelectionHint — Apply the selection hint from a domain op response.
 *
 * After a successful domain operation the backend may return a
 * `selection_hint` describing which element should be selected and whether
 * the SLD should zoom to it.  This utility applies the hint to the
 * selection store so the user sees immediate visual feedback.
 *
 * BINDING: No physics. No mutations to the network model. Pure UI side-effect.
 */

import type { DomainOpResponseV1 } from '../../../types/enm';
import type { SelectedElement } from '../../types';
import type { ElementType } from '../../types';

export interface ApplySelectionHintParams {
  response: DomainOpResponseV1;
  selectElement: (element: SelectedElement | null) => void;
  centerSldOnElement: (elementId: string) => void;
}

/**
 * Coerce the backend element_type string to a UI ElementType.
 * Falls back to 'Bus' for unknown types so the selection is never null.
 */
function coerceElementType(rawType: string): ElementType {
  const map: Record<string, ElementType> = {
    bus: 'Bus',
    branch: 'LineBranch',
    transformer: 'TransformerBranch',
    source: 'Source',
    load: 'Load',
    generator: 'Generator',
    switch: 'Switch',
    station: 'Station',
  };
  return (map[rawType.toLowerCase()] ?? 'Bus') as ElementType;
}

/**
 * If the domain op response contains a selection hint, select the referenced
 * element and optionally zoom the SLD to it.
 */
export function applySelectionHint({
  response,
  selectElement,
  centerSldOnElement,
}: ApplySelectionHintParams): void {
  const hint = response.selection_hint;
  if (!hint?.element_id) return;

  const element: SelectedElement = {
    id: hint.element_id,
    type: coerceElementType(hint.element_type ?? 'bus'),
    name: hint.element_id, // Name resolved from snapshot by caller if needed
  };

  selectElement(element);

  if (hint.zoom_to) {
    centerSldOnElement(hint.element_id);
  }
}
