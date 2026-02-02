/**
 * Reference Patterns API Client — Wzorce odniesienia
 *
 * READ-ONLY API client for running and viewing reference pattern validations.
 * All endpoints are read-only (patterns are INTERPRETATION layer).
 */

import type {
  PatternListResponse,
  FixtureListResponse,
  PatternRunResult,
} from './types';

const API_BASE = '/api/reference-patterns';

/**
 * Fetch list of available reference patterns.
 */
export async function fetchPatterns(): Promise<PatternListResponse> {
  const response = await fetch(`${API_BASE}/patterns`);
  if (!response.ok) {
    throw new Error(`Nie udało się pobrać listy wzorców: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch list of fixtures (test cases) for a pattern.
 */
export async function fetchPatternFixtures(patternId: string): Promise<FixtureListResponse> {
  const response = await fetch(`${API_BASE}/patterns/${encodeURIComponent(patternId)}/fixtures`);
  if (!response.ok) {
    throw new Error(`Nie udało się pobrać listy przypadków: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Run a pattern with a specific fixture file.
 */
export async function runPatternWithFixture(fixtureFile: string): Promise<PatternRunResult> {
  const response = await fetch(`${API_BASE}/fixtures/${encodeURIComponent(fixtureFile)}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Błąd wykonania wzorca: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Run a pattern (POST endpoint).
 */
export async function runPattern(
  patternId: string,
  fixtureFile?: string,
  inputOverride?: Record<string, unknown>
): Promise<PatternRunResult> {
  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pattern_id: patternId,
      fixture_file: fixtureFile,
      input_override: inputOverride,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Błąd wykonania wzorca: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// Export Functions — PDF and DOCX
// =============================================================================

/**
 * Download a blob as a file.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export reference pattern result to PDF.
 *
 * @param fixtureFile - Fixture filename (e.g., "case_A_zgodne.json")
 * @returns Promise that resolves when download starts
 */
export async function exportPatternToPdf(fixtureFile: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/fixtures/${encodeURIComponent(fixtureFile)}/export/pdf`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Nie udało się pobrać raportu PDF: ${response.statusText}`
    );
  }

  const blob = await response.blob();

  // Extract filename from Content-Disposition header or generate default
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = `wzorzec_odniesienia_${fixtureFile.replace('.json', '')}.pdf`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match) {
      filename = match[1];
    }
  }

  downloadBlob(blob, filename);
}

/**
 * Export reference pattern result to DOCX.
 *
 * @param fixtureFile - Fixture filename (e.g., "case_A_zgodne.json")
 * @returns Promise that resolves when download starts
 */
export async function exportPatternToDocx(fixtureFile: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/fixtures/${encodeURIComponent(fixtureFile)}/export/docx`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Nie udało się pobrać raportu DOCX: ${response.statusText}`
    );
  }

  const blob = await response.blob();

  // Extract filename from Content-Disposition header or generate default
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = `wzorzec_odniesienia_${fixtureFile.replace('.json', '')}.docx`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match) {
      filename = match[1];
    }
  }

  downloadBlob(blob, filename);
}
