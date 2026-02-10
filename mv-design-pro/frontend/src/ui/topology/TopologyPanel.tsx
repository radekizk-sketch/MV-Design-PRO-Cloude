/**
 * TopologyPanel — główny panel edycji topologii sieci SN.
 *
 * Integruje:
 * - TopologyTreeView (widok spine/laterals)
 * - Toolbar z akcjami (dodaj węzeł/gałąź/urządzenie/zabezpieczenie)
 * - Modale (NodeModal, BranchModal, ProtectionModal, etc.)
 * - Selection sync z SLD
 *
 * BINDING: PL labels, no codenames.
 */

import React, { useCallback, useState } from 'react';
import { useTopologyStore } from './store';
import { TopologyTreeView } from './TopologyTreeView';
import {
  NodeModal,
  BranchModal,
  ProtectionModal,
  MeasurementModal,
  TransformerStationModal,
  LoadDERModal,
} from './modals';
import type { NodeFormData } from './modals/NodeModal';
import type { BranchFormData } from './modals/BranchModal';
import type { ProtectionFormData } from './modals/ProtectionModal';
import type { MeasurementFormData } from './modals/MeasurementModal';
import type { TransformerStationFormData } from './modals/TransformerStationModal';
import type { LoadDERFormData } from './modals/LoadDERModal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ModalKind =
  | 'node'
  | 'branch'
  | 'protection'
  | 'measurement'
  | 'transformer'
  | 'load_der'
  | null;

interface TopologyPanelProps {
  caseId: string;
  busOptions: Array<{ ref_id: string; name: string; voltage_kv: number }>;
  breakerOptions: Array<{ ref_id: string; name: string }>;
  ctOptions: Array<{ ref_id: string; name: string; ratio: string }>;
  vtOptions: Array<{ ref_id: string; name: string }>;
}

// ---------------------------------------------------------------------------
// Toolbar items
// ---------------------------------------------------------------------------

const TOOLBAR_ITEMS: Array<{ kind: ModalKind; label: string; icon: string }> = [
  { kind: 'node', label: 'Szyna', icon: '⬜' },
  { kind: 'branch', label: 'Gałąź', icon: '━' },
  { kind: 'transformer', label: 'Transformator', icon: '⊗' },
  { kind: 'load_der', label: 'Odbiór/OZE', icon: '▽' },
  { kind: 'measurement', label: 'Przekładnik', icon: '◎' },
  { kind: 'protection', label: 'Zabezpieczenie', icon: '⊕' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TopologyPanel({
  caseId,
  busOptions,
  breakerOptions,
  ctOptions,
  vtOptions,
}: TopologyPanelProps) {
  const { summary, loading, error, lastOpIssues, executeOp } = useTopologyStore();
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [selectedNodeRef, setSelectedNodeRef] = useState<string | null>(null);

  // Modal handlers
  const openModal = useCallback((kind: ModalKind) => setActiveModal(kind), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  const handleNodeSubmit = useCallback(
    async (data: NodeFormData) => {
      await executeOp(caseId, 'create_node', {
        ref_id: data.ref_id,
        name: data.name,
        voltage_kv: data.voltage_kv,
        zone: data.zone || undefined,
      });
      closeModal();
    },
    [caseId, executeOp, closeModal]
  );

  const handleBranchSubmit = useCallback(
    async (data: BranchFormData) => {
      await executeOp(caseId, 'create_branch', {
        ref_id: data.ref_id,
        name: data.name,
        type: data.branch_type,
        from_bus_ref: data.from_bus_ref,
        to_bus_ref: data.to_bus_ref,
        length_km: data.length_km,
        r_ohm_per_km: data.r_ohm_per_km,
        x_ohm_per_km: data.x_ohm_per_km,
        b_siemens_per_km: data.b_siemens_per_km,
        insulation: data.insulation || undefined,
        status: 'closed',
      });
      closeModal();
    },
    [caseId, executeOp, closeModal]
  );

  const handleProtectionSubmit = useCallback(
    async (data: ProtectionFormData) => {
      await executeOp(caseId, 'attach_protection', {
        ref_id: data.ref_id,
        name: data.name,
        breaker_ref: data.breaker_ref,
        ct_ref: data.ct_ref || undefined,
        vt_ref: data.vt_ref || undefined,
        device_type: data.device_type,
        settings: data.settings,
      });
      closeModal();
    },
    [caseId, executeOp, closeModal]
  );

  const handleMeasurementSubmit = useCallback(
    async (data: MeasurementFormData) => {
      await executeOp(caseId, 'create_measurement', {
        ref_id: data.ref_id,
        name: data.name,
        measurement_type: data.measurement_type,
        bus_ref: data.bus_ref,
        rating: {
          ratio_primary: data.ratio_primary,
          ratio_secondary: data.ratio_secondary,
          accuracy_class: data.accuracy_class || undefined,
          burden_va: data.burden_va || undefined,
        },
        connection: data.connection,
        purpose: data.purpose,
      });
      closeModal();
    },
    [caseId, executeOp, closeModal]
  );

  const handleTransformerSubmit = useCallback(
    async (data: TransformerStationFormData) => {
      await executeOp(caseId, 'create_device', {
        device_kind: 'transformer',
        ref_id: data.ref_id,
        name: data.name,
        hv_bus_ref: data.hv_bus_ref,
        lv_bus_ref: data.lv_bus_ref,
        sn_mva: data.sn_mva,
        uhv_kv: data.uhv_kv,
        ulv_kv: data.ulv_kv,
        uk_percent: data.uk_percent,
        pk_kw: data.pk_kw,
        p0_kw: data.p0_kw || undefined,
        i0_percent: data.i0_percent || undefined,
        vector_group: data.vector_group || undefined,
        tap_position: data.tap_position,
        tap_min: data.tap_min,
        tap_max: data.tap_max,
        tap_step_percent: data.tap_step_percent || undefined,
      });
      closeModal();
    },
    [caseId, executeOp, closeModal]
  );

  const handleLoadDERSubmit = useCallback(
    async (data: LoadDERFormData) => {
      const device_kind = data.element_kind === 'load' ? 'load' : 'generator';
      const payload: Record<string, unknown> = {
        device_kind,
        ref_id: data.ref_id,
        name: data.name,
        bus_ref: data.bus_ref,
        p_mw: data.p_mw,
        q_mvar: data.q_mvar,
      };
      if (device_kind === 'load') {
        payload.model = data.load_model;
      } else {
        payload.gen_type = data.gen_type;
        payload.limits = {
          p_min_mw: data.p_min_mw,
          p_max_mw: data.p_max_mw,
          q_min_mvar: data.q_min_mvar,
          q_max_mvar: data.q_max_mvar,
        };
      }
      await executeOp(caseId, 'create_device', payload);
      closeModal();
    },
    [caseId, executeOp, closeModal]
  );

  return (
    <div className="flex flex-col h-full" data-testid="topology-panel">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        {TOOLBAR_ITEMS.map((item) => (
          <button
            key={item.kind}
            onClick={() => openModal(item.kind)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
            title={`Dodaj: ${item.label}`}
          >
            <span className="text-sm">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Op issues banner */}
      {lastOpIssues.length > 0 && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800">
          {lastOpIssues.map((issue, i) => (
            <div key={i}>
              <span className="font-medium">[{issue.severity}]</span>{' '}
              {issue.message}
            </div>
          ))}
        </div>
      )}

      {/* Topology tree */}
      <div className="flex-1 overflow-hidden">
        <TopologyTreeView
          summary={summary}
          loading={loading}
          error={error}
          selectedNodeRef={selectedNodeRef}
          onNodeSelect={setSelectedNodeRef}
        />
      </div>

      {/* Modals */}
      <NodeModal
        isOpen={activeModal === 'node'}
        mode="create"
        onSubmit={handleNodeSubmit}
        onCancel={closeModal}
      />
      <BranchModal
        isOpen={activeModal === 'branch'}
        mode="create"
        busOptions={busOptions}
        onSubmit={handleBranchSubmit}
        onCancel={closeModal}
      />
      <ProtectionModal
        isOpen={activeModal === 'protection'}
        mode="create"
        breakerOptions={breakerOptions}
        ctOptions={ctOptions}
        vtOptions={vtOptions}
        onSubmit={handleProtectionSubmit}
        onCancel={closeModal}
      />
      <MeasurementModal
        isOpen={activeModal === 'measurement'}
        mode="create"
        busOptions={busOptions}
        onSubmit={handleMeasurementSubmit}
        onCancel={closeModal}
      />
      <TransformerStationModal
        isOpen={activeModal === 'transformer'}
        mode="create"
        busOptions={busOptions}
        onSubmit={handleTransformerSubmit}
        onCancel={closeModal}
      />
      <LoadDERModal
        isOpen={activeModal === 'load_der'}
        mode="create"
        busOptions={busOptions}
        onSubmit={handleLoadDERSubmit}
        onCancel={closeModal}
      />
    </div>
  );
}
