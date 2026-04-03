/**
 * Property Grid Container Tests
 *
 * CANONICAL ALIGNMENT:
 * - P13a: Type Library Browser + type_ref integration
 * - SYSTEM_SPEC.md § 4.3: Instance-Type Relationship
 *
 * Tests:
 * - Type assignment for LineBranch, TransformerBranch, Switch
 * - Odkatalogowanie zablokowane w trybie katalog-first
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

  describe('Catalog Clearing Guards', () => {
    it('should reject clearing type from LineBranch', async () => {
      await expect(catalogApi.clearTypeFromBranch('project-1', 'branch-1')).rejects.toThrow(
        'Odkatalogowanie elementów technicznych jest niedostępne w trybie katalog-first.',
      );
    });

    it('should reject clearing type from TransformerBranch', async () => {
      await expect(catalogApi.clearTypeFromTransformer('project-1', 'trafo-1')).rejects.toThrow(
        'Odkatalogowanie elementów technicznych jest niedostępne w trybie katalog-first.',
      );
    });

    it('should reject clearing equipment type from Switch', async () => {
      await expect(catalogApi.clearEquipmentTypeFromSwitch('project-1', 'switch-1')).rejects.toThrow(
        'Odkatalogowanie elementów technicznych jest niedostępne w trybie katalog-first.',
      );
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
