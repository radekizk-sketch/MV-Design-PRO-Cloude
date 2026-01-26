/**
 * UI Types for MV-DESIGN-PRO
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 1.2: Operating modes (MODEL_EDIT, CASE_CONFIG, RESULT_VIEW)
 * - powerfactory_ui_parity.md § B.2: Result freshness (NONE, FRESH, OUTDATED)
 * - sld_rules.md § A.2: Element types and symbol mapping
 *
 * These types are used across Property Grid, Context Menu, and Selection components.
 */

/**
 * Operating mode (per wizard_screens.md § 1.2).
 * Controls what actions are allowed in the UI.
 */
export type OperatingMode = 'MODEL_EDIT' | 'CASE_CONFIG' | 'RESULT_VIEW';

/**
 * Result freshness status (per powerfactory_ui_parity.md § B.2).
 */
export type ResultStatus = 'NONE' | 'FRESH' | 'OUTDATED';

/**
 * Element type in the network model.
 * Maps 1:1 to SLD symbols (bijection per sld_rules.md § A.1).
 */
export type ElementType =
  | 'Bus'
  | 'LineBranch'
  | 'TransformerBranch'
  | 'Switch'
  | 'Source'
  | 'Load';

/**
 * Switch state (per SYSTEM_SPEC.md § 2.4).
 */
export type SwitchState = 'OPEN' | 'CLOSED';

/**
 * Switch type (per sld_rules.md § A.2).
 */
export type SwitchType = 'BREAKER' | 'DISCONNECTOR' | 'LOAD_SWITCH' | 'FUSE';

/**
 * Lifecycle state for elements.
 */
export type LifecycleState = 'PROJEKTOWANY' | 'AKTYWNY' | 'WYLACZONY';

/**
 * Validation severity level.
 */
export type ValidationSeverity = 'ERROR' | 'WARNING';

/**
 * Validation message structure.
 */
export interface ValidationMessage {
  code: string;
  severity: ValidationSeverity;
  message: string;
  field?: string;
}

/**
 * Selected element reference.
 */
export interface SelectedElement {
  id: string;
  type: ElementType;
  name: string;
}

/**
 * Property field definition for Property Grid.
 * Deterministic ordering per powerfactory_ui_parity.md § D.3.
 */
export interface PropertyField {
  key: string;
  label: string;
  value: unknown;
  unit?: string;
  editable: boolean;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'ref' | 'type_ref_with_actions';
  enumOptions?: string[];
  refType?: ElementType;
  validation?: ValidationMessage;
  source?: 'instance' | 'type' | 'calculated' | 'audit';

  // P8.2: Type reference actions (for type_ref_with_actions type)
  onAssignType?: () => void;
  onClearType?: () => void;
  typeRefName?: string | null; // Resolved type name for display
}

/**
 * Property section definition (grouped fields).
 * Sections appear in deterministic order per wizard_screens.md § 3.
 */
export interface PropertySection {
  id: string;
  label: string;
  fields: PropertyField[];
  collapsed?: boolean;
}

/**
 * Complete element properties for Property Grid.
 */
export interface ElementProperties {
  elementId: string;
  elementType: ElementType;
  elementName: string;
  sections: PropertySection[];
  validationMessages: ValidationMessage[];
}

/**
 * Context menu action definition.
 */
export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: string;
  enabled: boolean;
  visible: boolean;
  separator?: boolean;
  submenu?: ContextMenuAction[];
  handler?: () => void;
}

/**
 * Context menu configuration for an element.
 */
export interface ContextMenuConfig {
  elementId: string;
  elementType: ElementType;
  elementName: string;
  mode: OperatingMode;
  actions: ContextMenuAction[];
}
