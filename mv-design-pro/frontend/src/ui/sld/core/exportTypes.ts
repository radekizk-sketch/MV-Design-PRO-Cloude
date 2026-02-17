/**
 * Export Types — Canonical export format and request/result contracts.
 *
 * Defines the export pipeline types for generating project documentation
 * in various formats (JSON, JSONL, DOCX, PDF).
 *
 * CANONICAL ALIGNMENT:
 * - ExportManifestV1: identity seal (snapshot → export chain)
 * - WHITE BOX: export includes full trace when requested
 */

// =============================================================================
// EXPORT FORMAT
// =============================================================================

/**
 * Supported export output formats.
 */
export type ExportFormatV1 = 'JSON' | 'JSONL' | 'DOCX' | 'PDF';

/**
 * All valid export format values (for runtime validation).
 */
export const EXPORT_FORMAT_VALUES: readonly ExportFormatV1[] = [
  'JSON',
  'JSONL',
  'DOCX',
  'PDF',
] as const;

/**
 * Polish labels for export formats.
 */
export const EXPORT_FORMAT_LABELS_PL: Record<ExportFormatV1, string> = {
  JSON: 'JSON (dane surowe)',
  JSONL: 'JSONL (linia po linii)',
  DOCX: 'DOCX (dokument Word)',
  PDF: 'PDF (dokument)',
};

// =============================================================================
// EXPORT REQUEST
// =============================================================================

/**
 * Export request — specifies what to export and in what format.
 */
export interface ExportRequestV1 {
  /** Desired output format. */
  readonly format: ExportFormatV1;
  /** Snapshot reference (ENM hash_sha256). */
  readonly snapshot_ref: string;
  /** Analysis run ID (UUID) — null if exporting model only. */
  readonly run_id: string | null;
  /** Include full calculation trace in export. */
  readonly include_trace: boolean;
  /** Optional: specific element IDs to include (null = all). */
  readonly element_ids?: readonly string[] | null;
  /** Optional: analysis types to include (null = all available). */
  readonly analysis_types?: readonly string[] | null;
}

// =============================================================================
// EXPORT STATUS
// =============================================================================

/**
 * Export generation status.
 */
export type ExportStatusV1 = 'PENDING' | 'GENERATING' | 'READY' | 'ERROR';

/**
 * All valid export status values (for runtime validation).
 */
export const EXPORT_STATUS_VALUES: readonly ExportStatusV1[] = [
  'PENDING',
  'GENERATING',
  'READY',
  'ERROR',
] as const;

/**
 * Polish labels for export status.
 */
export const EXPORT_STATUS_LABELS_PL: Record<ExportStatusV1, string> = {
  PENDING: 'Oczekuje',
  GENERATING: 'Generowanie...',
  READY: 'Gotowy',
  ERROR: 'Blad',
};

// =============================================================================
// EXPORT RESULT
// =============================================================================

/**
 * Export result — metadata for a completed (or failed) export.
 */
export interface ExportResultV1 {
  /** Unique export identifier (UUID). */
  readonly export_id: string;
  /** Output format used. */
  readonly format: ExportFormatV1;
  /** Current export status. */
  readonly status: ExportStatusV1;
  /** Download URL (null until READY). */
  readonly url: string | null;
  /** SHA-256 hash of the export file content (null until READY). */
  readonly hash: string | null;
  /** ISO-8601 timestamp of export creation. */
  readonly created_at: string;
  /** Error message (null unless status is ERROR). */
  readonly error_message: string | null;
  /** Snapshot reference used for this export. */
  readonly snapshot_ref: string;
  /** Run ID used for this export (null if model-only). */
  readonly run_id: string | null;
}
