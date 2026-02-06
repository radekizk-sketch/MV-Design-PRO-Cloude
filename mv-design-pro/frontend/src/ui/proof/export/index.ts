/**
 * ui/proof/export — Moduł eksportu śladu obliczeń
 *
 * Eksport śladu obliczeń do formatów:
 * - JSONL: Strukturalny format liniowy (jedna linia = jeden krok)
 * - PDF: Czytelny dokument do wydruku (client-side, bez backendu)
 *
 * BINDING:
 * - Wszystkie eksporty są read-only (nie modyfikują stanu UI)
 * - Eksport PDF używa browser print API (bez backendu)
 *
 * NOTE: Nazwy kodowe NIGDY nie są eksportowane.
 */

export {
  generateTraceJsonl,
  generateJsonlFilename,
  downloadTraceJsonl,
  type TraceJsonlLine,
  type TraceJsonlHeader,
  type TraceJsonlStep,
} from './exportTraceJsonl';

export {
  generatePdfFilename,
  exportTracePdf,
  generateTracePdfHtml,
} from './exportTracePdf';
