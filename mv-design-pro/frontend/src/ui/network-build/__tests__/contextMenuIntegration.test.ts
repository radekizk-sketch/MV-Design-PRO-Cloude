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
