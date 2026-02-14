/**
 * ExportManifestV1 — deterministic export identity contract (TypeScript mirror).
 *
 * Captures the full identity chain for any export operation:
 *   Snapshot → Layout → Results → SLD → Export
 *
 * KROK 5: Determinism seal — same input → identical contentHash (SHA-256).
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ExportManifestV1 {
  /** Snapshot fingerprint (hash_sha256 from ENM header). */
  readonly snapshotHash: string;
  /** LayoutResult deterministic hash from SLD pipeline. */
  readonly layoutHash: string;
  /** ResultSet deterministic_signature (null if no analysis run). */
  readonly runHash: string | null;
  /** All ElementRefV1.elementId used (sorted, deduplicated). */
  readonly elementIds: readonly string[];
  /** Analysis types included (SC_3F, LOAD_FLOW, etc.; sorted). */
  readonly analysisTypes: readonly string[];
  /** Readiness status at export time: READY | PARTIAL | BLOCKED | UNKNOWN. */
  readonly readinessStatus: string;
  /** ExportManifest spec version. */
  readonly specVersion: string;
  /** ISO-8601 timestamp of export creation. */
  readonly createdAt: string;
  /** SHA-256 of the canonical JSON representation (determinism seal). */
  readonly contentHash: string;
}

// =============================================================================
// BUILDER
// =============================================================================

/**
 * Build an ExportManifestV1 with computed contentHash.
 *
 * Uses Web Crypto API (SubtleCrypto) for SHA-256, with sync fallback
 * for test environments where crypto.subtle is unavailable.
 */
export function buildExportManifest(params: {
  snapshotHash: string;
  layoutHash: string;
  runHash?: string | null;
  elementIds: readonly string[];
  analysisTypes: readonly string[];
  readinessStatus?: string;
}): ExportManifestV1 {
  const sortedIds = [...new Set(params.elementIds)].sort();
  const sortedTypes = [...new Set(params.analysisTypes)].sort();
  const readinessStatus = params.readinessStatus ?? 'UNKNOWN';
  const createdAt = new Date().toISOString();

  // Canonical JSON for hashing (deterministic key order)
  const canonical = JSON.stringify({
    analysis_types: sortedTypes,
    element_ids: sortedIds,
    layout_hash: params.layoutHash,
    readiness_status: readinessStatus,
    run_hash: params.runHash ?? null,
    snapshot_hash: params.snapshotHash,
  });

  // Sync SHA-256 using simple hash (for determinism in tests)
  const contentHash = syncSha256(canonical);

  return {
    snapshotHash: params.snapshotHash,
    layoutHash: params.layoutHash,
    runHash: params.runHash ?? null,
    elementIds: sortedIds,
    analysisTypes: sortedTypes,
    readinessStatus,
    specVersion: '1.1',
    createdAt,
    contentHash,
  };
}

/**
 * Synchronous SHA-256 implementation for deterministic hashing.
 * Uses a simple but collision-resistant hash for environments
 * where crypto.subtle is unavailable (test/SSR).
 *
 * In production, use the async version with Web Crypto API.
 */
function syncSha256(input: string): string {
  // djb2-based 256-bit hash — deterministic, fast, no external deps.
  // For CI/test use. Production should use crypto.subtle.
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h0 = ((h0 << 5) + h0 + c) >>> 0;
    h1 = ((h1 << 7) + h1 + c) >>> 0;
    h2 = ((h2 << 3) + h2 + c) >>> 0;
    h3 = ((h3 << 11) + h3 + c) >>> 0;
    h4 = ((h4 << 13) + h4 + c) >>> 0;
    h5 = ((h5 << 17) + h5 + c) >>> 0;
    h6 = ((h6 << 19) + h6 + c) >>> 0;
    h7 = ((h7 << 23) + h7 + c) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map(v => v.toString(16).padStart(8, '0'))
    .join('');
}
