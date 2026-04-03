import type { SelectedElement } from '../types';
import type { CreatorTool } from '../topology/editorPalette';
import { CREATOR_TOOLS } from '../topology/editorPalette';
import type { CanonicalOpName } from '../../types/domainOps';
import { checkCatalogGate } from '../context-menu/catalogGate';
import type { CatalogNamespace } from '../context-menu/catalogGate';

export type ToolRuntimeStatus = 'DZIALA' | 'ZABLOKOWANE' | 'MAPOWANIE';

export interface InteractionContextState {
  hasSource: boolean;
  hasRing: boolean;
  activeCaseId: string | null;
}

export interface ToolStatusRow {
  tool: Exclude<CreatorTool, null>;
  canonicalOp: CanonicalOpName | null;
  status: ToolRuntimeStatus;
  reasonPl: string;
}

export interface ResolvedToolAction {
  mode: 'SELECT_ONLY' | 'DOMAIN_OP' | 'BLOCKED';
  canonicalOp: CanonicalOpName | null;
  payload: Record<string, unknown>;
  reasonPl: string | null;
  catalogRequired: boolean;
  catalogNamespace?: CatalogNamespace;
  catalogLabelPl?: string;
}

export interface InteractionTargetContext {
  kind: 'canvas' | 'element' | 'port';
  portRole?: 'TRUNK_IN' | 'TRUNK_OUT' | 'BRANCH_OUT' | 'RING' | 'NN_SOURCE';
}

const TOOL_STATUS: Record<Exclude<CreatorTool, null>, ToolRuntimeStatus> = {
  select: 'DZIALA',
  move: 'DZIALA',
  add_gpz: 'DZIALA',
  continue_trunk: 'DZIALA',
  insert_station: 'DZIALA',
  start_branch: 'DZIALA',
  connect_ring: 'DZIALA',
  set_nop: 'DZIALA',
  add_pv: 'DZIALA',
  add_bess: 'DZIALA',
  edit_properties: 'DZIALA',
  assign_catalog: 'DZIALA',
  delete_element: 'DZIALA',
};

function inferTargetRef(target: SelectedElement): string {
  return target.id;
}

function buildContinueTrunkPayload(
  ref: string,
  target: SelectedElement,
  interaction: InteractionTargetContext,
): Record<string, unknown> {
  return {
    source: 'sld_tool',
    trunk_id: ref,
    terminal_id: ref,
    from_terminal_id:
      interaction.kind === 'port' || target.type === 'Bus' || target.type === 'Source' || target.type === 'Terminal'
        ? ref
        : undefined,
  };
}

function buildInsertStationPayload(ref: string): Record<string, unknown> {
  return {
    source: 'sld_tool',
    segment_id: ref,
    segment_ref: ref,
  };
}

function buildStartBranchPayload(
  ref: string,
  _interaction: InteractionTargetContext,
): Record<string, unknown> {
  return {
    source: 'sld_tool',
    from_ref: ref,
  };
}

function buildAssignCatalogPayload(ref: string): Record<string, unknown> {
  return {
    source: 'sld_tool',
    element_ref: ref,
  };
}

export function getToolStatusTable(): ToolStatusRow[] {
  return CREATOR_TOOLS.map((tool) => {
    const status = TOOL_STATUS[tool.id];
    if (status === 'DZIALA') {
      return {
        tool: tool.id,
        canonicalOp: tool.canonicalOp,
        status,
        reasonPl: 'Narzędzie ma aktywne mapowanie na operację domenową.',
      };
    }
    if (status === 'MAPOWANIE') {
      return {
        tool: tool.id,
        canonicalOp: tool.canonicalOp,
        status,
        reasonPl: 'Narzędzie wymaga doboru namespace katalogu z kontekstu elementu.',
      };
    }
    return {
      tool: tool.id,
      canonicalOp: tool.canonicalOp,
      status,
      reasonPl: 'Narzędzie jest zablokowane w bieżącym trybie.',
    };
  });
}

export function resolveToolAction(
  tool: CreatorTool,
  target: SelectedElement,
  ctx: InteractionContextState,
  interaction: InteractionTargetContext = { kind: 'element' },
): ResolvedToolAction {
  if (!tool || tool === 'select' || tool === 'move') {
    return {
      mode: 'SELECT_ONLY',
      canonicalOp: null,
      payload: {},
      reasonPl: null,
      catalogRequired: false,
    };
  }

  if (!ctx.activeCaseId) {
    return {
      mode: 'BLOCKED',
      canonicalOp: null,
      payload: {},
      reasonPl: 'Brak aktywnego przypadku. Wybierz lub utwórz case.',
      catalogRequired: false,
    };
  }

  const def = CREATOR_TOOLS.find((item) => item.id === tool);
  if (!def || !def.canonicalOp) {
    return {
      mode: 'BLOCKED',
      canonicalOp: null,
      payload: {},
      reasonPl: 'Narzędzie nie ma przypisanej operacji domenowej.',
      catalogRequired: false,
    };
  }

  const status = TOOL_STATUS[tool];
  if (status !== 'DZIALA') {
    return {
      mode: 'BLOCKED',
      canonicalOp: def.canonicalOp,
      payload: {},
      reasonPl:
        status === 'MAPOWANIE'
          ? 'Narzędzie wymaga mapowania na katalog z kontekstu elementu.'
          : 'Narzędzie jest zablokowane w bieżącym trybie.',
      catalogRequired: false,
    };
  }

  if (def.requiresSource && !ctx.hasSource) {
    return {
      mode: 'BLOCKED',
      canonicalOp: def.canonicalOp,
      payload: {},
      reasonPl: 'Najpierw dodaj GPZ lub źródło SN.',
      catalogRequired: false,
    };
  }

  if (def.requiresRing && !ctx.hasRing) {
    return {
      mode: 'BLOCKED',
      canonicalOp: def.canonicalOp,
      payload: {},
      reasonPl: 'To narzędzie wymaga istniejącej struktury ring.',
      catalogRequired: false,
    };
  }

  const allowedTargets: Partial<Record<Exclude<CreatorTool, null>, InteractionTargetContext['kind'][]>> = {
    add_gpz: ['canvas'],
    continue_trunk: ['port', 'element'],
    insert_station: ['element'],
    start_branch: ['port'],
    connect_ring: ['port'],
    set_nop: ['element', 'port'],
    add_pv: ['port', 'element'],
    add_bess: ['port', 'element'],
    edit_properties: ['element'],
    assign_catalog: ['element'],
    delete_element: ['element', 'port'],
  };

  const allowed = allowedTargets[tool] ?? ['element'];
  if (!allowed.includes(interaction.kind)) {
    const targetLabels: Record<InteractionTargetContext['kind'], string> = {
      canvas: 'płótna',
      element: 'elementu',
      port: 'portu',
    };
    return {
      mode: 'BLOCKED',
      canonicalOp: def.canonicalOp,
      payload: {},
      reasonPl: `To narzędzie wymaga kliknięcia ${allowed.map((item) => targetLabels[item]).join(' lub ')}.`,
      catalogRequired: false,
    };
  }

  if (tool === 'start_branch' && interaction.kind === 'port' && interaction.portRole !== 'BRANCH_OUT') {
    return {
      mode: 'BLOCKED',
      canonicalOp: def.canonicalOp,
      payload: {},
      reasonPl: 'To narzędzie wymaga portu odgałęzienia BRANCH_OUT.',
      catalogRequired: false,
    };
  }

  if (
    tool === 'continue_trunk'
    && interaction.kind === 'element'
    && target.type !== 'Bus'
    && target.type !== 'Source'
    && target.type !== 'Terminal'
  ) {
    return {
      mode: 'BLOCKED',
      canonicalOp: def.canonicalOp,
      payload: {},
      reasonPl: 'Kontynuacja magistrali wymaga portu albo elementu GPZ lub szyny.',
      catalogRequired: false,
    };
  }

  if (tool === 'connect_ring' && interaction.kind === 'port' && interaction.portRole !== 'RING') {
    return {
      mode: 'BLOCKED',
      canonicalOp: def.canonicalOp,
      payload: {},
      reasonPl: 'To narzędzie wymaga portu RING.',
      catalogRequired: false,
    };
  }

  if (!def.requiresSldContext) {
    const gate = checkCatalogGate(def.canonicalOp);
    return {
      mode: 'DOMAIN_OP',
      canonicalOp: def.canonicalOp,
      payload: { source: 'sld_tool' },
      reasonPl: null,
      catalogRequired: gate.required,
      catalogNamespace: gate.namespace,
      catalogLabelPl: gate.label,
    };
  }

  const targetRef = inferTargetRef(target);
  const payloadBuilders: Record<
    Exclude<CreatorTool, null>,
    (
      ref: string,
      currentTarget: SelectedElement,
      currentInteraction: InteractionTargetContext,
    ) => Record<string, unknown>
  > = {
    select: () => ({}),
    move: () => ({}),
    add_gpz: () => ({ source: 'sld_tool' }),
    continue_trunk: (ref, currentTarget, currentInteraction) => (
      buildContinueTrunkPayload(ref, currentTarget, currentInteraction)
    ),
    insert_station: (ref) => buildInsertStationPayload(ref),
    start_branch: (ref, _currentTarget, currentInteraction) => (
      buildStartBranchPayload(ref, currentInteraction)
    ),
    connect_ring: (ref, currentTarget) => ({
      source: 'sld_tool',
      terminalA_id: ref,
      terminal_a_id: ref,
      terminalA_label: currentTarget.name ?? ref,
    }),
    set_nop: (ref, currentTarget, currentInteraction) => ({
      source: 'sld_tool',
      ...(currentInteraction.kind === 'port' ? { switch_ref: ref } : { segment_ref: ref }),
      element_ref: ref,
      element_name: currentTarget.name ?? ref,
    }),
    add_pv: (ref) => ({ source: 'sld_tool', element_ref: ref, station_ref: ref, node_ref: ref }),
    add_bess: (ref) => ({ source: 'sld_tool', element_ref: ref, station_ref: ref, node_ref: ref }),
    edit_properties: (ref, currentTarget) => ({
      source: 'sld_tool',
      element_ref: ref,
      element_name: currentTarget.name ?? ref,
    }),
    assign_catalog: (ref) => buildAssignCatalogPayload(ref),
    delete_element: (ref) => ({ element_ref: ref }),
  };

  const gate = checkCatalogGate(def.canonicalOp);
  return {
    mode: 'DOMAIN_OP',
    canonicalOp: def.canonicalOp,
    payload: payloadBuilders[tool](targetRef, target, interaction),
    reasonPl: null,
    catalogRequired: gate.required,
    catalogNamespace: gate.namespace,
    catalogLabelPl: gate.label,
  };
}
