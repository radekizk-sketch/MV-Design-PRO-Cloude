import type { SelectedElement } from '../types';
import type { CreatorTool } from '../topology/editorPalette';
import { CREATOR_TOOLS } from '../topology/editorPalette';
import type { CanonicalOpName } from '../../types/domainOps';

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
      payload: tool === 'add_gpz' ? { voltage_kv: 15, sn_mva: 250 } : {},
      reasonPl: null,
    };
  }

  const targetRef = inferTargetRef(target);

  const payloadBuilders: Record<Exclude<CreatorTool, null>, (ref: string) => Record<string, unknown>> = {
    select: () => ({}),
    move: () => ({}),
    add_gpz: () => ({ voltage_kv: 15, sn_mva: 250 }),
    continue_trunk: (ref) => ({ terminal_ref: ref, dlugosc_m: 120, rodzaj: 'KABEL' }),
    insert_station: (ref) => ({ segment_ref: ref, station_name: `Stacja ${ref}` }),
    start_branch: (ref) => ({ from_port_ref: ref, dlugosc_m: 80, rodzaj: 'KABEL' }),
    connect_ring: (ref) => ({ from_terminal_ref: ref, to_terminal_ref: ref }),
    set_nop: (ref) => ({ segment_ref: ref }),
    add_pv: (ref) => ({ node_ref: ref, p_kw: 50 }),
    add_bess: (ref) => ({ node_ref: ref, p_kw: 100, e_kwh: 200 }),
    edit_properties: (ref) => ({ element_ref: ref, patch: {} }),
    assign_catalog: (ref) => ({
      element_ref: ref,
      catalog_item_id: `AUTO/${ref}`,
      catalog_namespace: 'AUTO',
      source_mode: 'MIGRACJA',
    }),
    delete_element: (ref) => ({ element_ref: ref }),
  };

  return {
    mode: 'DOMAIN_OP',
    canonicalOp: def.canonicalOp,
    payload: payloadBuilders[tool](targetRef),
    reasonPl: null,
  };
}
