/**
 * ui/proof — Moduł śladu obliczeń
 *
 * Widok "Ślad obliczeń" (read-only) dla dokumentacji audytowej.
 *
 * COMPONENTS:
 * - TraceViewer: Główny 3-panelowy widok
 * - TraceToc: Spis treści kroków (lewy panel)
 * - TraceStepView: Szczegóły kroku (środkowy panel)
 * - TraceMetadataPanel: Metadane (prawy panel)
 * - MathRenderer: Renderer LaTeX (KaTeX)
 *
 * FEATURES (v1):
 * - Deep linking URL (trace_section, trace_step)
 * - Selection → trace navigation (mapowanie)
 * - Eksport: JSONL, PDF (client-side, bez backendu)
 *
 * NOTE: Nazwy kodowe (P11, P14, P17) NIGDY nie są eksportowane ani używane w UI.
 */

// Components
export { TraceViewer, TraceViewerContainer } from './TraceViewer';
export type { SelectionToTraceMap } from './TraceViewer';
export { TraceToc } from './TraceToc';
export { TraceStepView, TraceStepViewEmpty } from './TraceStepView';
export { TraceMetadataPanel, TraceMetadataPanelEmpty } from './TraceMetadataPanel';
export { MathRenderer, MathBlock, MathInline } from './MathRenderer';
export type { MathRendererProps, MathRenderResult } from './MathRenderer';

// URL State (Deep Linking)
export {
  TRACE_URL_PARAMS,
  readTraceStateFromUrl,
  updateUrlWithTraceState,
  updateUrlWithStep,
  updateUrlWithSection,
  clearTraceStateFromUrl,
  generateTraceDeepLink,
  copyTraceDeepLink,
  parseStepIndex,
  type TraceUrlState,
} from './traceUrlState';

// Export Functions
export {
  generateTraceJsonl,
  generateJsonlFilename,
  downloadTraceJsonl,
  generatePdfFilename,
  exportTracePdf,
  generateTracePdfHtml,
} from './export';
