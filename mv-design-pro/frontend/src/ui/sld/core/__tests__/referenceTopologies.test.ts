import { describe, expect, it } from 'vitest';
import { buildReferenceScenario, type ReferenceScenarioId } from '../referenceTopologies';

const scenarios: ReferenceScenarioId[] = ['leaf', 'pass', 'branch', 'ring'];

describe('referenceTopologies', () => {
  it.each(scenarios)('builds %s with non-empty symbols and canonical annotations', (scenario) => {
    const result = buildReferenceScenario(scenario);

    expect(result.symbols.length).toBeGreaterThan(0);
    expect(result.input.sources.length).toBeGreaterThan(0);
    expect(result.canonicalAnnotations).not.toBeNull();
    expect((result.canonicalAnnotations?.trunkNodes.length ?? 0) > 0).toBe(true);
  });

  it('ring scenario has NOP segment', () => {
    const result = buildReferenceScenario('ring');
    const hasNop = result.input.branches.some((branch) => branch.isNormallyOpen);
    expect(hasNop).toBe(true);
  });

  it('scenariusze referencyjne mają jawne logicalViews dla trunk/branch/ring', () => {
    const leaf = buildReferenceScenario('leaf').input.logicalViews;
    const branch = buildReferenceScenario('branch').input.logicalViews;
    const ring = buildReferenceScenario('ring').input.logicalViews;

    expect((leaf?.trunks.length ?? 0) > 0).toBe(true);
    expect((branch?.branches.length ?? 0) > 0).toBe(true);
    expect((ring?.rings.length ?? 0) > 0).toBe(true);
  });

});
