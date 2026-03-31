import type { SelectedElement } from '../types';
import type { CreatorTool } from '../topology/editorPalette';
import { CREATOR_TOOLS } from '../topology/editorPalette';
import type { CanonicalOpName } from '../../types/domainOps';
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
import {
  DEFAULT_CABLE_BINDING,
  DEFAULT_CABLE_CATALOG_ID,
  DEFAULT_TRANSFORMER_BINDING,
  DEFAULT_TRANSFORMER_CATALOG_ID,
} from './catalogDefaults';
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs

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

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
function buildContinueTrunkPayload(
  ref: string,
  target: SelectedElement,
  interaction: InteractionTargetContext,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 120,
      name: `Odcinek ${target.name ?? ref}`,
      catalog_ref: DEFAULT_CABLE_CATALOG_ID,
      catalog_binding: DEFAULT_CABLE_BINDING,
    },
    catalog_binding: DEFAULT_CABLE_BINDING,
  };

  if (interaction.kind === 'port' || target.type === 'Bus' || target.type === 'Source') {
    payload.from_terminal_id = ref;
  }

  return payload;
}

function buildInsertStationPayload(ref: string): Record<string, unknown> {
  return {
    segment_ref: ref,
    station_type: 'B',
    insert_at: {
      mode: 'RATIO',
      value: 0.5,
    },
    station: {
      station_type: 'B',
      station_role: 'STACJA_SN_NN',
      station_name: `Stacja ${ref}`,
      sn_voltage_kv: 15,
      nn_voltage_kv: 0.4,
    },
    transformer: {
      create: true,
      transformer_catalog_ref: DEFAULT_TRANSFORMER_CATALOG_ID,
      model_type: 'DWU_UZWOJENIOWY',
      tap_changer_present: false,
      catalog_binding: DEFAULT_TRANSFORMER_BINDING,
    },
    catalog_binding: DEFAULT_TRANSFORMER_BINDING,
  };
}

function buildStartBranchPayload(
  ref: string,
  interaction: InteractionTargetContext,
): Record<string, unknown> {
  return {
    ...(interaction.kind === 'port'
      ? { from_ref: `${ref}.BRANCH` }
      : { from_bus_ref: ref }),
    segment: {
      rodzaj: 'KABEL',
      dlugosc_m: 80,
      name: `Odgałęzienie ${ref}`,
      catalog_ref: DEFAULT_CABLE_CATALOG_ID,
      catalog_binding: DEFAULT_CABLE_BINDING,
    },
    catalog_binding: DEFAULT_CABLE_BINDING,
  };
}

function buildAssignCatalogPayload(ref: string, target: SelectedElement): Record<string, unknown> {
  const isTransformer = target.type === 'TransformerBranch';
  const binding = isTransformer ? DEFAULT_TRANSFORMER_BINDING : DEFAULT_CABLE_BINDING;

  return {
    element_ref: ref,
    catalog_item_id: binding.catalog_item_id,
    catalog_namespace: binding.catalog_namespace,
    catalog_item_version: binding.catalog_item_version,
    source_mode: 'KATALOG',
  };
}

=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
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
      reasonPl: 'Narzędzie ma aktywne mapowanie na operację domenową.',
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
    };
  }

  if (!ctx.activeCaseId) {
    return {
      mode: 'BLOCKED',
      canonicalOp: null,
      payload: {},
      reasonPl: 'Brak aktywnego przypadku — wybierz lub utwórz case.',
    };
  }

  const def = CREATOR_TOOLS.find((item) => item.id === tool);
  if (!def || !def.canonicalOp) {
    return {
      mode: 'BLOCKED',
      canonicalOp: null,
      payload: {},
      reasonPl: 'Narzędzie nie ma przypisanej operacji domenowej.',
    };
  }

  const status = TOOL_STATUS[tool];
  if (status !== 'DZIALA') {
    const blockedReason = status === 'MAPOWANIE'
      ? 'Narzędzie wymaga mapowania na katalog z kontekstu elementu.'
      : 'Narzędzie jest zablokowane w bieżącym trybie.';
    return {
      mode: 'BLOCKED',
      canonicalOp: def.canonicalOp,
      payload: {},
      reasonPl: blockedReason,
    };
  }

  if (def.requiresSource && !ctx.hasSource) {
    return {
      mode: 'BLOCKED',
      canonicalOp: def.canonicalOp,
      payload: {},
      reasonPl: 'Najpierw dodaj GPZ/źródło SN.',
    };
  }

  if (def.requiresRing && !ctx.hasRing) {
    return {
      mode: 'BLOCKED',
      canonicalOp: def.canonicalOp,
      payload: {},
      reasonPl: 'To narzędzie wymaga istniejącej struktury ring.',
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
    };
  }

  if (tool === 'start_branch' && interaction.kind === 'port' && interaction.portRole !== 'BRANCH_OUT') {
    return {
      mode: 'BLOCKED',
      canonicalOp: def.canonicalOp,
      payload: {},
      reasonPl: 'To narzędzie wymaga portu odgałęzienia BRANCH_OUT.',
    };
  }
  if (tool === 'connect_ring' && interaction.kind === 'port' && interaction.portRole !== 'RING') {
    return {
      mode: 'BLOCKED',
      canonicalOp: def.canonicalOp,
      payload: {},
      reasonPl: 'To narzędzie wymaga portu RING.',
    };
  }

  if (!def.requiresSldContext) {
    return {
      mode: 'DOMAIN_OP',
      canonicalOp: def.canonicalOp,
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
      payload: tool === 'add_gpz' ? { voltage_kv: 15, sk3_mva: 250, rx_ratio: 0.1 } : {},
=======
      payload: tool === 'add_gpz' ? { voltage_kv: 15, sn_mva: 250 } : {},
>>>>>>> theirs
=======
      payload: tool === 'add_gpz' ? { voltage_kv: 15, sn_mva: 250 } : {},
>>>>>>> theirs
=======
      payload: tool === 'add_gpz' ? { voltage_kv: 15, sn_mva: 250 } : {},
>>>>>>> theirs
=======
      payload: tool === 'add_gpz' ? { voltage_kv: 15, sn_mva: 250 } : {},
>>>>>>> theirs
=======
      payload: tool === 'add_gpz' ? { voltage_kv: 15, sn_mva: 250 } : {},
>>>>>>> theirs
      reasonPl: null,
    };
  }

  const targetRef = inferTargetRef(target);

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
  const payloadBuilders: Record<
    Exclude<CreatorTool, null>,
    (ref: string, currentTarget: SelectedElement, currentInteraction: InteractionTargetContext) => Record<string, unknown>
  > = {
    select: () => ({}),
    move: () => ({}),
    add_gpz: () => ({ voltage_kv: 15, sk3_mva: 250, rx_ratio: 0.1 }),
    continue_trunk: (ref, currentTarget, currentInteraction) => (
      buildContinueTrunkPayload(ref, currentTarget, currentInteraction)
    ),
    insert_station: (ref) => buildInsertStationPayload(ref),
    start_branch: (ref, _currentTarget, currentInteraction) => (
      buildStartBranchPayload(ref, currentInteraction)
    ),
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
  const payloadBuilders: Record<Exclude<CreatorTool, null>, (ref: string) => Record<string, unknown>> = {
    select: () => ({}),
    move: () => ({}),
    add_gpz: () => ({ voltage_kv: 15, sn_mva: 250 }),
    continue_trunk: (ref) => ({ terminal_ref: ref, dlugosc_m: 120, rodzaj: 'KABEL' }),
    insert_station: (ref) => ({ segment_ref: ref, station_name: `Stacja ${ref}` }),
    start_branch: (ref) => ({ from_port_ref: ref, dlugosc_m: 80, rodzaj: 'KABEL' }),
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
    connect_ring: (ref) => ({ from_terminal_ref: ref, to_terminal_ref: ref }),
    set_nop: (ref) => ({ segment_ref: ref }),
    add_pv: (ref) => ({ node_ref: ref, p_kw: 50 }),
    add_bess: (ref) => ({ node_ref: ref, p_kw: 100, e_kwh: 200 }),
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    edit_properties: (ref, currentTarget) => ({
      element_ref: ref,
      parameters: {
        name: currentTarget.name ?? ref,
      },
    }),
    assign_catalog: (ref, currentTarget) => buildAssignCatalogPayload(ref, currentTarget),
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
    edit_properties: (ref) => ({ element_ref: ref, patch: {} }),
    assign_catalog: (ref) => ({
      element_ref: ref,
      catalog_item_id: `AUTO/${ref}`,
      catalog_namespace: 'AUTO',
      source_mode: 'MIGRACJA',
    }),
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
    delete_element: (ref) => ({ element_ref: ref }),
  };

  return {
    mode: 'DOMAIN_OP',
    canonicalOp: def.canonicalOp,
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    payload: payloadBuilders[tool](targetRef, target, interaction),
=======
    payload: payloadBuilders[tool](targetRef),
>>>>>>> theirs
=======
    payload: payloadBuilders[tool](targetRef),
>>>>>>> theirs
=======
    payload: payloadBuilders[tool](targetRef),
>>>>>>> theirs
=======
    payload: payloadBuilders[tool](targetRef),
>>>>>>> theirs
=======
    payload: payloadBuilders[tool](targetRef),
>>>>>>> theirs
    reasonPl: null,
  };
}
