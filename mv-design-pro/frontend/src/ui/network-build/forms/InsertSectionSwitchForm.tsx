/**
 * InsertSectionSwitchForm — formularz wstawiania łącznika sekcyjnego.
 *
 * Wrapper inline nad SectionSwitchModal z ui/topology/modals/.
 * Integruje się z snapshotStore.executeDomainOperation + networkBuildStore.
 *
 * BINDING: 100% PL etykiety.
 */

import { useCallback } from 'react';
import {
  SectionSwitchModal,
  type SectionSwitchFormData,
} from '../../topology/modals/SectionSwitchModal';
import { useSnapshotStore } from '../../topology/snapshotStore';
import { useNetworkBuildStore } from '../networkBuildStore';
import { useAppStateStore } from '../../app-state';

export function InsertSectionSwitchForm() {
  const context = useNetworkBuildStore((s) => s.activeOperationForm?.context);
  const closeForm = useNetworkBuildStore((s) => s.closeOperationForm);
  const executeDomainOperation = useSnapshotStore((s) => s.executeDomainOperation);
  const activeCaseId = useAppStateStore((s) => s.activeCaseId);

  const segmentRef = (context?.segmentRef as string) ?? '';
  const segmentLabel = (context?.segmentLabel as string) ?? segmentRef;

  const handleSubmit = useCallback(
    async (data: SectionSwitchFormData) => {
      if (!activeCaseId) return;
      await executeDomainOperation(activeCaseId, 'insert_section_switch_sn', {
        ref_id: data.ref_id,
        name: data.name,
        switch_kind: data.switch_kind,
        switch_state: data.switch_state,
        segment_ref: data.segment_ref,
        position_on_segment: data.position_on_segment,
        catalog_binding: data.catalog_binding,
      });
      closeForm();
    },
    [activeCaseId, executeDomainOperation, closeForm],
  );

  return (
    <div className="h-full overflow-y-auto" data-testid="insert-section-switch-form">
      <SectionSwitchModal
        isOpen={true}
        segmentRef={segmentRef}
        segmentLabel={segmentLabel}
        onSubmit={handleSubmit}
        onCancel={closeForm}
      />
    </div>
  );
}
