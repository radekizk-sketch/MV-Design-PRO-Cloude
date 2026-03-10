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
});
