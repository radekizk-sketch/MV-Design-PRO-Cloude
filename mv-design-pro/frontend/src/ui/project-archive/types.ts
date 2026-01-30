/**
 * Project Archive Types — P31
 *
 * Typy dla eksportu i importu projektów.
 */

// =============================================================================
// Import Status
// =============================================================================

export type ImportStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

// =============================================================================
// Archive Summary (podgląd zawartości)
// =============================================================================

export interface ArchiveSummary {
  nodes_count: number;
  branches_count: number;
  sources_count: number;
  loads_count: number;
  snapshots_count: number;
  sld_diagrams_count: number;
  study_cases_count: number;
  operating_cases_count: number;
  analysis_runs_count: number;
  study_runs_count: number;
  results_count: number;
  proofs_count: number;
}

// =============================================================================
// Preview Response
// =============================================================================

export interface ArchivePreviewResponse {
  valid: boolean;
  error?: string;
  format_id?: string;
  schema_version?: string;
  project_name?: string;
  project_description?: string;
  exported_at?: string;
  archive_hash?: string;
  summary?: ArchiveSummary;
}

// =============================================================================
// Import Response
// =============================================================================

export interface ImportResponse {
  status: ImportStatus;
  project_id: string | null;
  warnings: string[];
  errors: string[];
  migrated_from_version: string | null;
}

// =============================================================================
// Dialog State
// =============================================================================

export type ArchiveDialogMode = 'closed' | 'export' | 'import' | 'preview';

export interface ArchiveDialogState {
  mode: ArchiveDialogMode;
  loading: boolean;
  error: string | null;
  preview: ArchivePreviewResponse | null;
  importResult: ImportResponse | null;
}
