/**
 * canonicalOps.ts — Canonical operation names and alias compatibility layer.
 *
 * BINDING CONTRACT — Dodatek C §1–§3
 *
 * Frontend MUST send ONLY canonical operation names to the backend.
 * This module is the SINGLE source of truth for:
 *  - canonical operation names
 *  - alias → canonical mapping
 *  - insert_at UI label → canonical mode mapping
 *  - JSON canonicalization for idempotency keys
 */

// ---------------------------------------------------------------------------
// §1 — Canonical Operation Names
// ---------------------------------------------------------------------------

/**
 * All canonical topology operation names (API level).
 * Backend accepts ONLY these names.
 */
export const CANONICAL_OPS = {
  ADD_GRID_SOURCE_SN: 'add_grid_source_sn',
  CONTINUE_TRUNK_SEGMENT_SN: 'continue_trunk_segment_sn',
  INSERT_STATION_ON_SEGMENT_SN: 'insert_station_on_segment_sn',
  START_BRANCH_SEGMENT_SN: 'start_branch_segment_sn',
  CONNECT_SECONDARY_RING_SN: 'connect_secondary_ring_sn',
  SET_NORMAL_OPEN_POINT: 'set_normal_open_point',
  ADD_TRANSFORMER_SN_NN: 'add_transformer_sn_nn',
  ASSIGN_CATALOG_TO_ELEMENT: 'assign_catalog_to_element',
  UPDATE_ELEMENT_PARAMETERS: 'update_element_parameters',
} as const;

export type CanonicalOpName = (typeof CANONICAL_OPS)[keyof typeof CANONICAL_OPS];

/** Set of all canonical names for fast lookup. */
export const CANONICAL_OP_SET: ReadonlySet<string> = new Set(
  Object.values(CANONICAL_OPS),
);

// ---------------------------------------------------------------------------
// Alias → Canonical mapping (ONE place, no duplication)
// ---------------------------------------------------------------------------

const ALIAS_MAP: Readonly<Record<string, CanonicalOpName>> = {
  // continue_trunk_segment_sn aliases
  add_trunk_segment_sn: CANONICAL_OPS.CONTINUE_TRUNK_SEGMENT_SN,
  // insert_station_on_segment_sn aliases
  insert_station_on_trunk_segment_sn: CANONICAL_OPS.INSERT_STATION_ON_SEGMENT_SN,
  insert_station_on_trunk_segment: CANONICAL_OPS.INSERT_STATION_ON_SEGMENT_SN,
  // start_branch_segment_sn aliases
  add_branch_segment_sn: CANONICAL_OPS.START_BRANCH_SEGMENT_SN,
  start_branch_from_port: CANONICAL_OPS.START_BRANCH_SEGMENT_SN,
  // connect_secondary_ring_sn aliases
  connect_ring_sn: CANONICAL_OPS.CONNECT_SECONDARY_RING_SN,
  connect_secondary_ring: CANONICAL_OPS.CONNECT_SECONDARY_RING_SN,
};

export const ALIAS_SET: ReadonlySet<string> = new Set(Object.keys(ALIAS_MAP));

/**
 * Resolve an operation name to its canonical form.
 *
 * @param name - Operation name (canonical or alias).
 * @returns Canonical operation name.
 * @throws Error if name is unknown.
 */
export function resolveOpName(name: string): CanonicalOpName {
  if (CANONICAL_OP_SET.has(name)) {
    return name as CanonicalOpName;
  }
  const resolved = ALIAS_MAP[name];
  if (resolved !== undefined) {
    return resolved;
  }
  throw new Error(
    `Unknown operation name: '${name}'. ` +
      `Canonical: [${[...CANONICAL_OP_SET].sort().join(', ')}]. ` +
      `Aliases: [${[...ALIAS_SET].sort().join(', ')}].`,
  );
}

/** Check if an operation name is in canonical form. */
export function isCanonical(name: string): name is CanonicalOpName {
  return CANONICAL_OP_SET.has(name);
}

/** Check if an operation name is a known alias. */
export function isAlias(name: string): boolean {
  return ALIAS_SET.has(name);
}

// ---------------------------------------------------------------------------
// §2 — Canonical insert_at Definition
// ---------------------------------------------------------------------------

export type InsertAtMode = 'RATIO' | 'ODLEGLOSC_OD_POCZATKU_M' | 'ANCHOR';

export interface AnchorValue {
  readonly anchor_id: string;
  readonly offset_m: number;
}

export interface InsertAt {
  readonly mode: InsertAtMode;
  readonly value: number | AnchorValue;
}

/** UI label → canonical insert_at mapping. */
type UiLabelEntry = {
  readonly mode: InsertAtMode;
  readonly fixedValue: number | null;
};

const UI_LABEL_MAP: Readonly<Record<string, UiLabelEntry>> = {
  SRODEK: { mode: 'RATIO', fixedValue: 0.5 },
  SRODEK_ODCINKA: { mode: 'RATIO', fixedValue: 0.5 },
  PODZIAL_WSPOLCZYNNIKIEM: { mode: 'RATIO', fixedValue: null },
  FRACTION: { mode: 'RATIO', fixedValue: null },
  ODLEGLOSC_OD_POCZATKU: { mode: 'ODLEGLOSC_OD_POCZATKU_M', fixedValue: null },
  ANCHOR: { mode: 'ANCHOR', fixedValue: null },
};

export const UI_INSERT_AT_LABELS: ReadonlySet<string> = new Set(
  Object.keys(UI_LABEL_MAP),
);

/**
 * Resolve a UI label to canonical InsertAt.
 *
 * @param label - UI label (e.g., "SRODEK", "FRACTION").
 * @param value - Explicit value (required for labels without fixed value).
 * @returns Canonical InsertAt object.
 * @throws Error if label unknown or value missing.
 */
export function resolveInsertAtFromUi(
  label: string,
  value?: number | AnchorValue,
): InsertAt {
  const entry = UI_LABEL_MAP[label];
  if (!entry) {
    throw new Error(
      `Unknown insert_at UI label: '${label}'. ` +
        `Known: [${[...UI_INSERT_AT_LABELS].sort().join(', ')}].`,
    );
  }
  const resolvedValue = entry.fixedValue !== null ? entry.fixedValue : value;
  if (resolvedValue === undefined || resolvedValue === null) {
    throw new Error(`UI label '${label}' requires an explicit value.`);
  }
  return { mode: entry.mode, value: resolvedValue };
}

// ---------------------------------------------------------------------------
// §3 — JSON Canonicalization
// ---------------------------------------------------------------------------

const NUMERIC_QUANTUM = 1e-6;

/**
 * Quantize a number to the specified quantum (banker's rounding).
 */
function quantizeNumber(value: number, quantum: number = NUMERIC_QUANTUM): number {
  const scaled = value / quantum;
  const rounded = Math.round(scaled); // JS Math.round (ties go to +Infinity)
  return rounded * quantum;
}

/**
 * Recursively normalize a value for canonical JSON.
 */
function normalizeValue(value: unknown, quantum: number = NUMERIC_QUANTUM): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot canonicalize ${value}`);
    }
    if (Number.isInteger(value)) return value;
    return quantizeNumber(value, quantum);
  }
  if (typeof value === 'string') return value.normalize('NFC').trim();
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, quantum));
  }
  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key.normalize('NFC').trim()] = normalizeValue(
        (value as Record<string, unknown>)[key],
        quantum,
      );
    }
    return sorted;
  }
  return value;
}

/**
 * Produce canonical JSON: sorted keys, no spaces, quantized numbers.
 * Guarantees: same logical input → identical string output.
 */
export function canonicalizeJson(
  payload: unknown,
  quantum: number = NUMERIC_QUANTUM,
): string {
  const normalized = normalizeValue(payload, quantum);
  return JSON.stringify(normalized);
}

/**
 * Strip UI-only fields before computing idempotency key.
 */
function stripUiFields(payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'pozycja_widokowa' || k === 'ui') continue;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const inner = v as Record<string, unknown>;
      const stripped: Record<string, unknown> = {};
      for (const [sk, sv] of Object.entries(inner)) {
        if (sk === 'click_id' || sk === 'timestamp_utc') continue;
        stripped[sk] = sv;
      }
      result[k] = stripUiFields(stripped);
    } else {
      result[k] = v;
    }
  }
  return result;
}

/**
 * Compute a deterministic idempotency key (SHA-256 hex, first 32 chars).
 *
 * Uses SubtleCrypto if available, falls back to simple hash.
 * Excludes UI-only fields (click_id, timestamp, pozycja_widokowa).
 */
export async function computeIdempotencyKey(
  payload: Record<string, unknown>,
  quantum: number = NUMERIC_QUANTUM,
): Promise<string> {
  const hashable = stripUiFields(payload);
  const canonical = canonicalizeJson(hashable, quantum);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);

  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 32);
  }

  // Fallback: simple FNV-1a-like hash (for SSR / test environments)
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash).toString(16).padStart(32, '0').slice(0, 32);
}

// ---------------------------------------------------------------------------
// §D.7 — Domain Event Types (station insertion)
// ---------------------------------------------------------------------------

export const STATION_INSERTION_EVENTS = [
  'SEGMENT_SPLIT',
  'CUT_NODE_CREATED',
  'STATION_CREATED',
  'PORTS_CREATED',
  'FIELDS_CREATED_SN',
  'DEVICES_CREATED_SN',
  'TR_CREATED',
  'BUS_NN_CREATED',
  'FIELDS_CREATED_NN',
  'DEVICES_CREATED_NN',
  'RECONNECTED_GRAPH',
  'LOGICAL_VIEWS_UPDATED',
] as const;

export type StationInsertionEventType = (typeof STATION_INSERTION_EVENTS)[number];
