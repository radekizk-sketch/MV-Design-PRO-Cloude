import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TraceViewer } from '../TraceViewer';
import { generateTraceJsonl } from '../export/exportTraceJsonl';
import { generateTracePdfHtml } from '../export/exportTracePdf';
import type { ExtendedTrace } from '../../results-inspector/types';

const traceWithCatalogContext: ExtendedTrace = {
  run_id: 'run-catalog-001',
  snapshot_id: 'snapshot-catalog-001',
  input_hash: 'input-hash-001',
  catalog_context: [
    {
      element_id: 'line-001',
      element_type: 'ODCINEK_SN',
      catalog_binding: {
        catalog_namespace: 'mv_cables',
        catalog_item_id: 'cable-120',
        catalog_item_version: '2026.04',
      },
      source_catalog: {
        catalog_namespace: 'mv_cables',
        catalog_item_id: 'cable-120',
        catalog_item_version: '2026.04',
      },
      source_catalog_label: 'mv_cables:cable-120@2026.04',
      materialized_params: {
        r_ohm_per_km: 0.12,
        x_ohm_per_km: 0.08,
      },
      parameter_origin: 'OVERRIDE',
      manual_overrides: [
        {
          key: 'length_km',
          value: 1.25,
          reason: 'pomiar powykonawczy',
        },
      ],
      manual_override_count: 1,
      has_manual_overrides: true,
    },
  ],
  catalog_context_by_element: {
    'line-001': {
      element_id: 'line-001',
      element_type: 'ODCINEK_SN',
      catalog_binding: {
        catalog_namespace: 'mv_cables',
        catalog_item_id: 'cable-120',
        catalog_item_version: '2026.04',
      },
      source_catalog: {
        catalog_namespace: 'mv_cables',
        catalog_item_id: 'cable-120',
        catalog_item_version: '2026.04',
      },
      source_catalog_label: 'mv_cables:cable-120@2026.04',
    },
  },
  catalog_context_summary: {
    element_count: 1,
    by_type: { ODCINEK_SN: 1 },
    by_parameter_origin: { OVERRIDE: 1 },
    manual_override_element_count: 1,
    manual_override_count: 1,
  },
  white_box_trace: [
    {
      step: 1,
      key: 'calc_001',
      title: 'Obliczenie impedancji',
      phase: 'CALCULATION',
      element_id: 'line-001',
      source_catalog: {
        catalog_namespace: 'mv_cables',
        catalog_item_id: 'cable-120',
        catalog_item_version: '2026.04',
      },
      source_catalog_label: 'mv_cables:cable-120@2026.04',
      parameter_origin: 'OVERRIDE',
      materialized_params: {
        r_ohm_per_km: 0.12,
        x_ohm_per_km: 0.08,
      },
      manual_overrides: [
        {
          key: 'length_km',
          value: 1.25,
          reason: 'pomiar powykonawczy',
        },
      ],
      manual_override_count: 1,
      catalog_context_entry: {
        element_id: 'line-001',
        element_type: 'ODCINEK_SN',
        source_catalog: {
          catalog_namespace: 'mv_cables',
          catalog_item_id: 'cable-120',
          catalog_item_version: '2026.04',
        },
        source_catalog_label: 'mv_cables:cable-120@2026.04',
      },
      result: {
        z_thevenin_ohm: {
          value: 2.55,
          unit: 'ohm',
          label: 'Impedancja Thevenina',
        },
      },
    },
  ],
};

describe('trace catalog context export', () => {
  it('shows catalog context in TraceViewer metadata panel', () => {
    render(<TraceViewer trace={traceWithCatalogContext} />);

    expect(screen.getByText('Kontekst katalogowy')).toBeInTheDocument();
    expect(screen.getByText('line-001')).toBeInTheDocument();
    expect(
      screen.getAllByText((_, node) => node?.textContent?.includes('Pochodzenie parametrów:') ?? false).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, node) => node?.textContent?.includes('Źródło katalogowe:') ?? false).length,
    ).toBeGreaterThan(0);
  });

  it('exports full catalog context and step provenance in JSONL', () => {
    const lines = generateTraceJsonl(traceWithCatalogContext).split('\n');
    const header = JSON.parse(lines[0]);
    const stepLine = JSON.parse(lines[1]);

    expect(header.data.catalog_context_count).toBe(1);
    expect(header.data.catalog_context_summary).toMatchObject({
      manual_override_count: 1,
      manual_override_element_count: 1,
    });
    expect(header.data.catalog_context_by_element['line-001']).toMatchObject({
      source_catalog_label: 'mv_cables:cable-120@2026.04',
    });

    expect(stepLine.data.element_id).toBe('line-001');
    expect(stepLine.data.source_catalog_label).toBe('mv_cables:cable-120@2026.04');
    expect(stepLine.data.materialized_params).toMatchObject({
      r_ohm_per_km: 0.12,
    });
    expect(stepLine.data.manual_override_count).toBe(1);
  });

  it('renders source catalog, materialization and overrides in PDF html', () => {
    const html = generateTracePdfHtml(traceWithCatalogContext);

    expect(html).toContain('Kontekst katalogowy');
    expect(html).toContain('Źródło katalogowe');
    expect(html).toContain('Zmaterializowane parametry');
    expect(html).toContain('Nadpisania ręczne');
    expect(html).toContain('Element techniczny');
    expect(html).toContain('line-001');
    expect(html).toContain('cable-120');
  });
});
