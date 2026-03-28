/**
 * Card Analysis Results — testy sekcji wyników analizy w kartach.
 *
 * Weryfikuje:
 * - Sekcja wyników pojawia się TYLKO w RESULT_VIEW
 * - Pola wyników mają prawidłowe jednostki
 * - Bilans mocy NnSwitchgearCard jest prawidłowy
 * - Rola w sieci LineSegmentCard jest prawidłowa
 */

import { describe, it, expect } from 'vitest';
import type { CardSection } from '../cards/ObjectCard';

// ---------------------------------------------------------------------------
// Helpers — simulate card section building logic
// ---------------------------------------------------------------------------

function buildAnalysisSectionForSource(activeMode: string): CardSection | null {
  if (activeMode !== 'RESULT_VIEW') return null;
  return {
    id: 'analysis',
    label: 'Wyniki analizy',
    fields: [
      { key: 'p_gen', label: 'Moc czynna P', value: null, unit: 'MW', source: 'calculated' },
      { key: 'q_gen', label: 'Moc bierna Q', value: null, unit: 'Mvar', source: 'calculated' },
      { key: 'i_source', label: 'Prąd zasilania I', value: null, unit: 'A', source: 'calculated' },
      { key: 'ik3_contribution', label: 'Wkład Ik₃', value: null, unit: 'kA', source: 'calculated' },
      { key: 'no_results', label: 'Status', value: 'Brak wyników — uruchom analizę', severity: 'warning' },
    ],
  };
}

function buildPowerBalance(totalGenMw: number, totalLoadMw: number): CardSection {
  const balanceMw = totalGenMw - totalLoadMw;
  return {
    id: 'bilans',
    label: 'Bilans mocy',
    fields: [
      { key: 'total_gen', label: 'Generacja P_gen', value: totalGenMw * 1000, unit: 'kW', source: 'calculated' },
      { key: 'total_load', label: 'Obciążenie P_load', value: totalLoadMw * 1000, unit: 'kW', source: 'calculated' },
      {
        key: 'balance',
        label: 'Nadwyżka / Deficyt',
        value: balanceMw * 1000,
        unit: 'kW',
        source: 'calculated',
        severity: balanceMw > 0 ? 'warning' : 'ok',
      },
    ],
  };
}

interface LogicalViews {
  trunks?: Array<{ segment_ids?: string[] }>;
  branches?: Array<{ segment_ids?: string[] }>;
  secondary_connectors?: Array<{ segment_ids?: string[] }>;
}

function deriveRole(elementId: string, logicalViews: LogicalViews | null): string {
  if (!logicalViews) return '—';
  const isTrunk = logicalViews.trunks?.some((t) => t.segment_ids?.includes(elementId));
  const isBranch = logicalViews.branches?.some((br) => br.segment_ids?.includes(elementId));
  const isSecondary = logicalViews.secondary_connectors?.some((sc) => sc.segment_ids?.includes(elementId));
  if (isTrunk) return 'Magistrala';
  if (isBranch) return 'Odgałęzienie';
  if (isSecondary) return 'Połączenie pierścieniowe';
  return '—';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('analysis section visibility', () => {
  it('returns null for MODEL_EDIT mode', () => {
    expect(buildAnalysisSectionForSource('MODEL_EDIT')).toBeNull();
  });

  it('returns section for RESULT_VIEW mode', () => {
    const section = buildAnalysisSectionForSource('RESULT_VIEW');
    expect(section).not.toBeNull();
    expect(section!.id).toBe('analysis');
    expect(section!.label).toBe('Wyniki analizy');
  });

  it('returns null for CASE_CONFIG mode', () => {
    expect(buildAnalysisSectionForSource('CASE_CONFIG')).toBeNull();
  });

  it('analysis section has correct field units', () => {
    const section = buildAnalysisSectionForSource('RESULT_VIEW')!;
    const pField = section.fields.find((f) => f.key === 'p_gen');
    expect(pField?.unit).toBe('MW');
    const ikField = section.fields.find((f) => f.key === 'ik3_contribution');
    expect(ikField?.unit).toBe('kA');
  });

  it('analysis section fields are source=calculated', () => {
    const section = buildAnalysisSectionForSource('RESULT_VIEW')!;
    const calcFields = section.fields.filter((f) => f.source === 'calculated');
    expect(calcFields.length).toBe(4);
  });
});

describe('NnSwitchgearCard power balance', () => {
  it('computes positive balance when gen > load', () => {
    const section = buildPowerBalance(0.1, 0.05); // 100kW gen, 50kW load
    const balanceField = section.fields.find((f) => f.key === 'balance');
    expect(balanceField?.value).toBe(50); // 50 kW surplus
    expect(balanceField?.severity).toBe('warning');
  });

  it('computes negative balance when load > gen', () => {
    const section = buildPowerBalance(0.05, 0.1); // 50kW gen, 100kW load
    const balanceField = section.fields.find((f) => f.key === 'balance');
    expect(balanceField?.value).toBe(-50); // -50 kW deficit
    expect(balanceField?.severity).toBe('ok');
  });

  it('computes zero balance when gen === load', () => {
    const section = buildPowerBalance(0.1, 0.1);
    const balanceField = section.fields.find((f) => f.key === 'balance');
    expect(balanceField?.value).toBe(0);
    expect(balanceField?.severity).toBe('ok');
  });

  it('section label is Bilans mocy', () => {
    const section = buildPowerBalance(0, 0);
    expect(section.label).toBe('Bilans mocy');
  });

  it('all fields have kW unit', () => {
    const section = buildPowerBalance(0.1, 0.05);
    for (const f of section.fields) {
      expect(f.unit).toBe('kW');
    }
  });
});

describe('LineSegmentCard role derivation', () => {
  it('identifies trunk segment', () => {
    const views: LogicalViews = {
      trunks: [{ segment_ids: ['seg-1', 'seg-2'] }],
      branches: [],
    };
    expect(deriveRole('seg-1', views)).toBe('Magistrala');
  });

  it('identifies branch segment', () => {
    const views: LogicalViews = {
      trunks: [{ segment_ids: ['seg-1'] }],
      branches: [{ segment_ids: ['seg-2', 'seg-3'] }],
    };
    expect(deriveRole('seg-2', views)).toBe('Odgałęzienie');
  });

  it('identifies secondary connector', () => {
    const views: LogicalViews = {
      trunks: [],
      branches: [],
      secondary_connectors: [{ segment_ids: ['seg-ring'] }],
    };
    expect(deriveRole('seg-ring', views)).toBe('Połączenie pierścieniowe');
  });

  it('returns dash for unknown segment', () => {
    const views: LogicalViews = { trunks: [], branches: [] };
    expect(deriveRole('seg-unknown', views)).toBe('—');
  });

  it('returns dash for null logical views', () => {
    expect(deriveRole('seg-1', null)).toBe('—');
  });

  it('trunk takes priority over branch', () => {
    const views: LogicalViews = {
      trunks: [{ segment_ids: ['seg-1'] }],
      branches: [{ segment_ids: ['seg-1'] }], // overlapping
    };
    expect(deriveRole('seg-1', views)).toBe('Magistrala');
  });
});
