/**
 * P30e: Field Definitions Tests (Context-Aware Property Grid)
 *
 * Test mode-specific field filtering and editability:
 * - MODEL_EDIT: konstrukcyjne pola (edytowalne instance fields)
 * - CASE_CONFIG: wariantowe pola (tylko wybrane pola edytowalne)
 * - RESULT_VIEW: wynikowe pola (100% READ-ONLY)
 */

import { describe, it, expect } from 'vitest';
import { getFieldDefinitionsForMode } from '../field-definitions';
import type { ElementType, OperatingMode } from '../../types';

describe('P30e: field-definitions (mode-aware)', () => {
  describe('getFieldDefinitionsForMode', () => {
    describe('MODEL_EDIT mode', () => {
      const mode: OperatingMode = 'MODEL_EDIT';

      it('Bus: includes identification, state, electrical_params, nameplate, audit', () => {
        const sections = getFieldDefinitionsForMode('Bus', mode);
        const sectionIds = sections.map((s) => s.id);

        expect(sectionIds).toContain('identification');
        expect(sectionIds).toContain('state');
        expect(sectionIds).toContain('electrical_params');
        expect(sectionIds).toContain('nameplate');
        expect(sectionIds).toContain('audit');
      });

      it('Bus: excludes calculated section (not relevant in MODEL_EDIT)', () => {
        const sections = getFieldDefinitionsForMode('Bus', mode);
        const sectionIds = sections.map((s) => s.id);

        expect(sectionIds).not.toContain('calculated');
      });

      it('Bus: name field is editable', () => {
        const sections = getFieldDefinitionsForMode('Bus', mode);
        const nameField = sections
          .find((s) => s.id === 'identification')
          ?.fields.find((f) => f.key === 'name');

        expect(nameField).toBeDefined();
        expect(nameField?.editable).toBe(true);
      });

      it('Bus: id and uuid fields are read-only', () => {
        const sections = getFieldDefinitionsForMode('Bus', mode);
        const identSection = sections.find((s) => s.id === 'identification');

        const idField = identSection?.fields.find((f) => f.key === 'id');
        const uuidField = identSection?.fields.find((f) => f.key === 'uuid');

        expect(idField?.editable).toBe(false);
        expect(uuidField?.editable).toBe(false);
      });

      it('Bus: audit fields are read-only', () => {
        const sections = getFieldDefinitionsForMode('Bus', mode);
        const auditSection = sections.find((s) => s.id === 'audit');

        expect(auditSection).toBeDefined();
        const allReadOnly = auditSection?.fields.every((f) => !f.editable);
        expect(allReadOnly).toBe(true);
      });

      it('LineBranch: includes topology, type_reference, type_params, local_params', () => {
        const sections = getFieldDefinitionsForMode('LineBranch', mode);
        const sectionIds = sections.map((s) => s.id);

        expect(sectionIds).toContain('topology');
        expect(sectionIds).toContain('type_reference');
        expect(sectionIds).toContain('type_params');
        expect(sectionIds).toContain('local_params');
      });

      it('LineBranch: type_params are read-only (source: type)', () => {
        const sections = getFieldDefinitionsForMode('LineBranch', mode);
        const typeParamsSection = sections.find((s) => s.id === 'type_params');

        expect(typeParamsSection).toBeDefined();
        const allReadOnly = typeParamsSection?.fields.every((f) => !f.editable);
        expect(allReadOnly).toBe(true);
      });

      it('LineBranch: local_params are editable (branch_type, length_km)', () => {
        const sections = getFieldDefinitionsForMode('LineBranch', mode);
        const localParamsSection = sections.find((s) => s.id === 'local_params');

        const branchTypeField = localParamsSection?.fields.find((f) => f.key === 'branch_type');
        const lengthField = localParamsSection?.fields.find((f) => f.key === 'length_km');

        expect(branchTypeField?.editable).toBe(true);
        expect(lengthField?.editable).toBe(true);
      });

      it('TransformerBranch: tap_position is editable', () => {
        const sections = getFieldDefinitionsForMode('TransformerBranch', mode);
        const localParamsSection = sections.find((s) => s.id === 'local_params');

        const tapField = localParamsSection?.fields.find((f) => f.key === 'tap_position');
        expect(tapField?.editable).toBe(true);
      });

      it('Switch: state (OPEN/CLOSED) is editable in MODEL_EDIT', () => {
        const sections = getFieldDefinitionsForMode('Switch', mode);
        const stateSection = sections.find((s) => s.id === 'state');

        const stateField = stateSection?.fields.find((f) => f.key === 'state');
        expect(stateField?.editable).toBe(true);
      });

      it('Load: electrical_params (p_mw, q_mvar, cos_phi) are editable', () => {
        const sections = getFieldDefinitionsForMode('Load', mode);
        const electricalSection = sections.find((s) => s.id === 'electrical_params');

        const pField = electricalSection?.fields.find((f) => f.key === 'p_mw');
        const qField = electricalSection?.fields.find((f) => f.key === 'q_mvar');
        const cosPhiField = electricalSection?.fields.find((f) => f.key === 'cos_phi');

        expect(pField?.editable).toBe(true);
        expect(qField?.editable).toBe(true);
        expect(cosPhiField?.editable).toBe(true);
      });

      it('Source: short_circuit params are editable', () => {
        const sections = getFieldDefinitionsForMode('Source', mode);
        const shortCircuitSection = sections.find((s) => s.id === 'short_circuit');

        const skField = shortCircuitSection?.fields.find((f) => f.key === 'sk_mva');
        const rxField = shortCircuitSection?.fields.find((f) => f.key === 'rx_ratio');

        expect(skField?.editable).toBe(true);
        expect(rxField?.editable).toBe(true);
      });
    });

    describe('CASE_CONFIG mode', () => {
      const mode: OperatingMode = 'CASE_CONFIG';

      it('Bus: includes identification, state, topology', () => {
        const sections = getFieldDefinitionsForMode('Bus', mode);
        const sectionIds = sections.map((s) => s.id);

        expect(sectionIds).toContain('identification');
        expect(sectionIds).toContain('state');
        expect(sectionIds).toContain('topology');
      });

      it('Bus: excludes audit and calculated sections', () => {
        const sections = getFieldDefinitionsForMode('Bus', mode);
        const sectionIds = sections.map((s) => s.id);

        expect(sectionIds).not.toContain('audit');
        expect(sectionIds).not.toContain('calculated');
      });

      it('Bus: only in_service is editable', () => {
        const sections = getFieldDefinitionsForMode('Bus', mode);
        const stateSection = sections.find((s) => s.id === 'state');

        const inServiceField = stateSection?.fields.find((f) => f.key === 'in_service');
        const lifecycleField = stateSection?.fields.find((f) => f.key === 'lifecycle_state');

        expect(inServiceField?.editable).toBe(true);
        expect(lifecycleField?.editable).toBe(false);
      });

      it('Bus: name is read-only', () => {
        const sections = getFieldDefinitionsForMode('Bus', mode);
        const nameField = sections
          .find((s) => s.id === 'identification')
          ?.fields.find((f) => f.key === 'name');

        expect(nameField?.editable).toBe(false);
      });

      it('Switch: state (OPEN/CLOSED) is editable', () => {
        const sections = getFieldDefinitionsForMode('Switch', mode);
        const stateSection = sections.find((s) => s.id === 'state');

        const stateField = stateSection?.fields.find((f) => f.key === 'state');
        expect(stateField?.editable).toBe(true);
      });

      it('TransformerBranch: tap_position is editable', () => {
        const sections = getFieldDefinitionsForMode('TransformerBranch', mode);
        const localParamsSection = sections.find((s) => s.id === 'local_params');

        const tapField = localParamsSection?.fields.find((f) => f.key === 'tap_position');
        expect(tapField?.editable).toBe(true);
      });

      it('Load: p_mw and q_mvar are editable (wariantowe parametry)', () => {
        const sections = getFieldDefinitionsForMode('Load', mode);
        const electricalSection = sections.find((s) => s.id === 'electrical_params');

        const pField = electricalSection?.fields.find((f) => f.key === 'p_mw');
        const qField = electricalSection?.fields.find((f) => f.key === 'q_mvar');

        expect(pField?.editable).toBe(true);
        expect(qField?.editable).toBe(true);
      });

      it('Source: sk_mva and rx_ratio are editable (wariantowe parametry)', () => {
        const sections = getFieldDefinitionsForMode('Source', mode);
        const shortCircuitSection = sections.find((s) => s.id === 'short_circuit');

        const skField = shortCircuitSection?.fields.find((f) => f.key === 'sk_mva');
        const rxField = shortCircuitSection?.fields.find((f) => f.key === 'rx_ratio');

        expect(skField?.editable).toBe(true);
        expect(rxField?.editable).toBe(true);
      });

      it('LineBranch: in_service is editable, length_km is read-only', () => {
        const sections = getFieldDefinitionsForMode('LineBranch', mode);

        const inServiceField = sections
          .find((s) => s.id === 'state')
          ?.fields.find((f) => f.key === 'in_service');

        const lengthField = sections
          .find((s) => s.id === 'local_params')
          ?.fields.find((f) => f.key === 'length_km');

        expect(inServiceField?.editable).toBe(true);
        expect(lengthField?.editable).toBe(false);
      });
    });

    describe('RESULT_VIEW mode', () => {
      const mode: OperatingMode = 'RESULT_VIEW';

      it('Bus: includes identification, state, electrical_params, calculated', () => {
        const sections = getFieldDefinitionsForMode('Bus', mode);
        const sectionIds = sections.map((s) => s.id);

        expect(sectionIds).toContain('identification');
        expect(sectionIds).toContain('state');
        expect(sectionIds).toContain('electrical_params');
        expect(sectionIds).toContain('calculated');
      });

      it('Bus: excludes audit and nameplate sections', () => {
        const sections = getFieldDefinitionsForMode('Bus', mode);
        const sectionIds = sections.map((s) => s.id);

        expect(sectionIds).not.toContain('audit');
        expect(sectionIds).not.toContain('nameplate');
      });

      it('Bus: ALL fields are read-only (100%)', () => {
        const sections = getFieldDefinitionsForMode('Bus', mode);
        const allFields = sections.flatMap((s) => s.fields);

        const allReadOnly = allFields.every((f) => !f.editable);
        expect(allReadOnly).toBe(true);
        expect(allFields.length).toBeGreaterThan(0);
      });

      it('LineBranch: ALL fields are read-only', () => {
        const sections = getFieldDefinitionsForMode('LineBranch', mode);
        const allFields = sections.flatMap((s) => s.fields);

        const allReadOnly = allFields.every((f) => !f.editable);
        expect(allReadOnly).toBe(true);
      });

      it('TransformerBranch: ALL fields are read-only (including tap_position)', () => {
        const sections = getFieldDefinitionsForMode('TransformerBranch', mode);
        const allFields = sections.flatMap((s) => s.fields);

        const allReadOnly = allFields.every((f) => !f.editable);
        expect(allReadOnly).toBe(true);

        // Verify tap_position specifically
        const tapField = sections
          .find((s) => s.id === 'local_params')
          ?.fields.find((f) => f.key === 'tap_position');

        expect(tapField?.editable).toBe(false);
      });

      it('Switch: state (OPEN/CLOSED) is read-only', () => {
        const sections = getFieldDefinitionsForMode('Switch', mode);
        const stateField = sections
          .find((s) => s.id === 'state')
          ?.fields.find((f) => f.key === 'state');

        expect(stateField?.editable).toBe(false);
      });

      it('Load: ALL fields are read-only (p_mw, q_mvar, etc.)', () => {
        const sections = getFieldDefinitionsForMode('Load', mode);
        const allFields = sections.flatMap((s) => s.fields);

        const allReadOnly = allFields.every((f) => !f.editable);
        expect(allReadOnly).toBe(true);
      });

      it('Source: ALL fields are read-only', () => {
        const sections = getFieldDefinitionsForMode('Source', mode);
        const allFields = sections.flatMap((s) => s.fields);

        const allReadOnly = allFields.every((f) => !f.editable);
        expect(allReadOnly).toBe(true);
      });

      it('LineBranch: includes calculated fields (loading_percent, i_calculated_a)', () => {
        const sections = getFieldDefinitionsForMode('LineBranch', mode);
        const calculatedSection = sections.find((s) => s.id === 'calculated');

        expect(calculatedSection).toBeDefined();

        const loadingField = calculatedSection?.fields.find((f) => f.key === 'loading_percent');
        const currentField = calculatedSection?.fields.find((f) => f.key === 'i_calculated_a');

        expect(loadingField).toBeDefined();
        expect(currentField).toBeDefined();
        expect(loadingField?.editable).toBe(false);
        expect(currentField?.editable).toBe(false);
      });

      it('Bus: includes calculated fields (u_calculated, ikss_ka)', () => {
        const sections = getFieldDefinitionsForMode('Bus', mode);
        const calculatedSection = sections.find((s) => s.id === 'calculated');

        expect(calculatedSection).toBeDefined();

        const uField = calculatedSection?.fields.find((f) => f.key === 'u_calculated');
        const ikField = calculatedSection?.fields.find((f) => f.key === 'ikss_ka');

        expect(uField).toBeDefined();
        expect(ikField).toBeDefined();
        expect(uField?.editable).toBe(false);
        expect(ikField?.editable).toBe(false);
      });
    });

    describe('Determinism: same inputs → same outputs', () => {
      it('MODEL_EDIT: Bus fields are always in same order', () => {
        const sections1 = getFieldDefinitionsForMode('Bus', 'MODEL_EDIT');
        const sections2 = getFieldDefinitionsForMode('Bus', 'MODEL_EDIT');

        expect(sections1).toEqual(sections2);
      });

      it('CASE_CONFIG: LineBranch fields are always in same order', () => {
        const sections1 = getFieldDefinitionsForMode('LineBranch', 'CASE_CONFIG');
        const sections2 = getFieldDefinitionsForMode('LineBranch', 'CASE_CONFIG');

        expect(sections1).toEqual(sections2);
      });

      it('RESULT_VIEW: Load fields are always in same order', () => {
        const sections1 = getFieldDefinitionsForMode('Load', 'RESULT_VIEW');
        const sections2 = getFieldDefinitionsForMode('Load', 'RESULT_VIEW');

        expect(sections1).toEqual(sections2);
      });
    });

    describe('Cross-mode validation', () => {
      it('Same object in 3 modes: different field sets', () => {
        const modelEdit = getFieldDefinitionsForMode('Bus', 'MODEL_EDIT');
        const caseConfig = getFieldDefinitionsForMode('Bus', 'CASE_CONFIG');
        const resultView = getFieldDefinitionsForMode('Bus', 'RESULT_VIEW');

        const modelSections = modelEdit.map((s) => s.id);
        const caseSections = caseConfig.map((s) => s.id);
        const resultSections = resultView.map((s) => s.id);

        // Different sections
        expect(modelSections).not.toEqual(caseSections);
        expect(modelSections).not.toEqual(resultSections);
        expect(caseSections).not.toEqual(resultSections);

        // MODEL_EDIT has audit, CASE_CONFIG does not
        expect(modelSections).toContain('audit');
        expect(caseSections).not.toContain('audit');

        // RESULT_VIEW has calculated, MODEL_EDIT does not
        expect(resultSections).toContain('calculated');
        expect(modelSections).not.toContain('calculated');
      });

      it('RESULT_VIEW always has 100% read-only, regardless of element type', () => {
        const elementTypes: ElementType[] = [
          'Bus',
          'LineBranch',
          'TransformerBranch',
          'Switch',
          'Source',
          'Load',
        ];

        for (const type of elementTypes) {
          const sections = getFieldDefinitionsForMode(type, 'RESULT_VIEW');
          const allFields = sections.flatMap((s) => s.fields);
          const allReadOnly = allFields.every((f) => !f.editable);

          expect(allReadOnly).toBe(true);
        }
      });
    });
  });
});
