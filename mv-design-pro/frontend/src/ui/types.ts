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

// ============================================================================
// P9: Project Tree Types
// ============================================================================

/**
 * Tree node type (categories in the project tree).
 */
export type TreeNodeType =
  | 'PROJECT'
  | 'NETWORK'
  | 'BUSES'
  | 'LINES'
  | 'CABLES'
  | 'TRANSFORMERS'
  | 'SWITCHES'
  | 'SOURCES'
  | 'LOADS'
  | 'TYPE_CATALOG'
  | 'LINE_TYPES'
  | 'CABLE_TYPES'
  | 'TRANSFORMER_TYPES'
  | 'SWITCH_EQUIPMENT_TYPES'
  | 'CASES'
  | 'STUDY_CASE'  // P10: Individual study case node
  | 'RESULTS'
  | 'RUN_ITEM'    // P11c: Individual analysis run in results history
  | 'ELEMENT' // Individual element node
  | 'POWER_FLOW_RESULTS'  // P20b: Power Flow results category
  | 'POWER_FLOW_RUN'; // P20b: Individual Power Flow run

/**
 * Project tree node structure.
 */
export interface TreeNode {
  id: string;
  label: string;
  nodeType: TreeNodeType;
  elementType?: ElementType; // For ELEMENT nodes
  elementId?: string; // For ELEMENT nodes
  children?: TreeNode[];
  count?: number; // Number of items in category
  expanded?: boolean;
  icon?: string;
  // P10: Study case properties
  studyCaseId?: string; // For STUDY_CASE nodes
  isActive?: boolean; // For STUDY_CASE nodes - active case indicator
  resultStatus?: ResultStatus | string; // For STUDY_CASE and RUN_ITEM nodes - result status
  // P11c: Run item properties (for RUN_ITEM nodes in results history)
  runId?: string; // For RUN_ITEM nodes - analysis run UUID
  solverKind?: string; // For RUN_ITEM nodes - solver type (PF, SC)
  createdAt?: string; // For RUN_ITEM nodes - timestamp
  caseId?: string; // For RUN_ITEM nodes - parent case UUID
  // P20b: Power Flow run properties
  powerFlowRunId?: string; // For POWER_FLOW_RUN nodes - power flow run UUID
  converged?: boolean | null; // For POWER_FLOW_RUN nodes - convergence status
  iterations?: number | null; // For POWER_FLOW_RUN nodes - iteration count
}

// ============================================================================
// P9: Data Manager Types
// ============================================================================

/**
 * Data Manager column definition.
 * P9.2: Extended with editability metadata for inline editing.
 */
export interface DataManagerColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'ref';
  unit?: string;
  sortable: boolean;
  width?: number;
  // P9.2: Inline editing metadata
  editable?: boolean; // Can be edited inline (only in MODEL_EDIT, only instance fields)
  source?: 'instance' | 'type' | 'calculated'; // Source of the value
  enumOptions?: string[]; // For enum type fields
  validation?: (value: unknown) => string | null; // Inline validation function
}

/**
 * Sort direction.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Data Manager sort configuration.
 */
export interface DataManagerSort {
  column: string;
  direction: SortDirection;
}

/**
 * Data Manager filter configuration.
 */
export interface DataManagerFilter {
  inServiceOnly: boolean;
  withTypeOnly: boolean;
  withoutTypeOnly: boolean;
  switchStateFilter: 'ALL' | 'OPEN' | 'CLOSED';
  showErrorsOnly: boolean; // P9.1: Filter for elements with validation errors
}

/**
 * Column view preset types.
 * P9.1: PowerFactory-like column view presets.
 */
export type ColumnViewPreset = 'BASIC' | 'TECHNICAL' | 'OPERATIONAL';

/**
 * Column view preset labels (Polish).
 */
export const COLUMN_VIEW_PRESET_LABELS: Record<ColumnViewPreset, string> = {
  BASIC: 'Widok podstawowy',
  TECHNICAL: 'Parametry techniczne',
  OPERATIONAL: 'Eksploatacja',
};

/**
 * Data Manager row (generic element representation).
 */
export interface DataManagerRow {
  id: string;
  name: string;
  elementType: ElementType;
  inService: boolean;
  typeRef: string | null;
  typeRefName: string | null;
  switchState?: SwitchState;
  data: Record<string, unknown>;
  validationMessages: ValidationMessage[];
}

/**
 * Batch edit operation type.
 * P9.2: Extended with SET_PARAMETER for generic parameter editing.
 */
export type BatchEditOperation =
  | { type: 'SET_IN_SERVICE'; value: boolean }
  | { type: 'ASSIGN_TYPE'; typeId: string }
  | { type: 'CLEAR_TYPE' }
  | { type: 'SET_SWITCH_STATE'; state: SwitchState }
  | { type: 'SET_PARAMETER'; field: string; value: unknown }; // P9.2: Generic parameter edit

/**
 * Batch edit result.
 */
export interface BatchEditResult {
  success: boolean;
  affectedCount: number;
  errors: Array<{ elementId: string; message: string }>;
}

// ============================================================================
// P9.2: Inline Editing Types
// ============================================================================

/**
 * Inline edit state (tracks currently edited cell).
 */
export interface InlineEditState {
  rowId: string;
  columnKey: string;
  value: unknown;
}

/**
 * Inline edit validation result.
 */
export interface InlineEditValidation {
  valid: boolean;
  error?: string;
}

// ============================================================================
// P9.2: Batch Edit Diff Preview Types
// ============================================================================

/**
 * Single change in batch edit preview.
 */
export interface BatchEditChange {
  elementId: string;
  elementName: string;
  field: string;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
  validation: InlineEditValidation;
}

/**
 * Batch edit preview (shown before applying changes).
 */
export interface BatchEditPreview {
  operation: BatchEditOperation;
  changes: BatchEditChange[];
  hasErrors: boolean;
}
