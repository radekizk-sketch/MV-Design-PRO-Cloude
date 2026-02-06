/**
 * SLD Editor Utils — Eksporty
 *
 * CANONICAL ALIGNMENT:
 * - SLD_KANONICZNA_SPECYFIKACJA.md
 * - AUDYT_SLD_ETAP.md
 */

// Geometry utilities
export {
  getSymbolBoundingBox,
  getCombinedBoundingBox,
  getBoundingBoxCenter,
  alignSymbols,
  distributeSymbols,
  snapPositionToGrid,
  isPointInsideBox,
  doBoundingBoxesIntersect,
} from './geometry';

// Auto-layout (topological engine — 10/10)
export {
  computeTopologicalLayout,
  verifyDeterminism,
} from './topological-layout';

// Legacy re-exports for backward compatibility
export {
  generateAutoLayout,
  applyLayoutToSymbols,
  verifyLayoutDeterminism,
  DEFAULT_LAYOUT_CONFIG,
} from './autoLayout';
export type { AutoLayoutConfig, AutoLayoutResult } from './autoLayout';

// SLD Validator
export {
  validateSld,
  shouldBlockSave,
  getValidationSummary,
  filterIssuesBySeverity,
} from './sldValidator';
export type {
  ValidationSeverity,
  ValidationIssue,
  ValidationResult,
  ValidationOptions,
} from './sldValidator';
