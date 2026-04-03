/**
 * Context Menu Integration — testy mapowania elementów na menu kontekstowe.
 *
 * Weryfikuje:
 * - Każdy obsługiwany ElementType zwraca niepustą listę akcji
 * - Nieobsługiwane typy zwracają null
 * - Handlery są prawidłowo wstrzykiwane
 * - Etykiety nagłówków są w języku polskim
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildContextMenuForElement,
  getContextMenuTitle,
} from '../contextMenuIntegration';
import type { ContextMenuRequest, ContextMenuHandlers } from '../contextMenuIntegration';
import type { ElementType } from '../../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRequest(
  elementType: ElementType,
  mode: 'MODEL_EDIT' | 'CASE_CONFIG' | 'RESULT_VIEW' = 'MODEL_EDIT',
): ContextMenuRequest {
  return {
    elementId: 'test-id-001',
    elementType,
    elementName: 'Element testowy',
    mode,
  };
}

function makeHandlers(): ContextMenuHandlers {
  return {
    onOpenOperationForm: vi.fn(),
    onOpenObjectCard: vi.fn(),
    onSelectElement: vi.fn(),
    onCenterOnElement: vi.fn(),
    onDeleteElement: vi.fn(),
    onCatalogRequired: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildContextMenuForElement', () => {
  const supportedTypes: ElementType[] = [
    'Source',
    'Bus',
    'Station',
    'BaySN',
    'Switch',
    'TransformerBranch',
    'LineBranch',
    'BusNN',
    'PVInverter',
    'BESSInverter',
    'Load',
    'FeederNN',
    'SwitchNN',
    'NOP',
    'Relay',
    'Measurement',
    'Genset',
    'UPS',
    'EnergyMeter',
    'EnergyStorage',
    'SourceFieldNN',
  ];

  it.each(supportedTypes)('returns non-empty actions for %s', (elementType) => {
    const req = makeRequest(elementType);
    const handlers = makeHandlers();
    const result = buildContextMenuForElement(req, handlers);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThan(0);
  });

  it('returns null for unsupported element types', () => {
    const req = makeRequest('DescriptiveElement');
    const handlers = makeHandlers();
    const result = buildContextMenuForElement(req, handlers);
    expect(result).toBeNull();
  });

  it('wires handlers correctly for Source in MODEL_EDIT', () => {
    const req = makeRequest('Source', 'MODEL_EDIT');
    const handlers = makeHandlers();
    const result = buildContextMenuForElement(req, handlers)!;

    // Find properties action and trigger it
    const propsAction = result.find((a) => a.id === 'properties');
    expect(propsAction).toBeDefined();
    propsAction!.handler?.();
    expect(handlers.onOpenObjectCard).toHaveBeenCalledWith('source', 'test-id-001');
  });

  it('kieruje add_line do bramki katalogowej z kanonicznym from_ref', () => {
    const req = makeRequest('Bus', 'MODEL_EDIT');
    const handlers = makeHandlers();
    const result = buildContextMenuForElement(req, handlers)!;

    const addLineAction = result.find((action) => action.id === 'add_line');
    expect(addLineAction).toBeDefined();

    addLineAction!.handler?.();
    expect(handlers.onCatalogRequired).toHaveBeenCalledWith({
      operationId: 'start_branch_segment_sn',
      elementId: 'test-id-001',
      elementType: 'Bus',
      namespace: 'KABEL_SN',
      label: 'Kabel/linia SN',
      initialFormData: {
        from_ref: 'test-id-001',
      },
    });
  });

  it('kieruje add_ct do bramki katalogowej bez zgadywania assign_catalog', () => {
    const req = makeRequest('Bus', 'MODEL_EDIT');
    const handlers = makeHandlers();
    const result = buildContextMenuForElement(req, handlers)!;

    const addCtAction = result.find((action) => action.id === 'add_ct');
    expect(addCtAction).toBeDefined();

    addCtAction!.handler?.();
    expect(handlers.onCatalogRequired).toHaveBeenCalledWith({
      operationId: 'add_ct',
      elementId: 'test-id-001',
      elementType: 'Bus',
      namespace: 'CT',
      label: 'Przekladnik pradowy',
      initialFormData: {
        element_ref: 'test-id-001',
      },
    });
    expect(handlers.onOpenOperationForm).not.toHaveBeenCalledWith(
      'assign_catalog_to_element',
      expect.anything(),
    );
  });
});

describe('getContextMenuTitle', () => {
  it('returns Polish label for Source', () => {
    const title = getContextMenuTitle('Source', 'GPZ Główna');
    expect(title).toBe('Źródło zasilania: GPZ Główna');
  });

  it('returns Polish label for TransformerBranch', () => {
    const title = getContextMenuTitle('TransformerBranch', 'TR1');
    expect(title).toBe('Transformator: TR1');
  });

  it('falls back to ElementType for unknown types', () => {
    const title = getContextMenuTitle('DescriptiveElement', 'Test');
    expect(title).toBe('DescriptiveElement: Test');
  });
});
