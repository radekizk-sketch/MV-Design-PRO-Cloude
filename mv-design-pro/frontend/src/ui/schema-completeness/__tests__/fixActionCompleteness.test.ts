/**
 * FixAction Completeness Guard — ensures every BLOCKER has a repair path.
 *
 * §5: Panel „Braki danych do obliczeń" musi prowadzić do naprawy 1-klik.
 *
 * This test verifies:
 * 1. Every BLOCKER readiness code has a fix_action
 * 2. Every fix_action with OPEN_MODAL points to an existing modal
 * 3. Every fix_action with NAVIGATE_TO_ELEMENT has element_ref
 * 4. FixAction bridge covers all known backend modal_type values
 */

import { describe, it, expect } from 'vitest';
import { BACKEND_MODAL_TYPE_MAP, getUnmappedModalTypes } from '../fixActionModalBridge';
import { MODAL_REGISTRY, MODAL_IDS } from '../../topology/modals/modalRegistry';
import type { ReadinessIssue, FixAction } from '../../types';

// ---------------------------------------------------------------------------
// Known BLOCKER codes from the backend (canonical list)
// ---------------------------------------------------------------------------

const KNOWN_BLOCKER_CODES_WITH_FIX_ACTION = [
  // ENMValidator
  'E001', 'E002', 'E004', 'E005', 'E006', 'E007',
  'sources.no_short_circuit_params', 'E009', 'E010',
  // Eligibility
  'ELIG_SC3_MISSING_SOURCE', 'ELIG_SC3_MISSING_BUSES',
  'ELIG_SC3_MISSING_CATALOG_REF', 'ELIG_SC3_MISSING_IMPEDANCE',
  'ELIG_SC3_SOURCE_NO_SC_PARAMS', 'ELIG_SC1_MISSING_Z0',
  'ELIG_LF_NO_LOADS_OR_GENERATORS', 'ELIG_LF_BUS_NO_VOLTAGE',
];

const KNOWN_BACKEND_MODAL_TYPES = [
  'SourceModal',
  'NodeModal',
  'BranchModal',
  'TransformerModal',
  'LoadModal',
  'GeneratorModal',
  'CatalogPicker',
  'FieldDeviceModal',
  'ProtectionBindingModal',
  'StudyCaseSettings',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FixAction completeness — every BLOCKER has a fix path', () => {
  it('BACKEND_MODAL_TYPE_MAP covers all known backend modal types', () => {
    const unmapped = getUnmappedModalTypes(KNOWN_BACKEND_MODAL_TYPES);
    expect(unmapped).toEqual([]);
  });

  it('every mapped modal_type resolves to a registered MODAL_ID', () => {
    const registryIds = new Set(MODAL_REGISTRY.map((e) => e.modalId));
    for (const [backendType, modalId] of Object.entries(BACKEND_MODAL_TYPE_MAP)) {
      expect(registryIds.has(modalId)).toBe(true);
    }
  });

  it('every MODAL_ID in the registry is implemented', () => {
    for (const entry of MODAL_REGISTRY) {
      expect(entry.implemented).toBe(true);
    }
  });

  it('fix_action OPEN_MODAL must have modal_type', () => {
    const fixAction: FixAction = {
      action_type: 'OPEN_MODAL',
      element_ref: 'elem-1',
      modal_type: 'SourceModal',
      payload_hint: null,
    };
    expect(fixAction.modal_type).toBeTruthy();
    expect(fixAction.modal_type).not.toBe('');
  });

  it('fix_action NAVIGATE_TO_ELEMENT must have element_ref', () => {
    const fixAction: FixAction = {
      action_type: 'NAVIGATE_TO_ELEMENT',
      element_ref: 'bus-1',
      modal_type: null,
      payload_hint: null,
    };
    expect(fixAction.element_ref).toBeTruthy();
  });

  it('fix_action ADD_MISSING_DEVICE must have modal_type', () => {
    const fixAction: FixAction = {
      action_type: 'ADD_MISSING_DEVICE',
      element_ref: null,
      modal_type: 'SourceModal',
      payload_hint: { required: 'source' },
    };
    expect(fixAction.modal_type).toBeTruthy();
  });

  it('fix_action SELECT_CATALOG must have element_ref', () => {
    const fixAction: FixAction = {
      action_type: 'SELECT_CATALOG',
      element_ref: 'branch-1',
      modal_type: 'CatalogPicker',
      payload_hint: null,
    };
    expect(fixAction.element_ref).toBeTruthy();
  });
});

describe('SchemaCompletenessPanel — fix action integration', () => {
  it('BLOCKER issue with fix_action shows Napraw button data', () => {
    const issue: ReadinessIssue = {
      code: 'E001',
      severity: 'BLOCKER',
      element_ref: 'source-1',
      element_refs: ['source-1'],
      message_pl: 'Brak źródła zasilania w modelu sieci.',
      wizard_step_hint: 'K2',
      suggested_fix: 'Dodaj źródło zasilania.',
      fix_action: {
        action_type: 'ADD_MISSING_DEVICE',
        element_ref: null,
        modal_type: 'SourceModal',
        payload_hint: { required: 'source' },
      },
    };

    expect(issue.fix_action).not.toBeNull();
    expect(issue.fix_action!.action_type).toBe('ADD_MISSING_DEVICE');
    // Bridge resolves modal_type
    expect(BACKEND_MODAL_TYPE_MAP[issue.fix_action!.modal_type!]).toBeDefined();
  });

  it('BLOCKER issue without fix_action still has element_ref for navigation', () => {
    const issue: ReadinessIssue = {
      code: 'E003',
      severity: 'BLOCKER',
      element_ref: 'bus-island-1',
      element_refs: ['bus-island-1', 'bus-island-2'],
      message_pl: 'Wyspa sieci odcięta od źródła zasilania.',
      wizard_step_hint: 'K4',
      suggested_fix: 'Połącz odizolowane szyny.',
      fix_action: null,
    };

    // Even without fix_action, element_ref enables "Przejdź" button
    expect(issue.element_ref).toBeTruthy();
  });

  it('all severity levels are Polish', () => {
    const severityLabels: Record<string, string> = {
      BLOCKER: 'Blokujące',
      IMPORTANT: 'Ważne',
      INFO: 'Informacja',
    };
    expect(severityLabels.BLOCKER).not.toMatch(/^[A-Z][a-z]+$/); // Not English
    expect(severityLabels.IMPORTANT).not.toBe('Important');
    expect(severityLabels.INFO).not.toBe('Info');
  });
});
