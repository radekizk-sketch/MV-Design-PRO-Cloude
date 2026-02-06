/**
 * Export Trace to PDF — Eksport śladu obliczeń do formatu PDF
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Export deterministyczny, read-only
 * - SYSTEM_SPEC.md: Audit trail export
 *
 * BINDING:
 * - Eksport PDF nie wymaga backendu (client-side generation)
 * - Eksport nie modyfikuje stanu UI (pure function)
 * - Layout: sekcje + kroki, czytelny format A4
 *
 * NOTE: Nazwy kodowe NIGDY nie są używane w eksporcie.
 *
 * IMPLEMENTATION:
 * - Uses browser print API with custom print styles
 * - Generates printable HTML and triggers print dialog
 * - User can save as PDF from print dialog
 */

import type { ExtendedTrace, TraceStep, TraceValue } from '../../results-inspector/types';

// =============================================================================
// Polish Labels
// =============================================================================

const LABELS = {
  documentTitle: 'Ślad obliczeń',
  runId: 'ID wykonania',
  snapshotId: 'ID migawki',
  inputHash: 'Hash danych wejściowych',
  exportedAt: 'Data eksportu',
  totalSteps: 'Liczba kroków',
  step: 'Krok',
  formula: 'Wzór',
  inputs: 'Dane wejściowe',
  substitution: 'Podstawienie',
  result: 'Wynik',
  notes: 'Uwagi',
  phase: 'Faza',
  noData: 'Brak danych',
  readOnly: 'Dokument tylko do odczytu',
  generatedBy: 'Wygenerowano przez MV-DESIGN-PRO',
} as const;

const PHASE_LABELS: Record<string, string> = {
  INITIALIZATION: 'Inicjalizacja',
  CALCULATION: 'Obliczenia',
  AGGREGATION: 'Agregacja',
  VALIDATION: 'Walidacja',
  OUTPUT: 'Wyniki',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format value for display.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (Math.abs(value) < 0.01 && value !== 0) {
      return value.toExponential(3);
    }
    return value.toLocaleString('pl-PL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  }
  if (typeof value === 'boolean') return value ? 'Tak' : 'Nie';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const tv = value as TraceValue;
    if ('value' in tv) {
      const formatted = formatValue(tv.value);
      return tv.unit ? `${formatted} ${tv.unit}` : formatted;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get step title for display.
 */
function getStepTitle(step: TraceStep, index: number): string {
  return step.title ?? step.description ?? `Krok ${index + 1}`;
}

/**
 * Get phase label in Polish.
 */
function getPhaseLabel(phase: string | null | undefined): string {
  if (!phase) return '';
  return PHASE_LABELS[phase] ?? phase;
}

// =============================================================================
// HTML Generation
// =============================================================================

/**
 * Generate CSS styles for PDF export.
 */
function generatePdfStyles(): string {
  return `
    @media print {
      @page {
        size: A4;
        margin: 15mm;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1e293b;
      background: white;
      margin: 0;
      padding: 20px;
    }

    .header {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .header h1 {
      font-size: 18pt;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .header-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 9pt;
      color: #64748b;
    }

    .header-meta dt {
      font-weight: 600;
      color: #475569;
    }

    .header-meta dd {
      margin: 0;
      font-family: monospace;
      font-size: 8pt;
    }

    .read-only-badge {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
      margin-top: 8px;
    }

    .step {
      page-break-inside: avoid;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }

    .step-header {
      background: #f8fafc;
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
    }

    .step-header h2 {
      font-size: 12pt;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .step-header .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: #3b82f6;
      color: white;
      border-radius: 50%;
      font-size: 10pt;
      font-weight: 600;
      margin-right: 8px;
    }

    .step-header .phase {
      display: inline-block;
      background: #dbeafe;
      color: #1d4ed8;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 500;
      margin-left: 8px;
    }

    .step-content {
      padding: 16px;
    }

    .step-section {
      margin-bottom: 12px;
    }

    .step-section:last-child {
      margin-bottom: 0;
    }

    .step-section h3 {
      font-size: 9pt;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 8px 0;
    }

    .formula-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 12px;
      font-family: 'Cambria Math', 'Times New Roman', serif;
      font-size: 11pt;
      text-align: center;
      overflow-x: auto;
    }

    .values-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }

    .values-table th {
      text-align: left;
      padding: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      font-weight: 600;
      color: #475569;
    }

    .values-table td {
      padding: 8px;
      border: 1px solid #e2e8f0;
    }

    .values-table td:last-child {
      text-align: right;
      font-family: monospace;
    }

    .notes-block {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 4px;
      padding: 12px;
      font-size: 9pt;
      color: #92400e;
    }

    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
  `;
}

/**
 * Generate values table HTML.
 */
function generateValuesTable(values: Record<string, unknown> | undefined): string {
  if (!values || Object.keys(values).length === 0) {
    return `<p style="color: #94a3b8; font-style: italic;">${LABELS.noData}</p>`;
  }

  const rows = Object.entries(values)
    .map(([key, value]) => {
      return `
        <tr>
          <td>${escapeHtml(key)}</td>
          <td>${escapeHtml(formatValue(value))}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table class="values-table">
      <thead>
        <tr>
          <th>Wielkość</th>
          <th>Wartość</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Generate single step HTML.
 */
function generateStepHtml(step: TraceStep, index: number): string {
  const title = getStepTitle(step, index);
  const phaseLabel = getPhaseLabel(step.phase);

  const formulaSection = step.formula_latex
    ? `
      <div class="step-section">
        <h3>${LABELS.formula}</h3>
        <div class="formula-block">${escapeHtml(step.formula_latex)}</div>
      </div>
    `
    : '';

  const inputsSection = step.inputs
    ? `
      <div class="step-section">
        <h3>${LABELS.inputs}</h3>
        ${generateValuesTable(step.inputs)}
      </div>
    `
    : '';

  const substitutionSection = step.substitution
    ? `
      <div class="step-section">
        <h3>${LABELS.substitution}</h3>
        <div class="formula-block">${escapeHtml(step.substitution)}</div>
      </div>
    `
    : '';

  const resultSection = step.result
    ? `
      <div class="step-section">
        <h3>${LABELS.result}</h3>
        ${generateValuesTable(step.result)}
      </div>
    `
    : '';

  const notesSection = step.notes
    ? `
      <div class="step-section">
        <h3>${LABELS.notes}</h3>
        <div class="notes-block">${escapeHtml(step.notes)}</div>
      </div>
    `
    : '';

  return `
    <div class="step">
      <div class="step-header">
        <h2>
          <span class="step-number">${index + 1}</span>
          ${escapeHtml(title)}
          ${phaseLabel ? `<span class="phase">${escapeHtml(phaseLabel)}</span>` : ''}
        </h2>
      </div>
      <div class="step-content">
        ${formulaSection}
        ${inputsSection}
        ${substitutionSection}
        ${resultSection}
        ${notesSection}
      </div>
    </div>
  `;
}

/**
 * Generate complete PDF HTML document.
 */
function generatePdfHtml(trace: ExtendedTrace): string {
  const exportedAt = new Date().toLocaleString('pl-PL', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const stepsHtml = trace.white_box_trace
    .map((step, index) => generateStepHtml(step, index))
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${LABELS.documentTitle}</title>
      <style>${generatePdfStyles()}</style>
    </head>
    <body>
      <div class="header">
        <h1>${LABELS.documentTitle}</h1>
        <dl class="header-meta">
          <div>
            <dt>${LABELS.runId}:</dt>
            <dd>${escapeHtml(trace.run_id)}</dd>
          </div>
          <div>
            <dt>${LABELS.snapshotId}:</dt>
            <dd>${escapeHtml(trace.snapshot_id ?? '—')}</dd>
          </div>
          <div>
            <dt>${LABELS.inputHash}:</dt>
            <dd>${escapeHtml(trace.input_hash.slice(0, 16))}...</dd>
          </div>
          <div>
            <dt>${LABELS.totalSteps}:</dt>
            <dd>${trace.white_box_trace.length}</dd>
          </div>
          <div>
            <dt>${LABELS.exportedAt}:</dt>
            <dd>${escapeHtml(exportedAt)}</dd>
          </div>
        </dl>
        <div class="read-only-badge">${LABELS.readOnly}</div>
      </div>

      <main>
        ${stepsHtml}
      </main>

      <footer class="footer">
        ${LABELS.generatedBy}
      </footer>
    </body>
    </html>
  `;
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Generate filename for PDF export.
 *
 * @param trace - Extended trace data
 * @returns Filename string
 */
export function generatePdfFilename(trace: ExtendedTrace): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runIdShort = trace.run_id.slice(0, 8);
  return `slad_obliczen_${runIdShort}_${timestamp}.pdf`;
}

/**
 * Export trace to PDF using browser print dialog.
 * Opens a new window with printable HTML and triggers print.
 * User can save as PDF from the print dialog.
 *
 * Pure function - does not modify UI state.
 *
 * @param trace - Extended trace data
 */
export function exportTracePdf(trace: ExtendedTrace): void {
  const html = generatePdfHtml(trace);

  // Open new window with printable content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window. Please allow popups.');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    printWindow.print();
  };

  // Fallback: trigger print after short delay if onload doesn't fire
  setTimeout(() => {
    if (printWindow.document.readyState === 'complete') {
      printWindow.print();
    }
  }, 500);
}

/**
 * Generate PDF HTML content (for preview or custom handling).
 *
 * @param trace - Extended trace data
 * @returns HTML string
 */
export function generateTracePdfHtml(trace: ExtendedTrace): string {
  return generatePdfHtml(trace);
}
