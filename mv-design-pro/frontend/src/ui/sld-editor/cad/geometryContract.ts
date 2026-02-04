/**
 * CAD Geometry Contract — SLD
 *
 * Kanoniczny kontrakt danych dla geometrii CAD w SLD:
 * - tryby AUTO / CAD / HYBRID
 * - override geometrii (nodes/edges/labels)
 * - deterministyczna serializacja
 * - audyt statusu względem fingerprintu
 */

import type { Position } from '../types';

export type GeometryMode = 'AUTO' | 'CAD' | 'HYBRID';

export type CadOverridesStatus = 'VALID' | 'STALE' | 'CONFLICT';

export type NodeId = string;
export type EdgeId = string;
export type LabelId = string;

export interface CadNodeOverride {
  pos: Position;
  locked?: boolean;
}

export interface CadEdgeOverride {
  bends?: Position[];
  routeStyle?: 'I' | 'L' | 'Z';
}

export interface CadLabelOverride {
  anchor?: Position;
  offset?: { dx: number; dy: number };
}

export interface CadOverridesDocument {
  schemaVersion: 1;
  mode: GeometryMode;
  baseFingerprint: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
  notes?: string;
  nodes: Record<NodeId, CadNodeOverride>;
  edges: Record<EdgeId, CadEdgeOverride>;
  labels?: Record<LabelId, CadLabelOverride>;
}

export interface SldGeometryNode {
  pos: Position;
  locked?: boolean;
}

export interface SldGeometryEdge {
  bends?: Position[];
  routeStyle?: 'I' | 'L' | 'Z';
}

export interface SldGeometryLabel {
  anchor?: Position;
  offset?: { dx: number; dy: number };
}

export interface SldGeometry {
  nodes: Record<NodeId, SldGeometryNode>;
  edges: Record<EdgeId, SldGeometryEdge>;
  labels?: Record<LabelId, SldGeometryLabel>;
}

export interface CadOverridesIssue {
  code: 'MISSING_NODE' | 'MISSING_EDGE' | 'MISSING_LABEL' | 'INVALID_NUMBER';
  message: string;
  referenceId?: string;
}

export interface CadOverridesStatusReport {
  status: CadOverridesStatus;
  issues: CadOverridesIssue[];
}

export interface CadOverridesIdSet {
  nodes: Iterable<NodeId>;
  edges: Iterable<EdgeId>;
  labels?: Iterable<LabelId>;
}

function sortRecordKeys<T>(record: Record<string, T>): Record<string, T> {
  return Object.keys(record)
    .sort()
    .reduce<Record<string, T>>((acc, key) => {
      acc[key] = record[key];
      return acc;
    }, {});
}

function isFiniteNumber(value: number | undefined): boolean {
  if (value === undefined) return true;
  return Number.isFinite(value);
}

function normalizeCadOverridesDocument(doc: CadOverridesDocument): CadOverridesDocument {
  const normalized: CadOverridesDocument = {
    schemaVersion: doc.schemaVersion,
    mode: doc.mode,
    baseFingerprint: doc.baseFingerprint,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    nodes: sortRecordKeys(doc.nodes),
    edges: sortRecordKeys(doc.edges),
  };

  if (doc.author) {
    normalized.author = doc.author;
  }

  if (doc.notes) {
    normalized.notes = doc.notes;
  }

  if (doc.labels) {
    normalized.labels = sortRecordKeys(doc.labels);
  }

  return normalized;
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, sortDeep(val)] as const);
    return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = val;
      return acc;
    }, {});
  }
  return value;
}

export function serializeCadOverridesDocument(doc: CadOverridesDocument): string {
  const normalized = normalizeCadOverridesDocument(doc);
  const sorted = sortDeep(normalized);
  return JSON.stringify(sorted);
}

export function evaluateCadOverridesStatus(
  baseFingerprintCurrent: string,
  baseFingerprintStored: string,
  doc: CadOverridesDocument,
  currentGraphIds: CadOverridesIdSet
): CadOverridesStatusReport {
  const issues: CadOverridesIssue[] = [];
  const nodeIds = new Set(currentGraphIds.nodes);
  const edgeIds = new Set(currentGraphIds.edges);
  const labelIds = new Set(currentGraphIds.labels ?? []);

  for (const [nodeId, override] of Object.entries(doc.nodes)) {
    if (!nodeIds.has(nodeId)) {
      issues.push({
        code: 'MISSING_NODE',
        message: `Brak wezla dla nodeId=${nodeId}`,
        referenceId: nodeId,
      });
      continue;
    }
    if (!isFiniteNumber(override.pos.x) || !isFiniteNumber(override.pos.y)) {
      issues.push({
        code: 'INVALID_NUMBER',
        message: `Nieprawidlowe wspolrzedne wezla ${nodeId}`,
        referenceId: nodeId,
      });
    }
  }

  for (const [edgeId, override] of Object.entries(doc.edges)) {
    if (!edgeIds.has(edgeId)) {
      issues.push({
        code: 'MISSING_EDGE',
        message: `Brak krawedzi dla edgeId=${edgeId}`,
        referenceId: edgeId,
      });
      continue;
    }
    if (override.bends) {
      for (const [index, point] of override.bends.entries()) {
        if (!isFiniteNumber(point.x) || !isFiniteNumber(point.y)) {
          issues.push({
            code: 'INVALID_NUMBER',
            message: `Nieprawidlowe wspolrzedne bendu ${edgeId}#${index}`,
            referenceId: edgeId,
          });
          break;
        }
      }
    }
  }

  if (doc.labels) {
    for (const [labelId, override] of Object.entries(doc.labels)) {
      if (!labelIds.has(labelId)) {
        issues.push({
          code: 'MISSING_LABEL',
          message: `Brak etykiety dla labelId=${labelId}`,
          referenceId: labelId,
        });
        continue;
      }
      if (override.anchor) {
        if (!isFiniteNumber(override.anchor.x) || !isFiniteNumber(override.anchor.y)) {
          issues.push({
            code: 'INVALID_NUMBER',
            message: `Nieprawidlowe wspolrzedne etykiety ${labelId}`,
            referenceId: labelId,
          });
        }
      }
      if (override.offset) {
        if (!isFiniteNumber(override.offset.dx) || !isFiniteNumber(override.offset.dy)) {
          issues.push({
            code: 'INVALID_NUMBER',
            message: `Nieprawidlowy offset etykiety ${labelId}`,
            referenceId: labelId,
          });
        }
      }
    }
  }

  if (issues.length > 0) {
    return { status: 'CONFLICT', issues };
  }

  if (baseFingerprintCurrent !== baseFingerprintStored) {
    return { status: 'STALE', issues };
  }

  return { status: 'VALID', issues };
}

function applyNodeOverrides(
  baseNodes: Record<NodeId, SldGeometryNode>,
  overrides: Record<NodeId, CadNodeOverride>
): Record<NodeId, SldGeometryNode> {
  const result: Record<NodeId, SldGeometryNode> = { ...baseNodes };
  for (const [nodeId, override] of Object.entries(overrides)) {
    if (!result[nodeId]) continue;
    result[nodeId] = {
      ...result[nodeId],
      pos: { x: override.pos.x, y: override.pos.y },
      locked: override.locked ?? result[nodeId].locked,
    };
  }
  return result;
}

function applyEdgeOverrides(
  baseEdges: Record<EdgeId, SldGeometryEdge>,
  overrides: Record<EdgeId, CadEdgeOverride>
): Record<EdgeId, SldGeometryEdge> {
  const result: Record<EdgeId, SldGeometryEdge> = { ...baseEdges };
  for (const [edgeId, override] of Object.entries(overrides)) {
    if (!result[edgeId]) continue;
    result[edgeId] = {
      ...result[edgeId],
      bends: override.bends ? [...override.bends] : result[edgeId].bends,
      routeStyle: override.routeStyle ?? result[edgeId].routeStyle,
    };
  }
  return result;
}

function applyLabelOverrides(
  baseLabels: Record<LabelId, SldGeometryLabel> | undefined,
  overrides: Record<LabelId, CadLabelOverride> | undefined
): Record<LabelId, SldGeometryLabel> | undefined {
  if (!baseLabels) return baseLabels;
  if (!overrides) return baseLabels;
  const result: Record<LabelId, SldGeometryLabel> = { ...baseLabels };
  for (const [labelId, override] of Object.entries(overrides)) {
    if (!result[labelId]) continue;
    result[labelId] = {
      ...result[labelId],
      anchor: override.anchor ? { x: override.anchor.x, y: override.anchor.y } : result[labelId].anchor,
      offset: override.offset
        ? { dx: override.offset.dx, dy: override.offset.dy }
        : result[labelId].offset,
    };
  }
  return result;
}

export function applyGeometryMode(autoGeometry: SldGeometry, cadDoc: CadOverridesDocument | null): SldGeometry {
  if (!cadDoc || cadDoc.mode === 'AUTO') {
    return autoGeometry;
  }

  const nodes = applyNodeOverrides(autoGeometry.nodes, cadDoc.nodes);
  const edges = applyEdgeOverrides(autoGeometry.edges, cadDoc.edges);
  const labels = applyLabelOverrides(autoGeometry.labels, cadDoc.labels);

  return {
    nodes,
    edges,
    labels,
  };
}
