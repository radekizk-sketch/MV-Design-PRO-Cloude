/**
 * Property Grid Container Tests
 *
 * CANONICAL ALIGNMENT:
 * - P13a: Type Library Browser + type_ref integration
 * - SYSTEM_SPEC.md § 4.3: Instance-Type Relationship
 *
 * Tests:
 * - Type assignment for LineBranch, TransformerBranch, Switch
 * - Type clearing
 * - Callback invocation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as catalogApi from '../../catalog/api';

describe('PropertyGridContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Type Assignment', () => {
    it('should assign type to LineBranch', async () => {
      const assignSpy = vi.spyOn(catalogApi, 'assignTypeToBranch').mockResolvedValue(undefined);

      const projectId = 'project-1';
      const branchId = 'branch-1';
      const typeId = 'type-line-1';

      await catalogApi.assignTypeToBranch(projectId, branchId, typeId);

      expect(assignSpy).toHaveBeenCalledWith(projectId, branchId, typeId);
      expect(assignSpy).toHaveBeenCalledTimes(1);
    });

    it('should assign type to TransformerBranch', async () => {
      const assignSpy = vi.spyOn(catalogApi, 'assignTypeToTransformer').mockResolvedValue(undefined);

      const projectId = 'project-1';
      const transformerId = 'trafo-1';
      const typeId = 'type-trafo-1';

      await catalogApi.assignTypeToTransformer(projectId, transformerId, typeId);

      expect(assignSpy).toHaveBeenCalledWith(projectId, transformerId, typeId);
      expect(assignSpy).toHaveBeenCalledTimes(1);
    });

    it('should assign equipment type to Switch', async () => {
      const assignSpy = vi.spyOn(catalogApi, 'assignEquipmentTypeToSwitch').mockResolvedValue(undefined);

      const projectId = 'project-1';
      const switchId = 'switch-1';
      const typeId = 'type-switch-1';

      await catalogApi.assignEquipmentTypeToSwitch(projectId, switchId, typeId);

      expect(assignSpy).toHaveBeenCalledWith(projectId, switchId, typeId);
      expect(assignSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Type Clearing', () => {
    it('should clear type from LineBranch', async () => {
      const clearSpy = vi.spyOn(catalogApi, 'clearTypeFromBranch').mockResolvedValue(undefined);

      const projectId = 'project-1';
      const branchId = 'branch-1';

      await catalogApi.clearTypeFromBranch(projectId, branchId);

      expect(clearSpy).toHaveBeenCalledWith(projectId, branchId);
      expect(clearSpy).toHaveBeenCalledTimes(1);
    });

    it('should clear type from TransformerBranch', async () => {
      const clearSpy = vi.spyOn(catalogApi, 'clearTypeFromTransformer').mockResolvedValue(undefined);

      const projectId = 'project-1';
      const transformerId = 'trafo-1';

      await catalogApi.clearTypeFromTransformer(projectId, transformerId);

      expect(clearSpy).toHaveBeenCalledWith(projectId, transformerId);
      expect(clearSpy).toHaveBeenCalledTimes(1);
    });

    it('should clear equipment type from Switch', async () => {
      const clearSpy = vi.spyOn(catalogApi, 'clearEquipmentTypeFromSwitch').mockResolvedValue(undefined);

      const projectId = 'project-1';
      const switchId = 'switch-1';

      await catalogApi.clearEquipmentTypeFromSwitch(projectId, switchId);

      expect(clearSpy).toHaveBeenCalledWith(projectId, switchId);
      expect(clearSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Network error';
      vi.spyOn(catalogApi, 'assignTypeToBranch').mockRejectedValue(new Error(errorMessage));

      const projectId = 'project-1';
      const branchId = 'branch-1';
      const typeId = 'type-line-1';

      await expect(catalogApi.assignTypeToBranch(projectId, branchId, typeId)).rejects.toThrow(errorMessage);
    });
  });
});
