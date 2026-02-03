/**
 * Context Menu Action Definitions
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 4: Menu Kontekstowe specifications
 * - sld_rules.md § E.2, § E.3: Context Menu (Edit Mode) and (Result Mode)
 * - powerfactory_ui_parity.md § A.1: Mode-based action gating
 *
 * All labels are in Polish per wizard_screens.md.
 */

import type { ContextMenuAction, ElementType, OperatingMode, SwitchState } from '../types';

/**
 * Build context menu actions for an element.
 *
 * Rules:
 * - MODEL_EDIT: Full menu (add, edit, delete, toggle state, type assignment)
 * - CASE_CONFIG: Properties only (read-only), no topology changes
 * - RESULT_VIEW: View-only menu (properties RO, results detail, export)
 * - P8.2: Type Library actions (Assign/Clear Type) only in MODEL_EDIT
 */
export function buildContextMenuActions(
  elementType: ElementType,
  elementId: string,
  elementName: string,
  mode: OperatingMode,
  options: {
    inService?: boolean;
    switchState?: SwitchState;
    hasTypeRef?: boolean;
    onOpenProperties?: () => void;
    onToggleInService?: () => void;
    onToggleSwitchState?: () => void;
    onAssignType?: () => void;
    onClearType?: () => void;
    onDelete?: () => void;
    onShowInTree?: () => void;
    onShowOnDiagram?: () => void;
    onShowResultsDetail?: () => void;
    onExportResults?: () => void;
  } = {}
): ContextMenuAction[] {
  const {
    inService = true,
    switchState,
    hasTypeRef = false,
    onOpenProperties,
    onToggleInService,
    onToggleSwitchState,
    onAssignType,
    onClearType,
    onDelete,
    onShowInTree,
    onShowOnDiagram,
    onShowResultsDetail,
    onExportResults,
  } = options;

  const isModelEdit = mode === 'MODEL_EDIT';
  const isResultView = mode === 'RESULT_VIEW';
  const isCaseConfig = mode === 'CASE_CONFIG';

  const actions: ContextMenuAction[] = [];

  // Check if element supports type_ref (P8.2)
  const supportsTypeRef =
    elementType === 'LineBranch' ||
    elementType === 'TransformerBranch' ||
    elementType === 'Switch';

  // Properties action (always available)
  actions.push({
    id: 'properties',
    label: isResultView ? 'Pokaż właściwości...' : 'Właściwości...',
    enabled: true,
    visible: true,
    handler: onOpenProperties,
  });

  // Separator after properties
  actions.push({ id: 'sep1', label: '', enabled: false, visible: true, separator: true });

  // Switch-specific actions (toggle state)
  if (elementType === 'Switch' && switchState !== undefined) {
    const stateLabel = switchState === 'CLOSED' ? 'Otwórz łącznik' : 'Zamknij łącznik';
    actions.push({
      id: 'toggle_switch',
      label: stateLabel,
      enabled: isModelEdit,
      visible: true,
      handler: onToggleSwitchState,
    });
  }

  // In service toggle (MODEL_EDIT only)
  actions.push({
    id: 'in_service',
    label: `W eksploatacji ${inService ? '[OK]' : '[ ]'}`,
    enabled: isModelEdit,
    visible: true,
    handler: onToggleInService,
  });

  // Type Library actions (P8.2) - MODEL_EDIT only
  if (supportsTypeRef && isModelEdit) {
    actions.push({ id: 'sep_type', label: '', enabled: false, visible: true, separator: true });

    // Assign or change type
    const assignLabel = hasTypeRef ? 'Zmień typ...' : 'Przypisz typ...';
    actions.push({
      id: 'assign_type',
      label: assignLabel,
      enabled: true,
      visible: true,
      handler: onAssignType,
    });

    // Clear type (only if type_ref exists)
    if (hasTypeRef) {
      actions.push({
        id: 'clear_type',
        label: 'Wyczyść typ',
        enabled: true,
        visible: true,
        handler: onClearType,
      });
    }
  }

  // Separator
  actions.push({ id: 'sep2', label: '', enabled: false, visible: true, separator: true });

  // Navigation actions (always available)
  actions.push({
    id: 'show_in_tree',
    label: 'Zaznacz w drzewie',
    enabled: true,
    visible: true,
    handler: onShowInTree,
  });

  actions.push({
    id: 'show_on_diagram',
    label: 'Pokaż na schemacie',
    enabled: true,
    visible: true,
    handler: onShowOnDiagram,
  });

  // Result-specific actions
  if (isResultView) {
    actions.push({ id: 'sep3', label: '', enabled: false, visible: true, separator: true });

    actions.push({
      id: 'results_detail',
      label: 'Pokaż szczegóły wyników',
      enabled: true,
      visible: true,
      handler: onShowResultsDetail,
    });

    actions.push({
      id: 'export_results',
      label: 'Eksportuj wyniki...',
      enabled: true,
      visible: true,
      handler: onExportResults,
    });
  }

  // Delete action (MODEL_EDIT only)
  if (isModelEdit) {
    actions.push({ id: 'sep4', label: '', enabled: false, visible: true, separator: true });

    const deleteLabel = getDeleteLabel(elementType);
    actions.push({
      id: 'delete',
      label: deleteLabel,
      enabled: true,
      visible: true,
      handler: onDelete,
    });
  }

  return actions;
}

/**
 * Get Polish delete label based on element type.
 */
function getDeleteLabel(elementType: ElementType): string {
  switch (elementType) {
    case 'Bus':
      return 'Usuń szynę...';
    case 'LineBranch':
      return 'Usuń linię...';
    case 'TransformerBranch':
      return 'Usuń transformator...';
    case 'Switch':
      return 'Usuń łącznik...';
    case 'Source':
      return 'Usuń źródło...';
    case 'Load':
      return 'Usuń odbiornik...';
    default:
      return 'Usuń element...';
  }
}

/**
 * Build context menu for Bus (Szyna).
 * Per wizard_screens.md § 4.4.
 */
export function buildBusContextMenu(
  elementId: string,
  elementName: string,
  mode: OperatingMode,
  options: Parameters<typeof buildContextMenuActions>[4] = {}
): ContextMenuAction[] {
  const baseActions = buildContextMenuActions('Bus', elementId, elementName, mode, options);

  // Add bus-specific actions for MODEL_EDIT
  if (mode === 'MODEL_EDIT') {
    const insertIndex = baseActions.findIndex((a) => a.id === 'sep2');
    if (insertIndex >= 0) {
      const connectSubmenu: ContextMenuAction[] = [
        { id: 'connect_line', label: 'Linię/kabel...', enabled: true, visible: true },
        { id: 'connect_transformer', label: 'Transformator...', enabled: true, visible: true },
        { id: 'connect_breaker', label: 'Wyłącznik...', enabled: true, visible: true },
        { id: 'connect_disconnector', label: 'Rozłącznik...', enabled: true, visible: true },
        { id: 'connect_source', label: 'Źródło...', enabled: true, visible: true },
        { id: 'connect_load', label: 'Odbiornik...', enabled: true, visible: true },
      ];

      baseActions.splice(insertIndex, 0, {
        id: 'connect',
        label: 'Podlacz do szyny',
        enabled: true,
        visible: true,
        submenu: connectSubmenu,
      });
    }
  }

  return baseActions;
}

/**
 * Build context menu for network model root.
 * Per wizard_screens.md § 4.2.
 */
export function buildNetworkModelContextMenu(
  mode: OperatingMode,
  options: {
    onAddBus?: () => void;
    onAddLine?: () => void;
    onAddTransformer?: () => void;
    onAddSwitch?: () => void;
    onAddSource?: () => void;
    onAddLoad?: () => void;
    onValidate?: () => void;
    onProperties?: () => void;
  } = {}
): ContextMenuAction[] {
  const isModelEdit = mode === 'MODEL_EDIT';

  const addSubmenu: ContextMenuAction[] = [
    { id: 'add_bus', label: 'Szynę...', enabled: isModelEdit, visible: true, handler: options.onAddBus },
    { id: 'add_line', label: 'Linię/kabel...', enabled: isModelEdit, visible: true, handler: options.onAddLine },
    { id: 'add_transformer', label: 'Transformator 2-uzwojeniowy...', enabled: isModelEdit, visible: true, handler: options.onAddTransformer },
    { id: 'add_switch', label: 'Wyłącznik...', enabled: isModelEdit, visible: true, handler: options.onAddSwitch },
    { id: 'add_source', label: 'Źródło (sieć zewnętrzna)...', enabled: isModelEdit, visible: true, handler: options.onAddSource },
    { id: 'add_load', label: 'Odbiornik...', enabled: isModelEdit, visible: true, handler: options.onAddLoad },
  ];

  return [
    {
      id: 'add',
      label: 'Dodaj',
      enabled: isModelEdit,
      visible: true,
      submenu: addSubmenu,
    },
    { id: 'sep1', label: '', enabled: false, visible: true, separator: true },
    {
      id: 'validate',
      label: 'Waliduj model sieci',
      enabled: true,
      visible: true,
      handler: options.onValidate,
    },
    { id: 'sep2', label: '', enabled: false, visible: true, separator: true },
    {
      id: 'properties',
      label: 'Właściwości modelu...',
      enabled: true,
      visible: true,
      handler: options.onProperties,
    },
  ];
}

/**
 * Get header text for context menu.
 */
export function getContextMenuHeader(
  elementType: ElementType,
  elementName: string
): string {
  const typeLabels: Record<ElementType, string> = {
    Bus: 'Szyna',
    LineBranch: 'Linia',
    TransformerBranch: 'Transformator',
    Switch: 'Lacznik',
    Source: 'Zrodlo',
    Load: 'Odbiornik',
  };

  return `${typeLabels[elementType] || elementType}: ${elementName}`;
}
