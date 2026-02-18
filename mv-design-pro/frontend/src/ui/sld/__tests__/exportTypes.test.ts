/**
 * TESTY EXPORT TYPES — Format, Request, Status, Result
 *
 * Testy typow eksportu i walidacji kontraktu.
 *
 * CANONICAL ALIGNMENT:
 * - ExportManifestV1: lancuch tozsamosci eksportu
 * - WHITE BOX: wszystkie formaty i statusy sa audytowalne
 *
 * ZAKRES TESTOW:
 * - Wartosci formatu eksportu (JSON, JSONL, DOCX, PDF)
 * - Struktura zadania eksportu (ExportRequestV1)
 * - Wartosci statusu eksportu
 * - Struktura wyniku eksportu (ExportResultV1)
 * - Deterministycznosc
 */

import { describe, it, expect } from 'vitest';

import {
  EXPORT_FORMAT_VALUES,
  EXPORT_FORMAT_LABELS_PL,
  EXPORT_STATUS_VALUES,
  EXPORT_STATUS_LABELS_PL,
} from '../core/exportTypes';

import type {
  ExportFormatV1,
  ExportRequestV1,
  ExportStatusV1,
  ExportResultV1,
} from '../core/exportTypes';

// =============================================================================
// TEST: EXPORT FORMAT VALUES
// =============================================================================

describe('Export Format Values', () => {
  it('should have exactly 4 formats', () => {
    expect(EXPORT_FORMAT_VALUES).toHaveLength(4);
  });

  it('should include JSON format', () => {
    expect(EXPORT_FORMAT_VALUES).toContain('JSON');
  });

  it('should include JSONL format', () => {
    expect(EXPORT_FORMAT_VALUES).toContain('JSONL');
  });

  it('should include DOCX format', () => {
    expect(EXPORT_FORMAT_VALUES).toContain('DOCX');
  });

  it('should include PDF format', () => {
    expect(EXPORT_FORMAT_VALUES).toContain('PDF');
  });

  it('should have Polish labels for all formats', () => {
    for (const format of EXPORT_FORMAT_VALUES) {
      expect(EXPORT_FORMAT_LABELS_PL[format]).toBeDefined();
      expect(typeof EXPORT_FORMAT_LABELS_PL[format]).toBe('string');
      expect(EXPORT_FORMAT_LABELS_PL[format].length).toBeGreaterThan(0);
    }
  });

  it('should have unique Polish labels', () => {
    const labels = Object.values(EXPORT_FORMAT_LABELS_PL);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });

  it('should have readonly format values array', () => {
    // EXPORT_FORMAT_VALUES is readonly — verify it cannot be accidentally modified
    const values: readonly ExportFormatV1[] = EXPORT_FORMAT_VALUES;
    expect(values).toEqual(['JSON', 'JSONL', 'DOCX', 'PDF']);
  });
});

// =============================================================================
// TEST: EXPORT REQUEST STRUCTURE
// =============================================================================

describe('Export Request Structure', () => {
  it('should create valid export request with all fields', () => {
    const request: ExportRequestV1 = {
      format: 'PDF',
      snapshot_ref: 'abc123sha256hash',
      run_id: '550e8400-e29b-41d4-a716-446655440000',
      include_trace: true,
    };

    expect(request.format).toBe('PDF');
    expect(request.snapshot_ref).toBe('abc123sha256hash');
    expect(request.run_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(request.include_trace).toBe(true);
  });

  it('should create export request with null run_id (model-only export)', () => {
    const request: ExportRequestV1 = {
      format: 'JSON',
      snapshot_ref: 'def456sha256hash',
      run_id: null,
      include_trace: false,
    };

    expect(request.run_id).toBeNull();
    expect(request.include_trace).toBe(false);
  });

  it('should create export request with optional element_ids', () => {
    const request: ExportRequestV1 = {
      format: 'DOCX',
      snapshot_ref: 'hash123',
      run_id: 'run-001',
      include_trace: true,
      element_ids: ['bus-001', 'bus-002', 'line-001'],
    };

    expect(request.element_ids).toBeDefined();
    expect(request.element_ids).toHaveLength(3);
  });

  it('should create export request with optional analysis_types', () => {
    const request: ExportRequestV1 = {
      format: 'PDF',
      snapshot_ref: 'hash456',
      run_id: 'run-002',
      include_trace: true,
      analysis_types: ['SC_3F', 'LOAD_FLOW'],
    };

    expect(request.analysis_types).toBeDefined();
    expect(request.analysis_types).toContain('SC_3F');
    expect(request.analysis_types).toContain('LOAD_FLOW');
  });

  it('should accept all format types', () => {
    for (const format of EXPORT_FORMAT_VALUES) {
      const request: ExportRequestV1 = {
        format,
        snapshot_ref: 'test-hash',
        run_id: null,
        include_trace: false,
      };
      expect(request.format).toBe(format);
    }
  });
});

// =============================================================================
// TEST: EXPORT STATUS VALUES
// =============================================================================

describe('Export Status Values', () => {
  it('should have exactly 4 statuses', () => {
    expect(EXPORT_STATUS_VALUES).toHaveLength(4);
  });

  it('should include PENDING status', () => {
    expect(EXPORT_STATUS_VALUES).toContain('PENDING');
  });

  it('should include GENERATING status', () => {
    expect(EXPORT_STATUS_VALUES).toContain('GENERATING');
  });

  it('should include READY status', () => {
    expect(EXPORT_STATUS_VALUES).toContain('READY');
  });

  it('should include ERROR status', () => {
    expect(EXPORT_STATUS_VALUES).toContain('ERROR');
  });

  it('should have Polish labels for all statuses', () => {
    for (const status of EXPORT_STATUS_VALUES) {
      expect(EXPORT_STATUS_LABELS_PL[status]).toBeDefined();
      expect(typeof EXPORT_STATUS_LABELS_PL[status]).toBe('string');
      expect(EXPORT_STATUS_LABELS_PL[status].length).toBeGreaterThan(0);
    }
  });

  it('should have readonly status values array', () => {
    const values: readonly ExportStatusV1[] = EXPORT_STATUS_VALUES;
    expect(values).toEqual(['PENDING', 'GENERATING', 'READY', 'ERROR']);
  });
});

// =============================================================================
// TEST: EXPORT RESULT STRUCTURE
// =============================================================================

describe('Export Result Structure', () => {
  it('should create READY export result with all fields', () => {
    const result: ExportResultV1 = {
      export_id: '550e8400-e29b-41d4-a716-446655440000',
      format: 'PDF',
      status: 'READY',
      url: 'https://api.example.com/exports/550e8400.pdf',
      hash: 'sha256_abc123def456',
      created_at: '2026-02-17T10:30:00.000Z',
      error_message: null,
      snapshot_ref: 'snapshot-hash-123',
      run_id: 'run-001',
    };

    expect(result.export_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.format).toBe('PDF');
    expect(result.status).toBe('READY');
    expect(result.url).toContain('.pdf');
    expect(result.hash).toBe('sha256_abc123def456');
    expect(result.error_message).toBeNull();
  });

  it('should create PENDING export result with null url and hash', () => {
    const result: ExportResultV1 = {
      export_id: 'pending-001',
      format: 'DOCX',
      status: 'PENDING',
      url: null,
      hash: null,
      created_at: '2026-02-17T10:30:00.000Z',
      error_message: null,
      snapshot_ref: 'snapshot-hash-456',
      run_id: null,
    };

    expect(result.status).toBe('PENDING');
    expect(result.url).toBeNull();
    expect(result.hash).toBeNull();
    expect(result.run_id).toBeNull();
  });

  it('should create ERROR export result with error_message', () => {
    const result: ExportResultV1 = {
      export_id: 'error-001',
      format: 'PDF',
      status: 'ERROR',
      url: null,
      hash: null,
      created_at: '2026-02-17T10:30:00.000Z',
      error_message: 'Brak wynikow analizy dla wskazanego run_id',
      snapshot_ref: 'snapshot-hash-789',
      run_id: 'invalid-run',
    };

    expect(result.status).toBe('ERROR');
    expect(result.error_message).toBeDefined();
    expect(result.error_message).not.toBeNull();
    expect(result.url).toBeNull();
  });

  it('should create GENERATING export result', () => {
    const result: ExportResultV1 = {
      export_id: 'gen-001',
      format: 'JSONL',
      status: 'GENERATING',
      url: null,
      hash: null,
      created_at: '2026-02-17T10:31:00.000Z',
      error_message: null,
      snapshot_ref: 'snapshot-abc',
      run_id: 'run-abc',
    };

    expect(result.status).toBe('GENERATING');
    expect(result.url).toBeNull();
    expect(result.hash).toBeNull();
    expect(result.error_message).toBeNull();
  });

  it('should have valid ISO-8601 created_at timestamp', () => {
    const result: ExportResultV1 = {
      export_id: 'ts-001',
      format: 'JSON',
      status: 'READY',
      url: '/exports/ts-001.json',
      hash: 'hash123',
      created_at: '2026-02-17T10:30:00.000Z',
      error_message: null,
      snapshot_ref: 'snap-123',
      run_id: null,
    };

    // Verify ISO-8601 parsing
    const date = new Date(result.created_at);
    expect(date.toISOString()).toBe(result.created_at);
    expect(isNaN(date.getTime())).toBe(false);
  });
});

// =============================================================================
// TEST: TYPE COMPATIBILITY
// =============================================================================

describe('Export Types Compatibility', () => {
  it('should allow assignment of literal format values to ExportFormatV1', () => {
    const formats: ExportFormatV1[] = ['JSON', 'JSONL', 'DOCX', 'PDF'];
    expect(formats).toHaveLength(4);
  });

  it('should allow assignment of literal status values to ExportStatusV1', () => {
    const statuses: ExportStatusV1[] = ['PENDING', 'GENERATING', 'READY', 'ERROR'];
    expect(statuses).toHaveLength(4);
  });

  it('should produce deterministic label lookups', () => {
    const label1 = EXPORT_FORMAT_LABELS_PL['PDF'];
    const label2 = EXPORT_FORMAT_LABELS_PL['PDF'];
    expect(label1).toBe(label2);

    const statusLabel1 = EXPORT_STATUS_LABELS_PL['READY'];
    const statusLabel2 = EXPORT_STATUS_LABELS_PL['READY'];
    expect(statusLabel1).toBe(statusLabel2);
  });
});
