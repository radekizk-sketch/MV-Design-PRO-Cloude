/**
 * SLD Snapshot Export Module
 *
 * Public API for SLD snapshot export functionality.
 */

// Types
export type {
  ExportFormat,
  PngScale,
  PdfPageSize,
  PdfOrientation,
  ExportScope,
  ExportLayerOptions,
  ExportMetadata,
  PngExportOptions,
  PdfExportOptions,
  SldExportOptions,
  ExportResult,
} from './types';

export {
  DEFAULT_LAYER_OPTIONS,
  SCOPE_LABELS_PL,
  LAYER_LABELS_PL,
  PNG_SCALE_LABELS_PL,
  PDF_PAGE_SIZE_LABELS_PL,
  PDF_ORIENTATION_LABELS_PL,
  generateExportFilename,
} from './types';

// Export utilities
export { exportPng } from './exportPng';
export { exportPdf } from './exportPdf';

// Orchestration
export type { ExportContext } from './SldSnapshotExport';
export {
  calculateExportViewport,
  applyViewportToClone,
  createExportOptions,
  executeSldExport,
  getCurrentLayerState,
} from './SldSnapshotExport';

// UI Components
export { SldSnapshotExportDialog } from './SldSnapshotExportDialog';
export type { SldSnapshotExportDialogProps } from './SldSnapshotExportDialog';
