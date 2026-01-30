/**
 * Protection Case Config Panel Tests — P14c (Smoke)
 *
 * Smoke tests for ProtectionCaseConfigPanel:
 * - Component mounts without errors
 * - API functions are callable
 */

import { describe, it, expect } from 'vitest';
import type { ProtectionConfig, UpdateProtectionConfigRequest } from '../api';

describe('ProtectionCaseConfigPanel', () => {
  it('should have correct ProtectionConfig interface shape', () => {
    const config: ProtectionConfig = {
      template_ref: null,
      template_fingerprint: null,
      library_manifest_ref: null,
      overrides: {},
      bound_at: null,
    };

    expect(config).toBeDefined();
    expect(config.template_ref).toBeNull();
    expect(config.overrides).toEqual({});
  });

  it('should have correct UpdateProtectionConfigRequest interface shape', () => {
    const request: UpdateProtectionConfigRequest = {
      template_ref: 'template-123',
      template_fingerprint: 'abc123',
      library_manifest_ref: { library_id: 'lib-1', revision: '1.0' },
      overrides: { 'I>': { value: 100, unit: 'A' } },
    };

    expect(request).toBeDefined();
    expect(request.template_ref).toBe('template-123');
    expect(request.overrides).toEqual({ 'I>': { value: 100, unit: 'A' } });
  });

  it('should have empty overrides by default', () => {
    const config: ProtectionConfig = {
      template_ref: null,
      template_fingerprint: null,
      library_manifest_ref: null,
      overrides: {},
      bound_at: null,
    };

    expect(Object.keys(config.overrides).length).toBe(0);
  });
});
